---
title: "Hands-On Distributed Tracing with OpenTelemetry and the LGTM Stack"
date: 2026-01-29T09:00:00.000Z
description: "A practical guide to distributed tracing with OpenTelemetry and the LGTM stack. Three real debug scenarios: silent failure, latency spike, fan-out."
pillar: verificare
category: observability
tags:
  - OpenTelemetry
  - Observability
  - LGTM Stack
  - Loki
  - Grafana
  - Tempo
  - Mimir
  - Prometheus
  - Tracing
  - Metrics
  - Logging
  - Instrumentation
  - DevOps
  - Telemetry
  - Sistemi Distribuiti
  - Docker
series: observability
seriesOrder: 40
lang: en
reviewed: machine
---

You have instrumented your application with OpenTelemetry, traces and logs are flowing into a central backend — now what? The practical question remains: how do you actually use this telemetry to diagnose problems? This tutorial answers with three concrete debug scenarios. If you are unfamiliar with core OpenTelemetry concepts (spans, traces, context propagation), it is worth reading the [Observability intro article](/blog/verificare/observability/) first.

**Article structure:**
1. Quick Start — spin up the demo
2. Three debug scenarios — silent failure, latency spike, fan-out
3. When NOT to use distributed tracing — limits and alternatives
4. **Appendix** — detailed setup (optional, for replication in your own project)

---

## Demo Architecture

All three scenarios run on [MockMart](https://github.com/monte97/MockMart), a microservices e-commerce demo:

```text
Gateway (nginx:80)
├── Shop UI (:3000)
├── Shop API (:3001)
│   ├── Inventory Service (:3011)
│   ├── Payment Service (:3010)
│   └── Notification Service (:3009)
├── Keycloak (:8080)
└── Grafana LGTM (:3000, via gateway :80)
```

**Checkout flow (fan-out pattern):**
```text
POST /api/checkout
├─ Inventory Service  → check availability
├─ Payment Service    → process payment
├─ Inventory Service  → reserve items
├─ PostgreSQL         → persist order
└─ Notification       → send confirmation
```

**Tech stack:**
- Shop API: Node.js, Express, `pg` driver
- Payment Service: Node.js, payment gateway simulation
- Inventory Service: Node.js, in-memory stock management
- Notification Service: Node.js with template rendering
- Database: PostgreSQL
- Authentication: Keycloak (OAuth2/OIDC)

---

## Quick Start

```bash
# Clone and start
git clone https://github.com/monte97/MockMart
cd MockMart
make up

# Verify
docker ps  # all containers healthy
open http://localhost/grafana  # Grafana

# Run demo scenarios
./scripts/scenario-1-silent-failure.sh   # Silent failure
./scripts/scenario-2-latency-spike.sh    # Latency spike
./scripts/scenario-3-fanout-debug.sh     # Fan-out debug (complex)

# Explore in Grafana
# Explore → Tempo → Query TraceQL

# Cleanup
make down
```

> **Note:** The demo ships with OpenTelemetry pre-configured. For setup details, see the [Appendix](#appendix-opentelemetry-setup).

---

## Scenario 1: Silent Failure

### The checkout returns 200, but no notification arrives

The user completes checkout, receives confirmation on screen, and never gets an email.

**From the API's perspective:** 200 OK returned to the client.
**From the user's perspective:** No email.

This is a **silent failure** — the system appears to work, but something is broken and invisible.

### Reproducing the scenario

```bash
git clone https://github.com/monte97/MockMart
cd MockMart
make up

./scripts/scenario-1-silent-failure.sh
```

The script:
1. Authenticates a user via Keycloak
2. Configures the notification service to simulate an email validation failure
3. Triggers a checkout
4. Shows that the order is persisted but the notification fails

### The waterfall reveals the failing span

**Step 1:** Open [Grafana](http://localhost/grafana) → Explore → Tempo

Query:
```text
{ resource.service.name = "shop-api" }
```

With the order ID (printed by the script):
```text
{ resource.service.name = "shop-api" && span.order_id = <ID> }
```

<img src="images/webp/scenario1-traceql-query.webp" alt="TraceQL query to find the order trace" width="80%">

**Step 2:** Inspect the trace

```text
POST /api/checkout (320ms) [STATUS: OK]
├─ pg.query SELECT user (45ms) [OK]
├─ pg.query INSERT INTO orders (180ms) [OK]
└─ HTTP POST /api/notifications/order (45ms) [ERROR: 400]
```

<img src="images/webp/scenario1-trace-waterfall.webp" alt="Trace waterfall — silent failure visible on the notification span" width="80%">

The notification service span shows:
- `http.status_code: 400`
- `error: true`

<img src="images/webp/scenario1-notification-error-attributes.webp" alt="Error attributes on the notification service span" width="80%">

**Step 3:** Click "View Logs" on the failing span

```json
{"msg":"Received order notification request","orderId":8472,"userId":"abc-123","userEmail":"mario.rossi@example.com","traceId":"...","spanId":"..."}
{"msg":"Validating email address...","orderId":8472,"userEmail":"mario.rossi@example.com","traceId":"...","spanId":"..."}
{"msg":"Cannot send notification - invalid email address","orderId":8472,"userEmail":"mario.rossi@example.com","reason":"Email validation failed: invalid domain or format","traceId":"...","spanId":"..."}
```

<img src="images/webp/scenario1-logs-correlated.webp" alt="Notification service logs correlated from the trace view" width="80%">

**Root cause identified:** The notification service received the request, attempted email validation, and returned 400 because validation failed (simulated scenario).

### What this scenario demonstrates

1. **Cross-service visibility**: You can see that the downstream call was made and received a response
2. **Error attribution**: You know exactly which service caused the failure
3. **Automatic correlation**: Notification service logs are accessible directly from the trace context
4. **Without OTel**: You would have had to grep across multiple log files, manually correlate timestamps, and hope to find the cause

---

## Scenario 2: Latency Spike

### Same endpoint, very different response times

User reports:
- "Checkout is incredibly slow, 3–4 seconds!" (Luigi)
- "Works fine for me, ~200ms" (Mario)

Intermittent problem, root cause unclear.

### Reproducing the scenario

```bash
./scripts/scenario-2-latency-spike.sh
```

The script:
1. Authenticates two users (Mario and Luigi)
2. Configures the notification service to use a slow "premium" template for Luigi
3. Runs checkout for both users
4. Prints the timing difference

> **Note on the simulation:** The "premium template" simulates a slow operation with an artificial delay. In a real system this could be: complex PDF rendering, calls to external services, unoptimized database queries, etc. The simulation creates a reproducible scenario for learning the debug workflow.

### The trace shows where time accumulates

**Step 1:** Query for slow traces

```text
{ resource.service.name = "shop-api" && duration > 2s }
```

<img src="images/webp/scenario2-traceql-slow-query.webp" alt="TraceQL query for slow traces" width="80%">

**Step 2:** Compare traces side by side

**Luigi's trace (~3100ms):**
```text
POST /api/checkout (3100ms)
├─ pg-pool.connect (3ms)
├─ pg.query:INSERT orders (2ms)
└─ POST /api/notifications/order (3050ms) ← bottleneck
```

<img src="images/webp/scenario2-trace-luigi-slow.webp" alt="Luigi's trace — bottleneck in the notification service" width="80%">

**Mario's trace (~150ms):**
```text
POST /api/checkout (150ms)
├─ pg-pool.connect (3ms)
├─ pg.query:INSERT orders (2ms)
└─ POST /api/notifications/order (50ms)
```

<img src="images/webp/scenario2-trace-mario-fast.webp" alt="Mario's trace — fast checkout" width="80%">

**Pattern:** The database is consistently fast. The difference is entirely in the notification service.

**Step 3:** Drill down into logs

Click "View Logs" on Luigi's trace:
```json
{"msg":"Received order notification request","orderId":20,"userId":"luigi-uuid","userEmail":"luigi.verdi@example.com","traceId":"..."}
{"msg":"Processing order notification","orderId":20,"template":"order_confirmation_premium","traceId":"..."}
{"msg":"Rendering premium template...","orderId":20,"template":"order_confirmation_premium","traceId":"..."}
{"msg":"Template rendering took long","orderId":20,"renderTimeMs":3000,"traceId":"..."}
{"msg":"Email notification sent","orderId":20,"userEmail":"luigi.verdi@example.com","traceId":"..."}
```

<img src="images/webp/scenario2-logs-luigi.webp" alt="Luigi's logs showing slow premium template" width="80%">

Click "View Logs" on Mario's trace:
```json
{"msg":"Received order notification request","orderId":17,"userId":"mario-uuid","userEmail":"mario.rossi@example.com","traceId":"..."}
{"msg":"Processing order notification","orderId":17,"template":"order_confirmation_basic","traceId":"..."}
{"msg":"Email notification sent","orderId":17,"userEmail":"mario.rossi@example.com","traceId":"..."}
```

<img src="images/webp/scenario2-logs-mario.webp" alt="Mario's logs showing basic template" width="80%">

**Root cause:** The `order_confirmation_premium` template takes ~3 seconds to render vs ~50ms for `order_confirmation_basic`.

### Derived metrics (Service Graph)

For aggregate analysis, the LGTM stack derives metrics from traces. In Grafana → Explore → Prometheus (Code mode):

```promql
histogram_quantile(0.95,
  rate(traces_service_graph_request_server_seconds_bucket{server="shop-api"}[5m])
)
```

> **Note:** These metrics are derived from Tempo's service graph, not explicit SDK metrics.

---

## Scenario 3: Fan-out Debug

### Four services, twenty-four possible culprits

This scenario demonstrates distributed tracing applied to a **[fan-out pattern](https://en.wikipedia.org/wiki/Fan-out_(software))** where a single request traverses multiple services, some in parallel.

Support ticket:
> "Checkout is extremely slow, taking over 3 seconds!"

**The challenge:** Checkout calls four different services. Which one is causing the slowdown?

```text
POST /api/checkout (3200ms total)
├─ Inventory check    (??ms)
├─ Payment process    (??ms)
├─ Inventory reserve  (??ms)
├─ DB save            (??ms)
└─ Notification       (??ms)
```

### Reproducing the scenario

```bash
./scripts/scenario-3-fanout-debug.sh
```

**Script output:**

```text
3️⃣  Baseline checkout (all services normal)...
   ⏱️  Baseline: 206ms
   🔗 Trace: 3d9e2441545eb8c0c1050b51daa4489f

4️⃣  Checkout with SLOW PAYMENT SERVICE (2s delay)...
   ⏱️  With slow payment: 2117ms
   🔗 Trace: ae1799f3ed5836602288d4c39ea156a2

5️⃣  Checkout with SLOW INVENTORY SERVICE (1.5s delay)...
   ⏱️  With slow inventory: 1678ms
   🔗 Trace: 6325d443f6aa4c6f1ab1d6f7c31c0c5e

6️⃣  Checkout with SLOW NOTIFICATION SERVICE (3s delay)...
   ⏱️  With slow notification: 3138ms
   🔗 Trace: e43750f867a144eec9396095c39bb6da

📊 Results Summary:
   Scenario           | Duration | Trace ID
   -------------------|----------|----------------------------------
   Baseline (normal)  | 206ms    | 3d9e2441545eb8c0c1050b51daa4489f
   + Slow Payment     | 2117ms   | ae1799f3ed5836602288d4c39ea156a2
   + Slow Inventory   | 1678ms   | 6325d443f6aa4c6f1ab1d6f7c31c0c5e
   + Slow Notification| 3138ms   | e43750f867a144eec9396095c39bb6da
```

The script prints the **Trace ID** for each scenario so you can open the trace directly in Grafana.

### The traditional approach (and why it falls short)

```bash
# API logs
docker logs shop-api | grep "checkout"
# [10:45:23] INFO Processing checkout
# [10:45:26] INFO Order saved  ← 3 seconds later, but WHERE did the time go?

# Check each service
docker logs payment-service | grep "order"
# [10:45:23] INFO Payment processed  ← looks fast

docker logs inventory-service | grep "order"
# [10:45:23] INFO Stock checked
# [10:45:24] INFO Stock reserved  ← 1 second?

docker logs notification-service | grep "order"
# [10:45:24] INFO Notification sent  ← looks fast
```

**The problem:** Timestamps are generated on different machines with no shared clock. You cannot add up timings or determine which calls are sequential and which are parallel.

### The fan-out visible in a single waterfall

Open **Grafana → Explore → Tempo**

Use the Trace ID from the script output to jump directly to the trace:

```text
ae1799f3ed5836602288d4c39ea156a2
```

Or query for all slow traces:

```text
{ resource.service.name = "shop-api" && duration > 2s }
```

**Waterfall for "Slow Payment" trace (2117ms):**

```text
POST /api/checkout (2117ms) [shop-api]
│
├─ POST /api/inventory/check (4ms) [inventory-service]
│
├─ POST /api/payments/process (2020ms) [payment-service] ← BOTTLENECK!
│
├─ POST /api/inventory/reserve (4ms) [inventory-service]
│
├─ pg.query INSERT orders (12ms) [shop-api]
│
└─ POST /api/notifications/order (55ms) [notification-service]
```

<img src="images/webp/scenario3-trace-slow-payment.webp" alt="Slow Payment trace waterfall — bottleneck in the payment service" width="80%">

**Compared to the baseline trace (~200ms):**

```text
POST /api/checkout (206ms) [shop-api]
│
├─ POST /api/inventory/check (5ms) [inventory-service]
├─ POST /api/payments/process (85ms) [payment-service]
├─ POST /api/inventory/reserve (4ms) [inventory-service]
├─ pg.query INSERT orders (15ms) [shop-api]
└─ POST /api/notifications/order (54ms) [notification-service]
```

<img src="images/webp/scenario3-trace-baseline.webp" alt="Baseline trace waterfall — all services fast" width="80%">

### Root cause identification

Comparing the waterfalls across all four scenarios, the bottleneck is immediately obvious:

| Scenario | Slow service | Duration | Baseline |
|----------|-------------|----------|----------|
| Slow Payment | `POST /api/payments/process` | 2020ms | 85ms |
| Slow Inventory | `POST /api/inventory/check` | ~1500ms | 5ms |
| Slow Notification | `POST /api/notifications/order` | ~3000ms | 54ms |

Click on any slow span → View Logs:

```json
// Payment service (slow payment scenario)
{"msg":"Processing payment","orderId":18,"traceId":"..."}
{"msg":"Payment gateway slow response","orderId":18,"responseTimeMs":2000,"traceId":"..."}

// Notification service (slow notification scenario)
{"msg":"Processing order notification","orderId":24,"template":"order_confirmation_premium","traceId":"..."}
{"msg":"Template rendering took long","orderId":24,"renderTimeMs":3000,"traceId":"..."}
```

<img src="images/webp/scenario3-logs-payment.webp" alt="Slow service logs correlated from the trace" width="80%">

### What this scenario demonstrates

| Without OTel | With OTel |
|-------------|----------|
| "Checkout is slow" | Waterfall shows EXACTLY which service |
| Timestamps not correlatable | Unified timeline with parent-child relationships |
| "Maybe it's the database?" | DB query visible: 12ms (not the culprit) |
| Hypothesis-driven investigation across 4 services | Root cause visible in the waterfall |
| Elimination debugging on 4 services | Bottleneck pinpointed in minutes |

### Where distributed tracing pays off

This scenario demonstrates where distributed tracing delivers the greatest value:

1. **Fan-out visibility**: See all parallel and sequential calls in context
2. **Proportional blame**: The waterfall shows how much each service contributes to total latency
3. **Cross-service correlation**: Logs from all four services correlated automatically
4. **Clock skew mitigation**: The waterfall uses absolute timestamps and parent-child relationships to reconstruct flow. NTP on all nodes is recommended to minimize clock skew between services

**Without distributed tracing**, with 4 services, there are 4! = 24 possible combinations to investigate. **With tracing**, the bottleneck is visible in the waterfall within minutes.

### Cleanup

```bash
make down
```

---

## When NOT to Use Distributed Tracing

Distributed tracing is not always the right tool. Consider alternatives when:

### 1. Monolithic Architecture

With a single service, distributed tracing adds overhead without meaningful benefit. Alternatives:
- Application profiler (Node.js inspector, py-spy)
- Traditional APM
- Structured logging with request ID

### 2. Local Performance Problems

If the bottleneck is inside a single function (CPU-bound, memory leak), tracing won't help. Use:
- Flame graphs
- Memory profiler
- Load testing with profiling

### 3. Debugging Known Errors

If you already know where to look, grep on logs is faster than a TraceQL query.

### 4. Resource-Constrained Environments

Auto-instrumentation has overhead:
- CPU: ~2–5% per service
- Memory: ~10–30 MB per Node.js SDK (with auto-instrumentation)
- Network: depends on trace volume
- Storage: can grow rapidly without sampling

If resources are critical, evaluate the trade-off carefully.

### 5. Small Teams with Simple Architectures

With 2–3 services in a linear chain (A→B→C) and a team that knows the system well, the investment in distributed tracing may not pay off. The benefit scales with:
- **Fan-out patterns** (like MockMart's checkout: 4 services called per request)
- Number of services (5+)
- Team size
- Staff turnover
- Incident frequency

### Rule of thumb

**Use distributed tracing when:** The average debug time for a cross-service incident exceeds hours, especially with fan-out patterns where a single request traverses multiple services.

**Skip it when:** Incidents are rare, localized, the architecture is linear (A→B→C), or the team already has effective tooling.

---

## Limitations of This Tutorial

### What's Not Covered

1. **Production deployment**: The LGTM all-in-one image does not scale. Production deployments require:
   - Persistent storage (S3, GCS for Tempo/Loki)
   - Retention policies
   - High availability
   - Authentication and authorization

2. **Sampling**: In production, storing 100% of traces is not feasible. You need:
   - Head sampling (fixed percentage)
   - Tail sampling (100% errors, sample the rest)
   - Rate limiting

3. **Cost and storage**: Data volumes grow quickly. Budget:
   - ~500 bytes per span (average compressed on disk)
   - 100 req/s × 5 span/req × 500B × 86400s = ~21.6 GB/day
   - With 10% sampling: ~2.16 GB/day

4. **Security**: Never log:
   - Tokens and credentials
   - PII (emails, names, addresses)
   - Sensitive data in span attributes

### Simulations vs. Reality

The demo scenarios use controlled simulations:
- The "slow premium template" is a `setTimeout(3000)`
- The "invalid email" is a configuration flag
- The "slow services" in the fan-out are `/config/simulate-slow` endpoints that inject artificial delays

In production, real problems are:
- Harder to reproduce
- Often intermittent
- Caused by combinations of factors

OTel helps precisely because it captures these scenarios when they occur in production, without requiring reproduction in development.

---

## Appendix: OpenTelemetry Setup

> This section is optional. MockMart ships with everything pre-configured. It is useful if you want to replicate the setup in your own project.

### What "Auto-Instrumentation" Actually Requires

Before starting, it's worth clarifying what auto-instrumentation means — it still requires a setup phase.

> **Official documentation:** See the [Automatic Instrumentation for Node.js](https://opentelemetry.io/docs/languages/js/automatic/) guide and the [supported libraries list](https://opentelemetry.io/docs/languages/js/libraries/).

### Application Side

**1. Install dependencies:**
```bash
npm install @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-grpc \
  @opentelemetry/exporter-logs-otlp-grpc \
  @opentelemetry/sdk-logs \
  @opentelemetry/resources \
  @opentelemetry/api \
  pino
```

| Package | Purpose |
|---------|---------|
| `sdk-node` | Main Node.js SDK, orchestrates all components |
| `auto-instrumentations-node` | Bundle of auto-instrumentations (Express, HTTP, pg, etc.) |
| `exporter-trace-otlp-grpc` | Exports traces via OTLP over gRPC |
| `exporter-logs-otlp-grpc` | Exports logs via OTLP over gRPC |
| `sdk-logs` | Log record management (processor, exporter) |
| `resources` | Resource definition (service name, attributes) |
| `api` | API for interacting with traces in application code |
| `pino` | High-performance logger for Node.js |

**2. Create `instrumentation.js` (must load BEFORE everything else):**

> **Important:** This file must be loaded **before** any other imports. Auto-instrumentation works via [monkey-patching](https://en.wikipedia.org/wiki/Monkey_patch) of Node.js modules (Express, pg, Pino, etc.) at load time. If modules are imported before OTel initializes, they will not be instrumented.

```javascript
// instrumentation.js — Initialize OpenTelemetry BEFORE any other import
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-grpc');
const { BatchLogRecordProcessor } = require('@opentelemetry/sdk-logs');
const { resourceFromAttributes } = require('@opentelemetry/resources');

const serviceName = process.env.OTEL_SERVICE_NAME || 'my-service';
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317';

const resource = resourceFromAttributes({
  'service.name': serviceName,
});

const sdk = new NodeSDK({
  resource,
  traceExporter: new OTLPTraceExporter({ url: otlpEndpoint }),
  logRecordProcessors: [
    new BatchLogRecordProcessor(new OTLPLogExporter({ url: otlpEndpoint })),
  ],
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();
console.log(`OpenTelemetry initialized for ${serviceName}`);

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((err) => console.error('Error terminating', err))
    .finally(() => process.exit(0));
});
```

**3. Modified application startup:**
```bash
# --require loads instrumentation.js BEFORE server.js
node --require ./instrumentation.js server.js
```

In `package.json`:
```json
{
  "scripts": {
    "start": "node --require ./instrumentation.js server.js"
  }
}
```

> **Note:** In the MockMart repo, the `--require` flag is specified in the `docker-compose.yml` service `command` (see the Infrastructure section below), so the `package.json` start script stays as `"start": "node server.js"`. For local execution without Docker, update the start script as shown above.

**4. Pino logger (trace context injected automatically):**

```javascript
// lib/logger.js
const pino = require('pino');

// PinoInstrumentation automatically injects trace_id and span_id
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

module.exports = logger;
```

**Usage in application code:**

```javascript
const logger = require('./lib/logger');
const { trace } = require('@opentelemetry/api');

app.post('/api/checkout', requireAuth, async (req, res) => {
  const user = req.user;
  const cart = carts[req.session.id];

  // trace_id and span_id are injected by PinoInstrumentation
  logger.info({ userId: user.id, itemCount: cart.length }, 'Processing checkout');

  try {
    const orderId = orderResult.rows[0].id;

    // Add business attribute to the span for TraceQL filtering: { span.order_id = 123 }
    trace.getActiveSpan()?.setAttribute('order_id', orderId);

    logger.info({ orderId, userId: user.id, total }, 'Order saved to database');
    logger.info({ orderId, url: NOTIFICATION_SERVICE_URL }, 'Calling notification service');

    await axios.post(`${NOTIFICATION_SERVICE_URL}/api/notifications/order`, {...});

    logger.info({ orderId }, 'Notification sent successfully');

    res.json({ success: true, order });
  } catch (err) {
    logger.error({ error: err.message }, 'Checkout failed');
    res.status(500).json({ error: 'Checkout failed' });
  }
});
```

**Log output with trace context:**
```json
{
  "level": 30,
  "time": 1770291707877,
  "pid": 1,
  "hostname": "shop-api",
  "trace_id": "b0b197c5337c4b07f80e2ef7b130f2f4",
  "span_id": "e8815f03044501df",
  "trace_flags": "01",
  "orderId": 8472,
  "total": 99.99,
  "msg": "Order saved to database"
}
```

`trace_id` and `span_id` are injected automatically by `PinoInstrumentation`.

### Infrastructure Side

**LGTM all-in-one (for development/staging):**
```yaml
grafana:
  image: grafana/otel-lgtm:0.17.1
  ports:
    - "3005:3000"   # Grafana UI
    - "4317:4317"   # OTLP gRPC
    - "4318:4318"   # OTLP HTTP
```

**Environment variables and service command (from `docker-compose.yml`):**
```yaml
shop-api:
  environment:
    - OTEL_SERVICE_NAME=shop-api
    - OTEL_EXPORTER_OTLP_ENDPOINT=http://grafana:4317
  # Loads instrumentation.js BEFORE server.js
  command: ["node", "--require", "./instrumentation.js", "server.js"]

notification-service:
  environment:
    - OTEL_SERVICE_NAME=notification-service
    - OTEL_EXPORTER_OTLP_ENDPOINT=http://grafana:4317
  command: ["node", "--require", "./instrumentation.js", "server.js"]
```

> **Note:** The LGTM all-in-one image is not suitable for production. Production deployments need separate Tempo, Loki, and Mimir with persistent storage, retention policies, and sampling. These topics will be covered in dedicated articles.

### Customizing Instrumentation

#### Custom Attributes

Auto-instrumentation captures standard attributes (HTTP method, URL, status code, SQL query). To make traces searchable by business context, add custom attributes:

> **Reference:** The [Manual Instrumentation](https://opentelemetry.io/docs/languages/js/instrumentation/) guide explains how to create custom spans, add attributes, and manage context explicitly.

```javascript
const { trace } = require('@opentelemetry/api');

app.post('/api/checkout', async (req, res) => {
  const orderId = result.rows[0].id;

  // trace.getActiveSpan() returns the span created by auto-instrumentation
  // for this HTTP request. Optional chaining (?.) handles the rare case of no active span.
  trace.getActiveSpan()?.setAttributes({
    'order_id': orderId,
    'user_tier': req.user.tier,        // e.g. "premium", "basic"
    'cart_item_count': cart.length,
    'order_total': order.total,
  });
});
```

**TraceQL queries with custom attributes:**
```text
# Find all traces for a specific order
{ span.order_id = 8472 }

# Find slow checkouts from premium users
{ span.user_tier = "premium" && duration > 1s }

# Combine with standard attributes
{ resource.service.name = "shop-api" && span.order_total > 100 }
```

#### Manual Spans (for uninstrumented operations)

To trace a specific operation not covered by auto-instrumentation:

```javascript
const { trace, SpanStatusCode } = require('@opentelemetry/api');

async function processPayment(order) {
  const tracer = trace.getTracer('shop-api');

  return tracer.startActiveSpan('process-payment', async (span) => {
    try {
      span.setAttributes({
        'payment.method': order.paymentMethod,
        'payment.amount': order.total,
        'payment.currency': 'EUR',
      });

      const result = await paymentGateway.charge(order);
      span.setAttribute('payment.transaction_id', result.transactionId);

      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

**Result in the trace:**
```text
POST /api/checkout (850ms)
├─ pg.query:INSERT orders (15ms)
├─ process-payment (500ms)          ← manual span
│   └─ payment.method: "credit-card"
│   └─ payment.amount: 99.99
│   └─ payment.transaction_id: "txn_123"
└─ HTTP POST /api/notifications (320ms)
```

#### What Auto-Instrumentation Does Not Capture

Auto-instrumentation captures:

| Captured | Examples |
|---------|---------|
| HTTP request metadata | method, url, status_code, user_agent |
| Database queries | SQL query (sanitized), operation name, db.system |
| Timing | duration of each operation |
| Errors | status code, exception type |

**Not captured** (requires manual instrumentation):

| Not captured | Solution |
|-------------|---------|
| HTTP request/response body | `setAttribute()` (mind PII) |
| Business values (orderId, userId) | `setAttribute()` |
| Custom operations (e.g. calculations) | Manual spans with `startActiveSpan()` |
| Application logs | OTel logger (covered in earlier section) |

---

## Resources

**Demo repository:**
- [MockMart on GitHub](https://github.com/monte97/MockMart)

**OpenTelemetry documentation (Node.js):**
- [Getting Started with Node.js](https://opentelemetry.io/docs/languages/js/getting-started/nodejs/)
- [Automatic Instrumentation](https://opentelemetry.io/docs/languages/js/automatic/)
- [Supported Libraries](https://opentelemetry.io/docs/languages/js/libraries/)
- [Manual Instrumentation](https://opentelemetry.io/docs/languages/js/instrumentation/)

**LGTM Stack:**
- [Grafana LGTM](https://grafana.com/oss/lgtm-stack/)
- [Tempo Documentation](https://grafana.com/docs/tempo/latest/)
- [Loki Documentation](https://grafana.com/docs/loki/latest/)

---

## Next in This Series

- **Sampling strategies**: Head vs. tail sampling, when to use each
- **Production deployment**: LGTM in Kubernetes with persistent storage
- **Cost optimization**: Calculating and controlling observability costs
- **Security**: Filtering PII and sensitive data from traces

---

*Questions or feedback: [francesco@montelli.dev](mailto:francesco@montelli.dev) | [LinkedIn](https://www.linkedin.com/in/francesco-montelli/) | [GitHub](https://github.com/monte97)*
