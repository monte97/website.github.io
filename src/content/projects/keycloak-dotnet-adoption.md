---
# DRAFT: bozza generata partendo da description + tags + corpo esistente. Da rivedere con dati reali.
title: "Adozione Keycloak su Backend .NET"
description: "Migrazione dell'autenticazione di un backend .NET a Keycloak, dall'analisi architetturale all'implementazione in produzione"
pillar: progettare
pillarApplied: verificare
problem: "Un backend .NET con autenticazione gestita in casa: logica di sessione sparpagliata nel codice, niente standard per l'integrazione di nuovi client, e nessuna risposta chiara quando arrivava la domanda 'come gestiamo SSO o servizi terzi?'"
context: "Sistema applicativo già in produzione, con utenti reali. La migrazione doveva avvenire senza interrompere il servizio e senza forzare il logout di tutti gli utenti attivi. Il codice di autenticazione era cresciuto nel tempo senza un disegno coerente."
featured: false
tags: ["Keycloak", ".NET", "C#", "Docker", "PostgreSQL", "OAuth2"]
links:
  github: https://github.com/monte97/MockMart
  blog: /posts/keycloak/01-keycloak-intro/
weight: 80
actions:
  - "Mappatura del modello di autenticazione esistente per capire cosa Keycloak avrebbe sostituito e cosa no"
  - "Configurazione di Keycloak come identity provider con realm, client e mapper coerenti con il dominio"
  - "Migrazione del flusso applicativo a OAuth 2.0 / OpenID Connect, con strategia di rollout che preserva le sessioni attive"
  - "Documentazione del nuovo modello di permessi per il team — perché funzionasse anche dopo che me ne fossi andato"
result: "L'autenticazione è diventata un componente standardizzato e isolato dal resto della codebase. Aggiungere un nuovo client (mobile, partner, servizio interno) è ora una configurazione, non un progetto. Il team ha autonomia sui permessi senza dover toccare codice applicativo."
---

Progetto di adozione di Keycloak come identity provider su un backend .NET esistente. Ho gestito l'analisi dell'architettura di autenticazione, la migrazione a OAuth 2.0 e OpenID Connect, e l'integrazione completa con il flusso applicativo esistente.
