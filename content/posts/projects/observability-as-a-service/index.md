---
title: "OpenTelemetry Implementation"
date: 2025-01-07
draft: true
description: "Implementazione di observability con OpenTelemetry su applicazione C# moderna. Primo step di una strategia aziendale di miglioramento della visibilità"
menu:
  sidebar:
    name: OpenTelemetry Implementation
    identifier: observability-as-a-service
    parent: projects
    weight: 50
technologies: ["OpenTelemetry", "C#/.NET", "Loki", "Grafana", "Tempo", "Mimir", "Prometheus"]
categories: ["Observability", "DevOps"]
role: "DevOps Engineer"
duration: "2 mesi"
team_size: "1 tecnico"
client_type: "PMI / Enterprise"
featured: false
related_posts: ["/posts/otel-website-material/01-observability/", "/posts/otel-website-material/02-opentelenetry/", "/posts/otel-website-material/03-lgtm/"]
reviewed: false
---

## Overview

Implementazione di observability con OpenTelemetry su un'applicazione C# moderna. L'applicazione aveva basi di logging ma mancava di tracciamento distribuito strutturato e metriche.

Questo progetto rappresenta il **primo tassello di una strategia aziendale di miglioramento** della visibilità operativa: l'obiettivo era partire da un'applicazione reale, instrumentarla completamente con OpenTelemetry e stack LGTM, per poi replicare il pattern ad altri servizi dell'organizzazione.

## Stack Tecnologico

* **OpenTelemetry SDK .NET** — strumentazione dell'applicazione
* **Loki** — log aggregation
* **Grafana** — visualization e dashboarding
* **Tempo** — distributed tracing backend
* **Mimir** — long-term metrics storage
* **Prometheus** — metrics collection
* **C# / .NET** — applicazione da instrumentare

## Architettura

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
         │ (gRPC o HTTP)      │
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

## Attività Svolte

### 1. Instrumentazione dell'Applicazione C# con OpenTelemetry

L'obiettivo era dotare l'applicazione di telemetria strutturata su tutti i tre pilastri (logs, traces, metrics).
* **OpenTelemetry SDK .NET**: Integrato nell'applicazione, strumentando:
  - HTTP endpoints (ASP.NET Core)
  - Chiamate al database
  - Componenti di business logic con span personalizzati
* **Risultato**: Tracciamento distribuito end-to-end di ogni richiesta, con visibilità completa su latenze, errori, e correlazione tra componenti.

### 2. Stack LGTM per Storage e Visualizzazione

Implementazione completa del stack Grafana per i tre segnali telemetrici:
* **Loki** — Aggregazione e storage dei log strutturati
* **Tempo** — Backend per tracce distribuite
* **Mimir** — Storage a lungo termine di metriche Prometheus
* **Grafana** — Unified visualization con correlazione automatica tra log, tracce e metriche

### 3. Dashboard Operative

Creazione di dashboard in Grafana per monitoraggio:
* Latenza per endpoint HTTP e percentili (p50, p90, p99)
* Tasso di errori e success rate
* Metriche di database (query duration, connection pool)
* Correlazione rapida tra log e tracce per troubleshooting

### 4. Foundation per Replicazione Aziendale

Questo progetto ha stabilito il **pattern di strumentazione e stack** che sarà replicato negli altri servizi dell'organizzazione, creando una strategia di observability coerente a livello aziendale.

## Risultati

* **Visibilità End-to-End**: Tracciamento completo delle richieste attraverso i componenti dell'applicazione, permettendo diagnosi rapida di colli di bottiglia, anomalie e errori.
* **Troubleshooting Guidato**: Correlazione immediata tra log, tracce e metriche fornisce contesto completo per il debug, riducendo il tempo di investigazione.
* **Foundation per Scala Aziendale**: Pattern di strumentazione e stack replicabili, fornendo una base coerente per estendere l'observability ad altri servizi dell'organizzazione.
* **Baseline di Performance**: Metriche storiche che permettono di identificare regressioni e ottimizzare performance nel tempo.

## Articoli Correlati

* [Observability: Fondamenti e Pilastri](/posts/otel-website-material/01-observability/)
* [OpenTelemetry: Lo Standard](/posts/otel-website-material/02-opentelenetry/)
* [LGTM Stack: Observability Moderna](/posts/otel-website-material/03-lgtm/)
