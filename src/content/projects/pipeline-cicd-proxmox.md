---
title: "Pipeline CI/CD su Proxmox"
description: "Pipeline che provisiona VM su Proxmox con OpenTofu e automatizza il deploy con Ansible, orchestrata da Jenkins"
pillar: automatizzare
featured: false
tags: ["Jenkins", "OpenTofu", "Ansible", "Semaphore", "Proxmox", "Docker"]
links:
  github: https://github.com/monte97/proxmox-cicd-demo
  blog: /posts/devops/pipeline-proxmox-opentofu-ansible/
weight: 65
---

Pipeline CI/CD completa per ambienti su VM Proxmox. Jenkins orchestra il flusso: OpenTofu provisiona le VM via cloud-init, Semaphore triggera i playbook Ansible per il deploy dello stack Docker Compose. Ho progettato l'architettura per eliminare il deploy manuale e il drift tra staging e produzione.
