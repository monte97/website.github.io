# Tech Review: Login con Keycloak — Authorization Code + PKCE

**Reviewer**: Claude Opus 4.6 (automated)
**Date**: 2026-02-20
**Article**: `content/posts/keycloak/02-authorization-code-pkce/index.md`

---

## Overall Score: 8/10

The article is technically solid, well-structured, and covers the Authorization Code + PKCE flow accurately. The troubleshooting section is a strong practical addition. A few issues need attention, mostly around security nuances and minor inaccuracies.

---

## Issues Found

### P0 (Critical)

*None found.* The core OAuth 2.0/PKCE concepts are correct, code snippets are functional, and no security vulnerabilities are introduced.

---

### P1 (Important)

#### 1. Missing `audience` validation is downplayed (Security / Best Practice)

**Location**: Lines 289-293, the `jwtVerify` call

The comment says `// In produzione, aggiungi: audience: 'shop-api'` but treats it as optional. Per RFC 9068 and OAuth 2.0 best practices, audience validation is essential in production to prevent token confusion attacks (a token intended for service A being used against service B). The article should state this more strongly, not as an afterthought comment.

**Recommendation**: Elevate the audience validation to a dedicated paragraph or callout block explaining why it matters and how to configure the audience mapper in Keycloak.

---

#### 2. `clockTolerance: 30` is generous (Security)

**Location**: Line 293

30 seconds of clock tolerance combined with 30 seconds of proactive token refresh means the system effectively accepts tokens up to 60 seconds past expiry. For a tutorial this is fine, but the article should note that in production 5-10 seconds is more typical.

**Recommendation**: Add a brief note that 30s is chosen for development convenience and should be reduced in production.

---

#### 3. Default `aud` claim value is `account`, not explained (Completeness)

**Location**: Line 508, JWT claims table

The table shows `aud: "account"` which is Keycloak's default behavior (the access token audience is the `account` service). This is surprising and confusing for readers who expect `aud` to be `shop-ui` or `shop-api`. Without explanation, readers will not understand why audience validation is tricky with Keycloak out of the box.

**Recommendation**: Add a note explaining that Keycloak sets `aud` to `account` by default and that a custom audience mapper is needed to add the API's identifier.

---

#### 4. Refresh token default lifetime is inaccurate (Factual)

**Location**: Line 479

> "Se il refresh token è scaduto (default: 30 minuti di inattività)"

Keycloak's default **SSO Session Idle** timeout is 30 minutes, but the refresh token lifetime is governed by **Client Session Idle** which defaults to the SSO Session Idle value. However, the **SSO Session Max** defaults to 10 hours. The "30 minuti di inattività" is correct for idle timeout, but could be clearer that this is the idle timeout specifically, and that there is also an absolute max lifetime.

**Recommendation**: Clarify: "il refresh token scade dopo 30 minuti di inattività (SSO Session Idle) o 10 ore in totale (SSO Session Max), valori configurabili nel realm."

---

#### 5. `code_verifier` length may be too short (Code Correctness)

**Location**: Lines 396-397

```bash
CODE_VERIFIER=$(openssl rand -base64 32 | tr -d '=/+' | head -c 43)
```

RFC 7636 requires the `code_verifier` to be 43-128 characters from the unreserved character set `[A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"`. Starting from 32 random bytes (which base64-encode to ~43 chars), then stripping `=`, `/`, `+` characters could leave fewer than 43 characters before the `head -c 43` truncation. This would produce a verifier shorter than the minimum.

**Recommendation**: Use `openssl rand -base64 48` (or 64) to ensure enough entropy survives character stripping. Example:
```bash
CODE_VERIFIER=$(openssl rand -base64 48 | tr -d '=/+' | head -c 128)
```

---

### P2 (Minor)

#### 6. `keycloak-js` PKCE default version note (Versions)

**Location**: Line 198

> "Dalla versione 24+ di keycloak-js, PKCE con S256 è il default"

This is correct. Keycloak 24+ defaults to PKCE S256 for public clients. The note is well-placed.

No action needed, just confirming accuracy.

---

#### 7. `Direct access grants: OFF` deserves a brief "why" (Completeness)

**Location**: Line 82

Disabling direct access grants (Resource Owner Password Credentials) is the right choice but the article doesn't explain why. A one-line note would help: this grant type sends passwords directly to the client, which defeats the purpose of delegating auth to Keycloak.

---

#### 8. Base64 decode command has a subtle issue (Code Correctness)

**Location**: Line 371

```bash
echo "eyJhbGci..." | cut -d'.' -f2 | tr '_-' '/+' | base64 -d 2>/dev/null | jq
```

The `tr` arguments are in the wrong order for base64url-to-base64 conversion. Base64url uses `-` instead of `+` and `_` instead of `/`. The correct mapping is `tr '-_' '+/'` (mapping `-` to `+` and `_` to `/`). The current `tr '_-' '/+'` happens to work because `tr` maps character-by-character (`_`->`/`, `-`->`+`), which is actually the same result. So functionally correct, but the conventional ordering `'-_' '+/'` is clearer and matches documentation.

**Recommendation**: Change to `tr '-_' '+/'` for readability and convention.

---

#### 9. `localStorage` vs `sessionStorage` for `code_verifier` (Best Practice)

**Location**: Line 492

> "il code_verifier va salvato in sessionStorage (non localStorage)"

Correct advice. `sessionStorage` is scoped to the tab and cleared when the tab closes, which matches the ephemeral nature of the PKCE flow.

No action needed, confirming accuracy.

---

#### 10. Missing `Content-Type` for non-body requests is fine but the conditional could be clearer (Code Style)

**Location**: Lines 233-234

```javascript
...(options.body ? { 'Content-Type': 'application/json' } : {}),
```

This only sets `Content-Type` when there's a body, which is correct. However, if someone passes a `FormData` body, this would incorrectly override the content type. A note or check for `typeof options.body === 'string'` would be more robust.

---

#### 11. RFC reference for Browser-Based Apps is still a draft (Versions)

**Location**: Line 548

The link to `draft-ietf-oauth-browser-based-apps` is correct and relevant, but worth noting it is still an Internet-Draft (not yet an RFC). The article implicitly treats it as authoritative, which is reasonable given its wide adoption, but a "(draft)" annotation would be more precise.

---

## Summary

| Priority | Count |
|----------|-------|
| P0 (Critical) | 0 |
| P1 (Important) | 5 |
| P2 (Minor) | 6 |

**Strengths:**
- PKCE flow explanation is accurate and well-paced
- The dual-URL pattern (Docker internal vs public) is a real-world pain point, well explained
- Troubleshooting section covers the most common issues developers actually face
- Code snippets are functional and follow current library APIs
- Security advice is generally sound (no secrets in SPA, use access token not ID token for API calls)

**Key actions before publishing:**
1. Fix `code_verifier` generation to use more entropy (P1 #5)
2. Strengthen audience validation guidance (P1 #1)
3. Explain default `aud: "account"` behavior (P1 #3)
4. Clarify refresh token timeout details (P1 #4)
5. Consider reducing `clockTolerance` recommendation for production (P1 #2)
