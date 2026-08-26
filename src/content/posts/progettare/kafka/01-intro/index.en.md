---
title: "Kafka in Practice 1: Anatomy of an Event Stream"
date: 2025-08-03T08:00:00.000Z
description: "The foundations of Apache Kafka: partition internals, message keys, replication guarantees, and practical examples in Node.js and Python."
pillar: progettare
category: kafka
tags:
  - Kafka
  - Node.js
  - Python
  - Architettura
  - Event Streaming
lang: en
reviewed: machine
series: kafka
seriesOrder: 10
---
## From Synchronous Calls to Event Streams

In distributed systems, synchronous communication between components introduces coupling that does not scale well. When every service must call and wait for another, a network hiccup or an overloaded service propagates failures down the chain. The cost grows non-linearly with the number of components.

The solution is not simply "use a message queue". The paradigm shift is from direct commands to **business events**. An event is not a request: it is an immutable fact. "A user updated their profile." "A sensor recorded a new temperature." "A vehicle transmitted its GPS position."

[**Apache Kafka**](https://kafka.apache.org/) is an event streaming platform — a distributed, replicated log that acts as the single source of truth for events, allowing components to react asynchronously, in a decoupled and resilient way.

```text
Payments Service  ─→
Users Service     ─→  [ Events Topic ]  ─→  Notifications Service
IoT Sensors       ─→                    ─→  Analytics Dashboard
                                        ─→  Auditing System
```

---

## Partitions and Segments: How Kafka Optimizes Storage and Reads

Describing Kafka as a "distributed commit log" is technically accurate, but it does not explain the engineering choices that drive its performance. This section examines the internal structure.

### The Partition: An Immutable, Segmented Log

A **Topic** is the concept we interact with, but the unit of parallelism, storage, and performance is the **Partition**. Each partition is an **immutable, strictly ordered** log of events. Immutability is a key concept: data is never modified, only appended. This dramatically simplifies the logic of replication and reads.

The internal structure is less obvious than it appears. A partition is not a single monolithic log file, but a **directory containing segment files**.

- **Log Segments (`.log`)**: Files that store the actual records. A segment is "active" until it reaches a maximum size (e.g. `segment.bytes`, default 1 GB) or a maximum age (`segment.ms`). At that point it is closed and a new one is created.
- **Indexes (`.index`, `.timeindex`)**: For each `.log` segment file there are corresponding index files. The offset index maps an offset to a physical position (byte offset) in the log file, enabling fast reads without scanning the whole file. The time index maps a timestamp to the corresponding offset, which is then resolved to a physical position via the offset index — a two-level lookup.

This segmentation has two direct benefits:
1. **Retention management**: to delete old data, Kafka does not need to scan the log to remove individual records. It simply **deletes the oldest segment files** — an `rm` on the filesystem, with O(1) cost independent of data volume.
2. **Fast seek**: the indexes, which are much smaller than log files, are memory-mapped (mmap): the operating system manages their caching in the page cache, allowing Kafka to quickly locate the starting point for reads, both by offset and by timestamp.

This design is also the foundation of the well-known **zero-copy** optimization. When a consumer requests data, Kafka can transfer it directly from the filesystem buffer to the network card buffer, without ever copying it into the Kafka application's memory (user space). This is only possible because the on-disk data format is identical to the wire format.

```text
Partition 0/
├── Segment 0
│   ├── 00000000000000000000.log         ← records
│   ├── 00000000000000000000.index       ← offset → byte position
│   └── 00000000000000000000.timeindex   ← timestamp → offset
└── Segment 1 (active)
    ├── 00000000000000000042.log         ← records
    ├── 00000000000000000042.index       ← offset → byte position
    └── 00000000000000000042.timeindex   ← timestamp → offset
```

### The Message Key and Ordering

The **key** of a message is not a simple metadata tag. It is a **contract on ordering**.

When a producer sends a message, the default **Partitioner** applies a deterministic formula:
`hash(key) % number_of_partitions`

This means **all messages with the same key end up in the same partition**. Since a partition is an ordered log, this provides a fundamental guarantee: **the sending order for a given key is preserved**.

> **Note**: this guarantee holds as long as the number of partitions in the topic remains constant. If partitions are added, the formula `hash(key) % N` produces different results and messages with the same key may land in different partitions.

In a sensor monitoring project, using `sensor_id` as the key is the natural choice. It guarantees that the sequence of readings for sensor `sensor-A1` is processed in the exact order it was emitted, making it possible to detect temperature trends or anomalies without ambiguity. Sending readings without a key would lose per-sensor ordering.

What if the key is null? Older versions of Kafka used simple round-robin, but this was inefficient (producing many small batches). The **Sticky Partitioner**, introduced in Kafka 2.4 (KIP-480), sends all keyless messages to a single partition until the batch is full, then moves to the next. Since Kafka 3.3 (KIP-794) the `DefaultPartitioner` was deprecated and sticky behavior became the only built-in option. This improves compression and reduces latency.

---

## Replication and Fault Tolerance

Durability in Kafka is an explicit configuration. It is built on a leader-follower replication model and the concept of **In-Sync Replicas (ISR)**. The [official replication documentation](https://kafka.apache.org/documentation/#replication) describes the design in detail.

Each partition has a **leader** (the only replica that accepts writes) and zero or more **followers**. The ISR set is the list of followers that are "sufficiently caught up" with the leader (configurable via `replica.lag.time.max.ms`).

When a producer writes, its durability guarantee is determined by the `acks` setting:
- `acks=0`: Fire-and-forget. Maximum performance, but the producer has no acknowledgement of receipt.
- `acks=1`: Waits for acknowledgement from the leader only. A reasonable trade-off, but if the leader fails immediately after acknowledging but before followers have replicated, the data is lost. This was the default through Kafka 2.8.
- `acks=all` (or `-1`): Waits for acknowledgement from the leader *after* all replicas in the ISR set have received the message. This is the strongest durability guarantee. **From Kafka 3.0 onwards this is the default**, together with `enable.idempotence=true`.

To prevent a cascading replica failure from reducing `acks=all` writes to a single replica (the leader), the broker setting `min.insync.replicas` is used. For example, if set to `2` and a producer uses `acks=all`, a write will fail if fewer than 2 replicas in the ISR set are ready to receive data. This prevents data loss in the event of a leader failure.

**What if the leader fails?** The cluster **Controller** (an elected broker or a KRaft node) detects the failure, elects a new leader from the ISR set, and notifies all followers to start replicating from the new leader. This election process is at the heart of Kafka's fault tolerance.

---

## Practical Examples: Node.js Producer and Python Consumer

The sensor monitoring application illustrates these concepts in a practical context. The producer is in **Node.js** using [**kafkajs**](https://kafka.js.org/), the consumer in **Python** using [**confluent-kafka**](https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html). Avro serialization is handled via [**Apicurio Registry**](https://www.apicur.io/registry/) as the Schema Registry. Everything is orchestrated with Docker Compose.

The complete code is available at: [github.com/monte97/kafka-pekko](https://github.com/monte97/kafka-pekko)

### The Node.js Producer: Sending Sensor Readings with a Key

The producer (`producer/index.js`) simulates sending data from multiple sensors. The crucial part is the use of `sensor_id` as the **message key** to guarantee ordering per sensor.

Kafka client, Schema Registry, and simulation constants initialization:

```javascript
// producer/index.js
const { Kafka } = require("kafkajs");
const {
  SchemaRegistry,
  SchemaType,
} = require("@kafkajs/confluent-schema-registry");

const BROKER = process.env.KAFKA_BROKER || "localhost:29092";
const REGISTRY_URL = process.env.SCHEMA_REGISTRY_URL || "http://localhost:8081";
const TOPIC = "sensor-data";

const kafka = new Kafka({ clientId: "demo-producer", brokers: [BROKER] });
const registry = new SchemaRegistry({ host: REGISTRY_URL });
const producer = kafka.producer();
```

The `randomReading()` function generates simulation data for the sensors:

```javascript
const SENSOR_IDS = ["sensor-A1", "sensor-B2", "sensor-C3"];
const LOCATIONS = [null, "warehouse-north", "warehouse-south", "outdoor"];

function randomReading() {
  return {
    sensor_id: SENSOR_IDS[Math.floor(Math.random() * SENSOR_IDS.length)],
    timestamp: Date.now(),
    temperature: Math.round((18 + Math.random() * 15) * 100) / 100,
    humidity: Math.round((30 + Math.random() * 50) * 100) / 100,
    location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
  };
}
```

The main loop serializes each reading to Avro and sends it using `sensor_id` as the key:

```javascript
async function main() {
  await producer.connect();
  const schemaId = await registerSchema(); // registers the Avro schema in the registry

  while (true) {
    const reading = randomReading();
    const value = await registry.encode(schemaId, reading);

    // The key is sensor_id: all messages from the same sensor
    // go to the same partition, preserving ordering
    await producer.send({
      topic: TOPIC,
      messages: [{ key: reading.sensor_id, value }],
    });

    await sleep(5000);
  }
}
```

### Two producer details worth knowing

Two aspects of this code deserve attention:

1. **`await producer.send(...)` sends one message at a time.** Waiting for the broker's acknowledgement keeps the code readable, but it serialises the writes: at high throughput you want `producer.sendBatch()`.

> **Note**: kafkajs has not received significant updates since 2023 and is considered unmaintained. Confluent has released an official JavaScript client ([`@confluentinc/kafka-javascript`](https://github.com/confluentinc/confluent-kafka-javascript)) based on librdkafka. For new projects it is worth evaluating this alternative.

2. **`registry.encode(schemaId, reading)`**: Avro serialization happens *before* sending. The value sent to Kafka is not JSON but a binary Avro payload prefixed with a magic byte and the schema ID. This is the standard Confluent Schema Registry wire protocol, also supported by Apicurio through the compatibility endpoint `/apis/ccompat/v7`.

### The Python Consumer: Verifying the Stream

The consumer (`consumer/consumer.py`) subscribes to the `sensor-data` topic and prints the readings it receives. It uses `confluent-kafka` with automatic Avro deserialization.

Client, Avro deserializer, and consumer group configuration:

```python
# consumer/consumer.py
import os
import sys

from confluent_kafka import Consumer, KafkaError
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroDeserializer
from confluent_kafka.serialization import MessageField, SerializationContext

BROKER = os.environ.get("KAFKA_BROKER", "localhost:29092")
REGISTRY_URL = os.environ.get("SCHEMA_REGISTRY_URL", "http://localhost:8081")
TOPIC = "sensor-data"

# The registry client automatically fetches the schema
# using the schema ID embedded in each Avro message
sr_client = SchemaRegistryClient({"url": REGISTRY_URL})
avro_deserializer = AvroDeserializer(sr_client)

consumer = Consumer({
    "bootstrap.servers": BROKER,
    "group.id": "demo-consumer-group",
    "auto.offset.reset": "earliest",
})
consumer.subscribe([TOPIC])
```

The polling loop deserializes each message and prints the reading. The `finally` block guarantees partition release and offset commit on shutdown:

```python
try:
    while True:
        msg = consumer.poll(timeout=1.0)
        if msg is None:
            continue

        err = msg.error()
        if err:
            if err.code() == KafkaError._PARTITION_EOF:
                continue
            print(f"Error: {err}", file=sys.stderr)
            continue

        # Deserialize the binary Avro payload into a Python dict
        reading = avro_deserializer(
            msg.value(),
            SerializationContext(msg.topic(), MessageField.VALUE),
        )
        print(f"sensor={reading['sensor_id']} temp={reading['temperature']}C "
              f"humidity={reading['humidity']}%")

except KeyboardInterrupt:
    print("Shutting down...")
finally:
    consumer.close()  # releases partitions and commits offsets
```

### Why the consumer asks instead of receiving

The consumer pattern is worth a closer look:

1. **`consumer.poll(timeout=1.0)`**: The consumer does not receive messages via push. It is an explicit **polling** cycle: every second it asks the broker whether there are new messages. If there are none, `poll` returns `None` and the loop continues. This model gives the consumer full control over its consumption rate (natural backpressure).

2. **`KafkaError._PARTITION_EOF`**: This is not a real error. It simply indicates that the consumer has reached the end of the partition — there are no more messages to read right now. This is normal for a consumer waiting for new data.

3. **`try/except KeyboardInterrupt` + `finally`**: This is the standard Python pattern for clean shutdown. When the user presses Ctrl+C, Python raises `KeyboardInterrupt`. The `finally` block guarantees that `consumer.close()` is always executed, releasing assigned partitions and committing offsets. Without this orderly shutdown, the consumer group would take longer to rebalance partitions.

---

## What it actually guarantees, and under what conditions

Kafka does not promise that messages arrive in order. It promises that **messages sharing a key arrive in order relative to each other**, and only as long as the partition count does not change. That is a narrower guarantee than most people assume, and it is the one you design against.

The other two that matter take the same shape: retention is cheap because whole segments get deleted rather than individual records, and durability depends on `acks` together with `min.insync.replicas` — not on either one alone.

**Put in terms that do not require code: moving to events does not make the system faster, it makes it less coupled.** A slow service stops slowing down the ones calling it, and a service that is down stops taking them with it — which means a failure in one piece stops being a failure of the product.

The price is paid elsewhere, and that is what the rest of this series is about: ordering only holds per key, consumer state becomes your problem, and debugging now crosses one more component.

The [next article](/blog/progettare/kafka/02-schema-registry-avro-apicurio/) starts exactly there: what happens when two services disagree about what a message contains.

---

## Further Reading

### Books

- **Designing Data-Intensive Applications** by *Martin Kleppmann*: Not a book about Kafka specifically, but it covers the foundational principles of distributed systems and data management that underlie technologies like Kafka.
- **Kafka: The Definitive Guide** by *Gwen Shapira, Neha Narkhede, and Todd Palino*: Written by engineers who worked on Kafka at Confluent and LinkedIn. Covers everything from cluster administration to development best practices.
- **I Heart Logs** by *Jay Kreps*: A short essay by Kafka's co-creator on the philosophy of distributed logs and their role in modern architectures.

### Articles and Documentation

- [**kafkajs documentation**](https://kafka.js.org/docs/getting-started): Kafka client for Node.js with a Promise-based API.
- [**confluent-kafka-python documentation**](https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html): Python wrapper for librdkafka, with native Avro support.
- [**Confluent blog**](https://www.confluent.io/blog/): Technical articles on advanced Kafka use cases, optimizations, and new features.
- [**Jay Kreps's blog**](https://medium.com/@jaykreps): Reflections on the evolution of software architectures and the role of event streaming.
- [**Official Kafka documentation**](https://kafka.apache.org/documentation/): Complete reference on configuration, design, and APIs.
