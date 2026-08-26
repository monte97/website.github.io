---
title: "Tracking live dei mezzi su mappa"
description: "Come ho scelto lo scope, come ho ragionato architettura e test di una companion app .NET MAUI 9 nativa — dalla prima ipotesi al codice verificato."
type: case-study
pillar: progettare
pillarApplied: progettare
featured: true
weight: 2
eyebrow: "Analisi tecnica · un dimostratore per una richiesta vera"
tags: [.NET MAUI, .NET 9, Mobile, Minimal API, xUnit]
links:
  blog: "/blog/verificare/testing/01-unit-test-nuxt3-logica-pura/"
oggetto: >
  Una richiesta arrivata dal campo: un'app mobile che mostri dove sono i mezzi, integrata
  con il gestionale che in ufficio si usa già. Prima di costruirla nel prodotto, un
  dimostratore: mappa nativa, Android e iOS da un solo progetto, dati generati in locale.
metodo: >
  Una sola feature portata end-to-end invece di tre abbozzate, ogni bivio deciso prima di
  scrivere il codice e registrato insieme all'alternativa scartata, verifica proporzionata
  al dimostratore e dichiarata per intero.
esito: >
  Una feature portata end-to-end dallo stesso codice, con mappa nativa: eseguita e vista
  funzionare su iOS, compilata per Android.
  Ogni bivio e' registrato con l'alternativa scartata, e la verifica e' dichiarata per
  intero: cosa e' coperto da test, cosa e' stato provato a mano, cosa non e' verificato e
  perche'.
anonimizzazione: >
  Il committente non è nominato. Il dimostratore non tocca le API né i dati del prodotto:
  il flusso è generato in locale, perché serviva mostrare la forma della cosa, non la cosa.
problem: >
  Chi sta in cantiere voleva vedere i mezzi sul telefono, non aprire il gestionale
  d'ufficio. Una richiesta legittima e vaga insieme: nessuno sapeva dire quanto grande
  fosse il lavoro, né se ne valesse la pena.
context: >
  L'obiettivo non era coprire più funzionalità possibili ma mostrare il modello di lavoro:
  come affronto lo scope, come prendo le decisioni tecniche, come verifico che quello che
  ho costruito funzioni davvero. Il repo è organizzato sui tre pilastri — progettare,
  verificare, automatizzare — e ognuno ha un'evidenza concreta nel codice, non una
  menzione in un documento.
specs:
  - label: "Feature"
    value: "Tracking live dei mezzi su mappa"
    note: "Tap su un marker e vista elenco aprono la stessa pagina di dettaglio"
  - label: "Stack"
    value: ".NET 9 · .NET MAUI 9 nativa · CommunityToolkit.Mvvm · ASP.NET Core Minimal API"
  - label: "Target"
    value: "Android e iOS, stesso codice applicativo"
    note: "Single project multi-target: cambiano solo build, signing e manifest. Provato in esecuzione su iOS, compilato per Android"
  - label: "Dati"
    value: "Interamente mock, generati in locale da un simulatore in-process"
  - label: "Fuori scope"
    value: "Rapportini, scadenze documentali, integrazione con API di terzi, pubblicazione sugli store"
decisions:
  - title: "Quante feature"
    chosen: "Una sola, end-to-end: tracking live"
    chosenWhy: "Una feature che funziona davvero dimostra il modello di lavoro."
    rejected: "Tre aree abbozzate"
    appeal: "Copre più superficie e sembra un prodotto più completo."
  - title: "Rendering mappa"
    chosen: "Controllo nativo Maps"
    chosenWhy: "Dimostra il modello nativo di MAUI, che è il punto della demo."
    rejected: "Libreria JS di mappe in webview"
    appeal: "Più effetto a parità di sforzo — ma dimostra web dentro una webview."
  - title: "Backend mock"
    chosen: "Un solo servizio, simulatore in-process"
    chosenWhy: "Stesso valore dimostrativo, metà infrastruttura da mantenere."
    rejected: "Generatore e gateway separati"
    appeal: "Pattern valido e più realistico, ma due container per la stessa dimostrazione."
  - title: "Shell della app"
    chosen: "App tutta nativa"
    chosenWhy: "Un layer web in meno, senza perdere nulla di dimostrativo."
    rejected: "Schermata d'ingresso in webview"
    appeal: "Riuso immediato di componenti web già pronti. Rimossa in revisione."
  - title: "Animazione marker"
    chosen: "Stretch goal esplicito"
    chosenWhy: "La demo resta presentabile anche a scatti, e il rischio è isolato."
    rejected: "Custom handler nativo subito"
    appeal: "L'effetto migliore della demo — e il pezzo più rischioso sui tempi."
  - title: "Nativo o web"
    chosen: "Applicazione mobile nativa"
    chosenWhy: "La mappa a schermo intero, il tocco su un mezzo e l'aggiornamento continuo si vedono per quello che sono solo su un telefono vero."
    rejected: "Una web application ordinaria, aperta dal browser del telefono"
    appeal: "Avrebbe risposto alla richiesta con meno lavoro, riusando quello che già c'era. Ed è la parte che vale la pena dire: la scelta nativa non era l'unica strada tecnica possibile."
decisionsNote: >
  Il filo che tiene insieme i sei bivi è sempre lo stesso: cosa dimostra davvero questa
  scelta. Non cosa fa più effetto, non cosa è più moderno in astratto. È lo stesso criterio
  con cui, su un progetto vero, si decide dove spendere il budget di rischio.
flow:
  label: "Diagramma a blocchi"
  caption: "Due progetti in una soluzione, separati dal confine HTTP come sarebbero in produzione"
  nodes:
    - kind: "App"
      name: "MAUI 9 nativa"
      desc: "Mappa, elenco e dettaglio leggono la stessa collezione osservabile: un solo punto di verità, e il dettaglio non fa una seconda chiamata di rete."
      key: true
      edge: "polling ogni ~4 s"
    - kind: "Confine"
      name: "Contratto condiviso"
      desc: "Progetto referenziato da entrambi i lati: una modifica al formato si rompe a compile-time, non a runtime."
      edge: "GET /current/equipment"
    - kind: "Gateway"
      name: "Mock · Minimal API"
      desc: "Risponde con lo stato corrente tenuto in memoria. Nessun database, nessuna coda."
      edge: "aggiorna"
    - kind: "Simulatore"
      name: "Processo in background"
      desc: "Muove le posizioni indipendentemente dalle richieste e degrada una quota deterministica di mezzi: la demo si comporta uguale a ogni esecuzione."
actions:
  - "Scope deciso come processo: una feature portata fino in fondo, le altre due nemmeno abbozzate come schermate vuote"
  - "Composition root unico: client HTTP tipizzato e registrato, nessun singleton statico sparso nelle pagine"
  - "Loop di polling con timer asincrono, eccezioni catturate per tipo e aggiornamento della collezione marshallato esplicitamente sul thread UI"
  - "Guardia di avvio senza lock per il polling, testata con cento chiamate concorrenti"
  - "La logica che può rompersi estratta fuori dal framework, in una funzione pura e deterministica — ed è quella con più test"
  - "Sottoscrizioni al ciclo di vita rese simmetriche e idempotenti dopo un leak emerso in code review"
result:
  - "Una feature che funziona end-to-end sullo stesso codice applicativo, con la mappa nativa e non una webview: provata in esecuzione su iOS, compilata per Android"
  - "Un log delle decisioni in cui ogni scelta è registrata insieme all'alternativa scartata e al motivo dello scarto"
  - "Una verifica dichiarata per intero: cosa è coperto da test automatici, cosa è stato provato a mano, e cosa non è verificato e perché"
sections:
  - n: "01"
    title: "Il dimostratore"
    summary: "Una sola feature, portata fino in fondo"
  - n: "02"
    title: "Lo scope come processo"
    summary: "I sei bivi, e i motivi dello scarto"
  - n: "03"
    title: "Architettura in una vista"
    summary: "App nativa, gateway mock, contratto condiviso"
  - n: "04"
    title: "Come ho ragionato i test"
    summary: "Failure mode considerati, coperti e dichiarati"
  - n: "05"
    title: "Cosa resta aperto"
    summary: "Stretch goal e confini dichiarati"
readingPaths:
  - label: "Per decidere"
    desc: "Lo scope come processo e le decisioni: come scelgo cosa costruire quando il tempo è finito e il budget di rischio è uno solo."
  - label: "Per valutare"
    desc: "Architettura e test: come è organizzato il codice e cosa è stato davvero verificato, con i confini dichiarati."
readingNote: >
  Processo prima del prodotto: le decisioni contano quanto il codice, e le alternative
  scartate sono parte del risultato.
shots:
  - src: "/img/case-study/tracking-mobile/01-tracking.png"
    caption: "Tracking live sulla mappa nativa"
  - src: "/img/case-study/tracking-mobile/02-flyout.png"
    caption: "Navigazione: una sola voce, nessun bottone sulla mappa"
  - src: "/img/case-study/tracking-mobile/03-elenco-mezzi.png"
    caption: "Elenco mezzi, stessa sorgente della mappa"
  - src: "/img/case-study/tracking-mobile/04-dettaglio.png"
    caption: "Dettaglio, raggiunto da entrambi i punti d'ingresso"
shotsNote: "Schermate reali, iOS Simulator. Nessun mockup: sono catture dell'app in esecuzione."
openItems:
  - "Su Android è verificata la compilazione, non l'interfaccia in esecuzione: l'emulatore non è mai stato installato, per scelta. Tutte le schermate mostrate vengono dal simulatore iOS"
  - "Animazione dei marker fra un poll e l'altro: stretch goal dichiarato, non implementato"
  - "Nessuna pubblicazione sugli store, nessun signing di produzione"
  - "La verifica è proporzionata a un dimostratore: i test automatici coprono il contratto del gateway e le trasformazioni pure, le build e alcune prove runtime restano manuali"
  - "Le altre due aree candidate del caso di partenza non sono state costruite — e non sono state nemmeno abbozzate"
thesis: "Senza l'alternativa scartata, una decisione è indistinguibile da un'abitudine."
---

## Una feature, fino in fondo

Il caso di partenza elencava tre aree candidate. Ne ho costruita una sola, portandola end-to-end: tracking live dei mezzi su mappa nativa, con due punti d'ingresso — il tap sul marker e la riga dell'elenco — che portano alla stessa pagina di dettaglio, alimentata dalla stessa sorgente in memoria.

Le altre due aree non sono state abbozzate come schermate vuote. Una schermata vuota è una promessa che il codice non mantiene: fa sembrare il prodotto più completo e lo rende meno credibile appena qualcuno la tocca.

## Perché un dimostratore, e non un preventivo

Davanti a una richiesta così, la strada normale è stimare e discutere. Ma stimare una cosa che nessuno ha visto significa discutere di ipotesi, e le ipotesi si difendono male.

Un dimostratore che funziona sposta la conversazione: non si parla più di quanto potrebbe costare, si guarda cosa succede toccando un mezzo sulla mappa e si decide se serve.

C'è però una seconda ragione, e tacerla renderebbe questo pezzo meno utile: **un dimostratore serve anche a convincere.** La stessa richiesta si poteva soddisfare con una web application ordinaria, aperta dal browser del telefono, riusando gran parte di quello che c'era già. L'app nativa non era l'unica strada tecnica: era quella che si vede.

Vale la pena saperlo distinguere, quando si prende una decisione del genere. Non perché sia sbagliato scegliere anche per l'effetto — a volte far vedere è il lavoro — ma perché è una ragione diversa dalle altre, e va messa sul tavolo insieme alle altre invece che nascosta dietro di esse.

## Le decisioni prima del codice

Ogni bivio è stato deciso prima di scrivere il codice corrispondente, e il motivo dello scarto è registrato insieme alla scelta. È una disciplina che costa poco durante e vale molto dopo: sei mesi più tardi, una scelta senza la sua alternativa non si distingue da un'abitudine, e nessuno sa più se fosse una decisione o un riflesso.

Il criterio è sempre lo stesso — *cosa dimostra davvero questa scelta* — ed è la versione da dimostratore della domanda che si fa su un progetto vero: dove conviene spendere il budget di rischio, che è uno solo e non si rigenera.

## Il codice tiene la promessa dell'architettura

Un diagramma è una promessa; quello che la mantiene sono sei o sette punti precisi del codice. Il client HTTP è tipizzato e registrato in un composition root unico, non costruito a mano dentro le pagine. Il polling gira su un timer asincrono e non su un loop con attesa, cattura le eccezioni per tipo invece che con una rete generica, e marshalla l'aggiornamento della collezione sul thread dell'interfaccia — perché toccare da un thread di background una collezione osservata è il crash classico che si manifesta solo sul dispositivo di qualcun altro.

La parte che può davvero rompersi — la sincronizzazione della collezione condivisa — vive fuori dal framework, in una funzione pura e deterministica. È quella con più test, perché se sbaglia sbaglia per tutte e tre le pagine insieme. Svuotare e ricreare la lista a ogni aggiornamento sarebbe stato più semplice da scrivere, e avrebbe fatto sfarfallare mappa ed elenco ogni quattro secondi sotto gli occhi di chi guarda.

Un leak sulle sottoscrizioni al ciclo di vita non era stato previsto in fase di design: è emerso in code review, ed è stato corretto e coperto da test nello stesso giro. Sta scritto perché è più utile di una lista di cose andate bene.

## La verifica, dichiarata per intero

I test automatici coprono il contratto del gateway e le trasformazioni pure e condivise della app. Le build e alcune prove runtime restano manuali. La guardia di avvio è testata con cento chiamate concorrenti; il wire format è verificato leggendo il JSON grezzo, non solo l'oggetto deserializzato, così una regressione del formato si vede prima che se ne accorga la app.

Quello che non è verificato è scritto insieme al motivo. Una verifica proporzionata dichiarata per intero dice più di una copertura alta di cui non si conosce il perimetro.
