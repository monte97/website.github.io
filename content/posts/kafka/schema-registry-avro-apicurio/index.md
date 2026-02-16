---
title: "Schema Registry con Apache Kafka: da JSON selvaggio ad Avro con Apicurio"
date: 2026-02-14T10:00:00+01:00
description: "Migrazione da JSON senza schema ad Avro con Apicurio Registry: infrastruttura, producer Node.js, consumer Python, schema evolution"
menu:
  sidebar:
    name: "2. Schema Registry Avro"
    identifier: schema-registry-avro
    weight: 20
    parent: KAFKA
tags: ["Kafka", "Avro", "Schema Registry", "Apicurio", "Node.js", "Python"]
categories: ["Backend", "Tecnologie"]
draft: true
---
## Il problema: JSON senza contratto

In un sistema a microservizi con Kafka al centro, il JSON e' il formato naturale per i messaggi. E' leggibile, tutti i linguaggi lo supportano, non richiede setup. Ma quando il sistema cresce, il JSON senza schema diventa un problema silenzioso.

Il sistema in esame e' una piattaforma di telemetria per mezzi d'opera in cantiere. L'architettura coinvolge tre linguaggi: Node.js per il servizio anagrafica (producer), Scala/Pekko per la standardizzazione e l'aggregazione dei dati telemetrici (consumer e producer), Python/Flask per i servizi di storico, utilizzo e reportistica (consumer). Tutti comunicano attraverso topic Kafka, tutti producono e consumano JSON.

Il problema non si manifesta con un errore visibile. Si manifesta cosi':

- Il servizio Node.js aggiunge un campo `last_update` al messaggio su `registry-equipment`. Il consumer Scala lo ignora silenziosamente perche' non lo conosce. Nessun errore, nessun log. Tre mesi dopo qualcuno scopre che quel campo non e' mai arrivato a destinazione.

- Il servizio di standardizzazione Scala cambia il formato del timestamp da stringa ISO a epoch millis. Il consumer Python continua a parsare il campo come stringa, ottiene un numero, lo converte in una data insensata. Nessuna eccezione, solo dati sbagliati nel database.

- Un nuovo sviluppatore deve scrivere un consumer per un topic esistente. L'unica documentazione del formato e' il codice sorgente del producer. Che e' in un altro linguaggio, in un altro repository.

Il problema di fondo e' che non esiste un **contratto** sul formato dei messaggi. Ogni servizio ha la propria versione implicita dello schema, definita dal codice che serializza o deserializza. Quando queste versioni divergono, il sistema non si rompe: si degrada silenziosamente.

## La scelta: perche' Schema Registry

Per risolvere il problema servono due cose: uno schema formale per ogni topic, e un meccanismo che impedisca di pubblicare messaggi non conformi. Ci sono tre approcci.

**1. Validazione JSON Schema a livello applicativo.** Ogni servizio valida i messaggi contro un JSON Schema prima di produrli o dopo averli consumati. Il problema e' che la validazione e' decentralizzata: ogni servizio deve implementarla, mantenerla aggiornata, e non c'e' nessun meccanismo che impedisca a un producer di pubblicare un messaggio invalido. Se un servizio salta la validazione, i messaggi passano comunque.

**2. Confluent Schema Registry.** Il registry di riferimento nell'ecosistema Kafka. Maturo, ben documentato, con librerie client per tutti i linguaggi. Ma dalla versione 7.x la licenza e' Confluent Community License, non Apache 2.0. Per un progetto open-source-first, o per un'installazione on-premise dove le licenze contano, questo e' un limite.

**3. Apicurio Registry.** Progetto open-source, licenza Apache 2.0. Supporta Avro, JSON Schema, Protobuf. Puo' usare Kafka stesso come storage (KafkaSQL), quindi non richiede un database esterno. E soprattutto: espone un'API compatibile con Confluent (`/apis/ccompat/v7`), il che significa che le librerie client standard di Confluent funzionano senza modifiche.

La scelta per questo progetto e' ricaduta su Apicurio. Il motivo principale e' pragmatico: zero dipendenze aggiuntive (gli schema vengono salvati in un topic Kafka interno) e compatibilita' con tutto l'ecosistema di librerie client gia' esistente.

## Perche' Avro e non JSON Schema

Una volta scelto il registry, serve scegliere il formato di serializzazione. La scelta e' tra Avro, JSON Schema e Protobuf. In questo contesto tutti i topic servono alla comunicazione tra microservizi interni: nessun browser, nessun client esterno, nessuna API pubblica. Questo restringe la scelta a due candidati realistici: Avro e JSON Schema.

| Caratteristica | Avro | JSON Schema |
|---|---|---|
| Formato wire | Binario (nessun nome campo nel payload) | JSON testuale |
| Dimensione payload | Compatto (solo valori) | Verboso (nomi campo ripetuti) |
| Schema evolution | Formalizzata (reader/writer schema) | Meno formalizzata |
| Leggibilita' messaggi | Richiede lo schema per decodificare | Leggibile con qualsiasi tool |
| Debugging | Serve un tool (kafka-avro-console-consumer) | `kafkacat` basta |
| Velocita' serializzazione | Molto veloce (formato binario nativo) | Piu' lenta (parsing testo) |
| Tipi logici | timestamp-millis, date, decimal, uuid | Dipende dall'implementazione |

La regola pratica adottata e' semplice: **Avro per il core interno** (tutti i topic tra microservizi), **JSON Schema per i bordi** (API REST, webhook, integrazioni esterne).

Il vantaggio decisivo di Avro in questo contesto e' la schema evolution formalizzata. In Avro, quando un consumer legge un messaggio scritto con una versione diversa dello schema, il runtime sa esattamente come gestire la differenza: campi nuovi con default vengono aggiunti automaticamente, campi rimossi vengono ignorati. Non c'e' codice applicativo da scrivere per gestire le differenze di versione. Questo e' critico in un sistema dove tre linguaggi diversi consumano gli stessi topic.

## Infrastruttura: Apicurio + KafkaSQL

L'infrastruttura richiede un singolo container in piu' rispetto a un cluster Kafka standard. Ecco il `docker-compose.yml` della demo:

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

Il punto chiave e' `APICURIO_STORAGE_KIND: kafkasql`. Con questa configurazione, Apicurio salva tutti gli schema in un topic Kafka interno. Nessun PostgreSQL, nessun volume da gestire, nessun backup aggiuntivo. Gli schema vengono replicati e persistiti con le stesse garanzie del broker Kafka.

Una volta avviato, l'interfaccia web di Apicurio e' disponibile su `http://localhost:8081/ui`. Da li' si possono navigare tutti gli schema registrati, vedere le versioni, testare la compatibilita'. E' uno strumento utile soprattutto nella fase di migrazione, per verificare che gli schema siano stati registrati correttamente.

## Definire gli schema Avro

Uno schema Avro e' un file `.avsc` (JSON) che descrive la struttura di un record. Ecco lo schema usato nella demo, un `SensorReading` che rappresenta una lettura da sensore:

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

Alcune cose da notare:

- **Namespace**: `demo.sensors` identifica univocamente il tipo nel registry. In produzione si usano `c40.telemetry`, `c40.registry`, `c40.usage`.

- **Logical types**: `timestamp-millis` dice al runtime che il campo `long` rappresenta un timestamp in millisecondi. Le librerie client lo convertono automaticamente nel tipo data nativo del linguaggio.

- **Union types per campi opzionali**: `["null", "string"]` con `"default": null` e' il pattern Avro per un campo opzionale. A differenza di JSON, in Avro ogni campo e' obbligatorio a meno che non si usi un union con `null`.

In produzione, gli schema sono piu' complessi. Ecco un estratto dello schema `C40Standardized` che rappresenta un dato telemetrico normalizzato:

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

I **record annidati** sono uno dei punti di forza di Avro: `C40Location` contiene `C40GPS`, e ogni sotto-record ha il suo nome e puo' essere referenziato altrove. In JSON avresti lo stesso nesting, ma senza la possibilita' di riusare i tipi.

## Producer Node.js con schema registry

Il producer e' il servizio che registra lo schema nel registry e serializza i messaggi in formato Avro. In Node.js si utilizzano `kafkajs` per la connessione Kafka e `@kafkajs/confluent-schema-registry` per l'integrazione con il registry.

```javascript
const { Kafka } = require("kafkajs");
const { SchemaRegistry, SchemaType } = require("@kafkajs/confluent-schema-registry");
const fs = require("fs");
const path = require("path");

const BROKER = process.env.KAFKA_BROKER || "localhost:9092";
const REGISTRY_URL = process.env.SCHEMA_REGISTRY_URL || "http://localhost:8081";
const TOPIC = "sensor-data";

const kafka = new Kafka({ clientId: "demo-producer", brokers: [BROKER] });
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

    // Encode serializza il record secondo lo schema e prepend lo schema ID
    const value = await registry.encode(schemaId, reading);

    await producer.send({
      topic: TOPIC,
      messages: [{ key: reading.sensor_id, value }],
    });
  }
}
```

Il flusso e' lineare:

1. Si carica lo schema dal file `.avsc`
2. Lo si registra nel registry con il subject `sensor-data-value` (convenzione: `{topic}-value`)
3. Si usa `registry.encode(schemaId, record)` per serializzare ogni messaggio

La chiamata `encode` fa due cose: serializza il record in formato binario Avro, e prepone 5 byte al payload (1 byte magic + 4 byte schema ID). Questo prefix e' il meccanismo con cui il consumer sa quale schema usare per decodificare il messaggio, senza doverlo conoscere a priori.

In ambiente Docker, la variabile `SCHEMA_REGISTRY_URL` viene configurata a `http://schema-registry:8080/apis/ccompat/v7`. Quel path `/apis/ccompat/v7` e' l'endpoint di compatibilita' Confluent di Apicurio. La libreria `@kafkajs/confluent-schema-registry` non sa di parlare con Apicurio: vede un'API Confluent standard.

## Consumer Python con Avro

Il consumer e' scritto in Python usando `confluent-kafka` con il modulo `schema_registry`. Il punto chiave e' che il consumer **non ha bisogno dello schema**: lo recupera automaticamente dal registry usando lo schema ID incorporato in ogni messaggio.

```python
import os
from confluent_kafka import Consumer, KafkaError
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroDeserializer
from confluent_kafka.serialization import MessageField, SerializationContext

BROKER = os.environ.get("KAFKA_BROKER", "localhost:9092")
REGISTRY_URL = os.environ.get("SCHEMA_REGISTRY_URL", "http://localhost:8081")
TOPIC = "sensor-data"

# Il client si connette al registry per recuperare gli schema on-demand
sr_client = SchemaRegistryClient({"url": REGISTRY_URL})

# AvroDeserializer legge lo schema ID dal messaggio e lo usa per decodificare
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

    # Deserializzazione automatica: Avro binary -> dict Python
    reading = avro_deserializer(
        msg.value(),
        SerializationContext(msg.topic(), MessageField.VALUE),
    )

    print(f"sensor={reading['sensor_id']} temp={reading['temperature']}C")
```

Il flusso del consumer:

1. `AvroDeserializer` legge i primi 5 byte del messaggio per estrarre lo schema ID
2. Chiede al registry lo schema corrispondente (con cache locale)
3. Usa quello schema per deserializzare il payload binario in un dizionario Python

Il risultato e' che producer e consumer sono completamente disaccoppiati: il producer puo' evolvere lo schema, e il consumer continuera' a funzionare finche' l'evoluzione e' compatibile.

## Schema evolution: aggiungere un campo senza rompere

La schema evolution e' il motivo principale per adottare un registry. La domanda e': cosa succede quando il producer inizia a mandare messaggi con un campo in piu'? O in meno?

La modalita' di compatibilita' piu' comune e' **BACKWARD**: un consumer con lo schema v(N) puo' leggere messaggi scritti con lo schema v(N-1). In pratica questo significa che e' possibile aggiungere campi opzionali (con default) e rimuovere campi, ma non aggiungere campi obbligatori o cambiare il tipo di un campo.

**Nota**: Apicurio Registry di default non applica nessun controllo di compatibilita' (modalita' NONE). La regola BACKWARD va configurata esplicitamente per ogni subject, come mostrato negli script della demo.

La demo include due script che mostrano questo in azione.

**Evoluzione compatibile** (`scripts/evolve-schema.sh`): aggiunge un campo opzionale `battery_level` con default `-1.0`.

```json
{
  "name": "battery_level",
  "type": "double",
  "default": -1.0
}
```

Il registry accetta la nuova versione. Il producer inizia a mandare messaggi con il campo `battery_level`. Il consumer, che conosce solo v1, continua a funzionare: il campo viene semplicemente ignorato nella deserializzazione. Nessun errore, nessun crash, nessun codice da cambiare.

**Evoluzione incompatibile** (`scripts/break-schema.sh`): tenta di rimuovere il campo obbligatorio `humidity`.

```bash
$ ./scripts/break-schema.sh
HTTP Status: 409
{
  "error_code": 409,
  "message": "Schema being registered is incompatible with an earlier schema"
}
```

Il registry rifiuta la registrazione. Questa e' la rete di sicurezza: un producer non puo' accidentalmente rompere i consumer rimuovendo un campo da cui dipendono.

## Lezioni apprese

Dalla migrazione del sistema da JSON senza schema ad Avro con Apicurio emergono le seguenti lezioni pratiche.

**1. Migrazione incrementale, topic per topic.** Non serve un big bang. Si sceglie un topic, si definisce lo schema, si aggiorna il producer per serializzare in Avro, poi si aggiornano i consumer. Gli altri topic continuano a funzionare in JSON. La migrazione e' partita dal topic `c40-standardized` perche' ha un singolo producer e due consumer: il percorso piu' semplice.

**2. Il dual-write non serve se puoi fermare i servizi.** Molti articoli consigliano un periodo di dual-write dove il producer scrive sia JSON che Avro su due topic separati. Se il sistema puo' essere fermato brevemente (i servizi di telemetria tollerano un restart di pochi secondi senza perdita dati grazie al buffering Kafka), il passaggio puo' essere diretto.

**3. GenericRecord vs SpecificRecord.** In Scala e Java, Avro offre due modalita': `GenericRecord` (dizionario chiave-valore, flessibile, nessuna generazione di codice) e `SpecificRecord` (classi generate dallo schema, type-safe, richiede un plugin build). Per servizi che consumano molti topic diversi, `GenericRecord` e' piu' pratico. Per servizi con pochi topic e logica complessa, `SpecificRecord` offre garanzie a compile-time.

**4. L'API Confluent-compatible di Apicurio e' il fattore abilitante.** Il path `/apis/ccompat/v7` permette di usare `@kafkajs/confluent-schema-registry` per Node.js e `confluent-kafka[avro]` per Python senza nessuna modifica. Non serve cercare librerie client specifiche per Apicurio. Questo riduce significativamente il costo della migrazione.

**5. Schema inline vs file .avsc.** Per servizi interpretati (Node.js, Python) caricare il file `.avsc` a runtime funziona bene. Per servizi compilati (Scala) puo' essere piu' pratico avere lo schema inline nel codice o generato a build-time, specialmente se si usa `SpecificRecord`. I file `.avsc` sono mantenuti in una directory condivisa nel repository (`schemas/avro/`) come source of truth, e ogni servizio li carica nel modo piu' naturale per il suo linguaggio.

## Demo

Il [repository demo](https://github.com/monte97/kafka-pekko) contiene un progetto self-contained avviabile con un solo comando.

```bash
cd docs/demos/kafka-schema-registry
docker compose up
```

In circa 30 secondi il producer Node.js registra lo schema e inizia a mandare messaggi, mentre il consumer Python li riceve e li decodifica:

```
demo-producer  | [producer] #1 | sensor=sensor-A1 temp=24.57C humidity=48.32% location=warehouse-north
demo-consumer  | [consumer] #1 | sensor=sensor-A1 temp=24.57C humidity=48.32% location=warehouse-north
```

L'interfaccia web di Apicurio e' disponibile su `http://localhost:8081/ui`, dove e' possibile navigare gli schema registrati.

Con lo stack attivo, e' possibile testare i due script di evoluzione:

```bash
# Aggiunta compatibile: nuovo campo opzionale battery_level
./scripts/evolve-schema.sh

# Rimozione incompatibile: il registry rifiuta
./scripts/break-schema.sh
```

Per pulire tutto:

```bash
docker compose down -v
```

L'intero stack (Kafka KRaft, Apicurio Registry, producer Node.js, consumer Python) richiede meno di 1 GB di RAM e gira su qualsiasi macchina con Docker. Il codice sorgente completo e' disponibile nel repository.
