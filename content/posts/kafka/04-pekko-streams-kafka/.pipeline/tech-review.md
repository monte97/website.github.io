# Tech Review — Da blocking poll a stream reattivi con Pekko Connectors Kafka

**Reviewer**: Claude Opus 4.6 (automated tech review)
**Date**: 2026-02-25
**Article**: `content/posts/kafka/04-pekko-streams-kafka/index.md`
**Scope**: Correttezza codice Scala, API Pekko/Kafka, analisi concorrenza ConcurrentHashMap, link e versioni

---

## Score: 8/10

L'articolo e' ben strutturato, tecnicamente solido nei suoi argomenti principali, e presenta codice di produzione reale anziche' esempi giocattolo. L'approccio a due pattern e' ben motivato dai rispettivi casi d'uso. Il codice con `mapAsync` e `Promise`/`Future` per il producer e' corretto. La spiegazione della distinzione tra load shedding (`dropHead`) e backpressure vera e' precisa e ben articolata. L'analisi del lost update su `ConcurrentHashMap` e' corretta e pertinente. Le deduzioni principali sono per: (1) un'affermazione errata sulla configurazione del dispatcher Pekko, (2) alcune lacune production-readiness nei consumer threads che, pur menzionate, andrebbero espanse, e (3) imprecisioni minori su Apicurio e link.

---

## Riepilogo quantitativo

| Priorita' | Count | Dettagli |
|-----------|-------|---------|
| P0 | 1 | parallelism-min errato (8 vs 2 in Pekko) |
| P1 | 4 | offer() result, error handling consumer threads, offset commit, repository GitHub |
| P2 | 6 | Materializer esplicito, daemon threads, Apicurio wire format, pseudocode self, forEach, AUTO_REGISTER |

---

## P0 — Errori critici/fattuali

### P0-1: `parallelism-min` del default dispatcher — valore errato per Pekko

**Riga**: 42

**Testo attuale**: "Il dispatcher default usa un fork-join pool con un minimo di 8 thread (`parallelism-min`): su una macchina a 2 core con tre reader bloccanti, una porzione significativa del pool e' permanentemente occupata."

**Problema**: `parallelism-min = 8` e' il default di **Akka** (2.6.x). **Apache Pekko 1.x** ha cambiato il default a `parallelism-min = 2` con `parallelism-factor = 1.0`. Su una macchina a 2 core, il pool avrebbe `max(2, ceil(2 * 1.0))` = 2 thread attivi (hot threads). Con 3 reader bloccanti il problema e' ancora **peggiore** di quanto descritto nell'articolo: 3 thread bloccanti su un pool con 2 hot thread significano che il dispatcher e' completamente saturo.

Nota: il ForkJoinPool puo' creare thread addizionali oltre `parallelism` per compensare thread bloccati (compensation), ma questo meccanismo ha limiti e non e' garantito. L'argomento dell'articolo resta valido e anzi si rafforza con il valore corretto.

**Fix suggerito**: Sostituire "un minimo di 8 thread (`parallelism-min`)" con "un numero di thread calcolato come `max(parallelism-min, ceil(cores * parallelism-factor))` — con i default Pekko 1.x (`parallelism-min = 2`, `parallelism-factor = 1.0`), su una macchina a 2 core il pool ha solo 2 hot thread". In alternativa, indicare semplicemente che il pool e' proporzionale al numero di core senza citare un numero specifico.

Riferimento: [Pekko Dispatchers Documentation](https://pekko.apache.org/docs/pekko/1.0/typed/dispatchers.html), [Akka issue #28859](https://github.com/akka/akka/issues/28859)

---

## P1 — Errori importanti

### P1-1: `queue.offer()` result ignorato — il commento non basta

**Riga**: 95

**Testo attuale**: `queue.offer(data) // restituisce Future[QueueOfferResult]: gestire Dropped/Failure in produzione`

**Problema**: Il commento riconosce il problema, ma per un articolo che si posiziona come guida a pattern di produzione, il codice dovrebbe mostrare almeno il pattern minimo di gestione. `offer()` con `dropHead` restituisce `Future[QueueOfferResult]` che puo' essere `Enqueued`, `Dropped`, `Failure(e)`, o `QueueClosed`. Ignorare il risultato significa zero visibilita' sui messaggi persi.

**Fix suggerito**: Aggiungere un esempio inline o un blocco di codice separato:

```scala
queue.offer(data).foreach {
  case QueueOfferResult.Dropped    => log.warn(s"Message dropped for ${data.identifier}")
  case QueueOfferResult.Failure(e) => log.error("Queue failure", e)
  case QueueOfferResult.QueueClosed => log.error("Queue closed unexpectedly")
  case QueueOfferResult.Enqueued   => // ok
}
```

---

### P1-2: Nessun error handling nei consumer threads

**Righe**: 163-202

**Problema**: I tre blocchi `while (true) { consumer.poll(...).forEach { ... } }` non hanno alcun `try/catch`. Se `poll()` lancia un'eccezione (`WakeupException`, `SerializationException`, `AuthenticationException`), il thread muore silenziosamente senza logging. L'articolo menziona (riga 207) il problema dello shutdown graceful ma non quello dell'error handling.

**Fix suggerito**: Aggiungere almeno un commento nel codice o una nota nel testo:

```scala
while (running.get()) {
  try {
    consumer.poll(Duration.ofSeconds(5)).forEach { record => ... }
  } catch {
    case _: WakeupException => // shutdown signal
    case e: Exception => logger.error("Consumer error, retrying", e)
  }
}
```

---

### P1-3: Nessuna menzione della strategia di commit degli offset

**Righe**: 163-202

**Problema**: I consumer threads non chiamano `consumer.commitSync()` ne' `consumer.commitAsync()`. L'articolo non discute se `enable.auto.commit` e' `true` (default Kafka, commit ogni 5 secondi) o `false`. In un articolo su Kafka che parla di pattern di consumo, la strategia di commit e' un aspetto fondamentale. Con auto-commit, se il consumer muore tra un commit e l'altro, i messaggi vengono riprocessati (at-least-once). Senza auto-commit e senza commit esplicito, al restart si ricomincia dall'ultimo offset committato dal consumer group (che potrebbe essere nulla se il consumer group e' nuovo, e in quel caso `auto.offset.reset` decide).

**Fix suggerito**: Aggiungere una nota che spieghi la scelta (presumibilmente `enable.auto.commit = true` con at-least-once, accettabile per telemetria dove l'idempotenza e' data dall'overwrite dello stato).

---

### P1-4: Repository GitHub probabilmente non esistente

**Riga**: 278

**Testo attuale**: `https://github.com/monte97/kafka-pekko`

**Problema**: Il repository `monte97/kafka-pekko` non risulta indicizzato da nessun motore di ricerca. Se il repository non e' ancora stato creato o e' privato, il link restituira' 404 ai lettori. Poiche' l'articolo ha `draft: true` e `reproducibility: true`, il repository deve esistere ed essere pubblico prima della pubblicazione.

**Fix suggerito**: Creare il repository pubblico con il codice della demo, oppure rimuovere la sezione Demo fino a quando il repository non e' disponibile.

---

## P2 — Errori minori

### P2-1: `Materializer` esplicito non necessario in Pekko

**Riga**: 75

**Testo**: `implicit val materializer: Materializer = Materializer(context.system)`

**Problema**: Da Akka 2.6+ (e Pekko dalla prima release), un `ActorSystem` implicito in scope e' sufficiente — lo stream si materializza automaticamente. L'`implicit val materializer` e' boilerplate legacy Akka 2.5. Non e' un errore (funziona), ma in un articolo che presenta "la soluzione moderna" lascia un'impressione di codice datato.

**Fix suggerito**: Rimuovere la riga e aggiungere, se non gia' presente, `implicit val system: ActorSystem[_] = context.system` (che in un Behavior e' gia' disponibile).

---

### P2-2: Consumer threads senza flag daemon ne' exception handler

**Righe**: 163, 177, 191

**Problema**: I thread sono creati come non-daemon (`new Thread(...)` default = `daemon = false`). Se il processo cerca di spegnersi, i thread non-daemon impediscono la terminazione della JVM. Inoltre non hanno `UncaughtExceptionHandler`, quindi un'eccezione non catturata non produce alcun log.

**Fix suggerito**: Aggiungere `.setDaemon(true)` ai thread, oppure usare un `ExecutorService` con thread factory configurato. Almeno menzionare il punto nel testo.

---

### P2-3: Wire format Apicurio — formulazione imprecisa

**Riga**: 264

**Testo attuale**: "5 byte nel formato Confluent, fino a 9 byte nel formato nativo Apicurio"

**Problema**: Il formato Confluent e' 1 magic byte + 4 byte schema ID = 5 byte (corretto). Il formato nativo Apicurio con `DefaultIdHandler` usa 1 magic byte + 8 byte (long) schema ID = **esattamente 9 byte**, non "fino a 9". La formulazione "fino a" suggerisce variabilita', ma con il default handler sono sempre 9. La variabilita' esiste solo se si configura `Legacy4ByteIdHandler`, che produce 5 byte (compatibile Confluent). Inoltre, Apicurio supporta anche l'invio dello schema ID via Kafka header (non nel payload), che e' un'opzione diversa e non menzionata.

**Fix suggerito**: "5 byte nel formato Confluent (1 magic byte + 4 byte schema ID), 9 byte nel formato nativo Apicurio (1 magic byte + 8 byte global ID)".

---

### P2-4: Pseudocodice mescola Typed e Classic API

**Riga**: 35

**Testo**: `self ! Poll // loop infinito`

**Problema**: Il pseudocodice usa `Behavior[Command]` e `Behaviors.receiveMessage` (Typed API) ma anche `self ! Poll` (pattern Classic — in Typed API si usa `context.self`). E' etichettato come "pseudocodice ricostruito" quindi e' accettabile, ma potrebbe confondere lettori che conoscono l'API Typed.

**Fix suggerito**: Usare `context.self ! Poll` oppure aggiungere un commento: `// context.self omesso per brevita'`.

---

### P2-5: `forEach` e' l'API Java su `ConsumerRecords`

**Righe**: 31, 166, 180, 196

**Problema**: `consumer.poll(...).forEach { record => ... }` funziona in Scala grazie alle conversioni implicite Java-Scala, ma lo Scala idiomatico usa `.asScala.foreach`. Nessun impatto sulla correttezza; puro stile.

**Fix suggerito**: Nessuna azione necessaria, ma menzionabile se si vuole codice idiomatico.

---

### P2-6: `AUTO_REGISTER_ARTIFACT = true` in produzione e' un rischio di sicurezza

**Riga**: 257

**Problema**: Con `AUTO_REGISTER_ARTIFACT = true`, qualsiasi producer puo' registrare schema arbitrari nel registry. L'articolo lo usa in un sistema di telemetria interno, il che e' accettabile, ma una nota che suggerisca di disabilitarlo in produzione o di usare regole di autorizzazione aggiungerebbe valore.

**Fix suggerito**: Aggiungere una frase: "In produzione, `AUTO_REGISTER_ARTIFACT` andrebbe disabilitato e gli schema registrati tramite pipeline CI/CD con regole di compatibilita'."

---

## Analisi di correttezza dettagliata

### 1. Codice Scala: Source.queue API

**Verdetto**: Corretto.

- `Source.queue[T](bufferSize, OverflowStrategy)` e' la firma corretta per la variante con `OverflowStrategy` (la variante senza overflow e' `Source.queue[T](bufferSize)` che restituisce `BoundedSourceQueue`).
- `OverflowStrategy.dropHead` e' una strategia valida e non deprecata (a differenza di `dropNew` che e' stato rimosso in Pekko 2.0).
- `.toMat(Sink.ignore)(Keep.both)` materializza correttamente come `(SourceQueueWithComplete[T], Future[Done])`.
- Il destructuring `val (queue, _) = ...run()` e' corretto.

### 2. Codice Scala: KafkaProducer callback con mapAsync

**Verdetto**: Corretto.

- `mapAsync(parallelism = 4)` e' l'operatore giusto per operazioni asincrone nello stream.
- Il pattern `Promise[RecordMetadata]` + `producer.send(record, callback)` + `promise.future` e' il modo idiomatico di convertire un callback Java in un `Future` Scala.
- La lambda `(metadata: RecordMetadata, exception: Exception) =>` e' corretta grazie alla SAM conversion di Scala 2.12+ sull'interfaccia `Callback` di Kafka (che ha un unico metodo astratto `onCompletion(RecordMetadata, Exception)`).
- Il `parallelism = 4` permette fino a 4 send in-flight, il che e' ragionevole.

### 3. ConcurrentHashMap e lost update

**Verdetto**: Analisi corretta e ben spiegata.

- L'articolo identifica correttamente che `get` + `put` su `ConcurrentHashMap` non e' atomico come operazione composta (riga 243).
- La descrizione del lost update e' precisa: "il secondo `put` potrebbe sovrascrivere lo stato con una versione che non include l'aggiornamento del primo thread" — questo e' esattamente il classico lost update.
- La menzione di `ConcurrentHashMap.compute()` come soluzione atomica a livello di singola chiave e' corretta. `compute()` garantisce che la funzione di remapping venga eseguita atomicamente per la chiave specificata.
- La valutazione pragmatica ("accettabile per dati telemetrici dove il valore viene ricalcolato frequentemente") e' ragionevole.

### 4. Pekko Connectors Kafka API

**Verdetto**: Corretto.

- `Consumer.plainSource` esiste ed e' documentato in [Pekko Connectors Kafka Consumer](https://pekko.apache.org/docs/pekko-connectors-kafka/current/consumer.html). Emette `ConsumerRecord` senza supporto per commit degli offset.
- `Producer.flexiFlow` esiste ed e' documentato in [Pekko Connectors Kafka Producer](https://pekko.apache.org/docs/pekko-connectors-kafka/current/producer.html). Accetta `ProducerMessage.Envelope` e produce `ProducerMessage.Results`.
- L'affermazione che `Consumer.plainSource` fornirebbe shutdown graceful e' corretta: essendo integrato nello stream Pekko, il shutdown dello stream chiude il consumer Kafka in modo ordinato.

### 5. Backpressure vs Load Shedding

**Verdetto**: Spiegazione eccellente.

La distinzione a riga 117 e' precisa e ben articolata:
- `dropHead` = load shedding (l'attore che chiama `offer()` non viene mai rallentato)
- Backpressure vera solo dentro lo stream (tra queue e sink)
- `OverflowStrategy.backpressure` come alternativa per propagare pressione verso gli attori
- La scelta pragmatica di `dropHead` per telemetria e' ben motivata

### 6. Link e versioni

| Link | Status |
|------|--------|
| `https://pekko.apache.org/` | Valido |
| `https://pekko.apache.org/docs/pekko/current/stream/index.html` | Valido |
| `https://pekko.apache.org/docs/pekko-connectors-kafka/current/home.html` | Valido |
| `https://pekko.apache.org/docs/pekko-connectors-kafka/current/producer.html` | Valido |
| `https://pekko.apache.org/docs/pekko-connectors-kafka/current/consumer.html` | Valido |
| `https://www.apicur.io/registry/` | Valido |
| `https://kafka.apache.org/documentation/` | Valido |
| `https://github.com/monte97/kafka-pekko` | **Non verificabile** — non indicizzato dai motori di ricerca |

---

## Elementi positivi (non richiedono azione)

1. **Pattern mapAsync + Promise**: soluzione idiomatica e corretta per wrappare callback Java in stream Pekko
2. **Distinzione load shedding vs backpressure**: rara da trovare cosi' ben spiegata in articoli italiani
3. **Analisi lost update**: corretta, con menzione di `compute()` come fix e valutazione pragmatica
4. **Nota su shutdown graceful** (riga 206-207): riconosce esplicitamente il gap nei consumer threads
5. **Nota su Apicurio 3.x migration** (righe 266-270): informazione pratica utile per chi aggiorna
6. **Sezione Demo con docker compose**: aggiunge riproducibilita'
