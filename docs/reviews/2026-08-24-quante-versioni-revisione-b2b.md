# «Quante versioni stai mantenendo» — revisione B2B

> Revisione secondo Enns / Konrath / Weiss / struttura STAR-PAS.
> **Versione proposta, non applicata.** I segnaposto `[DATO: …]` marcano i punti dove
> serve un numero che oggi non esiste nel testo. Vanno riempiti o rimossi: **non inventati.**

---

## Blocco d'apertura — Key Metrics

> **Attenzione IP.** Il numero esatto delle configurazioni è nella lista di ciò che non si
> pubblica: è la distinta base del prodotto del cliente. Le tre metriche qui sotto sono
> scelte per essere *vere e non identificanti*. Non sostituirle con «N configurazioni».

| | |
|---|---|
| **Configurazioni in esercizio senza alcun controllo automatico** | circa la metà |
| **Controlli che dichiaravano verde senza aver verificato l'accesso** | mesi di falsi positivi |
| **Riunioni di trattativa in cui il costo di manutenzione era a bilancio** | zero, prima dell'intervento |

**Profilo del committente:** produttore di software gestionale, prodotto installato presso
il cliente finale (non SaaS), contratti pluriennali, ogni trattativa porta varianti di configurazione. `[DATO: dimensione del team di sviluppo, es. «~25 sviluppatori»]`

---

## Il problema, dal punto di vista di chi lo aveva

Un produttore di gestionali per laboratori vende a ospedali. Ogni trattativa arriva con una
richiesta ragionevole: *l'anagrafica centrale ce l'abbiamo già, la rete è isolata, questo
modulo non ci serve.* Ogni richiesta accolta diventa una combinazione da tenere viva per
tutta la durata del contratto.

Nessuno di questi «sì» era sbagliato preso da solo. Il problema è che nessuno li stava
contando, e le configurazioni non si sommano: **si moltiplicano.**

Il costo si vedeva altrove, sotto altri nomi. Rilasci che richiedevano prove manuali su
ambienti che nessuno sapeva elencare con certezza. Guasti che comparivano solo presso un
ente e non erano riproducibili altrove. Persone che sapevano «come si fa da quel cliente»
e la cui assenza bloccava un intervento. `[DATO: quanto durava un rilascio, o quanti
interventi in emergenza al trimestre]`

E soprattutto: in trattativa la domanda era sempre *si può fare?*, mai *quanto costa
tenerlo in piedi?* — perché la risposta a quella seconda domanda non esisteva da nessuna parte.

## Perché la strada ovvia non funzionava

La reazione naturale è cercare i test. C'erano, ed erano verdi: migliaia di asserzioni sul
prodotto, scritte bene e mantenute nel tempo.

Non c'entravano niente, ed è questo il punto che sposta tutto il resto.

**L'applicazione è identica ovunque.** Lo stesso codice gira dentro tutti gli ospedali. Non
è lì che si rompe: si rompe nel modo in cui quel codice viene messo in piedi. Una struttura cambia
il certificato dell'anagrafica centrale e le utenze smettono di arrivare. Un altro rinnova
la rete e un modulo non raggiunge più il servizio che gli serve. In entrambi i casi la suite
del prodotto resta verde, perché il prodotto non ha nulla che non va.

L'oggetto da verificare non era il software: era **l'installazione**, con la sua
configurazione, dentro il suo ambiente. E le installazioni vivono dentro ospedali dove non
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
un esito che solo un successo autentico può produrre. Per ogni configurazione si scrive
quale livello raggiunge.

### Cosa ha rivelato la diagnosi

Il primo risultato non è stato una copertura più alta. È stato scoprire che il cruscotto
mentiva in due modi diversi.

Un controllo accettava come successo **qualunque risposta che non fosse un errore del
server**: un accesso negato passava per verde. Aveva risposto verde per mesi senza aver mai
verificato un accesso riuscito.

E diverse configurazioni avevano **la casella dei controlli semplicemente vuota**. Nel
cruscotto non comparivano come mancanti: non comparivano affatto.

Sommate, le due cose producevano una fila di verdi che significavano tre cose diverse —
questa funziona, questa non è stata guardata bene, questa non è stata guardata per niente —
tutte disegnate uguali.

## Il risultato

Il prodotto consegnato non è una percentuale di copertura. È **la mappa dei buchi**: quali
configurazioni sono scoperte, e a che livello.

Una percentuale sarebbe stata più comoda da mostrare e inutile da usare, perché non dice
*quale* configurazione è scoperta — e le configurazioni non sono intercambiabili. Sapere di
essere coperti al settanta per cento non serve se il trenta scoperto è quello del cliente più
grosso.

Da lì il cambiamento che conta, e non è tecnico:

- **Ogni riga della matrice ha un costo ricorrente riconosciuto.** Prima esisteva già, ma
  non era scritto, e ciò che non è scritto non entra in nessun preventivo.
- **La domanda in trattativa è cambiata**: non più «si può fare?», che ha quasi sempre
  risposta sì, ma «quale riga aggiungiamo, e chi la mantiene?».
- **La prima richiesta arrivata dopo la matrice non è diventata una riga nuova.** Al cliente
  non è stato detto no: gli è stata proposta una combinazione già esistente, rinunciando a
  un dettaglio che nella pratica non gli cambiava la giornata. Ha accettato senza pensarci.
  Nessuno aveva mai potuto proporlo prima, perché prima nessuno sapeva che l'alternativa
  costava una riga in più per sempre.

`[DATO: risparmio stimato di quella riga non aggiunta — giornate/anno di manutenzione, o
il valore in euro se il cliente lo ha quantificato]`

---

> ### «La flessibilità che vendi in trattativa non è una feature: è una riga di manutenzione che qualcuno pagherà ogni mese — e finché non la scrivi da qualche parte, quel qualcuno non lo sa nessuno.»

---

## Se questa storia somiglia alla vostra

> **Nota di struttura.** La CTA **non va scritta nel corpo del pezzo**: la pagina di
> dettaglio ne monta già una a fondo pagina. Dal 2026-08-24 quel blocco è sovrascrivibile
> per singolo case study con il campo `cta` nel frontmatter, con fallback su quella
> generica. Il testo qui sotto è quindi diventato la CTA di *questo* pezzo, e vive nel
> frontmatter — non nel markdown.

```yaml
cta:
  title: "Sapete quante configurazioni del vostro prodotto sono vive adesso?"
  desc: >
    Se la risposta richiede più di trenta secondi, il costo esiste già: semplicemente non
    è scritto, quindi non è né a bilancio né in preventivo. Contarle è un lavoro delimitato.
```

Il corpo del pezzo si chiude sulla pull-quote. La qualificazione del lettore la fa il
blocco finale della pagina, che ha già il collegamento alla discovery call.

## Note di metodo

Vedi la sezione «Note di approfondimento metodologico» nella conversazione.
