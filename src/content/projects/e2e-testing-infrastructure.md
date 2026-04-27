---
# DRAFT: bozza generata partendo da description + tags + corpo esistente. Da rivedere con dati reali.
title: "Testing E2E con Playwright"
description: "Corso pratico su E2E testing per un team di 10 developer: da zero test a una suite completa integrata in CI/CD"
type: workshop
pillar: verificare
pillarApplied: verificare
problem: "Un team che vuole introdurre testing end-to-end ma non sa da dove partire: non basta scrivere test che girano in locale — servono test che reggono il tempo, non diventano flaky e non vengono disattivati al primo intoppo in CI."
context: "Team di 10 developer con prodotto già in produzione, senza una baseline di test E2E. L'obiettivo era passare da zero a una suite che girasse in pipeline e che il team mantenesse autonomamente."
featured: false
tags: ["Playwright", "Docker", "Jenkins", "PostgreSQL", "Vue.js"]
links:
  github: https://github.com/monte97/workshop-playwright
  blog: /posts/testing/01-guida-completa-e2e/
weight: 60
actions:
  - "Fondamenti di Playwright: locator, waiting strategy, debugging — partendo dai pattern che funzionano davvero"
  - "Page Object Model: come strutturare test che sopravvivono ai cambiamenti di UI"
  - "Fixtures e gestione dei dati di test: setup riproducibili, niente test che dipendono dallo stato del database"
  - "Integrazione in pipeline CI/CD con Jenkins, parallelizzazione e gestione dei retry"
result: "Il team è uscito con una suite operativa e con la capacità di scriverne di nuovi senza assistenza. Il repository pubblico funziona come riferimento al quale tornare dopo il workshop, evitando il classico effetto 'corso seguito, codice dimenticato dopo due settimane'."
---

Workshop intensivo su testing end-to-end con Playwright. Ho formato un team di 10 developer partendo dai fondamenti — page object pattern, fixtures, gestione dati di test — fino all'integrazione della suite in pipeline CI/CD. Repository e materiali pubblici.
