---
title: "From console.log to Grafana: Structured and Centralized Logging with Node.js"
date: 2026-02-10T09:00:00.000Z
description: How to move from console.log to a structured, centralized logging system using Pino, OpenTelemetry, Loki, and Grafana on Node.js — in three incremental steps.
pillar: verificare
category: observability
tags:
  - Node.js
  - OpenTelemetry
  - Logging
  - Grafana
  - Pino
series: observability
seriesOrder: 80
lang: en
reviewed: machine
---

A "quick" `console.log` to understand why a request is failing in production produces a flat string: no timestamp, no severity level, no context. If the container restarts, those logs are gone. With multiple instances, your only option is jumping between `docker logs` windows looking for the right line. It is the fastest approach to start, but the first to become useless as the system grows.

This article covers the transition from `console.log` to a structured, centralized logging system in three incremental steps, each motivated by the limitations of the previous one.

> Full code: [github.com/monte97/otel-demo](https://github.com/monte97/otel-demo) (modules 01 and 02)
> ```bash
> git clone https://github.com/monte97/otel-demo
> cd otel-demo
> ```

---

## Why console.log Is Not Enough

An Express service with three endpoints and `console.log` produces output like this:

```text
Health check request received
Processing purchase...
Purchase completed successfully
[INFO] User mario is checking out with amount 29.99
```

Four flat strings. The comparison with a structured approach:

| Characteristic | `console.log` | Pino (structured) | Pino + OTel + Loki |
|---------------|--------------|------------------|-------------------|
| Format | Free-form string | Structured JSON | Structured JSON |
| Timestamp | Absent | Epoch ms (ISO 8601 configurable) | ISO 8601 automatic |
| Levels | None | error/warn/info/debug | error/warn/info/debug |
| Filtering | Manual grep | JSON fields | LogQL in Grafana |
| Persistence | Container lifecycle | Container lifecycle | Loki (persistent) |
| Multi-instance | `docker logs` per instance | `docker logs` per instance | Centralized query |

In short: format, persistence, and centralization are all missing. The following sections address each limitation in order.

---

## From Flat Strings to Filterable JSON

The first step requires no infrastructure — just adding a dedicated logging library. In these examples we use [Pino](https://github.com/pinojs/pino).

```bash
npm install pino
```

### Basic configuration

```javascript
// logger.js
const pino = require('pino');
const logger = pino({
    level: 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
        level(label) { return { level: label }; }
    }
});
```

Two relevant settings:
- **`pino.stdTimeFunctions.isoTime`** — adds the `"time"` field in ISO 8601 format
- **`formatters.level`** — converts the level from numeric (`30`) to string (`"info"`)

### Replacing console.log

```javascript
// Before
console.log(`[INFO] User ${user} is checking out with amount ${amount}`);

// After
logger.info({ userId: user, amount, action: 'checkout' }, 'Checkout started');
```

The output becomes a JSON object with separate fields:

```json
{
    "level": "info",
    "time": "2026-02-10T14:23:01.456Z",
    "userId": "mario",
    "amount": 29.99,
    "action": "checkout",
    "msg": "Checkout started"
}
```

### Child logger for HTTP context

For HTTP requests, a middleware creates a **child logger** that automatically adds context to every log within the request:

```javascript
const { randomUUID } = require('node:crypto');

app.use((req, res, next) => {
    req.logger = logger.child({
        requestId: randomUUID(),
        method: req.method,
        url: req.url
    });
    next();
});
```

Every call to `req.logger.info(...)` automatically includes `requestId`, `method`, and `url`. Given a `requestId`, you can reconstruct the complete sequence of logs for a single request.

> **Note:** Pino also supports writing to a file with `pino.destination('./logs/service.log')`, but with containers this approach requires managing volumes and log rotation. File logging does not solve the multi-instance centralization problem.

### Limitations

Logs are structured and performant ([Pino benchmarks](https://github.com/pinojs/pino/blob/main/docs/benchmarks.md)), but they remain local to the container. A restart deletes them, and with multiple instances you still need to access each one separately.

---

## Persistent Logs with Minimal Code Changes

Adding OpenTelemetry makes logs persistent and centralized with **minimal changes to application code**: a single instrumentation file and a `transport` property in the logger.

### Dependencies

In addition to Pino (already installed in the previous step), you need the OpenTelemetry SDK and the transport to connect Pino to the Collector:

```bash
npm install @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions \
  pino-opentelemetry-transport
```

### Instrumentation file

```javascript
// instrumentation.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');

const sdk = new NodeSDK({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: 'shop-service' }),
    instrumentations: [getNodeAutoInstrumentations()]
});

sdk.start();
```

### Application startup

```bash
# Before
node index.js

# After
node --require ./instrumentation.js index.js
```

The `--require` flag loads the SDK before any application code. The SDK enables `@opentelemetry/instrumentation-pino` (included in `auto-instrumentations-node`), which automatically injects `trace_id` and `span_id` into Pino logs, linking logs and traces.

To send logs to the Collector via OTLP, configure `pino-opentelemetry-transport` as a Pino transport. The transport runs in a separate worker thread and handles log delivery to the Collector independently of the SDK's `LoggerProvider`. Update `logger.js`:

```javascript
// logger.js (with OpenTelemetry)
const pino = require('pino');
const logger = pino({
    level: 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
        level(label) { return { level: label }; }
    },
    transport: {
        target: 'pino-opentelemetry-transport'
    }
});
```

The `transport` property redirects Pino's output to the OpenTelemetry SDK instead of stdout. Existing `logger.info()` calls remain unchanged.

The instrumentation is reversible: remove `--require` and the service returns to its original behavior.

> **Note:** `OTLPLogExporter()` without arguments uses `http://localhost:4318` as the endpoint. This works when the Node.js service runs on the host. If the service is containerized in the same Docker Compose, the endpoint must point to the service name: `http://otel-collector:4318`. In that case, set the environment variable `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318`.

---

## Three Docker Services to Close the Loop

The data flow follows this pipeline:

```text
App (Pino) → OTel SDK → Collector (:4318) → Loki (:3100) → Grafana (:3000)
```

### Docker Compose

```yaml
# docker-compose.yml
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.145.0
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./support/otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4318:4318"  # OTLP HTTP

  loki:
    image: grafana/loki:3.6.5
    ports:
      - "3100:3100"
    volumes:
      - loki-data:/loki  # log persistence across restarts

  grafana:
    image: grafana/grafana:12.3.2
    ports:
      - "3000:3000"
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Admin
      - GF_AUTH_DISABLE_LOGIN_FORM=true

volumes:
  loki-data:
```

> **Note:** This Grafana configuration is **for local development only**. `GF_AUTH_ANONYMOUS_ORG_ROLE=Admin` grants unauthenticated access with administrative privileges, and `GF_AUTH_DISABLE_LOGIN_FORM=true` completely disables the login form. Never use these settings in externally accessible environments. For production, see the [Grafana authentication documentation](https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/).

> **Note:** After the first startup, you need to manually add Loki as a data source in Grafana (URL: `http://loki:3100`). Alternatively, you can automate this with [Grafana provisioning files](https://grafana.com/docs/grafana/latest/administration/provisioning/#data-sources).

### Collector configuration

```yaml
# support/otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:

exporters:
  otlphttp/loki:
    endpoint: "http://loki:3100/otlp"
    tls:
      insecure: true

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/loki]
```

The Collector receives logs via OTLP HTTP, batches them, and forwards them to Loki via the native OTLP endpoint (available from Loki 3.x). The Collector acts as a control point: you can add additional backends, filter sensitive logs, or apply sampling by modifying only this configuration.

### Starting the stack

```bash
# Start Collector, Loki, and Grafana in the background
docker compose up -d

# Verify containers are running
docker ps
```

Once all three containers show as `healthy` or `running`, start the Node.js service with instrumentation:

```bash
node --require ./instrumentation.js index.js
```

---

## Filtering by Level, User, and Action

After starting the infrastructure with `docker compose up` and generating a few requests, Grafana is available at `http://localhost:3000`.

In **Explore**, selecting **Loki** as the data source, LogQL queries follow this structure:

```text
{service_name="shop-service"}
```

Examples of more specific queries:

| Goal | LogQL Query |
|------|------------|
| All service logs | `{service_name="shop-service"}` |
| Errors only | `{service_name="shop-service"} \| json \| level="error"` |
| A specific user's checkout | `{service_name="shop-service"} \| json \| userId="mario" \| action="checkout"` |
| Logs for a specific request | `{service_name="shop-service"} \| json \| requestId="<uuid>"` |

The `| json` pipeline step extracts JSON fields as filterable labels. Multiple filters (`| field="value"`) work as a logical AND.

After a container restart, logs remain available in Grafana. Persistence is guaranteed by Loki's storage.

---

## Common Mistakes

| Mistake | Consequence | Solution |
|---------|-------------|---------|
| Concatenating strings in logs | `logger.info("User " + id)` is not filterable | Use objects: `logger.info({ userId }, 'msg')` |
| Everything at `info` level | The level field loses meaning | `debug` for detail, `warn` for anomalies, `error` for failures |
| Missing `serviceName` | Logs are indistinguishable in Grafana | Set it in the SDK or via `OTEL_SERVICE_NAME` |
| No volume for Loki | `docker compose down` deletes all ingested logs | In production, mount a dedicated persistent volume |
| Centralizing without structuring | Persistent but unsearchable logs | First Pino (structure), then OTel (centralization) |

> **Security:** never log tokens, passwords, or personal data in structured fields. With centralized logging, a `logger.info({ password })` becomes visible to anyone with Grafana access.

### Cleanup

At the end of your session, to stop containers and remove volumes:

```bash
docker compose down -v
```

---

## Summary

This article covered:

1. **Limitations of `console.log`** — absence of structure, persistence, and centralization
2. **Structured logging with Pino** — JSON, levels, child logger for HTTP context
3. **Centralization with OpenTelemetry** — 20 lines of `instrumentation.js`, zero changes to existing application code
4. **Observability infrastructure** — Collector, Loki, and Grafana with three Docker services
5. **LogQL queries** — filtering by level, user, and action on centralized data

Logging is the first pillar of observability. In the next article: **distributed tracing** to follow a request across multiple services.

---

## Resources

* **Repository**: [github.com/monte97/otel-demo](https://github.com/monte97/otel-demo)
* **Pino**: [getpino.io](https://getpino.io/) — official documentation
* **OpenTelemetry Node.js**: [opentelemetry.io/docs/languages/js](https://opentelemetry.io/docs/languages/js/getting-started/nodejs/) — SDK setup
* **Grafana Loki LogQL**: [grafana.com/docs/loki/latest/query](https://grafana.com/docs/loki/latest/query/) — query language
* **instrumentation-pino**: [npmjs.com/package/@opentelemetry/instrumentation-pino](https://www.npmjs.com/package/@opentelemetry/instrumentation-pino) — Pino/OTel bridge
