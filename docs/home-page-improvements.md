# Home Page — Report di miglioramento

## Struttura attuale

La homepage e' composta da 6 sezioni in sequenza verticale:

1. **Hero** — foto, headline, subtitle, 2 CTA
2. **PillarCards** — 3 card (Progettare, Verificare, Automatizzare)
3. **FeaturedProjects** — griglia 2 colonne con progetti selezionati
4. **FilteredPosts** — ultimi 6 articoli in griglia 3 colonne
5. **AboutBrief** — bio centrata con link a /about/ e CV
6. **ContactSection** — CTA "Parliamone" con email/LinkedIn

Ogni sezione usa `fade-in-section` per animazione allo scroll. Il design system e' coerente (token colore, Card, Badge, Button). L'header e' sticky con blur.

---

## Problemi identificati

### 1. Hero senza impatto visivo forte

L'hero ha una struttura solida (foto + testo + CTA) ma il background e' quasi invisibile: un pattern di punti a opacita' 3% e un blob amber a 8%. Il risultato e' che l'hero si confonde con il resto della pagina — non c'e' una separazione visiva netta tra "questo e' il punto di ingresso" e "queste sono le sezioni".

La foto 28x28/36x36 e' piccola rispetto allo spazio disponibile. L'accent corner (quadrato amber 6x6 sotto la foto) e' un dettaglio carino ma troppo piccolo per essere notato.

**File**: `src/components/home/Hero.astro` righe 32-46

### 2. PillarCards troppo anonime

Le 3 card pillar sono l'elemento identitario del sito (Progettare/Verificare/Automatizzare definiscono il posizionamento di Monte) ma sono visivamente indistinguibili da qualsiasi altra card del sito. L'unico elemento differenziante e' la lettera iniziale in un quadrato colorato (P, V, A) — troppo piccolo e astratto.

Le tagline sono efficaci ("Sistemi che reggono quando cresci") ma il layout non le valorizza. Su mobile le card collassano in colonna singola senza nessun trattamento speciale.

**File**: `src/components/home/PillarCards.astro`

### 3. Flusso narrativo interrotto

L'ordine attuale e':
- Hero (chi sei, cosa fai)
- Pillar (come lo fai)
- Progetti (dove lo hai fatto)
- Articoli (cosa scrivi)
- About (chi sei — di nuovo)
- Contatto (come parlare)

Il problema: **About e' ridondante dopo l'Hero**. L'hero gia' dice "Ciao, sono Monte" e il subtitle comunica il posizionamento. Ripetere una bio centrata 4 sezioni dopo spezza il ritmo senza aggiungere informazione. Inoltre i progetti vengono prima degli articoli, ma per un blog tecnico personale gli articoli sono il contenuto principale — dovrebbero avere piu' prominenza.

**File**: `src/pages/index.astro` righe 15-20 (ordine componenti)

### 4. Sezione articoli senza gerarchia

FilteredPosts mostra 6 card identiche in griglia 3x2. Come nella pagina blog, nessun post emerge. L'ultimo articolo pubblicato merita un trattamento diverso — e' il contenuto piu' fresco e quello che un visitatore di ritorno cerca.

Inoltre il link "Tutti gli articoli" e' nascosto nell'angolo destro del SectionHeading (invisibile su mobile, mostrato come link separato sotto la griglia).

**File**: `src/components/home/FilteredPosts.astro`

### 5. ContactSection troppo minimale

"Parliamone." con un bottone e due link di testo. Per una pagina che deve convertire visitatori in lead (il sito offre servizi di consulenza), questa sezione e' sottodimensionata. Non c'e' nessun elemento di trust (anni di esperienza, clienti serviti, certificazioni) e il CTA "Inizia dal Health Check" ripete esattamente il CTA dell'hero.

**File**: `src/components/home/ContactSection.astro`

### 6. Nessun social proof

La homepage non mostra nessun indicatore di credibilita': numero di articoli pubblicati, serie completate, tecnologie coperte, certificazioni, collaborazioni. Questi dati esistono (il blog ha 30+ articoli, 10+ serie) ma non vengono esposti.

### 7. Sezioni a sfondo alternato deboli

Le sezioni alternano tra sfondo trasparente e `bg-surface/50`. La differenza e' minima — su molti monitor non si percepisce. Le sezioni non hanno una separazione visiva chiara.

### 8. Nessun indicatore di scroll o continuita'

L'hero occupa quasi tutto il viewport. Non c'e' nessun segnale visivo (freccia, scroll indicator, contenuto parzialmente visibile) che inviti l'utente a scorrere e scoprire il resto della pagina.

---

## Proposte

### A. Hero con sfondo piu' definito

Rendere il background dell'hero piu' presente: aumentare l'opacita' del pattern a 5-8%, oppure sostituirlo con un gradient mesh sottile che sfuma dal base-light verso surface. Aggiungere una linea divisoria o un arco SVG in fondo all'hero per separarlo visivamente dalla sezione successiva.

Opzionale: aggiungere un indicatore di scroll (freccia animata o testo "Scorri" con chevron) in fondo all'hero.

**Impatto**: medio — l'hero guadagna presenza senza stravolgere il design
**Effort**: basso — solo CSS/SVG
**File coinvolti**:
- Modifica: `src/components/home/Hero.astro`

### B. PillarCards con identita' visiva piu' forte

Tre opzioni (non mutualmente esclusive):

**B1 — Icone SVG**: sostituire la lettera iniziale con un'icona SVG custom per ogni pillar (es. blueprint per Progettare, lente per Verificare, ingranaggio per Automatizzare). Piu' immediato della lettera.

**B2 — Hover con colore pillar**: al passaggio del mouse la card assume il colore del pillar come sfondo (al 10%) oltre al bordo laterale. Effetto sottile ma rende ogni card unica.

**B3 — Numero o statistica**: aggiungere sotto la tagline un dato concreto (es. "12 articoli" o "4 serie") preso dinamicamente dalla content collection. Trasforma le card da puramente decorative a informative.

**Impatto**: medio-alto — le card diventano l'ancora visiva della homepage
**Effort**: basso (B2), medio (B1, B3)
**File coinvolti**:
- Modifica: `src/components/home/PillarCards.astro`

### C. Riordino sezioni e rimozione AboutBrief

Nuovo ordine proposto:
1. Hero (chi sei, cosa fai)
2. PillarCards (come lo fai)
3. FilteredPosts (cosa scrivi — il contenuto principale sale)
4. FeaturedProjects (dove lo hai fatto)
5. ContactSection (come parlare)

**Rimuovere AboutBrief** dalla homepage. Le informazioni bio sono gia' nell'hero e nella pagina /about/. In alternativa, fondere i dati utili di AboutBrief (iscrizione Ordine Ingegneri, anni di esperienza) dentro la ContactSection come elementi di trust.

**Impatto**: alto — flusso narrativo piu' pulito e focalizzato
**Effort**: basso — riordino import in index.astro, nessun componente nuovo
**File coinvolti**:
- Modifica: `src/pages/index.astro`
- Eventuale modifica: `src/components/home/ContactSection.astro`

### D. Primo articolo "featured" nella sezione post

Come proposto anche nel report blog: il primo post (il piu' recente) viene mostrato in layout diverso — larghezza piena, titolo piu' grande, excerpt esteso. I restanti 4-5 post sotto in griglia 2 o 3 colonne.

**Impatto**: alto — da' immediatamente al visitatore un motivo per cliccare
**Effort**: medio — layout condizionale in FilteredPosts o nuovo componente
**File coinvolti**:
- Modifica: `src/components/home/FilteredPosts.astro`

### E. ContactSection con social proof

Aggiungere sotto il CTA una riga di "numeri" estratti dinamicamente:
- Articoli pubblicati (count dalla collection posts)
- Serie completate (count delle serie con 2+ post)
- Anni di esperienza (hardcoded o calcolato da una data di inizio)

Formato: `30+ articoli | 10 serie | 5+ anni di esperienza`

Differenziare il CTA dall'hero: l'hero punta al Health Check (conversione diretta), la ContactSection puo' puntare a "Scrivimi" (conversione soft) oppure mostrare entrambe le opzioni con piu' contesto.

**Impatto**: medio-alto — aggiunge credibilita' nel punto di conversione
**Effort**: basso-medio — fetch collection + markup
**File coinvolti**:
- Modifica: `src/components/home/ContactSection.astro`

### F. Separazione visiva tra sezioni

Sostituire l'alternanza `bg-surface/50` con separatori piu' definiti. Opzioni:

**F1 — Border top/bottom**: una linea `border-t border-border/40` tra le sezioni. Minimale e coerente con il design system.

**F2 — Gradiente di sfondo piu' marcato**: aumentare il contrasto dello sfondo alternato portando surface/50 a surface (opacita' piena). In dark mode il contrasto e' gia' accettabile.

**F3 — Forma SVG divisoria**: un arco o wave SVG tra hero e PillarCards (solo li', per non esagerare). Aggiunge personalita' senza appesantire.

**Impatto**: medio — migliora la leggibilita' della struttura
**Effort**: basso
**File coinvolti**:
- Modifica: componenti delle sezioni coinvolte

### G. Stats bar dopo l'hero

Aggiungere una barra orizzontale compatta tra Hero e PillarCards con 3-4 metriche chiave:
- Articoli pubblicati
- Serie attive
- Tecnologie trattate
- Anni di esperienza

Stile: sfondo accent-subtle, numeri grandi (text-2xl font-bold) con label piccole sotto. Tutta la barra e' un unico blocco, non card separate.

Questo elemento serve da "social proof immediato" prima che il visitatore decida se scrollare.

**Impatto**: medio — aggiunge credibilita' e riempie lo spazio tra hero e pillar
**Effort**: basso-medio — nuovo componente, fetch collection per conteggi
**File coinvolti**:
- Nuovo: `src/components/home/StatsBar.astro`
- Modifica: `src/pages/index.astro`

---

## Priorita' suggerita

| Fase | Proposte | Motivazione |
|------|----------|-------------|
| 1 | C + F1 | Riordino sezioni + separazione visiva. Zero rischio, massimo impatto sul flusso narrativo |
| 2 | D + E | Featured post + social proof nel CTA. Migliora conversione e engagement |
| 3 | A + B2 | Hero piu' presente + hover pillar. Raffinamento visivo |
| 4 | G + B1/B3 | Stats bar + icone/contatori pillar. Richiede piu' lavoro ma completa il quadro |
