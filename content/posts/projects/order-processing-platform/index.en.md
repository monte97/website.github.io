---
title: "Order Processing Platform"
date: 2025-01-07
draft: true
description: "Educational demo of an event-driven platform with Go, Kafka, Saga Pattern and OpenTelemetry"
menu:
  sidebar:
    name: Order Processing Platform
    identifier: order-processing-platform
    parent: projects
    weight: 10
technologies: ["Go", "Kafka", "PostgreSQL", "Kubernetes", "OpenTelemetry", "Grafana", "Prometheus"]
categories: ["Event-Driven", "Platform Engineering", "Demo"]
role: "Author"
featured: true
related_posts: ["/posts/otel-website-material/01-observability/", "/posts/otel-website-material/02-opentelenetry/"]
---

## Overview

Educational demo of an event-driven order management platform, created to illustrate modern architectural patterns: Go microservices, event streaming with Kafka, distributed transactions with Saga Pattern, and complete observability with OpenTelemetry.

The project was built as training material to demonstrate how to design and implement a resilient and observable distributed system.

## Tech Stack

* **Go** — high-performance microservices for order processing
* **Apache Kafka** — event streaming and service decoupling
* **PostgreSQL** — transactional data persistence with ACID guarantees
* **Kubernetes** — container orchestration and auto-scaling
* **OpenTelemetry** — distributed instrumentation for traces, metrics, logs
* **Grafana/Prometheus** — real-time monitoring and alerting

## Architecture

```text
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│   API GW     │────▶│  Order Service  │────▶│    Kafka     │
└──────────────┘     └─────────────────┘     └──────┬───────┘
                                                    │
                     ┌──────────────────────────────┼───────────────────┐
                     │                              │                   │
                     ▼                              ▼                   ▼
            ┌─────────────────┐          ┌─────────────────┐   ┌─────────────────┐
            │ Payment Service │          │ Inventory Svc   │   │ Notification    │
            └─────────────────┘          └─────────────────┘   └─────────────────┘
```

## Demonstrated Patterns

### Event-Driven Architecture

Decomposition of a complex domain (order processing) into decoupled microservices via event streaming. Asynchronous communication through Kafka with dedicated topics for each bounded context.

**Key concepts**: Event sourcing, CQRS, domain events, eventual consistency.

### Saga Pattern for Distributed Transactions

Managing operations involving multiple services (payment, inventory, shipping) while maintaining consistency without traditional distributed transactions.

**Key concepts**: Orchestration vs Choreography, compensating transactions, idempotency.

### Observability with OpenTelemetry

Complete system instrumentation to trace a request flow across all microservices, including trace context propagation through Kafka.

**Key concepts**: Distributed tracing, context propagation, correlation ID, trace-to-logs.

## Learning Objectives

* **Architecture**: understand when and how to adopt an event-driven architecture
* **Resilience**: implement patterns for handling failures in distributed systems
* **Observability**: instrument a system for effective debugging and monitoring
* **Trade-offs**: evaluate complexity vs benefits of a microservices architecture

## Related Articles

* [Observability: Fundamentals and Pillars](/posts/otel-website-material/01-observability/)
* [OpenTelemetry: The Observability Standard](/posts/otel-website-material/02-opentelenetry/)
