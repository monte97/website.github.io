---
title: "Playwright in CI/CD: Sharding, Mobile Testing, and Agent-Driven Automation"
date: 2025-01-24T09:00:00.000Z
description: "How to integrate Playwright into your CI/CD pipeline with sharding, mobile emulation, and API testing for fast, reliable E2E suites ready for agent-driven automation"
pillar: verificare
category: testing
tags:
  - Playwright
  - CI/CD
  - GitHub Actions
  - Sharding
  - Agent-Driven Development
lang: en
reviewed: machine
series: playwright
seriesOrder: 30
figures:
  - kind: flow
    at: configuration-and-sharding-to-reduce-feedback-time
    label: "From one suite to N runners, and back"
    caption: "Blob reports exist for the last step: they are the only format that can be merged into a single report"
    nodes:
      - kind: "1"
        name: "One suite, one runner"
        desc: "With the default configuration Playwright uses half the cores: on a two-core runner, one worker. Time grows linearly with the tests."
        edge: "matrix strategy"
      - kind: "2"
        name: "N shards in parallel"
        desc: "Each job gets `--shard=i/N` and takes its slice of the suite. The jobs do not talk: none of them knows what the others found."
        edge: "each shard produces its own"
      - kind: "3"
        name: "One blob report per shard"
        desc: "Not an HTML report: an intermediate format meant to be merged. It is why the reporter changes as soon as sharding is on."
        edge: "merge job, after all the others"
      - kind: "4"
        name: "A single report"
        desc: "The blobs are merged into one HTML report: whoever opens the PR sees a suite, not N fragments to reassemble by hand."
        key: true
---

A complete E2E test suite that passes locally and fails in CI — timeouts, browsers that won't start, fragmented reports — is a familiar scenario. A test suite only has value if it runs systematically and reliably. Integrating Playwright into a CI/CD pipeline isn't just a matter of adding `npx playwright test` to a workflow: you need specific configurations for resource-constrained runners, parallelization strategies across multiple machines, and reporters suited to each environment.

In this article we'll look at how to configure Playwright for CI, how to scale the suite with sharding and mobile emulation, how to use the API for faster test setup, and how semantic selectors prepare your codebase for agent-driven automation.

---

## Automatic feedback on every commit

The goal of CI is to run your test suite in a clean, automated environment every time a change is proposed (e.g., in a Pull Request). If the tests pass, the code is considered safe to integrate.

Playwright is designed for CI. It provides [dedicated reporters](https://playwright.dev/docs/ci-intro) (e.g., for GitHub Actions), specific configurations, and tools for analyzing failures.

### Example with GitHub Actions

[GitHub Actions](https://github.com/features/actions) is one of the most widely used CI/CD platforms. The following workflow shows a complete, annotated setup.

```yaml
# .github/workflows/playwright.yml
name: Playwright Tests

# Trigger: run on push to 'main'/'develop' and on Pull Requests targeting 'main'
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    name: 'Playwright Tests'
    # Run on a fresh Ubuntu machine
    runs-on: ubuntu-latest
    # Timeout for the entire job to prevent it from hanging indefinitely
    timeout-minutes: 30

    steps:
      # 1. Clone the repository
      - uses: actions/checkout@v4

      # 2. Set up the Node.js environment
      - uses: actions/setup-node@v4
        with:
          node-version: 22 # Use the current LTS version

      # 3. Install project dependencies
      - name: Install dependencies
        run: npm ci

      # 4. Install browsers required by Playwright
      #    --with-deps also installs system dependencies (a must in CI)
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      # 5. Run Playwright tests
      - name: Run Playwright tests
        run: npx playwright test

      # 6. Upload the test report as an artifact
      #    'if: always()' ensures the report is uploaded even if tests fail
      - name: Upload test report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7 # Keep the report for 7 days
```

> **Docker container**: For CI environments other than GitHub Actions, you can use the official Docker image `mcr.microsoft.com/playwright`, which includes pre-installed browsers and system dependencies. Pin the image to your project's Playwright version (e.g., `mcr.microsoft.com/playwright:v1.50.0-noble`).

### Other CI systems

The pattern is similar for other systems like [GitLab CI](https://docs.gitlab.com/ee/ci/), Jenkins, or CircleCI. The [official Playwright CI guide](https://playwright.dev/docs/ci-intro) includes examples for multiple platforms.

---

## Configuration and sharding to reduce feedback time

In CI, resources and context differ from your local environment: fewer CPU cores, no display, a need for persistent reports. We need to adapt our Playwright configuration accordingly.

```typescript
// playwright.config.ts
const isCI = !!process.env.CI;

export default defineConfig({
  // Without explicit configuration, Playwright uses 50% of available cores.
  // In CI, with a 2-core runner, this means 1 worker.
  // If the runner has sufficient resources, you can increase this:
  // workers: process.env.CI ? 2 : undefined,
  retries: isCI ? 2 : 0,

  // The 'github' reporter generates annotations on PRs.
  // With sharding and matrix strategy, annotations multiply:
  // in that case, 'dot' or 'list' is preferable, and you consult the HTML report.
  reporter: isCI ? 'github' : 'list',

  use: {
    // Record a trace only on the first retry, to avoid bloating artifacts.
    trace: 'on-first-retry',
  },
});
```

### Sharding: splitting the suite across multiple machines

When a test suite exceeds 10–15 minutes (the exact threshold depends on your CI infrastructure and team tolerance) even with single-machine parallelization, [sharding](https://playwright.dev/docs/test-sharding) lets you distribute tests across **multiple parallel machines**. With 200 tests distributed across 4 shards, each machine runs 50, reducing total time by roughly 4x.

**Sharding example with GitHub Actions:**

```yaml
jobs:
  test:
    name: 'Playwright Tests'
    runs-on: ubuntu-latest
    # Define a 'matrix' to create parallel jobs
    strategy:
      # fail-fast: false is essential for sharding.
      # Without it, if one shard fails GitHub Actions cancels
      # the other running shards, preventing you from seeing the full
      # failure surface.
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4] # Creates 4 jobs, one per shard

    steps:
      # ... (checkout, setup-node, etc.) ...

      - name: Run Playwright tests
        # Pass the current shard and total shard count to Playwright
        run: npx playwright test --shard=${{ matrix.shard }}/${{ strategy.job-total }}

      # Upload the blob report as an artifact (needed for subsequent merge)
      - name: Upload blob report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: blob-report-${{ matrix.shard }}
          path: blob-report/
          retention-days: 7
```

> **Caution**: `strategy.job-total` returns the product of **all** matrix dimensions. With a one-dimensional matrix (`shard: [1,2,3,4]`) the value is 4. If the matrix has multiple dimensions (e.g., `shard` + `project`), the value will be the total product, not the shard count. In that case, hardcode the shard total or define a dedicated variable in the matrix.

### Blob reporter and report merging

With sharding, each shard produces a partial report. To get a unified view of results, Playwright's best practice is to use the **blob reporter** and a separate merge job.

Update the reporter configuration for sharding:

```typescript
// playwright.config.ts
reporter: process.env.CI ? 'blob' : 'html',
```

After all shards complete, a dedicated job downloads the blob reports and merges them with `npx playwright merge-reports`:

```yaml
  # Separate job that unifies reports from all shards
  merge-reports:
    needs: test
    runs-on: ubuntu-latest
    if: always()
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22 # Use the current LTS version
      - run: npm ci

      - name: Download blob reports
        uses: actions/download-artifact@v4
        with:
          pattern: blob-report-*
          merge-multiple: true
          path: all-blob-reports

      - name: Merge reports
        run: npx playwright merge-reports --reporter html ./all-blob-reports

      - name: Upload merged HTML report
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

Without this step, you'd end up with fragmented, unusable reports: one per shard, each containing only a quarter of the results. The [official sharding documentation](https://playwright.dev/docs/test-sharding) treats the blob reporter as an integral part of the workflow.

---

## Mobile emulation and API testing

Once the pipeline is optimized, you can expand coverage. Beyond desktop browser E2E tests, Playwright covers two complementary areas: mobile device emulation and direct API testing.

### Viewport and touch emulation

[Mobile device testing](https://playwright.dev/docs/emulation) with Playwright doesn't require a physical device. The built-in emulation simulates viewport, user agent, and touch events for [dozens of mobile devices](https://github.com/nicedoc/playwright-devices/blob/master/README.md), and integrates into the project configuration. iOS devices use the **WebKit** engine (Safari); Android devices use **Chromium**.

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    // Desktop project
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    // iPhone project
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13 Pro'] },
    },
    // Android project
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
```

Running `npx playwright test --project="Mobile Safari"` executes tests in an environment simulating an iPhone, with a reduced viewport and `hasTouch: true` (required for `page.tap()` and touch events). Layout responsiveness and touch behavior are verifiable directly in the CI pipeline.

### API testing for setup and verification

[API testing with Playwright](https://playwright.dev/docs/api-testing) isn't just for verifying backends — it also makes UI tests faster and more reliable.

**Main use cases:**
1. **Direct endpoint verification**: tests that check the state, response, and schema of an API independently of the user interface.
2. **State setup and teardown**: instead of using the UI to create a user or configure a specific state, use an API call at the start of the test. API-driven setup significantly reduces preparation time and sources of flakiness.

**API setup example:**

```typescript
test.beforeEach('Create a test product', async ({ request }) => {
  // This API call ensures the product exists before the test runs
  await request.post('/api/products', {
    data: { id: 'test-product-123', name: 'Test Product', price: 99 },
  });
});

test('product created via API is visible in UI', async ({ page }) => {
  await page.goto('/products/test-product-123');
  await expect(page.getByRole('heading', { name: 'Test Product' })).toBeVisible();
});
```

This hybrid strategy — API setup, UI verification — is an established pattern for mature E2E suites.

## Semantic tests as a foundation for automation and AI agents

So far we've focused on how to run tests efficiently. But Playwright's approach — built on semantic selectors and tests that describe user behavior — has implications that go beyond testing: tests become readable by both people and automated tools, opening the door to two emerging paradigms.

### Tests as executable documentation

When E2E tests are written in a readable, declarative style, they become **living, executable documentation** of the system. A test like:

```javascript
test('An unauthenticated user is redirected to the login page', ...)
```

is clearer than static documentation, because it's continuously verified against the real system. The test suite becomes the primary source of truth about application behavior.

### Agent-Driven Development

A well-structured, accessibility-based test suite is also the prerequisite for **Agent-Driven Development**. An AI agent given a task like *"Implement the ability for a user to update their email address from the profile page"* needs two things:

1. **Understanding the current state of the system**: existing tests describe how the login flow works, how to navigate to the profile page, what elements are present. Semantic selectors (`getByRole`, `getByLabel`) are a language interpretable by both humans and agents.
2. **Verifying their own work**: once the feature is implemented, the agent must be able to write a new E2E test to validate the result, following the patterns already present in the codebase.

Tools like [Claude Code](https://claude.ai/claude-code), [Cursor](https://cursor.sh/), and [SWE-Agent](https://swe-agent.com/) already use tests as a feedback loop to validate generated changes. Without clear, semantic tests, this level of automation isn't practical. Playwright's emphasis on semantic selectors and accessibility makes it compatible with both current testing practices and agent-based automation scenarios.

---

## What running the suite in CI is worth

An E2E suite that only runs locally is a suite somebody has to remember to run, and sooner or later nobody does. Moving it into CI does not make it better: **it makes it unavoidable**, which is the only property that matters for a regression test.

Sharding is what makes that unavoidability bearable: 200 tests across four shards drop to roughly a quarter of the time, and that is the difference between a check you wait for and one you skip.

**In terms that reach whoever watches release timelines:** a regression caught in the pipeline costs the pipeline's minutes; the same regression caught by a customer costs a report, an investigation and an emergency release — plus the trust, which does not come in minutes.

## To try tomorrow

Take the slowest test in the suite and put it on a shard of its own. If total time drops, you have the case ready for whoever decides how CI time gets spent.

## Resources

* **Playwright Docs**: [playwright.dev](https://playwright.dev)
* **Best Practices**: [playwright.dev/docs/best-practices](https://playwright.dev/docs/best-practices)
* **VS Code Extension**: [marketplace.visualstudio.com](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright)
* **Discord**: [aka.ms/playwright/discord](https://aka.ms/playwright/discord)
* **GitHub**: [github.com/microsoft/playwright](https://github.com/microsoft/playwright)

---

## Repository

All workshop code:

[workshop-playwright](https://github.com/monte97/workshop-playwright)

```bash
git clone https://github.com/monte97/workshop-playwright
cd workshop-playwright

# Demo app
cd infrastructure-demo && npm install && npm start

# Tests
cd ../demo && npm install && npx playwright test --ui
```
