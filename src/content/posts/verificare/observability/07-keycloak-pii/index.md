---
title: "PII Filtering in OpenTelemetry: Proteggere i Dati Sensibili di Keycloak"
seoTitle: "PII filtering in OpenTelemetry: Keycloak"
date: 2026-02-05T09:00:00.000Z
description: Come instrumentare Keycloak e servizi third-party con dati sensibili, riducendo il rischio PII tramite filtering nell'OTel Collector. Tecniche GDPR-compliant.
pillar: verificare
category: observability
tags:
  - OpenTelemetry
  - Keycloak
  - GDPR
  - Security
  - Observability
lang: it
draft: false
reviewed: human
series: observability
seriesOrder: 70
summary:
  - label: "Problema"
    value: "Keycloak con tracing attivo espone username, token e query SQL nel backend"
  - label: "Strumento"
    value: "Quattro tecniche nell'OTel Collector: DELETE, REDACT, HASH e SANITIZE"
    note: "Il filtraggio avviene prima che i dati raggiungano Tempo"
  - label: "Gotcha"
    value: "L'hash SHA-256 del Collector è senza salt: dà correlazione tra span, non anonimizzazione"
  - label: "Risultato"
    value: "Il debug resta intatto: trace ID, timing, topologia e user ID hashed"
openItems:
  - "Per il diritto alla cancellazione, Tempo non supporta la cancellazione selettiva di singole trace: filtering più retention breve copre l'Art. 17 nella maggior parte dei casi, non sempre"
  - "Se il backend Tempo risiede fuori EU, il filtering da solo non basta per la data residency: servono self-hosting in Europa o bucket europei"
  - "Il tracing nativo esiste dalla versione 26.0, inizialmente come preview: le variabili unificate KC_TELEMETRY_* richiedono feature flag in quella versione"
  - "Quali attributi compaiono dipende dalla versione dell'SDK bundled: la config copre sia i nomi vecchi (http.url, db.statement) sia i nuovi (url.full, db.query.text)"
openNote: "Ciò che il filtering non risolve, sul fronte GDPR e sulle versioni."
mode: how-to
caseStudy:
  slug: "dalla-cecita-alla-traccia"
  hook: >
    Lo stesso problema fuori dalla demo: dati personali dentro la telemetria di un
    sistema già in produzione, e cosa è costato toglierli.
---

Abilitare il tracing su Keycloak significa ritrovarsi email, username e token JWT in chiaro negli span. Keycloak gestisce credenziali, token e sessioni — quando il tracing è attivo, tutto questo finisce nel backend di observability senza alcun filtro. Il rischio: data breach e violazione GDPR con un click su Explore.

Questo articolo mostra come filtrare i dati sensibili direttamente nell'OTel Collector, prima che raggiungano Tempo. La strategia si basa su quattro tecniche — DELETE, REDACT, HASH e SANITIZE — per mantenere piena visibilità senza esporre PII.

---

## I trace registrano tutto, anche i dati sensibili

Quando aggiungi observability a un servizio di autenticazione come Keycloak, il primo trace rivela subito il rischio: tutto finisce nel backend - log, span, metriche - senza distinzione tra dati operativi e dati sensibili.

**Scenario tipico:**

```text
User → Frontend → Backend API → Keycloak (authentication)
                                    ↓
                                 Postgres (users, sessions)
```

Abilitando il tracing nativo di Keycloak (dalla versione 26.0, inizialmente come preview, stabilizzata nelle release successive), l'instrumentazione funziona immediatamente. Ma in Grafana appare questo:

```json
{
  "trace_id": "abc123...",
  "service.name": "keycloak",
  "http.method": "POST",
  "http.url": "/auth/realms/techstore/protocol/openid-connect/token?username=mario",
  "enduser.id": "mario",
  "db.statement": "SELECT * FROM user_entity WHERE username = 'mario'"
}
```

Il tracing nativo non cattura il body delle request HTTP, ma i dati sensibili finiscono comunque nei trace tramite URL query parameters, database statements e span attributes.

**Cosa c'è di sbagliato qui?**
- **Username esposto** in URL query parameters e database queries
- **Session ID e token** tracciabili
- **Potenziale violazione GDPR** (Art. 5: data minimization, Art. 32: security measures)
- **Rischio data breach** se il backend Grafana/Tempo è compromesso

Il tracing instrumenta le operazioni interne, ma non distingue cosa è sensibile da cosa non lo è. E non tracciare Keycloak non è un'opzione - perdi visibilità su un componente critico.

La soluzione? Filtrare i dati sensibili nell'OTel Collector, prima che raggiungano il backend. Vediamo come farlo.

---

## Keycloak si instrumenta in 5 righe di config

Prima di entrare nel filtering, vediamo quanto è semplice instrumentare Keycloak - e perché senza filtri la situazione diventa subito problematica.

A partire dalla versione 26, Keycloak supporta OpenTelemetry nativamente, senza bisogno del Java Agent.

Il codice completo è nel [repository MockMart](https://github.com/monte97/MockMart):

```bash
git clone https://github.com/monte97/MockMart
cd MockMart
```

**Stack completo (estratto semplificato da `docker-compose.keycloak-pii.yml`):**

L'estratto seguente è semplificato per leggibilità. Il compose completo include Postgres, application services (shop-api, shop-ui), healthcheck, volumes e configurazioni aggiuntive. Vedi il [repository](https://github.com/monte97/MockMart) per il setup completo.

```yaml
services:
  keycloak:
    image: quay.io/keycloak/keycloak:26.0
    command: start-dev
    ports:
      - "8080:8080"
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://keycloak-postgres:5432/keycloak
      KC_HTTP_RELATIVE_PATH: /auth
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin
      # OpenTelemetry - tracing nativo
      KC_TRACING_ENABLED: "true"
      KC_TRACING_ENDPOINT: http://otel-collector:4317
      KC_TRACING_SERVICE_NAME: keycloak
      KC_METRICS_ENABLED: "true"

  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.120.0
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
    volumes:
      - ./otel-config/keycloak-pii/${OTEL_CONFIG:-otel-collector-config.yaml}:/etc/otel-collector-config.yaml:ro

  grafana:
    image: grafana/grafana:11.4.0
    ports:
      - "3005:3000"
```

**Configurazione:**

1. **Abilita il tracing nativo** via environment: `KC_TRACING_ENABLED`
2. **Configura l'endpoint OTel**: `KC_TRACING_ENDPOINT`
3. **Abilita le metriche**: `KC_METRICS_ENABLED`

Le variabili d'ambiente sono il metodo consigliato - evita di duplicare la configurazione con i flag CLI nel `command`, perché la precedenza tra i due metodi varia tra versioni di Keycloak.

> **Nota sulle variabili Keycloak:** Keycloak 26.0 usa le variabili `KC_TRACING_*` per il tracing. Le variabili unificate `KC_TELEMETRY_*` (che coprono tracing, logs e metrics) sono disponibili con i feature flag `opentelemetry-logs,opentelemetry-metrics` in 26.0, o nativamente in versioni successive (26.1+). Il compose completo nel repository usa `KC_TRACING_*` per compatibilità con la 26.0.

**Cosa viene auto-instrumentato:**
- **HTTP requests** (incoming/outgoing)
- **Database queries** (JDBC - Postgres)
- **Context propagation** (W3C traceparent)

**Zero modifiche** al codice di Keycloak - solo configurazione container.

**Test del problema:**

```bash
docker compose -f docker-compose.keycloak-pii.yml up -d

# Login tramite password grant (deprecated in OAuth 2.1, solo per demo)
curl -X POST http://localhost/auth/realms/techstore/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=shop-ui" \
  -d "username=mario" \
  -d "password=mario123"
```

**Output atteso:**

```json
{"access_token":"eyJhbG...","token_type":"bearer","expires_in":300}
```

In Grafana (http://localhost/grafana) → Explore → Tempo, con la query:

`{service.name="keycloak"}`

![Grafana Explore - Keycloak traces list](imgs/keycloak-traces-list.webp)

**Risultato:** il trace rivela l'intera struttura del database di autenticazione: query su `USER_ENTITY`, `CREDENTIAL`, `USER_ATTRIBUTE`, tutte visibili nel waterfall:

![Trace waterfall con query DB su tabelle utente](imgs/keycloak-trace-db-queries.webp)

Ecco il problema che dobbiamo risolvere.

![Span attributes con dati sensibili esposti](imgs/keycloak-span-attributes-unsafe.webp)

---

## Filtrare senza perdere visibilità

Ora che abbiamo visto il problema, costruiamo la soluzione. L'OTel Collector ci mette a disposizione quattro tecniche di filtering, ciascuna adatta a un tipo diverso di dato sensibile.

### Ogni dato sensibile richiede una tecnica diversa

1. **DELETE**: Rimuovi attributi interi (es. `http.request.header.authorization`)
2. **REDACT**: Elimina attributi il cui valore matcha un pattern PII (es. URL con `username=...`)
3. **HASH**: Anonimizza ma mantieni correlazione (es. `sha256:8f14e45f...`)
4. **SANITIZE**: Elimina query/logs con valori PII embedded

### La nostra configurazione: rimuovere PII prima dello storage

File: `otel-config/keycloak-pii/otel-collector-config.yaml`

Organizziamo la configurazione in processor separati, ciascuno con una responsabilità specifica. Vediamoli uno per uno.

**Receivers e memory protection:**

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # MEMORY PROTECTION (sempre primo)
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128
```

**1. DELETE - Rimuovi attributi sensibili interi:**

```yaml
  attributes/delete-pii:
    actions:
      - key: http.request.header.authorization
        action: delete
      - key: http.request.header.cookie
        action: delete
      - key: http.response.header.set-cookie
        action: delete
      - key: auth.token
        action: delete
```

**2. REDACT - Elimina URL con parametri sensibili:**

Il `transform` processor con OTTL permette di eliminare un attributo **in base al suo valore**, non al nome della chiave:

```yaml
  transform/redact-urls:
    error_mode: ignore
    trace_statements:
      - context: span
        statements:
          - delete_key(attributes, "http.url") where IsMatch(attributes["http.url"], ".*(username|email|password|token|client_secret).*")
          - delete_key(attributes, "url.full") where IsMatch(attributes["url.full"], ".*(username|email|password|token|client_secret).*")
          - delete_key(attributes, "url.query") where IsMatch(attributes["url.query"], ".*(username|email|password|client_secret).*")
```

L'`attributes` processor supporta `pattern` solo per matchare **nomi di chiavi** (attribute key names), non valori. Per filtrare in base al valore, serve il `transform` processor con clausole `where`. Nota: `error_mode: ignore` è la scelta giusta in produzione, ma durante lo sviluppo usa `error_mode: propagate` per far emergere errori nelle regex.

**3. HASH - User identifiers (SHA-256, mantieni correlazione):**

```yaml
  # CAVEAT: non è anonimizzazione completa se input space è limitato
  attributes/hash-users:
    actions:
      - key: enduser.id
        action: hash
      - key: enduser.username
        action: hash
      - key: user.id
        action: hash
      - key: user.email
        action: hash
```

> **Attenzione:** L'azione `hash` del Collector usa SHA-256 senza salt. Su input a bassa entropia (username, email comuni), l'hash è reversibile con rainbow tables. Questo fornisce correlazione tra span, non anonimizzazione. Per pseudonymizzazione GDPR-compliant, considera HMAC-SHA256 con chiave segreta gestita separatamente.

**4. SANITIZE - Elimina database queries con valori PII:**

```yaml
  transform/sanitize-db:
    error_mode: ignore
    trace_statements:
      - context: span
        statements:
          - delete_key(attributes, "db.statement") where IsMatch(attributes["db.statement"], ".*(email|username|password|user_id)\\s*=.*")
          # db.query.text è il nuovo nome (semantic conventions v1.28+)
          - delete_key(attributes, "db.query.text") where IsMatch(attributes["db.query.text"], ".*(email|username|password|user_id)\\s*=.*")
```

**Batch, exporters e pipeline:**

```yaml
  batch:
    timeout: 10s
    send_batch_size: 1024

exporters:
  otlp/tempo:
    endpoint: tempo:4317
    tls:
      insecure: true

  prometheusremotewrite:
    endpoint: http://prometheus:9090/api/v1/write
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [
        memory_limiter,
        attributes/delete-pii,
        transform/redact-urls,
        attributes/hash-users,
        transform/sanitize-db,
        batch
      ]
      exporters: [otlp/tempo]

    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheusremotewrite]
```

La configurazione copre sia i nomi vecchi (`http.url`, `http.target`) che i nuovi (`url.full`, `url.query`) per le HTTP semantic conventions, e analogamente `db.statement` (vecchio) e `db.query.text` (nuovo, da semantic conventions v1.28+) per i database. A seconda della versione del SDK bundled con Keycloak, potresti trovare gli uni o gli altri.

### Cosa cambia concretamente nei trace

| Span Attribute | Before (UNSAFE) | After (SAFE) |
|----------------|-----------------|--------------|
| `http.request.header.authorization` | `Bearer eyJhbGciOi...` | **DELETED** |
| `http.url` / `url.full` | `/token?username=mario` | **DELETED** (contiene PII) |
| `enduser.id` | `mario` | `a8f14e45fceea167...` (HASH SHA-256) |
| `db.statement` | `SELECT ... WHERE username = 'mario'` | **DELETED** (contiene PII) |
| `auth.token` | `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...` | **DELETED** |

![Trace waterfall - confronto unsafe vs safe](imgs/keycloak-trace-waterfall.webp)

### Confrontare il prima e il dopo in un comando

Per passare tra config safe e unsafe, si usa la variabile `OTEL_CONFIG`:

```bash
# Config UNSAFE (mostra il problema)
OTEL_CONFIG=otel-collector-unsafe.yaml \
  docker compose -f docker-compose.keycloak-pii.yml up -d

# Config SAFE (con PII filtering)
docker compose -f docker-compose.keycloak-pii.yml down
OTEL_CONFIG=otel-collector-config.yaml \
  docker compose -f docker-compose.keycloak-pii.yml up -d

# Ripeti login (password grant - solo per demo)
curl -X POST http://localhost/auth/realms/techstore/protocol/openid-connect/token \
  -d "grant_type=password" \
  -d "client_id=shop-ui" \
  -d "username=mario" \
  -d "password=mario123"
```

**Verifica in Grafana:**

- **No password visible**
- **No email in plaintext**
- **Database queries sanitized**
- **User IDs hashed**

**Cleanup:**

```bash
docker compose -f docker-compose.keycloak-pii.yml down -v
```

### Il debug resta intatto

Se ti stai chiedendo se perdi capacità diagnostica, la risposta è no. Dopo il filtering hai ancora tutto quello che ti serve:

- **Trace ID** — Correlazione end-to-end
- **Span timing** — Performance analysis (quanto tempo login?)
- **Service topology** — Quali servizi chiamati (Keycloak → Postgres)
- **HTTP status codes** — Success/failure (200, 401, 500)
- **Error messages** — Stack traces (senza PII)
- **Hashed user ID** — Per-user analysis (hash deterministico, stesso utente = stesso hash)

**Dati rimossi:**

- **Username/email in chiaro** — rimossi
- **Passwords** — rimosse
- **Token content** — rimosso
- **Session IDs** — rimossi
- **Valori in database queries** — rimossi

**Trade-off: Hash Lookup**

Con `enduser.id: a8f14e45fceea167...` (hash SHA-256) nel trace, per risalire all'utente:

**Opzione 1: On-demand hash**
```bash
echo -n "mario" | sha256sum
# Match con trace!
```

**Opzione 2: Lookup table separata** (solo Security team ha accesso)

Trade-off accettabile per GDPR compliance.

### Metriche: non dimenticarti delle label

Oltre ai trace, Keycloak 26 esporta metriche via OTLP (`KC_METRICS_ENABLED`). Le metriche native sono basate su Micrometer/Quarkus: JVM, HTTP server, database connection pool.

Il rischio qui è più sottile: se usi estensioni o SPI aggiuntive, alcune label delle metriche possono contenere **user identifiers**. Il Collector può filtrare anche queste:

```yaml
processors:
  transform/metrics-pii:
    error_mode: ignore
    metric_statements:
      - context: datapoint
        statements:
          - delete_key(attributes, "user_id")
          - delete_key(attributes, "username")
          - delete_key(attributes, "email")
```

**Metriche aggregate utili per il monitoraggio:**
- JVM memory pressure e garbage collection
- HTTP request rate e latency
- Database connection pool saturation
- Active sessions (senza user identifiers)

---

## Lo stesso approccio per qualsiasi servizio con PII

Keycloak è solo l'esempio concreto che abbiamo usato, ma il pattern funziona per **qualsiasi servizio che gestisce PII**. Se devi instrumentare un payment gateway o un CRM, il ragionamento è identico.

### Cosa verificare prima di instrumentare

**Prima di instrumentare:**

**1. Quali dati sensibili gestisce?**
- [ ] User credentials (username, password, email)
- [ ] Authentication tokens (JWT, session IDs)
- [ ] Payment info (credit cards, billing)
- [ ] Personal identifiers (SSN, tax IDs)
- [ ] Location data (GPS, IP addresses)

**2. Dove possono finire nei trace?**
- [ ] HTTP request/response body
- [ ] URL query parameters
- [ ] HTTP headers (Authorization, Cookie)
- [ ] Database queries (WHERE, VALUES)
- [ ] Custom span attributes

**3. Quale tecnica di filtering?**

| Tipo di Dato | Condizione | Tecnica | Rationale |
|--------------|------------|---------|-----------|
| Password/Secret | Sempre | DELETE | Mai loggare |
| Token (JWT, API key) | Sempre | DELETE | Rimuovi completamente |
| User identifier | In URL/query param | REDACT (transform) | Elimina se valore matcha |
| User identifier | Come attributo span | HASH | Per-user analysis anonimizzato |
| Database query | Con valori PII | SANITIZE (transform) | Elimina se contiene PII |
| Credit Card | Sempre | DELETE | PCI-DSS compliance |
| Non chiaro | Sempre | DELETE (data minimization) | Principio di cautela |

### Tre processor bastano come base

**Pattern applicabile a qualsiasi servizio:**

```yaml
processors:
  # DELETE - Rimuovi attributi sensibili interi
  attributes/<service-name>-delete:
    actions:
      - key: <sensitive-header-or-token>
        action: delete

  # REDACT - Elimina attributo se il valore contiene PII
  transform/<service-name>-redact:
    error_mode: ignore
    trace_statements:
      - context: span
        statements:
          - delete_key(attributes, "<field>") where IsMatch(attributes["<field>"], "<pii-pattern>")

  # HASH - Identifiers per correlazione anonimizzata (SHA-256)
  attributes/<service-name>-hash:
    actions:
      - key: <user-identifier>
        action: hash
```

**Esempi rapidi:**
- **Payment (Stripe)**: DELETE card numbers, DELETE CVV
- **CRM (Salesforce)**: HASH contact IDs, REDACT emails in queries
- **Analytics (Mixpanel)**: HASH user traits, DELETE event properties con PII

Il pattern si adatta alle specificità di ogni servizio.

---

## Il filtering non basta: considerazioni GDPR

Il PII filtering risolve il problema principale, ma se operi in ambito GDPR ci sono altri aspetti da coprire. Vediamoli in sintesi.

### Retention e cancellazione

Configura una retention breve su Tempo - 7 giorni è un buon punto di partenza:

```yaml
# tempo.yaml (configurazione Tempo, non OTel Collector)
compactor:
  compaction:
    block_retention: 168h  # 7 giorni - unica retention globale
```

Tempo supporta una sola retention globale (`block_retention`). Se ti servono retention diversificate (audit vs debug), le opzioni sono istanze Tempo separate, Grafana Cloud con retention per-tenant, o tail sampling a monte.

Per il diritto alla cancellazione (Art. 17): Tempo non supporta la cancellazione selettiva di singole trace. In pratica, la combinazione di PII filtering + retention breve soddisfa il requisito nella maggior parte dei casi. Se un utente richiede cancellazione, distruggi la lookup table associata e attendi la scadenza della retention.

### Access control e data sovereignty

Limita chi può vedere i trace tramite i permessi Grafana sulle datasource (`datasources:read`, `datasources:query`, `datasources:explore`). Developers con ruolo Viewer, Security team con Admin.

Se il backend Tempo risiede fuori EU, il filtering da solo non basta per la data residency. Le opzioni: Tempo self-hosted in datacenter EU, Grafana Cloud EU (Frankfurt/Amsterdam), o S3 con bucket in `eu-central-1`. Per l'audit trail, Grafana Enterprise offre audit logging nativo; con OSS, usa un reverse proxy con access log.

---

## Riepilogo

Abbiamo visto come:

1. **Keycloak si instrumenta in poche righe** di configurazione container - zero code changes
2. **Senza filtering, i trace espongono tutto** - username, query, token finiscono in chiaro su Grafana
3. **Quattro tecniche nell'OTel Collector** (DELETE, REDACT, HASH, SANITIZE) risolvono il problema prima che i dati raggiungano il backend
4. **Il debug resta intatto** - trace ID, timing, topology e hashed user ID sono tutto ciò che serve per diagnosticare problemi
5. **Il pattern è riutilizzabile** - lo stesso approccio funziona per payment gateway, CRM, analytics

| Aspetto | Senza Filtering | Con Filtering |
|---------|----------------|---------------|
| GDPR | Rischio esposizione PII | Contribuisce alla compliance |
| Data breach risk | Alto (PII esposti) | Ridotto (PII rimossi) |
| Debug capability | Completo | Completo (via hashed IDs) |
| Audit readiness | Carente | Baseline soddisfatta |

Il takeaway è semplice: se tracci servizi che gestiscono dati sensibili, il Collector è il punto giusto dove intervenire. Un paio di processor e i tuoi trace diventano sicuri senza perdere un byte di informazione operativa.

---

## Prossimi Passi

Il codice completo, comprese le configurazioni safe e unsafe, è disponibile nel repository:

[github.com/monte97/MockMart](https://github.com/monte97/MockMart)

Per lanciare la demo con un solo comando: `make up-keycloak-pii` (safe) oppure `make up-keycloak-pii-unsafe` (unsafe).

**Prossimi articoli:**

1. **Metrics Deep Dive** - RED Method, custom metrics, cardinality control
2. **Multi-Tenancy Filtering** - Filtering diverso per tenant
3. **Keycloak Extensions** - Custom event listeners per audit dettagliato

**Risorse:**

* **OTel Docs**: [opentelemetry.io/docs/collector](https://opentelemetry.io/docs/collector/processors)
* **GDPR Guide**: [gdpr.eu](https://gdpr.eu)
* **Workshop completo**: [github.com/monte97/otel-workshop](https://github.com/monte97/otel-workshop)
