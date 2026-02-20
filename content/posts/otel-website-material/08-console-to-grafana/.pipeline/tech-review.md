# Tech Review — Da console.log a Grafana

**Reviewer:** Claude Opus 4.6 (tech-review)
**Date:** 2026-02-20
**Article:** `08-console-to-grafana/index.md`

---

## Overall Score: 8/10

Solid, well-structured article with correct core concepts and working code. A few factual inaccuracies and omissions prevent a higher score.

---

## P0 — Critical

### 1. `pino-opentelemetry-transport` installed but never used

The article installs `pino-opentelemetry-transport` (line 145) but never configures it in the Pino logger. The `@opentelemetry/instrumentation-pino` package (from `auto-instrumentations-node`) injects trace context into Pino log records but does **not** export logs to the Collector by itself. There are two distinct mechanisms:

- **Option A (instrumentation-pino):** Injects `trace_id`/`span_id` into Pino output. Logs still go to stdout; a separate log collector (e.g., Promtail, Fluent Bit) ships them to Loki.
- **Option B (pino-opentelemetry-transport):** A Pino transport that sends logs directly to the OTel SDK's `LoggerProvider`, which then exports via OTLP.

The article implies Option A alone sends logs to the Collector via OTLP (line 180), which is incorrect. Either:
- Configure `pino-opentelemetry-transport` as a Pino transport in `logger.js`, **or**
- Remove `pino-opentelemetry-transport` from deps and clarify that a log shipper (Promtail/Alloy) is needed alongside the instrumentation.

**Impact:** Readers following the steps will not see logs in Grafana/Loki.

### 2. `serviceName` in wrong location

```javascript
const sdk = new NodeSDK({
    // ...
    serviceName: 'shop-service'  // line 165
});
```

`serviceName` is not a top-level `NodeSDK` constructor option as of `@opentelemetry/sdk-node` v0.57+. The correct approach is to set `OTEL_SERVICE_NAME=shop-service` as an environment variable, or configure a `Resource`:

```javascript
const { Resource } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');

const sdk = new NodeSDK({
    resource: new Resource({ [ATTR_SERVICE_NAME]: 'shop-service' }),
    // ...
});
```

**Note:** Some older SDK versions accepted `serviceName` as sugar. Verify against the pinned version. If using a version that supports it, add a note about the alternative.

---

## P1 — Important

### 3. Missing `OTEL_EXPORTER_OTLP_ENDPOINT` configuration

The `instrumentation.js` file creates an `OTLPLogExporter()` with no endpoint argument. The default is `http://localhost:4318`. This works when Node.js runs on the host, but the article also uses Docker Compose. If the app is containerized too, the endpoint must point to `http://otel-collector:4318`. The article should clarify when the default works and when an explicit endpoint is needed.

### 4. Loki OTLP endpoint availability claim

> "endpoint OTLP nativo (disponibile da Loki 3.x)"

The OTLP endpoint was introduced in Loki **3.0** but was experimental. It became stable in **3.3+**. The pinned version (3.6.5) is fine, but the statement "da Loki 3.x" is imprecise -- early 3.x had limited OTLP support. Minor clarification recommended.

### 5. Grafana anonymous admin in Docker Compose

Flagged in the article's own note, which is good. However, the note says "in produzione, abilitare l'autenticazione" without mentioning that the current config also disables the login form entirely (`GF_AUTH_DISABLE_LOGIN_FORM=true`). Recommend explicitly stating this is **dev-only** and should never be in a production compose file.

### 6. No Loki volume persistence

The "Errori comuni" table mentions this, but the Docker Compose itself has no volumes for Loki. For a tutorial that emphasizes persistence as a key benefit, this is contradictory. Add a comment in the compose file or a named volume for Loki data.

### 7. LogQL filter syntax

```
{service_name="shop-service"} | json | level="error"
```

After `| json`, field filters use `|` not `| `. The correct syntax for label filter expressions is:

```
{service_name="shop-service"} | json | level=`error`
```

or with double equals for strict matching. The shown syntax will work but only because Loki is lenient with `=` vs `==` after `| json`. Worth noting that for nested JSON fields or special characters, backtick quoting is preferred.

---

## P2 — Minor

### 8. Typo: "solo solo"

Line 57: "non richiede infrastruttura, solo solo aggiungere" -- duplicated "solo".

### 9. Collector version pinning

`otel/opentelemetry-collector-contrib:0.145.0` -- as of February 2026 the latest is around 0.120.x. Version 0.145.0 does not exist yet. Use a real, current version.

### 10. LGTM acronym usage

Line 327: "Infrastruttura LGTM" -- LGTM stands for Loki, Grafana, Tempo, Mimir. The article only uses Loki and Grafana (no Tempo, no Mimir), so calling it "LGTM" is inaccurate. Use "Collector + Loki + Grafana" or simply "stack di osservabilita".

### 11. `require` vs ESM

All code uses CommonJS (`require`). Node.js 22+ defaults to ESM in many setups. A brief note about module system would help readers using `"type": "module"` in `package.json`.

### 12. Missing `pino-pretty` mention

For local development, `pino-pretty` is commonly used to make JSON logs human-readable. A one-line mention would improve DX coverage.

---

## Summary

| Priority | Count | Items |
|----------|-------|-------|
| P0 | 2 | #1 (transport not wired), #2 (serviceName API) |
| P1 | 5 | #3-#7 |
| P2 | 5 | #8-#12 |

The two P0 issues mean a reader following the tutorial step-by-step will likely not see logs in Grafana. Fixing the Pino-to-OTel transport wiring and the `serviceName` configuration resolves the critical path. The remaining issues are correctness and polish improvements.
