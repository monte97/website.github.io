---
title: "Akka e' morto, lunga vita a Pekko"
date: 2026-02-14T10:00:00+01:00
description: "Guida pratica alla migrazione da Akka a Apache Pekko: checklist, gotcha, e lezioni dal campo"
menu:
  sidebar:
    name: "3. Akka to Pekko"
    identifier: akka-pekko-migrazione
    weight: 30
    parent: KAFKA
tags: ["Scala", "Pekko", "Akka", "JVM", "Migrazione"]
categories: ["Backend", "Tecnologie"]
draft: true
---
## Il cambio licenza di Akka

A settembre 2022, Lightbend ha annunciato che Akka 2.7 e tutte le versioni successive sarebbero state rilasciate sotto Business Source License (BSL 1.1). In pratica: l'uso commerciale di Akka richiede una licenza a pagamento. Akka 2.6.19 e' l'ultima versione sotto Apache 2.0; dalla 2.6.20 anche la serie 2.6.x e' sotto BSL 1.1. Le versioni Apache 2.0 non ricevono piu' patch di sicurezza ne' bugfix.

La decisione ha colpito un ecosistema ampio. Akka e' la base di framework come Play e di migliaia di sistemi in produzione nel mondo JVM. Per chi gestisce sistemi in produzione basati su Akka, le opzioni sono tre:

1. **Restare su Akka 2.6.x.** Funziona, ma significa usare una versione frozen: nessun aggiornamento, nessuna correzione. Per un sistema che deve girare per anni, non e' sostenibile.

2. **Pagare la licenza commerciale.** Opzione legittima per aziende che possono permetterselo. Non sempre compatibile con vincoli di budget o con la preferenza per dipendenze a licenza aperta.

3. **Migrare a un fork open-source.** Cioe' Apache Pekko.

## Apache Pekko: il fork della community

Apache Pekko e' nato come fork di Akka 2.6.19 (l'ultima versione Apache 2.0) sotto la Apache Software Foundation. Il progetto e' stato incubato e promosso a progetto top-level ASF nel marzo 2024. La licenza e' Apache 2.0, senza ambiguita'.

La versione **Pekko 1.0.x** e' un fork diretto di Akka 2.6.x. L'API e' identica: stesse classi, stessi pattern, stessi comportamenti. L'unica differenza e' il namespace: `org.apache.pekko` invece di `akka`. Questo rende la migrazione meccanica: cerca e sostituisci.

La versione **Pekko 1.1.x** introduce evoluzioni proprie: nuove feature, ottimizzazioni, divergenze progressive da Akka. Per chi migra, il consiglio e' partire da 1.0.x (migrazione pura) e poi valutare l'upgrade a 1.1.x separatamente.

L'ecosistema e' completo:

- **Pekko HTTP** (ex Akka HTTP) - server e client HTTP
- **Pekko Connectors** (ex Alpakka) - connettori per Kafka, MongoDB, S3, ecc.
- **Pekko gRPC** (ex Akka gRPC) - supporto gRPC
- **Pekko Streams** (ex Akka Streams) - stream processing reattivo
- **Pekko Cluster** (ex Akka Cluster) - clustering e distribuzione

Tutti i moduli disponibili in Akka hanno un corrispettivo diretto in Pekko.

## Checklist di migrazione

Di seguito la checklist pratica seguita per migrare i servizi Scala da Akka a Pekko. La maggior parte dei passi e' meccanica.

### 1. build.sbt: coordinate Maven

Tutte le dipendenze cambiano group ID e nome artefatto.

```scala
// Prima (Akka)
"com.typesafe.akka" %% "akka-actor-typed"   % "2.6.20"
"com.typesafe.akka" %% "akka-stream"        % "2.6.20"
"com.typesafe.akka" %% "akka-http"          % "10.2.10"
"com.lightbend.akka" %% "akka-stream-alpakka-kafka" % "4.0.2"

// Dopo (Pekko)
"org.apache.pekko" %% "pekko-actor-typed"   % "1.0.3"
"org.apache.pekko" %% "pekko-stream"        % "1.0.3"
"org.apache.pekko" %% "pekko-http"          % "1.0.1"
"org.apache.pekko" %% "pekko-connectors-kafka" % "1.0.0"
```

Da notare: le versioni non sono allineate tra i moduli. `pekko-actor-typed` e `pekko-stream` seguono il versioning del core (1.0.x), mentre `pekko-http` e `pekko-connectors-kafka` hanno versioni proprie. Bisogna verificare ogni artefatto.

### 2. Import nei file Scala

Sostituzione diretta in tutti i file sorgente:

```scala
// Prima
import akka.actor.typed.ActorSystem
import akka.stream.scaladsl.Source
import akka.http.scaladsl.Http

// Dopo
import org.apache.pekko.actor.typed.ActorSystem
import org.apache.pekko.stream.scaladsl.Source
import org.apache.pekko.http.scaladsl.Http
```

In un editor con supporto regex, il comando e' `s/import akka\./import org.apache.pekko./g`. Attenzione a non sostituire occorrenze in stringhe o commenti dove `akka` potrebbe comparire in contesti diversi.

### 3. application.conf

I namespace di configurazione cambiano da `akka {}` a `pekko {}`:

```hocon
# Prima
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

# Dopo
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

Questo vale anche per `reference.conf` se il progetto ne definisce uno. E vale per le configurazioni nei test.

### 4. CORS: libreria diversa

La libreria CORS per Akka HTTP (`ch.megard %% akka-http-cors`) non ha un equivalente diretto. In Pekko, il supporto CORS e' fornito dal progetto Pekko stesso:

```scala
// Prima
"ch.megard" %% "akka-http-cors" % "1.2.0"
import ch.megard.akka.http.cors.scaladsl.CorsDirectives._

// Dopo
"org.apache.pekko" %% "pekko-http-cors" % "1.0.0"
import org.apache.pekko.http.cors.scaladsl.CorsDirectives._
```

Il cambio di organizzazione (`ch.megard` -> `org.apache.pekko`) e' facile da dimenticare perche' non segue il pattern meccanico degli altri artefatti.

### 5. Plugin SBT

Se il progetto usa `sbt-native-packager` o altri plugin legati all'ecosistema Akka, verificare che non tirino dentro dipendenze transitive di Akka. In particolare, `sbt-native-packager` e' agnostico rispetto ad Akka/Pekko, quindi non richiede modifiche.

## La migrazione nel progetto

Il sistema usa Scala/Akka in tre servizi:

- **c40-standardization**: polling HTTP delle API telemetriche dei produttori di mezzi, normalizzazione dei dati, produzione su topic Kafka. Usa Akka HTTP client, Akka Streams, Akka Kafka (Alpakka).

- **c40-aggregation**: pipeline di arricchimento che consuma tre topic Kafka (dati telemetrici, anagrafiche, assegnamenti), li unisce e produce un topic aggregato. Usa Akka Streams e Akka Kafka.

- **filemanager**: document management system con API HTTP REST e storage su MongoDB. Usa Akka HTTP server, Akka Streams per lo streaming di file.

In totale la migrazione ha toccato circa **50 file** tra sorgenti Scala, configurazioni e build files. La stragrande maggioranza del lavoro e' stato un rename meccanico: `akka` -> `pekko`, `com.typesafe.akka` -> `org.apache.pekko`, `Akka` -> `Pekko` nei commenti.

Il tempo effettivo di migrazione e' stato circa **mezza giornata** per tutti e tre i servizi. La maggior parte del tempo non e' stata spesa sul rename, ma sulla verifica: compilazione, test, avvio dei container Docker, controllo che i servizi rispondessero correttamente.

### Gotcha 1: Apicurio 3.x ha rinominato gli artefatti

Questo non e' strettamente legato a Pekko, ma la migrazione Akka->Pekko e' stata l'occasione per aggiornare anche le dipendenze Apicurio. In Apicurio 3.x l'artefatto per il serializer/deserializer Avro e' cambiato:

```scala
// Apicurio 2.x
"io.apicurio" % "apicurio-registry-serdes-avro-serde" % "2.6.4.Final"

// Apicurio 3.x
"io.apicurio" % "apicurio-registry-avro-serde-kafka" % "3.0.4"
```

Inoltre, la classe `SerdeConfig` e' stata rinominata in `SchemaResolverConfig` e spostata in un package diverso. Se il codice referenzia direttamente queste classi per configurare l'URL del registry o la strategia di lookup, servono modifiche puntuali.

### Gotcha 2: Materializer con ActorSystem typed

In Akka 2.6+ e Pekko 1.0+, `ActorSystem[T]` estende `ClassicActorSystemProvider`, e nel companion object di `Materializer` esiste una conversione implicita da `ClassicActorSystemProvider` a `Materializer`. Nella maggior parte dei casi, avere un `implicit val system: ActorSystem[Nothing]` in scope e' sufficiente per eseguire stream senza dichiarare un `Materializer` esplicito.

Il pattern esplicito resta necessario solo in casi particolari (ad esempio per controllare il lifecycle del materializer separatamente dal system):

```scala
implicit val system: ActorSystem[Nothing] = ActorSystem(Behaviors.empty, "my-system")
// Solo se serve un Materializer con lifecycle indipendente:
implicit val mat: Materializer = SystemMaterializer(system).materializer
```

Se il progetto usava Akka Classic con un `ActorMaterializer` esplicito (deprecato in Akka 2.6), la migrazione a Pekko e' l'occasione per rimuoverlo e affidarsi alla conversione implicita.

### Gotcha 3: reference.conf e namespace

Alcune librerie di terze parti (non Pekko) possono avere `reference.conf` che definiscono configurazioni sotto il namespace `akka {}`. Dopo la migrazione, queste configurazioni non vengono piu' lette da Pekko perche' il framework cerca sotto `pekko {}`. Se un servizio si comporta in modo strano dopo la migrazione (timeout diversi, buffer size cambiati, logging diverso), la prima cosa da verificare e' che tutti i `reference.conf` siano stati aggiornati.

### Gotcha 4: librerie di terze parti che dipendono da Akka

Se il progetto usa librerie che hanno Akka come dipendenza transitiva, queste continueranno a tirare dentro i jar di Akka. Il risultato e' un classpath con sia `akka` che `pekko`, che puo' causare conflitti. La soluzione e' verificare l'albero delle dipendenze (`sbt dependencyTree`) e cercare versioni aggiornate delle librerie che supportano Pekko, oppure escludere esplicitamente le dipendenze Akka.

## Demo

Il [repository demo](https://github.com/monte97/kafka-pekko) include un consumer Scala/Pekko che mostra l'integrazione Pekko + Avro + Apicurio Registry. Il consumer usa Pekko Connectors Kafka per consumare messaggi Avro da un topic, deserializzarli tramite il registry, e stamparli a console.

Per avviare la demo:

```bash
cd docs/demos/kafka-schema-registry
docker compose up
```

Il consumer Scala si avvia insieme al producer Node.js e al consumer Python, tutti connessi allo stesso topic con schema Avro.

## Conclusioni

La migrazione da Akka a Apache Pekko e' un'operazione prevalentemente meccanica. Per progetti che usano gia' Akka Typed, il rischio e' basso: l'API di Pekko 1.0.x e' identica a quella di Akka 2.6.x, il comportamento a runtime e' lo stesso, i pattern di codice non cambiano.

Il costo reale non e' nella migrazione in se', ma nella **verifica**: compilare, testare, avviare, controllare i log, verificare che ogni servizio risponda correttamente. Per un sistema con tre servizi Scala e circa 50 file coinvolti, il totale e' stato circa mezza giornata di lavoro. Per sistemi piu' grandi il tempo scala linearmente.

Pekko e' mantenuto dalla Apache Software Foundation con release regolari. Per progetti che non possono o non vogliono adottare la licenza BSL di Lightbend, rappresenta l'alternativa principale nell'ecosistema Akka open-source.

Una volta completata la migrazione a Pekko 1.0.x, il passaggio a 1.1.x e' un upgrade standard con changelog da verificare, non un'altra migrazione. Si torna su un binario di rilascio attivo con bugfix, patch di sicurezza e nuove feature.
