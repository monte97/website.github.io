# Services Page — Report di miglioramento

## Struttura attuale

La pagina `/servizi/` lista 4 servizi in sequenza verticale, ciascuno proveniente dalla content collection `services/`:

1. **Health Check Tecnico** (pillar: tutti)
2. **System Design & Architecture** (pillar: progettare)
3. **Observability & Security** (pillar: verificare)
4. **Pipeline & Automazione** (pillar: automatizzare)

Ogni servizio mostra: titolo + badge pillar, contenuto markdown (prose), bottone CTA (mailto). Spaziatura `space-y-16` tra i servizi. Usa PageLayout.

---

## Problemi identificati

### 1. Contenuto troppo scarno

Ogni servizio ha un singolo paragrafo di 2-3 righe. Per una pagina che deve vendere consulenza, e' insufficiente. Non ci sono: deliverable concreti, processo di lavoro, tecnologie specifiche, durata indicativa, target (per chi e' il servizio).

Il markdown dei servizi e' quasi identico alla `description` nel frontmatter — duplicazione senza valore aggiunto.

**File**: `src/content/services/*.md`

### 2. Nessuna struttura visiva differenziante

Tutti i 4 servizi hanno lo stesso identico layout: titolo, badge, testo, bottone. Non c'e' gerarchia tra il Health Check (entry point consigliato, linkato dall'hero homepage) e gli altri servizi. Non ci sono card, bordi, icone o elementi visivi che distinguano un servizio dall'altro.

**File**: `src/pages/servizi/index.astro`

### 3. Icone definite ma non usate

Il frontmatter dei servizi include `icon` (stethoscope, drafting-compass, shield-check, rocket) ma la pagina non le mostra. Sono metadati sprecati.

**File**: `src/content/services/*.md` campo `icon`, `src/pages/servizi/index.astro` — nessun riferimento a `icon`

### 4. Nessuna animazione

Come la pagina About, nessuna classe `fade-in-section`. La pagina e' statica.

**File**: `src/pages/servizi/index.astro`

### 5. Nessun pricing o indicazione di impegno

Non c'e' nessuna indicazione su costi, durata o formato dell'engagement (giornate, pacchetti, continuativo). Per un freelance, questa informazione e' fondamentale per qualificare i lead — senza di essa, il visitatore non sa se il servizio e' alla sua portata.

### 6. CTA identici senza differenziazione

Tutti i bottoni CTA puntano a un mailto con il titolo del servizio come subject. Non c'e' variazione: nessun servizio ha un form dedicato, una pagina di approfondimento, o un calendario per prenotare una call.

**File**: `src/pages/servizi/index.astro`

### 7. Nessun collegamento al blog

I servizi mappano direttamente ai pillar del blog (Progettare, Verificare, Automatizzare) ma non linkano agli articoli correlati. Un visitatore interessato a "System Design & Architecture" non viene guidato verso gli articoli di design. Il blog e' la prova di competenza — non sfruttarlo e' un'occasione persa.

### 8. Health Check non emerge come entry point

L'hero della homepage punta a "Inizia dal Health Check" ma nella pagina servizi il Health Check e' semplicemente il primo della lista, senza nessun trattamento speciale. Dovrebbe essere visivamente distinto come il punto di ingresso consigliato.

---

## Proposte

### A. Card layout per ogni servizio

Ogni servizio diventa una card con:
- Bordo sinistro colorato per pillar (come le PostCard)
- Icona del servizio (dall'attributo `icon` nel frontmatter) accanto al titolo
- Sfondo `surface/50` o bianco per separazione dal background

Il Health Check ottiene un trattamento "featured": larghezza piena, bordo accent, badge "Consigliato" o "Punto di partenza".

**Impatto**: alto — la pagina smette di sembrare un documento di testo
**Effort**: medio — modifica al layout in servizi/index.astro
**File coinvolti**:
- Modifica: `src/pages/servizi/index.astro`

### B. Icone SVG per i servizi

Creare o importare 4 icone SVG inline corrispondenti ai valori `icon` nel frontmatter. Mostrarle accanto al titolo di ogni servizio, con colore pillar. Opzione: usare una libreria come Lucide icons (gia' comunemente usata nell'ecosistema Astro).

**Impatto**: medio — aggiunge identita' visiva a ogni servizio
**Effort**: basso-medio — 4 SVG inline o import da libreria
**File coinvolti**:
- Modifica: `src/pages/servizi/index.astro`

### C. Animazioni fade-in

Aggiungere `fade-in-section` a ogni section servizio. I servizi appaiono con transizione allo scroll.

**Impatto**: medio
**Effort**: basso
**File coinvolti**:
- Modifica: `src/pages/servizi/index.astro`

### D. Arricchimento contenuto servizi

Per ogni servizio, espandere il contenuto markdown con:
- **Per chi e'**: target del servizio (1 riga)
- **Cosa include**: lista puntata di deliverable concreti
- **Tecnologie**: lista delle tecnologie coinvolte
- **Formato**: durata indicativa o tipo di engagement

Questo richiede una decisione sui contenuti da parte del proprietario del sito.

**Impatto**: alto — trasforma la pagina da descrittiva a persuasiva
**Effort**: medio — scrittura contenuti (non solo codice)
**File coinvolti**:
- Modifica: `src/content/services/*.md`

### E. Link agli articoli correlati per pillar

Sotto ogni servizio, mostrare 2-3 articoli del blog con lo stesso pillar. Titolo + data, formato compatto (non PostCard piena). Label: "Approfondisci dal blog" o "Articoli correlati".

**Impatto**: alto — collega servizi e contenuti, dimostra competenza
**Effort**: medio — fetch collection filtrata per pillar in servizi/index.astro
**File coinvolti**:
- Modifica: `src/pages/servizi/index.astro`

### F. Health Check come hero della pagina

Estrarre il Health Check dalla lista e renderizzarlo come sezione hero in cima alla pagina, prima della lista degli altri servizi. Layout distinto: sfondo accent-subtle, titolo piu' grande, descrizione piu' lunga, CTA prominente. Gli altri 3 servizi sotto in card.

**Impatto**: alto — coerenza con il CTA dell'homepage
**Effort**: medio — layout condizionale
**File coinvolti**:
- Modifica: `src/pages/servizi/index.astro`

### G. Indicazione di formato/impegno

Aggiungere un campo `format` al frontmatter dei servizi (es. "1-2 giornate", "Pacchetto settimanale", "Continuativo") e mostrarlo nella card come metadata sotto il titolo. Non necessariamente pricing, ma un'indicazione del tipo di impegno.

**Impatto**: medio — qualifica i lead, riduce email esplorative
**Effort**: basso — nuovo campo frontmatter + markup
**File coinvolti**:
- Modifica: schema servizi in `src/content.config.ts`
- Modifica: `src/content/services/*.md`
- Modifica: `src/pages/servizi/index.astro`

---

## Priorita' suggerita

| Fase | Proposte | Motivazione |
|------|----------|-------------|
| 1 | A + B + C | Card layout + icone + animazioni. Trasformazione visiva immediata |
| 2 | F + E | Health Check come hero + articoli correlati. Struttura narrativa |
| 3 | D + G | Contenuti arricchiti + formato impegno. Richiede decisioni business |
