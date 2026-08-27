---
title: "La soglia statica risponde alla domanda sbagliata"
seoTitle: "Error budget: la soglia statica non basta"
date: 2026-04-22T09:00:00.000Z
description: "Uno 0,5% sostenuto per un'ora brucia il 30% del budget mensile senza far scattare niente. Alertare sul ritmo di consumo, non sulla soglia."
pillar: verificare
category: observability
tags:
  - Prometheus
  - Observability
  - Alerting
  - SRE
  - SLO
  - ErrorBudget
  - BurnRate
  - PromQL
lang: it
reviewed: machine
series: saturation-alerting
seriesOrder: 30
reproducibility: true
summary:
  - label: "Problema"
    value: "La soglia statica scatta troppo presto o troppo tardi: ignora il ritmo di consumo del budget"
    note: "Uno 0,5% sostenuto per un'ora brucia circa il 30% del budget mensile inosservato"
  - label: "Definizione"
    value: "L'error budget è il complementare dello SLO: una quantità finita che si rinnova"
    note: "99,9% su trenta giorni sono circa 43,2 minuti di servizio degradato al mese"
  - label: "Strumento"
    value: "Multi-window multi-burn-rate del Workbook: alert solo se finestra lunga E corta superano soglia"
    note: "La congiunzione AND gestisce insieme detection time e reset time"
  - label: "Criterio"
    value: "Tre strumenti, tre domande: soglia per su/giù, `predict_linear` per le risorse, burn-rate per il budget"
openItems:
  - "Il burn rate è un numero puro: 2× significa sempre il doppio del sostenibile, ma la soglia in error ratio dipende dallo SLO"
  - "Quali coppie di finestre installare e con quali soglie è il tema del pezzo successivo, non di questo"
  - "Il burn-rate misura qualità vista dall'utente: per la saturazione fisica lo strumento è `predict_linear`, per il semplice su/giù basta il threshold"
openNote: "Il perimetro di questo pezzo, e cosa passa al successivo."
mode: explanation
---

## Quando l'alert scatta, il budget della settimana è già bruciato

Chi ha configurato un alert classico tipo `error_rate > 1%` ha probabilmente già sperimentato i due fallimenti speculari di quella regola. O scatta per ogni picco di errori transiente e diventa rumore che l'oncall impara a ignorare, oppure è così permissivo che quando scatta l'error budget della settimana è già bruciato e il servizio ha smesso di rispettare il proprio SLO da ore. Entrambi gli esiti sono conseguenze dello stesso errore concettuale: alertare sulla metrica istantanea invece che sul **budget consumato nel tempo**.

I due articoli precedenti della serie hanno mostrato come anticipare la saturazione di una risorsa fisica (disco, heap, connection pool): [perché il trend risponde a una domanda diversa dallo stato](/blog/verificare/observability/use-golden-signals-saturation/), e [quale alert serve a quale risorsa](/blog/verificare/observability/prometheus-predict-linear-alert-predittivi/). Qui la domanda cambia di livello d'astrazione: non più "quando si esaurirà la risorsa hardware" ma "a che velocità stiamo bruciando l'error budget del servizio visto dall'utente". La logica di anticipazione è la stessa, ma il soggetto del monitoraggio passa dalla risorsa all'impatto utente, e questo ha conseguenze operative molto concrete sul modo in cui gli alert vanno formulati.

## SLI, SLO ed error budget, in modo operativo

Prima di parlare di alerting serve fissare tre definizioni operative, non filosofiche. Le fonti sono due: il **Google SRE Book, capitolo 4 "Service Level Objectives"** per SLO e SLI, e il **SRE Workbook, capitolo 5 "Alerting on SLOs"** per la parte burn-rate che viene dopo.

Uno **SLI (Service Level Indicator)** è una metrica che misura la qualità del servizio come la vede l'utente, non come la vede l'infrastruttura. La forma canonica che il Workbook raccomanda è un rapporto: `good_events / valid_events`. Esempi concreti: la proporzione di richieste HTTP che ritornano uno status 2xx o 3xx su una finestra di cinque minuti, oppure la proporzione di richieste che restituiscono entro una latenza p99 di 300ms. L'importante è che lo SLI sia osservabile end-to-end dal punto di vista dell'utente, non misurato su una componente interna del sistema.

Uno **SLO (Service Level Objective)** è il target quantitativo per lo SLI su una finestra temporale di calendario. Esempio: "il 99.9% delle richieste HTTP verso `/api/v1/*` deve ritornare uno status 2xx o 3xx su una finestra rolling di trenta giorni". Due numeri e una finestra, niente di più: il target sullo SLI e il periodo di riferimento.

L'**error budget** è semplicemente il complementare dello SLO, espresso come quantità di errore tollerato nella stessa finestra. Se lo SLO è 99.9% su trenta giorni, l'error budget è 0.1%, che tradotto in tempo di servizio degradato diventa circa 43.2 minuti in un mese. È una **quantità finita che si rinnova all'inizio di ogni periodo**, e che può essere bruciata in modo continuo (un errore del 0.1% sostenuto) oppure concentrato (cinque minuti al 100% di errore, poi nulla).

Il SRE Book fissa la definizione in modo operativo:

> "The error budget provides a clear, objective metric that determines how unreliable the service is allowed to be within a single quarter."
>
> Fonte: sre.google/sre-book/embracing-risk/

Il takeaway operativo di questa sezione è uno solo, ed è il cardine di tutto quello che segue: **lo SLO è un contratto con l'utente espresso in termini di budget consumabile**. Gli alert ragionevoli dovrebbero rispondere alla domanda "stiamo consumando il budget a un ritmo sostenibile per la finestra corrente?", non alla domanda "la metrica istantanea ha superato una soglia arbitraria in questo preciso momento?". Sono due domande diverse, e producono due tipi di alert diversi con profili di errore molto differenti.

## La soglia statica sbaglia da entrambi i lati

La domanda operativa diventa: perché un alert della forma `error_rate[5m] > X` non è sufficiente, qualunque sia `X`? La risposta è che ci sono due modalità di fallimento speculari, ognuna delle quali emerge scegliendo `X` da un lato o dall'altro dello spettro, e che nessun valore intermedio di `X` risolve davvero entrambe.

Il primo fallimento riguarda le soglie aggressive. Una regola tipo `error_rate[5m] > 0.001` (0.1%, esattamente il limite dello SLO) scatta ad ogni burst transiente di errori. Un job batch che fallisce dieci richieste su mille in trenta secondi fa scattare l'alert, l'oncall viene paginato, indaga, non trova nulla di sistemico, l'alert viene silenziato in fretta. Dopo qualche settimana di questo pattern l'alert viene progressivamente disatteso dal team e ignorato anche quando segnalerebbe qualcosa di reale. Alert fatigue certa, con la conseguenza di avere un canale di segnalazione rumoroso che non comunica più informazione utile.

Il secondo fallimento è l'opposto ed è quello più insidioso, perché resta invisibile finché non è troppo tardi. Una regola tipo `error_rate[5m] > 0.01` (1%, dieci volte lo SLO) è molto più permissiva e non scatta quasi mai, se non quando il servizio è visibilmente rotto e qualcun altro se n'è già accorto per altre vie. Nel frattempo, un errore sostenuto dello 0.5% per un'ora ha già bruciato circa il 30% dell'error budget mensile, e nessuno lo sa finché non arriva la review di fine mese e il grafico mostra che il servizio non ha rispettato il suo SLO.

Il punto chiave è che il threshold statico risponde alla domanda sbagliata. La soglia "fissa" presume che esista un valore di error rate oltre il quale qualcosa è "rotto", ma questa assunzione ignora la dimensione temporale dell'error budget. La domanda giusta, quella che il SRE Workbook formalizza, è molto diversa: **a che ritmo stiamo consumando il budget rispetto al ritmo sostenibile per l'intera finestra dello SLO?**.

Da qui nasce il concetto di **burn rate**, che è un numero puro senza unità di misura. Si definisce come il rapporto tra il ritmo di consumo attuale del budget e il ritmo sostenibile che lo farebbe durare esattamente per l'intera finestra dello SLO. Per uno SLO del 99.9% su trenta giorni, il burn rate di riferimento 1× corrisponde a un error rate costante dello 0.1%, che brucia l'intero budget esattamente in trenta giorni (il ritmo massimo sostenibile per rispettare lo SLO al limite).

Un burn rate di 2× corrisponde a un error rate dello 0.2%, che brucia l'intero budget in quindici giorni. Un burn rate di 14.4× corrisponde a un error rate dell'1.44%, che brucia il 2% del budget in una sola ora. La tabella 5-2 del SRE Workbook riporta questi valori canonici per diversi orizzonti di detection.

Ragionando in burn rate invece che in error rate assoluto, il numero diventa automaticamente confrontabile tra servizi con SLO diversi: 2× significa sempre "stiamo bruciando il doppio di quanto sostenibile", indipendentemente dal fatto che lo SLO sia 99.9% o 99.95%. E soprattutto diventa la base per alert che rispondono finalmente alla domanda giusta.

## Due finestre in AND: il multi-window del Workbook

Il burn-rate alerting è stato formalizzato da Google nel **SRE Workbook del 2018, capitolo 5 "Alerting on SLOs"**, come evoluzione esplicita delle tecniche di alerting del SRE Book originale. La seconda parte del capitolo introduce la tecnica dei **multi-window multi-burn-rate alerts** per risolvere contemporaneamente due problemi distinti che gli alert single-window non riescono a gestire bene: il **detection time** (quanto velocemente un alert scatta quando il problema inizia) e il **reset time** (quanto velocemente si resetta quando il problema è mitigato).

Il meccanismo si basa su tre ingredienti combinati:

1. Si sceglie una coppia di finestre temporali: una **finestra lunga** che serve per stabilità (per esempio 1h) e una **finestra corta** che serve per reattività del reset (per esempio 5m).
2. L'alert scatta solo se **entrambe** le finestre sono sopra la soglia del burn rate. È una congiunzione logica AND, non un OR.
3. Questa congiunzione risolve il flapping: se un burst si esaurisce in pochi minuti, la finestra corta torna sotto soglia quasi subito e l'alert si resetta rapidamente, mentre la finestra lunga evita che fluttuazioni minori della finestra corta facciano scattare l'alert in primo luogo.

La formula operativa per trasformare una soglia di burn rate in una soglia di error ratio è semplice:

> `burn_rate > X  ⟺  error_ratio > X * (1 - SLO)`

Esempio concreto per SLO 99.9% e burn rate soglia 14.4×: la soglia sull'error ratio diventa `14.4 * 0.001 = 0.0144`, cioè un error rate dell'1.44%. Sopra questo valore su entrambe le finestre, l'alert scatta.

Tradotto in Prometheus, la prima cosa utile è definire due **recording rules** che calcolano lo SLI sulle due finestre di interesse, in modo che la query di alerting sia poi leggera:

```yaml
# Recording rules per SLI su finestre multiple
- record: job:slo_errors:ratio_rate5m
  expr: |
    sum(rate(http_requests_total{status=~"5.."}[5m]))
    /
    sum(rate(http_requests_total[5m]))

- record: job:slo_errors:ratio_rate1h
  expr: |
    sum(rate(http_requests_total{status=~"5.."}[1h]))
    /
    sum(rate(http_requests_total[1h]))
```

Le recording rules sono essenziali per due ragioni. La prima è di performance: calcolare `rate(http_requests_total[1h])` a ogni valutazione dell'alert (ogni quindici o trenta secondi) è molto più costoso che pre-calcolarlo una volta sola e leggerlo. La seconda è di riusabilità: lo stesso valore `job:slo_errors:ratio_rate1h` viene usato da più alert (fast burn, medium burn) e anche da dashboard Grafana, quindi centralizzare il calcolo riduce la possibilità di incoerenze tra regole simili.

Sopra le recording rules si costruisce l'alert `ErrorBudgetBurnRateFast`, che implementa esattamente la congiunzione AND tra finestra corta e finestra lunga:

```yaml
# Alert fast burn: 5m + 1h window, threshold 14.4×
- alert: ErrorBudgetBurnRateFast
  expr: |
    job:slo_errors:ratio_rate5m > (14.4 * 0.001)
    and
    job:slo_errors:ratio_rate1h > (14.4 * 0.001)
  for: 2m
  labels:
    severity: critical
    slo: availability
  annotations:
    summary: "Error budget fast burn rate (14.4x) su availability"
    description: "Il servizio sta bruciando l'error budget a oltre 14.4x il ritmo sostenibile. A questo ritmo il 2% del budget mensile viene bruciato in un'ora."
```

Il `for: 2m` è un buffer aggiuntivo che filtra micro-oscillazioni sul bordo della soglia. La label `severity: critical` è il gancio per il routing in Alertmanager: la fast burn va verso PagerDuty, non verso un canale Slack. Il resto della sezione è la generalizzazione di questo schema alle altre coppie di finestre.

## Tre strumenti, tre domande diverse

La tabella riassume i tre strumenti di alerting della serie e aiuta a capire quale sia appropriato in quale contesto.

| Tecnica | Domanda a cui risponde | Quando usarla | Quando non usarla |
|---|---|---|---|
| **Threshold statico** (`error_rate > X`) | Questa metrica ha superato una soglia? | Mai sugli SLO di servizio. Utile solo per allarmi di liveness/presenza (es. "il servizio è down", `up == 0`). | Per metriche che richiedono contesto temporale, come error rate o latenza. |
| **Predict\_linear** ([due pezzi fa](/blog/verificare/observability/prometheus-predict-linear-alert-predittivi/)) | Quando si esaurirà questa risorsa al ritmo attuale? | Saturation fisica con consumo monotono: disco, heap, connection pool, file descriptors, limit K8s. | Per metriche non-monotone (error rate, latenza), perché l'estrapolazione lineare è senza senso. |
| **Burn-rate multi-window** (pezzo successivo) | A che ritmo stiamo consumando l'error budget? | SLO di servizio visti dall'utente: availability, latency p99, freshness, correttezza dei dati. | Per saturation di risorse fisiche, perché non c'è un "budget" consumabile. |

Il criterio di selezione è la domanda operativa, non il tipo di metrica in senso stretto. Se ci si sta chiedendo quando si esaurirà qualcosa, lo strumento è `predict_linear`. Se ci si sta chiedendo a che ritmo si sta consumando un budget, lo strumento è il burn-rate multi-window. Se ci si sta chiedendo solo "è su o giù", il threshold statico è sufficiente (ma non chiamarlo alerting sugli SLO, chiamarlo quello che è: un health check).

## Cosa cambia per chi paga

Un budget di errore è l'unico modo di dire a chi non scrive codice quanto può costare l'affidabilità: **99,9% su trenta giorni sono quarantatré minuti di servizio degradato al mese, e sono un numero che si può negoziare prima invece che giustificare dopo.** La soglia statica quel numero non lo conosce, e per questo non può dire se lo state rispettando.

## Da dove partire

Prendete un servizio che ha già uno SLO scritto da qualche parte — anche solo in una slide — e calcolatene l'error budget in minuti al mese. Poi guardate l'ultimo incidente e chiedetevi quanti di quei minuti ha consumato.

Se la risposta è "non lo so", non è un problema di alerting: è che nessuno sta misurando il budget, e finché non lo si misura non c'è niente su cui alertare.

Quando quel numero esiste, [le tre coppie di finestre del Workbook](/blog/verificare/observability/burn-rate-alerts-slo-multi-window/) sono il modo per sorvegliarlo: quali installare, con quali soglie, e perché servono tutte e tre.
