# QR Event Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere sottopagine `/qr/<slug>` personalizzate per eventi, con card di contatto standard + titolo evento + lista variabile di link.

**Architecture:** Un data file TypeScript (`qr-events.ts`) definisce tipi e lista eventi. Una route dinamica Astro (`[event].astro`) legge i dati con `getStaticPaths()` e genera le pagine statiche. La `404.astro` esistente viene modificata con uno script inline per redirigere `/qr/*` non validi a `/qr/`.

**Tech Stack:** Astro 5 (SSG, `getStaticPaths`), TypeScript, Tailwind CSS v4.

---

## File Map

| File | Azione | Responsabilità |
|------|--------|----------------|
| `src/data/qr-events.ts` | Crea | Tipi `QrEventLink`, `QrEvent` + array `qrEvents` |
| `src/pages/qr/[event].astro` | Crea | Route dinamica: card contatto + sezione evento |
| `src/pages/404.astro` | Modifica | Script redirect `/qr/*` → `/qr/` |

---

## Task 1: Crea il data file `qr-events.ts`

**Files:**
- Create: `src/data/qr-events.ts`

- [ ] **Step 1: Crea il file con tipi e array vuoto**

```typescript
export type QrEventLink = {
  label: string;
  href: string;
};

export type QrEvent = {
  slug: string;
  title: string;
  links: QrEventLink[];
};

export const qrEvents: QrEvent[] = [];
```

- [ ] **Step 2: Verifica build**

```bash
make build
```

Atteso: build completata senza errori TypeScript.

- [ ] **Step 3: Commit**

```bash
git add src/data/qr-events.ts
git commit -m "feat(qr): add QrEvent types and empty events array"
```

---

## Task 2: Crea la route dinamica `[event].astro`

**Files:**
- Create: `src/pages/qr/[event].astro`

- [ ] **Step 1: Crea il file**

```astro
---
import BaseLayout from '@/layouts/BaseLayout.astro';
import Header from '@/components/layout/Header.astro';
import { qrEvents } from '@/data/qr-events';
import type { QrEvent } from '@/data/qr-events';

export function getStaticPaths() {
  return qrEvents.map((event) => ({
    params: { event: event.slug },
    props: event,
  }));
}

const { title, links }: QrEvent = Astro.props;
---

<BaseLayout title={title}>
  <Header lang="it" />
  <main class="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-sm rounded-2xl border border-border dark:border-border-dark bg-base-light dark:bg-base-dark/80 shadow-xl p-8 text-center">
      <div class="mx-auto mb-6 w-28 h-28 rounded-full p-[3px] bg-gradient-to-br from-accent to-accent-hover">
        <img
          src="/images/author/monte.webp"
          alt="Francesco Montelli"
          width="112"
          height="112"
          class="w-full h-full rounded-full object-cover border-2 border-base-light dark:border-base-dark"
        />
      </div>

      <h1 class="text-xl font-bold text-text-dark dark:text-text-light">Francesco Montelli</h1>
      <p class="text-text-muted text-sm mt-1 mb-8">Software Engineer & DevOps Consultant</p>

      <div class="flex flex-col gap-3">
        <a
          href="mailto:francesco@montelli.dev"
          class="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg bg-accent text-base-dark font-medium hover:bg-accent-hover transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          Email
        </a>
        <a
          href="https://linkedin.com/in/francesco-montelli"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
          style="background-color: #0077b5;"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          LinkedIn
        </a>
        <a
          href="https://github.com/monte97"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg border border-border dark:border-border-dark text-text-dark dark:text-text-light font-medium hover:bg-border/20 dark:hover:bg-border-dark/30 transition-colors"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
          GitHub
        </a>
        <a
          href="https://montelli.dev"
          class="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg border border-border dark:border-border-dark text-text-dark dark:text-text-light font-medium hover:bg-border/20 dark:hover:bg-border-dark/30 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
          montelli.dev
        </a>
      </div>

      <div class="mt-8">
        <div class="flex items-center gap-3 mb-6">
          <div class="flex-1 border-t border-border dark:border-border-dark"></div>
          <span class="text-text-muted text-sm font-medium">{title}</span>
          <div class="flex-1 border-t border-border dark:border-border-dark"></div>
        </div>
        <div class="flex flex-col gap-3">
          {links.map((link) => (
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg border border-border dark:border-border-dark text-text-dark dark:text-text-light font-medium hover:bg-border/20 dark:hover:bg-border-dark/30 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  </main>
</BaseLayout>
```

- [ ] **Step 2: Verifica build**

```bash
make build
```

Atteso: build completata, nessuna pagina `/qr/*` generata (array vuoto è corretto).

- [ ] **Step 3: Commit**

```bash
git add src/pages/qr/[event].astro
git commit -m "feat(qr): add dynamic event route [event].astro"
```

---

## Task 3: Modifica `404.astro` per redirect `/qr/*`

**Files:**
- Modify: `src/pages/404.astro`

- [ ] **Step 1: Aggiungi script redirect prima del tag `<PageLayout>`**

Il file attuale inizia con:
```astro
---
import PageLayout from '@/layouts/PageLayout.astro';
import Button from '@/components/ui/Button.astro';
---

<PageLayout title="Pagina non trovata">
```

Aggiungere `<script>` subito dopo il frontmatter (`---`), prima di `<PageLayout>`:

```astro
---
import PageLayout from '@/layouts/PageLayout.astro';
import Button from '@/components/ui/Button.astro';
---

<script>
  if (window.location.pathname.startsWith('/qr/')) {
    window.location.replace('/qr/');
  }
</script>

<PageLayout title="Pagina non trovata">
  <div class="flex flex-col items-center justify-center text-center py-20">
    <h1 class="text-8xl font-bold text-accent mb-6">404</h1>
    <p class="text-xl text-text-dark dark:text-text-light mb-2">
      Hai trovato un link rotto. Probabilmente colpa mia.
    </p>
    <p class="text-base text-text-muted mb-10">
      Looks like you hit a broken link. Probably my fault.
    </p>
    <div class="flex flex-wrap justify-center gap-3">
      <Button href="/" variant="primary">Homepage</Button>
      <Button href="/servizi/" variant="secondary">Servizi</Button>
      <Button href="/blog/" variant="secondary">Blog</Button>
    </div>
  </div>
</PageLayout>
```

- [ ] **Step 2: Verifica build**

```bash
make build
```

Atteso: build completata senza errori.

- [ ] **Step 3: Commit**

```bash
git add src/pages/404.astro
git commit -m "feat(qr): redirect unknown /qr/* paths to /qr/"
```

---

## Task 4: Aggiungi evento di esempio e smoke test

**Files:**
- Modify: `src/data/qr-events.ts`

- [ ] **Step 1: Aggiungi un evento di test all'array**

In `src/data/qr-events.ts`, sostituire l'array vuoto con:

```typescript
export const qrEvents: QrEvent[] = [
  {
    slug: 'test-event',
    title: 'Test Event 2026',
    links: [
      { label: 'Repo materiale', href: 'https://github.com/monte97' },
      { label: 'Articolo di approfondimento', href: 'https://montelli.dev/blog/' },
    ],
  },
];
```

- [ ] **Step 2: Verifica build**

```bash
make build
```

Atteso: build completata, nella cartella `dist/qr/test-event/` deve esistere un `index.html`.

```bash
ls dist/qr/
```

Atteso: directory `test-event/` presente.

- [ ] **Step 3: Avvia dev server e verifica visivamente**

```bash
make dev
```

Navigare a `http://localhost:4321/qr/test-event/` e verificare:
- Card con foto, nome, ruolo visibili
- Bottoni Email, LinkedIn, GitHub, montelli.dev presenti
- Separatore con testo "Test Event 2026"
- Due bottoni "Repo materiale" e "Articolo di approfondimento"

Navigare a `http://localhost:4321/qr/` e verificare che la pagina base sia invariata (nessuna sezione evento).

- [ ] **Step 4: Rimuovi l'evento di test e ripristina array vuoto**

In `src/data/qr-events.ts`:

```typescript
export const qrEvents: QrEvent[] = [];
```

- [ ] **Step 5: Verifica build finale**

```bash
make build
```

Atteso: build completata, nessuna directory in `dist/qr/` oltre all'`index.html` base.

- [ ] **Step 6: Commit**

```bash
git add src/data/qr-events.ts
git commit -m "chore(qr): restore empty events array after smoke test"
```
