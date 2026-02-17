---
title: "Keycloak Adoption su Backend .NET"
date: 2025-01-07
draft: true
description: "Adozione di Keycloak come identity provider per un backend .NET, dall'architettura all'implementazione completa"
menu:
  sidebar:
    name: Keycloak .NET Adoption
    identifier: keycloak-dotnet-adoption
    parent: projects
    weight: 80
technologies: ["Keycloak", ".NET", "C#", "Docker", "PostgreSQL", "OAuth2", "OpenID Connect"]
categories: ["Security", "Identity Management", "Backend"]
role: "Technical Lead & Implementer"
duration: "4 mesi"
team_size: "5-10 persone"
client_type: "PMI"
featured: false
related_posts: []
reviewed: false
---

## Overview

Progetto completo di adozione di Keycloak come identity provider per un'applicazione backend .NET. Ho gestito l'intero ciclo: analisi dei requisiti, design dell'architettura, implementazione, formazione del team e supporto post-rilascio.

L'applicazione partiva da un sistema di autenticazione custom non più adeguato alle esigenze di sicurezza e scalabilità. Keycloak ha permesso di centralizzare l'identity management, supportare SSO e integrare provider esterni.

## Stack Tecnologico

* **Keycloak** — identity and access management
* **.NET / C#** — backend application
* **OAuth2 / OpenID Connect** — protocolli di autenticazione
* **Docker** — containerizzazione Keycloak
* **PostgreSQL** — database Keycloak

## Architettura

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Client Applications                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Web App   │  │ Mobile App  │  │   Third-party Clients   │ │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘ │
└─────────┼────────────────┼──────────────────────┼───────────────┘
          │                │                      │
          ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Keycloak                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Realms    │  │    Users    │  │   Identity Providers    │ │
│  │   Clients   │  │   Roles     │  │   (Google, Azure AD)    │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ JWT Tokens
┌─────────────────────────────────────────────────────────────────┐
│                      .NET Backend                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Authentication Middleware (JWT Bearer)                  │   │
│  │  Authorization Policies (Role-based, Claims-based)       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Attività Svolte

Il progetto ha seguito un percorso strutturato, partendo dalle fondamenta teoriche fino all'implementazione di pattern avanzati, culminando in un workshop formativo per il team.

### Modulo 1: Fondamenta e Architettura

In questa fase abbiamo definito le basi per l'adozione di Keycloak.
* **Analisi dei Protocolli**: Studio di **OAuth 2.0** e **OpenID Connect (OIDC)** per definire il flusso di autenticazione e autorizzazione più adatto (Authorization Code Flow).
* **Design dell'Architettura**: Progettazione della struttura dei **Realm** per isolare gli ambienti (dev, staging, prod), configurazione dei **Client** per le diverse applicazioni (.NET backend, web app, mobile) e definizione dei **Ruoli** per un controllo degli accessi granulare.
* **Setup Production-Ready**: Deployment di Keycloak in ambiente containerizzato (Docker) con un database **PostgreSQL** esterno, configurato dietro un reverse proxy per la terminazione TLS.

### Modulo 2: Integrazione Backend .NET

Il cuore del progetto è stata l'integrazione con l'applicazione .NET.
* **Middleware di Autenticazione**: Implementazione di un middleware per l'autenticazione **JWT Bearer**. Questo include la validazione della firma del token contro il JWKS endpoint di Keycloak, e la verifica dei claim `iss` (issuer) e `aud` (audience).
* **Authorization Policies**: Creazione di policy di autorizzazione role-based e claims-based utilizzando `[Authorize(Roles = "admin")]` e policy personalizzate, mappando i ruoli e gli attributi del token all'identità dell'utente in .NET.
* **Libreria Interna**: Incapsulamento della logica di integrazione in una libreria .NET interna per facilitarne il riutilizzo in altri microservizi aziendali.

### Modulo 3: Autenticazione Federata e M2M

Abbiamo esteso l'architettura per supportare scenari di autenticazione complessi.
* **Identity Brokering**: Configurazione di Keycloak come **Identity Broker** per abilitare il Single Sign-On (SSO) con provider esterni come **Google** e **Azure AD**, gestendo il flusso di primo login e il mapping degli attributi.
* **User Federation**: Integrazione con una directory **LDAP** esistente per sincronizzare gli utenti aziendali, permettendo loro di autenticarsi con le credenziali corporate senza migrazione.
* **Autenticazione Machine-to-Machine (M2M)**: Implementazione del flusso **Client Credentials Grant** per permettere ai servizi backend di autenticarsi tra loro in modo sicuro, senza intervento umano.

### Modulo 4: Migrazione e Formazione

L'ultima fase ha riguardato il passaggio dal vecchio sistema e la condivisione delle conoscenze.
* **Migrazione Utenti**: Sviluppo di script per migrare gli utenti dal sistema legacy a Keycloak, gestendo la compatibilità degli hash delle password per una transizione trasparente.
* **Workshop Formativo**: Sessione di training completa per il team di sviluppo, coprendo i concetti di OIDC, la gestione di Keycloak e le best practice di sicurezza, basata su demo pratiche per ogni flusso implementato.

## Risultati

* **Standardizzazione e Sicurezza**: Sostituzione di un sistema custom con una soluzione standard, sicura e moderna basata su OIDC e OAuth 2.0.
* **Single Sign-On (SSO) Completo**: Abilitato SSO per gli utenti interni, partner esterni (via Azure AD) e clienti (via Google), centralizzando la gestione delle identità.
* **Architettura Scalabile e Manutenibile**: L'adozione di un IAM centrale ha semplificato l'architettura, ridotto la duplicazione di codice e preparato il sistema a future evoluzioni.
* **Team Autonomo**: Il team di sviluppo è ora in grado di gestire autonomamente la configurazione di Keycloak, integrare nuove applicazioni e risolvere problemi comuni.

## Articoli Correlati

*Nessun articolo correlato disponibile*
