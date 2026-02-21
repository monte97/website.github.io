# Dal test E2E al debug del backend

**Come Playwright e OpenTelemetry eliminano il "funziona in locale"**

- **Formato**: Talk 35 min + Q&A
- **Livello**: Intermedio
- **Target**: Sviluppatori backend/fullstack, DevOps, QA engineer

---

## Abstract

Quando un test E2E fallisce in CI, il messaggio di errore dice "Timeout waiting for selector". Nessun contesto su cosa sia successo nel backend. Rilanci il test, passa, vai avanti. Ma il bug è ancora lì.

In questo talk mostro come collegare Playwright a OpenTelemetry per trasformare ogni test fallito in un link diretto al trace del backend. Con una fixture custom che intercetta l'header W3C `traceparent`, il report del test include un link a Grafana: un click e vedi il waterfall completo, dal frontend al microservizio colpevole.

Vedremo come implementare la trace correlation in poche righe, come portarla in CI con sharding e blob reporter, e come scegliere la strategia di sampling giusta per ogni ambiente.

Il pubblico esce con una tecnica applicabile subito: passare da "timeout" a "lock sulla tabella notifications" in 30 secondi.

---

## Scaletta

### 1. Il problema (7 min)

- Apertura: "Alzi la mano chi ha avuto un test verde in locale e rosso in CI questa settimana."
- Il costo nascosto dei test flaky: rilanci, passa, vai avanti — il bug resta.
- Scenario concreto: test di checkout, timeout dopo 30s. Quale dei 5 microservizi ha rallentato? Non lo sai.
- Transizione: "E se il test fallito ti desse un link diretto al trace del backend?"

### 2. Playwright: le basi che servono (8 min)

- Auto-waiting: verifica visibilità, stabilità, non-occlusione prima di ogni azione. Addio `sleep()`.
- Selettori semantici: `getByRole('button', { name: 'Checkout' })` sopravvive ai refactoring.
- Trace Viewer: timeline visuale con DOM snapshot a ogni step.
- Mini-demo: Codegen genera il test mentre fai checkout nel browser.

### 3. Il ponte: trace correlation (12 min) — cuore del talk

- Concetto: ogni richiesta HTTP genera un trace distribuito. Il backend risponde con `traceparent` (W3C). Playwright lo intercetta.
- Implementazione:
  - Fixture `traceCollector` — intercetta `page.on('response')`
  - Parsing `traceparent` — estrai `traceId`
  - Costruzione URL Grafana
  - Su test failure — stampa i link nel report
- Demo live:
  1. Test checkout fallisce con timeout
  2. Nel log: `Trace: https://grafana.local/explore?traceId=abc123`
  3. Click — Grafana mostra il waterfall
  4. payment-service 40ms, inventory-service 35ms, **notification-service 3010ms**
  5. Drill-down: query bloccata da un lock

### 4. In CI: rendilo scalabile (5 min)

- Sharding: 200 test su 4 runner con GitHub Actions matrix strategy
- Blob reporter: report parziali mergiati in un job finale
- Trace sampling: 100% in CI, 10% in staging, tail-based in prod

### 5. Chiusura (3 min)

- Riepilogo visivo del flusso completo: Test → traceparent → Grafana → root cause
- "Il prossimo test che fallisce in CI non sarà più un mistero. Sarà un link."
- Slide risorse: articoli + repo demo
