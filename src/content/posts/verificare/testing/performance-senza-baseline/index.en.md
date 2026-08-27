---
title: "A thousand requests per second means nothing"
seoTitle: "Performance: a number without a baseline"
date: 2025-07-26T08:00:00.000Z
description: "A load test that passes does not mean the system holds: without a baseline and without project context, a performance number is true and useless."
pillar: verificare
category: testing
mode: explanation
tags:
  - Performance Testing
  - Monitoring
  - SRE
  - Metrics
lang: en
reviewed: false
series: performance-engineering
seriesOrder: 10
summary:
  - label: "Problem"
    value: "The load test passes and users complain anyway"
    note: "The number is correct: what is missing is the reference that makes it readable"
  - label: "Choice"
    value: "Baseline before the tests, acceptance criteria from the business"
    note: "No tool knows which latency is acceptable for your product"
  - label: "Real cost"
    value: "A scenario that does not resemble real usage produces numbers that are true and useless"
  - label: "Result"
    value: "Test types stop being a taxonomy and become a choice"
openItems:
  - "A baseline ages: code changes, data changes, infrastructure changes, and a comparison against a six-month-old measurement says very little"
  - "Defining acceptance criteria needs someone who knows the business value of the feature: it is not a decision the development team can make alone"
  - "This article covers neither tools nor configuration: k6, JMeter, Gatling and Locust have their own constraints that change the choices"
  - "On a system already in production the baseline can be read from real traffic, and that beats any simulation: this is about the case where that traffic does not exist yet"
---

The load test passed. A thousand requests per second, no errors, 180 milliseconds average latency. The report is green, ship it.

Two weeks later support collects the same three complaints: "the export is glacial", "you can't work at month-end", "it won't load on mobile".

Nobody measured wrong. A thousand requests per second is a correct number. The problem is that it is not **a measurement**: it is a number without the reference that would make it readable. We do not know whether it is better or worse than yesterday, whether it is enough for real traffic, or whether those thousand requests resemble anything users actually do.

This article is about the work that comes before you launch the test. The next one, [RED tells you when it broke, USE tells you why](/en/blog/verificare/testing/red-use-quando-e-perche/), is about reading the numbers once you have them.

## A number on its own is not a measurement

A measurement is a number **plus a reference**. Without a reference you have statistics, not diagnostics.

The reference comes in three kinds, in decreasing order of reliability:

- **Real traffic**, if the system is already in production. This is the best one: you are not simulating it, you are observing it.
- **A baseline**, meaning the *as-is* measurement taken deliberately before changing anything. It serves two purposes: telling you whether an optimisation worked, and catching a future regression.
- **A requirement**, when one exists. It rarely exists in a usable form.

With none of the three, the result of a performance test is not black or white: it has to be interpreted, and interpreting without a reference means guessing which number should worry you.

**The baseline is taken first**, not after the first problem. Taken afterwards it is contaminated: you are measuring a system somebody has already touched in a hurry, and you no longer know what you are comparing.

## No tool knows what "acceptable" means

The second half of the problem is that the number, even with a reference, does not tell you whether it is fine.

No tool can. k6 does not know that your p99 on the export can sit at eight seconds because it is an operation the user kicks off before going for coffee, while three hundred milliseconds on the search-as-you-type is already too much. That distinction lives neither in the code nor in the infrastructure: it lives in the product.

Hence the uncomfortable part: **acceptance criteria have to come from whoever knows the business value of the feature.** It is not a decision the development team can make on its own, and it is not a decision you can postpone until the report is already green — by then the number exists and the threshold bends to fit it.

The question to bring to that conversation is not "how fast should it be". It is: *what happens to the business when this operation takes ten seconds instead of one?* The answer produces a defensible threshold; "as fast as possible" does not.

## The scenario has to resemble real usage

There is a way to obtain perfectly true and entirely useless numbers: test a scenario nobody runs.

Simulating a million concurrent users when you have three hundred is the most visible case, but not the most common. The common ones are sneakier:

- **The wrong dataset.** The test database has ten thousand rows, production has eleven million. The queries that pass against the first are the ones that time out against the second.
- **The wrong distribution.** The test hits every endpoint uniformly. Real traffic concentrates on three, and one of those three is the slow one.
- **The wrong moment.** Load arrives on an idle system. In production it arrives while the nightly backup runs, or while a deploy is recreating containers.
- **The wrong user.** Every request belongs to the same tenant, with the same warm cache. In production every tenant is a cold cache.

None of these makes the test *wrong*. It makes it *an answer to a question nobody asked*.

## Test types are a consequence, not a taxonomy

At this point the distinction between kinds of test stops being a list to memorise and becomes the choice of a question:

| Question | Test |
|---|---|
| Does it hold the load we expect? | Load test, within design limits |
| What breaks first when load goes beyond? | Stress test, deliberately past the estimates |
| Is it slower than yesterday? | Comparison against baseline, in CI |
| Does it hold the expected load for eight hours straight? | Soak test, where memory leaks surface |

These are different questions and they produce numbers that are not comparable. A stress test that "fails" has succeeded: it found the breaking point. A load test that fails is a problem. If you do not know which of the two you are running, you do not know how to read the result either.

## Why doing it early pays

The old *shift-left* rule holds: the later a performance problem surfaces, the more it costs. But performance carries an aggravating factor compared to a functional bug.

A functional bug isolates: there is an input that produces the wrong output, you reproduce it, you fix it. A performance problem in production often is not *one* problem: it is a query, plus a cache that is not there, plus a missing index, plus an architectural choice made two years ago. And the only window in which you can change that architectural choice is before building on top of it.

This is where the bridge to the rest of the organisation sits: **a baseline taken before the first line of code costs half a day, while discovering on a finished system that latency will not hold the expected load costs a redesign** — with the team stalled and the release date already communicated to the customer.

## Before the next test

Three things, in order, and none of them needs a tool:

1. **Write down the reference.** If the system is in production, read real traffic. If it is not, measure current conditions and save them with the date and the version.
2. **Take a threshold to whoever knows the product.** Not "how fast should it be", but "what happens if it takes ten seconds". Write the answer next to the threshold.
3. **Describe the scenario before implementing it.** How many users, which endpoints, with what data, in what state of the system. If you cannot write it in five lines, the test will measure something else.

Then you can launch. The next piece in the series, [RED tells you when it broke, USE tells you why](/en/blog/verificare/testing/red-use-quando-e-perche/), is about what to look at in the numbers that come out.
