---
title: "Which alert for which resource"
seoTitle: "predict_linear: five cases, four traps"
date: 2026-04-16T09:00:00.000Z
description: "Five PromQL examples from TLS to the connection pool, the four traps of linear regression, and ten resources with the alert each one needs."
pillar: verificare
category: observability
tags:
  - Prometheus
  - Observability
  - Alerting
  - SRE
  - PredictLinear
  - PromQL
lang: en
reviewed: machine
series: saturation-alerting
seriesOrder: 20
reproducibility: true
summary:
  - label: "Problem"
    value: "Making everything predictive by default is an anti-pattern"
    note: "The right alert is the one matching the time scale of the problem"
  - label: "Cases"
    value: "Five PromQL examples, from the TLS certificate to the connection pool"
    note: "One is a counter-example: the right answer is a static threshold"
  - label: "Traps"
    value: "Non-linear growth, window too short, cyclical patterns, thresholds that are not time-aware"
    note: "The history window should be at least a quarter of the horizon"
  - label: "Rule"
    value: "Predictive if the time-to-saturation is hours or days, reactive if it is seconds"
openItems:
  - "The monthly quota query is teaching pseudocode: PromQL has no `days_until_month_end()` and production needs a recording rule or a custom metric"
  - "Metrics with a daily cycle need a window of at least 24 hours, or a model with explicit seasonality such as Holt-Winters or Prophet"
  - "The table covers ten common resources: it is a starting point for reasoning about real cases, not an exhaustive catalogue"
openNote: "Where the linear model stops holding, and what the table does not cover."
mode: how-to
---

The filling disk is the textbook example, and it is also the one that does the most damage: it gives the impression that `predict_linear` is a hammer to use wherever a resource grows.

It is not. There are resources where the prediction is perfect, resources where it is the wrong choice, and resources where the prediction is already inside the metric and there is nothing to extrapolate. Getting the family wrong produces two different symptoms: alerts firing on irrelevant episodes and becoming noise, or alerts firing when the problem has been going on for minutes.

[The previous piece](/en/blog/verificare/observability/use-golden-signals-saturation/) established why the trend answers a different question from the state. This one answers the operational question that comes next: **for this specific resource, which alert do I actually need?**

## Five real cases, from the most reactive to the most predictive

The filling disk is the textbook example, but it risks giving the impression that `predict_linear` is a single-purpose hammer. In reality the spectrum of real cases is much wider, and it includes scenarios where the function is perfect, scenarios where it is the wrong choice, and scenarios where the prediction is already encapsulated in the metric itself. Five examples follow that cover this spectrum, from the most reactive to the most predictive.

### The TLS certificate does not need predict_linear

```promql
(probe_ssl_earliest_cert_expiry - time()) / 86400 < 7
```

This is the predictive case par excellence, but one thing is worth noticing: **there is no `predict_linear`**. The reason is that the metric `probe_ssl_earliest_cert_expiry`, exposed by the `blackbox_exporter`, is already defined as "Unix timestamp of the nearest expiry". Subtracting `time()` (the current instant) and dividing by 86400 (the seconds in a day) gives the days remaining before expiry. The cleanest form of predictive alert requires no extrapolation: it is simple arithmetic between two timestamps. The "predictive" part in this case lives in the metric itself, not in the query, and it is typically the pattern to prefer whenever the metric allows it: fewer assumptions, fewer models, fewer ways to get it wrong.

### Progressive memory leak in the JVM

```promql
predict_linear(jvm_memory_used_bytes{area="heap"}[6h], 2 * 3600)
  > on(instance) jvm_memory_max_bytes{area="heap"}
```

The names `jvm_memory_used_bytes` and `jvm_memory_max_bytes` with the label `area="heap"` are the ones exposed by Micrometer (Spring Boot Actuator) and equivalents, and it is the most common pattern in production on modern JVM stacks. The window is long (six hours of history) deliberately, to filter the noise of the garbage collection cycles that make the heap "breathe" up and down with sometimes considerable swings. A short window would be dominated by those oscillations and would produce a very noisy slope; six hours capture the underlying trend, which is the relevant one for spotting a progressive leak. The two-hour projection gives a daytime oncall enough time to open a ticket, coordinate a planned restart and act without drama before the JVM ends in OOM. The `on(instance)` join is critical: it pairs each `jvm_memory_used_bytes` with the `jvm_memory_max_bytes` of the same instance, and without it Prometheus refuses the operation because the two vectors have different label sets. Important note: this is the "realistic production" version. [The demo in the previous piece](/en/blog/verificare/observability/use-golden-signals-saturation/) uses a custom metric `jvm_heap_used_bytes` (without the `area` label) and a much shorter window, so it is observable in minutes rather than hours.

### Monthly API quota

```promql
# Pseudocode: predict_linear over a 24h window projected to the end of the month
predict_linear(api_calls_total[24h], 7 * 86400) > monthly_quota
```

A classic case for integrations with services like Stripe, Twilio, OpenAI, or any provider billing against a monthly budget of calls. The last thing you want is to discover at 23:00 on the 28th of the month that the budget is exhausted, with the service stopping until the first of the next month. An important technical warning: **PromQL has no built-in `days_until_month_end()` function**, so the query shown above is a teaching simplification. To do the right thing in production there are two options:

- a **recording rule** computing `days_to_month_end` using `month()`, `day_of_month()` and day-by-day arithmetic, then reused as a scalar in the alert query
- a **metric exposed by the application itself** (for example `billing_period_seconds_remaining`) encapsulating the billing period logic on the producer side, moving the problem outside Prometheus

The example above uses a fixed seven-day horizon for simplicity, but the real production query depends on the recording rule or the custom metric chosen to expose the remaining period.

### Kafka consumer lag: the slope counts, not the value

```promql
deriv(kafka_consumergroup_lag[15m]) > 1000 / 60
```

Here `deriv()` does a better job than `predict_linear`, and it is instructive to understand why. The relevant information for a Kafka consumer is not the absolute value of the lag in two hours, but the **sustained rate of growth**: if the lag grows steadily by a thousand messages a minute (about sixteen a second), there is a structural capacity problem with the consumer even starting from low numbers, and the problem will get worse until somebody acts. The rule fires when the slope of the regression line over fifteen minutes goes above sixteen messages a second, sustained over time. The prediction here is implicit: a trend is already a prediction, simply expressed as a slope instead of an extrapolated value.

### The connection pool saturates in seconds, and wants a threshold

```promql
(db_connection_pool_active / db_connection_pool_max) > 0.9
```

No prediction, no `predict_linear` function, no trend: just a static threshold on the current state. The reason is operational: a connection pool saturates in seconds, not hours, and the only useful alert is "it is happening now, act immediately". There is no window of intervention to anticipate: when the request rate jumps suddenly, the pool fills faster than any `predict_linear[5m]` with a sensible horizon, and by the time the prediction would fire the problem has been going on for minutes. This is a deliberate counter-example: **not everything should be made predictive**. The right alert is the one matching the time scale of the problem, and for problems that explode in seconds the right time scale is the present.

> **Selection rule**: `predict_linear` is suitable when there is a clear absolute threshold (heap limit, monthly quota, certificate expiry) and a horizon of hours or days in which to act. `deriv` is the choice when the relevant information is the rate of change regardless of the absolute value. A reactive static threshold is what you need when the resource saturates in seconds and there is no window of intervention to anticipate.

## Four ways the straight line gets it wrong

`predict_linear` is a powerful tool, but it has four typical failure modes in production. They are worth knowing before putting a predictive rule on a pager, because each of these traps shows up as operational noise that is hard to diagnose after the fact.

### Non-linear growth

The function assumes, by definition, a straight line. There are at least three families of real cases where this assumption breaks systematically. The first is the memory leak that gets exponentially worse, typically a loop of references accumulating objects faster and faster as the structure grows. The second is allocations slowing down as they approach the limit, because garbage collector pressure increases and every new allocation costs progressively more. The third is step growth, like a cronjob adding a hundred megabytes every night and staying flat for the other twenty-three hours of the day.

In all these cases the linear regression is wrong: under-estimating if the curve is convex, over-estimating if it is concave. The typical symptom is an alert that fires too early and becomes ignored noise, or too late and loses its usefulness as a warning.

### Window too short

A query like `predict_linear(metric[5m], 4 * 3600)` reacts heavily to the noise of the window. Five minutes of history projected four hours ahead amplify every random fluctuation, and the regression becomes unstable to the point where today it predicts saturation in thirty minutes, five minutes later it predicts it in six hours, and so on in a pattern that serves nobody.

The practical rule of thumb is that the history window should be at least **a quarter** of the projection horizon. A four-hour projection implies a window of at least an hour; a twenty-four-hour projection implies a window of at least six hours. The longer the window relative to the horizon, the more stable the regression and the less reactive it is to instantaneous noise.

### Cyclical patterns (guaranteed false positives)

The canonical example is the disk of an application server growing during the day because of application logs and emptied at night by log rotation. `predict_linear` applied to a window captured mid-morning sees a rising line and calmly predicts "full by tonight", but the nightly rotation will reset everything and the alert will be a certain false positive.

The pragmatic workaround is to use a window of at least twenty-four hours for any metric with a daily pattern, so the regression sees at least one complete rotation cycle. The more solid solution is to move to forecasting with Holt-Winters or Prophet, which model seasonality explicitly: the subject of the third article in the series.

### Static threshold vs working hours

"Full within four hours" is not the same as "full within four working hours". A predictive alert firing at two in the morning with four hours of lead time is operationally useless if nobody is watching the system until nine: the result is an alert that woke somebody without providing a usable window of action.

Handling this means splitting the routing: predictive alert to a low-urgency channel (team Slack, email) during working hours, reactive alert to PagerDuty 24/7 as the safety net. Recording rules applying the prediction only during business hours through conditions like `hour() >= 9 and hour() < 18` are another useful tool for reducing night-time false positives without giving up the reactive coverage.

## Ten resources and the alert each one needs

The theory is interesting, but in practice what you need to know is "for this specific resource, which alert do I actually need?". The table below summarises ten common resources and indicates which kind of alert makes sense in each case, taking into account the resource's typical time-to-saturation and the time scale over which the problem manifests. The goal is not to be exhaustive but to give a concrete starting point for reasoning about real cases.

| Resource | Reactive | Predictive | Notes |
|---|---|---|---|
| CPU run queue | Yes | No | Too volatile for linear regression |
| Memory / JVM heap | Yes (imminent OOM) | Yes (progressive leak) | Both, different windows |
| Disk space | Marginal | **Yes** | The classic use case |
| Connection pool | **Yes** | Marginal | Saturates in seconds |
| TLS certificate | No | **Yes** | Predictive by nature |
| Monthly API quota | No | **Yes** | Capacity planning |
| Kafka consumer lag | **Yes** | Yes | `deriv` better than `predict_linear` |
| Thread pool | **Yes** | Marginal | Behaves like the connection pool |
| Log retention | No | **Yes** | Weeks/months |
| Database row count | No | **Yes** | Long horizon |

> **Heuristic rule**: the predictive version makes sense when the time-to-saturation is on the order of hours or days and there is room to act before user impact. For anything saturating in seconds or minutes, the reactive version is the only sensible choice. Making alerts predictive by default is an anti-pattern: every predictive alert has to be justified by the actual lead time it offers over its reactive counterpart.

## What to do tomorrow

Open your `alerts.yml` and classify every rule with the table above: reactive where the resource saturates in seconds, predictive where the window is hours or days. The rows that fall on neither side are the ones to look at first.

**Every predictive alert has to be justified by the lead time it actually offers over its reactive counterpart.** If it offers none, it is one more alert to maintain and one more wake-up with no window of action — and the cost of a notification channel the oncall learns to ignore is paid on the next incident, not this one.

## Resources

- [Prometheus: `predict_linear()` documentation](https://prometheus.io/docs/prometheus/latest/querying/functions/#predict_linear)
- [Prometheus: Alerting best practices](https://prometheus.io/docs/practices/alerting/)
- [Robust Perception blog](https://www.robustperception.io/blog): practical examples and traps of `predict_linear`
