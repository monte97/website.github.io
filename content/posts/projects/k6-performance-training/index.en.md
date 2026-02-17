---
title: "K6 Performance Testing Training"
date: 2025-01-07
draft: true
description: "Performance testing training course with k6 for a team of 10 developers, from theory to load test implementation"
menu:
  sidebar:
    name: K6 Performance Training
    identifier: k6-performance-training
    parent: projects
    weight: 70
technologies: ["k6", "JavaScript", "Grafana", "Docker", "Jenkins"]
categories: ["Testing", "Performance Engineering", "Training"]
role: "Trainer & Technical Lead"
duration: "2 months"
team_size: "10 developers"
client_type: "Scale-up"
featured: false
related_posts: ["/posts/testing/performance-engineering/01-intro/"]
reviewed: false
---

## Overview

Hands-on training course on performance testing for a team of developers. The goal was to introduce a performance testing culture from scratch, enabling the team to write and interpret load tests autonomously.

## Tech Stack

* **k6** — modern, developer-friendly load testing tool
* **JavaScript** — language for writing k6 tests
* **Grafana** — metrics visualization and dashboards
* **Docker** — test environment containerization
* **Jenkins** — CI/CD integration for automated tests

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                         Jenkins Pipeline                        │
│  ┌─────────────┐  ┌─────────────────────────────────────────┐  │
│  │ Build Stage │─▶│         Load Test Stage                 │  │
│  └─────────────┘  │  ┌─────────────────────────────────────┐ │  │
│                   │  │  k6 Container (Virtual Users)       │ │  │
│                   │  └─────────────────────────────────────┘ │  │
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

## Activities

### Foundations: Performance Testing Theory

Introduction to key concepts: latency, throughput, percentiles, saturation point. Differences between load test, stress test, spike test, and soak test.

**Deliverable**: Internal documentation and shared glossary for the team.

### k6 Basics: First Tests

Hands-on workshop on writing k6 tests: virtual users, scenarios, thresholds, checks. Structure of a well-organized test.

**Deliverable**: Reusable k6 test templates for common application patterns.

### Results Analysis

How to read and interpret k6 results: HTTP metrics, custom metrics, trend analysis. Bottleneck identification.

**Deliverable**: Grafana dashboard for test results visualization.

### CI/CD Integration

Configuration of automated performance tests in the pipeline: smoke test on every PR, full load test on release candidates.

**Deliverable**: Jenkins pipeline with dedicated performance testing stage and automatic thresholds.

## Results

* **Team**: 10 developers trained on performance testing with k6
* **Infrastructure**: from zero to automated load testing pipeline
* **Methodology**: defined process for pre-release load testing
* **Autonomy**: team able to write, execute, and interpret performance tests

## Related Articles

* [Performance Engineering: Introduction](/posts/testing/performance-engineering/01-intro/)
