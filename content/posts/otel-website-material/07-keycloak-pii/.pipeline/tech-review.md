# Tech Review — PII Filtering in OpenTelemetry: Proteggere i Dati Sensibili di Keycloak

**Reviewer:** Claude Opus 4.6 (tech-review, round 2)
**Date:** 2026-02-20
**Article:** `content/posts/otel-website-material/07-keycloak-pii/index.md`
**Previous review:** 2026-02-17 (P0 issues on SHA-1 and KC_TELEMETRY vars have been fixed)

---

## Score: 7.5/10

The previous P0 issues (SHA-1 vs SHA-256, inconsistent Keycloak env vars) have been corrected. The article now correctly uses SHA-256 and `KC_TRACING_*` variables. Remaining issues are P1 and P2 level.

---

## P0 — Critical

None.

---

## P1 — Important

### 1. Unsalted SHA-256 hashing caveat is buried — should appear at point of introduction

**Location:** Lines 239-250 (hash processor introduced) vs line 532 (caveat about rainbow tables)

The article introduces hashing at line 239 with a brief YAML comment ("non e anonimizzazione completa se input space e limitato") but the real explanation of the risk appears 280 lines later (line 532). Readers implementing this section may stop before reaching the GDPR section.

Under GDPR recital 26, unsalted SHA-256 of low-entropy values like "mario" is trivially reversible and does NOT constitute pseudonymization. The hash is deterministic and the input space for common usernames/emails is small enough for rainbow table attacks.

**Fix:** Add a prominent blockquote warning immediately after the hash processor config (line 250):
> **Attenzione:** L'azione `hash` del Collector usa SHA-256 senza salt. Su input a bassa entropia (username, email comuni), l'hash e reversibile con rainbow tables. Questo fornisce correlazione, non anonimizzazione. Per pseudonymizzazione GDPR-compliant, considera HMAC-SHA256 con chiave segreta gestita separatamente.

### 2. Keycloak 26.0 tracing stability claim is inaccurate

**Location:** Line 36

> "dalla versione 26.0 come feature stabile"

Keycloak 26.0 introduced OTel tracing as a **preview** feature. It was stabilized in later 26.x releases. The note at line 123 partially addresses this for `KC_TELEMETRY_*` variables, but the line 36 claim is misleading.

**Fix:** Change to "dalla versione 26.0 (inizialmente come preview, stabilizzata nelle release successive)".

### 3. Duplicate tracing configuration — CLI args and env vars both set

**Location:** Lines 85-100

The compose sets tracing via both CLI args (`--tracing-enabled=true`, `--metrics-enabled=true` in the `command`) and environment variables (`KC_TRACING_ENABLED: "true"`, `KC_METRICS_ENABLED: "true"`). This is redundant and confusing. Keycloak's precedence rules between CLI and env vars vary by version.

**Fix:** Remove the CLI flags from `command` and keep only the environment variables, or vice versa. Add a note about which method takes precedence.

### 4. Collector version `0.120.0` may not exist at publish time

**Location:** Line 104

As of February 2026, verify that `otel/opentelemetry-collector-contrib:0.120.0` is a real published image. Collector releases are roughly monthly; 0.120.0 would correspond to approximately late 2025 / early 2026. If it does not exist, pin to a verified version.

**Fix:** Verify on Docker Hub or GitHub releases before publishing.

### 5. `db.statement` vs `db.query.text` — missing new semantic convention

**Location:** Lines 258-261

The sanitize processor filters `db.statement`, which is the old database semantic convention attribute name. The new stable convention (from OTel semantic conventions v1.28+) uses `db.query.text`. Depending on the Quarkus/OTel SDK version bundled with Keycloak 26.0, either name could be emitted.

**Fix:** Add `db.query.text` to the sanitize processor, mirroring the approach already used for `http.url`/`url.full` in the redact processor. The article already has a note about old vs new HTTP conventions (line 301) — extend this to database conventions.

### 6. Tempo retention config shown without file context

**Location:** Lines 491-496

The `compactor` YAML block is Tempo configuration, not OTel Collector configuration. It appears immediately after OTel Collector YAML blocks with no clear file label. Readers may try to add it to the collector config.

**Fix:** Add a clear header comment: `# tempo.yaml (configurazione Tempo, non OTel Collector)`.

---

## P2 — Minor

### 7. URL query parameter example is not realistic for password grant

**Location:** Line 43

`"http.url": "/auth/realms/techstore/protocol/openid-connect/token?username=mario"` — in the password grant flow, `username` is sent in the request body, not as a URL query parameter. The curl example (line 138) correctly uses `-d`, but the JSON example implies it ends up in the URL.

**Fix:** Either change the example to show a more realistic URL PII scenario (e.g., `login_hint` parameter, or redirect URI with user info), or add a note that this is simplified for illustration.

### 8. `enduser.id` populated with username — verify Keycloak behavior

**Location:** Line 45

`"enduser.id": "mario"` — Keycloak's native tracing typically populates `enduser.id` with the internal UUID, not the username. Verify the actual attribute value emitted by Keycloak 26.0.

**Fix:** If Keycloak emits the UUID, update the example accordingly. The hash processor on `enduser.id` is still valid either way.

### 9. CVV should be DELETE, not REDACT

**Location:** Line 474

> "Payment (Stripe): DELETE card numbers, REDACT CVV"

CVV should never be stored or logged in any form (PCI-DSS requirement). It should be DELETE, not REDACT.

**Fix:** Change to "DELETE card numbers, DELETE CVV".

### 10. Missing log filtering mention

The article covers traces and metrics but does not mention that Keycloak can also export **logs** via OTLP (with the `opentelemetry-logs` feature flag). Logs from authentication flows frequently contain usernames and error details with PII.

**Fix:** Add a brief note that if OTLP log export is enabled, the same filtering principles apply using `log_statements` context in the transform processor.

### 11. `error_mode: ignore` silently swallows misconfigurations

**Location:** Lines 226, 257

While `error_mode: ignore` is appropriate for production (avoids dropping spans due to processor errors), readers should know that misconfigured regex patterns will fail silently.

**Fix:** Add a note recommending `error_mode: propagate` during development/testing to surface errors.

### 12. Second curl command missing `Content-Type` header

**Location:** Lines 330-334

The first curl (line 138) includes `-H "Content-Type: application/x-www-form-urlencoded"` but the second omits it. While curl defaults to this with `-d`, the inconsistency may confuse readers.

### 13. HTML `<img>` tags vs markdown image syntax

**Location:** Lines 156, 160, 164, 313

The article uses `<img>` HTML tags with `width` attributes instead of the blog's standard `![alt](path)` markdown syntax. Functionally fine (Hugo `unsafe: true` is enabled), but inconsistent with other articles in the blog.

---

## Summary

| Priority | Count | Key Themes |
|----------|-------|------------|
| P0 | 0 | Previous P0s have been fixed |
| P1 | 6 | Hash caveat placement, version accuracy, semantic conventions, config clarity |
| P2 | 7 | Minor inaccuracies, completeness, style consistency |

**Strengths:**
- Clear problem statement with a concrete, runnable scenario
- Four filtering techniques well explained with rationale for each
- Safe/unsafe toggle for hands-on comparison
- GDPR section adds real value beyond pure tech content
- Previous review issues (SHA-1, KC_TELEMETRY vars) have been addressed

**Weaknesses:**
- Hash pseudonymization caveat is too far from the code that introduces it
- Keycloak feature stability overstated
- Missing `db.query.text` in sanitize processor (new semantic conventions)
- Tempo config block lacks file context label
- No mention of log filtering

**Verdict: needs-minor-rework**

The article is substantially improved from the previous review. The remaining P1 issues are straightforward fixes (add warnings, correct version claims, add missing attribute names). No structural rework needed.
