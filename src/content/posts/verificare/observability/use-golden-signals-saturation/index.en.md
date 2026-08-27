---
title: "USE and the Golden Signals do not mean the same thing"
seoTitle: "Saturation: current state or future trend"
date: 2026-04-15T09:00:00.000Z
description: "USE defines saturation as queue present now, the Golden Signals include predictions. Two compatible frameworks, two alerts with opposite profiles."
pillar: verificare
category: observability
tags:
  - Prometheus
  - Observability
  - Alerting
  - SRE
  - GoldenSignals
  - USE
  - Grafana
lang: en
reviewed: machine
series: saturation-alerting
seriesOrder: 10
reproducibility: true
summary:
  - label: "Problem"
    value: "The static threshold answers about the current state: by the time it fires the disk is already at 90%"
  - label: "Finding"
    value: "USE defines saturation as queue present now, the Golden Signals include predictions"
    note: "Two compatible frameworks with different focus: current state against future trend"
  - label: "Tool"
    value: "`predict_linear`: linear regression over the observed window, projected t seconds ahead"
    note: "Conceptually equivalent to `deriv(v) * t` plus the current value"
  - label: "Evidence"
    value: "On the same metric the predictive alert fires four minutes before the reactive one"
    note: "Compressed demo: in production the same pattern gives hours of warning"
openItems:
  - "The function assumes linear growth: exponential leaks, allocations slowed by the GC and step growth systematically break the assumption"
  - "The predictive alert does not replace the reactive one: the second stays the safety net for when the model breaks"
  - "Which resources to make predictive and which not is the subject of the next piece, not this one"
openNote: "The limits of the linear model, and what is left to the piece after."
mode: explanation
---

## The alert fires when the disk is already full

Anyone who has written even one alerting rule in Prometheus has probably already met something very close to this:

```promql
node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.1
```

It is the rule that ends up copied from the first tutorial you find, and it populates at least half the `alerts.yml` files in the world. The problem with this rule is not the syntax, nor the value of the threshold: the problem is **the question it is answering**. The query signals that the disk is full *now*, at this precise moment. By the time it fires, occupancy is already at 90%, the logs are probably failing to write to disk and some service is already returning `ENOSPC` to its clients.

A different question, and a far more useful one operationally, would be *"will the disk fill up within a time window where it is still possible to act without waking anybody in the middle of the night?"*. That is a different question, and it needs a different alert: not an adjustment to the threshold, but a query reasoning about the **trend** instead of the **state**.

This distinction is not an academic curiosity: it has precise theoretical roots in two frameworks anybody working in observability has heard of, USE and the Golden Signals. The two frameworks use the same word and do not mean the same thing, and that is where two different kinds of alert come from.

## USE and the Golden Signals do not mean the same thing

Let us start from the primary sources, because the details matter here. The **USE method** was formalised by **Brendan Gregg in 2012**, out of his performance engineering work on Solaris first and Linux later. The acronym stands for Utilization, Saturation, Errors, and it is meant as an operational checklist for diagnosing performance problems at the level of the hardware resource: CPU, memory, disk, network.

The **Four Golden Signals** arrive a few years later, codified in the **2016 Google SRE Book**, in chapter 6 "Monitoring Distributed Systems". The approach is different: instead of starting from the physical resource, it starts from the service seen from the outside. Latency, traffic, errors, saturation: the four dimensions an SRE should build their baseline monitoring on.

Both frameworks use the word "saturation", but they define it in subtly different ways. Gregg is explicit:

> "the degree to which the resource has extra work which it can't service, often queued"
>
> Source: brendangregg.com/usemethod.html

USE saturation is, literally, the **queue of work the resource cannot clear right now**. It is an instantaneous measure: CPU run queue length, pages in swap, packets waiting in the network buffer. The SRE book, in the chapter on the Golden Signals, uses instead a definition that explicitly includes the future dimension: *"saturation is also concerned with predictions of impending saturation"*, and it illustrates the point with a database expected to fill its hard drive in four hours.

> Source: sre.google/sre-book/monitoring-distributed-systems/

That sentence appears literally in the book, in a paragraph discussing how to instrument saturation, so this is not a creative reading of the text. The key point, too often missed in discussions about alerting, is that **USE measures saturation as current state, while the Golden Signals define it including predictions**. They are two compatible frameworks with different focus, and that difference translates directly into the kind of alert each one enables.

| | **USE (Brendan Gregg, 2012)** | **Golden Signals (Google SRE, 2016)** |
|---|---|---|
| **What it measures** | Work queued *right now* | How "full" the resource is, **including predictions** |
| **When it fires** | When the problem is degrading the service | When the trend predicts it within a horizon |
| **Action enabled** | Reactive mitigation | Planning, preventive scaling |

Keeping this distinction in mind makes it much easier to answer the question "what kind of alert do I need here?", because it forces you to say out loud whether the object of the monitoring is a state or a trend.

## Symptom-based and cause-based: when you get paged

There is another axis to reason on, orthogonal to the previous one, which the SRE literature identifies as **symptom-based vs cause-based**. A reactive alert is typically symptom-based: it fires when the problem is manifesting, it is late but very precise, because it is not predicting anything but observing. A predictive alert is cause-based with a time horizon: it tries to anticipate the symptom by watching an indicator of cause tending towards a known limit. Proactive, but by definition estimated, and therefore exposed to false positives when the underlying model breaks. Neither approach is universally better than the other, and treating them as alternatives is a common mistake.

To pin the difference down, consider the same system with two different alerts on the same metric, the used heap of a JVM in production. The first is a classic reactive alert: "if the heap goes above 90% for more than five minutes, page the oncall". It fires at 3am, because the metric really did touch that threshold. The heap is at 92%, the JVM has entered a GC storm, the p99 latencies are already an order of magnitude worse and some endpoint is returning timeouts. The oncall wakes up, diagnoses, does an emergency restart and mitigates under pressure. The alert did its job and the service is saved, but the operational cost is very high.

The second alert is predictive, on the same metric: it uses `predict_linear` with a window of six hours of history and a horizon of two hours. It fires at 17:00, with the heap still at 60%, but the growth trend says the maximum limit will be reached within two hours. The oncall on the daytime shift opens a ticket, coordinates a planned restart during the evening maintenance window, nobody wakes up at night and no user sees a timeout.

Both alerts make sense and answer different operational needs: the predictive one does not replace the reactive one, they are complementary. The reactive one is the safety net for when the prediction fails — for example when the heap suddenly grows non-linearly because of a change in load. Understanding which alert answers which question is the point of the whole article, and without that clarity you inevitably end up writing rules that fire too often, too late, or both at once.

## predict_linear is a straight line extrapolated forwards

Before moving to the examples, the function at the centre of all this is worth examining. The PromQL signature is this:

```promql
predict_linear(v range-vector, t scalar)
```

What it does, in one line: it computes a **simple linear regression** over the window `v` passed as a range-vector and projects the result `t` seconds into the future, returning the estimated value of the metric at time `now + t`. A concrete example makes it clearer:

```promql
# Estimate the value of a gauge in 4 hours based on the last hour of data
predict_linear(some_metric[1h], 4 * 3600)
```

What `predict_linear` **assumes**: that growth within the observed window is substantially linear. What it **does not** do: it does not model seasonality, it does not recognise regime changes, it does not notice exponential curves or step jumps. It is a deliberately simple model, and that simplicity is both its strength (predictable, fast, easy to reason about) and its limit.

It is worth comparing it with two nearby functions that sometimes do the same job better:

- `rate(counter[1m])`: average per-second change of a monotonically increasing counter, used to compute throughput and error rate
- `deriv(gauge[5m])`: slope of the linear regression line computed over a gauge, expressed as change per second
- `predict_linear(gauge[1h], t)`: extrapolation of the estimated value `t` seconds into the future, based on the same regression

The key thing to remember is that `predict_linear(v, t)` is conceptually equivalent to `deriv(v) * t + current_value`: nothing more sophisticated than a straight line extrapolated forwards. When the linear assumption holds — and it does for plenty of real resources, like heap growth in a healthy JVM or the occupancy of a log disk — the function does exactly what is needed. When it breaks, different strategies are needed: those are the traps further down.

## The same two alerts on the same metric, in real time

The theory so far was necessary, but seeing the behaviour of the two alerts on the same metric in real time makes the difference clear far more quickly. The linked repository contains a minimal Docker Compose demo simulating exactly the JVM scenario seen above: a JVM with a linear memory leak, and the same two alerts (one reactive, one predictive) competing on the same metric. The goal is to make concrete the lead time gap discussed so far only in formulas.

> 👉 [github.com/monte97/saturation-predittiva-demo](https://github.com/monte97/saturation-predittiva-demo)

The stack is three containers: a fake Python exporter using `prometheus_client` to expose a gauge `jvm_heap_used_bytes` growing linearly at 2 MB/s from 100 MB towards 1 GB, an instance of **Prometheus** with both alert rules loaded, and a **Grafana** with the dashboard pre-provisioned. No registration, no login: three commands start the whole stack. The fake exporter is deliberately trivial because the interest is not in simulating a realistic JVM but in observing how the PromQL rules react to a clean linear curve.

```bash
git clone https://github.com/monte97/saturation-predittiva-demo
cd saturation-predittiva-demo
docker compose up --build
```

After a few seconds of build, the three services are live. Grafana answers at `http://localhost:3000`, anonymous entry as admin, dashboard `Saturation: Predictive vs Reactive`. The timeline below describes what happens in real time.

```text
t=0:00   heap = 100 MB  | no alert
t=2:00   heap = 340 MB  | predictive starts evaluating (needs 2min of history)
t=3:30   heap = 520 MB  | PREDICTIVE firing: 5min projection breaks through 1GB
t=6:50   heap = 920 MB  | REACTIVE firing: heap > 90%
t=7:40   heap = 1 GB    | real saturation
```

The interesting thing is the gap between the `t=3:30` line and the `t=6:50` line. That is **about three minutes of lead time** the predictive alert offers in a compressed teaching scenario. In a real system, where the leak is on the order of tens of MB/hour instead of 2 MB/sec, the exact same pattern would give hours or days of warning. The ratio between the observation window and the speed of the leak determines the multiplier.

![Heap used versus predicted in the demo's Grafana dashboard](./grafana-heap-predicted-vs-actual.webp)

> *The green line is the heap actually used by the simulated JVM, the dashed red line is the maximum limit (1 GiB), the dashed orange line is the `predict_linear` projection at 5 minutes. The orange line crosses the red one around 12:20, while the green one reaches it only towards 12:26: those six minutes of warning are exactly the lead time of the predictive alert.*

The first panel shows the raw metrics, but the second is even more direct: two step charts indicating when each alert is in the `firing` state. Here the time gap becomes visually impossible to ignore, and it lets you read the operational advantage without having to interpret the geometry of the curves.

![Step chart of the firing alerts: predictive versus reactive](./grafana-alerts-firing-timeline.webp)

> *The predictive alert (orange) goes into `firing` around 12:21:30, the reactive alert (pink) around 12:25:30. Four clear minutes of warning in the compressed demo. In production, with a leak of 50 MB/hour instead of 2 MB/sec, the same pattern would give over four hours of warning: enough for a planned restart during the day instead of a night page.*

The `docker-compose.yml` exposes three environment variables (`START_HEAP_MB`, `MAX_HEAP_MB`, `GROWTH_MB_PER_SEC`) letting you slow the leak down to simulate more realistic scenarios, or speed it up to observe the pattern quickly. The alert rules live in `prometheus/alerts.yml` and need no rebuild: restarting the `prometheus` container reloads them.

## What changes for whoever pays

The USE/Golden Signals distinction on saturation is not an academic subtlety: it operationally changes when and to whom the page arrives, and it is **the difference between a night-time wake-up with the service already degraded and a daytime ticket opened with room to act**. The cost of an incident is not only the downtime: it is the hour of work done under pressure by somebody who will not be at full capacity the next day.

## Where to start

Take the resource that woke you up last time and ask how long it took to saturate. If the answer is "hours", there was a window to act in and the alert did not give it to you: that resource is a candidate for a predictive alert. If it is "seconds", the reactive threshold was the right tool and the problem is elsewhere.

Which resources fall on which side is the question of the [next piece](/en/blog/verificare/observability/prometheus-predict-linear-alert-predittivi/): five real PromQL cases, the four traps of linear regression, and a table of ten resources with the alert each one needs.

## Resources

- [Google SRE Book: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/): chapter 6, which introduces the Four Golden Signals
- [Brendan Gregg: The USE Method](https://www.brendangregg.com/usemethod.html): the canonical definition of reactive saturation
- [Tom Wilkie: The RED Method](https://www.slideshare.net/weaveworks/monitoring-microservices): why RED does not include saturation
- Alex Hidalgo, *Implementing Service Level Objectives* (O'Reilly, 2020)
- Niall Murphy et al., *The Site Reliability Workbook* (O'Reilly, 2018): chapter 5 on SLO-based alerting

**Demo repo**

> 👉 [github.com/monte97/saturation-predittiva-demo](https://github.com/monte97/saturation-predittiva-demo)
