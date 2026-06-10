---
title: "Playwright: Network Mocking and API Interception for Reliable Tests"
date: 2026-03-04T09:00:00.000Z
description: "How to use page.route() to mock APIs, simulate errors, and test edge cases without depending on real services"
pillar: verificare
category: testing
tags:
  - Playwright
  - Testing
  - E2E
  - Mocking
  - API
  - TypeScript
lang: en
reviewed: machine
series: playwright
seriesOrder: 40
---

The E2E checkout test fails. The screenshot shows a generic error message, the log says `timeout waiting for selector [data-testid="order-confirmation"]`. You open Grafana, check the traces: the payment service is down. It's not a frontend bug, it's not a regression — it's an external service that isn't responding. But the CI suite is red, the merge is blocked, and the team loses half a morning figuring out the problem isn't in the code.

This is the reality of E2E testing on microservice architectures: tests depend on N services, and if even one is slow, unstable, or under maintenance, the entire suite becomes unreliable. You can't fix this with retries or longer timeouts — it's a structural problem.

Playwright's `page.route()` solves this by intercepting HTTP requests at the browser level and returning controlled responses. It's not a substitute for integration tests — it's a tool for testing UI behavior deterministically, isolating the frontend from external dependencies. This article uses [MockMart](https://github.com/monte97/MockMart), the same environment from the [trace correlation article](/blog/verificare/testing/02-opentelemetry-trace-correlation/). The complete code is in the [repository](https://github.com/monte97/MockMart), in the `tests/e2e/tests/` directory.

---

## page.route() in 30 seconds

`page.route()` intercepts HTTP requests the browser sends to the server and lets you decide what to do with each one. The three fundamental options are:

- **`route.fulfill()`** — returns a custom response, without ever contacting the server
- **`route.continue()`** — passes the request through to the real server, unmodified
- **`route.abort()`** — blocks the request, simulating a network error

The basic pattern is straightforward: register a handler on a URL pattern, and in the callback decide which of the three actions to take.

```typescript
// Intercept all requests to /api/products
await page.route('**/api/products', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ id: 1, name: 'Mock Product', price: 9.99 }]),
  }),
);
```

The URL pattern supports glob syntax (`**` for any path prefix, `*` for any single segment). You can register multiple handlers on different URLs within the same test.

> **Important**: `page.route()` only intercepts browser-to-server traffic. If MockMart's checkout internally calls the payment service or inventory service server-side, those server-to-server calls **cannot be intercepted** by `page.route()`. Mocking inter-service communication requires infrastructure-level intervention (service mesh, backend test doubles). This article focuses exclusively on what the browser sees.

---

## Mocking API responses

The most immediate use case: replace an endpoint's response with controlled data. Instead of depending on a real database and services, the test decides exactly what the UI renders.

### Controlled product list

In MockMart, the homepage calls `GET /api/products` and renders product cards. By mocking this endpoint, the test controls how many cards appear and with what data:

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

  // The UI must show exactly 3 product cards
  const cards = page.locator('[data-testid="product-card"]');
  await expect(cards).toHaveCount(3);

  // Verify the first product is visible
  await expect(cards.first()).toContainText('Alpha');
});
```

`fakeProduct()` is a factory that generates a product with default values, overridable with `overrides`. It's a useful pattern to avoid repeating the full schema in every test:

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

### Empty state

Testing the UI when there are no products is equally important: the user should see an informative message, not a blank page or an error.

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

  // No product cards
  await expect(page.locator('[data-testid="product-card"]')).toHaveCount(0);

  // The app must show an empty state indicator
  await expect(page.getByText(/no products/i)).toBeVisible();
});
```

Without mocking, this scenario is nearly impossible to reproduce reliably: you'd need to empty the database, run the test, and repopulate it. With `route.fulfill()`, the test is self-contained and has no side effects.

---

## Simulating HTTP errors

Every backend can return errors. The question is: does the UI handle them correctly? Without network mocking, testing a 500 Internal Server Error requires actually breaking the real service. With `route.fulfill()`, you just declare the desired status code.

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

  // The page must show an error message
  await expect(page.getByText(/error|something went wrong/i)).toBeVisible();
  await expect(page.locator('[data-testid="product-card"]')).toHaveCount(0);
});
```

The test verifies two things: that the error message appears and that product cards are not rendered. This is a test of **graceful degradation** — the application's ability to handle failures in a controlled way.

### 402 Payment Failed

A more specific scenario: the user adds a product to the cart, proceeds to checkout, but payment is declined. Here the product API works normally — only the checkout endpoint is intercepted:

```typescript
test('should show payment error when checkout returns 402', async ({ page }) => {
  // Products come from the real server
  // We only intercept checkout
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

  // Add a product to cart
  await page.locator('[data-testid="product-card"]').first().click();
  await page.locator('[data-testid="add-to-cart"]').click();

  // Go to cart and complete checkout
  await page.locator('[data-testid="cart-icon"]').click();
  await page.locator('[data-testid="checkout-button"]').click();
  await page.locator('[data-testid="confirm-order"]').click();

  // The 402 mock must trigger an error in the UI
  await expect(page.getByText(/declined/i)).toBeVisible();

  // Order confirmation must NOT appear
  await expect(page.locator('[data-testid="order-confirmation"]')).not.toBeVisible();
});
```

Note: the user flow is real (navigation, clicks, cart interaction). Only the checkout response is mocked. This approach is particularly useful because it keeps the test realistic in terms of user journey, isolating only the failure point.

> Keep in mind: `page.route('**/api/checkout', ...)` intercepts the browser's call to the gateway. If the checkout internally calls the payment service and it returns a real error, that flow is not interceptable from here. The mock simulates "the gateway responds 402 to the browser", not "the payment service declines the transaction". For inter-service integration scenarios, different tests are needed.

---

## Testing loading states

When an API is slow, the UI should show a loading indicator — a spinner, skeleton, or "Loading..." text. But how do you test this? Real APIs respond in milliseconds, too fast to verify the intermediate state.

The solution: add an artificial delay in the mock.

```typescript
test('should show loading indicator while products API is slow', async ({ page }) => {
  await page.route('**/api/products', async (route) => {
    // 3-second delay before responding
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

  // While the API is waiting, the loading indicator must be visible
  await expect(page.getByText(/loading/i)).toBeVisible();

  // After the delay, the product appears and loading disappears
  await expect(page.locator('[data-testid="product-card"]')).toHaveCount(1, {
    timeout: 5_000,
  });
  await expect(page.getByText(/loading/i)).not.toBeVisible();
});
```

The pattern is `delay + fulfill`: the delay creates the time window to assert on the loading state, then the response arrives and the test verifies the loading → content transition.

> You don't need `await page.waitForTimeout()` or `sleep()` in the test. The delay is in the mock, not in the test. Playwright uses auto-waiting: `toBeVisible()` waits for the element to appear, `toHaveCount()` waits up to the specified `timeout`. The test remains deterministic without hard-coded waits.

This approach lets you test the complete cycle: loading state visible, response arrives, content rendered, loading indicator disappears. An edge case often overlooked but fundamental for user experience.

---

## Conditional mocking — modifying real responses

Sometimes you don't want to completely replace a response, but modify it. `route.fetch()` lets you forward the request to the real server, get the response, modify it, and return it to the browser.

### Overriding prices on the fly

```typescript
test('should fetch real products and override all prices to 0', async ({ page }) => {
  await page.route('**/api/products', async (route) => {
    // Forward the request to the real server
    const response = await route.fetch();
    const products: Product[] = await response.json();

    // Modify each product's price
    const modified = products.map((p) => ({ ...p, price: 0 }));

    await route.fulfill({
      status: response.status(),
      headers: response.headers(),
      body: JSON.stringify(modified),
    });
  });

  await page.goto('/');

  // All visible prices must be 0
  const cards = page.locator('[data-testid="product-card"]');
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    await expect(cards.nth(i)).toContainText(/\b0[.,]00\b/);
  }
});
```

The advantage: the test uses real data (names, categories, images) with a single controlled variation. No need to maintain a separate fixture, and if the backend adds new fields the test won't break.

### Selective mocking by URL parameters

You don't always want to intercept all requests to an endpoint. Sometimes you need to mock only requests with certain parameters and let the rest through:

```typescript
test('should mock only requests with category param, pass others through', async ({ page }) => {
  await page.route('**/api/products**', async (route) => {
    const url = new URL(route.request().url());

    if (url.searchParams.get('category') === 'gadgets') {
      // Custom response only for the "gadgets" category
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          fakeProduct({ id: 777, name: 'Mocked Gadget', category: 'gadgets' }),
        ]),
      });
    } else {
      // Everything else passes through to the real server
      await route.continue();
    }
  });

  await page.goto('/');

  // The main listing (without filter) comes from the real server
  const cards = page.locator('[data-testid="product-card"]');
  await expect(cards.first()).toBeVisible({ timeout: 5_000 });
});
```

This pattern is useful when the test depends on real data for most of the flow but needs to control a specific case. The combination of `continue()` and `fulfill()` in the same handler offers maximum flexibility.

---

## Simulating offline

The final pattern: blocking network requests entirely with `route.abort()`. Useful for testing how an application handles losing connectivity.

```typescript
test('should show error/offline state when all API calls are aborted', async ({ page }) => {
  // Step 1: load the page normally
  await page.goto('/');
  await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible({
    timeout: 5_000,
  });

  // Step 2: install a handler that blocks all /api/* requests
  await page.route('**/api/**', (route) => route.abort('connectionrefused'));

  // Step 3: reload — all API requests will be blocked
  await page.reload();

  // The page must show an error or offline indicator
  await expect(
    page.getByText(/error|offline|network/i),
  ).toBeVisible();

  // Product cards must no longer be present
  await expect(page.locator('[data-testid="product-card"]')).toHaveCount(0);
});
```

The pattern has three phases:

1. **Load with real data** — verify the app works normally
2. **Install the abort handler** — `route.abort('connectionrefused')` simulates a refused connection
3. **Reload** — the app tries to call the APIs, all requests fail

The parameter to `abort()` specifies the type of network error. Beyond `'connectionrefused'`, Playwright supports `'connectionreset'`, `'internetdisconnected'`, `'namenotresolved'`, and others. Each simulates a different network failure type, useful for testing specific error handling.

> This test verifies application resilience. An app that shows a blank page when it loses connectivity has a UX problem. An app that shows "Connection lost, please retry" handles failure in a controlled way.

---

## When to mock and when not to

Network mocking is powerful, but it's not the answer to everything. Overusing it risks creating tests that always pass but don't verify anything real.

| Scenario | Mock? | Why |
|----------|-------|-----|
| UI tests for specific states (error, empty, loading) | Yes | Deterministic, fast |
| Edge cases impossible to reproduce (timeout, malformed JSON) | Yes | The only way to test them |
| Critical happy path (full checkout) | No | Need the real contract |
| Integration tests between services | No | The value is in real communication |
| Performance/load tests | No | Mocks are too fast |

The guiding principle is simple: **mock what you're not testing**. If you're testing the UI's behavior on a 500 error, you don't need the server to actually return a 500 — you need the UI to handle it. If you're testing that checkout works end-to-end, mocking the payment service makes the test useless.

The two approaches are complementary. A robust E2E suite has tests with mocks to cover edge cases and UI states, and tests without mocks to verify critical flows with real services. In the [CI/CD article](/blog/verificare/testing/03-cicd-strategie-avanzate/) we saw how to organize different suites with tags and sharding — the same principle applies here: fast mocked tests on every PR, full integration tests in nightly pipelines.

---

## Summary

Five patterns for controlling network traffic in Playwright tests:

1. **Fulfill** — replace API responses with controlled data, to test specific UI states
2. **Error** — simulate HTTP errors (500, 402, 404) to verify graceful degradation
3. **Delay** — add delays to test loading states and transitions
4. **Conditional** — modify real responses with `route.fetch()` or mock selectively by URL/parameters
5. **Abort** — block requests to simulate offline and lost connectivity

All examples in this article are in the [MockMart](https://github.com/monte97/MockMart) repository, in the file `tests/e2e/tests/network-mocking.spec.ts`. For environment configuration and test setup, refer to the [series introduction](/blog/verificare/testing/01-guida-completa-e2e/).

In the next article we'll see how to scale these patterns with HAR replay, reusable mock fixtures, and handler composition for complex test suites.
