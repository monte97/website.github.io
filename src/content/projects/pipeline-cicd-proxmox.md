---
# DRAFT: bozza generata partendo da description + tags + corpo esistente. Da rivedere con dati reali.
title: "Pipeline CI/CD su Proxmox"
description: "Pipeline che provisiona VM su Proxmox con OpenTofu e automatizza il deploy con Ansible, orchestrata da Jenkins"
pillar: automatizzare
pillarApplied: automatizzare
problem: "Deploy fatti a mano su VM Proxmox: ogni rilascio era un evento, lo staging e la produzione divergevano nel tempo, e ricostruire un ambiente da zero richiedeva la memoria di chi l'aveva configurato la prima volta."
context: "Infrastruttura on-prem basata su Proxmox, senza managed services cloud disponibili. Il vincolo era automatizzare senza riscrivere le applicazioni e senza migrare a una piattaforma diversa."
featured: false
tags: ["Jenkins", "OpenTofu", "Ansible", "Semaphore", "Proxmox", "Docker"]
links:
  github: https://github.com/monte97/proxmox-cicd-demo
  blog: /posts/devops/pipeline-proxmox-opentofu-ansible/
weight: 65
actions:
  - "Provisioning delle VM via OpenTofu e cloud-init, con configurazione versionata su Git"
  - "Orchestrazione del flusso end-to-end con Jenkins: trigger, gating, propagazione tra stage"
  - "Deploy applicativo via playbook Ansible eseguiti da Semaphore, idempotenti e replicabili"
  - "Stack applicativo containerizzato (Docker Compose) per ridurre le differenze tra ambienti"
result: "Il deploy manuale è scomparso. Staging e produzione partono dalla stessa configurazione versionata: il drift, quando capita, è visibile in un diff Git invece che in un confronto tra screenshot. Ricostruire un ambiente da zero è un job da lanciare, non un sapere tribale."
---

Pipeline CI/CD completa per ambienti su VM Proxmox. Jenkins orchestra il flusso: OpenTofu provisiona le VM via cloud-init, Semaphore triggera i playbook Ansible per il deploy dello stack Docker Compose. Ho progettato l'architettura per eliminare il deploy manuale e il drift tra staging e produzione.
