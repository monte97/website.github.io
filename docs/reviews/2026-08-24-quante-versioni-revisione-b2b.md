# «Quante versioni stai mantenendo» — revisione B2B

Revisione secondo Enns / Konrath / Weiss e struttura STAR-PAS.
**Versione proposta, non applicata.**

Ci sono **5 blocchi da compilare**, marcati così:

    ════ ▶ DA COMPILARE ════

Scrivi la risposta sulla riga `RISPOSTA:`. Se non hai niente da dire, scrivi `NIENTE`:
il blocco verrà tolto, non annacquato. Un campo assente batte sempre un campo vago.

---

## Perché niente numeri (e perché non è un problema)

Hai detto che le prove sono solo qualitative. La ricerca sui case study B2B dice che va
bene, a una condizione precisa: quello che sostituisce i numeri sono **citazioni dirette
di chi decide**, **cambiamenti di processo descritti con precisione**, e la ricchezza del
dettaglio. Il case study di Dropbox non ha una sola metrica: regge su una frase del cliente.

Quello che invece **non** funziona, ed è la trappola in cui stavamo per cadere: affermazioni
vaghe («miglioramento significativo»), percentuali inventate, o saltare del tutto i risultati.

Per questo il blocco «Key Metrics» della prima stesura è stato **rimosso**. Al suo posto c'è
il blocco 1 qui sotto.


                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 1 · LA FRASE DEL CLIENTE
                ════════════════════════════════════════════════

    È il pezzo più importante che manca. Sostituisce da solo tutte le metriche.

    Serve una frase detta da qualcuno del cliente sul lavoro fatto. Anche breve,
    anche tiepida, anche presa da una chat. Meglio se detta da chi decide — un
    responsabile, non uno sviluppatore.

    Se non esiste una frase, va bene anche il fatto osservato: qualcuno che ha
    smesso di fare una cosa, o che ha iniziato a farne una che prima non poteva.

    RISPOSTA:


    CHI L'HA DETTA (ruolo, non nome):


                ════════════════════════════════════════════════


---

## Blocco d'apertura — Il prima e il dopo

Va in cima al pezzo, al posto delle metriche. Tre righe, concrete.

| | Prima | Dopo |
|---|---|---|
| **Le configurazioni** | non erano scritte da nessuna parte | sono un elenco che chiunque può aprire |
| **Il significato di «verde»** | un colore solo per tre situazioni diverse | tre livelli dichiarati per ogni riga |
| **La domanda in trattativa** | «si può fare?» | «quale riga aggiungiamo, e chi la mantiene?» |

**Profilo del committente:** produttore di software gestionale, prodotto installato presso
il cliente finale (non SaaS), contratti pluriennali, ogni trattativa porta varianti di
configurazione.


                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 2 · DIMENSIONE DEL TEAM
                ════════════════════════════════════════════════

    Non è una metrica di risultato: è un descrittore che rende la storia
    riconoscibile. La ricerca sull'anonimizzazione dice che sostituire il nome
    con la dimensione è ciò che permette al lettore di capire se somiglia a lui.

    Basta un ordine di grandezza: «una decina di sviluppatori», «una trentina».

    RISPOSTA:


                ════════════════════════════════════════════════


---

## Il problema, dal punto di vista di chi lo aveva

Un produttore di gestionali per laboratori vende a strutture sanitarie. Ogni trattativa
arriva con una richiesta ragionevole: *l'anagrafica centrale ce l'abbiamo già, la rete è
isolata, questo modulo non ci serve.* Ogni richiesta accolta diventa una combinazione da
tenere viva per tutta la durata del contratto.

Nessuno di questi «sì» era sbagliato preso da solo. Il problema è che nessuno li stava
contando, e le configurazioni non si sommano: **si moltiplicano.**


                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 3 · DOVE SI VEDEVA IL COSTO
                ════════════════════════════════════════════════

    È l'«agitate» della struttura PAS, e oggi manca del tutto: il pezzo dice che
    le configurazioni non erano contate, ma non dice cosa costava non contarle.

    Serve un attrito concreto, di quelli che un CTO riconosce nel proprio
    trimestre. Esempi del tipo di risposta che cerco:
      · un rilascio richiedeva prove manuali su ambienti che nessuno sapeva elencare
      · un guasto compariva presso un cliente solo e non era riproducibile altrove
      · una persona sapeva «come si fa da quel cliente» e senza di lei ci si fermava
      · nessuno rispondeva in trattativa senza chiedere prima a uno sviluppatore

    Quale di questi era vero da voi? O quale altro?

    RISPOSTA:


                ════════════════════════════════════════════════


E soprattutto: in trattativa la domanda era sempre *si può fare?*, mai *quanto costa
tenerlo in piedi?* — perché la risposta a quella seconda domanda non esisteva da nessuna parte.

## Perché la strada ovvia non funzionava

La reazione naturale è cercare i test. C'erano, ed erano verdi: migliaia di asserzioni sul
prodotto, scritte bene e mantenute nel tempo.

Non c'entravano niente, ed è questo il punto che sposta tutto il resto.

**L'applicazione è identica ovunque.** Lo stesso codice gira dentro tutte quelle strutture.
Non è lì che si rompe: si rompe nel modo in cui quel codice viene messo in piedi. Un cliente
cambia il certificato dell'anagrafica centrale e le utenze smettono di arrivare. Un altro
rinnova la rete e un modulo non raggiunge più il servizio che gli serve. In entrambi i casi
la suite del prodotto resta verde, perché il prodotto non ha nulla che non va.

L'oggetto da verificare non era il software: era **l'installazione**, con la sua
configurazione, dentro il suo ambiente. E le installazioni vivono dentro strutture dove non
entri quando ti pare — in alcuni casi non entri affatto.

Ampliare la suite esistente sarebbe stato il passo naturale e avrebbe prodotto altre
migliaia di asserzioni verdi sul problema sbagliato.

## L'intervento

**Una fonte sola.** Un file dichiarativo elenca le configurazioni supportate: quali moduli,
come arrivano le utenze, cosa deve rispondere e a che livello. Non è codice, è un elenco.

**Due esecutori che leggono quella fonte.** Uno leggero, che non installa niente, per gli
ambienti chiusi dove hai il permesso di guardare e non di toccare. Uno che installa da zero
e osserva cosa succede. La parte che conta non è nessuno dei due: è che leggono lo stesso
file. Due elenchi separati sarebbero stati più semplici da scrivere e sarebbero divergiti
in silenzio, perché due elenchi che divergono non producono un errore: producono due verdi.

**Tre livelli dichiarati** al posto di un unico passa/non passa. *Esiste*: il pezzo c'è.
*Risponde*: risponde a chi lo interroga. *Funziona davvero*: fa la cosa per cui esiste, con
un esito che solo un successo autentico può produrre.

### Cosa ha rivelato la diagnosi

Il primo risultato non è stato una copertura più alta. È stato scoprire che il cruscotto
mentiva in due modi diversi.

Un controllo accettava come successo **qualunque risposta che non fosse un errore del
server**: un accesso negato passava per verde. Aveva risposto verde per mesi senza aver mai
verificato un accesso riuscito.

E diverse configurazioni avevano **la casella dei controlli semplicemente vuota**. Nel
cruscotto non comparivano come mancanti: non comparivano affatto.

Sommate, producevano una fila di verdi che significavano tre cose diverse — questa funziona,
questa non è stata guardata bene, questa non è stata guardata per niente — tutte disegnate
uguali.

## Il risultato

Il prodotto consegnato non è una percentuale di copertura. È **la mappa dei buchi**: quali
configurazioni sono scoperte, e a che livello.

Una percentuale sarebbe stata più comoda da mostrare e inutile da usare, perché non dice
*quale* configurazione è scoperta — e le configurazioni non sono intercambiabili. Sapere di
essere coperti al settanta per cento non serve se il trenta scoperto è quello del cliente
più grosso.

Da lì il cambiamento che conta, e non è tecnico:

- **Ogni riga della matrice ha un costo ricorrente riconosciuto.** Prima esisteva già, ma
  non era scritto, e ciò che non è scritto non entra in nessun preventivo.
- **La domanda in trattativa è cambiata**: non più «si può fare?», ma «quale riga
  aggiungiamo, e chi la mantiene?».
- **La prima richiesta arrivata dopo la matrice non è diventata una riga nuova.** Al cliente
  non è stato detto no: gli è stata proposta una combinazione già esistente, rinunciando a
  un dettaglio che nella pratica non gli cambiava la giornata. Ha accettato senza pensarci.


                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 4 · CHI STA MEGLIO, E COME SI VEDE
                ════════════════════════════════════════════════

    Il risultato oggi è raccontato da te. Serve almeno un fatto osservabile, cioè
    qualcosa che un estraneo avrebbe potuto vedere entrando in azienda.

    Del tipo: chi apre quel file, quando, al posto di cosa faceva prima. Chi non
    viene più interrotto. Cosa si guarda in riunione che prima non esisteva.

    La precisione qui è il sostituto del numero: «il commerciale apre la matrice
    prima di rispondere» vale più di «il processo è migliorato».

    RISPOSTA:


                ════════════════════════════════════════════════


---

> ### «La flessibilità che vendi in trattativa non è una feature: è una riga di manutenzione che qualcuno pagherà ogni mese — e finché non la scrivi da qualche parte, quel qualcuno non lo sa nessuno.»

Il corpo del pezzo si chiude qui, sulla pull-quote. La CTA **non va scritta nel markdown**:
la pagina di dettaglio ne monta già una in fondo, sovrascrivibile per singolo case study
con il campo `cta` nel frontmatter.


                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 5 · IL MOMENTO IN CUI FA MALE
                ════════════════════════════════════════════════

    Konrath: un problema tollerato da anni diventa urgente solo quando succede
    qualcosa. Per chi vende software installato, la ricerca indica un momento su
    tutti: la migrazione di piattaforma o l'aggiornamento di versione maggiore,
    perché è lì che ogni configurazione va riverificata una per una.

    Nel progetto vero c'era una di queste cose all'orizzonte?
      · una migrazione di piattaforma o un cambio di stack
      · un aggiornamento di versione maggiore
      · un cliente nuovo più grosso degli altri
      · l'uscita di una persona che sapeva le cose a memoria
      · un rilascio andato male

    Se sì, la CTA cambia da «contate le configurazioni» a qualcosa di molto più
    affilato: «prima di quella migrazione, sapete su quante configurazioni
    dovrete riprovare tutto?»

    RISPOSTA:


                ════════════════════════════════════════════════


---

## Cosa succede dopo che hai compilato

1. I blocchi compilati entrano nel testo, quelli marcati `NIENTE` spariscono.
2. La frase del cliente (blocco 1) diventa una citazione in evidenza, subito prima
   della pull-quote finale.
3. Il blocco 5 riscrive il campo `cta` nel frontmatter del case study.
4. La versione risultante sostituisce `src/content/projects/quante-versioni-stai-mantenendo.md`.

Gli stessi cinque blocchi valgono, con le dovute differenze, per gli altri sei case study.
Stabilito il modello su questo, sugli altri è mestiere.
