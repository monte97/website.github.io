# Montelli Style Review — pekko-streams-kafka/index.md

**Data**: 2026-02-20
**Parole**: ~1985
**Punteggio complessivo**: 8/10

---

## Frontmatter

| Check | Esito | Severita |
|-------|-------|----------|
| Titolo 50-80 caratteri | 65 caratteri — OK | — |
| Description 120-150 caratteri | 106 caratteri — leggermente corta | Minor |
| Tags PascalCase | OK | — |
| Categories presenti | OK | — |
| `reviewed: false` presente | OK | — |
| Campo `reproducibility: true` | Non documentato nella style guide, ma non problematico | — |

**Violazione Minor**: La `description` e' sotto i 120 caratteri raccomandati (106). Allungarla leggermente migliorerebbe la SEO preview.

---

## Tono e Voce

L'articolo rispetta bene il registro tecnico-divulgativo della guida. Usa:

- **"Tu" diretto** nell'hook di apertura: "Hai mai avuto un attore Pekko che blocca il dispatcher..." — coerente con il pattern hook.
- **Costruzioni impersonali** nel corpo: "La separazione puo' essere implementata...", "Va notato che..." — predominante e corretto.
- **"Noi" inclusivo** nelle conclusioni: "abbiamo visto come..." — in linea con la guida.

Nessuna violazione.

---

## Struttura

| Check | Esito | Severita |
|-------|-------|----------|
| Hook con problema concreto | Presente e efficace (domanda retorica + scenario reale) | — |
| Progressione logica | Problema -> Soluzione -> Pattern 1 -> Pattern 2 -> Dettagli -> Demo -> Conclusioni | — |
| Conclusione con riepilogo | Lista numerata con 4 punti chiave — OK | — |
| Call-to-action / next steps | Presente ("Il passo successivo naturale...") | — |
| Sezione Risorse Utili | Presente con 4 link — OK | — |
| Separatori `---` tra sezioni | Presenti — OK | — |

**Violazione Minor**: Manca una breve introduzione contestuale tra il frontmatter e il primo H2. Gli altri articoli del blog hanno 1-2 paragrafi introduttivi prima del primo heading, con dichiarazione di intenti ("In questo articolo vedremo..."). Qui si entra direttamente nel primo H2 senza un paragrafo di contesto globale.

**Violazione Minor**: L'H2 di apertura "Il pattern di partenza: while(true) dentro un attore" contiene sia l'hook sia 4 sottopunti dettagliati senza H3. La sezione e' lunga (~230 parole + codice) e beneficerebbe di sottosezioni, anche se i punti numerati con bold fungono da struttura visiva.

---

## Formattazione

| Check | Esito | Severita |
|-------|-------|----------|
| Paragrafi 2-4 frasi | Rispettato nella maggior parte dei casi | — |
| Bold per concetti chiave | Usato correttamente | — |
| Code inline per comandi/API | Usato correttamente (`poll()`, `Source.queue`, `ConcurrentHashMap`, ecc.) | — |
| Liste con 3-7 elementi + bold | Rispettato | — |
| Nessun muro di testo | OK | — |

**Violazione Minor**: Il punto 1 dei 4 problemi (thread bloccanti, riga 41) e' un singolo paragrafo di 6 frasi, sopra il limite raccomandato di 5.

---

## Code Blocks

| Check | Esito | Severita |
|-------|-------|----------|
| Linguaggio specificato | OK tranne un blocco | Major |
| Commenti esplicativi | Presenti nel 70%+ dei blocchi | — |
| Max 30-40 righe | Il blocco Pattern 2 ha ~57 righe | Minor |
| Path file indicato dove rilevante | Menzionato nel testo ma non nei commenti del blocco | Minor |

**Violazione Major**: Il blocco alle righe 281-290 (output della demo) non specifica il linguaggio. Dovrebbe usare ` ```text ` secondo la style guide ("Usa `text` per output, diagrammi ASCII, log").

**Violazione Minor**: Il blocco di codice del Pattern 2 (righe 139-196) e' di circa 57 righe, sopra il limite raccomandato di 30-40. Valutare di spezzarlo in due blocchi separati (configurazione stato + consumer threads) con testo esplicativo intermedio.

**Violazione Minor**: I blocchi Scala non indicano il path del file nel commento iniziale. Il testo menziona "Launcher.scala" e "EnrichmentState", ma la style guide suggerisce un commento tipo `// src/main/scala/Launcher.scala` come prima riga.

---

## Link e Riferimenti

| Check | Esito | Severita |
|-------|-------|----------|
| Link a documentazione ufficiale | Presenti (Pekko, Pekko Connectors Kafka, Apicurio, Kafka) | — |
| Link repo demo prominente | Presente con emoji — OK | — |
| Descrizioni esplicite (no "clicca qui") | OK | — |
| Sezione Risorse Utili a fine articolo | Presente e ben formattata | — |

Nessuna violazione.

---

## Immagini

Nessuna immagine presente nell'articolo. Non e' una violazione, ma un diagramma architetturale (anche ASCII art) che mostri il flusso prima/dopo sarebbe un valore aggiunto significativo per un articolo incentrato su pattern architetturali.

---

## Riepilogo Violazioni

| # | Violazione | Severita |
|---|-----------|----------|
| 1 | Blocco output demo senza linguaggio specificato (manca ` ```text `) | Major |
| 2 | Manca introduzione contestuale prima del primo H2 | Minor |
| 3 | Description frontmatter sotto i 120 caratteri | Minor |
| 4 | Blocco codice Pattern 2 troppo lungo (~57 righe) | Minor |
| 5 | Path file non indicato nei commenti dei code block | Minor |
| 6 | Sezione iniziale lunga senza H3 di supporto | Minor |
| 7 | Paragrafo punto 1 (thread bloccanti) supera le 5 frasi | Minor |

---

## Punti di Forza

- Hook efficace e concreto con scenario reale e domanda diretta
- Progressione logica chiara: problema -> due soluzioni distinte con motivazioni esplicite
- Ottimo equilibrio tra teoria e codice pratico
- Conclusioni ben strutturate con riepilogo numerato e next steps
- Sezione demo completa con istruzioni di riproduzione
- Sezione Risorse Utili presente e ben curata
- Tono coerente con il resto del blog (mix tu/impersonale/noi)
- Separatori visivi tra sezioni presenti
