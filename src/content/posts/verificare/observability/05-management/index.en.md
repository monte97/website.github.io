---
title: "OpenTelemetry in Production: Tail Sampling and Retention"
date: 2026-02-05T09:00:00.000Z
description: How to cut trace volume by 90% without losing visibility into errors. A practical guide with config templates and a runnable demo scenario.
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
seriesOrder: 50
lang: en
reviewed: machine
---

In the [previous tutorial](/blog/verificare/observability/04-correlation/) we instrumented a mock e-commerce with OpenTelemetry and worked through three debug scenarios: silent failure, latency spike, fan-out. Everything worked: complete traces, errors visible, latency measurable.

There is one detail we left unaddressed: every single request generated a trace that was stored indefinitely. In development that is acceptable, but in a real system it is a problem.

**Article structure:**
1. The problem: volume and unbounded growth
2. Tail Sampling: deciding what to keep
3. Retention: reaching steady state
4. Demo scenario: verifying it works
5. Monitoring: checking that everything is functioning
6. Cardinality explosion: a risk to be aware of
7. Sustainability: with and without data management
8. Final checklist

---

## The Problem: Volume and Unbounded Growth

The previous tutorial's setup traced — and stored — 100% of traffic. Let's project the same approach onto realistic numbers, using the [MockMart checkout flow](https://github.com/monte97/MockMart) as a reference: a single operation involving 5 services that produces ~8 spans.

### How much do traces actually weigh?

| Parameter | Value |
|-----------|-------|
| Requests/sec | 100 |
| Spans per trace | ~8 (checkout flow) |
| Span size | ~500 bytes |

```text
100 req/s × 8 spans × 500 bytes × 86400 sec = 34 GB/day
```

That is 1 TB per month of traces alone, before counting logs and metrics. As traffic scales, the numbers deteriorate quickly:

| Scenario | Volume/Day | Volume/Month |
|----------|------------|--------------|
| **Low traffic (100 req/s)** | 34 GB | ~1 TB |
| **Medium traffic (1K req/s)** | 345 GB | ~10 TB |
| **High traffic (10K req/s)** | 3.4 TB | ~100 TB |

**Assumptions:** ~8 spans per trace, ~500 bytes per span.

**Formula:**

```text
1. Spans/sec = req/sec × spans_per_trace
2. GB/day = spans/sec × 500 bytes × 86400 / 1e9
3. GB/month = GB/day × 30
```

### Value decays; volume does not

The situation is made worse by an asymmetry: data volume grows steadily, but the value it provides decreases over time. Once an incident is resolved, the correlated traces progressively lose their utility.

| Period | Value | Typical use |
|--------|-------|-------------|
| Day 0–7 | High | Active debugging, incident response |
| Day 7–30 | Medium | Post-mortems, pattern analysis |
| Day 30+ | Low | Audit (critical operations only) |

Storing everything indefinitely costs as if every data point were precious, but 99% of traffic that produced no errors or anomalies will never be consulted.

### Two levers to solve the problem

Sustainable observability requires two complementary mechanisms: one that reduces what enters, and one that eliminates what is old.

1. **Tail Sampling** — Decides *which* traces to keep after observing them in full. Reduces incoming volume (~90%) while retaining 100% of errors and anomalies.
2. **Retention Policy** — Automatically deletes data older than a threshold. Storage reaches a steady state instead of growing linearly.

The following sections cover how to configure both.

---

## Tail Sampling: Decide After the Fact

### Head Sampling vs. Tail Sampling

**Head sampling** decides at the start of a trace: "keep 10% of traces."
Problem: if the discarded 90% contained an error, it is gone.

**Tail sampling** decides at the end: it waits until the trace is complete, then evaluates.

```text
Head Sampling:            Tail Sampling:

Request -> Keep 10%       Request -> Complete trace -> Error?  -> KEEP
           Drop 90%                                 -> Slow?   -> KEEP
                                                    -> Normal  -> Sample 10%
```

**Advantage:** Traces containing errors or anomalous latency are always retained, while overall volume is reduced.

### Three rules for deciding what to keep

OTel provides [several standard policies](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor) that plug directly into your pipeline, for example:

| Policy | What it does | Rationale |
|--------|-------------|-----------|
| `status_code` | KEEP 100% of traces with errors (status=ERROR) | No error is excluded from sampling |
| `latency` | KEEP 100% of traces >1s | Performance issues remain visible |
| `probabilistic` | SAMPLE 10% of everything else | Baseline for understanding "normal" |

Beyond these, the processor supports policies based on span content: you can filter by attributes (`string_attribute`), service name, or compound conditions (`and`, `composite`).

> A concrete example is shown later with the [audit events custom policy](#adding-a-custom-policy-audit-events).

### OTel Collector configuration

The block below translates the three policies into the `tail_sampling` processor configuration. Policies are evaluated independently: if at least one policy (e.g. `status_code` or `latency`) decides to keep a trace, it is kept even if another policy (e.g. `probabilistic`) would discard it.

```yaml
processors:
  tail_sampling:
    # Wait for the trace to be complete (default: 30s)
    decision_wait: 10s
    num_traces: 50000
    expected_new_traces_per_sec: 100

    policies:
      # 1. KEEP all errors
      - name: errors-policy
        type: status_code
        status_code:
          status_codes: [ERROR]

      # 2. KEEP slow requests (>1s)
      - name: latency-policy
        type: latency
        latency:
          threshold_ms: 1000

      # 3. SAMPLE 10% of everything else
      - name: probabilistic-policy
        type: probabilistic
        probabilistic:
          sampling_percentage: 10
```

### Complete pipeline

The configuration above defines *what* to keep and *what* to discard. It still needs to be placed in a pipeline. Tail sampling alone is not sufficient: the Collector also needs to protect itself from memory spikes and optimize sending data to the backend. Two additional processors are needed:

- **`memory_limiter`** (first): limits Collector memory usage. If consumption exceeds the threshold, the Collector starts rejecting incoming data rather than going OOM.
- **`batch`** (last): groups spans into batches before export, reducing the number of network calls to Tempo.

Order matters: `memory_limiter` protects the process, `tail_sampling` decides what to keep, `batch` optimizes the send.

```yaml
# otel-collector-config.yaml (service section)
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, tail_sampling, batch]
      exporters: [otlp/tempo]
```

The full config is at [`otel-config/data-management/otel-collector-config.yaml`](https://github.com/monte97/MockMart/blob/master/otel-config/data-management/otel-collector-config.yaml).

### Adding a Custom Policy: Audit Events

The three base policies cover errors, latency, and normal traffic. One case remains: business-critical or security-critical operations (checkout, login, payment) that you want to retain unconditionally, regardless of errors or latency.

The `tail_sampling` processor supports attribute-based policies. Add a `string_attribute` policy that looks for a specific attribute on spans:

```yaml
# Add to the tail_sampling policies
- name: audit-policy
  type: string_attribute
  string_attribute:
    key: audit.event
    values: ["true"]
    enabled_regex_matching: false
```

The `audit.event` attribute is not added automatically: it must be set in code, at the points representing critical operations.

```javascript
const { trace } = require('@opentelemetry/api');

app.post('/api/checkout', async (req, res) => {
  // Mark as an audit event — this trace will ALWAYS be kept
  trace.getActiveSpan()?.setAttribute('audit.event', 'true');
  // ... rest of logic
});
```

---

## Retention: Reaching Steady State

The previous section showed how to reduce incoming volume. The problem of unbounded growth remains: without a cleanup mechanism, even 10%-sampled data accumulates.

### When storage stops growing

**Steady state** is the condition where storage volume stabilizes: the amount of data deleted by the compactor because it has exceeded the retention period equals the amount of new incoming data. From that point on, storage remains constant regardless of how long the system runs.

**Without retention:**
```text
Day 1:    34 GB
Day 7:   238 GB
Day 30:    1 TB
Day 90:    3 TB   ← grows forever
```

**With 7-day retention:**
```text
Day 1:    34 GB
Day 7:   238 GB
Day 8:   238 GB   ← steady state
Day 30:  238 GB
```

The compactor deletes data older than the retention period; storage stabilizes.

> For scenarios with longer retention requirements (audit, compliance), consider hot/warm/cold tiering strategies instead of deletion.

### Tempo configuration

```yaml
# tempo-config.yaml
compactor:
  compaction:
    block_retention: 168h
```

> **Note:** The demo uses `block_retention: 5m` to make the retention test reproducible in a few minutes.

---

## Scenario 4: Verification on MockMart

This scenario demonstrates tail sampling and retention on [MockMart](https://github.com/monte97/MockMart/blob/master/otel-config/data-management/otel-collector-config.yaml).

### Two stacks, two approaches

MockMart ships with two configurations:

| Stack | Command | OTel setup | Use |
|-------|---------|-----------|-----|
| **Base** | `make up` | grafana-lgtm all-in-one, 100% sampling | Development, tutorials (scenarios 1–2–3) |
| **Data Management** | `make up-data-management` | Separate Collector, tail sampling, retention | Near-production (scenario 4) |

Scenarios 1–3 from the previous article use the base stack. This article uses the data management stack.

### Setup

> **Prerequisite**: The MockMart repo must be cloned and working. If you do not have it from the [previous tutorial](/blog/verificare/observability/04-correlation/):
> ```bash
> git clone https://github.com/monte97/MockMart
> cd MockMart
> ```

```bash
# Stop any running base stack
make down

# Start data management stack
make up-data-management

# Verify health
make health-data-management

# Verify the Collector has tail sampling active
make check-sampling
```

### Running the full demo

```bash
make scenario-4
```

The script:
1. Shows the Collector's initial metrics
2. Generates 50 normal requests (will be sampled at 10%)
3. Generates 1 request with an error (will be kept at 100%)
4. Generates 1 slow request >1s (will be kept at 100%)
5. Shows final metrics with drop rate

**Expected output:**

```text
Tail Sampling Metrics:
  Spans received (accepted):    ~400
  Spans dropped:                ~350
  Spans exported (to Tempo):    ~50

  Drop rate: ~87%
  Tail sampling is working correctly (target: ~90%)
```

### Verification in Grafana

In Grafana (`http://localhost/grafana`) → Explore → Tempo:

**1. Error trace (must exist):**
```text
{ status = error }
```

<img src="images/webp/scenario4-error-traces.webp" alt="Error traces retained by tail sampling" width="80%">

**2. Slow trace (must exist):**
```text
{ duration > 1s }
```

<img src="images/webp/scenario4-slow-traces.webp" alt="Slow traces retained by tail sampling" width="80%">

**3. Normal traces (only ~10% exist):**
```text
{ resource.service.name = "shop-api" }
```

<img src="images/webp/scenario4-normal-traces.webp" alt="Normal traces sampled at 10%" width="80%">

### Retention verification

The demo uses a 5-minute retention to make the test reproducible.

1. Note a trace ID from the script output
2. Search for it in Grafana: the trace exists
3. Wait 5+ minutes
4. Search again: "Trace not found"

The compactor has deleted the trace.

<img src="images/webp/scenario4-retention.webp" alt="Trace no longer found after retention period" width="80%">

### Additional commands

```bash
# Generate normal traffic only
./scripts/scenario-4-data-management.sh --traffic

# Generate a single error request
./scripts/scenario-4-data-management.sh --error

# Generate a single slow request
./scripts/scenario-4-data-management.sh --slow

# Check tail sampling metrics
./scripts/scenario-4-data-management.sh --check
```

### Cleanup

```bash
make down
```

---

## Monitoring: Verifying That Everything Works

With tail sampling and retention configured, you need to verify that everything is functioning correctly.

### Key Collector metrics

```bash
# Access metrics
curl http://localhost/services/collector/metrics
```

| Metric | Meaning | Expected value |
|--------|---------|----------------|
| `otelcol_receiver_accepted_spans_total` | Incoming spans | Proportional to traffic |
| `otelcol_processor_tail_sampling_global_count_traces_sampled_total` | Globally sampled/dropped traces (label `sampled`) | ~90% `false` |
| `otelcol_processor_tail_sampling_count_traces_sampled_total` | Per-policy sampled/dropped traces (labels `policy`, `sampled`) | Per-policy detail |
| `otelcol_exporter_sent_spans_total` | Spans sent to Tempo | ~10% of accepted |

> The names listed include the `_total` suffix visible at the Prometheus `/metrics` endpoint. Dashboards and alerts use `rate()`, which operates on counters with this suffix.

> **Note:** The tail sampling processor exposes its own metrics (`global_count_traces_sampled`) rather than the generic `incoming_items`/`outgoing_items`. The global metric with label `sampled=true|false` indicates how many traces were kept or discarded. The per-policy metric adds detail on which policy made the decision.

**Drop rate formula:**
```text
drop_rate = not_sampled / (sampled + not_sampled) * 100
```

If drop rate < 50%, tail sampling is not working as expected.

### Grafana dashboard

The data management stack ships with a pre-configured dashboard:

```text
Grafana -> Dashboards -> Data Management -> OTel Collector - Data Management
```

<img src="images/webp/scenario4-dashboard.webp" alt="OTel Collector - Data Management dashboard in Grafana" width="80%">

Key panels:
- **Span Received (rate):** Spans/sec arriving at the Collector
- **Drop Rate (target: 90%):** Percentage of spans discarded by tail sampling
- **Export Failures (rate):** Target is 0
- **Collector Memory Usage:** Collector RAM consumption

### Alert rules

The data management stack includes 8 alert rules in [`otel-config/data-management/alerts/`](https://github.com/monte97/MockMart/tree/master/otel-config/data-management/alerts), organized in two groups. These are not generic off-the-shelf rules: they are written specifically to monitor this stack's behavior (90% tail sampling, short retention, single Collector instance).

**Group 1: `otel-collector-health`** (6 rules)

Monitors the Collector as an infrastructure component: is it reachable? Is it exporting? Is sampling working?

| Alert | Severity | Trigger | Meaning |
|-------|----------|---------|---------|
| `OtelCollectorDown` | critical | `up{job="otel-collector"} == 0` for 1m | Collector unreachable. No telemetry collected. |
| `OtelCollectorExportFailures` | critical | Export failure rate > 100 spans/sec (5m) | Collector cannot send data to Tempo. |
| `OtelCollectorBackpressure` | warning | Queue size > 5000 for 5m | Collector overloaded, risk of span loss. |
| `OtelCollectorHighMemory` | warning | RSS > 500 MB for 5m | High memory consumption, consider scaling. |
| `OtelSamplingRateTooLow` | info | Drop rate < 50% for 10m | Sampling is not discarding enough. Wrong config or anomalous traffic. |
| `OtelSamplingRateTooHigh` | warning | Drop rate > 99% for 10m | Sampling discards almost everything. Risk of losing important data. |

The sampling rate alerts deserve a closer look. The expected drop rate is ~90% (10% probabilistic sampling). The PromQL calculates the percentage of discarded traces relative to the total:

```promql
# Drop rate = discarded_traces / (kept_traces + discarded_traces)
(
  rate(otelcol_processor_tail_sampling_global_count_traces_sampled_total{sampled="false"}[5m])
  /
  (
    rate(...{sampled="true"}[5m]) +
    rate(...{sampled="false"}[5m])
  )
)
```

Two complementary thresholds define the operational window:
- **< 50%** (`TooLow`): sampling is not working. Possible causes: missing policies, config errors, traffic that is predominantly anomalous (all errors or all slow).
- **> 99%** (`TooHigh`): sampling discards almost everything. Possible cause: probabilistic policy missing or set to 0%.

**Group 2: `tempo-health`** (2 rules)

Monitors the trace storage backend.

| Alert | Severity | Trigger | Meaning |
|-------|----------|---------|---------|
| `TempoIngestionFailures` | warning | Failure rate > 0 for 5m | Trace ingestion errors. Tempo may have storage problems. |
| `TempoCompactorBehind` | warning | `tempodb_compaction_outstanding_blocks` > 100 for 15m | Compactor is falling behind. Retention at risk. |

The second alert is directly tied to retention: if the compactor accumulates a backlog, expired blocks are not deleted and storage grows beyond the expected steady state.

**Check alert status:**

```bash
# Alert status in Prometheus (from container)
docker exec prometheus wget -qO- http://localhost:9090/alerts
```

---

## Cardinality Explosion: A Risk to Understand

Tail sampling controls trace volume. For metrics, the equivalent risk is **cardinality explosion**.

### How one label can generate millions of time series

In Prometheus, every metric is a **time series**: a sequence of (timestamp, value) pairs. What makes a time series unique is the combination of metric name and labels:

```text
http_requests_total{service="api", endpoint="/users",    status_code="200"}  → series 1
http_requests_total{service="api", endpoint="/users",    status_code="500"}  → series 2
http_requests_total{service="api", endpoint="/products", status_code="200"}  → series 3
```

Every unique combination of labels occupies dedicated space: a memory buffer, a disk block, an index entry. **Metrics cardinality** is the total count of these combinations in the system. With a few labels that have a limited number of values (service, endpoint, status_code), the count stays manageable. The problem arises when a label has unbounded values.

**Example with high cardinality:**

```javascript
// BAD — Cardinality explosion
const counter = meter.createCounter('http_requests_total');

counter.add(1, {
  service: 'api',
  endpoint: '/users',
  user_id: 'user123',  // ← 10,000+ unique values!
  status_code: '200'
});
```

**The math:**
```text
5 services × 50 endpoints × 10,000 users × 5 status codes
= 12.5 MILLION time series

Storage (conservative estimate): 12.5M × 1 sample/sec × ~2 bytes (compressed TSDB) = 25 MB/sec ≈ 2 TB/day
```

That is more than the traces themselves.

### Eliminating unbounded labels

**Core principle:** never use `user_id`, `session_id`, or unbounded values as labels.

```javascript
// GOOD — Bounded cardinality
counter.add(1, {
  service: 'api',
  endpoint: '/users',
  status_code: '200'
  // NO user_id!
});
```

**Resulting cardinality:**
```text
5 services × 50 endpoints × 5 status codes = 1,250 time series
Storage: ~108 MB/day — manageable
```

### Checking cardinality

```promql
# Top 10 metrics by cardinality
topk(10, count by(__name__)({__name__=~".+"}))
```

Metrics with >1000 series warrant investigation.

### Cardinality alert

```yaml
# prometheus-alerts.yaml
- alert: HighCardinalityMetric
  expr: count by(__name__) ({__name__=~".+"}) > 10000
  labels:
    severity: critical
  annotations:
    summary: "Metric with excessive cardinality"
```

---

## Sustainability: With and Without Data Management

Observability only has value if it is sustainable over time. Without volume management, storage grows linearly until you are forced into drastic choices: disable tracing or cut retention to a few hours. In both cases you lose exactly the debug visibility that observability was meant to provide. The numbers below refer to the low-traffic scenario (100 req/s) from the opening section.

### Storage cost projection

**Without data management (100% sampling, no retention):**
```text
Month 1:    1 TB   → $23/month
Month 6:    6 TB   → $138/month
Month 12:  12 TB   → $276/month   ← grows forever
```

**With data management (10% sampling + 7d retention):**
```text
Month 1:   24 GB   → $0.55/month
Month 6:   24 GB   → $0.55/month
Month 12:  24 GB   → $0.55/month  ← steady state
```

### Impact by traffic scenario

Applying 10% sampling and 7-day retention, storage stabilizes:

| Scenario | With 10% Sampling | Steady Storage (7d) | Cost/Month |
|----------|------------------|---------------------|------------|
| **Low (100 req/s)** | 3.4 GB/day | 24 GB | ~$0.55 |
| **Medium (1K req/s)** | 34 GB/day | 238 GB | ~$5.50 |
| **High (10K req/s)** | 345 GB/day | 2.4 TB | ~$55 |

**Assumptions:** S3 storage at $0.023/GB, 10% sampling + 100% errors.

### 12-month comparison (low traffic)

| Aspect | Without management | With management |
|--------|-------------------|-----------------|
| Cumulative storage | 12 TB | 24 GB (steady) |
| Storage cost/year | ~$1,800 | ~$7 |
| Errors captured | 100% | 100% |
| Slow requests captured | 100% | 100% |
| Scalability | Unsustainable | Predictable |

### The cost of giving up

The direct storage cost is often manageable in the first few months. The greater risk is the reaction to growing costs: disabling tracing or cutting retention to a few hours. Either way you lose the debug capability that observability was supposed to guarantee.

With tail sampling and retention configured, the system remains sustainable without sacrificing visibility into errors and anomalies.

---

## Summary

| Problem | Solution | Configuration |
|---------|---------|--------------|
| High volume | Tail sampling | `processors.tail_sampling` in the Collector |
| Unbounded growth | Retention | `compactor.block_retention` in Tempo |
| Cardinality explosion | No unbounded labels | Review metrics code |
| Verify it works | Monitoring | Collector metrics + Grafana dashboard |

**MockMart results:**

| Metric | Without management | With management |
|--------|-------------------|-----------------|
| Ingest/day | 34 GB | ~3.4 GB |
| Storage after 30 days | 1 TB | ~24 GB (steady state) |
| Errors captured | 100% | 100% |
| Slow requests captured | 100% | 100% |

90% volume reduction, zero loss of errors and slow requests for debugging.

---

## Final Checklist

### Initial Setup

**Setup:**
- [ ] Estimate volume for your scenario (use the calculator formula)
- [ ] Collector configured with tail sampling
- [ ] Tempo configured with a retention policy
- [ ] Audit events marked in code (demo: checkout; production: also login, payment)

**Monitoring:**
- [ ] Collector metrics exposed (:8888/metrics)
- [ ] Alerts configured (backpressure, export failures)
- [ ] Grafana dashboard created
- [ ] Cardinality alert configured

**Cardinality:**
- [ ] No unbounded labels (user_id, session_id, email)
- [ ] Total cardinality < 10,000 time series

### After 7 Days of Traffic

- [ ] Drop rate ~90% (check Collector metrics)
- [ ] Storage in steady state (not growing linearly)
- [ ] No alerts fired (no backpressure, no export failures)
- [ ] Errors and slow requests captured (verify in Grafana)

If all checks pass, the observability configuration is ready for an initial rollout.

### Next Steps

1. **Week 1:** Deploy to 1 service in production
2. **Week 2–3:** Monitor, validate real numbers
3. **Week 4+:** Gradual rollout to additional services
4. **Ongoing:** Tune sampling rate and retention based on real data

---

## Resources

**Demo repository:**
- [MockMart on GitHub](https://github.com/monte97/MockMart)

**Documentation:**
- [OTel Collector Tail Sampling](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor)
- [Tempo Configuration](https://grafana.com/docs/tempo/latest/configuration/)

**Further reading:**
- Advanced sampling strategies (composite policies)
- Multi-tenant sampling
- Cloud cost optimization

---

*Questions or feedback: [francesco@montelli.dev](mailto:francesco@montelli.dev) | [LinkedIn](https://www.linkedin.com/in/francesco-montelli/) | [GitHub](https://github.com/monte97)*
