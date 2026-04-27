---
# DRAFT: bozza generata partendo da description + tags + corpo esistente. Da rivedere con dati reali.
title: "Infrastruttura Homelab"
description: "Cluster Kubernetes su Proxmox con provisioning automatico via Cluster API e deployment GitOps con ArgoCD"
pillar: automatizzare
pillarApplied: automatizzare
problem: "Avere un ambiente personale dove sperimentare scelte infrastrutturali prima di proporle a un cliente — senza il vincolo di un cloud provider e senza il costo di sbagliare in produzione."
context: "Laboratorio personale ospitato su un piccolo cluster Proxmox. L'ho costruito perché volevo poter dire ai clienti 'questa cosa l'ho fatta, ecco come' invece di 'in teoria si fa così'."
featured: true
tags: ["Kubernetes", "Cluster API", "ArgoCD", "n8n", "Grafana", "Docker", "Proxmox"]
links:
  blog: /posts/kubernetes/01-capi-part1-intro/
weight: 70
actions:
  - "Provisioning del cluster Kubernetes con Cluster API, declarativo e ricostruibile da zero"
  - "Gestione delle applicazioni in GitOps con ArgoCD: lo stato del cluster è quello che dice Git, fine"
  - "Stack di servizi self-hosted (n8n, Grafana, altri tool) deployati come parte del flusso GitOps"
  - "Codice IaC pubblico: le scelte sono tracciabili e riusabili"
result: "L'homelab è il banco prova che uso per testare scelte tecnologiche in modo onesto: se un'idea non sopravvive nel mio piccolo, non ha senso che la proponga a un cliente. È anche dove i contenuti del blog su Cluster API e GitOps vengono testati prima di essere scritti."
---

Il mio laboratorio personale per sperimentare e ospitare servizi. Cluster Kubernetes su Proxmox, provisionato automaticamente con Cluster API e gestito in GitOps con ArgoCD. Tutto il codice IaC è pubblico — lo uso come banco prova prima di proporre soluzioni ai clienti.
