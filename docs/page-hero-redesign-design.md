# Page Hero Redesign

**Date**: 2026-03-01
**Scope**: Tutte le pagine interne (Servizi, About, Blog) + modifica foto Home

## Obiettivo

Sostituire il pattern attuale (h1 + p muted) delle pagine interne con un mini-hero coerente con l'identita' visiva della home. Spostare l'health check in fondo alla pagina servizi.

## Decisioni

- **Approccio A**: un singolo componente `PageHero.astro` riutilizzabile
- **Livello**: mini-hero compatto (dots + accent gradient, piu' piccolo della home)
- **Contenuto**: titolo + sottotitolo + CTA opzionale + foto opzionale
- **Foto**: ring-4 ring-accent sia nella home che nell'about
- **Health check**: spostato dopo i servizi

## 1. Componente `PageHero.astro`

**Path**: `src/components/ui/PageHero.astro`

### Props

| Prop | Tipo | Required | Descrizione |
|------|------|----------|-------------|
| `title` | string | si | Headline principale |
| `subtitle` | string | no | Frase contestuale |
| `image` | `{ src: string, alt: string }` | no | Foto profilo |
| `cta` | `{ href: string, label: string }` | no | Bottone primario |
| `ctaSecondary` | `{ href: string, label: string }` | no | Bottone secondario |

### Struttura HTML

```
<section> (border-b, relative, overflow-hidden)
  <div> dot pattern background (opacity 0.04, dark: 0.07)
  <div> accent gradient blob (top-right)
  <div> content wrapper (max-w-5xl, px-5, pt-16 pb-12 md:pt-20 md:pb-16)
    <div> flex row (md:flex-row, md:items-center, md:gap-12)
      [se image] <div> foto con ring-4 ring-accent, rounded-2xl, w-28 h-28 md:w-32 md:h-32
      <div> testo
        <h1> titolo (text-3xl sm:text-4xl font-bold)
        <p> sottotitolo (text-text-muted text-lg)
        [se cta] <div> bottoni
```

### Sfondo (identico alla Home)

- Dot pattern: `<svg>` con pattern 32x32, circle r=1, opacity `0.04` light / `0.07` dark
- Gradient blob: `bg-accent/10 rounded-full blur-3xl` posizionato top-right

## 2. Contenuti per pagina

### Servizi (IT)

```
title: "Come posso aiutarti"
subtitle: "Aiuto team tecnici a costruire, monitorare e automatizzare sistemi software con metodo."
cta: { href: "#health-check", label: "Inizia dal Health Check" }
```

### Servizi (EN)

```
title: "How I can help"
subtitle: "I help technical teams build, monitor, and automate software systems with method."
cta: { href: "#health-check", label: "Start with a Health Check" }
```

### About (IT)

```
title: "Chi sono"
subtitle: "Backend Engineer & DevOps Consultant"
image: { src: "/images/author/monte.png", alt: "Francesco Montelli" }
cta: { href: "/files/Francesco_Montelli_CV.pdf", label: "Scarica CV" }
```

### About (EN)

```
title: "About me"
subtitle: "Backend Engineer & DevOps Consultant"
image: { src: "/images/author/monte.png", alt: "Francesco Montelli" }
cta: { href: "/files/Francesco_Montelli_CV.pdf", label: "Download CV" }
```

### Blog (IT)

```
title: "Blog"
subtitle: "Articoli su architettura software, DevOps, observability e security — {count} articoli"
```

### Blog (EN)

```
title: "Blog"
subtitle: "Articles on software architecture, DevOps, observability and security — {count} articles"
```

## 3. Modifica foto Home (`Hero.astro`)

- Rimuovere il div quadratino accent: `<div class="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-accent rounded-md">`
- Aggiungere sull'`<img>`: `ring-4 ring-accent`
- Mantenere: `rounded-2xl`, `shadow-lg`, dimensioni 28/36

## 4. Spostamento Health Check (pagina Servizi)

- Rimuovere la sezione health check dalla posizione attuale (dopo h1+p, prima dei servizi)
- Inserirla **dopo** il `<div class="space-y-8">` dei servizi
- Stile invariato: `bg-accent-subtle rounded-xl p-8`
- Aggiungere `mt-16` per separazione visiva

## 5. File da modificare

| File | Modifica |
|------|----------|
| `src/components/ui/PageHero.astro` | **NUOVO** — componente hero condiviso |
| `src/components/home/Hero.astro` | Foto: ring accent, rimuovere quadratino |
| `src/pages/servizi/index.astro` | Usare PageHero, spostare health check in fondo |
| `src/pages/about/index.astro` | Usare PageHero con foto, rimuovere bio section dal corpo |
| `src/pages/blog/[...page].astro` | Nessuna modifica diretta |
| `src/components/blog/BlogListPage.astro` | Usare PageHero al posto di h1+p |
| `src/pages/en/services/index.astro` | Stesse modifiche di servizi (testi EN) |
| `src/pages/en/about/index.astro` | Stesse modifiche di about (testi EN) |
| `src/pages/en/blog/[...page].astro` | Nessuna modifica diretta |
| `src/layouts/PageLayout.astro` | Nessuna modifica (il hero sta nelle pagine) |

## 6. Note

- Il `PageLayout.astro` resta invariato — il hero viene inserito come primo elemento dentro `<slot />`
- Le pagine About spostano la bio (testo lungo) dal hero a una sezione sotto, mantenendo solo nome+ruolo nel hero
- Il conteggio articoli nel blog viene calcolato in `BlogListPage.astro` e passato al subtitle
