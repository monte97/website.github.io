---
title: "Burn-rate alerts: quando l'error budget brucia più veloce del previsto"
date: 2026-04-22T09:00:00.000Z
description: "Multi-window multi-burn-rate alerting da SRE Workbook cap. 5: alertare sul ritmo di consumo dell'error budget, non sulla soglia statica."
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
  - Grafana
  - PromQL
lang: it
reviewed: machine
series: saturation-alerting
seriesOrder: 20
reproducibility: true
summary:
  - label: "Problema"
    value: "La soglia statica scatta troppo presto o troppo tardi: ignora il ritmo di consumo del budget"
    note: "Uno 0.5% sostenuto per un'ora brucia circa il 30% del budget mensile inosservato"
  - label: "Strumento"
    value: "Multi-window multi-burn-rate del Workbook: alert solo se finestra lunga E corta superano soglia"
    note: "La congiunzione AND gestisce insieme detection time e reset time"
  - label: "Risultato"
    value: "Tre coppie canoniche per SLO mensili: 14.4× su 1h+5m, 6× su 6h+30m, 1× su 3d+6h"
    note: "Budget consumato al firing: 2%, 5% e 10%; reset dettato dalla finestra corta"
  - label: "Prerequisiti"
    value: "Recording rules per lo SLI sulle quattro finestre prima di scrivere gli alert"
    note: "Pre-calcolare `rate[1h]` costa meno e lo stesso valore serve a più alert e dashboard"
openItems:
  - "La demo implementa solo fast e medium: la slow burn su finestra 3d richiede tre giorni di dati reali e non è osservabile in una demo che parte da zero"
  - "I valori della tabella 5-8 valgono per uno SLO mensile di 720 ore: con finestre settimanali o trimestrali i burn rate vanno ricalcolati"
  - "Il burn-rate misura qualità vista dall'utente: per la saturazione fisica lo strumento è `predict_linear`, per il semplice su/giù basta il threshold"
openNote: "Numeri canonici del Workbook, con le condizioni per cui valgono."
---

## Il Problema: l'Alert di Availability che Scatta Troppo Tardi

Chi ha configurato un alert classico tipo `error_rate > 1%` ha probabilmente già sperimentato i due fallimenti speculari di quella regola. O scatta per ogni picco di errori transiente e diventa rumore che l'oncall impara a ignorare, oppure è così permissivo che quando scatta l'error budget della settimana è già bruciato e il servizio ha smesso di rispettare il proprio SLO da ore. Entrambi gli esiti sono conseguenze dello stesso errore concettuale: alertare sulla metrica istantanea invece che sul **budget consumato nel tempo**.

L'articolo precedente della serie ha mostrato come anticipare la saturazione di una risorsa fisica (disco, heap, connection pool) usando `predict_linear` e la definizione di saturation dei Golden Signals. Qui la domanda cambia di livello d'astrazione: non più "quando si esaurirà la risorsa hardware" ma "a che velocità stiamo bruciando l'error budget del servizio visto dall'utente". La logica di anticipazione è la stessa, ma il soggetto del monitoraggio passa dalla risorsa all'impatto utente, e questo ha conseguenze operative molto concrete sul modo in cui gli alert vanno formulati.

Il resto dell'articolo percorre un itinerario preciso. Prima si fissano le definizioni operative di SLI, SLO ed error budget, perché senza quelle la discussione successiva è campata in aria. Poi si vede perché la soglia statica è lo strumento sbagliato, in che modo il SRE Workbook ha formalizzato il multi-window multi-burn-rate alerting come risposta, e quali sono le tre coppie canoniche da installare in produzione. Nelle sezioni successive (parte 6 in poi) si passa a una demo Docker Compose che mostra il comportamento delle tre coppie su un servizio con un errore iniettato, e si chiude con le trappole tipiche e una tabella di selezione pratica.

## SLO, SLI, Error Budget: le Definizioni Operative

Prima di parlare di alerting serve fissare tre definizioni operative, non filosofiche. Le fonti sono due: il **Google SRE Book, capitolo 4 "Service Level Objectives"** per SLO e SLI, e il **SRE Workbook, capitolo 5 "Alerting on SLOs"** per la parte burn-rate che viene dopo.

Uno **SLI (Service Level Indicator)** è una metrica che misura la qualità del servizio come la vede l'utente, non come la vede l'infrastruttura. La forma canonica che il Workbook raccomanda è un rapporto: `good_events / valid_events`. Esempi concreti: la proporzione di richieste HTTP che ritornano uno status 2xx o 3xx su una finestra di cinque minuti, oppure la proporzione di richieste che restituiscono entro una latenza p99 di 300ms. L'importante è che lo SLI sia osservabile end-to-end dal punto di vista dell'utente, non misurato su una componente interna del sistema.

Uno **SLO (Service Level Objective)** è il target quantitativo per lo SLI su una finestra temporale di calendario. Esempio: "il 99.9% delle richieste HTTP verso `/api/v1/*` deve ritornare uno status 2xx o 3xx su una finestra rolling di trenta giorni". Due numeri e una finestra, niente di più: il target sullo SLI e il periodo di riferimento.

L'**error budget** è semplicemente il complementare dello SLO, espresso come quantità di errore tollerato nella stessa finestra. Se lo SLO è 99.9% su trenta giorni, l'error budget è 0.1%, che tradotto in tempo di servizio degradato diventa circa 43.2 minuti in un mese. È una **quantità finita che si rinnova all'inizio di ogni periodo**, e che può essere bruciata in modo continuo (un errore del 0.1% sostenuto) oppure concentrato (cinque minuti al 100% di errore, poi nulla).

Il SRE Book fissa la definizione in modo operativo:

> "The error budget provides a clear, objective metric that determines how unreliable the service is allowed to be within a single quarter."
>
> Fonte: sre.google/sre-book/embracing-risk/

Il takeaway operativo di questa sezione è uno solo, ed è il cardine di tutto quello che segue: **lo SLO è un contratto con l'utente espresso in termini di budget consumabile**. Gli alert ragionevoli dovrebbero rispondere alla domanda "stiamo consumando il budget a un ritmo sostenibile per la finestra corrente?", non alla domanda "la metrica istantanea ha superato una soglia arbitraria in questo preciso momento?". Sono due domande diverse, e producono due tipi di alert diversi con profili di errore molto differenti.

## Perché l'Alert sul Threshold Statico non Basta

La domanda operativa diventa: perché un alert della forma `error_rate[5m] > X` non è sufficiente, qualunque sia `X`? La risposta è che ci sono due modalità di fallimento speculari, ognuna delle quali emerge scegliendo `X` da un lato o dall'altro dello spettro, e che nessun valore intermedio di `X` risolve davvero entrambe.

Il primo fallimento riguarda le soglie aggressive. Una regola tipo `error_rate[5m] > 0.001` (0.1%, esattamente il limite dello SLO) scatta ad ogni burst transiente di errori. Un job batch che fallisce dieci richieste su mille in trenta secondi fa scattare l'alert, l'oncall viene paginato, indaga, non trova nulla di sistemico, l'alert viene silenziato in fretta. Dopo qualche settimana di questo pattern l'alert viene progressivamente disatteso dal team e ignorato anche quando segnalerebbe qualcosa di reale. Alert fatigue certa, con la conseguenza di avere un canale di segnalazione rumoroso che non comunica più informazione utile.

Il secondo fallimento è l'opposto ed è quello più insidioso, perché resta invisibile finché non è troppo tardi. Una regola tipo `error_rate[5m] > 0.01` (1%, dieci volte lo SLO) è molto più permissiva e non scatta quasi mai, se non quando il servizio è visibilmente rotto e qualcun altro se n'è già accorto per altre vie. Nel frattempo, un errore sostenuto dello 0.5% per un'ora ha già bruciato circa il 30% dell'error budget mensile, e nessuno lo sa finché non arriva la review di fine mese e il grafico mostra che il servizio non ha rispettato il suo SLO.

Il punto chiave è che il threshold statico risponde alla domanda sbagliata. La soglia "fissa" presume che esista un valore di error rate oltre il quale qualcosa è "rotto", ma questa assunzione ignora la dimensione temporale dell'error budget. La domanda giusta, quella che il SRE Workbook formalizza, è molto diversa: **a che ritmo stiamo consumando il budget rispetto al ritmo sostenibile per l'intera finestra dello SLO?**.

Da qui nasce il concetto di **burn rate**, che è un numero puro senza unità di misura. Si definisce come il rapporto tra il ritmo di consumo attuale del budget e il ritmo sostenibile che lo farebbe durare esattamente per l'intera finestra dello SLO. Per uno SLO del 99.9% su trenta giorni, il burn rate di riferimento 1× corrisponde a un error rate costante dello 0.1%, che brucia l'intero budget esattamente in trenta giorni (il ritmo massimo sostenibile per rispettare lo SLO al limite).

Un burn rate di 2× corrisponde a un error rate dello 0.2%, che brucia l'intero budget in quindici giorni. Un burn rate di 14.4× corrisponde a un error rate dell'1.44%, che brucia il 2% del budget in una sola ora. La tabella 5-2 del SRE Workbook riporta questi valori canonici per diversi orizzonti di detection.

Ragionando in burn rate invece che in error rate assoluto, il numero diventa automaticamente confrontabile tra servizi con SLO diversi: 2× significa sempre "stiamo bruciando il doppio di quanto sostenibile", indipendentemente dal fatto che lo SLO sia 99.9% o 99.95%. E soprattutto diventa la base per alert che rispondono finalmente alla domanda giusta.

## Multi-window Multi-burn-rate: la Soluzione del Workbook

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

## Le Tre Coppie Canoniche: Tabella 5-8 Riga per Riga

Il SRE Workbook, nella sezione "Multiwindow, Multi-Burn-Rate Alerts" del capitolo 5, non si ferma a una singola coppia di finestre. Propone **tre coppie canoniche** per SLO mensili, ciascuna con una vocazione operativa specifica, e queste tre coppie vanno installate insieme in produzione, non scelte una contro l'altra. La tabella 5-8 del Workbook ("Recommended time windows and burn rates for alerts") è la fonte di riferimento, qui sotto ricostruita con le colonne rilevanti.

> **Nota sulla terminologia**: le etichette "fast burn", "medium burn", "slow burn" non compaiono letteralmente nel Workbook, che parla solo di burn rate + severity (`Page` o `Ticket`). Sono convenzioni diffuse nella community (Sloth, grafana-mixins, post SRE pubblici) che associano un nome operativo a ciascuna riga della tabella. Qui vengono usate nello stesso senso.

| Severity | Finestra lunga | Finestra corta | Burn rate soglia | Budget consumato al firing | Reset time | Vocazione operativa |
|---|---|---|---|---|---|---|
| **Critical (fast burn)** | 1h | 5m | 14.4× | 2% del budget mensile | 5 min | Pagina l'oncall, incidente in corso |
| **Critical (medium burn)** | 6h | 30m | 6× | 5% del budget mensile | 30 min | Pagina l'oncall, problema sostenuto |
| **Warning (slow burn)** | 3d | 6h | 1× | 10% del budget mensile | 6h | Ticket per investigation, non sveglia nessuno |

Vale la pena smontare la tabella riga per riga, perché i numeri che compaiono nelle colonne centrali non sono arbitrari ma derivano da un calcolo preciso.

La formula che lega burn rate, finestra e budget consumato al firing è:

> `budget_consumato = burn_rate * window / SLO_window`

Applicandola alla **fast burn** (burn rate 14.4×, finestra lunga 1h, finestra di riferimento SLO mensile = 720h): `14.4 * 1 / 720 = 0.02`, cioè il 2% del budget consumato al momento in cui l'alert scatta. Per la **medium burn** (6×, 6h su 720h): `6 * 6 / 720 = 0.05`, il 5% del budget. Per la **slow burn** (1×, 3d = 72h su 720h): `1 * 72 / 720 = 0.1`, il 10% del budget. Questi tre numeri (2%, 5%, 10%) sono il costo in budget che si accetta di pagare prima che l'alert corrispondente firi: meno è meglio per la detection, ma più basso implica più rumore da burst transienti.

Il **reset time** è determinato interamente dalla finestra corta, non dalla lunga. Quando il problema viene mitigato, la finestra lunga impiega ore a tornare sotto soglia perché contiene ancora la memoria dell'incidente, ma la congiunzione AND richiede che anche la finestra corta sia sopra soglia, e quella si svuota in fretta: cinque minuti per la fast burn, trenta minuti per la medium burn, sei ore per la slow burn. Questo è esattamente il problema che il multi-window risolve rispetto al single-window: con una sola finestra lunga, l'alert resterebbe firing anche ore dopo la mitigazione, e l'oncall continuerebbe a ricevere pagine per un incidente già chiuso.

La **vocazione operativa** di ciascuna riga è il punto meno tecnico e più importante da tenere presente. La fast burn scatta solo se sta succedendo qualcosa di grave e immediato: è il canale giusto per svegliare l'oncall di notte, perché il 2% del budget in un'ora è un ritmo che, se sostenuto, brucerebbe tutto in due giorni. La medium burn cattura i problemi meno violenti ma più persistenti, tipicamente degradi sostenuti che la fast burn non vedrebbe perché sono sotto il suo burn rate 14.4×. La slow burn è di natura diversa: il suo burn rate 1× corrisponde al massimo ritmo sostenibile, quindi scatta quando il servizio sta rispettando lo SLO al limite, senza mai superarlo bruscamente, e un umano dovrebbe capire perché prima che il margine di sicurezza si esaurisca. Questa è investigation work, non incident response, e va su un canale diurno (ticket, Slack del team) senza svegliare nessuno.

L'insight chiave, che il Workbook ripete esplicitamente, è che le tre coppie sono **complementari, non alternative**. Si installano tutte e tre in produzione, e il routing in Alertmanager distingue per severity: `severity: critical` va a PagerDuty con policy 24/7, `severity: warning` va a Slack o email durante business hours. Il primo errore comune quando si adotta il burn-rate alerting è copia-incollare solo la fast burn lasciando indietro le altre due: così si perde la copertura sui problemi sostenuti a bassa intensità (medium) e sull'erosione silenziosa del margine di sicurezza (slow), che sono esattamente i casi in cui il threshold statico falliva nella sezione 3.

La fonte esatta per i valori di questa tabella è:

> Google SRE Workbook, cap. 5 "Alerting on SLOs", sezione "Multiwindow, Multi-Burn-Rate Alerts" e tabella 5-8.
>
> Fonte: sre.google/workbook/alerting-on-slos/

Vedere queste tre coppie lavorare insieme su un servizio reale chiarisce meglio di qualsiasi tabella il modo in cui si comportano durante un incidente. La sezione successiva mostra un demo Docker Compose minimale con Prometheus e Grafana che simula un servizio HTTP con un errore iniettato, carica le tre coppie come regole di alert, e permette di osservare quale scatta per prima, quando si resetta ciascuna, e come il routing per severity le instrada su canali diversi.

## La Demo: Entrambi gli Alert Scattano a 37 Secondi

Il repository [burn-rate-demo](https://github.com/monte97/burn-rate-demo) contiene uno stack Docker Compose minimale che permette di osservare le coppie canoniche in meno di cinque minuti di wall-clock. I servizi sono quattro: un servizio HTTP finto (`fake-http-service`, FastAPI + `prometheus_client`) che espone un endpoint `/` configurato per restituire uno status 500 con probabilità `ERROR_RATE`, un `load-generator` che fa `curl` al servizio a ritmo costante, un Prometheus con le quattro recording rules (`ratio_rate5m`, `ratio_rate30m`, `ratio_rate1h`, `ratio_rate6h`) e i due alert (`ErrorBudgetBurnRateFast`, `ErrorBudgetBurnRateMedium`), e una Grafana con una dashboard provisioned che visualizza i tassi e lo stato di firing.

Lo SLO target della demo è `99.9%`, quindi un error budget dello `0.1%`. La variabile d'ambiente `ERROR_RATE: "0.50"` iniettata nel servizio è volutamente aggressiva: con il 50% di errori sostenuti le finestre di rate attraversano la soglia molto più rapidamente di un incidente realistico, e questo è necessario per comprimere i tempi di firing in un demo osservabile in pochi minuti. Il comando per avviare lo stack e verificare le regole:

```bash
git clone https://github.com/monte97/burn-rate-demo
cd burn-rate-demo
docker compose up --build -d
# Prometheus su http://localhost:9090, Grafana (anonymous admin) su http://localhost:3000
```

Durante una run verificata, entrambi gli alert passano in stato `firing` intorno ai 37 secondi dall'avvio del load generator. Il motivo è che il rate è calcolato come media mobile sulla finestra, e con un error rate sostenuto del 50% da `t=0` anche le finestre più lunghe (6h) rispecchiano rapidamente la media reale dei campioni disponibili. Questo comportamento non è un bug della demo, è una conseguenza diretta del fatto che `rate()` su PromQL non aspetta di avere la finestra "piena" prima di restituire un valore: calcola il rate sui dati che trova. Nel grafico del pannello "Error rate (multi-window)" le quattro curve 5m, 30m, 1h, 6h salgono in parallelo fino a stabilizzarsi intorno a `0.5`, molto al di sopra della soglia di `0.0144` della fast burn e di `0.006` della medium burn.

![Error rate su finestre multiple: 5m, 30m, 1h, 6h convergono verso 0.5](./burn-rate-error-rate-windows.webp)

Il pannello "Burn rate (fast vs medium)" divide il rate per il budget dello SLO (`0.001`), così la scala verticale è direttamente il burn rate in unità "×". Le due linee guida orizzontali a `14.4` e `6` rendono visibile il momento in cui ciascuna soglia viene attraversata: con `ERROR_RATE=0.50` il burn rate effettivo è di `500×`, due ordini di grandezza sopra la soglia fast burn, quindi nella pratica entrambi gli alert scattano nella prima finestra di valutazione utile.

![Panoramica dashboard con firing di entrambi gli alert](./burn-rate-overview.webp)

Il pannello "Alerts firing" mostra lo stato di firing come step function: `0` quando l'alert è inactive, `1` quando è in firing. Con il 50% sostenuto entrambe le linee passano a `1` quasi simultaneamente e ci restano fino al teardown.

![Alerts firing: fast e medium in stato firing simultaneamente](./burn-rate-alerts-firing.webp)

Per osservare il comportamento di **detection differenziata** (fast burn che scatta prima della medium burn) bisogna abbassare `ERROR_RATE` a un valore più modesto, per esempio `0.03` (3% di errori), e aspettare più tempo. In quel regime il rate sulla finestra 5m supera `0.0144` prima che il rate sulla finestra 30m superi `0.006`, perché la finestra più corta è più reattiva ai cambiamenti. Il pattern operativo da osservare è: la fast burn firerà per prima, paginando l'oncall; se l'incidente persiste abbastanza a lungo da saturare anche le finestre più lunghe, la medium burn firerà come conferma del regime sostenuto.

Per spegnere lo stack: `docker compose down`. Nessun volume persistente, tutto ricreabile da zero in meno di trenta secondi.

## Quello che la Demo non Mostra: la Slow Burn

La tabella 5-8 prevede **tre** coppie canoniche, ma la demo ne implementa solo due. La slow burn (`3d + 6h`, burn rate `1×`) è stata esclusa per una ragione molto concreta: con una finestra lunga di tre giorni, la recording rule `rate(http_requests_total[3d])` ha bisogno di tre giorni di dati reali per restituire un valore stabile. In una demo Docker Compose che parte da zero non c'è modo di osservarla in tempi utili, e forzare il firing con `ERROR_RATE=0.50` produrrebbe solo un risultato inutile (il rate satura la finestra in pochi secondi e l'alert scatta immediatamente, senza fornire informazione sul comportamento "slow").

In produzione la slow burn si installa comunque, insieme alle altre due, con la stessa formula del Workbook:

```yaml
- alert: ErrorBudgetBurnRateSlow
  expr: |
    job:slo_errors:ratio_rate6h > (1 * 0.001)
    and
    job:slo_errors:ratio_rate3d > (1 * 0.001)
  for: 15m
  labels:
    severity: warning
    slo: availability
  annotations:
    summary: "Error budget slow burn rate (1x) su availability"
    description: "Il servizio sta bruciando l'error budget al massimo ritmo sostenibile. Investigate prima che il margine di sicurezza si esaurisca."
```

Il `for: 15m` è volutamente generoso, perché la slow burn non è un incidente: è un segnale di erosione del margine di sicurezza che va investigato in orario lavorativo, non dopo tre minuti di osservazione.

## Trappole Tipiche nell'Adozione

Durante l'adozione del burn-rate alerting tornano ricorrenti alcuni errori, che meritano di essere esplicitati perché compaiono anche in codebase con osservabilità altrimenti curata.

Il primo errore è **copia-incollare solo la fast burn** e dimenticare medium e slow. È la trappola più comune: la fast burn è pedagogicamente la più facile da spiegare, scatta per prima durante le demo, e sembra coprire gli incidenti "importanti". Ma lascia scoperti tutti i regimi di errore sostenuti a bassa intensità (quelli che la medium burn cattura) e l'erosione silenziosa del margine (quella che la slow burn cattura). La raccomandazione del Workbook è installare **tutte e tre** le coppie insieme, con routing diverso per severity, non sceglierne una come "abbastanza buona".

Il secondo errore è **calcolare il rate sulla metrica sbagliata**. Lo SLI deve misurare la qualità del servizio dal punto di vista dell'utente, non dal punto di vista dell'infrastruttura. Un rate calcolato su `http_requests_total{job="my-service"}` va bene, ma un rate calcolato su `container_cpu_usage_seconds_total` o `nginx_upstream_errors_total` sta misurando una componente interna e non rispecchia l'esperienza utente. Se un errore infrastrutturale viene mascherato dai retry del client, l'utente non lo vede e il burn-rate alert non dovrebbe considerarlo.

Il terzo errore è **sbagliare la finestra di riferimento dello SLO** nella formula del budget consumato. La tabella 5-8 è costruita per uno SLO mensile (720 ore). Se lo SLO è trimestrale (2160 ore) o settimanale (168 ore), le percentuali di budget consumato al firing cambiano e i burn rate soglia andrebbero ricalcolati proporzionalmente. Applicare i valori della tabella a uno SLO settimanale senza riscalare è un errore concettuale che porta ad alert troppo rumorosi (fast burn che scatta per episodi che consumano il 30% del budget settimanale in un'ora, non il 2% del mensile).

Il quarto errore è **usare il multi-window per metriche non-SLO**. Il burn-rate ha senso per metriche di qualità del servizio come viste dall'utente (availability, latency p99, error ratio end-to-end). Applicarlo a metriche di saturation fisica (CPU, memoria, disco) è un misuso: per quelle la domanda giusta è "quando si esaurirà la risorsa", e lo strumento corretto è la proiezione (`predict_linear`), come visto nell'articolo precedente della serie. Le due tecniche sono complementari ma rispondono a domande diverse e operano su domini diversi.

## Quando Usare Cosa: Tabella di Selezione

La tabella riassume i tre strumenti di alerting visti finora e aiuta a capire quale sia appropriato in quale contesto.

| Tecnica | Domanda a cui risponde | Quando usarla | Quando non usarla |
|---|---|---|---|
| **Threshold statico** (`error_rate > X`) | Questa metrica ha superato una soglia? | Mai sugli SLO di servizio. Utile solo per allarmi di liveness/presenza (es. "il servizio è down", `up == 0`). | Per metriche che richiedono contesto temporale, come error rate o latenza. |
| **Predict\_linear** (articolo precedente) | Quando si esaurirà questa risorsa al ritmo attuale? | Saturation fisica con consumo monotono: disco, heap, connection pool, file descriptors, limit K8s. | Per metriche non-monotone (error rate, latenza), perché l'estrapolazione lineare è senza senso. |
| **Burn-rate multi-window** (questo articolo) | A che ritmo stiamo consumando l'error budget? | SLO di servizio visti dall'utente: availability, latency p99, freshness, correttezza dei dati. | Per saturation di risorse fisiche, perché non c'è un "budget" consumabile. |

Il criterio di selezione è la domanda operativa, non il tipo di metrica in senso stretto. Se ci si sta chiedendo quando si esaurirà qualcosa, lo strumento è `predict_linear`. Se ci si sta chiedendo a che ritmo si sta consumando un budget, lo strumento è il burn-rate multi-window. Se ci si sta chiedendo solo "è su o giù", il threshold statico è sufficiente (ma non chiamarlo alerting sugli SLO, chiamarlo quello che è: un health check).

## Cosa Installare Domani

Il pacchetto minimale di alerting sugli SLO da portare in produzione contiene, per ogni servizio con uno SLO formalizzato, quattro componenti.

1. **Recording rules** per lo SLI su quattro finestre: `ratio_rate5m`, `ratio_rate30m`, `ratio_rate1h`, `ratio_rate6h`. Per la slow burn serve anche `ratio_rate3d`, che Prometheus calcola senza problemi purché la retention sia sufficiente.
2. **Tre alert**: `ErrorBudgetBurnRateFast` (5m+1h @ 14.4×, severity critical), `ErrorBudgetBurnRateMedium` (30m+6h @ 6×, severity critical), `ErrorBudgetBurnRateSlow` (6h+3d @ 1×, severity warning).
3. **Routing in Alertmanager** per severity: critical → PagerDuty 24/7, warning → Slack del team in business hours.
4. **Dashboard Grafana** con i quattro rate affiancati e lo stato di firing delle tre coppie, così durante un incidente l'oncall vede a colpo d'occhio quale coppia è scattata e il tasso di consumo del budget rimanente.

Il terzo articolo della serie affronterà il problema complementare: **come forecastare l'esaurimento dell'error budget** usando tecniche di serie temporali più sofisticate di `predict_linear`, per anticipare non solo la saturazione di una risorsa fisica ma la violazione probabile dello SLO nei giorni successivi. L'obiettivo è chiudere il cerchio tra alerting reattivo (threshold), alerting proattivo sulle risorse (`predict_linear`), alerting sul budget (burn-rate), e infine forecasting sullo SLO.

## Riferimenti

- **Google SRE Book**, cap. 4 "Service Level Objectives": [sre.google/sre-book/service-level-objectives/](https://sre.google/sre-book/service-level-objectives/)
- **Google SRE Workbook**, cap. 5 "Alerting on SLOs", sezione "Multiwindow, Multi-Burn-Rate Alerts" e tabella 5-8: [sre.google/workbook/alerting-on-slos/](https://sre.google/workbook/alerting-on-slos/)
- **Prometheus recording rules**: [prometheus.io/docs/prometheus/latest/configuration/recording_rules/](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- **Repository demo**: [github.com/monte97/burn-rate-demo](https://github.com/monte97/burn-rate-demo)
- **Articolo precedente della serie**: [Prometheus predict\_linear: alert predittivi sulla saturation](../prometheus-predict-linear-alert-predittivi/)
