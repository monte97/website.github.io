---
title: From Blocking Poll to Reactive Streams with Pekko Connectors Kafka
date: 2026-03-02T09:00:00.000Z
description: "Refactoring from blocking actors to Source.queue and dedicated consumer threads: practical patterns with Pekko Streams and Kafka for telemetry systems"
pillar: progettare
category: kafka
tags:
  - Scala
  - Pekko
  - Kafka
  - Streaming
  - Avro
lang: en
reviewed: true
series: kafka
seriesOrder: 40
reproducibility: true
---
## The starting pattern: while(true) inside an actor

In an Akka-based system (now [Apache Pekko](https://pekko.apache.org/)), the most straightforward approach is to put all the logic inside an actor that consumes from Kafka. The actor consumes from Kafka, processes messages, and produces to another topic. It looks clean: one actor per responsibility, automatic supervision, everything within the actor model.

The system under discussion is a telemetry platform for construction site machinery. The aggregation service (`c40-aggregation`) had three `KafkaReaderActor` instances, one per topic, that looked like this:

```scala
// Before: KafkaReaderActor (pseudocode reconstructed from the original pattern)
class KafkaReaderActor(consumer: KafkaConsumer[String, String],
                       handler: ActorRef[MachineryEnrichActor.Command]) {
  def activeBehaviour: Behavior[Command] = Behaviors.receiveMessage {
    case Poll =>
      // PROBLEM: poll() blocks the dispatcher thread
      consumer.poll(Duration.ofSeconds(5)).forEach { record =>
        handler ! MachineryEnrichActor.ProcessRecord(record.value())
      }
      self ! Poll // infinite loop
      activeBehaviour
  }
}
```

This pattern has four concrete problems.

**1. It blocks a dispatcher thread.** `consumer.poll()` is a blocking call. In Akka/Pekko, actors share a thread pool (the dispatcher). An actor calling `poll(Duration.ofSeconds(5))` holds a thread for 5 seconds on every cycle. With three readers, three threads are permanently occupied. The default dispatcher uses a fork-join pool with a thread count calculated as `max(parallelism-min, ceil(cores * parallelism-factor))`. With Pekko 1.x defaults (`parallelism-min = 2`, `parallelism-factor = 1.0`), on a 2-core machine the pool has only 2 hot threads. With three blocking readers, the pool is completely saturated. Other actors in the system (including supervision actors) struggle to get CPU time.

**2. No backpressure.** If `MachineryEnrichActor` is slow at processing messages (e.g. because it needs to make an HTTP call or a costly lookup), messages pile up in the actor's mailbox. There is no mechanism to tell the consumer to slow down. In a telemetry system with data bursts, this can lead to OutOfMemoryError.

**3. Fragile error handling.** `SupervisorStrategy.restart` restarts the actor from scratch. For a Kafka consumer, "from scratch" means recreating the consumer, re-subscribing to the topic, and resuming from the last committed offset. If the error is transient (a network timeout), the cost of the restart is disproportionate.

**4. Not testable in isolation.** The business logic (enrichment, transformation) is entangled with the Kafka I/O logic. Testing the enrichment requires a Kafka broker, or a complex mock of the entire consumer.

The standardization service (`c40-standardization`) had a similar but mirrored problem: the `HttpC40Reader` actors polled external HTTP APIs and then had to send data to Kafka through a `KafkaWriterActor`. The chain was HTTP actor -> message -> Kafka actor -> `producer.send()`. Two actors, two mailboxes, no end-to-end backpressure.

---

## The solution: separating responsibilities

The key idea is simple: an actor should not perform blocking I/O. The responsibility of consuming from Kafka (or producing to Kafka) must be separated from the business logic. There are three components:

- **Kafka consumer**: a dedicated thread or a Pekko Connectors source
- **Business logic**: a pure function or a stateful object
- **Kafka producer**: a stream sink or a direct call to the producer API

The separation can be implemented in different ways depending on the use case. In the two services under discussion, two distinct patterns were adopted.

---

## Pattern 1: Source.queue for the producer

In the `c40-standardization` service, the main problem is the producer. The `HttpC40Reader` actors poll external HTTP APIs at regular intervals and need to send standardized data to Kafka. The solution is a Pekko Streams `Source.queue` that acts as a bridge between the actor world and a reactive stream.

Here is the actual code from `Launcher.scala`:

```scala
val producer = new KafkaProducer[String, GenericRecord](KafkaProducerConfig.producerProperties)

implicit val materializer: Materializer = Materializer(context.system)

val (queue, _) = Source.queue[C40StandardModel](bufferSize = 100, OverflowStrategy.dropHead)
  .mapAsync(parallelism = 4) { data =>
    val record = new ProducerRecord[String, GenericRecord](
      KafkaProducerConfig.topic,
      data.identifier,
      AvroConverter.toAvroRecord(data)
    )
    val promise = Promise[RecordMetadata]()
    producer.send(record, (metadata: RecordMetadata, exception: Exception) =>
      if (exception != null) promise.failure(exception)
      else promise.success(metadata)
    )
    promise.future
  }
  .toMat(Sink.ignore)(Keep.both)
  .run()

val enqueueData: C40StandardModel => Unit = { data =>
  queue.offer(data) // returns Future[QueueOfferResult]: handle Dropped/Failure in production
}
```

The flow works as follows:

1. A `Source.queue` is created with a buffer of 100 elements and a `dropHead` strategy (if the buffer is full, the oldest message is discarded)
2. Each element entering the queue is converted to an Avro `GenericRecord` and sent to Kafka asynchronously via `mapAsync`, which avoids blocking the materializer thread and correctly propagates producer errors
3. The `HttpC40Reader` actors receive the `enqueueData` function and call it when they have new data

> **Note**: using `mapAsync` with the producer callback is sufficient for this use case. For more complex scenarios (commit management, native backpressure towards the broker, retries), the production-grade solution is `Producer.flexiFlow` from [Pekko Connectors Kafka](https://pekko.apache.org/docs/pekko-connectors-kafka/current/producer.html), which handles asynchronism and backpressure towards the broker natively.

```scala
val recordReaderActor = context.spawn(
  HttpC40Reader("RecordReader", ReaderFactory.recordReader, enqueueData), "recordReader")
recordReaderActor ! HttpC40Reader.Start

val targaReaderActor = context.spawn(
  HttpC40Reader("TargaReader", ReaderFactory.targaReader, enqueueData), "targaReader")
targaReaderActor ! HttpC40Reader.Start
```

The advantage over the previous pattern: `Source.queue` provides a bounded buffer with **load shedding**. If the Kafka producer slows down, the buffer fills up and the oldest messages are discarded (`dropHead`). It should be noted that this is not backpressure in the strict sense: with `dropHead`, the actor calling `queue.offer()` is never slowed down -- older data is simply dropped. True backpressure only exists *within* the stream (between the queue and the sink). To propagate pressure all the way to the actors, one could use `OverflowStrategy.backpressure`, where the `Future` returned by `offer()` does not complete until there is space in the buffer. In a telemetry system, load shedding with `dropHead` is the pragmatic choice: the most recent data point is always the most relevant. No risk of OutOfMemoryError.

The `HttpC40Reader` actors remain simple: they receive an `Act` message from the scheduler, call the HTTP API, diff the data against the previous state, and for each changed data point they call `enqueueData`. They know nothing about Kafka, Avro, or serialization. If the HTTP API fails, `SupervisorStrategy.restart` restarts only the reader, without touching the Kafka stream.

```scala
def activeBehaviour: Behavior[Command] = Behaviors.supervise(
  Behaviors.receiveMessage[Command] {
    case Act =>
      diff(currentState, updatedData())
        .filter(data => !currentState.contains(data._1) || data._2 != currentState(data._1))
        .foreach { data =>
          currentState += data
          onData(data._2)  // calls enqueueData
        }
      activeBehaviour
  }
).onFailure[Exception](SupervisorStrategy.restart)
```

---

## Pattern 2: Consumer threads + shared state for enrichment

In the `c40-aggregation` service, the problem is different. Three topics feed a shared state: telemetry data (`data.c40.equipment.standardized`), the equipment registry (`data.registry.equipment`), and points of interest (`POINT_OF_INTEREST_TABLE`). Any message from any topic can update the state and produce an enriched output message.

A full Pekko Connectors Kafka approach with `Consumer.plainSource` would be possible here, but complex. It would require merging three sources with different types (two Avro, one String/JSON), converging on shared state, and handling the fact that arrival order across different topics is not guaranteed. Dedicated consumer threads are a pragmatic choice.

Here is the actual code:

```scala
val state = new EnrichmentState()
val producer = new KafkaProducer[String, GenericRecord](KafkaConfig.avroProducerProperties)

def sendToKafka(enriched: MachineryEnriched): Unit = {
  if (enriched.identifier != null) {
    producer.send(new ProducerRecord[String, GenericRecord](
      "data.c40.equipment.enriched",
      enriched.identifier,
      AvroConverter.toAvroRecord(enriched)
    ))
  }
}

// POI topic (String/JSON, external, earliest)
val poiConsumer = new KafkaConsumer[String, String](
  KafkaConfig.stringConsumerProperties("c40_agg_poi", "earliest"))
new Thread(() => {
  poiConsumer.subscribe(Collections.singletonList("POINT_OF_INTEREST_TABLE"))
  while (true) {
    poiConsumer.poll(Duration.ofSeconds(5)).forEach { record =>
      parsePointOfInterest(record.value()).foreach(state.updatePOI)
    }
  }
}, "poi-consumer").start()

// --------------------------------------------------

// Registry topic (Avro, latest)
val registryConsumer = new KafkaConsumer[String, GenericRecord](
  KafkaConfig.avroConsumerProperties("c40_agg_registry", "latest"))
new Thread(() => {
  registryConsumer.subscribe(Collections.singletonList("data.registry.equipment"))
  while (true) {
    registryConsumer.poll(Duration.ofSeconds(5)).forEach { record =>
      parserMachineryAvro(record.value()).foreach { machinery =>
        state.updateRegistry(machinery).foreach(sendToKafka)
      }
    }
  }
}, "registry-consumer").start()

// --------------------------------------------------

// C40 Standardized topic (Avro, latest)
val c40Consumer = new KafkaConsumer[String, GenericRecord](
  KafkaConfig.avroConsumerProperties("c40_agg_c40", "latest"))
new Thread(() => {
  c40Consumer.subscribe(Collections.singletonList("data.c40.equipment.standardized"))
  while (true) {
    c40Consumer.poll(Duration.ofSeconds(5)).forEach { record =>
      parserC40Avro(record.value()).foreach { c40Data =>
        state.enrichC40(c40Data).foreach(sendToKafka)
      }
    }
  }
}, "c40-consumer").start()
```

The key difference from the previous pattern: the `while(true)` loops are still there, but they run on **dedicated threads** (`new Thread(...)`), not on Pekko dispatcher threads. The dispatcher remains free for the system's actors. Each consumer has its own thread, performs its `poll()`, and calls into the shared state.

It is worth noting that these consumer threads as written lack a graceful shutdown mechanism. When the JVM shuts down, the consumers do not commit pending offsets and connections to the broker remain open until the session timeout. In production, the correct pattern involves a `volatile` flag to exit the loop, a call to `consumer.wakeup()` to interrupt the `poll()`, and a `try/finally` block with `consumer.close()`. Migrating to Pekko Connectors Kafka's `Consumer.plainSource` solves this problem natively.

The shared state is an `EnrichmentState` backed by `ConcurrentHashMap`:

```scala
class EnrichmentState {
  private val dataset: ConcurrentHashMap[String, MachineryEnriched] = new ConcurrentHashMap()
  private val pointsOfInterest: ConcurrentHashMap[String, PointOfInterest] = new ConcurrentHashMap()

  def updatePOI(poi: PointOfInterest): Unit =
    pointsOfInterest.put(poi.name, poi)

  def updateRegistry(data: MachineryModel): Option[MachineryEnriched] = {
    val current = Option(dataset.get(data.code)).getOrElse(MachineryEnriched(data.code))
    val updated = current.updateBase(data)
    dataset.put(data.code, updated)
    Some(updated)
  }

  def enrichC40(data: C40StandardModel): Option[MachineryEnriched] = {
    val current = Option(dataset.get(data.identifier)).getOrElse(MachineryEnriched(data.identifier))
    val updated = current.updateC40(C40DataEnriched(
      description = data.description,
      odometry = data.odometry,
      location = C40LocationEnriched(
        address = data.location.address,
        GPS = data.location.GPS,
        pointsOfInterest = getPointsOfInterest(data.location.GPS)
      )
    ))
    dataset.put(data.identifier, updated)
    Some(updated)
  }
}
```

`ConcurrentHashMap` guarantees thread-safety for individual `get` and `put` operations. Compound operations (get-then-put), however, are not atomic: if `enrichC40` and `updateRegistry` are called simultaneously for the same identifier (which is possible since they run on different threads), a classic **lost update** occurs. This is not simply a "last timestamp wins" scenario: the second `put` could overwrite the state with a version that does not include the first thread's update. For example, an `updateRegistry` call could overwrite a C40 enrichment that was just inserted, losing it. For telemetry data where values are recalculated frequently, this is acceptable in practice. For stricter use cases, `ConcurrentHashMap.compute()` provides atomicity at the key level, ensuring that the read and write happen as a single atomic operation.

The enrichment also performs a geospatial computation: for every C40 data point with GPS coordinates, it searches for points of interest within 1000 meters using the haversine formula. In the previous version, this computation lived inside an actor (`MachineryEnrichActor`); now it is in a plain Scala class, testable without actors or Kafka.

---

## Avro and Schema Registry in the mix

Both services use Avro with Apicurio Registry. The Scala-side configuration relies on native Apicurio libraries: `AvroKafkaSerializer` for the producer and `AvroKafkaDeserializer` for the consumer.

```scala
// Producer: automatic schema registration
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, classOf[AvroKafkaSerializer[_]].getName)
props.put(SchemaResolverConfig.REGISTRY_URL, schemaRegistryUrl)
props.put(SchemaResolverConfig.AUTO_REGISTER_ARTIFACT, "true")

// Consumer: automatic schema resolution
props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, classOf[AvroKafkaDeserializer[_]].getName)
props.put(SchemaResolverConfig.REGISTRY_URL, schemaRegistryUrl)
```

The producer with `AUTO_REGISTER_ARTIFACT = true` registers the schema in the registry on the first `send()`. The consumer reads the schema ID from the message header (the format depends on the serializer configuration: 5 bytes in the Confluent format, up to 9 bytes in the native Apicurio format). The `POINT_OF_INTEREST_TABLE` topic remains in String/JSON because it is produced by an external system outside our control: for that, `stringConsumerProperties` with `StringDeserializer` are used.

An important gotcha: in Apicurio 3.x, the `SchemaResolverConfig` class was moved from `io.apicurio.registry.serde.config` to `io.apicurio.registry.resolver.config`. If you upgrade Apicurio from 2.x to 3.x, the code compiles but the import changes. Additionally, the concept of "artifact" was renamed internally, although the API remains compatible. The current import:

```scala
import io.apicurio.registry.resolver.config.SchemaResolverConfig
import io.apicurio.registry.serde.avro.{AvroKafkaDeserializer, AvroKafkaSerializer}
```

---

## Demo

The entire project code is available in the public repository:
[https://github.com/monte97/kafka-pekko](https://github.com/monte97/kafka-pekko)

The `pekko-patterns/` module implements both patterns in a self-contained project.

```bash
git clone https://github.com/monte97/kafka-pekko
cd kafka-pekko
docker compose up
```

The metadata-seeder registers 3 sensors with different thresholds, then the `pekko-patterns` service starts both patterns:

```text
demo-metadata-seeder     | [seed] sensor-A1: North Warehouse (threshold 25.0C)
demo-metadata-seeder     | [seed] sensor-B2: South Warehouse (threshold 26.0C)
demo-metadata-seeder     | [seed] sensor-C3: Outdoor (threshold 28.0C)
demo-pekko-patterns      | [pattern1] Source.queue started (buffer=100, dropHead)
demo-pekko-patterns      | [pattern1] sensor-A1 -> 23.4C (queued)
demo-pekko-patterns      | [pattern2] metadata: sensor-A1 -> North Warehouse
demo-pekko-patterns      | [pattern2] enriched: sensor-A1 23.4C < 25.0C -> OK
demo-pekko-patterns      | [pattern2] enriched: sensor-B2 26.8C > 26.0C -> WARNING
```

Pattern 1 (`Source.queue`) receives readings from actors and publishes them to `sensor-data`. Pattern 2 (consumer threads) reads metadata from `sensor-metadata`, enriches readings with shared state (`ConcurrentHashMap`), and produces to `sensor-enriched`.

The Apicurio web UI is available at `http://localhost:8081/ui`, where you can verify the 3 registered schemas (`SensorReading`, `SensorMetadata`, `EnrichedReading`).

To clean everything up:

```bash
docker compose down -v
```

---

## Conclusions

The migration from blocking poll to reactive architectures can be incremental. In this article we have seen how:

1. **The blocking pattern** (polling inside an actor) occupies dispatcher threads, offers no backpressure, and makes business logic untestable in isolation
2. **`Source.queue` for the producer** lets actors deposit results into a queue with a buffer and overflow strategy, without blocking the dispatcher
3. **Dedicated consumer threads** are the pragmatic choice when multiple consumers converge on a shared mutable state with heterogeneous types (Avro + JSON)
4. **Separation of responsibilities** (Kafka I/O vs business logic) is the guiding principle, regardless of the chosen pattern

The natural next step is replacing the consumer threads with Pekko Connectors Kafka's `Consumer.plainSource`, to gain backpressure on the consumer side as well, stream-managed offset commits, and graceful shutdown.

---

## Useful Resources

*   [**Pekko Streams Documentation**](https://pekko.apache.org/docs/pekko/current/stream/index.html): Complete reference on Source, Flow, Sink and operators.
*   [**Pekko Connectors Kafka**](https://pekko.apache.org/docs/pekko-connectors-kafka/current/home.html): Consumer, Producer and Transactional sources/sinks for Kafka.
*   [**Apicurio Registry**](https://www.apicur.io/registry/): Confluent-compatible Schema Registry, supporting Avro, Protobuf and JSON Schema.
*   [**Official Kafka Documentation**](https://kafka.apache.org/documentation/): Complete reference on configuration, design and APIs.
