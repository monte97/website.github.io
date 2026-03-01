# Blog Post Template — Report di miglioramento

## Struttura attuale

Il singolo articolo e' renderizzato da due file:

- **`src/pages/blog/[...slug].astro`** — route handler: fetch del post, render, passaggio props a layout
- **`src/layouts/BlogPostLayout.astro`** — layout: breadcrumb, header (data + badge + titolo + tags), SeriesNav, contenuto + TOC a 2 colonne, PostCTA, link GitHub

Il layout non riceve ne' passa `heroImage`. Il campo esiste nello schema (`content.config.ts` riga 19) ma nessun template lo usa. Le immagini pero' esistono gia': **35 file `hero.webp`** sono presenti nelle directory dei post. Non sono referenziate nel frontmatter ne' renderizzate.

---

## Problemi identificati

### 1. Hero image non passata ne' renderizzata

`[...slug].astro` passa al layout: title, description, date, pillar, tags, headings, editUrl, series, postId. Manca `heroImage`. Anche se un post lo popolasse, non verrebbe mostrato.

**File**: `src/pages/blog/[...slug].astro` righe 24-35 (props passate)
**File**: `src/layouts/BlogPostLayout.astro` righe 17-27 (Props interface — nessun heroImage)

### 2. Le hero image esistono ma non sono collegate

Grep sul frontmatter: zero risultati per `heroImage:`. Il campo non e' mai stato popolato. Tuttavia **35 file `hero.webp` esistono gia'** nelle directory dei post (es. `src/content/posts/progettare/kafka/01-intro/hero.webp`). Le immagini ci sono, serve solo collegarle — o meglio, derivare il path automaticamente dalla posizione del post senza nemmeno bisogno del campo frontmatter.

### 3. Header del post senza impatto visivo

L'header e' funzionale (data, badge pillar, titolo h1, tags) ma compresso in uno spazio ridotto (`max-w-3xl`, `mb-10`). Non c'e' nessun elemento visivo tra il breadcrumb e il contenuto — il titolo si confonde con il corpo dell'articolo. Per articoli lunghi e tecnici, un header piu' distinto aiuterebbe a orientare il lettore.

**File**: `src/layouts/BlogPostLayout.astro` righe 89-113

### 4. Nessun reading time

Come nella pagina listing, non viene mostrato il tempo di lettura stimato. Per articoli tecnici (spesso 2000+ parole), e' un'informazione attesa.

**File**: `src/layouts/BlogPostLayout.astro` — nessun calcolo/rendering del reading time

### 5. Nessun Open Graph image

`BlogPostLayout` passa `title` e `description` a `BaseLayout` ma non `ogImage`. Quando il post viene condiviso su LinkedIn o Twitter, non c'e' un'immagine OG specifica — viene usata quella di default del sito (se definita) o nessuna. Per un blog che genera contenuti LinkedIn, questo e' un problema di visibilita'.

**File**: `src/pages/blog/[...slug].astro` riga 24 — `BlogPostLayout` non riceve ogImage
**File**: `src/layouts/BlogPostLayout.astro` riga 67 — `BaseLayout` non riceve ogImage

### 6. TOC non evidenzia la sezione attiva

Il componente TOC mostra l'indice con link ai titoli, ma non evidenzia la sezione attualmente visibile durante lo scroll. E' un pattern comune nei blog tecnici (bordo sinistro accent sulla voce corrente) che migliora la navigazione su articoli lunghi.

**File**: `src/components/blog/TOC.astro` — nessun script di scroll tracking

### 7. PostCTA generico

Il CTA post-articolo ("Ti e' piaciuto questo articolo?") e' identico per tutti i post. Non c'e' personalizzazione in base al pillar (es. linkare al servizio correlato) o alla serie (es. "Leggi il prossimo articolo della serie").

**File**: `src/components/blog/PostCTA.astro`

### 8. Nessun "articoli correlati"

Dopo il CTA, la pagina finisce. Non ci sono suggerimenti di articoli correlati (stesso pillar, stessa categoria, stessi tag). Il lettore che arriva in fondo non ha un percorso di continuazione oltre "seguimi su LinkedIn".

### 9. SeriesNav solo prima del contenuto

La navigazione di serie appare solo sopra l'articolo. Per articoli lunghi, il lettore che finisce l'articolo deve scrollare in cima per trovare il link "Successivo". Una duplicazione dei link prev/next dopo il contenuto (prima del CTA) migliorerebbe la navigazione.

**File**: `src/layouts/BlogPostLayout.astro` riga 116

---

## Proposte

### A. Aggiungere heroImage al template

Modificare la pipeline completa:

1. `[...slug].astro`: passare `heroImage={post.data.heroImage}` al layout
2. `BlogPostLayout.astro`: aggiungere `heroImage?: string` alle Props
3. Renderizzare l'immagine sotto il breadcrumb e sopra l'header del titolo, con aspect ratio 16:9, `rounded-xl`, `shadow-sm`, larghezza piena (`max-w-5xl`)

Quando `heroImage` e' assente, il layout resta invariato (graceful degradation).

**Impatto**: alto — trasformazione visiva del post, prerequisito per usare le immagini anche nelle card listing
**Effort**: basso — poche righe di codice, il template e' gia' pronto
**File coinvolti**:
- Modifica: `src/pages/blog/[...slug].astro`
- Modifica: `src/layouts/BlogPostLayout.astro`

### B. Derivare hero image dal filesystem (senza frontmatter)

Le immagini `hero.webp` esistono gia' in 35 post. Invece di popolare il campo `heroImage` nel frontmatter di ogni post, derivare il path automaticamente:

1. In `[...slug].astro`, costruire il path atteso: `src/content/posts/${post.id}/hero.webp`
2. Verificare se il file esiste (import glob o check statico)
3. Se esiste, passarlo come prop al layout

In alternativa piu' semplice: usare una convenzione. Il template cerca sempre `hero.webp` nella stessa directory del post. Se c'e', lo mostra. Nessun frontmatter da aggiornare.

**Impatto**: alto — sblocca hero image per 35 post senza toccare nessun frontmatter
**Effort**: basso — path convention + import condizionale
**File coinvolti**:
- Modifica: `src/pages/blog/[...slug].astro`

### C. Reading time

Calcolare il tempo di lettura nel route handler (`[...slug].astro`) contando le parole del body renderizzato e dividendo per 200 wpm. Passarlo come prop al layout e mostrarlo accanto alla data nell'header.

**Impatto**: medio
**Effort**: basso — calcolo + 1 prop + 1 span
**File coinvolti**:
- Modifica: `src/pages/blog/[...slug].astro`
- Modifica: `src/layouts/BlogPostLayout.astro`

### D. Open Graph image

Passare `heroImage` (o un fallback generato) come `ogImage` a BaseLayout. Se il post ha una hero image, usarla. Altrimenti, usare un'immagine OG di default del sito.

Per una soluzione piu' avanzata: generare immagini OG dinamiche con `@vercel/og` o un endpoint Astro dedicato che renderizza titolo + pillar + branding.

**Impatto**: alto — visibilita' sulle condivisioni social (specialmente LinkedIn)
**Effort**: basso (fallback statico) o medio (generazione dinamica)
**File coinvolti**:
- Modifica: `src/pages/blog/[...slug].astro`
- Modifica: `src/layouts/BlogPostLayout.astro`
- Eventuale nuovo: `src/pages/og/[...slug].ts` (per generazione dinamica)

### E. TOC con sezione attiva evidenziata

Aggiungere uno script inline al componente TOC che usa `IntersectionObserver` per tracciare quale heading e' visibile e applicare una classe `active` (bordo sinistro accent, testo accent) alla voce corrispondente nella TOC.

**Impatto**: medio — migliora la navigazione su articoli lunghi
**Effort**: basso-medio — script JS + classi CSS
**File coinvolti**:
- Modifica: `src/components/blog/TOC.astro`

### F. Articoli correlati in fondo al post

Dopo il PostCTA, mostrare 2-3 articoli correlati. Logica di matching:
1. Stesso pillar + stessa categoria (match forte)
2. Stesso pillar + tag in comune (match medio)
3. Stesso pillar (match debole)

Layout compatto: titolo + data + badge pillar, senza card piena.

**Impatto**: alto — tiene il lettore sul sito, aumenta le pageview
**Effort**: medio — fetch collection filtrata + componente di rendering
**File coinvolti**:
- Modifica: `src/layouts/BlogPostLayout.astro`
- Eventuale nuovo: `src/components/blog/RelatedPosts.astro`

### G. SeriesNav duplicata dopo il contenuto

Aggiungere i link prev/next della serie anche dopo il contenuto dell'articolo (prima del PostCTA). Non la lista completa della serie, solo i bottoni "Precedente" e "Successivo" per non appesantire.

**Impatto**: medio — navigazione di serie senza scroll in cima
**Effort**: basso — estrarre i bottoni prev/next in un sotto-componente o duplicare il markup
**File coinvolti**:
- Modifica: `src/layouts/BlogPostLayout.astro`
- Eventuale modifica: `src/components/blog/SeriesNav.astro` (estrarre bottoni)

### H. PostCTA contestualizzato

Personalizzare il CTA in base al pillar del post:
- Post "progettare" -> "Hai bisogno di una revisione architetturale?" + link a /servizi/#architecture
- Post "verificare" -> "Vuoi migliorare l'observability del tuo sistema?" + link a /servizi/#observability-security
- Post "automatizzare" -> "Vuoi automatizzare il tuo workflow?" + link a /servizi/#pipeline-automation

Mantiene anche il link LinkedIn e email come opzioni secondarie.

**Impatto**: medio-alto — collega contenuti e servizi, migliora conversione
**Effort**: basso — condizionale su pillar prop
**File coinvolti**:
- Modifica: `src/components/blog/PostCTA.astro` (aggiungere prop pillar)
- Modifica: `src/layouts/BlogPostLayout.astro` (passare pillar a PostCTA)

---

## Priorita' suggerita

| Fase | Proposte | Motivazione |
|------|----------|-------------|
| 1 | A + B + C + D | Hero image nel template + derivazione da filesystem + reading time + OG image. Sblocca le 35 hero.webp gia' esistenti |
| 2 | E + G | TOC attiva + SeriesNav in fondo. Miglioramenti di navigazione |
| 3 | F + H | Articoli correlati + CTA contestualizzato. Engagement e conversione |
