---
title: "OpenTelemetry in Production: Data Routing for Compliance and Cost Control"
date: 2026-02-12T09:00:00.000Z
description: Separate audit logs from technical logs using the OTel Collector routing connector. Demo, GDPR/SOC 2 compliance, and differentiated retention strategies.
pillar: verificare
category: observability
tags:
  - OpenTelemetry
  - Observability
  - Routing
  - Compliance
  - Production
series: observability
seriesOrder: 60
lang: en
reviewed: machine
---

Imagine receiving a request from your compliance team: "We need the audit logs from the last three years." You open Grafana, query Loki, and discover that the maximum retention is 30 days. The audit logs were deleted together with the debug logs, because they lived in the same backend. No separation, no dedicated policy.

The [previous article](/blog/verificare/observability/05-management/) addressed the first production problem: **volume**. With tail sampling and retention, volume drops by 90% without losing visibility into errors. But a question remains: for the data that does survive, **where does it end up?**

Today everything lands in the same backend: debug logs, application errors, and audit trails all live in the same Loki instance. In development that works fine. In production it can become a compliance or operational issue.

---

## Different Data, Different Requirements

In a standard configuration, the Collector receives all signals and forwards them to a single destination:

```text
Applications
    |
    v
  OTel Collector
    |
    v
  Loki (all logs)
    |
    v
  Grafana (everything together)
```

All logs, regardless of type, end up in the same place.

### Compliance and Audit

Regulations such as **[GDPR](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679)**, **[SOC 2](https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2)**, and **[HIPAA](https://www.hhs.gov/hipaa/index.html)** require — or strongly recommend — that audit data be:

- **Segregated** from technical logs (separate access)
- **Tamper-evident and integrity-protected** (write-once or append-only)
- **Accessible only to authorized parties** (dedicated access control)
- Retained for a **defined period** (from 1 to 6+ years depending on the regulation)

If audit logs and debug logs live in the same Loki instance, none of these requirements are met. Anyone with Grafana access for debugging also sees audit data. There is no immutability guarantee. Retention is the same for everything.

### Operational Issues

Mixing streams also creates operational problems:

| Problem | Example |
|---------|---------|
| **Noisy search** | Finding an audit event among millions of debug logs |
| **Uniform costs** | Paying the same retention for debug logs (useful for 24h) and audit logs (required for years) |
| **Indiscriminate access** | Developers seeing potentially sensitive data |
| **No priority** | A debug log spike slows ingestion for audit entries too |

### A concrete scenario

For an application at 100 req/s, the daily volume is:

| Log type | Estimated volume | Utility | Ideal retention |
|----------|-----------------|---------|----------------|
| Debug | ~500,000/day | Active troubleshooting only | 24–48 hours |
| Info/Warning | ~200,000/day | General monitoring | 7–30 days |
| Application errors | ~5,000/day | Post-mortems, alerting | 30–90 days |
| Audit (checkout, login) | ~2,000/day | Compliance, forensics | 1–7 years |

With a flat configuration, all 707,000 logs/day end up in the same Loki with the same 30-day retention. The 2,000 audit logs get deleted after a month along with the debug logs. This configuration does not meet compliance requirements.

The concept is simple: **different data has different requirements**. Routing all data with heterogeneous requirements to a single destination makes it impossible to apply differentiated policies.

---

## Routing Based on Content

The OTel Collector can do more than collect and forward. With the **routing connector**, it becomes a router that directs each piece of data based on its attributes.

### Architecture

```text
Application (logs with attributes)
    |
    | OTLP
    v
OTel Collector (Routing Connector)
    |
    +-- audit.event=false --> Loki (technical logs)
    |
    +-- audit.event=true  --> Audit Service (compliance)
```

| Destination | Content | Characteristics |
|------------|---------|----------------|
| **Loki** | Info, Debug, Warning, Error | Fast queries, short retention |
| **Audit Service** | Audit logs | Immutable, controlled access, 7-year retention |

The principle: **each log is marked in code** with an attribute indicating its type. The Collector reads the attribute and routes the log to the correct destination. The application does not need to know where data ends up — it only decides **what** something is, not **where** it goes.

This approach has a fundamental advantage: **routing logic is centralized**. If the compliance team tomorrow asks for audit logs to also be sent to S3, you modify the Collector configuration. No application changes, no microservice deploys.

---

## The Collector Decides the Destination

The configuration is built from three elements: **receivers**, **exporters**, and **pipelines**. Routing is achieved by configuring multiple exporters in the same pipeline.

### Base configuration: exporter split

The starting point is the `otel-collector-split.yaml` from Module 06:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
      http:

processors:
  batch:

exporters:
  debug:
    verbosity: detailed
  otlphttp/loki:
    endpoint: "http://loki:3100/otlp"
    tls:
      insecure: true
  otlphttp/audit:
    endpoint: "http://audit-service:4000"
    tls:
      insecure: true

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/loki, otlphttp/audit, debug]
```

This configuration sends **all logs** to three destinations simultaneously:

- **otlphttp/loki**: the standard backend for technical logs (query via Grafana)
- **otlphttp/audit**: a dedicated service that receives logs via OTLP HTTP
- **debug**: verbose output to the Collector console (useful in development)

> **Note**: In this configuration all logs reach every destination. This is a fan-out, not yet selective routing. A more advanced production setup would use the **routing connector** to send *only* audit logs to the audit service, filtering on the `audit.event` attribute. For the demo scenario, fan-out is sufficient to demonstrate destination separation.

### Selective routing with the routing connector

For granular separation, the routing connector makes decisions based on log attributes. Unlike a processor (which operates within a pipeline), the connector sits **between pipelines**: it acts as an exporter for the upstream pipeline and as a receiver for the downstream pipelines.

```yaml
receivers:
  otlp:
    protocols:
      grpc:
      http:

processors:
  batch:

exporters:
  otlphttp/loki:
    endpoint: "http://loki:3100/otlp"
    tls:
      insecure: true
  otlphttp/audit:
    endpoint: "http://audit-service:4000"
    tls:
      insecure: true

connectors:
  routing/logs:
    default_pipelines: [logs/default]
    error_mode: ignore
    table:
      - context: log
        condition: attributes["audit.event"] == true
        pipelines: [logs/audit]

service:
  pipelines:
    logs/ingestion:
      receivers: [otlp]
      processors: [batch]
      exporters: [routing/logs]
    logs/default:
      receivers: [routing/logs]
      exporters: [otlphttp/loki]
    logs/audit:
      receivers: [routing/logs]
      exporters: [otlphttp/audit]
```

The logic:

1. The `logs/ingestion` pipeline receives all logs via OTLP and sends them to the `routing/logs` connector
2. The connector evaluates the OTTL condition: if `attributes["audit.event"] == true`, the log is routed to the `logs/audit` pipeline
3. All other logs go to the `logs/default` pipeline (Loki)

Each downstream pipeline can have its own processors and exporters. Applications do not change their destination: the Collector decides for them.

> **Note:** The routing connector uses **OTTL** (OpenTelemetry Transformation Language) for conditions. With `context: log` you access log record attributes directly. This allows routing on any field: `severity_number`, `body`, `resource.attributes["service.name"]`, or custom attributes like `audit.event` (provided they are explicitly copied from the span to the log record via a logHook — see the [next section](#propagating-attributes-from-span-to-log)).

---

## The Application Marks; the Collector Routes

For routing to work, the application must **mark** logs with the correct attributes. In Module 06, the `shop-service` adds the `audit.event` attribute to the active span when a sensitive operation occurs.

### Checkout endpoint with audit marking

```javascript
// shop-service/index.js — /checkout endpoint
app.post('/checkout', async (req, res) => {
    const user = req.body.user || 'anonymous';
    const amount = req.body.amount;

    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
        currentSpan.setAttribute('audit.event', true);
        currentSpan.setAttribute('audit.user', user);
    }

    logger.info({ event: 'audit', user, amount }, 'User checking out');

    res.json({ status: 'processed', orderId: `ORD-${Date.now()}` });
});
```

What happens here:

1. **`trace.getActiveSpan()`** retrieves the current span from the OpenTelemetry context
2. **`setAttribute('audit.event', true)`** marks the span as an audit event
3. **`setAttribute('audit.user', user)`** adds user identity for traceability
4. The **Pino log** includes `event: 'audit'` as structured information

### Propagating attributes from span to log

There is an important detail: `setAttribute` on the span does **not** automatically propagate the attribute to log records. Spans and logs are separate signals in OpenTelemetry; they share the same `trace_id` and `span_id` (correlation), but **not** their attributes. Without an explicit step, the routing connector would not see `audit.event` on the log record.

The solution is a **`logHook`** in the `PinoInstrumentation` configuration. The logHook is invoked every time Pino emits a log within an active span, and allows copying attributes from the span to the log record:

```javascript
// instrumentation.js — logHook to propagate audit attributes
instrumentations: [getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-pino': {
        logHook: (span, record) => {
            const auditEvent = span.attributes?.['audit.event'];
            if (auditEvent !== undefined) {
                record['audit.event'] = auditEvent;
                record['audit.user'] = span.attributes?.['audit.user'];
            }
        },
    },
})],
```

The complete flow:

1. **`span.setAttribute('audit.event', true)`** — the application marks the span
2. **`logHook`** — the Pino instrumentation copies `audit.event` into the log record
3. **Routing connector** — the Collector reads `attributes["audit.event"]` on the log and routes accordingly

Without the logHook, the Collector would see `audit.event` only on the span (useful for traces), but not on the log record. Log routing would not work.

The application does not know where the log ends up. It only knows it is an audit event. The routing decision lives entirely in the Collector.

### What not to mark

Not everything should be an audit log. A practical rule:

| Type | Attribute | Example |
|------|-----------|---------|
| **Audit** | `audit.event=true` | Checkout, login, permission changes, access to sensitive data |
| **Technical** | no attribute (default) | Debug, info, warnings, application errors |

When in doubt, do not mark. Unmarked logs flow to the default stream (Loki) and are always available for debugging.

---

## A Dedicated Service for Each Destination

The audit service is a microservice dedicated to receiving and persisting audit logs. In Module 06 it is implemented as a minimal Express server:

```javascript
// audit-service/index.js
const express = require('express');
const app = express();
const PORT = 4000;

app.use(express.json());

app.post('/v1/logs', (req, res) => {
    console.log('Received Audit Log Batch:', JSON.stringify(req.body, null, 2));
    res.status(200).send({ status: 'success' });
});

app.listen(PORT, () => {
    console.log(`Audit Service running on port ${PORT}`);
});
```

The service exposes a **`/v1/logs`** endpoint compatible with the OTLP HTTP protocol. When the Collector sends a log batch with the `otlphttp/audit` exporter, the payload arrives here.

### In production

The demo service simply prints the payload. In a real environment, the audit service should:

| Requirement | Implementation |
|-------------|----------------|
| **Persistence** | Write to an append-only database (e.g. PostgreSQL with protection triggers, ImmuDB) |
| **Immutability** | Prevent UPDATE and DELETE on records |
| **Encryption** | TLS in transit, encryption at rest |
| **Access** | Dedicated authentication and authorization |
| **Retention** | Separate retention policy (years, not days) |
| **Backup** | Geographic replication or periodic export to cold storage |

The key point: physically separating the destination makes it possible to apply **different requirements** to the same data stream. A Loki database optimized for fast queries is not the right place for an audit trail that must last years.

---

## Each Route Has Its Own Lifecycle

Separating destinations is not enough: each destination needs a **persistence strategy** consistent with the type of data it receives. The [previous article](/blog/verificare/observability/05-management/) shows how to configure a single retention for all traces (Tempo, 7 days). With routing, you can apply different policies to each stream.

### Full map: route, destination, persistence

| Route | Destination | Retention | Storage | Relative cost |
|-------|------------|-----------|---------|--------------|
| Debug logs | Loki (stream `debug`) | 24–48 hours | Loki filesystem | Low |
| Info/Warning/Error | Loki (default stream) | 7–30 days | Loki filesystem | Medium |
| Traces | Tempo | 7 days (`block_retention: 168h`) | Tempo + object storage | Medium |
| Audit logs | Audit service → DB | 1–7 years | PostgreSQL + S3 (cold) | High per record, low per volume |

The cost of audit logs is high per record (relational DB, encryption, backup) but the volume is low (~2,000 logs/day in this scenario). Debug log cost is low per record (Loki) but volume is high (~500,000/day). The persistence strategy reflects this trade-off.

### Loki: per-stream retention

Loki supports differentiated retention via `retention_stream`. Logs routed to Loki can have different retention periods based on labels:

```yaml
# loki-config.yaml
limits_config:
  retention_period: 720h             # Default: 30 days

  retention_stream:
    - selector: '{level="debug"}'
      priority: 1
      period: 48h                    # Debug: 2 days
    - selector: '{level=~"info|warn"}'
      priority: 2
      period: 168h                   # Info/Warning: 7 days
    - selector: '{level="error"}'
      priority: 3
      period: 720h                   # Errors: 30 days
```

With this configuration, debug logs occupy storage for 2 days instead of 30. On a volume of 500,000 debug logs/day, the storage difference is significant.

> **Note:** `retention_stream` requires the Loki compactor to be active with `retention_enabled: true`. The feature is available from Loki 2.3+.

### Audit service: database persistence

The demo uses `console.log`. In production, the audit service persists logs to an append-only database. A minimal example with PostgreSQL:

```sql
-- Audit log schema
CREATE TABLE audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trace_id    VARCHAR(32),
    service     VARCHAR(128) NOT NULL,
    user_id     VARCHAR(256),
    event_type  VARCHAR(64) NOT NULL,
    payload     JSONB NOT NULL,
    checksum    VARCHAR(64) NOT NULL   -- SHA-256 of payload
);

-- Indexes for frequent queries
CREATE INDEX idx_audit_timestamp ON audit_logs (timestamp);
CREATE INDEX idx_audit_user ON audit_logs (user_id);
CREATE INDEX idx_audit_event ON audit_logs (event_type);

-- Protection: prevent UPDATE and DELETE
CREATE RULE no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;
```

PostgreSQL `RULE` statements prevent any modification or deletion of records after insertion. The `checksum` field allows verifying payload integrity at any time.

### Long-term archiving: hot/warm/cold

For years-long retention, keeping all records in PostgreSQL is not efficient. A common pattern is hot/warm/cold tiering:

| Tier | Storage | Retention | Cost/GB/month | Query |
|------|---------|-----------|--------------|-------|
| **Hot** | PostgreSQL | 0–90 days | ~$0.10 (EBS) | SQL, indexed, <100ms |
| **Cold** | S3 Standard | 90 days – 7 years | ~$0.023 | Athena/BigQuery, seconds–minutes |
| **Archive** | S3 Glacier | 7+ years | ~$0.004 | Hours to restore |

The export from hot to cold can be a cron job or batch process:

```bash
# Daily export: audit logs > 90 days → S3
psql -h localhost -U audit_user -d auditdb -c \
  "COPY (SELECT * FROM audit_logs WHERE timestamp < NOW() - INTERVAL '90 days')
   TO STDOUT WITH CSV HEADER" | \
  gzip > "audit-$(date +%Y%m%d).csv.gz"

aws s3 cp "audit-$(date +%Y%m%d).csv.gz" \
  s3://company-audit-archive/year=$(date +%Y)/month=$(date +%m)/
```

After the export, cold records can be removed from PostgreSQL (by temporarily disabling the `no_delete` rule with a dedicated admin role) to keep the database volume manageable.

### Connecting this to tail sampling

The persistence strategies integrate with the [tail sampling from the previous article](/blog/verificare/observability/05-management/) into a complete pipeline:

```text
Application
    |
    v
OTel Collector
    |
    +-- Tail Sampling (traces) ---> Tempo (retention 7d)
    |
    +-- Routing Connector (logs)
            |
            +-- audit.event=true ---> Audit Service ---> PostgreSQL (90d) ---> S3 (7 years)
            |
            +-- level=debug -------> Loki (retention 48h)
            |
            +-- default ------------> Loki (retention 30d)
```

First, **tail sampling** reduces trace volume (~90%). Then **routing** separates logs by type. Finally, each destination applies its own **retention**. The result: different data, different lifecycles, costs proportional to value.

---

## Demo: Routing in Action

Module 06 includes everything needed to see routing in action. The full code is in the [otel-demo repository](https://github.com/monte97/otel-demo).

```bash
git clone https://github.com/monte97/otel-demo
cd otel-demo
```

### 1. Start the infrastructure

```bash
make infra-up-otel   # Start LGTM stack (Loki, Grafana, Tempo, Prometheus, OTel Collector)
make infra-up-apps   # Start supporting applications
make mod06-up        # Start shop-service, audit-service and Collector with routing
```

The `make mod06-up` command automatically starts:
- The **shop-service** with the `/checkout` endpoint that marks audit events
- The **audit-service** on port 4000
- The **OTel Collector** with the split configuration towards Loki and audit-service

### 2. Generate an audit event

```bash
curl -X POST http://localhost:8002/checkout \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000, "user": "alice@example.com"}'
```

Expected response:

```json
{"status": "processed", "orderId": "ORD-1739350800000"}
```

### 3. Verify the log reaches the audit service

```bash
docker logs module-06-advanced-routing-audit-service-1
```

Expected output (simplified extract):

```json
Received Audit Log Batch: {
  "resourceLogs": [{
    "resource": { "attributes": [{ "key": "service.name", "value": { "stringValue": "shop-service" } }] },
    "scopeLogs": [{
      "logRecords": [{
        "body": { "stringValue": "User checking out" },
        "attributes": [
          { "key": "audit.event", "value": { "boolValue": true } },
          { "key": "audit.user", "value": { "stringValue": "alice@example.com" } }
        ]
      }]
    }]
  }]
}
```

The output shows the OTLP batch received by the audit service. In the JSON you can identify:
- The **resource attributes** of the service (`service.name: shop-service`)
- The **span attributes** added in code (`audit.event: true`, `audit.user: alice@example.com`)
- The **body** of the log with the structured message

This confirms the Collector correctly forwarded the log to the audit service.

### 4. Verify the log is also in Loki

Open Grafana (`http://localhost:3000`) and query in Loki:

```logql
{service_name="shop-service"} |= "checkout"
```

The log is present here as well. With the fan-out demo configuration, both destinations receive the log. With the routing connector active, only the audit service would receive marked logs.

### 5. Cleanup

```bash
# Stop the module
make mod06-down

# Full infrastructure cleanup
make infra-down-all
```

---

## Routing Beyond Audit and Technical Logs

The routing connector is not limited to separating audit from technical logs. Here are real-world scenarios where the pattern applies:

| Scenario | Routing attribute | Destination | Motivation |
|----------|------------------|------------|------------|
| **Compliance audit** | `audit.event=true` | Dedicated audit service | Physical separation, immutability, long retention |
| **PII separation** | `contains.pii=true` | Encrypted vault | GDPR: personal data in backend with controlled access |
| **Cost optimization** | `log.level=debug` | None (discard) | Debug logs in production = very high volume, low value |
| **Critical alerting** | `log.level=error` + `http.status_code >= 500` | Loki + alert system | Critical errors must trigger immediate notifications |
| **Multi-tenancy** | `tenant.id=tenant-a` | Loki instance tenant A | Data isolation between different tenants |

### Pattern: dropping debug logs

In production, `debug`-level logs often represent 70–80% of total volume but have utility only during active troubleshooting. A routing configuration can discard them by default and enable them on demand:

```yaml
connectors:
  routing/logs:
    # No default_pipelines: unrouted logs are discarded
    table:
      - context: log
        condition: severity_number >= SEVERITY_NUMBER_INFO
        pipelines: [logs/default]

service:
  pipelines:
    logs/ingestion:
      receivers: [otlp]
      exporters: [routing/logs]
    logs/default:
      receivers: [routing/logs]
      exporters: [loki]
```

Logs with severity below INFO (debug, trace) are not routed to any pipeline and are discarded. This is complementary to tail sampling: sampling reduces traces, routing eliminates entire categories of logs. Together they reduce overall volume by an order of magnitude.

### Pattern: critical errors to alert channel

```yaml
connectors:
  routing/logs:
    default_pipelines: [logs/default]
    table:
      - context: log
        condition: severity_number >= SEVERITY_NUMBER_ERROR
        action: copy    # Send to both alert and default
        pipelines: [logs/alerts]

service:
  pipelines:
    logs/ingestion:
      receivers: [otlp]
      exporters: [routing/logs]
    logs/default:
      receivers: [routing/logs]
      exporters: [loki]
    logs/alerts:
      receivers: [routing/logs]
      exporters: [loki, slack_webhook]
```

With `action: copy`, logs at ERROR severity or above are sent **both** to the alerts pipeline **and** to the default pipeline (Loki). Normal logs only go to Loki. The notification logic lives in the Collector, not in the application.

### Routing and Sampling: two complementary tools

A common question: **what is the difference between routing and tail sampling?**

| Aspect | Tail Sampling | Routing |
|--------|--------------|---------|
| **Goal** | Reduce volume (keep/discard) | Decide the destination |
| **Operates on** | Complete traces | Individual logs, traces, metrics |
| **Decision** | Keep or discard | Where to send |
| **Configuration** | Sampling policies | Routing table |
| **Example** | Keep only traces with errors | Send audit logs to a dedicated service |

In a mature production setup, both are used: **tail sampling** reduces total volume, then **routing** distributes the surviving data to the appropriate destinations. First you decide **what** to keep, then **where** to send it.

---

## Summary and Checklist

### Summary

| Problem | Solution | Result |
|---------|---------|--------|
| Audit logs mixed with debug | Routing connector + dedicated exporter | Physical separation |
| GDPR/SOC 2 compliance | Audit service with immutable DB | Regulatory requirements met |
| Uniform costs for different data | Selective routing by level | Optimized retention and storage |
| No log prioritization | Routing to alert systems | Immediate notifications for critical errors |
| PII in shared backend | Routing to encrypted vault | Controlled access to sensitive data |

### Pre-production checklist

Before enabling routing in production:

- [ ] Identify log types (audit, technical, PII, debug) and define marking attributes (`audit.event`, `log.level`, `contains.pii`)
- [ ] Mark logs in application code (span attributes or log attributes)
- [ ] Configure exporters and routing connector with a safe `default_pipelines`
- [ ] Test in staging: verify each type reaches the correct destination and that the default covers all unmarked logs
- [ ] Monitor `otelcol_exporter_sent_log_records` for each exporter
- [ ] Document the routing map (attribute → destination)
- [ ] Validate with the compliance/security team

If all checks pass, routing is ready for rollout.

---

## Resources

**Demo repository:**
- [otel-demo on GitHub](https://github.com/monte97/otel-demo) (Module 06: Advanced Routing)

**Documentation:**
- [OTel Collector Routing Connector](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/routingconnector)
- [OTel Collector Configuration](https://opentelemetry.io/docs/collector/configuration/)

**Related articles:**
- [Tail Sampling and Retention](/blog/verificare/observability/05-management/) — Reducing volume before routing

---
