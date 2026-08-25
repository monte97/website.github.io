---
title: "A thousand requests per second means nothing"
date: 2025-07-26T08:00:00.000Z
description: "A load test that passes does not mean the system holds. Without a baseline and without project context, a performance number is true and useless."
pillar: verificare
category: testing
tags:
  - Performance Testing
  - Monitoring
  - SRE
  - Metrics
  - Observability
lang: en
reviewed: false
series: performance-engineering
seriesOrder: 10
mode: explanation
---

<!-- EN: scissione meccanica dell'articolo originale, 2026-08-25.
     Il testo e' quello di prima: l'adattamento all'italiano riscritto e' un lavoro a parte. -->


## Introduction

> What, how, why

Performance testing is a fundamental activity in the software development lifecycle, but often underestimated or performed suboptimally. In this guide, we will explore the theoretical and practical foundations needed to approach performance analysis effectively, starting from definition and objectives, up to the most effective measurement methods.

### Definition

Performance testing is the process aimed at determining the responsiveness, throughput, reliability and scalability of a system under a given workload. It's important to note that the "system" refers to the interaction of different components, and not to a single isolated part. Sometimes, a performance issue could simply be resolved by moving the problematic block to another subsystem.

### Why do we measure?

Non-performant applications generally cannot perform the function for which they were designed or intended. Performance testing represents an additional step beyond operational acceptance tests, which only verify if the application works or not.

But what do we mean by "performance"? An application is performant when it allows a user to perform a given task without perceiving delays or irritation. Measuring performance allows us to:

* Be certain we are ready for release.
* Verify infrastructure adequacy: do we have enough resources? Does the system remain stable?
* Evaluate different deployment modes: are we certain the more expensive configuration is really worth it?
* Define optimizations: it makes no sense to optimize elements that don't actually impact the metrics of interest.

### What can we measure?

The key metrics we can measure include:

* Availability
* Response Time
* Throughput
* Utilization
* Scalability

### Why do performance problems exist?

As with many other problems in software development, the later a performance issue emerges, the greater the cost to resolve it. Therefore, there needs to be a "shift-left" in solving these problems, just as happens with security or other areas.

But why aren't these tests executed earlier? The reasons can be multiple:

* Cultural issues
* Poor perceived utility
* Bad developer experience (complex tools, difficult to configure)

### What activities does it include?

The performance testing process includes several fundamental activities:

1.  Identifying the test environment: what do we have to work with?
2.  Determining the acceptance criteria: how do we know we've done well?
3.  Planning the tests: what are the scenarios? Do they resemble real product usage? It makes no sense to run tests simulating millions of users if we only have hundreds.
4.  Setting up the environment
5.  Implementing the tests
6.  Execution
7.  Test analysis

### Project Context

More than in other types of testing, the result of performance testing is not black/white but must be interpreted and the perimeter delineated. Without defining the project context, it's extremely easy to focus on wrong areas of analysis. We must take into account:

* **Project Vision**: the project vision defines its ultimate purpose and desired future state, allowing alignment of stakeholder strategic decisions.
* **System Purpose**: if we don't know the system's intent, certainly we can't even hypothesize the areas on which to focus.
* **User Expectations**: put yourself in the users' shoes. Their happiness doesn't necessarily reflect requirements written on paper by a manager.
* **Business Objectives**: as with every other project, respect deadlines and budget.
* **Reason why tests are being executed**: can vary during development phases, it's important to know how to question them.
* **Value that tests bring to the project**: knowing how to map business requirements to appropriate tests and determine the value they bring.
* Project management
* Processes
* Compliance criteria
* Project schedule

### Types of Tests

There are several types of performance tests, each with a specific objective:

* **Performance Testing**: determine speed, scalability and stability of a system. It's important to understand response times, throughput and resource usage.
* **Load Testing**: simulate high load on the system to see how it behaves while still remaining within design limits (initial estimates on usage).
* **Stress Testing**: go beyond design conditions. Determine what happens with little memory, insufficient space, server failures. The important thing is to understand how and why the system "crashes".

### Baseline Definition

Defining a baseline means determining the "as-is" conditions of the system in order to have a comparison for our improvements or to identify future regressions.

### Risks Addressed Through Performance Testing

Performance testing is a fundamental process to mitigate certain business risks and identify areas of interest regarding usability, functionality and security that cannot be obtained in other ways.

* **Speed Related Risk**: related, but not limited to, end-user satisfaction. Other examples may include data consumption and output production within a certain time frame or before data becomes obsolete. It's important to try to replicate real operating conditions as much as possible, for example how the system behaves if the load occurs during an update or during a backup.
* **Scalability Related Risk**: not only related to the number of users but also to the varying volume of processed data. We must ask ourselves:
    * Does the application remain stable for all users?
    * Is the application able to collect all the data of its lifecycle?
    * Do we have a way to realize if we're approaching maximum capacity?
    * Are functionality and security compromised with high load?
    * Are we able to handle unexpected peaks?

------
