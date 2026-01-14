---
title: "OpenTelemetry Implementation"
date: 2025-01-07
draft: true
description: "OpenTelemetry observability implementation on modern C# application. First step of a corporate visibility improvement strategy"
menu:
  sidebar:
    name: OpenTelemetry Implementation
    identifier: observability-as-a-service
    parent: projects
    weight: 50
technologies: ["OpenTelemetry", "C#/.NET", "Loki", "Grafana", "Tempo", "Mimir", "Prometheus"]
categories: ["Observability", "DevOps"]
role: "DevOps Engineer"
duration: "2 months"
team_size: "1 technical"
client_type: "SME / Enterprise"
featured: false
related_posts: ["/posts/otel-website-material/01-observability/", "/posts/otel-website-material/02-opentelenetry/", "/posts/otel-website-material/03-lgtm/"]
---

## Overview

OpenTelemetry observability implementation on a modern C# application. The application had basic logging but lacked structured distributed tracing and metrics.

This project represents the **first building block of a corporate strategy to improve operational visibility**: the goal was to start with a real application, instrument it completely with OpenTelemetry and the LGTM stack, then replicate the pattern across other services in the organization.

## Tech Stack

* **OpenTelemetry SDK .NET** — application instrumentation
* **Loki** — log aggregation
* **Grafana** — visualization and dashboarding
* **Tempo** — distributed tracing backend
* **Mimir** — long-term metrics storage
* **Prometheus** — metrics collection
* **C# / .NET** — application to instrument

## Architecture

```text
┌─────────────────────────────────────────┐
│  C# Application (Modern)                │
│  + OpenTelemetry SDK                    │
│  ┌───────────────────────────────────┐  │
│  │ Traces | Logs | Metrics           │  │
│  └──────────────┬────────────────────┘  │
└─────────────────┼──────────────────────┘
                  │
                  ▼
         ┌────────────────────┐
         │  OTLP Exporters    │
         │ (gRPC or HTTP)     │
         └────────┬───────────┘
                  │
      ┌───────────┼───────────┐
      │           │           │
      ▼           ▼           ▼
   ┌─────┐   ┌──────┐   ┌──────────┐
   │Loki │   │Promth│   │ Tempo    │
   │ (L) │   │ (M)  │   │ (T)      │
   └─────┘   └──────┘   └──────────┘
      │           │           │
      └───────────┼───────────┘
                  ▼
         ┌──────────────────┐
         │  Grafana         │
         │ (Dashboards &    │
         │  Visualization)  │
         └──────────────────┘
```

## Activities Performed

### 1. C# Application Instrumentation with OpenTelemetry

The goal was to equip the application with structured telemetry across all three pillars (logs, traces, metrics).
* **OpenTelemetry SDK .NET**: Integrated into the application, instrumenting:
  - HTTP endpoints (ASP.NET Core)
  - Database calls
  - Business logic components with custom spans
* **Result**: End-to-end distributed tracing of every request, with complete visibility into latencies, errors, and correlation between components.

### 2. LGTM Stack for Storage and Visualization

Complete implementation of the Grafana stack for three telemetry signals:
* **Loki** — Structured log aggregation and storage
* **Tempo** — Backend for distributed traces
* **Mimir** — Long-term storage for Prometheus metrics
* **Grafana** — Unified visualization with automatic correlation between logs, traces, and metrics

### 3. Operational Dashboards

Creation of Grafana dashboards for monitoring:
* Latency per HTTP endpoint and percentiles (p50, p90, p99)
* Error rate and success rate
* Database metrics (query duration, connection pool)
* Quick correlation between logs and traces for troubleshooting

### 4. Foundation for Corporate Replication

This project established the **instrumentation pattern and stack** to be replicated across other services in the organization, creating a coherent observability strategy at the enterprise level.

## Results

* **End-to-End Visibility**: Complete tracing of requests across application components, enabling rapid diagnosis of bottlenecks, anomalies, and errors.
* **Guided Troubleshooting**: Immediate correlation between logs, traces, and metrics provides full context for debugging, reducing investigation time.
* **Foundation for Enterprise Scale**: Replicable instrumentation pattern and stack, providing a coherent foundation for extending observability to other services in the organization.
* **Performance Baseline**: Historical metrics enabling identification of regressions and performance optimization over time.

## Related Articles

* [Observability: Fundamentals and Pillars](/posts/otel-website-material/01-observability/)
* [OpenTelemetry: The Standard](/posts/otel-website-material/02-opentelenetry/)
* [LGTM Stack: Modern Observability](/posts/otel-website-material/03-lgtm/)
