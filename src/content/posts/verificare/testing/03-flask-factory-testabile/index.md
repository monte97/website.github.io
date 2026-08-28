---
title: "Microservizi Flask testabili: application factory, DI e zero sys.modules hack"
seoTitle: "Flask testabile: application factory e DI"
date: 2026-02-24T13:00:00.000Z
description: Tre servizi Flask con connessioni Kafka e MongoDB al top-level, refactoring a application factory con dependency injection. Da 228 righe di conftest a 148.
pillar: verificare
category: testing
tags:
  - Python
  - Testing
  - Pytest
  - Flask
  - Kafka
  - MongoDB
  - Refactoring
lang: it
reviewed: false
draft: false
series: unit-testing
seriesOrder: 30
summary:
  - label: "Problema"
    value: "Import con side-effect e conftest speculare: 228 righe per 88 test"
    note: "Ogni connessione aggiunta al modulo richiede una riga corrispondente nel conftest"
  - label: "Scelta"
    value: "Application factory con dependency injection esplicita"
    note: "`create_app(config)` attacca i client all'app, i thread restano in `__main__`"
  - label: "Risultato"
    value: "Conftest da 228 a 148 righe, hack su `sys.modules` eliminati"
    note: "`business.py` a zero dipendenze rende le funzioni pure testabili senza fixture"
  - label: "Costo reale"
    value: "Su usage, 5 funzioni cambiano firma e 3 file di test vanno aggiornati"
openItems:
  - "I mutation score dopo il refactoring non sono ancora stati misurati: il miglioramento atteso resta una previsione"
  - "La factory non serve per script one-shot, CLI tool e prototipi che vivono meno di una settimana"
  - "Il pattern ha senso quando il servizio resta in produzione e ha bisogno di test"
openNote: "Cosa resta da verificare e dove il pattern non conviene."
mode: explanation
---

Tre servizi Flask in un sistema di telemetria per mezzi d'opera. Ognuno consuma dati da Kafka, li persiste su MongoDB, e li espone tramite API REST. Tutti e tre condividono lo stesso difetto architetturale: le connessioni a database e broker vengono create al momento dell'import, a livello di modulo.

Il risultato: 88 test che funzionano, ma solo grazie a 228 righe di conftest che iniettano moduli fake in `sys.modules`, patchano `threading.Thread`, e configurano variabili d'ambiente prima dell'import. Il codice sotto test è un file monolitico per servizio. Il conftest è la sua immagine speculare.

Questo articolo descrive il refactoring dei tre servizi al pattern **application factory** di Flask, con dependency injection esplicita. I conftest passano da 228 a 148 righe totali. Gli hack su `sys.modules` scompaiono completamente.

---

## L'anti-pattern: connessioni a livello di modulo

Il caso più evidente è il servizio `usage`. Queste righe vengono eseguite al momento dell'import:

```python
# usage.py - eseguito al top level
mongo_client = MongoClient(mongo_connection_string)       # riga 39
db = mongo_client[DB_NAME]                                # riga 40
data_collection = db[DATA_TABLE]                          # riga 41
state_collection = db[STATE_TABLE]                        # riga 42

schema_registry_client = SchemaRegistryClient({...})      # riga 45
avro_serializer = AvroSerializer(schema_registry_client, ...) # riga 62
kafka_producer = SerializingProducer(producer_conf)        # riga 69
```

Quattro connessioni esterne create dall'`import`. Il servizio `current` aggiunge un thread Kafka consumer che parte alla riga 62. Il modulo Python è imperativo: le righe vengono eseguite nell'ordine in cui appaiono.

Per testare questo codice, il conftest deve preparare un ambiente fake completo **prima** dell'import:

```python
# conftest.py di usage - 94 righe di setup pre-import
sys.modules.setdefault("confluent_kafka", _fake_confluent_kafka)
sys.modules.setdefault("confluent_kafka.schema_registry", _fake_schema_registry)
sys.modules.setdefault("confluent_kafka.schema_registry.avro", _fake_avro)
sys.modules.setdefault("pymongo", MagicMock(MongoClient=_mock_mongo_client))

os.environ.setdefault("MONGO_IP", "localhost")
os.environ.setdefault("KAFKA_IP", "localhost")
# ... altre 8 variabili ...

from usage import app
```

Il modulo è un file da 469 righe. Il conftest per renderlo importabile ne richiede 94. Ogni nuova connessione aggiunta al modulo richiede una riga corrispondente nel conftest. I due file evolvono in sincrono, ma il conftest non ha test propri: se un mock è configurato in modo errato, i test passano lo stesso.

I problemi specifici del mocking con librerie C-backed come `confluent_kafka` sono descritti in [Il tuo servizio Flask è impossibile da testare](/blog/verificare/testing/02-mock-traps-python-flask/).

---

## Il pattern: application factory

L'[application factory](https://flask.palletsprojects.com/en/2.3.x/patterns/appfactories/) è il pattern standard di Flask per la separazione tra definizione e istanziazione dell'app. L'idea di fondo: l'import di un modulo non deve avere side-effect. Le connessioni vengono create solo quando una funzione le chiede esplicitamente. Il servizio espone una funzione `create_app(config=None)` che:

1. Riceve la configurazione come dizionario (o la legge dall'ambiente)
2. Crea le connessioni e le attacca all'oggetto app Flask
3. Registra le route
4. Non avvia thread - quello resta nel blocco `__main__`

```python
# app.py - nessun side-effect all'import
from config import load_config

def create_app(config=None):
    app = Flask("c40 usage api")
    CORS(app)

    cfg = config if config is not None else load_config()
    app.service_config = cfg

    # DI: accetta client mock dal config, o crea quello reale
    if "mongo_client" in cfg:
        app.mongo_client = cfg["mongo_client"]
    else:
        app.mongo_client = MongoClient(cfg["mongo_uri"])

    app.db = app.mongo_client[cfg["db_name"]]
    app.data_collection = app.db[cfg["data_table"]]

    if "kafka_producer" in cfg:
        app.kafka_producer = cfg["kafka_producer"]
    else:
        app.kafka_producer = create_producer(cfg)

    app.last_processed_data = {}
    _register_routes(app)
    return app
```

L'entrypoint di produzione resta un file separato:

```python
# main.py - unico punto con side-effect
if __name__ == "__main__":
    app = create_app()
    startup(app)
    consumer_thread = threading.Thread(target=consume_data, args=(app,))
    consumer_thread.start()
    app.run(host="0.0.0.0", port=8092)
```

L'`import app` non crea connessioni. L'`import business` non importa Flask. Il conftest diventa:

```python
# conftest.py - nessun sys.modules hack
from app import create_app

@pytest.fixture
def app():
    app = create_app({
        "mongo_client": MagicMock(),
        "kafka_producer": MagicMock(),
        # ... config di test ...
    })
    yield app
```

---

## Tre trasformazioni reali

### current: il caso semplice

Il servizio `current` mantiene lo stato real-time delle attrezzature in un dizionario in-memory. Il problema principale: un thread Kafka consumer parte all'import (riga 61-62 dell'originale).

**Prima:** un file (`current.py`, 92 righe), conftest da 63 righe con `sys.modules` injection e `patch("threading.Thread")`.

**Dopo:** quattro file:

```
config.py      # load_config() -> dict
app.py         # create_app(), 3 route
consumer.py    # consume_data(app)
main.py        # entrypoint
```

Il conftest scende a 30 righe. Nessun `sys.modules`, nessun `patch("threading.Thread")`. Il consumer non viene mai importato nei test: `app.py` non lo referenzia. I 16 test esistenti passano senza modifiche.

### history: MongoDB + archive proxy

Il servizio `history` espone lo storico posizioni da MongoDB con merge opzionale da un servizio di archivio. Il problema: `MongoClient(...)` creato alla riga 37 dell'originale.

**Prima:** un file (`historyAPI.py`, 220 righe), conftest da 71 righe con `patch.dict(os.environ)` e `patch("pymongo.MongoClient")`.

**Dopo:** quattro file con la stessa struttura. Il conftest scende a 52 righe. La dependency injection del `MongoClient` avviene tramite la chiave `"mongo_client"` nel config dict:

```python
# conftest.py di history
mock_mongo_client = MagicMock()
mock_mongo_client.__getitem__ = MagicMock(return_value=mock_db)

app = create_app({
    "mongo_client": mock_mongo_client,
    "archive_service_url": "http://fake-archive:8080",
    # ...
})
```

Il `requests.get` per l'archive service si patcha con `patch("app.http_requests.get")` grazie all'alias `import requests as http_requests` nel modulo `app.py`. I 26 test passano senza modifiche.

### usage: il caso complesso

Il servizio `usage` è il più complesso: calcola delta ore/km tra eventi consecutivi, persiste su MongoDB, e pubblica su Kafka. L'originale ha 469 righe con MongoClient, SchemaRegistryClient, AvroSerializer, SerializingProducer, e stato in-memory, tutto al top level.

**Prima:** un file (`usage.py`, 469 righe), conftest da 94 righe con `sys.modules` injection per `confluent_kafka` e `pymongo`.

**Dopo:** sei file:

```
config.py      # load_config() -> dict
business.py    # funzioni pure (zero dipendenze esterne)
producer.py    # create_producer(cfg), emit_on_kafka(producer, topic, data)
app.py         # create_app(), handle_message(), upsert_costs(), route
consumer.py    # consume_data(app)
main.py        # entrypoint
```

Il conftest scende a 66 righe. Ma la differenza sostanziale non è nelle righe: è in `business.py`.

Questo modulo contiene `compute_delta`, `should_compute_delta`, `get_cost_sources`, `timestamp_to_date`, `extract_poi_list`. L'unico import è `datetime` dalla libreria standard. Nessun Flask, nessun Kafka, nessun MongoDB. Le funzioni che prima leggevano lo stato globale (`should_compute_delta`, `get_cost_sources`) ora ricevono `last_processed_data` come parametro.

Il risultato: la logica di business è testabile con import diretto, senza fixture:

```python
# test_business.py - zero mock, zero fixture
from business import compute_delta

def test_compute_delta_normal():
    ref = {"identifier": "EX001", "timestamp": 1000,
           "c40": {"odometry": {"hours_tot": 100.0, "km_tot": 5000.0}}}
    upd = {"identifier": "EX001", "timestamp": 2000,
           "c40": {"odometry": {"hours_tot": 101.5, "km_tot": 5010.0}}}
    dt, dh, dk = compute_delta(ref, upd)
    assert dt == 1000
    assert dh == 1.5
    assert dk == 10.0
```

I 46 test esistenti richiedono modifiche agli import (`from usage import` diventa `from business import` e `from app import`) e alle signature delle funzioni che ora ricevono `app` o `last_processed_data` come parametro. Il costo del refactoring sui test è proporzionale al numero di funzioni che cambiano firma. Nel caso di `usage`, 5 funzioni cambiano signature e 3 file di test richiedono aggiornamenti. Le route Flask (`/health`, `/search`, `/debug/lastdata`) restano invariate nei test perché l'interfaccia delle fixture (`client`, `mock_db`, `mock_producer`) non cambia.

---

## Testing: conftest prima e dopo

Il confronto più chiaro è sul servizio `current`.

**Prima (63 righe):**

```python
# 1. Iniettare moduli fake in sys.modules
sys.modules.setdefault("confluent_kafka", _fake_confluent_kafka)
sys.modules.setdefault("confluent_kafka.schema_registry", _fake_schema_registry)
sys.modules.setdefault("confluent_kafka.schema_registry.avro", _fake_avro)

# 2. Configurare env vars
os.environ.setdefault("KAFKA_IP", "localhost")
# ... altre variabili ...

# 3. Patchare threading per impedire il consumer
with patch("threading.Thread") as _mock_thread:
    _mock_thread.return_value.start = MagicMock()
    from current import app
```

**Dopo (30 righe):**

```python
from app import create_app

TEST_CONFIG = {
    "kafka_ip": "localhost",
    "kafka_port": "9092",
    "topic": "test-topic",
    "schema_registry_url": "http://localhost:8081/apis/ccompat/v7",
}

@pytest.fixture
def app():
    app = create_app(TEST_CONFIG)
    app.config["TESTING"] = True
    yield app
```

Le tre fasi del conftest originale (sys.modules, env vars, thread patch) scompaiono. L'import non ha side-effect, quindi non serve preparargli un ambiente fake. La configurazione è un dizionario, non variabili d'ambiente globali.

Il pattern `business.py` rende possibile un secondo livello di semplificazione. Le funzioni pure non hanno bisogno nemmeno del conftest: si importano direttamente nel test. I 10 test su `compute_delta` in `test_usage_functions.py` non usano alcuna fixture.

---

## Mutation testing: i numeri

I mutation score prima del refactoring raccontano una storia chiara:

| Servizio | Test | Mutanti | Killed | Score |
|----------|------|---------|--------|-------|
| current  | 16   | 63      | 12     | 19%   |
| history  | 26   | 183     | 75     | 41%   |
| usage    | 46   | 325     | 150    | 46%   |

Il 19% su `current` significa che l'81% delle mutazioni al codice non viene rilevato dai test. Il motivo è strutturale: la logica del consumer Kafka vive in una funzione che il conftest deve patchare per impedirle di partire. I test coprono le route Flask, non il consumer.

Con l'estrazione di `business.py`, le funzioni pure (`compute_delta`, `should_compute_delta`, `get_cost_sources`) diventano raggiungibili dal mutation testing senza passare attraverso mock. Il codice del consumer resta nel modulo `consumer.py`, separato dalla logica di business. I mutanti nelle funzioni pure sono ora uccidibili con test diretti.

I numeri dopo il refactoring non sono ancora stati misurati. La direzione attesa: miglioramento significativo su `usage` (dove `business.py` contiene la maggior parte della logica), moderato su `history` e `current`.

---

## Quando NON serve

L'application factory aggiunge complessità strutturale: più file, più import, una funzione factory da mantenere. In alcuni contesti il costo non è giustificato:

* **Script one-shot** - Un file che esegue un task e termina non ha bisogno di testabilità modulare
* **CLI tool** - Se il punto di ingresso è `argparse` o `click`, la factory Flask non si applica
* **Prototipi** - Un servizio che vive meno di una settimana non giustifica l'investimento

Il pattern ha senso quando il servizio resta in produzione e ha bisogno di test. Tre servizi con connessioni al top level possono funzionare per mesi senza problemi. Il costo emerge quando si scrivono i test: il conftest diventa il contratto implicito tra il codice e il suo ambiente, e quel contratto si rompe silenziosamente.

---

## Riepilogo

L'articolo ha coperto:

1. **L'anti-pattern**: connessioni Kafka e MongoDB al top level del modulo Python, con i conftest che compensano tramite `sys.modules` injection
2. **Il pattern**: application factory con `create_app(config)`, dependency injection tramite dizionario, thread solo in `__main__`
3. **Tre trasformazioni**: current (92 -> 4 file), history (220 -> 4 file), usage (469 -> 6 file, con `business.py` a zero dipendenze)
4. **Conftest**: da 228 righe totali con hack a 148 righe con `create_app(test_config)`
5. **Mutation testing**: score basso (19-46%) dovuto alla logica di business inaccessibile ai test; l'estrazione in moduli puri rende i mutanti raggiungibili

## Risorse

* **Flask Application Factory** - [flask.palletsprojects.com/en/2.3.x/patterns/appfactories/](https://flask.palletsprojects.com/en/2.3.x/patterns/appfactories/)
* **Testing Flask Applications** - [flask.palletsprojects.com/en/2.3.x/testing/](https://flask.palletsprojects.com/en/2.3.x/testing/)
