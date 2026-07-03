# Pagine di dettaglio talk + galleria foto — design

**Data:** 2026-07-02
**Sito:** montelli.dev (Astro 5, Vue islands, IT default + EN sotto `/en/`)
**Contesto:** estende la sezione public speaking (spec `2026-07-02-talks-public-speaking-design.md`): dati in `src/data/talks.ts`, indice `/talks` (`TalksPage.astro`), sezione home `LatestTalks.astro`, foto singola per talk in `src/assets/talks/<slug>.<ext>`.

## 1. Obiettivo

Dare a ogni talk una **pagina di dettaglio** con URL proprio (`/talks/<slug>`), abstract completo, tutti i link, e una **galleria foto** con lightbox fullscreen. Le card (indice + home) linkano alla pagina di dettaglio.

## 2. Foto: da file singolo a cartella per talk

- Le foto passano da `src/assets/talks/<slug>.<ext>` a **`src/assets/talks/<slug>/*.{webp,jpg,jpeg,png}`** (più foto per talk).
- La **copertina** (usata nelle card indice/home) è la prima foto in ordine di nome file (ordinamento alfabetico del glob). Convenzione: nominare `01.jpeg`, `02.jpeg`, ...
- Migrazione: le 2 foto attuali vanno nelle rispettive cartelle; si aggiungono le **4 foto di Working Software** (già disponibili su `~/Desktop/ws26/`).
- Talk senza foto (upcoming OpenFGA): nessuna cartella → nessuna copertina, nessuna galleria.
- Astro ottimizza i jpg/png/webp importati da `src/assets`. `import.meta.glob` deve stare nei file consumanti (static analysis di Vite).

## 3. Route dinamica

- `src/pages/talks/[slug].astro` (IT) e `src/pages/en/talks/[slug].astro` (EN).
- Ognuna esporta `getStaticPaths()` che genera un path per ogni `talk` in `talks.ts` (usa `talk.slug`). Passa `slug` (+ `lang`) a `TalkDetailPage`.
- Risoluzione foto: la route (o `TalkDetailPage`) usa `import.meta.glob('/src/assets/talks/*/*.{webp,jpg,jpeg,png}', { eager: true })`, filtra per `/<slug>/`, ordina per path, e ottiene la lista di `src` da passare alla galleria.

## 4. `TalkDetailPage.astro` (nuovo componente pagina)

Props: `slug: string`, `lang: 'it' | 'en'`, `images: string[]` (URL già risolti).
Usa `PageLayout`. Contenuto, dall'alto:
- **Back link** "← Tutti i talk" verso `/talks` (con `prefix`).
- **Header**: `event · data · location`; badge "In arrivo" / "Upcoming" se `status === 'upcoming'`; `<h1>` = titolo.
- **Abstract completo** (`talk.abstract[lang]`).
- **Riga link** (pulsanti): repo/slide/LinkedIn/conferenza/registrazione — solo quelli presenti in `talk.links`. Stesse label bilingui di `TalksPage`.
- **Galleria** (se `images.length > 0`): il componente Vue `TalkGallery` con `client:load`, passando `images` e il titolo (per l'alt).
- Nessuna `FinalCta` (pagina di contenuto, non funnel).
- 404: se lo slug non esiste, la route non lo genera (getStaticPaths), quindi Astro produce naturalmente 404.

## 5. `TalkGallery.vue` (Vue island)

Props: `images: string[]`, `title: string`.
Comportamento:
- **Griglia di miniature** (i `<img>` cliccabili).
- Click su una miniatura → **overlay fullscreen** (fixed, sfondo scuro) con la foto grande centrata.
- **Navigazione**: frecce prev/next (bottoni) + tasti **←/→**; **ESC** chiude; contatore "indice/totale" (es. `2 / 4`).
- Con **1 sola foto**: overlay senza frecce/contatore (o disabilitati).
- Accessibilità: overlay con `role="dialog"` `aria-modal`, focus gestito, chiusura anche su click fuori dalla foto; bottoni con `aria-label`.
- Nessuna dipendenza esterna; solo Vue 3 (già nel progetto). Lo stato (aperto/indice) è interno al componente.
- Gli `src` arrivano già ottimizzati da Astro (URL string), la galleria non importa asset.

## 6. Card che linkano al dettaglio

- **`TalksPage.astro`** (indice): ogni card (upcoming + past) diventa un link a `/talks/<slug>` (con `prefix`). I link esterni inline (repo/LinkedIn/conferenza) si **rimuovono dalle card** e vivono sulla pagina di dettaglio. La copertina resta la prima foto della cartella.
- **`LatestTalks.astro`** (home): le card già linkano a `/talks`; cambiano in `/talks/<slug>`. La copertina passa alla logica cartella-per-talk.

## 7. Fuori scope (YAGNI)

- Embed video/slide inline (restano link).
- Zoom/pinch, swipe touch avanzato (le frecce + tap bastano; swipe base opzionale se banale).
- Didascalie per singola foto.
- Cambi al modello `Talk` in `talks.ts` (non serve un campo `images`: si deriva dalla cartella per slug).

## 8. File

Nuovi:
- `src/components/pages/TalkDetailPage.astro`
- `src/components/interactive/TalkGallery.vue`
- `src/pages/talks/[slug].astro`, `src/pages/en/talks/[slug].astro`
Modificati:
- `src/components/pages/TalksPage.astro` (card → dettaglio, rimozione link inline)
- `src/components/home/LatestTalks.astro` (card → dettaglio, copertina da cartella)
Asset:
- Migrazione foto in `src/assets/talks/<slug>/` + aggiunta foto WS.

## 9. Criteri di "fatto"

- `/talks/<slug>` e `/en/talks/<slug>` esistono per ogni talk, rendono titolo/abstract/link/galleria.
- Le card su `/talks` e in home linkano al dettaglio corretto.
- La galleria: click apre lightbox fullscreen, frecce + ←→ + ESC funzionano, contatore corretto; con 1 foto niente frecce.
- Talk senza foto: pagina senza galleria, nessun errore.
- Copertine corrette (prima foto della cartella) su indice e home.
- IT/EN allineati; `make build` verde; nessun trattino lungo in copy visibile; nessuna virgoletta curva nel codice.
