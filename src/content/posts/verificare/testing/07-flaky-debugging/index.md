---
title: "Playwright: Diagnosticare e Risolvere Test Flaky"
date: 2026-03-04T09:00:00.000Z
description: "Come identificare le cause dei test flaky e risolverle: trace viewer, retry strategico, pattern anti-flaky e checklist diagnostica"
pillar: verificare
category: testing
tags:
  - Playwright
  - Testing
  - E2E
  - Flaky Tests
  - Debugging
  - CI/CD
  - TypeScript
lang: it
series: playwright
seriesOrder: 70
reproducibility: true
summary:
  - label: "Problema"
    value: "Il retry cieco maschera i test flaky invece di eliminarli"
    note: "Una regressione reale scambiata per flaky porta il bug in produzione"
  - label: "Diagnosi"
    value: "La frequenza di fallimento indica la categoria del problema"
    note: "Timing 10-20% dei run, race di rendering 5-10%, dipendenze esterne a cluster"
  - label: "Strumento"
    value: "Trace Viewer con trace on-first-retry"
    note: "Registra la trace solo quando il test fallisce e viene riprovato"
  - label: "Ampiezza"
    value: "Quattro cause, cinque pattern anti-flaky, checklist diagnostica"
openItems:
  - "Il retry resta legittimo per i glitch transitori dell'infrastruttura CI, ma sui test del critical path va disabilitato"
  - "Se il test non si riproduce in locale con `--repeat-each`, il problema è quasi certamente nelle risorse della macchina CI"
  - "`failOnFlakyTests` e `--only-changed` richiedono Playwright 1.56 o successivo: le versioni precedenti non li hanno"
  - "I test E2E della UI non devono dipendere dal database, ma i test di integrazione col database reale restano un livello separato della piramide"
openNote: "Quello che il retry, da solo, non risolve."
mode: how-to
---

Il test passa 9 volte su 10. In CI fallisce una volta a settimana, sempre su un test diverso. Il team aggiunge `retries: 2` nella configurazione, il test passa, nessuno investiga. Dopo un mese la suite ha 15 test flaky mascherati dai retry, e nessuno si fida più dei risultati. Quando un test fallisce davvero -- una regressione reale -- la reazione è "sarà un flaky, rieseguiamo". Il bug arriva in produzione.

I test flaky sono il problema più dannoso del testing E2E. Non perché siano difficili da fixare, ma perché erodono la fiducia nella suite. Un team che non si fida dei propri test smette di guardarli. E una suite che nessuno guarda è peggio di nessuna suite -- dà l'illusione di una rete di sicurezza che non esiste.

Questo articolo analizza le cause dei test flaky, gli strumenti per diagnosticarli e cinque pattern concreti per risolverli. Il codice usa [MockMart](https://github.com/monte97/MockMart), lo stesso ambiente degli articoli precedenti su [network mocking](/blog/verificare/testing/04-network-mocking/) e [fixture riusabili](/blog/verificare/testing/05-network-mocking-avanzato/). Il file completo dei pattern flaky/stabile è nel repository, in `tests/e2e/tests/flaky-patterns.spec.ts`. Per il setup iniziale di Playwright, fai riferimento alla [guida introduttiva](/blog/verificare/testing/01-guida-completa-e2e/).

---

## Anatomia di un test flaky

Un test flaky non è un test che fallisce -- è un test che a volte passa e a volte fallisce, con lo stesso codice, sullo stesso commit. Le cause si raggruppano in quattro categorie.

### Timing

Il test assume che qualcosa avvenga entro un tempo fisso. Un `waitForTimeout(2000)` funziona sulla macchina dello sviluppatore dove l'API risponde in 200ms, ma fallisce nel runner CI dove le risorse sono limitate e la risposta arriva dopo 2.5 secondi. Il problema non è la lentezza del servizio -- è l'assunzione che un intervallo fisso sia sufficiente.

### Stato condiviso

Due test operano sugli stessi dati. Il test A crea un prodotto, il test B assume che il database ne contenga esattamente tre. Se l'ordine di esecuzione cambia -- perché il runner parallelizza, o perché un test viene aggiunto prima -- l'assunzione si rompe. Questo tipo di flakiness ha una firma riconoscibile: passa con `workers=1`, fallisce con `workers > 1`.

### Dipendenze esterne

Il test del checkout chiama il payment-service reale. Quando il servizio è lento o in manutenzione, il test fallisce. Non è un bug del frontend, non è una regressione -- ma la suite è rossa e il merge è bloccato. La frequenza di questi fallimenti è a cluster: 3-4 test falliscono insieme perché dipendono tutti dallo stesso servizio.

### Rendering asincrono

L'elemento è nel DOM, ma il framework non ha finito l'hydration. Il click handler non è ancora attaccato. Il `click()` di Playwright viene eseguito, ma non succede nulla. Il test fallisce nell'asserzione successiva, non nel click, rendendo la causa difficile da individuare.

**Come riconoscere la causa**: la frequenza di fallimento è un indicatore. I problemi di timing falliscono nel 10-20% dei run. Le dipendenze esterne falliscono a cluster. Lo stato condiviso emerge quando si cambia il numero di worker. Le race condition di rendering sono le più insidiose: falliscono raramente (5-10%) e in modo apparentemente casuale.

---

## Trace Viewer -- il debugger del test flaky

Il Trace Viewer di Playwright è lo strumento più efficace per diagnosticare i test flaky. Una trace è una registrazione completa di tutto ciò che accade durante l'esecuzione del test: screenshot per ogni azione, richieste di rete, log della console, snapshot del DOM.

La configurazione chiave è `trace: 'on-first-retry'`. Con questa impostazione, Playwright non registra la trace alla prima esecuzione (evitando l'overhead quando il test passa), ma la attiva automaticamente quando il test fallisce e viene riprovato. Il risultato è una trace del fallimento, pronta per l'analisi.

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  retries: 2,
  use: {
    trace: 'on-first-retry',
  },
});
```

Quando un test fallisce, la trace viene salvata nella cartella `test-results/`. Per aprirla:

```bash
npx playwright show-trace test-results/flaky-test-retry1/trace.zip
```

Il Trace Viewer mostra una timeline interattiva. Ogni azione del test -- `goto`, `click`, `waitFor`, `expect` -- è un punto nella timeline. Cliccando su un punto si vede lo screenshot esatto della pagina in quel momento, le richieste di rete in corso, i log della console, e lo stato del DOM.

Il punto chiave nell'analisi di un test flaky è il confronto. Quando un test passa in locale ma fallisce in CI, la trace del fallimento mostra esattamente cosa era diverso. Per esempio: il test clicca il bottone "Add to Cart", ma lo screenshot mostra che lo spinner di caricamento è ancora visibile -- l'API non ha ancora risposto. In locale, con risorse abbondanti, la risposta arrivava prima del click. In CI, no.

> Per un approfondimento sulla trace correlation con il backend via OpenTelemetry, fai riferimento all'[articolo sulla trace correlation](/blog/verificare/testing/02-opentelemetry-trace-correlation/).

---

## Retry strategico vs retry cieco

Il retry è uno strumento legittimo: filtra i falsi positivi causati da glitch transitori dell'infrastruttura CI. Ma c'è una differenza fondamentale tra usare il retry come rete di sicurezza temporanea e usarlo come soluzione permanente.

### Il retry cieco nasconde i bug

Configurare `retries: 2` e dimenticarsene è il pattern più comune. Il test fallisce, viene riprovato, passa al secondo tentativo, il risultato è verde. Nessuno investiga. Il problema è che quel test ha una causa reale di flakiness che può peggiorare nel tempo. Oggi fallisce il 10% delle volte, tra un mese il 30%, e il retry da solo non basterà più.

### Disabilitare il retry per i test critici

Per i test che coprono il critical path -- homepage, login, checkout -- il retry dovrebbe essere disabilitato. Se il test del checkout è flaky, bisogna saperlo subito, non mascherarlo.

```typescript
test.describe('Critical path - no retries', () => {
  test.describe.configure({ retries: 0 });

  test('homepage loads products (must never be flaky)', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="product-card"]').first().waitFor();
    const count = await page.locator('[data-testid="product-card"]').count();
    expect(count).toBeGreaterThan(0);
  });
});
```

### Riprodurre la flakiness in locale

Il flag `--repeat-each` esegue ogni test N volte nella stessa sessione. È lo strumento migliore per riprodurre un test flaky in locale prima di fixarlo:

```bash
# Esegue ogni test 10 volte -- se il test e' flaky al 10%, almeno 1 run fallira'
npx playwright test flaky-patterns --repeat-each=10
```

Se il test passa 10 volte su 10 in locale ma fallisce in CI, il problema è quasi certamente legato alle risorse della macchina CI (CPU, memoria, rete). In quel caso, il fix non è un retry -- è un `waitFor()` esplicito.

### failOnFlakyTests

A partire da Playwright v1.56, l'opzione `failOnFlakyTests` nel file di configurazione cambia il comportamento del retry: un test che fallisce al primo tentativo ma passa al retry viene comunque marcato come fallito. Il test deve passare a tutti i tentativi per essere verde.

```typescript
// playwright.config.ts
export default defineConfig({
  retries: 2,
  failOnFlakyTests: true,
});
```

Questo è il punto di incontro tra pragmatismo e rigore: il retry cattura la trace del fallimento (grazie a `trace: 'on-first-retry'`), ma il risultato finale riflette il fatto che il test è instabile.

---

## Pattern anti-flaky

Questa sezione contiene cinque pattern concreti, ciascuno con il codice flaky (da evitare) e il codice stabile (da seguire). Tutto il codice proviene dal file `flaky-patterns.spec.ts` del repository MockMart.

### Pattern 1: waitFor esplicito al posto di timeout fissi

Il pattern più comune di flakiness è il `waitForTimeout()`. Il test aspetta un numero arbitrario di millisecondi sperando che l'operazione si completi. Se l'ambiente è lento, il tempo non basta. Se l'ambiente è veloce, il test spreca tempo in attesa inutile.

```typescript
// NON FARE COSI' -- il timeout fisso e' arbitrario
test.skip('FLAKY: uses fixed timeout', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2000); // Arbitrario: 2s bastano?
  const count = await page.locator('[data-testid="product-card"]').count();
  expect(count).toBeGreaterThan(0);
});
```

La versione stabile usa `waitFor()` sul locator. Playwright aspetta fino a che l'elemento esiste nel DOM ed è visibile, con un timeout configurabile. Se l'elemento appare in 100ms, il test prosegue in 100ms. Se l'API è lenta e l'elemento appare dopo 5 secondi, il test aspetta 5 secondi. Non c'è nessuna stima arbitraria.

```typescript
// STABILE -- aspetta solo il tempo necessario
test('STABLE: waits for element', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="product-card"]').first().waitFor();
  const count = await page.locator('[data-testid="product-card"]').count();
  expect(count).toBeGreaterThan(0);
});
```

> **Regola pratica**: se il test contiene `waitForTimeout()` con un valore superiore a 0, quasi certamente esiste un'alternativa migliore. Il `waitForTimeout()` ha un uso legittimo solo per simulare il comportamento di un utente reale (ad esempio, una pausa prima di digitare), mai per sincronizzarsi con operazioni asincrone.

### Pattern 2: sincronizzarsi con le azioni, non sperare che funzionino

Una race condition si verifica quando il test esegue un'azione su un elemento che esiste nel DOM ma non è ancora interattivo. L'elemento è visibile, ma il click handler non è stato ancora attaccato dal framework JavaScript.

```typescript
// NON FARE COSI' -- click immediato senza verificare che l'UI sia pronta
test.skip('FLAKY: clicks without waiting for hydration', async ({ page }) => {
  await page.goto('/');
  // Il product card potrebbe essere nel DOM ma il click handler non ancora attaccato
  await page.locator('[data-testid="product-card"]').first().click();
  await page.locator('[data-testid="add-to-cart"]').click();
  // Potrebbe fallire se il click non ha avuto effetto
  await expect(page.locator('[data-testid="cart-item"]')).toBeVisible();
});
```

La versione stabile aggiunge un `waitFor()` esplicito prima di ogni interazione con un nuovo elemento. Dopo il click, verifica che il risultato atteso sia visibile prima di procedere.

```typescript
// STABILE -- ogni interazione e' preceduta da un waitFor
test('STABLE: waits for element and verifies action result', async ({ page }) => {
  await page.goto('/');
  // waitFor assicura che l'elemento sia attached e visible
  await page.locator('[data-testid="product-card"]').first().waitFor();
  await page.locator('[data-testid="product-card"]').first().click();

  // Aspetta che il bottone add-to-cart sia pronto prima di cliccarlo
  await page.locator('[data-testid="add-to-cart"]').waitFor();
  await page.locator('[data-testid="add-to-cart"]').click();

  // Verifica il risultato dell'azione
  await page.locator('[data-testid="cart-icon"]').click();
  await expect(page.locator('[data-testid="cart-item"]')).toBeVisible();
});
```

Il principio è: ogni transizione di stato nell'UI deve essere verificata prima di procedere. Non dare per scontato che un click abbia funzionato -- aspetta che l'effetto del click sia visibile. Per sincronizzarsi con le API, `waitForResponse()` è lo strumento complementare: permette di aspettare che una specifica richiesta HTTP sia completata prima di proseguire con le asserzioni. Questo pattern è trattato in dettaglio nella [guida introduttiva](/blog/verificare/testing/01-guida-completa-e2e/).

### Pattern 3: mockare le dipendenze esterne

Quando il test del checkout dipende dal payment-service reale, il risultato del test dipende dallo stato di un sistema esterno. Se il servizio è lento, il test fallisce per timeout. Se il servizio è giù, il test fallisce con un errore inatteso. Nessuno dei due fallimenti è un bug nel codice sotto test.

```typescript
// NON FARE COSI' -- dipende dal payment-service reale
test.skip('FLAKY: depends on real checkout service', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="product-card"]').first().click();
  await page.locator('[data-testid="add-to-cart"]').click();
  await page.locator('[data-testid="cart-icon"]').click();
  await page.locator('[data-testid="checkout-button"]').click();
  await page.locator('[data-testid="confirm-order"]').click();
  // Fallisce a intermittenza quando il payment-service e' lento o down
  await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
});
```

La versione stabile usa la fixture `mockApi` per restituire una risposta controllata. Il test verifica che la UI gestisca correttamente una risposta di successo -- non testa il payment-service.

```typescript
// STABILE -- risposta deterministica dal mock
test('STABLE: mocks checkout for deterministic result', async ({ page, mockApi }) => {
  await mockApi.checkoutSuccess(99);

  await page.goto('/');
  await page.locator('[data-testid="product-card"]').first().waitFor();
  await page.locator('[data-testid="product-card"]').first().click();
  await page.locator('[data-testid="add-to-cart"]').click();
  await page.locator('[data-testid="cart-icon"]').click();
  await page.locator('[data-testid="checkout-button"]').click();
  await page.locator('[data-testid="confirm-order"]').click();

  await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
});
```

La fixture `mockApi` è trattata in dettaglio nell'[articolo sulle fixture riusabili](/blog/verificare/testing/05-network-mocking-avanzato/). Il principio di fondo è nell'[articolo sul network mocking](/blog/verificare/testing/04-network-mocking/): `page.route()` intercetta le richieste a livello browser, permettendo di isolare la UI da qualsiasi servizio esterno.

### Pattern 4: selettori resilienti al posto di posizioni nel DOM

Un selettore posizionale come `nth-child(3)` funziona finché l'ordine degli elementi non cambia. Basta aggiungere un prodotto al database, cambiare l'ordinamento, o aggiungere un badge promozionale prima della lista, e il selettore punta all'elemento sbagliato.

```typescript
// NON FARE COSI' -- dipende dalla posizione nel DOM
test.skip('FLAKY: relies on DOM position', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1000);
  // nth-child dipende dall'ordine dei prodotti nel database
  const thirdProduct = page.locator('.product-grid > div:nth-child(3)');
  await expect(thirdProduct).toContainText('Keyboard');
});
```

La versione stabile combina `data-testid` per identificare il tipo di elemento e `getByText()` per cercare il contenuto. Il layout può cambiare, l'ordine può cambiare -- il test continua a funzionare perché cerca un contenuto specifico, non una posizione.

```typescript
// STABILE -- selettore semantico + dati controllati
test('STABLE: uses data-testid and text matching', async ({ page, mockApi }) => {
  await mockApi.products([
    fakeProduct({ id: 1, name: 'Laptop ProBook' }),
    fakeProduct({ id: 2, name: 'Wireless Mouse' }),
    fakeProduct({ id: 3, name: 'Mechanical Keyboard' }),
  ]);

  await page.goto('/');
  await page.locator('[data-testid="product-card"]').first().waitFor();

  // Cerca per contenuto, non per posizione
  await expect(page.getByText('Mechanical Keyboard')).toBeVisible();
});
```

### Pattern 5: dati controllati nel test, non nel database

Il pattern precedente introduce anche il quinto punto: i dati devono essere nel test, non nel database. Se il test assume "ci sono almeno 3 prodotti nel database", qualsiasi modifica ai dati -- un seed diverso, un test parallelo che elimina record, un ambiente CI con un database vuoto -- lo rompe.

Con `mockApi.products([...])` i dati sono dichiarati nel test stesso. Non serve un database popolato, non servono seed, non ci sono dipendenze tra test. Ogni test crea il proprio contesto, indipendente da tutto il resto.

```typescript
test('should pass consistently with mocked data', async ({ page, mockApi }) => {
  await mockApi.products([
    fakeProduct({ id: 1, name: 'Stable Product' }),
  ]);

  await page.goto('/');
  await page.locator('[data-testid="product-card"]').first().waitFor();
  await expect(page.locator('[data-testid="product-card"]')).toHaveCount(1);
});
```

Questo non significa che i test di integrazione con il database reale siano inutili -- significa che i test E2E della UI non dovrebbero dipendere dallo stato del database. Sono due livelli diversi della piramide del testing, con responsabilità diverse.

---

## --only-changed e test selettivi

Quando si sta debuggando un test flaky, eseguire l'intera suite a ogni modifica è uno spreco. Il feedback loop passa da 30 secondi a 10 minuti, e la produttività crolla.

Playwright offre tre flag per ridurre il perimetro di esecuzione:

```bash
# Esegue solo i test dei file modificati nel commit corrente (v1.56+)
npx playwright test --only-changed

# Ri-esegue solo i test falliti nell'ultimo run
npx playwright test --last-failed

# Filtra per nome del test
npx playwright test --grep "checkout"
```

`--only-changed` è particolarmente utile in CI: se il commit modifica solo il componente del carrello, non serve rieseguire i test della homepage o del catalogo. In combinazione con `--repeat-each`, permette di verificare che il fix del test flaky sia effettivo senza eseguire tutta la suite:

```bash
# Fix applicato: verifico che il test passi 20 volte di fila
npx playwright test flaky-patterns --grep "checkout" --repeat-each=20
```

`--last-failed` è utile nella sessione di debug locale: esegui la suite completa, tre test falliscono, applichi un fix, e ri-esegui solo quei tre.

---

## Checklist diagnostica

Quando un test fallisce in modo intermittente, il primo passo è identificare la categoria del problema. Questa tabella mappa i sintomi più comuni alla causa probabile e all'azione correttiva.

| Sintomo | Probabile causa | Azione |
|---------|-----------------|--------|
| Fallisce solo in CI, mai in locale | Timing / risorse limitate | Aggiungere `waitFor()`, verificare la trace del fallimento |
| Fallisce con `workers > 1`, passa con `workers=1` | Stato condiviso tra test | Isolare i test, usare mock e fixture per i dati |
| Fallisce a cluster (3-4 test insieme) | Dipendenza esterna down | Mockare il servizio, verificare l'health check |
| Fallisce random, bassa frequenza (5-10%) | Race condition nel rendering | Trace Viewer, `--repeat-each=20` per riprodurre |
| Fallisce su browser specifico | Rendering o timing browser-specific | Verificare selettori, aggiungere `waitFor()` |
| Fallisce dopo deploy del frontend | Selettore rotto | Verificare `data-testid`, aggiornare i locator |

Il flusso diagnostico è:

1. **Riprodurre**: `--repeat-each=20` in locale. Se non si riproduce, il problema è ambientale (risorse CI, rete).
2. **Catturare**: `trace: 'on-first-retry'` per avere la registrazione del fallimento.
3. **Analizzare**: aprire la trace, confrontare lo screenshot del momento del fallimento con l'azione precedente. Cercare: spinner ancora visibili (timing), dati inattesi (stato condiviso), errori di rete (dipendenza esterna).
4. **Fixare**: applicare il pattern corrispondente dalla sezione precedente.
5. **Verificare**: `--repeat-each=20 --grep "nome-test"` per confermare che il fix tiene.

---

## Riepilogo

Quattro cause: timing, stato condiviso, dipendenze esterne, rendering asincrono. Cinque pattern: `waitFor()` esplicito, sincronizzazione con le azioni, mock delle dipendenze, selettori resilienti, dati controllati. Uno strumento centrale: il Trace Viewer.

Il principio di fondo è: un test flaky è un bug nel test, non nel prodotto. Il retry non è una soluzione -- è un cerotto che nasconde il problema e lo lascia peggiorare. Ogni test flaky merita un'investigazione: identificare la causa, applicare il pattern corretto, verificare con `--repeat-each` che il fix tenga. Una suite stabile non è un lusso: è l'unico modo per avere fiducia nei risultati.

### La serie completa

1. [Guida completa E2E con Playwright](/blog/verificare/testing/01-guida-completa-e2e/) -- setup, primi test, best practice
2. [Trace correlation con OpenTelemetry](/blog/verificare/testing/02-opentelemetry-trace-correlation/) -- collegare test E2E e trace backend
3. [CI/CD: retry, sharding e parallelismo](/blog/verificare/testing/03-cicd-strategie-avanzate/) -- esecuzione scalabile in pipeline
4. [Network mocking con page.route()](/blog/verificare/testing/04-network-mocking/) -- isolare la UI dai servizi
5. [Network mocking avanzato: fixture e HAR](/blog/verificare/testing/05-network-mocking-avanzato/) -- pattern riusabili per il mocking
6. [Visual regression testing](/blog/verificare/testing/06-visual-regression/) -- catturare bug visivi con screenshot
7. Diagnosticare e risolvere test flaky -- questo articolo

Il codice completo è nel repository [MockMart](https://github.com/monte97/MockMart), nella directory `tests/e2e/tests/`.
