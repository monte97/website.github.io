---
title: "What the Compiler Generates When You Write a Where() — State Machines, Iterators, and IL"
seoTitle: "LINQ: state machines, iterators and IL"
date: 2026-03-07T08:00:00.000Z
description: "Behind every .Where() lives a compiler-generated state machine. In .NET 8 Enumerable.Where uses specialized iterators, and a cast turns them off."
pillar: progettare
category: system-design
tags:
  - LINQ
  - CSharp
  - DotNet
  - Compilatore
  - StateMachine
  - ILSpy
  - SharpLab
lang: en
reviewed: machine
series: linq
seriesOrder: 30
---

In the first two articles we saw *what* goes wrong and *how much* it costs. We measured the difference between `List.Contains` and `HashSet.Contains`, quantified the weight of intermediate allocations, and watched `GroupBy` and `ToLookup` transform quadratic operations into linear ones. The numbers were clear, the fixes immediate.

But one question remains: *why* does LINQ cost exactly what it costs? When you write `.Where(x => x > 5)`, the C# compiler generates an entire class you never see in your source code. A state machine with private fields, a switch/case, and a "pause and resume" protocol that manages lazy evaluation element by element. Let's open it up.

---

## The Three Pillars: Why LINQ Works the Way It Does

Before we get into the state machine, it is worth understanding the three language mechanisms that make LINQ syntax possible. This is not a tutorial on each one, but the context you need to understand what happens behind the scenes.

### Extension Methods

The first surprise when looking at generated code: `IEnumerable<T>` declares *no* LINQ methods. There is no `Where`, no `Select`, no `OrderBy` on the interface. They are all **extension methods** defined in the static class `System.Linq.Enumerable`.

```csharp
// When you write:
var active = restrictions.Where(r => r.IsActive);

// The compiler transforms it to:
var active = Enumerable.Where(restrictions, r => r.IsActive);
```

The fluent syntax that makes LINQ readable is syntactic sugar. The compiler resolves the call by looking for a static `Where` method whose first parameter is `this IEnumerable<T>`, in the `Enumerable` class imported via `using System.Linq`.

This has an important practical consequence: extension method resolution happens at **compile time**. There is no virtual dispatch, no interface overhead for method resolution. The cost is in the method body, not in the call.

### Lambda Expressions

The second pillar is the predicate we pass to `.Where()`. That `r => r.IsActive` is not magic: the compiler transforms it into concrete code.

```csharp
Func<Restriction, bool> predicate = r => r.IsActive;

// If the lambda captures no outer variables, the compiler generates:
// - A static (or instance) method on the current class
// - A cached delegate (from C# 10+, .NET 6+)

// If the lambda captures local variables:
Func<Restriction, bool> predicate = r => r.VehicleId == vehicleId;
// The compiler generates:
// - A class with a field for vehicleId
// - An instance method on that class
// - An allocation for every invocation of the containing method
```

The connection to article 1 is direct: in the fleet dispatcher, lambdas inside `.Where()` often captured local variables like `vehicleId` or `zoneId`. Each capture meant a compiler-generated class and a heap allocation. In the hot path, with thousands of calls per minute, those allocations accumulated.

### Anonymous Types

The third pillar covers projections. When you use `.Select()` to create an object on the fly, the compiler generates a real class.

```csharp
var projected = deliveries.Select(d => new { d.Id, d.ZoneId, d.Priority });

// The compiler generates a class equivalent to:
// internal sealed class <>f__AnonymousType0<TId, TZoneId, TPriority>
// {
//     public TId Id { get; }
//     public TZoneId ZoneId { get; }
//     public TPriority Priority { get; }
//     // + constructor, Equals(), GetHashCode(), ToString()
// }
```

The generated class is immutable (readonly properties), implements `Equals` and `GetHashCode` based on values (value equality), and has a readable `ToString`. It is not a dynamic type: the compiler knows the structure at compile time and generates typed code. But it is still one allocation per projected element.

These three mechanisms, combined, let you write `restrictions.Where(r => r.IsActive).Select(r => r.VehicleId)` and get a type-safe, lazy, composable pipeline. The price is the code the compiler generates behind the scenes.

---

## The State Machine: The Heart of `yield return`

Here is the central piece. When you write a method with `yield return`, the compiler does not execute it like a normal method. It transforms it into a **state machine**: a class that implements both `IEnumerable<T>` and `IEnumerator<T>`, with a `_state` field that tracks "where we left off."

### The Code You Write

A simplified version of `Where` with `yield return` is surprisingly brief:

```csharp
public static IEnumerable<T> Where<T>(
    this IEnumerable<T> source, Func<T, bool> predicate)
{
    foreach (var item in source)
    {
        if (predicate(item))
            yield return item;
    }
}
```

Five lines of logic. But the compiler transforms them into something very different.

### The Code the Compiler Generates

Pasting that method into [SharpLab.io](https://sharplab.io) and selecting "C#" as output reveals the full transformation. A simplified version of the generated class looks like this:

```csharp
// Simplified version of what the compiler generates
private sealed class WhereIterator<T> : IEnumerable<T>, IEnumerator<T>
{
    private int _state;           // where we are in the state machine
    private T _current;           // the current element
    private IEnumerator<T> _enumerator;
    private Func<T, bool> _predicate;
    private IEnumerable<T> _source;

    public T Current => _current;

    public bool MoveNext()
    {
        switch (_state)
        {
            case 0:
                _enumerator = _source.GetEnumerator();
                _state = 1;
                goto case 1;
            case 1:
                while (_enumerator.MoveNext())
                {
                    if (_predicate(_enumerator.Current))
                    {
                        _current = _enumerator.Current;
                        return true;    // "pause" here
                    }
                }
                _state = -1;           // end of sequence
                return false;
        }
        return false;
    }

    public void Dispose() => _enumerator?.Dispose();
}
```

The pattern is clear: each `yield return` in the source code becomes a "pause" point in the state machine. When the caller invokes `MoveNext()`, execution resumes from the last pause point, evaluates the next element, and pauses again. State is preserved between calls via the object's fields.

This is the mechanism that makes LINQ **lazy**: no element is produced until someone calls `MoveNext()`. And when they do, only one element is produced at a time.

### The Execution Ping-Pong

The concept becomes concrete when you observe a multi-operator pipeline. Take an example from the dispatcher domain:

```csharp
var result = restrictions
    .Where(r => r.IsActive)
    .Select(r => r.VehicleId)
    .ToList();
```

Execution is not "filter everything, then project everything, then collect everything." It is a per-element ping-pong:

```text
ToList()               Select(r => r.VehicleId)    Where(r => r.IsActive)
  |                          |                            |
  |-- MoveNext() ---------->|                            |
  |                          |-- MoveNext() ------------>|
  |                          |                            |-- restrictions[0]
  |                          |                            |-- IsActive? yes
  |                          |<-- restrictions[0] --------|
  |<-- VehicleId = 42 ------|                            |
  |                                                      |
  |-- MoveNext() ---------->|                            |
  |                          |-- MoveNext() ------------>|
  |                          |                            |-- restrictions[1]
  |                          |                            |-- IsActive? no, skip
  |                          |                            |-- restrictions[2]
  |                          |                            |-- IsActive? yes
  |                          |<-- restrictions[2] --------|
  |<-- VehicleId = 91 ------|                            |
```

One element at a time traverses the entire pipeline before the next one begins its journey. This is **streaming** (lazy evaluation). The `ToList()` at the end is the trigger that starts the process by calling `MoveNext()` on the first iterator in the chain, which in turn calls `MoveNext()` on the next, and so on.

### Streaming vs Non-Streaming

Not all LINQ operators can work in streaming mode. Some must necessarily read all elements before they can emit even one.

| **Type** | **Operators** | **Behavior** |
| :------- | :------------ | :----------- |
| **Streaming (lazy)** | `Where`, `Select`, `Take`, `Skip`, `SelectMany`, `Distinct` | One element at a time traverses the pipeline |
| **Non-streaming (eager)** | `OrderBy`, `GroupBy`, `Reverse` | Buffer everything before emitting the first result |
| **Trigger** | `ToList`, `ToArray`, `Count`, `First`, `foreach` | Force pipeline execution |

This explains a behavior observed in article 2: `OrderBy` has a fixed cost regardless of how many elements are needed *after* it. Even if the pipeline continues with `.Take(5)`, `OrderBy` must first read and sort *all* elements in the source. The `OrderBy` state machine buffers the entire sequence in its initial `MoveNext()`, and only then begins emitting sorted elements one at a time.

The same applies to `GroupBy`, which in error 2 from article 1 was used to build indexes: it must read everything to be able to group, because it cannot know in advance whether more elements will arrive for an already-existing group.

---

## Expression Trees vs Delegates

So far we have talked about `IEnumerable<T>` and code that executes in memory. But the same LINQ syntax can have a completely different fate.

### The Same Syntax, Two Destinies

```csharp
// DELEGATE: compiled code, directly executable
Func<Vehicle, bool> compiled = v => v.Capacity > 1000;

// EXPRESSION TREE: data structure, translatable by a provider
Expression<Func<Vehicle, bool>> expression = v => v.Capacity > 1000;
```

The difference is in the type. When the compiler encounters a lambda assigned to `Func<T, bool>`, it generates executable IL code. When the same lambda is assigned to `Expression<Func<T, bool>>`, it generates code that *constructs a tree* representing the lambda as a data structure.

### What an Expression Tree Contains

An expression tree is an **AST** (Abstract Syntax Tree) of the lambda. For `v => v.Capacity > 1000`, the structure is:

```text
BinaryExpression (GreaterThan)
+-- Left:  MemberExpression (v.Capacity)
|          +-- Expression: ParameterExpression (v)
+-- Right: ConstantExpression (1000)
```

This structure is inspectable and traversable at runtime:

```csharp
Expression<Func<Vehicle, bool>> expression = v => v.Capacity > 1000;

var body = expression.Body as BinaryExpression;
Console.WriteLine(body.NodeType);    // GreaterThan
Console.WriteLine(body.Left);       // v.Capacity
Console.WriteLine(body.Right);      // 1000
```

A provider (like Entity Framework) can traverse this tree and translate it into a different language, typically SQL. This is the mechanism that makes it possible to write C# queries that execute on the database.

### IEnumerable vs IQueryable

The practical distinction manifests in the two interfaces:

```csharp
// IEnumerable -> Enumerable.Where -> accepts Func -> executes in C#
IEnumerable<Vehicle> inMemory = vehicles
    .Where(v => v.Capacity > 1000);

// IQueryable -> Queryable.Where -> accepts Expression -> translated by provider
IQueryable<Vehicle> fromDb = dbContext.Vehicles
    .Where(v => v.Capacity > 1000);
```

The syntax is identical. The compiler chooses the right method based on the source type. If the source implements `IQueryable<T>`, `Queryable.Where` is invoked, which accepts an `Expression`. If it only implements `IEnumerable<T>`, `Enumerable.Where` is invoked, which accepts a `Func`.

In the context of the article 1 dispatcher, all work happens in memory on `IEnumerable<T>`: the fleet is loaded at startup and assignment decisions operate on the cache. But if the system needed to query the database for the initial vehicle load, the same LINQ code would shift from C# execution to SQL generation — provided the `IQueryable<T>` type is maintained throughout the pipeline.

### The IQueryable to IEnumerable Boundary

The critical point is where **materialization** happens: the transition from "translatable query" to "data in memory."

```csharp
// Problematic: ToList() mid-pipeline = "from here I execute in C#"
var result = dbContext.Vehicles
    .ToList()                                    // loads ALL vehicles into memory
    .Where(v => v.Capacity > 1000)               // filters in C#, not in SQL
    .Select(v => new { v.Id, v.Capacity });

// Correct: filter in SQL, materialize only the result
var result = dbContext.Vehicles
    .Where(v => v.Capacity > 1000)               // translated to WHERE Capacity > 1000
    .Select(v => new { v.Id, v.Capacity })       // translated to SELECT Id, Capacity
    .ToList();                                    // materializes only filtered results
```

In the first case, `.ToList()` forces materialization of the entire `Vehicles` table. From that point on, the pipeline operates on `List<Vehicle>` (which implements `IEnumerable<T>`, not `IQueryable<T>`), and filtering happens in C# with a full in-memory scan.

In the second case, the filter and projection stay in the expression tree and are translated to SQL. Only the filtered results cross the network.

### What Cannot Be Translated

Not all C# code is translatable to SQL. If the predicate contains logic the provider does not know how to map, you get a runtime exception.

```csharp
// The provider cannot translate arbitrary C# methods
dbContext.Vehicles
    .Where(v => CustomValidation(v))  // exception: cannot translate to SQL
    .ToList();

// Solution: move non-translatable logic after materialization
dbContext.Vehicles
    .Where(v => v.Capacity > 1000)               // translatable
    .ToList()                                      // materialize
    .Where(v => CustomValidation(v))               // executes in C#
    .ToList();
```

The rule is simple: before `.ToList()` (or any materialization trigger), use only expressions the provider can translate. After `.ToList()`, you are in `IEnumerable<T>` territory and any C# code is valid.

---

## Inside .NET 8 with ILSpy: Enumerable.Where Specializations

So far we have seen a simplified version using `yield return`. But the real implementation of `Enumerable.Where` in .NET 8 is more sophisticated. It does not use `yield return`: it has **hand-written specialized iterators** from the .NET team to optimize the most common cases.

### Three Iterators, Three Optimizations

Browsing the source of `System.Linq.Enumerable.Where` on [source.dot.net](https://source.dot.net/#System.Linq/System/Linq/Where.cs), you find this dispatch pattern:

```csharp
// Simplified from the actual .NET 8 source
public static IEnumerable<TSource> Where<TSource>(
    this IEnumerable<TSource> source, Func<TSource, bool> predicate)
{
    if (source is TSource[] array)
        return new WhereArrayIterator<TSource>(array, predicate);

    if (source is List<TSource> list)
        return new WhereListIterator<TSource>(list, predicate);

    return new WhereEnumerableIterator<TSource>(source, predicate);
}
```

Three distinct classes:

* **`WhereArrayIterator<T>`** — optimized for arrays. Accesses elements by index (`array[i]`), avoiding the `IEnumerator<T>` interface overhead. No virtual calls for `MoveNext()` and `Current`.

* **`WhereListIterator<T>`** — optimized for `List<T>`. Uses the struct enumerator `List<T>.Enumerator` which, being a value type, avoids the boxing and virtual dispatch typical of the `IEnumerator<T>` interface.

* **`WhereEnumerableIterator<T>`** — the generic fallback. Uses `GetEnumerator()` and the standard `MoveNext()`/`Current` protocol. The slowest of the three because it goes through the `IEnumerator<T>` interface with virtual dispatch on every iteration.

### Why It Matters: The Cast That Slows Things Down

This specialization has a direct practical implication. Passing a `List<Restriction>` to `.Where()`, the runtime picks `WhereListIterator<T>` and uses the optimized path. But if the same list is first cast to `IEnumerable<T>`, the concrete type is no longer recognizable and the runtime falls back to the generic path.

```csharp
var restrictions = new List<Restriction> { /* ... */ };

// Optimized path: WhereListIterator
var result1 = restrictions.Where(r => r.IsActive).ToList();

// Generic path: WhereEnumerableIterator
IEnumerable<Restriction> asEnumerable = restrictions;
var result2 = asEnumerable.Where(r => r.IsActive).ToList();
```

The performance difference is measurable, especially on large collections. `WhereListIterator` avoids the enumerator allocation and virtual calls, which on millions of iterations can make a real difference.

This also explains why method signatures matter. A method that accepts `IEnumerable<T>` as a parameter (even if the caller passes a `List<T>`) forces the generic path for all internal `.Where()` and `.Select()` calls. If performance is critical, accepting the concrete type `List<T>` or `T[]` lets LINQ use the optimized specializations.

### The Optimization Pipeline

Specializations do not stop at `Where`. `Select`, `Where.Select` (the combination), and other operators also have optimized paths. The .NET runtime recognizes common chains and merges them internally. For example, a `.Where().Select()` on an array does not create two separate iterators: the class `WhereSelectArrayIterator<TSource, TResult>` handles both operations in a single `MoveNext()`, reducing allocations and virtual calls.

This architecture is visible in detail at [source.dot.net](https://source.dot.net/#System.Linq/System/Linq/Where.cs) and inspectable locally with [ILSpy](https://github.com/icsharpcode/ILSpy). Navigating the `System.Linq` source code is one of the most instructive exercises for understanding how the framework balances API readability and implementation performance.

---

## Conclusions

We have opened the hood of LINQ and looked at the mechanisms that make it work:

1. **Extension methods**: LINQ does not exist on `IEnumerable<T>`. It is a collection of static methods in `System.Linq.Enumerable` that the compiler resolves at compile time. The fluent syntax is syntactic sugar.

2. **Lambdas and captures**: every lambda that captures local variables generates a class with fields. In the hot path, that means allocations. Non-capturing lambdas are cached by the compiler from .NET 6 onwards.

3. **State machine and `yield return`**: the heart of lazy evaluation. Each `yield return` becomes a pause point in a class implementing `IEnumerator<T>`. Execution is a ping-pong: one element at a time traverses the entire pipeline.

4. **Expression trees**: the same lambda syntax can generate executable code (`Func`) or a translatable data structure (`Expression`). `IEnumerable` executes in C#, `IQueryable` delegates to an external provider.

5. **Specializations in .NET 8**: the real implementation does not use `yield return`. It has dedicated iterators for arrays, `List<T>`, and the generic case, with optimizations that merge consecutive operators.

The common thread is one: LINQ syntax is declarative, but execution is imperative and depends on what the compiler and runtime generate behind the scenes. Knowing these mechanisms is not about rewriting everything in `foreach` — it is about knowing *where to look* when the profiler flags a problem.

You have seen the "ping-pong" between iterators, but only as a diagram. In the next article we make it *visible* — with OpenTelemetry and Grafana Tempo. We will see each element traverse the pipeline, operator by operator, on a distributed tracing dashboard.

---

## Resources

* **SharpLab.io**: [sharplab.io](https://sharplab.io) — paste C# code and see the compiler transformation in real time (IL, decompiled C#, AST)
* **source.dot.net**: [source.dot.net](https://source.dot.net) — the complete .NET runtime source, browsable and searchable. The starting point for exploring `System.Linq.Enumerable`
* **ILSpy**: [github.com/icsharpcode/ILSpy](https://github.com/icsharpcode/ILSpy) — open source decompiler for .NET assemblies. Useful for inspecting compiler-generated code in your own projects
