# Style Guide — articoli del blog montelli.dev

Non è una raccolta di preferenze: è derivata dai sei articoli del corpus che già
funzionano. Dove una regola è stata estratta da un pezzo specifico, il pezzo è citato.

**Articoli di riferimento** (leggerne almeno uno prima di scrivere):

- `verificare/testing/mutation-testing-oltre-la-coverage` — storia e tesi
- `progettare/kafka/05-kafka-crash-recovery-strategie` — decisione e regola
- `progettare/keycloak/04-keycloak-e2e` — problemi di produzione in fila
- `verificare/observability/05-management` — how-to lungo con i costi
- `progettare/system-design/01-errori-produzione` — audit reale con numeri
- `altro/devcontainer/devcontainer` — pezzo breve, heading che affermano

**Lettore**: Tech Lead, CTO, Senior Engineer. Sa cos'è un container, cos'è la CI,
cos'è `async/await`. Non gli si spiega il mestiere.

---

## 0. Il modo, prima di tutto

Ogni articolo dichiara un `mode` nel frontmatter e ne rispetta uno solo. La
tassonomia è [Diátaxis](https://diataxis.fr/).

| `mode` | Serve a | Il lettore esce con |
|---|---|---|
| `explanation` | capire | una tesi che può ripetere |
| `how-to` | fare | un problema risolto |
| `tutorial` | imparare da zero | il primo successo |
| `reference` | consultare | un fatto trovato in fretta |

**Il corpus usa due modi su quattro**: 21 `explanation`, 22 `how-to`, zero
`tutorial`, zero `reference`. Non è un caso. Un pezzo che sta diventando
`tutorial` o `reference` di solito segnala che si sta scrivendo per il lettore
sbagliato — quello che deve ancora imparare la tecnologia, invece di quello che
deve decidere se adottarla.

**La regola operativa**: se un paragrafo appartiene a un modo diverso da quello
dichiarato, non si cancella e basta — si decide dove va. In `openItems`, in un
altro pezzo della serie, dietro un link, o via. Un `how-to` che digredisce sul
perché è rumore; un `explanation` che elenca comandi ha perso il filo.

## 1. Apertura

**Si apre su un sintomo, mai su una definizione.** Il primo `##` non è mai
"Cos'è X", "Introduzione", "Definizione", "Panoramica".

Tre aperture che funzionano, tre forme diverse:

- **Il sintomo diretto** — «Un consumer Kafka crasha. Cosa succede ai dati che
  stava processando?» (`kafka/05`)
- **Il contesto reale** — «Qualche mese fa ho fatto un audit di performance su un
  servizio di dispatch per una flotta di veicoli commerciali.» (`system-design/01`)
- **La convinzione da ribaltare** — «La maggior parte di noi si fida della propria
  suite di test. I test sono verdi, la coverage è alta.» (`mutation-testing`)

Quello che hanno in comune: entro tre frasi il lettore sa **cosa si rompe** e
**perché dovrebbe importargli**. Nessuna delle tre spiega cos'è la tecnologia.

**Lunghezza**: 2-4 paragrafi. Poi si entra.

**Niente indice in prosa.** `observability/05` apre con una lista "Struttura
dell'articolo" — è l'unico dei sei a farlo, e non va imitato: il componente `TOC`
è già nel layout, a destra.

## 2. La tesi

Ogni articolo ne ha una, ed è **una posizione, non un argomento**. «X è utile» non
è una tesi. «X invece di Y, perché Z» lo è.

Deve essere identificabile in una frase, e di solito sta in una sezione sua:

- `## La regola` (`kafka/05`) — con la tabella che la riassume
- `## La tesi` (`mutation-testing`) — «La coverage vi dice se il codice viene
  *eseguito*. Il mutation score vi dice se i test *funzionano*.»
- `## Il Denominatore Comune` (`system-design/01`)

Se scrivendo non trovi la tesi, il pezzo non è pronto: è una raccolta di appunti.

## 3. Il ponte con il business

**Una frase per articolo**, nella tesi o nella chiusura. Non due.

Il test è secco: **deve essere la frase che un Tech Lead ripete al proprio CFO.**
Se non la puoi dire a qualcuno che non scrive codice, non è un ponte con il
business — è un altro dettaglio tecnico.

Fa da modello `devcontainer`: «Il setup smette di essere conoscenza tribale e
diventa un file che si legge, si rivede in pull request e si corregge una volta
per tutti.»

Le tre leve legittime: velocità del team, riduzione dei guasti, costo
infrastrutturale. `observability/05` sceglie la terza e arriva a proiettare i
costi di storage a 12 mesi.

## 4. Heading

**Affermano qualcosa, non etichettano una categoria.** È la differenza più visibile
fra i pezzi buoni e quelli vecchi.

| Sì | No |
|---|---|
| `Ogni macchina configurata a mano diverge dalle altre` | `Introduzione` |
| `Il codice era sbagliato, i test restavano verdi` | `Caratteristiche Principali` |
| `Il conto da pagare, e come tenerlo basso` | `Vantaggi e Svantaggi` |
| `Problema 2: Token Cross-Client Accettati` | `Casi d'Uso` |

Regole meccaniche:

- **In italiano.** Niente `Deep Dive`, `Setup`, `Phase 1: Resource Creation`,
  `Common Debugging Patterns`. I nomi propri di tecnologie restano (`Tail
  Sampling`, `Schema Registry`) quando sono il termine tecnico corrente.
- **Sentence case**, non Title Case.
- **Niente emoji** negli heading.
- **Niente marcatori di lavorazione** pubblicati: `TODO`, `TO BE TESTED`,
  `[NUMERO DA FORNIRE]` non escono mai in produzione.

## 5. Rapporto con il frontmatter

Tre blocchi sono resi automaticamente dal layout. **Non vanno riscritti nel corpo.**

| Campo | Cosa rende | Nel corpo |
|---|---|---|
| `summary` | il box "In sintesi" in cima | mai un TL;DR |
| `openItems` | "Cosa resta aperto" in fondo | vedi sotto |
| — | `PostCTA.astro`, per categoria | mai una CTA, mai «per domande scrivimi» |

**Sui limiti c'è una sfumatura, e conta.** `openItems` sono confini in una riga.
Una sezione nel corpo serve quando il limite **richiede una spiegazione**:
`kafka/05` ha `## Limiti dichiarati` con quattro voci argomentate (graceful
shutdown, atomicità dei checkpoint, health check, backpressure) che in una riga
non starebbero. È corretto così.

Quello che non va è **ripetere in prosa ciò che `openItems` già dice**, o intitolare
la sezione "Limiti di questo tutorial" quando il campo esiste già.

## 6. Numeri e specificità

**Vincolo di verità: nessun numero che non sia vero.** Niente benchmark
verosimili, niente "circa il 30%", niente tempi inventati.

- Se il numero c'è, va usato: «93% di coverage», «da 10 a 22 test», «mutation
  score dal 65% al 92%», «400+ veicoli, 2000+ vincoli, 5000+ consegne».
- Se non c'è e servirebbe, si scrive `[NUMERO DA FORNIRE: <cosa serve>]` e si va
  avanti. Si risolve prima di pubblicare.
- Ogni numero in `summary` o `openItems` **deve comparire nel corpo**.
  `scripts/post-facts.py` lo verifica.

Usa il separatore decimale in modo coerente dentro lo stesso articolo.

## 7. Prosa

Da [Google Technical Writing](https://developers.google.com/tech-writing/one/short-sentences):

- **Un'idea per frase.** Se una subordinata è diventata un'idea autonoma, è una
  frase nuova.
- **Le enumerazioni dentro il periodo diventano liste.**
- **Via i riempitivi**: "è in grado di" → "può", "fornisce una descrizione
  dettagliata di" → "descrive", "in questo momento" → "ora".
- **Niente linguaggio da gatekeeping**: "ovviamente", "semplicemente", "banalmente",
  "come è noto". Se fosse ovvio non lo staresti scrivendo.

Seconda persona plurale o impersonale, come nel corpus. Non c'è una regola contro
la prima persona: le storie vere (`system-design/01`, `mutation-testing`) sono in
prima persona ed è giusto così.

## 8. Codice

- Blocco con il linguaggio dichiarato. `promql` non è supportato da Shiki: usare
  `plaintext`.
- **Commento che dice il file**, come nel corpus: `# consumer-usage/consumer.py`.
- Solo le righe che servono. `# ...error handling omesso...` è meglio di venti
  righe di rumore.
- Backtick inline per identificatori, comandi brevi, nomi di file.

## 9. Chiusura

Non finisce sull'ultimo blocco di codice. Due forme, entrambe valide:

- **La regola generalizzata** — `kafka/05` estende la tabella a casi non coperti
  dalla demo e chiude con la domanda da porsi: «cosa succede se processo lo stesso
  messaggio due volte?»
- **Cosa fare domani** — `mutation-testing` dà il primo passo concreto: un
  servizio, un comando, una soglia.

In entrambi i casi, nell'ultimo tratto sta la frase di business, e non c'è nessuna
CTA: la mette il layout.

## 10. Versione inglese

`index.en.md` nella stessa cartella. Non è una traduzione letterale ma un
adattamento — le regole stanno in `_strategy/writing-rules/personal.md` del vault.
`scripts/post-facts.py` segnala il drift quando il numero di heading diverge.

---

## Controllo prima di pubblicare

```bash
python3 scripts/post-facts.py <frammento-del-path>
```

Dà: modo dichiarato, lunghezza di titolo e description, numeri non ancorati,
marcatori di lavorazione, CTA nel corpo, doppioni strutturali, apertura
enciclopedica, heading sospetti in inglese, drift con la versione EN.

Le soglie sono indicative, non verdetti. Lo strumento conta, non giudica.
