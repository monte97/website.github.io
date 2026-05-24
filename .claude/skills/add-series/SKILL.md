---
name: add-series
description: Use when the user asks to add, create, or set up a new series of blog articles on montelli.dev — including the series metadata, landing page, and first draft article.
---

# Add Blog Series

## Overview

Una serie richiede 3 operazioni: aggiungere i metadati in `series.ts`, creare la landing page in `src/pages/blog/`, e creare il primo articolo stub. Tutte e 3 sono necessarie perché la landing page è una route statica Astro separata dalla lista articoli.

## Step 1 — Metadati in `src/data/series.ts`

Aggiungi una entry a `seriesMetadata`:

```typescript
'nome-serie-key': {
  title: 'Titolo esteso della serie',
  subtitle: 'Sottotitolo descrittivo — una riga',
  description: 'Paragrafo lungo (2-4 frasi) sul contenuto e il valore della serie.',
  level: 'Principiante' | 'Intermedio' | 'Avanzato',
  pillar: 'progettare' | 'verificare' | 'automatizzare',
  category: 'kafka',         // slug della cartella in content/posts/[pillar]/
  tags: ['Tag1', 'Tag2'],
  serviceHref: '/servizi/#observability-security',  // vedi tabella sotto
  serviceCTA: 'Vuoi implementare X nel tuo team?',
  serviceDescription: 'Frase su come posso aiutare.',
  learningGoals: [
    'Cosa il lettore imparerà — punto 1',
    'Punto 2',
    'Punto 3',
  ],
},
```

**serviceHref** per pillar:

| Servizio | Anchor |
|----------|--------|
| architecture.md | `/servizi/#architecture` |
| observability-security.md | `/servizi/#observability-security` |
| pipeline-automation.md | `/servizi/#pipeline-automation` |

## Step 2 — Landing page

Crea `src/pages/blog/{pillar}/{series-key}/index.astro` copiando dalla serie esistente più vicina:

```bash
cp src/pages/blog/verificare/observability/index.astro \
   src/pages/blog/{pillar}/{series-key}/index.astro
```

Poi modifica **solo** la riga della chiave serie (riga ~16):
```typescript
const series = 'nome-serie-key';  // ← cambia questa
```

Tutto il resto (query, rendering, CTA) funziona automaticamente tramite `seriesMetadata[series]`.

## Step 3 — Primo articolo stub

Crea `src/content/posts/{pillar}/{categoria}/{series-key}-01-{titolo}/index.md`:

```yaml
---
title: "Titolo del primo articolo"
date: 2026-05-24T09:00:00.000Z
description: "Descrizione breve"
pillar: progettare
category: kafka
tags: []
lang: it
draft: true
series: nome-serie-key
seriesOrder: 10
---
```

## Step 4 — Verifica e commit

```bash
make build
# Verifica che /blog/{pillar}/{series-key}/index.html esista in dist/

git add src/data/series.ts src/pages/blog/ src/content/posts/
git commit -m "feat(series): aggiungi serie <NomeSerie>"
```

## Common Mistakes

| Errore | Fix |
|--------|-----|
| Dimenticare la landing page | Senza `index.astro` la URL `/blog/{pillar}/{series-key}/` dà 404 |
| Landing page con `series` hardcoded sbagliato | Cambia solo `const series = '...'` sulla riga ~16 |
| `serviceHref` anchor sbagliato | Usa la tabella sopra — gli anchor sono i filename senza `.md` |
| `seriesOrder` non multiplo di 10 | Usa 10, 20, 30... per lasciare spazio a inserzioni future |
| Chiave serie con spazi o maiuscole | Deve essere kebab-case: `kafka-internals`, non `Kafka Internals` |
| Commit `feat:` invece di `feat(series):` | Scope `series` obbligatorio |
