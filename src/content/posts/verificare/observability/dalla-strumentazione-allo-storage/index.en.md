---
title: "Where the cost of observability is decided"
seoTitle: "OpenTelemetry and LGTM: architecture and cost"
date: 2025-08-03T09:00:00.000Z
description: "Where you put the Collector and what you index: the two choices that decide what it costs to observe a system. Topologies, OTLP transport numbers, LGTM storage model."
pillar: verificare
category: observability
mode: explanation
tags: [OpenTelemetry, Observability, Grafana, Loki, Tempo, LGTM]
lang: en
reviewed: false
series: observability
seriesOrder: 10
---

<!-- EN: assemblaggio meccanico delle sezioni superstiti di 02 e 03, 2026-08-26.
     Il testo e' quello di prima: l'adattamento alla versione italiana riscritta e' un lavoro a parte. -->

## The Pre-OpenTelemetry Fragmentation Problem

Before the advent of OpenTelemetry, the observability ecosystem was a maze of protocols, APIs, and proprietary formats. Each vendor had developed their own "dialect":

  * **Jaeger** used its own span format and ingestion protocol.
  * **Zipkin** had a different data model and specific REST APIs.
  * **Prometheus** required metrics in a specific format with rigid naming conventions.
  * **AWS X-Ray**, **Google Cloud Trace**, **Azure Monitor** - each with proprietary SDKs.

This fragmentation created systemic problems:

  * **Vendor lock-in**: Changing tools meant rewriting instrumentation.
  * **Data silos**: It was impossible to correlate telemetry from different sources, compromising the ability to understand end-to-end behavior in a distributed system.
  * **Learning overhead**: Each team had to master different APIs and concepts for each tool.
  * **Duplicated effort**: The same instrumentation and integration work was repeated for each backend.

This situation not only caused high costs in terms of development and maintenance, but also prevented a complete and correlated view of the system's state. It was precisely to address these challenges that the community pushed for unification of standards,[ culminating in the merger of OpenTracing and OpenCensus under the CNCF umbrella to create OpenTelemetry](https://opensource.microsoft.com/blog/2019/05/23/announcing-opentelemetry-cncf-merged-opencensus-opentracing/).

-----

## OpenTelemetry: The Unifying Architecture

![Otel Architecture](imgs/otel_arch.png)

OpenTelemetry solves this fragmentation through a layered architecture that clearly separates:

  * **Data generation** (SDK)
  * **Data collection** (Collector)
  * **Data consumption** (Backends)

Thanks to its adoption by a broad coalition of companies and its promotion as a **[Graduated project from the Cloud Native Computing Foundation (CNCF)](https://www.cncf.io/blog/2021/08/26/opentelemetry-becomes-a-cncf-incubating-project/)**, OpenTelemetry has quickly established itself as the de-facto standard for cloud-native telemetry.

### The Architectural Principles

**1. Separation of Concerns**

  * The application produces standardized data.
  * The Collector handles routing and processing.
  * Backends only handle storage and query.

**2. Protocol Standardization**

  * **OTLP** (OpenTelemetry Protocol) as the common language.
  * Support for backward compatibility with legacy protocols.
  * Extensibility for future requirements.

**3. Zero-Dependency Deployment**

  * Lightweight SDKs without direct backend dependencies.
  * Collector deployable independently from the application.
  * "Hot-swappable" configuration without needing to restart applications.

-----

## OpenTelemetry Collector Internals


### Component Architecture

The Collector is built on a **pipeline-based** architecture with three types of components:

**Receivers**: Input endpoints for data.

  * **OTLP**: Native OpenTelemetry protocol (gRPC/HTTP).
  * **Jaeger**: Support for legacy Jaeger protocol.
  * **Zipkin**: Support for legacy Zipkin protocol.
  * **Prometheus**: Scraping of metrics in Prometheus format.
  * **StatsD**: Support for StatsD protocol.

**Processors**: Data transformation pipelines.

  * **Batch**: Performs batching to improve efficiency and throughput.
  * **Memory Limiter**: A safety circuit for Collector resource protection.
  * **Resource**: Adds or modifies resource attributes.
  * **Sampling**: Implements traffic reduction strategies.
  * **Filter**: Allows discarding unwanted data.
  * **Transform**: Allows modification of telemetry data.

**Exporters**: Output destinations for data.

  * **OTLP**: Sends to OTLP-compatible backends.
  * **Prometheus**: Converts metrics to Prometheus format.
  * **Jaeger**: Exports traces to Jaeger.
  * **Logging**: Exports to structured logs.
  * **File**: Writes to local files.

![Pipeline Otel](imgs/otel_pipeline.png)


### Pipeline Configuration

```yaml
# collector.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  prometheus:
    config:
      scrape_configs:
        - job_name: 'app-metrics'
          static_configs:
            - targets: ['app:8080']

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024
    send_batch_max_size: 2048

  memory_limiter:
    limit_mib: 512
    spike_limit_mib: 128

  resource:
    attributes:
      - key: environment
        value: production
        action: upsert

exporters:
  otlp/tempo:
    endpoint: http://tempo:4317
    tls:
      insecure: true

  prometheus:
    endpoint: "0.0.0.0:8889"

  logging:
    loglevel: debug

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch, resource]
      exporters: [otlp/tempo, logging]

    metrics:
      receivers: [otlp, prometheus]
      processors: [memory_limiter, batch, resource]
      exporters: [prometheus]
```

### Performance Optimizations

**Batching Strategy**

```yaml
processors:
  batch:
    # Optimized for throughput
    timeout: 1s              # Maximum wait time before sending
    send_batch_size: 1024    # Preferred batch size
    send_batch_max_size: 2048 # Hard maximum limit for batch
```

**Memory Management**

```yaml
processors:
  memory_limiter:
    limit_mib: 512           # "Soft" memory limit for the Collector
    spike_limit_mib: 128     # Additional quota for temporary spikes
    check_interval: 5s       # Frequency of memory checks
```

**Connection Pooling**

  * Reuse of HTTP/gRPC connections.
  * `Connection keep-alive` to reduce overhead.
  * Circuit breakers to handle downstream system failures.

-----

## Deployment Patterns

OpenTelemetry Collector can be deployed in various configurations, depending on the architecture requirements and complexity of the distributed system.

### Agent Pattern (Sidecar)

**Use case**: Microservices with granular control, often in containerized environments like Kubernetes.
**Pros**:

  * Resource isolation per service.
  * Independent scaling of the agent.
  * Service-specific configuration.
  * Eliminates the need for the application to make direct network calls to backends.
    **Cons**:
  * Resource overhead for each pod/instance.
  * Increases deployment configuration complexity.

### Gateway Pattern (Centralized)

**Use case**: Enterprise environments with centralized operations or for aggregating telemetry from multiple sources.
**Pros**:

  * Centralized configuration management.
  * Cost efficiency (shared resources).
  * Simplified network topology for backends.
    **Cons**:
  * Potential "single point of failure".
  * Additional network latency between the application and the gateway.
  * Scaling bottlenecks if not properly sized.

### Hybrid Pattern

Combines the two approaches, leveraging the advantages of both:

  * **Agent** for local data collection and basic processing (e.g. batching).
  * **Gateway** for advanced processing (e.g. tail-based sampling, complex transformations) and routing to final backends.

-----

#

### 1\. Loki: Aggregated, Scalable and Cost-Effective Logging

**[Loki](https://grafana.com/oss/loki/)** is a log aggregation system inspired by Prometheus's design, but optimized for logs. Its distinctive philosophy is "Don't index the content of logs, but only the labels." This approach makes it extremely efficient in terms of storage and costs, especially for high volumes of data.

  * **Operational Principle**: Instead of indexing every word or field within logs (as traditional ELK/Splunk systems do), Loki focuses on indexing only the **metadata** (labels) associated with logs. Raw logs are compressed and stored in low-cost object storage (e.g. S3, GCS) or local file systems.
  * **Data Flow**: Logs are sent to Loki along with a set of labels (e.g. `app=checkout-service`, `env=prod`, `cluster=us-east-1`). When a query is executed, Loki first uses the labels to quickly filter the relevant log streams, and only then retrieves the raw log content to apply further textual filters or transformations.
  * **Query Language**: **LogQL**. Similar to PromQL, LogQL allows querying logs based on labels and applying parsing, filtering and aggregation functions on the log content.
      * Example: `{namespace="production", app="web-app"} |= "error" != "connection refused"` (search for errors in production web app logs, excluding "connection refused" ones).
      * Aggregation example: `sum(rate({app="my-service"} |= "login failed" [1m])) by (username)` (calculate the frequency of failed logins per username in the last minute).
  * **OpenTelemetry Integration**: The **OpenTelemetry Collector**, through the Loki exporter or a `Grafana Agent` (which includes Promtail functionality), is the ideal bridge for sending logs generated by OpenTelemetry-instrumented applications to Loki. It's crucial that logs include attributes like `trace_id` and `span_id` (through the [OpenTelemetry Semantic Conventions for logs](https://www.google.com/search?q=https://opentelemetry.io/docs/specs/semconv/general/trace-context/)) for easy correlation with Tempo.
  * **Key Benefits**: **Cost-effectiveness** (allows handling much larger volumes of logs at lower costs), **horizontal scalability** and **simplified operability**.


### 2\. Tempo: High-Scalability Tracing for Distributed Traces

**[Tempo](https://grafana.com/oss/tempo/)** is Grafana Labs' distributed tracing backend, specifically designed to store and query an extremely high volume of traces with maximum efficiency and cost-effectiveness. Its innovation lies in being a "zero-index" (trace ID-indexed) **trace store**.

  * **Operational Principle**: Unlike traditional solutions that index every attribute within each span (generating storage overhead and complexity), Tempo indexes only the `TraceID` and stores the complete trace in low-cost object storage (e.g. S3, GCS, or others).
  * **Data Flow**: Traces (in OTLP format) are sent to the **OpenTelemetry Collector**, which in turn forwards them to Tempo. When searching for a specific trace, you provide the `TraceID` and Tempo retrieves the complete trace directly from storage.
  * **Query Language**: Primarily search by `TraceID`. With the introduction of **TraceQL**, Tempo supports more advanced queries based on attributes, but its real power emerges when correlated with LogQL (from Loki) or PromQL (from Mimir) through Grafana. Search by TraceID is the most efficient and cost-effective mode, and for this reason cross-correlation is fundamental.
  * **OpenTelemetry Integration**: Tempo is natively compatible with OpenTelemetry. The **OpenTelemetry Collector**, configured with the OTLP exporter, is the preferred mechanism for sending traces directly to Tempo. This is the smoothest integration, given that OpenTelemetry generates traces in the standard format desired by Tempo.
  * **Key Benefits**: **Cost-effectiveness** (drastic reduction in storage costs for traces), **practically unlimited scalability** and **operational simplicity** thanks to the architecture without complex indexes.

### Typical Architecture in Kubernetes

In a Kubernetes environment, the LGTM stack and OpenTelemetry are often deployed as follows:

  * **OpenTelemetry SDKs**: Integrated directly into application images (as libraries or auto-instrumentation).
  * **OpenTelemetry Collector**:
      * As **Sidecar** for each application pod: collects pod-specific telemetry with minimal network overhead and sends it to a central Collector Gateway.
      * As **DaemonSet** on each node: collects node-level metrics and logs from the node (e.g. `kubelet`, `/var/log`).
      * As **Deployment (Gateway)**: A centralized instance that receives data from all sidecar/daemonset, applies processors (e.g. tail-based sampling, complex transformations) and routes data to Loki, Tempo and Mimir.
  * **Loki, Tempo, Mimir**: Deployed as scalable and resilient clusters. They often use S3-compatible storage (e.g. MinIO, AWS S3, Google Cloud Storage) for their durability and cost-effectiveness.
  * **Grafana**: Deployed as a central instance that users access through a browser.
