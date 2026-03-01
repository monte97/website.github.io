# Code Quality Review — montelli.dev (Astro)

| Severity | Count |
|----------|-------|
| CRITICAL | 4 |
| WARNING  | 18 |
| INFO     | 12 |

---

## CRITICAL

### C1. Blog listing pages duplicati al 95% (4 file, ~530 righe)

`blog/[...page].astro`, `blog/progettare/[...page].astro`, `blog/verificare/[...page].astro`, `blog/automatizzare/[...page].astro` sono quasi identici. L'unica differenza e' il filtro pillar, il flag `active` nei badge, il titolo e il `currentPath`. Tutto il resto — template, paginazione, Pagefind script, griglia — e' copiato verbatim.

Inoltre `postHref()` e' duplicata in 6 file (4 listing + FilteredPosts + SeriesNav).

**Fix**: estrarre un componente `BlogListPage` che accetta `pillar`, `activePillar`, `title`, `description`. Estrarre `postHref` in `src/utils/blog.ts`.

### C2. `pillarLabels` definito in 6 posti con 3 shape diverse

- `PostCard.astro:23` — `Record<string, string>`, calcolato da `lang`
- `FeaturedProjects.astro:25` — `Record<string, string>`, calcolato da `lang`
- `BlogPostLayout.astro:48` — `Record<string, { it: string; en: string }>` (shape diversa)
- `en/services/index.astro:16` — `Record<string, string>`, solo EN
- `progetti/index.astro:9` — `Record<string, string>`, solo IT
- `progetti/[...slug].astro:20` — `Record<string, string>`, solo IT

**Fix**: creare `src/data/pillars.ts` con label i18n + colori. Unica fonte di verita'.

### C3. Web manifest con `name` e `short_name` vuoti, mai linkato

`public/site.webmanifest` ha `name: ""` e `short_name: ""`. Inoltre `BaseLayout.astro` non ha `<link rel="manifest">`. Il file e' completamente inutilizzato.

**Fix**: popolare name/short_name, aggiungere il link in BaseLayout.

### C4. `rel="noreferrer"` mancante su alcuni `target="_blank"`

Alcuni link esterni hanno `rel="noopener"` ma non `noreferrer` (PostCTA, Footer, ContactSection, BlogPostLayout). Altri file (about, qr) lo usano correttamente. Inconsistenza che leaka il Referer header.

**Fix**: standardizzare `rel="noopener noreferrer"` ovunque.

---

## WARNING

### W1. Dati definiti ma mai usati

| File | Campo inutilizzato |
|------|--------------------|
| `author.ts` | `summary` (5 stringhe EN mai renderizzate) |
| `author.ts` | `contactInfo` (email/github/linkedin hardcodati ovunque) |
| `skills.ts` | `skillFilters` (esportato, mai importato) |
| `education.ts` | `icon` (FontAwesome, mai renderizzato) |
| `experiences.ts` | `company.url`, `company.logo` (mai renderizzati in Timeline) |
| `publications.ts` | `categories`, `tags` (mai usati) |

### W2. `author.summary` in inglese su sito italiano

Residuo Hugo Toha: "I am a Developer", "I love servers". Inutilizzato e incoerente.

### W3. Bio duplicata in 3 file

Stessa bio in `about/index.astro`, `AboutBrief.astro`, `en/about/index.astro`. Dovrebbe stare in `author.ts`.

### W4. Link CV punta a file diversi

- `about/index.astro:98` → `/files/Francesco_Montelli_CV.pdf`
- `AboutBrief.astro:38` → `/files/cv-montelli.pdf`

Almeno uno dei due genera un 404.

### W5. Blog EN manca sidebar e search

`en/blog/[...page].astro` non ha `BlogSidebar` ne' Pagefind. Griglia diversa (3 colonne vs 2). Esperienza inconsistente.

### W6. Pagine pillar EN non esistono

I badge filtro nel blog EN linkano a `/en/blog/progettare/` ecc. ma le pagine non esistono → 404.

### W7. `SeriesNav` hardcoda `lang === 'it'`

`SeriesNav.astro:13` filtra solo post italiani. Post EN in serie mostrano navigazione vuota/sbagliata. Il componente non accetta `lang`.

### W8. `FilteredPosts` genera URL IT anche per homepage EN

`postHref()` in FilteredPosts genera sempre `/blog/...`, anche quando `lang === 'en'`. Il link "Tutti gli articoli" e' hardcodato a `/blog/`.

### W9. `FeaturedProjects` linka a pagine EN inesistenti

Genera `/en/progetti/...` ma non esistono pagine EN per i progetti → 404.

### W10. `navigator.platform` deprecato

`SearchModal.vue:49` usa `navigator.platform` (deprecato). Usare `navigator.userAgentData?.platform` con fallback.

### W11. `(window as any).PagefindUI` in 5 file

Bypass di TypeScript in 5 posti. Creare un file `.d.ts` con dichiarazione globale per PagefindUI.

### W12. Sidebar blog con link query param mai gestiti

`/blog/?cat=kafka` e `/blog/?series=kafka` non sono mai letti/gestiti dalla pagina listing. Link morti.

### W13. Homepage e QR senza `<main>`

`index.astro` e `qr/index.astro` non wrappano il contenuto in `<main>`. Problema a11y per screen reader.

### W14. TOC con titolo hardcodato in italiano

`TOC.astro:16` ha "Indice" fisso. Non accetta `lang`. Post EN mostrano titolo italiano.

### W15. Stile paginazione diverso tra IT ed EN

Hover effects diversi (border-accent vs bg-border/20) e opacita' diverse per lo stato disabled.

### W16. `<img>` senza lazy loading, width/height, ne' `<Image>` Astro

Hero.astro, about/index.astro, SkillGrid.astro, qr/index.astro: tutti usano `<img>` raw senza `loading="lazy"`, senza dimensioni esplicite (layout shift), senza ottimizzazione automatica.

### W17. Sezioni homepage senza `aria-label`

Hero, PillarCards, FilteredPosts, AboutBrief, ContactSection: nessun `aria-label` o `aria-labelledby`. Screen reader le annuncia come "region" generiche.

### W18. Separatori breadcrumb dentro `<li>`

`BlogPostLayout.astro:76`: i separatori "/" sono in `<li>`, letti come elementi lista dagli screen reader. Usare pseudo-elementi CSS o `<span aria-hidden="true">`.

---

## INFO

### I1. `Button.astro` usa `[key: string]: any`

Rest spread con `any` annulla la type safety. Usare `HTMLAttributes`.

### I2. Interfaccia `Heading` definita in 2 file

Stessa interfaccia in `BlogPostLayout.astro` e `TOC.astro`. Estrarre in file types condiviso.

### I3. Header EN linka a pagine inesistenti

`/en/progetti/` non esiste → 404.

### I4. Language switcher genera URL potenzialmente inesistenti

Per `/blog/kafka/01-intro/` genera `/en/blog/kafka/01-intro/` senza verificare se la versione EN esiste.

### I5. Codice migrazione tema restera' per sempre

`BaseLayout.astro:49-54`: check `theme-v2` in localStorage eseguito su ogni page load. Harmless ma inutile ormai.

### I6. Google Fonts via `<link>` esterno

Richiesta render-blocking a fonts.googleapis.com. Self-hosting con `@fontsource/inter` eliminerebbe la dipendenza esterna e migliorerebbe TTFB.

### I7. TOC `<nav>` senza `aria-label`

Pagina con 3 `<nav>` (header, breadcrumb, TOC) senza label distinguenti.

### I8. SearchModal sempre in italiano

`SearchModal.vue:82-84`: placeholder "Cerca nel blog..." hardcodato. Non accetta `lang`. Stessa cosa per Pagefind inline nelle listing pages.

### I9. Pagina 404 senza meta description

`PageLayout` passa `undefined` come description → tag meta con content vuoto.

### I10. QR page senza Footer

Intenzionale per il layout "linktree" ma inconsistente col resto del sito.

### I11. Nessun JSON-LD per i blog post

OG tags presenti, ma nessun structured data `BlogPosting`/`Article`. Limita i rich snippet nei risultati di ricerca.

### I12. `og:type` sempre "website", anche per i post

`BaseLayout.astro:27` hardcoda `og:type: "website"`. Per i blog post dovrebbe essere `"article"`.

---

## Priorita' di intervento

| Fase | Issue | Motivazione |
|------|-------|-------------|
| 1 | **C1 + C2** | Eliminare ~530 righe di duplicazione. Rendere aggiunta pillar un'operazione a singolo file |
| 2 | **W5-W9 + I3-I4** | Fix routing EN: link 404, URL hardcodati IT, lang mancante in componenti |
| 3 | **C3 + C4** | Web manifest + noreferrer. Quick fix |
| 4 | **W16 + I6** | Performance: lazy loading immagini, self-host font |
| 5 | **W1-W4** | Pulizia: dati morti, bio duplicata, CV link inconsistente |
| 6 | **W13 + W17 + W18 + I7** | Accessibilita': main landmark, aria-label, breadcrumb semantico |
| 7 | **W12 + I11 + I12** | SEO: sidebar funzionante, JSON-LD, og:type |
