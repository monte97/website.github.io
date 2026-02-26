# Tech Review: "Akka e' morto, lunga vita a Pekko"

**Data review**: 2026-02-25
**Reviewer**: Claude Opus 4.6 (automated tech review)
**Articolo**: `content/posts/kafka/03-akka-pekko-migrazione/index.md`
**Review precedente**: 2026-02-20 (su versione con errore "2.6.19", ora corretto a "2.6.20")

---

## Score: 7/10

L'articolo e' solido nella struttura e nella maggior parte dei contenuti tecnici. La checklist di migrazione e' pratica e ben organizzata. I gotcha dal campo aggiungono valore reale. Rispetto alla review precedente, il P0 sulla versione "2.6.19" e' stato corretto e alcuni P1 sono stati integrati (clausola reversion BSL). Restano pero' un errore fattuale critico sulla licenza di Akka 2.6.21, un'imprecisione sulla base del fork Pekko, e la relazione invertita tra `SerdeConfig` e `SchemaResolverConfig` in Apicurio 3.x.

---

## Errori P0 (fattuali/critici)

### P0-1: Akka 2.6.21 NON e' sotto BSL 1.1

**Riga 23**
**Testo attuale**: "Akka 2.6.20 e' l'ultima versione sotto Apache 2.0; dalla 2.6.21 anche la serie 2.6.x e' sotto BSL 1.1."
**Problema**: Falso. Akka 2.6.21 e' stata rilasciata il 21 giugno 2023 come critical security fix ed e' anch'essa sotto licenza Apache 2.0. L'intera serie 2.6.x e' rimasta sotto Apache 2.0 fino all'end-of-life. La BSL 1.1 si applica a partire da Akka 2.7+ e alle nuove major (Akka HTTP 10.4+, ecc.). Dal 19 ottobre 2023, la serie 2.6.x e' EOL (nessuna ulteriore patch), ma la licenza resta Apache 2.0.
**Fix suggerito**: Riscrivere il paragrafo:
> "Akka 2.6.x e' l'ultima serie sotto Apache 2.0. La versione 2.6.21, rilasciata a giugno 2023 come ultimo fix critico, e' l'ultima release della serie. Dalla 2.7 in poi, tutte le versioni sono sotto BSL 1.1. Dal 19 ottobre 2023, la serie 2.6.x e' ufficialmente end-of-life: nessun aggiornamento futuro, ma la licenza resta Apache 2.0."

**Fonti**:
- [Akka BSL License FAQ](https://akka.io/bsl-license-faq)
- [SoftwareMill - What to do with your End Of Life Akka](https://softwaremill.com/what-to-do-with-your-end-of-life-akka/)
- [Lunatech - Akka Licence Change (One Year Later)](https://blog.lunatech.com/posts/2023-10-27-akka-licence-change-one-year-later)

---

### P0-2: Pekko e' un fork della serie Akka 2.6.x, non specificamente di "2.6.20"

**Riga 37**
**Testo attuale**: "Apache Pekko e' nato come fork di Akka 2.6.20 (l'ultima versione Apache 2.0)"
**Problema**: Doppia imprecisione. (1) Pekko e' un fork della serie Akka 2.6.x (il ramo di sviluppo), non di una singola patch release. La documentazione ufficiale di Pekko e l'ASF lo descrivono come "fork of Akka 2.6.x, prior to the Akka project's adoption of the Business Source License". (2) L'ultima versione Apache 2.0 e' la 2.6.21, non la 2.6.20 (vedi P0-1).
**Fix suggerito**: "Apache Pekko e' nato come fork della serie Akka 2.6.x (l'ultima mantenuta sotto Apache 2.0) sotto la Apache Software Foundation."

**Fonti**:
- [Apache Pekko - Sito ufficiale](https://pekko.apache.org/)
- [ASF Announcement - Apache Pekko TLP](https://news.apache.org/foundation/entry/apache-software-foundation-announces-new-top-level-project-apache-pekko)

---

## Errori P1 (importanti)

### P1-1: Versioni Pekko nell'esempio build.sbt corrette per 1.0.x ma datate

**Righe 71-74**
**Testo attuale**: `pekko-actor-typed % "1.0.3"`, `pekko-stream % "1.0.3"`, `pekko-http % "1.0.1"`, `pekko-connectors-kafka % "1.0.0"`
**Problema**: Le versioni indicate sono corrette per la serie 1.0.x e coerenti con il consiglio dell'articolo di "partire da 1.0.x". Tuttavia, al febbraio 2026 le versioni attuali sono avanzate significativamente: Pekko core 1.4.0 (dicembre 2025), Pekko HTTP 1.1.0+ (settembre 2024), Pekko Connectors Kafka 1.1.0. Un lettore potrebbe usare le versioni dell'esempio senza sapere che esistono release piu' recenti con bugfix e miglioramenti.
**Fix suggerito**: Aggiungere una nota dopo il blocco di codice:
> "Le versioni qui indicate sono le ultime della serie 1.0.x, la piu' vicina ad Akka 2.6.x. Per le versioni piu' recenti (incluse le serie 1.1.x e successive), verificare la [pagina download di Pekko](https://pekko.apache.org/download.html)."

**Fonti**:
- [Maven Repository - org.apache.pekko](https://mvnrepository.com/artifact/org.apache.pekko)
- [Pekko Downloads](https://pekko.apache.org/download.html)
- [Pekko 1.1.x Release Notes](https://pekko.apache.org/docs/pekko/1.1/release-notes/releases-1.1.html)

---

### P1-2: Descrizione invertita di SerdeConfig/SchemaResolverConfig in Apicurio 3.x

**Riga 179**
**Testo attuale**: "`SerdeConfig` e' deprecata in favore di `SchemaResolverConfig`, che la estende con opzioni aggiuntive per la risoluzione degli schema."
**Problema**: Due errori in una frase. (1) La relazione di ereditarieta' e' invertita: nel codice sorgente di Apicurio Registry 3.x, e' `SerdeConfig` che estende `SchemaResolverConfig` (`public class SerdeConfig extends SchemaResolverConfig`), non il contrario. `SchemaResolverConfig` e' la classe base con le opzioni di risoluzione schema; `SerdeConfig` la estende aggiungendo opzioni specifiche per serializzazione/deserializzazione. (2) `SerdeConfig` non e' deprecata in Apicurio 3.x: esiste ancora ed e' attivamente usata. Il cambiamento principale e' il rename del package (`io.apicurio.registry.serde.config.SerdeConfig` in 3.x vs `io.apicurio.registry.serde.SerdeConfig` in 2.x) e il rename dell'artefatto Maven.
**Fix suggerito**: Riformulare:
> "In Apicurio 3.x la configurazione dei SerDes e' stata ristrutturata: `SerdeConfig` estende `SchemaResolverConfig` (che contiene le opzioni per la risoluzione degli schema). I package Java sono cambiati (`io.apicurio.registry.serde.config.SerdeConfig` in 3.x vs `io.apicurio.registry.serde.SerdeConfig` in 2.x). Se il codice referenzia direttamente queste classi, servono modifiche agli import."

**Fonte**: [Apicurio Registry - SerdeConfig.java (main branch)](https://github.com/Apicurio/apicurio-registry/blob/main/serdes/generic/serde-common/src/main/java/io/apicurio/registry/serde/config/SerdeConfig.java)

---

### P1-3: Data di promozione Pekko a TLP: preferire "maggio 2024"

**Riga 37**
**Testo attuale**: "promosso a progetto top-level ASF nel maggio 2024"
**Problema**: La data non e' errata: l'annuncio ufficiale ASF e' del 16 maggio 2024. Il Board ha approvato la risoluzione il 20 marzo 2024. L'articolo usa la data dell'annuncio pubblico, che e' la scelta piu' comune nelle fonti giornalistiche. Nessuna correzione necessaria, ma per maggiore precisione si potrebbe specificare.
**Fix suggerito (opzionale)**: "incubato e promosso a progetto top-level ASF nel 2024 (risoluzione Board a marzo, annuncio ufficiale a maggio)."

**Fonti**:
- [ASF Blog - Pekko TLP](https://news.apache.org/foundation/entry/apache-software-foundation-announces-new-top-level-project-apache-pekko)
- [GlobeNewsWire - 16 maggio 2024](https://www.globenewswire.com/en/news-release/2024/05/16/2883480/17401/en/Apache-Software-Foundation-Announces-New-Top-Level-Project-Apache-Pekko.html)

---

## Errori P2 (minori)

### P2-1: Regex di sostituzione import copre solo gli import statement

**Riga 95**
**Testo attuale**: `s/import akka\./import org.apache.pekko./g`
**Problema**: La regex copre solo le dichiarazioni `import`. Non copre tipi fully-qualified usati nel corpo del codice (es. `akka.actor.typed.ActorRef` come tipo inline, annotazioni, pattern matching). L'articolo gia' avverte sui falsi positivi in stringhe e commenti, ma non menziona questo caso.
**Fix suggerito**: Aggiungere una nota: "Per i tipi fully-qualified usati nel codice (non solo import), serve una regex piu' ampia: `s/akka\./org.apache.pekko./g`. Applicare con revisione manuale per evitare falsi positivi (es. nomi di package non Akka che contengono 'akka')."

---

### P2-2: Nota sul Materializer: chiarire che non cambia nella migrazione

**Righe 183-193**
**Problema**: La spiegazione del Materializer implicito e' tecnicamente corretta. L'affermazione che `ActorSystem[T]` estende `ClassicActorSystemProvider` e che esiste una conversione implicita nel companion object di `Materializer` e' accurata sia per Akka 2.6.x che per Pekko 1.0.x. Il codice di esempio con `SystemMaterializer(system).materializer` e' valido. Tuttavia, il testo non chiarisce esplicitamente che questo comportamento e' identico tra Akka 2.6.x e Pekko 1.0.x, il che potrebbe portare il lettore a pensare che ci sia qualcosa di diverso da gestire.
**Fix suggerito**: Aggiungere: "Questo comportamento e' identico tra Akka 2.6.x e Pekko 1.0.x: se il progetto gia' usava il typed ActorSystem senza Materializer esplicito, non cambia nulla durante la migrazione."

---

### P2-3: Link "Pekko Migration Guide" punta a `current` (ora 1.4.x)

**Riga 240**
**Testo attuale**: Link a `https://pekko.apache.org/docs/pekko/current/project/migration-guides.html`
**Problema**: Il link e' valido. Ma `current` ora punta a Pekko 1.4.x, non 1.0.x. Per chi segue l'articolo (migrazione a 1.0.x), il link alla versione 1.0 sarebbe piu' coerente: `https://pekko.apache.org/docs/pekko/1.0/project/migration-guides.html`
**Fix suggerito**: Cambiare il link a `https://pekko.apache.org/docs/pekko/1.0/project/migration-guides.html` oppure mantenere `current` aggiungendo "(la guida copre anche migrazione tra versioni Pekko)".

---

### P2-4: Mancano dipendenze di test nella checklist

**Checklist, sezione 1 (righe 59-77)**
**Problema**: La checklist delle dipendenze Maven non menziona le dipendenze di test (`akka-actor-testkit-typed` -> `pekko-actor-testkit-typed`, `akka-stream-testkit` -> `pekko-stream-testkit`). Per una migrazione completa, anche queste vanno aggiornate.
**Fix suggerito**: Aggiungere un commento nel blocco di codice o una nota sotto:
> "Lo stesso rename si applica alle dipendenze di test: `akka-actor-testkit-typed` -> `pekko-actor-testkit-typed`, `akka-stream-testkit` -> `pekko-stream-testkit`, ecc."

---

### P2-5: Manca nota su serializzazione/logging config namespace

**Sezione application.conf (righe 97-129)**
**Problema**: Il rename del namespace `akka {}` -> `pekko {}` e' ben descritto per la configurazione generale. Non vengono pero' menzionati i nomi fully-qualified delle classi di configurazione che cambiano, come ad esempio `akka.event.slf4j.Slf4jLogger` -> `org.apache.pekko.event.slf4j.Slf4jLogger` e le configurazioni di serializzazione Jackson. Questi sono parte del rename meccanico ma facili da dimenticare.
**Fix suggerito**: Aggiungere una nota: "Attenzione anche ai nomi di classe fully-qualified nella configurazione (es. `akka.event.slf4j.Slf4jLogger` -> `org.apache.pekko.event.slf4j.Slf4jLogger`)."

---

### P2-6: Manca menzione della compatibilita' Scala 3

**Sezione Pekko (righe 36-51)**
**Problema**: Pekko 1.0.x supporta Scala 2.12, 2.13 e 3. Per chi migra, sapere che Pekko apre la strada anche a Scala 3 e' un'informazione utile e un valore aggiunto rispetto ad Akka 2.6.x (che non supportava Scala 3 in modo completo).
**Fix suggerito (opzionale)**: Aggiungere: "Pekko 1.0.x supporta anche Scala 3, aprendo la strada a una futura migrazione del linguaggio."

---

## Codice Scala: verifica sintassi

Tutti i blocchi di codice dell'articolo sono sintatticamente corretti:

- **build.sbt** (righe 63-75): dichiarazioni SBT valide, formato `"groupId" %% "artifactId" % "version"` corretto
- **Import** (righe 83-93): import Scala validi, namespace Pekko corretti
- **application.conf** (righe 101-127): HOCON valido, struttura corretta
- **CORS** (righe 136-143): dichiarazioni SBT e import corretti
- **Materializer** (righe 188-191): pattern `Behaviors.empty`, `SystemMaterializer` corretto

---

## Link esterni: verifica

| # | URL | Stato |
|---|-----|-------|
| 1 | `https://pekko.apache.org/` | Valido (confermato via web search) |
| 2 | `https://pekko.apache.org/docs/pekko/current/project/migration-guides.html` | Valido (confermato via web search, titolo: "Migration from Akka to Apache Pekko") |
| 3 | `https://akka.io/blog/why-we-are-changing-the-license-for-akka` | Valido (confermato via web search) |
| 4 | `https://pekko.apache.org/docs/pekko-connectors-kafka/current/home.html` | Valido (confermato via web search) |
| 5 | `https://github.com/monte97/kafka-pekko` | Da verificare manualmente (accesso HTTP bloccato in questo ambiente) |

---

## Riepilogo

| Severita' | Count | Dettagli principali |
|-----------|-------|---------------------|
| P0 | 2 | Errore licenza 2.6.21 sotto BSL (falso); imprecisione fork "2.6.20" |
| P1 | 3 | Versioni datate nell'esempio; SerdeConfig/SchemaResolverConfig invertiti; data TLP |
| P2 | 6 | Regex incompleta; Materializer chiarimento; link versione 1.0; test deps; logging config; Scala 3 |

**Azione raccomandata**: Correggere i due P0 prima della pubblicazione -- sono errori fattuali verificabili che minano la credibilita' dell'articolo. I P1 migliorano significativamente l'accuratezza tecnica. I P2 sono miglioramenti opzionali di completezza.

**Dopo le correzioni P0 + P1, il punteggio stimato e': 8-9/10.**
