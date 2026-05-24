---
name: add-case-study
description: Use when the user asks to add, create, or register a new case study, project, or workshop on montelli.dev — in the portfolio section at /progetti/.
---

# Add Case Study

## Overview

I progetti/case study vivono in `src/content/projects/` come **file singoli** (non cartelle). Se il file include `problem`, `context`, `actions`, `result` → viene renderizzato con il layout case study strutturato. Senza questi campi usa il layout legacy.

## Frontmatter Schema

```yaml
---
title: "Titolo del progetto"
description: "1-2 frasi per la preview nella listing"
type: project          # project (default) | workshop
pillar: automatizzare  # progettare | verificare | automatizzare
pillarApplied: automatizzare  # uguale a pillar
featured: false
tags: ["Kafka", "Kubernetes", "ArgoCD"]
weight: 50             # ordine in listing — vedi nota sotto
links:
  github: https://github.com/...   # opzionale
  demo: https://...                # opzionale
  blog: /blog/...                  # opzionale

# Campi case study (attivano layout strutturato)
problem: "Il problema che il cliente aveva prima dell'intervento"
context: "Contesto aziendale: team, vincoli, stack esistente"
actions:
  - "Prima azione concreta intrapresa"
  - "Seconda azione"
result: "Risultato misurabile ottenuto"
---
```

## Steps

1. Crea il file: `src/content/projects/{slug}.md`
   - Slug: lowercase, hyphens (es. `kafka-kubernetes-migration`)
2. Compila frontmatter — includi `problem`/`context`/`actions`/`result` per layout case study
3. **Weight**: per scegliere il valore, controlla i pesi esistenti:
   ```bash
   grep "weight:" src/content/projects/*.md | sort -t: -k3 -n
   ```
   Inserisci tra i valori esistenti lasciando gap di 5-10 punti.
4. Opzionale: aggiungi corpo markdown dopo il frontmatter per una descrizione extended
5. Verifica: `make build`
6. Commit: `git commit -m "feat(projects): aggiungi case study <NomeProgetto>"`

## `type: workshop` vs `type: project`

- `project` → URL `/progetti/{slug}/` — caso d'uso standard
- `workshop` → URL `/workshop/{slug}/` — per training e workshop formativi

## Common Mistakes

| Errore | Fix |
|--------|-----|
| Creare una cartella invece di un file singolo | I progetti sono file singoli, non cartelle come i post |
| `pillarApplied` diverso da `pillar` | Devono essere identici in quasi tutti i casi |
| `weight` scelto a caso | Fare grep sui pesi esistenti e inserirsi coerentemente |
| Omettere `problem`/`context` → layout legacy | Includere tutti e 4 i campi case study per il layout strutturato |
| Commit `feat:` invece di `feat(projects):` | Scope `projects` obbligatorio |
