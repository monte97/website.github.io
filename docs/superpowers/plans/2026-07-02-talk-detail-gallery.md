# Pagine dettaglio talk + galleria — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Dare a ogni talk una pagina `/talks/<slug>` (IT+EN) con abstract completo, link e una galleria foto con lightbox fullscreen; le card (indice + home) linkano al dettaglio.

**Architecture:** Foto in cartelle `src/assets/talks/<slug>/`; util condiviso per risolverle; route dinamica `[slug].astro` con `getStaticPaths`; componente pagina `TalkDetailPage.astro`; lightbox come Vue island `TalkGallery.vue`. Card index/home aggiornate.

**Tech Stack:** Astro 5, Vue 3 (island `client:load`), Tailwind v4, TypeScript. Verifica: `npm run build`.

## Global Constraints

- Solo virgolette dritte ASCII come delimitatori in JS/TS/JSX (mai `‘ ’ “ ”`).
- Nessun trattino lungo (—) nella copy visibile.
- IT prima, EN dopo; ogni stringa in entrambe le lingue.
- Path alias `@/` = `src/`.
- `import.meta.glob` DEVE stare nel file `.astro` consumante (static analysis di Vite); il pattern cartelle è `'/src/assets/talks/*/*.{webp,jpg,jpeg,png}'`.
- Slug talk sono quelli in `src/data/talks.ts`: `oltre-i-ruoli-openfga` (upcoming, senza foto), `il-tuo-collega-piu-produttivo` (1 foto), `mutation-testing-working-software-2026` (4 foto).

---

### Task 1: Migrazione foto a cartelle + util `talkImagesFrom`

**Files:**
- Move: `src/assets/talks/il-tuo-collega-piu-produttivo.jpeg` → `src/assets/talks/il-tuo-collega-piu-produttivo/01.jpeg`
- Move: `src/assets/talks/mutation-testing-working-software-2026.jpeg` → `src/assets/talks/mutation-testing-working-software-2026/01.jpeg`
- Add: 3 foto WS aggiuntive come `02.jpeg`, `03.jpeg`, `04.jpeg`
- Create: `src/utils/talks.ts`

**Interfaces:**
- Produces: `talkImagesFrom(glob, slug): string[]` consumato da TalkDetailPage, TalksPage, LatestTalks.

- [ ] **Step 1: Migrare le foto nelle cartelle**

```bash
cd /Users/monte97/Documents/1_AETE/0_Content/website.github.io
mkdir -p src/assets/talks/il-tuo-collega-piu-produttivo src/assets/talks/mutation-testing-working-software-2026
git mv src/assets/talks/il-tuo-collega-piu-produttivo.jpeg src/assets/talks/il-tuo-collega-piu-produttivo/01.jpeg
git mv src/assets/talks/mutation-testing-working-software-2026.jpeg src/assets/talks/mutation-testing-working-software-2026/01.jpeg
# foto WS aggiuntive (la 390863 è già la 01/copertina): aggiungo le altre 3
cp ~/Desktop/ws26/1782552389798.jpeg src/assets/talks/mutation-testing-working-software-2026/02.jpeg
cp ~/Desktop/ws26/1782552389898.jpeg src/assets/talks/mutation-testing-working-software-2026/03.jpeg
cp ~/Desktop/ws26/1782552390102.jpeg src/assets/talks/mutation-testing-working-software-2026/04.jpeg
ls -R src/assets/talks/
```
Expected: `il-tuo-collega-piu-produttivo/01.jpeg`; `mutation-testing-working-software-2026/{01,02,03,04}.jpeg`; nessun file flat `.jpeg` residuo in `src/assets/talks/`.

- [ ] **Step 2: Creare `src/utils/talks.ts`**

```ts
/** Risolve gli URL foto di un talk da un glob eager su src/assets/talks/<slug>/*, ordinati per nome file. */
export function talkImagesFrom(
  glob: Record<string, { default: { src: string } }>,
  slug: string,
): string[] {
  return Object.entries(glob)
    .filter(([path]) => path.includes(`/talks/${slug}/`))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, mod]) => mod.default.src);
}
```

- [ ] **Step 3: Build di verifica**

Run: `cd /Users/monte97/Documents/1_AETE/0_Content/website.github.io && npm run build 2>&1 | tail -8`
Expected: exit 0. (Le card indice/home usano ancora il vecchio glob flat: le copertine possono sparire temporaneamente — verranno sistemate al Task 4. Il build deve comunque passare.)

- [ ] **Step 4: Commit**

```bash
git add src/assets/talks src/utils/talks.ts
git commit -m "feat(talks): foto in cartelle per talk + util talkImagesFrom"
```

---

### Task 2: `TalkGallery.vue` (lightbox Vue island)

**Files:**
- Create: `src/components/interactive/TalkGallery.vue`

**Interfaces:**
- Consumes: props `images: string[]`, `title: string`.
- Produces: componente usato da `TalkDetailPage.astro` con `client:load`.

- [ ] **Step 1: Creare `src/components/interactive/TalkGallery.vue`**

```vue
<template>
  <div>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <button
        v-for="(src, i) in images"
        :key="i"
        type="button"
        class="block overflow-hidden rounded-lg border border-border/60 focus:outline-none focus:ring-2 focus:ring-accent"
        @click="open(i)"
      >
        <img :src="src" :alt="`${title} - foto ${i + 1}`" loading="lazy" class="w-full h-32 object-cover hover:opacity-90 transition-opacity" />
      </button>
    </div>

    <div
      v-if="current !== null"
      class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      @click.self="close"
    >
      <button type="button" class="absolute top-4 right-4 text-white/80 hover:text-white p-2" aria-label="Chiudi" @click="close">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <button v-if="images.length > 1" type="button" class="absolute left-2 sm:left-6 text-white/80 hover:text-white p-2" aria-label="Precedente" @click="prev">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <img :src="images[current]" :alt="`${title} - foto ${current + 1}`" class="max-h-[85vh] max-w-full object-contain rounded" />

      <button v-if="images.length > 1" type="button" class="absolute right-2 sm:right-6 text-white/80 hover:text-white p-2" aria-label="Successiva" @click="next">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div v-if="images.length > 1" class="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
        {{ current + 1 }} / {{ images.length }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';

const props = defineProps<{ images: string[]; title: string }>();
const current = ref<number | null>(null);

function open(i: number) { current.value = i; }
function close() { current.value = null; }
function next() { if (current.value !== null) current.value = (current.value + 1) % props.images.length; }
function prev() { if (current.value !== null) current.value = (current.value - 1 + props.images.length) % props.images.length; }

function onKey(e: KeyboardEvent) {
  if (current.value === null) return;
  if (e.key === 'Escape') close();
  else if (e.key === 'ArrowRight') next();
  else if (e.key === 'ArrowLeft') prev();
}

watch(current, (v) => {
  if (v !== null) {
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
  } else {
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
  }
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
});
</script>
```

- [ ] **Step 2: Build (compila il .vue)**

Run: `cd /Users/monte97/Documents/1_AETE/0_Content/website.github.io && npm run build 2>&1 | tail -8`
Expected: exit 0 (il componente non è ancora usato, ma deve compilare).

- [ ] **Step 3: Commit**

```bash
git add src/components/interactive/TalkGallery.vue
git commit -m "feat(talks): TalkGallery.vue (lightbox fullscreen con frecce/tastiera/contatore)"
```

---

### Task 3: `TalkDetailPage.astro` + route dinamiche

**Files:**
- Create: `src/components/pages/TalkDetailPage.astro`
- Create: `src/pages/talks/[slug].astro`
- Create: `src/pages/en/talks/[slug].astro`

**Interfaces:**
- Consumes: `talks`, `talkImagesFrom` (Task 1), `TalkGallery` (Task 2), `PageLayout`.
- Produces: rotte `/talks/<slug>` e `/en/talks/<slug>` per ogni talk.

- [ ] **Step 1: Creare `src/components/pages/TalkDetailPage.astro`**

```astro
---
import PageLayout from '@/layouts/PageLayout.astro';
import TalkGallery from '@/components/interactive/TalkGallery.vue';
import { talks } from '@/data/talks';
import { talkImagesFrom } from '@/utils/talks';

interface Props {
  slug: string;
  lang?: 'it' | 'en';
}

const { slug, lang = 'it' } = Astro.props;
const prefix = lang === 'en' ? '/en' : '';
const talk = talks.find((tk) => tk.slug === slug)!;

const allTalkImages = import.meta.glob<{ default: { src: string } }>(
  '/src/assets/talks/*/*.{webp,jpg,jpeg,png}',
  { eager: true },
);
const images = talkImagesFrom(allTalkImages, slug);

const locale = lang === 'en' ? 'en-US' : 'it-IT';
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(locale, { year: 'numeric', month: 'long' });

const t = lang === 'en'
  ? {
      back: 'All talks',
      upcoming: 'Upcoming',
      gallery: 'Gallery',
      linkRepo: 'Slides & material',
      linkSlides: 'Slides',
      linkRecording: 'Recording',
      linkLinkedin: 'LinkedIn',
      linkConference: 'Conference',
    }
  : {
      back: 'Tutti i talk',
      upcoming: 'In arrivo',
      gallery: 'Galleria',
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

<PageLayout title={talk.title} description={talk.abstract[lang]} ogImage="/og/about.webp" lang={lang}>
  <a href={`${prefix}/talks/`} class="inline-block text-sm text-accent hover:underline mb-8">&larr; {t.back}</a>

  <header class="mb-6">
    <p class="text-sm text-text-muted">
      {talk.event} &middot; {fmtDate(talk.date)} &middot; {talk.location}
      {talk.status === 'upcoming' && <span class="text-accent font-semibold"> &middot; {t.upcoming}</span>}
    </p>
    <h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-text-dark dark:text-text-light mt-2">
      {talk.title}
    </h1>
  </header>

  <p class="text-text-muted text-lg leading-relaxed max-w-3xl mb-8">{talk.abstract[lang]}</p>

  {talk.links && (
    <div class="flex flex-wrap gap-3 mb-12">
      {linkOrder.map((key) => (
        talk.links?.[key] && (
          <a href={talk.links[key]} target="_blank" rel="noopener noreferrer" class="inline-flex items-center rounded-lg border border-accent/30 text-accent px-4 py-2 text-sm font-medium hover:bg-accent/5 transition-colors">
            {linkLabel[key]} &rarr;
          </a>
        )
      ))}
    </div>
  )}

  {images.length > 0 && (
    <section class="mb-8">
      <h2 class="text-xs font-semibold uppercase tracking-wide text-text-muted mb-4">{t.gallery}</h2>
      <TalkGallery client:load images={images} title={talk.title} />
    </section>
  )}
</PageLayout>
```

- [ ] **Step 2: Creare le route dinamiche**

`src/pages/talks/[slug].astro`:
```astro
---
import TalkDetailPage from '@/components/pages/TalkDetailPage.astro';
import { talks } from '@/data/talks';

export function getStaticPaths() {
  return talks.map((tk) => ({ params: { slug: tk.slug } }));
}

const { slug } = Astro.params;
---

<TalkDetailPage slug={slug!} lang="it" />
```

`src/pages/en/talks/[slug].astro`:
```astro
---
import TalkDetailPage from '@/components/pages/TalkDetailPage.astro';
import { talks } from '@/data/talks';

export function getStaticPaths() {
  return talks.map((tk) => ({ params: { slug: tk.slug } }));
}

const { slug } = Astro.params;
---

<TalkDetailPage slug={slug!} lang="en" />
```

- [ ] **Step 3: Build + verifica pagine dettaglio**

```bash
cd /Users/monte97/Documents/1_AETE/0_Content/website.github.io
npm run build 2>&1 | tail -8
for s in oltre-i-ruoli-openfga il-tuo-collega-piu-produttivo mutation-testing-working-software-2026; do
  test -f "dist/talks/$s/index.html" && echo "OK it: /talks/$s" || echo "KO it: $s"
  test -f "dist/en/talks/$s/index.html" && echo "OK en: /en/talks/$s" || echo "KO en: $s"
done
grep -qF "TalkGallery" dist/talks/mutation-testing-working-software-2026/index.html && echo "OK galleria montata (WS)"
grep -qiE "galleria|gallery" dist/talks/oltre-i-ruoli-openfga/index.html && echo "KO: galleria su talk senza foto" || echo "OK: niente galleria su OpenFGA"
grep -c $'‘' src/components/pages/TalkDetailPage.astro
```
Expected: build exit 0; tutte le 6 pagine `OK`; galleria montata su WS; nessuna galleria su OpenFGA; curly `0`.

- [ ] **Step 4: Commit**

```bash
git add src/components/pages/TalkDetailPage.astro src/pages/talks/[slug].astro src/pages/en/talks/[slug].astro
git commit -m "feat(talks): pagina dettaglio /talks/<slug> (IT+EN) con galleria"
```

---

### Task 4: Card indice + home → link al dettaglio; copertina da cartella

**Files:**
- Modify: `src/components/pages/TalksPage.astro`
- Modify: `src/components/home/LatestTalks.astro`

**Interfaces:**
- Consumes: `talkImagesFrom` (Task 1); rotte dettaglio (Task 3).

- [ ] **Step 1: `TalksPage.astro` — glob a cartelle, copertina, card che linka al dettaglio, via link inline**

Sostituire il blocco immagini in cima al frontmatter (attuale `talkImages` + `imageBySlug` + `imageFor`) con:
```ts
import { talkImagesFrom } from '@/utils/talks';

const allTalkImages = import.meta.glob<{ default: { src: string } }>(
  '/src/assets/talks/*/*.{webp,jpg,jpeg,png}',
  { eager: true },
);
const coverFor = (slug: string): string | null => talkImagesFrom(allTalkImages, slug)[0] ?? null;
```
Nel markup: nella sezione **Passati**, sostituire la card `<article>...</article>` con una card che è un link al dettaglio e SENZA i link inline (repo/LinkedIn/conferenza):
```astro
        {past.map((talk) => {
          const img = coverFor(talk.slug);
          return (
            <a href={`${prefix}/talks/${talk.slug}/`} class="group rounded-xl border border-border/60 dark:border-border-dark/60 bg-white dark:bg-surface-dark overflow-hidden md:flex">
              {img && (
                <img src={img} alt={talk.title} class="w-full h-48 md:h-auto md:w-64 object-cover shrink-0" loading="lazy" />
              )}
              <div class="p-6 flex-1">
                <p class="text-sm text-text-muted">{talk.event} &middot; {fmtDate(talk.date)} &middot; {talk.location}</p>
                <h3 class="text-xl font-bold text-text-dark dark:text-text-light mt-1 group-hover:text-accent transition-colors">{talk.title}</h3>
                <p class="text-text-muted mt-2 leading-relaxed">{talk.abstract[lang]}</p>
              </div>
            </a>
          );
        })}
```
Nella sezione **Prossimi**, avvolgere la card in un link al dettaglio: cambiare l'apertura `<div class="rounded-xl border border-accent/30 bg-accent/5 p-6">` in `<a href={`${prefix}/talks/${talk.slug}/`} class="block rounded-xl border border-accent/30 bg-accent/5 p-6 hover:border-accent/50 transition-colors">` e la relativa chiusura `</div>` in `</a>`, rimuovendo il link inline `conference` interno (ora sta sul dettaglio). Rimuovere le chiavi/label dei link inline non più usate SOLO se non più referenziate (verificare `linkOrder`/`linkLabel`: se non più usate in questo file, rimuoverle).

- [ ] **Step 2: `LatestTalks.astro` — glob a cartelle + copertina, card già linka: aggiornare a `/talks/<slug>`**

Sostituire il blocco `talkImages`/`imageBySlug` con:
```ts
import { talkImagesFrom } from '@/utils/talks';

const allTalkImages = import.meta.glob<{ default: { src: string } }>(
  '/src/assets/talks/*/*.{webp,jpg,jpeg,png}',
  { eager: true },
);
```
Nel `map`, cambiare `const img = imageBySlug[talk.slug];` in `const img = talkImagesFrom(allTalkImages, talk.slug)[0];` e l'`href` della card da `` `${prefix}/talks/` `` a `` `${prefix}/talks/${talk.slug}/` ``.

- [ ] **Step 3: Build + verifica**

```bash
cd /Users/monte97/Documents/1_AETE/0_Content/website.github.io
npm run build 2>&1 | tail -8
echo "-- copertine tornate su indice e home:"; grep -oE "il-tuo-collega|mutation-testing-working" dist/talks/index.html | sort -u | tr '\n' ' '; echo
grep -oE "il-tuo-collega|mutation-testing-working" dist/index.html | sort -u | tr '\n' ' '; echo
echo "-- card indice linkano al dettaglio:"; grep -qF 'href="/talks/il-tuo-collega-piu-produttivo/"' dist/talks/index.html && echo OK-indice
echo "-- home linka al dettaglio:"; grep -qF 'href="/talks/mutation-testing-working-software-2026/"' dist/index.html && echo OK-home
echo "-- niente link inline repo/LinkedIn sulle card indice:"; grep -qF "github.com/monte97/il-tuo-collega" dist/talks/index.html && echo "KO link inline residuo" || echo "OK niente link inline"
for f in src/components/pages/TalksPage.astro src/components/home/LatestTalks.astro; do echo "$f curly: $(grep -c $'‘' "$f")"; done
```
Expected: build exit 0; copertine presenti su indice e home; card linkano al dettaglio; nessun link esterno inline sull'indice; curly `0`.

- [ ] **Step 4: Commit**

```bash
git add src/components/pages/TalksPage.astro src/components/home/LatestTalks.astro
git commit -m "feat(talks): card indice/home linkano al dettaglio; copertina da cartella"
```

---

### Task 5: Accettazione (build + verifica visiva)

**Files:** nessuna modifica (checklist).

- [ ] **Step 1: Build pulito + smoke**

```bash
cd /Users/monte97/Documents/1_AETE/0_Content/website.github.io
rm -rf dist .astro && npm run build 2>&1 | tail -6
npx astro preview --port 4321 >/tmp/prev.log 2>&1 &
sleep 5
bash scripts/smoke.sh http://localhost:4321 | tail -1
kill %1 2>/dev/null
```
Expected: build exit 0; smoke `superato` (le sentinelle /servizi non sono toccate).

- [ ] **Step 2: Revisione visiva** (`npx astro preview`, aprire):
  - `/talks/mutation-testing-working-software-2026/` → 4 miniature; click apre lightbox fullscreen; frecce, tasti ←→, ESC, contatore `n / 4` funzionano.
  - `/talks/il-tuo-collega-piu-produttivo/` → 1 miniatura; lightbox senza frecce.
  - `/talks/oltre-i-ruoli-openfga/` → nessuna galleria, info + link conferenza + badge "In arrivo".
  - `/talks/` e home: click su una card porta al dettaglio giusto; copertine corrette.
  - `/en/talks/<slug>/` → stringhe in inglese.

---

## Self-Review (compilata dall'autore del piano)

**Spec coverage:** §2 foto a cartelle → Task 1. §3 route dinamica → Task 3. §4 TalkDetailPage → Task 3. §5 TalkGallery → Task 2. §6 card → dettaglio → Task 4. Criteri §9 → Task 5. ✓

**Placeholder scan:** nessun TODO/TBD. Le foto WS sono file reali su `~/Desktop/ws26/` (nomi espliciti nel Task 1). ✓

**Type consistency:** `talkImagesFrom(glob, slug): string[]` definito in Task 1, usato con firma identica in Task 3/4. `TalkGallery` props `images: string[]`, `title: string` (Task 2) = come passati in Task 3. `LinkKey`/`linkOrder`/`linkLabel` coerenti col pattern di `TalksPage`. ✓

---

## Execution Handoff

Vedi messaggio successivo per la scelta di esecuzione.
