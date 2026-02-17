# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hugo static site (montelli.dev) using **Toha theme v4** as a Hugo module. Bilingual (Italian default + English), deployed to GitHub Pages. Features blog, portfolio, notes.

## Build & Development Commands

All common operations are available via Makefile:

| Command | Description |
|---------|-------------|
| `make dev` | Dev server with live reload (includes drafts) |
| `make build` | Build with minification |
| `make build-prod` | Production build (gc + minify) |
| `make clean` | Remove `public/` |
| `make update-modules` | Update Hugo modules + npm deps + rebuild |
| `make new-post` | Interactive script to scaffold a new blog post |
| `make new-project` | Interactive script to scaffold a new project |
| `make new-note` | Interactive script to scaffold a new note |

Full Netlify-equivalent local build: `hugo mod tidy && hugo mod npm pack && npm install && hugo --gc --minify`

## Content Architecture

### Blog Post Organization

Posts live under `content/posts/` organized by **topic categories**:

```
content/posts/
├── kafka/                    # Series with umbrella _index.md
│   ├── _index.md             # Series landing page
│   ├── 01-intro/
│   │   ├── index.md          # Italian (default)
│   │   └── index.en.md       # English
│   └── pekko-streams-kafka/
├── kubernetes/               # Single posts (no _index.md needed)
│   └── article-ingress-k8s/
├── homelab-capi/             # Multi-part series
│   ├── _index.md
│   └── capi-part1-intro/
└── ...
```

**Key patterns:**
- **Single posts**: `content/posts/<category>/<slug>/index.md` (+ `index.en.md` for English)
- **Series**: Add `_index.md` at category level to create a sidebar parent, then individual posts use `parent: CATEGORY_ID` in frontmatter
- **Images**: Stored in `imgs/` subdirectory within each post directory
- **Pipeline reviews**: Some posts have `.pipeline/` subdirectories with review artifacts (gitignored)

### Frontmatter Structure

```yaml
---
title: "Titolo Descrittivo con Keyword"
date: 2025-07-30T21:30:00+02:00
description: Descrizione breve per SEO e preview social
menu:
  sidebar:
    name: Nome breve per sidebar
    identifier: slug-unico
    weight: 10
    parent: categoria-parent  # for series members
tags: ["Tag1", "Tag2"]
categories: ["Categoria1"]
reviewed: false
---
```

- `parent` in `menu.sidebar` links a post to its series `_index.md` identifier
- `weight` controls ordering within the sidebar
- `draft: true` hides from production builds (visible only with `make dev`)
- `reviewed: false` indicates the article has not yet passed the validation pipeline (`article-pipeline` skill). Set to `true` after successful review

### Site Data

`data/{it,en}/` contains YAML configs for non-blog content:
- `site.yaml` — site metadata, footer, OpenGraph
- `author.yaml` — profile information
- `sections/*.yaml` — homepage sections (about, skills, experiences, education, projects, etc.)

## Theme & Styling

- Theme: Toha v4, imported as Hugo module (`hugo.yaml` → `module.imports`)
- **Only modify `assets/styles/override.scss`** for CSS changes — never edit theme files directly
- After theme updates: run `hugo mod npm pack && npm install` to sync npm deps
- Theme updates automated via daily `theme-update.yml` workflow (creates PRs)

## Deployment

- **Production**: Push to `main` → `merge-to-main.yml` builds and deploys to `gh-pages` branch
- **PRs**: `pull-request.yml` runs build + Lighthouse checks
- **Netlify** (`netlify.toml`): Hugo 0.146.4, Node v23.11.0, deploy previews enabled for branches

## Key Configuration

- `hugo.yaml`: All site config — languages, features, taxonomies (tags, categories, technologies), theme params
- Raw HTML allowed in markdown (`markup.goldmark.renderer.unsafe: true`)
- Output formats: HTML, RSS, JSON (for client-side search)
- Taxonomies: `tags`, `categories`, `technologies`

## Important Notes

- Italian is the default language (`defaultContentLanguage: it`). Always create `index.md` first, then `index.en.md`
- Use `make new-post` to scaffold posts — it handles frontmatter and directory structure correctly
- The style guide at `.claude/rules/style-guide.md` defines tone, formatting, and structural conventions for blog articles
