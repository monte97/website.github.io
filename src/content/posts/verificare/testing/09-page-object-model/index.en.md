---
title: "Playwright: Page Object Model for Maintainable Tests"
date: 2026-03-05T09:00:00.000Z
description: "How to organize E2E tests with the Page Object Model: reusable classes, Playwright fixtures, composition with mocks, and refactoring guidance"
pillar: automatizzare
category: testing
tags:
  - Playwright
  - Testing
  - E2E
  - Page Object Model
  - TypeScript
  - Architecture
lang: en
reviewed: machine
series: playwright
seriesOrder: 90
---

The suite works. Eight articles of tests, ten spec files, coverage across checkout, authentication, visual regression, network mocking. Tests pass, CI is green, the team trusts the suite. But open any file and you'll find this:

```typescript
await page.locator('[data-testid="checkout-button"]').click();
```

The same selector appears in five different files. `[data-testid="first-name"]` in three. `[data-testid="add-to-cart-${id}"]` in four. Every time the frontend renames a `data-testid`, you need N updates across N files. It's not a problem today — it's a problem that grows linearly with the suite.

The Page Object Model solves this by centralizing selectors and user actions in reusable classes. It's not a new pattern, not a Playwright invention — it's the standard way to scale an E2E suite beyond a single file. Martin Fowler described it in 2013, Selenium adopted it as a best practice, and Playwright supports it natively through the fixture system.

This article uses [MockMart](https://github.com/monte97/MockMart), the same environment from the entire [Playwright series](/blog/verificare/testing/01-guida-completa-e2e/). The complete code is in the [repository](https://github.com/monte97/MockMart), in the `tests/e2e/` directory.

---

## The problem: scattered selectors

Open five spec files from the MockMart suite and count selector occurrences. The result is predictable:

| Selector | Files it appears in | Total occurrences |
|----------|--------------------|--------------------|
| `[data-testid="checkout-button"]` | 5 | 8 |
| `[data-testid="first-name"]` | 3 | 5 |
| `[data-testid="add-to-cart-${id}"]` | 4 | 7 |
| `[data-testid="cart-total"]` | 3 | 4 |
| `[data-testid="place-order-button"]` | 4 | 6 |
| `[data-testid="order-number"]` | 3 | 5 |

The cost is direct: if the frontend team renames `checkout-button` to `proceed-to-checkout`, you need 8 updates across 5 files. Miss one file and the test fails. If the rename happens in a different PR from whoever maintains the tests, the problem only surfaces in CI.

But the subtler cost is in readability. A test containing `page.locator('[data-testid="payment-credit-card"]').click()` talks about DOM attributes. A test containing `checkoutPage.selectCreditCard()` talks about user actions. The first is an implementation detail, the second is an intent. When a test fails, the second is understood in a second — the first requires mentally reconstructing what that selector does.

The selector is an implementation detail. The test should speak about user actions, not DOM attributes.

---

## Page Object in 30 seconds

The pattern is simple: one class per page, locators as properties, user actions as methods. The test sees no selectors.

**Before — inline selectors:**

```typescript
test('should add product and proceed to checkout', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="add-to-cart-1"]').click();
  await page.goto('/cart');
  await page.locator('[data-testid="checkout-button"]').click();
  await page.locator('[data-testid="first-name"]').fill('Mario');
  await page.locator('[data-testid="last-name"]').fill('Rossi');
  // ... 6 more fields ...
  await page.locator('[data-testid="place-order-button"]').click();
});
```

**After — Page Object:**

```typescript
test('should add product and proceed to checkout', async ({ page }) => {
  const home = new HomePage(page);
  const cart = new CartPage(page);
  const checkout = new CheckoutPage(page);

  await home.goto();
  await home.addToCart(1);
  await cart.goto();
  await cart.proceedToCheckout();
  await checkout.fillShipping({ firstName: 'Mario', lastName: 'Rossi', /* ... */ });
  await checkout.placeOrder();
});
```

The test reads as a sequence of user actions: go to home, add to cart, go to cart, proceed to checkout, fill in, place order. Selectors are hidden inside the classes. If the frontend changes a `data-testid`, you update the class — not the tests.

One important rule: **the Page Object does not make assertions**. It exposes locators and methods, but doesn't decide what to verify. It's the test that calls `expect()`. This keeps the classes reusable — the same class works for a test verifying the cart total and one verifying the number of products. If the Page Object contained assertions, it would become specific to a single scenario and lose the centralization advantage.

---

## Page Objects for MockMart

MockMart has three main pages in the purchase flow: the homepage with the product catalog, the cart, and the checkout. Each page becomes a class.

### HomePage

The homepage manages the catalog: search, filters, and the add-to-cart action.

```typescript
import { type Page, type Locator } from '@playwright/test';

export class HomePage {
  // -- Locators --
  readonly searchInput: Locator;
  readonly categoryFilter: Locator;
  readonly sortFilter: Locator;

  constructor(private page: Page) {
    this.searchInput = page.locator('[data-testid="search-input"]');
    this.categoryFilter = page.locator('[data-testid="category-filter"]');
    this.sortFilter = page.locator('[data-testid="sort-filter"]');
  }

  // -- Navigation --

  async goto() {
    await this.page.goto('/');
  }

  // -- Product Actions --

  productCard(id: number) {
    return this.page.locator(`[data-testid="product-${id}"]`);
  }

  /** Get all visible product cards (use .count() or .nth()). */
  get productCards() {
    return this.page.locator('[class="product-card"]');
  }

  addToCartButton(id: number) {
    return this.page.locator(`[data-testid="add-to-cart-${id}"]`);
  }

  async addToCart(productId: number) {
    await this.addToCartButton(productId).click();
  }

  // -- Search & Filters --

  async search(query: string) {
    await this.searchInput.fill(query);
  }

  async filterByCategory(category: string) {
    await this.categoryFilter.selectOption(category);
  }

  async sortBy(option: string) {
    await this.sortFilter.selectOption(option);
  }
}
```

Static locators (`searchInput`, `categoryFilter`) are `readonly` properties initialized in the constructor. Dynamic locators (`productCard(id)`, `addToCartButton(id)`) are methods that accept parameters. This distinction is intentional: static locators resolve once, dynamic ones depend on context.

### CartPage

The cart manages quantities, removal, and navigation to checkout.

```typescript
import { type Page, type Locator } from '@playwright/test';

export class CartPage {
  // -- Locators --
  readonly subtotal: Locator;
  readonly total: Locator;
  readonly checkoutButton: Locator;

  constructor(private page: Page) {
    this.subtotal = page.locator('[data-testid="cart-subtotal"]');
    this.total = page.locator('[data-testid="cart-total"]');
    this.checkoutButton = page.locator('[data-testid="checkout-button"]');
  }

  // -- Navigation --

  async goto() {
    await this.page.goto('/cart');
  }

  // -- Cart Item Actions --

  cartItem(productId: number) {
    return this.page.locator(`[data-testid="cart-item-${productId}"]`);
  }

  quantity(productId: number) {
    return this.page.locator(`[data-testid="quantity-${productId}"]`);
  }

  async increase(productId: number) {
    await this.page.locator(`[data-testid="increase-${productId}"]`).click();
  }

  async decrease(productId: number) {
    await this.page.locator(`[data-testid="decrease-${productId}"]`).click();
  }

  async remove(productId: number) {
    await this.page.locator(`[data-testid="remove-${productId}"]`).click();
  }

  // -- Checkout --

  async proceedToCheckout() {
    await this.checkoutButton.click();
  }
}
```

`proceedToCheckout()` is a method wrapping a single click. It might seem excessive, but the value is in test readability: `cartPage.proceedToCheckout()` communicates intent, `page.locator('[data-testid="checkout-button"]').click()` communicates implementation.

### CheckoutPage

The checkout is the most complex page: a shipping form with six fields, payment method selection, and order confirmation.

```typescript
import { type Page, type Locator } from '@playwright/test';

interface ShippingInfo {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  zipCode: string;
  phone: string;
}

export class CheckoutPage {
  // -- Locators --
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly address: Locator;
  readonly city: Locator;
  readonly zipCode: Locator;
  readonly phone: Locator;
  readonly orderTotal: Locator;
  readonly placeOrderButton: Locator;
  readonly orderNumber: Locator;

  constructor(private page: Page) {
    this.firstName = page.locator('[data-testid="first-name"]');
    this.lastName = page.locator('[data-testid="last-name"]');
    this.address = page.locator('[data-testid="address"]');
    this.city = page.locator('[data-testid="city"]');
    this.zipCode = page.locator('[data-testid="zip-code"]');
    this.phone = page.locator('[data-testid="phone"]');
    this.orderTotal = page.locator('[data-testid="order-total"]');
    this.placeOrderButton = page.locator('[data-testid="place-order-button"]');
    this.orderNumber = page.locator('[data-testid="order-number"]');
  }

  // -- Navigation --

  async goto() {
    await this.page.goto('/checkout');
  }

  // -- Shipping Form --

  async fillShipping(info: ShippingInfo) {
    await this.firstName.fill(info.firstName);
    await this.lastName.fill(info.lastName);
    await this.address.fill(info.address);
    await this.city.fill(info.city);
    await this.zipCode.fill(info.zipCode);
    await this.phone.fill(info.phone);
  }

  // -- Payment --

  async selectCreditCard() {
    await this.page.locator('[data-testid="payment-credit-card"]').click();
  }

  async selectPayPal() {
    await this.page.locator('[data-testid="payment-paypal"]').click();
  }

  async selectBankTransfer() {
    await this.page.locator('[data-testid="payment-bank-transfer"]').click();
  }

  // -- Order --

  async placeOrder() {
    await this.placeOrderButton.click();
  }

  /** Complete checkout with default shipping data and credit card. */
  async completeWithDefaults() {
    await this.fillShipping({
      firstName: 'Mario',
      lastName: 'Rossi',
      address: '123 Main Street',
      city: 'New York',
      zipCode: '10001',
      phone: '+1 212 555 0100',
    });
    await this.selectCreditCard();
    await this.placeOrder();
  }
}
```

`completeWithDefaults()` is a helper method that fills the form with standard test data and selects credit card. Without this method, every test reaching checkout must repeat the same 8 lines of form filling. With the method, one line. It's not a mandatory pattern — if every test needs different data, `fillShipping()` is sufficient. But for tests where the checkout form is an intermediate step rather than the subject of verification, `completeWithDefaults()` eliminates noise.

The `ShippingInfo` interface types the form data. If the frontend adds a field (email, state), the TypeScript compiler flags all tests that don't pass the new field. The error surfaces at compile time, not at runtime.

---

## POM fixture

Page Objects work, but every test must create instances manually:

```typescript
const home = new HomePage(page);
const cart = new CartPage(page);
const checkout = new CheckoutPage(page);
```

Three identical lines in every file. Playwright's fixture system solves this: define Page Objects as fixtures, and the test receives them as parameters.

```typescript
import { test as base } from '@playwright/test';
import { HomePage } from '../pages/home.page';
import { CartPage } from '../pages/cart.page';
import { CheckoutPage } from '../pages/checkout.page';

export const test = base.extend<{
  homePage: HomePage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
}>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
});

export { expect } from '@playwright/test';
```

`base.extend()` creates a new test object with additional fixtures. Each fixture receives `page` (Playwright's built-in fixture) and calls `use()` with the Page Object instance. A test that imports this `test` receives `homePage`, `cartPage`, and `checkoutPage` ready to use.

The advantage isn't just aesthetic. Fixtures are lazy: if a test only uses `homePage`, Playwright won't create `cartPage` and `checkoutPage`. And the lifecycle is managed: after `use()`, you can add cleanup logic (for example, emptying the cart after each test). A single creation point for all instances, no `new HomePage(page)` scattered across files.

---

## Refactoring: from inline to POM

The Page Object's value emerges in the direct comparison. Here is the MockMart checkout flow before and after refactoring.

**Before — inline selectors:**

```typescript
test('complete purchase flow', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="add-to-cart-1"]').click();

  await page.goto('/cart');
  await expect(page.locator('[data-testid="cart-total"]')).toBeVisible();
  await page.locator('[data-testid="checkout-button"]').click();

  await page.locator('[data-testid="first-name"]').fill('Mario');
  await page.locator('[data-testid="last-name"]').fill('Rossi');
  await page.locator('[data-testid="address"]').fill('Via Roma 1');
  await page.locator('[data-testid="city"]').fill('Bologna');
  await page.locator('[data-testid="zip-code"]').fill('40100');
  await page.locator('[data-testid="phone"]').fill('+39 051 1234567');
  await page.locator('[data-testid="payment-credit-card"]').click();
  await page.locator('[data-testid="place-order-button"]').click();

  await expect(page.locator('[data-testid="order-number"]')).toBeVisible();
});
```

Fifteen lines of `page.locator(...)`. The test works, but understanding what it does requires reading every selector and mentally reconstructing the flow. Selectors dominate, intentions are implicit.

**After — Page Object with fixture:**

```typescript
test('complete purchase: home -> cart -> checkout -> confirmation', async ({
  homePage,
  cartPage,
  checkoutPage,
}) => {
  // Browse and add to cart
  await homePage.goto();
  await homePage.addToCart(1);

  // Cart review
  await cartPage.goto();
  await expect(cartPage.total).toBeVisible();
  await cartPage.proceedToCheckout();

  // Checkout and order
  await checkoutPage.completeWithDefaults();
  await expect(checkoutPage.orderNumber).toBeVisible({ timeout: 10_000 });
});
```

Five lines of logic. The test reads as a user scenario: go to home, add product 1 to cart, go to cart, verify the total, proceed to checkout, complete with default data, verify the order number. No visible selectors, no implementation details. If the frontend renames `checkout-button` to `proceed-to-checkout`, this test doesn't change — `CartPage` changes.

The reduction isn't just cosmetic. Every `page.locator(...)` inline is a coupling point between test and DOM. Every `cartPage.proceedToCheckout()` is a coupling point between test and Page Object. The second is a layer of indirection, but it's a layer that absorbs frontend changes. When the UI changes, you update the class — and all tests using it continue to work.

---

## POM + mockApi composition

Page Objects handle the UI. Mock fixtures handle the APIs. In real scenarios you need both: navigate with Page Objects and control backend responses with mocks. Playwright supports fixture composition from different modules with `mergeTests`.

```typescript
import { mergeTests } from '@playwright/test';
import { test as pomTest, expect } from '../fixtures/pages';
import { test as mockTest, fakeProduct } from '../fixtures/mock-api';

const test = mergeTests(pomTest, mockTest);
```

`mergeTests(pomTest, mockTest)` creates a new test object that includes both POM fixtures (`homePage`, `cartPage`, `checkoutPage`) and the mock fixture (`mockApi`). The test has access to both worlds. This is the same pattern from [article 05](/blog/verificare/testing/05-network-mocking-avanzato/) and [article 08](/blog/verificare/testing/08-authentication-testing/) for combining authentication and mocks.

### Checkout with mocked products

```typescript
test.describe('POM + MockApi', () => {
  test('checkout with mocked products and payment', async ({
    homePage,
    cartPage,
    checkoutPage,
    mockApi,
  }) => {
    // Mock: custom products + successful checkout
    await mockApi.products([
      fakeProduct({ id: 1, name: 'POM Widget', price: 49.99 }),
    ]);
    await mockApi.checkoutSuccess(42);

    // Navigate and add product
    await homePage.goto();
    await homePage.addToCart(1);

    // Cart and checkout
    await cartPage.goto();
    await cartPage.proceedToCheckout();
    await checkoutPage.completeWithDefaults();

    // Order confirmation
    await expect(checkoutPage.orderNumber).toBeVisible({ timeout: 10_000 });
  });
```

The test controls what the backend shows (`mockApi.products()`, `mockApi.checkoutSuccess()`) and how the user interacts with the UI (`homePage.addToCart()`, `checkoutPage.completeWithDefaults()`). Two levels of control, two levels of abstraction, zero selectors in the test.

### Checkout with payment error

```typescript
  test('checkout with mocked payment error', async ({
    homePage,
    cartPage,
    checkoutPage,
    mockApi,
    page,
  }) => {
    await mockApi.products([
      fakeProduct({ id: 1, name: 'Error Widget', price: 99.99 }),
    ]);
    await mockApi.checkoutError(402);

    await homePage.goto();
    await homePage.addToCart(1);

    await cartPage.goto();
    await cartPage.proceedToCheckout();
    await checkoutPage.completeWithDefaults();

    // Payment declined
    await expect(page.getByText(/declined/i)).toBeVisible();
    await expect(checkoutPage.orderNumber).not.toBeVisible();
  });
});
```

The only line using `page` directly is the assertion on the error message (`page.getByText()`). This is intentional: the error message is generic text without a dedicated `data-testid` and is not a user action — it's a result to verify. Using `page.getByText()` for assertions on generic text is acceptable; the Page Object is for repeated actions and structural selectors.

---

## When NOT to use POM

The Page Object Model is not always the right choice. Like every pattern, it has a cost: an extra class, a level of indirection, initial setup time. In certain contexts the cost exceeds the benefit.

| Scenario | POM? | Reason |
|----------|------|--------|
| Selector used in only 1 test | No | Inline is simpler, no centralization benefit |
| Flow repeated in 3+ tests | Yes | Maintenance cost grows linearly without POM |
| Exploratory test / spike | No | POM adds overhead on code that might not survive |
| Suite with 20+ tests | Yes | Maintenance without POM becomes unsustainable |
| Page with 1-2 interactions | No | The Page Object would have more boilerplate than logic |
| Complex form used everywhere | Yes | `fillShipping()` is more readable than 6 lines of fill() |

The practical rule: if you're copying the same selector into a third file, it's time to extract a Page Object. If you're writing a single test on a page you don't touch elsewhere, inline selectors are perfectly fine.

A common anti-pattern is creating Page Objects for every page on day zero. This produces classes no test uses, methods no one calls, and maintenance on dead code. The Page Object emerges from refactoring — first write tests with inline selectors, then extract classes when duplication becomes obvious. The pattern is born from necessity, not from planning.

---

## Summary

The Page Object Model doesn't add capability to tests — it adds structure. Tests work the same way, verify the same things, cover the same scenarios. The difference is in maintenance: a frontend change propagates to one place instead of N files.

The key concepts from this article:

1. **Page Object** — one class per page with locators as properties and user actions as methods. The test sees no selectors.
2. **POM fixture** — `test.extend()` to provide Page Objects as test parameters. Lazy creation, a single instantiation point.
3. **Composition** — `mergeTests()` to combine POM and mock fixtures in the same test. Navigation with Page Objects, responses with mocks.
4. **Practical rule** — the Page Object makes no assertions, isn't for every page, and emerges from refactoring when duplication becomes apparent.

### The complete series

1. [Complete E2E Guide with Playwright](/blog/verificare/testing/01-guida-completa-e2e/) — setup, first tests, best practices
2. [Trace Correlation with OpenTelemetry](/blog/verificare/testing/02-opentelemetry-trace-correlation/) — connecting E2E tests and backend traces
3. [CI/CD: retry, sharding, and parallelism](/blog/verificare/testing/03-cicd-strategie-avanzate/) — scalable pipeline execution
4. [Network mocking with page.route()](/blog/verificare/testing/04-network-mocking/) — isolating the UI from services
5. [Advanced network mocking: fixtures and HAR](/blog/verificare/testing/05-network-mocking-avanzato/) — reusable mocking patterns
6. [Visual regression testing](/blog/verificare/testing/06-visual-regression/) — catching visual bugs with screenshots
7. [Diagnosing and fixing flaky tests](/blog/verificare/testing/07-flaky-debugging/) — causes, tools, and anti-flaky patterns
8. [Authentication testing with storageState and Keycloak](/blog/verificare/testing/08-authentication-testing/) — login once, always authenticated
9. Page Object Model for maintainable tests — this article

The complete code is in the [MockMart](https://github.com/monte97/MockMart) repository, in the `tests/e2e/` directory.
