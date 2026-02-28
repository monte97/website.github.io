# Design: Migrazione Hugo → Astro per montelli.dev

Data: 2026-02-28

## Contesto

Il sito montelli.dev usa Hugo + Toha v4 (tema modulo). La homepage è un CV interattivo che non riflette il posizionamento consulenziale P/V/A (Progettare, Verificare, Automatizzare). Il tema Toha vincola troppo il design: servono componenti custom, una homepage ripensata secondo org.md, e uno stile visivo definito in style.md.

Stato attuale: 52 post pubblicati, 22 draft, 13 categorie, bilingue IT/EN, deploy su GitHub Pages + Netlify preview.

## Decisioni

| Scelta | Decisione | Motivazione |
|--------|-----------|-------------|
| Framework | Astro 5.x (SSG) | Controllo totale sul design, Islands Architecture |
| UI islands | Vue 3 | Esperienza esistente, articoli nel blog |
| CSS | Tailwind CSS 4 | Utility-first, design tokens da style.md |
| Tema/UI kit | Nessuno | Libertà totale, il motivo della migrazione |
| Contenuti | Ristrutturazione completa | Allineamento ai pilastri P/V/A |
| i18n | File affiancati (index.md + index.en.md) | Come oggi, supportato da Content Collections |
| Deploy | GitHub Pages | Invariato, già configurato |
| Scope giorno 1 | Tutto | Homepage, blog, servizi, about, QR, search, dark mode, i18n |

## Stack tecnico

- **Astro 5.x** — Output statico
- **Vue 3** — Islands per ThemeToggle, SearchModal, MobileNav
- **Tailwind CSS 4** — Design tokens dalla palette style.md
- **Shiki** — Syntax highlighting (nativo Astro, tema custom ambra)
- **KaTeX** — Formule matematiche via remark plugin
- **Mermaid** — Diagrammi via remark plugin
- **Pagefind** — Search client-side, indice a build time
- **View Transitions API** — Transizioni di pagina native Astro

## Struttura directory

```
src/
├── components/
│   ├── layout/          # Header, Footer, Sidebar, MobileNav
│   ├── home/            # Hero, PillarCards, FeaturedProjects, FilteredPosts, AboutBrief, ContactSection
│   ├── blog/            # PostCard, PostList, TOC, SeriesNav, Pagination, TagList
│   ├── services/        # ServiceCard, CTABlock
│   ├── about/           # SkillGrid, Timeline, Publications
│   ├── ui/              # Button, Card, Badge, Icon (primitivi Tailwind)
│   └── interactive/     # ThemeToggle.vue, SearchModal.vue, MobileNav.vue
├── content/
│   ├── posts/
│   │   ├── progettare/
│   │   │   ├── kubernetes/
│   │   │   ├── system-design/
│   │   │   └── ...
│   │   ├── verificare/
│   │   │   ├── observability/
│   │   │   └── ...
│   │   ├── automatizzare/
│   │   │   ├── devops/
│   │   │   └── ...
│   │   └── altro/
│   ├── projects/
│   └── services/
├── layouts/
│   ├── BaseLayout.astro
│   ├── PageLayout.astro
│   ├── BlogPostLayout.astro
│   └── BlogListLayout.astro
├── pages/
│   ├── index.astro
│   ├── blog/
│   │   ├── index.astro
│   │   ├── [slug].astro
│   │   └── [...page].astro
│   ├── servizi/index.astro
│   ├── about/index.astro
│   ├── qr/index.astro
│   ├── en/              # Mirror inglese
│   └── 404.astro
├── styles/global.css
├── data/                # Skills, esperienze, istruzione (ex YAML → TS/JSON)
├── i18n/                # it.ts, en.ts — stringhe UI
└── utils/               # Date formatting, i18n helpers, content queries
```

## Content Collections — Schema

```typescript
// posts
{
  title: string
  date: Date
  description: string
  pillar: 'progettare' | 'verificare' | 'automatizzare' | null
  category: string
  tags: string[]
  lang: 'it' | 'en'
  draft: boolean
  reviewed: boolean | 'machine'
  series?: string
  seriesOrder?: number
  heroImage?: string
  reproducibility?: boolean
}

// projects
{
  title: string
  description: string
  pillar: 'progettare' | 'verificare' | 'automatizzare'
  featured: boolean       // true = appare in homepage
  tags: string[]
  links?: { github?: string, demo?: string, blog?: string }
  image?: string
  weight: number          // ordinamento
}

// services
{
  title: string
  description: string
  pillar: 'progettare' | 'verificare' | 'automatizzare' | 'tutti'
  icon: string
  cta: string
  weight: number
}
```

## Homepage — 6 sezioni (da org.md)

### 1. Hero (above the fold)

- Sfondo `#1E1E2E`, pattern griglia isometrica 3-5% opacità
- Headline: "Progetto, verifico e automatizzo sistemi software" — Inter Bold 2.5rem, `#E0DDD6`
- Sottotitolo: "Per team che crescono e non vogliono scricchiolare" — Inter Regular 1.25rem, `#8A8A96`
- CTA unica ambra `#E8973A`: "Inizia dal Health Check →"
- Niente foto, niente animazioni. `min-h-[80vh]`

### 2. I tre pilastri

- Grid 3 colonne (stack su mobile)
- Card con bordo sinistro 3px nel colore del pilastro:
  - Progettare: `#5B7FA5` — "Sistemi che reggono quando cresci."
  - Verificare: `#6B9B78` — "Vedi cosa succede. Proteggi quello che conta."
  - Automatizzare: `#9B7FB5` — "Togli l'errore umano dal loop."
- Icona SVG line-art sopra il titolo (outline 2px, monocromatica)
- Link "Scopri di più →" a /servizi

### 3. Progetti selezionati (max 4)

- Grid 2x2 (1 colonna su mobile)
- Solo progetti con `featured: true`:
  1. Observability-as-a-Service → Verificare
  2. Internal Developer Platform → Progettare + Automatizzare
  3. Order Processing Platform → Progettare
  4. Workshop Keycloak → Progettare
- Card: titolo, risultato concreto (1 riga), badge pilastro, link dettagli

### 4. Ultimi articoli

- 4-6 post recenti con `pillar != null` (esclude Vue.js, DevContainers)
- PostCard compatta: titolo, data, badge pilastro, descrizione troncata
- Link "Tutti gli articoli →"

### 5. Chi sono

- Sfondo alternato (sezione scura/chiara)
- Testo breve da org.md (4-5 righe)
- Link: "Più su di me →" (/about), "Scarica CV (PDF) →"
- Avatar piccolo (48-64px) opzionale

### 6. Contatto

- Email, LinkedIn, CTA Health Check (bottone ambra)
- Centrato, minimal, niente form

## Blog

### Lista (`/blog/`)

- Filtri per pilastro: 3 badge colorati + "Tutti"
- PostCard con bordo sinistro nel colore del pilastro
- Pagination: 12 post/pagina

### Post singolo (`/blog/[slug]/`)

- Layout 2 colonne: contenuto (70%) + TOC sticky (30%)
- TOC auto-generato da h2/h3
- Breadcrumb: Home > Blog > Pilastro > Titolo
- Metadata: data, badge pilastro, tags
- Serie: nav precedente/successivo + indice serie in sidebar
- Syntax highlighting Shiki: sfondo `#1E1E2E`, keyword ambra, stringhe verde salvia, commenti grigio
- Copy button su blocchi codice
- KaTeX, Mermaid
- Immagini lazy loading, WebP
- CTA "Ti è piaciuto?" + social sharing + link GitHub

### Serie

- Campo `series` + `seriesOrder` nel frontmatter
- Landing page automatica per serie
- Indice navigabile in sidebar del post

## Pagina Servizi (`/servizi/`)

- Hero: "Come posso aiutarti" + sottotitolo
- 4 sezioni, una per servizio:
  1. Health Check (tutti i pilastri)
  2. Architecture & System Design (Progettare)
  3. Observability & Security (Verificare)
  4. Pipeline & AI Automation (Automatizzare)
- Ogni sezione: icona, titolo, descrizione 3-5 righe, badge pilastro, CTA "Parliamone →"
- Form contatto in fondo (nome, email, messaggio) oppure redirect email

## Pagina About (`/about/`)

Tutto ciò che esce dalla homepage:

1. Bio estesa
2. Stack tecnologico — griglia icone con filtri (22 skill)
3. Esperienze lavorative — timeline (4 aziende)
4. Istruzione — timeline (3 entry)
5. Pubblicazioni accademiche
6. Progetti secondari (Real-time Analytics, Homelab, E2E Testing)
7. Link CV PDF

## QR Contact (`/qr/`)

Migrata 1:1: card centrata, foto ring, nome, ruolo, bottoni contatto.

## i18n

- File affiancati: `index.md` (IT) + `index.en.md` (EN) nella stessa cartella
- Campo `lang` nel frontmatter per distinguere
- Pagine mirror sotto `/en/`
- Stringhe UI: `src/i18n/it.ts` e `src/i18n/en.ts`
- Language switcher nel header (bandierine)
- Se un post non ha versione EN, il switcher non appare

## Dark mode

- Default: dark
- Toggle: Vue island `ThemeToggle.vue` nel header
- Persistenza: `localStorage` + `prefers-color-scheme` al primo accesso
- Tailwind `darkMode: 'class'` con classe `dark` su `<html>`
- Transizione: `transition-colors duration-200`

## Search

- **Pagefind**: indice generato a build time, ricerca client-side
- Vue island `SearchModal.vue`: modal, input, risultati live, navigazione keyboard
- Trigger: bottone lente nel header + `Cmd/Ctrl+K`

## Animazioni

- View Transitions API di Astro per transizioni tra pagine (fade)
- Fade-in on scroll per sezioni homepage (Intersection Observer, vanilla JS)
- Hover su card e bottoni (scale 1.02, shadow)
- Niente parallax, niente GSAP, niente animazioni pesanti

## Migrazione contenuti

### Mapping categorie → pilastri

| Categoria attuale | Pilastro |
|---|---|
| kubernetes, homelab-capi, patterns | progettare |
| otel-website-material, testing | verificare |
| devops-practices, homelab-n8n, docker-internals | automatizzare |
| kafka | progettare |
| keycloak | progettare |
| dotnet | progettare |
| web-development, devcontainer | null (altro) |

### Script di migrazione

Script automatico che:
1. Mappa le vecchie categorie ai nuovi pilastri
2. Converte il frontmatter al nuovo schema (aggiunge `pillar`, `lang`, `series`; rimuove `menu.sidebar`)
3. Sposta i file nella nuova struttura directory (`content/posts/<pilastro>/<categoria>/<slug>/`)
4. Converte i dati YAML (skills, esperienze, istruzione, progetti) in TS/JSON sotto `src/data/`

### Progetti

I 6 progetti attuali diventano entry nella collection `projects`. I 4 selezionati per homepage hanno `featured: true`.

## Deploy e CI/CD

### GitHub Actions

- `deploy.yml`: push su `main` → `npm run build` → deploy `gh-pages`
- `pr.yml`: build + Lighthouse su PR

### Netlify

- `netlify.toml` aggiornato: build command `npm run build`, publish `dist/`
- Deploy preview su branch/PR

### Performance target

- Lighthouse: 95+ su tutte le metriche
- Bundle JS: < 50KB (Islands — solo Vue islands idratati)
- First paint: < 1s

## Palette e design tokens (da style.md)

```
// tailwind.config — extend.colors
base-dark: '#1E1E2E'        // sfondo dark
base-light: '#F5F3EF'       // sfondo light
accent: '#E8973A'           // ambra — CTA, link, highlight
text-dark: '#2D2D3A'        // testo su chiaro
text-light: '#E0DDD6'       // testo su scuro
text-muted: '#8A8A96'       // didascalie, metadata
border: '#D4D1CA'           // bordi, separatori
pillar-progettare: '#5B7FA5' // blu ardesia
pillar-verificare: '#6B9B78' // verde salvia
pillar-automatizzare: '#9B7FB5' // lavanda calda
code-bg: '#1E1E2E'          // sfondo blocchi codice (sempre scuro)
code-inline-light: '#F0EDE6' // inline code su chiaro
code-inline-dark: '#2A2A3C'  // inline code su scuro
```

### Tipografia

- Titoli + body: Inter (variable weight, 400-700)
- Codice: JetBrains Mono
- Body: 1.05rem, line-height 1.7
- Max 70 caratteri per riga

## Fuori scope

- Newsletter/Mailchimp
- Sistema di commenti
- Analytics dashboard
- Form contatto con backend (valutare in futuro)
- Redesign logo (richiede designer)
