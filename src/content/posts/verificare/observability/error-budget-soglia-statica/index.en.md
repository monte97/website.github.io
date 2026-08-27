---
title: "The static threshold answers the wrong question"
seoTitle: "Error budget: the static threshold fails"
date: 2026-04-22T09:00:00.000Z
description: "A sustained 0.5% for an hour burns 30% of the monthly budget without firing anything. Alert on the rate of consumption, not on the threshold."
pillar: verificare
category: observability
tags:
  - Prometheus
  - Observability
  - Alerting
  - SRE
  - SLO
  - ErrorBudget
  - BurnRate
  - PromQL
lang: en
reviewed: machine
series: saturation-alerting
seriesOrder: 30
reproducibility: true
summary:
  - label: "Problem"
    value: "The static threshold fires too early or too late: it ignores the rate of budget consumption"
    note: "A sustained 0.5% for an hour burns about 30% of the monthly budget unnoticed"
  - label: "Definition"
    value: "The error budget is the complement of the SLO: a finite quantity that renews"
    note: "99.9% over thirty days is about 43.2 minutes of degraded service a month"
  - label: "Tool"
    value: "The Workbook's multi-window multi-burn-rate: alert only if the long AND the short window are over threshold"
    note: "The AND conjunction handles detection time and reset time together"
  - label: "Criterion"
    value: "Three tools, three questions: a threshold for up/down, `predict_linear` for resources, burn-rate for the budget"
openItems:
  - "The burn rate is a pure number: 2× always means twice the sustainable rate, but the error ratio threshold depends on the SLO"
  - "Which window pairs to install and at what thresholds is the subject of the next piece, not this one"
  - "Burn-rate measures quality as seen by the user: for physical saturation the tool is `predict_linear`, for simple up/down a threshold is enough"
openNote: "The perimeter of this piece, and what passes to the next."
mode: explanation
---

## By the time the alert fires, the week's budget is already burnt

Anyone who has configured a classic alert of the form `error_rate > 1%` has probably already experienced the two mirror-image failures of that rule. Either it fires on every transient spike of errors and becomes noise the oncall learns to ignore, or it is so permissive that by the time it fires the week's error budget is already burnt and the service has been out of its SLO for hours. Both outcomes are consequences of the same conceptual error: alerting on the instantaneous metric instead of on the **budget consumed over time**.

The two previous articles in the series showed how to anticipate the saturation of a physical resource (disk, heap, connection pool): [why the trend answers a different question from the state](/en/blog/verificare/observability/use-golden-signals-saturation/), and [which alert each resource needs](/en/blog/verificare/observability/prometheus-predict-linear-alert-predittivi/). Here the question changes level of abstraction: no longer "when will the hardware resource run out" but "how fast are we burning the service's error budget as seen by the user". The anticipation logic is the same, but the subject of the monitoring moves from the resource to the user impact, and that has very concrete operational consequences for how the alerts have to be formulated.

## SLI, SLO and error budget, operationally

Before talking about alerting, three operational definitions need fixing — operational, not philosophical. There are two sources: the **Google SRE Book, chapter 4 "Service Level Objectives"** for SLO and SLI, and the **SRE Workbook, chapter 5 "Alerting on SLOs"** for the burn-rate part that comes after.

An **SLI (Service Level Indicator)** is a metric measuring the quality of the service as the user sees it, not as the infrastructure sees it. The canonical form the Workbook recommends is a ratio: `good_events / valid_events`. Concrete examples: the proportion of HTTP requests returning a 2xx or 3xx status over a five-minute window, or the proportion of requests answering within a p99 latency of 300ms. What matters is that the SLI is observable end-to-end from the user's point of view, not measured on an internal component of the system.

An **SLO (Service Level Objective)** is the quantitative target for the SLI over a calendar time window. Example: "99.9% of HTTP requests to `/api/v1/*` must return a 2xx or 3xx status over a rolling thirty-day window". Two numbers and a window, nothing more: the target on the SLI and the reference period.

The **error budget** is simply the complement of the SLO, expressed as the amount of error tolerated in the same window. If the SLO is 99.9% over thirty days, the error budget is 0.1%, which translated into degraded service time becomes about 43.2 minutes in a month. It is a **finite quantity that renews at the start of every period**, and it can be burnt continuously (a sustained 0.1% error) or in a concentrated way (five minutes at 100% error, then nothing).

The SRE Book fixes the definition operationally: the error budget is *"a clear, objective metric that determines how unreliable the service is allowed to be"* within a single quarter.

> Source: sre.google/sre-book/embracing-risk/

The operational takeaway of this section is a single one, and it is the hinge for everything that follows: **the SLO is a contract with the user expressed in terms of a consumable budget**. Reasonable alerts should answer the question "are we consuming the budget at a rate sustainable for the current window?", not the question "has the instantaneous metric crossed an arbitrary threshold at this precise moment?". These are two different questions, and they produce two different kinds of alert with very different error profiles.

## The static threshold gets it wrong from both ends

The operational question becomes: why is an alert of the form `error_rate[5m] > X` not sufficient, whatever `X` is? The answer is that there are two mirror-image failure modes, each emerging when you pick `X` from one end of the spectrum or the other, and no intermediate value of `X` really solves both.

The first failure concerns aggressive thresholds. A rule like `error_rate[5m] > 0.001` (0.1%, exactly the SLO limit) fires on every transient burst of errors. A batch job failing ten requests out of a thousand in thirty seconds fires the alert, the oncall gets paged, investigates, finds nothing systemic, and the alert gets silenced quickly. After a few weeks of this pattern the alert is progressively disregarded by the team and ignored even when it would be signalling something real. Alert fatigue is guaranteed, with the consequence of having a noisy signalling channel that no longer communicates useful information.

The second failure is the opposite, and it is the more insidious one, because it stays invisible until it is too late. A rule like `error_rate[5m] > 0.01` (1%, ten times the SLO) is far more permissive and almost never fires, except when the service is visibly broken and somebody else has already noticed by other means. Meanwhile, a sustained 0.5% error for an hour has already burnt about 30% of the monthly error budget, and nobody knows until the end-of-month review arrives and the graph shows the service did not meet its SLO.

The key point is that the static threshold answers the wrong question. A "fixed" threshold presumes there is a value of error rate above which something is "broken", but that assumption ignores the temporal dimension of the error budget. The right question, the one the SRE Workbook formalises, is very different: **at what rate are we consuming the budget compared to the rate sustainable for the whole SLO window?**

From here comes the concept of the **burn rate**, which is a pure number with no unit of measure. It is defined as the ratio between the current rate of budget consumption and the sustainable rate that would make it last exactly for the whole SLO window. For a 99.9% SLO over thirty days, the reference burn rate of 1× corresponds to a constant error rate of 0.1%, which burns the entire budget in exactly thirty days (the maximum rate sustainable while just meeting the SLO).

A burn rate of 2× corresponds to an error rate of 0.2%, which burns the entire budget in fifteen days. A burn rate of 14.4× corresponds to an error rate of 1.44%, which burns 2% of the budget in a single hour. Table 5-2 of the SRE Workbook reports these canonical values for different detection horizons.

Reasoning in burn rate instead of absolute error rate makes the number automatically comparable across services with different SLOs: 2× always means "we are burning twice what is sustainable", regardless of whether the SLO is 99.9% or 99.95%. And above all it becomes the basis for alerts that finally answer the right question.

## Two windows in AND: the Workbook's multi-window

Burn-rate alerting was formalised by Google in the **2018 SRE Workbook, chapter 5 "Alerting on SLOs"**, as an explicit evolution of the alerting techniques in the original SRE Book. The second part of the chapter introduces the technique of **multi-window multi-burn-rate alerts** to solve two distinct problems at once that single-window alerts do not handle well: the **detection time** (how quickly an alert fires when the problem starts) and the **reset time** (how quickly it resets once the problem is mitigated).

The mechanism rests on three combined ingredients:

1. You pick a pair of time windows: a **long window** serving for stability (for example 1h) and a **short window** serving for reset responsiveness (for example 5m).
2. The alert fires only if **both** windows are above the burn rate threshold. It is a logical AND, not an OR.
3. This conjunction solves the flapping: if a burst dies out in a few minutes, the short window drops back below threshold almost immediately and the alert resets quickly, while the long window prevents minor fluctuations of the short window from firing the alert in the first place.

The operational formula for turning a burn rate threshold into an error ratio threshold is simple:

> `burn_rate > X  ⟺  error_ratio > X * (1 - SLO)`

Concrete example for a 99.9% SLO and a burn rate threshold of 14.4×: the threshold on the error ratio becomes `14.4 * 0.001 = 0.0144`, meaning an error rate of 1.44%. Above this value on both windows, the alert fires.

Translated into Prometheus, the first useful thing is to define two **recording rules** computing the SLI over the two windows of interest, so that the alerting query is then lightweight:

```yaml
# Recording rules for the SLI over multiple windows
- record: job:slo_errors:ratio_rate5m
  expr: |
    sum(rate(http_requests_total{status=~"5.."}[5m]))
    /
    sum(rate(http_requests_total[5m]))

- record: job:slo_errors:ratio_rate1h
  expr: |
    sum(rate(http_requests_total{status=~"5.."}[1h]))
    /
    sum(rate(http_requests_total[1h]))
```

Recording rules are essential for two reasons. The first is performance: computing `rate(http_requests_total[1h])` at every alert evaluation (every fifteen or thirty seconds) is far more expensive than pre-computing it once and reading it. The second is reusability: the same value `job:slo_errors:ratio_rate1h` is used by several alerts (fast burn, medium burn) and also by Grafana dashboards, so centralising the computation reduces the chance of inconsistencies between similar rules.

On top of the recording rules you build the `ErrorBudgetBurnRateFast` alert, which implements exactly the AND conjunction between short and long window:

```yaml
# Fast burn alert: 5m + 1h window, threshold 14.4×
- alert: ErrorBudgetBurnRateFast
  expr: |
    job:slo_errors:ratio_rate5m > (14.4 * 0.001)
    and
    job:slo_errors:ratio_rate1h > (14.4 * 0.001)
  for: 2m
  labels:
    severity: critical
    slo: availability
  annotations:
    summary: "Error budget fast burn rate (14.4x) on availability"
    description: "The service is burning the error budget at over 14.4x the sustainable rate. At this rate, 2% of the monthly budget is burnt in one hour."
```

The `for: 2m` is an extra buffer filtering micro-oscillations on the edge of the threshold. The `severity: critical` label is the hook for routing in Alertmanager: the fast burn goes to PagerDuty, not to a Slack channel. The rest of the section is the generalisation of this scheme to the other window pairs.

## Three tools, three different questions

The table summarises the series' three alerting tools and helps work out which is appropriate in which context.

| Technique | Question it answers | When to use it | When not to use it |
|---|---|---|---|
| **Static threshold** (`error_rate > X`) | Has this metric crossed a threshold? | Never on service SLOs. Useful only for liveness/presence alarms (e.g. "the service is down", `up == 0`). | For metrics needing temporal context, like error rate or latency. |
| **Predict\_linear** ([two pieces back](/en/blog/verificare/observability/prometheus-predict-linear-alert-predittivi/)) | When will this resource run out at the current rate? | Physical saturation with monotonic consumption: disk, heap, connection pool, file descriptors, K8s limits. | For non-monotonic metrics (error rate, latency), because linear extrapolation is meaningless. |
| **Multi-window burn-rate** (next piece) | At what rate are we consuming the error budget? | Service SLOs as seen by the user: availability, p99 latency, freshness, data correctness. | For physical resource saturation, because there is no consumable "budget". |

The selection criterion is the operational question, not the type of metric in the strict sense. If you are asking when something will run out, the tool is `predict_linear`. If you are asking at what rate a budget is being consumed, the tool is multi-window burn-rate. If you are only asking "is it up or down", a static threshold is enough — but do not call it SLO alerting, call it what it is: a health check.

## What changes for whoever pays

An error budget is the only way of telling someone who does not write code how much reliability can cost: **99.9% over thirty days is forty-three minutes of degraded service a month, and it is a number you can negotiate up front instead of justifying afterwards.** The static threshold does not know that number, and that is why it cannot tell you whether you are meeting it.

## Where to start

Take a service that already has an SLO written down somewhere — even just on a slide — and work out its error budget in minutes a month. Then look at the last incident and ask how many of those minutes it consumed.

If the answer is "I don't know", this is not an alerting problem: nobody is measuring the budget, and until it is measured there is nothing to alert on.

Once that number exists, [the Workbook's three window pairs](/en/blog/verificare/observability/burn-rate-alerts-slo-multi-window/) are the way to watch it: which ones to install, at what thresholds, and why all three are needed.
