# Tech Review — 04-pekko-streams-kafka

**Data**: 2026-03-14
**Articoli**: `index.md` (IT), `index.en.md` (EN)
**Score IT**: 9/10
**Score EN**: 9/10

---

## Verifica API e Correttezza Tecnica

### Pekko Streams

| Elemento | Verifica | Esito |
|----------|----------|-------|
| `Source.queue(bufferSize, overflowStrategy)` | Firma corretta per Pekko Streams 1.x | OK |
| `OverflowStrategy.dropHead` | Semantica corretta: scarta l'elemento piu vecchio | OK |
| `OverflowStrategy.backpressure` - `offer()` non completa senza spazio | Comportamento corretto | OK |
| `mapAsync(parallelism)(f: T => Future[U])` | API corretta | OK |
| `toMat(Sink.ignore)(Keep.both)` per estrarre la queue | Pattern corretto | OK |
| `Materializer(context.system)` - costruzione implicita | Corretto per Pekko Typed | OK |

### Pekko Connectors Kafka

| Elemento | Verifica | Esito |
|----------|----------|-------|
| `Producer.flexiFlow` come soluzione production-grade | Corretto — gestisce backpressure verso broker e commit | OK |
| `Consumer.plainSource` come passo successivo | API corretta, citata con link alla doc ufficiale | OK |
| Motivazione per non usare `Consumer.plainSource` nel Pattern 2 | Corretta: merge di tipi eterogenei (Avro + JSON) su stato condiviso | OK |

### Apache Kafka Consumer (Java API)

| Elemento | Verifica | Esito |
|----------|----------|-------|
| `consumer.poll(Duration.ofSeconds(5))` bloccante sul thread chiamante | Corretto | OK |
| Fork-join pool formula: `max(parallelism-min, ceil(cores * parallelism-factor))` | Corretta per Pekko 1.x | OK |
| Default `parallelism-min=2`, `parallelism-factor=1.0` | Corretti per Pekko 1.x | OK |
| Pattern shutdown graceful: `volatile` flag + `consumer.wakeup()` + `try/finally consumer.close()` | Corretto - e' il pattern standard | OK |
| Mancanza di shutdown graceful nei consumer threads come mostrato | Riconosciuta esplicitamente nel testo | OK |

### ConcurrentHashMap e Thread Safety

| Elemento | Verifica | Esito |
|----------|----------|-------|
| `get` e `put` individuali thread-safe | Corretto | OK |
| Operazioni composte get-then-put non atomiche = lost update | Corretto | OK |
| `ConcurrentHashMap.compute()` come soluzione per atomicita a livello di chiave | Corretto | OK |
| Descrizione del lost update ("il secondo put sovrascrive senza includere l'aggiornamento del primo") | Analisi corretta del race condition | OK |

### Apicurio Registry

| Elemento | Verifica | Esito |
|----------|----------|-------|
| `SchemaResolverConfig.AUTO_REGISTER_ARTIFACT` | Chiave di configurazione corretta | OK |
| `SchemaResolverConfig.REGISTRY_URL` | Chiave corretta | OK |
| Spostamento da `io.apicurio.registry.serde.config` a `io.apicurio.registry.resolver.config` in 3.x | Corretto | OK |
| 5 byte header Confluent, fino a 9 byte Apicurio nativo | Corretto - formato wire Confluent e' 5 byte (magic byte + 4 byte schema ID) | OK |
| `AvroKafkaSerializer` / `AvroKafkaDeserializer` nel package `io.apicurio.registry.serde.avro` | Corretto anche per 3.x | OK |

---

## Problemi Trovati

Nessun problema P0 o P1.

### P2 - Miglioramenti minori (non applicati)

**P2-01**: Nel Pattern 2, la `sendToKafka` usa il producer Kafka Java direttamente senza gestione degli errori. Il `producer.send()` e' fire-and-forget con callback non catturato. Il testo riconosce correttamente che questo e' un pattern deliberato per semplicita, ma non menziona esplicitamente che le eccezioni nel callback vengono silenziate. In produzione si dovrebbe loggare il failure nel callback. Non e' un errore tecnico (il codice compila e funziona), ma e' un gotcha omesso.

**P2-02**: Il codice del Pattern 2 usa `new Thread(...)` senza `setDaemon(true)`. Con thread non-daemon, la JVM non termina finche i thread non terminano. Dato che i thread hanno `while(true)` senza exit condition, questo significa che `System.exit()` non terminerebbe pulitamente senza un interrupt. Il testo menziona la mancanza di shutdown graceful ma non questo aspetto specifico dei daemon thread.

---

## Conclusione Tech Review

Entrambe le versioni (IT e EN) sono tecnicamente accurate. Il contenuto dimostra comprensione approfondita delle API Pekko Streams, Pekko Connectors Kafka, e delle problematiche di concorrenza con `ConcurrentHashMap`. I limiti dei pattern adottati sono riconosciuti onestamente nel testo. Nessuna modifica tecnica necessaria.
