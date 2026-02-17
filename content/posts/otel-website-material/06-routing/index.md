---
title: "OpenTelemetry in Produzione: Routing dei Dati per Compliance e Costi"
date: 2026-02-12T10:00:00+01:00
description: "Separare log audit da log tecnici con il routing connector dell'OTel Collector. Demo, compliance GDPR/SOC 2 e retention differenziata."
menu:
  sidebar:
    name: "Routing dei Dati"
    identifier: OTEL-6
    weight: 50
    parent: OBS
tags: ["OpenTelemetry", "Observability", "Routing", "Compliance", "Production"]
categories: ["Observability", "DevOps"]
reviewed: true
---

Immaginate di ricevere una richiesta dal team compliance: "Servono i log di audit degli ultimi tre anni." Aprite Grafana, cercate in Loki e scoprite che la retention massima è 30 giorni. I log di audit sono stati cancellati insieme ai debug log, perché vivevano tutti nello stesso backend. Nessuna separazione, nessuna policy dedicata.

L'[articolo precedente](https://montelli.dev/posts/otel-website-material/05-management/) affronta il primo problema della produzione: il **volume**. Con tail sampling e retention, il volume si riduce del 90% senza perdere visibilità sugli errori. Ma resta una domanda: i dati che restano, **dove finiscono?**

Oggi tutto finisce nello stesso backend: log di debug, errori applicativi e audit trail vivono nella stessa istanza Loki. In sviluppo funziona. In produzione potrebbe essere un problema di compliance o di gestione.

---

## Dati diversi, requisiti diversi

In una configurazione standard, il Collector riceve tutti i segnali e li inoltra a un'unica destinazione:

```text
Applicazioni
    |
    v
  OTel Collector
    |
    v
  Loki (tutti i log)
    |
    v
  Grafana (tutto insieme)
```

Tutti i log, indipendentemente dal tipo, finiscono nello stesso posto.

### Compliance e Audit

Normative come **[GDPR](https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX%3A32016R0679)**, **[SOC 2](https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2)** e **[HIPAA](https://www.hhs.gov/hipaa/index.html)** richiedono (o raccomandano fortemente) che i dati audit siano:

- **Segregati** dai log tecnici (accesso separato)
- **Integri e a prova di manomissione** (write-once o append-only)
- **Accessibili solo a chi è autorizzato** (controllo accesso dedicato)
- Conservati per un **periodo definito** (da 1 a 6+ anni a seconda della normativa)

Se audit log e debug log vivono nella stessa istanza Loki, nessuno di questi requisiti è soddisfatto. Chi ha accesso a Grafana per il debug vede anche i dati di audit. Non c'è garanzia di immutabilità. La retention è la stessa per tutto.

### Operatività

Mischiare i flussi crea anche problemi operativi:

| Problema | Esempio |
|----------|---------|
| **Ricerca rumorosa** | Cercare un evento audit tra milioni di log di debug |
| **Costi uniformi** | Pagare la stessa retention per debug log (utili 24h) e audit log (richiesti diversi anni) |
| **Accesso indiscriminato** | Sviluppatori che vedono dati potenzialmente sensibili |
| **Nessuna priorità** | Un picco di debug log rallenta l'ingest anche per gli audit |

### Scenario concreto

Per un applicativo con 100 req/s, il volume giornaliero è:

| Tipo di log | Volume stimato | Utilità | Retention ideale |
|-------------|---------------|---------|-----------------|
| Debug | ~500.000/giorno | Solo per troubleshooting attivo | 24-48 ore |
| Info/Warning | ~200.000/giorno | Monitoring generale | 7-30 giorni |
| Errori applicativi | ~5.000/giorno | Post-mortem, alerting | 30-90 giorni |
| Audit (checkout, login) | ~2.000/giorno | Compliance, forensics | 1-7 anni |

Con una configurazione flat, tutti e 707.000 log/giorno finiscono nello stesso Loki con la stessa retention di 30 giorni. I 2.000 log audit vengono cancellati dopo un mese insieme ai debug log. Questa configurazione non soddisfa i requisiti di compliance.

Il concetto è semplice: **dati diversi hanno requisiti diversi**. Convogliare dati con requisiti eterogenei verso un'unica destinazione impedisce di applicare policy differenziate.

---

## Instradare in base al contenuto

L'OTel Collector può fare di più che raccogliere e inoltrare. Con il **routing connector**, diventa un router che instrada ogni dato in base ai suoi attributi.

### Architettura

```text
Applicazione (log con attributi)
    |
    | OTLP
    v
OTel Collector (Routing Connector)
    |
    +-- audit.event=false --> Loki (log tecnici)
    |
    +-- audit.event=true  --> Audit Service (compliance)
```

| Destinazione | Contenuto | Caratteristiche |
|-------------|-----------|-----------------|
| **Loki** | Info, Debug, Warning, Error | Query veloci, retention breve |
| **Audit Service** | Log audit | Immutabile, accesso controllato, retention 7 anni |

Il principio: **ogni log viene marcato nel codice** con un attributo che indica il tipo. Il Collector legge l'attributo e instrada il log verso la destinazione corretta. L'applicazione non deve sapere dove finiscono i dati: decide solo **cosa** è un dato, non **dove** va.

Questo approccio ha un vantaggio fondamentale: **la logica di routing è centralizzata**. Se domani il team compliance chiede di inviare gli audit log anche su S3, si modifica la configurazione del Collector. Nessun cambio applicativo, nessun deploy dei microservizi.

---

## Il Collector decide la destinazione

La configurazione si basa su tre elementi: **receivers**, **exporters** e **pipelines**. Il routing avviene configurando exporters multipli nella stessa pipeline.

### Configurazione base: split degli exporters

Il punto di partenza è il file `otel-collector-split.yaml` del Module 06:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
      http:

processors:
  batch:

exporters:
  debug:
    verbosity: detailed
  otlphttp/loki:
    endpoint: "http://loki:3100/otlp"
    tls:
      insecure: true
  otlphttp/audit:
    endpoint: "http://audit-service:4000"
    tls:
      insecure: true

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/loki, otlphttp/audit, debug]
```

Questa configurazione invia **tutti i log** a tre destinazioni contemporaneamente:

- **otlphttp/loki**: il backend standard per log tecnici (query via Grafana)
- **otlphttp/audit**: un servizio dedicato che riceve i log via OTLP HTTP
- **debug**: output verbose sulla console del Collector (utile in sviluppo)

> **Nota**: in questa configurazione tutti i log arrivano ovunque. È un fan-out, non ancora routing selettivo. In una configurazione di produzione più avanzata, si usa il **routing connector** per inviare *solo* i log audit all'audit service, filtrando in base all'attributo `audit.event`. Per lo scenario demo, il fan-out è sufficiente a dimostrare la separazione delle destinazioni.

### Routing selettivo con il routing connector

Per una separazione granulare, il routing connector permette di prendere decisioni basate sugli attributi del log. A differenza di un processor (che opera all'interno di una pipeline), il connector si colloca **tra pipeline** diverse: agisce come exporter per la pipeline a monte e come receiver per le pipeline a valle.

```yaml
receivers:
  otlp:
    protocols:
      grpc:
      http:

processors:
  batch:

exporters:
  otlphttp/loki:
    endpoint: "http://loki:3100/otlp"
    tls:
      insecure: true
  otlphttp/audit:
    endpoint: "http://audit-service:4000"
    tls:
      insecure: true

connectors:
  routing/logs:
    default_pipelines: [logs/default]
    error_mode: ignore
    table:
      - context: log
        condition: attributes["audit.event"] == true
        pipelines: [logs/audit]

service:
  pipelines:
    logs/ingestion:
      receivers: [otlp]
      processors: [batch]
      exporters: [routing/logs]
    logs/default:
      receivers: [routing/logs]
      exporters: [otlphttp/loki]
    logs/audit:
      receivers: [routing/logs]
      exporters: [otlphttp/audit]
```

La logica è:

1. La pipeline `logs/ingestion` riceve tutti i log via OTLP e li invia al connector `routing/logs`
2. Il connector valuta la condizione OTTL: se `attributes["audit.event"] == true`, il log viene instradato alla pipeline `logs/audit`
3. Tutti gli altri log finiscono nella pipeline `logs/default` (Loki)

Ogni pipeline a valle può avere i propri processor ed exporter. Le applicazioni non cambiano destinazione: il Collector decide per loro.

> **Nota:** Il routing connector usa **OTTL** (OpenTelemetry Transformation Language) per le condizioni. Con `context: log` si accede direttamente agli attributi del log record. Questo permette di instradare su qualsiasi campo: `severity_number`, `body`, `resource.attributes["service.name"]`, o attributi custom come `audit.event` (purché copiati esplicitamente dallo span al log record tramite logHook - vedi la [sezione successiva](#propagare-gli-attributi-dallo-span-al-log)).

---

## L'applicazione marca, il Collector instrada

Perché il routing funzioni, l'applicazione deve **marcare** i log con gli attributi giusti. Nel Module 06, il `shop-service` aggiunge l'attributo `audit.event` sullo span attivo quando avviene un'operazione sensibile.

### Endpoint di checkout con marcatura audit

```javascript
// shop-service/index.js - endpoint /checkout
app.post('/checkout', async (req, res) => {
    const user = req.body.user || 'anonymous';
    const amount = req.body.amount;

    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
        currentSpan.setAttribute('audit.event', true);
        currentSpan.setAttribute('audit.user', user);
    }

    logger.info({ event: 'audit', user, amount }, 'User checking out');

    res.json({ status: 'processed', orderId: `ORD-${Date.now()}` });
});
```

Cosa succede qui:

1. **`trace.getActiveSpan()`** recupera lo span corrente dal contesto OpenTelemetry
2. **`setAttribute('audit.event', true)`** marca lo span come evento audit
3. **`setAttribute('audit.user', user)`** aggiunge l'identità dell'utente per la tracciabilità
4. Il **log Pino** include `event: 'audit'` come informazione strutturata

### Propagare gli attributi dallo span al log

C'è un dettaglio importante: `setAttribute` sullo span **non** propaga automaticamente l'attributo ai log record. Span e log sono segnali separati in OpenTelemetry; condividono lo stesso `trace_id` e `span_id` (correlazione), ma **non** gli attributi. Senza un passaggio esplicito, il routing connector non vedrebbe `audit.event` sul log record.

La soluzione è un **`logHook`** nella configurazione di `PinoInstrumentation`. Il logHook viene invocato ogni volta che Pino emette un log all'interno di uno span attivo, e permette di copiare attributi dallo span al log record:

```javascript
// instrumentation.js - logHook per propagare attributi audit
instrumentations: [getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-pino': {
        logHook: (span, record) => {
            const auditEvent = span.attributes?.['audit.event'];
            if (auditEvent !== undefined) {
                record['audit.event'] = auditEvent;
                record['audit.user'] = span.attributes?.['audit.user'];
            }
        },
    },
})],
```

Il flusso completo è:

1. **`span.setAttribute('audit.event', true)`** - l'applicazione marca lo span
2. **`logHook`** - l'instrumentazione Pino copia `audit.event` nel log record
3. **Routing connector** - il Collector legge `attributes["audit.event"]` sul log e instrada

Senza il logHook, il Collector vedrebbe `audit.event` solo sullo span (utile per le trace), ma non sul log record. Il routing dei log non funzionerebbe.

L'applicazione non sa dove finirà il log. Sa solo che è un evento audit. La decisione di routing è interamente nel Collector.

### Cosa non marcare

Non tutto deve essere un audit log. Una regola pratica:

| Tipo | Attributo | Esempio |
|------|-----------|---------|
| **Audit** | `audit.event=true` | Checkout, login, modifica permessi, accesso a dati sensibili |
| **Tecnico** | nessun attributo (default) | Debug, info, warning, errori applicativi |

Se in dubbio, non marcare. I log non marcati finiscono nel flusso default (Loki) e sono sempre disponibili per il debug.

---

## Un servizio dedicato per ogni destinazione

L'audit service è un microservizio dedicato a ricevere e persistere i log di audit. Nel Module 06 è implementato come un server Express minimale:

```javascript
// audit-service/index.js
const express = require('express');
const app = express();
const PORT = 4000;

app.use(express.json());

app.post('/v1/logs', (req, res) => {
    console.log('Received Audit Log Batch:', JSON.stringify(req.body, null, 2));
    res.status(200).send({ status: 'success' });
});

app.listen(PORT, () => {
    console.log(`Audit Service running on port ${PORT}`);
});
```

Il servizio espone un endpoint **`/v1/logs`** compatibile con il protocollo OTLP HTTP. Quando il Collector invia un batch di log con l'exporter `otlphttp/audit`, il payload arriva qui.

### In produzione

Il servizio demo semplicemente stampa il payload. In un ambiente reale, l'audit service dovrebbe:

| Requisito | Implementazione |
|-----------|-----------------|
| **Persistenza** | Scrivere su database append-only (es. PostgreSQL con trigger di protezione, ImmuDB) |
| **Immutabilità** | Impedire UPDATE e DELETE sui record |
| **Encryption** | TLS in transito, encryption at rest |
| **Accesso** | Autenticazione e autorizzazione dedicate |
| **Retention** | Policy di retention separata (anni, non giorni) |
| **Backup** | Replica geografica o export periodico su cold storage |

Il punto chiave: separare fisicamente la destinazione permette di applicare **requisiti diversi** allo stesso flusso di dati. Un database Loki ottimizzato per query veloci non è il posto giusto per un audit trail che deve durare anni.

---

## Ogni rotta ha il suo lifecycle

Separare le destinazioni non basta: ogni destinazione deve avere una **strategia di persistenza** coerente con il tipo di dato che riceve. L'[articolo precedente](/posts/otel-website-material/05-management/) mostra come configurare una retention unica (Tempo, 7 giorni) per tutte le trace. Con il routing, si possono applicare policy diverse per ogni flusso.

### Mappa completa: rotta, destinazione, persistenza

| Rotta | Destinazione | Retention | Storage | Costo relativo |
|-------|-------------|-----------|---------|----------------|
| Debug log | Loki (stream `debug`) | 24-48 ore | Loki filesystem | Basso |
| Info/Warning/Error | Loki (stream default) | 7-30 giorni | Loki filesystem | Medio |
| Trace | Tempo | 7 giorni (`block_retention: 168h`) | Tempo + object storage | Medio |
| Audit log | Audit service → DB | 1-7 anni | PostgreSQL + S3 (cold) | Alto per record, basso per volume |

Il costo degli audit log è alto per singolo record (DB relazionale, encryption, backup) ma il volume è basso (~2.000 log/giorno nello scenario dell'articolo). Il costo dei debug log è basso per record (Loki) ma il volume è alto (~500.000/giorno). La strategia di persistenza riflette questo trade-off.

### Loki: retention per stream

Loki supporta retention differenziata tramite `retention_stream`. I log instradati verso Loki possono avere retention diverse in base ai label:

```yaml
# loki-config.yaml
limits_config:
  retention_period: 720h             # Default: 30 giorni

  retention_stream:
    - selector: '{level="debug"}'
      priority: 1
      period: 48h                    # Debug: 2 giorni
    - selector: '{level=~"info|warn"}'
      priority: 2
      period: 168h                   # Info/Warning: 7 giorni
    - selector: '{level="error"}'
      priority: 3
      period: 720h                   # Errori: 30 giorni
```

Con questa configurazione, i debug log occupano storage per 2 giorni invece di 30. Su un volume di 500.000 debug log/giorno, la differenza di storage è significativa.

> **Nota:** `retention_stream` richiede che il compactor Loki sia attivo con `retention_enabled: true`. La feature è disponibile a partire da Loki 2.3+.

### Audit service: persistenza su database

Il servizio demo usa `console.log`. In produzione, l'audit service persiste i log su un database append-only. Un esempio minimale con PostgreSQL:

```sql
-- Schema audit log
CREATE TABLE audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trace_id    VARCHAR(32),
    service     VARCHAR(128) NOT NULL,
    user_id     VARCHAR(256),
    event_type  VARCHAR(64) NOT NULL,
    payload     JSONB NOT NULL,
    checksum    VARCHAR(64) NOT NULL   -- SHA-256 del payload
);

-- Indice per query frequenti
CREATE INDEX idx_audit_timestamp ON audit_logs (timestamp);
CREATE INDEX idx_audit_user ON audit_logs (user_id);
CREATE INDEX idx_audit_event ON audit_logs (event_type);

-- Protezione: impedire UPDATE e DELETE
CREATE RULE no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;
```

Le `RULE` PostgreSQL impediscono qualsiasi modifica o cancellazione dei record dopo l'inserimento. Il campo `checksum` permette di verificare l'integrità del payload in qualsiasi momento.

### Archiviazione a lungo termine: hot/warm/cold

Per retention di anni, mantenere tutti i record su PostgreSQL non è efficiente. Un pattern comune è il tiering **hot/warm/cold**:

| Tier | Storage | Retention | Costo/GB/mese | Query |
|------|---------|-----------|---------------|-------|
| **Hot** | PostgreSQL | 0-90 giorni | ~$0.10 (EBS) | SQL, indici, <100ms |
| **Cold** | S3 Standard | 90 giorni - 7 anni | ~$0.023 | Athena/BigQuery, secondi-minuti |
| **Archive** | S3 Glacier | 7+ anni | ~$0.004 | Ore per il restore |

L'export da hot a cold può essere un cron job o un processo batch:

```bash
# Export giornaliero: audit log > 90 giorni → S3
psql -h localhost -U audit_user -d auditdb -c \
  "COPY (SELECT * FROM audit_logs WHERE timestamp < NOW() - INTERVAL '90 days')
   TO STDOUT WITH CSV HEADER" | \
  gzip > "audit-$(date +%Y%m%d).csv.gz"

aws s3 cp "audit-$(date +%Y%m%d).csv.gz" \
  s3://company-audit-archive/year=$(date +%Y)/month=$(date +%m)/
```

Dopo l'export, i record cold possono essere rimossi da PostgreSQL (disabilitando temporaneamente la rule `no_delete` con un ruolo amministrativo dedicato) per mantenere il volume del database gestibile.

### Collegamento con il tail sampling

Le strategie di persistenza si integrano con il [tail sampling dell'articolo precedente](/posts/otel-website-material/05-management/) in una pipeline completa:

```text
Applicazione
    |
    v
OTel Collector
    |
    +-- Tail Sampling (trace) ---> Tempo (retention 7d)
    |
    +-- Routing Connector (log)
            |
            +-- audit.event=true ---> Audit Service ---> PostgreSQL (90d) ---> S3 (7 anni)
            |
            +-- level=debug -------> Loki (retention 48h)
            |
            +-- default ------------> Loki (retention 30d)
```

Prima il **tail sampling** riduce il volume delle trace (~90%). Poi il **routing** separa i log per tipo. Infine, ogni destinazione applica la propria **retention**. Il risultato: dati diversi, lifecycle diversi, costi proporzionati al valore.

---

## Demo: Routing in Azione

Il Module 06 include tutto il necessario per vedere il routing in funzione. Il codice completo è nel [repository otel-demo](https://github.com/monte97/otel-demo).

```bash
git clone https://github.com/monte97/otel-demo
cd otel-demo
```

### 1. Avviare l'infrastruttura

```bash
make infra-up-otel   # Avvia LGTM stack (Loki, Grafana, Tempo, Prometheus, OTel Collector)
make infra-up-apps   # Avvia applicazioni di supporto
make mod06-up        # Avvia shop-service, audit-service e Collector con routing
```

Il comando `make mod06-up` avvia automaticamente:
- Il **shop-service** con l'endpoint `/checkout` che marca gli eventi audit
- L'**audit-service** sulla porta 4000
- L'**OTel Collector** con la configurazione di split verso Loki e audit-service

### 2. Generare un evento audit

```bash
curl -X POST http://localhost:8002/checkout \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000, "user": "alice@example.com"}'
```

Risposta attesa:

```json
{"status": "processed", "orderId": "ORD-1739350800000"}
```

### 3. Verificare che il log arrivi all'audit service

```bash
docker logs module-06-advanced-routing-audit-service-1
```

Output atteso (estratto semplificato):

```json
Received Audit Log Batch: {
  "resourceLogs": [{
    "resource": { "attributes": [{ "key": "service.name", "value": { "stringValue": "shop-service" } }] },
    "scopeLogs": [{
      "logRecords": [{
        "body": { "stringValue": "User checking out" },
        "attributes": [
          { "key": "audit.event", "value": { "boolValue": true } },
          { "key": "audit.user", "value": { "stringValue": "alice@example.com" } }
        ]
      }]
    }]
  }]
}
```

L'output mostra il batch OTLP ricevuto dall'audit service. Nell'output JSON si possono identificare:
- I **resource attributes** del servizio (`service.name: shop-service`)
- Gli **span attributes** aggiunti nel codice (`audit.event: true`, `audit.user: alice@example.com`)
- Il **body** del log con il messaggio strutturato

Questo conferma che il Collector ha inoltrato correttamente il log all'audit service.

### 4. Verificare che il log sia anche in Loki

Aprire Grafana (`http://localhost:3000`) e cercare in Loki:

```logql
{service_name="shop-service"} |= "checkout"
```

Il log è presente anche qui. Con la configurazione fan-out del demo, entrambe le destinazioni ricevono il log. Con il routing connector attivo, solo l'audit service riceverebbe i log marcati.

### 5. Pulizia

```bash
# Fermare il modulo
make mod06-down

# Pulizia completa dell'infrastruttura
make infra-down
```

---

## Il routing oltre audit e tecnici

Il routing connector non serve solo per separare audit e tecnici. Ecco scenari reali dove il pattern si applica:

| Scenario | Attributo di routing | Destinazione | Motivazione |
|----------|---------------------|--------------|-------------|
| **Compliance audit** | `audit.event=true` | Audit service dedicato | Separazione fisica, immutabilità, retention lunga |
| **PII separation** | `contains.pii=true` | Vault cifrato | GDPR: dati personali in backend con accesso controllato |
| **Cost optimization** | `log.level=debug` | Nessuna (scartato) | Debug log in produzione = volume altissimo, valore basso |
| **Critical alerting** | `log.level=error` + `http.status_code >= 500` | Loki + sistema di alert | Errori critici devono attivare notifiche immediate |
| **Multi-tenant** | `tenant.id=tenant-a` | Loki istanza tenant A | Isolamento dati tra tenant diversi |

### Pattern: scartare i debug log

In produzione, i log di livello `debug` rappresentano spesso il 70-80% del volume totale ma hanno utilità solo durante il troubleshooting attivo. Una configurazione di routing può scartarli di default e attivarli on-demand:

```yaml
connectors:
  routing/logs:
    # Nessun default_pipelines: i log non instradati vengono scartati
    table:
      - context: log
        condition: severity_number >= SEVERITY_NUMBER_INFO
        pipelines: [logs/default]

service:
  pipelines:
    logs/ingestion:
      receivers: [otlp]
      exporters: [routing/logs]
    logs/default:
      receivers: [routing/logs]
      exporters: [loki]
```

I log con severity inferiore a INFO (debug, trace) non vengono instradati a nessuna pipeline e vengono scartati. Questo è complementare al tail sampling: il sampling riduce le trace, il routing elimina intere categorie di log. Insieme, riducono il volume complessivo di un ordine di grandezza.

### Pattern: errori critici verso canale di alert

```yaml
connectors:
  routing/logs:
    default_pipelines: [logs/default]
    table:
      - context: log
        condition: severity_number >= SEVERITY_NUMBER_ERROR
        action: copy    # Invia sia ad alert che al default
        pipelines: [logs/alerts]

service:
  pipelines:
    logs/ingestion:
      receivers: [otlp]
      exporters: [routing/logs]
    logs/default:
      receivers: [routing/logs]
      exporters: [loki]
    logs/alerts:
      receivers: [routing/logs]
      exporters: [loki, slack_webhook]
```

Con `action: copy`, i log con severity ERROR o superiore vengono inviati **sia** alla pipeline di alert **sia** alla pipeline default (Loki). I log normali finiscono solo in Loki. La logica di notifica è nel Collector, non nell'applicazione.

### Routing e Sampling: due strumenti complementari

Una domanda frequente: **qual è la differenza tra routing e tail sampling?**

| Aspetto | Tail Sampling | Routing |
|---------|---------------|---------|
| **Obiettivo** | Ridurre il volume (tenere/scartare) | Decidere la destinazione |
| **Opera su** | Trace complete | Singoli log, trace, metriche |
| **Decisione** | Tenere o eliminare | Dove inviare |
| **Configurazione** | Sampling policies | Routing table |
| **Esempio** | Tenere solo trace con errori | Inviare audit log a servizio dedicato |

In un setup di produzione maturo, si usano entrambi: il **tail sampling** riduce il volume totale, poi il **routing** distribuisce i dati rimasti verso le destinazioni appropriate. Prima si decide **cosa** tenere, poi **dove** mandarlo.

---

## Riepilogo e Checklist

### Riepilogo

| Problema | Soluzione | Risultato |
|----------|-----------|-----------|
| Audit log mischiati con debug | Routing connector + exporter dedicato | Separazione fisica |
| Compliance GDPR/SOC 2 | Audit service con DB immutabile | Requisiti normativi soddisfatti |
| Costi uniformi per dati diversi | Routing selettivo per livello | Retention e storage ottimizzati |
| Nessuna priorità sui log | Routing verso sistemi di alert | Notifiche immediate per errori critici |
| PII in backend condiviso | Routing verso vault cifrato | Accesso controllato ai dati sensibili |

### Checklist pre-production

Prima di abilitare il routing in produzione:

- [ ] Identificare i tipi di log (audit, tecnico, PII, debug) e definire gli attributi di marcatura (`audit.event`, `log.level`, `contains.pii`)
- [ ] Marcare i log nel codice applicativo (span attributes o log attributes)
- [ ] Configurare exporters e routing connector con `default_pipelines` sicuro
- [ ] Testare in staging: verificare che ogni tipo arrivi alla destinazione corretta e che il default copra tutti i log non marcati
- [ ] Monitorare `otelcol_exporter_sent_log_records` per ogni exporter
- [ ] Documentare la mappa di routing (attributo -> destinazione)
- [ ] Validare con il team compliance/security

Se tutti i check passano, il routing è pronto per il roll-out.

---

## Risorse

**Repository demo:**
- [otel-demo su GitHub](https://github.com/monte97/otel-demo) (Module 06: Advanced Routing)

**Documentazione:**
- [OTel Collector Routing Connector](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/routingconnector)
- [OTel Collector Configuration](https://opentelemetry.io/docs/collector/configuration/)

**Articoli correlati:**
- [Tail Sampling e Retention](/posts/otel-website-material/05-management/) - Ridurre il volume prima del routing

---

*Per domande o feedback: [francesco@montelli.dev](mailto:francesco@montelli.dev) | [LinkedIn](https://www.linkedin.com/in/francesco-montelli/) | [GitHub](https://github.com/monte97)*
