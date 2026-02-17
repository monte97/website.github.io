---
title: "Homelab Infrastructure"
date: 2025-01-07
draft: true
description: "Self-hosted infrastructure for experimentation and personal service hosting with Kubernetes and GitOps"
menu:
  sidebar:
    name: Homelab Infrastructure
    identifier: homelab-infrastructure
    parent: projects
    weight: 70
technologies: ["Kubernetes", "Cluster API", "ArgoCD", "n8n", "Grafana", "Docker", "Proxmox", "Talos Linux"]
categories: ["Homelab", "Platform Engineering"]
role: "Owner"
duration: "Ongoing"
team_size: "Personal"
client_type: "Personal"
featured: true
related_posts: ["/posts/kubernetes/fondamenti/homelab-capi-article/capi-part1-intro/", "/posts/kubernetes/fondamenti/homelab-capi-article/capi-part2-internals/", "/posts/kubernetes/fondamenti/homelab-capi-article/capi-part3-talos/", "/posts/kubernetes/fondamenti/homelab-capi-article/capi-part4-day1/", "/posts/kubernetes/fondamenti/homelab-capi-article/capi-part5-ubuntu/", "/posts/homelab-n8n/"]
reviewed: false
---

## Overview

Complete homelab infrastructure for technological experimentation and personal service hosting. The project is a continuous lab where I test architectures, tools, and patterns before proposing them in professional contexts.

The homelab was born from the need to have an environment where I could freely experiment with Kubernetes, GitOps, and observability without budget constraints or corporate policies.

## Tech Stack

* **Proxmox VE** — virtualization hypervisor
* **Talos Linux** — immutable OS for Kubernetes
* **Cluster API** — declarative cluster provisioning
* **ArgoCD** — GitOps continuous delivery
* **n8n** — self-hosted workflow automation
* **Grafana Stack** — complete observability (Loki, Tempo, Mimir)
* **Docker** — container runtime

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Proxmox Cluster                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Management Cluster                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │ Cluster API │  │ ArgoCD      │  │ Vault           │  │   │
│  │  │ Controllers │  │             │  │ (Secrets)       │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Workload Cluster                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │ n8n         │  │ Grafana     │  │ Personal Apps   │  │   │
│  │  │             │  │ Stack       │  │                 │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Main Components

### Cluster API for Kubernetes

**CAPI** is the heart of the infrastructure. It manages the provisioning of both the **Management Cluster** (hosting CAPI controllers themselves) and the **Workload Cluster** (where application workloads like n8n and Grafana run) in a completely declarative way.

Each cluster is defined as a YAML manifest in Git:
- `management-cluster.yaml` — hosts CAPI controllers, ArgoCD, Vault
- `workload-cluster.yaml` — hosts applications and personal services

CAPI's automatic reconciliation ensures that the infrastructure state always stays in sync with Git definitions. Kubernetes version upgrades, node scaling, and network configuration happen through simple manifest edits.

### GitOps with ArgoCD

Every configuration is in Git. ArgoCD automatically syncs the desired state with clusters. Instant rollback via git revert.

### Automation with n8n

Personal automation workflows: backup scheduling, notifications, smart home integrations, data sync between services.

### Observability Stack

Full LGTM stack (Loki, Grafana, Tempo, Mimir) to monitor the entire infrastructure. Dashboards for resources, applications, and energy costs.

## Features

* **Infrastructure as Code** — 100% of configuration in Git
* **Self-healing** — Kubernetes automatically restarts failed workloads
* **Automatic backups** — Daily snapshots with retention policy
* **Complete monitoring** — Alerts for resources, uptime, and anomalies
* **Cost tracking** — Energy consumption monitoring

## Future Evolutions

* Cloud service integration for hybrid setup
* Automated disaster recovery
* Advanced home automation with Home Assistant

## Related Articles

### CAPI Series (Cluster API)
* [CAPI Part 1: From Chaos to Automation](/posts/kubernetes/fondamenti/homelab-capi-article/capi-part1-intro/)
* [CAPI Part 2: Internals and Reconciliation Loop](/posts/kubernetes/fondamenti/homelab-capi-article/capi-part2-internals/)
* [CAPI Part 3: Talos Linux for Immutable Nodes](/posts/kubernetes/fondamenti/homelab-capi-article/capi-part3-talos/)
* [CAPI Part 4: Day-1 and Day-2 Operations](/posts/kubernetes/fondamenti/homelab-capi-article/capi-part4-day1/)
* [CAPI Part 5: Ubuntu and Alternative OSes](/posts/kubernetes/fondamenti/homelab-capi-article/capi-part5-ubuntu/)

### Services and Applications
* [Homelab n8n: Self-Hosted Automation](/posts/homelab-n8n/) — Workflow automation deployed on workload cluster

### Other Related Guides
* Observability Stack — Complete monitoring with Grafana, Loki, Tempo, Mimir
* DevContainers — Development environment setup for project contribution
* Kubernetes Ingress — Traffic routing to cluster applications
