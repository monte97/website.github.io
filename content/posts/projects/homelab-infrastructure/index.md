---
title: "Homelab Infrastructure"
date: 2025-01-07
draft: true
description: "Infrastruttura self-hosted per sperimentazione e hosting servizi personali con Kubernetes e GitOps"
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
related_posts: ["/posts/kubernates/fondamenti/homelab-capi-article/capi-part1-intro/", "/posts/kubernates/fondamenti/homelab-capi-article/capi-part2-internals/", "/posts/kubernates/fondamenti/homelab-capi-article/capi-part3-talos/", "/posts/kubernates/fondamenti/homelab-capi-article/capi-part4-day1/", "/posts/kubernates/fondamenti/homelab-capi-article/capi-part5-ubuntu/", "/posts/homelab-n8n/"]
---

## Overview

Infrastruttura homelab completa per sperimentazione tecnologica e hosting di servizi personali. Il progetto è un laboratorio continuo dove testo architetture, tool, e pattern prima di proporli in contesti professionali.

L'homelab è nato dalla necessità di avere un ambiente dove sperimentare liberamente con Kubernetes, GitOps, e observability senza vincoli di budget o policy aziendali.

## Stack Tecnologico

* **Proxmox VE** — hypervisor per virtualizzazione
* **Talos Linux** — OS immutabile per Kubernetes
* **Cluster API** — provisioning dichiarativo cluster
* **ArgoCD** — GitOps continuous delivery
* **n8n** — workflow automation self-hosted
* **Grafana Stack** — observability completa (Loki, Tempo, Mimir)
* **Docker** — container runtime

## Architettura

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

## Componenti Principali

### Cluster API per Kubernetes

**CAPI** è il cuore dell'infrastruttura. Gestisce in modo completamente dichiarativo il provisioning sia del **Management Cluster** (che ospita i controller di CAPI stesso) che del **Workload Cluster** (dove girano i carichi applicativi come n8n e Grafana).

Ogni cluster è definito come manifest YAML in Git:
- `management-cluster.yaml` — ospita controller CAPI, ArgoCD, Vault
- `workload-cluster.yaml` — ospita applicazioni e servizi personali

La riconciliazione automatica di CAPI assicura che lo stato infrastrutturale rimane sempre sincronizzato con le definizioni in Git. Upgrade della versione Kubernetes, scaling dei nodi, e configurazione della rete avvengono tramite semplici modifiche ai manifest.

### GitOps con ArgoCD

Ogni configurazione è in Git. ArgoCD sincronizza automaticamente lo stato desiderato con i cluster. Rollback istantaneo tramite git revert.

### Automazione con n8n

Workflow di automazione personale: backup scheduling, notifiche, integrazioni smart home, data sync tra servizi.

### Observability Stack

Full LGTM stack (Loki, Grafana, Tempo, Mimir) per monitorare l'intera infrastruttura. Dashboard per risorse, applicazioni, e costi energetici.

## Caratteristiche

* **Infrastructure as Code** — 100% della configurazione in Git
* **Self-healing** — Kubernetes riavvia automaticamente workload falliti
* **Backup automatici** — Snapshot giornalieri con retention policy
* **Monitoring completo** — Alert per risorse, uptime, e anomalie
* **Cost tracking** — Monitoraggio consumo energetico

## Evoluzioni Future

* Integrazione con servizi cloud per hybrid setup
* Disaster recovery automatizzato
* Home automation avanzata con Home Assistant

## Articoli Correlati

### Serie CAPI (Cluster API)
* [CAPI Parte 1: Dal Chaos all'Automazione](/posts/kubernates/fondamenti/homelab-capi-article/capi-part1-intro/)
* [CAPI Parte 2: Internals e Reconciliation Loop](/posts/kubernates/fondamenti/homelab-capi-article/capi-part2-internals/)
* [CAPI Parte 3: Talos Linux per Nodi Immutabili](/posts/kubernates/fondamenti/homelab-capi-article/capi-part3-talos/)
* [CAPI Parte 4: Day-1 e Day-2 Operations](/posts/kubernates/fondamenti/homelab-capi-article/capi-part4-day1/)
* [CAPI Parte 5: Ubuntu e Alternative di OS](/posts/kubernates/fondamenti/homelab-capi-article/capi-part5-ubuntu/)

### Servizi e Applicazioni
* [Homelab n8n: Automazione Self-Hosted](/posts/homelab-n8n/) — Workflow automation deployed su workload cluster

### Altre Guide Correlate
* Observability Stack — Monitoraggio completo con Grafana, Loki, Tempo, Mimir
* DevContainers — Setup ambiente di sviluppo per contribuire al progetto
* Ingress Kubernetes — Routing del traffico verso applicazioni nel cluster
