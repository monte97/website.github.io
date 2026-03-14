# Tech Review — Akka è morto, lunga vita a Pekko

**Score: 9/10**
**Data review: 2026-03-14**

---

## Risultato complessivo

Nessun errore P0 o P1. I fatti tecnici sono accurati, le versioni degli artefatti sono verificabili e corrispondono ai rilasci reali su Maven Central. I gotcha documentati sono autentici e praticamente rilevanti.

---

## Verifica fatti tecnici

### Cambio licenza Akka

- Annuncio settembre 2022: corretto.
- Akka 2.6.21 come ultimo fix critico della serie, giugno 2023: corretto.
- EOL serie 2.6.x il 19 ottobre 2023: corretto.
- BSL 1.1 revert ad Apache 2.0 dopo 3 anni: corretto, clausola standard BSL.

### Apache Pekko

- Fork da Akka 2.6.x sotto ASF: corretto.
- Promosso a top-level project ASF nel maggio 2024: corretto.
- Licenza Apache 2.0: corretto.
- Pekko 1.0.x = migrazione meccanica, 1.1.x = evoluzioni proprie: corretto.
- Namespace `org.apache.pekko`: corretto.

### Versioni artefatti in build.sbt

| Artefatto | Versione dichiarata | Note |
|-----------|--------------------|----|
| `pekko-actor-typed` | 1.0.3 | Corretta |
| `pekko-stream` | 1.0.3 | Corretta |
| `pekko-http` | 1.0.1 | Corretta |
| `pekko-connectors-kafka` | 1.0.0 | Corretta |
| `pekko-http-cors` | 1.0.1 | Corretta |

Nota: versioni non allineate tra moduli - documentato correttamente nell'articolo.

### Gotcha 2 — Materializer con ActorSystem typed

L'affermazione che `ActorSystem[T]` estende `ClassicActorSystemProvider` e che esiste una conversione implicita verso `Materializer` è tecnicamnte corretta per Akka 2.6+ e Pekko 1.0+. Il pattern implicito senza `ActorMaterializer` esplicito è la modalità raccomandata.

### Gotcha 1 — Apicurio 3.x

L'artefatto `apicurio-registry-serdes-avro-serde` in 2.x e `apicurio-registry-avro-serde-kafka` in 3.x: corretto. La classe `SerdeConfig` e il cambio package `io.apicurio.registry.serde.config.SerdeConfig` in 3.x vs `io.apicurio.registry.serde.SerdeConfig` in 2.x: corretto.

### Gotcha 4 — dipendenze transitive

Consiglio `sbt dependencyTree` per verificare l'albero: corretto e pratico.

---

## Problemi riscontrati

### P2 — Versioni degli artefatti (minor)

Le versioni nell'articolo (1.0.3, 1.0.1, 1.0.0) sono le versioni disponibili al momento della migrazione, ma non sono le ultime della serie 1.0.x. Non è un errore - l'articolo documenta una migrazione reale, non prescrive le versioni più recenti. Eventualmente aggiungere una nota che invita a verificare l'ultima patch disponibile prima di copiare le versioni.

### P2 — CORS: versione Akka HTTP nel "prima"

La versione `"ch.megard" %% "akka-http-cors" % "1.2.0"` è corretta per Akka HTTP 10.2.x. Nessun problema tecnico.

---

## Best practice

L'articolo segue buone pratiche:
- Distinzione chiara tra migrazione meccanica e gotcha manuali
- Consiglio di partire da 1.0.x e valutare 1.1.x separatamente: approccio conservativo corretto
- Verifica con `sbt dependencyTree` per dipendenze transitive: best practice consolidata
