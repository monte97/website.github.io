---
title: "Quante versioni del tuo prodotto stai mantenendo davvero?"
description: "Ogni «sì, si può fare» detto in trattativa diventa un'installazione diversa da tenere in piedi per sempre. Le abbiamo contate — e poi abbiamo scoperto che i controlli che dovevano coprirle rispondevano verde da mesi senza guardare."
type: case-study
pillar: progettare
pillarApplied: progettare
featured: true
weight: 0
eyebrow: "Analisi tecnica · software installato presso il cliente"
tags: [Manutenzione, Configurazioni, Testing, Delivery]
links:
  blog: "/blog/verificare/testing/mutation-testing-oltre-la-coverage/"
oggetto: >
  Un produttore di software gestionale per laboratori di analisi privati, installato dentro le sedi dei clienti. Ogni cliente chiede una variante in fase di contratto, e ogni variante diventa
  un'installazione diversa da mantenere.
metodo: >
  Contare le configurazioni realmente installate, dichiararle in un solo file YAML, e
  leggerlo da due esecutori diversi: uno smoke test in shell dove non si può installare
  niente, una suite pytest che installa davvero. Poi tre livelli di controllo per riga.
esito: >
  Le configurazioni supportate sono diventate un elenco scritto, e «verde» ha smesso di
  significare tre cose diverse. Il lavoro ha rivelato controlli che dichiaravano successo
  senza aver verificato nulla e configurazioni senza alcun controllo. Il risultato
  consegnato non e' una copertura piu' alta: e' la mappa di dove sono i buchi, e quanto
  costa ogni riga.
anonimizzazione: >
  Cliente e settore sono sostituiti; lo stack è quello reale. Restano fuori i nomi dei
  servizi, gli indirizzi, gli esiti attesi e il numero delle configurazioni: l'elenco
  completo è l'inventario delle varianti che il cliente vende, e non è mio.
problem: >
  Il prodotto è lo stesso ovunque. A rompersi non è l'applicazione, è l'installazione — e
  nessuno sapeva quante installazioni diverse esistessero, perché non erano scritte da
  nessuna parte.
context: >
  Il software si installa dentro il cliente, non gira su un'infrastruttura nostra. Ogni
  contratto porta una richiesta ragionevole: il Keycloak ce l'abbiamo già,
  la rete è isolata, questo modulo non ci serve. Ogni richiesta accolta in trattativa
  diventa una combinazione da tenere viva per tutta la durata del contratto.
specs:
  - label: "Perimetro"
    value: "L'installazione, non l'applicazione"
    note: "La suite del prodotto era verde e non c'entrava niente: il codice è lo stesso ovunque"
  - label: "Fonte di verità"
    value: "Un solo file YAML con le configurazioni supportate"
  - label: "Esecutori"
    value: "Due, che leggono lo stesso YAML"
    note: "Uno smoke test in shell dove non si può installare nulla, una suite pytest che installa davvero"
  - label: "Livelli di controllo"
    value: "Tre, dichiarati per ogni riga: esiste, risponde, funziona davvero"
  - label: "Fuori scope"
    value: "Esecuzione automatica a ogni modifica, e la copertura di tutte le righe"
decisions:
  - title: "Dove verificare"
    chosen: "L'installazione, con la sua configurazione"
    chosenWhy: "L'applicazione è identica ovunque: se si rompe qualcosa, si rompe nel modo in cui è stata messa in piedi."
    rejected: "Allargare la suite di test del prodotto"
    appeal: "Esisteva già, era verde, e allargarla sembrava il passo naturale."
  - title: "Dove vivono le configurazioni"
    chosen: "Un solo file YAML, letto sia dallo smoke test sia dalla suite pytest"
    chosenWhy: "Due esecutori che leggono la stessa fonte non possono divergere in silenzio."
    rejected: "Un elenco per esecutore, ciascuno con il proprio formato"
    appeal: "Ognuno resta semplice e indipendente — finché i due elenchi non si separano senza che nessuno lo noti."
  - title: "Cosa significa «verde»"
    chosen: "Tre livelli dichiarati per riga, e per ognuna si scrive quale raggiunge"
    chosenWhy: "Un verde che non dice cosa ha verificato è indistinguibile da un verde che non ha verificato niente."
    rejected: "Un unico esito passa/non passa per configurazione"
    appeal: "Un cruscotto tutto verde è più facile da leggere, e da mostrare."
  - title: "Cosa consegnare"
    chosen: "La mappa dei buchi: quali righe non sono coperte, e a che livello"
    chosenWhy: "Serve a decidere cosa promettere in trattativa, e quella decisione la prende chi vende."
    rejected: "Una percentuale di copertura"
    appeal: "È un numero solo, sale nel tempo, e sta bene in una slide."
decisionsNote: >
  Il filo comune è che ogni scelta rende visibile qualcosa che prima era implicito. Il
  costo di una configurazione non era nascosto: semplicemente non era scritto da nessuna
  parte, e quello che non è scritto non entra in nessun preventivo.
matrix:
  label: "La mappa dei buchi"
  columns: ["Esiste", "Risponde", "Funziona"]
  rows:
    - label: "Installazione di riferimento"
      note: "Tutti i moduli, utenze gestite dal prodotto"
      cells: [full, full, full]
    - label: "Cliente con Keycloak proprio"
      note: "Le utenze arrivano dal sistema dell'cliente"
      cells: [full, full, partial]
    - label: "Sede con rete isolata"
      note: "Nessuna uscita verso l'esterno"
      cells: [full, partial, empty]
    - label: "Installazione multi-laboratorio"
      note: "Più laboratori sulla stessa istanza"
      cells: [full, empty, empty]
    - label: "Ambiente di collaudo del cliente"
      note: "Dati finti, moduli parziali"
      cells: [partial, empty, empty]
  legend:
    full: "verificato"
    partial: "verificato in parte"
    empty: "nessun controllo"
  caption: "Configurazioni di esempio, inventate: le righe reali sono l'inventario delle varianti vendute"
  note: >
    La prima riga è quella su cui si lavora tutti i giorni, ed è l'unica coperta fino in
    fondo. Le altre esistono in produzione da anni. La colonna che conta non è la prima:
    è la terza, dove il bianco è quasi tutto.
sections:
  - n: "01"
    title: "Il conto che nessuno teneva"
    summary: "Le configurazioni non si sommano, si moltiplicano"
  - n: "02"
    title: "La suite verde che non c'entrava"
    summary: "L'applicazione è la stessa ovunque; a rompersi è l'installazione"
  - n: "03"
    title: "Una fonte, due esecutori"
    summary: "Un file dichiarativo letto da chi verifica e da chi installa"
  - n: "04"
    title: "Il rosso che aveva torto"
    summary: "L'installazione era sana: sbagliava il file che diceva quando è sana"
  - n: "05"
    title: "La mappa dei buchi"
    summary: "Tre livelli dichiarati, e il prodotto utile non è la copertura"
readingPaths:
  - label: "Per decidere"
    desc: "Il conto delle configurazioni e cosa torna al tavolo commerciale: quanto costa davvero una riga in più, e chi la paga."
  - label: "Per valutare"
    desc: "Come è fatta la verifica: una fonte dichiarativa, due esecutori, tre livelli di controllo e cosa hanno trovato."
readingNote: >
  Il perimetro è l'installazione, non il prodotto. Va detto prima di qualunque
  affermazione sui risultati, perché è ciò che rende confrontabili i numeri.
openItems:
  - "La verifica non gira da sola a ogni modifica: si lancia quando qualcuno decide di lanciarla, ed è il limite più grosso che resta"
  - "Le righe scoperte restano scoperte: la mappa dice dove sono i buchi, non li chiude"
  - "Il terzo livello — «funziona davvero» — è quello più costoso da scrivere, e infatti è quello con più bianco"
  - "Nessuno ha ancora messo un prezzo alla riga di matrice: la contabilità esiste, la tariffa no"
cta:
  title: "Sapete quante configurazioni del vostro prodotto sono vive adesso?"
  desc: "Se la risposta richiede più di trenta secondi, il costo esiste già: semplicemente non è scritto, quindi non è né a bilancio né in preventivo. Contarle è un lavoro delimitato."
thesis: "La flessibilità che vendi in trattativa non è una feature: è una riga di manutenzione che qualcuno pagherà ogni mese — e finché non la scrivi da qualche parte, quel qualcuno non lo sa nessuno."
---

## Il conto che nessuno teneva

La call durò quaranta minuti, e la frase che conta arrivò al trentacinquesimo.

«Il nostro Keycloak ce l'abbiamo già. Gli utenti li gestiamo noi, il vostro sistema deve solo fidarsi.»

Il commerciale rispose come rispondono i commerciali quando la richiesta è ragionevole e il contratto è grosso: «certo, si può fare». Aveva ragione. Si poteva fare, si era già fatto altrove, e la stima buttata lì quel giorno — due giorni-uomo — era anche corretta, per la prima volta.

Mesi dopo mi trovai a fare un conto che nessuno aveva mai fatto: quante versioni diverse di quel prodotto erano vive, in quel momento, presso i clienti che l'avevano comprato.

Non è una domanda con una risposta ovvia, perché le configurazioni non si sommano. Si moltiplicano. Una struttura porta le proprie utenze dal proprio Keycloak, un altro le lascia gestire al prodotto. Un sede ha la rete isolata verso l'esterno, un altro no. Qui i laboratori sono tre sulla stessa installazione, là uno solo. Ogni scelta è indipendente dalle altre, e ogni combinazione è una cosa che deve funzionare.

Nessuna di queste varianti era stata decisa da un architetto. Erano state tutte concesse in trattativa, una alla volta, ognuna in un momento in cui dire di sì costava meno che dire di no.

## La suite verde che non c'entrava

La prima reazione, quando conti quel numero, è cercare i test.

I test c'erano, ed erano verdi. Migliaia di asserzioni sul prodotto, scritte bene, mantenute nel tempo. Non servivano a niente per questo problema, e ci volle un po' per accettarlo.

Il motivo è che **l'applicazione è la stessa ovunque**. Lo stesso identico codice gira dentro tutte quelle sedi. Non è lì che si rompe qualcosa: si rompe nel modo in cui quel codice viene messo in piedi. Una struttura ruota il certificato di firma del proprio Keycloak e le utenze smettono di arrivare; un altro rinnova la rete e un modulo non raggiunge più il servizio che gli serve. In entrambi i casi la suite del prodotto resta verde, perché il prodotto non ha nulla che non va.

L'oggetto da verificare non era il software. Era **l'installazione**, con la sua configurazione, dentro il suo ambiente.

Questo sposta il problema in un posto scomodo. Un test sul prodotto lo lanci sulla tua macchina. Un test sull'installazione ha bisogno di un'installazione — e le installazioni vivono dentro le sedi dei clienti dove non entri quando ti pare, e in alcuni casi non entri affatto.

## Una fonte, due esecutori

La forma che ha retto è più semplice di quanto sembri.

Un solo file YAML elenca le configurazioni supportate. Non è codice: è un elenco. Per ogni riga, quali moduli ci sono, come arrivano le utenze, cosa deve rispondere e a che livello.

Quel file viene letto da **due esecutori diversi**. Il primo è uno smoke test in shell che non installa niente: serve dove non puoi installare, ambienti chiusi, macchine di qualcun altro, situazioni in cui hai il permesso di guardare e non di toccare. Il secondo è una suite pytest che porta su l'ambiente con Ansible e OpenTofu, da zero, e poi guarda cosa succede.

La parte che conta non è nessuno dei due esecutori: è che **leggono la stessa fonte**. Due elenchi separati, uno per esecutore, sarebbero stati più semplici da scrivere e avrebbero divergito nel giro di qualche mese senza che nessuno se ne accorgesse — perché due elenchi che divergono non producono nessun errore, producono due verdi.

## Il rosso che aveva torto

Poi arrivò il rosso.

Una configurazione falliva. Non a intermittenza, sempre. Passai quaranta minuti sui log a cercare quale pezzo dell'installazione fosse rotto, con quella sensazione crescente che qualcosa non tornasse — perché era una configurazione vecchia, in esercizio da anni, senza una sola segnalazione dal campo.

Alla fine entrai a mano. Aprii il sistema, feci le cose che il controllo diceva di fare, e le vidi funzionare tutte.

L'installazione era sana. **Sbagliava il file che avevo scritto io per dire quando è sana.** Descriveva un esito che quel sistema, in quella configurazione, non produceva e non aveva mai prodotto.

È un momento istruttivo, e non per il bug. Per quaranta minuti avevo dato per scontato che l'oracolo avesse ragione e la realtà torto. È lo stesso riflesso per cui una suite verde rassicura: si finisce per fidarsi dello strumento invece che della cosa che lo strumento dovrebbe misurare. Ci ero già passato con [una suite che mi mentiva sulla propria copertura](/blog/verificare/testing/mutation-testing-oltre-la-coverage/), e non l'avevo riconosciuto.

## La scoperta peggiore

Se un controllo può sbagliare dicendo rosso a un sistema sano, può sbagliare anche nell'altra direzione. Andai a rileggerli tutti.

Uno controllava il flusso di autenticazione OIDC e accettava come successo **qualunque risposta sotto il 500**. Un 401 passava per verde. Un 403 passava per verde. In quella configurazione il controllo aveva risposto verde per mesi senza aver mai verificato un accesso riuscito, e stampava a schermo un esito che non corrispondeva a quello che aveva davvero misurato.

E c'era il secondo pezzo, peggiore del primo perché più banale: **diverse configurazioni avevano la casella dei controlli semplicemente vuota**. Nessun controllo scritto. Nel cruscotto non comparivano come mancanti: non comparivano affatto.

Sommate le due cose, la matrice mostrava una fila di verdi che significavano tre cose diverse — questa funziona, questa non è stata guardata bene, questa non è stata guardata per niente — tutte disegnate uguali.

È la stessa domanda che mi ero già fatto quando i test hanno cominciato a scriverli gli agenti: [chi controlla che funzionino davvero](/blog/verificare/testing/chiudere-il-loop-mutation-testing/)? Qui non li aveva scritti un modello, li avevo scritti io, e il risultato era identico. Un controllo che nessuno verifica è un controllo di cui non sai niente, a prescindere da chi tiene la penna.

## La mappa dei buchi

La riparazione non è stata scrivere i controlli mancanti. È stata **dichiarare cosa significa verde**.

Tre livelli, scritti esplicitamente. *Esiste*: il container è su, la porta risponde. *Risponde*: l'endpoint restituisce qualcosa di sensato. *Funziona davvero*: un login OIDC completo arriva fino al token, con un esito che solo un successo autentico può produrre. Per ogni configurazione si scrive quale livello raggiunge, e le caselle non raggiunte restano bianche.

Il risultato non è un cruscotto tutto verde. È una griglia in cui il bianco si vede, e si vede soprattutto nella terza colonna.

Il prodotto utile di questo lavoro non è la copertura: **è la mappa dei buchi**. Una percentuale sarebbe stata più comoda da mostrare e inutile da usare, perché non dice quale configurazione è scoperta — e le configurazioni non sono intercambiabili. Sapere che sei coperto al settanta per cento non serve a nessuno se il trenta scoperto è quello del cliente più grosso.

## Il conto torna al commerciale

A questo punto la matrice ha smesso di essere un documento tecnico.

Ogni riga è una configurazione che qualcuno deve tenere viva: quando esce una versione va provata su quella riga, quando cambia una dipendenza va ricontrollata su quella riga, e quando il cliente rinnova qualcosa dalla sua parte è su quella riga che si rompe. Ha un costo mensile, e quel costo esisteva già da anni. Semplicemente non era scritto da nessuna parte, e quello che non è scritto non entra in nessun preventivo.

**La matrice è il listino vero.** Non quello dei moduli: quello delle combinazioni.

E cambia la domanda che si fa al tavolo della trattativa. Non più «si può fare?», che ha quasi sempre risposta sì. Ma: *quale riga stiamo aggiungendo, e chi la mantiene?*

## La riga che non abbiamo aggiunto

L'ultima richiesta arrivò quando la matrice esisteva già.

Era ragionevole quanto le altre, tecnicamente fattibile in pochi giorni, e chiedeva una combinazione nuova che nessun'altra installazione aveva. Con la griglia sul tavolo, però, la conversazione fu diversa: non si discusse se si potesse fare, ma quanto sarebbe costato tenerla in piedi per la durata del contratto, e chi l'avrebbe provata a ogni rilascio.

La risposta al cliente non fu no. Fu che quella combinazione si poteva avere accostandola a una riga che esisteva già, rinunciando a un dettaglio che nella pratica non gli cambiava la giornata. Il cliente accettò senza pensarci troppo: era un dettaglio, per l'appunto. Nessuno l'aveva mai potuto proporre prima, perché prima nessuno sapeva che l'alternativa costava una riga in più per sempre.

**La flessibilità che vendi in trattativa non è una feature: è una riga di manutenzione che qualcuno pagherà ogni mese — e finché non la scrivi da qualche parte, quel qualcuno non lo sa nessuno.**

---

*Il caso è reale, il settore no: dominio, ruoli e terminologia sono stati sostituiti. Tempi e scene sono compressi, e le configurazioni mostrate nella figura sono inventate. Restano fedeli l'esistenza di una fonte dichiarativa unica letta da due esecutori diversi, le configurazioni prive di controlli che passavano lo stesso, e il controllo che accettava risposte di errore come successo dichiarando un esito che non corrispondeva.*
