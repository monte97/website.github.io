---
name: add-blog-post
description: Use when the user asks to add, write, create, or publish a new blog article on montelli.dev — including drafts, bilingual posts, or articles belonging to a series.
---

# Add Blog Post

## Overview

Blog posts live in `src/content/posts/{pillar}/{categoria}/{slug}/` as folders. Each folder contains at least `index.md` (Italian, mandatory) and optionally `index.en.md` (English) and `hero.webp`.

## Frontmatter Schema

```yaml
---
title: "Titolo dell'articolo"
date: 2026-05-24T09:00:00.000Z    # ISO 8601, ora locale
description: "2-3 righe che descrivono il contenuto"
pillar: progettare | verificare | automatizzare   # o ometti per null
category: kafka                    # slug della categoria (vedi blog-labels.ts)
tags: [Kafka, Kubernetes]
lang: it                           # it per italiano, en per inglese
draft: true                        # sempre true per articoli nuovi
series: nome-serie                 # opzionale — chiave in series.ts
seriesOrder: 10                    # opzionale — multipli di 10
---
```

## Steps

### Articolo singolo

1. Crea la cartella: `src/content/posts/{pillar}/{categoria}/{slug}/`
   - Slug: lowercase, hyphens, in italiano (es. `prometheus-alerting-dal-rumore-al-segnale`)
2. Crea `index.md` con frontmatter + corpo
3. Se nuova categoria: aggiungi entry in `src/data/blog-labels.ts`
   ```typescript
   'nome-categoria': 'Label Display',
   ```
4. Se articolo in serie esistente: verifica che la chiave `series` esista in `src/data/series.ts`
   - Serie già esistente → procedi
   - Serie nuova → usa la skill `add-series` prima (crea metadati + landing page + stub). Se crei solo l'entry in `series.ts` senza landing page, la URL `/blog/{pillar}/{series-key}/` darà 404.
5. Verifica: `make build`
6. Commit: `git add src/content/posts/ src/data/ && git commit -m "feat(blog): aggiungi articolo su <tema>"`

### Versione inglese (opzionale)

Crea `index.en.md` nella stessa cartella con:
- `lang: en`
- Stessi `date`, `category`, `tags`, `series`, `seriesOrder`
- Titolo e description tradotti

## Valori validi

| Campo | Valori |
|-------|--------|
| `pillar` | `progettare` / `verificare` / `automatizzare` |
| `lang` | `it` / `en` |
| `draft` | `true` (nuovo) → `false` (pronto per publish) |
| `reviewed` | `false` / `'machine'` / `'human'` |

**Categorie esistenti** (da `blog-labels.ts`): `kafka`, `kubernetes`, `system-design`, `keycloak`, `observability`, `devops`, `docker`, `homelab`, `testing`, `web-development`, `devcontainer`, `openfga`, `vue`.

## Common Mistakes

| Errore | Fix |
|--------|-----|
| Creare file singolo invece di cartella | La struttura è sempre `slug/index.md`, non `slug.md` |
| Data senza orario | Formato corretto: `2026-05-24T09:00:00.000Z` |
| Nuova categoria non registrata | Aggiungi a `src/data/blog-labels.ts` |
| Serie inesistente in `series.ts` | Usa skill `add-series` prima di aggiungere l'articolo |
| Commit `feat:` invece di `feat(blog):` | Scope `blog` obbligatorio |
