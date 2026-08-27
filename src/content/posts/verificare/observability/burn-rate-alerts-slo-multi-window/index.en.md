---
title: "Three window pairs, and why all three are needed"
seoTitle: "Multi-window burn-rate: the three pairs"
date: 2026-04-23T09:00:00.000Z
description: "SRE Workbook table 5-8 row by row: 14.4× on 1h+5m, 6× on 6h+30m, 1× on 3d+6h. Where the numbers come from and why you never install just one."
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
  - Grafana
  - PromQL
lang: en
reviewed: machine
series: saturation-alerting
seriesOrder: 40
reproducibility: true
summary:
  - label: "Choice"
    value: "Three canonical pairs for monthly SLOs: 14.4× on 1h+5m, 6× on 6h+30m, 1× on 3d+6h"
    note: "Budget consumed at firing: 2%, 5% and 10%; reset dictated by the short window"
  - label: "Rule"
    value: "The three pairs are complementary, not alternatives: they get installed together"
    note: "Copying only the fast burn is the most common mistake in adoption"
  - label: "Evidence"
    value: "In the demo both alerts fire 37 seconds after the load generator starts"
    note: "`rate()` does not wait for a full window: it computes over the data it finds"
  - label: "Prerequisites"
    value: "Recording rules for the SLI over the four windows before writing the alerts"
    note: "Pre-computing `rate[1h]` costs less, and the same value serves several alerts and dashboards"
openItems:
  - "The demo implements only fast and medium: the slow burn on a 3d window needs three days of real data and is not observable in a demo starting from zero"
  - "The values in table 5-8 hold for a monthly SLO of 720 hours: with weekly or quarterly windows the burn rates have to be recalculated"
  - "Severity routing is declared here but configured elsewhere: it is the subject of the last article in the series"
openNote: "The Workbook's canonical numbers, with the conditions under which they hold."
mode: how-to
---

The reasoning about burn rate ends with a pure number: 14.4× means you are burning the error budget fourteen times faster than is sustainable. The operational question is a different one: **over which window do you measure it, and at what threshold do you wake somebody up?**

The SRE Workbook answers with a table, 5-8, and the answer is not one pair of windows but three. They are not alternatives to pick the most convincing one from: they are three different failure regimes, and installing only one leaves the other two uncovered — which are exactly the cases where [the static threshold was failing](/en/blog/verificare/observability/error-budget-soglia-statica/).

Here the table is taken apart row by row, with the arithmetic that produces the numbers, a demo showing the pairs in action, and the four mistakes that come up most often in adoption.

## The three canonical pairs, row by row

The SRE Workbook, in the "Multiwindow, Multi-Burn-Rate Alerts" section of chapter 5, does not stop at a single pair of windows. It proposes **three canonical pairs** for monthly SLOs, each with a specific operational vocation, and these three pairs are to be installed together in production, not chosen one against the other. Table 5-8 of the Workbook ("Recommended time windows and burn rates for alerts") is the reference source, reconstructed below with the relevant columns.

> **A note on terminology**: the labels "fast burn", "medium burn", "slow burn" do not appear literally in the Workbook, which speaks only of burn rate + severity (`Page` or `Ticket`). They are conventions widespread in the community (Sloth, grafana-mixins, public SRE posts) that attach an operational name to each row of the table. They are used here in the same sense.

| Severity | Long window | Short window | Burn rate threshold | Budget consumed at firing | Reset time | Operational vocation |
|---|---|---|---|---|---|---|
| **Critical (fast burn)** | 1h | 5m | 14.4× | 2% of the monthly budget | 5 min | Page the oncall, incident in progress |
| **Critical (medium burn)** | 6h | 30m | 6× | 5% of the monthly budget | 30 min | Page the oncall, sustained problem |
| **Warning (slow burn)** | 3d | 6h | 1× | 10% of the monthly budget | 6h | Ticket for investigation, wakes nobody |

It is worth taking the table apart row by row, because the numbers in the middle columns are not arbitrary: they come from a precise calculation.

The formula linking burn rate, window and budget consumed at firing is:

> `budget_consumed = burn_rate * window / SLO_window`

Applying it to the **fast burn** (burn rate 14.4×, long window 1h, monthly SLO reference window = 720h): `14.4 * 1 / 720 = 0.02`, meaning 2% of the budget consumed at the moment the alert fires. For the **medium burn** (6×, 6h over 720h): `6 * 6 / 720 = 0.05`, 5% of the budget. For the **slow burn** (1×, 3d = 72h over 720h): `1 * 72 / 720 = 0.1`, 10% of the budget. These three numbers (2%, 5%, 10%) are the cost in budget you accept paying before the corresponding alert fires: less is better for detection, but lower also implies more noise from transient bursts.

The **reset time** is determined entirely by the short window, not by the long one. When the problem is mitigated, the long window takes hours to drop back below threshold because it still holds the memory of the incident, but the AND conjunction requires the short window to be above threshold too, and that one empties quickly: five minutes for the fast burn, thirty minutes for the medium burn, six hours for the slow burn. This is exactly the problem multi-window solves compared to single-window: with a long window alone, the alert would stay firing hours after mitigation, and the oncall would keep receiving pages for an incident already closed.

The **operational vocation** of each row is the least technical and most important point to keep in mind. The fast burn fires only if something serious and immediate is happening: it is the right channel for waking the oncall at night, because 2% of the budget in an hour is a rate that, if sustained, would burn everything in two days. The medium burn catches the less violent but more persistent problems, typically sustained degradations the fast burn would not see because they are below its 14.4× burn rate. The slow burn is different in nature: its 1× burn rate corresponds to the maximum sustainable rate, so it fires when the service is meeting the SLO right at the limit, without ever exceeding it sharply, and a human should understand why before the safety margin runs out. This is investigation work, not incident response, and it goes on a daytime channel (ticket, team Slack) without waking anybody.

The key insight, which the Workbook repeats explicitly, is that the three pairs are **complementary, not alternatives**. You install all three in production, and the routing in Alertmanager distinguishes by severity: `severity: critical` goes to PagerDuty with a 24/7 policy, `severity: warning` goes to Slack or email during business hours. The first common mistake when adopting burn-rate alerting is to copy-paste only the fast burn and leave the other two behind: that loses coverage on sustained low-intensity problems (medium) and on the silent erosion of the safety margin (slow), which are exactly the cases where [the static threshold was failing](/en/blog/verificare/observability/error-budget-soglia-statica/).

The exact source for the values in this table is:

> Google SRE Workbook, ch. 5 "Alerting on SLOs", section "Multiwindow, Multi-Burn-Rate Alerts" and table 5-8.
>
> Source: sre.google/workbook/alerting-on-slos/

Seeing these three pairs work together on a real service makes their behaviour during an incident clearer than any table. The next section shows a minimal Docker Compose demo with Prometheus and Grafana simulating an HTTP service with an injected error, loads the three pairs as alert rules, and lets you observe which fires first, when each resets, and how severity routing sends them to different channels.

## In the demo both alerts fire at 37 seconds

The [burn-rate-demo](https://github.com/monte97/burn-rate-demo) repository contains a minimal Docker Compose stack letting you observe the canonical pairs in under five minutes of wall-clock time. There are four services: a fake HTTP service (`fake-http-service`, FastAPI + `prometheus_client`) exposing a `/` endpoint configured to return a 500 status with probability `ERROR_RATE`, a `load-generator` that `curl`s the service at a constant rate, a Prometheus with the four recording rules (`ratio_rate5m`, `ratio_rate30m`, `ratio_rate1h`, `ratio_rate6h`) and the two alerts (`ErrorBudgetBurnRateFast`, `ErrorBudgetBurnRateMedium`), and a Grafana with a provisioned dashboard visualising the rates and the firing state.

The demo's target SLO is `99.9%`, so an error budget of `0.1%`. The environment variable `ERROR_RATE: "0.50"` injected into the service is deliberately aggressive: with 50% sustained errors the rate windows cross the threshold far more quickly than in a realistic incident, and that is necessary to compress the firing times into a demo observable in a few minutes. The command to start the stack and check the rules:

```bash
git clone https://github.com/monte97/burn-rate-demo
cd burn-rate-demo
docker compose up --build -d
# Prometheus at http://localhost:9090, Grafana (anonymous admin) at http://localhost:3000
```

During a verified run, both alerts go into the `firing` state around 37 seconds after the load generator starts. The reason is that the rate is computed as a moving average over the window, and with a sustained 50% error rate from `t=0` even the longer windows (6h) quickly reflect the real average of the samples available. This behaviour is not a bug in the demo, it is a direct consequence of the fact that `rate()` in PromQL does not wait for the window to be "full" before returning a value: it computes the rate over the data it finds. In the "Error rate (multi-window)" panel the four curves 5m, 30m, 1h, 6h rise in parallel until they settle around `0.5`, far above the fast burn threshold of `0.0144` and the medium burn threshold of `0.006`.

![Error rate over multiple windows: 5m, 30m, 1h and 6h converge towards 0.5](./burn-rate-error-rate-windows.webp)

The "Burn rate (fast vs medium)" panel divides the rate by the SLO budget (`0.001`), so the vertical scale is directly the burn rate in "×" units. The two horizontal guide lines at `14.4` and `6` make visible the moment each threshold is crossed: with `ERROR_RATE=0.50` the effective burn rate is `500×`, two orders of magnitude above the fast burn threshold, so in practice both alerts fire in the first usable evaluation window.

![Dashboard overview with both alerts firing](./burn-rate-overview.webp)

The "Alerts firing" panel shows the firing state as a step function: `0` when the alert is inactive, `1` when it is firing. With 50% sustained, both lines go to `1` almost simultaneously and stay there until teardown.

![Alerts firing: fast and medium in the firing state simultaneously](./burn-rate-alerts-firing.webp)

To observe **differentiated detection** (the fast burn firing before the medium burn) you have to lower `ERROR_RATE` to a more modest value, for example `0.03` (3% errors), and wait longer. In that regime the rate over the 5m window crosses `0.0144` before the rate over the 30m window crosses `0.006`, because the shorter window is more responsive to changes. The operational pattern to observe is: the fast burn will fire first, paging the oncall; if the incident persists long enough to saturate the longer windows too, the medium burn will fire as confirmation of the sustained regime.

To shut the stack down: `docker compose down`. No persistent volumes, everything recreatable from zero in under thirty seconds.

## What the demo does not show: the slow burn

Table 5-8 provides for **three** canonical pairs, but the demo implements only two. The slow burn (`3d + 6h`, burn rate `1×`) was left out for a very concrete reason: with a long window of three days, the recording rule `rate(http_requests_total[3d])` needs three days of real data to return a stable value. In a Docker Compose demo starting from zero there is no way to observe it in useful time, and forcing it to fire with `ERROR_RATE=0.50` would only produce a useless result (the rate saturates the window in seconds and the alert fires immediately, providing no information about "slow" behaviour).

In production the slow burn gets installed anyway, alongside the other two, with the same formula from the Workbook:

```yaml
- alert: ErrorBudgetBurnRateSlow
  expr: |
    job:slo_errors:ratio_rate6h > (1 * 0.001)
    and
    job:slo_errors:ratio_rate3d > (1 * 0.001)
  for: 15m
  labels:
    severity: warning
    slo: availability
  annotations:
    summary: "Error budget slow burn rate (1x) on availability"
    description: "The service is burning the error budget at the maximum sustainable rate. Investigate before the safety margin runs out."
```

The `for: 15m` is deliberately generous, because the slow burn is not an incident: it is a signal that the safety margin is eroding, to be investigated during working hours, not after three minutes of observation.

## Four mistakes that keep coming back

While adopting burn-rate alerting a few mistakes come up repeatedly, and they are worth spelling out because they appear even in codebases with otherwise well-tended observability.

The first mistake is **copy-pasting only the fast burn** and forgetting medium and slow. It is the most common trap: the fast burn is pedagogically the easiest to explain, it fires first during demos, and it seems to cover the "important" incidents. But it leaves uncovered every sustained low-intensity error regime (the ones the medium burn catches) and the silent erosion of the margin (the one the slow burn catches). The Workbook's recommendation is to install **all three** pairs together, with different routing by severity, not to pick one as "good enough".

The second mistake is **computing the rate on the wrong metric**. The SLI has to measure the quality of the service from the user's point of view, not the infrastructure's. A rate computed on `http_requests_total{job="my-service"}` is fine, but a rate computed on `container_cpu_usage_seconds_total` or `nginx_upstream_errors_total` is measuring an internal component and does not reflect the user experience. If an infrastructure error is masked by client retries, the user does not see it and the burn-rate alert should not count it.

The third mistake is **getting the SLO reference window wrong** in the consumed-budget formula. Table 5-8 is built for a monthly SLO (720 hours). If the SLO is quarterly (2160 hours) or weekly (168 hours), the percentages of budget consumed at firing change and the burn rate thresholds should be rescaled proportionally. Applying the table's values to a weekly SLO without rescaling is a conceptual error leading to alerts that are far too noisy (a fast burn firing for episodes consuming 30% of the weekly budget in an hour, not 2% of the monthly one).

The fourth mistake is **using multi-window for non-SLO metrics**. Burn-rate makes sense for service quality metrics as seen by the user (availability, p99 latency, end-to-end error ratio). Applying it to physical saturation metrics (CPU, memory, disk) is a misuse: for those the right question is "when will the resource run out", and the correct tool is projection (`predict_linear`), as seen in the previous article of the series. The two techniques are complementary but answer different questions and operate on different domains.

## What to install tomorrow

The minimal SLO alerting package to take into production contains, for every service with a formalised SLO, four components.

1. **Recording rules** for the SLI over four windows: `ratio_rate5m`, `ratio_rate30m`, `ratio_rate1h`, `ratio_rate6h`. The slow burn also needs `ratio_rate3d`, which Prometheus computes without trouble provided the retention is sufficient.
2. **Three alerts**: `ErrorBudgetBurnRateFast` (5m+1h @ 14.4×, severity critical), `ErrorBudgetBurnRateMedium` (30m+6h @ 6×, severity critical), `ErrorBudgetBurnRateSlow` (6h+3d @ 1×, severity warning).
3. **Routing in Alertmanager** by severity: critical → PagerDuty 24/7, warning → the team's Slack during business hours.
4. **A Grafana dashboard** with the four rates side by side and the firing state of the three pairs, so that during an incident the oncall sees at a glance which pair fired and the consumption rate of the remaining budget.

What stays out are the two questions that close the circle: who receives each of the three pairs and with what urgency, and what the person opening the notification finds. They are the subject of [severity, routing and runbook](/en/blog/verificare/observability/alert-routing-severity-inhibition/), the last article in the series: a well-written rule reaching the wrong channel produces the same practical effect as not having written it.

## References

- **Google SRE Book**, ch. 4 "Service Level Objectives": [sre.google/sre-book/service-level-objectives/](https://sre.google/sre-book/service-level-objectives/)
- **Google SRE Workbook**, ch. 5 "Alerting on SLOs", section "Multiwindow, Multi-Burn-Rate Alerts" and table 5-8: [sre.google/workbook/alerting-on-slos/](https://sre.google/workbook/alerting-on-slos/)
- **Prometheus recording rules**: [prometheus.io/docs/prometheus/latest/configuration/recording_rules/](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- **Demo repository**: [github.com/monte97/burn-rate-demo](https://github.com/monte97/burn-rate-demo)
- **Previous article in the series**: [Prometheus predict\_linear: predictive alerts on saturation](/en/blog/verificare/observability/prometheus-predict-linear-alert-predittivi/)
