---
title: "Playwright: Mock Fixtures, HAR Replay, and Composition for Scalable Tests"
date: 2026-03-04T09:00:00.000Z
description: "How to scale network mocking with reusable fixtures, HAR replay, and composition of complex scenarios"
pillar: verificare
category: testing
tags:
  - Playwright
  - Testing
  - E2E
  - Mocking
  - Fixtures
  - TypeScript
lang: en
reviewed: machine
series: playwright
seriesOrder: 50
---

In the [previous article](/blog/verificare/testing/04-network-mocking/) we saw how `page.route()` lets you intercept browser HTTP requests and return controlled responses. It works: register a handler, call `route.fulfill()`, and the test no longer depends on the real backend. But a problem emerges as soon as the suite grows.

With 5 tests mocking `/api/products`, the `page.route()` + `route.fulfill()` block is repeated identically in each one. When the product schema changes — a renamed field, a type that becomes nullable — you need 5 updates. With 30 tests, you need 30 updates. The inline mock that seemed simple becomes a maintenance burden.

This article covers four patterns for scaling network mocking: **reusable mock fixtures**, **HAR replay**, **scenario composition**, and **mergeTests** for combining independent fixtures. The complete code is in the [MockMart repository](https://github.com/monte97/MockMart), the same environment used throughout the series — directory `tests/e2e/`.

---

## The cost of duplication

Let's look at what happens with inline mocks. In the previous article, every test that verifies product list behavior starts like this:

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
  // ...assertions
});
```

The test for empty state has the same `page.route()` with `body: JSON.stringify([])`. The test for a 500 error has the same `page.route()` with `status: 500`. Every test repeats the same boilerplate: URL pattern, content type, `JSON.stringify`, response structure.

The problem isn't the individual test — it's the multiplication. When `Product` adds a `rating` field, every test that builds a product inline needs updating. When the endpoint changes from `/api/products` to `/api/v2/products`, the change touches N files. Inline mocks violate the same principle that production code respects: single source of truth.

The solution is the same we use in application code: extract the repeated logic into a reusable abstraction. Playwright supports this natively with **fixtures**.

---

## Reusable mock fixture

The idea is simple: create a `MockApi` class that exposes semantic methods — `products()`, `checkoutError()`, `delay()` — and wrap the class in a Playwright fixture. Each test receives `mockApi` as a parameter, without knowing anything about `page.route()` or `route.fulfill()`.

### The MockApi class

Here is the complete file `tests/e2e/fixtures/mock-api.ts`:

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

A few points to note:

- **`fakeProduct()`** is the same factory from article 04, but now it lives in the fixture file — a single place. When `Product` changes, you update here.
- **`MockApi`** receives `page` in the constructor and encapsulates all `page.route()` calls. Methods are semantic: `products()`, `checkoutError(402)`, `delay()`.
- **The fixture** extends `base.test` with a `mockApi` parameter. Playwright injects it automatically into every test that requests it.
- **`emptyProducts()`** is a convenience method that calls `products([])`. It adds no logic, but makes the test more readable.

### Using the fixture in tests

A test verifying the product list now becomes:

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

The test for a 500 error:

```typescript
test('should show error from fixture', async ({ page, mockApi }) => {
  await mockApi.productsError(500);

  await page.goto('/');

  await expect(page.getByText(/error/i)).toBeVisible();
  await expect(page.locator('[data-testid="product-card"]')).toHaveCount(0);
});
```

Compare with the inline version from article 04: setup has gone from 8 lines of `page.route()` to a single call to `mockApi.productsError(500)`. But the real advantage isn't brevity — it's that when the schema changes, the update is in one file.

And the delay:

```typescript
test('should add delay to products endpoint', async ({ page, mockApi }) => {
  await mockApi.delay('**/api/products', 2000);

  await page.goto('/');

  await expect(page.getByText(/loading/i)).toBeVisible();

  await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible({
    timeout: 5_000,
  });
});
```

The `delay()` method is generic: it accepts any URL pattern and a time in milliseconds. Unlike the other methods, it uses `route.continue()` instead of `route.fulfill()` — the request goes to the real server, just with an artificial delay.

> **TypeScript autocomplete**: an often undervalued benefit. With the fixture, the IDE suggests `mockApi.products()`, `mockApi.checkoutError()`, `mockApi.delay()`. With inline mocks, there's no help — every test must remember the response structure.

---

## HAR replay

Fixtures cover the case where you know exactly what to mock. But some flows involve 10, 15 sequential API calls — a complete checkout, an authentication flow with redirects, a dashboard with N widgets loading different data. Writing a MockApi method for each becomes impractical.

Playwright supports **HAR replay**: record real network traffic in a HAR (HTTP Archive) file, then replay the recorded responses in subsequent tests.

### Recording

The first step is recording the traffic. Use `routeFromHAR` with `update: true`:

```typescript
// Record all traffic to /api/products in a HAR file
await page.routeFromHAR('./hars/products.har', {
  url: '**/api/products',
  update: true,
});

await page.goto('/');
// ...navigation that generates the API calls
```

Playwright intercepts the real responses and saves them to the `.har` file. The file contains URLs, headers, body, status codes — everything needed to replay the response.

### Replaying

Once the HAR file is recorded, subsequent tests use it with `update: false`:

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

The browser never contacts the server: Playwright matches requests against those recorded in the HAR and returns the saved responses.

### When to use HAR replay

HAR replay is useful when:

- The flow involves many APIs and writing mocks for each takes too long
- You want a quick setup based on real traffic
- Response data is complex and hard to build by hand

### Limitations

HAR matching is strict: Playwright compares URL, HTTP method, and for POST requests, also the body. If the frontend changes the parameter order in a POST, matching fails and the request passes through to the real server — silently. There's no explicit error: the test runs against the real backend instead of the mock, and can pass or fail for entirely different reasons than expected.

The main problem is **staleness**: the HAR file reflects the backend state at recording time. If an API adds a field, changes a format, or returns different data, the HAR is stale. There's no automatic invalidation mechanism — the test keeps using old data until someone notices.

Another practical limitation: HAR files can become large. A checkout flow with images, complex JSON payloads, and authentication headers can generate a file several megabytes in size. Committing large binary files to the repository has a cost in terms of clone size and diff review.

> **Recommended pattern**: record the HAR, commit it to the repository, and add a periodic task (monthly or per sprint) to re-record with `update: true`. Use the `url` parameter to record only necessary endpoints, avoiding capturing irrelevant traffic (analytics, CDN, third-party scripts). Treat the HAR as a snapshot: useful for stability, needs regular updating.

---

## Composition — complex scenarios

The advantage of the `MockApi` fixture emerges when combining multiple mocks in the same test. Each method registers a handler on a different endpoint, and they can be composed freely.

### Complete checkout: products + payment

An end-to-end checkout test requires both the product list and payment to be controlled:

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

Two lines of setup — `mockApi.products()` + `mockApi.checkoutSuccess()` — and the test controls the entire flow. Each mock is independent: `products()` registers a handler on `**/api/products`, `checkoutSuccess()` registers one on `**/api/checkout`. They don't interfere with each other.

### Failed checkout: real products, declined payment

The opposite scenario — products come from the real backend, but payment fails:

```typescript
test('checkout fails: products OK but payment declined', async ({ page, mockApi }) => {
  await mockApi.checkoutError(402);

  await page.goto('/');

  await page.locator('[data-testid="product-card"]').first().click();
  await page.locator('[data-testid="add-to-cart"]').click();
  await page.locator('[data-testid="cart-icon"]').click();
  await page.locator('[data-testid="checkout-button"]').click();
  await page.locator('[data-testid="confirm-order"]').click();

  await expect(page.getByText(/declined/i)).toBeVisible();
  await expect(page.locator('[data-testid="order-confirmation"]')).not.toBeVisible();
});
```

Here only `/api/checkout` is mocked. The call to `/api/products` goes to the real server. This pattern is useful when you want to test a single failure point without isolating everything else.

Composition works because each `MockApi` method operates on a specific endpoint. They can be combined like building blocks: `products()` + `checkoutError()`, or `emptyProducts()` + `delay('**/api/checkout', 3000)`, or any other combination relevant to the scenario.

This approach makes the scenario matrix explicit. A checkout test can combine: empty products + checkout success (must block before payment), products present + checkout error 402 (payment declined), products present + checkout error 403 (user not authorized). Each combination is one line of setup, not a duplicated block of `page.route()`.

---

## Mock + trace correlation

In the [trace correlation article](/blog/verificare/testing/02-opentelemetry-trace-correlation/) we saw how to collect OpenTelemetry trace IDs during E2E tests using a `traceCollector` fixture. Now the question is: how do you combine `mockApi` and `traceCollector` in the same test?

The use case is hybrid debugging: you want to mock an endpoint (for example checkout) while simultaneously collecting traces from real calls (for example the product list). If the test fails, you have both the controlled behavior of the mock and real traces to understand what happened in the backend.

### mergeTests

Playwright provides `mergeTests()` to combine fixtures from different test objects. Each fixture is defined in its own module, and `mergeTests` unifies them:

```typescript
import { mergeTests } from '@playwright/test';
import { test as mockTest, expect, fakeProduct } from '../fixtures/mock-api';
import { test as traceTest } from '../fixtures/trace-collector';

const test = mergeTests(mockTest, traceTest);
```

Now `test` has access to both `mockApi` and `traceCollector`:

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

The checkout is mocked (402 error), but calls to `/api/products` go to the real server and `traceCollector` captures their trace IDs. When the test fails, the real traces can be correlated in Grafana or Jaeger to understand whether the problem is in the backend or the frontend.

> **When to use mergeTests**: when two fixtures live in separate modules and need to coexist in the same test. If the fixtures are in the same file, just extend the test object once. `mergeTests` becomes necessary when you have independent fixtures maintained by different teams or in reusable modules.

---

## Organizing mocks in the suite

With four patterns available, the question becomes: which one to use and when? The choice depends on reuse frequency and scenario complexity.

| Pattern | When to use |
|---------|-------------|
| Inline mock (`page.route()`) | Single test, unique scenario, not reused elsewhere |
| Mock fixture (`MockApi`) | Pattern repeated across 3+ tests, shared schema |
| HAR replay | Complex flow with many APIs, quick setup from real traffic |
| Composition | Scenarios with multiple endpoints mocked simultaneously |
| `mergeTests` | Combining independent fixtures (mock + trace, mock + auth) |

For file structure, a convention that scales:

```
tests/e2e/
  fixtures/
    mock-api.ts          # MockApi fixture
    trace-collector.ts   # Trace fixture (from article 02)
  hars/
    products.har         # Recorded HAR files
    checkout-flow.har
  tests/
    network-mocking.spec.ts           # Article 04 tests (inline mocks)
    network-mocking-advanced.spec.ts  # Article 05 tests (fixtures, HAR, composition)
```

The practical rule: if a mock appears in only one test, keep it inline. If you copy-paste it into a second test, that's the moment to extract it into the fixture. If the flow has too many APIs to write manual mocks, record a HAR.

---

## Summary

Four patterns, each with its use case:

1. **Mock fixture** — `MockApi` class with semantic methods, injected as a Playwright fixture. A single update point for schema and URL.
2. **HAR replay** — recording and replaying real traffic. Useful for complex flows, but requires periodic updates.
3. **Composition** — combining multiple MockApi methods in the same test for multi-endpoint scenarios. Each mock is independent.
4. **mergeTests** — combining fixtures from different modules (mock + trace, mock + auth) in the same test.

Together with [article 04](/blog/verificare/testing/04-network-mocking/) on `page.route()` fundamentals, these patterns cover the full spectrum of network mocking in Playwright. The complete code is in the [MockMart repository](https://github.com/monte97/MockMart).

Articles in the Playwright series:

- [01 - Complete E2E Guide](/blog/verificare/testing/01-guida-completa-e2e/)
- [02 - OpenTelemetry Trace Correlation](/blog/verificare/testing/02-opentelemetry-trace-correlation/)
- [03 - Advanced CI/CD Strategies](/blog/verificare/testing/03-cicd-strategie-avanzate/)
- [04 - Network Mocking](/blog/verificare/testing/04-network-mocking/)
- 05 - Mock Fixtures, HAR Replay, and Composition (this article)

With inline mocks, reusable fixtures, HAR replay, composition, and fixture merging, network mocking is no longer a bottleneck. The suite grows, the mocks stay manageable.
