---
title: "Playwright: Visual Regression Testing to Catch Invisible Bugs"
seoTitle: "Playwright: visual regression testing"
date: 2026-03-04T09:00:00.000Z
description: "How to use toHaveScreenshot() to catch visual bugs that functional tests miss: masking, mocked states, cross-browser testing, and CI configuration"
pillar: verificare
category: testing
tags:
  - Playwright
  - Testing
  - E2E
  - Visual Testing
  - Screenshot
  - TypeScript
lang: en
reviewed: machine
series: playwright
seriesOrder: 60
---

The functional test passes: the button exists, the text is correct, the redirect works. But the layout is broken. A CSS override moved the button off-screen, a wrong `z-index` hides the error message beneath another element, an unloaded font makes the text unreadable. Functional tests don't see these problems — they verify DOM structure, not rendering. A `toBeVisible()` check verifies that the element doesn't have `display: none`, not that it's actually readable on screen.

Visual regression testing closes this gap: it captures screenshots of the page and compares them against an approved baseline. If something changes visually — a margin, a color, an alignment — the test fails with a diff image that highlights pixel-by-pixel differences. It doesn't replace functional tests: it complements them, covering a category of bugs that no DOM assertion can catch.

This article covers five visual testing patterns with Playwright, from basic comparison to cross-browser CI configuration. The code uses [MockMart](https://github.com/monte97/MockMart), the same environment from the previous articles on [network mocking](/blog/verificare/testing/04-network-mocking/) and [reusable fixtures](/blog/verificare/testing/05-network-mocking-avanzato/). For the initial setup and Playwright configuration, refer to the [introductory guide](/blog/verificare/testing/01-guida-completa-e2e/).

---

## toHaveScreenshot() in 30 seconds

Playwright includes visual testing natively, without external libraries. The basic pattern is a single line:

```typescript
test('should match homepage baseline', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="product-card"]').first().waitFor();

  await expect(page).toHaveScreenshot('homepage.png');
});
```

On the **first run** the test has no baseline to compare against. Playwright automatically generates the screenshot and saves it in the `__snapshots__` folder next to the test file. The test fails with a message indicating that the baseline was created and that the test needs to be re-run for comparison.

On the **second run** Playwright captures a new screenshot and compares it pixel-by-pixel against the saved baseline. If the two images are identical, the test passes. If there are differences, the test fails and generates three files in the `test-results/` folder: the current screenshot, the expected baseline, and a diff image highlighting the different pixels.

To capture the entire scrollable page, not just the visible viewport:

```typescript
test('should match full page screenshot', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="product-card"]').first().waitFor();

  await expect(page).toHaveScreenshot('homepage-full.png', {
    fullPage: true,
  });
});
```

When the design changes intentionally — a restyling, a new component, a color update — the baselines need updating:

```bash
npx playwright test --update-snapshots
```

This command re-runs all tests and replaces the baselines with new screenshots. Updated baselines should be committed to the repository: they are the visual approval of the application's current state.

> **Mind the waitFor()**: the screenshot is captured at the moment `toHaveScreenshot()` is called. If the page is still loading data or rendering components, the screenshot will capture an intermediate state. Always use `waitFor()` or a Playwright assertion (which has auto-waiting) before capturing the screenshot.

---

## Masking dynamic elements

The first practical obstacle: elements that change with every execution. A timestamp shows the current time, a session ID is different for each visit, a counter shows varying values. These elements generate diffs on every run, even if the layout is identical. They are false positives — the test fails for an irrelevant reason.

The solution is the `mask` parameter: an array of locators that Playwright covers with a colored block before capturing the screenshot.

```typescript
test('should mask timestamps and session IDs in cart', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="product-card"]').first().click();
  await page.locator('[data-testid="add-to-cart"]').click();

  await page.locator('[data-testid="cart-icon"]').click();
  await page.locator('[data-testid="cart-item"]').first().waitFor();

  await expect(page).toHaveScreenshot('cart-with-items.png', {
    mask: [
      page.locator('[data-testid="timestamp"]'),
      page.locator('[data-testid="cart-id"]'),
    ],
  });
});
```

The area covered by the locators is replaced with a pink rectangle in both the baseline and the current screenshot. The comparison ignores those zones, eliminating false positives from dynamic content.

Another common problem is CSS animations: transitions, fade-ins, spinners. If the screenshot is captured during an animation, the exact frame varies between executions. The `animations` parameter disables them:

```typescript
test('should disable animations for consistent screenshots', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="product-card"]').first().waitFor();

  await expect(page).toHaveScreenshot('homepage-no-animations.png', {
    animations: 'disabled',
  });
});
```

With `animations: 'disabled'`, Playwright forces all CSS animations to their final frame before capturing the screenshot. Transitions, keyframes, `transition-duration` — everything completes instantaneously.

> **Masking too much defeats the test**. If you mask 10 elements on a page with 12, you're only testing the background and the navbar. The rule: mask only what is genuinely dynamic and uncontrollable (timestamps, session IDs, real-time counters). If a value changes because the data changes, the solution is to mock the data, not mask the rendering.

---

## Screenshots of specific states

This is where visual testing becomes powerful: combining it with network mocking from articles [04](/blog/verificare/testing/04-network-mocking/) and [05](/blog/verificare/testing/05-network-mocking-avanzato/). The `MockApi` fixture lets you force the application into any state — error, empty, loading — and capture a screenshot of that exact state.

### Error state

```typescript
test('should capture error state', async ({ page, mockApi }) => {
  await mockApi.productsError(500);
  await page.goto('/');

  await page.getByText(/error/i).waitFor();

  await expect(page).toHaveScreenshot('error-state.png');
});
```

The test forces a 500 error, waits for the error UI to appear, and captures the screenshot. The baseline becomes the approved visual representation of the error state. If someone modifies the error component — changes the color, moves the icon, removes the message — the visual test catches it.

### Empty state

```typescript
test('should capture empty product list', async ({ page, mockApi }) => {
  await mockApi.emptyProducts();
  await page.goto('/');

  await page.getByText(/no products/i).waitFor();

  await expect(page).toHaveScreenshot('empty-state.png');
});
```

The empty state is often neglected in design. A functional test verifies that the "No products" message exists in the DOM. A visual test verifies that it's centered, readable, with the right padding and no overlapping elements.

### Loading state

```typescript
test('should capture loading state with delayed response', async ({ page, mockApi }) => {
  await mockApi.delay('**/api/products', 3000);
  await page.goto('/');

  await page.getByText(/loading/i).waitFor();

  await expect(page).toHaveScreenshot('loading-state.png');
});
```

The 3-second delay creates the time window to capture the spinner or skeleton in action. Without the delay mock, the API responds in milliseconds and the loading state is never visible long enough for a screenshot.

### Layout with controlled data

```typescript
test('should capture custom product layout', async ({ page, mockApi }) => {
  await mockApi.products([
    fakeProduct({ id: 1, name: 'Visual Test Product A', price: 9.99 }),
    fakeProduct({ id: 2, name: 'Visual Test Product B', price: 19.99 }),
  ]);
  await page.goto('/');
  await page.locator('[data-testid="product-card"]').first().waitFor();

  await expect(page).toHaveScreenshot('custom-products.png');
});
```

Mocking the data makes the baseline deterministic: same products, same names, same prices on every run. Without mocking, backend data can change (new products, updated prices, different images) and generate diffs that have nothing to do with the code.

This pattern makes every application state testable. Not just the happy path with 10 products — but also the error, the empty state, the loading state, a single product, 100 products. Each mock combination produces an independent visual baseline.

---

## Component screenshots

So far, screenshots capture the entire page. But often a visual test concerns a single component: a product card, a cart item, a widget. Playwright supports element-level screenshots with the same API:

```typescript
test('should match single product card', async ({ page, mockApi }) => {
  await mockApi.products([
    fakeProduct({ id: 1, name: 'Screenshot Card', price: 42.00 }),
  ]);
  await page.goto('/');
  await page.locator('[data-testid="product-card"]').first().waitFor();

  const card = page.locator('[data-testid="product-card"]').first();
  await expect(card).toHaveScreenshot('product-card.png');
});
```

The key difference: `expect(card)` instead of `expect(page)`. Playwright captures only the locator's bounding box, not the entire viewport. The result is a smaller screenshot focused on the component.

The same pattern for a cart item, combining component screenshot and masking:

```typescript
test('should match cart item component', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="product-card"]').first().click();
  await page.locator('[data-testid="add-to-cart"]').click();

  await page.locator('[data-testid="cart-icon"]').click();
  await page.locator('[data-testid="cart-item"]').first().waitFor();

  const cartItem = page.locator('[data-testid="cart-item"]').first();
  await expect(cartItem).toHaveScreenshot('cart-item.png', {
    mask: [page.locator('[data-testid="timestamp"]')],
  });
});
```

The advantages of component screenshots over full-page screenshots:

- **Stability**: less area captured means less chance of irrelevant diffs. A change in the navbar doesn't break the product card test.
- **Readability**: diffs are easier to interpret. A diff on a 300x200 card is immediately understandable. A diff on a 1920x5000 page requires zooming and analysis.
- **Review speed**: when a test fails, you instantly know what changed by looking at the component's diff image.
- **Design systems**: for teams maintaining a component library, component screenshots function as visual regression tests for the design system.

The trade-off: you need more tests to cover the entire page. But in practice, component screenshots cover 90% of use cases with a fraction of the fragility.

---

## Cross-browser visual testing

CSS rendering is not identical across browser engines. A `flexbox` with `gap` can have a pixel of difference between Chromium and Firefox. A `border-radius` can be anti-aliased differently in WebKit. A font can have slightly different metrics.

Playwright handles this by generating **separate baselines for each project**. In `playwright.config.ts`, each project produces its own screenshots in the `__snapshots__` folder, organized by project name:

```typescript
// playwright.config.ts — projects section
projects: [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
  {
    name: 'firefox',
    use: { ...devices['Desktop Firefox'] },
  },
  {
    name: 'webkit',
    use: { ...devices['Desktop Safari'] },
  },
],
```

With this configuration, the test `toHaveScreenshot('homepage.png')` produces three separate baselines: one for Chromium, one for Firefox, one for WebKit. Each browser is compared only against its own baseline, eliminating false positives from rendering differences between engines.

**When it's needed**: public-facing applications where users use different browsers. Rendering differences in `grid`, `flexbox`, font fallbacks, `backdrop-filter` can create significant visual bugs on one browser but not others.

**When it's overkill**: internal applications where the target browser is known (e.g., corporate Chrome). In this case, a single Chromium project is sufficient and halves execution time and baseline maintenance.

> The cost of cross-browser visual testing is linear: 3 browsers = 3x baselines to maintain, 3x execution time, 3x screenshots to review when a test fails. Evaluate whether the benefit justifies the cost for your use case.

---

## Visual testing in CI

The most common problem with visual testing in CI: baselines generated on the development machine don't match those generated in the CI runner. The same font renders differently between macOS and Linux. Anti-aliasing varies between graphics cards. The default resolution can differ. The result: tests that pass locally and fail in CI, or vice versa.

The solution is simple in principle: **generate baselines in the same environment where tests are executed**. In practice, this means using the official Playwright Docker container:

```yaml
# .github/workflows/visual-tests.yml
jobs:
  visual-test:
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v1.50.0-noble
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright test --grep @visual
```

To update baselines in CI, a dedicated job regenerates and commits them:

```yaml
  update-baselines:
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v1.50.0-noble
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright test --grep @visual --update-snapshots
      - uses: actions/upload-artifact@v4
        with:
          name: updated-baselines
          path: tests/e2e/tests/**/__snapshots__/**
```

Updated baselines are uploaded as an artifact. A team member reviews them and commits to the repository if the differences are intentional.

When a visual test fails in CI, diff images are critical for debugging. Configuring results as workflow artifacts makes diffs accessible directly from the PR:

```yaml
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: visual-diffs
          path: test-results/
          retention-days: 7
```

The `test-results/` folder contains, for each failing test, three files: `*-actual.png` (the captured screenshot), `*-expected.png` (the baseline), and `*-diff.png` (highlighted differences). PR reviewers can download the artifact and immediately understand what changed.

> **Never commit baselines generated on your laptop**. Even if the test passes locally, a macOS baseline won't match a Linux one and will generate false positives in CI. The correct workflow: write the test locally, push without baselines, let the CI job generate the baselines, download and commit them.

---

## Limitations and trade-offs

Visual testing is not suited to all contexts. Like every testing tool, it has a maintenance cost that must be balanced against the value it provides.

| Limitation | Mitigation |
|------------|------------|
| Different font rendering across OS | Docker for consistent baselines |
| Flakiness from anti-aliasing | `threshold: 0.3`, `maxDiffPixelRatio: 0.01` |
| Baseline maintenance cost | Update only when design changes |
| Fragile screenshots (change with every UI modification) | Prefer component-level over full-page |
| Not suited for: APIs, backend, early stage | Introduce when design stabilizes |

The `threshold` and `maxDiffPixelRatio` parameters are the main lever against flakiness:

```typescript
test('should pass with relaxed threshold', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="product-card"]').first().waitFor();

  await expect(page).toHaveScreenshot('homepage-tolerant.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.3,
  });
});
```

- **`threshold`** (0-1): sensitivity per pixel. A value of 0.3 tolerates minor color variations due to anti-aliasing. The default is 0.2.
- **`maxDiffPixelRatio`** (0-1): maximum percentage of different pixels across the entire image. 0.01 means 1% of pixels can differ without failing the test.

For scenarios requiring absolute precision — a design system, a pixel-perfect component — the parameters can be tightened:

```typescript
test('should compare with strict settings', async ({ page, mockApi }) => {
  await mockApi.products([
    fakeProduct({ id: 1, name: 'Pixel Perfect', price: 100 }),
  ]);
  await page.goto('/');
  await page.locator('[data-testid="product-card"]').first().waitFor();

  await expect(page).toHaveScreenshot('pixel-perfect.png', {
    maxDiffPixelRatio: 0,
    threshold: 0.1,
    animations: 'disabled',
  });
});
```

Here `maxDiffPixelRatio: 0` tolerates zero different pixels. It's useful with mocked data and disabled animations, where every variation is a real bug.

The guiding principle: visual testing adds value when the design is stable. During prototyping, every commit modifies the layout and every modification generates diffs. The result is noise: the team starts ignoring visual failures, or worse, updates baselines mechanically without reviewing them. Introduce visual testing when the interface has reached sufficient maturity to justify protection against regressions.

---

## Summary

Five visual regression testing patterns with Playwright:

1. **Base screenshot** — `toHaveScreenshot('name.png')` to capture and compare the page against an approved baseline. `fullPage: true` for the entire scrollable page.
2. **Masking** — `mask` to cover dynamic elements (timestamps, session IDs) that generate false positives. `animations: 'disabled'` to eliminate CSS animation variability.
3. **Mocked states** — combine `MockApi` with `toHaveScreenshot()` to capture baselines of every application state: error, empty, loading, controlled data.
4. **Component screenshots** — `expect(locator).toHaveScreenshot()` to test individual elements. More stable, more readable, easier to maintain.
5. **Configuration** — `threshold` and `maxDiffPixelRatio` to balance sensitivity and stability. Strict parameters for design systems, relaxed for complex pages.

Visual testing doesn't replace functional tests — it covers a different gap. Functional tests verify that the button exists and works. Visual tests verify that it's visible, aligned, and not covered by another element. Together, they cover both logic and rendering.

Articles in the Playwright series:

- [01 - Complete E2E Guide](/blog/verificare/testing/01-guida-completa-e2e/)
- [02 - OpenTelemetry Trace Correlation](/blog/verificare/testing/02-opentelemetry-trace-correlation/)
- [03 - Advanced CI/CD Strategies](/blog/verificare/testing/03-cicd-strategie-avanzate/)
- [04 - Network Mocking](/blog/verificare/testing/04-network-mocking/)
- [05 - Mock Fixtures, HAR Replay, and Composition](/blog/verificare/testing/05-network-mocking-avanzato/)
- 06 - Visual Regression Testing (this article)

The complete code is in the [MockMart](https://github.com/monte97/MockMart) repository. With deterministic mocks, dynamic element masking, and CI-generated baselines, visual testing becomes a reliable safety net for your application's design.
