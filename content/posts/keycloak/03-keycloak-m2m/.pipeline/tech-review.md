# Tech Review — Keycloak M2M: Autenticare Servizi Senza Utente

**Reviewer:** Claude Opus 4.6 (automated)
**Date:** 2026-02-20
**Article:** `content/posts/keycloak/03-keycloak-m2m/index.md`

---

## Overall Score: 8/10

The article is well-structured, technically sound on OAuth 2.0 fundamentals, and provides practical, production-quality code. Issues found are mostly minor clarifications and one important URL-path concern.

---

## Issues

### P1 — Keycloak URL path `/auth` may confuse readers

**Location:** Line 129, 167, 262-263

The curl example hardcodes `/auth/realms/...` in the URL path. Since Keycloak 17+ (Quarkus distribution, now the only supported distribution), the default context path is `/` — the `/auth` prefix was removed. The code does use a `KEYCLOAK_AUTH_PATH` env var (defaulting to `'/auth'`), which is a reasonable escape hatch, but the curl example on line 129 hardcodes the old path with no explanation.

**Recommendation:** Add a brief note after the curl example stating that Keycloak 17+ dropped the `/auth` prefix by default, and that readers using the Quarkus distribution should use `http://localhost:8080/realms/techstore/protocol/openid-connect/token` instead. Alternatively, show both variants.

---

### P1 — Hardcoded `azp` check reduces reusability and is fragile

**Location:** Lines 299-302

The middleware hardcodes `payload.azp !== 'shop-api'`. This is fine as a tutorial example, but the article presents it as the recommended pattern without mentioning that in production you would typically use **roles or scopes** to authorize service-to-service calls rather than checking a specific `azp` value. Hardcoding client IDs creates tight coupling.

**Recommendation:** Keep the example but add a paragraph explaining that a more scalable approach is to assign client roles or scopes (e.g., `notifications:send`) to the service account and check those in the middleware, rather than hardcoding client IDs.

---

### P1 — `isServiceAccount` check is not fully reliable

**Location:** Lines 290-291

The check `payload.realm_access?.roles?.some(r => r.startsWith('service-account'))` relies on the convention that Keycloak assigns a role named `service-account-<clientId>` to service accounts. While this is default behavior, the role prefix check via `startsWith('service-account')` is fragile — a regular user could theoretically be assigned a custom role starting with `service-account`. The `clientId` claim check is more reliable on its own.

**Recommendation:** Clarify that the `clientId` claim presence is the primary indicator of a service account token in Keycloak. The role check is supplementary. Consider mentioning the `typ` claim or the absence of `sub` matching a user as alternative verification strategies.

---

### P2 — Refresh token row in comparison table is slightly misleading

**Location:** Line 98

The table states Client Credentials has "No (richiedi nuovo token)" for refresh tokens. This is correct per the OAuth 2.0 spec (RFC 6749 Section 4.4.3 says the response SHOULD NOT include a refresh token). However, Keycloak *can* be configured to issue refresh tokens for client credentials grants. The current wording is fine as a simplification but could note this nuance.

**Recommendation:** No change strictly needed; optionally add "(per spec; Keycloak can be configured otherwise)" as a parenthetical.

---

### P2 — `pendingRequest` pattern has a subtle race condition edge case

**Location:** Lines 185-191, 218-220

If `fetchNewToken()` rejects, `pendingRequest` is set to `null` in the `finally` block, but all callers that awaited the same promise will receive the rejection. Subsequent calls will retry correctly. However, if `fetchNewToken` fails, `cachedToken` retains the old (expired) value and `tokenExpiry` is stale. A failed fetch should explicitly invalidate the cache.

**Recommendation:** Add `cachedToken = null; tokenExpiry = null;` in the `catch` block of `fetchNewToken()` before re-throwing, to ensure stale tokens are not reused.

---

### P2 — Client configuration JSON includes `secret` field

**Location:** Lines 111-119

The Keycloak client JSON representation shown includes `"secret": "shop-api-secret"`. In the Keycloak Admin REST API, the secret is not set this way — it is auto-generated or set via a separate endpoint (`/clients/{id}/client-secret`). If this is meant as a conceptual representation rather than an API payload, that should be clarified. Readers might try to POST this JSON and be confused.

**Recommendation:** Add a note that this is a conceptual representation of the configuration, or show the Admin Console UI steps instead.

---

### P2 — Missing `audience` validation in `jwtVerify`

**Location:** Lines 283-286

The `jwtVerify` call checks `issuer` and `clockTolerance` but does not validate the `audience` (`aud`) claim. In a production setup, the receiving service should verify that the token's audience matches its own client ID or a known resource identifier. Without this, a token intended for a different service could be accepted.

**Recommendation:** Add `audience` to the `jwtVerify` options and explain how to configure the audience mapper in Keycloak for service accounts.

---

### P2 — No error handling for missing `CLIENT_SECRET`

**Location:** Line 165

`CLIENT_SECRET` defaults to `undefined` if the env var is not set. The code will silently send `client_secret=undefined` in the token request, producing a confusing 401 from Keycloak.

**Recommendation:** Add a startup check that throws if `KEYCLOAK_CLIENT_SECRET` is not set, e.g.:
```javascript
if (!CLIENT_SECRET) throw new Error('KEYCLOAK_CLIENT_SECRET env var is required');
```

---

### P2 — Minor: `jose` library import style

**Location:** Line 255

The code uses `require('jose')` (CommonJS). The `jose` library v5+ is ESM-first. Using `require()` works with Node.js interop but readers using ESM projects may need `import { createRemoteJWKSet, jwtVerify } from 'jose'`. Worth a brief note.

**Recommendation:** Add a comment noting the ESM alternative import.

---

## Summary

| Priority | Count |
|----------|-------|
| P0       | 0     |
| P1       | 3     |
| P2       | 6     |

The article correctly explains the Client Credentials flow, provides working code with good patterns (token caching, JWKS validation, concurrent request deduplication), and highlights real-world pitfalls. The main areas for improvement are: clarifying the Keycloak URL path change post-v17, recommending scope/role-based authorization over hardcoded `azp` checks, and adding `audience` validation. No critical security issues or factual errors were found.
