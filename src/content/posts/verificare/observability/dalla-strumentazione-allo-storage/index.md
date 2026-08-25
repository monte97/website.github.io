---
title: "Il costo dell'observability si decide in due punti"
seoTitle: "OpenTelemetry e LGTM: architettura e costi"
date: 2025-08-03T09:00:00.000Z
description: "Dove metti il Collector e cosa indicizzi: sono le due scelte che decidono quanto costa osservare un sistema. Topologie a confronto, numeri del trasporto OTLP, modello di storage LGTM."
pillar: verificare
category: observability
mode: explanation
tags:
  - OpenTelemetry
  - Observability
  - Grafana
  - Loki
  - Tempo
  - LGTM
lang: it
reviewed: false
series: observability
seriesOrder: 10
summary:
  - label: "Problema"
    value: "La telemetria costa, e il conto arriva dopo che l'hai già cablata"
    note: "Le due leve stanno nell'architettura, non nella configurazione"
  - label: "Scelta"
    value: "Il Collector come unico punto di uscita, fra applicazione e backend"
    note: "Cambiare destinazione diventa una riga di YAML invece di un rilascio"
  - label: "Strumento"
    value: "OpenTelemetry per generare e trasportare, LGTM per conservare e correlare"
  - label: "Costo reale"
    value: "OTLP compresso su gRPC passa da ~1 KB a ~200 byte per span"
    note: "Con batch da 1000 span l'overhead cala del 95%"
openItems:
  - "I numeri di trasporto e di overhead sono stime indicative dell'ecosistema OpenTelemetry, non benchmark su un sistema specifico: vanno rimisurati sul proprio traffico"
  - "La scelta fra sidecar e gateway dipende da quanti servizi ci sono e da chi li gestisce: sotto una certa scala il gateway è l'unica opzione ragionevole, e questa soglia non è universale"
  - "Il modello di indicizzazione di Loki e Tempo conviene finché le query partono da un'etichetta o da un TraceID: la ricerca testuale su tutto lo storico resta cara"
  - "Qui si parla di architettura e di costi unitari, non di quanto volume produrrete: quella misura arriva solo dal traffico reale"
openNote: "Cosa questa architettura non decide al posto vostro."
caseStudy:
  slug: "dalla-cecita-alla-traccia"
  hook: >
    Le stesse scelte, su un sistema in esercizio: nove servizi, tre linguaggi, un broker
    in mezzo, e un collector come unico punto di uscita.
---

C'è un momento ricorrente nei progetti di observability: il sistema è strumentato, le dashboard funzionano, e qualche mese dopo qualcuno guarda la fattura dello storage e chiede se davvero servano tutte quelle tracce.

A quel punto le leve disponibili sono due, e sono entrambe architetturali. **Dove metti il punto di raccolta**, e **cosa il tuo storage decide di indicizzare.** Sono decisioni che si prendono all'inizio e si pagano per anni: cambiarle dopo significa rimettere le mani su ogni servizio.

Questo articolo è su quelle due scelte. Il seguito della serie — [gli scenari di debug](/blog/verificare/observability/04-correlation/) e poi [il tail sampling con le proiezioni di costo](/blog/verificare/observability/05-management/) — è su cosa ci si fa dopo averle prese.

## Prima di OpenTelemetry ogni vendor aveva il suo dialetto

Vale la pena ricordare perché esiste uno standard, perché spiega la forma di tutto il resto.

Prima di OpenTelemetry, strumentare un'applicazione significava scegliere un fornitore e sposarlo. Ogni piattaforma aveva la propria libreria, il proprio formato, il proprio protocollo. Cambiare backend voleva dire rimettere le mani su ogni servizio: non una migrazione di configurazione, una migrazione di codice.

OpenTelemetry separa tre cose che prima erano un blocco unico:

- **come si genera** la telemetria — l'SDK, dentro l'applicazione
- **come si trasporta** — il protocollo OTLP
- **dove finisce** — il backend, che diventa intercambiabile

![Architettura di OpenTelemetry: l'SDK genera, il Collector raccoglie ed elabora, il backend conserva. I tre livelli sono sostituibili indipendentemente](imgs/otel_arch.png)

La conseguenza pratica è che il fornitore di storage smette di essere una decisione irreversibile. È il motivo principale per cui conviene adottare lo standard anche se oggi si è contenti del proprio backend.

## Il Collector è il punto in cui l'architettura si disaccoppia

Il **Collector** è un processo separato che riceve la telemetria, la elabora e la inoltra. Sembra un dettaglio operativo, ed è invece la scelta che determina cosa potrete cambiare senza rilasciare codice.

La sua pipeline ha tre stadi:

- **receiver** — accetta i dati in ingresso, in OTLP o in altri formati
- **processor** — trasforma: batching, filtri, arricchimento con metadati, rimozione di dati sensibili, campionamento
- **exporter** — invia verso una o più destinazioni

![Pipeline del Collector: receiver, processor ed exporter in sequenza, con più destinazioni possibili in uscita](imgs/otel_pipeline.png)

Ogni cosa che sta nel Collector è una cosa che **non** sta nel codice applicativo. Filtrare i dati personali prima dello storage, mandare i log di audit su una destinazione diversa da quelli tecnici, ridurre il volume campionando: sono tutte decisioni che diventano configurazione, e cambiano con un riavvio invece che con un rilascio.

È anche il punto in cui si concentra il rischio. Se il Collector è uno solo e cade, si perde la telemetria di tutto quello che gli sta dietro — il che porta alla domanda successiva.

## Dove lo metti: sidecar, gateway, o entrambi

Tre topologie, con un compromesso diverso ciascuna.

**Sidecar** — un Collector per servizio, accanto all'applicazione.

| | |
|---|---|
| A favore | isolamento delle risorse per servizio, scaling indipendente, configurazione specifica, e l'applicazione non fa mai chiamate di rete verso il backend |
| Contro | consumo di risorse moltiplicato per ogni istanza, e complessità di deployment che cresce con il numero di servizi |

**Gateway** — un Collector centralizzato che riceve da tutti.

| | |
|---|---|
| A favore | configurazione in un posto solo, risorse condivise, topologia di rete semplice verso i backend |
| Contro | punto singolo di guasto, latenza aggiuntiva fra applicazione e gateway, e collo di bottiglia se non è dimensionato bene |

**Ibrido** — sidecar per la raccolta locale e il batching, gateway per l'elaborazione costosa: campionamento tail-based, trasformazioni complesse, routing verso le destinazioni finali.

La regola che se ne ricava: **il campionamento tail-based richiede di vedere la traccia intera**, quindi non può stare in un sidecar che vede solo il proprio servizio. Se prevedete di ridurre il volume decidendo *dopo* aver visto com'è andata una richiesta — ed è quasi sempre quello che conviene — il gateway non è un'opzione fra le tre: è un pezzo obbligatorio.

## Quanto costa il trasporto

Numeri d'ordine di grandezza, utili per dimensionare prima di misurare:

| | |
|---|---|
| OTLP non compresso | ~1 KB per span |
| OTLP su gRPC con gzip | ~200 byte per span |
| Batch da 1000 span | ~95% di overhead in meno |

Il fattore cinque fra compresso e non compresso non è un'ottimizzazione da fare dopo: è la differenza fra una banda che si nota e una che non si nota, ed è una riga di configurazione.

Sul trasporto la scelta è fra due:

- **gRPC** — serializzazione binaria, multiplexing HTTP/2, compressione integrata. È il default consigliato.
- **HTTP/JSON** — più lento e più verboso, ma passa dalle porte 80 e 443 ed è leggibile a occhio. Si sceglie per compatibilità con reti che non lasciano passare altro, o in fase di debug.

## Perché LGTM costa poco: si indicizza l'etichetta, non il contenuto

Qui sta la seconda leva, ed è quella che spiega la differenza di costo fra due stack che fanno apparentemente la stessa cosa.

I sistemi di log tradizionali indicizzano ogni parola. È il motivo per cui la ricerca testuale è potente, ed è anche il motivo per cui l'indice diventa il costo dominante.

**Loki fa il contrario**: indicizza solo le etichette — `app=checkout-service`, `env=prod` — e conserva i log grezzi compressi su object storage. Una query filtra prima per etichetta, restringendo il campo a pochi flussi, e solo dopo scorre il contenuto:

```
{namespace="production", app="web-app"} |= "error" != "connection refused"
```

**Tempo applica lo stesso principio alle tracce**: indicizza il solo `TraceID` e archivia la traccia completa su object storage. Recuperare una traccia di cui si conosce l'identificativo è immediato.

E qui il modello mostra la sua condizione di validità: **conviene finché sapete da dove partire.** Se arrivate con un'etichetta o con un TraceID, il costo è basso. Se dovete cercare a tappeto su tutto lo storico senza un punto d'ingresso, questo modello non vi aiuta più.

Il che spiega perché la correlazione non sia una comodità ma il presupposto architetturale: è l'alert sulle metriche che vi dà il servizio, è il log che vi dà il `trace_id`, ed è quel `trace_id` che rende economica l'interrogazione di Tempo. Senza il filo che collega i tre segnali, uno storage costruito così diventa scomodo esattamente quanto è economico.

## La topologia in Kubernetes

Messo tutto insieme, il deployment tipico:

![Componenti dello stack in un ambiente containerizzato: applicazioni strumentate, Collector, backend di storage e Grafana come punto di lettura unico](imgs/docker-image_components.png)

- **SDK** dentro l'applicazione, che genera
- **Collector** come DaemonSet o sidecar, che raccoglie
- **Gateway Collector** come Deployment scalabile, dove sta l'elaborazione costosa
- **Loki, Tempo e Mimir** come backend, con object storage sotto
- **Grafana** come unico punto di lettura, che correla i tre segnali

Ogni componente scala orizzontalmente per conto proprio. Lo storage a oggetti è il substrato comune, ed è anche il motivo per cui il conto resta prevedibile: si paga il volume conservato, non l'indice.

## Cosa cambia per chi paga

Le due scelte di questo articolo si traducono in una frase che ha senso fuori dal team tecnico: **il Collector rende il fornitore di storage una decisione reversibile, e il modello a etichette fa sì che conservare più telemetria costi in proporzione al volume e non all'indice.** Insieme, sono la differenza fra un budget di observability che cresce con il traffico e uno che cresce più in fretta del traffico.

Ed è il motivo per cui vale la pena prendere queste decisioni prima di strumentare il primo servizio: sono le uniche due che dopo costano un rifacimento.

## Cosa fare adesso

Se state per cominciare: mettete il Collector fin dal primo servizio, anche se all'inizio si limita a inoltrare. Il costo è un container in più; il beneficio è che il giorno in cui dovrete filtrare, campionare o cambiare destinazione lo farete in un punto solo.

Se siete già strumentati e il conto sale, la prima cosa da guardare non è il campionamento: è se la compressione è attiva e se il batching è configurato. Sono due righe, e valgono il fattore cinque della tabella qui sopra.

Il resto — quali tracce tenere e per quanto — è il tema di [tail sampling e retention](/blog/verificare/observability/05-management/), dove i numeri smettono di essere ordini di grandezza e diventano proiezioni su un traffico concreto.
