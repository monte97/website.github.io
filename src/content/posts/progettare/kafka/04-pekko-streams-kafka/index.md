---
title: Da blocking poll a stream reattivi con Pekko Connectors Kafka
seoTitle: "Pekko Connectors Kafka: da poll a stream"
date: 2026-03-02T09:00:00.000Z
description: "Refactoring da attori bloccanti a Source.queue e consumer threads dedicati: pattern pratici con Pekko Streams e Kafka per sistemi di telemetria"
pillar: progettare
category: kafka
tags:
  - Scala
  - Pekko
  - Kafka
  - Streaming
  - Avro
lang: it
reviewed: human
series: kafka
seriesOrder: 40
reproducibility: true
summary:
  - label: "Problema"
    value: "`consumer.poll` bloccante dentro un attore: tre reader saturano il dispatcher"
    note: "Su due core i default Pekko lasciano solo 2 thread hot nel pool"
  - label: "Pattern 1"
    value: "`Source.queue` con buffer 100 e dropHead per il producer"
    note: "Load shedding: scarta il messaggio più vecchio, il dato recente conta di più"
  - label: "Pattern 2"
    value: "Un thread consumer per topic, convergenza su stato condiviso `ConcurrentHashMap`"
    note: "Tre sorgenti eterogenee: due topic Avro e un JSON esterno"
  - label: "Principio"
    value: "I/O Kafka separato dalla logica di business"
    note: "Il calcolo haversine è uscito dall'attore: classe plain Scala testabile senza broker"
openItems:
  - "Con dropHead l'attore che fa offer non viene mai rallentato: quando il buffer è pieno i messaggi più vecchi vengono persi"
  - "I consumer threads non hanno shutdown graceful: senza flag volatile, `wakeup()` e `close()` gli offset restano non committati fino al session timeout"
  - "Le operazioni composte get-then-put su `ConcurrentHashMap` non sono atomiche: il lost update è accettato perché i dati telemetrici vengono ricalcolati frequentemente"
  - "L'ordine di arrivo tra i tre topic non è garantito: ogni messaggio può aggiornare lo stato indipendentemente dagli altri"
openNote: "I compromessi assunti dai due pattern, da rivalutare fuori dalla telemetria."
mode: explanation
---
## Il pattern di partenza: while(true) dentro un attore

In un sistema Akka (ora [Apache Pekko](https://pekko.apache.org/)), l'approccio più immediato è mettere tutta la logica in un attore che consuma da Kafka. L'attore consuma da Kafka, processa i messaggi, produce su un altro topic. Sembra pulito: un attore per responsabilità, supervisione automatica, tutto nel modello ad attori.

Il sistema in esame è una piattaforma di telemetria per mezzi d'opera in cantiere. Il servizio di aggregazione (`c40-aggregation`) aveva tre attori `KafkaReaderActor`, uno per topic, che facevano così:

```scala
// Prima: KafkaReaderActor (pseudocodice ricostruito dal pattern originale)
class KafkaReaderActor(consumer: KafkaConsumer[String, String],
                       handler: ActorRef[MachineryEnrichActor.Command]) {
  def activeBehaviour: Behavior[Command] = Behaviors.receiveMessage {
    case Poll =>
      // PROBLEMA: poll() blocca il thread del dispatcher
      consumer.poll(Duration.ofSeconds(5)).forEach { record =>
        handler ! MachineryEnrichActor.ProcessRecord(record.value())
      }
      self ! Poll // loop infinito
      activeBehaviour
  }
}
```

Questo pattern ha quattro problemi concreti.

**1. Blocca un thread del dispatcher.** `consumer.poll()` è una chiamata bloccante. In Akka/Pekko, gli attori condividono un pool di thread (il dispatcher). Un attore che chiama `poll(Duration.ofSeconds(5))` tiene occupato un thread per 5 secondi ad ogni ciclo. Con tre reader, tre thread sono permanentemente occupati. Il dispatcher default usa un fork-join pool con un numero di thread calcolato come `max(parallelism-min, ceil(cores * parallelism-factor))`. Con i default Pekko 1.x (`parallelism-min = 2`, `parallelism-factor = 1.0`), su una macchina a 2 core il pool ha solo 2 hot thread. Con tre reader bloccanti, il pool è completamente saturo. Gli altri attori del sistema (compresi quelli di supervisione) faticano a ricevere CPU.

**2. Nessuna backpressure.** Se `MachineryEnrichActor` è lento a processare i messaggi (per esempio perché deve fare una chiamata HTTP o un lookup costoso), i messaggi si accumulano nella mailbox dell'attore. Non c'è nessun meccanismo per dire al consumer di rallentare. In un sistema di telemetria con burst di dati, questo può portare a OutOfMemoryError.

**3. Gestione errori fragile.** La `SupervisorStrategy.restart` riavvia l'attore da zero. Per un consumer Kafka, "da zero" significa ricreare il consumer, ri-sottoscriversi al topic, e ripartire dall'ultimo offset committato. Se l'errore è transiente (un timeout di rete), il costo del restart è sproporzionato.

**4. Non testabile in isolamento.** La logica di business (arricchimento, trasformazione) è intrecciata con la logica di I/O Kafka. Per testare l'arricchimento serve un broker Kafka, oppure un mock complesso dell'intero consumer.

Il servizio di standardizzazione (`c40-standardization`) aveva un problema simile ma speculare: gli attori `HttpC40Reader` facevano polling su API HTTP esterne e poi dovevano mandare i dati su Kafka tramite un `KafkaWriterActor`. La catena era attore HTTP -> messaggio -> attore Kafka -> `producer.send()`. Due attori, due mailbox, nessuna backpressure end-to-end.

---

## La soluzione: separare le responsabilità

L'idea chiave è semplice: un attore non dovrebbe fare I/O bloccante. La responsabilità di consumare da Kafka (o produrre su Kafka) va separata dalla logica di business. Ci sono tre componenti:

- **Kafka consumer**: un thread dedicato o un Pekko Connectors source
- **Logica di business**: una funzione pura o un oggetto stateful
- **Kafka producer**: un stream sink o una chiamata diretta all'API producer

La separazione può essere implementata in modi diversi a seconda del caso d'uso. Nei due servizi in esame sono stati adottati due pattern distinti.

---

## Pattern 1: Source.queue per il producer

Nel servizio `c40-standardization`, il problema principale è il producer. Gli attori `HttpC40Reader` interrogano API HTTP esterne a intervalli regolari e devono mandare i dati standardizzati su Kafka. La soluzione è un `Source.queue` di Pekko Streams che funge da ponte tra il mondo degli attori e uno stream reattivo.

Ecco il codice attuale del `Launcher.scala`:

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
  queue.offer(data) // restituisce Future[QueueOfferResult]: gestire Dropped/Failure in produzione
}
```

Il flusso è questo:

1. Si crea un `Source.queue` con buffer di 100 elementi e strategia `dropHead` (se il buffer è pieno, scarta il messaggio più vecchio)
2. Ogni elemento che entra nella queue viene convertito in un `GenericRecord` Avro e inviato a Kafka in modo asincrono tramite `mapAsync`, che evita di bloccare il thread del materializer e propaga correttamente gli errori del producer
3. Gli attori `HttpC40Reader` ricevono la funzione `enqueueData` e la chiamano quando hanno nuovi dati

> **Nota**: l'uso di `mapAsync` con il callback del producer è sufficiente per questo caso d'uso. Per scenari più complessi (gestione dei commit, backpressure nativa verso il broker, retry), la soluzione production-grade è `Producer.flexiFlow` di [Pekko Connectors Kafka](https://pekko.apache.org/docs/pekko-connectors-kafka/current/producer.html), che gestisce asincronismo e backpressure verso il broker nativamente.

```scala
val recordReaderActor = context.spawn(
  HttpC40Reader("RecordReader", ReaderFactory.recordReader, enqueueData), "recordReader")
recordReaderActor ! HttpC40Reader.Start

val targaReaderActor = context.spawn(
  HttpC40Reader("TargaReader", ReaderFactory.targaReader, enqueueData), "targaReader")
targaReaderActor ! HttpC40Reader.Start
```

Il vantaggio rispetto al pattern precedente: il `Source.queue` fornisce un buffer limitato con **load shedding**. Se il producer Kafka rallenta, il buffer si riempie e i messaggi più vecchi vengono scartati (`dropHead`). Va precisato che questo non è backpressure in senso stretto: con `dropHead` l'attore che chiama `queue.offer()` non viene mai rallentato, semplicemente i dati più vecchi vengono persi. La backpressure vera esiste solo *dentro* lo stream (tra la queue e il sink). Per propagare pressione fino agli attori si potrebbe usare `OverflowStrategy.backpressure`, dove la `Future` restituita da `offer()` non completa finché non c'è spazio nel buffer. In un sistema di telemetria, il load shedding con `dropHead` è la scelta pragmatica: il dato più recente è sempre più rilevante. Nessun rischio di OutOfMemoryError.

Gli attori `HttpC40Reader` restano semplici: ricevono un messaggio `Act` dallo scheduler, chiamano l'API HTTP, diffano i dati con lo stato precedente, e per ogni dato cambiato chiamano `enqueueData`. Non sanno nulla di Kafka, di Avro, di serializzazione. Se l'API HTTP fallisce, la `SupervisorStrategy.restart` riavvia solo il reader, senza toccare lo stream Kafka.

```scala
def activeBehaviour: Behavior[Command] = Behaviors.supervise(
  Behaviors.receiveMessage[Command] {
    case Act =>
      diff(currentState, updatedData())
        .filter(data => !currentState.contains(data._1) || data._2 != currentState(data._1))
        .foreach { data =>
          currentState += data
          onData(data._2)  // chiama enqueueData
        }
      activeBehaviour
  }
).onFailure[Exception](SupervisorStrategy.restart)
```

---

## Pattern 2: Consumer threads + stato condiviso per l'enrichment

Nel servizio `c40-aggregation`, il problema è diverso. Tre topic alimentano uno stato condiviso: i dati telemetrici (`data.c40.equipment.standardized`), il registry attrezzature (`data.registry.equipment`), e i punti di interesse (`POINT_OF_INTEREST_TABLE`). Ogni messaggio da qualsiasi topic può aggiornare lo stato e produrre un messaggio arricchito in output.

Qui un full Pekko Connectors Kafka con `Consumer.plainSource` sarebbe possibile, ma complesso. Bisognerebbe fare un merge di tre source con tipi diversi (due Avro, uno String/JSON), convergere su uno stato condiviso, e gestire il fatto che l'ordine di arrivo tra topic diversi non è garantito. I consumer threads sono una scelta pragmatica.

Ecco il codice attuale:

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

La differenza rispetto al pattern precedente: i `while(true)` ci sono ancora, ma girano su **thread dedicati** (`new Thread(...)`), non su thread del dispatcher Pekko. Il dispatcher resta libero per gli attori del sistema. Ogni consumer ha il suo thread, fa la sua `poll()`, e chiama lo stato condiviso.

Va notato che i consumer threads così scritti non hanno un meccanismo di shutdown graceful. Allo spegnimento della JVM, i consumer non committano gli offset pendenti e le connessioni al broker restano aperte fino al session timeout. In produzione, il pattern corretto prevede un flag `volatile` per uscire dal loop, una chiamata a `consumer.wakeup()` per interrompere la `poll()`, e un blocco `try/finally` con `consumer.close()`. La migrazione a `Consumer.plainSource` di Pekko Connectors Kafka risolve questo problema nativamente.

Lo stato condiviso è un `EnrichmentState` basato su `ConcurrentHashMap`:

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

`ConcurrentHashMap` garantisce thread-safety per le operazioni `get` e `put` individuali. Le operazioni composte (get-then-put) non sono atomiche: se `enrichC40` e `updateRegistry` vengono chiamati contemporaneamente per lo stesso identificativo (possibile, dato che girano su thread diversi), si verifica un classico **lost update**. Non è semplicemente "l'ultimo timestamp vince": il secondo `put` potrebbe sovrascrivere lo stato con una versione che non include l'aggiornamento del primo thread. Per esempio, un `updateRegistry` potrebbe sovrascrivere un arricchimento C40 appena inserito, perdendolo. Per dati telemetrici dove il valore viene ricalcolato frequentemente, questo è accettabile in pratica. Per casi d'uso più stringenti, `ConcurrentHashMap.compute()` offre atomicità a livello di singola chiave, garantendo che la lettura e la scrittura avvengano in un'unica operazione atomica.

L'arricchimento fa anche un calcolo geospaziale: per ogni dato C40 con coordinate GPS, cerca i punti di interesse entro 1000 metri usando la formula dell'haversine. Nella versione precedente questo calcolo era dentro un attore (`MachineryEnrichActor`); ora è in una classe plain Scala, testabile senza attori né Kafka.

---

## Avro e Schema Registry nel mix

Entrambi i servizi usano Avro con Apicurio Registry. La configurazione lato Scala si basa sulle librerie Apicurio native: `AvroKafkaSerializer` per il producer e `AvroKafkaDeserializer` per il consumer.

```scala
// Producer: registrazione automatica dello schema
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, classOf[AvroKafkaSerializer[_]].getName)
props.put(SchemaResolverConfig.REGISTRY_URL, schemaRegistryUrl)
props.put(SchemaResolverConfig.AUTO_REGISTER_ARTIFACT, "true")

// Consumer: risoluzione automatica dello schema
props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, classOf[AvroKafkaDeserializer[_]].getName)
props.put(SchemaResolverConfig.REGISTRY_URL, schemaRegistryUrl)
```

Il producer con `AUTO_REGISTER_ARTIFACT = true` registra lo schema nel registry alla prima `send()`. Il consumer legge lo schema ID dal header del messaggio (il formato dipende dalla configurazione del serializer: 5 byte nel formato Confluent, fino a 9 byte nel formato nativo Apicurio). Il topic `POINT_OF_INTEREST_TABLE` resta in String/JSON perché è prodotto da un sistema esterno non controllato internamente: per quello si usano `stringConsumerProperties` con `StringDeserializer`.

Un gotcha importante: in Apicurio 3.x la classe `SchemaResolverConfig` è stata spostata da `io.apicurio.registry.serde.config` a `io.apicurio.registry.resolver.config`. Se si aggiorna Apicurio da 2.x a 3.x, il codice compila ma l'import cambia. In più, il concetto di "artifact" è stato rinominato internamente, anche se l'API resta compatibile. L'import attuale:

```scala
import io.apicurio.registry.resolver.config.SchemaResolverConfig
import io.apicurio.registry.serde.avro.{AvroKafkaDeserializer, AvroKafkaSerializer}
```

---

## Demo

L'intero codice del progetto è disponibile nel repository pubblico:
[https://github.com/monte97/kafka-pekko](https://github.com/monte97/kafka-pekko)

Il modulo `pekko-patterns/` implementa entrambi i pattern in un progetto self-contained.

```bash
git clone https://github.com/monte97/kafka-pekko
cd kafka-pekko
docker compose up
```

Il metadata-seeder registra 3 sensori con soglie diverse, poi il servizio `pekko-patterns` avvia entrambi i pattern:

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

Il pattern 1 (`Source.queue`) riceve le letture dagli attori e le pubblica su `sensor-data`. Il pattern 2 (consumer threads) legge i metadati da `sensor-metadata`, arricchisce le letture con lo stato condiviso (`ConcurrentHashMap`) e produce su `sensor-enriched`.

L'interfaccia web di Apicurio è disponibile su `http://localhost:8081/ui`, dove è possibile verificare i 3 schema registrati (`SensorReading`, `SensorMetadata`, `EnrichedReading`).

Per pulire tutto:

```bash
docker compose down -v
```

---

## Conclusioni

La migrazione da blocking poll ad architetture reattive può essere incrementale. I pattern analizzati mostrano come:

1. **Il pattern bloccante** (polling in un attore) occupa thread del dispatcher, non offre backpressure e rende la logica di business non testabile in isolamento
2. **`Source.queue` per il producer** permette agli attori di depositare i risultati in una queue con buffer e strategia di overflow, senza bloccare il dispatcher
3. **Consumer threads dedicati** sono la scelta pragmatica quando più consumer convergono su uno stato condiviso mutabile con tipi eterogenei (Avro + JSON)
4. **La separazione delle responsabilità** (I/O Kafka vs logica di business) è il principio guida, indipendentemente dal pattern scelto

Il passo successivo naturale è sostituire i consumer threads con `Consumer.plainSource` di [Pekko Connectors Kafka](https://pekko.apache.org/docs/pekko-connectors-kafka/current/consumer.html), per ottenere backpressure anche sul lato consumer, commit degli offset gestiti dallo stream, e shutdown graceful.

---

## Risorse Utili

*   [**Documentazione Pekko Streams**](https://pekko.apache.org/docs/pekko/current/stream/index.html): Riferimento completo su Source, Flow, Sink e operatori.
*   [**Pekko Connectors Kafka**](https://pekko.apache.org/docs/pekko-connectors-kafka/current/home.html): Consumer, Producer e Transactional sources/sinks per Kafka.
*   [**Apicurio Registry**](https://www.apicur.io/registry/): Schema Registry compatibile con Confluent, supporta Avro, Protobuf e JSON Schema.
*   [**Documentazione ufficiale Kafka**](https://kafka.apache.org/documentation/): Riferimento completo su configurazione, design e API.
