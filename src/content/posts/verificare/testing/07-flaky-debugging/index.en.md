---
title: "Playwright: Diagnosing and Fixing Flaky Tests"
date: 2026-03-04T09:00:00.000Z
description: "How to identify the root causes of flaky tests and fix them: Trace Viewer, strategic retry, anti-flaky patterns, and a diagnostic checklist"
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
lang: en
reviewed: machine
series: playwright
seriesOrder: 70
---

The test passes 9 times out of 10. In CI it fails once a week, always on a different test. The team adds `retries: 2` to the configuration, the test passes, nobody investigates. After a month the suite has 15 flaky tests hidden behind retries, and nobody trusts the results anymore. When a test genuinely fails — a real regression — the reaction is "probably a flaky, let's re-run it." The bug ships to production.

Flaky tests are the most damaging problem in E2E testing. Not because they're hard to fix, but because they erode trust in the suite. A team that doesn't trust its tests stops looking at them. And a suite nobody looks at is worse than no suite — it gives the illusion of a safety net that doesn't exist.

This article analyzes the causes of flaky tests, the tools to diagnose them, and five concrete patterns to fix them. The code uses [MockMart](https://github.com/monte97/MockMart), the same environment from previous articles on [network mocking](/blog/verificare/testing/04-network-mocking/) and [reusable fixtures](/blog/verificare/testing/05-network-mocking-avanzato/). The complete file of flaky/stable patterns is in the repository, at `tests/e2e/tests/flaky-patterns.spec.ts`. For the initial Playwright setup, refer to the [introductory guide](/blog/verificare/testing/01-guida-completa-e2e/).

---

## Anatomy of a flaky test

A flaky test is not a test that fails — it's a test that sometimes passes and sometimes fails, with the same code, on the same commit. The causes fall into four categories.

### Timing

The test assumes something will happen within a fixed time. A `waitForTimeout(2000)` works on the developer's machine where the API responds in 200ms, but fails in the CI runner where resources are limited and the response arrives after 2.5 seconds. The problem isn't the service being slow — it's the assumption that a fixed interval is sufficient.

### Shared state

Two tests operate on the same data. Test A creates a product, test B assumes the database contains exactly three. If execution order changes — because the runner parallelizes, or a test is added before — the assumption breaks. This type of flakiness has a recognizable signature: passes with `workers=1`, fails with `workers > 1`.

### External dependencies

The checkout test calls the real payment service. When the service is slow or under maintenance, the test fails. It's not a frontend bug, it's not a regression — but the suite is red and the merge is blocked. The frequency of these failures is clustered: 3-4 tests fail together because they all depend on the same service.

### Asynchronous rendering

The element is in the DOM, but the framework hasn't finished hydration. The click handler isn't attached yet. Playwright's `click()` executes, but nothing happens. The test fails on the next assertion, not on the click, making the cause hard to pinpoint.

**How to recognize the cause**: failure frequency is an indicator. Timing problems fail 10-20% of runs. External dependencies fail in clusters. Shared state emerges when you change the number of workers. Rendering race conditions are the most insidious: they fail rarely (5-10%) and apparently randomly.

---

## Trace Viewer — the flaky test debugger

Playwright's Trace Viewer is the most effective tool for diagnosing flaky tests. A trace is a complete recording of everything that happens during test execution: screenshots for each action, network requests, console logs, DOM snapshots.

The key configuration is `trace: 'on-first-retry'`. With this setting, Playwright doesn't record the trace on the first execution (avoiding overhead when the test passes), but activates it automatically when the test fails and is retried. The result is a trace of the failure, ready for analysis.

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

When a test fails, the trace is saved in the `test-results/` folder. To open it:

```bash
npx playwright show-trace test-results/flaky-test-retry1/trace.zip
```

The Trace Viewer shows an interactive timeline. Each test action — `goto`, `click`, `waitFor`, `expect` — is a point on the timeline. Clicking a point shows the exact screenshot of the page at that moment, in-flight network requests, console logs, and DOM state.

The key point in analyzing a flaky test is comparison. When a test passes locally but fails in CI, the failure trace shows exactly what was different. For example: the test clicks the "Add to Cart" button, but the screenshot shows the loading spinner is still visible — the API hasn't responded yet. Locally, with abundant resources, the response arrived before the click. In CI, it didn't.

> For a deeper look at trace correlation with the backend via OpenTelemetry, refer to the [trace correlation article](/blog/verificare/testing/02-opentelemetry-trace-correlation/).

---

## Strategic retry vs. blind retry

Retry is a legitimate tool: it filters out false positives caused by transient CI infrastructure glitches. But there's a fundamental difference between using retry as a temporary safety net and using it as a permanent solution.

### Blind retry hides bugs

Configuring `retries: 2` and forgetting about it is the most common pattern. The test fails, gets retried, passes on the second attempt, the result is green. Nobody investigates. The problem is that this test has a real flakiness cause that can worsen over time. Today it fails 10% of the time, in a month 30%, and retry alone won't be enough.

### Disabling retry for critical tests

For tests covering the critical path — homepage, login, checkout — retry should be disabled. If the checkout test is flaky, you need to know immediately, not mask it.

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

### Reproducing flakiness locally

The `--repeat-each` flag runs each test N times in the same session. It's the best tool to reproduce a flaky test locally before fixing it:

```bash
# Run each test 10 times — if the test is 10% flaky, at least 1 run will fail
npx playwright test flaky-patterns --repeat-each=10
```

If the test passes 10 out of 10 times locally but fails in CI, the problem is almost certainly related to CI machine resources (CPU, memory, network). In that case, the fix is not a retry — it's an explicit `waitFor()`.

### failOnFlakyTests

Starting from Playwright v1.56, the `failOnFlakyTests` option in the configuration file changes retry behavior: a test that fails on the first attempt but passes on retry is still marked as failed. The test must pass on all attempts to be green.

```typescript
// playwright.config.ts
export default defineConfig({
  retries: 2,
  failOnFlakyTests: true,
});
```

This is the meeting point between pragmatism and rigor: retry captures the failure trace (thanks to `trace: 'on-first-retry'`), but the final result reflects the fact that the test is unstable.

---

## Anti-flaky patterns

This section contains five concrete patterns, each with the flaky code (to avoid) and the stable code (to follow). All code comes from the `flaky-patterns.spec.ts` file in the MockMart repository.

### Pattern 1: explicit waitFor instead of fixed timeouts

The most common flakiness pattern is `waitForTimeout()`. The test waits an arbitrary number of milliseconds hoping the operation will complete. If the environment is slow, the time isn't enough. If the environment is fast, the test wastes time waiting unnecessarily.

```typescript
// DON'T DO THIS — the fixed timeout is arbitrary
test.skip('FLAKY: uses fixed timeout', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2000); // Arbitrary: is 2s enough?
  const count = await page.locator('[data-testid="product-card"]').count();
  expect(count).toBeGreaterThan(0);
});
```

The stable version uses `waitFor()` on the locator. Playwright waits until the element exists in the DOM and is visible, with a configurable timeout. If the element appears in 100ms, the test moves on in 100ms. If the API is slow and the element appears after 5 seconds, the test waits 5 seconds. There's no arbitrary estimate.

```typescript
// STABLE — waits only as long as necessary
test('STABLE: waits for element', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="product-card"]').first().waitFor();
  const count = await page.locator('[data-testid="product-card"]').count();
  expect(count).toBeGreaterThan(0);
});
```

> **Practical rule**: if the test contains `waitForTimeout()` with a value greater than 0, there is almost certainly a better alternative. `waitForTimeout()` has a legitimate use only to simulate real user behavior (for example, a pause before typing), never to synchronize with asynchronous operations.

### Pattern 2: synchronize with actions, don't hope they work

A race condition occurs when the test performs an action on an element that exists in the DOM but isn't yet interactive. The element is visible, but the click handler hasn't been attached by the JavaScript framework yet.

```typescript
// DON'T DO THIS — immediate click without verifying UI is ready
test.skip('FLAKY: clicks without waiting for hydration', async ({ page }) => {
  await page.goto('/');
  // The product card might be in the DOM but the click handler not yet attached
  await page.locator('[data-testid="product-card"]').first().click();
  await page.locator('[data-testid="add-to-cart"]').click();
  // Might fail if the click had no effect
  await expect(page.locator('[data-testid="cart-item"]')).toBeVisible();
});
```

The stable version adds an explicit `waitFor()` before each interaction with a new element. After clicking, it verifies the expected result is visible before proceeding.

```typescript
// STABLE — every interaction is preceded by waitFor
test('STABLE: waits for element and verifies action result', async ({ page }) => {
  await page.goto('/');
  // waitFor ensures the element is attached and visible
  await page.locator('[data-testid="product-card"]').first().waitFor();
  await page.locator('[data-testid="product-card"]').first().click();

  // Wait for the add-to-cart button to be ready before clicking it
  await page.locator('[data-testid="add-to-cart"]').waitFor();
  await page.locator('[data-testid="add-to-cart"]').click();

  // Verify the action result
  await page.locator('[data-testid="cart-icon"]').click();
  await expect(page.locator('[data-testid="cart-item"]')).toBeVisible();
});
```

The principle: every UI state transition must be verified before proceeding. Don't assume a click worked — wait for the click's effect to be visible. For synchronizing with APIs, `waitForResponse()` is the complementary tool: it lets you wait for a specific HTTP request to complete before continuing with assertions. This pattern is covered in detail in the [introductory guide](/blog/verificare/testing/01-guida-completa-e2e/).

### Pattern 3: mock external dependencies

When the checkout test depends on the real payment service, the test result depends on the state of an external system. If the service is slow, the test fails with a timeout. If the service is down, the test fails with an unexpected error. Neither failure is a bug in the code under test.

```typescript
// DON'T DO THIS — depends on the real checkout service
test.skip('FLAKY: depends on real checkout service', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="product-card"]').first().click();
  await page.locator('[data-testid="add-to-cart"]').click();
  await page.locator('[data-testid="cart-icon"]').click();
  await page.locator('[data-testid="checkout-button"]').click();
  await page.locator('[data-testid="confirm-order"]').click();
  // Fails intermittently when the payment service is slow or down
  await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
});
```

The stable version uses the `mockApi` fixture to return a controlled response. The test verifies that the UI correctly handles a success response — it doesn't test the payment service.

```typescript
// STABLE — deterministic response from the mock
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

The `mockApi` fixture is covered in detail in the [reusable fixtures article](/blog/verificare/testing/05-network-mocking-avanzato/). The underlying principle is in the [network mocking article](/blog/verificare/testing/04-network-mocking/): `page.route()` intercepts requests at the browser level, allowing you to isolate the UI from any external service.

### Pattern 4: resilient selectors instead of DOM positions

A positional selector like `nth-child(3)` works until the element order changes. Just add a product to the database, change the sort order, or add a promotional banner before the list, and the selector points to the wrong element.

```typescript
// DON'T DO THIS — depends on DOM position
test.skip('FLAKY: relies on DOM position', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1000);
  // nth-child depends on the product order in the database
  const thirdProduct = page.locator('.product-grid > div:nth-child(3)');
  await expect(thirdProduct).toContainText('Keyboard');
});
```

The stable version combines `data-testid` to identify element type and `getByText()` to search for content. The layout can change, the order can change — the test continues to work because it looks for specific content, not a position.

```typescript
// STABLE — semantic selector + controlled data
test('STABLE: uses data-testid and text matching', async ({ page, mockApi }) => {
  await mockApi.products([
    fakeProduct({ id: 1, name: 'Laptop ProBook' }),
    fakeProduct({ id: 2, name: 'Wireless Mouse' }),
    fakeProduct({ id: 3, name: 'Mechanical Keyboard' }),
  ]);

  await page.goto('/');
  await page.locator('[data-testid="product-card"]').first().waitFor();

  // Search by content, not by position
  await expect(page.getByText('Mechanical Keyboard')).toBeVisible();
});
```

### Pattern 5: controlled data in the test, not in the database

The previous pattern also introduces the fifth point: data must be in the test, not in the database. If the test assumes "there are at least 3 products in the database", any change to the data — a different seed, a parallel test deleting records, a CI environment with an empty database — breaks it.

With `mockApi.products([...])` the data is declared in the test itself. No populated database needed, no seeds needed, no dependencies between tests. Each test creates its own context, independent of everything else.

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

This doesn't mean integration tests with a real database are useless — it means E2E tests of the UI shouldn't depend on database state. They are different levels of the testing pyramid, with different responsibilities.

---

## --only-changed and selective test execution

When debugging a flaky test, running the entire suite on every change is wasteful. The feedback loop goes from 30 seconds to 10 minutes, and productivity drops.

Playwright offers three flags to reduce the execution scope:

```bash
# Run only tests in files modified in the current commit (v1.56+)
npx playwright test --only-changed

# Re-run only tests that failed in the last run
npx playwright test --last-failed

# Filter by test name
npx playwright test --grep "checkout"
```

`--only-changed` is particularly useful in CI: if the commit only modifies the cart component, there's no need to re-run homepage or catalog tests. Combined with `--repeat-each`, it verifies that the flaky test fix is effective without running the entire suite:

```bash
# Fix applied: verify the test passes 20 times in a row
npx playwright test flaky-patterns --grep "checkout" --repeat-each=20
```

`--last-failed` is useful in the local debug session: run the complete suite, three tests fail, apply a fix, and re-run only those three.

---

## Diagnostic checklist

When a test fails intermittently, the first step is identifying the problem category. This table maps the most common symptoms to the probable cause and corrective action.

| Symptom | Probable cause | Action |
|---------|----------------|--------|
| Fails only in CI, never locally | Timing / limited resources | Add `waitFor()`, review the failure trace |
| Fails with `workers > 1`, passes with `workers=1` | Shared state between tests | Isolate tests, use mocks and fixtures for data |
| Fails in clusters (3-4 tests together) | External dependency down | Mock the service, check the health endpoint |
| Fails randomly, low frequency (5-10%) | Rendering race condition | Trace Viewer, `--repeat-each=20` to reproduce |
| Fails on specific browser | Browser-specific rendering or timing | Check selectors, add `waitFor()` |
| Fails after frontend deploy | Broken selector | Check `data-testid`, update the locators |

The diagnostic flow is:

1. **Reproduce**: `--repeat-each=20` locally. If it doesn't reproduce, the problem is environmental (CI resources, network).
2. **Capture**: `trace: 'on-first-retry'` to have the failure recording.
3. **Analyze**: open the trace, compare the screenshot at the moment of failure with the previous action. Look for: still-visible spinners (timing), unexpected data (shared state), network errors (external dependency).
4. **Fix**: apply the corresponding pattern from the previous section.
5. **Verify**: `--repeat-each=20 --grep "test-name"` to confirm the fix holds.

---

## Summary

Four causes: timing, shared state, external dependencies, asynchronous rendering. Five patterns: explicit `waitFor()`, synchronization with actions, mocking dependencies, resilient selectors, controlled data. One central tool: the Trace Viewer.

The underlying principle: a flaky test is a bug in the test, not in the product. Retry is not a solution — it's a bandage that hides the problem and lets it worsen. Every flaky test deserves investigation: identify the cause, apply the correct pattern, verify with `--repeat-each` that the fix holds. A stable suite is not a luxury: it's the only way to trust the results.

### The complete series

1. [Complete E2E Guide with Playwright](/blog/verificare/testing/01-guida-completa-e2e/) — setup, first tests, best practices
2. [Trace Correlation with OpenTelemetry](/blog/verificare/testing/02-opentelemetry-trace-correlation/) — connecting E2E tests and backend traces
3. [CI/CD: retry, sharding, and parallelism](/blog/verificare/testing/03-cicd-strategie-avanzate/) — scalable pipeline execution
4. [Network mocking with page.route()](/blog/verificare/testing/04-network-mocking/) — isolating the UI from services
5. [Advanced network mocking: fixtures and HAR](/blog/verificare/testing/05-network-mocking-avanzato/) — reusable mocking patterns
6. [Visual regression testing](/blog/verificare/testing/06-visual-regression/) — catching visual bugs with screenshots
7. Diagnosing and fixing flaky tests — this article

The complete code is in the [MockMart](https://github.com/monte97/MockMart) repository, in the `tests/e2e/tests/` directory.
