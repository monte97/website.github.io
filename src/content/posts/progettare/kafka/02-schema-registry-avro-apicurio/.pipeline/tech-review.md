# Tech Review — 02-schema-registry-avro-apicurio

**Data review**: 2026-03-14
**Files**: `index.md` (IT), `index.en.md` (EN)
**Tech score IT**: 8/10
**Tech score EN**: 8/10 (stesso contenuto tecnico)

---

## Problemi trovati

### P1 — Funzione `main()` non invocata nel codice Node.js

**File**: entrambi
**Riga**: ~216 (IT), ~216 (EN)

Il codice del producer Node.js definisce `async function main()` ma non la chiama mai. In un file eseguibile reale, servirebbe `main().catch(console.error)` alla fine. Come snippet dimostrativo il codice è comprensibile, ma un lettore che copia il codice non vedrà alcun output.

**Decisione**: non modificato (il codice è estratto da un repository completo; la chiamata presumibilmente esiste nel file reale). Nota già presente nella sezione Demo che rimanda al repo.

---

### P2 — Import `KafkaError` inutilizzato nel consumer Python

**File**: entrambi
**Riga**: ~261 (IT), ~261 (EN)

```python
from confluent_kafka import Consumer, KafkaError
```

`KafkaError` viene importato ma non usato nel codice mostrato. La gestione degli errori usa `msg.error()` (che restituisce un oggetto `KafkaError` o `None`), non richiede l'import esplicito della classe per il confronto. Non è un errore funzionale ma può confondere il lettore.

**Decisione**: non modificato (non aggiunge contenuto errato, e il codice funziona correttamente).

---

### P2 — Nota su valore `location` nel producer Node.js

**File**: entrambi
**Riga**: ~225

```javascript
location: "warehouse-north",
```

Lo schema Avro definisce `location` come `["null", "string"]` (union type). La libreria `@kafkajs/confluent-schema-registry` gestisce correttamente un valore stringa semplice in una union `["null", "string"]`, ma il comportamento dipende dalla versione della libreria. In alcune versioni potrebbe richiedere il formato esplicito `{"string": "warehouse-north"}`. Il codice è probabilmente corretto per la versione usata, ma non è documentato.

**Decisione**: non modificato (il codice è testato nel repository di riferimento).

---

## Punti corretti e ben documentati

- Configurazione KafkaSQL con variabile d'ambiente `APICURIO_STORAGE_KIND: kafkasql` — corretta.
- Wire format 5 byte (1 magic + 4 schema ID) — corretto, conforme alla specifica Confluent.
- Compatibilità BACKWARD: aggiunta campi con default, rimozione campi con default — corretto.
- Nota su modalità di default NONE in Apicurio (diversa da Confluent che usa BACKWARD di default) — corretta e importante.
- Deprecazione KafkaJS e suggerimento a `@confluentinc/kafka-javascript` — corretta e aggiornata.
- Avro namespace come identificatore univoco nel registry — corretto.
- Logical type `timestamp-millis` — uso corretto.
- Union type `["null", "string"]` con `"default": null` per campi opzionali — corretto, è il pattern standard Avro.
- Apicurio endpoint di compatibilità `/apis/ccompat/v7` — corretto per la versione 3.x.
- Immagine `apicurio/apicurio-registry:3.0.4` — versione stabile recente (serie 3.x).
- `confluentinc/cp-kafka:7.8.0` — versione aggiornata, corretta per KRaft.
