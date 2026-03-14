---
title: "Schema Registry with Apache Kafka: From Wild JSON to Avro with Apicurio"
date: 2026-03-02T09:00:00.000Z
description: "Migrating from schemaless JSON to Avro with Apicurio Registry: infrastructure, Node.js producer, Python consumer, schema evolution"
pillar: progettare
category: kafka
tags:
  - Kafka
  - Avro
  - Schema Registry
  - Apicurio
  - Node.js
  - Python
lang: en
reviewed: true
series: kafka
seriesOrder: 20
reproducibility: true
---
## The problem: JSON without a contract

In a microservices system with Kafka at its core, JSON is the natural message format. It is human-readable, every language supports it, and it requires no setup. But as the system grows, schemaless JSON becomes a silent problem.

The system in question is a telemetry platform for construction-site heavy equipment. The architecture spans three languages: Node.js for the registry service (producer), Scala/Pekko for telemetry data standardization and aggregation (consumer and producer), and Python/Flask for historical data, usage, and reporting services (consumer). All of them communicate through Kafka topics, and all of them produce and consume JSON.

The problem does not manifest as a visible error. It manifests like this:

- The Node.js service adds a `last_update` field to messages on `registry-equipment`. The Scala consumer silently ignores it because it does not know about it. No error, no log. Three months later someone discovers the field never reached its destination.

- The Scala standardization service changes the timestamp format from an ISO string to epoch millis. The Python consumer keeps parsing the field as a string, gets a number, and converts it to a nonsensical date. No exception, just wrong data in the database.

- A new developer needs to write a consumer for an existing topic. The only documentation of the message format is the producer's source code. Which is in a different language, in a different repository.

The root cause is that there is no **contract** on message formats. Each service has its own implicit version of the schema, defined by the code that serializes or deserializes. When those versions diverge, the system does not break: it silently degrades.

---

## The choice: why Schema Registry

To solve the problem, two things are needed: a formal schema for every topic, and a mechanism that prevents publishing non-conforming messages. There are three approaches.

**1. Application-level JSON Schema validation.** Each service validates messages against a JSON Schema before producing or after consuming them. The problem is that validation is decentralized: every service must implement it, keep it up to date, and nothing prevents a producer from publishing an invalid message. If one service skips validation, messages pass through anyway.

**2. Confluent Schema Registry.** The reference registry in the Kafka ecosystem. Mature, well-documented, with client libraries for every language. But since version 5.1 (December 2018) the license is Confluent Community License, not Apache 2.0. For an open-source-first project, or for an on-premise installation where licensing matters, this is a limitation.

**3. Apicurio Registry.** An open-source project, Apache 2.0 licensed. It supports Avro, JSON Schema, and Protobuf. It can use Kafka itself as storage (KafkaSQL), so it does not require an external database. And most importantly: it exposes a Confluent-compatible API (`/apis/ccompat/v7`), which means standard Confluent client libraries work without modifications.

The choice for this project fell on Apicurio. The main reason is pragmatic: zero additional dependencies (schemas are stored in an internal Kafka topic) and compatibility with the entire ecosystem of existing client libraries.

---

## Why Avro and not JSON Schema

Once the registry is chosen, a serialization format must be picked. The choice is between Avro, JSON Schema, and Protobuf. In this context, all topics serve internal microservice communication: no browser, no external client, no public API. This narrows the choice to two realistic candidates: Avro and JSON Schema.

| Feature | Avro | JSON Schema |
|---|---|---|
| Wire format | Binary (no field names in payload) | Textual JSON |
| Payload size | Compact (values only) | Verbose (repeated field names) |
| Schema evolution | Formalized (reader/writer schema) | Less formalized |
| Message readability | Requires the schema to decode | Readable with any tool |
| Debugging | Requires a tool (kafka-avro-console-consumer) | `kafkacat` is enough |
| Serialization speed | Very fast (native binary format) | Slower (text parsing) |
| Logical types | timestamp-millis, date, decimal, uuid | Implementation-dependent |

The practical rule adopted is simple: **Avro for the internal core** (all topics between microservices), **JSON Schema for the edges** (REST APIs, webhooks, external integrations).

The decisive advantage of Avro in this context is formalized schema evolution. In Avro, when a consumer reads a message written with a different schema version, the runtime knows exactly how to handle the difference: new fields with defaults are added automatically, removed fields are ignored. There is no application code to write for handling version differences. This is critical in a system where three different languages consume the same topics.

---

## Infrastructure: Apicurio + KafkaSQL

The infrastructure requires a single additional container compared to a standard Kafka cluster. Here is the `docker-compose.yml` from the demo:

```yaml
services:
  broker:
    image: confluentinc/cp-kafka:7.8.0
    hostname: broker
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:29092,CONTROLLER://0.0.0.0:29093,PLAINTEXT_HOST://0.0.0.0:9092
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://broker:29092,PLAINTEXT_HOST://localhost:9092
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@broker:29093
      CLUSTER_ID: MkU3OEVBNTcwNTJENDM2Qk
    ports:
      - "9092:9092"
    healthcheck:
      test: kafka-broker-api-versions --bootstrap-server localhost:29092 > /dev/null 2>&1
      interval: 5s
      timeout: 10s
      retries: 10

  schema-registry:
    image: apicurio/apicurio-registry:3.0.4
    depends_on:
      broker:
        condition: service_healthy
    environment:
      APICURIO_STORAGE_KIND: kafkasql
      APICURIO_KAFKASQL_BOOTSTRAP_SERVERS: broker:29092
    ports:
      - "8081:8080"
```

The key point is `APICURIO_STORAGE_KIND: kafkasql`. With this configuration, Apicurio stores all schemas in an internal Kafka topic. No PostgreSQL, no volumes to manage, no additional backups. Schemas are replicated and persisted with the same guarantees as the Kafka broker itself.

Once started, the Apicurio web interface is available at `http://localhost:8081/ui`. From there, all registered schemas can be browsed, versions inspected, and compatibility tested. It is especially useful during the migration phase, to verify that schemas have been registered correctly.

---

## Defining Avro schemas

An Avro schema is an `.avsc` file (JSON) that describes the structure of a record. Here is the schema used in the demo, a `SensorReading` representing a sensor reading:

```json
{
  "type": "record",
  "name": "SensorReading",
  "namespace": "demo.sensors",
  "fields": [
    {"name": "sensor_id", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "temperature", "type": "double"},
    {"name": "humidity", "type": "double"},
    {"name": "location", "type": ["null", "string"], "default": null}
  ]
}
```

A few things worth noting:

- **Namespace**: `demo.sensors` uniquely identifies the type in the registry. In production, the namespaces are `c40.telemetry`, `c40.registry`, `c40.usage`.

- **Logical types**: `timestamp-millis` tells the runtime that the `long` field represents a timestamp in milliseconds. Client libraries automatically convert it to the native date type of the language.

- **Union types for optional fields**: `["null", "string"]` with `"default": null` is the Avro pattern for an optional field. Unlike JSON, in Avro every field is required unless a union with `null` is used.

In production, schemas are more complex. Here is an excerpt from the `C40Standardized` schema, which represents a normalized telemetry record:

```json
{
  "type": "record",
  "name": "C40Standardized",
  "namespace": "c40.telemetry",
  "fields": [
    {"name": "identifier", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "description", "type": {
      "type": "record", "name": "C40Description",
      "fields": [
        {"name": "model", "type": ["null", "string"], "default": null},
        {"name": "brand", "type": ["null", "string"], "default": null}
      ]
    }},
    {"name": "location", "type": {
      "type": "record", "name": "C40Location",
      "fields": [
        {"name": "address", "type": ["null", "string"], "default": null},
        {"name": "GPS", "type": {
          "type": "record", "name": "C40GPS",
          "fields": [
            {"name": "latitude", "type": ["null", "double"], "default": null},
            {"name": "longitude", "type": ["null", "double"], "default": null}
          ]
        }}
      ]
    }}
  ]
}
```

**Nested records** are one of Avro's strengths: `C40Location` contains `C40GPS`, and each sub-record has its own name and can be referenced elsewhere. In JSON you would have the same nesting, but without the ability to reuse types.

---

## Node.js producer with schema registry

The producer is the service that registers the schema in the registry and serializes messages in Avro format. In Node.js, `kafkajs` is used for the Kafka connection and `@kafkajs/confluent-schema-registry` for the registry integration.

> **Note**: KafkaJS has not received significant updates since 2023 and has compatibility issues with Kafka 4.x. For new projects, consider [`@confluentinc/kafka-javascript`](https://github.com/confluentinc/confluent-kafka-javascript) (a wrapper around librdkafka) together with `@confluentinc/schemaregistry`. The demo uses KafkaJS because the original production code adopted it before the maintenance status changed.

```javascript
const { Kafka } = require("kafkajs");
const { SchemaRegistry, SchemaType } = require("@kafkajs/confluent-schema-registry");
const fs = require("fs");
const path = require("path");

const BROKER = process.env.KAFKA_BROKER || "localhost:29092";
const REGISTRY_URL = process.env.SCHEMA_REGISTRY_URL || "http://localhost:8081";
const TOPIC = "sensor-data";

const kafka = new Kafka({ clientId: "demo-producer", brokers: [BROKER] });
// NOTE: with Apicurio, REGISTRY_URL must include /apis/ccompat/v7
// E.g. in Docker: http://schema-registry:8080/apis/ccompat/v7
const registry = new SchemaRegistry({ host: REGISTRY_URL });
const producer = kafka.producer();

async function registerSchema() {
  const schemaPath = path.join(__dirname, "schemas", "SensorReading.avsc");
  const schema = fs.readFileSync(schemaPath, "utf-8");

  const { id } = await registry.register(
    { type: SchemaType.AVRO, schema },
    { subject: `${TOPIC}-value` }
  );

  console.log(`[producer] Registered schema with id=${id}`);
  return id;
}

async function main() {
  await producer.connect();
  const schemaId = await registerSchema();

  while (true) {
    const reading = {
      sensor_id: "sensor-A1",
      timestamp: Date.now(),
      temperature: 24.57,
      humidity: 48.32,
      location: "warehouse-north",
    };

    // Encode serializes the record according to the schema and prepends the schema ID
    const value = await registry.encode(schemaId, reading);

    await producer.send({
      topic: TOPIC,
      messages: [{ key: reading.sensor_id, value }],
    });

    // Delay to avoid flooding the broker — in production use a proper rate limiting mechanism
    await new Promise((r) => setTimeout(r, 1000));
  }
}
```

The flow is straightforward:

1. Load the schema from the `.avsc` file
2. Register it in the registry with the subject `sensor-data-value` (convention: `{topic}-value`)
3. Use `registry.encode(schemaId, record)` to serialize each message

The `encode` call does two things: it serializes the record into Avro binary format, and it prepends 5 bytes to the payload (1 magic byte + 4 bytes for the schema ID). This prefix is the mechanism by which the consumer knows which schema to use for decoding, without needing to know it in advance.

In a Docker environment, the `SCHEMA_REGISTRY_URL` variable is set to `http://schema-registry:8080/apis/ccompat/v7`. That `/apis/ccompat/v7` path is Apicurio's Confluent compatibility endpoint. The `@kafkajs/confluent-schema-registry` library has no idea it is talking to Apicurio: it sees a standard Confluent API.

---

## Python consumer with Avro

The consumer is written in Python using `confluent-kafka` with the `schema_registry` module. The key point is that the consumer **does not need the schema**: it retrieves it automatically from the registry using the schema ID embedded in every message.

```python
import os
from confluent_kafka import Consumer, KafkaError
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroDeserializer
from confluent_kafka.serialization import MessageField, SerializationContext

BROKER = os.environ.get("KAFKA_BROKER", "localhost:29092")
REGISTRY_URL = os.environ.get("SCHEMA_REGISTRY_URL", "http://localhost:8081")
TOPIC = "sensor-data"

# The client connects to the registry to fetch schemas on demand
sr_client = SchemaRegistryClient({"url": REGISTRY_URL})

# AvroDeserializer reads the schema ID from the message and uses it to decode
avro_deserializer = AvroDeserializer(sr_client)

consumer = Consumer({
    "bootstrap.servers": BROKER,
    "group.id": "demo-consumer-group",
    "auto.offset.reset": "earliest",
})
consumer.subscribe([TOPIC])

while True:
    msg = consumer.poll(timeout=1.0)
    if msg is None or msg.error():
        continue

    # Automatic deserialization: Avro binary -> Python dict
    reading = avro_deserializer(
        msg.value(),
        SerializationContext(msg.topic(), MessageField.VALUE),
    )

    print(f"sensor={reading['sensor_id']} temp={reading['temperature']}C")
```

The consumer flow:

1. `AvroDeserializer` reads the first 5 bytes of the message to extract the schema ID
2. It asks the registry for the corresponding schema (with local caching)
3. It uses that schema to deserialize the binary payload into a Python dictionary

The result is that producer and consumer are fully decoupled: the producer can evolve the schema, and the consumer will keep working as long as the evolution is compatible.

---

## Schema evolution: adding a field without breaking anything

Schema evolution is the main reason to adopt a registry. The question is: what happens when the producer starts sending messages with an extra field? Or with a missing one?

The most common compatibility mode is **BACKWARD**: a consumer with schema v(N) can read messages written with schema v(N-1). In practice this means you can add fields with defaults (the reader uses the default when the writer does not include the field) and remove fields that had a default (the reader uses the default defined in its own schema), but you cannot remove fields without defaults, add required fields without defaults, or change the type of an existing field.

**Note**: Apicurio Registry does not enforce any compatibility checks by default (NONE mode). The BACKWARD rule must be configured explicitly for each subject, as shown in the demo scripts.

The demo includes two scripts that show this in action.

**Compatible evolution** (`scripts/evolve-schema.sh`): adds an optional `battery_level` field with a default of `-1.0`.

```json
{
  "name": "battery_level",
  "type": "double",
  "default": -1.0
}
```

The registry accepts the new version. The producer starts sending messages with the `battery_level` field. The consumer, which only knows v1, keeps working: the field is simply ignored during deserialization. No error, no crash, no code changes needed.

**Incompatible evolution** (`scripts/break-schema.sh`): attempts to remove the required `humidity` field.

```bash
$ ./scripts/break-schema.sh
HTTP Status: 409
{
  "error_code": 409,
  "message": "Schema being registered is incompatible with an earlier schema"
}
```

The registry rejects the registration. This is the safety net: a producer cannot accidentally break consumers by removing a field they depend on.

---

## Lessons learned

From the migration of the system from schemaless JSON to Avro with Apicurio, several practical lessons emerged.

**1. Incremental migration, topic by topic.** No big bang is needed. Pick a topic, define the schema, update the producer to serialize in Avro, then update the consumers. The other topics keep running on JSON. The migration started with the `c40-standardized` topic because it has a single producer and two consumers: the simplest path.

**2. Dual-write is unnecessary if you can stop services.** Many articles recommend a dual-write period where the producer writes both JSON and Avro to two separate topics. If the system can be briefly stopped (the telemetry services tolerate a restart of a few seconds without data loss thanks to Kafka buffering), the switchover can be done directly.

**3. GenericRecord vs SpecificRecord.** In Scala and Java, Avro offers two modes: `GenericRecord` (key-value dictionary, flexible, no code generation) and `SpecificRecord` (classes generated from the schema, type-safe, requires a build plugin). For services that consume many different topics, `GenericRecord` is more practical. For services with few topics and complex logic, `SpecificRecord` provides compile-time guarantees.

**4. Apicurio's Confluent-compatible API is the enabler.** The `/apis/ccompat/v7` path allows using `@kafkajs/confluent-schema-registry` for Node.js and `confluent-kafka[avro]` for Python without any modifications. There is no need to look for Apicurio-specific client libraries. This significantly reduces the cost of migration.

**5. Inline schemas vs .avsc files.** For interpreted services (Node.js, Python), loading the `.avsc` file at runtime works well. For compiled services (Scala), it may be more practical to have the schema inline in the code or generated at build time, especially when using `SpecificRecord`. The `.avsc` files are maintained in a shared directory in the repository (`schemas/`) as the source of truth, and each service loads them in the way most natural for its language.

---

## Demo

The entire project code is available in the public repository:
[https://github.com/monte97/kafka-pekko](https://github.com/monte97/kafka-pekko)

The project is self-contained and can be started with a single command.

```bash
git clone https://github.com/monte97/kafka-pekko
cd kafka-pekko
docker compose up
```

In about 30 seconds the Node.js producer registers the schema and starts sending messages, while the Python consumer receives and decodes them:

```text
demo-producer  | [producer] #1 | sensor=sensor-A1 temp=24.57C humidity=48.32% location=warehouse-north
demo-consumer  | [consumer] #1 | sensor=sensor-A1 temp=24.57C humidity=48.32% location=warehouse-north
```

The Apicurio web interface is available at `http://localhost:8081/ui`, where you can browse the registered schemas.

With the stack running, you can test the two evolution scripts:

```bash
# Compatible addition: new optional battery_level field
./scripts/evolve-schema.sh

# Incompatible removal: the registry rejects it
./scripts/break-schema.sh
```

To clean up:

```bash
docker compose down -v
```

The base stack (Kafka KRaft, Apicurio Registry, Node.js producer, Python consumer, Scala consumer) requires less than 1 GB of RAM and runs on any machine with Docker.

---

## Conclusions

The migration from schemaless JSON to Avro with a schema registry covered:

1. **The problem**: without a formal schema, divergences between producer and consumer manifest as wrong data, not as errors
2. **Choosing Apicurio**: Apache 2.0 license, Kafka-based storage (KafkaSQL), Confluent-compatible API
3. **Avro for the core**: compact binary format, formalized schema evolution with reader/writer schemas, native logical types
4. **Minimal infrastructure**: a single additional container compared to a standard Kafka cluster
5. **Incremental migration**: one topic at a time, no big bang, leveraging BACKWARD compatibility

The next article in the series will explore the migration from Akka to Apache Pekko and the patterns for managing the transition in a production system.

---

## Useful Resources

*   [**Apache Avro Documentation**](https://avro.apache.org/docs/): Format specification, schema evolution, logical types.
*   [**Apicurio Registry**](https://www.apicur.io/registry/docs/): Official documentation with configuration guides and API reference.
*   [**Confluent Schema Registry**](https://docs.confluent.io/platform/current/schema-registry/): Reference for the compatibility API also used by Apicurio.
*   [**`@kafkajs/confluent-schema-registry`**](https://github.com/kafkajs/confluent-schema-registry): Node.js client for Confluent-compatible schema registries.
*   [**`confluent-kafka-python`**](https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html): Python client with built-in Avro support.
