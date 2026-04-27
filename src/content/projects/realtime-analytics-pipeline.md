---
# DRAFT: bozza generata partendo da description + tags + corpo esistente. Da rivedere con dati reali.
title: "Pipeline Analytics Industriale"
description: "Data streaming per analytics real-time su dati IoT industriali, con Kafka Streams e dashboard di monitoraggio"
pillar: progettare
pillarApplied: progettare
problem: "Sensori industriali che producono dati in continuo, con il bisogno di trasformarli in informazioni utili e dashboard leggibili — senza che la pipeline di ingest diventi il primo collo di bottiglia man mano che i sensori aumentano."
context: "Tech lead in una startup early-stage. Pipeline progettata da zero, in un contesto in cui le scelte fatte qui avrebbero condizionato l'architettura dati per gli anni successivi."
featured: false
tags: ["Kafka", "Kafka Streams", "ksqlDB", "MongoDB", "Grafana", "Python"]
weight: 30
actions:
  - "Progettazione del modello a eventi: cosa è un fatto immutabile, cosa è una vista derivata, dove sta il confine"
  - "Implementazione delle trasformazioni real-time con Kafka Streams e ksqlDB"
  - "Persistenza su MongoDB per le viste interrogabili, con Kafka come unico source of truth"
  - "Dashboard Grafana per il monitoraggio operativo della pipeline e per le metriche di business"
  - "Definizione di alerting su soglie critiche dei dati e sulla salute della pipeline stessa"
result: "La pipeline regge l'aggiunta di nuovi sensori senza riscrivere il flusso di ingest: bastano nuovi topic e nuove regole di trasformazione. Le dashboard sono state lo strumento con cui il team prodotto ha capito i dati, prima ancora del team tecnico."
---

Come tech lead in una startup early-stage, ho progettato la pipeline di raccolta e analisi dati da sensori industriali. Architettura event-driven con Kafka e Kafka Streams, persistenza su MongoDB, dashboard Grafana per visualizzazione real-time e alerting.
