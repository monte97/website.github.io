---
title: "Dalla cecità alla traccia: strumentare una pipeline esistente"
description: "Cosa costa aggiungere l'osservabilità a un sistema costruito senza pensarci: nove servizi, tre linguaggi, un broker in mezzo."
type: case-study
pillar: verificare
pillarApplied: verificare
featured: true
weight: 3
eyebrow: "Case study · osservabilità di un sistema a eventi"
tags: [Osservabilità, OpenTelemetry, Sistemi a eventi, Tracing]
links:
  blog: "/blog/verificare/observability/dalla-strumentazione-allo-storage/"
oggetto: >
  Una piattaforma di telemetria per asset mobili distribuiti sul territorio, in esercizio
  e senza strumentazione: raccolta, normalizzazione, arricchimento, API di consultazione.
metodo: >
  Strumentazione automatica per default, un collector locale verso uno stack di
  osservabilità già esistente, rollout per fasi a partire dal percorso critico del dato.
esito: >
  Il percorso critico del dato è strumentato senza toccare la logica applicativa: agent e
  wrapper al posto del codice. Le tracce si sono rivelate già collegate attraverso i
  topic, quindi sei modifiche pianificate non sono state fatte, non rinviate: dimostrate
  non necessarie. Il resto del sistema è dichiarato fuori perimetro.
anonimizzazione: >
  Committente, fornitori telematici e settore sono omessi; i servizi sono indicati con il
  loro ruolo, non con il loro nome.
sections:
  - n: "01"
    title: "Il quadro"
    summary: "Da dove nascono i segnali, e dove finiscono"
  - n: "02"
    title: "Le decisioni"
    summary: "Il criterio: nessuna riga di codice applicativo per vedere qualcosa"
  - n: "03"
    title: "Configurazione"
    summary: "Tutto ciò che segue è configurazione, non codice"
  - n: "04"
    title: "I segnali"
    summary: "Chi emette cosa, dove finisce, chi lo legge"
  - n: "05"
    title: "Evidenze"
    summary: "Una traccia sola, dal fornitore esterno all'API"
flow:
  label: "Percorso del dato"
  nodes:
    - kind: "Sorgenti esterne"
      name: "Due provider telematici"
      desc: "Polling HTTP, formati diversi"
      edge: "normalizza"
    - kind: "JVM · Scala"
      name: "Servizio di normalizzazione"
      desc: "Modello canonico, pubblica solo il delta"
      edge: "topic standardized"
    - kind: "JVM · Scala"
      name: "Servizio di arricchimento"
      desc: "Unisce telemetria, anagrafica e punti di interesse"
      key: true
      edge: "topic enriched"
    - kind: "Python · Flask"
      name: "Tre API di consultazione"
      desc: "Stato corrente, storico, utilizzo"
decisions:
  - title: "Contesto sui confini Kafka"
    chosen: "Verificare prima se l'automatismo bastava, e tenere il codice manuale come piano di riserva"
    chosenWhy: >
      Le tracce sono risultate collegate attraverso i topic senza alcun intervento sul
      codice: gli header di contesto viaggiano fuori dal payload, quindi gli schemi dei
      messaggi non sono stati toccati e i consumatori non strumentati li ignorano.
    rejected: "Propagare il contesto a mano su ogni confine Kafka, da subito"
    appeal: >
      Era la strada prevista: iniezione ed estrazione degli header nei sei punti
      produttore/consumatore, pianificata prima di provare.
    why: >
      Sei modifiche pianificate non sono state fatte, e non perché siano state rinviate,
      ma perché la verifica ha mostrato che non servivano. Il costo di quella verifica è
      stato una traccia guardata in faccia; il costo di non farla sarebbe stato codice di
      trasporto sparso in sei file, da mantenere per sempre.
specs:
  - label: "Tracce del percorso del dato"
    value: "Dai due servizi JVM e dalle tre API, collegate attraverso i topic"
    note: "Dove si è fermato un dato che non è arrivato in fondo, e quanto ha aspettato in ciascun passaggio"
  - label: "Metriche di macchina virtuale"
    value: "Dall'agent, senza codice: memoria, thread, garbage collection"
    note: "Se un servizio si sta degradando prima che si fermi, e se un riavvio è stato causa o conseguenza"
  - label: "Metriche delle chiamate HTTP"
    value: "Rotte delle API e chiamate in uscita verso le sorgenti esterne"
    note: "Se la lentezza nasce dal sistema o da un fornitore esterno che risponde tardi"
  - label: "Log correlati alla traccia"
    value: "Identificativo iniettato automaticamente nei log Python e in quelli della macchina virtuale"
    note: "Cosa è stato scritto durante quella specifica richiesta, senza cercare per orario"
shots:
  - src: "/img/case-study/observability/trace-end-to-end.png"
    caption: "Albero degli span di una singola traccia, dal prelievo esterno all'arrivo nell'API di consultazione, ogni riga porta la propria durata"
  - src: "/img/case-study/observability/service-graph.png"
    caption: "La topologia dedotta dalle tracce: nessuno l'ha disegnata, è ciò che i servizi hanno dichiarato di fare"
  - src: "/img/case-study/observability/metriche-jvm.png"
    caption: "Quattro ore di memoria del servizio di arricchimento: il dente di sega è il garbage collector sano, ed è la linea di base contro cui un giorno si riconoscerà un'anomalia"
  - src: "/img/case-study/observability/log-con-trace-id.png"
    caption: "L'identificativo di traccia dentro la riga di log applicativa: da qui si apre la traccia corrispondente, e viceversa"
shotsNote: "Cosa si vede senza aver scritto codice."
openItems:
  - "Poi il resto: anagrafiche, rapportini e perimetro, pianificati ma non ancora in esercizio"
cta:
  title: "Sapete dire, adesso, dove si è fermato un dato che non è arrivato?"
  desc: >
    Se la risposta richiede di aprire i log di quattro servizi e incrociarli a mano, il
    problema è che «non è arrivato niente» e «l'abbiamo perso» hanno lo
    stesso aspetto. Strumentare il percorso critico è un lavoro delimitato.
thesis: "La verifica prima del codice non è prudenza generica: vale quando l'alternativa è codice permanente in punti di passaggio. Un paio d'ore di controllo contro sei file da mantenere."
---

## Il quadro

Il dato attraversa quattro servizi e tre topic prima di diventare una risposta HTTP. Il quadro generale (perché in un sistema distribuito le metriche da sole non bastano) l'ho raccontato [qui](/blog/verificare/observability/). Finché ogni servizio parlava solo di sé, un dato mancante in fondo non aveva un'origine: si poteva sapere che l'API restituiva poco, non dove il flusso si era interrotto. Il perimetro di questa strumentazione è il percorso critico del dato, per intero; il resto del sistema viene dopo.

Accanto al percorso del dato ne corre uno secondo, quello dei segnali:

- **Agent e distro**: agent sui due servizi JVM, wrapper sulle tre API Python.
- **Collector**: unico punto di uscita. Raggruppa, marca l'ambiente, smista. I segnali arrivano via gRPC sulla porta 4317.
- **Tracce · metriche · log**: uno stack di osservabilità già esistente presso il committente, non introdotto da questo lavoro.

Il percorso dei segnali è deliberatamente parallelo a quello del dato e non lo attraversa: **nessun servizio parla direttamente con le destinazioni finali**. Cambiare backend è una modifica alla configurazione del collector, non ai nove servizi.

La cecità che pesa di più non riguarda il vedere: riguarda il **distinguere**.

Quando un dato non arriva in fondo, ci sono due spiegazioni possibili (non c'era niente da elaborare, oppure qualcosa l'ha perso per strada) e dall'esterno sono **indistinguibili**. Un'API che restituisce poco ha lo stesso aspetto in entrambi i casi. Peggio: dopo un rilascio, quella stessa ambiguità diventa la domanda «abbiamo rotto qualcosa?», a cui nessuno sa rispondere senza andare a guardare a mano.

E quando invece un dato arriva ma sbagliato, il problema è un altro: capire **in quale punto della catena ha cambiato forma**. Con quattro servizi e tre topic in mezzo, ricostruire chi ha modificato cosa era un lavoro di archeologia, ogni volta da capo.

## Le decisioni

Su un sistema in esercizio, ogni modifica al codice dei servizi è un rischio che va giustificato dal valore che porta. L'osservabilità, all'inizio, non porta nessuna funzionalità: serve a sapere. Da qui il criterio che governa tutte le decisioni di questo lavoro: prendere il massimo che si ottiene senza toccare la logica, e ricorrere al codice solo dove l'automatismo dimostra di non bastare.

**Tre linguaggi, tre meccanismi · un solo protocollo in uscita**

- **Servizi JVM**: agent allegato all'avvio, che strumenta client Kafka, chiamate HTTP in uscita e metriche di macchina virtuale senza ricompilare nulla.
- **Servizi Python**: entrypoint avvolto dal wrapper della distribuzione, che copre le rotte HTTP, il driver del database e i client Kafka.
- **Servizio anagrafiche**: inizializzazione caricata prima dell'applicazione, in un file a parte, così l'applicazione resta ignara della strumentazione.
- **Gateway**: nessun modulo aggiuntivo, solo log strutturati in uscita standard, correlabili per identificativo di richiesta.

**Rollout · dal percorso critico verso il perimetro**

- **Prima fase**: il percorso del dato di telemetria, dalla sorgente esterna alle API. È la parte dove un guasto silenzioso costa di più.
- **Poi il resto**: anagrafiche, rapportini, perimetro. Pianificati, non ancora in esercizio. Dichiararlo è parte del risultato.

### La decisione che vale la pena raccontare per intero

Il criterio si mette alla prova su un punto solo: i confini tra i servizi. Un sistema a eventi si osserva bene o male a seconda che una traccia sopravviva al passaggio attraverso un topic, e questa era la parte per cui era previsto scrivere codice.

La strada prevista era propagare il contesto a mano su ogni confine Kafka, da subito: iniezione ed estrazione degli header nei sei punti produttore/consumatore, pianificata prima di provare.

Le tracce sono risultate collegate attraverso i topic senza alcun intervento sul codice: gli header di contesto viaggiano fuori dal payload, quindi gli schemi dei messaggi non sono stati toccati e i consumatori non strumentati li ignorano. Sei modifiche pianificate non sono state fatte, e non perché siano state rinviate, ma perché la verifica ha mostrato che non servivano. Il costo di quella verifica è stato una traccia guardata in faccia; il costo di non farla sarebbe stato codice di trasporto sparso in sei file, da mantenere per sempre.

La verifica prima del codice non è prudenza generica: **vale quando l'alternativa è codice permanente in punti di passaggio**. Un paio d'ore di controllo contro sei file da mantenere.

La verifica è costata **un paio d'ore**. Il codice che avrebbe evitato, invece, sarebbe rimasto per sempre in sei punti di passaggio, da leggere e mantenere a ogni modifica futura.

È il calcolo che vale la pena esplicitare, perché non è ovvio quando si è di fretta: **il codice è una passività, non un patrimonio.** Ogni riga che non scrivi è una riga che non devi capire fra due anni. Due ore di controllo contro sei file da mantenere per sempre: il conto si fa da solo.

## Configurazione

Tutto ciò che segue è configurazione, non codice.

### Strumentare un servizio JVM

*Cinque variabili d'ambiente, zero righe di codice applicativo*: `docker-compose` del servizio di arricchimento, blocco `environment`:

```yaml
JAVA_TOOL_OPTIONS: "-javaagent:/otel/opentelemetry-javaagent.jar"
OTEL_SERVICE_NAME: "servizio-arricchimento"
OTEL_EXPORTER_OTLP_ENDPOINT: "http://${HOST_IP}:4317"
OTEL_LOGS_EXPORTER: "otlp"
OTEL_METRICS_EXPORTER: "otlp"
```

La prima riga è la decisione: l'agent si allega alla macchina virtuale all'avvio e riconosce da sé le librerie in uso, i tre consumatori Kafka, il produttore, le chiamate HTTP verso l'esterno. Le altre quattro righe dicono soltanto come si chiama il servizio e dove spedire. Senza l'agent, la stessa copertura significava aprire il codice di ogni consumatore e circondare a mano ogni operazione.

### Il punto di uscita unico

*Tre segnali, tre destinazioni, una sola cosa da riconfigurare*: configurazione del collector, sezione `service`:

```yaml
processors:
  resource:            # marca ogni segnale con ambiente e namespace
service:
  pipelines:
    traces:  { receivers: [otlp], processors: [batch, resource], exporters: [tracce] }
    metrics: { receivers: [otlp], processors: [batch, resource], exporters: [metriche] }
    logs:    { receivers: [otlp], processors: [batch, resource], exporters: [log] }
```

I nove servizi conoscono un solo indirizzo: il collector. Le destinazioni finali sono nominate qui e in nessun altro posto. È la ragione per cui il campionamento è rimasto «tutto» in prima battuta: ridurlo è una modifica a questo file, non ai servizi.

## I segnali

Una strumentazione si giudica da cosa permette di chiedere. Per ciascun segnale la tabella dichiara l'origine e la domanda a cui risponde: è questo a rendere la copertura valutabile, perché «strumentato» da solo non si può discutere.

## Evidenze

È la cattura che regge tutto il documento. Un unico albero di span parte dal prelievo presso il fornitore esterno e arriva alla scrittura nell'API di consultazione, attraversando due topic: se la propagazione del contesto non funzionasse, qui si vedrebbero quattro tracce separate invece di una.

1. **Prelievo esterno**: la prima riga, `poll provider-telematico-1`, dura 201,66 ms. Quasi tutto il tempo della traccia sta nell'attesa del fornitore, non nella nostra elaborazione. È la risposta immediata alla domanda «è lento il sistema o è lento il fornitore».
2. **Attraversamento del primo topic**: `standardized publish` e `standardized process` sono padre e figlio. La pubblicazione del servizio di normalizzazione e il consumo del servizio di arricchimento stanno nello stesso albero. Nessuna riga di codice è stata scritta per ottenerlo.
3. **Arrivo all'API**: `enriched receive` in `api-storico`, centinaia di microsecondi, chiude la catena.

Anche la correlazione fra log e tracce è arrivata senza codice: l'iniezione di `trace_id` e `span_id` nel formato di log è una funzione della strumentazione automatica, non una modifica ai punti in cui l'applicazione scrive.

## Cosa è cambiato per chi usa il software

Il riscontro è arrivato da chi il software lo usa tutti i giorni, non da un cruscotto.

**I tempi per ricevere una correzione si sono ridotti in modo evidente, e le correzioni stesse sono migliorate.** Non è un effetto misterioso: quando una segnalazione arriva, la domanda «dove si è fermato» ha una risposta in minuti invece che in mezze giornate, e la correzione parte dal punto giusto invece che dal punto più probabile.

Vale la pena dire da dove nasce tutto questo, perché non è la storia che ci si aspetta: **nessuno l'aveva chiesto.** Non c'è stato un incidente, un audit, un cliente arrabbiato. C'era solo il fastidio crescente di non poter rispondere con precisione a domande semplici, e di non sapere davvero cosa stesse succedendo dentro un sistema che pure funzionava.

## Esito dell'analisi

Il percorso critico del dato è tracciabile dall'inizio alla fine: una singola traccia collega il prelievo dalla sorgente esterna, la normalizzazione, l'attraversamento dei due topic e la scrittura nelle API di consultazione. È stato ottenuto senza modificare una riga della logica dei servizi.

- **Realizzato · Il percorso critico, strumentato e verificato**: collector locale, agent sui due servizi JVM, auto-strumentazione sulle tre API. Tracce collegate attraverso i topic, controllate su una traccia reale end-to-end.
- **Pianificato · Il perimetro, non ancora in esercizio**: anagrafiche, rapportini, gateway, assegnazioni. Stesso meccanismo, nessuna incognita tecnica nuova. È lavoro dimensionabile, non da progettare.
- **Rinviato per scelta · Campionamento e allarmi**: entrambi decidibili a valle, sul collector e sull'interfaccia di consultazione, senza rientrare nei servizi. Rinviarli è ciò che ha reso la prima fase breve.
- **Non affrontato · Ciò che l'osservabilità rende visibile ma non risolve**: alcune fragilità note del sistema (un consumatore senza supervisione, un buffer che scarta sotto carico) ora si vedono. Vederle era il presupposto per poterle discutere.

**Estendere la strumentazione al perimetro, con lo stesso meccanismo.** La prima fase ha già pagato il costo di apprendimento: le fasi successive sono repliche di una configurazione verificata, servizio per servizio, e ognuna vale da sola.
