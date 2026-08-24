---
title: "Playwright: Mock Fixture, HAR Replay e Composizione per Test Scalabili"
date: 2026-03-04T09:00:00.000Z
description: "Come scalare il network mocking con fixture riusabili, HAR replay e composizione di scenari complessi"
pillar: verificare
category: testing
tags:
  - Playwright
  - Testing
  - E2E
  - Mocking
  - Fixtures
  - TypeScript
lang: it
series: playwright
seriesOrder: 50
reproducibility: true
summary:
  - label: "Problema"
    value: "Il mock inline duplicato diventa un costo di manutenzione"
    note: "Un campo nuovo nello schema costa tanti aggiornamenti quanti i test"
  - label: "Scelta"
    value: "Classe MockApi con metodi semantici esposta come fixture Playwright"
    note: "Il setup di un test scende da otto righe di route a una chiamata"
  - label: "Strumento"
    value: "HAR replay per i flussi con troppe API da mockare a mano"
    note: "Si registra il traffico reale una volta, poi lo si riproduce nei test"
  - label: "Criterio"
    value: "Inline per un solo test, fixture dai tre in su, HAR per i flussi complessi"
openItems:
  - "Il matching HAR è rigido: se cambiano URL, metodo o body di un POST, la richiesta passa silenziosamente al server reale senza errori espliciti"
  - "Il HAR riflette il backend al momento della registrazione e non ha invalidazione automatica: serve registrarlo di nuovo, mensile o per sprint"
  - "Un flusso di checkout completo può generare un HAR di diversi megabyte: committarlo pesa su clone e review delle diff"
  - "`mergeTests` serve con fixture in moduli separati o mantenute da team diversi: nello stesso file basta estendere una volta sola"
---

Nell'[articolo precedente](/blog/verificare/testing/04-network-mocking/) abbiamo visto come `page.route()` permette di intercettare le richieste HTTP del browser e restituire risposte controllate. Funziona: si registra un handler, si chiama `route.fulfill()`, e il test non dipende più dal backend reale. Ma c'è un problema che emerge appena la suite cresce.

Con 5 test che mockano `/api/products`, il blocco `page.route()` + `route.fulfill()` si ripete identico in ognuno. Quando lo schema del prodotto cambia -- un campo rinominato, un tipo che diventa nullable -- servono 5 aggiornamenti. Con 30 test, servono 30 aggiornamenti. Il mock inline che sembrava semplice diventa un costo di manutenzione.

Questo articolo copre quattro pattern per scalare il network mocking: **mock fixture riusabili**, **HAR replay**, **composizione di scenari**, e **mergeTests** per combinare fixture indipendenti. Il codice completo è nel [repository MockMart](https://github.com/monte97/MockMart), lo stesso usato nella serie -- directory `tests/e2e/`.

---

## Il costo della duplicazione

Guardiamo cosa succede con i mock inline. Nell'articolo precedente, ogni test che verifica il comportamento della lista prodotti inizia così:

```typescript
test('should render product list', async ({ page }) => {
  await page.route('**/api/products', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Alpha', price: 10, category: 'gadgets', stock: 5, image: '/img.png', description: '...' },
      ]),
    }),
  );

  await page.goto('/');
  // ...asserzioni
});
```

Il test per lo stato vuoto ha lo stesso `page.route()` con `body: JSON.stringify([])`. Il test per l'errore 500 ha lo stesso `page.route()` con `status: 500`. Ogni test ripete lo stesso boilerplate: URL pattern, content type, `JSON.stringify`, struttura della risposta.

Il problema non è il singolo test -- è la moltiplicazione. Quando `Product` aggiunge un campo `rating`, ogni test che costruisce un prodotto inline va aggiornato. Quando l'endpoint cambia path da `/api/products` a `/api/v2/products`, la modifica tocca N file. Il mock inline viola lo stesso principio che il codice di produzione rispetta: singolo punto di responsabilità.

La soluzione è la stessa che usiamo nel codice applicativo: estrarre la logica ripetuta in un'astrazione riusabile. Playwright lo supporta nativamente con le **fixture**.

---

## Mock fixture riusabile

L'idea è semplice: creare una classe `MockApi` che espone metodi semantici -- `products()`, `checkoutError()`, `delay()` -- e wrappare la classe in una Playwright fixture. Ogni test riceve `mockApi` come parametro, senza sapere nulla di `page.route()` o `route.fulfill()`.

### La classe MockApi

Ecco il file completo `tests/e2e/fixtures/mock-api.ts`:

```typescript
import { test as base, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
    description: 'A fake product from mock-api fixture.',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// MockApi class
// ---------------------------------------------------------------------------

class MockApi {
  constructor(private page: Page) {}

  async products(items: Product[]) {
    await this.page.route('**/api/products', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(items),
      }),
    );
  }

  async emptyProducts() {
    await this.products([]);
  }

  async productsError(status: number = 500) {
    await this.page.route('**/api/products', (route) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ error: `Mocked error ${status}` }),
      }),
    );
  }

  async checkoutSuccess(orderId: number = 1) {
    await this.page.route('**/api/checkout', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          order: {
            id: orderId,
            status: 'pending',
            total: 99.99,
            createdAt: new Date().toISOString(),
          },
        }),
      }),
    );
  }

  async checkoutError(status: number = 402) {
    const errors: Record<number, string> = {
      400: 'Cart is empty',
      402: 'Payment declined',
      403: 'Not authorized to checkout',
      500: 'Internal server error',
    };

    await this.page.route('**/api/checkout', (route) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({
          error: errors[status] || `Error ${status}`,
          details: `Mocked ${status} from mock-api fixture`,
        }),
      }),
    );
  }

  async delay(urlPattern: string, ms: number) {
    await this.page.route(urlPattern, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      await route.continue();
    });
  }
}

// ---------------------------------------------------------------------------
// Fixture export
// ---------------------------------------------------------------------------

export { fakeProduct, type Product };

export const test = base.extend<{ mockApi: MockApi }>({
  mockApi: async ({ page }, use) => {
    const api = new MockApi(page);
    await use(api);
  },
});

export { expect } from '@playwright/test';
```

Alcuni punti da notare:

- **`fakeProduct()`** è la stessa factory vista nell'articolo 04, ma ora vive nel fixture file -- un unico posto. Quando `Product` cambia, si aggiorna qui.
- **`MockApi`** riceve `page` nel costruttore e incapsula tutti i `page.route()`. I metodi sono semantici: `products()`, `checkoutError(402)`, `delay()`.
- **Il fixture** estende `base.test` con un parametro `mockApi`. Playwright lo inietta automaticamente in ogni test che lo richiede.
- **`emptyProducts()`** è un metodo di convenienza che chiama `products([])`. Non aggiunge logica, ma rende il test più leggibile.

### Usare la fixture nei test

Ora un test che verifica la lista prodotti diventa:

```typescript
import { test, expect, fakeProduct } from '../fixtures/mock-api';

test('should show products from fixture', async ({ page, mockApi }) => {
  await mockApi.products([
    fakeProduct({ id: 1, name: 'Widget A', price: 10 }),
    fakeProduct({ id: 2, name: 'Widget B', price: 20 }),
  ]);

  await page.goto('/');

  const cards = page.locator('[data-testid="product-card"]');
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toContainText('Widget A');
});
```

Il test per l'errore 500:

```typescript
test('should show error from fixture', async ({ page, mockApi }) => {
  await mockApi.productsError(500);

  await page.goto('/');

  await expect(page.getByText(/error|errore/i)).toBeVisible();
  await expect(page.locator('[data-testid="product-card"]')).toHaveCount(0);
});
```

Confronta con la versione inline dell'articolo 04: il setup è passato da 8 righe di `page.route()` a una singola chiamata `mockApi.productsError(500)`. Ma il vantaggio reale non è la brevità -- è che quando lo schema cambia, l'aggiornamento è in un unico file.

E il delay:

```typescript
test('should add delay to products endpoint', async ({ page, mockApi }) => {
  await mockApi.delay('**/api/products', 2000);

  await page.goto('/');

  await expect(page.getByText(/loading|caricamento/i)).toBeVisible();

  await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible({
    timeout: 5_000,
  });
});
```

Il metodo `delay()` è generico: accetta qualsiasi URL pattern e un tempo in millisecondi. A differenza degli altri metodi, usa `route.continue()` invece di `route.fulfill()` -- la richiesta va al server reale, solo con un ritardo artificiale.

> **Autocomplete TypeScript**: un beneficio spesso sottovalutato. Con la fixture, l'IDE suggerisce `mockApi.products()`, `mockApi.checkoutError()`, `mockApi.delay()`. Con il mock inline, non c'è nessun aiuto -- ogni test deve ricordare la struttura della risposta.

---

## HAR replay

Le fixture coprono il caso in cui si sa esattamente cosa mockare. Ma ci sono flussi con 10, 15 chiamate API in sequenza -- un checkout completo, un flusso di autenticazione con redirect, una dashboard con N widget che caricano dati diversi. Scrivere un metodo MockApi per ognuna diventa impratico.

Playwright supporta il **HAR replay**: si registra il traffico di rete reale in un file HAR (HTTP Archive), poi si riproducono le risposte registrate nei test successivi.

### Registrare

Il primo passo è registrare il traffico. Si usa `routeFromHAR` con `update: true`:

```typescript
// Registra tutto il traffico verso /api/products in un file HAR
await page.routeFromHAR('./hars/products.har', {
  url: '**/api/products',
  update: true,
});

await page.goto('/');
// ...navigazione che genera le chiamate API
```

Playwright intercetta le risposte reali e le salva nel file `.har`. Il file contiene URL, headers, body, status code -- tutto ciò che serve per riprodurre la risposta.

### Riprodurre

Una volta registrato il file HAR, i test successivi lo usano con `update: false`:

```typescript
test('should replay product listing from HAR file', async ({ page }) => {
  await page.routeFromHAR('./hars/products.har', {
    url: '**/api/products',
    update: false,
  });

  await page.goto('/');

  await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible({
    timeout: 5_000,
  });
});
```

Il browser non contatta il server: Playwright matcha le richieste con quelle registrate nel HAR e restituisce le risposte salvate.

### Quando usare HAR replay

HAR replay è utile quando:

- Il flusso coinvolge molte API e scrivere mock per ognuna richiede troppo tempo
- Si vuole un setup rapido partendo dal traffico reale
- I dati di risposta sono complessi e difficili da costruire a mano

### Limiti

Il matching HAR è rigido: Playwright confronta URL, metodo HTTP e, per le richieste POST, anche il body. Se il frontend cambia l'ordine dei parametri in un POST, il matching fallisce e la richiesta passa al server reale -- silenziosamente. Non c'è un errore esplicito: il test gira contro il backend vero invece che contro il mock, e può passare o fallire per motivi completamente diversi da quelli attesi.

Il problema principale è la **stale**: il file HAR riflette lo stato del backend al momento della registrazione. Se l'API aggiunge un campo, cambia un formato, o restituisce dati diversi, il HAR è obsoleto. Non c'è un meccanismo automatico di invalidazione -- il test continua a usare i dati vecchi finché qualcuno non se ne accorge.

Un altro limite pratico: i file HAR possono diventare grandi. Un flusso di checkout con immagini, payload JSON complessi e header di autenticazione può generare un file da diversi megabyte. Committare file binari grandi nel repository ha un costo in termini di dimensione del clone e review delle diff.

> **Pattern consigliato**: registra il HAR, committalo nel repository, e aggiungi un task periodico (mensile o per sprint) per rieseguire la registrazione con `update: true`. Filtra con il parametro `url` per registrare solo gli endpoint necessari, evitando di catturare traffico irrilevante (analytics, CDN, third-party scripts). Tratta il HAR come un'istantanea: utile per stabilità, da aggiornare regolarmente.

---

## Composizione -- scenari complessi

Il vantaggio della fixture `MockApi` emerge quando si combinano più mock nello stesso test. Ogni metodo registra un handler su un endpoint diverso, e si possono comporre liberamente.

### Checkout completo: prodotti + pagamento

Un test di checkout end-to-end richiede che sia la lista prodotti sia il pagamento siano controllati:

```typescript
test('checkout succeeds with mocked products and payment', async ({ page, mockApi }) => {
  await mockApi.products([
    fakeProduct({ id: 1, name: 'Composable Widget', price: 49.99 }),
  ]);
  await mockApi.checkoutSuccess(42);

  await page.goto('/');

  await page.locator('[data-testid="product-card"]').first().click();
  await page.locator('[data-testid="add-to-cart"]').click();
  await page.locator('[data-testid="cart-icon"]').click();
  await page.locator('[data-testid="checkout-button"]').click();
  await page.locator('[data-testid="confirm-order"]').click();

  await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
});
```

Due righe di setup -- `mockApi.products()` + `mockApi.checkoutSuccess()` -- e il test controlla l'intero flusso. Ogni mock è indipendente: `products()` registra un handler su `**/api/products`, `checkoutSuccess()` ne registra uno su `**/api/checkout`. Non interferiscono tra loro.

### Checkout fallito: prodotti reali, pagamento rifiutato

Lo scenario opposto -- i prodotti vengono dal backend reale (o da un altro mock), ma il pagamento fallisce:

```typescript
test('checkout fails: products OK but payment declined', async ({ page, mockApi }) => {
  await mockApi.checkoutError(402);

  await page.goto('/');

  await page.locator('[data-testid="product-card"]').first().click();
  await page.locator('[data-testid="add-to-cart"]').click();
  await page.locator('[data-testid="cart-icon"]').click();
  await page.locator('[data-testid="checkout-button"]').click();
  await page.locator('[data-testid="confirm-order"]').click();

  await expect(page.getByText(/declined|rifiutato/i)).toBeVisible();
  await expect(page.locator('[data-testid="order-confirmation"]')).not.toBeVisible();
});
```

Qui solo `/api/checkout` è mockato. La chiamata a `/api/products` va al server reale. Questo pattern è utile quando si vuole testare un singolo punto di fallimento senza isolare tutto il resto.

La composizione funziona perché ogni metodo `MockApi` opera su un endpoint specifico. Si possono combinare come blocchi: `products()` + `checkoutError()`, oppure `emptyProducts()` + `delay('**/api/checkout', 3000)`, o qualsiasi altra combinazione rilevante per lo scenario.

Questo approccio rende esplicita la matrice di scenari. Un test di checkout può combinare: prodotti vuoti + checkout success (deve bloccare prima del pagamento), prodotti presenti + checkout error 402 (pagamento rifiutato), prodotti presenti + checkout error 403 (utente non autorizzato). Ogni combinazione è una riga di setup, non un blocco di `page.route()` duplicato.

---

## Mock + trace correlation

Nell'[articolo sulla trace correlation](/blog/verificare/testing/02-opentelemetry-trace-correlation/) abbiamo visto come raccogliere trace ID OpenTelemetry durante i test E2E, usando una fixture `traceCollector`. Ora la domanda è: come combinare `mockApi` e `traceCollector` nello stesso test?

Il caso d'uso è il debug ibrido: si vuole mockare un endpoint (per esempio il checkout) e contemporaneamente raccogliere le trace dalle chiamate reali (per esempio la lista prodotti). Se il test fallisce, si hanno sia il comportamento controllato del mock sia le trace reali per capire cosa è successo nel backend.

### mergeTests

Playwright fornisce `mergeTests()` per combinare fixture provenienti da test object diversi. Ogni fixture è definita nel proprio modulo, e `mergeTests` le unifica:

```typescript
import { mergeTests } from '@playwright/test';
import { test as mockTest, expect, fakeProduct } from '../fixtures/mock-api';
import { test as traceTest } from '../fixtures/trace-collector';

const test = mergeTests(mockTest, traceTest);
```

Ora `test` ha accesso sia a `mockApi` sia a `traceCollector`:

```typescript
test.describe('4 - Mock + Trace Correlation', () => {
  test('should collect traces even with mocked checkout', async ({
    page,
    mockApi,
    traceCollector,
  }) => {
    await mockApi.checkoutError(402);

    await page.goto('/');

    // Browse products — real API calls with traces
    await page.locator('[data-testid="product-card"]').first().click();

    // Trace collector should have captured trace IDs from real API calls
    const traceIds = traceCollector.getTraceIds();
    // Traces exist from the real /api/products call
  });
});
```

Il checkout è mockato (errore 402), ma le chiamate a `/api/products` vanno al server reale e il `traceCollector` ne cattura i trace ID. Quando il test fallisce, si possono correlare le trace reali in Grafana o Jaeger per capire se il problema è nel backend o nel frontend.

> **Quando serve mergeTests**: quando due fixture vivono in moduli separati e devono coesistere nello stesso test. Se le fixture sono nello stesso file, basta estendere il test object una volta sola. `mergeTests` diventa necessario quando si hanno fixture indipendenti mantenute da team diversi o in moduli riusabili.

---

## Organizzare i mock nella suite

Con quattro pattern disponibili, la domanda diventa: quale usare e quando? La scelta dipende dalla frequenza di riuso e dalla complessità dello scenario.

| Pattern | Quando usarlo |
|---------|---------------|
| Mock inline (`page.route()`) | Test singolo, scenario unico, non riusato altrove |
| Mock fixture (`MockApi`) | Pattern ripetuto in 3+ test, schema condiviso |
| HAR replay | Flusso complesso con molte API, setup rapido da traffico reale |
| Composizione | Scenari con più endpoint mockati contemporaneamente |
| `mergeTests` | Combinare fixture indipendenti (mock + trace, mock + auth) |

Per la struttura dei file, una convenzione che scala:

```
tests/e2e/
  fixtures/
    mock-api.ts          # Fixture MockApi
    trace-collector.ts   # Fixture trace (da art. 02)
  hars/
    products.har         # HAR registrati
    checkout-flow.har
  tests/
    network-mocking.spec.ts           # Test art. 04 (mock inline)
    network-mocking-advanced.spec.ts  # Test art. 05 (fixture, HAR, composizione)
```

La regola pratica: se un mock compare in un solo test, tienilo inline. Se lo copi-incolli nel secondo test, è il momento di estrarlo nella fixture. Se il flusso ha troppe API per scrivere mock manuali, registra un HAR.

---

## Riepilogo

Quattro pattern, ognuno con il suo caso d'uso:

1. **Mock fixture** -- classe `MockApi` con metodi semantici, iniettata come Playwright fixture. Un unico punto di aggiornamento per schema e URL.
2. **HAR replay** -- registrazione e riproduzione del traffico reale. Utile per flussi complessi, ma richiede aggiornamento periodico.
3. **Composizione** -- combinare più metodi MockApi nello stesso test per scenari multi-endpoint. Ogni mock è indipendente.
4. **mergeTests** -- unire fixture da moduli diversi (mock + trace, mock + auth) nello stesso test.

Insieme all'[articolo 04](/blog/verificare/testing/04-network-mocking/) sui fondamentali di `page.route()`, questi pattern coprono lo spettro completo del network mocking in Playwright. Il codice completo è nel [repository MockMart](https://github.com/monte97/MockMart).

Articoli della serie Playwright:

- [01 - Guida completa E2E](/blog/verificare/testing/01-guida-completa-e2e/)
- [02 - OpenTelemetry Trace Correlation](/blog/verificare/testing/02-opentelemetry-trace-correlation/)
- [03 - CI/CD Strategie avanzate](/blog/verificare/testing/03-cicd-strategie-avanzate/)
- [04 - Network Mocking](/blog/verificare/testing/04-network-mocking/)
- 05 - Mock Fixture, HAR Replay e Composizione (questo articolo)

Con mock inline, fixture riusabili, HAR replay, composizione e merge di fixture, il network mocking non è più un collo di bottiglia. La suite cresce, i mock restano gestibili.
