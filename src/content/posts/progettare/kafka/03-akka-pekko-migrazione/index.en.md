---
title: "Akka Is Dead, Long Live Pekko"
date: 2026-03-02T09:00:00.000Z
description: "A practical guide to migrating from Akka to Apache Pekko in production: complete checklist, real-world gotchas, and lessons from the field."
pillar: progettare
category: kafka
tags:
  - Scala
  - Pekko
  - Akka
  - JVM
  - Migrazione
lang: en
reviewed: machine
series: kafka
seriesOrder: 30
figures:
  - kind: inventory
    at: the-akka-license-change
    label: "The three roads, and the one taken"
    items:
      - name: "Stay on Akka 2.6.x, the last release under Apache 2.0"
      - name: "Pay for the Lightbend commercial licence"
      - name: "Migrate to Apache Pekko, the community fork"
        mark: true
    legend:
      plain: "possible"
      mark: "this article's road"
    caption: "2.6.x has been end-of-life since 19 October 2023: it works, but no future fixes"
    note: >
      The first two are legitimate and worth weighing: the choice depends on how long the
      system has to stay in production and on the budget available. The rest of the article
      walks the third.
---

A Scala service running on Akka 2.6, in production for three years. The license changes; security patches stop arriving. What follows is the hands-on migration from Akka to Apache Pekko: checklist, gotchas, and lessons from the field.

## The Akka license change

In September 2022, Lightbend announced that Akka 2.7 and all subsequent versions would be released under the Business Source License (BSL 1.1). In practice: commercial use of Akka requires a paid license. The entire Akka 2.6.x line remained under Apache 2.0 until end-of-life. Version 2.6.21, released in June 2023 as the final critical fix, is the last release in the series. From 2.7 onwards, all versions are under BSL 1.1. BSL versions automatically revert to Apache 2.0 three years after their release date, but for teams that need timely patches this clause solves nothing. Since 19 October 2023, the 2.6.x series is officially end-of-life: no further updates, but the license remains Apache 2.0.

The decision hit a broad ecosystem. Akka is the foundation for frameworks such as Play and thousands of production systems across the JVM world. For anyone maintaining production systems built on Akka, there are three options:

1. **Stay on Akka 2.6.x.** It works, but it means running a frozen version: no updates, no fixes. For a system intended to run for years, this is not sustainable.

2. **Pay for the commercial license.** A legitimate option for organizations that can afford it — not always compatible with budget constraints or a preference for open-source dependencies.

3. **Migrate to an open-source fork.** That is, Apache Pekko.

---

## Apache Pekko: the community fork

Apache Pekko was created as a fork of the Akka 2.6.x line (the last one maintained under Apache 2.0) under the Apache Software Foundation. The project was incubated and graduated to a top-level ASF project in May 2024. The license is Apache 2.0, unambiguously.

**Pekko 1.0.x** is a direct fork of Akka 2.6.x. The API is identical: same classes, same patterns, same behaviors. The only difference is the namespace: `org.apache.pekko` instead of `akka`. This makes the migration mechanical: find and replace.

**Pekko 1.1.x** introduces its own evolutions: new features, optimizations, and progressive divergence from Akka. For a migration project, the advice is to start with 1.0.x (a pure migration) and evaluate the upgrade to 1.1.x separately.

The ecosystem is complete:

- **Pekko HTTP** (formerly Akka HTTP): HTTP server and client
- **Pekko Connectors** (formerly Alpakka): connectors for Kafka, MongoDB, S3, and more
- **Pekko gRPC** (formerly Akka gRPC): gRPC support
- **Pekko Streams** (formerly Akka Streams): reactive stream processing
- **Pekko Cluster** (formerly Akka Cluster): clustering and distribution

Every module available in Akka has a direct counterpart in Pekko.

---

## Migration checklist

The practical checklist followed when migrating Scala services from Akka to Pekko. Most steps are mechanical.

### 1. build.sbt: Maven coordinates

All dependencies change their group ID and artifact name.

```scala
// Before (Akka)
"com.typesafe.akka" %% "akka-actor-typed"   % "2.6.20"
"com.typesafe.akka" %% "akka-stream"        % "2.6.20"
"com.typesafe.akka" %% "akka-http"          % "10.2.10"
"com.typesafe.akka" %% "akka-stream-kafka" % "3.0.1"

// After (Pekko)
"org.apache.pekko" %% "pekko-actor-typed"   % "1.0.3"
"org.apache.pekko" %% "pekko-stream"        % "1.0.3"
"org.apache.pekko" %% "pekko-http"          % "1.0.1"
"org.apache.pekko" %% "pekko-connectors-kafka" % "1.0.0"
```

Note that versions are not aligned across modules. `pekko-actor-typed` and `pekko-stream` follow the core versioning (1.0.x), while `pekko-http` and `pekko-connectors-kafka` have their own version lines. Each artifact must be verified individually.

### 2. Scala imports

Direct substitution across all source files:

```scala
// Before
import akka.actor.typed.ActorSystem
import akka.stream.scaladsl.Source
import akka.http.scaladsl.Http

// After
import org.apache.pekko.actor.typed.ActorSystem
import org.apache.pekko.stream.scaladsl.Source
import org.apache.pekko.http.scaladsl.Http
```

In an editor with regex support, the command is `s/import akka\./import org.apache.pekko./g`. Be careful not to replace occurrences in strings or comments where `akka` might appear in a different context.

### 3. application.conf

Configuration namespaces change from `akka {}` to `pekko {}`:

```hocon
# Before
akka {
  loglevel = "INFO"
  actor {
    provider = "local"
  }
  http {
    server {
      idle-timeout = 60s
    }
  }
}

# After
pekko {
  loglevel = "INFO"
  actor {
    provider = "local"
  }
  http {
    server {
      idle-timeout = 60s
    }
  }
}
```

This applies to `reference.conf` files defined by the project as well, and to configurations in tests.

### 4. CORS: a different library

The CORS library for Akka HTTP (`ch.megard %% akka-http-cors`) has no direct equivalent. In Pekko, CORS support is provided by the Pekko project itself:

```scala
// Before
"ch.megard" %% "akka-http-cors" % "1.2.0"
import ch.megard.akka.http.cors.scaladsl.CorsDirectives._

// After
"org.apache.pekko" %% "pekko-http-cors" % "1.0.1"
import org.apache.pekko.http.cors.scaladsl.CorsDirectives._
```

The organization change (`ch.megard` -> `org.apache.pekko`) is easy to overlook because it does not follow the same mechanical pattern as the other artifacts.

### 5. SBT plugins

If the project uses `sbt-native-packager` or other plugins associated with the Akka ecosystem, verify they do not pull in transitive Akka dependencies. In particular, `sbt-native-packager` is agnostic with respect to Akka/Pekko and requires no changes.

---

## The migration in practice

The system uses Scala/Akka in three services:

- **c40-standardization**: HTTP polling of telemetry APIs from vehicle manufacturers, data normalization, production to a Kafka topic. Uses the Akka HTTP client, Akka Streams, and Akka Kafka (Alpakka).

- **c40-aggregation**: an enrichment pipeline that consumes three Kafka topics (telemetry data, registries, assignments), joins them, and produces an aggregated topic. Uses Akka Streams and Akka Kafka.

- **filemanager**: a document management system with an HTTP REST API and MongoDB storage. Uses the Akka HTTP server and Akka Streams for file streaming.

In total the migration touched approximately **50 files**: Scala sources, configuration files, and build files. The vast majority of the work was a mechanical rename: `akka` -> `pekko`, `com.typesafe.akka` -> `org.apache.pekko`, `Akka` -> `Pekko` in comments.

The actual migration time was about **half a day** for all three services. Most of the time was not spent on the rename but on verification: compilation, tests, starting the Docker containers, checking that the services responded correctly.

### Gotcha 1: Apicurio 3.x renamed its artifacts

This is not strictly related to Pekko, but the Akka-to-Pekko migration was the opportunity to also update the Apicurio dependencies. In Apicurio 3.x the artifact for the Avro serializer/deserializer changed:

```scala
// Apicurio 2.x
"io.apicurio" % "apicurio-registry-serdes-avro-serde" % "2.6.4.Final"

// Apicurio 3.x
"io.apicurio" % "apicurio-registry-avro-serde-kafka" % "3.0.4"
```

Additionally, the configuration class was moved: `SerdeConfig` now extends `SchemaResolverConfig` (which contains options for schema resolution). The Java packages changed (`io.apicurio.registry.serde.config.SerdeConfig` in 3.x vs `io.apicurio.registry.serde.SerdeConfig` in 2.x). If the code directly references these classes to configure the registry URL or the lookup strategy, the imports will need updating.

### Gotcha 2: Materializer with typed ActorSystem

In Akka 2.6+ and Pekko 1.0+, `ActorSystem[T]` extends `ClassicActorSystemProvider`, and the `Materializer` companion object provides an implicit conversion from `ClassicActorSystemProvider` to `Materializer`. In most cases, having an `implicit val system: ActorSystem[Nothing]` in scope is sufficient to run streams without declaring an explicit `Materializer`.

The explicit pattern is only needed in specific cases (for example, to control the materializer lifecycle independently from the system):

```scala
implicit val system: ActorSystem[Nothing] = ActorSystem(Behaviors.empty, "my-system")
// Only if a Materializer with independent lifecycle is required:
implicit val mat: Materializer = SystemMaterializer(system).materializer
```

If the project was using Akka Classic with an explicit `ActorMaterializer` (deprecated since Akka 2.6), migrating to Pekko is a good opportunity to remove it and rely on the implicit conversion.

### Gotcha 3: reference.conf and namespaces

Some third-party libraries (not Pekko itself) may have `reference.conf` files that define configuration under the `akka {}` namespace. After the migration, these settings are no longer read by Pekko because the framework looks under `pekko {}`. If a service behaves strangely after the migration (different timeouts, changed buffer sizes, different logging), the first thing to check is that all `reference.conf` files have been updated.

### Gotcha 4: third-party libraries that depend on Akka

If the project uses libraries that have Akka as a transitive dependency, those libraries will continue to pull in Akka jars. The result is a classpath with both `akka` and `pekko`, which can cause conflicts. The solution is to check the dependency tree (`sbt dependencyTree`) and look for updated versions of those libraries that support Pekko, or explicitly exclude the Akka dependencies.

---

## Demo

The complete project code is available in the public repository:
[https://github.com/monte97/kafka-pekko](https://github.com/monte97/kafka-pekko)

The repository includes a Scala/Pekko consumer that demonstrates the Pekko + Avro + Apicurio Registry integration. The consumer uses Apicurio's native serde (`AvroKafkaDeserializer`) to consume Avro messages from a topic, deserialize them via the registry, and print them to the console.

To run the demo:

```bash
git clone https://github.com/monte97/kafka-pekko
cd kafka-pekko
docker compose up
```

The Scala consumer starts alongside the Node.js producer and the Python consumer, all connected to the same topic with an Avro schema.

---

## Conclusions

The migration from Akka to Apache Pekko comes down to four points:

1. **The context**: Akka's switch to BSL 1.1 makes migrating to Pekko the primary choice for open-source projects
2. **The checklist**: Maven coordinates, imports, `application.conf`, CORS libraries, and SBT plugins — most of it is a mechanical rename
3. **The gotchas**: Apicurio 3.x, implicit Materializer, third-party `reference.conf`, and transitive dependencies are the points that require manual verification
4. **The real cost**: not in the rename, but in the verification — for three services and ~50 files, about half a day

Once on Pekko 1.0.x, you are back on an active release track with bug fixes, security patches, and new features.

---

## Useful Resources

- [**Apache Pekko**](https://pekko.apache.org/): Official site with documentation, downloads, and migration guides.
- [**Pekko Migration Guide**](https://pekko.apache.org/docs/pekko/current/project/migration-guides.html): Official guide for migrating from Akka.
- [**Lightbend license change announcement**](https://akka.io/blog/why-we-are-changing-the-license-for-akka): The original BSL 1.1 license change announcement.
- [**Pekko Connectors Kafka**](https://pekko.apache.org/docs/pekko-connectors-kafka/current/home.html): Documentation for the Kafka connector for Pekko.
