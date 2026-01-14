---
title: "Order Processing Platform"
date: 2025-01-07
draft: true
description: "Demo didattica di piattaforma event-driven con Go, Kafka, Saga Pattern e OpenTelemetry"
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

Demo didattica di una piattaforma di gestione ordini event-driven, realizzata per illustrare pattern architetturali moderni: microservizi in Go, event streaming con Kafka, transazioni distribuite con Saga Pattern, e observability completa con OpenTelemetry.

Il progetto nasce come materiale formativo per dimostrare concretamente come progettare e implementare un sistema distribuito resiliente e osservabile.

## Stack Tecnologico

* **Go** — microservizi ad alte prestazioni per order processing
* **Apache Kafka** — event streaming e decoupling tra servizi
* **PostgreSQL** — persistenza dati transazionali con ACID guarantees
* **Kubernetes** — orchestrazione container e auto-scaling
* **OpenTelemetry** — instrumentazione distribuita per traces, metrics, logs
* **Grafana/Prometheus** — monitoring e alerting real-time

## Architettura

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

## Pattern Dimostrati

### Event-Driven Architecture

Decomposizione di un dominio complesso (order processing) in microservizi disaccoppiati tramite event streaming. Comunicazione asincrona via Kafka con topic dedicati per ogni bounded context.

**Concetti chiave**: Event sourcing, CQRS, domain events, eventual consistency.

### Saga Pattern per Transazioni Distribuite

Gestione di operazioni che coinvolgono più servizi (pagamento, inventario, spedizione) mantenendo consistenza senza transazioni distribuite tradizionali.

**Concetti chiave**: Orchestration vs Choreography, compensating transactions, idempotency.

### Observability con OpenTelemetry

Instrumentazione completa del sistema per tracciare il flusso di una richiesta attraverso tutti i microservizi, inclusa la propagazione del trace context attraverso Kafka.

**Concetti chiave**: Distributed tracing, context propagation, correlation ID, trace-to-logs.

## Obiettivi Formativi

* **Architettura**: comprendere quando e come adottare un'architettura event-driven
* **Resilienza**: implementare pattern per gestire failure in sistemi distribuiti
* **Observability**: instrumentare un sistema per debugging e monitoring efficace
* **Trade-off**: valutare complessità vs benefici di un'architettura a microservizi

## Articoli Correlati

* [Observability: Fondamenti e Pilastri](/posts/otel-website-material/01-observability/)
* [OpenTelemetry: Lo Standard per l'Observability](/posts/otel-website-material/02-opentelenetry/)
