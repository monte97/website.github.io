# Montelli Style Review

**Articolo**: `vue3-dry-patterns/index.md`
**Data review**: 2026-02-20
**Parole**: ~1809 (nella media bassa, accettabile per l'argomento)

---

## Punteggio Globale: 8/10

Articolo solido, ben strutturato e stilisticamente coerente con il blog. Le violazioni sono per lo piu' minori.

---

## Tono e Voce

**Valutazione**: Conforme

- Costruzioni impersonali predominanti per le spiegazioni tecniche: OK
- "Noi" inclusivo assente ma non necessario dato il taglio pragmatico
- "Tu" diretto assente anche nell'hook iniziale: lieve deviazione dal pattern abituale

| # | Violazione | Severita' |
|---|-----------|-----------|
| 1 | L'introduzione non usa un hook con domanda retorica o "tu" diretto. Apre con una constatazione impersonale ("Nelle SPA di grandi dimensioni...") invece del pattern tipico con domanda/problema personale | **Minor** |

---

## Struttura

**Valutazione**: Conforme

- 5 H2, 9 H3: nella norma
- Progressione logica chiara: problema -> soluzione -> quando usarlo (ripetuta per ogni pattern)
- Separatori `---` tra sezioni principali: OK
- Albero decisionale come riepilogo: efficace

| # | Violazione | Severita' |
|---|-----------|-----------|
| 2 | Manca una conclusione con riepilogo esplicito dei punti chiave in lista puntata. Il paragrafo finale funge da conclusione ma non segue il pattern "Abbiamo visto come: 1. ... 2. ... 3. ..." | **Major** |
| 3 | Nessuna anticipazione di articoli successivi o call-to-action chiara oltre la sezione risorse | **Minor** |

---

## Formattazione

**Valutazione**: Conforme

- Paragrafi corti (2-4 frasi): OK
- Bold per concetti chiave: OK
- Italic per citazione Sandi Metz: OK
- Liste puntate con bold + spiegazione: OK
- H2 con sottotitolo esplicativo per i pattern: OK

| # | Violazione | Severita' |
|---|-----------|-----------|
| 4 | Nessuna violazione rilevata | — |

---

## Code Blocks

**Valutazione**: Buona, con margini di miglioramento

- Linguaggi sempre specificati (`javascript`, `typescript`, `vue`): OK
- Commenti con path file presenti nei blocchi chiave: OK
- Lunghezza blocchi ragionevole (max ~45 righe per il template lungo): OK
- Albero decisionale in blocco senza linguaggio specificato (usa code fence vuoto): accettabile, potrebbe usare `text`

| # | Violazione | Severita' |
|---|-----------|-----------|
| 5 | Il primo code block (righe 29-41) usa `javascript` ma il composable successivo (righe 49-71) usa `typescript`. Il primo blocco rappresenta codice Vue 3 setup e sarebbe piu' coerente come `typescript` o almeno consistente con il resto | **Minor** |
| 6 | L'albero decisionale (righe 420-438) non specifica il linguaggio del code fence. Dovrebbe usare `text` come da style guide per diagrammi | **Minor** |

---

## Link e Riferimenti

**Valutazione**: Parzialmente conforme

- Sezione "Risorse Utili" presente a fine articolo: OK
- Link a documentazione ufficiale Vue: OK
- Link a repo demo: OK

| # | Violazione | Severita' |
|---|-----------|-----------|
| 7 | Il repo demo e' menzionato nell'introduzione come `nuxt3-pinia-patterns` ma nella sezione Risorse il link punta a `pinia-vue-demo`. Incoerenza nel nome | **Major** |
| 8 | Il link al repo nell'introduzione non e' cliccabile (solo testo in backtick, non un link markdown) | **Minor** |
| 9 | Manca l'emoji 👉 per il link al repo, usata abitualmente nel blog | **Minor** |

---

## Frontmatter

**Valutazione**: Buona

- Titolo descrittivo con keyword: OK (76 caratteri, leggermente lungo)
- Description presente: OK (156 caratteri, leggermente sopra il target 120-150)
- Tags in PascalCase: OK
- `reviewed: false`: corretto
- `draft: true`: presente, corretto per articolo in lavorazione

| # | Violazione | Severita' |
|---|-----------|-----------|
| 10 | La description contiene apostrofi ASCII (`piu'`) invece di apostrofi tipografici o, meglio, la forma estesa "piu" con accento (`più`). Questo vale per tutto l'articolo: tutti gli accenti sono sostituiti da apostrofi (`cosi'`, `piu'`, `perchè` scritto come `perche'`, ecc.) | **Major** |

---

## Immagini

**Valutazione**: N/A

Nessuna immagine presente. Per un articolo su pattern di codice, l'assenza e' accettabile. Un diagramma dell'albero decisionale in formato immagine potrebbe migliorare la leggibilita'.

| # | Violazione | Severita' |
|---|-----------|-----------|
| — | Nessuna violazione | — |

---

## Riepilogo Violazioni

| # | Descrizione | Severita' |
|---|-------------|-----------|
| 1 | Hook introduttivo senza domanda retorica o "tu" diretto | Minor |
| 2 | Manca conclusione con riepilogo in lista puntata | Major |
| 3 | Nessuna call-to-action o anticipazione next steps | Minor |
| 5 | Linguaggio code fence incoerente (`javascript` vs `typescript`) | Minor |
| 6 | Albero decisionale senza `text` come linguaggio del code fence | Minor |
| 7 | Nome repo incoerente tra intro e sezione Risorse | Major |
| 8 | Link repo non cliccabile nell'introduzione | Minor |
| 9 | Manca emoji 👉 per link repo | Minor |
| 10 | Apostrofi ASCII al posto di caratteri accentati in tutto l'articolo (`piu'`, `cosi'`, `perche'`) | Major |

**Major**: 3 | **Minor**: 6
