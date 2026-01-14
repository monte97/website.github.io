---
title: "{{ replace .Name "-" " " | title }}"
date: {{ .Date }}
draft: true
description: ""
technologies: []
categories: []  # Event-Driven, Platform Engineering, Observability, Security, Testing, Cloud
role: ""        # Lead Architect, Tech Lead, Senior Developer, Platform Engineer, etc.
duration: ""    # es. "3 mesi"
team_size: ""   # es. "6 persone"
client_type: "" # Startup, Scale-up, Enterprise, Personal
featured: false
related_posts: []
---

## Overview

Breve introduzione al progetto: cosa fa, perché esiste, quale problema risolve.

## Contesto

| Attributo | Valore |
|-----------|--------|
| **Ruolo** | {{.Params.role}} |
| **Cliente** | {{.Params.client_type}} |
| **Durata** | {{.Params.duration}} |
| **Team** | {{.Params.team_size}} |

## Stack Tecnologico

* **Tecnologia 1** — ruolo nel progetto
* **Tecnologia 2** — ruolo nel progetto

## Sfide e Soluzioni

### Sfida 1: Titolo

Descrizione del problema e come è stato risolto.

### Sfida 2: Titolo

Descrizione del problema e come è stato risolto.

## Risultati

* **Metrica 1**: da X a Y (miglioramento Z%)
* **Metrica 2**: risultato ottenuto

## Articoli Correlati

* [Titolo articolo](/posts/slug-articolo/)
