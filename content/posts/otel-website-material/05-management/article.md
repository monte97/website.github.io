---
title: "OpenTelemetry in Produzione: Tail Sampling e Retention"
date: 2026-02-05T10:00:00+01:00
description: "Come ridurre il volume dati del 90% senza perdere visibilità sugli errori. Guida pratica con config template e scenario demo."
tags: ["OpenTelemetry", "Observability", "TailSampling", "DataManagement", "Production"]
categories: ["Observability", "DevOps"]
---

Nel [tutorial precedente](https://montelli.dev/posts/otel-website-material/04-correlation/) abbiamo strumentato un e-commerce con OpenTelemetry e risolto tre scenari di debug: silent failure, latency spike, fan-out. Tutto funzionava: trace complete, errori visibili, latenza misurabile.

C'è un dettaglio che non abbiamo affrontato: ogni singola request generava una trace. In sviluppo è il comportamento desiderato. In produzione, è un problema. Per chi non ha familiarità con distributed tracing e OTel, si consiglia la lettura del [tutorial introduttivo](https://theredcode.it/devops/observability-monitoring-intro/).

**Struttura dell'articolo:**
1. Il problema: volume e crescita infinita
2. Tail Sampling: decidere cosa tenere
3. Retention: raggiungere lo steady state
4. Scenario demo: verificare che funzioni
5. Monitoring: verificare il funzionamento
6. Cardinality explosion: un rischio da considerare
7. Sostenibilità: con e senza data management
8. Checklist finale

---

## Il Problema: Volume e Crescita Infinita

Il setup del tutorial precedente tracciava il 100% del traffico. In un ambiente con poche request al minuto questo è trascurabile. Proviamo a proiettare lo stesso approccio su numeri realistici, usando come riferimento il [checkout flow di MockMart](https://github.com/monte97/MockMart): una singola operazione che coinvolge 5 servizi e produce ~8 span.

### Quanto pesano le trace

| Parametro | Valore |
|-----------|--------|
| Request/sec | 100 |
| Span per trace | ~8 (checkout flow) |
| Dimensione span | ~500 bytes |

```text
100 req/s × 8 span × 500 bytes × 86400 sec = 34 GB/giorno
```

1 TB al mese di sole trace, senza contare log e metriche. Scalando il traffico, i numeri peggiorano rapidamente:

| Scenario | Volume/Giorno | Volume/Mese |
|----------|--------------|-------------|
| **Low traffic (100 req/s)** | 34 GB | ~1 TB |
| **Medium traffic (1K req/s)** | 345 GB | ~10 TB |
| **High traffic (10K req/s)** | 3.4 TB | ~100 TB |

**Assunzioni:** ~8 span per trace, ~500 bytes per span.

**Formula:**

```text
1. Span/sec = req/sec × span_per_trace
2. GB/giorno = span/sec × 500 bytes × 86400 / 1e9
3. GB/mese = GB/giorno × 30
```

### Il valore decade, il volume no

A peggiorare il quadro c'è un'asimmetria: il volume di dati cresce in modo costante, ma il valore che offrono decresce nel tempo. Dopo la risoluzione di un incident, le trace correlate perdono progressivamente utilità.

| Periodo | Valore | Uso tipico |
|---------|--------|------------|
| Giorno 0-7 | Alto | Debug attivo, incident response |
| Giorno 7-30 | Medio | Post-mortem, pattern analysis |
| Giorno 30+ | Basso | Audit (solo operazioni critiche) |

Conservare tutto in modo indefinito costa come se ogni dato fosse prezioso, ma il 99% del traffico che non ha generato errori o anomalie non verrà mai consultato.

### Due leve per risolvere il problema

Per rendere sostenibile un sistema di observability servono due meccanismi complementari: uno che riduca ciò che entra, e uno che elimini ciò che è vecchio.

1. **Tail Sampling** - Decide *quali* trace tenere dopo averle osservate per intero. Riduce il volume in ingresso (~90%) mantenendo il 100% di errori e anomalie.
2. **Retention Policy** - Elimina automaticamente i dati più vecchi di una soglia. Lo storage raggiunge uno steady state invece di crescere linearmente.

Nelle prossime sezioni vediamo come configurare entrambi.

---

## Tail Sampling: Decidere Dopo

### Head vs Tail Sampling

**Head sampling** decide all'inizio della trace: "questa trace viene mantenuta al 10%".
Problema: se il 90% scartato conteneva un errore, è perso.

**Tail sampling** decide alla fine: aspetta che la trace sia completa, poi valuta.

```text
Head Sampling:            Tail Sampling:

Request -> Keep 10%       Request -> Trace completa -> Errore? -> KEEP
           Drop 90%                                 -> Lenta?  -> KEEP
                                                    -> Normale -> Sample 10%
```

**Vantaggio:** le trace con errori o latenza anomala vengono sempre mantenute, riducendo al contempo il volume complessivo.

### Tre regole per decidere cosa tenere

OTel mette a disposizione [diverse policy standard](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor), da integrare in modo diretto all'interno delle pipeline, ad esempio:

| Policy | Cosa fa | Rationale |
|--------|---------|-----------|
| `status_code` | KEEP 100% trace con errori (status=ERROR) | Nessun errore escluso dal campionamento |
| `latency` | KEEP 100% trace >1s | Performance issue visibili |
| `probabilistic` | SAMPLE 10% del resto | Baseline per capire il "normale" |

Oltre a queste, il processor supporta policy basate sul contenuto degli span: è possibile filtrare per attributi (`string_attribute`), nome del servizio, o combinazioni di condizioni (`and`, `composite`). Un esempio concreto viene mostrato più avanti con la [policy per audit events](#aggiungere-una-policy-custom-audit-events).


### Configurazione OTel Collector

Il blocco seguente mostra come tradurre le tre policy nella configurazione del `tail_sampling` processor. Le policy vengono valutate indipendentemente: se almeno una policy (es. `status_code` o `latency`) decide di mantenere la trace, questa viene mantenuta anche se altre policy (es. `probabilistic`) deciderebbero di scartarla.

```yaml
processors:
  tail_sampling:
    # Aspetta che la trace sia completa (default: 30s)
    decision_wait: 10s
    num_traces: 50000
    expected_new_traces_per_sec: 100

    policies:
      # 1. KEEP tutti gli errori
      - name: errors-policy
        type: status_code
        status_code:
          status_codes: [ERROR]

      # 2. KEEP request lente (>1s)
      - name: latency-policy
        type: latency
        latency:
          threshold_ms: 1000

      # 3. SAMPLE 10% del resto
      - name: probabilistic-policy
        type: probabilistic
        probabilistic:
          sampling_percentage: 10
```

### Pipeline Completa

La configurazione sopra definisce *cosa* tenere e *cosa* scartare. Resta da definire *come* inserire il tail sampling in pipeline. Da solo non basta: il Collector deve anche proteggersi da picchi di memoria e ottimizzare l'invio dei dati verso il backend. Per questo servono due processor aggiuntivi:

- **`memory_limiter`** (primo): limita l'uso di memoria del Collector. Se il consumo supera la soglia, il Collector inizia a rifiutare dati in ingresso invece di andare in OOM.
- **`batch`** (ultimo): raggruppa gli span in batch prima dell'export, riducendo il numero di chiamate di rete verso Tempo.

L'ordine è importante: `memory_limiter` protegge il processo, `tail_sampling` decide cosa tenere, `batch` ottimizza l'invio.

```yaml
# otel-collector-config.yaml (sezione service)
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, tail_sampling, batch]
      exporters: [otlp/tempo]
```

La config completa è in [`otel-config/data-management/otel-collector-config.yaml`](https://github.com/monte97/MockMart/blob/master/otel-config/data-management/otel-collector-config.yaml).

### Aggiungere una Policy Custom: Audit Events

Le tre policy base coprono errori, latenza e traffico normale. Resta un caso: le operazioni critiche per il business o la sicurezza (checkout, login, payment) che vanno mantenute sempre, indipendentemente da errori o latenza.

Il `tail_sampling` processor supporta policy basate su attributi. È sufficiente aggiungere una policy `string_attribute` che cerchi un attributo specifico sugli span:

```yaml
# Da aggiungere alle policies del tail_sampling
- name: audit-policy
  type: string_attribute
  string_attribute:
    key: audit.event
    values: ["true"]
    enabled_regex_matching: false
```

L'attributo `audit.event` non viene aggiunto automaticamente: va impostato nel codice, nei punti che rappresentano operazioni critiche.

```javascript
const { trace } = require('@opentelemetry/api');

app.post('/api/checkout', async (req, res) => {
  // Marca come audit event - questa trace verrà SEMPRE salvata
  trace.getActiveSpan()?.setAttribute('audit.event', 'true');
  // ... resto della logica
});
```

---

## Retention: Raggiungere lo Steady State

Nella sezione precedente è stato mostrato come ridurre il volume in ingresso. Resta il problema della crescita indefinita: senza un meccanismo di pulizia, anche i dati campionati al 10% si accumulano.

### Quando lo storage smette di crescere

Lo **steady state** è la condizione in cui il volume di storage si stabilizza: la quantità di dati eliminati dal compactor per scadenza della retention eguaglia la quantità di dati nuovi in ingresso. Da quel punto in avanti, lo storage rimane costante indipendentemente dalla durata di funzionamento del sistema.

**Senza retention:**
```text
Giorno 1:   34 GB
Giorno 7:  238 GB
Giorno 30:   1 TB
Giorno 90:   3 TB   <- cresce per sempre
```

**Con retention 7 giorni:**
```text
Giorno 1:   34 GB
Giorno 7:  238 GB
Giorno 8:  238 GB   <- steady state
Giorno 30: 238 GB
```

Il compactor elimina i dati più vecchi della retention, lo storage si stabilizza.

> Per scenari con requisiti di conservazione più lunghi (audit, compliance), è possibile adottare strategie di tiering hot/warm/cold invece di eliminare i dati.

### Configurazione Tempo

```yaml
# tempo-config.yaml
compactor:
  compaction:
    block_retention: 168h
```

> **Nota:** La demo usa `block_retention: 5m` per rendere il test riproducibile in pochi minuti.

---

## Scenario 4: Verifica su MockMart

Questo scenario dimostra tail sampling e retention su [MockMart](https://github.com/monte97/MockMart/blob/master/otel-config/data-management/otel-collector-config.yaml).

### Due Stack, Due Approcci

MockMart offre due configurazioni:

| Stack | Comando | Setup OTel | Uso |
|-------|---------|------------|-----|
| **Base** | `make up` | grafana-lgtm all-in-one, 100% sampling | Sviluppo, tutorial (scenari 1-2-3) |
| **Data Management** | `make up-data-management` | Collector separato, tail sampling, retention | Simil-produzione (scenario 4) |

Gli scenari 1-2-3 del tutorial precedente usano lo stack base. Questo articolo usa lo stack data management.

### Setup

```bash
# Ferma eventuale stack base
make down

# Avvia stack data management
make up-data-management

# Verifica health
make health-data-management

# Verifica che il Collector abbia tail sampling attivo
make check-sampling
```

### Esecuzione Demo Completa

```bash
# Esegui lo scenario completo
make scenario-4
```

Lo script:
1. Mostra le metriche iniziali del Collector
2. Genera 50 request normali (saranno campionate al 10%)
3. Genera 1 request con errore (sarà mantenuta al 100%)
4. Genera 1 request lenta >1s (sarà mantenuta al 100%)
5. Mostra le metriche finali con drop rate

**Output atteso:**

```text
Tail Sampling Metrics:
  Span ricevuti (accepted):    ~400
  Span scartati (dropped):     ~350
  Span esportati (to Tempo):   ~50

  Drop rate: ~87%
  Tail sampling funziona correttamente (target: ~90%)
```

### Verifica in Grafana

In Grafana (`http://localhost/grafana`) -> Explore -> Tempo:

**1. Trace con errore (deve esistere):**
```text
{ status = error }
```

<img src="images/webp/scenario4-error-traces.webp" alt="Trace con errore mantenute dal tail sampling" width="80%">

**2. Trace lenta (deve esistere):**
```text
{ duration > 1s }
```

<img src="images/webp/scenario4-slow-traces.webp" alt="Trace lente mantenute dal tail sampling" width="80%">

**3. Trace normali (solo ~10% esistono):**
```text
{ resource.service.name = "shop-api" }
```

<img src="images/webp/scenario4-normal-traces.webp" alt="Trace normali campionate al 10%" width="80%">

### Verifica Retention

La demo usa una retention di 5 minuti per rendere il test riproducibile.

1. Annotare un trace ID dall'output dello script
2. Cercarlo in Grafana: la trace esiste
3. Attendere 5+ minuti
4. Cercare di nuovo: "Trace not found"

Il compactor ha eliminato la trace.

<img src="images/webp/scenario4-retention.webp" alt="Trace non più trovata dopo la retention" width="80%">

### Comandi Aggiuntivi

```bash
# Genera solo traffico normale
./scripts/scenario-4-data-management.sh --traffic

# Genera solo una request con errore
./scripts/scenario-4-data-management.sh --error

# Genera solo una request lenta
./scripts/scenario-4-data-management.sh --slow

# Controlla metriche tail sampling
./scripts/scenario-4-data-management.sh --check
```

---

## Monitoring: Verificare il Funzionamento

Con tail sampling e retention configurati, è importante verificare che tutto funzioni correttamente.

### Metriche Chiave del Collector

```bash
# Accedi alle metriche
curl http://localhost/services/collector/metrics
```

| Metrica | Significato | Valore Atteso |
|---------|-------------|---------------|
| `otelcol_receiver_accepted_spans_total` | Span in ingresso | Proporzionale al traffico |
| `otelcol_processor_tail_sampling_global_count_traces_sampled_total` | Trace campionate/scartate globalmente (label `sampled`) | ~90% `false` |
| `otelcol_processor_tail_sampling_count_traces_sampled_total` | Trace campionate/scartate per policy (label `policy`, `sampled`) | Dettaglio per policy |
| `otelcol_exporter_sent_spans_total` | Span inviati a Tempo | ~10% degli accepted |

> I nomi riportati includono il suffisso `_total` visibile nell'endpoint Prometheus (`/metrics`). Dashboard e alert usano `rate()` che opera su counter con questo suffisso.

> **Nota:** Il tail sampling processor espone metriche proprie (`global_count_traces_sampled`) invece delle generiche `incoming_items`/`outgoing_items`. La metrica globale con label `sampled=true|false` indica quante trace sono state mantenute o scartate. La metrica per-policy aggiunge il dettaglio su quale policy ha preso la decisione.

**Formula drop rate:**
```text
drop_rate = not_sampled / (sampled + not_sampled) * 100
```

Se drop rate < 50%, il tail sampling non sta funzionando come atteso.

### Dashboard Grafana

Lo stack data management include una dashboard pre-configurata:

```text
Grafana -> Dashboards -> Data Management -> OTel Collector - Data Management
```

<img src="images/webp/scenario4-dashboard.webp" alt="Dashboard OTel Collector - Data Management in Grafana" width="80%">

Pannelli principali:
- **Span Ricevuti (rate):** Span/sec in arrivo
- **Drop Rate (target: 90%):** Percentuale di span scartati dal tail sampling
- **Export Failures (rate):** Target 0
- **Collector Memory Usage:** Consumo RAM del Collector

### Alert Rules

Lo stack include 8 alert rules in [`otel-config/data-management/alerts/`](https://github.com/monte97/MockMart/tree/master/otel-config/data-management/alerts), organizzate in due gruppi. Non si tratta di regole preconfezionate: sono scritte su misura per monitorare il comportamento specifico di questo stack (tail sampling al 90%, retention breve, singola istanza Collector).

**Gruppo 1: `otel-collector-health`** (6 regole)

Monitora il Collector come componente infrastrutturale: è raggiungibile? Sta esportando? Il sampling funziona?

| Alert | Severity | Trigger | Significato |
|-------|----------|---------|-------------|
| `OtelCollectorDown` | critical | `up{job="otel-collector"} == 0` per 1m | Collector non raggiungibile. Nessuna telemetria raccolta. |
| `OtelCollectorExportFailures` | critical | Export failure rate > 100 span/sec (5m) | Collector non riesce a inviare dati a Tempo. |
| `OtelCollectorBackpressure` | warning | Queue size > 5000 per 5m | Collector sovraccarico, rischio perdita span. |
| `OtelCollectorHighMemory` | warning | RSS > 500 MB per 5m | Consumo memoria elevato, considerare scaling. |
| `OtelSamplingRateTooLow` | info | Drop rate < 50% per 10m | Il sampling non sta scartando abbastanza. Config errata o traffico anomalo. |
| `OtelSamplingRateTooHigh` | warning | Drop rate > 99% per 10m | Il sampling scarta quasi tutto. Rischio perdita dati importanti. |

Gli alert sul sampling rate meritano un approfondimento. Il drop rate atteso è ~90% (sampling probabilistico al 10%). La PromQL calcola la percentuale di trace scartate rispetto al totale:

```promql
# Drop rate = trace_scartate / (trace_mantenute + trace_scartate)
(
  rate(otelcol_processor_tail_sampling_global_count_traces_sampled_total{sampled="false"}[5m])
  /
  (
    rate(...{sampled="true"}[5m]) +
    rate(...{sampled="false"}[5m])
  )
)
```

Due soglie complementari delimitano la finestra operativa:
- **< 50%** (`TooLow`): il sampling non funziona. Possibili cause: policy mancanti, errori di config, traffico prevalentemente anomalo (tutti errori o tutti lenti).
- **> 99%** (`TooHigh`): il sampling scarta quasi tutto. Possibile causa: policy probabilistica assente o percentuale a 0%.

**Gruppo 2: `tempo-health`** (2 regole)

Monitora il backend di storage delle trace.

| Alert | Severity | Trigger | Significato |
|-------|----------|---------|-------------|
| `TempoIngestionFailures` | warning | Failure rate > 0 per 5m | Errori nell'ingestione trace. Tempo potrebbe avere problemi di storage. |
| `TempoCompactorBehind` | warning | `tempodb_compaction_outstanding_blocks` > 100 per 15m | Il compactor non riesce a tenere il passo. Retention a rischio. |

Il secondo alert è collegato alla retention: se il compactor accumula ritardo, i blocchi scaduti non vengono eliminati e lo storage cresce oltre lo steady state atteso.

**Verifica alert:**

```bash
# Stato alert in Prometheus (dal container)
docker exec prometheus wget -qO- http://localhost:9090/alerts
```

---

## Cardinality Explosion: Un Rischio da Considerare

Il tail sampling controlla il volume delle trace. Per le metriche, il rischio equivalente è la **cardinality explosion**.

### Come una label può generare milioni di time series

In Prometheus, ogni metrica è una **time series**: una sequenza di coppie (timestamp, valore). Ciò che rende unica una time series è la combinazione di nome metrica e label:

```text
http_requests_total{service="api", endpoint="/users",    status_code="200"}  → serie 1
http_requests_total{service="api", endpoint="/users",    status_code="500"}  → serie 2
http_requests_total{service="api", endpoint="/products", status_code="200"}  → serie 3
```

Ogni combinazione unica di label occupa spazio dedicato: un buffer in memoria, un blocco su disco, un indice. La **metrics cardinality** è il numero totale di queste combinazioni nel sistema. Con poche label a valori limitati (service, endpoint, status_code) il numero resta contenuto. Il problema nasce quando una label ha valori unbounded.

**Esempio con cardinality elevata:**

```javascript
// ❌ MALE - Cardinality explosion
const counter = meter.createCounter('http_requests_total');

counter.add(1, {
  service: 'api',
  endpoint: '/users',
  user_id: 'user123',  // ← 10,000+ valori unici!
  status_code: '200'
});
```

**Calcolo:**
```text
5 services × 50 endpoints × 10000 users × 5 status codes
= 12.5 MILIONI di time series

Storage (stima conservativa): 12.5M × 1 sample/sec × ~2 bytes (TSDB compresso) = 25 MB/sec ≈ 2 TB/giorno
```

Un volume superiore a quello delle trace.

### Eliminare le label unbounded

**Principio fondamentale:** evitare `user_id`, `session_id`, o valori unbounded come label.

```javascript
// ✅ BENE - Cardinality limitata
counter.add(1, {
  service: 'api',
  endpoint: '/users',
  status_code: '200'
  // NO user_id!
});
```

**Cardinality risultante:**
```text
5 services × 50 endpoints × 5 status codes = 1,250 time series
Storage: ~108 MB/giorno - un volume gestibile
```

### Verificare la Cardinality

```promql
# Top 10 metriche per cardinality
topk(10, count by(__name__)({__name__=~".+"}))
```

Metriche con >1000 series richiedono investigazione.

### Alert Cardinality

```yaml
# prometheus-alerts.yaml
- alert: HighCardinalityMetric
  expr: count by(__name__) ({__name__=~".+"}) > 10000
  labels:
    severity: critical
  annotations:
    summary: "Metrica con cardinality eccessiva"
```

---

## Sostenibilità: Con e Senza Data Management

L'observability ha valore solo se è sostenibile nel tempo. Senza gestione del volume, lo storage cresce linearmente fino a rendere necessarie scelte drastiche: disabilitare il tracing o ridurre la retention a poche ore. I numeri seguenti si riferiscono allo scenario low-traffic (100 req/s) visto nella sezione iniziale.

### Proiezione Costi Storage

**Senza data management (100% sampling, no retention):**
```text
Mese 1:    1 TB   → $23/mese
Mese 6:    6 TB   → $138/mese
Mese 12:  12 TB   → $276/mese   ← cresce per sempre
```

**Con data management (10% sampling + 7d retention):**
```text
Mese 1:   24 GB   → $0.55/mese
Mese 6:   24 GB   → $0.55/mese
Mese 12:  24 GB   → $0.55/mese  ← steady state
```

### Impatto per Scenario di Traffico

Applicando il sampling al 10% e una retention di 7 giorni, lo storage si stabilizza:

| Scenario | Con Sampling 10% | Storage Steady (7d) | Costo/Mese |
|----------|------------------|---------------------|------------|
| **Low (100 req/s)** | 3.4 GB/giorno | 24 GB | ~$0.55 |
| **Medium (1K req/s)** | 34 GB/giorno | 238 GB | ~$5.50 |
| **High (10K req/s)** | 345 GB/giorno | 2.4 TB | ~$55 |

**Assunzioni:** storage S3 $0.023/GB, sampling 10% + 100% errori.

### Confronto a 12 Mesi (Low Traffic)

| Aspetto | Senza gestione | Con gestione |
|---------|---------------|--------------|
| Storage cumulativo | 12 TB | 24 GB (steady) |
| Costo storage/anno | ~$1,800 | ~$7 |
| Errori catturati | 100% | 100% |
| Request lente catturate | 100% | 100% |
| Scalabilità | Insostenibile | Prevedibile |

### Il costo della rinuncia

Il costo diretto dello storage è spesso gestibile nei primi mesi. Il rischio maggiore è la reazione a costi crescenti: disabilitare il tracing o ridurre la retention a poche ore. In entrambi i casi si perde la capacità di debug che l'observability doveva garantire.

Con tail sampling e retention configurati, il sistema resta sostenibile senza perdere visibilità sugli errori e sulle anomalie.

---

## Riepilogo

| Problema | Soluzione | Configurazione |
|----------|-----------|----------------|
| Volume alto | Tail sampling | `processors.tail_sampling` nel Collector |
| Crescita infinita | Retention | `compactor.block_retention` in Tempo |
| Cardinality explosion | No unbounded labels | Review codice metriche |
| Verifica funzionamento | Monitoring | Metriche Collector + Dashboard Grafana |

**Risultato con MockMart:**

| Metrica | Senza gestione | Con gestione |
|---------|---------------|--------------|
| Ingest/giorno | 34 GB | ~3.4 GB |
| Storage dopo 30 giorni | 1 TB | ~24 GB (steady state) |
| Errori catturati | 100% | 100% |
| Request lente catturate | 100% | 100% |

90% riduzione volume, nessuna perdita di errori e slow request per il debug.

---

## Checklist Finale

### Prima di Andare in Production

**Setup:**
- [ ] Volume stimato per lo scenario (con il calculator)
- [ ] Collector con tail sampling configurato
- [ ] Tempo con retention policy configurata
- [ ] Audit events marcati nel codice (nella demo: checkout; in produzione anche login, payment)

**Monitoring:**
- [ ] Metriche Collector esposte (:8888/metrics)
- [ ] Alert configurati (backpressure, export failures)
- [ ] Dashboard Grafana creata
- [ ] Alert cardinality configurato

**Cardinality:**
- [ ] Nessun label con valori unbounded (user_id, session_id, email)
- [ ] Cardinality totale < 10,000 time series

### Dopo 7 Giorni di Traffico

- [ ] Drop rate ~90% (check metriche Collector)
- [ ] Storage steady state (non cresce linearmente)
- [ ] Nessun alert scattato (no backpressure, no export failures)
- [ ] Errori e slow request catturati (verifica in Grafana)

Se tutti i check passano, la configurazione di observability è pronta per un roll-out iniziale.

### Next Steps

1. **Settimana 1:** Deploy su 1 servizio in production
2. **Settimana 2-3:** Monitor, valida numeri reali
3. **Settimana 4+:** Roll out graduale ad altri servizi
4. **Continuo:** Tune sampling rate e retention in base ai dati reali

---

## Risorse

**Repository demo:**
- [MockMart su GitHub](https://github.com/monte97/MockMart)

**Documentazione:**
- [OTel Collector Tail Sampling](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor)
- [Tempo Configuration](https://grafana.com/docs/tempo/latest/configuration/)

**Prossimi argomenti:**
- Sampling strategies avanzate (composite policy)
- Multi-tenant sampling
- Cost optimization in cloud

---

*Per domande o feedback: [francesco@montelli.dev](mailto:francesco@montelli.dev) | [LinkedIn](https://www.linkedin.com/in/francesco-montelli/) | [GitHub](https://github.com/monte97)*
