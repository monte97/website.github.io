---
title: "Testable Flask microservices: application factory, DI, and zero sys.modules hacks"
date: 2026-02-24T13:00:00.000Z
description: "Three Flask services with module-level Kafka and MongoDB connections, refactored to application factory with dependency injection. From 228 lines of conftest to 148."
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
lang: en
reviewed: machine
series: unit-testing
seriesOrder: 30
---

Three Flask services in a telemetry system for heavy equipment. Each consumes data from Kafka, persists it to MongoDB, and exposes it via REST API. All three share the same architectural flaw: database and broker connections are created at import time, at the module level.

The result: 88 tests that work, but only thanks to 228 lines of conftest that inject fake modules into `sys.modules`, patch `threading.Thread`, and configure environment variables before the import. The code under test is a monolithic file per service. The conftest is its mirror image.

This article describes the refactoring of all three services to Flask's **application factory** pattern, with explicit dependency injection. The conftest files drop from 228 to 148 total lines. The `sys.modules` hacks disappear entirely.

---

## The anti-pattern: module-level connections

The most obvious case is the `usage` service. These lines execute at import time:

```python
# usage.py - executed at the top level
mongo_client = MongoClient(mongo_connection_string)       # line 39
db = mongo_client[DB_NAME]                                # line 40
data_collection = db[DATA_TABLE]                          # line 41
state_collection = db[STATE_TABLE]                        # line 42

schema_registry_client = SchemaRegistryClient({...})      # line 45
avro_serializer = AvroSerializer(schema_registry_client, ...) # line 62
kafka_producer = SerializingProducer(producer_conf)        # line 69
```

Four external connections created by the `import`. The `current` service adds a Kafka consumer thread that starts at line 62. Python modules are imperative: lines execute in the order they appear.

To test this code, the conftest must prepare a complete fake environment **before** the import:

```python
# usage conftest.py - 94 lines of pre-import setup
sys.modules.setdefault("confluent_kafka", _fake_confluent_kafka)
sys.modules.setdefault("confluent_kafka.schema_registry", _fake_schema_registry)
sys.modules.setdefault("confluent_kafka.schema_registry.avro", _fake_avro)
sys.modules.setdefault("pymongo", MagicMock(MongoClient=_mock_mongo_client))

os.environ.setdefault("MONGO_IP", "localhost")
os.environ.setdefault("KAFKA_IP", "localhost")
# ... 8 more variables ...

from usage import app
```

The module is a 469-line file. The conftest to make it importable requires 94 of its own lines. Every new connection added to the module requires a corresponding line in the conftest. The two files evolve in sync, but the conftest has no tests of its own: if a mock is configured incorrectly, the tests pass anyway.

The specific problems with mocking C-backed libraries like `confluent_kafka` are covered in [Your Flask service is untestable](/blog/verificare/testing/02-mock-traps-python-flask/).

---

## The pattern: application factory

The [application factory](https://flask.palletsprojects.com/en/2.3.x/patterns/appfactories/) is Flask's standard pattern for separating definition from instantiation. The core idea: importing a module must have no side effects. Connections are created only when a function explicitly requests them. The service exposes a `create_app(config=None)` function that:

1. Receives configuration as a dictionary (or reads it from the environment)
2. Creates connections and attaches them to the Flask app object
3. Registers routes
4. Does not start threads — that stays in the `__main__` block

```python
# app.py - no side effects at import
from config import load_config

def create_app(config=None):
    app = Flask("c40 usage api")
    CORS(app)

    cfg = config if config is not None else load_config()
    app.service_config = cfg

    # DI: accepts a mock client from config, or creates the real one
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

The production entrypoint stays in a separate file:

```python
# main.py - the only place with side effects
if __name__ == "__main__":
    app = create_app()
    startup(app)
    consumer_thread = threading.Thread(target=consume_data, args=(app,))
    consumer_thread.start()
    app.run(host="0.0.0.0", port=8092)
```

`import app` creates no connections. `import business` doesn't import Flask. The conftest becomes:

```python
# conftest.py - no sys.modules hacks
from app import create_app

@pytest.fixture
def app():
    app = create_app({
        "mongo_client": MagicMock(),
        "kafka_producer": MagicMock(),
        # ... test config ...
    })
    yield app
```

---

## Three real transformations

### current: the simple case

The `current` service maintains real-time equipment state in an in-memory dictionary. The main problem: a Kafka consumer thread starts at import time (lines 61–62 of the original).

**Before:** one file (`current.py`, 92 lines), 63-line conftest with `sys.modules` injection and `patch("threading.Thread")`.

**After:** four files:

```
config.py      # load_config() -> dict
app.py         # create_app(), 3 routes
consumer.py    # consume_data(app)
main.py        # entrypoint
```

The conftest drops to 30 lines. No `sys.modules`, no `patch("threading.Thread")`. The consumer is never imported in tests: `app.py` doesn't reference it. All 16 existing tests pass without changes.

### history: MongoDB + archive proxy

The `history` service exposes position history from MongoDB with optional merge from an archive service. The problem: `MongoClient(...)` created at line 37 of the original.

**Before:** one file (`historyAPI.py`, 220 lines), 71-line conftest with `patch.dict(os.environ)` and `patch("pymongo.MongoClient")`.

**After:** four files with the same structure. The conftest drops to 52 lines. MongoDB dependency injection happens via the `"mongo_client"` key in the config dictionary:

```python
# history conftest.py
mock_mongo_client = MagicMock()
mock_mongo_client.__getitem__ = MagicMock(return_value=mock_db)

app = create_app({
    "mongo_client": mock_mongo_client,
    "archive_service_url": "http://fake-archive:8080",
    # ...
})
```

The `requests.get` call for the archive service is patched with `patch("app.http_requests.get")` thanks to the `import requests as http_requests` alias in `app.py`. All 26 tests pass without changes.

### usage: the complex case

The `usage` service is the most complex: it calculates hour/km deltas between consecutive events, persists to MongoDB, and publishes to Kafka. The original has 469 lines with `MongoClient`, `SchemaRegistryClient`, `AvroSerializer`, `SerializingProducer`, and in-memory state — all at the top level.

**Before:** one file (`usage.py`, 469 lines), 94-line conftest with `sys.modules` injection for `confluent_kafka` and `pymongo`.

**After:** six files:

```
config.py      # load_config() -> dict
business.py    # pure functions (zero external dependencies)
producer.py    # create_producer(cfg), emit_on_kafka(producer, topic, data)
app.py         # create_app(), handle_message(), upsert_costs(), routes
consumer.py    # consume_data(app)
main.py        # entrypoint
```

The conftest drops to 66 lines. But the substantial difference isn't in line count — it's in `business.py`.

This module contains `compute_delta`, `should_compute_delta`, `get_cost_sources`, `timestamp_to_date`, `extract_poi_list`. The only import is `datetime` from the standard library. No Flask, no Kafka, no MongoDB. Functions that previously read from global state (`should_compute_delta`, `get_cost_sources`) now receive `last_processed_data` as a parameter.

The result: business logic is testable with a direct import, no fixtures required:

```python
# test_business.py - zero mocks, zero fixtures
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

The 46 existing tests require changes to imports (`from usage import` becomes `from business import` and `from app import`) and to signatures of functions that now receive `app` or `last_processed_data` as a parameter. The refactoring cost on tests is proportional to the number of functions that change signature. For `usage`, 5 functions change signature and 3 test files need updates. Flask routes (`/health`, `/search`, `/debug/lastdata`) remain unchanged in tests because the fixture interface (`client`, `mock_db`, `mock_producer`) doesn't change.

---

## Testing: conftest before and after

The clearest comparison is on the `current` service.

**Before (63 lines):**

```python
# 1. Inject fake modules into sys.modules
sys.modules.setdefault("confluent_kafka", _fake_confluent_kafka)
sys.modules.setdefault("confluent_kafka.schema_registry", _fake_schema_registry)
sys.modules.setdefault("confluent_kafka.schema_registry.avro", _fake_avro)

# 2. Configure env vars
os.environ.setdefault("KAFKA_IP", "localhost")
# ... other variables ...

# 3. Patch threading to prevent the consumer from starting
with patch("threading.Thread") as _mock_thread:
    _mock_thread.return_value.start = MagicMock()
    from current import app
```

**After (30 lines):**

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

The three phases of the original conftest (`sys.modules`, env vars, thread patch) disappear. The import has no side effects, so there's no need to prepare a fake environment for it. Configuration is a dictionary, not global environment variables.

The `business.py` pattern enables a second level of simplification. Pure functions don't even need the conftest: they're imported directly in the test. The 10 tests on `compute_delta` in `test_usage_functions.py` use no fixtures at all.

---

## Mutation testing: the numbers

Mutation scores before the refactoring tell a clear story:

| Service | Tests | Mutants | Killed | Score |
|---------|-------|---------|--------|-------|
| current | 16 | 63 | 12 | 19% |
| history | 26 | 183 | 75 | 41% |
| usage | 46 | 325 | 150 | 46% |

The 19% on `current` means 81% of code mutations go undetected. The reason is structural: the Kafka consumer logic lives in a function the conftest must patch to prevent it from starting. The tests cover Flask routes, not the consumer.

With the extraction of `business.py`, pure functions (`compute_delta`, `should_compute_delta`, `get_cost_sources`) become reachable by mutation testing without going through mocks. The consumer code stays in the `consumer.py` module, separate from business logic. Mutants in pure functions are now killable with direct tests.

The numbers after refactoring haven't been measured yet. The expected direction: significant improvement on `usage` (where `business.py` contains most of the logic), moderate improvement on `history` and `current`.

---

## When this pattern isn't needed

The application factory adds structural complexity: more files, more imports, a factory function to maintain. In some contexts the cost isn't justified:

* **One-shot scripts** — A file that executes a task and exits doesn't need modular testability
* **CLI tools** — If the entry point is `argparse` or `click`, the Flask factory doesn't apply
* **Prototypes** — A service that lives less than a week doesn't justify the investment

The pattern makes sense when the service stays in production and needs tests. Three services with module-level connections can run for months without problems. The cost surfaces when you write the tests: the conftest becomes the implicit contract between the code and its environment, and that contract breaks silently.

---

## Summary

This article covered:

1. **The anti-pattern**: Kafka and MongoDB connections at the Python module top level, with conftest files compensating via `sys.modules` injection
2. **The pattern**: application factory with `create_app(config)`, dependency injection via dictionary, threads only in `__main__`
3. **Three transformations**: current (92 → 4 files), history (220 → 4 files), usage (469 → 6 files, with a zero-dependency `business.py`)
4. **Conftest**: from 228 total lines with hacks to 148 lines with `create_app(test_config)`
5. **Mutation testing**: low scores (19–46%) caused by business logic unreachable by tests; extracting pure modules makes mutants reachable

## Resources

* **Flask Application Factory** — [flask.palletsprojects.com/en/2.3.x/patterns/appfactories/](https://flask.palletsprojects.com/en/2.3.x/patterns/appfactories/)
* **Testing Flask Applications** — [flask.palletsprojects.com/en/2.3.x/testing/](https://flask.palletsprojects.com/en/2.3.x/testing/)
