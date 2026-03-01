# Blog Page — Report di miglioramento

## Stato attuale

La pagina `/blog/` e' funzionale: lista paginata di post, filtri per pillar, sidebar con categorie e serie, ricerca Pagefind. Ma l'esperienza visiva e' generica e non sfrutta il potenziale del design system gia' presente (token, animazioni, hero image).

---

## Problemi identificati

### 1. Header di pagina piatto

Il titolo e' un `<h1>Blog</h1>` secco senza contesto. Non comunica il posizionamento del blog (backend engineering, DevOps, observability) e non offre un punto di ingresso visivamente interessante.

**File**: `src/pages/blog/[...page].astro` riga 39

### 2. Nessuna gerarchia visiva tra i post

Tutti i post sono card identiche in una griglia 2xN. L'articolo piu' recente ha lo stesso peso visivo dell'ultimo della lista. Non c'e' modo di distinguere a colpo d'occhio cosa e' nuovo o rilevante.

**File**: `src/pages/blog/[...page].astro` riga 62

### 3. Hero image non utilizzate

Il frontmatter supporta `heroImage` (definito in `src/content.config.ts`) e **35 file `hero.webp` esistono gia'** nelle directory dei post, ma la PostCard non li mostra. Il risultato e' un muro di testo senza immagini, che riduce l'appeal visivo e il click-through. Le immagini ci sono, il template non le usa.

**File**: `src/components/blog/PostCard.astro` — nessun riferimento a `heroImage`

### 4. Pillar filter badges poco leggibili

I badge in riga sono piccoli (text-sm). Lo stato attivo e' indicato da `ring-2 ring-accent` che su mobile e' poco distinguibile dallo stato inattivo. L'utente non capisce immediatamente quale filtro e' selezionato.

**File**: `src/pages/blog/[...page].astro` righe 43-55

### 5. Sidebar con link non funzionanti

I filtri categoria (`/blog/?cat=kafka`) e serie (`/blog/?series=kafka`) generano URL con query params ma non esiste logica client-side o server-side per filtrarli. Sono link morti.

**File**: `src/components/blog/BlogSidebar.astro` righe 93-96, 119-122

### 6. Animazioni non applicate

Le classi `fade-in-section` e `stagger-children` sono definite in `global.css` e usate nella homepage, ma la pagina blog non le applica. I post appaiono tutti istantaneamente senza transizione.

**File**: `src/pages/blog/[...page].astro` — nessuna classe di animazione sulla griglia

### 7. Nessun tempo di lettura

Il frontmatter e il content collection hanno tutto il necessario per calcolare il reading time, ma non viene mostrato. E' un'informazione che i lettori tecnici si aspettano.

---

## Proposte

### A. Featured post (primo articolo a larghezza piena)

Il primo post della prima pagina viene renderizzato in un layout diverso: larghezza piena (span 2 colonne), titolo piu' grande, excerpt completo (senza line-clamp), hero image se presente. Gli altri post mantengono il layout card attuale.

**Impatto**: alto — crea gerarchia visiva immediata, il blog smette di sembrare un elenco
**Effort**: medio — nuovo componente `FeaturedPostCard.astro`, modifica alla griglia in `[...page].astro`
**File coinvolti**:
- Nuovo: `src/components/blog/FeaturedPostCard.astro`
- Modifica: `src/pages/blog/[...page].astro`

### B. Pillar tabs rivisitati

Sostituire i piccoli badge con tab segmentati piu' grandi. Ogni tab mostra il nome del pillar + contatore post. Lo stato attivo usa il colore del pillar come sfondo pieno (non solo ring). Su mobile i tab diventano scrollabili orizzontalmente.

**Impatto**: alto — navigazione piu' chiara e immediata
**Effort**: basso — solo markup e classi CSS, nessun componente nuovo
**File coinvolti**:
- Modifica: `src/pages/blog/[...page].astro` (e le 3 pagine pillar)

### C. Stagger animation sulla griglia

Applicare `stagger-children` al container della griglia post. I post appaiono con fade-in sfalsato (100ms di delay tra uno e l'altro). L'intersection observer e' gia' attivo in `BaseLayout.astro`.

**Impatto**: medio — transizione piacevole, coerenza con la homepage
**Effort**: basso — aggiungere una classe al div della griglia
**File coinvolti**:
- Modifica: `src/pages/blog/[...page].astro` riga 62

### D. Hero image nelle card

Quando un post ha `heroImage`, la PostCard mostra l'immagine sopra il contenuto testuale con aspect ratio 16:9 e `object-cover`. Le card senza immagine mantengono il layout attuale (solo testo). La FeaturedPostCard (proposta A) mostra l'immagine a sinistra in layout orizzontale.

**Impatto**: alto — rompe la monotonia visiva, aumenta l'engagement
**Effort**: medio — modifica a PostCard, passaggio prop `heroImage`, gestione immagini
**File coinvolti**:
- Modifica: `src/components/blog/PostCard.astro`
- Modifica: `src/pages/blog/[...page].astro` (passare heroImage come prop)

### E. Header di sezione editoriale

Sotto il titolo "Blog" aggiungere una tagline breve (es. "Architettura software, DevOps e observability — dal campo") e il contatore totale articoli. Opzionale: la tagline cambia in base al pillar selezionato.

**Impatto**: medio — da' contesto e personalita'
**Effort**: basso — poche righe di markup
**File coinvolti**:
- Modifica: `src/pages/blog/[...page].astro`

### F. Sidebar funzionante

Due opzioni:

**F1 — Link statici**: generare pagine dedicate per ogni categoria (es. `/blog/category/kafka/`) tramite `getStaticPaths`. Approccio solido, zero JS, SEO-friendly. Effort alto (nuova route + pagina).

**F2 — Filtro client-side**: leggere i query params `?cat=` e `?series=` e nascondere via JS le card che non corrispondono. Approccio veloce ma meno robusto (paginazione rotta, SEO nullo sui filtri). Effort medio.

**Raccomandazione**: F1 per le categorie piu' usate, rimuovere i link non funzionanti nel frattempo.

**Impatto**: alto — la sidebar diventa utile invece che decorativa
**Effort**: alto (F1) o medio (F2)
**File coinvolti**:
- F1: nuovo `src/pages/blog/category/[category]/[...page].astro`
- F2: modifica `src/components/blog/BlogSidebar.astro` + script client

### G. Reading time

Calcolare il tempo di lettura dal body del post (parole / 200 wpm) e mostrarlo nella PostCard accanto alla data. Formato: "5 min".

**Impatto**: medio — informazione attesa dai lettori tecnici
**Effort**: basso — calcolo in `[...page].astro`, nuova prop in PostCard
**File coinvolti**:
- Modifica: `src/pages/blog/[...page].astro`
- Modifica: `src/components/blog/PostCard.astro`

---

## Priorita' suggerita

| Fase | Proposte | Motivazione |
|------|----------|-------------|
| 1 | C + E + G | Quick wins a basso effort, migliorano subito l'esperienza |
| 2 | A + B | Cambio visivo piu' impattante, richiede piu' lavoro |
| 3 | D | Dipende dalla disponibilita' di hero image nei post esistenti |
| 4 | F | Richiede decisione architetturale (statico vs client-side) |
