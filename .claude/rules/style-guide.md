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
`tutorial`, zero `reference`. Non è un vincolo tecnico, è il registro: questo blog
punta al lettore che deve *decidere*, non a quello che deve ancora imparare la
tecnologia. `tutorial` e `reference` servono un altro lettore e stanno altrove —
nella documentazione di un progetto, non qui.

Se un pezzo sta scivolando verso quei due modi, non è un errore da correggere a
tutti i costi: è il segnale che vale la pena chiedersi per chi si sta scrivendo.

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

**Niente indice in prosa, in nessun caso.** Il componente `TOC` è già nel layout,
a destra, e si aggiorna da solo. Ripetere la mappa in apertura ruba le righe che
dovrebbero agganciare il lettore.

Vietato l'elenco delle sezioni, vietata anche la sua forma breve — «da qui in
avanti: A, poi B, poi C». `observability/05` apre con una lista "Struttura
dell'articolo": è l'unico dei sei campioni a farlo, e non va imitato.

## 2. Lunghezza

**Tetto morbido: ~2000 parole.** Non è un limite, è una soglia oltre la quale
serve una ragione.

Le ragioni buone sono due: un `how-to` in cui il codice occupa spazio reale, o un
`explanation` che regge una tesi complessa senza digressioni. La ragione cattiva è
una sola, ed è la più frequente: **sono due articoli.**

È il criterio che ha diviso `testing/01-intro` in due — 2233 parole che erano un
pezzo sul contesto di misura e uno sui metodi RED e USE, incollati.

Sotto le 2000 nessuna regola: `mutation-testing` sta in 1312 parole ed è fra i
migliori del corpus.

## 3. La tesi

Ogni articolo ne ha una, ed è **una posizione, non un argomento**. «X è utile» non
è una tesi. «X invece di Y, perché Z» lo è.

Deve essere identificabile in una frase, e di solito sta in una sezione sua:

- `## La regola` (`kafka/05`) — con la tabella che la riassume
- `## La tesi` (`mutation-testing`) — «La coverage vi dice se il codice viene
  *eseguito*. Il mutation score vi dice se i test *funzionano*.»
- `## Il Denominatore Comune` (`system-design/01`)

Se scrivendo non trovi la tesi, il pezzo non è pronto: è una raccolta di appunti.

## 4. Il ponte con il business

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

## 5. Heading

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

## 6. Rapporto con il frontmatter

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

### Il campo `reviewed`

Ha un significato stretto e verificabile: **`human` vuol dire che l'autore ha
riletto il testo dopo l'ultima modifica.** Nient'altro.

- Qualsiasi modifica al corpo lo riporta a `false`, chiunque l'abbia fatta.
- `machine` è una bozza passata sotto la style guide ma non ancora letta dall'autore.
- Solo l'autore mette `human`.

Serve a rispondere a una domanda sola: cosa è passato davvero sotto i suoi occhi.
Un campo che dice `human` su un articolo con due `TODO` pubblicati — com'era
`01-keycloak-intro` — non è un'informazione, è rumore.

## 7. Numeri e specificità

**Vincolo di verità: nessun numero che non sia vero.** Niente benchmark
verosimili, niente "circa il 30%", niente tempi inventati.

- Se il numero c'è, va usato: «93% di coverage», «da 10 a 22 test», «mutation
  score dal 65% al 92%», «400+ veicoli, 2000+ vincoli, 5000+ consegne».
- Se non c'è e servirebbe, si scrive `[NUMERO DA FORNIRE: <cosa serve>]` e si va
  avanti. Si risolve prima di pubblicare.
- Ogni numero in `summary` o `openItems` **deve comparire nel corpo**.
  `scripts/post-facts.py` lo verifica.

Usa il separatore decimale in modo coerente dentro lo stesso articolo.

## 8. Prosa

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

## 9. Codice

- Blocco con il linguaggio dichiarato. `promql` non è supportato da Shiki: usare
  `plaintext`.
- **Commento che dice il file**, come nel corpus: `# consumer-usage/consumer.py`.
- Solo le righe che servono. `# ...error handling omesso...` è meglio di venti
  righe di rumore.
- Backtick inline per identificatori, comandi brevi, nomi di file.

## 10. Immagini

**Nessuna regola sul numero.** I due mutation-testing non ne hanno nessuna e sono
fra i pezzi migliori; `04-correlation` ne ha otto e servono tutte. Un'immagine entra
se mostra qualcosa che il testo non può dire: uno schema di architettura, un
waterfall, un prima/dopo con numeri sopra.

**Una regola sull'`alt`, e vale sempre.** L'alt descrive **cosa mostra l'immagine e
cosa il lettore dovrebbe notarci**. Non è un'etichetta, non è il nome del file, non
ripete la didascalia.

| Sì | No |
|---|---|
| `Rappresentazione della gerarchia fra processi nel namespace PID: lo stesso processo ha identificativi diversi a seconda del livello da cui viene osservato` | `Gerchia PID` |
| `Dashboard Stryker con score 65%, 12 mutanti sopravvissuti su 10 test, e le barre per i tre servizi` | `stryker-65` |
| `Pipeline del Collector: receiver, processor ed exporter in sequenza, con più destinazioni in uscita` | `otel_pipeline` |

Serve a chi usa uno screen reader, e serve a te: un alt che non riesci a scrivere
di solito segnala un'immagine che non stava aggiungendo niente.

## 11. Chiusura

Non finisce sull'ultimo blocco di codice. Due forme, entrambe valide:

- **La regola generalizzata** — `kafka/05` estende la tabella a casi non coperti
  dalla demo e chiude con la domanda da porsi: «cosa succede se processo lo stesso
  messaggio due volte?»
- **Cosa fare domani** — `mutation-testing` dà il primo passo concreto: un
  servizio, un comando, una soglia.

In entrambi i casi, nell'ultimo tratto sta la frase di business, e non c'è nessuna
CTA: la mette il layout.

## 12. Articoli in serie

**Il pezzo N può aprire richiamando dove eravamo rimasti.** Chi legge una serie la
legge in ordine, e fingere che ogni articolo nasca dal nulla costa al lettore un
riorientamento a ogni puntata.

Il richiamo però non sostituisce l'apertura: viene **dopo** il sintomo, non al posto
suo. Prima si dice cosa si rompe, poi si dice da dove veniamo.

- Fa da modello `05-management`: «Nel tutorial precedente abbiamo strumentato un
  e-commerce e risolto tre scenari di debug. C'è un dettaglio che però non abbiamo
  affrontato: ogni request genera una trace che viene salvata in modo indefinito.»
- Il rimando in avanti si mette dove serve, non in fondo per dovere: «quella misura
  è il tema di [tail sampling e retention](...)».

**Se la serie ha una landing** — come `observability` — quella fa da cappello, e i
pezzi possono appoggiarcisi invece di ripetere le premesse. Se non ce l'ha, ogni
pezzo si porta i propri prerequisiti con un link nel corpo, dove servono.

**Un prerequisito si dichiara con un link interno.** Mandare il lettore fuori sito
per capire il proprio articolo — come faceva `04-correlation` — significa che il
pezzo che glielo spiega non esiste, o che nessuno l'ha collegato.

## 13. Versione inglese

`index.en.md` nella stessa cartella. **Non e' una traduzione: e' un adattamento**, e
l'italiano e' la sorgente di verita'.

Riferimenti da leggere prima di scriverne una, perche' la voce di casa e' gia' li':

- `progettare/kafka/05-kafka-crash-recovery-strategie/index.en.md`
- `progettare/keycloak/04-keycloak-e2e/index.en.md`

Sono fedeli nella struttura e idiomatici nella formulazione:

| Italiano | Inglese |
|---|---|
| «e' uno scenario comune» | «is a familiar story» — non «is a common scenario» |
| «La risposta non dipende da Kafka, ma dal tipo di stato» | «The answer does not depend on Kafka — it depends on the type of state» |

Le regole:

1. **Stessa voce.** Prima persona dove l'italiano la usa, stessa direttezza, stessa
   presa di posizione. Un pezzo opinionated in italiano resta opinionated in inglese.
2. **Stessa struttura.** Stessi heading, stesso ordine, stesso numero di sezioni.
   Gli heading si traducono, non si riorganizzano.
3. **Stessa lunghezza.** Non si accorcia per "adattare".
4. **Niente registro da blog aziendale.** Vietati «In this article we will explore...»,
   «It is worth noting that...», «Let's dive into...».
5. **Il codice non si traduce.** Restano identici comandi, nomi di file, chiavi YAML e
   output. Si traducono i commenti dentro il codice, se erano in italiano.
6. **I link interni** puntano alla versione inglese quando esiste, all'italiana quando
   non esiste. Si verifica che il file di destinazione ci sia, non si indovina.

`scripts/post-facts.py` segnala il drift quando il numero di heading diverge: a lavoro
finito deve essere 0, perche' la struttura e' la stessa.

**Nota:** `_strategy/writing-rules/personal.md` ha regole EN che valgono per i post
LinkedIn, non per il blog. Il principio dell'adattamento e' lo stesso, il resto no.

## Controllo prima di pubblicare

```bash
python3 scripts/post-facts.py <frammento-del-path>
```

Dà: modo dichiarato, lunghezza di titolo e description, numeri non ancorati,
marcatori di lavorazione, CTA nel corpo, doppioni strutturali, apertura
enciclopedica, heading sospetti in inglese, drift con la versione EN.

Le soglie sono indicative, non verdetti. Lo strumento conta, non giudica.
