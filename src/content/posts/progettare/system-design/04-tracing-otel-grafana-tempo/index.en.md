---
title: "Seeing LINQ in Action: Tracing with OpenTelemetry and Grafana Tempo"
date: 2026-03-14T08:00:00.000Z
description: Make LINQ pipeline execution visible with OpenTelemetry and Grafana Tempo. Extension methods for tracing stages, multiple enumeration, and explosive nesting on a live dashboard.
pillar: progettare
category: system-design
tags:
  - LINQ
  - CSharp
  - DotNet
  - OpenTelemetry
  - GrafanaTempo
  - Observability
  - Tracing
lang: en
reviewed: machine
series: linq
seriesOrder: 40
---

In the three previous articles we saw [what to get wrong](/posts/dotnet/linq/01-errori-produzione), [how much it costs](/posts/dotnet/linq/02-benchmark-net8), and [what happens under the hood](/posts/dotnet/linq/03-compilatore-state-machine). We talked about computational complexity, state machines, allocations, and streaming. But so far everything was theory and numbers — benchmark tables, ASCII diagrams, reasoning about deferred execution.

What if you could *see* each element traverse your LINQ pipeline — operator by operator — on a dashboard? Not a static table, not a debugger breakpoint, but a temporal waterfall showing exactly when each stage starts, how long it takes, and how elements flow from one operator to the next?

You can. With a few lines of code, **OpenTelemetry** and the **Grafana LGTM** stack transform a LINQ pipeline into something observable. In this article we build the tools to do it.

---

## Setup: OpenTelemetry + Grafana LGTM in 5 Minutes

Before writing code, you need a working environment. The good news is that the setup is minimal: one Docker container and three NuGet packages.

### Grafana LGTM in Docker

The `grafana/otel-lgtm` image bundles the entire Grafana LGTM stack into a single Docker container: **Grafana** (dashboards and visualization), **Tempo** (traces), **Loki** (logs), **Prometheus** (metrics), and a built-in **OpenTelemetry Collector**. Everything you need for local development, without orchestrating multiple services.

```yaml
# docker-compose.yml
services:
  lgtm:
    image: grafana/otel-lgtm:latest
    ports:
      - "3000:3000"     # Grafana UI
      - "4317:4317"     # OTLP gRPC
      - "4318:4318"     # OTLP HTTP
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Admin
```

```bash
# Start with a single command
docker compose up -d
```

The Grafana UI is available at `http://localhost:3000`. To view traces, navigate to **Explore** and select **Tempo** as the datasource. Port `4317` is where our application will send traces via the OTLP gRPC protocol to the collector bundled in the stack.

### NuGet Packages

Three packages are enough to instrument a .NET console app:

```xml
<!-- LinqDeepDive.Tracing.csproj -->
<PackageReference Include="OpenTelemetry" Version="1.10.*" />
<PackageReference Include="OpenTelemetry.Exporter.OpenTelemetryProtocol" Version="1.10.*" />
<PackageReference Include="OpenTelemetry.Extensions.Hosting" Version="1.10.*" />
```

`OpenTelemetry` provides the base APIs. `OpenTelemetry.Exporter.OpenTelemetryProtocol` is the exporter that speaks OTLP to the LGTM stack collector. `OpenTelemetry.Extensions.Hosting` simplifies integration with the application lifecycle.

### TracerProvider Configuration

The core of the setup is the `TracerProviderBuilder`. It defines the service name, registers the source of our activities, and configures the exporter.

```csharp
using System.Diagnostics;
using OpenTelemetry;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using LinqDeepDive.Tracing.Extensions;

// Set up OpenTelemetry with OTLP exporter towards Grafana LGTM (Tempo)
using var tracerProvider = Sdk.CreateTracerProviderBuilder()
    .SetResourceBuilder(ResourceBuilder.CreateDefault()
        .AddService("LinqDeepDive.Tracing"))
    .AddSource(LinqTracingExtensions.Source.Name)
    .AddOtlpExporter(opts =>
    {
        opts.Endpoint = new Uri("http://localhost:4317");
    })
    .Build();
```

The `using var` is essential: when the `tracerProvider` is disposed, it forces a flush of pending traces to the collector. Without it, the last traces may be lost.

The `ActivitySource` — registered with `.AddSource()` — is the entry point for creating spans. In .NET, `Activity` is the equivalent of an OpenTelemetry *span*. The naming is slightly different from the specification, but the concept is the same.

> If you have already read the OpenTelemetry series on this blog, this setup will look familiar. If not, do not worry: it is self-contained and functional as-is.

---

## The `.Monitor()` Method: Making LINQ Visible

The goal is simple: insert an extension method between two LINQ operators to create a span that measures the duration of that pipeline stage. Something like `.Monitor("StageName")` that can be chained without altering the functional behavior.

### The Base Version

```csharp
// LinqTracingExtensions.cs
using System.Diagnostics;

public static class LinqTracingExtensions
{
    public static readonly ActivitySource Source =
        new("LinqDeepDive.Tracing");

    /// <summary>
    /// Wraps an IEnumerable with a span that traces
    /// the start and end of enumeration.
    /// </summary>
    public static IEnumerable<T> Monitor<T>(
        this IEnumerable<T> source,
        string operationName)
    {
        using var activity = Source.StartActivity(operationName);
        var count = 0;

        foreach (var item in source)
        {
            count++;
            yield return item;
        }

        activity?.SetTag("linq.element_count", count);
    }
}
```

The method is short, but worth unpacking. `Source.StartActivity(operationName)` creates a new span with the provided name. The `using` ensures the span is closed when enumeration ends. The `yield return` turns the method into an iterator: each element passes through without being buffered. At the end, the `linq.element_count` tag records how many elements were processed.

### Usage in a Pipeline

Insertion is transparent. You add `.Monitor()` between operators like probing a circuit:

```csharp
var result = data.Deliveries
    .Where(d => d.Status == DeliveryStatus.Pending)
    .Monitor("Filter-Pending")
    .Where(d => d.WeightKg > 50)
    .Monitor("Filter-Heavy")
    .OrderByDescending(d => d.WeightKg)
    .Monitor("OrderBy-Weight")
    .Take(10)
    .Monitor("Take-10")
    .ToList();
```

On Grafana Tempo, this pipeline produces four child spans inside the demo's parent span. Each span shows the duration of its stage and the number of elements processed. Even this base version gives a clear picture of where time is being spent.

### An Important Note: `yield return` and the `Activity` Lifecycle

There is a subtle detail worth noting. With `yield return`, the method body does not execute when called. The actual execution happens only when someone enumerates the result — the **deferred execution** we explored in article 3.

This means the `Activity` does not open when you write `.Monitor("Filter-Pending")` in the pipeline. It opens when the final `ToList()` (or a `foreach`, or a `Count()`) starts pulling elements through the chain. The activity's `Dispose` happens when the enumerator is disposed, i.e., when enumeration ends or is interrupted.

The timing is correct: the span measures exactly the period during which elements flow through that point in the pipeline. But it is important to understand that pipeline construction and pipeline execution are two distinct moments — as we saw with the state machines in the previous article.

---

## Advanced Version: Per-Element Spans

The base `.Monitor()` creates one span per stage. Useful, but it does not show the flow of individual elements. To visualize the **ping-pong** of streaming — that pattern where each element traverses the entire pipeline before the next one starts — we need finer granularity.

### `MonitorElements<T>()`: One Span per Element

```csharp
/// <summary>
/// Creates one span for each enumerated element.
/// WARNING: high overhead — use only for small collections
/// or during debugging.
/// </summary>
public static IEnumerable<T> MonitorElements<T>(
    this IEnumerable<T> source,
    string operationName)
{
    var index = 0;

    foreach (var item in source)
    {
        using var activity = Source.StartActivity(
            $"{operationName}[{index}]");
        activity?.SetTag("linq.element_index", index);
        index++;
        yield return item;
    }
}
```

The key difference from `.Monitor()`: here the span is created *inside* the `foreach`, not outside. Each loop iteration produces a new span with its index. The `using` closes the span immediately after the `yield return`, that is, when the consumer requests the next element.

### Usage with the Dispatcher Pipeline

```csharp
var result = data.Deliveries
    .Where(d => d.Status == DeliveryStatus.Pending)
    .MonitorElements("Source")
    .Where(d => d.WeightKg > 50)
    .MonitorElements("FilterHeavy")
    .Take(5)
    .MonitorElements("Take5")
    .ToList();
```

### What You See in Grafana Tempo

Opening the trace in Grafana Tempo, the waterfall tells a very different story from what a "block" mental model would suggest. You do not see all `Source[0..N]` spans first, then all `FilterHeavy[0..M]`, then `Take5[0..5]`.

Instead you see an interleaved pattern: `Source[0]` opens, then `FilterHeavy[0]` opens inside it, then `Take5[0]` opens inside that. The first element has traversed the entire pipeline. Only then does `Source[1]` open and the cycle starts again.

The Grafana Tempo waterfall takes a zig-zag shape, with nested spans showing element-by-element flow. This is **streaming** in action — the same concept that in article 3 we described with the ASCII "ping-pong" diagram of `MoveNext()` calls. Here it becomes a real temporal visualization with durations measured in microseconds.

When an element is filtered out by `Where`, it is clearly visible: `Source[N]` opens, but no `FilterHeavy[N]` follows it. The element was filtered and the pipeline moves directly to `Source[N+1]`. The `Take(5)` is even more striking: after the fifth `Take5[4]` span, no more `Source` spans appear. The pipeline has stopped — it did not consume the entire source collection, only what was necessary.

---

## Visualizing the Errors from Article 1

Theoretical demos are useful, but tracing's real value emerges when applied to real problems. Let us take two errors from article 1 and make them visible.

### Error 1 Made Visible: Multiple Enumeration

In article 1 we saw how a non-materialized `IEnumerable` query is re-executed every time it is used. With `.Monitor()` the problem becomes impossible to ignore.

```csharp
// Non-materialized query — every use re-executes it
var pendingDeliveries = data.Deliveries
    .Where(d => d.Status == DeliveryStatus.Pending)
    .Monitor("Pending-Query");

// First enumeration — generates one span
var count = pendingDeliveries.Count();

// Second enumeration — generates ANOTHER span
var maxWeight = pendingDeliveries.Max(d => d.WeightKg);

// Third enumeration — yet another span
var first = pendingDeliveries.First();
```

In Grafana Tempo you see **three distinct spans** with the same name `Pending-Query`, each with its own `linq.element_count` tag. The first and second spans process all elements of the source collection. The third potentially processes only one (if `First()` finds a match immediately), but it has still executed the iterator setup and the filter from scratch.

The correct version is simple: materialize with `.ToList()` before multiple use.

```csharp
// One enumeration, one span
var materializedPending = data.Deliveries
    .Where(d => d.Status == DeliveryStatus.Pending)
    .Monitor("Pending-Materialized")
    .ToList();

// No re-execution — operates on the in-memory list
var count = materializedPending.Count;
var maxWeight = materializedPending.Max(d => d.WeightKg);
var first = materializedPending.First();
```

In Grafana Tempo: a single `Pending-Materialized` span. The three subsequent operations produce no traces because they operate on an already-materialized `List<T>`. The difference between a single span and three identical spans is the most immediate visual signal you can have of multiple enumeration.

### Error 3 Made Visible: Explosive Nesting

The triple nesting from article 1 — for each vehicle, for each delivery, scan all constraints — was already striking in the numbers. On Grafana Tempo it becomes *viscerally* clear.

```csharp
// Direct nesting with MonitorElements
foreach (var v in data.Vehicles
    .Where(v => v.IsAvailable).Take(5))
{
    using var vehicleSpan = LinqTracingExtensions.Source
        .StartActivity($"Vehicle-{v.Id}");

    var zoneDeliveries = data.Deliveries
        .Where(d => d.Status == DeliveryStatus.Pending
                 && d.DestinationZoneId == v.CurrentZoneId)
        .MonitorElements($"V{v.Id}-Deliveries");

    foreach (var d in zoneDeliveries)
    {
        var blocked = data.Restrictions
            .Where(r => r.ZoneId == d.DestinationZoneId
                     && r.VehicleType == v.Type)
            .MonitorElements($"V{v.Id}-D{d.Id}-Restrictions")
            .Any(r => r.BlockedSlot.Overlaps(d.PreferredSlot));
    }
}
```

The Grafana Tempo waterfall is explosive. Under each `Vehicle-X` span a cascade of `VX-Deliveries[0..N]` spans opens. Under each of those, another cascade of `VX-DY-Restrictions[0..M]` spans. With 5 vehicles, 20 deliveries per zone, and 50 relevant constraints, the trace produces thousands of spans. The O(n³) pattern from article 1 becomes visually cubic: each nesting level multiplies the number of spans from the level above.

The optimized version — the one with pre-indexing via `ToLookup` — tells a completely different story:

```csharp
// Pre-indexing: a single scan of each collection
var pendingByZone = data.Deliveries
    .Where(d => d.Status == DeliveryStatus.Pending)
    .Monitor("Index-PendingByZone")
    .ToLookup(d => d.DestinationZoneId);

var restrictionIndex = data.Restrictions
    .Monitor("Index-Restrictions")
    .ToLookup(r => (r.ZoneId, r.VehicleType));

// The loop only accesses indexes — no repeated scans
var count = data.Vehicles
    .Where(v => v.IsAvailable)
    .Take(5)
    .SelectMany(v =>
    {
        var zoneDeliveries = pendingByZone[v.CurrentZoneId];
        var zoneRestrictions = restrictionIndex[(v.CurrentZoneId, v.Type)];
        return zoneDeliveries
            .Where(d => !zoneRestrictions
                .Any(r => r.BlockedSlot.Overlaps(d.PreferredSlot)))
            .Select(d => (v.Id, d.Id));
    })
    .Monitor("Assignments")
    .Count();
```

In Grafana Tempo, the optimized version shows two indexing spans (`Index-PendingByZone` and `Index-Restrictions`), followed by a single `Assignments` span. No explosive cascades. No visual nesting. Complexity has gone from cubic to linear, and the waterfall proves it unambiguously.

---

## Streaming vs Non-Streaming: Visual Proof

In article 3 we classified LINQ operators into *streaming* (lazy) and *non-streaming* (eager). `Where` and `Select` process one element at a time. `OrderBy` and `GroupBy` must buffer everything before emitting the first result. But how does this difference appear in a trace?

### `OrderBy` Breaks Streaming

Consider a pipeline with `OrderBy` in the middle:

```csharp
// Scenario 1: OrderBy before Take — sorts EVERYTHING, then takes 5
var result = data.Deliveries
    .Where(d => d.Status == DeliveryStatus.Pending)
    .Monitor("S1-Filter")
    .OrderByDescending(d => d.WeightKg)
    .Monitor("S1-OrderBy-ALL")
    .Take(5)
    .Monitor("S1-Take5")
    .ToList();
```

In Grafana Tempo the behavior is evident. The `S1-Filter` span processes all elements — say 800 pending deliveries. Immediately after, the `S1-OrderBy-ALL` span shows the same 800 elements: `OrderBy` had to consume the entire input to sort. Only then does the `S1-Take5` span show 5 elements.

The critical point: `S1-OrderBy-ALL` does not start until `S1-Filter` has emitted its last element. And `S1-Take5` does not start until `S1-OrderBy-ALL` has finished sorting. The pipeline that *looked* streaming actually has a bottleneck in the middle. Despite the `Take(5)` at the end requesting only 5 elements, `OrderBy` has buffered 800.

### Without `OrderBy`: Pure Streaming

Remove `OrderBy` and the pipeline returns to pure streaming. With `MonitorElements` you would see the interleaved pattern: `Filter[0]` followed immediately by `Take5[0]`, then `Filter[1]` and `Take5[1]`, and so on. After the fifth element, the pipeline stops. All 800 source elements are not processed — only those actually needed.

The difference in the Grafana Tempo waterfall is dramatic. With `OrderBy` you see three sequential blocks, each as wide as the entire collection. Without `OrderBy` you see a compact flow that stops after a few elements. It is exactly the difference between processing 800 elements and processing 5.

This visualization is also the best way to explain to a colleague why "moving `OrderBy` after `Take`" is not equivalent: `OrderBy` *must* see everything to guarantee correct ordering. The solution, when only the top-N is needed, is to consider alternative data structures (like a min-heap) or consciously accept the buffering cost.

---

## Watch the Cost: When NOT to Use `.Monitor()`

So far we have treated `.Monitor()` and `.MonitorElements()` as neutral tools. They are not. Each invocation has a cost, and in the wrong contexts that cost can exceed the diagnostic value.

### The Tracing Overhead

Every call to `Source.StartActivity()` allocates an `Activity` object. That object is populated with tags, timestamps, and propagation context. When done, it is serialized and sent to the collector via OTLP. The garbage collector will then need to reclaim the memory.

Connecting this to article 2: the same allocations we measured with BenchmarkDotNet in problematic LINQ patterns also apply to tracing. Each `Activity` is an object on the managed heap. In a hot path called thousands of times per second, tracing overhead alone can introduce significant GC pressure.

### Practical Guidelines

* **Debugging and local development**: unrestricted use. `.Monitor()` and `.MonitorElements()` are perfect tools for understanding pipeline behavior during development. The cost is irrelevant without real traffic.

* **Staging with sampling**: acceptable. In a staging environment you can enable tracing on critical pipelines, but it is good practice to enable sampling to reduce volume.

* **Production with aggressive sampling (1–5%)**: possible for specific pipelines you want to monitor over time. OpenTelemetry's `TraceIdRatioBasedSampler` lets you sample only a percentage of traces.

* **Hot path in production without sampling**: avoid. If a pipeline runs hundreds of times per second, even a single `.Monitor()` can introduce measurable latency.

* **`MonitorElements` on thousands of elements**: always avoid in production. Creating one span per element on a 10,000-record collection means 10,000 `Activity` allocations, 10,000 OTLP serializations, and a trace so large in Grafana that the UI becomes unusable.

### Sampling in Practice

```csharp
// In production: sample only 1% of traces
using var tracerProvider = Sdk.CreateTracerProviderBuilder()
    .SetResourceBuilder(ResourceBuilder.CreateDefault()
        .AddService("MyService"))
    .AddSource(LinqTracingExtensions.Source.Name)
    .SetSampler(new TraceIdRatioBasedSampler(0.01)) // 1%
    .AddOtlpExporter(opts =>
    {
        opts.Endpoint = new Uri("http://collector:4317");
    })
    .Build();
```

With `TraceIdRatioBasedSampler(0.01)`, 99% of calls to `StartActivity()` return `null`. The `.Monitor()` method already handles this case via the `?.` operator on `activity`. The residual cost is minimal: a `StartActivity()` call that returns immediately and no allocations.

The rule is clear: **`.Monitor()` is a diagnostic tool, not a permanent decorator.** Use it to understand behavior, then remove it or protect it with sampling. Like a breakpoint: essential during debugging, not to be left in production.

---

## Conclusions

This fourth article closes the journey we began with production LINQ errors. Here is the full path:

1. **Article 1 — The errors**: we identified four LINQ patterns that transformed linear operations into quadratic or cubic ones. `List.Contains()` inside a `Where`, repeated scans in `ToDictionary`, triple nesting, unnecessary allocations in the hot path.

2. **Article 2 — The numbers**: with BenchmarkDotNet we quantified the cost of each pattern. No longer "it's slow" or "it's fast," but nanoseconds, bytes allocated, and measurable before/after ratios.

3. **Article 3 — The compiler**: we opened the LINQ hood. Compiler-generated state machines, specialized iterators in .NET 8, the difference between `IEnumerable` and `IQueryable`, the streaming model that explains *why* certain operators cost what they cost.

4. **Article 4 — The visualization**: we made everything observable. Two extension methods — `.Monitor()` and `.MonitorElements()` — that transform the abstract behavior of a LINQ pipeline into spans visible on Grafana Tempo.

The common thread is always the same: **LINQ is not "slow" or "fast." It is a tool whose cost depends on how you use it.** The difference between those who use it well and those who do not is not the syntax — it is understanding what happens underneath. Those who know state machines do not write pipelines that re-execute queries. Those who understand computational complexity do not put `List.Contains()` inside a `Where`. Those who know tracing do not rely on intuition to optimize.

The next time a colleague says "LINQ is slow, let's use a `for`," you will have the tools to respond with data, not opinions.

---

## Resources

The entire series code — errors, benchmarks, tracing, Grafana Tempo demo — is available in the public repository:

[https://github.com/monte97/dotnet-linq-demo](https://github.com/monte97/dotnet-linq-demo)

The `src/LinqDeepDive.Tracing/` project contains all extension methods and demos described in this article, ready to run with `docker compose up -d && dotnet run`.

### Series Articles

* [Article 1: 4 LINQ errors I found in production](/posts/dotnet/linq/01-errori-produzione)
* [Article 2: What does LINQ actually cost? Benchmarks on .NET 8](/posts/dotnet/linq/02-benchmark-net8)
* [Article 3: What the compiler generates when you write a Where()](/posts/dotnet/linq/03-compilatore-state-machine)

### Official Documentation

* **OpenTelemetry .NET SDK**: [opentelemetry.io/docs/languages/dotnet](https://opentelemetry.io/docs/languages/dotnet/)
* **Grafana Tempo**: [grafana.com/docs/tempo](https://grafana.com/docs/tempo/latest/)
* **grafana/otel-lgtm Docker image**: [github.com/grafana/docker-otel-lgtm](https://github.com/grafana/docker-otel-lgtm)
* **System.Diagnostics.Activity**: [learn.microsoft.com/dotnet/api/system.diagnostics.activity](https://learn.microsoft.com/dotnet/api/system.diagnostics.activity)

If you arrived here without reading the other articles, start from the first. Each article builds on the previous one, and the complete journey — from errors to visualization — is worth more than the sum of its parts.
