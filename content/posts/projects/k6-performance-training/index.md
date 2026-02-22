---
title: "K6 Performance Testing Training"
date: 2025-01-07
draft: true
description: "Corso di formazione su performance testing con k6 per un team di 10 developer, dalla teoria all'implementazione di test di carico"
menu:
  sidebar:
    name: K6 Performance Training
    identifier: k6-performance-training
    parent: projects
    weight: 75
technologies: ["k6", "JavaScript", "Grafana", "Docker", "Jenkins"]
categories: ["Testing", "Performance Engineering", "Training"]
role: "Trainer & Technical Lead"
duration: "2 mesi"
team_size: "10 developer"
client_type: "Scale-up"
featured: false
related_posts: ["/posts/testing/performance-engineering/01-intro/"]
reviewed: false
---

## Overview

Corso di formazione hands-on su performance testing per un team di developer. L'obiettivo era introdurre una cultura del performance testing partendo da zero, portando il team a scrivere e interpretare test di carico autonomamente.

## Stack Tecnologico

* **k6** — load testing tool moderno e developer-friendly
* **JavaScript** — linguaggio per la scrittura dei test k6
* **Grafana** — visualizzazione metriche e dashboard
* **Docker** — containerizzazione ambiente di test
* **Jenkins** — integrazione CI/CD per test automatizzati

## Architettura

```text
┌─────────────────────────────────────────────────────────────────┐
│                         Jenkins Pipeline                        │
│  ┌─────────────┐  ┌─────────────────────────────────────────┐  │
│  │ Build Stage │─▶│         Load Test Stage                 │  │
│  └─────────────┘  │  ┌─────────────────────────────────┐    │  │
│                   │  │  k6 Container (Virtual Users)   │    │  │
│                   │  └─────────────────────────────────┘    │  │
│                   └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Monitoring Stack                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Grafana   │  │ InfluxDB /  │  │   Application Under     │ │
│  │ Dashboards  │◀─│ Prometheus  │◀─│   Test (staging)        │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Attività Svolte

### Fondamenti: Teoria del Performance Testing

Introduzione ai concetti chiave: latency, throughput, percentili, saturation point. Differenza tra load test, stress test, spike test e soak test.

**Deliverable**: Documentazione interna e glossario condiviso per il team.

### k6 Basics: Primi Test

Workshop pratico sulla scrittura di test k6: virtual users, scenarios, thresholds, checks. Struttura di un test ben organizzato.

**Deliverable**: Template di test k6 riutilizzabili per i pattern più comuni dell'applicazione.

### Analisi dei Risultati

Come leggere e interpretare i risultati di k6: metriche HTTP, custom metrics, trend analysis. Identificazione di bottleneck.

**Deliverable**: Dashboard Grafana per la visualizzazione dei risultati dei test.

### Integrazione CI/CD

Configurazione di test di performance automatizzati nella pipeline: smoke test su ogni PR, load test completo su release candidate.

**Deliverable**: Pipeline Jenkins con stage dedicato al performance testing e threshold automatici.

## Risultati

* **Team**: 10 developer formati su performance testing con k6
* **Infrastruttura**: da zero a pipeline di load testing automatizzata
* **Metodologia**: processo definito per test di carico pre-release
* **Autonomia**: team in grado di scrivere, eseguire e interpretare test di performance

## Articoli Correlati

* [Performance Engineering: Introduzione](/posts/testing/performance-engineering/01-intro/)
