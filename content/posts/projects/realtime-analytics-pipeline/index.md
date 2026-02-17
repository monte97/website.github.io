---
title: "Real-time Analytics Pipeline"
date: 2025-01-07
draft: true
description: "Pipeline di data streaming per analytics real-time su dati IoT industriali con processing distribuito"
menu:
  sidebar:
    name: Real-time Analytics Pipeline
    identifier: realtime-analytics-pipeline
    parent: projects
    weight: 30
technologies: ["Kafka", "Kafka Streams", "ksqlDB", "MongoDB", "Grafana", "Python"]
categories: ["Event-Driven", "Observability"]
role: "Solo Technical Lead"
duration: "12+ mesi"
team_size: "1 tecnico + team interdisciplinare"
client_type: "Startup (early stage)"
featured: false
related_posts: ["/posts/otel-website-material/03-lgtm/"]
reviewed: false
---

## Overview

Pipeline di data streaming per analytics real-time su dati IoT provenienti da macchinari edili, sviluppata in collaborazione con una startup early-stage che fornisce soluzioni telemetriche a un consorzio di 50+ imprese edili. Ho ricoperto il ruolo di unico riferimento tecnico, progettando e implementando l'intera architettura.

Il sistema raccoglie e processa dati da sensori IoT distribuiti sui macchinari dei cantieri (escavatori, gru, betoniere, rulli compattatori), fornendo dashboard operative con KPI real-time (ore di utilizzo, consumi carburante, posizionamento GPS, stati di lavoro) e alerting in tempo reale — sostituendo un sistema batch-based con report a 24 ore di ritardo.

## Stack Tecnologico

* **Apache Kafka** — event ingestion e streaming backbone
* **Kafka Streams** — stream processing con exactly-once semantics
* **ksqlDB** — query SQL real-time sui topic Kafka
* **MongoDB** — storage time-series per dati aggregati
* **Grafana** — dashboard real-time e alerting
* **Python** — anomaly detection ML models

## Architettura

```text
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│ IoT Sensors │────▶│   Kafka     │────▶│ Kafka Streams   │
│ (MQTT)      │     │   Cluster   │     │ (Aggregations)  │
└─────────────┘     └─────────────┘     └────────┬────────┘
                           │                     │
                           ▼                     │
                    ┌─────────────┐              │
                    │   ksqlDB    │              │
                    │ (RT Queries)│              │
                    └──────┬──────┘              │
                           │                     │
                    ┌──────┴─────────────────────┼────────────┐
                    │                            │            │
                    ▼                            ▼            ▼
           ┌─────────────────┐          ┌─────────────┐ ┌─────────────┐
           │ MongoDB         │          │ Anomaly     │ │ Grafana     │
           │ (Time Series)   │          │ Detection   │ │ (Alerting)  │
           └─────────────────┘          └─────────────┘ └─────────────┘
```

## Sfide e Soluzioni

### Sfida 1: Volume e Velocità Dati

50k eventi/secondo richiedevano un'architettura in grado di scalare orizzontalmente senza perdere dati.

**Soluzione**: Kafka cluster con 12 broker, partitioning per stabilimento, e consumer groups per processing parallelo. Backpressure handling con buffer intermedii.

### Sfida 2: Exactly-Once Processing

Le aggregazioni (ore di lavoro per macchinario, consumi carburante, medie di performance) dovevano essere accurate nonostante possibili failure, perché utilizzate per billing e reporting commerciale.

**Soluzione**: Kafka Streams con exactly-once semantics abilitato, state stores persistenti, e changelog topics per recovery.

### Sfida 3: Retention e Cost Optimization

Gestione della retention dei dati a diversi livelli di granularità per bilanciare accessibilità operativa e ottimizzazione dei costi di storage.

**Soluzione**: Hot/warm/cold tiering con MongoDB time-series collections. Automatic rollup da dati grezzi a aggregazioni orarie e giornaliere. Compressione aggressiva su dati cold per ridurre footprint di storage.

## Risultati

* **Visibilità Operativa Real-time**: Dashboard operative che mostrano lo stato di tutti i macchinari in campo, con KPI di utilizzo, consumo e performance aggiornati in tempo reale. Accesso istantaneo a dati che prima erano disponibili 24 ore dopo.
* **Garanzia di Integrità dei Dati**: Nessuna perdita di dati grazie alle garanzie di `exactly-once` fornite da Kafka Streams, assicurando l'accuratezza delle ore di lavoro e dei consumi (critici per billing).
* **Anomaly Detection Proattivo**: Capacità di rilevare anomalie e guasti ai macchinari in pochi minuti, permettendo interventi di manutenzione preventiva prima della rottura.
* **Analisi di Efficienza**: Identificazione di pattern di utilizzo inefficiente, consumi anomali, o problemi ricorrenti su specifici macchinari, guidando decisioni di manutenzione e pianificazione flotta.

## Articoli Correlati

* [LGTM Stack: Observability Moderna](/posts/otel-website-material/03-lgtm/)
