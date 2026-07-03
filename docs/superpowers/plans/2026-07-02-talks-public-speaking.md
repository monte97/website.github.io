# Public Speaking — pagina /talks + teaser About — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere una pagina `/talks` (IT+EN) fuori dal menu, con i talk tenuti (foto + link repo/LinkedIn/conferenza) e quelli in arrivo, più un teaser "Conferenze & Speaking" su About che la linka.

**Architecture:** Un modulo dati `src/data/talks.ts` (array tipizzato, niente content collection), un componente pagina `TalksPage.astro` che lo consuma e risolve le foto via `import.meta.glob`, due route sottili (`/talks`, `/en/talks`) fuori dal nav (pattern `/progetti`), e una sezione teaser in `AboutPage.astro`.

**Tech Stack:** Astro 5, Tailwind v4, TypeScript. Immagini ottimizzate da Astro (`src/assets/talks/*.webp`). Verifica: `npm run build`.

## Global Constraints

- La pagina NON va aggiunta a `src/components/layout/Header.astro` (fuori dal nav, come `/progetti`).
- In pagina solo talk `status: 'delivered'` e `status: 'upcoming'`. Niente proposte non accettate.
- Solo virgolette dritte ASCII come delimitatori JS/JSX; NESSUNA curva `‘ ’ “ ”` nel codice.
- Nessun trattino lungo (—) nella copy visibile.
- IT prima, EN dopo; ogni stringa esiste in entrambe le lingue. `title`/`event`/`location`/`date` non tradotti; solo `abstract` è `{ it, en }`.
- Path alias `@/` = `src/`.
- Label sezione: "Conferenze & Speaking".

## Dati reali (raccolti dall'utente PRIMA del Task 1)

Il controller raccoglie dall'utente, per ciascuno dei 3 talk (2 `delivered` + 1 `upcoming`): `title`, `event`, `date` (ISO), `location`, `abstract` IT+EN (1-2 righe), e i link disponibili (`repo`, `slides`, `linkedin`, `conference`, `recording`). Per i 2 tenuti: il file foto `src/assets/talks/<slug>.webp` (se disponibile). Lo `slug` lo deriva il controller (kebab-case del titolo o dell'evento).

---

### Task 1: Modulo dati `src/data/talks.ts`

**Files:**
- Create: `src/data/talks.ts`

**Interfaces:**
- Produces: `type Talk`, `type TalkLink`, `const talks: Talk[]`. Consumati da `TalksPage.astro` (Task 2).

- [ ] **Step 1: Creare `src/data/talks.ts` con i tipi e l'array popolato coi dati reali**

Struttura esatta dei tipi (l'array `talks` va popolato coi dati reali forniti dall'utente; sotto una entry di ESEMPIO che mostra il formato — sostituire con i talk veri, uno per talk):

```ts
export type TalkLink = {
  repo?: string;
  slides?: string;
  linkedin?: string;
  conference?: string;
  recording?: string;
};

export type Talk = {
  slug: string;
  title: string;
  event: string;
  date: string; // ISO, es. "2026-06-18"
  location: string;
  status: 'delivered' | 'upcoming';
  abstract: { it: string; en: string };
  links?: TalkLink;
};

export const talks: Talk[] = [
  // ESEMPIO di formato (sostituire con i 2 delivered + 1 upcoming reali):
  {
    slug: 'esempio-slug',
    title: 'Titolo del talk',
    event: 'Nome Conferenza 2026',
    date: '2026-06-18',
    location: 'Reggio Emilia, IT',
    status: 'delivered',
    abstract: {
      it: 'Una o due righe che descrivono il talk.',
      en: 'One or two lines describing the talk.',
    },
    links: {
      repo: 'https://github.com/monte97/...',
      linkedin: 'https://www.linkedin.com/posts/...',
      conference: 'https://...',
    },
  },
];
```

- [ ] **Step 2: Verificare che il file compili e sia type-safe**

Run: `cd /Users/monte97/Documents/1_AETE/0_Content/website.github.io && npx astro check --minimumSeverity error 2>&1 | tail -15`
Expected: nessun errore relativo a `src/data/talks.ts` (eventuali errori "Cannot find module '@/data/talks'" da TalksPage non esistono ancora — questo file è isolato). Nessun errore di sintassi/tipo nell'array.

- [ ] **Step 3: Commit**

```bash
git add src/data/talks.ts
git commit -m "feat(talks): modulo dati talks.ts (tipi + talk reali)"
```

---

### Task 2: Componente `TalksPage.astro` + route IT/EN + foto

**Files:**
- Create: `src/components/pages/TalksPage.astro`
- Create: `src/pages/talks/index.astro`
- Create: `src/pages/en/talks/index.astro`
- (Content) Immagini: `src/assets/talks/<slug>.webp` per i talk delivered che hanno una foto

**Interfaces:**
- Consumes: `talks`, `type Talk` da `@/data/talks` (Task 1); `PageLayout` da `@/layouts/PageLayout.astro`.
- Produces: rotte `/talks` e `/en/talks`.

- [ ] **Step 1: Creare `src/components/pages/TalksPage.astro`**

```astro
---
import PageLayout from '@/layouts/PageLayout.astro';
import { talks } from '@/data/talks';

interface Props {
  lang?: 'it' | 'en';
}

const { lang = 'it' } = Astro.props;

// Foto talk: glob eager su src/assets, risolto per slug. import.meta.glob deve
// stare nel file consumante (static analysis di Vite).
const talkImages = import.meta.glob<{ default: { src: string } }>(
  '/src/assets/talks/*.webp',
  { eager: true },
);
const imageFor = (slug: string): string | null =>
  talkImages[`/src/assets/talks/${slug}.webp`]?.default?.src ?? null;

const upcoming = talks
  .filter((tk) => tk.status === 'upcoming')
  .sort((a, b) => a.date.localeCompare(b.date));
const past = talks
  .filter((tk) => tk.status === 'delivered')
  .sort((a, b) => b.date.localeCompare(a.date));

const locale = lang === 'en' ? 'en-US' : 'it-IT';
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(locale, { year: 'numeric', month: 'long' });

const t = lang === 'en'
  ? {
      pageTitle: 'Talks',
      pageDesc: 'Conferences and talks by Francesco Montelli: slides, material and recordings.',
      heroTitle: 'Conferences & Speaking',
      heroSubtitle: 'What I write about on the blog, I also bring to the stage: where I speak, on what, and to whom.',
      upcomingTitle: 'Upcoming',
      pastTitle: 'Past talks',
      linkRepo: 'Slides & material',
      linkSlides: 'Slides',
      linkRecording: 'Recording',
      linkLinkedin: 'LinkedIn',
      linkConference: 'Conference',
    }
  : {
      pageTitle: 'Talks',
      pageDesc: 'Conferenze e talk di Francesco Montelli: slide, materiale e registrazioni.',
      heroTitle: 'Conferenze & Speaking',
      heroSubtitle: 'Quello che scrivo sul blog lo porto anche sul palco: dove parlo, di cosa, e a chi.',
      upcomingTitle: 'Prossimi',
      pastTitle: 'Talk passati',
      linkRepo: 'Slide e materiale',
      linkSlides: 'Slide',
      linkRecording: 'Registrazione',
      linkLinkedin: 'LinkedIn',
      linkConference: 'Conferenza',
    };

type LinkKey = 'repo' | 'slides' | 'recording' | 'linkedin' | 'conference';
const linkOrder: LinkKey[] = ['repo', 'slides', 'recording', 'linkedin', 'conference'];
const linkLabel: Record<LinkKey, string> = {
  repo: t.linkRepo,
  slides: t.linkSlides,
  recording: t.linkRecording,
  linkedin: t.linkLinkedin,
  conference: t.linkConference,
};
---

<PageLayout title={t.pageTitle} description={t.pageDesc} ogImage="/og/about.webp" lang={lang}>
  <header class="mb-12 fade-in-section">
    <h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-text-dark dark:text-text-light">
      {t.heroTitle}
    </h1>
    <p class="mt-3 text-base md:text-lg text-text-muted max-w-2xl leading-relaxed">
      {t.heroSubtitle}
    </p>
  </header>

  {upcoming.length > 0 && (
    <section class="mb-16 fade-in-section">
      <h2 class="text-xs font-semibold uppercase tracking-wide text-accent mb-4">{t.upcomingTitle}</h2>
      <div class="space-y-4">
        {upcoming.map((talk) => (
          <div class="rounded-xl border border-accent/30 bg-accent/5 p-6">
            <p class="text-sm text-accent font-semibold">{talk.event} · {fmtDate(talk.date)} · {talk.location}</p>
            <h3 class="text-xl font-bold text-text-dark dark:text-text-light mt-1">{talk.title}</h3>
            <p class="text-text-muted mt-2 leading-relaxed">{talk.abstract[lang]}</p>
            {talk.links?.conference && (
              <a href={talk.links.conference} target="_blank" rel="noopener noreferrer" class="inline-block mt-3 text-sm text-accent hover:underline">{t.linkConference} &rarr;</a>
            )}
          </div>
        ))}
      </div>
    </section>
  )}

  {past.length > 0 && (
    <section class="mb-16 fade-in-section">
      <h2 class="text-xs font-semibold uppercase tracking-wide text-text-muted mb-4">{t.pastTitle}</h2>
      <div class="space-y-8">
        {past.map((talk) => {
          const img = imageFor(talk.slug);
          return (
            <article class="rounded-xl border border-border/60 dark:border-border-dark/60 bg-white dark:bg-surface-dark overflow-hidden md:flex">
              {img && (
                <img src={img} alt={talk.title} class="w-full h-48 md:h-auto md:w-64 object-cover shrink-0" loading="lazy" />
              )}
              <div class="p-6 flex-1">
                <p class="text-sm text-text-muted">{talk.event} · {fmtDate(talk.date)} · {talk.location}</p>
                <h3 class="text-xl font-bold text-text-dark dark:text-text-light mt-1">{talk.title}</h3>
                <p class="text-text-muted mt-2 leading-relaxed">{talk.abstract[lang]}</p>
                <div class="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                  {linkOrder.map((key) => (
                    talk.links?.[key] && (
                      <a href={talk.links[key]} target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">{linkLabel[key]} &rarr;</a>
                    )
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  )}
</PageLayout>
```

- [ ] **Step 2: Creare le route**

`src/pages/talks/index.astro`:
```astro
---
import TalksPage from '@/components/pages/TalksPage.astro';
---

<TalksPage lang="it" />
```

`src/pages/en/talks/index.astro`:
```astro
---
import TalksPage from '@/components/pages/TalksPage.astro';
---

<TalksPage lang="en" />
```

- [ ] **Step 3: Collocare le foto reali** (per i delivered che ne hanno una)

Mettere ogni foto in `src/assets/talks/<slug>.webp` usando lo stesso `slug` del talk in `talks.ts`. Se un talk non ha foto, non creare il file: la card cade sul layout senza immagine (nessun placeholder).

- [ ] **Step 4: Build**

Run: `cd /Users/monte97/Documents/1_AETE/0_Content/website.github.io && npm run build 2>&1 | tail -12`
Expected: exit 0.

- [ ] **Step 5: Verificare rendering e assenza dal nav**

```bash
cd /Users/monte97/Documents/1_AETE/0_Content/website.github.io
grep -qF "Conferenze &amp; Speaking" dist/talks/index.html && echo OK-it || echo KO-it
grep -qF "Conferences &amp; Speaking" dist/en/talks/index.html && echo OK-en || echo KO-en
# fuori dal nav (Header non deve linkare /talks):
grep -qiE "href=\"/talks|href=\"/en/talks" dist/index.html && echo "KO: /talks nel nav" || echo "OK: /talks fuori nav"
# niente curly quotes nel componente:
grep -c $'‘' src/components/pages/TalksPage.astro
```
Expected: `OK-it`, `OK-en`, `OK: /talks fuori nav`, curly count `0`. (Nota: `&` viene reso come `&amp;` nell'HTML — la grep sopra ne tiene conto.)

- [ ] **Step 6: Commit**

```bash
git add src/components/pages/TalksPage.astro src/pages/talks/index.astro src/pages/en/talks/index.astro src/assets/talks/
git commit -m "feat(talks): pagina /talks (IT+EN) fuori-nav con blocchi prossimi/passati"
```

---

### Task 3: Teaser "Conferenze & Speaking" su About

**Files:**
- Modify: `src/components/pages/AboutPage.astro`

**Interfaces:**
- Consumes: `prefix` (già definito in AboutPage), `SectionHeading`, `Button` (già importati).

- [ ] **Step 1: Aggiungere le chiavi `t` (in ENTRAMBI i blocchi `t` IT ed EN)**

EN block:
```js
      talksTitle: 'Conferences & speaking',
      talksBody: 'What I write about on the blog, I also bring to the stage. I am starting to speak at conferences on design, testing and automation.',
      talksCta: 'See all talks',
```
IT block:
```js
      talksTitle: 'Conferenze & speaking',
      talksBody: 'Quello che scrivo sul blog lo porto anche sul palco. Ho iniziato a parlare alle conferenze di progettazione, testing e automazione.',
      talksCta: 'Vedi tutti i talk',
```

- [ ] **Step 2: Inserire la sezione teaser nel markup**, subito dopo la sezione "Il blog come estensione del metodo" (il `<section>` che contiene `{t.blogTitle}`) e PRIMA della "CTA finale":

```astro
  {/* Teaser talk */}
  <section class="mb-20 fade-in-section">
    <SectionHeading title={t.talksTitle} />
    <p class="text-text-muted text-lg leading-relaxed max-w-3xl mb-6">
      {t.talksBody}
    </p>
    <Button href={`${prefix}/talks/`} variant="secondary" size="md">
      {t.talksCta} &rarr;
    </Button>
  </section>
```

- [ ] **Step 3: Build + verifica link**

```bash
cd /Users/monte97/Documents/1_AETE/0_Content/website.github.io
npm run build 2>&1 | tail -6
grep -qF 'href="/talks/"' dist/about/index.html && echo OK-teaser-it || echo KO
grep -qF 'href="/en/talks/"' dist/en/about/index.html && echo OK-teaser-en || echo KO
grep -c $'‘' src/components/pages/AboutPage.astro
```
Expected: build exit 0; `OK-teaser-it`, `OK-teaser-en`; curly count `0`.

- [ ] **Step 4: Commit**

```bash
git add src/components/pages/AboutPage.astro
git commit -m "feat(about): teaser Conferenze & Speaking con link a /talks"
```

---

### Task 4: Accettazione finale

**Files:** nessuna modifica (checklist).

- [ ] **Step 1: Build pulito + rendering completo**

```bash
cd /Users/monte97/Documents/1_AETE/0_Content/website.github.io
rm -rf dist .astro && npm run build 2>&1 | tail -6
echo "-- talk passati con link:"; grep -oE "Slide e materiale|Registrazione|LinkedIn|Conferenza" dist/talks/index.html | sort -u
echo "-- blocco prossimi presente se c'è un upcoming:"; grep -c "Prossimi" dist/talks/index.html
echo "-- em-dash visibili nel corpo /talks (atteso 0):"; grep -oE ".{15}—.{15}" dist/talks/index.html | grep -vcE "<!--|loaded async|Umami|Theme init|Google Fonts|Pagefind"
```
Expected: build exit 0; i link dei talk passati compaiono; il conteggio "em-dash visibili" è 0.

- [ ] **Step 2: Revisione visiva** (`npx astro preview`, aprire `/talks/`, `/en/talks/`, `/about/`):
  - Prossimi in alto (se presente), Passati sotto con foto+link.
  - Nessuna foto rotta (i talk senza immagine cadono sul layout senza foto).
  - Il teaser su About linka a `/talks`.
  - `/talks` NON compare nel menu header.

---

## Self-Review (compilata dall'autore del piano)

**Spec coverage:**
- §2 pagina fuori-nav → Task 2 (route + Global Constraint: no Header) + Task 4 Step verifica nav. ✓
- §3 solo delivered+upcoming, separati → Task 2 (filtri + due blocchi). ✓
- §4 data model `talks.ts` senza pillar → Task 1. ✓
- §5 immagini `src/assets/talks/<slug>.webp` via import.meta.glob, opzionali → Task 2 Step 1/3. ✓
- §6 layout Prossimi/Passati + link → Task 2. ✓
- §7 teaser About → Task 3. ✓
- §8 routing/file → Task 2. ✓
- IT/EN, no trattini, no curly → Global Constraints + verifiche per task. ✓

**Placeholder scan:** l'unica "esempio" è la entry di formato in `talks.ts` Task 1, esplicitamente da sostituire coi dati reali raccolti dall'utente (contenuto, non placeholder di codice). Nessun TODO/TBD nel codice.

**Type consistency:** `Talk`/`TalkLink` definiti in Task 1, consumati in Task 2 (`talks`, `talk.status`, `talk.abstract[lang]`, `talk.links?.[key]`, `talk.slug`). `LinkKey` ⊂ chiavi di `TalkLink`. Coerente. ✓

---

## Execution Handoff

Vedi messaggio successivo per la scelta di esecuzione.
