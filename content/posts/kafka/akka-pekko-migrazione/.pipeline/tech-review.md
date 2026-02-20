# Tech Review: Akka è morto, lunga vita a Pekko

**Reviewer**: Claude Opus 4.6 (tech-review)
**Data**: 2026-02-20
**Articolo**: `content/posts/kafka/akka-pekko-migrazione/index.md`

## Score: 7/10

L'articolo e' una guida pratica solida con una checklist di migrazione ben strutturata. Presenta pero' un errore critico sulla versione del fork e alcune imprecisioni fattuali che richiedono correzione prima della pubblicazione.

---

## Findings

### P0 - Errori Critici

**P0-1: Versione del fork Pekko errata (2.6.19 vs 2.6.20)**

L'articolo afferma in due punti:

- Riga 22: "Akka 2.6.19 è l'ultima versione sotto Apache 2.0; dalla 2.6.20 anche la serie 2.6.x è sotto BSL 1.1."
- Riga 36: "Apache Pekko è nato come fork di Akka 2.6.19 (l'ultima versione Apache 2.0)"

**Fatto:** Akka **2.6.20** e' l'ultima versione rilasciata sotto Apache 2.0. La release 2.6.20 e' avvenuta il giorno prima dell'annuncio del cambio licenza (settembre 2022). Apache Pekko 1.0.0 e' basato su Akka **2.6.20**, non 2.6.19.

Il codice di esempio a riga 64 usa correttamente `"2.6.20"`, il che contraddice il testo stesso dell'articolo.

**Fonte:** [Pekko 1.0 Release Notes](https://pekko.apache.org/docs/pekko/1.0/release-notes/index.html), [Akka BSL License FAQ](https://akka.io/bsl-license-faq)

**Fix:** Sostituire "2.6.19" con "2.6.20" in entrambe le occorrenze. Riformulare la frase sulla BSL: le versioni 2.6.21+ della serie 2.6 e tutte le 2.7+ sono sotto BSL 1.1.

---

### P1 - Errori Significativi

**P1-1: Versione `akka-stream-kafka 4.0.2` e' sotto BSL**

L'esempio a riga 67 mostra:

```scala
"com.typesafe.akka" %% "akka-stream-kafka" % "4.0.2"
```

La versione 4.0.x di Alpakka Kafka e' stata rilasciata sotto BSL, non sotto Apache 2.0. L'ultima versione Apache 2.0 e' la **3.0.x**. Se l'intento e' mostrare un progetto che usava gia' la 4.0.2, andrebbe esplicitato. Altrimenti usare la 3.0.1 per coerenza con la narrativa "migrazione dall'ultima versione open-source".

---

**P1-2: Manca la menzione della clausola di reversion BSL a 3 anni**

L'articolo dice che "l'uso commerciale di Akka richiede una licenza a pagamento" ma omette che le versioni BSL 1.1 **revertono automaticamente ad Apache 2.0 dopo 3 anni** dalla data di rilascio. Questo e' un dettaglio rilevante per chi valuta le tre opzioni presentate.

**Fix:** Aggiungere una frase come: "Le versioni BSL revertono automaticamente ad Apache 2.0 dopo 3 anni, ma per chi necessita di patch tempestive questa clausola non risolve il problema."

---

**P1-3: Affermazione su Apicurio SerdeConfig da verificare**

L'articolo afferma (riga 178):

> `SerdeConfig` e' deprecata in favore di `SchemaResolverConfig`, che la estende con opzioni aggiuntive per la risoluzione degli schema.

La relazione di ereditarieta' tra `SerdeConfig` e `SchemaResolverConfig` in Apicurio 3.x potrebbe essere invertita. In Apicurio 3.x, `SerdeConfig` estende `SchemaResolverConfig`, non il contrario. Verificare il codice sorgente Apicurio prima della pubblicazione.

---

**P1-4: Data di graduazione Pekko a TLP**

L'articolo dice "promosso a progetto top-level ASF nel marzo 2024". La risoluzione del Board e' del 20 marzo 2024, ma l'annuncio ufficiale e' del **16 maggio 2024**.

**Fonte:** [ASF Announcement](https://news.apache.org/foundation/entry/apache-software-foundation-announces-new-top-level-project-apache-pekko)

**Fix:** Usare "nella prima meta' del 2024" oppure "maggio 2024" (data dell'annuncio ufficiale).

---

### P2 - Suggerimenti

**P2-1: Manca menzione della compatibilita' Scala 3**

Pekko 1.0.x supporta Scala 2.12, 2.13 e 3. Per chi migra, sapere che Pekko apre la strada anche a Scala 3 e' un'informazione utile.

---

**P2-2: Il regex di sostituzione import e' incompleto**

Il regex `s/import akka\./import org.apache.pekko./g` non copre:
- Import raggruppati Scala (`import akka.{actor, stream}`)
- Riferimenti qualificati nel corpo del codice
- Pattern matching su tipi Akka

Suggerire di usare IntelliJ "Replace in Files" con revisione manuale, oppure menzionare gli script di migrazione della community Pekko.

---

**P2-3: `sbt dependencyTree` come step esplicito nella checklist**

Il Gotcha 4 menziona `sbt dependencyTree` come strumento di debug, ma non e' incluso nella checklist come step preventivo. Andrebbe aggiunto come step 0 ("analisi dipendenze transitive prima di iniziare").

---

**P2-4: Manca nota su serializzazione per chi usa Akka Cluster**

Per sistemi che usano Akka Cluster con serializzazione o Akka Persistence, non e' possibile fare rolling upgrade misto Akka/Pekko. Una nota di avvertimento sarebbe utile anche se i servizi descritti nell'articolo sono standalone.

---

**P2-5: Manca menzione di test framework changes**

La migrazione coinvolge anche le dipendenze di test (`akka-actor-testkit-typed` -> `pekko-actor-testkit-typed`, `akka-stream-testkit` -> `pekko-stream-testkit`). Citarli nella checklist renderebbe la guida piu' completa.

---

**P2-6: Configurazione serializzazione e logging**

Namespace di configurazione come `akka.event.slf4j.Slf4jLogger` -> `org.apache.pekko.event.slf4j.Slf4jLogger` e configurazioni di serializzazione Jackson non sono menzionati. Sono parte del rename meccanico ma facili da dimenticare.

---

## Codice

Tutti i blocchi di codice sono sintatticamente corretti. Le dichiarazioni SBT, gli import Scala, la configurazione HOCON e il pattern `SystemMaterializer` sono validi. Nessun errore di sintassi rilevato.

## Sicurezza

Nessun anti-pattern di sicurezza rilevato. L'articolo correttamente evidenzia il rischio di restare su versioni Akka senza patch di sicurezza.

## Completezza

L'articolo copre i punti fondamentali della migrazione. I gotcha dal campo aggiungono valore reale. Mancano: test framework, serializzazione/logging config, compatibilita' Scala 3, e la clausola di reversion BSL a 3 anni.

---

## Summary

| Priority | Count | Descrizione |
|----------|-------|-------------|
| P0       | 1     | Versione fork errata (2.6.19 -> 2.6.20) |
| P1       | 4     | Versione BSL in esempio, reversion clause, Apicurio SerdeConfig, data TLP |
| P2       | 6     | Scala 3, regex, dependencyTree, Cluster, test, logging |

**Verdict:** Correggere il P0 e i P1 prima della pubblicazione. Dopo le correzioni, il punteggio puo' salire a **8-9/10**.
