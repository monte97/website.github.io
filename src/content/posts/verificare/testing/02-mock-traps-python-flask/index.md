---
title: Il tuo servizio Flask è impossibile da testare (e non è colpa dei mock)
date: 2026-02-24T11:00:00.000Z
description: 88 test, tre servizi Flask, mutation score al 19%. Il problema non è nel mocking - è nel codice che crea connessioni Kafka e MongoDB al momento dell'import.
pillar: verificare
category: testing
tags:
  - Python
  - Testing
  - Pytest
  - Flask
  - Kafka
  - MongoDB
  - Mutation Testing
lang: it
draft: true
reviewed: human
series: unit-testing
seriesOrder: 20
reproducibility: true
summary:
  - label: "Anti-pattern"
    value: "Connessioni Kafka e MongoDB create al momento dell'import"
    note: "Nessun lazy loading, nessuna factory, nessuna dependency injection"
  - label: "Workaround"
    value: "Moduli fake in `sys.modules`, poi env vars e patch threading, infine l'import"
    note: "L'ordine è un contratto: invertire un singolo step crasha il modulo"
  - label: "Risultato"
    value: "88 test nuovi, mutation score dal 19% al 46% sui tre servizi"
    note: "La logica dentro il consumer Kafka resta fuori dalla portata dei test"
  - label: "Refactoring"
    value: "Logica estratta in funzioni pure, dependency injection nei servizi successivi"
    note: "70 test, zero mutanti sopravvissuti sulla logica di business dopo il filtro"
openItems:
  - "I tre servizi originali restano in produzione senza refactoring: l'estrazione strutturale è applicata solo ai cinque servizi successivi"
  - "Consumer Kafka e procedure imperative restano non unit-testabili: quel codice è raggiungibile solo rifattorizzando il modulo"
  - "Un nuovo import al top level rompe il conftest in modo silenzioso: il contratto d'ordine va documentato"
  - "Un 100% ottenuto filtrando i mutanti infrastrutturali non equivale a un 100% su tutti i mutanti"
openNote: "Fin dove arrivano le workaround, e cosa richiede un refactoring vero."
---

Tre servizi Flask, tre conftest.py, un singolo smoke test ciascuno: `GET /health` restituiva 200, tutti verdi, CI felice. Poi ho scritto il secondo test e tutto è crollato.

Ma non è una storia di mock. È una storia di **design**.

Tutti e tre i servizi creavano connessioni Kafka e MongoDB **al momento dell'import** — a livello di modulo, fuori da qualsiasi funzione. Nessun lazy loading, nessuna factory, nessuna dependency injection. L'`import` stesso era un side-effect. Questo è il motivo per cui i mock erano rotti: non stavano mockando la cosa sbagliata per negligenza. Stavano combattendo un'architettura che rende il testing intrinsecamente fragile.

Il risultato finale: **88 nuovi test**, mutation score che va dal **19% al 46%** sui tre servizi. I numeri raccontano una storia chiara: puoi coprire tutti gli endpoint, ma se la logica di business vive dentro il consumer Kafka (che parte all'import), i tuoi test non la toccheranno mai.

Queste sono le quattro trappole che ho incontrato portando quei servizi da 3 a 91 test. Ogni trappola è un sintomo dello stesso problema di fondo.

---

## L'anti-pattern: connessioni a livello di modulo

Prima delle trappole, il contesto. Ecco cosa succede quando fai `from current import app`:

```python
# current.py — eseguito al top level
from confluent_kafka import DeserializingConsumer
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroDeserializer

# ... configurazione ...

consumer_thread = threading.Thread(target=consume_data)  # riga 61
consumer_thread.start()                                   # riga 62
```

Due righe. Un thread che parte, un consumer Kafka che cerca un broker. E per il servizio `usage`, la situazione era quadruplicata:

```python
# usage.py — tutto eseguito al top level
mongo_client = MongoClient(mongo_connection_string)     # riga 39
schema_registry_client = SchemaRegistryClient({...})    # riga 45
avro_serializer = AvroSerializer(schema_registry_client) # riga 62
kafka_producer = SerializingProducer(producer_conf)      # riga 69
```

Quattro connessioni esterne create all'import. Il modulo Python è imperativo: le righe vengono eseguite nell'ordine in cui appaiono. Non c'è un `if __name__ == '__main__'` a proteggerti. L'import **è** l'esecuzione.

Questo rende il testing un esercizio di damage control: devi preparare un ambiente fake completo **prima** dell'import, o il modulo crasha cercando broker e database inesistenti.

**Se stessi progettando questi servizi da zero**, useresti factory function, lazy initialization, o dependency injection. Ma questi servizi esistono, sono in produzione, e non li riscrivi per aggiungere test. Li mocki. E qui iniziano i problemi.

---

## Trappola 1: Il conftest fantasma

**16 test scritti. Tutti passavano. Tutti inutili.**

Il punto di partenza. Tre servizi, tre `conftest.py`, tutti con lo stesso pattern:

```python
# conftest.py - ROTTO (ma passava i test!)
from unittest.mock import patch, MagicMock

with patch("kafka.KafkaConsumer", return_value=MagicMock()):
    with patch("threading.Thread") as _mock_thread:
        _mock_thread.return_value.start = MagicMock()
        from current import app
```

Il problema: `current.py` non importa `kafka.KafkaConsumer` da mesi. Usa `confluent_kafka.DeserializingConsumer`. Il codice era stato migrato da `kafka-python` a `confluent-kafka`, ma nessuno aveva aggiornato i conftest. Il `patch("kafka.KafkaConsumer")` non generava errore perché il modulo `kafka` era ancora installato come dipendenza transitiva.

In un servizio con side-effect al top level, un conftest che mocka la libreria sbagliata non fallisce — semplicemente non mocka nulla. E se l'unico test è `GET /health` (che non tocca Kafka), non te ne accorgi mai.

**Perché questo è un problema di design, non di mock**: se il servizio usasse dependency injection, non avresti bisogno di indovinare quale `patch()` target corrisponde a quale import. Inietteresti direttamente il collaboratore fake.

---

## Trappola 2: `patch()` non funziona con i submoduli C-backed

Primo tentativo di fix. Aggiornati i mock alla libreria corretta:

```python
# Tentativo 1 - NON FUNZIONA
with patch("confluent_kafka.DeserializingConsumer"):
    with patch("confluent_kafka.schema_registry.SchemaRegistryClient"):
        with patch("confluent_kafka.schema_registry.avro.AvroDeserializer"):
            from current import app
```

Errore:

```
AttributeError: module 'confluent_kafka' has no attribute 'schema_registry'
```

`unittest.mock.patch()` risolve il percorso navigando attributi: importa `confluent_kafka`, poi cerca `.schema_registry`, poi `.SchemaRegistryClient`. Ma `confluent_kafka.schema_registry` è un submodulo C-backed che richiede `librdkafka` compilato. Nel container di test (o nella venv CI), il submodulo non si carica, e `patch` fallisce.

La soluzione: iniettare moduli fake direttamente in `sys.modules` **prima** che qualsiasi import li cerchi:

```python
import sys
from unittest.mock import MagicMock

_fake_confluent_kafka = MagicMock()
_fake_schema_registry = MagicMock()
_fake_avro = MagicMock()

_fake_confluent_kafka.schema_registry = _fake_schema_registry
_fake_schema_registry.avro = _fake_avro

sys.modules.setdefault("confluent_kafka", _fake_confluent_kafka)
sys.modules.setdefault("confluent_kafka.schema_registry", _fake_schema_registry)
sys.modules.setdefault("confluent_kafka.schema_registry.avro", _fake_avro)

from current import app  # Python trova i moduli fake in sys.modules
```

Uso `setdefault` per non sovrascrivere un modulo già caricato. Questo pattern funziona con qualsiasi libreria C-backed: `grpc`, `librdkafka`, `psycopg2`, `confluent_kafka`.

**Perché questo è un problema di design, non di mock**: stai costruendo una gerarchia di moduli fake a mano perché il codice fa `from confluent_kafka.schema_registry.avro import AvroDeserializer` al top level. Con un'architettura a factory, la creazione del deserializer sarebbe isolata in una funzione, e potresti mockarla con un singolo `patch` sul punto di utilizzo.

---

## Trappola 3: L'ordine dell'import è il tuo contratto

Il pattern completo per far funzionare un conftest con questi servizi richiede tre step in ordine preciso:

```python
import sys
import os
from unittest.mock import MagicMock, patch

# 1. sys.modules PRIMA di tutto
sys.modules.setdefault("confluent_kafka", MagicMock())
sys.modules.setdefault("confluent_kafka.schema_registry", MagicMock())
sys.modules.setdefault("confluent_kafka.schema_registry.avro", MagicMock())

# 2. Env vars (lette al top level dal modulo)
os.environ.setdefault("KAFKA_IP", "localhost")
os.environ.setdefault("KAFKA_PORT", "9092")
os.environ.setdefault("CURRENT_TOPIC", "test-topic")

# 3. Patch threading per impedire il consumer thread
with patch("threading.Thread") as _mock_thread:
    _mock_thread.return_value.start = MagicMock()
    from current import app  # Ora e' sicuro
```

L'ordine è un contratto non documentato: `sys.modules` -> env vars -> patch threading -> import. Se inverti un singolo step, il modulo crasha. E questo contratto è fragile: se qualcuno aggiunge un nuovo `import` al top level di `current.py`, il conftest si rompe silenziosamente.

**Il costo reale**: quando un modulo ha side-effect all'import, il tuo conftest diventa un'immagine speculare del codice sotto test. Ogni connessione, ogni variabile d'ambiente, ogni thread deve essere replicato nel conftest. Stai scrivendo il modulo due volte.

---

## Trappola 4: Mock contamination tra test

**18 test verdi su 26 per il servizio `history`. Gli 8 nell'ultimo gruppo fallivano tutti con lo stesso errore.**

```
AttributeError: 'builtin_function_or_method' object has no attribute 'return_value'
```

Il problema: test diversi configuravano lo stesso mock MongoDB in modi incompatibili. L'endpoint `/equip/<id>` fa `.find(query).sort("timestamp", 1)`:

```python
# Test per /equip/<id>
mock_collection.find.return_value.sort.return_value = [doc1, doc2]
```

L'endpoint `/locations/today/equipment` fa `list(collection.find(query, projection))`:

```python
# Test per /locations/today
mock_collection.find.return_value = [{"base": {"code": "EX001"}}]
```

Quando il secondo pattern viene eseguito, `find.return_value` diventa una **lista Python reale**. `.sort` non è più un metodo di `MagicMock` — è `list.sort()`, un built-in che non ha `return_value`.

Il colpo di grazia: `reset_mock()` **non risolve il problema**. `reset_mock()` resetta contatori e child mock, ma `find.return_value` è stato sostituito con un oggetto reale. Il reset non lo ripristina.

La soluzione: sostituire completamente l'attributo con un nuovo MagicMock ad ogni test:

```python
@pytest.fixture
def mock_collection():
    """Reset completo di collection.find prima di ogni test."""
    collection.find = MagicMock()  # Nuovo mock fresco
    yield collection
    collection.find = MagicMock()  # Cleanup
```

**Perché questo è un problema di design, non di mock**: la collection MongoDB è un modulo-level singleton condiviso tra tutti i test. Con dependency injection, ogni test riceverebbe la sua istanza. Non ci sarebbe contaminazione perché non ci sarebbe stato condiviso.

---

## I numeri: cosa dicono i mutation test

Dopo aver risolto le quattro trappole, ho 88 test che passano e coprono tutti gli endpoint. Ma i numeri del mutation testing raccontano una storia diversa.

| Servizio | Test | Mutanti | Killed | Score |
|----------|------|---------|--------|-------|
| current  | 16   | 63      | 12     | 19%   |
| history  | 26   | 183     | 75     | 41%   |
| usage    | 46   | 325     | 150    | 46%   |

Un mutation score del 19% su `current` significa che l'81% delle mutazioni al codice non vengono rilevate dai test. `history` e `usage` se la cavano meglio (41-46%) perché hanno più logica nelle route Flask e funzioni pure testabili (`compute_delta`, `timestamp_to_date`). Ma i mutanti nelle procedure imperative del consumer Kafka sopravvivono quasi tutti.

Il motivo è strutturale: la logica di business vive nelle funzioni chiamate dal consumer thread Kafka (`consume_data`, `handle_message`, `compute_delta`). Quel thread è stato mockato nel conftest per impedirgli di partire. I test coprono le Flask route — `GET /health`, `GET /equipment`, `GET /search` — che sono essenzialmente thin wrapper su un dizionario in-memory o su una query MongoDB.

I test alle funzioni pure (`compute_delta`, `timestamp_to_date`, `should_compute_delta`) funzionano bene e uccidono mutanti. Ma la maggior parte del codice non è in funzioni pure — è in procedure imperative che leggono da Kafka, scrivono su MongoDB, e aggiornano stato globale. Quel codice è strutturalmente non raggiungibile dai test senza refactoring del modulo.

**Il mutation testing conferma la tesi**: il problema non è nel mocking, è nel design. Puoi avere 88 test verdi e un mutation score tra il 19% e il 46%. I test ti dicono che gli endpoint rispondono. I mutanti ti dicono che metà della logica di business è scoperta — e per il servizio più semplice (current), quattro quinti.

---

## Recap: il vero problema e le workaround pragmatiche

Le quattro trappole sono sintomi. La causa è il codice che fa side-effect all'import: connessioni a database, consumer Kafka, thread che partono. In un mondo ideale, rifattorizzeresti:

1. **Factory function** invece di connessioni al top level
2. **Dependency injection** invece di singleton a livello di modulo
3. **Lazy initialization** con `if __name__ == '__main__'` per i thread

Ma se hai servizi in produzione e devi aggiungere test *adesso*, queste sono le workaround che funzionano:

1. **Verifica che i mock corrispondano agli import reali.** Apri il modulo, leggi gli import, confronta con i `patch()`. Se il codice usa `confluent_kafka` e il conftest mocka `kafka`, hai un fantasma.

2. **Usa `sys.modules` injection per i submoduli C-backed.** `patch()` non riesce a navigare submoduli che richiedono compilazione nativa. Inietta MagicMock direttamente in `sys.modules` prima dell'import.

3. **Rispetta l'ordine: sys.modules -> env vars -> patch threading -> import.** L'ordine è un contratto implicito. Documentalo nel conftest.

4. **Riassegna i mock, non limitarti a `reset_mock()`.** Se imposti `find.return_value = [lista]`, il mock è perso. Crea un nuovo `MagicMock()` ad ogni test.

E quando hai finito, lancia il mutation testing. I numeri ti diranno esattamente quanto del tuo codice è davvero sotto test — e probabilmente sarà molto meno di quello che pensi.

---

## Il refactoring: estrarre, iniettare, filtrare

Le workaround funzionano, ma restano workaround. Sui cinque servizi Python successivi ho applicato le tre misure strutturali: factory function, dependency injection, lazy initialization. Il risultato è una struttura testabile senza nessuna delle quattro trappole.

### Estrarre la logica dal consumer loop

Il pattern chiave è l'estrazione della logica di business dal loop Kafka in una funzione pura. Prima:

```python
# consumer.py — logica dentro il loop bloccante
def consume_data(config, collection):
    consumer = KafkaConsumer(config["topic"], ...)
    for message in consumer:
        data = loads(message.value.decode("utf-8"))
        # 30 righe di logica inline: validazione, trasformazione, insert...
        required_keys = ("identifier", "timestamp", "base", "c40")
        if not all(k in data for k in required_keys):
            continue
        # ... ancora logica ...
        collection.insert_one(entry)
```

Dopo:

```python
# consumer.py — logica estratta
def process_message(data, collection):
    """Testabile senza Kafka."""
    from pymongo import errors
    from datetime import datetime

    required_keys = ("identifier", "timestamp", "base", "c40")
    if not all(k in data for k in required_keys):
        return 0

    # ... logica di business ...
    try:
        collection.insert_one(entry)
        inserted += 1
    except errors.DuplicateKeyError:
        continue
    return inserted


def consume_data(config, collection):
    consumer = KafkaConsumer(config["topic"], ...)
    for message in consumer:
        data = loads(message.value.decode("utf-8"))
        process_message(data, collection)
```

Il loop Kafka diventa un wrapper di tre righe. `process_message` accetta un dizionario e una collection, ritorna un conteggio. Testabile con un `MagicMock()` al posto della collection, senza `sys.modules`, senza `patch()`, senza ordine di import.

Per i servizi Flask, l'application factory con dependency injection elimina i singleton a livello di modulo:

```python
# conftest.py — il mock e' una fixture di due righe
@pytest.fixture
def mock_collection(app):
    app.collection.reset_mock()
    yield app.collection
```

Niente `sys.modules` injection, niente ordine di import, niente `patch()` su percorsi C-backed. La collection è un attributo dell'app, iniettato alla creazione.

### I numeri dopo il refactoring

| Servizio | Test | Sopravvissuti |
|----------|:----:|:-------------:|
| equip-assignment-api | 15 | 0 |
| equip-assignment-c40-read | 12 | 0 |
| equip-assignment-report-read | 12 | 0 |
| report-save (business + endpoint) | 22 | 0 |
| registry-equip-syncher | 9 | 0 |
| **Totale** | **70** | **0** |

Zero mutanti sopravvissuti sulla logica di business. Ma il numero "zero" ha un asterisco: non tutti i mutanti generati da mutmut sono rilevanti. Senza filtri, decine di mutanti sopravvivono su righe come `print("Consumer started")` o `os.makedirs(path, exist_ok=True)`. Sono falsi positivi strutturali: nessun test dovrebbe asserire sul testo di un log o sul flag di sicurezza di `makedirs`.

---

## Filtrare il rumore: mutmut_config.py

mutmut genera mutanti su ogni riga di codice Python. Questo include:

- `print("Consumer started")` -> `print("XXConsumer startedXX")`
- `os.makedirs(path, exist_ok=True)` -> `os.makedirs(path, exist_ok=False)`
- `sys.path.insert(0, ...)` -> `sys.path.insert(1, ...)`
- `jsonify({"error": "Missing required fields"})` -> `jsonify({"error": "XXMissing required fieldsXX"})`

Nessuno di questi è logica di business. Stringhe di errore, flag di sicurezza, infrastruttura di import, chiamate di logging — sono rumore che gonfia il conteggio dei sopravvissuti e nasconde i problemi reali.

mutmut supporta un hook `pre_mutation` in un file `mutmut_config.py` nella root del progetto. La funzione riceve un `context` con la riga corrente e il numero di riga, e può impostare `context.skip = True` per saltare il mutante.

### Pattern 1: filtrare per contenuto della riga

Il caso più semplice. Righe che contengono pattern noti di infrastruttura:

```python
# mutmut_config.py — subservice-report-save
def pre_mutation(context):
    line = context.current_source_line.strip()

    # sys.path manipulation — infrastruttura di import
    if line.startswith("sys.path.insert("):
        context.skip = True
        return

    # exist_ok e' un flag di sicurezza, non logica di business
    if "exist_ok=" in line and "makedirs" in line:
        context.skip = True
        return
```

Stesso approccio per le `print()` nei consumer:

```python
    if line.startswith("print("):
        context.skip = True
        return
```

### Pattern 2: filtrare per zona del file

Per i consumer Kafka, la funzione `consume_data` è un loop bloccante non unit-testabile. mutmut genera mutanti anche lì: `"latest"` -> `"XXlatestXX"`, `1.0` -> `2.0` nel poll timeout, `"utf-8"` -> `"XXutf-8XX"`. Tutti sopravvivono, nessuno è un problema.

La soluzione: trovare dinamicamente la riga dove inizia `consume_data` e saltare tutto da lì in poi:

```python
# mutmut_config.py — consumer Kafka
_CONSUME_DATA_LINE = None

def _find_consume_data_line():
    global _CONSUME_DATA_LINE
    if _CONSUME_DATA_LINE is not None:
        return _CONSUME_DATA_LINE
    try:
        with open("consumer.py") as f:
            for i, line in enumerate(f, 1):
                if line.startswith("def consume_data("):
                    _CONSUME_DATA_LINE = i
                    return _CONSUME_DATA_LINE
    except FileNotFoundError:
        pass
    _CONSUME_DATA_LINE = 9999
    return _CONSUME_DATA_LINE

def pre_mutation(context):
    line = context.current_source_line.strip()

    if line.startswith("print("):
        context.skip = True
        return

    if context.filename == "consumer.py":
        consume_start = _find_consume_data_line()
        if context.mutation_id.line_number >= consume_start:
            context.skip = True
            return
```

Il numero di riga viene calcolato una volta sola e cachato. Se qualcuno aggiunge codice prima di `consume_data`, il boundary si aggiorna automaticamente.

Lo stesso pattern funziona al contrario per le Flask app: saltare tutto **prima** di `_register_routes` (la sezione con la logica di business), cioè il corpo di `create_app()` con Flask/CORS/MongoDB setup:

```python
# mutmut_config.py — Flask app con application factory
_ROUTES_START_LINE = None

def _find_routes_start_line():
    global _ROUTES_START_LINE
    if _ROUTES_START_LINE is not None:
        return _ROUTES_START_LINE
    try:
        with open("app.py") as f:
            for i, line in enumerate(f, 1):
                if line.startswith("def _register_routes("):
                    _ROUTES_START_LINE = i
                    return _ROUTES_START_LINE
    except FileNotFoundError:
        pass
    _ROUTES_START_LINE = 0
    return _ROUTES_START_LINE

def pre_mutation(context):
    if context.filename == "app.py":
        routes_start = _find_routes_start_line()
        if routes_start and context.mutation_id.line_number < routes_start:
            context.skip = True
            return
```

### Pattern 3: filtrare le stringhe di messaggio

I test verificano status code, non il testo dei messaggi di errore. Mutare `"Missing required fields"` in `"XXMissing required fieldsXX"` genera un mutante che sopravvive sempre — e correttamente, perché nessun test asserisce (né dovrebbe asserire) sul testo esatto dell'errore.

```python
def _is_message_string(line):
    """True per righe che contengono solo testo di errore/successo."""
    msg_markers = ('"error":', '"message":', '"success":')
    return "jsonify(" in line and any(m in line for m in msg_markers)

def pre_mutation(context):
    line = context.current_source_line.strip()

    if _is_message_string(line):
        context.skip = True
        return

    # Content-Type e' una costante statica
    if '"Content-Type"' in line or '"application/json"' in line:
        context.skip = True
        return
```

### Il risultato

Con i tre pattern combinati, ogni servizio raggiunge zero mutanti sopravvissuti. Non perché i mutanti infrastrutturali vengono uccisi dai test — vengono esclusi a priori. I mutanti rimanenti sono tutti sulla logica di business, e i test li uccidono tutti.

La distinzione è importante: un mutation score del 100% ottenuto filtrando metà dei mutanti non è la stessa cosa di un 100% su tutti i mutanti. Ma è un numero più utile. Dice: "ogni mutazione alla logica di business viene rilevata dai test". I mutanti su `print()` e su `Content-Type` non aggiungono informazione — aggiungono rumore.
