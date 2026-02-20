# Review Summary — otel-08-console-to-grafana

**Tech: 8/10 | Style: 8/10 | Gate: PASS**

## Top findings

### Tech (P0 — CRITICAL)
1. `pino-opentelemetry-transport` installato ma mai configurato come transport Pino. `instrumentation-pino` inietta solo trace context, non esporta log via OTLP. Serve configurazione esplicita del transport.
2. `serviceName` come opzione top-level di `NodeSDK` potrebbe non funzionare nelle versioni attuali. Usare `Resource` o `OTEL_SERVICE_NAME` env var.

### Tech (P1)
3. `OTEL_EXPORTER_OTLP_ENDPOINT` non chiarito per scenari container vs host.
4. Claim impreciso su Loki OTLP availability.
5. Grafana anonymous admin: serve warning dev-only piu' forte.
6. Nessun volume Loki nonostante si parli di persistenza.

### Style (minor)
1. Typo "solo solo".
2. `reviewed: true` + `draft: true` incoerenti.
3. Emoji nel corpo.
4. Manca frase di chiusura impattante.
