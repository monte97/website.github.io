---
title: "Playwright: Authentication Testing with storageState and Keycloak"
date: 2026-03-04T09:00:00.000Z
description: "How to handle authentication in E2E tests: storageState to avoid repeated logins, multiple roles, session management, and composition with mocks"
pillar: automatizzare
category: testing
tags:
  - Playwright
  - Testing
  - E2E
  - Authentication
  - Keycloak
  - TypeScript
lang: en
reviewed: machine
series: playwright
seriesOrder: 80
---

The suite has 50 tests. Every test starts at the login page, fills in username and password, clicks "Sign in", waits for the redirect, and verifies the cookie. Three seconds per login. 50 tests times 3 seconds: two and a half minutes spent just authenticating, before verifying anything. If Keycloak is slow — and in CI runners with shared resources it often is — times double. If Keycloak is down, the entire suite is red. Not because of a bug, not because of a regression: because the authentication service isn't responding.

The problem isn't the login itself. It's the repetition: every test executes the same authentication flow, the same redirect, the same wait. Information already known, work already done, time already spent.

Playwright's `storageState` solves this: run the login once in a setup project, save cookies and localStorage to a JSON file, and all subsequent tests start already authenticated. No login, no redirect, no Keycloak dependency during test execution. This article uses [MockMart](https://github.com/monte97/MockMart), the same environment from the entire [Playwright series](/blog/verificare/testing/01-guida-completa-e2e/). The complete code is in the [repository](https://github.com/monte97/MockMart), in the `tests/e2e/` directory.

---

## storageState in 30 seconds

The pattern consists of two parts: a setup project that performs the real login and saves state, and the test projects that inherit that state.

The setup is a `.setup.ts` file that Playwright runs first. Inside it, a normal test: navigate to the page, fill in the form, click the login button. The only difference is the last line:

```typescript
await page.context().storageState({ path: storageStatePath('mario') });
```

`storageState()` serializes all cookies and `localStorage` content into a JSON file. That file contains everything the browser needs to appear authenticated: tokens, session IDs, session flags.

The test projects load it in the configuration:

```typescript
{
  name: 'chromium',
  use: {
    ...devices['Desktop Chrome'],
    storageState: 'tests/.auth/mario.json',
  },
  dependencies: ['setup'],
},
```

`dependencies: ['setup']` guarantees the setup project runs before the tests. When a test starts, the browser already has the cookies and localStorage loaded from the JSON file. The page opens as if the user were already authenticated. No request to Keycloak, no redirect, no wait.

The result: login happens once per user, not once per test. With 50 tests and 3 users, you go from 50 logins to 3. The time saved is directly proportional to the number of tests.

---

## Keycloak login in the setup

MockMart uses Keycloak as the identity provider. The authentication flow is: the user arrives at the homepage, clicks "Login" in the header, is redirected to the Keycloak form, fills in username and password, Keycloak redirects them back to the homepage with tokens.

The `auth.setup.ts` file implements this flow for each test user:

```typescript
import { test as setup, expect } from '@playwright/test';
import path from 'path';

interface TestUser {
  username: string;
  email: string;
  password: string;
}

const USERS: Record<string, TestUser> = {
  mario: {
    username: 'mario',
    email: 'mario.rossi@example.com',
    password: 'mario123',
  },
  admin: {
    username: 'admin',
    email: 'admin@techstore.com',
    password: 'admin123',
  },
  blocked: {
    username: 'blocked',
    email: 'blocked@example.com',
    password: 'blocked123',
  },
};

const AUTH_DIR = path.join(__dirname, '../.auth');

function storageStatePath(userKey: string): string {
  return path.join(AUTH_DIR, `${userKey}.json`);
}
```

The `keycloakLogin` function encapsulates the authentication flow. Each step corresponds to a visible action in the interface:

```typescript
async function keycloakLogin(page: any, user: TestUser): Promise<void> {
  // Navigate to homepage — Keycloak check-sso verifies the session
  await page.goto('/');

  // Click the Login link in the header
  await page.getByRole('link', { name: 'Login' }).click();

  // Wait for the Keycloak form — external redirect
  await page.waitForURL(/\/auth\/realms\/techstore\//);

  // Fill in credentials
  await page.locator('#username').fill(user.email);
  await page.locator('#password').fill(user.password);
  await page.locator('#kc-login').click();

  // Wait for the redirect back to the homepage
  await page.waitForURL('http://localhost/');

  // Verification: the Logout button is visible = authentication successful
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible({
    timeout: 10_000,
  });
}
```

Two things to note. First: `waitForURL` with a regex for the Keycloak form. The redirect to Keycloak includes dynamic parameters (nonce, state, redirect_uri), so an exact match wouldn't work — the regex `/\/auth\/realms\/techstore\//` matches any URL containing that path. Second: the `timeout: 10_000` on the Logout button verification. The redirect from Keycloak to the homepage can be slow in CI. A generous timeout avoids false positives.

With the helper function ready, the setup tests are three structurally identical calls:

```typescript
setup('authenticate as mario', async ({ page }) => {
  await keycloakLogin(page, USERS.mario);
  await page.context().storageState({ path: storageStatePath('mario') });
});

setup('authenticate as admin', async ({ page }) => {
  await keycloakLogin(page, USERS.admin);
  await page.context().storageState({ path: storageStatePath('admin') });
});

setup('authenticate as blocked', async ({ page }) => {
  await keycloakLogin(page, USERS.blocked);
  await page.context().storageState({ path: storageStatePath('blocked') });
});
```

Each setup performs the login and saves the state to a dedicated file: `mario.json`, `admin.json`, `blocked.json`. The files are created in the `.auth/` directory under `tests/e2e/`.

This is the only point in the suite where Keycloak is directly interacted with. All other tests start from the saved state — they don't need to know that authentication uses Keycloak, OIDC, or any other protocol.

---

## Multiple users — one project per role

MockMart has three user types with different permissions:

| User | Role | canCheckout | Access |
|------|------|-------------|--------|
| `mario` | user | true | User pages, orders, checkout |
| `admin` | admin, user | true | Everything + admin panel |
| `blocked` | user | false | User pages, orders, checkout blocked |

Each user has their own storageState file. The Playwright configuration associates each project with the corresponding file:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  reporter: [['html'], ['list']],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Setup: Keycloak login for each user
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Default project: mario user
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/mario.json',
      },
      dependencies: ['setup'],
    },

    // Admin project
    {
      name: 'chromium-admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/admin.json',
      },
      dependencies: ['setup'],
      testMatch: /.*admin.*\.spec\.ts/,
    },

    // Blocked user project
    {
      name: 'chromium-blocked',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/blocked.json',
      },
      dependencies: ['setup'],
      testMatch: /.*blocked.*\.spec\.ts/,
    },
  ],
});
```

The pattern: each project has its own `storageState` and its own `testMatch`. Admin tests live in files containing "admin" in the name (e.g., `admin-panel.spec.ts`). Tests for the blocked user live in files with "blocked" (e.g., `blocked-checkout.spec.ts`). Tests without a specific prefix run in the `chromium` project with the mario user.

`testMatch` uses a regex. `.*admin.*\.spec\.ts` matches any `.spec.ts` file containing "admin" in the name. This avoids having to enumerate every file individually — just follow the naming convention.

The `.auth/` directory should be added to `.gitignore`:

```
# tests/e2e/.gitignore
.auth/
```

StorageState files contain real tokens. They are not test data — they are valid credentials that allow authenticating with Keycloak. They must not end up in the repository.

---

## Role-based tests

With three users and three projects, you can write tests that verify each role's permissions. Each test starts already authenticated — no login needed in the test.

### Mario: standard user

The `chromium` project uses mario's storageState. Tests verify what a user with the `user` role can and cannot do:

```typescript
import { test as base, expect } from '@playwright/test';

base.describe('Role-Based Access', () => {
  base('mario should NOT see the Admin link', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Admin' })).not.toBeVisible();
  });

  base('mario should see the Orders link', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('link', { name: 'Orders' })).toBeVisible();
  });
});
```

The first test verifies absence: the "Admin" link must not be visible for a standard user. The second verifies presence: the "Orders" link must be there. Two sides of the same coin: the authorization system shows and hides elements based on role.

### Checkout and custom claims

The `canCheckout` field is not a Keycloak role — it's a custom claim in the JWT token, configured as a user attribute in Keycloak. The backend reads it from the token and decides whether to authorize the checkout.

Mario has `canCheckout: true`, so checkout works:

```typescript
base.describe('Checkout Authorization', () => {
  base('mario (canCheckout=true) should complete checkout', async ({ page }) => {
    await page.goto('/');

    // Add product to cart
    await page.locator('[data-testid="product-card"]').first().click();
    await page.locator('[data-testid="add-to-cart"]').click();

    // Go to cart and proceed to checkout
    await page.locator('[data-testid="cart-icon"]').click();
    await page.locator('[data-testid="checkout-button"]').click();
    await page.locator('[data-testid="confirm-order"]').click();

    // Checkout must complete
    await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible({
      timeout: 10_000,
    });
  });
});
```

The `blocked` user has `canCheckout: false`. Their test (in a separate file, matched by the `chromium-blocked` project) verifies that the backend rejects the checkout with a 403. The frontend doesn't decide — the backend reads the claim from the token and blocks the operation.

This separation is fundamental: tests for mario run in the `chromium` project, tests for blocked run in the `chromium-blocked` project. Same test runner, different storageState, different results. No need to parameterize the test or do conditional logins — the Playwright project handles everything.

---

## Session management

Authentication isn't just login. There are two critical scenarios: explicit logout and token expiry.

### Logout

The test is linear: verify the authenticated state, click Logout, verify the return to unauthenticated state.

```typescript
base.describe('Session Management', () => {
  base('logout should redirect to homepage without auth', async ({ page }) => {
    await page.goto('/');

    // Verify authenticated state
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();

    // Click logout
    await page.getByRole('button', { name: 'Logout' }).click();

    // Verify unauthenticated state
    await page.waitForURL('http://localhost/');
    await expect(page.getByRole('link', { name: 'Login' })).toBeVisible({
      timeout: 10_000,
    });
  });
```

The verification is bidirectional: first you confirm the Logout button is visible (we're authenticated thanks to storageState), then after the click you confirm the Login link is visible (the session has ended). The `waitForURL` is needed because Keycloak handles logout with a redirect — the application is redirected to the homepage after Keycloak invalidates the session.

### Expired token

A more subtle scenario: the JWT token in storageState has expired, and the refresh token doesn't work. The `keycloak-js` library attempts a refresh, receives an error, and forces a new login. How do you test this without waiting for the real token to expire?

Intercept the refresh endpoint:

```typescript
  base('expired token should trigger re-authentication', async ({ page }) => {
    // Intercept token refresh — simulate expiry
    await page.route(
      '**/auth/realms/techstore/protocol/openid-connect/token',
      (route) =>
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'invalid_grant',
            error_description: 'Token expired',
          }),
        }),
    );

    await page.goto('/');

    // keycloak-js detects the failed refresh and forces a redirect to Keycloak
    await page.waitForURL(/\/auth\/realms\/techstore\/|\/login/, {
      timeout: 15_000,
    });
  });
});
```

`page.route()` intercepts the call that `keycloak-js` makes to refresh the token. Instead of contacting Keycloak, the request receives an `invalid_grant` error. The library interprets the error as an expired token and forces a redirect to the login page.

This pattern combines network mocking from [article 04](/blog/verificare/testing/04-network-mocking/) with authentication. You're not mocking the login — you're mocking the refresh, which is a different operation. The login happens in the setup, the refresh happens during the test's lifecycle.

> Don't test the `keycloak-js` refresh timer. The library has its own internal logic for deciding when to refresh the token — typically when 30% of the duration remains until expiry. That logic is the library's responsibility, not your application's. Test your app's behavior when the refresh fails, not when it's invoked.

---

## Combining authentication and mocks

So far the tests used real services: products come from the backend, checkout calls the payment service. But there are scenarios where you need to control both authentication and API responses. For example: an authenticated user viewing mocked products, or an authenticated checkout that fails with a simulated error.

In [article 05](/blog/verificare/testing/05-network-mocking-avanzato/) we saw `mergeTests` for combining fixtures from different modules. The same pattern works with authentication:

```typescript
import { mergeTests } from '@playwright/test';
import { test as base, expect } from '@playwright/test';
import { test as mockTest } from '../fixtures/mock-api';
import { fakeProduct } from '../fixtures/mock-api';

const test = mergeTests(base, mockTest);
```

`mergeTests(base, mockTest)` creates a new test object with fixtures from both modules. The `base` test brings the storageState (inherited from the project configuration), `mockTest` brings the `mockApi` fixture. The result is a test that starts authenticated and can mock APIs.

### Authenticated user with mocked products

```typescript
test.describe('Auth + Mock Composition', () => {
  test('authenticated user with mocked products', async ({ page, mockApi }) => {
    await mockApi.products([
      fakeProduct({ id: 1, name: 'Auth Widget', price: 99.99 }),
    ]);

    await page.goto('/');

    // Authenticated (storageState) + mocked products (mockApi)
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
    await expect(page.getByText('Auth Widget')).toBeVisible();
  });
```

The Logout button is visible because storageState loaded mario's cookies. The "Auth Widget" text is visible because `mockApi.products()` intercepted the `/api/products` call and returned the fake product. Two independent mechanisms working together.

### Authenticated checkout with payment error

```typescript
  test('authenticated checkout with mocked payment error', async ({ page, mockApi }) => {
    await mockApi.checkoutError(402);

    await page.goto('/');

    await page.locator('[data-testid="product-card"]').first().click();
    await page.locator('[data-testid="add-to-cart"]').click();
    await page.locator('[data-testid="cart-icon"]').click();
    await page.locator('[data-testid="checkout-button"]').click();
    await page.locator('[data-testid="confirm-order"]').click();

    // Authenticated but payment declined
    await expect(page.getByText(/declined/i)).toBeVisible();
  });
});
```

The user is authenticated (storageState includes mario's token with `canCheckout: true`), products come from the real backend, but checkout is mocked with a 402. The test verifies that the application correctly handles a declined payment even when the user has checkout permissions — the problem is in the payment, not the authorization.

This type of scenario is impossible to test without composition. Without mocking, you'd need a test account with a credit card that gets declined. Without authentication, you couldn't reach checkout. The combination of both patterns covers the full spectrum.

> The `MockApi` fixture from [article 05](/blog/verificare/testing/05-network-mocking-avanzato/) operates on specific endpoints: `products()` intercepts `/api/products`, `checkoutError()` intercepts `/api/checkout`. Authentication operates at the cookie and localStorage level. There's no conflict: they are different layers of HTTP communication.

---

## Summary

Authentication in E2E tests is an efficiency problem before a correctness problem. Repeating login in every test wastes time, introduces external service dependencies, and makes the suite fragile.

The patterns in this article solve the problem at three levels:

1. **storageState** — login once in the setup, reuse the state in all tests. The login cost becomes constant, not linear in the number of tests.
2. **Projects per role** — one Playwright project per user type, with `testMatch` to filter tests and `storageState` for the corresponding file. Each project has its own authentication context.
3. **Composition with mocks** — `mergeTests` to combine authentication and network mocking in the same test. Authenticated user with controlled API responses.

The guiding principle: the authentication setup is the only point where you touch the identity provider. All subsequent tests operate on the saved state. If Keycloak changes, you update one file. If a new user is added, you add a setup test and a project in the configuration.

### The complete series

1. [Complete E2E Guide with Playwright](/blog/verificare/testing/01-guida-completa-e2e/) — setup, first tests, best practices
2. [Trace Correlation with OpenTelemetry](/blog/verificare/testing/02-opentelemetry-trace-correlation/) — connecting E2E tests and backend traces
3. [CI/CD: retry, sharding, and parallelism](/blog/verificare/testing/03-cicd-strategie-avanzate/) — scalable pipeline execution
4. [Network mocking with page.route()](/blog/verificare/testing/04-network-mocking/) — isolating the UI from services
5. [Advanced network mocking: fixtures and HAR](/blog/verificare/testing/05-network-mocking-avanzato/) — reusable mocking patterns
6. [Visual regression testing](/blog/verificare/testing/06-visual-regression/) — catching visual bugs with screenshots
7. [Diagnosing and fixing flaky tests](/blog/verificare/testing/07-flaky-debugging/) — causes, tools, and anti-flaky patterns
8. Authentication testing with storageState and Keycloak — this article

The complete code is in the [MockMart](https://github.com/monte97/MockMart) repository, in the `tests/e2e/` directory.
