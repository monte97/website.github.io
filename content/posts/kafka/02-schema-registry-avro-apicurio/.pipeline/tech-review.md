# Tech Review: Schema Registry con Apache Kafka: da JSON selvaggio ad Avro con Apicurio

## Score: 7/10

Articolo tecnicamente solido nella struttura e nell'impostazione didattica. I concetti fondamentali su Avro, Schema Registry e schema evolution sono corretti. Tre errori P0 richiedono correzione prima della pubblicazione: un errore fattuale sulla versione del cambio licenza Confluent, un docker-compose che non funzionerebbe cosi' com'e' (healthcheck mancante), e una regola BACKWARD compatibility formulata in modo fuorviante. Il codice producer/consumer e' funzionalmente corretto. Le versioni sono plausibili e compatibili tra loro.

Dopo i fix P0 il punteggio salirebbe a **8.5/10**.

**Data review:** 2026-02-25
**Reviewer:** Claude (tech-review, Opus 4.6)

---

## P0 -- Errori bloccanti

### P0-1: Licenza Confluent: "dalla versione 7.x" e' sbagliato

> "Ma dalla versione 7.x la licenza e' Confluent Community License, non Apache 2.0."

**Fatto**: il cambio di licenza e' avvenuto con Confluent Platform **5.1** (dicembre 2018), non dalla 7.x. Dalla 5.1 in poi, Schema Registry, REST Proxy, ksqlDB e alcuni connettori sono sotto Confluent Community License. La 7.x non rappresenta alcun cambio di licenza significativo.

**Fix**: sostituire "dalla versione 7.x" con "dalla versione 5.1 (fine 2018)".

**Fonte**: https://www.confluent.io/confluent-community-license-faq/

### P0-2: Docker Compose: healthcheck mancante per il broker

Il servizio `schema-registry` dichiara:
```yaml
depends_on:
  broker:
    condition: service_healthy
```

Ma il servizio `broker` non definisce nessun blocco `healthcheck`. L'immagine `confluentinc/cp-kafka:7.8.0` non include un `HEALTHCHECK` nel Dockerfile. Docker Compose non potra' mai considerare il broker "healthy" e il container `schema-registry` non partira'. Un lettore che copia il docker-compose otterrebbe un errore.

**Fix**: aggiungere un healthcheck al servizio `broker`:
```yaml
healthcheck:
  test: ["CMD", "kafka-broker-api-versions", "--bootstrap-server", "localhost:9092"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

### P0-3: BACKWARD compatibility: regola sulla rimozione campi imprecisa

> "rimuovere campi (il reader semplicemente li ignora)"

Questa formulazione suggerisce che sotto BACKWARD compatibility si possa rimuovere qualsiasi campo. Non e' cosi'. Sotto BACKWARD compatibility:
- Si possono **aggiungere** campi con default (il reader ha il campo nuovo, il writer vecchio no -> usa il default).
- Si possono **rimuovere** campi **solo se avevano un default** nello schema precedente, oppure campi che il reader non necessita (il reader li ignora).

La regola precisa dalla documentazione Confluent: "delete an optional field" (cioe' un campo con default o nullable). Rimuovere un campo obbligatorio senza default puo' causare problemi se un consumer piu' vecchio (con lo schema precedente come reader) tenta di leggere messaggi scritti senza quel campo.

La demo stessa lo conferma correttamente: il tentativo di rimuovere `humidity` (che non ha default) viene rifiutato dal registry. Ma la regola generale enunciata prima contraddice la demo.

**Fix**: riformulare in: "rimuovere campi che avevano un default (il reader li ignora), ma non campi obbligatori senza default".

**Fonte**: https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html

---

## P1 -- Imprecisioni tecniche

### P1-1: Nota KafkaJS: precisare cosa e' non mantenuto

> "KafkaJS non riceve aggiornamenti significativi dal 2023 e presenta problemi di compatibilita' con Kafka 4.x."

La formulazione e' sostanzialmente corretta. KafkaJS ha un issue aperto (#1603) "Looking for maintainers" e problemi documentati con Kafka 4.0.0 in KRaft mode (issue #1752). Tuttavia, il pacchetto **companion** `@kafkajs/confluent-schema-registry` ha avuto una release v3.9.0 a maggio 2025 e risulta ancora mantenuto.

**Suggerimento**: specificare che e' il client Kafka core (`kafkajs`) ad avere problemi di manutenzione, non la libreria schema-registry companion.

### P1-2: `@confluentinc/schemaregistry` menzionato ma non linkato

La nota su KafkaJS suggerisce `@confluentinc/kafka-javascript` (con hyperlink) insieme a `@confluentinc/schemaregistry` (senza hyperlink). Il pacchetto esiste su npm ed e' il companion ufficiale.

**Suggerimento**: aggiungere il link: `[@confluentinc/schemaregistry](https://www.npmjs.com/package/@confluentinc/schemaregistry)`.

### P1-3: URL registry per i client: path `/apis/ccompat/v7` non nel default

Il commento nel codice producer dice:
```javascript
// NOTA: con Apicurio il REGISTRY_URL deve includere /apis/ccompat/v7
```

Ma il default nel codice e':
```javascript
const REGISTRY_URL = process.env.SCHEMA_REGISTRY_URL || "http://localhost:8081";
```

La libreria `@kafkajs/confluent-schema-registry` puntata alla root di Apicurio (senza il path ccompat) otterrebbe 404 o risposte inattese. Il default dovrebbe essere `http://localhost:8081/apis/ccompat/v7` oppure va chiarito che il default funziona solo con Confluent Schema Registry nativo.

**Suggerimento**: cambiare il default a `http://localhost:8081/apis/ccompat/v7` in entrambi i codici, oppure aggiungere una nota prominente.

---

## P2 -- Miglioramenti suggeriti

### P2-1: Producer Node.js: manca `main()` call

Il codice del producer definisce `async function main()` ma non la chiama mai. Per completezza didattica aggiungere:
```javascript
main().catch(console.error);
```

### P2-2: Consumer Python: gestione `msg.error()` incompleta

Il codice del consumer fa:
```python
if msg is None or msg.error():
    continue
```

Sarebbe piu' robusto distinguere tra errori fatali e `KafkaError._PARTITION_EOF`. L'import `KafkaError` e' presente ma non utilizzato. O si rimuove l'import o si implementa la gestione:
```python
if msg.error():
    if msg.error().code() == KafkaError._PARTITION_EOF:
        continue
    raise KafkaException(msg.error())
```

### P2-3: `kafkacat` rinominato in `kcat`

Nella tabella comparativa: "`kafkacat` basta". Il tool e' stato rinominato in `kcat` dal 2021 (versione 1.7.0). Il vecchio nome funziona ancora come alias.

**Suggerimento**: sostituire `kafkacat` con `kcat`.

### P2-4: GenericRecord vs SpecificRecord: cenno ai linguaggi dinamici

La sezione "Lezioni apprese" punto 3 spiega GenericRecord vs SpecificRecord per Scala/Java ma non menziona come Python e Node.js si collocano. Entrambi restituiscono dizionari/oggetti JS, equivalenti a GenericRecord. Un breve cenno aiuterebbe il lettore multi-linguaggio.

### P2-5: KafkaSQL durability caveat

L'articolo dice che KafkaSQL offre "le stesse garanzie del broker Kafka". Corretto, ma su un cluster single-node (come nella demo) non c'e' ridondanza. Un lettore che usa la configurazione demo in produzione perderebbe gli schema in caso di failure.

**Suggerimento**: aggiungere una nota che in produzione serve un cluster multi-broker.

### P2-6: Manca `KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1` nel compose

Per un cluster Kafka single-node, senza questa variabile (e analoghe per transaction state log) Kafka potrebbe avere problemi nella creazione dei topic interni. Non e' sempre bloccante con `cp-kafka:7.8.0` ma e' buona pratica includerla.

---

## Link

| # | URL nell'articolo | Stato | Note |
|---|---|---|---|
| 1 | `https://github.com/confluentinc/confluent-kafka-javascript` | OK | Repo esistente, pacchetto `@confluentinc/kafka-javascript`, v1.8.0 |
| 2 | `https://avro.apache.org/docs/` | OK | Pagina indice documentazione Avro, versioni fino a 1.12.0 |
| 3 | `https://www.apicur.io/registry/docs/` | REDIRECT | Redirige a `.../apicurio-registry/3.1.x/index.html`. Funziona ma punta alla 3.1.x |
| 4 | `https://docs.confluent.io/platform/current/schema-registry/` | OK | Documentazione Confluent Schema Registry |
| 5 | `https://github.com/kafkajs/confluent-schema-registry` | OK | Repository attivo, ultima release v3.9.0 (maggio 2025) |
| 6 | `https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html` | OK | API reference confluent-kafka-python v2.13.0 |
| 7 | `https://github.com/monte97/kafka-pekko` | NON VERIFICATO | Repository dell'autore, non verificabile se pubblico |

---

## Versioni

| Componente | Versione nell'articolo | Verifica |
|---|---|---|
| `confluentinc/cp-kafka` | 7.8.0 | OK -- immagine Docker esistente su Docker Hub, anche 7.9.0 disponibile |
| `apicurio/apicurio-registry` | 3.0.4 | PLAUSIBILE -- Apicurio 3.0.x esiste; release fino a 3.0.7 su GitHub |
| `kafkajs` | non specificata | OK -- pacchetto npm esistente, manutenzione rallentata |
| `@kafkajs/confluent-schema-registry` | non specificata | OK -- ultima release v3.9.0 (maggio 2025) |
| `confluent-kafka-python` | non specificata | OK -- ultima release v2.13.0 |
| `@confluentinc/kafka-javascript` | non specificata (menzionato) | OK -- npm, v1.8.0 (gennaio 2026) |

### Compatibilita' incrociata

- `cp-kafka:7.8.0` usa Kafka 3.8.x internamente. KafkaJS funziona con Kafka 3.x.
- Apicurio 3.0.x con `APICURIO_STORAGE_KIND: kafkasql` e' il setup documentato ufficialmente.
- L'API ccompat `/apis/ccompat/v7` e' supportata da Apicurio 3.0.x (anche `/apis/ccompat/v8` disponibile).
- `confluent-kafka-python` con `AvroDeserializer(sr_client)` senza `schema_str` e' valido dalla v2.3.0+: usa lo writer schema come fallback.
- Le env `APICURIO_STORAGE_KIND: kafkasql` e `APICURIO_KAFKASQL_BOOTSTRAP_SERVERS` sono corrette per Apicurio 3.x.

---

## Correttezza codice

### Producer Node.js

- `registry.register({ type: SchemaType.AVRO, schema }, { subject: \`${TOPIC}-value\` })` -- **corretto**, conforme alla API documentata.
- `registry.encode(schemaId, reading)` -- **corretto**: serializza in binario Avro con prefix 5 byte (1 byte magic `0x00` + 4 byte schema ID).
- La spiegazione del wire format e' **corretta**.
- Il codice compilerebbe/eseguirebbe con le dipendenze corrette (`kafkajs`, `@kafkajs/confluent-schema-registry`).
- Il delay `setTimeout(r, 1000)` e' presente nel loop (riga 231) -- **corretto**.

### Consumer Python

- `AvroDeserializer(sr_client)` senza `schema_str` -- **valido** dalla v2.3.0+. Usa lo writer schema embedded nel messaggio.
- Invocazione `avro_deserializer(msg.value(), SerializationContext(msg.topic(), MessageField.VALUE))` -- **corretto**: l'oggetto e' callable.
- Il codice eseguirebbe con `confluent-kafka[avro]` installato.
- Import `KafkaError` presente ma non usato nel corpo del codice.

### Schema Avro

- Sintassi `SensorReading.avsc` -- **corretta**: `type: record`, `namespace`, `logicalType: timestamp-millis`, union `["null", "string"]` con `default: null`.
- Schema annidato `C40Standardized` con record annidati -- **sintatticamente valido**.
- Evoluzione con campo `battery_level` tipo `double` con `default: -1.0` -- **evoluzione BACKWARD compatibile corretta**.

### Docker Compose

- YAML valido. Configurazione KRaft single-node con `KAFKA_PROCESS_ROLES: broker,controller` e `CLUSTER_ID` -- **corretta**.
- Mapping porte `8081:8080` per Apicurio -- **corretto** (Apicurio ascolta su 8080 internamente).
- **Manca healthcheck** per il broker (P0-2).

---

## Correttezza fattuale

| Affermazione | Verifica |
|---|---|
| Avro wire format binario, senza nomi campo | Corretto |
| Magic byte + 4 byte schema ID (Confluent wire format) | Corretto |
| Apicurio API compatibile Confluent `/apis/ccompat/v7` | Corretto per Apicurio 3.x |
| KafkaSQL salva schema in topic Kafka interno | Corretto |
| Apicurio: singola immagine Docker per tutti i backend storage (3.x) | Corretto |
| Avro union `["null", "string"]` con default null = campo opzionale | Corretto |
| Logical type `timestamp-millis` su `long` | Corretto |
| Licenza Confluent cambiata "dalla 7.x" | **Errato**: cambio dalla 5.1 (2018) |
| BACKWARD: si possono rimuovere campi | **Impreciso**: solo campi con default |
| Apicurio default compatibility NONE | Corretto |

---

## Verdetto

Articolo ben strutturato con un flusso logico chiaro: problema reale -> scelta tecnologica motivata -> implementazione pratica -> schema evolution -> lezioni apprese. Il contesto di produzione reale (piattaforma telemetria multi-linguaggio) rende l'articolo credibile e rilevante.

**Punti di forza:**
- Confronto Avro vs JSON Schema con tabella chiara e regola pratica ("Avro per il core, JSON Schema per i bordi")
- Schema evolution spiegata con esempi concreti (evoluzione compatibile e incompatibile)
- Sezione "lezioni apprese" con insight pratici (GenericRecord vs SpecificRecord, migrazione incrementale, dual-write)
- Nota proattiva su KafkaJS e alternativa Confluent

**Correzioni necessarie (P0):**
1. Versione cambio licenza Confluent: 5.1, non 7.x (P0-1)
2. Aggiungere healthcheck broker nel docker-compose (P0-2)
3. Precisare regola BACKWARD sulla rimozione campi (P0-3)

**Miglioramenti consigliati (P1):**
4. Precisare nota KafkaJS (core vs companion library) (P1-1)
5. Aggiungere link a `@confluentinc/schemaregistry` (P1-2)
6. Allineare default URL registry con path ccompat (P1-3)

**Raccomandazione:** Correggere i P0, poi approvato per pubblicazione.
