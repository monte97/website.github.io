---
title: "Playwright: Network Mocking e API Interception per Test Affidabili"
date: 2026-03-04T09:00:00.000Z
description: "Come usare page.route() per mockare API, simulare errori e testare edge case senza dipendere dai servizi reali"
pillar: verificare
category: testing
tags:
  - Playwright
  - Testing
  - E2E
  - Mocking
  - API
  - TypeScript
lang: it
series: playwright
seriesOrder: 40
reproducibility: true
---

Il test E2E del checkout fallisce. Lo screenshot mostra un messaggio di errore generico, il log dice `timeout waiting for selector [data-testid="order-confirmation"]`. Apri Grafana, controlli le trace: il payment-service è down. Non è un bug del frontend, non è una regressione -- è un servizio esterno che non risponde. Ma la suite CI è rossa, il merge è bloccato, e il team perde mezza mattinata a capire che il problema non è nel codice.

Questa è la realtà del testing E2E su architetture a microservizi: i test dipendono da N servizi, e se anche uno solo è lento, instabile o in manutenzione, l'intera suite diventa inaffidabile. Non è un problema risolvibile con retry o timeout più lunghi -- è un problema strutturale.

`page.route()` di Playwright risolve questo problema intercettando le richieste HTTP a livello di browser e restituendo risposte controllate. Non è un sostituto dei test di integrazione -- è uno strumento per testare il comportamento della UI in modo deterministico, isolando il frontend dalle dipendenze esterne. Questo articolo usa [MockMart](https://github.com/monte97/MockMart), lo stesso ambiente dell'[articolo sulla trace correlation](/blog/verificare/testing/02-opentelemetry-trace-correlation/). Il codice completo è nel [repository](https://github.com/monte97/MockMart), nella directory `tests/e2e/tests/`.

---

## page.route() in 30 secondi

`page.route()` intercetta le richieste HTTP che il browser invia al server e permette di decidere cosa fare con ciascuna. Le tre opzioni fondamentali sono:

- **`route.fulfill()`** -- restituisce una risposta custom, senza mai contattare il server
- **`route.continue()`** -- lascia passare la richiesta al server reale, senza modifiche
- **`route.abort()`** -- blocca la richiesta, simulando un errore di rete

Il pattern base è semplice: si registra un handler su un URL pattern, e nel callback si decide quale delle tre azioni eseguire.

```typescript
// Intercetta tutte le richieste a /api/products
await page.route('**/api/products', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ id: 1, name: 'Mock Product', price: 9.99 }]),
  }),
);
```

L'URL pattern supporta glob (`**` per qualsiasi path prefix, `*` per qualsiasi segmento). Si possono registrare più handler su URL diversi nello stesso test.

> **Attenzione**: `page.route()` intercetta solo il traffico browser-server. Se il checkout di MockMart chiama internamente il payment-service o l'inventory-service lato server, quelle chiamate server-to-server **non sono intercettabili** da `page.route()`. Per mockare comunicazioni tra servizi serve intervenire a livello di infrastruttura (service mesh, test doubles lato backend). In questo articolo ci concentriamo esclusivamente su ciò che il browser vede.

---

## Mockare risposte API

Il caso d'uso più immediato: sostituire la risposta di un endpoint con dati controllati. Invece di dipendere dal database e dai servizi reali, il test decide esattamente cosa mostra la UI.

### Lista prodotti controllata

In MockMart, la homepage chiama `GET /api/products` e renderizza le card prodotto. Mockando questo endpoint, il test controlla quante card appaiono e con quali dati:

```typescript
test('should render a custom product list from mocked API', async ({ page }) => {
  const products: Product[] = [
    fakeProduct({ id: 1, name: 'Alpha', price: 10 }),
    fakeProduct({ id: 2, name: 'Beta', price: 20 }),
    fakeProduct({ id: 3, name: 'Gamma', price: 30 }),
  ];

  await page.route('**/api/products', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(products),
    }),
  );

  await page.goto('/');

  // La UI deve mostrare esattamente 3 product card
  const cards = page.locator('[data-testid="product-card"]');
  await expect(cards).toHaveCount(3);

  // Verifica che il primo prodotto sia visibile
  await expect(cards.first()).toContainText('Alpha');
});
```

`fakeProduct()` è una factory che genera un prodotto con valori di default, sovrascrivibili con `overrides`. È un pattern utile per evitare di ripetere l'intero schema in ogni test:

```typescript
interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  image: string;
  description: string;
}

function fakeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 900,
    name: 'Mocked Widget',
    category: 'gadgets',
    price: 29.99,
    stock: 42,
    image: '/images/placeholder.png',
    description: 'A completely fake product injected by page.route().',
    ...overrides,
  };
}
```

### Stato vuoto

Testare la UI quando non ci sono prodotti è altrettanto importante: l'utente deve vedere un messaggio informativo, non una pagina bianca o un errore.

```typescript
test('should show empty state when product list is empty', async ({ page }) => {
  await page.route('**/api/products', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    }),
  );

  await page.goto('/');

  // Nessuna card prodotto
  await expect(page.locator('[data-testid="product-card"]')).toHaveCount(0);

  // L'app deve mostrare un indicatore di stato vuoto
  await expect(page.getByText(/no products|nessun prodotto/i)).toBeVisible();
});
```

Senza mock, questo scenario è quasi impossibile da riprodurre in modo affidabile: bisognerebbe svuotare il database, eseguire il test, ripopolare. Con `route.fulfill()`, il test è autocontenuto e non ha effetti collaterali.

---

## Simulare errori HTTP

Ogni backend può restituire errori. La domanda è: la UI li gestisce correttamente? Senza network mocking, testare un 500 Internal Server Error richiede di mandare in errore il servizio reale. Con `route.fulfill()`, basta dichiarare lo status code desiderato.

### 500 Internal Server Error

```typescript
test('should display error UI when products API returns 500', async ({ page }) => {
  await page.route('**/api/products', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal Server Error' }),
    }),
  );

  await page.goto('/');

  // La pagina deve mostrare un messaggio di errore
  await expect(page.getByText(/error|errore|something went wrong/i)).toBeVisible();
  await expect(page.locator('[data-testid="product-card"]')).toHaveCount(0);
});
```

Il test verifica due cose: che il messaggio di errore appaia e che le card prodotto non vengano renderizzate. È un test sulla **graceful degradation** -- la capacità dell'applicazione di gestire i fallimenti in modo controllato.

### 402 Payment Failed

Scenario più specifico: l'utente aggiunge un prodotto al carrello, procede al checkout, ma il pagamento viene rifiutato. Qui la prodotti API funziona normalmente -- si intercetta solo l'endpoint di checkout:

```typescript
test('should show payment error when checkout returns 402', async ({ page }) => {
  // I prodotti arrivano dal server reale
  // Intercettiamo solo il checkout
  await page.route('**/api/checkout', (route) =>
    route.fulfill({
      status: 402,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'payment_declined',
        message: 'Your card was declined. Please try a different payment method.',
      }),
    }),
  );

  await page.goto('/');

  // Aggiungi un prodotto al carrello
  await page.locator('[data-testid="product-card"]').first().click();
  await page.locator('[data-testid="add-to-cart"]').click();

  // Vai al carrello e completa il checkout
  await page.locator('[data-testid="cart-icon"]').click();
  await page.locator('[data-testid="checkout-button"]').click();
  await page.locator('[data-testid="confirm-order"]').click();

  // Il mock 402 deve far apparire un errore nel UI
  await expect(page.getByText(/declined|pagamento rifiutato/i)).toBeVisible();

  // La conferma ordine NON deve apparire
  await expect(page.locator('[data-testid="order-confirmation"]')).not.toBeVisible();
});
```

Nota: il flusso utente è reale (navigazione, click, interazione con il carrello). Solo la risposta del checkout è mockata. Questo approccio è particolarmente utile perché mantiene il test realistico nel percorso utente, isolando solo il punto di fallimento.

> Ricorda: `page.route('**/api/checkout', ...)` intercetta la chiamata del browser al gateway. Se il checkout internamente chiama il payment-service e questo restituisce un errore reale, quel flusso non è intercettabile da qui. Il mock simula "il gateway risponde 402 al browser", non "il payment-service rifiuta la transazione". Per scenari di integrazione tra servizi, servono test diversi.

---

## Testare loading states

Quando un'API è lenta, la UI dovrebbe mostrare un indicatore di caricamento -- spinner, skeleton, testo "Caricamento...". Ma come si testa? L'API reale risponde in millisecondi, troppo veloce per verificare lo stato intermedio.

La soluzione: aggiungere un ritardo artificiale nel mock.

```typescript
test('should show loading indicator while products API is slow', async ({ page }) => {
  await page.route('**/api/products', async (route) => {
    // Ritardo di 3 secondi prima di rispondere
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        fakeProduct({ id: 1, name: 'Delayed Product' }),
      ]),
    });
  });

  await page.goto('/');

  // Mentre l'API e' in attesa, l'indicatore di caricamento deve essere visibile
  await expect(page.getByText(/loading|caricamento/i)).toBeVisible();

  // Dopo il ritardo, il prodotto appare e il loading scompare
  await expect(page.locator('[data-testid="product-card"]')).toHaveCount(1, {
    timeout: 5_000,
  });
  await expect(page.getByText(/loading|caricamento/i)).not.toBeVisible();
});
```

Il pattern è `delay + fulfill`: il ritardo crea la finestra temporale per asserire sullo stato di caricamento, poi la risposta arriva e il test verifica la transizione loading -> contenuto.

> Non serve `await page.waitForTimeout()` o `sleep()` nel test. Il ritardo è nel mock, non nel test. Playwright usa auto-waiting: `toBeVisible()` aspetta che l'elemento appaia, `toHaveCount()` aspetta fino al `timeout` specificato. Il test resta deterministico senza hard-coded wait.

Questo approccio permette di testare il ciclo completo: stato di caricamento visibile, risposta che arriva, contenuto renderizzato, indicatore di caricamento che scompare. Un edge case spesso ignorato ma fondamentale per la user experience.

---

## Conditional mocking -- modificare risposte reali

A volte non si vuole sostituire completamente la risposta, ma modificarla. `route.fetch()` permette di inoltrare la richiesta al server reale, ottenere la risposta, modificarla e restituirla al browser.

### Modificare i prezzi al volo

```typescript
test('should fetch real products and override all prices to 0', async ({ page }) => {
  await page.route('**/api/products', async (route) => {
    // Inoltra la richiesta al server reale
    const response = await route.fetch();
    const products: Product[] = await response.json();

    // Modifica il prezzo di ogni prodotto
    const modified = products.map((p) => ({ ...p, price: 0 }));

    await route.fulfill({
      status: response.status(),
      headers: response.headers(),
      body: JSON.stringify(modified),
    });
  });

  await page.goto('/');

  // Tutti i prezzi visibili devono essere 0
  const cards = page.locator('[data-testid="product-card"]');
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    await expect(cards.nth(i)).toContainText(/\b0[.,]00\b/);
  }
});
```

Il vantaggio: il test usa dati reali (nomi, categorie, immagini) con una singola variazione controllata. Non serve mantenere un fixture separato, e se il backend aggiunge nuovi campi il test non si rompe.

### Mock selettivo per URL o parametri

Non sempre si vuole intercettare tutte le richieste a un endpoint. A volte serve mockare solo richieste con certi parametri e lasciare passare le altre:

```typescript
test('should mock only requests with category param, pass others through', async ({ page }) => {
  await page.route('**/api/products**', async (route) => {
    const url = new URL(route.request().url());

    if (url.searchParams.get('category') === 'gadgets') {
      // Risposta custom solo per la categoria "gadgets"
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          fakeProduct({ id: 777, name: 'Mocked Gadget', category: 'gadgets' }),
        ]),
      });
    } else {
      // Tutto il resto passa al server reale
      await route.continue();
    }
  });

  await page.goto('/');

  // Il listing principale (senza filtro) arriva dal server reale
  const cards = page.locator('[data-testid="product-card"]');
  await expect(cards.first()).toBeVisible({ timeout: 5_000 });
});
```

Questo pattern è utile quando il test dipende da dati reali per la maggior parte del flusso, ma ha bisogno di controllare un caso specifico. La combinazione `continue()` + `fulfill()` nello stesso handler offre la massima flessibilità.

---

## Simulare offline

L'ultimo pattern: bloccare completamente le richieste di rete con `route.abort()`. Utile per testare come l'applicazione gestisce la perdita di connessione.

```typescript
test('should show error/offline state when all API calls are aborted', async ({ page }) => {
  // Step 1: carica la pagina normalmente
  await page.goto('/');
  await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible({
    timeout: 5_000,
  });

  // Step 2: installa un handler che blocca tutte le richieste /api/*
  await page.route('**/api/**', (route) => route.abort('connectionrefused'));

  // Step 3: ricarica la pagina -- tutte le richieste API verranno bloccate
  await page.reload();

  // La pagina deve mostrare un errore o un indicatore offline
  await expect(
    page.getByText(/error|offline|network|connessione|errore/i),
  ).toBeVisible();

  // Le card prodotto non devono piu' essere presenti
  await expect(page.locator('[data-testid="product-card"]')).toHaveCount(0);
});
```

Il pattern è in tre fasi:

1. **Carica con dati reali** -- verifica che l'app funzioni normalmente
2. **Installa l'abort handler** -- `route.abort('connectionrefused')` simula una connessione rifiutata
3. **Ricarica** -- l'app tenta di chiamare le API, tutte le richieste falliscono

Il parametro di `abort()` specifica il tipo di errore di rete. Oltre a `'connectionrefused'`, Playwright supporta `'connectionreset'`, `'internetdisconnected'`, `'namenotresolved'` e altri. Ogni tipo simula un fallimento di rete diverso, utile per testare gestioni di errore specifiche.

> Questo test verifica la resilienza dell'applicazione. Un'app che mostra una pagina bianca quando perde connessione ha un problema di UX. Un'app che mostra "Connessione persa, riprova" gestisce il fallimento in modo controllato.

---

## Quando mockare e quando no

Il network mocking è potente, ma non è la risposta a tutto. Usarlo dove non serve rischia di creare test che passano sempre ma non verificano nulla di reale.

| Scenario | Mock? | Perché |
|----------|-------|---------|
| Test UI su stati specifici (errore, empty, loading) | Si | Deterministico, veloce |
| Edge case impossibili da riprodurre (timeout, malformed JSON) | Si | L'unico modo per testarli |
| Happy path critico (checkout completo) | No | Serve il contratto reale |
| Test di integrazione tra servizi | No | Il valore è nella comunicazione reale |
| Test di performance/carico | No | I mock sono troppo veloci |

Il principio guida è semplice: **mocka ciò che non stai testando**. Se stai testando il comportamento della UI su un errore 500, non ti serve che il server restituisca davvero un 500 -- ti serve che la UI lo gestisca. Se stai testando che il checkout funzioni end-to-end, mockare il payment-service rende il test inutile.

I due approcci sono complementari. Una suite E2E robusta ha test con mock per coprire edge case e stati della UI, e test senza mock per verificare i flussi critici con i servizi reali. Nell'[articolo sulla CI/CD](/blog/verificare/testing/03-cicd-strategie-avanzate/) abbiamo visto come organizzare suite diverse con tag e sharding -- lo stesso principio si applica qui: test mockati veloci in ogni PR, test di integrazione completi in pipeline notturne.

---

## Riepilogo

Cinque pattern per controllare il traffico di rete nei test Playwright:

1. **Fulfill** -- sostituire risposte API con dati controllati, per testare stati specifici della UI
2. **Error** -- simulare errori HTTP (500, 402, 404) per verificare la graceful degradation
3. **Delay** -- aggiungere ritardi per testare loading states e transizioni
4. **Conditional** -- modificare risposte reali con `route.fetch()` o mockare selettivamente per URL/parametri
5. **Abort** -- bloccare richieste per simulare offline e perdita di connessione

Tutti gli esempi di questo articolo sono nel repository [MockMart](https://github.com/monte97/MockMart), nel file `tests/e2e/tests/network-mocking.spec.ts`. Per la configurazione dell'ambiente e il setup dei test, fai riferimento all'[articolo introduttivo della serie](/blog/verificare/testing/01-guida-completa-e2e/).

Nel prossimo articolo vedremo come scalare questi pattern con HAR replay, mock fixture riutilizzabili e composizione di handler per suite di test complesse.
