# About Page — Report di miglioramento

## Struttura attuale

La pagina `/about/` e' composta da 5 sezioni verticali:

1. **Bio** — foto rotonda (128px) + titolo + paragrafo bio
2. **Stack tecnologico** — griglia 6 colonne di icone tecnologia (SkillGrid)
3. **Esperienze** — timeline verticale con dot accent
4. **Istruzione** — stessa timeline
5. **Pubblicazioni** — lista con bordo sinistro accent
6. **Scarica CV** — bottone centrato

Usa PageLayout (max-w-5xl). Nessuna animazione applicata (niente `fade-in-section`).

---

## Problemi identificati

### 1. Nessuna animazione

A differenza della homepage, la pagina About non usa `fade-in-section` ne' `stagger-children`. Tutte le sezioni appaiono istantaneamente. Considerando che la pagina e' lunga (bio + skill + esperienze + istruzione + pubblicazioni), lo scroll risulta statico e piatto.

**File**: `src/pages/about/index.astro` — nessuna classe di animazione

### 2. SkillGrid senza filtri

Il file `src/data/skills.ts` definisce `skillFilters` (Tutti, Linguaggi, Container, Framework, Database, DevOps, Cloud) ma SkillGrid non li usa. Mostra tutte le skill in una griglia piatta senza nessuna possibilita' di filtro o raggruppamento. Con 15 skill, la griglia e' un muro di icone senza struttura.

**File**: `src/components/about/SkillGrid.astro` — nessun riferimento a `skillFilters` o `categories`

### 3. SkillGrid senza raggruppamento visivo

Le skill non sono raggruppate per categoria. Kubernetes sta accanto a Go, che sta accanto a Docker, che sta accanto a Prometheus. Non c'e' logica visiva — l'utente deve scansionare tutte le icone per capire il profilo tecnico.

**File**: `src/components/about/SkillGrid.astro`

### 4. Bio sezione troppo minimale

La foto e' rotonda 128px — piu' piccola di quella dell'hero homepage (che e' 144px su desktop). La bio e' un singolo paragrafo senza nessun elemento differenziante. Non c'e' tagline, non ci sono "numeri" (anni di esperienza, articoli, tecnologie). Per una pagina "Chi sono" di un freelance, manca personalita'.

**File**: `src/pages/about/index.astro` righe 37-50

### 5. Timeline senza logo azienda

I dati `experiences.ts` includono `logo` per alcune aziende (es. Consorzio Ediltecnica) ma la Timeline non lo mostra. Tutte le entry hanno lo stesso dot accent senza distinzione visiva.

**File**: `src/components/about/Timeline.astro` — nessun prop `logo`

### 6. Pubblicazioni disconnesse dal contesto

Le pubblicazioni sono in ambito geomatica/3D surveying — non software engineering. Senza contesto, un visitatore potrebbe chiedersi perche' sono li'. Manca una breve nota che spieghi il ruolo (supervisione tesi, membro comitato tecnico-scientifico).

**File**: `src/pages/about/index.astro` sezione pubblicazioni

### 7. CTA finale debole

Il bottone "Scarica CV" e' isolato in fondo alla pagina senza contesto. Non c'e' un ponte verso i servizi o il contatto. Un visitatore che arriva in fondo alla pagina About e' un lead caldo — meriterebbe un CTA piu' ricco.

**File**: `src/pages/about/index.astro` righe finali

### 8. Dati author.ts incoerenti

`author.summary` contiene frasi in inglese generiche ("I am a Developer", "I love servers") che non riflettono il posizionamento attuale del sito e non sono usate da nessuna parte. Sono residui della migrazione dal tema Hugo Toha.

**File**: `src/data/author.ts` righe 10-15

---

## Proposte

### A. Animazioni fade-in su tutte le sezioni

Aggiungere `fade-in-section` a ogni `<section>` della pagina About. Le sezioni appaiono con transizione allo scroll, coerente con la homepage.

**Impatto**: medio — la pagina smette di essere statica
**Effort**: basso — aggiungere una classe CSS a ogni section
**File coinvolti**:
- Modifica: `src/pages/about/index.astro`

### B. SkillGrid raggruppato per categoria

Sostituire la griglia piatta con sezioni raggruppate. Ogni categoria (`skillFilters`) diventa un gruppo con label (es. "Linguaggi", "Container & Orchestration", "Framework") e le skill sotto. Opzionale: layout piu' compatto (badge con icona + nome invece di card standalone).

**Impatto**: alto — il profilo tecnico diventa leggibile a colpo d'occhio
**Effort**: medio — modifica a SkillGrid per raggruppare per `categories[0]`
**File coinvolti**:
- Modifica: `src/components/about/SkillGrid.astro`

### C. Bio sezione con piu' personalita'

Aggiungere sotto la bio una riga di metriche (come proposto per la homepage):
- Anni di esperienza
- Articoli pubblicati (fetch dalla collection)
- Tecnologie nello stack

Opzionale: aggiungere una tagline/titolo professionale sopra la bio (es. "Backend Engineer & DevOps Consultant") per chi arriva direttamente su /about/ senza passare dalla homepage.

**Impatto**: medio — la bio diventa piu' informativa
**Effort**: basso — poche righe di markup + opzionale fetch collection
**File coinvolti**:
- Modifica: `src/pages/about/index.astro`

### D. Timeline con logo azienda

Quando il dato `logo` e' presente, mostrarlo al posto del dot accent. Per le entry senza logo, mantenere il dot attuale. Aggiunge riconoscibilita' visiva alla timeline.

**Impatto**: basso-medio — miglioramento incrementale
**Effort**: basso — modifica a Timeline, prop condizionale
**File coinvolti**:
- Modifica: `src/components/about/Timeline.astro`
- Modifica: `src/pages/about/index.astro` (passare logo nelle items)

### E. Pubblicazioni con nota di contesto

Aggiungere una breve introduzione prima della lista pubblicazioni: "Sono membro del Comitato Tecnico-Scientifico di Operai dell'Arte APS. Ho supervisionato tesi di laurea e collaborato a pubblicazioni peer-reviewed in ambito geomatica e patrimonio culturale."

**Impatto**: medio — elimina confusione su pubblicazioni non-IT
**Effort**: basso — una riga di testo
**File coinvolti**:
- Modifica: `src/pages/about/index.astro`

### F. CTA finale con ponte ai servizi

Sostituire il bottone CV isolato con una sezione piu' ricca:
- Titolo: "Lavoriamo insieme?"
- Sottotitolo: breve frase che linka ai servizi
- Due CTA affiancati: "Vedi i servizi" (secondary) + "Scarica CV" (primary)
- Opzionale: link a contatto email

**Impatto**: medio — migliora la conversione per lead caldi
**Effort**: basso — markup
**File coinvolti**:
- Modifica: `src/pages/about/index.astro`

### G. Pulizia dati residui Hugo

Rimuovere o aggiornare `author.summary` in `author.ts`. Se non e' usato da nessun componente, rimuoverlo. Se serve, riscriverlo in italiano coerente con il posizionamento.

**Impatto**: basso — pulizia tecnica
**Effort**: basso
**File coinvolti**:
- Modifica: `src/data/author.ts`

---

## Priorita' suggerita

| Fase | Proposte | Motivazione |
|------|----------|-------------|
| 1 | A + E + G | Quick wins: animazioni, nota pubblicazioni, pulizia dati. Zero rischio |
| 2 | B + C | SkillGrid raggruppato + bio con metriche. Cambio visivo piu' impattante |
| 3 | D + F | Logo in timeline + CTA ricco. Completamento |
