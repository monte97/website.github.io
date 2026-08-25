---
title: "Il fornitore non ha un'API. Il portale sì."
description: "Come ho ricostruito il protocollo di un cloud industriale per portare i dati delle macchine dentro il gestionale del cliente — e perché mi sono fermato prima dell'ultimo endpoint."
type: case-study
pillar: progettare
pillarApplied: progettare
featured: true
weight: 1
eyebrow: "Analisi tecnica · integrazione con un sistema di terzi"
tags: [Integrazione, Reverse engineering, Protocolli, HTTP]
oggetto: >
  Un noleggiatore di macchine da sollevamento — qualche centinaio di macchine in flotta,
  tre filiali, due persone sull'IT — con i dati di utilizzo prigionieri del portale web
  del costruttore e un gestionale che li aspettava.
metodo: >
  Ricostruzione del protocollo osservando il traffico del portale, primo accesso delegato
  a un browser headless e rinnovo del token via HTTP, mappatura per nome e non per
  posizione, perimetro limitato alla sola lettura.
esito: >
  I dati arrivano nel gestionale senza piu' trascrizioni manuali. Lungo la strada e'
  emerso che l'endpoint riordinava le risposte, e per due settimane i valori sono finiti
  nella colonna sbagliata senza produrre un solo errore. Il canale che scriveva sui
  parametri di sicurezza e' stato lasciato al costruttore: decisione presa prima di
  provarci, e concordata.
anonimizzazione: >
  Il dominio è quello reale. Sono omessi il nome del costruttore, quello del cliente e i
  modelli delle macchine; tempi e scene sono compressi e ricostruiti.
problem: >
  I dati esistevano, erano completi ed erano perfettamente visibili — su un portale del
  fornitore, dietro un login. Alla richiesta di un accesso programmatico il costruttore
  ha risposto allegando il manuale utente del portale.
context: >
  Il noleggio si fattura a ore di utilizzo e la manutenzione si programma sulle stesse
  ore. Senza quei numeri nel gestionale, le ore le dichiarava il cantiere e qualcuno le
  ricopiava a mano dal portale: ogni contestazione su una fattura diventava mezza
  giornata di ricostruzione, ogni intervento saltato una macchina che tornava rotta
  prima del previsto.
actions:
  - "Ricostruzione del protocollo osservando le chiamate che il portale esegue già, invece di cercare un'API che non esisteva"
  - "Primo accesso con un browser headless, poi otto ore di raccolta su rinnovo del token via HTTP"
  - "Individuazione di un riordino silenzioso delle risposte che spostava i valori nella colonna sbagliata senza produrre nessun errore"
  - "Controllo di coerenza fisica sui dati raccolti, al posto di test su un sistema simulato che avrebbe confermato il modello sbagliato"
  - "Perimetro limitato alla lettura: il canale che configura la macchina è stato lasciato al costruttore, con la sua responsabilità"
result:
  - "Ore, cicli e allarmi nel gestionale senza più trascrizioni manuali: le contestazioni sulle fatture si chiudono guardando una schermata, la manutenzione si programma sui numeri veri"
  - "Un documento di protocollo che descrive ogni scelta, il suo perché, cosa succede quando il costruttore cambierà il portale, e cosa non è stato costruito e per quale ragione"
  - "Il canale di scrittura resta in capo al costruttore, con la sua responsabilità: una decisione presa e concordata, non un limite subito"
sections:
  - n: "01"
    title: "Il vincolo"
    summary: "Quaranta pagine su come guardare, e nessun modo di prendere"
  - n: "02"
    title: "Il metodo"
    summary: "Smettere di cercare l'API che vorresti e leggere quella che c'è già"
  - n: "03"
    title: "L'errore silenzioso"
    summary: "Numeri plausibili nella colonna sbagliata, e perché nessun test lo avrebbe preso"
  - n: "04"
    title: "Il confine"
    summary: "L'endpoint che è stato lasciato dov'era, e cosa è stato detto al cliente"
  - n: "05"
    title: "Il deliverable"
    summary: "Perché la cosa consegnata con più cura non è stata l'integrazione"
readingPaths:
  - label: "Per decidere"
    desc: "Il vincolo e il confine: cosa costa portare fuori dati che un fornitore non espone, e dove un lavoro del genere deve fermarsi."
  - label: "Per valutare"
    desc: "Tutto nell'ordine in cui è scritto: il metodo e l'errore silenzioso dicono come è stato fatto e come è stato verificato."
readingNote: >
  L'ordine non è cronologico ma di dipendenza. Il perimetro effettivo — sola lettura — è
  dichiarato prima di qualsiasi affermazione sui risultati.
flow:
  label: "Percorso del dato"
  caption: "Dal portale al gestionale — il backend reale è un prodotto diverso, rivestito"
  nodes:
    - kind: "Interfaccia"
      name: "Portale del costruttore"
      desc: "Pagina JavaScript, login federato, esportazione manuale. È l'unica cosa documentata."
      edge: "è una skin sopra"
    - kind: "Sistema reale"
      name: "Piattaforma telematica di terze parti"
      desc: "Altro prodotto, altro nome, interfaccia programmabile non documentata per i clienti."
      key: true
      edge: "primo accesso, una volta"
    - kind: "Accesso"
      name: "Browser headless"
      desc: "Cinque secondi all'avvio: restituisce le credenziali di sessione. Poi non serve più."
      edge: "token 15 min, rinnovo HTTP"
    - kind: "Raccolta"
      name: "Processo di ingestione"
      desc: "Otto ore di autonomia, un turno. Mappatura per nome, mai per posizione."
      edge: "scrittura"
    - kind: "Destinazione"
      name: "Gestionale del cliente"
      desc: "Ore, cicli e allarmi accanto a contratti, trasporti e fatturazione."
specs:
  - label: "Perimetro"
    value: "Sola lettura dei dati di utilizzo — ore motore, cicli, allarmi, stati"
    note: "Il canale di configurazione resta al costruttore: decisione presa e concordata"
  - label: "Accesso"
    value: "Browser headless per il primo login, poi rinnovo del token via HTTP"
    note: "Otto ore di autonomia, quanto un turno"
  - label: "Frequenza"
    value: "Un campione ogni tre minuti per macchina"
  - label: "Destinazione"
    value: "Il gestionale del cliente, accanto a contratti, trasporti e fatturazione"
  - label: "Fuori scope"
    value: "Scrittura di parametri, configurazione remota, qualunque azione sulla macchina"
decisions:
  - title: "Primo accesso"
    chosen: "Browser headless una volta sola, poi rinnovo via HTTP"
    chosenWhy: "Cinque secondi all'avvio si pagano una volta; una riscrittura a sorpresa si paga per sempre."
    rejected: "Replicare a mano il flusso di autenticazione della pagina"
    appeal: "Nessuna dipendenza da un browser, avvio istantaneo, più facile da far girare ovunque."
  - title: "Mappatura dei valori"
    chosen: "Per nome, ignorando l'ordine in cui la risposta arriva"
    chosenWhy: "L'endpoint riordina le serie secondo un criterio suo, e sbagliare qui non produce un errore."
    rejected: "Per posizione: prima grandezza chiesta, prima colonna"
    appeal: "È l'ordine che hai in testa mentre scrivi la richiesta: due righe, e sembra ovvio."
  - title: "Canale di configurazione"
    chosen: "Fermarsi alla lettura, la scrittura resta al costruttore"
    chosenWhy: "La lettura è reversibile e verificabile: se sbaglio, il danno è un grafico storto, e me ne accorgo io. La scrittura no."
    rejected: "Ricostruire anche la scrittura e portare la configurazione nel gestionale"
    appeal: "Era la parte facile — stessa struttura, stesso token. E il cliente l'avrebbe voluta."
  - title: "Perimetro del servizio"
    chosen: "Le credenziali del portale restano dentro il servizio, i client non le vedono mai"
    chosenWhy: "Il servizio parla al cloud con la propria identità: chi lo interroga non può risalire alle credenziali né usarle altrove."
    rejected: "Passare le credenziali ai client e lasciarli parlare direttamente col portale"
    appeal: "Un componente in meno da scrivere e da tenere su."
decisionsNote: >
  Il filo che tiene insieme i tre bivi è sempre lo stesso: cosa succede il giorno in cui
  questa scelta si rompe, e in quale direzione. Non quale strada costa meno oggi.
openItems:
  - "L'interfaccia usata non è documentata dal costruttore: può cambiare senza preavviso, e non esiste nessun contratto né sorveglianza che avvisi quando succede"
  - "Se un giorno venisse attivata l'autenticazione a due fattori sull'account, il primo accesso si romperebbe: non è gestito, ed è una scelta consapevole"
  - "Il portale offre anche dati aggregati, ma il manuale non dice cosa calcoli l'aggregazione: finché non è verificato empiricamente si usano solo i campioni grezzi"
  - "La dipendenza da un browser per il primo accesso pesa negli ambienti minimali, dove conviene la via alternativa via file"
  - "Resta da chiedere al costruttore se esista un'interfaccia ufficiale supportata: toglierebbe di mezzo sia il browser sia la ricostruzione"
swap:
  label: "Il riordino silenzioso"
  requestedLabel: "Chiesto"
  receivedLabel: "Arrivato"
  requested:
    - "Ore motore"
    - "Cicli di lavoro"
    - "Temperatura olio"
  order: [1, 2, 0]
  caption: "Nessun errore, nessun campo nullo: solo un ordine diverso da quello chiesto"
  note: >
    L'endpoint riordina le serie secondo un criterio suo. Mappando per posizione, ogni
    valore finisce sotto l'etichetta sbagliata — e restando tutti nell'intervallo
    plausibile, nessun controllo automatico distingue il risultato da uno corretto.
cta:
  title: "I dati che vi servono per discutere una fattura, chi li scrive?"
  desc: >
    Se dipendono da qualcuno che se li ricorda a fine giornata, arriveranno tardi e
    incompleti proprio quando servono — cioè quando il cliente sta contestando anche
    altro. Portarli fuori dal sistema che li produce è un lavoro delimitato.
thesis: "Un'integrazione è finita quando qualcun altro può portarla avanti da solo, compresi i punti dove hai deciso di non arrivare."
---

## Quaranta pagine su come guardare

La frase era: «questi dati ci servono nel gestionale».

A dirla era il responsabile operativo di un noleggiatore di taglia media: qualche centinaio di macchine in flotta, tre filiali, un gestionale cresciuto in casa negli anni, due persone in tutto sull'IT. Non un'azienda tecnologica. Un'azienda che porta macchine nei cantieri e le riporta indietro, e che sul software ha esattamente le risorse che servono a tenerlo in piedi.

Nel gestionale c'era già tutto il resto: contratti, trasporti, manutenzioni programmate, fatturazione. Mancavano le macchine: ore motore, cicli di lavoro, allarmi, stati. Un campione ogni tre minuti, per ogni macchina connessa. Quei dati esistevano ed erano completi. Erano sul portale del costruttore, dietro un login, in una pagina con un grafico e un pulsante di esportazione.

Il punto non era la fatica in sé. Era che **la registrazione delle ore dipendeva dalla buona volontà di una persona** che aveva anche altro da fare, e a cui scrivere numeri su un foglio non piaceva né veniva rapido. Quindi slittava, regolarmente, dietro a cose più urgenti — e quando serviva, i dati erano quelli che qualcuno si era ricordato di annotare.

**La posta in gioco non era la comodità, era il contratto.** Il noleggio si fattura a ore di utilizzo, e le ore le dichiarava il cantiere. La manutenzione si programma sulle ore, e quelle stesse ore le trascriveva a mano qualcuno che apriva il portale, filiale per filiale, quando se ne ricordava. Le contestazioni non erano tante. Ma arrivavano quasi sempre insieme ad altre difficoltà: quando in cantiere qualcosa va storto si discute su tutti i fronti contemporaneamente, e le ore diventano uno dei fronti. Ogni contestazione diventava mezza giornata di ricostruzione, nel momento peggiore per averla. Ogni intervento saltato era una macchina che tornava rotta prima del previsto, e nessuno collegava le due cose perché non c'era un posto dove i numeri stessero insieme.

Nessuno stava misurando quel costo, perché era distribuito su chiunque capitasse.

Abbiamo chiesto al costruttore l'accesso via API. La risposta è arrivata come allegato: il manuale utente del portale, con gli screenshot. Nessuna cattiveria e nessuna trattativa — semplicemente, per come era pensato quel prodotto, la domanda non aveva senso. I dati si guardano. Se li vuoi altrove, li guardi e li riscrivi.

E qui comincia il lavoro vero, che non è tecnico: decidere se questa cosa si fa, e cosa significa farla.

## Il tentativo che fanno tutti

La prima cosa che ho provato è la prima che prova chiunque: prendere l'indirizzo del portale, cercare un endpoint di autenticazione, mandargli utente e password.

Non funziona. Il password grant OAuth2 è disabilitato sull'endpoint OIDC — il server risponde che il client non è abilitato agli accessi diretti — non per una configurazione sbagliata, per una scelta di chi ha montato il sistema. E la pagina di login non è una pagina: è un'applicazione JavaScript SPA. Non c'è un form da inviare, c'è del codice che parla con un endpoint OIDC.

Ho passato qualche ora a provare varianti. È il punto in cui è facile perdere una settimana: ogni tentativo è abbastanza vicino al successo da far credere che manchi un dettaglio.

## Smettere di attaccare l'API

La svolta non è stata tecnica ma di metodo: **smetti di cercare l'API che vorresti e guarda quella che c'è già.**

Il portale funziona. Ogni volta che qualcuno apre quel grafico, qualcosa risponde con dei numeri. Non serve indovinare l'interfaccia: basta leggere una conversazione che avviene comunque, decine di volte al giorno, ogni volta che un capocantiere controlla una macchina.

Venti minuti con le DevTools del browser hanno raccontato quello che il manuale non diceva in quaranta pagine. Il portale era una superficie: sotto c'era una piattaforma OIDC, con un altro nome, che il costruttore aveva integrato e rivestito con i propri colori. Le chiamate non andavano al portale, andavano a quell'endpoint. E quell'endpoint un'interfaccia programmabile ce l'aveva — solo, non era documentata per i clienti, perché dal punto di vista commerciale non esisteva.

Da lì in poi non è stato reverse engineering nel senso avventuroso del termine. È stato leggere: quali chiamate, in che ordine, con quali parametri, cosa torna indietro.

## Quindici minuti alla volta

Restava il primo accesso, e la scelta è stata accettare il confine invece di forzarlo: un browser headless — Chromium pilotato da Playwright — che fa il login una volta e restituisce le credenziali di sessione. Da quel momento il browser non serve più — l'access token dura quindici minuti e si rinnova con polling HTTP, e la catena di rinnovi regge circa otto ore.

Otto ore sono un turno. Il processo poteva partire la mattina, raccogliere tutto il giorno e chiudersi da solo.

Il resto è venuto in fretta. Ore motore, cicli, allarmi, stati. Nel giro di pochi giorni i dati arrivavano nel gestionale, aggiornati quasi in tempo reale, sovrapponibili a quelli del portale. Funzionava.

## I numeri erano sbagliati

Funzionava per modo di dire.

Ce ne siamo accorti per una via traversa: una macchina risultava avere ore motore che non stavano in piedi rispetto ai cicli di lavoro registrati. Non un valore assurdo — un valore *strano*. Il tipo di anomalia che su una macchina vera può benissimo essere una macchina che sta lavorando male, e infatti la prima ipotesi è stata quella.

Il problema era nell'integrazione, e la causa è di quelle che fanno arrabbiare per quanto sono semplici. Quando chiedi più grandezze insieme, l'endpoint non risponde nell'ordine in cui le hai chieste: le riordina secondo un criterio suo. Io avevo fatto la cosa naturale — prima grandezza chiesta, prima colonna della risposta JSON.

Così le ore motore finivano nella colonna dei cicli. Tutti valori nell'intervallo giusto. Tutti perfettamente plausibili.

Nessun errore, nessuna eccezione, nessun valore nullo, nessuna riga di log. Un sistema che dichiara successo, restituisce dati completi, e li mette nel posto sbagliato.

## Perché nessun test lo avrebbe preso

È la parte che vale la pena portarsi a casa, perché non riguarda questo progetto.

Se avessi scritto dei test su quell'integrazione — e ne avevo — sarebbero stati verdi. Un test su un sistema simulato verifica che il tuo codice legga correttamente una risposta **che hai scritto tu**. E tu la scrivi nell'ordine che hai in testa. Il sistema simulato conferma il tuo modello mentale, che è esattamente la cosa che non serve verificare.

Solo il sistema vero riordina. Solo il sistema vero si comporta in un modo che non avevi previsto — perché se l'avessi previsto, l'avresti già gestito.

Non è un argomento contro i test, è un argomento su cosa provano. Un'integrazione con un sistema di terzi ha una classe di errori che vive interamente nello spazio fra quello che credi che l'altro faccia e quello che l'altro fa. Quello spazio si copre in un modo solo: guardando i dati veri e chiedendosi se hanno senso. Da noi ha funzionato un controllo di coerenza fisica — ore di funzionamento che devono stare in un certo rapporto con i cicli — non un test.

## L'endpoint che ho lasciato lì

Mentre leggevo il traffico per capire la lettura, ho visto anche il resto.

Il portale non serve solo a guardare: serve anche a configurare la macchina. Erano chiamate come le altre, sullo stesso sistema, con lo stesso token che avevo già in mano.

Non le ho ricostruite, e la decisione è arrivata prima di provarci, non dopo aver fallito.

## Dove finisce il lavoro

La differenza fra le due cose non è la difficoltà. È che una è reversibile e l'altra no.

Leggere quei dati è un'operazione che il cliente ha già il diritto di fare: sono le sue macchine, sono i suoi numeri, li sta già guardando su quel portale tutti i giorni. L'ho solo automatizzata.

Scrivere una configurazione su una macchina che non è mia, attraverso un canale che nessuno mi ha dato e che nessuno mi garantisce, è un'operazione che non posso verificare e non posso disfare. Non è questione di quanto sia difficile: è che se sbaglio non me ne accorgo io, se ne accorge qualcun altro, altrove, e in un momento che non scelgo.

Non è un limite tecnico che non ho saputo aggirare. È il punto in cui il lavoro finisce — e dirlo al cliente fa parte del lavoro quanto il resto. La risposta è stata: quella configurazione continuerà a farla il costruttore, dal suo portale, con la sua responsabilità.

## Il deliverable non era il codice

Alla fine il gestionale ha ricevuto le ore, i cicli e gli allarmi senza che nessuno li trascrivesse più a mano. Le contestazioni sulle fatture si chiudono guardando una schermata invece di ricostruire una settimana. La manutenzione si programma sui numeri veri.

Ma la cosa che ho consegnato con più cura non è l'integrazione.

È un documento. Come funziona il protocollo, per quanto ne so. Perché il primo accesso passa da un browser, e cosa succederebbe se il costruttore cambiasse quel flusso. Perché le risposte vanno mappate per nome e mai per posizione — con la storia dei numeri nella colonna sbagliata scritta per intero, così che il prossimo non debba ritrovarla da solo. Cosa non è stato costruito, e per quale ragione: non per mancanza di tempo, per scelta. Cosa andrebbe sorvegliato. Cosa resta aperto.

È scritto per qualcuno a cui non sarò io a spiegarlo. Perché un'integrazione basata sull'osservazione di un sistema di terzi ha una data di scadenza che nessuno conosce: il giorno che il costruttore aggiorna il portale qualcosa smette di funzionare, e in quel momento la differenza fra un problema di mezza giornata e una riscrittura da zero è tutta lì dentro.

Il cambiamento che si vede non è nei numeri: è nella fiducia. Il sistema dà riscontro mentre le cose accadono, e quello che viene prodotto si guarda quasi in tempo reale — serve a chi noleggia per sapere come stanno andando le macchine, e serve al cliente finale che ha un resoconto continuo invece di un consuntivo alla fine.

E c'è una conseguenza che vale più della comodità: **i dati non vengono prodotti quando servono, vengono costruiti volta per volta secondo un processo definito.** È la differenza fra un numero che qualcuno ricostruisce a posteriori e un numero che c'era già prima che nascesse la discussione. Quando arriva una controversia, quella differenza è tutto.

**Un'integrazione è finita quando qualcun altro può portarla avanti da solo, compresi i punti dove hai deciso di non arrivare.**

---

*Il caso è reale. Sono stati rimossi i nomi del costruttore, del cliente e dei modelli coinvolti; tempi e scene sono compressi e ricostruiti. Restano fedeli il vincolo sul primo accesso, il riordino silenzioso delle risposte, e il fatto che la decisione di non toccare il canale di configurazione sia stata presa prima di guardarci dentro.*
