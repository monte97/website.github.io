# Tech Review — Da blocking poll a stream reattivi con Pekko Connectors Kafka

**Reviewer**: Claude Opus 4.6 (automated tech review)
**Date**: 2026-02-20
**Article**: `content/posts/kafka/pekko-streams-kafka/index.md`

---

## Summary

The article presents two refactoring patterns for moving from blocking Kafka poll loops inside Pekko actors to cleaner architectures: (1) `Source.queue` as a bridge between actors and a Kafka producer stream, and (2) dedicated consumer threads with shared `ConcurrentHashMap` state. The domain is a telemetry platform for construction equipment. The technical content is solid and well-reasoned, with several issues worth addressing.

---

## Issues

### P0 — Critical

**P0-1: `producer.send()` inside `.map()` is potentially blocking and fire-and-forget**

Location: lines 77-85, Pattern 1 `Source.queue` map stage.

Two problems:

1. **`producer.send()` can block**: Although `KafkaProducer.send()` is nominally asynchronous (adds to internal buffer and returns a `Future`), it can block in real scenarios: waiting for metadata update (up to `max.block.ms`, default 60s), buffer full (`buffer.memory` exhausted), or connectivity issues. Calling it inside `.map()` (a synchronous stage) blocks the materializer thread, contradicting the article's own premise ("don't block the dispatcher").

2. **The returned `Future` is ignored**: If the send fails (unreachable broker, serialization failure), the error is silently lost. The stream maps to `record` regardless. Combined with `Sink.ignore`, there is zero visibility into producer failures.

**Fix suggestion**: Use `mapAsync` with the `Future` from `producer.send()`, or (better) use `Producer.plainSink` or `Producer.flexiFlow` from Pekko Connectors Kafka, which handle asynchrony and backpressure toward the broker natively.

```scala
// Option 1: mapAsync
.mapAsync(parallelism = 4) { data =>
  val record = new ProducerRecord[String, GenericRecord](...)
  val promise = Promise[RecordMetadata]()
  producer.send(record, (metadata, exception) =>
    if (exception != null) promise.failure(exception)
    else promise.success(metadata)
  )
  promise.future
}

// Option 2: Pekko Connectors Kafka (recommended)
.map(data => ProducerMessage.single(new ProducerRecord(...)))
.via(Producer.flexiFlow(producerSettings))
```

---

**P0-2: `Source.queue` with `dropHead` is not backpressure — claim is imprecise**

Location: line 110.

The article states: "Il `Source.queue` ha backpressure. Se il producer Kafka rallenta, il buffer si riempie e i messaggi piu' vecchi vengono scartati (`dropHead`)."

This is inaccurate. `OverflowStrategy.dropHead` is **load shedding**, not backpressure. Backpressure implies the producer is slowed down (signal upstream). With `dropHead`, the producer (the actor calling `queue.offer()`) is never slowed: it continues offering elements and old ones are silently discarded. Backpressure exists **within** the stream (between the queue and the sink), but not between actors and the queue, which is the critical boundary.

**Fix suggestion**: Rephrase to clarify that `dropHead` is bounded buffering with load shedding, not end-to-end backpressure. Mention that for true backpressure toward actors, `OverflowStrategy.backpressure` could be used (the `Future` returned by `offer()` doesn't complete until there's space).

---

### P1 — Important

**P1-1: `EnrichmentState` get-then-put race condition understated**

Location: lines 203-231.

The article correctly notes that `ConcurrentHashMap` get-then-put is not atomic and mentions `compute()` as an alternative (line 234). However, the severity is understated. If `enrichC40` and `updateRegistry` are called simultaneously for the same identifier (possible since they run on different threads), one update is lost. The article says "last update wins" is "acceptable for telemetry", but what actually happens is not "latest timestamp wins" — it's "last `put` wins", which could overwrite a C40 enrichment with a version that only has the base registry update (classic lost update). For a didactic article, showing the `compute()` version as the primary code would be more correct.

---

**P1-2: `queue.offer()` result ignored**

Location: lines 89-91.

`queue.offer()` returns a `Future[QueueOfferResult]` that can be `Enqueued`, `Dropped`, `Failure`, or `QueueClosed`. Ignoring it means no visibility into whether messages are accepted. For a production telemetry system, at minimum a log on `Dropped` and an alert on `Failure`/`QueueClosed` are appropriate.

---

**P1-3: No graceful shutdown for consumer threads**

Location: lines 156-195.

The three `new Thread(() => { while(true) { ... } })` have no shutdown mechanism:
- No `volatile` flag to exit the loop
- No `consumer.wakeup()` to interrupt `poll()`
- No `try/finally` with `consumer.close()`

On JVM shutdown, consumers won't commit pending offsets and broker connections stay open until session timeout. The article mentions that migrating to `Consumer.plainSource` would provide "graceful shutdown", but the code presented as solution doesn't handle it. At minimum a comment with the correct pattern would be useful.

---

**P1-4: No error handling in consumer threads**

Location: lines 156-195.

The `while(true)` blocks have no `try/catch`. If `poll()` throws an exception (e.g., `WakeupException`, `SerializationException`, `AuthenticationException`), the thread dies silently. A `try/catch` with logging and retry (or at minimum a `Thread.setUncaughtExceptionHandler`) is the minimum for production code.

---

**P1-5: Dispatcher default — exact number potentially misleading**

Location: line 41.

The article states: "Il dispatcher default usa un fork-join pool con un minimo di 8 thread (`parallelism-min`)."

In **Pekko 1.1.x**: `parallelism-min = 8`, `parallelism-factor = 1.0` -> on 2 cores = `max(8, ceil(2 * 1.0))` = 8 threads. The claim is correct for current Pekko. However, the original code was likely Akka (pre-fork), where `parallelism-min` could be 2 in some versions with `parallelism-factor = 2.0` -> 4 threads on 2 cores, making the blocking problem even worse. Specifying the Pekko version or removing the exact number would improve accuracy.

---

### P2 — Minor

**P2-1: Explicit `Materializer` unnecessary in modern Pekko**

Location: line 74.

Since Akka 2.6+ (and Pekko from inception), an implicit `ActorSystem` in scope is sufficient — no need to create an explicit `Materializer`. This is legacy Akka 2.5 boilerplate.

---

**P2-2: Bare `new Thread(...)` without daemon flag or exception handler**

Location: lines 156-195.

Consumer threads are created as non-daemon threads with no `UncaughtExceptionHandler`. If the application shuts down, non-daemon threads prevent JVM exit. Setting `setDaemon(true)` or using an `ExecutorService` would be more robust.

---

**P2-3: No mention of offset commit strategy**

The consumer threads don't call `consumer.commitSync()` or `consumer.commitAsync()`. If `enable.auto.commit` is `true` (Kafka default), offsets are committed every 5 seconds. If `false`, offsets are never committed. The article doesn't discuss this choice, which is relevant for delivery semantics in a Kafka article.

---

**P2-4: Missing `auto.offset.reset` configuration details**

The article mentions `"earliest"` and `"latest"` as parameters but doesn't show how `stringConsumerProperties` and `avroConsumerProperties` configure `auto.offset.reset`. For didactic completeness, at least one example would be useful, since `latest` for the registry topic implies possible missed updates on first start.

---

**P2-5: Apicurio 3.x migration claim — add reference and clarify target version**

Location: lines 257-262.

The article correctly notes `SchemaResolverConfig` moved packages in Apicurio 3.x, but the serde import is shown as `io.apicurio.registry.serde.avro`, which is the 2.x path. The article should clarify which Apicurio version the code targets and link to the migration guide. Also verify whether `AUTO_REGISTER_ARTIFACT` as property name is still valid in 3.x (docs reference "schema resolver strategy" with potentially renamed properties).

---

**P2-6: Pseudocode mixes Typed and Classic API**

Location: lines 25-36.

The "before" pseudocode uses `Behavior[Command]`, `Behaviors.receiveMessage` (Typed API) but also `self ! Poll` (Classic API pattern — Typed API uses `context.self`). Since it's labeled "pseudocodice ricostruito", this is acceptable, but a note like `// Typed API — context.self omitted for brevity` would prevent confusion.

---

**P2-7: `forEach` is Java API on `ConsumerRecords`**

Location: line 30.

`consumer.poll(...).forEach { record => ... }` works in Scala via implicit Java-to-Scala conversions, but idiomatic Scala would use `.asScala.foreach`. Style nit, no correctness impact.

---

**P2-8: `AUTO_REGISTER_ARTIFACT = true` in production is a security risk**

Any producer can register arbitrary schemas. The article uses this in an internal telemetry system, which is acceptable, but a note about disabling auto-registration in production or using authorization rules would be valuable.

---

## Factual Accuracy

| Claim | Verdict |
|-------|---------|
| `poll()` blocks a dispatcher thread | Correct. Pekko/Akka actors share a fork-join pool dispatcher; blocking calls starve other actors. |
| Default dispatcher uses fork-join pool with `parallelism-min` | Correct for Pekko 1.x. Default is `parallelism-min = 8`, `parallelism-factor = 1.0`. |
| `Source.queue` provides backpressure | **Imprecise**. With `dropHead`, provides bounded buffering with load shedding, not true backpressure toward the producer side. |
| `ConcurrentHashMap` is thread-safe for individual get/put | Correct. |
| Apicurio 3.x moved `SchemaResolverConfig` package | Correct. Consistent with Apicurio 3.0 modular reorganization. |
| Confluent wire format uses 5 bytes for schema ID | Correct (1 magic byte + 4 byte schema ID). |
| Haversine formula for geo distance | Correct application for the described use case. |

---

## Code Correctness

- All Scala snippets are syntactically valid (with the `self` caveat in pseudocode, noted above).
- The `Source.queue` + `Sink.ignore` + `Keep.both` materialization is correct and returns `(SourceQueueWithComplete, Future[Done])`.
- The `Behaviors.supervise(...).onFailure` pattern is correct Pekko Typed API.
- `OverflowStrategy.dropHead` is a valid strategy for `Source.queue`.

---

## Completeness

- The article covers the "before" anti-pattern clearly with concrete problems.
- Two distinct refactoring patterns are well-motivated by their respective use cases.
- The Avro/Schema Registry section adds practical value.
- The demo section with docker compose adds reproducibility value.
- **Missing**: Offset commit strategy is never discussed.
- **Missing**: No mention of graceful shutdown for either pattern.
- **Missing**: No error handling discussion for consumer threads.

---

## Score: 7/10

The article is well-structured, technically sound in its core arguments, and provides real production code rather than toy examples. The two-pattern approach is well-motivated by distinct use cases. The main deductions are for: (1) `producer.send()` inside `.map()` reintroducing potential blocking in the stream — contradicting the article's premise (P0-1), (2) imprecise backpressure claim with `dropHead` (P0-2), and (3) several production-readiness gaps (no shutdown, no error handling in consumer threads, no offset commit discussion, ignored `offer()` result) that should at least be acknowledged since the article positions itself as showing production patterns.

**After fixing P0 and P1 issues, the article would be a solid 8.5/10.** The main recommendation: in Pattern 1, show the correct code (with `mapAsync` or `Producer.flexiFlow`) as primary, and the current code as "simplified version with known caveats".

### Quantitative Summary

| Priority | Count | Details |
|----------|-------|---------|
| P0 | 2 | producer.send() in .map(), backpressure claim imprecise |
| P1 | 5 | race condition EnrichmentState, offer() ignored, no shutdown, no error handling, dispatcher sizing |
| P2 | 8 | materializer legacy, daemon threads, offset commit, auto.offset.reset, Apicurio ref, typed/classic mix, forEach style, auto-register security |
