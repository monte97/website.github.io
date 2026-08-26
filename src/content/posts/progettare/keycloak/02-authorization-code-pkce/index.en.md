---
title: "Keycloak Login: Authorization Code + PKCE in MockMart"
date: 2026-02-15T09:00:00.000Z
description: "Hands-on Authorization Code Flow with PKCE: Keycloak configuration, React frontend integration, and Express backend validation."
pillar: progettare
category: keycloak
tags:
  - Keycloak
  - OAuth2
  - PKCE
  - OpenID Connect
  - Security
lang: en
reviewed: machine
series: keycloak
seriesOrder: 20
---

Keycloak configured, realm created, client registered. The next step is wiring a React frontend and an Express backend to the Identity Provider. The [introductory article](/blog/progettare/keycloak/01-keycloak-intro/) covers the concept of delegating authentication. This one implements the practical piece.

The implementation uses **Authorization Code Flow with PKCE** in MockMart, a demo e-commerce app. The result: the user clicks "Login," is redirected to Keycloak, enters their credentials, and returns to the app with a JWT that the backend validates on every request. The application never touches passwords.

---

## Goal

By the end of this tutorial:

- Keycloak will have a `techstore` realm with a public client configured for PKCE
- The React frontend (`shop-ui`) will redirect to Keycloak for login
- The Express backend (`shop-api`) will validate JWT tokens on each incoming request
- The user will be able to log in, browse products, and complete checkout

---

## Prerequisites

- Docker and Docker Compose installed
- [MockMart](https://github.com/monte97/MockMart) cloned locally
- Keycloak running (see [introductory article](/blog/progettare/keycloak/01-keycloak-intro/))

---

## How PKCE Login Works

Before touching any configuration, here is what happens when a user clicks "Login":

1. The frontend generates a random `code_verifier` and computes its hash (`code_challenge`)
2. The browser is redirected to Keycloak's login page, with the `code_challenge` in the query string
3. The user enters their credentials **on Keycloak** (not on the app)
4. Keycloak redirects the browser back to the app with a temporary `code`
5. The frontend exchanges the `code` + `code_verifier` with Keycloak and receives the tokens (access, id, refresh)
6. The frontend uses the access token to call the backend APIs

The `code_verifier` is the PKCE part: it guarantees that only the party who initiated the flow can complete it. If an attacker intercepts the `code`, they cannot exchange it without the original verifier.

> **Why PKCE instead of a client secret?** A SPA runs in the browser: any secret embedded in JavaScript is readable by anyone who opens DevTools. PKCE solves the problem with a secret generated *per login* that is never exposed in the URL.

---

## Keycloak Configuration

MockMart includes a realm export that configures everything automatically. But to understand what is happening under the hood, here are the manual steps.

### Create the Realm

From the admin console (`http://localhost:8080`):

1. Hover over the current realm name (top left) and click **Create Realm**
2. Enter `techstore` as the **Realm name**
3. Click **Create**

The realm is the isolated container for all configuration: users, clients, roles. Each project gets one.

### Create the Public Client

In **Clients → Create client**:

| Field | Value |
|-------|-------|
| **Client ID** | `shop-ui` |
| **Client authentication** | OFF (public client) |
| **Standard flow** | ON |
| **Direct access grants** | OFF |

In the **Settings** tab, configure the URLs:

| Field | Value |
|-------|-------|
| **Valid redirect URIs** | `http://localhost:3000/*` |
| **Valid post logout redirect URIs** | `http://localhost:3000/*` |
| **Web origins** | `http://localhost:3000` |

In the **Advanced** tab, under **Proof Key for Code Exchange**:

| Field | Value |
|-------|-------|
| **Code Challenge Method** | `S256` |

> **`S256`** means the `code_challenge` is a SHA-256 hash of the `code_verifier`. It is the only recommended method: the `plain` method (which sends the verifier in clear text) offers no real protection.

### Create Roles

In **Realm roles → Create role**, create two roles:

- `user`: regular user, can browse and check out
- `admin`: can also manage products and view all orders

### Create Test Users

In **Users → Add user**, create two users:

**User: `mario`**

| Field | Value |
|-------|-------|
| **Username** | `mario` |
| **Email** | `mario@techstore.local` |
| **Email verified** | ON |

In the **Credentials** tab, set password `mario123` with **Temporary** = OFF.
In the **Role mapping** tab, assign the `user` role.

**User: `admin`**

| Field | Value |
|-------|-------|
| **Username** | `admin` |
| **Email** | `admin@techstore.local` |
| **Email verified** | ON |

Password `admin123`, roles `user` and `admin`.

### Verify with the CLI

Once configured, verify that Keycloak responds correctly:

```bash
# OIDC Discovery: lists all available endpoints
curl -s http://localhost:8080/realms/techstore/.well-known/openid-configuration | jq '.authorization_endpoint, .token_endpoint'
```

Expected output:
```text
"http://localhost:8080/realms/techstore/protocol/openid-connect/auth"
"http://localhost:8080/realms/techstore/protocol/openid-connect/token"
```

---

## Frontend Integration (React + keycloak-js)

The frontend uses `keycloak-js`, the official JavaScript adapter. It automatically handles the redirect, token exchange, and token refresh.

### Initialization

```javascript
// AuthContext.jsx
import Keycloak from 'keycloak-js';

const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM || 'techstore';
const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'shop-ui';

const kc = new Keycloak({
  url: KEYCLOAK_URL,
  realm: KEYCLOAK_REALM,
  clientId: KEYCLOAK_CLIENT_ID,
});
```

The Keycloak URL is configurable via environment variable. In production it will differ from `localhost`: hardcoding it is one of the most common mistakes (see the troubleshooting section below).

### Init with PKCE

```javascript
async function initKeycloak() {
  const authenticated = await kc.init({
    onLoad: 'check-sso',
    pkceMethod: 'S256',
    checkLoginIframe: false,
  });

  if (authenticated) {
    // The user already has an active Keycloak session
    const tokenParsed = kc.tokenParsed;
    setUser({
      id: tokenParsed.sub,
      username: tokenParsed.preferred_username,
      email: tokenParsed.email,
      roles: tokenParsed.realm_access?.roles || [],
    });
  }
}
```

Three key parameters:

- **`onLoad: 'check-sso'`** — checks whether the user already has an active Keycloak session (SSO), without forcing a login
- **`pkceMethod: 'S256'`** — enables PKCE with SHA-256 hashing. From `keycloak-js` version 24+, PKCE with S256 is the default; the parameter is redundant here but kept explicit for clarity
- **`checkLoginIframe: false`** — disables the session check iframe. On `localhost` this is necessary to avoid cross-origin cookie issues. In production, re-enabling it is recommended

### Login and Logout

```javascript
function login() {
  kc.login();
  // The browser is redirected to Keycloak
  // After login, Keycloak redirects back to the redirect URI
  // keycloak-js automatically handles the code → token exchange
}

function logout() {
  kc.logout({
    redirectUri: window.location.origin,
  });
  // Terminates both the local session and the Keycloak session (SSO logout)
}
```

### Token in API Calls

Every request to the backend must include the access token in the `Authorization` header:

```javascript
async function apiFetch(url, options = {}) {
  // Refresh the token if it is about to expire (30-second margin)
  await kc.updateToken(30);

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${kc.token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
}
```

`kc.updateToken(30)` is proactive refresh: if the token expires within 30 seconds, `keycloak-js` renews it automatically using the refresh token. The renewal is transparent to the calling code.

---

## Backend Integration (Express + jose)

The backend plays no part in the login flow. It receives the access token from the frontend and validates it on every request.

### JWT Validation via JWKS

```javascript
// middleware/auth.js
const { createRemoteJWKSet, jwtVerify } = require('jose');

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://keycloak:8080';
const KEYCLOAK_PUBLIC_URL = process.env.KEYCLOAK_PUBLIC_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'techstore';

const ISSUER = `${KEYCLOAK_PUBLIC_URL}/realms/${KEYCLOAK_REALM}`;
const JWKS_URL = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`;

// jose downloads and caches public keys automatically
let jwks = null;
function getJWKS() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(JWKS_URL));
  }
  return jwks;
}
```

Two distinct Keycloak URLs — intentionally:

- **`KEYCLOAK_URL`** (`http://keycloak:8080`) — the internal URL via Docker DNS, used by the backend to download JWKS keys
- **`KEYCLOAK_PUBLIC_URL`** (`http://localhost:8080`) — the URL the browser reaches, and the one Keycloak embeds as `iss` in the token

If the two do not match, issuer validation fails with an unexplained 401. This is the most common problem in staging and production environments.

### The Middleware

```javascript
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: ISSUER,
      audience: 'shop-api',  // Requires an Audience mapper in Keycloak (see note below)
      clockTolerance: 30,  // Dev: 30s for convenience. In production use 5-10s
    });

    req.user = {
      id: payload.sub,
      username: payload.preferred_username,
      email: payload.email,
      roles: payload.realm_access?.roles || [],
    };

    next();
  } catch (error) {
    if (error.code === 'ERR_JWT_EXPIRED') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

`jwtVerify` from the [jose](https://github.com/panva/jose) library does three things:

1. **Verifies the signature** — downloads the public key from Keycloak's JWKS endpoint and confirms the token was signed with the corresponding private key
2. **Checks the issuer** — the `iss` claim must match the expected Keycloak URL
3. **Checks expiry** — the `exp` claim must not be in the past (with 30 seconds of tolerance)

If any of these checks fail, the token is rejected.

> **Audience validation**: validating the `audience` claim is not optional. Without it, a token issued for a different service could be accepted by your backend (token confusion attack). Keycloak sets `aud` to `"account"` by default. To add your API's audience, configure an **Audience mapper** on the client (Client → Mappers → Add mapper → Audience, with value `shop-api`).

### Protecting Routes

```javascript
// Protected routes: require a valid token
app.get('/api/products', requireAuth, getProducts);
app.post('/api/checkout', requireAuth, handleCheckout);
app.get('/api/orders', requireAuth, getOrders);

// Public route: no token needed
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
```

---

## End-to-End Test

With MockMart running (`make up`), the complete flow:

### 1. Start the Stack

```bash
cd MockMart
make up
```

| Service | URL |
|---------|-----|
| Shop UI (frontend) | http://localhost:3000 |
| Shop API (backend) | http://localhost:3001 |
| Keycloak | http://localhost:8080 |

### 2. Login from the UI

1. Open `http://localhost:3000`
2. Click **Login** → the browser is redirected to Keycloak
3. Enter `mario` / `mario123`
4. After the redirect, the user is authenticated in the app

### 3. Inspect the Token

Open browser DevTools (F12 → Network). In calls to `/api/products`, observe the header:

```http
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

You can decode the JWT payload (the middle part between dots) at [jwt.io](https://jwt.io) or from the terminal:

```bash
# Decode the JWT payload (second part, separated by '.')
echo "eyJhbGci..." | cut -d'.' -f2 | tr '_-' '/+' | base64 -d 2>/dev/null | jq
```

Output (simplified):

```json
{
  "iss": "http://localhost:8080/realms/techstore",
  "sub": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "preferred_username": "mario",
  "email": "mario@techstore.local",
  "realm_access": {
    "roles": ["user"]
  },
  "exp": 1708000000
}
```

### 4. Verify PKCE with curl

To see the PKCE flow step by step, you can simulate it from the terminal.

**Generate code_verifier and code_challenge:**

```bash
# Generate a random code_verifier (43-128 characters)
CODE_VERIFIER=$(openssl rand -base64 48 | tr -d '=/+' | head -c 128)

# Compute the code_challenge (SHA-256 of the verifier, base64url-encoded)
CODE_CHALLENGE=$(echo -n "$CODE_VERIFIER" | openssl dgst -sha256 -binary | base64 | tr '+/' '-_' | tr -d '=')

echo "code_verifier:  $CODE_VERIFIER"
echo "code_challenge: $CODE_CHALLENGE"
```

**Authorization request** (normally handled by the browser via redirect):

```text
http://localhost:8080/realms/techstore/protocol/openid-connect/auth?
  response_type=code
  &client_id=shop-ui
  &redirect_uri=http://localhost:3000/
  &scope=openid profile email
  &code_challenge_method=S256
  &code_challenge=<CODE_CHALLENGE>
  &state=random123
```

After login, Keycloak redirects to:

```text
http://localhost:3000/?code=SplxlOBeZQQ...&state=random123
```

**Token request** (exchange code → tokens, with the original verifier):

```bash
curl -s -X POST \
  'http://localhost:8080/realms/techstore/protocol/openid-connect/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "grant_type=authorization_code" \
  -d "client_id=shop-ui" \
  -d "code=<RECEIVED_CODE>" \
  -d "redirect_uri=http://localhost:3000/" \
  -d "code_verifier=$CODE_VERIFIER" | jq
```

If the `code_verifier` matches the `code_challenge` sent in the authorization request, Keycloak returns the tokens. Otherwise: error.

---

## Troubleshooting

### Redirect URI Mismatch

```text
error: invalid_redirect_uri
error_description: Invalid redirect uri
```

The URL Keycloak should redirect to after login does not match any of the URIs registered in the client. In Keycloak, **Valid redirect URIs** is an exact filter (with `*` wildcard support).

**Fix:** The `redirect_uri` in the request must exactly match one of those configured in the client. On localhost, `http://localhost:3000/*` covers all routes. In production, avoid wildcards and register exact URIs to prevent open redirect attacks.

### Issuer Mismatch (Unexplained 401)

```text
JWT validation failed: unexpected "iss" claim value
```

The token contains `iss: http://localhost:8080/realms/techstore`, but the backend is validating against `http://keycloak:8080/realms/techstore`. This happens when `KEYCLOAK_PUBLIC_URL` is not set or points to the Docker-internal URL.

**Fix:** `KEYCLOAK_PUBLIC_URL` must match the URL the browser uses to reach Keycloak. Two different URLs are by design: one for the Docker network (JWKS), one for the browser (issuer).

### CORS Blocked

```text
Access to fetch at 'http://localhost:8080/...' has been blocked by CORS policy
```

The browser blocks cross-origin requests when Keycloak does not include the `Access-Control-Allow-Origin` header. This happens when **Web origins** is not configured in the client.

**Fix:** In Keycloak → Client → Settings → **Web origins**, add `http://localhost:3000`. Alternatively, `+` automatically uses all registered redirect URIs.

### Token Expired but Not Refreshed

The user browses normally, then suddenly gets 401 on all calls. The token has expired (default: 5 minutes) and the frontend has not renewed it.

**Fix:** Call `kc.updateToken(30)` before every API request. With a wrapper like `apiFetch` (shown above), refresh is automatic. If the refresh token has also expired (default: 30 minutes of inactivity via SSO Session Idle, or 10 hours total via SSO Session Max), the user must log in again. Both values are configurable in the realm.

### PKCE Challenge Failed

```json
{
  "error": "invalid_grant",
  "error_description": "PKCE verification failed"
}
```

The `code_verifier` sent in the token request does not match the `code_challenge` from the authorization request. This can happen if the library does not correctly persist the verifier between the two steps (for example, after a page refresh during login).

**Fix:** `keycloak-js` handles PKCE automatically. For manual implementations, the `code_verifier` must be stored in `sessionStorage` (not `localStorage`) and read back in the callback.

---

## What the JWT Contains

The JWT the frontend receives is what the backend uses for every decision.

### Access Token

| Claim | Description | Example |
|-------|-------------|---------|
| `iss` | Who issued the token (Keycloak) | `http://localhost:8080/realms/techstore` |
| `sub` | Unique user ID | `f47ac10b-58cc-...` |
| `aud` | Intended recipient of the token | `account` |
| `exp` | Expiry (Unix timestamp) | `1708000300` |
| `azp` | Client that requested the token | `shop-ui` |
| `realm_access.roles` | User roles in the realm | `["user"]` |
| `preferred_username` | Human-readable username | `mario` |

### ID Token vs Access Token

Two tokens, two different purposes:

| | ID Token | Access Token |
|---|---|---|
| **Audience** | The frontend (the party that logged in) | The backend (the party protecting resources) |
| **Contains** | User identity | Granted authorizations |
| **Use** | Display "Hello, Mario" in the UI | Validate API requests |
| **Send to backend?** | No | Yes, in the `Authorization` header |

> `keycloak-js` exposes both: `kc.token` (access token) and `kc.idToken` (ID token). For API calls, always use the access token.

---

## Conclusion

The authentication flow covered in this article:

1. **Keycloak** manages the realm, clients, users, and roles
2. **React + keycloak-js** handles the redirect, PKCE, and token refresh
3. **Express + jose** validates JWTs on every request using public JWKS keys

The application code never touches credentials. The frontend has no secret. The backend has no user database. Everything is delegated to Keycloak.

The next articles cover authenticating services to each other without a user ([Client Credentials](/blog/progettare/keycloak/03-keycloak-m2m/)) and the real-world problems that surface when the integration meets production ([6 Real Problems](/blog/progettare/keycloak/04-keycloak-e2e/)).

---

## Resources

- [MockMart - Demo Repository](https://github.com/monte97/MockMart)
- [Keycloak Documentation - OIDC Clients](https://www.keycloak.org/docs/latest/server_admin/#_oidc_clients)
- [Keycloak JavaScript Adapter](https://www.keycloak.org/securing-apps/javascript-adapter)
- [jose - JWT Validation Library](https://github.com/panva/jose)
- [RFC 7636 - Proof Key for Code Exchange (PKCE)](https://datatracker.ietf.org/doc/html/rfc7636)
- [OAuth 2.0 for Browser-Based Apps](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps)
