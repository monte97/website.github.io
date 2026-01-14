---
title: "E2E Testing Infrastructure"
date: 2025-01-07
draft: true
description: "Corso di formazione su E2E testing con Playwright per un team di 10 developer, partendo da zero fino a una test suite completa"
menu:
  sidebar:
    name: E2E Testing Infrastructure
    identifier: e2e-testing-infrastructure
    parent: projects
    weight: 60
technologies: ["Playwright", "Docker", "Jenkins", "PostgreSQL", "Vue.js"]
categories: ["Testing", "Quality Engineering", "Training"]
role: "Trainer & Technical Lead"
duration: "2 mesi"
team_size: "10 developer"
client_type: "Scale-up"
featured: false
related_posts: ["/posts/testing/playwright-demo/", "/posts/testing/performance-engineering/01-intro/"]
---

## Overview

Corso di formazione hands-on su E2E testing per un team di 10 developer in una scale-up. L'obiettivo era costruire da zero un'infrastruttura di testing automatizzato completa, portando il team da nessuna copertura E2E a una test suite production-ready.

Il progetto è partito dall'assenza totale di test end-to-end: nessun framework, nessuna pipeline, nessuna competenza specifica nel team. In 2 mesi abbiamo costruito insieme l'intera infrastruttura, formando il team su best practice, architettura e manutenzione della suite.

## Stack Tecnologico

* **Playwright** — browser automation e testing framework
* **Docker** — containerizzazione test environment
* **Jenkins** — CI/CD orchestration
* **PostgreSQL** — test data management
* **Vue.js** — applicazione frontend sotto test

## Architettura

```text
┌─────────────────────────────────────────────────────────────────┐
│                         Jenkins Pipeline                        │
│  ┌─────────────┐  ┌─────────────────────────────────────────┐  │
│  │ Build Stage │─▶│           Test Stage (Parallel)         │  │
│  └─────────────┘  │  ┌───────┐ ┌───────┐ ┌───────┐         │  │
│                   │  │Shard 1│ │Shard 2│ │Shard N│         │  │
│                   │  └───────┘ └───────┘ └───────┘         │  │
│                   └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Test Environment                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ App (Vue.js)│  │ PostgreSQL  │  │ Playwright Browsers     │ │
│  │ Container   │  │ (Test Data) │  │ (Chrome, Firefox, etc.) │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Struttura del Corso

Il corso è stato un percorso pratico per portare il team dall'assenza totale di test E2E a una padronanza dei pattern moderni, utilizzando un'applicazione e-commerce di esempio.

### Modulo 1: Fondamenta e Tooling Ecosistem Playwright

L'obiettivo di questo modulo era prendere confidenza con l'ecosistema Playwright e scrivere i primi test in modo produttivo.
* **Setup del Progetto**: Inizializzazione con `npm init playwright@latest` e configurazione dell'estensione per VS Code.
* **Developer Experience**: Introduzione ai tool che accelerano lo sviluppo: **Codegen** per la generazione automatica di test, **UI Mode** per il debugging interattivo e **Trace Viewer** per l'analisi post-mortem dei fallimenti.
* **Core Concepts**: Scrittura di test per flussi di login e aggiunta al carrello, con focus su selettori semantici (`getByRole`, `getByTestId`).

### Modulo 2: Test Stabili, Isolati ed Efficienti

Questo modulo si è concentrato sulla risoluzione dei problemi classici del testing E2E: instabilità e lentezza.
* **Isolamento dei Dati**: Passaggio da dati statici (causa di conflitti) a **dati dinamici** (`randomUUID`) per garantire che ogni test sia indipendente e ripetibile.
* **Sincronizzazione Robusta**: Abbandono di `timeout` fissi e risoluzione di race condition attendendo eventi reali dell'applicazione, in particolare le risposte delle chiamate API con **`page.waitForResponse()`**.
* **Autenticazione Ottimizzata**: Implementazione di un **`setup` project** che esegue il login una sola volta per l'intera suite di test e salva lo stato di sessione (`storageState`), riducendo drasticamente i tempi di esecuzione.

### Modulo 3: Scalabilità e Pattern Architetturali

Abbiamo affrontato il problema della scalabilità per eseguire test in parallelo senza interferenze.
* **Parallelismo e Concorrenza**: Dimostrazione di come l'esecuzione parallela (`workers > 1`) con uno stato condiviso porti a test "flaky".
* **Fixture API-Based**: Il pattern chiave del corso. Implementazione di fixture avanzate che creano e distruggono dati di test (es. utenti unici) tramite chiamate API dirette con `APIRequestContext`. Questo garantisce **isolamento totale** e permette una parallelizzazione sicura e scalabile.
* **Page Object Model (POM)**: Organizzazione del codice dei test in classi riutilizzabili che rappresentano le pagine dell'applicazione, migliorando drasticamente la manutenibilità.

### Modulo 4: Testing Visivo e Accessibilità

Oltre alla funzionalità, abbiamo verificato l'integrità visiva e l'accessibilità.
* **Visual Regression Testing**: Utilizzo di `toHaveScreenshot()` per creare "screenshot di baseline" e rilevare modifiche inaspettate al layout. Abbiamo coperto il workflow di analisi dei "diff" e l'aggiornamento degli snapshot.
* **Test di Accessibilità (a11y)**: Introduzione all'integrazione di `axe-core` per eseguire scansioni automatiche e identificare violazioni delle linee guida WCAG, garantendo un prodotto più inclusivo.

### Modulo 5: AI-Assisted Test Generation (MCP Server)

Per accelerare ulteriormente la produzione di test e ridurre il carico cognitivo sugli sviluppatori, è stato introdotto un modulo dedicato all'integrazione di LLM.
* **Supporto alla Generazione Test**: Utilizzo di un LLM (tramite il server MCP) per generare bozze di test E2E a partire da descrizioni in linguaggio naturale o user stories.
* **Ottimizzazione Selettori**: L'LLM assiste nell'identificazione e suggerimento dei selettori più robusti e semantici per gli elementi UI, riducendo la fragilità dei test.
* **Refactoring e Debugging Assistito**: Capacità di analizzare test esistenti per suggerire miglioramenti, refactoring, o identificare potenziali cause di fallimento basandosi su pattern comuni.

## Risultati

* **Formazione Completa**: 10 developer formati su pattern di testing moderni, in grado di scrivere test robusti, isolati e manutenibili.
* **Infrastruttura Scalabile**: Pipeline CI/CD configurata per eseguire centinaia di test E2E in parallelo in modo rapido ed efficiente, fornendo feedback rapidi.
* **Adozione di Best Practice**: Il team ha adottato pattern avanzati come API-based fixtures, Page Object Model e test di accessibilità, migliorando la qualità complessiva del software.
* **Autonomia e Manutenibilità**: La suite di test è stata progettata per essere facilmente estendibile e mantenibile, garantendo la sostenibilità dell'investimento nel lungo periodo.

## Articoli Correlati

* [Playwright: E2E Testing Moderno](/posts/testing/playwright-demo/)
* [Performance Engineering: Introduzione](/posts/testing/performance-engineering/01-intro/)
