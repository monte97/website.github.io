---
title: "Real-time Analytics Pipeline"
date: 2025-01-07
draft: true
description: "Data streaming pipeline for real-time analytics on industrial IoT data with distributed processing"
menu:
  sidebar:
    name: Real-time Analytics Pipeline
    identifier: realtime-analytics-pipeline
    parent: projects
    weight: 30
technologies: ["Kafka", "Kafka Streams", "ksqlDB", "MongoDB", "Grafana", "Python"]
categories: ["Event-Driven", "Observability"]
role: "Solo Technical Lead"
duration: "12+ months"
team_size: "1 technical + cross-functional team"
client_type: "Startup (early stage)"
featured: false
related_posts: ["/posts/otel-website-material/03-lgtm/"]
---

## Overview

Data streaming pipeline for real-time analytics on IoT data from construction machinery, developed in collaboration with an early-stage startup providing telematics solutions to a consortium of 50+ construction companies. I served as the sole technical reference, designing and implementing the entire architecture.

The system collects and processes data from IoT sensors distributed across construction machinery in the field (excavators, cranes, concrete mixers, soil compactors), providing operational dashboards with real-time KPIs (operating hours, fuel consumption, GPS positioning, work states) and real-time alerting — replacing a batch-based system with 24-hour delayed reports.

## Tech Stack

* **Apache Kafka** — event ingestion and streaming backbone
* **Kafka Streams** — stream processing with exactly-once semantics
* **ksqlDB** — real-time SQL queries on Kafka topics
* **MongoDB** — time-series storage for aggregated data
* **Grafana** — real-time dashboards and alerting
* **Python** — anomaly detection ML models

## Architecture

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

## Challenges and Solutions

### Challenge 1: Data Volume and Velocity

50k events/second required an architecture capable of horizontal scaling without data loss.

**Solution**: Kafka cluster with 12 brokers, partitioning by facility, and consumer groups for parallel processing. Backpressure handling with intermediate buffers.

### Challenge 2: Exactly-Once Processing

Aggregations (operating hours per machine, fuel consumption, performance averages) needed to be accurate despite possible failures, as they were used for billing and commercial reporting.

**Solution**: Kafka Streams with exactly-once semantics enabled, persistent state stores, and changelog topics for recovery.

### Challenge 3: Retention and Cost Optimization

Managing data retention at different levels of granularity to balance operational accessibility and storage cost optimization.

**Solution**: Hot/warm/cold tiering with MongoDB time-series collections. Automatic rollup from raw data to hourly and daily aggregations. Aggressive compression on cold data to reduce storage footprint.

## Results

* **Real-time Operational Visibility**: Operational dashboards showing the status of all machines in the field, with usage KPIs, consumption, and performance updated in real-time. Instant access to data that previously took 24 hours to become available.
* **Data Integrity Guarantee**: Zero data loss thanks to `exactly-once` guarantees provided by Kafka Streams, ensuring the accuracy of operating hours and fuel consumption (critical for billing).
* **Proactive Anomaly Detection**: Ability to detect machine anomalies and failures within minutes, enabling preventive maintenance interventions before breakdowns occur.
* **Efficiency Analysis**: Identification of inefficient usage patterns, anomalous consumption, or recurring issues on specific machines, guiding maintenance decisions and fleet planning.

## Related Articles

* [LGTM Stack: Modern Observability](/posts/otel-website-material/03-lgtm/)
