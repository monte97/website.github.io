---
title: "Tre coppie di finestre, e perché servono tutte e tre"
seoTitle: "Burn-rate multi-window: le tre coppie"
date: 2026-04-23T09:00:00.000Z
description: "Tabella 5-8 del SRE Workbook riga per riga: 14.4× su 1h+5m, 6× su 6h+30m, 1× su 3d+6h. Da dove vengono i numeri e perché non se ne installa una sola."
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
seriesOrder: 40
reproducibility: true
summary:
  - label: "Scelta"
    value: "Tre coppie canoniche per SLO mensili: 14.4× su 1h+5m, 6× su 6h+30m, 1× su 3d+6h"
    note: "Budget consumato al firing: 2%, 5% e 10%; reset dettato dalla finestra corta"
  - label: "Regola"
    value: "Le tre coppie sono complementari, non alternative: si installano insieme"
    note: "Copiare solo la fast burn e' l'errore piu' comune nell'adozione"
  - label: "Prova"
    value: "Nella demo entrambi gli alert scattano a 37 secondi dall'avvio del load generator"
    note: "`rate()` non aspetta la finestra piena: calcola sui dati che trova"
  - label: "Prerequisiti"
    value: "Recording rules per lo SLI sulle quattro finestre prima di scrivere gli alert"
    note: "Pre-calcolare `rate[1h]` costa meno e lo stesso valore serve a piu' alert e dashboard"
openItems:
  - "La demo implementa solo fast e medium: la slow burn su finestra 3d richiede tre giorni di dati reali e non è osservabile in una demo che parte da zero"
  - "I valori della tabella 5-8 valgono per uno SLO mensile di 720 ore: con finestre settimanali o trimestrali i burn rate vanno ricalcolati"
  - "Il routing per severity è dichiarato qui ma configurato altrove: è il tema dell'ultimo articolo della serie"
openNote: "Numeri canonici del Workbook, con le condizioni per cui valgono."
mode: how-to
---

Il ragionamento sul burn rate finisce con un numero puro: 14.4× significa che state bruciando l'error budget quattordici volte più in fretta del sostenibile. Resta la domanda operativa, che è un'altra: **su quale finestra lo misurate, e a che soglia svegliate qualcuno?**

Il SRE Workbook risponde con una tabella, la 5-8, e la risposta non è una coppia di finestre ma tre. Non sono alternative fra cui scegliere quella che vi convince: sono tre regimi di guasto diversi, e installarne una sola lascia scoperti gli altri due — che sono esattamente i casi in cui [la soglia statica falliva](/blog/verificare/observability/error-budget-soglia-statica/).

Qui la tabella viene smontata riga per riga, con i conti che producono i numeri, una demo che mostra le coppie in azione, e i quattro errori che tornano più spesso in adozione.

## Le tre coppie canoniche, riga per riga

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

L'insight chiave, che il Workbook ripete esplicitamente, è che le tre coppie sono **complementari, non alternative**. Si installano tutte e tre in produzione, e il routing in Alertmanager distingue per severity: `severity: critical` va a PagerDuty con policy 24/7, `severity: warning` va a Slack o email durante business hours. Il primo errore comune quando si adotta il burn-rate alerting è copia-incollare solo la fast burn lasciando indietro le altre due: così si perde la copertura sui problemi sostenuti a bassa intensità (medium) e sull'erosione silenziosa del margine di sicurezza (slow), che sono esattamente i casi in cui [il threshold statico falliva](/blog/verificare/observability/error-budget-soglia-statica/).

La fonte esatta per i valori di questa tabella è:

> Google SRE Workbook, cap. 5 "Alerting on SLOs", sezione "Multiwindow, Multi-Burn-Rate Alerts" e tabella 5-8.
>
> Fonte: sre.google/workbook/alerting-on-slos/

Vedere queste tre coppie lavorare insieme su un servizio reale chiarisce meglio di qualsiasi tabella il modo in cui si comportano durante un incidente. La sezione successiva mostra un demo Docker Compose minimale con Prometheus e Grafana che simula un servizio HTTP con un errore iniettato, carica le tre coppie come regole di alert, e permette di osservare quale scatta per prima, quando si resetta ciascuna, e come il routing per severity le instrada su canali diversi.

## Nella demo entrambi gli alert scattano a 37 secondi

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

## Quello che la demo non mostra: la slow burn

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

## Quattro errori che tornano sempre

Durante l'adozione del burn-rate alerting tornano ricorrenti alcuni errori, che meritano di essere esplicitati perché compaiono anche in codebase con osservabilità altrimenti curata.

Il primo errore è **copia-incollare solo la fast burn** e dimenticare medium e slow. È la trappola più comune: la fast burn è pedagogicamente la più facile da spiegare, scatta per prima durante le demo, e sembra coprire gli incidenti "importanti". Ma lascia scoperti tutti i regimi di errore sostenuti a bassa intensità (quelli che la medium burn cattura) e l'erosione silenziosa del margine (quella che la slow burn cattura). La raccomandazione del Workbook è installare **tutte e tre** le coppie insieme, con routing diverso per severity, non sceglierne una come "abbastanza buona".

Il secondo errore è **calcolare il rate sulla metrica sbagliata**. Lo SLI deve misurare la qualità del servizio dal punto di vista dell'utente, non dal punto di vista dell'infrastruttura. Un rate calcolato su `http_requests_total{job="my-service"}` va bene, ma un rate calcolato su `container_cpu_usage_seconds_total` o `nginx_upstream_errors_total` sta misurando una componente interna e non rispecchia l'esperienza utente. Se un errore infrastrutturale viene mascherato dai retry del client, l'utente non lo vede e il burn-rate alert non dovrebbe considerarlo.

Il terzo errore è **sbagliare la finestra di riferimento dello SLO** nella formula del budget consumato. La tabella 5-8 è costruita per uno SLO mensile (720 ore). Se lo SLO è trimestrale (2160 ore) o settimanale (168 ore), le percentuali di budget consumato al firing cambiano e i burn rate soglia andrebbero ricalcolati proporzionalmente. Applicare i valori della tabella a uno SLO settimanale senza riscalare è un errore concettuale che porta ad alert troppo rumorosi (fast burn che scatta per episodi che consumano il 30% del budget settimanale in un'ora, non il 2% del mensile).

Il quarto errore è **usare il multi-window per metriche non-SLO**. Il burn-rate ha senso per metriche di qualità del servizio come viste dall'utente (availability, latency p99, error ratio end-to-end). Applicarlo a metriche di saturation fisica (CPU, memoria, disco) è un misuso: per quelle la domanda giusta è "quando si esaurirà la risorsa", e lo strumento corretto è la proiezione (`predict_linear`), come visto nell'articolo precedente della serie. Le due tecniche sono complementari ma rispondono a domande diverse e operano su domini diversi.

## Cosa installare domani

Il pacchetto minimale di alerting sugli SLO da portare in produzione contiene, per ogni servizio con uno SLO formalizzato, quattro componenti.

1. **Recording rules** per lo SLI su quattro finestre: `ratio_rate5m`, `ratio_rate30m`, `ratio_rate1h`, `ratio_rate6h`. Per la slow burn serve anche `ratio_rate3d`, che Prometheus calcola senza problemi purché la retention sia sufficiente.
2. **Tre alert**: `ErrorBudgetBurnRateFast` (5m+1h @ 14.4×, severity critical), `ErrorBudgetBurnRateMedium` (30m+6h @ 6×, severity critical), `ErrorBudgetBurnRateSlow` (6h+3d @ 1×, severity warning).
3. **Routing in Alertmanager** per severity: critical → PagerDuty 24/7, warning → Slack del team in business hours.
4. **Dashboard Grafana** con i quattro rate affiancati e lo stato di firing delle tre coppie, così durante un incidente l'oncall vede a colpo d'occhio quale coppia è scattata e il tasso di consumo del budget rimanente.

Restano fuori le due domande che chiudono il cerchio: chi riceve ciascuna delle tre coppie e con quale urgenza, e cosa trova chi apre la notifica. Sono il tema di [severity, routing e runbook](/blog/verificare/observability/alert-routing-severity-inhibition/), l'ultimo articolo della serie: una regola scritta bene che arriva sul canale sbagliato produce lo stesso effetto pratico di non averla scritta.

## Riferimenti

- **Google SRE Book**, cap. 4 "Service Level Objectives": [sre.google/sre-book/service-level-objectives/](https://sre.google/sre-book/service-level-objectives/)
- **Google SRE Workbook**, cap. 5 "Alerting on SLOs", sezione "Multiwindow, Multi-Burn-Rate Alerts" e tabella 5-8: [sre.google/workbook/alerting-on-slos/](https://sre.google/workbook/alerting-on-slos/)
- **Prometheus recording rules**: [prometheus.io/docs/prometheus/latest/configuration/recording_rules/](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- **Repository demo**: [github.com/monte97/burn-rate-demo](https://github.com/monte97/burn-rate-demo)
- **Articolo precedente della serie**: [Prometheus predict\_linear: alert predittivi sulla saturation](../prometheus-predict-linear-alert-predittivi/)
