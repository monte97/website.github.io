---
title: "E2E tests aren't fragile. The protocol was."
seoTitle: "Playwright and the end of flaky tests"
date: 2025-11-17T09:00:00.000Z
description: "Flaky E2E tests are not a discipline problem: it is the protocol the test speaks to the browser. Auto-waiting, WebSocket, parallelisation."
pillar: verificare
category: testing
mode: explanation
tags:
  - Playwright
  - Testing
  - E2E
  - Automation
  - CI/CD
lang: en
reviewed: false
series: playwright
seriesOrder: 10
reproducibility: true
summary:
  - label: "Problem"
    value: "Traditional E2E tests are fragile, slow and expensive"
    note: "False positives, false negatives and hours lost on failures that will not reproduce"
  - label: "Finding"
    value: "The fragility is not missing discipline: it is the protocol between test and browser"
    note: "WebDriver speaks HTTP in separate commands, Playwright holds an open WebSocket connection"
  - label: "Tool"
    value: "Playwright, with auto-waiting and assertions that retry until timeout"
    note: "Five checks before every action, without a single explicit sleep"
  - label: "Result"
    value: "100 tests go from 10 to 2.5 minutes with 4 workers"
    note: "No changes to the tests: each worker gets an isolated browser context"
openItems:
  - "Mobile is covered through emulation: viewport, user agent and touch events. Native apps and real mobile browsers stay out"
  - "The protocol advantage has narrowed: Selenium 4 introduced WebDriver BiDi, which is also WebSocket-based"
  - "Auto-waiting removes timing bugs, not shared-state bugs between tests: those remain a suite design problem"
  - "On an existing Selenium suite the migration cost is real and has to be weighed against the flakiness you are paying for today"
openNote: "Where this choice stops being obvious."
figures:
  - kind: flow
    at: the-protocol-is-the-difference
    label: "The channel between test and browser"
    caption: "WebDriver asks one command at a time and stays blind in between; Playwright keeps the connection open and receives DOM events as they happen"
    nodes:
      - kind: "WebDriver"
        name: "One command, one HTTP request"
        desc: "Find the element, then click it, then read the text: every command is a full round trip. Between one and the next, the test has no idea what the page is doing."
        edge: "the blind window where race conditions live"
      - kind: "The symptom"
        name: "sleep(5000)"
        desc: "Waiting at random is the only remedy available: too short and the test fails, too long and the suite drags."
        edge: "what changes when the channel changes"
      - kind: "Playwright"
        name: "Open, bidirectional WebSocket"
        desc: "The test does not poll the browser at intervals: it receives the page lifecycle events as they happen."
        key: true
        edge: "a consequence, not a feature"
      - kind: "The result"
        name: "Auto-waiting"
        desc: "The five checks before every action are not a polling loop bolted on top of a slow API: they follow from knowing in real time what is happening in the DOM."
---

Tests that pass on the third attempt. `sleep(5000)` scattered through the code. Suites that run for twenty minutes and fail non-deterministically, always on a different test.

Anyone who has maintained an end-to-end suite knows the sequence, and knows the explanation it usually gets: E2E tests are fragile by nature, you live with it, add a retry and move on.

That is not true. The fragility of those tests is not a property of end-to-end testing: it is a consequence of **how the test talks to the browser**. Change that channel and most of the symptoms disappear without touching a line of test logic.

> This article expands on the overview published on TheRedCode, [Testing E2E: perché iniziare con Playwright](https://theredcode.it/testing/testing-e2e-perche-iniziare-con-playwright/) (Italian). The example code is at [monte97/workshop-playwright](https://github.com/monte97/workshop-playwright).

## Why E2E tests sit at the top of the pyramid

In the [Test Automation Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) end-to-end tests sit at the top, and they sit there for a precise reason: they are the most expensive to write, the slowest to run and the most fragile to maintain.

![The Test Automation Pyramid: end-to-end tests occupy the top, the most expensive and the fewest, above integration tests and the base of unit tests](imgs/test-pyramid.png)

You keep them anyway, because they are the only ones that verify the whole path — from the interface to the database, across every service in between. A unit test will never tell you that checkout is broken because the frontend sends a field the backend renamed.

The problem is that of the three costs — writing, running, maintaining — **the third is the one that kills suites.** Nobody abandons E2E tests because they are slow. They abandon them when they stop believing their failures.

## The five checks before every click

Fragility almost always comes from the same place: a race condition between the test acting and the browser not having finished. The traditional remedy is to wait at random — `sleep(5000)` — which is the definition of a non-deterministic test: too short and it fails, too long and the suite drags.

Playwright removes the problem at the root. Before performing an action it verifies five conditions:

1. the selector matches **exactly one** element
2. the element is **visible** — not `display: none`, not `visibility: hidden`
3. the element is **stable**, meaning not moving or animating
4. the element is **not covered** by other elements
5. the element is **not disabled**

```javascript
import { test, expect } from '@playwright/test';

test('get started link', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  // no explicit wait: the five checks run before the click
  await page.getByRole('link', { name: 'Get started' }).click();
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});
```

The checks repeat with retries until the action timeout, which by default inherits the global test timeout — 30 seconds. The same holds for assertions: `toBeVisible()` does not snapshot state at an instant, it verifies it repeatedly until it is true or time runs out.

The practical difference: a `sleep(5000)` always waits five seconds, even when the element was ready after fifty milliseconds. Auto-waiting waits exactly as long as needed, and fails only when something is genuinely wrong.

## The protocol is the difference

Here is the part that explains why this is not a library detail.

WebDriver's classic model is command-by-command: the test sends an HTTP request for every operation — find the element, then click it, then read the text — and every request is a full network round trip. Between one command and the next, the test has no idea what the page is doing. That window is where race conditions live.

Playwright uses engine-specific protocols — Chromium, Firefox, WebKit — all over **WebSocket**, with a connection kept open and bidirectional. Even on Chromium it does not use the Chrome DevTools Protocol directly, but a [protocol of its own](https://playwright.dev/docs/api/class-cdpsession) operating at a lower level.

The open channel is what makes auto-waiting possible: the test does not poll the browser at intervals, it **receives** the page's lifecycle events as they happen. The five checks from the previous section are not a polling loop bolted on top of a slow API: they are the natural consequence of knowing in real time what is happening in the DOM.

**That is why flakiness drops without anybody changing how tests are written.** It is not discipline: it is that the channel the test watches the page through has stopped being blind between one command and the next.

The other half has to be said too: **the advantage is narrowing.** Selenium 4 introduced WebDriver BiDi, also WebSocket-based, precisely to close this gap. Anyone evaluating a migration today should weigh how much of that gap will still be there in two years.

## Four workers, ten minutes becoming two and a half

The second cost — execution — is addressed more plainly, but with a constraint worth understanding.

Playwright runs tests in parallel across multiple workers, and every worker gets an **isolated browser context**: separate cookies, storage and session. That is not a convenience, it is what makes parallelisation safe: without isolation, two concurrent tests writing to the same `localStorage` break each other non-reproducibly — which is exactly the flakiness we were removing.

On a suite of 100 tests: **from ~10 minutes with one worker to ~2.5 minutes with four.** No changes to the tests.

In CI, sharding pushes further: the suite is split across machines and the reports are merged downstream. That is covered in full in [CI/CD and advanced strategies](/en/blog/verificare/testing/03-cicd-strategie-avanzate/).

The number worth keeping is the earlier one, not this one: **parallelisation reduces the time, auto-waiting reduces how often that time is wasted.** A fast unreliable suite is still useless.

## When it is not the right choice

Three cases where the answer is not Playwright:

- **Native apps, or real mobile browsers.** Mobile support is emulation — viewport, user agent, touch events — and it is perfectly fine for verifying a responsive layout. It is not a real device, and it does not replace one.
- **A large, stable Selenium suite.** If the flakiness you are paying for is low, the migration cost does not repay itself. The question to ask is not which framework is better, but how many hours a month blind retries cost you today.
- **Commercial support requirements.** Playwright is open source and the support is the community. If your process requires a contract, verify that first rather than later.

## What changes for whoever pays

E2E tests get abandoned when the team stops believing their failures — and from that moment the suite keeps costing CI time without producing any information. **Making failures credible is what brings tests back to being a filter instead of noise to skip past before release**, and that is the difference between catching a regression in the pipeline and catching it from a customer.

## Where to start

Just one: the path whose breakage you would notice in the revenue figures — login, cart, checkout. Write it without a single explicit wait and run it twenty times in CI. If it passes twenty out of twenty, you have a new yardstick for judging all the others.

The rest of the series starts from there: [correlating a failed test with the backend trace](/en/blog/verificare/testing/02-opentelemetry-trace-correlation/), [mocking the network](/en/blog/verificare/testing/04-network-mocking/), [chasing flaky tests](/en/blog/verificare/testing/07-flaky-debugging/), [organising the suite with the Page Object Model](/en/blog/verificare/testing/09-page-object-model/).
