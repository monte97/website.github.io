---
title: "4 LINQ Mistakes I Found in Production (And How They Cost 1000x)"
date: 2026-02-21T08:00:00.000Z
description: "Four common LINQ patterns that turn linear operations into quadratic ones. Analysis of real cases from a commercial fleet dispatch service on .NET 8."
pillar: progettare
category: system-design
tags:
  - LINQ
  - CSharp
  - DotNet
  - Performance
  - HashSet
  - ToLookup
lang: en
reviewed: machine
series: linq
seriesOrder: 10
---

A few months ago I did a performance audit on a dispatch service for a commercial vehicle fleet. The system manages hundreds of deliveries a day and decides in real time which vehicle to assign to each new order, respecting constraints on zone, capacity, time window, and cargo type.

To guarantee sub-100ms response times, the entire fleet lives in memory: vehicles, drivers, deliveries, zones, and constraints. The database is read at startup; during operation, everything goes through cache. The code worked. Assignments produced correct results. But with large fleets (400+ vehicles, 2000+ constraints, 5000+ deliveries), the initialization operations and load spikes were blowing the latency budget.

The profiler revealed four LINQ patterns that, individually, seemed reasonable. Together, they turned linear operations into quadratic ones — or worse.

---

## The Domain: Commercial Fleet Dispatch

Before diving into the individual mistakes, it helps to have an overview of the entities involved. The service operates on a relatively simple domain model, but the cardinalities make every algorithmic choice significant.

| Entity | Description | Cardinality |
|--------|-------------|-------------|
| `Vehicle` | Fleet vehicle (Van, Truck, Bike) | 50-500 |
| `Driver` | Driver with licenses and qualifications | 50-500 |
| `Delivery` | Delivery to be assigned or already assigned | 200-5000 |
| `Zone` | Geographic zone (province, postcode, restricted area) | 20-200 |
| `Restriction` | Constraint on vehicle type per zone and time window | 100-2000 |
| `TimeSlot` | Time window (start-end) | 5 standard |
| `DeliveryRequirement` | Specific requirement of a delivery (Refrigerated, Fragile, HazMat) | 500-5000 |

The relationships between entities follow this schema:

```text
Vehicle ──── Driver             (1:1 per shift)
Vehicle ──── Zone               (N:M — covered zones)
Vehicle ──── Restriction        (via Type + Zone)
Delivery ──── Zone              (N:1 — destination zone)
Delivery ──── DeliveryRequirement  (1:N — delivery requirements)
Zone ──── Restriction           (1:N — zone constraints)
```

With 500 vehicles, 2000 constraints, and 5000 deliveries, any operation that scans the entire collection for each element of another collection generates millions of comparisons. Here is where they hide.

---

## Mistake 1: `List.Contains()` inside `.Where()` — The Invisible O(n²)

### The Problem

The first problematic pattern involves filtering vehicles currently located in zones with active restrictions. The scenario is simple: given a list of restricted zones, find all vehicles currently positioned in those zones.

The original code looked perfectly harmless:

```csharp
// Restricted zones extracted as List<string>
var restrictedZoneIds = zones
    .Where(z => z.IsRestricted)
    .Select(z => z.Id)
    .ToList();

// For each vehicle, check whether its zone is in the list
var vehiclesInRestrictedZones = vehicles
    .Where(v => restrictedZoneIds.Contains(v.CurrentZoneId))
    .ToList();
```

The code compiles, passes code review, and produces correct results. But it hides a computational cost that grows non-linearly.

### Why `List.Contains` is O(n)

When you call `.Contains()` on a `List<T>`, the runtime has no choice but to scan through elements one by one until it finds a match or reaches the end of the list. There is no index, no hash structure. It is a pure **linear scan**.

Think of searching for a name in an unsorted phone book: you have to read each line from top to bottom until you find the right one. With 6 restricted zones the cost is imperceptible. But the pattern becomes dangerous when the lookup list grows.

In a more realistic scenario for the same service, the filtering operates not on 6 zones but on hundreds of IDs. Consider the case of filtering 2000 restrictions by checking whether their `ZoneId` belongs to a list of 700 zones covered by the active fleet:

- **2000 restrictions** to scan
- For each one, `.Contains()` on a list of **700 IDs**
- Worst case: **2000 × 700 = 1,400,000 comparisons**

The outer `.Where()` is O(n). The inner `.Contains()` is O(m). The total is **O(n × m)** — quadratic complexity hidden behind two lines of declarative code.

### The Fix: `ToHashSet()`

The fix is a single word: `ToHashSet()` instead of `ToList()`.

```csharp
// Same zones, but as a HashSet — O(1) lookup
var restrictedZoneIds = zones
    .Where(z => z.IsRestricted)
    .Select(z => z.Id)
    .ToHashSet();

// Now every Contains is O(1) instead of O(n)
var vehiclesInRestrictedZones = vehicles
    .Where(v => restrictedZoneIds.Contains(v.CurrentZoneId))
    .ToList();
```

A `HashSet<T>` maintains an internal **hash table**: when you call `.Contains()`, the runtime computes the element's hash, determines the corresponding bucket, and checks for membership in constant time — **O(1)** amortized, regardless of the collection size.

Back to the phone book analogy: it is like switching from an unsorted list to a directory indexed by letter. You no longer scan every line — you go directly to the right section.

### The Insidious Variant: Lazy IEnumerable Re-enumerated

An even subtler variant exists. When the lookup collection is not materialized, every `.Contains()` call re-executes the entire LINQ pipeline from scratch:

```csharp
// Select() returns a lazy IEnumerable — no materialization
var completedIds = deliveries.Select(d => d.Id);

// Every call to completedIds.Contains() re-runs the Select from the start
var pending = allDeliveries.FindAll(d => !completedIds.Contains(d.Id));
```

Here the cost is not just O(n × m): each `.Contains()` re-enumerates the entire `IEnumerable`, recomputing the `.Select()` projection from zero. With 5000 total deliveries and 3000 already completed, that yields **5000 × 3000 = 15 million** operations, each including execution of the delegate inside `.Select()`.

The fix is the same, but requires an extra mental step — always **materialize** before using as a lookup:

```csharp
// Always materialize before lookup
var completedIds = deliveries.Select(d => d.Id).ToHashSet();
var pending = allDeliveries.Where(d => !completedIds.Contains(d.Id)).ToList();
```

### Impact

From ~1.4 million comparisons to ~2000 (one per restriction, with O(1) lookup). Filtering time drops from hundreds of milliseconds to under 1ms.

### Practical Rule

> If you use `.Contains()` on a collection inside a `.Where()`, ask yourself: is it a `HashSet` or a `List`? The syntax is identical. The cost is not.

---

## Mistake 2: Repeated Scan inside `ToDictionary` — The Index That Isn't There

### The Problem

The second pattern involves building lookup structures at service startup. The goal is to create dictionaries that allow fast answers to questions like "how many pending deliveries are there for this zone?".

The original code used `ToDictionary` with a lambda that, for every zone, scanned **all** deliveries:

```csharp
// O(zones * deliveries) — rescans the entire list for each zone
var pendingPerZone = zones.Select(z => new
{
    Zone = z.Name,
    PendingCount = deliveries
        .Count(d => d.DestinationZoneId == z.Id
                  && d.Status == DeliveryStatus.Pending)
}).ToList();
```

### The Database Analogy

For anyone familiar with relational databases, this pattern is the exact equivalent of a query with no index, executed N times. Imagine a `deliveries` table with no index on `DestinationZoneId`. For each zone, the database would need a **full table scan** of all deliveries.

With 20 zones and 5000 deliveries, the cost is **20 × 5000 = 100,000** comparisons. Not catastrophic, but the same pattern explodes in more complex contexts. Consider building a constraint-per-vehicle index:

```csharp
// For each vehicle, filters ALL constraints — 500 × 2000 = 1M comparisons
var restrictionsByVehicle = vehicles.ToDictionary(
    v => v.Id,
    v => restrictions
        .Where(r => r.VehicleType == v.Type
                  && r.ZoneId == v.CurrentZoneId)
        .ToList()
);
```

The lambda in the **value selector** of `ToDictionary` executes once per vehicle. Each execution scans the entire constraint list. With 500 vehicles and 2000 constraints: **1,000,000 comparisons** to build a dictionary.

### The Fix: `GroupBy` + `ToDictionary` (Single Scan)

The idea is to invert the approach: instead of looking up constraints *for each* vehicle, group the constraints *once* and then assemble the results.

```csharp
// O(deliveries) — a single scan, then O(1) lookup per zone
var pendingByZone = deliveries
    .Where(d => d.Status == DeliveryStatus.Pending)
    .GroupBy(d => d.DestinationZoneId)
    .ToDictionary(g => g.Key, g => g.Count());

// Assembly: O(zones) with O(1) lookup
var pendingPerZone = zones.Select(z => new
{
    Zone = z.Name,
    PendingCount = pendingByZone.GetValueOrDefault(z.Id, 0)
}).ToList();
```

The delivery scan happens **once**. `GroupBy` creates the groupings in a single pass, and the final `ToDictionary` turns them into a structure with O(1) lookup. Total cost goes from O(zones × deliveries) to **O(deliveries + zones)**.

### `ToLookup` vs `GroupBy` + `ToDictionary`

For scenarios with more complex relationships, `ToLookup` is often preferable to `GroupBy` + `ToDictionary`. An [`ILookup<TKey, TElement>`](https://learn.microsoft.com/dotnet/api/system.linq.ilookup-2) is essentially an immutable dictionary where each key maps to a collection of values — and unlike a `Dictionary`, it returns an **empty sequence** for missing keys rather than throwing an exception.

Consider a scenario with a compound relationship: for each vehicle, find both standard restrictions (applying to all vehicles of that type in that zone) and any specific to that individual vehicle:

```csharp
// Two indexes built in a single pass each
var restrictionsByZoneAndType = restrictions
    .ToLookup(r => (r.ZoneId, r.VehicleType));

// Assembly: O(vehicles) with O(1) lookup per (zone, type) pair
var restrictionsByVehicle = vehicles.ToDictionary(
    v => v.Id,
    v =>
    {
        // Direct lookup on the (zone, type) pair — O(1)
        var applicable = restrictionsByZoneAndType[(v.CurrentZoneId, v.Type)];
        return applicable.ToList();
    }
);
```

The compound key using a tuple `(ZoneId, VehicleType)` allows indexing on **two dimensions simultaneously**. `ToLookup` natively supports any type as a key, provided it implements `GetHashCode` and `Equals` — and C# value tuples do this automatically.

### Impact

From ~1 million iterations to ~2500 (one constraint scan + one lookup per vehicle). Index construction time drops from tens of milliseconds to under 1ms.

### Practical Rule

> If inside a `ToDictionary` you have a `.Where()` on another collection, you are doing a nested loop. `GroupBy` and `ToLookup` are the equivalent of creating an index before the query.

---

## Mistake 3: Triple Nesting — O(n³) in Three Lines of Code

### The Problem

This is the most dangerous mistake on the list, because the code **looks reasonable**. The scenario: for each available vehicle, find pending deliveries in its zone, and for each one verify that no restriction blocks that vehicle type in the requested time slot.

```csharp
// O(V * D * R) — three levels of nested iteration
var assignments = vehicles
    .Where(v => v.IsAvailable)
    .SelectMany(v => deliveries
        .Where(d => d.Status == DeliveryStatus.Pending
                 && d.DestinationZoneId == v.CurrentZoneId)
        .Where(d => !restrictions
            .Any(r => r.ZoneId == d.DestinationZoneId
                   && r.VehicleType == v.Type
                   && r.BlockedSlot.Overlaps(d.PreferredSlot)))
        .Select(d => new { VehicleId = v.Id, DeliveryId = d.Id }))
    .ToList();
```

Read declaratively, the code says exactly what it should do: "for each available vehicle, find deliveries in its zone that have no blocking restrictions." Three concepts, three levels of query. Very LINQ-idiomatic.

### Why It Is O(n³)

Count the iteration levels:

1. **Level 1**: loop over available vehicles (~200 out of 500)
2. **Level 2**: for each vehicle, scan *all* pending deliveries (~1000 out of 5000)
3. **Level 3**: for each vehicle-delivery pair, `.Any()` over *all* constraints (~2000)

Worst-case cost: **200 × 1000 × 2000 = 400,000,000** operations. In practice, the zone `.Where()` filter and the short-circuit of `.Any()` reduce the effective count, but even with generous reduction factors the result remains in the millions.

The `.Where()` inside `.Any()` is particularly insidious: it executes for potentially every vehicle-delivery combination, and every time it scans the entire constraint list. A full scan inside a full scan inside a loop. Three levels.

### The Fix: Pre-indexing in 4 Steps

The strategy is always the same: **build the indexes before the loop**, so that each lookup is O(1) rather than O(n).

```csharp
// Step 1: index pending deliveries by zone — O(D)
var pendingByZone = deliveries
    .Where(d => d.Status == DeliveryStatus.Pending)
    .ToLookup(d => d.DestinationZoneId);

// Step 2: index constraints by (zone, vehicle type) pair — O(R)
var restrictionsByZoneAndType = restrictions
    .ToLookup(r => (r.ZoneId, r.VehicleType));

// Step 3: assemble with O(1) lookups — O(V * D_zone * R_zone_type)
var assignments = vehicles
    .Where(v => v.IsAvailable)
    .SelectMany(v =>
    {
        // O(1) — lookup by zone, returns only deliveries for THAT zone
        var zoneDeliveries = pendingByZone[v.CurrentZoneId];

        // O(1) — lookup by pair, returns only the relevant constraints
        var zoneRestrictions = restrictionsByZoneAndType[
            (v.CurrentZoneId, v.Type)];

        return zoneDeliveries
            .Where(d => !zoneRestrictions
                .Any(r => r.BlockedSlot.Overlaps(d.PreferredSlot)))
            .Select(d => new { VehicleId = v.Id, DeliveryId = d.Id });
    })
    .ToList();
```

The fundamental difference: in the original code, every vehicle scanned *all* deliveries and *all* constraints. In the optimized version, `pendingByZone` returns only the deliveries in the current vehicle's zone, and `restrictionsByZoneAndType` returns only the constraints for that (zone, type) pair.

If 1000 pending deliveries are distributed across 20 zones, each vehicle sees on average **50 deliveries** instead of 1000. If 2000 constraints are distributed across 20 zones × 3 types, each pair has on average **~33 constraints** instead of 2000. The effective cost drops to **200 × 50 × 33 = 330,000** operations — three orders of magnitude less than the original.

### Impact

From seconds to milliseconds. `ToLookup` with a compound key (tuple) is the key enabler: it allows indexing on two dimensions simultaneously, turning a full scan into a direct lookup.

### Practical Rule

> Count the nesting levels. Loop + loop + Where = O(n³). The solution is always: build the index *before* the loop.

---

## Mistake 4: Unnecessary Allocations and Missing Early Exit — When `foreach` Wins

### The Pattern of Intermediate Allocations

The first three mistakes concern algorithmic complexity. The fourth is more subtle: it does not change the asymptotic complexity, but the **constant cost** of each operation. In the hot path — code executed thousands of times per minute during peak load — even small inefficiencies accumulate.

The original code built intermediate lists to answer questions that did not require materialization:

```csharp
// Three allocations to get a filtered and sorted list
var heavyDeliveries = deliveries
    .Where(d => d.WeightKg > 100)
    .ToList()                           // allocation 1
    .Where(d => d.Status == DeliveryStatus.Pending)
    .ToList()                           // allocation 2
    .OrderByDescending(d => d.WeightKg)
    .ToList();                          // allocation 3
```

Each intermediate `.ToList()` allocates a new `List<T>`, copies the elements, and applies pressure on the Garbage Collector. In this specific case, the first `ToList()` is entirely unnecessary: the two `.Where()` clauses can be chained in a single lazy pipeline, materializing only at the end.

### The Fix: Lazy Pipeline + Correct Operators

```csharp
// Lazy pipeline — materialize only at the end
var heavyDeliveries = deliveries
    .Where(d => d.WeightKg > 100)
    .Where(d => d.Status == DeliveryStatus.Pending)
    .OrderByDescending(d => d.WeightKg)
    .ToList(); // a single allocation
```

But the most important optimization concerns the operators chosen. Two frequent patterns in the dispatch service's hot path:

**`.Count() > 0` vs `.Any()`**: when you only want to know whether at least one element satisfies a condition, `.Any()` exits on the first match. `.Count()` scans the entire collection even if the first element already answers the question.

```csharp
// Count() scans the ENTIRE collection
var hasHazMat = deliveries
    .Where(d => d.Requirements.Any(r => r.Type == "HazMat"))
    .Count() > 0;

// Any() exits on the first match
var hasHazMat = deliveries
    .Any(d => d.Requirements.Any(r => r.Type == "HazMat"));
```

**`.OrderBy().First()` vs `.MaxBy()`**: when you only need the element with the maximum (or minimum) value, `OrderBy` sorts the entire collection in O(n log n), while [`MaxBy`](https://learn.microsoft.com/dotnet/api/system.linq.enumerable.maxby) (available since .NET 6) does a single scan in O(n):

```csharp
// OrderBy sorts everything — O(n log n) + allocation
var heaviest = deliveries
    .Where(d => d.Status == DeliveryStatus.Pending)
    .OrderByDescending(d => d.WeightKg)
    .ToList()
    .First();

// MaxBy — single O(n) scan, zero intermediate allocations
var heaviest = deliveries
    .Where(d => d.Status == DeliveryStatus.Pending)
    .MaxBy(d => d.WeightKg)!;
```

### When `foreach` Beats LINQ

In some cases, the most performant choice is to abandon LINQ in favor of an explicit `foreach`. Consider validating a vehicle-delivery assignment — a method called hundreds of times per minute:

```csharp
// LINQ version: 3 allocations for a boolean answer
public bool IsAssignmentValid(Vehicle vehicle, Delivery currentDelivery, List<Restriction> restrictions)
{
    var vehicleRestrictions = restrictions
        .Where(r => r.VehicleType == vehicle.Type)
        .ToList();                                           // allocation 1
    var zoneRestrictions = vehicleRestrictions
        .Where(r => r.ZoneId == vehicle.CurrentZoneId)
        .Select(r => r.BlockedSlot)
        .ToList();                                           // allocation 2

    return !zoneRestrictions.Any(slot =>
        slot.Overlaps(currentDelivery.PreferredSlot));
}
```

The `foreach` version eliminates all allocations and introduces **early exit** — if the first constraint already invalidates the assignment, there is no need to check the rest:

```csharp
// foreach version: zero allocations, early exit
public bool IsAssignmentValid(Vehicle vehicle, Delivery currentDelivery, List<Restriction> restrictions)
{
    foreach (var restriction in restrictions)
    {
        if (restriction.VehicleType != vehicle.Type) continue;
        if (restriction.ZoneId != vehicle.CurrentZoneId) continue;

        if (restriction.BlockedSlot.Overlaps(currentDelivery.PreferredSlot))
            return false; // early exit — no need to check further
    }
    return true;
}
```

In the dispatch service, early exit skipped on average **60% of evaluations**: in most cases, the first or second constraint already determined the result.

### The `AsParallel` Trap

One final pattern that emerged from the audit: using `AsParallel()` on small collections. Parallelization introduces overhead for partitioning, scheduling, and thread synchronization. On collections with fewer than 500 elements and negligible per-element work, this overhead **exceeds the benefit**:

```csharp
// AsParallel on small collections — overhead exceeds the benefit
var results = vehicles
    .AsParallel()
    .ToDictionary(
        v => v.Id,
        v => IsAssignmentValid(v, restrictions));
```

The sequential version with a pre-allocated `Dictionary` is faster:

```csharp
// Sequential with pre-allocation — faster for collections < 500
var results = new Dictionary<int, bool>(capacity: vehicles.Count);

foreach (var vehicle in vehicles)
{
    results[vehicle.Id] = IsAssignmentValid(vehicle, restrictions);
}
```

### Practical Rule

> LINQ is not always the answer. In the hot path, every `.ToList()` is an allocation, every `.Where()` creates an iterator. A `foreach` with `break` is more verbose but sometimes the right choice. And `.AsParallel()` only pays off when the work per element is significant — measure before parallelizing.

---

## The Common Thread

A summary of the four mistakes and their respective fixes:

| # | Pattern | Complexity Before | Fix | Complexity After |
|---|---------|-------------------|-----|------------------|
| 1 | `List.Contains()` in `.Where()` | O(n × m) | `ToHashSet()` | O(n) |
| 2 | `.Where()` inside `ToDictionary` | O(n × m) | `GroupBy` / `ToLookup` | O(n + m) |
| 3 | Triple nesting `foreach` + `Where` | O(n × m × k) | Pre-indexing with compound `ToLookup` | O(n + m + V × avg_D × avg_R) |
| 4 | Intermediate allocations, no early exit | O(n) with k allocations | `foreach` + `break`, `Any()`, `MaxBy()` | O(n) with 0 allocations |

The common thread is this: **LINQ is declarative, but execution is imperative**. The same syntax — `.Contains()`, `.Where()`, `.Select()` — hides radically different costs depending on the underlying data structure. `.Contains()` on a `List` is O(n). `.Contains()` on a `HashSet` is O(1). The code looks identical. The profiler tells a different story.

The good news is that the fixes are almost always simple: `ToHashSet()`, `ToLookup()`, `GroupBy()`, or an explicit `foreach` when control flow is needed. This is not premature optimization — it is choosing the right data structure for the operation at hand.

---

## Next Steps

The complete example code is available in the public repository:

[https://github.com/monte97/dotnet-linq-demo](https://github.com/monte97/dotnet-linq-demo)

The repository contains the full domain model (`Vehicle`, `Driver`, `Delivery`, `Zone`, `Restriction`, `TimeSlot`, `DeliveryRequirement`), the four mistakes with their before/after versions, and a realistic data generator using [Bogus](https://github.com/bchavez/Bogus) to reproduce the same cardinalities.

Now you know *what* to fix. But how much do these patterns actually cost? The next article puts numbers on it with [BenchmarkDotNet](https://benchmarkdotnet.org/) on .NET 8: allocations, throughput, latency distributions. We will see whether the theoretical differences hold up under rigorous measurement — and find a few surprises.

## Useful Resources

- **HashSet\<T\> documentation**: [Microsoft Learn — HashSet](https://learn.microsoft.com/dotnet/api/system.collections.generic.hashset-1)
- **ILookup\<TKey, TElement\>**: [Microsoft Learn — ILookup](https://learn.microsoft.com/dotnet/api/system.linq.ilookup-2)
- **MaxBy / MinBy (.NET 6+)**: [Microsoft Learn — Enumerable.MaxBy](https://learn.microsoft.com/dotnet/api/system.linq.enumerable.maxby)
- **BenchmarkDotNet**: [benchmarkdotnet.org](https://benchmarkdotnet.org/)
