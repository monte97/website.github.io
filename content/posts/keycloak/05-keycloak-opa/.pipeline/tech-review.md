# Tech Review: Autorizzazione Granulare con OPA e Keycloak

**Reviewer:** Claude Opus 4.6 (automated)
**Date:** 2026-02-20
**Article:** `content/posts/keycloak/05-keycloak-opa/index.md`

---

## Overall Score: 8/10

Solid, well-structured article. OPA concepts, Rego syntax, and integration patterns are presented accurately. A few issues to address, mostly minor.

---

## Issues

### P1 — `openpolicyagent/opa:latest-debug` is not suitable for production guidance

**Location:** Docker Compose snippet (line ~441)

The `latest-debug` image tag is fine for a demo, but the article never mentions this. The debug image includes a shell and is larger; more importantly, `latest` is a floating tag. Best practice is to pin a specific version (e.g., `openpolicyagent/opa:1.4.2`). Add a note recommending version pinning for reproducibility and security.

### P1 — OPA Data API response shape: `result` can be `undefined`

**Location:** `checkPolicy` function (line ~213)

When no policy is loaded or the package path is wrong, OPA returns `{}` (no `result` key) rather than `{ "result": false }`. The current code `data.result === true` handles this correctly (returns `false`), but the article's prose on line 58 says OPA responds `{ "result": true }` or `{ "result": false }`. This is misleading — it can also return `{}` or `{ "result": undefined }`. A brief mention would improve accuracy.

### P1 — `products.rego` RBAC rules can be DRY-ed

**Location:** lines 91-116

The three admin rules (`create`, `update`, `delete`) are repetitive. Idiomatic Rego would use a set:

```rego
allow if {
    input.action in {"create", "update", "delete"}
    "admin" in input.user.roles
}
```

This is not an error, but for an article teaching Rego patterns, showing the idiomatic form (even as a refactoring note) would be valuable. Similarly for `orders.rego`.

### P2 — `allow with input as {"action": "read", "user": null}` test may not match production behavior

**Location:** Rego test (line 338)

The `products.rego` read rule checks only `input.action == "read"` and does not reference `input.user`. So this test passes. However, in production, `optionalAuth` may populate `req.user` as `null`, and the middleware sets `user: null` in the input object. The test correctly mirrors this, so no bug, but worth noting that the read policy intentionally allows unauthenticated access — the article could be more explicit about this design choice.

### P2 — Ownership list pattern sends `resource_owner: req.user.id`

**Location:** lines 303-306

For the "list orders" route, `resource_owner` is set to the current user's own ID. This means the OPA check effectively becomes `input.resource_owner == input.user.id`, which is always true for non-admin users. The real filtering (returning only the user's orders) must still happen in the database query inside the handler. The article should clarify that OPA here acts as a gate (can this user list orders at all?) but the actual data scoping is the handler's responsibility. Without this note, a reader might think OPA handles the filtering.

### P2 — Missing error handling for DB query in orders/:id middleware

**Location:** lines 312-321

The `pool.query` call has no try/catch. If the database is unreachable, the middleware will throw an unhandled rejection. Since the article emphasizes "fail closed" as a principle, this inconsistency is worth noting.

### P2 — RFC 9700 reference for ROPC deprecation

**Location:** line 369

The article references RFC 9700 for the deprecation of Resource Owner Password Credentials. This is correct (RFC 9700 obsoletes the implicit and ROPC grants). Good citation.

### P2 — `checkout.rego` does not check `input.user` existence

**Location:** lines 131-138

If `input.user` is `null` (unauthenticated), `input.user.username` would evaluate to `undefined` in Rego (not an error), so `is_blocked` would be false, and `allow` would be true — an unauthenticated user could pass the checkout policy. In practice this is guarded by `requireAuth` in the Express route, so there is no real vulnerability, but the policy in isolation is not self-contained. A defensive check like `input.user != null` in the `allow` rule would make the policy more robust.

### P2 — No mention of OPA bundle API or hot-reload mechanism

The article says "ricaricare OPA" when updating `data.json` but does not explain how. With volume mounts, OPA does NOT automatically detect file changes — the server must be restarted, or the Bundle API / `--watch` flag must be used. Clarify this.

---

## Factual Correctness

- OPA as a general-purpose policy engine: correct
- Rego syntax (`default allow = false`, `allow if { ... }`, `import data.*`, `with input as`): all valid OPA v1.x / Rego v1 syntax
- OPA Data API endpoint `/v1/data/{path}`: correct
- JWT validation flow with JWKS + OPA sidecar pattern: standard and well-described
- Keycloak realm/token endpoint paths: correct for Keycloak with `/auth` prefix (older versions or explicit config)

## Code Correctness

- Rego policies: syntactically valid, logically correct
- JavaScript middleware: functional, proper use of Express middleware pattern
- `checkPolicy` correctly uses POST to Data API with `{ input }` body
- `data.result === true` is the right strict check

## Security

- Fail-closed on OPA unavailability (503): correct and important
- Deny-by-default in all policies: correct
- `checkout.rego` not self-contained (see P2 above) — mitigated by route-level auth
- No SSRF risk: OPA URL is internal and hardcoded via env var
- Volume mounts are read-only (`:ro`): good practice

## Versions & Compatibility

- Rego syntax uses `allow if { }` (Rego v1 / OPA 1.x) — correct for current OPA
- `"admin" in input.user.roles` uses the `in` keyword (available since OPA 0.34) — correct
- Keycloak `/auth/realms/...` path suggests Keycloak < 25 or with `/auth` prefix enabled

## Completeness

- Covers RBAC, deny list, ownership — good breadth
- Missing: OPA decision logging / monitoring in production
- Missing: caching strategies (OPA decisions are fast but still network calls)
- Missing: how to reload data.json changes (see P2)
- The comparison table (claims vs OPA) is balanced and fair

---

## Summary

| Priority | Count |
|----------|-------|
| P0       | 0     |
| P1       | 3     |
| P2       | 6     |

The article is technically accurate and well-structured. The main improvements needed are: (1) pin OPA image version, (2) clarify that OPA can return undefined results, (3) show idiomatic Rego for repeated rules, (4) clarify the ownership list pattern's limitations, and (5) explain the data.json reload mechanism.
