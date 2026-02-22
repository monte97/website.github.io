# Montelli Style Review — akka-pekko-migrazione

**Data review**: 2026-02-20 (seconda iterazione)
**Parole**: ~1600 (sotto la media di ~2500, accettabile per il tipo di articolo)

---

## Punteggio: 8/10

Articolo solido, ben strutturato, con un taglio pratico coerente con lo stile del blog. Rispetto alla review precedente (7/10), le violazioni principali sono state risolte: aggiunta l'introduzione con hook, la sezione Risorse Utili, e i separatori visivi. Le violazioni residue sono tutte minori.

---

## Tono e Voce

| # | Rilievo | Severita |
|---|---------|----------|
| 1 | Costruzioni impersonali predominanti, coerente con la style guide. Buon uso del "noi" inclusivo nelle conclusioni ("abbiamo visto"). | OK |
| 2 | L'hook introduttivo ("Come gestire un ecosistema in produzione quando...") e' una domanda retorica valida ma generica rispetto ai pattern del blog, che usano scenari concreti e provocatori ("Quante volte hai sentito...", "Ammettiamolo: tutti abbiamo iniziato cosi"). Manca un momento di connessione diretta con il "tu". | **Minor** |
| 3 | Opinioni supportate da dati concreti ("mezza giornata", "50 file") — coerente con la regola della style guide. | OK |

---

## Struttura

| # | Rilievo | Severita |
|---|---------|----------|
| 4 | Progressione logica eccellente: contesto -> soluzione -> checklist -> esperienza reale -> gotcha -> demo -> conclusioni. Segue il pattern Problema/Teoria/Pratica. | OK |
| 5 | 6 H2, 7 H3 — nella media (style guide: 7.5 H2, 9.6 H3). | OK |
| 6 | Introduzione con hook presente (risolto rispetto alla review precedente). Domanda retorica + contesto + dichiarazione di intenti. | OK |
| 7 | Conclusione con riepilogo numerato + frase di chiusura ("Il cambio di licenza e' un problema risolto"). Manca una "punch line" piu' impattante rispetto al pattern del blog ("Ora puoi buttare via tutti quegli script port-forward"). | **Minor** |
| 8 | La sezione "Demo" e' un po' scarna. Mancano 1-2 frasi su cosa ci si aspetta di vedere nell'output dopo `docker compose up`. | **Minor** |

---

## Formattazione

| # | Rilievo | Severita |
|---|---------|----------|
| 9 | Paragrafi ben dimensionati (2-4 frasi), una idea per paragrafo. | OK |
| 10 | Bold usato correttamente per concetti chiave e termini importanti. | OK |
| 11 | Separatori `---` presenti tra sezioni principali (risolto rispetto alla review precedente). | OK |
| 12 | Liste puntate con bold + spiegazione, liste numerate per step — pattern corretto. | OK |
| 13 | Code inline per namespace, classi, comandi — corretto. | OK |

---

## Code Blocks

| # | Rilievo | Severita |
|---|---------|----------|
| 14 | Linguaggio sempre specificato (`scala`, `hocon`, `bash`). | OK |
| 15 | Commenti `// Prima` / `// Dopo` e `# Prima` / `# Dopo` chiari e consistenti. Pattern prima/dopo molto leggibile. | OK |
| 16 | Lunghezza appropriata (tutti sotto 20 righe). | OK |
| 17 | Il blocco `application.conf` usa `hocon` come linguaggio — preciso e corretto. | OK |

---

## Frontmatter

| # | Rilievo | Severita |
|---|---------|----------|
| 18 | Titolo "Akka e' morto, lunga vita a Pekko" — stile provocatorio efficace, 39 caratteri. Non segue il pattern "Argomento: Sottotitolo esplicativo" ma e' una variazione stilistica accettabile. | **Minor** |
| 19 | Description a 96 caratteri — sotto il range raccomandato di 120-150 per SEO. Suggerimento: espandere, ad es. "Guida pratica alla migrazione da Akka a Apache Pekko in produzione: checklist completa, gotcha reali e lezioni apprese dal campo". | **Minor** |
| 20 | Tags (5) in PascalCase — coerente. Potrebbe beneficiare di 1-2 tag aggiuntivi: `ApacheKafka`, `OpenSource`. | OK |
| 21 | `reviewed: false` con `draft: true` — coerente (risolto rispetto alla review precedente dove era `reviewed: true`). | OK |
| 22 | Campo `reproducibility: true` presente ma non documentato nella style guide. Nota informativa. | OK |

---

## Link e Riferimenti

| # | Rilievo | Severita |
|---|---------|----------|
| 23 | Sezione "Risorse Utili" presente e ben formattata con bold + link + descrizione (risolto rispetto alla review precedente). | OK |
| 24 | Link al repo demo con emoji 👉 in formato prominente — coerente con il pattern del blog. | OK |
| 25 | Manca un link inline all'annuncio Lightbend nel primo paragrafo dove si menziona il cambio licenza. Il link compare solo nelle risorse finali. La style guide raccomanda di linkare inline quando si cita uno strumento o un fatto. | **Minor** |

---

## Immagini

| # | Rilievo | Severita |
|---|---------|----------|
| 26 | Nessuna immagine presente. Accettabile per un articolo di migrazione prevalentemente testuale/code. Un diagramma ASCII della mappatura namespace potrebbe aggiungere valore ma non e' necessario. | OK |

---

## Riepilogo Violazioni

| # | Descrizione | Severita |
|---|-------------|----------|
| 2 | Hook introduttivo generico, manca scenario concreto con "tu" diretto | Minor |
| 7 | Frase di chiusura poco impattante rispetto al pattern del blog | Minor |
| 8 | Sezione Demo scarna — manca descrizione output atteso | Minor |
| 18 | Titolo non segue il pattern "Argomento: Sottotitolo" (39 char vs 50-80) | Minor |
| 19 | Description sotto i 120 caratteri raccomandati per SEO (96 char) | Minor |
| 25 | Link all'annuncio Lightbend mancante inline nel testo | Minor |

**Violazioni maggiori**: 0
**Violazioni minori**: 6

---

## Miglioramenti rispetto alla review precedente (7/10 -> 8/10)

- [x] Aggiunta introduzione con hook prima del primo H2
- [x] Aggiunta sezione "Risorse Utili" con link strutturati
- [x] Aggiunti separatori visivi `---` tra sezioni
- [x] Risolta incoerenza `reviewed: true` / `draft: true`

---

## Suggerimenti per portare a 9/10

1. Espandere la description a 120-150 caratteri per SEO
2. Rendere l'hook piu' concreto (es. "Il tuo servizio Scala gira su Akka 2.6 da tre anni. Un giorno scopri che la licenza e' cambiata...")
3. Aggiungere link inline all'annuncio Lightbend nel primo paragrafo
4. Nella sezione Demo, descrivere brevemente l'output atteso
5. Chiudere con una frase piu' incisiva (es. "La migrazione piu' spaventosa e' quella che non fai")
