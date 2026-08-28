# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Astro static site (montelli.dev) with Vue islands for interactivity. Bilingual (Italian default + English with `/en/` prefix), deployed to GitHub Pages. Features blog, portfolio, services.

**Tech stack**: Astro 5, Vue 3, Tailwind CSS v4, Pagefind (search), Shiki (syntax highlighting), KaTeX (math).

## Build & Development Commands

| Command | Description |
|---------|-------------|
| `make dev` | Dev server with hot reload |
| `make build` | Production build + Pagefind search indexing |
| `make preview` | Preview production build locally |
| `make clean` | Remove `dist/` and `.astro/` |

Equivalent npm scripts: `npm run dev`, `npm run build` (includes postbuild Pagefind step), `npm run preview`.

## Architecture

### Routing & i18n

File-based routing in `src/pages/`. Italian is the default language (no URL prefix). English pages live under `src/pages/en/` and serve at `/en/...`.

### Content Collections (`src/content/`)

Three Astro content collections defined in `src/content.config.ts`:

- **posts** — Blog articles. Organized by pillar: `posts/progettare/`, `posts/verificare/`, `posts/automatizzare/`, `posts/altro/`. Each post is a directory with `index.md` (IT) and optionally `index.en.md` or `index-en.md` (EN). Hero images at `hero.webp` in each post directory.
- **projects** — Portfolio projects (`type: 'project' | 'workshop'`).
- **services** — Service offerings with pillar association.

### Key Frontmatter (posts)

```yaml
title: string
date: YYYY-MM-DD
description: string
pillar: progettare | verificare | automatizzare  # nullable
category: string           # topic group (kafka, kubernetes, etc.)
tags: [string]
lang: it | en              # default: it
draft: boolean             # default: false
series: string             # optional, groups related posts
```

### Three-Pillar System

Content is organized around three pillars: **progettare** (Design), **verificare** (Verify), **automatizzare** (Automate). Each pillar has:

- A color defined in `src/styles/global.css` (`--color-pillar-{name}`)
- Tailwind class mappings in `src/data/pillar-styles.ts`
- Labels in `src/data/pillars.ts`
- Dedicated blog filter routes (`/blog/progettare/`, etc.)

### Component Architecture

```
src/components/
├── about/       — About page sections (SkillGrid, Timeline)
├── blog/        — Blog components (BlogFilterable.vue, BlogListPage, PostCard, TOC, SeriesNav)
├── home/        — Homepage sections (Hero, PillarCards, FilteredPosts, StatsBar, ContactSection)
├── interactive/ — Client-side Vue islands (SearchModal, ThemeToggle)
├── layout/      — Header, Footer
└── ui/          — Reusable primitives (Badge, Button, Card, PageHero, SectionHeading)
```

**Layouts**: `BaseLayout.astro` (raw wrapper, used by home page), `PageLayout.astro` (adds `max-w-5xl` container), `BlogPostLayout.astro` (post-specific with TOC/series nav).

**Vue islands**: `BlogFilterable.vue` (client-side filtering/sidebar), `SearchModal.vue` (Pagefind), `ThemeToggle.vue`. Use `client:load` directive.

### Data Layer (`src/data/`)

TypeScript modules for structured site data:

| File | Content |
|------|---------|
| `author.ts` | Author name, bio (IT/EN) |
| `pillars.ts` | Pillar type, labels |
| `pillar-styles.ts` | Shared Tailwind class mappings for pillar colors |
| `blog-labels.ts` | Display labels for categories and series |
| `talks.ts` | Talks: event, date, abstract (IT/EN), links |
| `workshops.ts` | Workshops: goal, modules, published material |
| `series.ts` | Blog series metadata, for landings and nav |
| `signals.ts` | Home page signals |
| `qr-events.ts` | Per-event QR landing pages |

### Utilities (`src/utils/`)

`blog.ts` contains shared functions: `postHref()`, `estimateReadingTime()`, `getHeroImage()`.
`workshop.ts` resolves each workshop's published material from the posts collection.

## Styling

- **Tailwind CSS v4** via Vite plugin — no `tailwind.config` file, tokens defined in `src/styles/global.css` using `@theme`.
- Design tokens: warm editorial palette with accent orange (#E8973A), pillar-colored categories.
- Fonts: Inter (sans), JetBrains Mono (code).
- Dark mode: class-based toggle via ThemeToggle.vue.

## Deployment

- **Production**: Push to `main` → `.github/workflows/deploy.yml` builds and deploys to GitHub Pages.
- **PRs**: `.github/workflows/pr.yml` runs build to validate.
- **Netlify**: `netlify.toml` configured for deploy previews on branches.

## Conventions

- Italian is always created first, English second.
- **Italian first: the clients are Italian.** English exists and must keep
  working — the 64 blog posts are fully translated — but it gets no new
  investment. New pages are written in Italian; add an English version only
  where one already exists next to it, or when a real request arrives. The
  English index of a section says where the depth is instead of linking to a
  dead end (see `/en/workshop/`).
- `import.meta.glob` for hero images must stay in the consuming file (Vite static analysis). Pass the result to `getHeroImage()` from `@/utils/blog`.
- Path alias `@/` maps to `src/`.
- Blog post IDs follow the pattern `pillar/category/slug/index` (e.g., `progettare/kafka/01-intro/index`).
- Writing rules live in the vault: `_strategy/writing-rules/blog.md` (blog articles), `_strategy/writing-rules/case-study.md` (case studies), tone of voice in `_strategy/tone-of-voice.md`.
