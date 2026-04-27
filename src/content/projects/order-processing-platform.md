---
# DRAFT: bozza generata partendo da description + tags + corpo esistente. Da rivedere con dati reali.
title: "Piattaforma Ordini Event-Driven"
description: "Architettura a microservizi con Go e Kafka per dimostrare Saga Pattern, event sourcing e observability in un sistema distribuito"
pillar: progettare
pillarApplied: progettare
problem: "Un sistema di gestione ordini distribuito deve garantire consistenza tra servizi senza transazioni distribuite tradizionali — e deve poter essere capito quando qualcosa va storto in produzione."
context: "Progetto didattico nato in parallelo alla serie di articoli su Kafka del blog. Pensato per mostrare come un'architettura event-driven affronta i problemi reali — Saga, consistenza eventuale, recovery — invece di limitarsi alla teoria dei protocolli."
featured: true
tags: ["Go", "Kafka", "PostgreSQL", "Kubernetes", "OpenTelemetry"]
links:
  github: https://github.com/monte97/kafka-pekko
  blog: /posts/kafka/01-intro/
weight: 20
actions:
  - "Progettazione dei contratti tra microservizi con eventi Kafka e Schema Registry"
  - "Implementazione del Saga Pattern per orchestrare la creazione ordine attraverso più servizi"
  - "Strategia di crash recovery: idempotenza dei consumer e gestione dei messaggi in-flight"
  - "Tracing distribuito end-to-end con OpenTelemetry per seguire un ordine attraverso tutto il flusso"
  - "Deploy su Kubernetes con configurazione coerente tra ambienti"
result: "Il repository è pubblico e accompagna la serie di articoli su Kafka. È diventato il banco prova che uso per ragionare con i clienti su scelte architetturali simili — sync vs async, scelta del broker, gestione degli errori — partendo da codice che funziona invece che da slide."
---

Progetto didattico che simula una piattaforma di gestione ordini distribuita. Ho progettato l'architettura event-driven con microservizi in Go, transazioni distribuite tramite Saga Pattern e observability completa con OpenTelemetry. Il repository è pubblico e accompagna la serie di articoli su Kafka sul blog.
