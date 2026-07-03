# Public Speaking — pagina /talks + teaser About — design

**Data:** 2026-07-02
**Stato:** in revisione
**Sito:** montelli.dev (Astro 5, IT default + EN sotto `/en/`)

## 1. Obiettivo

Aggiungere una sezione "public speaking" al sito, ora che Francesco ha iniziato a parlare alle conferenze (2 talk tenuti + 1 accettato in arrivo). Deve servire due usi: (a) **credibilità** per chi visita il sito, (b) **URL condivisibile** da incollare nelle submission CFP e nelle bio speaker.

## 2. Decisione di collocazione (da panel a 4 lenti: IA, brand, buyer PMI, CFP)

**Pagina dedicata `/talks` (IT) e `/en/talks` (EN), NON nel menu principale**, linkata contestualmente da un teaser su About (e riusabile altrove). Motivi:

- **URL permanente subito** (decisivo): le CFP già inviate bloccano l'URL per sempre; partire da un'ancora `/about#speaking` e migrare dopo lascerebbe le submission puntate a un link morto senza redirect. Con submission già in corso, l'URL va fatto giusto ora → pagina dedicata.
- **Niente voce di menu** finché i talk sono pochi: un "Talks" con 2-3 entry accanto a Servizi/Workshop legge magro/padding (buyer + brand). Il nav resta per vendita/contenuto ricorrente.
- **È la convenzione del sito**: `/progetti` è già una pagina instradata **fuori dal nav**, linkata da Servizi/About. Speaking sta nello stesso secchio ("prova/evidenza", non "vendita/menu").
- **Promozione futura**: a 4-5+ talk (o una conferenza name-brand), aggiungere la voce di menu è banale e non-breaking, a differenza di una migrazione di URL.

## 3. Contenuto e onestà

- In pagina solo talk **delivered** (tenuti) e **upcoming** (accettati/confermati). I *submitted non ancora accettati* NON si mostrano (restano privati nei `_talks/` del vault): per uno speaker agli inizi, mostrare proposte pendenti legge incerto.
- **Delivered e upcoming visivamente separati** e chiaramente etichettati (un reviewer non deve confondere "tenuto" con "proposto").
- All'avvio: **2 delivered + 1 upcoming**.

## 4. Data model — `src/data/talks.ts`

Modulo TypeScript (pattern come `signals.ts`/`qr-events.ts`), NON content collection (le entry sono record brevi strutturati, non articoli MDX). Niente `pillar` (scelta esplicita: sovrastruttura inutile con pochi talk).

```ts
export type TalkLink = {
  repo?: string;        // repo pubblico con slide/materiale
  slides?: string;      // slide dirette (se non nel repo)
  linkedin?: string;    // post LinkedIn correlato
  conference?: string;  // pagina del talk sul sito della conferenza
  recording?: string;   // registrazione video (opzionale, quando esiste)
};

export type Talk = {
  slug: string;                          // per anchor/OG e nome immagine
  title: string;
  event: string;                         // "Working Software Conference 2026"
  date: string;                          // ISO "2026-06-18"
  location: string;                      // "Reggio Emilia, IT" | "Online"
  status: 'delivered' | 'upcoming';
  abstract: { it: string; en: string };  // 1-2 righe
  links?: TalkLink;
};

export const talks: Talk[] = [ /* dati reali forniti in implementazione */ ];
```

- Ordinamento in pagina: **upcoming** per data crescente (in alto), **delivered** per data decrescente.
- I campi testuali di contorno (titoli sezione, label) stanno nel componente pagina con oggetto `t` IT/EN, come le altre pagine.
- Il `title`/`event`/`location`/`date` non sono tradotti (nomi propri/date); solo `abstract` è bilingue.

## 5. Immagini

- Foto evento per talk in `src/assets/talks/<slug>.webp`, importate con `import.meta.glob` nel componente pagina e ottimizzate da Astro (stessa convenzione delle hero dei post; `import.meta.glob` deve stare nel file che consuma, per la static analysis di Vite).
- L'immagine è **opzionale** per talk: se manca, la card cade su un layout senza foto (nessun placeholder finto). I talk **upcoming** tipicamente non hanno foto.

## 6. Layout pagina `/talks`

Riuso di `PageLayout.astro` + `PageHero`/`SectionHeading` esistenti, palette accent standard (niente nuovo design system, niente colori-pilastro).

- **Hero pagina**: titolo "Conferenze & Speaking" (o equivalente) + 1 riga intro.
- **Blocco "Prossimi"** (se ci sono upcoming): card compatte — evento, data, luogo, titolo, abstract breve, link alla pagina conferenza. Niente foto/slide (non ancora tenuto).
- **Blocco "Passati"** (delivered, dominante): card più ricche — **foto** (se presente) + titolo + evento/data/luogo + abstract + riga di link (repo/slide, LinkedIn, conferenza, registrazione se c'è). I link sono icone/testo brevi.
- Se un blocco è vuoto, non si renderizza.

## 7. Teaser su About

Un blocco "Conferenze & Speaking" dentro `AboutPage.astro` (IT+EN): 2-3 righe che collegano lo speaking al filo esistente (blog → palco), + link "Vedi tutti i talk →" verso `/talks`. Non un elenco completo: solo l'aggancio narrativo + rimando. Voce/tono coerenti col resto della pagina (regole di scrittura: niente trattino lungo, niente "Non è X, è Y", niente parole vietate).

## 8. Routing / file

- `src/pages/talks/index.astro` → `<TalksPage lang="it" />`
- `src/pages/en/talks/index.astro` → `<TalksPage lang="en" />`
- `src/components/pages/TalksPage.astro` (nuovo componente pagina, consuma `src/data/talks.ts` + `import.meta.glob` immagini)
- `src/data/talks.ts` (nuovo)
- Modifica `src/components/pages/AboutPage.astro` (teaser)
- Immagini in `src/assets/talks/`

Nessuna modifica a `Header.astro` (fuori dal nav).

## 9. Fuori scope

- Voce di menu per /talks (rimandata a quando i talk crescono).
- Per-talk detail page / MDX (le entry sono brevi, bastano le card).
- Divisione per pilastri.
- Mostrare proposte CFP pendenti.

## 10. Criteri di "fatto"

- `/talks` e `/en/talks` rendono, fuori dal nav, con blocchi Prossimi/Passati separati ed etichettati.
- I talk vengono dal solo `src/data/talks.ts`; le foto da `src/assets/talks/` via `import.meta.glob`.
- Ogni delivered mostra i suoi link (repo/LinkedIn/conferenza) e la foto se presente.
- Teaser su About linka a `/talks`.
- IT ed EN allineati; regole di stile rispettate; `make build` verde; nessun trattino lungo in copy visibile.
