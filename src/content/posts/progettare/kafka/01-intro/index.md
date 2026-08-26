---
title: "Un evento non è una richiesta: è un fatto già successo"
seoTitle: "Kafka: partizioni, chiavi e ordine"
date: 2025-08-03T08:00:00.000Z
description: "Partizioni, segmenti e chiavi: la struttura interna che decide cosa Kafka vi garantisce sull'ordine dei messaggi, e a quali condizioni."
pillar: progettare
category: kafka
tags:
  - Kafka
  - Node.js
  - Python
  - Architettura
  - Event Streaming
lang: it
mode: explanation
reviewed: false
series: kafka
seriesOrder: 10
reproducibility: true
summary:
  - label: "Problema"
    value: "Chiamate sincrone tra servizi: una latenza si propaga a catena"
    note: "Il costo cresce in modo non lineare con il numero di componenti"
  - label: "Struttura"
    value: "Ogni partizione è una directory di segmenti con indici memory-mapped"
    note: "Retention O(1): si eliminano i segmenti più vecchi, non i record"
  - label: "Contratto"
    value: "Stessa chiave, stessa partizione: ordinamento preservato"
    note: "Vale solo se il numero di partizioni resta costante"
  - label: "Durabilità"
    value: "`acks=all` come default da Kafka 3.0"
    note: "Insieme a `enable.idempotence=true`; fino al 2.8 incluso il default era `acks=1`"
openItems:
  - "Aggiungere partizioni cambia l'esito di `hash(key) % N`: messaggi con la stessa chiave possono finire in partizioni diverse"
  - "Il producer della demo usa kafkajs, client non mantenuto dal 2023: per nuovi progetti Confluent pubblica `@confluentinc/kafka-javascript`"
  - "L'articolo copre partizioni, chiave e replicazione: consumer group e ribilanciamento non sono trattati qui"
openNote: "Dove la garanzia d'ordine si ferma e cosa le fondamenta lasciano fuori."
---
## Da Chiamate Sincrone a Flussi di Eventi

Nei sistemi distribuiti, la comunicazione sincrona tra componenti introduce un accoppiamento che scala male. Quando ogni servizio deve chiamare e attendere un altro, una latenza di rete o un servizio in sovraccarico si propagano a catena. Il costo cresce in modo non lineare con il numero di componenti.

La soluzione non è semplicemente "usare una coda di messaggi". Il cambio di paradigma consiste nel passare da comandi diretti a **eventi di business**. Un evento non è una richiesta: è un fatto immutabile. "Un utente ha aggiornato il suo profilo". "Un sensore ha registrato una nuova temperatura". "Un veicolo ha trasmesso la sua posizione GPS".

[**Apache Kafka**](https://kafka.apache.org/) è una piattaforma di *event streaming* - un log distribuito e replicato che agisce come unica fonte di verità per gli eventi, permettendo ai componenti di reagire in modo asincrono, disaccoppiato e resiliente.

```text
Servizio Pagamenti  ─→
Servizio Utenti     ─→  [ Topic Eventi ]  ─→  Servizio Notifiche
Sensori IoT         ─→                    ─→  Dashboard Analytics
                                          ─→  Sistema di Auditing
```

---

## Partizioni e Segmenti: Come Kafka Ottimizza Storage e Letture

Definire Kafka come "log di commit distribuito" è tecnicamente corretto, ma non spiega le scelte ingegneristiche che ne determinano le performance. Le sezioni seguenti analizzano la struttura interna.

### La Partizione: Un Log Immutabile e Segmentato

Un **Topic** è il concetto con cui interagiamo, ma l'unità di parallelismo, storage e performance è la **Partizione**. Ogni partizione è un log di eventi **immutabile e strettamente ordinato**. L'immutabilità è un concetto chiave: i dati non vengono mai modificati, solo aggiunti in coda. Questo semplifica drasticamente la logica di replica e di lettura.

La struttura interna è meno intuitiva di quanto sembri. Una partizione non è un singolo file di log monolitico, ma una **directory contenente file di segmento**.

- **Segmenti di Log (`.log`)**: File che contengono i record veri e propri. Un segmento è "attivo" finché non raggiunge una dimensione massima (es. `segment.bytes`, di default 1GB) o un tempo di vita (`segment.ms`). A quel punto viene chiuso e ne viene creato uno nuovo.
- **Indici (`.index`, `.timeindex`)**: Per ogni file di segmento `.log`, esistono file di indice corrispondenti. L'indice di offset mappa un offset a una posizione fisica (un byte) nel file di log, permettendo letture rapide senza scansionare il file. L'indice temporale mappa un timestamp al corrispondente offset, che viene poi risolto in posizione fisica tramite l'indice di offset (un lookup a due livelli).

Questa segmentazione ha due vantaggi diretti:
1.  **Gestione della Retention**: Per eliminare i dati vecchi, Kafka non deve scandagliare il log per cancellare record. Semplicemente, **elimina i file di segmento più vecchi**. Un'operazione `rm` sul file system, con costo O(1) indipendente dalla dimensione dei dati.
2.  **Ricerca Rapida**: Gli indici, che sono molto più piccoli dei file di log, sono memory-mapped (mmap): il sistema operativo ne gestisce il caching nella page cache, permettendo a Kafka di localizzare rapidamente il punto da cui iniziare a leggere i dati, sia per offset che per timestamp.

Questo design è anche alla base della famosa ottimizzazione **zero-copy**. Quando un consumer richiede dei dati, Kafka può inviarli direttamente dal buffer del file system al buffer della scheda di rete, senza che i dati debbano mai essere copiati nello spazio di memoria dell'applicazione Kafka (user-space). Questo è possibile solo perché il formato dei dati su disco è lo stesso di quello inviato sulla rete.

```text
Partizione 0/
├── Segmento 0
│   ├── 00000000000000000000.log         ← record
│   ├── 00000000000000000000.index       ← offset → byte position
│   └── 00000000000000000000.timeindex   ← timestamp → offset
└── Segmento 1 (attivo)
    ├── 00000000000000000042.log         ← record
    ├── 00000000000000000042.index       ← offset → byte position
    └── 00000000000000000042.timeindex   ← timestamp → offset
```

### La Chiave del Messaggio e l'Ordinamento

La **chiave** di un messaggio non è un semplice metadato. È un **contratto sull'ordinamento**.

Quando un producer invia un messaggio, il **Partitioner** di default applica una formula deterministica:
`hash(chiave) % numero_partizioni`

Questo significa che **tutti i messaggi con la stessa chiave finiscono nella stessa partizione**. Poiché una partizione è un log ordinato, questo fornisce una garanzia fondamentale: **l'ordine di invio per una data chiave è preservato**.

> **Nota**: questa garanzia vale a patto che il numero di partizioni del topic resti costante. Se si aggiungono partizioni, la formula `hash(key) % N` produce risultati diversi e messaggi con la stessa chiave possono finire in partizioni diverse.

Nel progetto di monitoraggio sensori, usare `sensor_id` come chiave è la scelta più naturale. Garantisce che la sequenza di letture per il sensore `sensor-A1` venga processata nell'ordine esatto in cui è stata emessa, permettendo di rilevare trend di temperatura o anomalie senza ambiguità. Inviare letture senza una chiave comporterebbe la perdita dell'ordinamento per sensore.

E se la chiave è nulla? Le versioni più vecchie di Kafka usavano un semplice round-robin, ma questo era inefficiente (creava tanti piccoli batch). Il **Sticky Partitioner**, introdotto in Kafka 2.4 (KIP-480), invia tutti i messaggi senza chiave a una singola partizione finché il batch non è pieno, per poi passare alla partizione successiva. Da Kafka 3.3 (KIP-794) il `DefaultPartitioner` è stato deprecato e il comportamento sticky è diventato l'unico built-in. Questo migliora la compressione e riduce la latenza.

---

## Meccaniche di Replicazione e Tolleranza ai Guasti

La durabilità in Kafka è una configurazione esplicita. Si basa su un modello di replica leader-follower e sul concetto di **In-Sync Replicas (ISR)**. La [documentazione ufficiale sulla replicazione](https://kafka.apache.org/documentation/#replication) descrive il design in dettaglio.

Ogni partizione ha un **leader** (l'unica replica che accetta scritture) e zero o più **follower**. L'insieme delle ISR è la lista dei follower che sono "sufficientemente al passo" con il leader (configurabile tramite `replica.lag.time.max.ms`).

Quando un producer scrive, la sua garanzia di durabilità è determinata dall'impostazione `acks`:
-   `acks=0`: Fire-and-forget. Massima performance, ma il producer non ha conferma di ricezione.
-   `acks=1`: Attende la conferma solo dal leader. Un buon compromesso, ma se il leader fallisce un istante dopo aver confermato ma prima che i follower abbiano replicato, il dato è perso. Era il default fino a Kafka 2.8 incluso.
-   `acks=all` (o `-1`): Attende la conferma dal leader *dopo* che tutte le repliche nell'insieme ISR hanno ricevuto il messaggio. Questa è la massima garanzia di durabilità. **Da Kafka 3.0 in poi è il default**, insieme a `enable.idempotence=true`.

Per evitare che un fallimento a catena delle repliche porti a scrivere con `acks=all` su una sola replica (il leader), si usa l'impostazione del broker `min.insync.replicas`. Se, ad esempio, è impostata a `2` e un producer usa `acks=all`, una scrittura fallirà se non ci sono almeno 2 repliche nell'insieme ISR pronte a ricevere il dato. Questo previene la perdita di dati in caso di fallimento del leader.

**E se il leader fallisce?** Il **Controller** del cluster (un broker eletto o un nodo KRaft) se ne accorge, sceglie un nuovo leader dall'insieme ISR e notifica a tutti i follower di iniziare a replicare dal nuovo leader. Questo processo di elezione è il cuore della tolleranza ai guasti di Kafka.

---

## Esempi Pratici: Producer Node.js e Consumer Python

Il codice dell'applicazione di monitoraggio sensori illustra questi concetti in modo pratico. Il producer è in **Node.js** con [**kafkajs**](https://kafka.js.org/), il consumer in **Python** con [**confluent-kafka**](https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html). La serializzazione Avro è gestita da [**Apicurio Registry**](https://www.apicur.io/registry/) come Schema Registry. Il tutto orchestrato con Docker Compose.

👉 Il codice completo è disponibile nel repository: [github.com/monte97/kafka-pekko](https://github.com/monte97/kafka-pekko)

### Il Producer Node.js: Inviare Letture Sensoriali con una Chiave

Il producer (`producer/index.js`) simula l'invio di dati da più sensori. La parte cruciale è l'uso di `sensor_id` come **chiave** del messaggio per garantire l'ordinamento per ogni sensore.

Inizializzazione del client Kafka, dello Schema Registry e delle costanti per la simulazione:

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

La funzione `randomReading()` genera dati di simulazione per i sensori:

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

Il loop principale serializza ogni lettura in Avro e la invia usando `sensor_id` come chiave:

```javascript
async function main() {
  await producer.connect();
  const schemaId = await registerSchema(); // Registra lo schema Avro nel registry

  while (true) {
    const reading = randomReading();
    const value = await registry.encode(schemaId, reading);

    // La chiave è sensor_id: tutti i messaggi dello stesso sensore
    // finiscono nella stessa partizione, preservando l'ordinamento
    await producer.send({
      topic: TOPIC,
      messages: [{ key: reading.sensor_id, value }],
    });

    await sleep(5000);
  }
}
```

### Due dettagli del producer che vale la pena conoscere

Due aspetti di questo codice meritano attenzione:

1.  **`await producer.send(...)` invia un messaggio alla volta.** L'attesa della conferma del broker rende il codice leggibile, ma serializza le scritture: su throughput alti serve `producer.sendBatch()`.

> **Nota**: kafkajs non riceve aggiornamenti significativi dal 2023 ed è considerato non mantenuto. Confluent ha rilasciato un client ufficiale JavaScript ([`@confluentinc/kafka-javascript`](https://github.com/confluentinc/confluent-kafka-javascript)) basato su librdkafka. Per nuovi progetti è consigliabile valutare questa alternativa.

2.  **`registry.encode(schemaId, reading)`**: La serializzazione Avro avviene *prima* dell'invio. Il valore inviato a Kafka non è JSON ma un payload binario Avro preceduto dal magic byte e dallo schema ID. Questo è il protocollo wire standard di Confluent Schema Registry, supportato anche da Apicurio tramite l'endpoint di compatibilità `/apis/ccompat/v7`.

### Il Consumer Python: Verificare il Flusso

Il consumer (`consumer/consumer.py`) si iscrive al topic `sensor-data` e stampa le letture che riceve. Usa `confluent-kafka` con deserializzazione Avro automatica.

Configurazione del client, del deserializzatore Avro e del consumer group:

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

# Il client del registry recupera automaticamente lo schema
# usando lo schema ID incorporato in ogni messaggio Avro
sr_client = SchemaRegistryClient({"url": REGISTRY_URL})
avro_deserializer = AvroDeserializer(sr_client)

consumer = Consumer({
    "bootstrap.servers": BROKER,
    "group.id": "demo-consumer-group",
    "auto.offset.reset": "earliest",
})
consumer.subscribe([TOPIC])
```

Il loop di polling deserializza ogni messaggio e stampa la lettura. La chiusura nel blocco `finally` garantisce il rilascio delle partizioni e il commit degli offset:

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

        # Deserializza il payload Avro binario in un dizionario Python
        reading = avro_deserializer(
            msg.value(),
            SerializationContext(msg.topic(), MessageField.VALUE),
        )
        print(f"sensor={reading['sensor_id']} temp={reading['temperature']}C "
              f"humidity={reading['humidity']}%")

except KeyboardInterrupt:
    print("Shutting down...")
finally:
    consumer.close()  # Rilascia le partizioni e committa gli offset
```

### Perché il consumer chiede invece di ricevere

Il pattern del consumer merita un'analisi più attenta:

1.  **`consumer.poll(timeout=1.0)`**: Il consumer non riceve messaggi in push. È un ciclo di **polling** esplicito: ogni secondo chiede al broker se ci sono nuovi messaggi. Se non ce ne sono, `poll` restituisce `None` e il ciclo riprende. Questo modello dà al consumer pieno controllo sulla velocità di consumo (backpressure naturale).

2.  **`KafkaError._PARTITION_EOF`**: Non è un errore reale. Indica semplicemente che il consumer ha raggiunto la fine della partizione (non ci sono più messaggi da leggere per ora). È normale in un consumer che rimane in attesa di nuovi dati.

3.  **`try/except KeyboardInterrupt` + `finally`**: Questo è il pattern Python per una chiusura pulita. Quando l'utente preme Ctrl+C, Python solleva `KeyboardInterrupt`. Il blocco `finally` garantisce che `consumer.close()` venga sempre eseguito, rilasciando le partizioni assegnate e committando gli offset. Senza questa chiusura ordinata, il consumer group impiegherebbe più tempo per il ribilanciamento delle partizioni.

---

## Cosa vi garantisce davvero, e a quali condizioni

Kafka non promette che i messaggi arrivino in ordine. Promette che **i messaggi con la stessa chiave arrivino in ordine fra loro**, e solo finché il numero di partizioni non cambia. È una garanzia più stretta di quella che la gente assume, ed è quella su cui si progetta.

Le altre due che contano stanno nella stessa forma: la retention è economica perché si cancellano segmenti interi e non record, e la durabilità dipende da `acks` insieme a `min.insync.replicas` — non da uno dei due da solo.

**Detto a chi non scrive codice: passare agli eventi non rende il sistema più veloce, lo rende meno accoppiato.** Un servizio lento smette di rallentare quelli che lo chiamano, e un servizio fermo smette di fermarli — il che significa che un guasto su un pezzo non diventa un guasto sul prodotto.

Il prezzo lo si paga altrove, ed è il tema del resto della serie: l'ordine vale solo per chiave, lo stato del consumer diventa un problema vostro, e il debug attraversa un componente in più.

Il [prossimo articolo](/blog/progettare/kafka/02-schema-registry-avro-apicurio/) parte proprio da lì: cosa succede quando due servizi non sono d'accordo su cosa contiene un messaggio.

---

## Risorse per Approfondire

### Libri

*   **Designing Data-Intensive Applications** di *Martin Kleppmann*: Non è un libro su Kafka, ma copre i principi fondamentali di sistemi distribuiti e gestione dei dati che stanno alla base di tecnologie come Kafka.
*   **Kafka: The Definitive Guide** di *Gwen Shapira, Neha Narkhede, e Todd Palino*: Scritto da ingegneri che hanno lavorato a Kafka in Confluent e LinkedIn. Copre tutto, dall'amministrazione alle best practice di sviluppo.
*   **I Heart Logs** di *Jay Kreps*: Un saggio breve del co-creatore di Kafka sulla filosofia dei log distribuiti e il loro ruolo nelle architetture moderne.

### Articoli e Documentazione

*   [**Documentazione kafkajs**](https://kafka.js.org/docs/getting-started): Client Kafka per Node.js con API basata su Promise.
*   [**Documentazione confluent-kafka-python**](https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html): Wrapper Python per librdkafka, con supporto Avro nativo.
*   [**Blog di Confluent**](https://www.confluent.io/blog/): Articoli tecnici su casi d'uso avanzati, ottimizzazioni e nuove feature di Kafka.
*   [**Blog di Jay Kreps**](https://medium.com/@jaykreps): Riflessioni sull'evoluzione delle architetture software e il ruolo dello streaming di eventi.
*   [**Documentazione ufficiale Kafka**](https://kafka.apache.org/documentation/): Riferimento completo su configurazione, design e API.
