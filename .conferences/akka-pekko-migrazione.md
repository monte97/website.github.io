# Da Akka a Pekko: migrare un sistema event-driven senza downtime

**Licenze, schema contract e pattern reattivi per sistemi in produzione**

- **Formato**: Talk 35 min + Q&A
- **Livello**: Intermedio-avanzato
- **Target**: Sviluppatori Scala/JVM, architect di sistemi event-driven, chiunque usi Akka

---

## Abstract

Nel 2022 Akka ha cambiato licenza da Apache 2.0 a BSL 1.1. Per chi aveva servizi in produzione su Akka 2.6.x la scelta era chiara: migrare ad Apache Pekko o restare bloccati su una versione senza patch di sicurezza.

In questo talk racconto la migrazione reale di tre servizi Scala che elaborano telemetria IoT su Kafka: standardizzazione, aggregazione geospaziale e gestione file. Parto dalla migrazione meccanica (rename import + gotcha sulle dipendenze transitive), poi affronto i due problemi architetturali che abbiamo risolto durante la migrazione: JSON selvaggio tra produttori e consumatori (risolto con Schema Registry e Avro), e actor che bloccano il dispatcher con `consumer.poll()` (risolto con `Source.queue` e consumer thread dedicati).

Il pubblico esce con una checklist di migrazione Akka→Pekko e due pattern reattivi per sistemi Kafka su actor model.

---

## Scaletta

### 1. Akka e' morto, lunga vita a Pekko (5 min)

- Il cambio licenza BSL 1.1: cosa significa in pratica per chi ha servizi in produzione.
- Apache Pekko 1.0.x: fork API-compatible di Akka 2.6.x sotto Apache 2.0.
- La lezione piu' ampia: come proteggere l'architettura dalle dipendenze a rischio licenza.

### 2. La migrazione meccanica (8 min)

- Il rename: `import akka.` → `import org.apache.pekko.`, `akka {` → `pekko {` nei `.conf`.
- Il 90% dello sforzo non e' il rename, ma i gotcha:
  - **Dipendenze transitive**: `sbt dependencyTree | grep akka` per trovare jar Akka nascoste in librerie terze.
  - **Apicurio 3.x rename**: `SerdeConfig` → `SchemaResolverConfig`, package path cambiato.
  - **Materializer implicito**: Pekko 1.0 ha conversione implicita da `ActorSystem` a `Materializer`, ma molti team scrivono ancora il boilerplate esplicito.
  - **Allineamento versioni**: core 1.0.3, http 1.0.1, connectors-kafka 1.0.0 — non sono allineate.
- Bilancio: ~50 file, ~3 gotcha, ~mezza giornata di lavoro. Il costo e' verifica, non riscrittura.

### 3. Il contratto dei dati: Schema Registry (8 min)

- Il problema: produttore Node.js aggiunge un campo, consumatore Scala lo ignora silenziosamente. Tre mesi dopo: data loss scoperta per caso.
- Altro scenario: timestamp da ISO string a epoch millis. Python interpreta il numero come stringa. Corruzione silenziosa.
- La soluzione: Apicurio Registry con KafkaSQL, schema Avro, compatibility mode BACKWARD.
- Come funziona: 5 byte di prefisso (magic byte + schema ID) in ogni messaggio. Il consumatore recupera lo schema automaticamente.
- Demo: `evolve-schema.sh` aggiunge campo opzionale (accettato). `break-schema.sh` rimuove campo obbligatorio (HTTP 409 rifiutato). La rete di sicurezza funziona.

### 4. Actor che bloccano: due pattern reattivi (10 min)

- Il problema: `consumer.poll(5s)` dentro un actor brucia thread del dispatcher. Tre topic, tre thread bloccati. Quando l'actor di enrichment rallenta, la mailbox cresce fino a OutOfMemoryError.

- **Pattern 1 — Source.queue per produttori**:
  - Disaccoppia HTTP reader da Kafka producer.
  - `queue.offer(data)` non blocca. Se il producer rallenta, buffer si riempie, dati vecchi scartati (accettabile per telemetria: freschezza > completezza).
  - Il dispatcher respira.

- **Pattern 2 — Consumer thread + stato condiviso per aggregazione**:
  - Tre topic convergenti (telemetria, anagrafica, POI) aggiornano un `EnrichmentState` condiviso.
  - Polling su thread dedicati, non sul dispatcher.
  - Logica di enrichment (calcolo haversine per geolocalizzazione) e' plain Scala, testabile senza Kafka.
  - Restart di un singolo consumer senza riavviare il sistema.

- Prima/dopo: 8+ thread bloccati nel dispatcher → 8 thread liberi, consumer su thread separati.

### 5. Chiusura (4 min)

- "Le migrazioni non riguardano la tecnologia. Riguardano dimostrare che l'architettura e' abbastanza resiliente da cambiare le fondamenta senza fermare il treno."
- Checklist riepilogativa: rename, dipendenze transitive, schema contract, pattern I/O.
- Il fork open-source funziona: Pekko ne e' la prova.
- Slide risorse: 4 articoli + repo demo.
