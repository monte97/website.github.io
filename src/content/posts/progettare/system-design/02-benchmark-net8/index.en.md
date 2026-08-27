---
title: "What Does LINQ Actually Cost? Real Benchmarks on .NET 8"
date: 2026-02-28T08:00:00.000Z
description: "Real benchmarks with BenchmarkDotNet on .NET 8: List vs HashSet, repeated scans vs GroupBy, LINQ allocations vs foreach, and the hidden cost of AsParallel on small collections."
pillar: progettare
category: system-design
tags:
  - LINQ
  - CSharp
  - DotNet
  - Performance
  - BenchmarkDotNet
  - Allocazioni
lang: en
reviewed: machine
series: linq
seriesOrder: 20
---

Every C# code review eventually produces the same comment: "LINQ is too slow here, use a for loop." Nobody ever backs it up with a benchmark. Today we do — on .NET 8, with BenchmarkDotNet, using the real-world patterns from the previous article.

In the [first article of this series](/en/blog/progettare/system-design/01-errori-produzione/) we examined four LINQ patterns found in a commercial fleet dispatcher. The fixes were straightforward — `ToHashSet`, `GroupBy`, `ToLookup`, `foreach`. But *how much* does it actually matter? Saying "we go from O(n²) to O(n)" is theoretically correct. In practice, the tech lead's question is different: "How many microseconds do we save? How much less memory? Is the refactoring worth it?" Today we put numbers to it.

---

## Setup: How to Measure Without Fooling Yourself

### Why Stopwatch Is Not Enough

The first instinct for measuring performance is `Stopwatch`. It seems reasonable, but it produces unreliable results:

```csharp
// The wrong way
var sw = Stopwatch.StartNew();
var result = items.Where(x => x > 50).ToList();
sw.Stop();
Console.WriteLine($"Elapsed: {sw.ElapsedMilliseconds}ms");
```

This approach suffers from at least four problems. **JIT cold start** inflates the first execution because the code is compiled on the fly. **GC noise** can insert a collection pause mid-measurement. There is no **warm-up** to stabilize the CPU cache. And with a single execution, **statistical noise** makes the number essentially meaningless.

### BenchmarkDotNet in 30 Seconds

**BenchmarkDotNet** solves all these problems. It handles warm-up, multiple iterations, robust statistics, and measures heap allocations. The base configuration for our tests looks like this:

```csharp
[MemoryDiagnoser]                       // measures allocations and GC pressure
[SimpleJob(RuntimeMoniker.Net80)]       // target runtime: .NET 8
public class LinqBenchmarks
{
    [Params(50, 200, 500)]              // variable parameters for collection size
    public int VehicleCount { get; set; }

    private FleetData _data = null!;

    [GlobalSetup]
    public void Setup()
    {
        // DataGenerator produces realistic dispatcher data
        _data = DataGenerator.Generate(/* size from VehicleCount */);
    }
}
```

Three attributes are enough: `[MemoryDiagnoser]` for allocations, `[SimpleJob]` for the target runtime, `[Params]` to test at different cardinalities.

### What We Measure

For each benchmark we collect three categories of data:

* **Time**: mean, median and standard deviation — the mean alone can hide significant outliers
* **Heap allocations**: bytes allocated per single operation — every allocation is future work for the GC
* **GC pressure**: how many Gen0, Gen1, and Gen2 collections per 1000 operations

A fundamental insight: in a context like the dispatcher from article 1, **allocations are often more important than time**. A method that completes in 50 microseconds but allocates 100 KB per call can cause unpredictable GC pauses during load spikes. When the latency budget is 100 ms, a 50 ms Gen2 GC pause is a real problem.

> All benchmarks use the `DataGenerator` from the demo project, which simulates realistic dispatcher cardinalities: 50–500 vehicles, 200–5000 deliveries, 100–2000 constraints.

---

## Benchmark 1: List.Contains vs HashSet.Contains

This benchmark corresponds to **error 1** from the previous article: using `List.Contains()` inside a `.Where()`, which turned linear filtering into quadratic filtering.

### The Contenders

```csharp
// src/LinqDeepDive.Benchmarks/Benchmarks/ListVsHashSetBenchmark.cs

[GlobalSetup]
public void Setup()
{
    _data = DataGenerator.Generate(/* size */);

    // Restricted zones: simulates the IDs to look up
    _restrictedList = _data.Zones
        .Where(z => z.IsRestricted)
        .Select(z => z.Id)
        .ToList();

    _restrictedSet = _restrictedList.ToHashSet();
}

[Benchmark(Baseline = true)]
public List<Vehicle> ListContains()
{
    return _data.Vehicles
        .Where(v => _restrictedList.Contains(v.CurrentZoneId))
        .ToList();
}

[Benchmark]
public List<Vehicle> HashSetContains()
{
    return _data.Vehicles
        .Where(v => _restrictedSet.Contains(v.CurrentZoneId))
        .ToList();
}
```

The only difference between the two methods is the type of the lookup collection: `List<string>` vs `HashSet<string>`. The LINQ query is identical.

### Results

> Indicative results on .NET 8 — run the benchmarks from the repo for numbers on your own machine.

| Method | VehicleCount | Mean | Allocated |
|--------|-------------|------|-----------|
| ListContains | 50 | 8.4 us | 2.1 KB |
| HashSetContains | 50 | 1.2 us | 2.1 KB |
| ListContains | 200 | 98.6 us | 7.8 KB |
| HashSetContains | 200 | 4.1 us | 7.8 KB |
| ListContains | 500 | 614.3 us | 18.4 KB |
| HashSetContains | 500 | 9.7 us | 18.4 KB |

### Analysis

The allocations are **identical**. Both methods produce the same output, building the same resulting `List<Vehicle>`. The cost is not in the allocation — it is in the **comparison**.

`List.Contains()` performs a linear scan: with 500 vehicles and a lookup list of ~150 restricted zones, each call to `Contains` traverses half the list on average. Multiplied by 500 vehicles, that amounts to tens of thousands of comparisons. `HashSet.Contains()` is O(1) amortized thanks to the internal hash table.

The speed ratio grows with dataset size: from roughly 7x at 50 vehicles, up to roughly 63x at 500. Algorithmic complexity is not an abstract concept — it shows up in the numbers.

One aspect often overlooked in code review discussions is worth emphasizing: switching from `List` to `HashSet` requires no change to the LINQ query. The `.Where()` stays identical. Only the upstream data structure changes. This is a general principle: **choosing the right data structure is almost always more impactful than rewriting the query**.

---

## Benchmark 2: Repeated Scan vs GroupBy with Index

This benchmark corresponds to **error 2**: building lookup structures where the value selector of `ToDictionary` scanned the entire collection for each key.

### The Contenders

```csharp
// src/LinqDeepDive.Benchmarks/Benchmarks/ScanVsGroupByBenchmark.cs

[Benchmark(Baseline = true)]
public List<(string Zone, int Count)> RepeatedScan()
{
    // For each zone, count pending deliveries by scanning ALL deliveries
    return _data.Zones.Select(z => (
        Zone: z.Name,
        Count: _data.Deliveries
            .Count(d => d.DestinationZoneId == z.Id
                     && d.Status == DeliveryStatus.Pending)
    )).ToList();
}

[Benchmark]
public List<(string Zone, int Count)> GroupByDictionary()
{
    // Single pass: build the index, then O(1) lookup per zone
    var pendingByZone = _data.Deliveries
        .Where(d => d.Status == DeliveryStatus.Pending)
        .GroupBy(d => d.DestinationZoneId)
        .ToDictionary(g => g.Key, g => g.Count());

    return _data.Zones.Select(z => (
        Zone: z.Name,
        Count: pendingByZone.GetValueOrDefault(z.Id, 0)
    )).ToList();
}
```

`RepeatedScan` is the "for each X, scan all Ys" pattern. `GroupByDictionary` builds an index in a single pass and then performs O(1) lookups.

### Results

> Indicative results on .NET 8 — run the benchmarks from the repo for numbers on your own machine.

| Method | VehicleCount | Mean | Allocated |
|--------|-------------|------|-----------|
| RepeatedScan | 50 | 42.8 us | 4.6 KB |
| GroupByDictionary | 50 | 9.3 us | 8.2 KB |
| RepeatedScan | 200 | 1,284.5 us | 14.1 KB |
| GroupByDictionary | 200 | 78.6 us | 52.8 KB |
| RepeatedScan | 500 | 8,932.1 us | 33.7 KB |
| GroupByDictionary | 500 | 196.4 us | 128.4 KB |

### Analysis

The pattern is clear. `RepeatedScan` scales **quadratically**: doubling zones and deliveries roughly quadruples the time. `GroupByDictionary` scales **linearly**: the single pass over deliveries dominates, and the subsequent lookups are negligible.

At 500 vehicles (corresponding to 5000 deliveries and ~30 zones in the test dataset), the ratio is roughly **45x**. In a real dispatcher with hundreds of zones, the gap would be even wider.

There is a trade-off, though: `GroupByDictionary` allocates more. The `ToDictionary` call creates an intermediate data structure that `RepeatedScan` does not need. In this case the trade-off is clearly favorable — a few extra KB of allocations in exchange for an order of magnitude in time. But it is worth noting: optimization is never "free" on every axis simultaneously.

This pattern is the in-memory equivalent of what a database does with indexes. Nobody would dream of running a SQL query without an index on a table with thousands of rows. Yet in application code, nested `.Where()` calls do exactly that. The rule is the same: if you need to look something up more than once in the same collection, **build the index once**.

---

## Benchmark 3: Intermediate Allocations vs Lazy Pipeline

This benchmark tackles a different theme from the algorithmic complexity errors: the **cost of intermediate allocations** in LINQ chains. It corresponds to part of **error 4** from the previous article.

### The Contenders

```csharp
// src/LinqDeepDive.Benchmarks/Benchmarks/AllocationsVsForeachBenchmark.cs

[Benchmark(Baseline = true)]
public List<Delivery> IntermediateToList()
{
    // Three intermediate .ToList() calls: materializes at every step
    return _data.Deliveries
        .Where(d => d.WeightKg > 100)
        .ToList()                                   // allocates list 1
        .Where(d => d.Status == DeliveryStatus.Pending)
        .ToList()                                   // allocates list 2
        .OrderByDescending(d => d.WeightKg)
        .ToList();                                  // allocates list 3
}

[Benchmark]
public List<Delivery> LazyPipeline()
{
    // Lazy pipeline: only one .ToList() at the end
    return _data.Deliveries
        .Where(d => d.WeightKg > 100)
        .Where(d => d.Status == DeliveryStatus.Pending)
        .OrderByDescending(d => d.WeightKg)
        .ToList();                                  // allocates only once
}
```

The difference looks trivial: removing two intermediate `.ToList()` calls. But each `ToList()` materializes the entire sequence into a new list, allocating heap memory and copying references.

### Results

> Indicative results on .NET 8 — run the benchmarks from the repo for numbers on your own machine.

| Method | VehicleCount | Mean | Allocated |
|--------|-------------|------|-----------|
| IntermediateToList | 50 | 6.8 us | 14.2 KB |
| LazyPipeline | 50 | 4.1 us | 5.6 KB |
| IntermediateToList | 200 | 52.3 us | 98.4 KB |
| LazyPipeline | 200 | 34.7 us | 38.1 KB |
| IntermediateToList | 500 | 178.6 us | 241.8 KB |
| LazyPipeline | 500 | 112.4 us | 94.6 KB |

### The Key Point

The message here is not "LINQ is slow." The message is: **intermediate lists** are the real cost. The lazy pipeline does exactly the same logical work — same filters, same ordering — but allocates roughly **60% less memory**. The time difference is smaller (1.5–1.6x), but under sustained load those extra allocations mean more frequent GC collections.

This benchmark also includes two illuminating comparisons:

```csharp
// .Count() > 0 vs .Any() — early exit at the semantic level
[Benchmark]
public bool CountGreaterZero()
    => _data.Deliveries
        .Where(d => d.Requirements.Any(r => r.Type == "HazMat"))
        .Count() > 0;

[Benchmark]
public bool AnyEarlyExit()
    => _data.Deliveries
        .Any(d => d.Requirements.Any(r => r.Type == "HazMat"));
```

`.Count() > 0` enumerates **the entire** sequence and then checks whether the count is positive. `.Any()` stops at the **first element** found. With 5000 deliveries where only a handful have "HazMat" requirements, the difference is an order of magnitude.

The same principle applies to `.OrderByDescending().First()` vs `.MaxBy()`:

```csharp
// OrderBy + First: O(n log n) to find the maximum
[Benchmark]
public Delivery OrderByFirst()
    => _data.Deliveries
        .Where(d => d.Status == DeliveryStatus.Pending)
        .OrderByDescending(d => d.WeightKg)
        .First();

// MaxBy: O(n), single pass
[Benchmark]
public Delivery MaxByLinear()
    => _data.Deliveries
        .Where(d => d.Status == DeliveryStatus.Pending)
        .MaxBy(d => d.WeightKg)!;
```

`OrderByDescending` sorts the entire sequence at O(n log n) complexity and allocates an internal buffer. `MaxBy` (introduced in .NET 6) traverses the sequence exactly once at O(n) without the intermediate sort buffer. To find a single extreme value, sorting is wasteful.

---

## Benchmark 4: The Hidden Cost of AsParallel

The last benchmark addresses a particularly insidious antipattern: using `AsParallel()` on collections where the parallelization overhead exceeds the benefit.

### The Contenders

```csharp
// src/LinqDeepDive.Benchmarks/Benchmarks/AsParallelBenchmark.cs

[Benchmark(Baseline = true)]
public List<(int VehicleId, int DeliveryId)> SequentialNesting()
{
    var pendingByZone = _data.Deliveries
        .Where(d => d.Status == DeliveryStatus.Pending)
        .ToLookup(d => d.DestinationZoneId);

    var restrictionsByZoneType = _data.Restrictions
        .ToLookup(r => (r.ZoneId, r.VehicleType));

    return _data.Vehicles
        .Where(v => v.IsAvailable)
        .SelectMany(v =>
        {
            var zoneDeliveries = pendingByZone[v.CurrentZoneId];
            var zoneRestrictions = restrictionsByZoneType[
                (v.CurrentZoneId, v.Type)];

            return zoneDeliveries
                .Where(d => !zoneRestrictions
                    .Any(r => r.BlockedSlot.Overlaps(d.PreferredSlot)))
                .Select(d => (VehicleId: v.Id, DeliveryId: d.Id));
        })
        .ToList();
}

[Benchmark]
public List<(int VehicleId, int DeliveryId)> ParallelNesting()
{
    // Same code, with AsParallel() before SelectMany
    // ... identical but with .AsParallel() after the .Where()
}
```

The parallel version adds a single `.AsParallel()` call at the entry point of the `SelectMany`. The idea seems reasonable: each vehicle is evaluated independently, the work is parallelizable.

### Results

> Indicative results on .NET 8 — run the benchmarks from the repo for numbers on your own machine.

| Method | VehicleCount | Mean | Gen0 | Allocated |
|--------|-------------|------|------|-----------|
| SequentialNesting | 200 | 148.2 us | 12.2 | 51.3 KB |
| ParallelNesting | 200 | 287.4 us | 18.7 | 142.6 KB |
| SequentialNesting | 500 | 412.8 us | 34.1 | 142.8 KB |
| ParallelNesting | 500 | 486.3 us | 42.5 | 318.7 KB |

### Where the Time Goes

`AsParallel()` has a **fixed cost** paid regardless of the amount of work:

* **Partitioning**: dividing the sequence into chunks for different threads
* **Task scheduling**: creating and coordinating tasks in the thread pool
* **Result synchronization**: collecting partial outputs in the correct order (or arbitrary order with `AsUnordered`)
* **Extra allocations**: buffers for each partition, synchronization objects

With lightweight work per element — a few lookups in pre-indexed structures — that fixed cost **dominates**. The parallel version is slower than the sequential one, and allocates two to three times as much memory.

### When AsParallel Actually Helps

`AsParallel` becomes advantageous when the work per element is **computationally heavy**: complex mathematical calculations, blocking I/O, image processing. For lightweight operations like dictionary lookups or simple comparisons, the coordination cost outweighs the parallelization benefit.

A practical rule of thumb: if the lambda body takes less than a few microseconds per element, `AsParallel` will almost certainly be slower. If it takes milliseconds, it is worth trying.

There is also a frequently overlooked aspect: **thread safety**. `AsParallel` executes the lambda on different threads. If the lambda accesses shared mutable state — a counter, a non-thread-safe list, a dictionary — the result may be correct 99% of the time and wrong in the 1% that is hardest to debug. Sequential code does not have this problem.

---

## The Decision Matrix

After four benchmarks, we can build a practical guide. Not every line of LINQ needs optimizing — readability has real value in terms of maintenance and debugging.

| Context | LINQ OK? | Why |
|---------|----------|-----|
| Startup / initialization (once) | Yes | Readability outweighs performance |
| CRUD business logic | Yes | The database is the bottleneck, not LINQ |
| Building indexes on in-memory data | Depends | With cardinality > 500, consider GroupBy/ToLookup |
| High-throughput hot path | Depends | Measure allocations with `[MemoryDiagnoser]` |
| Tight loop over large data | No | foreach with break wins for early exit and zero allocations |
| Small collections + AsParallel | No | Coordination overhead exceeds the benefit |

### The Message

Do not rewrite everything in `foreach`. That would be a mistake in the opposite direction. Most application code **is not a hot path**. What is needed is:

1. **Identify** hot paths with a profiler
2. **Measure** with BenchmarkDotNet before touching the code
3. **Optimize** only where the numbers justify it
4. **Validate** that the optimization produced the expected improvement

LINQ is an excellent expressiveness tool. The problem is never "LINQ itself" — it is **hidden algorithmic complexity** (repeated scans, linear lookups) and **unnecessary allocations** (intermediate materializations, pointless parallelism).

In other words: the next time someone says "LINQ is too slow" in a code review, the right answer is not "rewrite it in foreach." It is "open BenchmarkDotNet and show me the numbers."

---

## Conclusions

The benchmarks in this article tell a consistent story:

* **List vs HashSet**: same syntax, up to 63x difference. The data structure type matters more than the LINQ expression.
* **Scan vs GroupBy**: building an index before the loop transforms quadratic complexity into linear. The ratio grows with the dataset.
* **Intermediate allocations**: `.ToList()` in the middle of a pipeline is the silent enemy. The lazy pipeline allocates 60% less. And operators like `.Any()` and `.MaxBy()` eliminate unnecessary work by construction.
* **AsParallel**: on lightweight operations with collections under 500 elements, parallelism is counterproductive. Coordination costs more than the work itself.

All benchmarks are runnable from the project repository:

[https://github.com/monte97/dotnet-linq-demo](https://github.com/monte97/dotnet-linq-demo)

The project lives in `src/LinqDeepDive.Benchmarks/`. To run the benchmarks on your own machine:

```bash
cd src/LinqDeepDive.Benchmarks
dotnet run -c Release
```

Now you know *how much* it costs. But *why* does it cost exactly that? In the next article we open the hood: what does the compiler generate when you write a `.Where()`? State machines, iterators, closures — the code you never wrote but that runs on every LINQ call.

## Resources

* **BenchmarkDotNet Documentation**: [BenchmarkDotNet Docs](https://benchmarkdotnet.org/articles/overview.html)
* **Series demo repository**: [dotnet-linq-demo](https://github.com/monte97/dotnet-linq-demo)
* **Performance best practices .NET**: [Microsoft Docs - Performance](https://learn.microsoft.com/en-us/dotnet/core/performance/)
* **MemoryDiagnoser deep dive**: [BenchmarkDotNet Memory Diagnoser](https://benchmarkdotnet.org/articles/configs/diagnosers.html)
