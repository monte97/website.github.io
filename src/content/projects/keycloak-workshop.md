---
# DRAFT: bozza generata partendo da description + tags + corpo esistente. Da rivedere con dati reali.
title: "Workshop Keycloak: Identity Management"
description: "Serie di 10+ articoli su OAuth 2.0, OpenID Connect e architetture Zero Trust, con demo pratiche e repository di esempio"
type: workshop
pillar: progettare
pillarApplied: progettare
problem: "OAuth 2.0 e OpenID Connect spiegati nei tutorial sono spesso teoria pulita o copia-incolla del 'happy path'. Quando arriva il momento di adottarli su un sistema reale — con utenti vivi, integrazioni esistenti e vincoli operativi — la documentazione non basta più."
context: "Percorso formativo costruito come serie articoli + demo, pensato per chi deve prendere decisioni di identity management e non per chi sta studiando i protocolli su carta."
featured: true
tags: ["Keycloak", "OAuth2", "OpenID Connect", "LDAP", "Docker"]
links:
  blog: /posts/keycloak/01-keycloak-intro/
weight: 10
actions:
  - "I protocolli (OAuth 2.0, OIDC) spiegati in funzione delle decisioni che richiedono — non in funzione delle RFC"
  - "Configurazione di Keycloak come identity provider: realm, client, mapper, federazione LDAP"
  - "Architetture Zero Trust applicate: dove finisce la fiducia di rete, dove inizia quella per token"
  - "Demo eseguibili in Docker per ogni scenario, così che il partecipante possa rompere e ricostruire"
result: "Chi segue il percorso esce con la capacità di scegliere il flusso giusto per il proprio caso (web app vs SPA vs servizio backend) e di configurare Keycloak senza affidarsi a tutorial copia-incolla. Il repository di demo continua a essere usato come riferimento dopo il workshop."
---

Percorso formativo completo su Identity & Access Management moderno. Dalla teoria dei protocolli OAuth 2.0 e OpenID Connect fino all'implementazione di architetture Zero Trust con Keycloak. Ogni articolo include una demo funzionante e codice sorgente pubblico.
