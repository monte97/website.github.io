---
title: "Da console.log a Grafana: logging strutturato e centralizzato con Node.js"
date: 2026-02-10T10:00:00+01:00
description: "Logging strutturato con Pino e centralizzazione con OpenTelemetry, Loki e Grafana su Node.js"
menu:
  sidebar:
    name: "Da console.log a Grafana"
    identifier: OTEL-8
    weight: 70
    parent: OBS
tags: ["NodeJs", "OpenTelemetry", "Logging", "Grafana", "Pino"]
categories: ["DevOps", "Observability"]
draft: true
---

Un servizio Express con pochi endpoint e `console.log` funziona senza problemi in sviluppo: l'output e' visibile nel terminale, gli errori saltano all'occhio, il ciclo di feedback e' immediato. L'assunzione implicita e' che questo sia sufficiente anche oltre il laptop. In produzione, con piu' istanze dietro un load balancer e container che vengono riavviati, non lo e'.

Questo articolo copre il passaggio da `console.log` a un sistema di logging strutturato e centralizzato in tre step incrementali, ognuno motivato dai limiti del precedente.

> 👉 Codice completo: [github.com/monte97/otel-demo](https://github.com/monte97/otel-demo) (moduli 01 e 02)

**Struttura dell'articolo:**

1. [Perche' console.log non basta](#perche-consolelog-non-basta)
2. [Da stringhe piatte a JSON filtrabili](#da-stringhe-piatte-a-json-filtrabili)
3. [Log persistenti senza cambiare codice](#log-persistenti-senza-cambiare-codice)
4. [Tre servizi Docker per chiudere il cerchio](#tre-servizi-docker-per-chiudere-il-cerchio)
5. [Filtrare per livello, utente e azione](#filtrare-per-livello-utente-e-azione)
6. [Errori comuni](#errori-comuni)
7. [Conclusioni](#conclusioni)

---

## Perche' console.log non basta

Un servizio Express con tre endpoint e `console.log` produce output come questo:

```text
Health check request received
Processing purchase...
Purchase completed successfully
[INFO] User mario is checking out with amount 29.99
```

Quattro stringhe piatte. Il confronto con un approccio strutturato:

| Caratteristica | `console.log` | Pino (strutturato) | Pino + OTel + Loki |
|---------------|---------------|---------------------|---------------------|
| Formato | Stringa libera | JSON strutturato | JSON strutturato |
| Timestamp | Assente | ISO 8601 automatico | ISO 8601 automatico |
| Livelli | Nessuno | error/warn/info/debug | error/warn/info/debug |
| Filtraggio | grep manuale | Campi JSON | LogQL su Grafana |
| Persistenza | Ciclo di vita container | Ciclo di vita container | Loki (persistente) |
| Multi-istanza | `docker logs` per ognuna | `docker logs` per ognuna | Query centralizzata |

In sintesi: formato, persistenza e centralizzazione mancano tutti. Le sezioni successive affrontano ciascun limite in ordine.

---

## Da stringhe piatte a JSON filtrabili

Il primo step non richiede infrastruttura, solo una dipendenza:

```bash
npm install pino
```

### Configurazione base

```javascript
// logger.js
const pino = require('pino');
const logger = pino({
    level: 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
        level(label) { return { level: label }; }
    }
});
```

Due configurazioni rilevanti:
- **`pino.stdTimeFunctions.isoTime`** - aggiunge il campo `"time"` in formato ISO 8601
- **`formatters.level`** - converte il livello da numerico (`30`) a stringa (`"info"`)

### Sostituzione di console.log

```javascript
// Prima
console.log(`[INFO] User ${user} is checking out with amount ${amount}`);

// Dopo
logger.info({ userId: user, amount, action: 'checkout' }, 'Checkout started');
```

L'output diventa un oggetto JSON con campi separati:

```json
{
    "level": "info",
    "time": "2026-02-10T14:23:01.456Z",
    "userId": "mario",
    "amount": 29.99,
    "action": "checkout",
    "msg": "Checkout started"
}
```

### Child logger per contesto HTTP

Per le richieste HTTP, un middleware crea un **child logger** che aggiunge automaticamente contesto a ogni log della request:

```javascript
const { randomUUID } = require('node:crypto');

app.use((req, res, next) => {
    req.logger = logger.child({
        requestId: randomUUID(),
        method: req.method,
        url: req.url
    });
    next();
});
```

Ogni chiamata a `req.logger.info(...)` include automaticamente `requestId`, `method` e `url`. Dato un `requestId`, e' possibile ricostruire l'intera sequenza di log di una singola richiesta.

> **Nota:** Pino supporta anche la scrittura su file con `pino.destination('./logs/service.log')`, ma con container questa soluzione richiede la gestione di volumi e rotazione file. Il logging su file non risolve il problema della centralizzazione tra istanze.

### Limiti

I log sono strutturati e performanti ([benchmark Pino](https://github.com/pinojs/pino/blob/main/docs/benchmarks.md): fino a 5x piu' veloce di Winston), ma restano locali al container. Un restart li cancella. Con piu' istanze, serve comunque accedere a ciascuna separatamente.

---

## Log persistenti senza cambiare codice

L'aggiunta di OpenTelemetry rende i log persistenti e centralizzati **senza modificare il codice applicativo**.

### Dipendenze

```bash
npm install @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-logs-otlp-http \
  @opentelemetry/sdk-logs
```

### File di instrumentazione

```javascript
// instrumentation.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const { BatchLogRecordProcessor } = require('@opentelemetry/sdk-logs');

const sdk = new NodeSDK({
    logRecordProcessors: [
        new BatchLogRecordProcessor(
            new OTLPLogExporter()
        )
    ],
    instrumentations: [getNodeAutoInstrumentations()],
    serviceName: 'shop-service'
});

sdk.start();
```

### Avvio

```bash
# Prima
node index.js

# Dopo
node --require ./instrumentation.js index.js
```

Il flag `--require` carica l'SDK prima del codice applicativo. Il pacchetto `@opentelemetry/instrumentation-pino` (incluso in `auto-instrumentations-node`) intercetta automaticamente i log Pino e li inoltra al Collector via protocollo OTLP. I `logger.info()` esistenti restano invariati.

L'instrumentazione e' reversibile: rimuovendo il `--require`, il servizio torna al comportamento originale.

---

## Tre servizi Docker per chiudere il cerchio

Il flusso dei dati segue questa pipeline:

```text
App (Pino) → OTel SDK → Collector (:4318) → Loki (:3100) → Grafana (:3000)
```

### Docker Compose

```yaml
# docker-compose.yml
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.145.0
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./support/otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4318:4318"  # OTLP HTTP

  loki:
    image: grafana/loki:3.6.5
    volumes:
      - loki-data:/loki
    ports:
      - "3100:3100"

  grafana:
    image: grafana/grafana:12.3.2
    ports:
      - "3000:3000"
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer
      - GF_AUTH_DISABLE_LOGIN_FORM=true

volumes:
  loki-data:
```

> **Nota:** `GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer` consente l'accesso a Grafana senza login e senza form di autenticazione. Il ruolo `Viewer` e' sufficiente per esplorare i log. In produzione, abilitare l'autenticazione ([documentazione Grafana](https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/)).

### Configurazione del Collector

```yaml
# support/otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:

exporters:
  otlphttp/loki:
    endpoint: "http://loki:3100/otlp"
    tls:
      insecure: true

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/loki]
```

Il Collector riceve i log via OTLP HTTP, li raggruppa in batch e li inoltra a Loki tramite l'endpoint OTLP nativo (disponibile da Loki 3.x). Il Collector funge da punto di controllo: e' possibile aggiungere backend aggiuntivi, filtrare log sensibili o applicare sampling modificando solo questa configurazione.

---

## Filtrare per livello, utente e azione

Dopo aver avviato l'infrastruttura con `docker compose up` e generato qualche richiesta, Grafana e' disponibile su `http://localhost:3000`.

In **Explore**, selezionando **Loki** come data source, le query LogQL seguono questa struttura:

```text
{service_name="shop-service"}
```

Esempi di query piu' specifiche:

| Obiettivo | Query LogQL |
|-----------|------------|
| Tutti i log del servizio | `{service_name="shop-service"}` |
| Solo errori | `{service_name="shop-service"} \| json \| level="error"` |
| Checkout di un utente | `{service_name="shop-service"} \| json \| userId="mario" \| action="checkout"` |
| Log di una request specifica | `{service_name="shop-service"} \| json \| requestId="<uuid>"` |

La pipeline `| json` estrae i campi JSON come label filtrabili. I filtri multipli (`| campo="valore"`) funzionano come AND logico.

Dopo un riavvio del container, i log restano disponibili in Grafana. La persistenza e' garantita dallo storage di Loki.

---

## Errori comuni

| Errore | Conseguenza | Soluzione |
|--------|-------------|-----------|
| Concatenare stringhe nei log | `logger.info("User " + id)` non e' filtrabile | Usare oggetti: `logger.info({ userId }, 'msg')` |
| Tutto a livello `info` | Il livello perde utilita' | `debug` per dettaglio, `warn` per anomalie, `error` per fallimenti |
| `serviceName` mancante | Log indistinguibili in Grafana | Impostarlo nell'SDK o via `OTEL_SERVICE_NAME` |
| Nessun volume per Loki | `docker compose down` cancella lo storage | Montare un volume persistente dedicato |
| Centralizzare senza strutturare | Log persistenti ma non cercabili | Prima Pino (struttura), poi OTel (centralizzazione) |

> ⚠️ **Security:** non loggare mai token, password o dati personali nei campi strutturati. Con i log centralizzati, un `logger.info({ password })` diventa visibile a chiunque abbia accesso a Grafana.

---

## Conclusioni

L'articolo ha coperto:

1. **Limiti di `console.log`** - assenza di struttura, persistenza e centralizzazione
2. **Logging strutturato con Pino** - JSON, livelli, child logger per contesto HTTP
3. **Centralizzazione con OpenTelemetry** - 20 righe di `instrumentation.js`, zero modifiche al codice applicativo
4. **Infrastruttura LGTM** - Collector, Loki e Grafana con tre servizi Docker
5. **Query LogQL** - filtraggio per livello, utente, azione su dati centralizzati

Il logging e' il primo pilastro dell'osservabilita'. Nel prossimo articolo: **distributed tracing** per seguire una request attraverso piu' servizi.

---

## Risorse Utili

* **Repository**: 👉 [github.com/monte97/otel-demo](https://github.com/monte97/otel-demo)
* **Pino**: [getpino.io](https://getpino.io/) - documentazione ufficiale
* **OpenTelemetry Node.js**: [opentelemetry.io/docs/languages/js](https://opentelemetry.io/docs/languages/js/getting-started/nodejs/) - setup SDK
* **Grafana Loki LogQL**: [grafana.com/docs/loki/latest/query](https://grafana.com/docs/loki/latest/query/) - linguaggio di query
* **instrumentation-pino**: [npmjs.com/package/@opentelemetry/instrumentation-pino](https://www.npmjs.com/package/@opentelemetry/instrumentation-pino) - bridge Pino/OTel
