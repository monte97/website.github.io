---
# DRAFT: bozza generata partendo da description + tags + corpo esistente. Da rivedere con dati reali.
title: "Observability con OpenTelemetry"
description: "Stack di observability completo su applicazione C#/.NET, come progetto pilota per una strategia aziendale di monitoring"
pillar: verificare
pillarApplied: verificare
problem: "Più team applicativi senza una baseline comune di osservabilità: ognuno aveva la propria combinazione di log, metriche e dashboard — quando qualcosa andava storto, mettere insieme i pezzi richiedeva ore."
context: "Progetto pilota interno: prima implementazione end-to-end di uno stack di observability su un'applicazione C#/.NET di riferimento, con l'obiettivo di diventare la base per un setup multi-tenant esteso ad altri team."
featured: true
tags: ["OpenTelemetry", "C#/.NET", "Loki", "Grafana", "Tempo", "Mimir"]
links:
  github: https://github.com/monte97/otel-demo
  blog: /blog/verificare/observability/
weight: 50
actions:
  - "Progettazione dello stack — Grafana, Loki (log), Tempo (trace), Mimir (metriche) — con OpenTelemetry come unico ingresso"
  - "Auto-instrumentation .NET per ridurre al minimo le modifiche al codice applicativo"
  - "Definizione di convenzioni su nomi metriche e attributi span per garantire correlabilità tra segnali"
  - "Architettura pensata per evolvere verso multi-tenant: separazione dei dati per team senza duplicare l'infrastruttura"
result: "Lo stack è diventato la baseline che gli altri team possono adottare con cambiamenti minimi al loro codice. La correlazione automatica trace ↔ log ↔ metriche permette di partire da un alert e arrivare alla causa senza saltare tra strumenti diversi."
---

Primo progetto pilota di observability in azienda. Ho progettato lo stack completo — Grafana, Loki, Tempo, Mimir — con auto-instrumentation OpenTelemetry su un'applicazione C#/.NET. L'architettura è pensata per evolvere verso un setup multi-tenant su più team.
