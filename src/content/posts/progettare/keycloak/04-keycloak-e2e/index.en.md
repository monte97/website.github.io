---
title: "Keycloak in Practice: 6 Real-World Integration Problems in an E-Commerce"
seoTitle: "Keycloak: 6 real-world integration issues"
date: 2026-02-06T09:00:00.000Z
description: "6 concrete problems integrating Keycloak with Node.js microservices: issuer mismatch, audience validation, fragile service accounts, and M2M race conditions."
pillar: progettare
category: keycloak
tags:
  - Keycloak
  - OAuth2
  - OIDC
  - Microservizi
  - Security
  - PKCE
  - M2M
series: keycloak
seriesOrder: 40
lang: en
reviewed: machine
---

A Keycloak integration that works perfectly on localhost and then breaks on the first staging deploy is a familiar story.

Keycloak configured, login working, checkout running. The integration looks complete. The problems start later: an unexplained 401 in staging, a token that passes validation on services it was never meant to reach, a service account that any user can impersonate.

This article documents 6 concrete problems that surfaced while integrating Keycloak into MockMart, an e-commerce demo with 5 Node.js microservices. For each problem: the symptom, the root cause in the code, and the fix.

| Problem | Where | Impact |
|---|---|---|
| Issuer mismatch (unexplained 401) | JWT validation | API unreachable in staging/prod |
| Audience not validated | JWT validation | Cross-client tokens accepted |
| Fragile service account detection | Notification service | M2M security bypass |
| `canCheckout` string vs boolean | Checkout | Silent authorization failure |
| Race condition in token caching | M2M | Keycloak overloaded under load |
| Non-portable configuration | Realm + frontend | Everything breaks outside localhost |

## MockMart Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    Gateway (nginx:80)                        │
└────┬──────────────┬──────────────┬──────────────────────────┘
     │              │              │
┌────▼────┐   ┌─────▼─────┐  ┌─────▼─────┐
│ Shop UI │   │ Shop API  │  │ Keycloak  │
│ React   │   │ Express   │  │   :8080   │
│ :3000   │   │   :3001   │  └───────────┘
└─────────┘   └─────┬─────┘
                    │
      ┌─────────────┼─────────────┐
      │             │             │
┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼──────┐
│  Payment  │ │ Inventory │ │Notification│
│   :3010   │ │   :3011   │ │   :3009    │
└───────────┘ └───────────┘ └────────────┘
```

Authentication uses three patterns: Authorization Code + PKCE for the frontend, JWT validation via JWKS for the API, and client credentials for M2M communication between services.

```bash
# To follow the examples
cd demo/MockMart
make up && make health
```

---

## Problem 1: The Unexplained 401 (Issuer Mismatch)

### Symptom

The user logs in successfully. The frontend receives the token. A `GET /api/products` call with `Authorization: Bearer <token>` returns 401. The token is valid on jwt.io. The API logs say: `JWT validation failed: unexpected "iss" claim value`.

### Cause

In `middleware/auth.js`, JWT validation checks the issuer:

```javascript
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://keycloak:8080';
const KEYCLOAK_PUBLIC_URL = process.env.KEYCLOAK_PUBLIC_URL || 'http://localhost:8080';
const KEYCLOAK_ISSUER = `${KEYCLOAK_PUBLIC_URL}${KEYCLOAK_AUTH_PATH}/realms/${KEYCLOAK_REALM}`;
const KEYCLOAK_JWKS_URL = `${KEYCLOAK_URL}${KEYCLOAK_AUTH_PATH}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`;

const { payload } = await jwtVerify(token, getJWKS(), {
  issuer: KEYCLOAK_ISSUER,   // Validates against the PUBLIC URL
  clockTolerance: 30
});
```

Two distinct URLs serve two different purposes:

- **`KEYCLOAK_URL`** (`http://keycloak:8080`) — internal URL via Docker DNS, used to download JWKS keys
- **`KEYCLOAK_PUBLIC_URL`** (`http://localhost:8080`) — public URL, used to validate the token issuer

The frontend generates tokens with `iss: http://localhost:8080/auth/realms/techstore` because the browser reaches Keycloak on `localhost`. The API must validate against the same URL. If the API validated against the internal Docker URL (`http://keycloak:8080`), the issuer would not match.

### When It Breaks

On localhost it works because the default value of `KEYCLOAK_PUBLIC_URL` is `http://localhost:8080`. In staging or production, Keycloak is reachable at a different URL (e.g. `https://auth.example.com`). The frontend generates tokens with `iss: https://auth.example.com/auth/realms/techstore`. If the API has not been updated with `KEYCLOAK_PUBLIC_URL=https://auth.example.com`, it keeps validating against `http://localhost:8080`. Result: 401 on every call.

The problem is compounded by a hardcoded URL in the frontend:

```javascript
// AuthContext.jsx
const KEYCLOAK_URL = 'http://localhost:8080/auth'
```

In production, this value must also change. Two configurations to keep in sync, across two different codebases (frontend and backend), with errors that only surface at runtime.

### Fix

Make the URL configurable in both services and validate at startup:

```javascript
// Validate at service startup
const KEYCLOAK_PUBLIC_URL = process.env.KEYCLOAK_PUBLIC_URL;
if (!KEYCLOAK_PUBLIC_URL) {
  throw new Error('KEYCLOAK_PUBLIC_URL is required - must match the issuer in JWT tokens');
}
```

---

## Problem 2: Cross-Client Tokens Accepted (Missing Audience)

### Symptom

A token obtained for the frontend (`shop-ui`) is used to call the payment service directly. The call is accepted. Any token issued by the `techstore` realm passes validation on any service.

### Cause

The `requireAuth` middleware in `shop-api/middleware/auth.js` validates issuer and expiry, but not the audience:

```javascript
const { payload } = await jwtVerify(token, getJWKS(), {
  issuer: KEYCLOAK_ISSUER,
  clockTolerance: 30
  // Missing: audience: 'shop-api'
});
```

The same pattern repeats in `notification/server.js` and `payment/server.js`. No service checks which resource the token was issued for.

### Consequence

The `aud` (audience) claim in the JWT indicates which resource the token is intended for. Without validation, a token issued for `shop-ui` (the frontend) is accepted by `payment-service` or `notification-service` as well. In a realm with multiple applications, any valid token unlocks any door.

Concrete scenario: an attacker intercepts a frontend token (e.g. from a log, a proxy, or a browser extension). Without audience validation, that token can call internal APIs that should not be reachable from the frontend.

### Fix

Add `audience` to JWT validation in every service:

```javascript
const { payload } = await jwtVerify(token, getJWKS(), {
  issuer: KEYCLOAK_ISSUER,
  audience: 'shop-api',    // Only accept tokens intended for this service
  clockTolerance: 30
});
```

On the Keycloak side, configure an audience mapper in the client scope to include the correct `aud` in the token.

---

## Problem 3: Anyone Can Be a Service Account

### Symptom

A user without an email in their Keycloak profile can call `/api/notifications/order`, an endpoint reserved for M2M communication between services.

### Cause

The notification service distinguishes between user tokens and service tokens with this logic:

```javascript
// notification/server.js
req.auth = {
  isServiceAccount: !payload.email && (payload.azp || payload.clientId),
  callingService: payload.azp || payload.clientId || 'unknown',
  subject: payload.sub
};
```

The check relies on two conditions: absence of `email` in the token AND presence of `azp` (authorized party). The assumption: service accounts have no email; users do.

```javascript
app.post('/api/notifications/order', requireAuth, async (req, res) => {
  if (!isServiceAccount) {
    return res.status(403).json({ error: 'This endpoint only accepts service account tokens' });
  }
  if (req.auth.callingService !== 'shop-api') {
    return res.status(403).json({ error: 'This endpoint only accepts calls from shop-api' });
  }
  // ...
});
```

### Why It Breaks

The assumption is fragile. A Keycloak user can have no email (the field is optional). Their token will have `azp: shop-ui` (the client they logged in from) and no `email`. The check:

```javascript
!payload.email && (payload.azp || payload.clientId)
// !undefined && 'shop-ui'
// true && true = true → identified as service account
```

The first check (`isServiceAccount`) passes. The second (`callingService !== 'shop-api'`) blocks it only because `azp` is `shop-ui`, not `shop-api`. But if another confidential client in the realm is compromised, its tokens pass both checks.

### Fix

Do not base identification on the absence of a field. Verify an explicit claim:

```javascript
// More robust approach: clientId is only present in client credentials tokens (Keycloak 17+)
// and tokens obtained via client credentials do not have session_state
const isServiceAccount = payload.clientId !== undefined && !payload.session_state;

// Alternative: preferred_username follows the pattern "service-account-<clientId>"
// const isServiceAccount = payload.preferred_username?.startsWith('service-account-');
```

The ideal solution combines audience validation (Problem 2) with an explicit check on the token type. A token destined for `shop-api` with `azp: shop-api` is a confirmed service account.

---

## Problem 4: `canCheckout` That Stops Working

### Symptom

After a Keycloak upgrade, user `mario` (who has `canCheckout: true` in their profile) receives a 403 at checkout: "You are not authorized to checkout." No code changes were made.

### Cause

The realm config defines `canCheckout` as a user attribute (array of strings) and maps it in the token using a boolean-type mapper:

```json
{
  "name": "canCheckout",
  "protocolMapper": "oidc-usermodel-attribute-mapper",
  "config": {
    "user.attribute": "canCheckout",
    "claim.name": "canCheckout",
    "jsonType.label": "boolean"
  }
}
```

The attribute is stored in Keycloak as `["true"]` (an array of strings). The mapper should convert it to `true` (boolean). The code handles both cases:

```javascript
// shop-api/middleware/auth.js
canCheckout: payload.canCheckout === 'true' || payload.canCheckout === true
```

### Why It Breaks

The dual check (`=== 'true' || === true`) covers string and boolean. But it does not cover the case where the mapper sends the raw attribute value: `["true"]` (an array). In that case:

```javascript
["true"] === 'true'  // false
["true"] === true     // false
// canCheckout = false → 403 Forbidden
```

This happens when mapper behavior changes between Keycloak versions, or when the mapper configuration is recreated without `jsonType.label`. The user sees a 403 with no explanation. The token contains the correct value (`canCheckout: ["true"]`), but parsing fails.

The same pattern appears in the frontend (`AuthContext.jsx`), where the user might see the checkout interface disabled for no apparent reason.

### Fix

Defensive parsing that handles all possible formats:

```javascript
function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  if (Array.isArray(value)) return value[0] === 'true';
  return false;
}

canCheckout: parseBoolean(payload.canCheckout)
```

Alternatively, avoid the problem at the source: use a Keycloak role (`can-checkout`) instead of a user attribute. Roles are always arrays of strings in the token and the check becomes:

```javascript
canCheckout: payload.realm_access?.roles?.includes('can-checkout') || false
```

---

## Problem 5: Keycloak Under Load (M2M Race Condition)

### Symptom

With 50+ concurrent checkouts, logs show dozens of requests to the Keycloak token endpoint within the same second. Keycloak responds with 429 (Too Many Requests). Checkouts fail with "Failed to obtain service token for M2M communication".

### Cause

In `lib/service-token.js`, token caching does not handle concurrent requests:

```javascript
let cachedToken = null;
let tokenExpiry = null;

async function getServiceToken() {
  const now = Date.now();
  if (cachedToken && tokenExpiry && now < tokenExpiry) {
    return cachedToken;    // Cache hit
  }

  // Cache miss: call Keycloak
  const tokenResponse = await fetchToken();
  cachedToken = tokenResponse.access_token;
  tokenExpiry = now + (tokenResponse.expires_in - EXPIRY_BUFFER_SECONDS) * 1000;
  return cachedToken;
}
```

When the token expires, all concurrent requests find an empty cache and call Keycloak simultaneously. With 50 concurrent checkouts, the token endpoint receives 50 identical requests in parallel.

### Why It Is a Problem

On localhost with a single user, the pattern works. In production, checkout is a fan-out: each checkout calls `getServiceToken()` before contacting inventory, payment, and notification services. A traffic spike (e.g. a flash sale) causes an explosion of requests to the token endpoint.

The 60-second buffer (`EXPIRY_BUFFER_SECONDS`) mitigates the problem under normal conditions by renewing the token before expiry. But if the service restarts (deploy, crash), the cache is cleared and all requests hit Keycloak simultaneously.

### Fix

Use an async lock to guarantee a single request to the token endpoint:

```javascript
let cachedToken = null;
let tokenExpiry = null;
let pendingRequest = null;

async function getServiceToken() {
  const now = Date.now();
  if (cachedToken && tokenExpiry && now < tokenExpiry) {
    return cachedToken;
  }

  // If a request is already in flight, wait for it
  if (pendingRequest) {
    return pendingRequest;
  }

  // First request: call Keycloak and share the Promise
  pendingRequest = fetchToken()
    .then(response => {
      cachedToken = response.access_token;
      tokenExpiry = Date.now() + (response.expires_in - EXPIRY_BUFFER_SECONDS) * 1000;
      return cachedToken;
    })
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}
```

With this pattern, 50 concurrent requests produce a single call to Keycloak. The other 49 wait on the same Promise.

---

## Problem 6: From Localhost to Production

The previous problems surface in application code. This section covers configurations that work on localhost and break elsewhere.

### `sslRequired: "none"` in the Realm

```json
{
  "realm": "techstore",
  "sslRequired": "none"
}
```

Required for Docker over HTTP. But if this realm config is used as a template for production, Keycloak accepts HTTP connections. Tokens, credentials, and sessions travel in plaintext. The correct value for production is `"external"` (HTTPS required for external requests) or `"all"`.

### Secrets in Code and in the Repository

The client secret appears in three places:

```javascript
// service-token.js - default hardcoded in code
const KEYCLOAK_CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET || 'shop-api-secret';
```

```json
// realm-config.json - committed to the repository
"secret": "shop-api-secret"
```

```yaml
# docker-compose.yml - visible in plaintext
- KEYCLOAK_CLIENT_SECRET=shop-api-secret
```

Anyone with access to the repository has the secret. In production, the secret must be injected via a secret manager (Vault, AWS Secrets Manager, Kubernetes Secrets) and the fallback in code must be removed:

```javascript
const KEYCLOAK_CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET;
if (!KEYCLOAK_CLIENT_SECRET) {
  throw new Error('KEYCLOAK_CLIENT_SECRET is required');
}
```

### `checkLoginIframe: false` in the Frontend

```javascript
// AuthContext.jsx
const authenticated = await kc.init({
  pkceMethod: 'S256',
  checkLoginIframe: false
})
```

The session iframe periodically checks that the Keycloak session is still valid. Disabled to avoid cross-origin cookie issues on localhost, but in production the consequence is that a user who logs out in another tab remains authenticated in the frontend until the token expires (5 minutes).

### Hardcoded URL in the Frontend

```javascript
// AuthContext.jsx
const KEYCLOAK_URL = 'http://localhost:8080/auth'
```

In production, this value must come from an environment variable injected at build time (Vite: `import.meta.env.VITE_KEYCLOAK_URL`) or at runtime from a configuration file.

---

## Security Checklist

A summary of verifications to perform before taking a Keycloak integration to production:

| Check | Where | Status in MockMart |
|---|---|---|
| Audience validation in services | `jwtVerify` options | Missing |
| Configurable issuer URL | env var, no `localhost` default | Partial (fallback default) |
| Explicit service account detection | M2M middleware | Fragile (based on missing email) |
| Robust parsing of custom claims | Auth middleware | Partial (does not handle arrays) |
| Lock on M2M token caching | `getServiceToken()` | Missing |
| `sslRequired: "external"` or `"all"` | Realm config | `"none"` |
| Secret not in code/repo | env var without default | Hardcoded default |
| `checkLoginIframe` enabled | Frontend init | Disabled |
| Configurable Keycloak URL in frontend | Build/runtime config | Hardcoded |
| HTTPS for all communications | Nginx, docker-compose | HTTP |

### Practical Takeaways

- **Issuer mismatch is the most common problem.** It is the first 401 you encounter in staging. Two URLs for Keycloak (internal and external) is a mandatory pattern in containerized environments.

- **Audience validation is the most subtle security gap.** Everything works without it — until a token is used on a service it was never meant to reach. The problem generates no errors: it generates unauthorized access.

- **M2M token caching is not an optimization, it is a requirement.** Without a lock on concurrent requests, the Keycloak token endpoint becomes a single point of failure under load.

- **Custom claims are fragile by design.** The format of the value in the token depends on the Keycloak version, the mapper type, and the configuration. Roles are more stable than user attributes for authorization decisions.

## Next Steps

These 6 problems cover the most common pitfalls in application-level Keycloak integration. But security does not end in the code: realm configuration, custom authentication flows, and production monitoring open a whole other set of challenges.

With `make up-otel-keycloak` you can trace authentication flows end-to-end in Grafana — useful for diagnosing the problems described in this article. When a 401 cannot be explained from application logs, distributed traces show exactly where the flow breaks.

## Useful Resources

* **MockMart Repository**: [github.com/monte97/MockMart](https://github.com/monte97/MockMart)
* **Keycloak Documentation**: [keycloak.org/documentation](https://www.keycloak.org/documentation)
* **jose library (JWT)**: [github.com/panva/jose](https://github.com/panva/jose)
* **keycloak-js**: [keycloak.org/docs/latest/securing_apps/#_javascript_adapter](https://www.keycloak.org/docs/latest/securing_apps/#_javascript_adapter)
* **OAuth 2.0 Security Best Current Practice**: [RFC 9700](https://datatracker.ietf.org/doc/html/rfc9700)
