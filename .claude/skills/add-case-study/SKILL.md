---
name: add-case-study
description: Use when the user asks to add, create, or register a new case study, project, or workshop on montelli.dev — in /case-study/, /progetti/ or /workshop/.
---

# Add Case Study

## Overview

La collection `projects` (`src/content/projects/`) contiene **tre tipi che convivono**, scelti con il campo `type`:

| `type` | Rotta | Uso |
|--------|-------|-----|
| `project` (default) | `/progetti/{slug}/` | Portfolio standard |
| `workshop` | `/workshop/{slug}/` | Training e workshop formativi |
| `case-study` | `/case-study/{slug}/` | Documento di analisi tecnica lungo |

Le rotte case study sono generate solo per le entry con `type: 'case-study'`
(`src/pages/case-study/[...slug].astro` filtra la collection): senza quel campo la
entry non compare in `/case-study/`.

I file sono **singoli** (mai cartelle, diversamente dai post):
`src/content/projects/{slug}.md`, slug lowercase con trattini.

**Regole di canale**: un case study è una *storia che vende*, non un tutorial.
Prima di scrivere il corpo leggere `_strategy/writing-rules/case-study.md` del vault
(`/Users/monte97/Documents/1_AETE/0_Content/`), più `../tone-of-voice.md` per il tono
e `writing-rules/blog.md` per formattazione e frontmatter del sito.

**Anonimizzazione**: ogni case study derivato da lavoro per un cliente deve avere
il campo `anonimizzazione` compilato — dichiara cosa è stato omesso e perché. Mai
nomi di committenti, fornitori, prodotti, modelli, indirizzi o host.

## Frontmatter Schema

```yaml
---
# --- Base (tutti i tipi) ---
title: "Titolo"
description: "1-2 frasi per la preview nella listing"
type: case-study       # project (default) | workshop | case-study
pillar: verificare     # progettare | verificare | automatizzare
pillarApplied: verificare
featured: false
tags: [Osservabilità, Sistemi a eventi]
weight: 50             # ordine in listing — vedi sotto
links:                 # opzionali
  github: https://github.com/...
  demo: https://...
  blog: /blog/...
image: /img/...        # opzionale

# --- Campi documentali (type: case-study) ---
eyebrow: "Case study · osservabilità di un sistema a eventi"  # sopra il titolo
oggetto: >
  Cosa è stato analizzato.
metodo: >
  Come si è proceduto.
anonimizzazione: >
  Cosa è stato omesso e perché (obbligatorio se derivato da lavoro cliente).
thesis: "La tesi in una riga; chiude la pagina."
sections:              # indice del documento, specchia gli H2 del corpo
  - n: "01"
    title: "Il quadro"
    summary: "Da dove nascono i segnali"   # opzionale
readingPaths:          # opzionale: "Per decidere" / "Per valutare"
  - label: "Per decidere"
    desc: "Leggi 02 e 05."
readingNote: "Come leggere il documento."    # opzionale

# --- Blocchi (type: case-study, tutti opzionali) ---
specs:                 # griglia Feature/Stack/Perimetro/Dati/Fuori scope
  - label: "Tracce del percorso del dato"
    value: "Dai servizi JVM e dalle API"
    note: "Domanda a cui risponde"           # opzionale
decisions:             # bivio: alternativa scartata contro quella scelta
  - title: "Il bivio, in due parole"
    chosen: "Cosa è stato fatto"
    chosenWhy: "Perché"                      # opzionale
    rejected: "Cosa era stato previsto"
    appeal: "Perché era tentante"            # opzionale
    why: "Il criterio"                       # opzionale
decisionsNote: "Il filo che tiene insieme i bivi."
flow:                  # percorso del dato come catena di nodi
  label: "Percorso del dato"
  caption: "..."         # opzionale
  nodes:
    - kind: "JVM · Scala"                  # etichetta mono, opzionale
      name: "Servizio di normalizzazione"
      desc: "Cosa fa"                      # opzionale
      key: true                            # nodo chiave, default false
      edge: "topic standardized"           # testo sulla freccia al nodo successivo
matrix:                # matrice di copertura, caselle vuote in evidenza
  columns: ["Colonna A", "Colonna B"]
  rows:
    - label: "Riga"
      note: "..."                          # opzionale
      cells: [full, partial, empty]        # una cella per colonna
  legend: { full: "...", partial: "...", empty: "..." }   # opzionale
  caption: "..."                           # opzionale
swap:                  # disallineamento ordine chiesto/ricevuto
  requestedLabel: "Chiesto"                # opzionale
  receivedLabel: "Ricevuto"                # opzionale
  requested: ["A", "B", "C"]               # ordine richiesto
  order: [2, 0, 1]                         # indici in posizione ricevuta
shots:                 # schermate reali
  - src: "/img/case-study/<slug>/nome.png"
    caption: "Cosa mostra e perché conta"
shotsNote: "Nota sulle schermate."         # opzionale
openItems:             # "Cosa resta aperto", confini dichiarati
  - "Pianificato, non ancora in esercizio"
---

## 01 · Il quadro

Il corpo markdown contiene le sezioni dichiarate in `sections`.
```

I campi `problem`/`context`/`actions`/`result` restano nello schema ma appartengono
al layout strutturato legacy dei `project`: non usarli per un `case-study`.

## Steps

1. Crea il file: `src/content/projects/{slug}.md`
2. Imposta `type: case-study` e compila i campi documentali; se deriva da lavoro
   cliente compila `anonimizzazione`
3. **Weight**: controlla i pesi esistenti e inserisciti tra loro:
   ```bash
   grep "weight:" src/content/projects/*.md | sort -t: -k3 -n
   ```
   Lascia gap di 5-10 punti.
4. Scrivi il corpo seguendo `sections` e le regole di canale del vault
5. Verifica: `make build`
6. Commit: `git commit -m "feat(projects): aggiungi case study <NomeProgetto>"`

## Common Mistakes

| Errore | Fix |
|--------|-----|
| Creare una cartella invece di un file singolo | I progetti sono file singoli, non cartelle come i post |
| Dimenticare `type: case-study` | Senza il tipo la entry resta in `/progetti/` e non compare in `/case-study/` |
| Mancare `anonimizzazione` su materiale cliente | Campo obbligatorio per case study derivati da lavoro per clienti |
| Nominare committente/fornitore/prodotti | Servizi indicati per ruolo, mai per nome |
| Usare `problem`/`context`/`actions`/`result` in un case study | Sono del layout legacy dei `project` |
| `pillarApplied` diverso da `pillar` | Devono essere identici in quasi tutti i casi |
| `weight` scelto a caso | Fare grep sui pesi esistenti e inserirsi coerentemente |
| Corpo che ignora le regole di canale | Leggere `_strategy/writing-rules/case-study.md` nel vault prima di scrivere |
| Commit `feat:` invece di `feat(projects):` | Scope `projects` obbligatorio |
