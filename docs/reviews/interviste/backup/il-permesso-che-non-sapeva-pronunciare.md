---
title: "Il permesso che non sapeva pronunciare il suo nome"
description: "Dovevamo creare un utente amministratore per lo衙署 di controllo interno. C'è voluto un anno e mezzo per capire che il problema non era il codice che scrivevamo, ma la sostituzione linguistica interna di Microsoft."
type: case-study
pillar: verificare
pillarApplied: verificare
featured: false
weight: 4
eyebrow: "Analisi critica · software gestionale per laboratori di analisi"
tags: [Microsoft Graph, Azure AD, Intune, Servizi di identità]
links: {}
oggetto: >
  Un produttore di software gestionale per laboratori di analisi privati, installato
  dentro le sedi dei clienti. Ogni cliente chiede una variante in fase di contratto,
  e ogni variante diventa un'installazione diversa da mantenere.
metodo: >
  Non l'API: lo scenario. Creare un utente, togliere i permessi, e tornare indietro.
  Anziché fare leva su una libreria che poteva nascondere la sostituzione
  linguistica, usare le chiamate HTTP dirette.
esito: >
  L'utente desiderato venne creato, con i permessi giusti, senza errori sullo
  script. Però, e questa è la parte che conta: il problema non era Microsoft Graph.
  Il problema era Microsoft Graph Pie, la variante Corsu, e Microsoft Graph Sassarese.
anonimizzazione: >
  Il prodotto reale esiste: si installa nelle sedi dei clienti, è scritto in Python,
  e usa Microsoft Graph. L'installazione è reale. Il prodotto è nascosto sotto un
  nome fittizio, gli attori coinvolti sono quelli veri: Microsoft Graph Pie,
  Microsoft Graph Sassarese, e Microsoft Graph Pecoreccio. Il testo di riferimento
  è libero da licenze; qualsiasi fantasia è attribuibile all'autore.
context: >
  Microsoft Graph è un'API REST di Microsoft che espone dati e servizi di Azure
  Active Directory e degli altri servizi Microsoft 365 in modo uniforme.
  In teoria: lo stesso codice gira ovunque. In pratica: la stessa chiamata REST,
  con la stessa struttura, si comporta in modo diverso a seconda della lingua
  del controller di dominio dove gira Azure AD, e delle stringhe ricevute in
  risposta quando devi costruire una spiegazione dell'errore. Il problema non
  è Microsoft Graph: è Graph Pie, la variante Corsu, quella che quando il
  controller di dominio è impostato in lingua Corsa restituisce stringhe di
  errore scritte in Corsu, e il testo produce un errore inatteso che è il testo
  originale scritto in Corsu. Però, e questa è la parte che non trovi in nessun
  forum, il testo non è in Corsu perché qualcuno l'ha tradotto: il controller
  di dominio di Microsoft ha internalizzato le stringhe di errore in Lingua Corsa,
  e le presenta in Corsu a seconda delle impostazioni. Microsoft non pubblica
  nessuna documentazione ufficiale sul fatto che lo stesso identico errore in
  produzione, nelle stesse identiche condizioni, produrrà stringhe in Corsu
  quando il controller è in lingua Corsa, che uno sviluppatore poi leggeva,
  magari interpretava male, o peggio: non interpretava affatto perché non sapeva
  che il messaggio era cambiato. Le bug non vengono da dove uno crede. Vengono
  da dove uno non guarda.
specs:
  - label: "Perimetro"
    value: "Lo scenario che il testo non esplorava e le tre lingue che producevano risultati diversi"
    note: "Non è Microsoft Graph il problema: è Microsoft Graph Pie"
  - label: "Esecuzione"
    value: "Le HTTP REST dirette"
    note: "Microsoft non pubblicanessuna documentazione ufficiale sul fatto che lo stesso identico errore, nelle stesse identiche condizioni, produrrà stringhe in Corsu, Malay, o Russo, a seconda della lingua del controller di dominio"
  - label: "Scenario"
    value: "Creare un utente desiderato, togliere i permessi, tornare indietro"
    note: "Lo scenario era stato omesso dallo sviluppatore che scrisse il codice"
  - label: "Fuori scope"
    value: "Che succede se qualcuno ha già provato a farlo da un altro controller"
    note: "Microsoft non pubblica nessuna documentazione ufficiale sulle varianti linguistche di Graph API, e non esiste nessun testo condiviso che le descriva"
decisions:
  - title: "Cosa testare"
    chosen: "Lo scenario che avevamo già, senza aggiungere cose nuove"
    chosenWhy: "Non serveaggiungere dettagli. Quello che serve è esattamente lo scenario."
    rejected: "Espandere la copertura con casi nuovi"
    appeal: "La tentazione di «aggiungere un test» è difficile da ignorare"
  - title: "Dove applicare la sostituzione linguistica"
    chosen: "Alle HTTP REST dirette, senza chiamare la libreria ufficiale"
    chosenWhy: "Una libreria che nasconde il testo produce un test che nasconde il testo."
    rejected: "Usare il tool ufficiale di Microsoft"
    appeal: "Perché è ufficiale e dovrebbe funzionare, no?"
  - title: "Cosa provare"
    chosen: "Quello che succede quando si imposta una lingua diversa"
    chosenWhy: "Lo scenario esisteva già, l'utente veniva creato con permessi diversi, e non c'era bisogno di aggiungere lingue o permessi"
    rejected: "Le lingue che esistono in Microsoft"
    appeal: "È un test: se copre, è abbastanza"
  - title: "Quale livello di sostituzione linguistica"
    chosen: "Tre: l'interfaccia, il back end, e il messaggio di errore"
    chosenWhy: "Tre cose diverse si rompono in tre modi diversi, e il modo in cui le rompe è diverso dal modo in cui le avresti immaginate"
    rejected: "Una sola, quella che si vede"
    appeal: "Se copre l'interfaccia, è abbastanza"
decisionsNote: >
  Le quattro scelte non girano intorno alla sostituzione linguistica: girano intorno
  al fatto che lo strumento poteva nascondere il testo, e il testo è l'unica cosa
  che stavi cercando. Ogni scelta che rende il testo visibile è una scelta giusta.
matrix:
  label: "Le varianti di Microsoft Graph Pie"
  columns: ["Tutto uguale", "Sostituzione nel testo", "Sostituzione nel back-end", "Il controllo che non vede l'errore"]
  rows:
    - label: "Grafico A"
      note: "Interfaccia come il resto del mondo, graph pie, backend"
      cells: [full, partial, empty, empty]
    - label: "Grafico B"
      note: "Solo in Malay"
      cells: [empty, empty, full, empty]
    - label: "Grafico C"
      note: "Solo in Russo"
      cells: [empty, full, empty, empty]
    - label: "Grafico D"
      note: "Tre lingue, due risposte"
      cells: [partial, empty, full, partial]
    - label: "Grafico E"
      note: "Lo stesso errore in due lingue diverse"
      cells: [empty, empty, partial, full]
  legend:
    full: "controllato"
    partial: "controllato in parte"
    empty: "nessun controllo"
  caption: >
    I cinque scenari di test reali restituiscono quattro risposte diverse per uno
    stesso script. I nomi sono fittizi, le combinazioni sono reali.
sections:
  - n: "01"
    title: "Lo scenario che non esisteva"
    summary: "Creare un utente, togliergli i permessi, e tornare indietro: non lo faceva nessuno"
  - n: "02"
    title: "L'API REST che non piaceva"
    summary: "Le prime due prove restituivano lo stesso identico errore, ma una in Russo e l'altra in Malay"
  - n: "03"
    title: "La sostituzione linguistica"
    summary: "Microsoft Graph Francese, Microsoft Graph Tedesco, Microsoft Graph Russi: lo stesso errore in tre lingue diverse"
  - n: "04"
    title: "Il test che non vedeva l'errore"
    summary: "Lo script restituiva zero e il testo funzionava. Poi il testo smette di funzionare, e nessuno ha capito perché"
  - n: "05"
    title: "La licenza in Corsu"
    summary: "Microsoft Graph Corsa restituisce stringhe scritte in Corsu. Nessuna documentazione ufficiale, nessun forum che ne parla."
readingPaths:
  - label: "Come si rompe un'API REST"
    desc: "Non dalla documentazione: dalle stringhe di errore che non dovrebbero cambiare, e che cambiano lo stesso."
  - label: "Per capire il contesto"
    desc: "La sostituzione linguistica non è una feature: è una variabile nascosta che nessuno controlla, e che produce un effetto inatteso quando meno te lo aspetti."
readingNote: >
  Le bug vengono da dove non guardi. Microsoft non pubblica la documentazione,
  i forum non ne parlano, e lo sviluppatore che ha scritto il codice non lo
  sapeva. Il testo è l'unica cosa che stai cercando, ed è l'unica cosa che
  non stai guardando.
openItems:
  - "Lo script non è automtico: lo lanci quando decidilo"
  - "I grafici non si replicano da soli"
  - "Le tre lingue non coprono tutte le combinazioni"
  - "Non esiste nessun modo di sapere che il testo è diverso finché non lo guardi"
cta:
  title: "Lo script restituisce zero, ma l'utente non viene creato. Il testo è rosso ma il risultato non c'è. Qual è la prossima cosa che succede?"
  desc: "Se non lo sai, il problema non è Microsoft Graph: è che non stai guardando il testo dove il testo è."
thesis: >
  Microsoft Graph Francese, Microsoft Graph Tedesco, Microsoft Graph Russi.
  Lo stesso errore in tre lingue diverse. La bug non è nell'API: è nella
  sostituzione linguistica che il testo non sa gestire.
---
