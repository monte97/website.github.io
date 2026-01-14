---
title: "E2E Testing Infrastructure"
date: 2025-01-07
draft: true
description: "E2E testing training course with Playwright for a team of 10 developers, from zero to a complete test suite"
menu:
  sidebar:
    name: E2E Testing Infrastructure
    identifier: e2e-testing-infrastructure
    parent: projects
    weight: 60
technologies: ["Playwright", "Docker", "Jenkins", "PostgreSQL", "Vue.js"]
categories: ["Testing", "Quality Engineering", "Training"]
role: "Trainer & Technical Lead"
duration: "2 months"
team_size: "10 developers"
client_type: "Scale-up"
featured: false
related_posts: ["/posts/testing/playwright-demo/", "/posts/testing/performance-engineering/01-intro/"]
---

## Overview

Hands-on training course on E2E testing for a team of 10 developersò The goal was to build a complete automated testing infrastructure from scratch, taking the team from zero E2E coverage to a production-ready test suite.

The project started with absolutely no end-to-end tests, we built the entire infrastructure together while training the team on best practices, architecture, and suite maintenance.

## Tech Stack

* **Playwright** — browser automation and testing framework
* **Docker** — test environment containerization
* **Jenkins** — CI/CD orchestration
* **PostgreSQL** — test data management
* **Vue.js** — frontend application under test

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                         Jenkins Pipeline                        │
│  ┌─────────────┐  ┌─────────────────────────────────────────┐  │
│  │ Build Stage │─▶│           Test Stage (Parallel)         │  │
│  └─────────────┘  │  ┌───────┐ ┌───────┐ ┌───────┐         │  │
│                   │  │Shard 1│ │Shard 2│ │Shard N│         │  │
│                   │  └───────┘ └───────┘ └───────┘         │  │
│                   └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Test Environment                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ App (Vue.js)│  │ PostgreSQL  │  │ Playwright Browsers     │ │
│  │ Container   │  │ (Test Data) │  │ (Chrome, Firefox, etc.) │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Course Structure

The course was a hands-on journey to take the team from zero E2E tests to mastering modern patterns, using a sample e-commerce application.

### Module 1: Foundations and the Playwright Ecosystem

The goal of this module was to get comfortable with the Playwright ecosystem and write the first tests productively.
* **Project Setup**: Initialization with `npm init playwright@latest` and configuration of the VS Code extension.
* **Developer Experience**: Introduction to tools that accelerate development: **Codegen** for automatic test generation, **UI Mode** for interactive debugging, and **Trace Viewer** for post-mortem failure analysis.
* **Core Concepts**: Writing tests for login and add-to-cart flows, with a focus on semantic selectors (`getByRole`, `getByTestId`).

### Module 2: Stable, Isolated, and Efficient Tests

This module focused on solving the classic problems of E2E testing: instability and slowness.
* **Data Isolation**: Transitioning from static data (a source of conflicts) to **dynamic data** (`randomUUID`) to ensure each test is independent and repeatable.
* **Robust Synchronization**: Moving away from fixed `timeouts` and solving race conditions by waiting for real application events, specifically backend API responses with **`page.waitForResponse()`**.
* **Optimized Authentication**: Implementing a **`setup` project** that logs in only once for the entire test suite and saves the session state (`storageState`), drastically reducing execution times.

### Module 3: Scalability and Architectural Patterns

We tackled the scalability problem to run tests in parallel without interference.
* **Parallelism and Contention**: Demonstrating how parallel execution (`workers > 1`) with shared state leads to flaky tests.
* **API-Based Fixtures**: The key pattern of the course. Implementing advanced fixtures that create and destroy test data (e.g., unique users) via direct API calls with `APIRequestContext`. This ensures **total isolation** and allows for safe, scalable parallelization.
* **Page Object Model (POM)**: Organizing test code into reusable classes that represent application pages, dramatically improving maintainability.

### Module 4: Visual and Accessibility Testing

Beyond functionality, we verified visual integrity and accessibility.
* **Visual Regression Testing**: Using `toHaveScreenshot()` to create "baseline screenshots" and detect unexpected UI changes. We covered the workflow for analyzing "diffs" and updating snapshots.
* **Accessibility (a11y) Testing**: Introduction to integrating `axe-core` to run automated scans and identify WCAG violations, ensuring a more inclusive product.

### Module 5: AI-Assisted Test Generation (MCP Server)

To further accelerate test production and reduce developers' cognitive load, a module dedicated to LLM integration was introduced.
* **Test Generation Support**: Utilizing an LLM (via the MCP server) to generate E2E test drafts from natural language descriptions or user stories.
* **Selector Optimization**: The LLM assists in identifying and suggesting the most robust and semantic selectors for UI elements, reducing test fragility.
* **Assisted Refactoring and Debugging**: Ability to analyze existing tests to suggest improvements, refactoring, or identify potential causes of failure based on common patterns.

## Results

* **Comprehensive Training**: 10 developers trained on modern testing patterns, capable of writing robust, isolated, and maintainable tests.
* **Scalable Infrastructure**: A CI/CD pipeline configured to run hundreds of E2E tests in parallel quickly and efficiently, providing rapid feedback.
* **Best Practice Adoption**: The team adopted advanced patterns like API-based fixtures, the Page Object Model, and accessibility testing, improving overall software quality.
* **Autonomy and Maintainability**: The test suite was designed to be easily extendable and maintainable, ensuring the long-term sustainability of the investment.

## Related Articles

* [Playwright: Modern E2E Testing](/posts/testing/playwright-demo/)
* [Performance Engineering: Introduction](/posts/testing/performance-engineering/01-intro/)
