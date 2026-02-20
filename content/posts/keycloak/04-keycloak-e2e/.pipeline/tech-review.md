# Tech Review: Keycloak in Pratica — 6 Problemi Reali

**Reviewer**: Claude Opus 4.6 (tech-review)
**Date**: 2026-02-20
**Article**: `content/posts/keycloak/04-keycloak-e2e/index.md`

---

## Overall Score: 8/10

Solid, practical article that documents real integration pitfalls. The problems are well-chosen, the explanations are clear, and the corrections are sound. A few factual inaccuracies and missing nuances prevent a higher score.

---

## Issues Found

### P1 — Problema 3: `sub` does not start with `service-account-` in Keycloak

> ```javascript
> const isServiceAccount = payload.sub?.startsWith('service-account-');
> ```

The `sub` claim in Keycloak tokens is a UUID, not a human-readable string. It does **not** start with `service-account-`. The `preferred_username` claim contains `service-account-<clientId>`, but `sub` is always a UUID like `f47ac10b-58cc-4372-a567-0e02b2c3d479`. This suggested fix would never match.

**Fix**: Replace the `sub`-based suggestion with `preferred_username`-based check, or remove that alternative entirely and keep only the `clientId` + role approach (which is correct).

---

### P1 — Problema 3: `realm_access.roles` does not contain `service-account` by default

> ```javascript
> const isServiceAccount = payload.clientId !== undefined
>   && payload.realm_access?.roles?.includes('service-account');
> ```

Keycloak does not assign a `service-account` realm role by default. Service accounts get a composite role `uma_authorization` and client-specific roles under `resource_access`, but no `service-account` realm role. The role is typically named `default-roles-<realm>` or custom roles.

A more reliable approach: check for the presence of `clientId` claim (only present in client credentials tokens in Keycloak 17+) combined with absence of `session_state` (service account tokens obtained via client credentials do not have a session).

**Fix**: Adjust the suggested code to use a reliable indicator, e.g.:

```javascript
const isServiceAccount = payload.clientId !== undefined && !payload.session_state;
```

Or document that `service-account` is a custom role that must be explicitly assigned.

---

### P1 — Problema 4: Roles claim location is incorrect

> ```javascript
> canCheckout: payload.roles?.includes('can-checkout') || false
> ```

In Keycloak JWT tokens, realm roles are under `payload.realm_access.roles`, not `payload.roles`. The top-level `roles` claim does not exist by default. This code would always evaluate to `false`.

**Fix**: Change to `payload.realm_access?.roles?.includes('can-checkout')`.

---

### P2 — Problema 1: `/auth` path prefix depends on Keycloak version

The article uses URLs like `http://localhost:8080/auth/realms/techstore`. The `/auth` context path was the default in Keycloak versions before 17 (WildFly-based). Starting with Keycloak 17+ (Quarkus-based), the default is no prefix: `http://localhost:8080/realms/techstore`. The article references `KEYCLOAK_AUTH_PATH` in code but doesn't clarify this version dependency.

**Fix**: Add a brief note that the `/auth` prefix applies to legacy Keycloak (pre-17) and that Quarkus-based Keycloak (17+) uses no prefix by default, or clarify which version MockMart uses.

---

### P2 — Problema 2: Audience claim requires explicit mapper configuration

The article correctly states "configurare un audience mapper nel client scope" but could be more specific. By default, Keycloak does **not** populate the `aud` claim with the client ID for access tokens (only for ID tokens). Readers may configure `audience: 'shop-api'` in `jwtVerify` and find that all tokens are now rejected because the `aud` claim is missing from the access token.

**Fix**: Add a concrete step: "In Keycloak, create a Protocol Mapper of type 'Audience' in the client scope, setting 'Included Client Audience' to 'shop-api' and enabling 'Add to access token'."

---

### P2 — Problema 5: Error handling missing in corrected code

The corrected `getServiceToken()` with `pendingRequest` has a subtle issue: if `fetchToken()` rejects, the error propagates to all 50 waiting callers, which is correct. However, the next call after failure will also return `null` from cache because `cachedToken` was not updated. This is fine but worth noting — the code correctly handles this since the cache check will miss and trigger a new fetch.

No change needed, but a comment in the code clarifying error propagation would help readers.

---

### P2 — RFC 9700 reference

The article links to RFC 9700 as "OAuth 2.0 Security Best Current Practice". As of the knowledge cutoff, this was published as RFC 9700 in late 2024. Verify the RFC number is correct and stable (it was previously known as draft-ietf-oauth-security-topics).

---

### P2 — `checkLoginIframe: false` nuance

The article says disabling the login iframe means "un utente che fa logout da un'altra tab resta autenticato nel frontend fino alla scadenza del token (5 minuti)." This is correct behavior-wise, but the iframe check only detects SSO session changes — it does not invalidate the local token. Even with the iframe enabled, the access token remains valid until expiry. The iframe triggers a silent re-auth/logout when the session is gone. The explanation could be more precise.

**Fix**: Minor rewording to clarify that the iframe detects session invalidation and triggers local logout, not that it invalidates the token itself.

---

## Factual Correctness

| Topic | Verdict |
|---|---|
| OAuth 2.0 Authorization Code + PKCE flow | Correct |
| JWT issuer validation semantics | Correct |
| Audience claim purpose and behavior | Correct |
| Client Credentials grant for M2M | Correct |
| JWKS endpoint for key retrieval | Correct |
| `sslRequired` values and meaning | Correct |
| Race condition in token caching | Correct, well-explained |
| `azp` claim semantics | Correct |

## Code Correctness

| Snippet | Verdict |
|---|---|
| `jwtVerify` with jose library | Correct syntax (panva/jose) |
| Promise-based lock pattern | Correct and idiomatic |
| `parseBoolean` helper | Correct, covers all cases |
| Service account detection fix | Incorrect (P1 issues above) |
| Role-based canCheckout | Incorrect claim path (P1) |

## Security Assessment

The article's security advice is generally sound. It correctly identifies real-world anti-patterns (missing audience, secrets in repos, HTTP in prod). The suggested fixes are in the right direction, with the caveats noted in P1 issues above.

No dangerous advice is given. The article appropriately warns against every insecure pattern it documents.

## Summary

| Priority | Count |
|---|---|
| P0 (critical) | 0 |
| P1 (important) | 3 |
| P2 (minor) | 4 |

The three P1 issues all relate to Keycloak-specific JWT claim structures in the suggested fixes (Problems 3 and 4). The original problem descriptions are accurate — only the proposed corrections contain errors. Fixing these would bring the article to a 9/10.
