---
# DRAFT: bozza generata partendo da description + tags + corpo esistente. Da rivedere con dati reali.
title: "Performance Testing con k6"
description: "Formazione su test di carico con k6 per un team di sviluppo, dalla teoria alle metriche in pipeline CI/CD"
type: workshop
pillar: verificare
pillarApplied: verificare
problem: "Capire se un sistema regge il carico previsto richiede più di 'lanciare un load test e leggere il numero medio'. Senza scenari progettati su traffico reale e senza metriche correlate, i test di carico finiscono per essere rituali che rassicurano senza misurare nulla di utile."
context: "Team di sviluppo che voleva introdurre performance testing in modo strutturato, integrandolo nella pipeline invece di farlo come attività manuale prima delle release."
featured: false
tags: ["k6", "JavaScript", "Grafana", "Docker", "Jenkins"]
links:
  github: https://github.com/monte97/workshop-k6
  blog: /posts/testing/01-intro/
weight: 75
actions:
  - "Design degli scenari di carico: come modellare traffico realistico invece di chiamate uniformi"
  - "Lettura corretta delle metriche: percentili invece di medie, p95/p99 come segnali principali"
  - "Integrazione di k6 in pipeline CI/CD con Jenkins: gating su soglie definite"
  - "Visualizzazione dei risultati in Grafana per confrontare run nel tempo e capire i trend"
result: "Il team ha smesso di vedere il performance testing come 'una cosa da fare prima della release' e ha iniziato a usarlo come segnale continuo: ogni cambiamento significativo passa attraverso scenari di carico, e le regressioni vengono intercettate quando sono ancora reversibili."
---

Corso di formazione su performance testing con k6. Dal design dei scenari di carico alla lettura delle metriche, fino all'automazione in pipeline CI/CD con Jenkins e Grafana per la visualizzazione dei risultati.
