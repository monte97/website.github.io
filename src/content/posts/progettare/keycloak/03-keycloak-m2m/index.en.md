---
title: "Keycloak M2M: Authenticating Services Without a User"
date: 2026-02-05T09:00:00.000Z
description: How to authenticate machine-to-machine calls between microservices with Keycloak Client Credentials. Setup, code, and common mistakes.
pillar: progettare
category: keycloak
tags:
  - Keycloak
  - OAuth2
  - Microservizi
  - M2M
  - Security
lang: en
reviewed: machine
series: keycloak
seriesOrder: 30
---

Scheduled jobs, webhooks, async events: in these scenarios there is no user in front of a screen, yet services still need to authenticate to one another. Machine-to-machine communication requires a different authentication mechanism from the browser-redirect-based flows designed for human users.

The standard approach is the **Client Credentials** flow from OAuth 2.0. This guide covers the Keycloak setup, the caller-side and receiver-side implementation, and the most common mistakes.

---

## The Problem: Services Talking Without a User

### The Scenario

In [MockMart](https://github.com/monte97/MockMart), when a user completes an order, `shop-api` needs to notify `notification-service`:

```text
shop-api (checkout) ──────► notification-service (send email)
```

The problem: this call happens **after** checkout is complete. There is no "active" user at that moment — it is a server-to-server call.

### Wrong Approaches

**Hardcoding API keys in services:**
```javascript
// DO NOT DO THIS
headers: { 'X-API-Key': 'super-secret-key-123' }
```
Problems: if a key is compromised, it must be rotated everywhere. No expiry, no audit trail.

**Forwarding the user's token:**
```javascript
// DO NOT DO THIS
headers: { 'Authorization': `Bearer ${userToken}` }
```
Problems: the token expires (typically 5 minutes), it carries the user's permissions (not the service's), and it simply does not work for scheduled jobs.

**No authentication ("it's an internal network anyway"):**
```javascript
// DO NOT DO THIS
await fetch('http://notification-service/send', { body: data });
```
Problems: any compromised service can call any other service. Zero traceability.

### The Question

How does `shop-api` prove its identity to `notification-service` without involving a user?

---

## The Solution: Client Credentials Flow

The **Client Credentials** flow lets a service authenticate as itself, not on behalf of a user.

### How It Works

```text
shop-api ─── (1) credentials ───► Keycloak
shop-api ◄── (2) access_token ─── Keycloak

shop-api ─── (3) Bearer token ───► notification-service
notification-service ─── (4) validate JWKS ───► Keycloak
```

1. `shop-api` sends its own credentials (client_id + secret) to Keycloak
2. Keycloak verifies them and issues an access token
3. `shop-api` uses the bearer token to call `notification-service`
4. `notification-service` validates the token via JWKS (Keycloak's public keys)

### Differences from Authorization Code

| | Authorization Code | Client Credentials |
|---|---|---|
| **Who authenticates** | User (via browser) | Service (backend) |
| **Requires browser** | Yes | No |
| **Refresh token** | Yes | No (request a new token) |
| **Typical use** | Frontend login | M2M, jobs, webhooks |

---

## Keycloak Setup: Service Account

To use Client Credentials, you need a Keycloak client with **service accounts enabled**.

### Client Configuration

In Keycloak Admin Console → Clients → Create:

```json
{
  "clientId": "shop-api",
  "secret": "shop-api-secret",
  "serviceAccountsEnabled": true,
  "standardFlowEnabled": false,
  "directAccessGrantsEnabled": false
}
```

**Key points:**
- `serviceAccountsEnabled: true` — enables the Client Credentials flow
- `standardFlowEnabled: false` — disables Authorization Code (not needed for a service)
- `directAccessGrantsEnabled: false` — disables Resource Owner Password (deprecated)

### Test: Obtain a Token

```bash
curl -X POST "http://localhost:8080/auth/realms/techstore/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=shop-api" \
  -d "client_secret=shop-api-secret"
```

> **Note:** Starting from Keycloak 17+ (Quarkus distribution, now the only supported one), the `/auth` context path prefix was removed by default. With a recent version the URL becomes `http://localhost:8080/realms/techstore/protocol/openid-connect/token`. In MockMart's code, the `KEYCLOAK_AUTH_PATH` variable handles both cases.

**Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 300,
  "token_type": "Bearer"
}
```

The token is short-lived (default 5 minutes). This is intentional: it limits the exposure window if the token is compromised.

---

## Implementation

### Caller Side: shop-api

The service that calls other services needs to:
1. Obtain a token from Keycloak
2. Cache it to avoid unnecessary requests
3. Renew it before expiry

```javascript
// lib/service-token.js

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://keycloak:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'techstore';
const KEYCLOAK_AUTH_PATH = process.env.KEYCLOAK_AUTH_PATH || '/auth';
const CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || 'shop-api';
const CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET;

const TOKEN_ENDPOINT = `${KEYCLOAK_URL}${KEYCLOAK_AUTH_PATH}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;

// Token cache
let cachedToken = null;
let tokenExpiry = null;
let pendingRequest = null;
const EXPIRY_BUFFER_SECONDS = 60; // Renew 60s before actual expiry

async function getServiceToken() {
  const now = Date.now();

  // Reuse token if still valid
  if (cachedToken && tokenExpiry && now < tokenExpiry) {
    return cachedToken;
  }

  // If there is already an in-flight request, wait for it
  // (avoids N parallel calls to the token endpoint)
  if (pendingRequest) {
    return pendingRequest;
  }

  // First request: call Keycloak and share the Promise
  pendingRequest = fetchNewToken();
  return pendingRequest;
}

async function fetchNewToken() {
  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      })
    });

    if (!response.ok) {
      throw new Error(`Token request failed: ${response.status}`);
    }

    const data = await response.json();

    // Cache with safety buffer
    cachedToken = data.access_token;
    const expiresIn = data.expires_in || 300;
    tokenExpiry = Date.now() + (expiresIn - EXPIRY_BUFFER_SECONDS) * 1000;

    return cachedToken;
  } finally {
    pendingRequest = null;
  }
}

module.exports = { getServiceToken };
```

**Usage:**
```javascript
const { getServiceToken } = require('./lib/service-token');

async function notifyOrder(orderId, userEmail) {
  const token = await getServiceToken();

  const response = await fetch(`${NOTIFICATION_URL}/api/notifications/order`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ orderId, userEmail })
  });

  return response.json();
}
```

### Receiver Side: notification-service

The service receiving the call needs to:
1. Validate the JWT (signature, expiry, issuer)
2. Verify that the caller is an authorized service account

```javascript
// middleware/auth.js

const { createRemoteJWKSet, jwtVerify } = require('jose');

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://keycloak:8080';
const KEYCLOAK_PUBLIC_URL = process.env.KEYCLOAK_PUBLIC_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'techstore';
const KEYCLOAK_AUTH_PATH = process.env.KEYCLOAK_AUTH_PATH || '/auth';

const ISSUER = `${KEYCLOAK_PUBLIC_URL}${KEYCLOAK_AUTH_PATH}/realms/${KEYCLOAK_REALM}`;
const JWKS_URL = `${KEYCLOAK_URL}${KEYCLOAK_AUTH_PATH}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`;

// JWKS cache
let jwks = null;
function getJWKS() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(JWKS_URL));
  }
  return jwks;
}

async function requireServiceAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: ISSUER,
      clockTolerance: 30
    });

    // Verify this is a service account token
    // The client_id claim (snake_case) is present in Keycloak service account tokens
    // It must match azp (authorized party) to confirm the token was issued for that client
    const isServiceAccount = payload.client_id !== undefined
      && payload.client_id === payload.azp;
    if (!isServiceAccount) {
      return res.status(403).json({
        error: 'This endpoint only accepts service account tokens'
      });
    }

    // Verify this is the authorized service
    if (payload.azp !== 'shop-api') {
      return res.status(403).json({
        error: 'Unauthorized service'
      });
    }

    req.serviceAccount = payload;
    next();
  } catch (error) {
    if (error.code === 'ERR_JWT_EXPIRED') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { requireServiceAuth };
```

**Critical point:** Two distinct checks protect the endpoint. The first (`isServiceAccount`) verifies that the token comes from a service account via the `client_id` claim (present in Keycloak service account tokens). The second (`payload.azp !== 'shop-api'`) restricts access to the single authorized service. Without both checks, a user token or a token from a different service would pass validation.

> **Toward production:** In this example `azp` is hardcoded, but in a system with many services this approach becomes fragile. The scalable alternative is to assign **client roles or scopes** (e.g. `notifications:send`) to the service account in Keycloak and verify them in the middleware, rather than checking the specific client ID. This decouples authorization from the caller's specific identity.

---

## Common Mistakes

### Mistake 1: Expired Token, No Retry

```
POST /api/notifications/order → 401 Unauthorized
```

Client Credentials tokens are short-lived (default 5 minutes). Without a cache with proactive renewal, calls start failing after expiry.

**Fix:** The `expiresIn - EXPIRY_BUFFER_SECONDS` pattern renews the token 60 seconds before actual expiry.

### Mistake 2: Validating Only the Signature

```javascript
// INSECURE
const { payload } = await jwtVerify(token, getJWKS());
// Accepts ANY valid token!
```

A user token stolen from the frontend passes this validation.

**Fix:** Always verify `azp` (authorized party):
```javascript
if (payload.azp !== 'shop-api') {
  return res.status(403).json({ error: 'Unauthorized service' });
}
```

### Mistake 3: Secret in Code

```javascript
// NEVER DO THIS
const CLIENT_SECRET = 'shop-api-secret';
```

If the repository is public (or gets compromised), the secret is exposed.

**Fix:** Environment variable, never in the repository:
```bash
# .env (add to .gitignore)
KEYCLOAK_CLIENT_SECRET=shop-api-secret
```

---

## Debug with OpenTelemetry

With MockMart you can trace the entire M2M flow:

```bash
make up-otel-keycloak
```

In Grafana → Explore → Tempo you will see:

```text
shop-api                     keycloak                  notification
    │                            │                           │
    ├── POST /token ────────────►│                           │
    │◄── 200 {access_token} ─────│                           │
    │                            │                           │
    ├── POST /api/notifications/order ─────────────────────►│
    │                            │◄── GET /certs (JWKS) ─────│
    │◄── 200 OK ─────────────────┼───────────────────────────│
```

The trace shows who called whom, with which token, and how long each step took.

---

## When to Use Client Credentials

| Scenario | Client Credentials? |
|----------|:------------------:|
| Scheduled jobs (cron, batch) | Yes |
| Incoming webhooks | Yes |
| Async events (queue consumer) | Yes |
| Service calls another service | Yes |
| Logged-in user calls an API | No — use the user's token |

---

## Checklist

- [ ] Keycloak client with `serviceAccountsEnabled: true`
- [ ] Secret in an environment variable, never in code
- [ ] Token cache with proactive renewal and deduplication of concurrent requests (`pendingRequest`)
- [ ] Receiver validates `client_id` + service-account role and `azp`, not just the signature
- [ ] Tracing enabled for production debugging

---

## Conclusion

To summarize:

1. The **Client Credentials** flow lets services authenticate to one another without involving a user
2. **Token caching with proactive renewal** and request deduplication avoids unnecessary calls to Keycloak
3. The receiving service must validate not just the token signature, but also confirm the caller is an authorized service account
4. In production, prefer **roles and scopes** over hardcoded `azp` checks for a decoupled architecture

When implemented correctly, M2M authentication becomes a transparent mechanism: services identify themselves, the token is validated, the call goes through. Implemented poorly, it becomes a lateral movement vector — because services that appear trusted on an internal network are anything but immune.

---

## Resources

- **MockMart**: [Demo E-commerce with OTEL](https://github.com/monte97/MockMart)
- **RFC 6749**: [OAuth 2.0 Client Credentials Grant](https://datatracker.ietf.org/doc/html/rfc6749#section-4.4)
- **Keycloak Documentation**: [Service Accounts](https://www.keycloak.org/docs/latest/server_admin/#_service_accounts)
