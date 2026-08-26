---
title: "Your Flask service is untestable (and mocks aren't the problem)"
seoTitle: "Flask and mocks: four testing traps"
date: 2026-02-24T11:00:00.000Z
description: "88 tests, three Flask services, mutation score at 19%. The problem isn't the mocking: it's code that opens Kafka and MongoDB connections at import time."
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
lang: en
reviewed: machine
series: unit-testing
seriesOrder: 20
---

Three Flask services, three conftest.py files, one smoke test each: `GET /health` returned 200, all green, CI happy. Then I wrote the second test and everything collapsed.

But this isn't a story about mocks. It's a story about **design**.

All three services were creating Kafka and MongoDB connections **at import time** — at the module level, outside any function. No lazy loading, no factories, no dependency injection. The `import` itself was a side effect. That's why the mocks were broken: they weren't patching the wrong thing out of carelessness. They were fighting an architecture that makes testing structurally fragile.

The end result: **88 new tests**, mutation score climbing from **19% to 46%** across the three services. The numbers tell a clear story: you can cover every endpoint, but if the business logic lives inside the Kafka consumer (which starts at import time), your tests will never touch it.

These are the four traps I encountered bringing those services from 3 to 91 tests. Each trap is a symptom of the same underlying problem.

---

## The anti-pattern: module-level connections

Before the traps, some context. Here's what happens when you do `from current import app`:

```python
# current.py — executed at the top level
from confluent_kafka import DeserializingConsumer
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroDeserializer

# ... configuration ...

consumer_thread = threading.Thread(target=consume_data)  # line 61
consumer_thread.start()                                   # line 62
```

Two lines. A thread starts, a Kafka consumer hunts for a broker. And for the `usage` service, the situation was four times worse:

```python
# usage.py — all executed at the top level
mongo_client = MongoClient(mongo_connection_string)     # line 39
schema_registry_client = SchemaRegistryClient({...})    # line 45
avro_serializer = AvroSerializer(schema_registry_client) # line 62
kafka_producer = SerializingProducer(producer_conf)      # line 69
```

Four external connections created at import. Python modules are imperative: lines execute in the order they appear. There's no `if __name__ == '__main__'` to protect you. The `import` **is** the execution.

This turns testing into a damage control exercise: you must set up a complete fake environment **before** the import, or the module crashes looking for brokers and databases that don't exist.

**If you were designing these services from scratch**, you'd use factory functions, lazy initialization, or dependency injection. But these services exist, they're in production, and you're not rewriting them to add tests. You mock them. And that's where the problems begin.

---

## Trap 1: The phantom conftest

**16 tests written. All passing. All useless.**

Starting point: three services, three `conftest.py` files, all following the same pattern:

```python
# conftest.py - BROKEN (but tests passed!)
from unittest.mock import patch, MagicMock

with patch("kafka.KafkaConsumer", return_value=MagicMock()):
    with patch("threading.Thread") as _mock_thread:
        _mock_thread.return_value.start = MagicMock()
        from current import app
```

The problem: `current.py` hasn't imported `kafka.KafkaConsumer` for months. It uses `confluent_kafka.DeserializingConsumer`. The code had been migrated from `kafka-python` to `confluent-kafka`, but nobody had updated the conftest files. `patch("kafka.KafkaConsumer")` didn't raise an error because `kafka` was still installed as a transitive dependency.

In a service with top-level side effects, a conftest that patches the wrong library doesn't fail — it simply patches nothing. And if the only test is `GET /health` (which never touches Kafka), you never notice.

**Why this is a design problem, not a mocking problem**: with dependency injection, you wouldn't need to guess which `patch()` target corresponds to which import. You'd inject the fake collaborator directly.

---

## Trap 2: `patch()` doesn't work with C-backed submodules

First fix attempt. Updated the mocks to the correct library:

```python
# Attempt 1 - DOES NOT WORK
with patch("confluent_kafka.DeserializingConsumer"):
    with patch("confluent_kafka.schema_registry.SchemaRegistryClient"):
        with patch("confluent_kafka.schema_registry.avro.AvroDeserializer"):
            from current import app
```

Error:

```
AttributeError: module 'confluent_kafka' has no attribute 'schema_registry'
```

`unittest.mock.patch()` resolves the path by navigating attributes: it imports `confluent_kafka`, then looks for `.schema_registry`, then `.SchemaRegistryClient`. But `confluent_kafka.schema_registry` is a C-backed submodule that requires compiled `librdkafka`. In the test container (or CI venv), the submodule doesn't load, and `patch` fails.

The solution: inject fake modules directly into `sys.modules` **before** any import can look for them:

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

from current import app  # Python finds the fake modules in sys.modules
```

`setdefault` avoids overwriting a module that's already loaded. This pattern works with any C-backed library: `grpc`, `librdkafka`, `psycopg2`, `confluent_kafka`.

**Why this is a design problem, not a mocking problem**: you're manually constructing a fake module hierarchy because the code does `from confluent_kafka.schema_registry.avro import AvroDeserializer` at the top level. With a factory architecture, deserializer creation would be isolated in a function, and you could patch it with a single `patch` at the point of use.

---

## Trap 3: Import order is your contract

The complete pattern for making a conftest work with these services requires three steps in a precise order:

```python
import sys
import os
from unittest.mock import MagicMock, patch

# 1. sys.modules BEFORE everything else
sys.modules.setdefault("confluent_kafka", MagicMock())
sys.modules.setdefault("confluent_kafka.schema_registry", MagicMock())
sys.modules.setdefault("confluent_kafka.schema_registry.avro", MagicMock())

# 2. Env vars (read at the top level by the module)
os.environ.setdefault("KAFKA_IP", "localhost")
os.environ.setdefault("KAFKA_PORT", "9092")
os.environ.setdefault("CURRENT_TOPIC", "test-topic")

# 3. Patch threading to prevent the consumer thread from starting
with patch("threading.Thread") as _mock_thread:
    _mock_thread.return_value.start = MagicMock()
    from current import app  # Now it's safe
```

The order is an undocumented contract: `sys.modules` → env vars → patch threading → import. Reverse any single step and the module crashes. And this contract is fragile: if someone adds a new top-level `import` to `current.py`, the conftest breaks silently.

**The real cost**: when a module has import-time side effects, your conftest becomes a mirror image of the code under test. Every connection, every environment variable, every thread must be replicated in the conftest. You're writing the module twice.

---

## Trap 4: Mock contamination between tests

**18 tests green out of 26 for the `history` service. The 8 in the last group all failing with the same error.**

```
AttributeError: 'builtin_function_or_method' object has no attribute 'return_value'
```

The problem: different tests were configuring the same MongoDB mock in incompatible ways. The `/equip/<id>` endpoint does `.find(query).sort("timestamp", 1)`:

```python
# Test for /equip/<id>
mock_collection.find.return_value.sort.return_value = [doc1, doc2]
```

The `/locations/today/equipment` endpoint does `list(collection.find(query, projection))`:

```python
# Test for /locations/today
mock_collection.find.return_value = [{"base": {"code": "EX001"}}]
```

When the second pattern executes, `find.return_value` becomes a **real Python list**. `.sort` is no longer a `MagicMock` method — it's `list.sort()`, a built-in that has no `return_value`.

The killer: `reset_mock()` **does not fix this**. `reset_mock()` resets counters and child mocks, but `find.return_value` was replaced with a real object. The reset doesn't restore it.

The solution: replace the attribute entirely with a fresh `MagicMock` before each test:

```python
@pytest.fixture
def mock_collection():
    """Full reset of collection.find before each test."""
    collection.find = MagicMock()  # Fresh mock
    yield collection
    collection.find = MagicMock()  # Cleanup
```

**Why this is a design problem, not a mocking problem**: the MongoDB collection is a module-level singleton shared across all tests. With dependency injection, each test would receive its own instance. There would be no contamination because there would be no shared state.

---

## The numbers: what mutation testing reveals

After resolving all four traps, I had 88 passing tests covering every endpoint. But the mutation testing numbers tell a different story.

| Service | Tests | Mutants | Killed | Score |
|---------|-------|---------|--------|-------|
| current | 16 | 63 | 12 | 19% |
| history | 26 | 183 | 75 | 41% |
| usage | 46 | 325 | 150 | 46% |

A 19% mutation score on `current` means 81% of code mutations go undetected. `history` and `usage` do better (41–46%) because they have more logic in Flask routes and testable pure functions (`compute_delta`, `timestamp_to_date`). But mutants in the imperative Kafka consumer procedures survive almost entirely.

The reason is structural: the business logic lives in functions called by the Kafka consumer thread (`consume_data`, `handle_message`, `compute_delta`). That thread was patched in the conftest to prevent it from starting. The tests cover Flask routes — `GET /health`, `GET /equipment`, `GET /search` — which are essentially thin wrappers around an in-memory dictionary or a MongoDB query.

Tests on pure functions (`compute_delta`, `timestamp_to_date`, `should_compute_delta`) work well and kill mutants. But most of the code isn't in pure functions — it's in imperative procedures that read from Kafka, write to MongoDB, and update global state. That code is structurally unreachable by tests without module refactoring.

**Mutation testing confirms the thesis**: the problem isn't in the mocking, it's in the design. You can have 88 green tests and a mutation score between 19% and 46%. The tests tell you that endpoints respond. The mutants tell you that half the business logic is uncovered — and for the simplest service (`current`), four-fifths of it.

---

## Recap: the real problem and pragmatic workarounds

The four traps are symptoms. The cause is code with import-time side effects: database connections, Kafka consumers, threads that start. In an ideal world, you'd refactor:

1. **Factory functions** instead of top-level connections
2. **Dependency injection** instead of module-level singletons
3. **Lazy initialization** with `if __name__ == '__main__'` for threads

But if you have production services and need to add tests *now*, these are the workarounds that work:

1. **Verify your mocks match the actual imports.** Open the module, read the imports, compare with your `patch()` targets. If the code uses `confluent_kafka` and the conftest patches `kafka`, you have a ghost.

2. **Use `sys.modules` injection for C-backed submodules.** `patch()` can't navigate submodules that require native compilation. Inject `MagicMock` directly into `sys.modules` before the import.

3. **Respect the order: sys.modules → env vars → patch threading → import.** The order is an implicit contract. Document it in the conftest.

4. **Reassign mocks, don't just call `reset_mock()`.** If you set `find.return_value = [list]`, the mock is gone. Create a new `MagicMock()` before each test.

And when you're done, run mutation testing. The numbers will tell you exactly how much of your code is actually under test — and it'll probably be much less than you think.

---

## The refactoring: extract, inject, filter

Workarounds work, but they remain workarounds. On the five subsequent Python services I applied the three structural fixes: factory functions, dependency injection, lazy initialization. The result is a testable structure without any of the four traps.

### Extract business logic from the consumer loop

The key pattern is pulling business logic out of the Kafka loop into a pure function. Before:

```python
# consumer.py — logic embedded in the blocking loop
def consume_data(config, collection):
    consumer = KafkaConsumer(config["topic"], ...)
    for message in consumer:
        data = loads(message.value.decode("utf-8"))
        # 30 lines of inline logic: validation, transformation, insert...
        required_keys = ("identifier", "timestamp", "base", "c40")
        if not all(k in data for k in required_keys):
            continue
        # ... more logic ...
        collection.insert_one(entry)
```

After:

```python
# consumer.py — logic extracted
def process_message(data, collection):
    """Testable without Kafka."""
    from pymongo import errors
    from datetime import datetime

    required_keys = ("identifier", "timestamp", "base", "c40")
    if not all(k in data for k in required_keys):
        return 0

    # ... business logic ...
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

The Kafka loop becomes a three-line wrapper. `process_message` takes a dictionary and a collection, returns a count. Testable with a `MagicMock()` in place of the collection, without `sys.modules`, without `patch()`, without import order concerns.

For Flask services, the application factory with dependency injection eliminates module-level singletons:

```python
# conftest.py — mock is a two-line fixture
@pytest.fixture
def mock_collection(app):
    app.collection.reset_mock()
    yield app.collection
```

No `sys.modules` injection, no import order, no `patch()` on C-backed paths. The collection is an app attribute, injected at creation time.

### Numbers after refactoring

| Service | Tests | Survivors |
|---------|:-----:|:---------:|
| equip-assignment-api | 15 | 0 |
| equip-assignment-c40-read | 12 | 0 |
| equip-assignment-report-read | 12 | 0 |
| report-save (business + endpoint) | 22 | 0 |
| registry-equip-syncher | 9 | 0 |
| **Total** | **70** | **0** |

Zero surviving mutants on business logic. But the "zero" has an asterisk: not all mutants generated by mutmut are relevant. Without filters, dozens survive on lines like `print("Consumer started")` or `os.makedirs(path, exist_ok=True)`. These are structural false positives: no test should assert on log text or on the safety flag of `makedirs`.

---

## Filtering the noise: mutmut_config.py

mutmut generates mutants on every line of Python code. This includes:

- `print("Consumer started")` → `print("XXConsumer startedXX")`
- `os.makedirs(path, exist_ok=True)` → `os.makedirs(path, exist_ok=False)`
- `sys.path.insert(0, ...)` → `sys.path.insert(1, ...)`
- `jsonify({"error": "Missing required fields"})` → `jsonify({"error": "XXMissing required fieldsXX"})`

None of these are business logic. Error strings, safety flags, import infrastructure, logging calls — they're noise that inflates the survivor count and hides real problems.

mutmut supports a `pre_mutation` hook in a `mutmut_config.py` file at the project root. The function receives a `context` with the current line and line number, and can set `context.skip = True` to skip the mutant.

### Pattern 1: filter by line content

The simplest case. Lines containing known infrastructure patterns:

```python
# mutmut_config.py — subservice-report-save
def pre_mutation(context):
    line = context.current_source_line.strip()

    # sys.path manipulation — import infrastructure
    if line.startswith("sys.path.insert("):
        context.skip = True
        return

    # exist_ok is a safety flag, not business logic
    if "exist_ok=" in line and "makedirs" in line:
        context.skip = True
        return
```

Same approach for `print()` calls in consumers:

```python
    if line.startswith("print("):
        context.skip = True
        return
```

### Pattern 2: filter by zone in the file

For Kafka consumers, the `consume_data` function is a blocking loop that can't be unit tested. mutmut generates mutants there too: `"latest"` → `"XXlatestXX"`, `1.0` → `2.0` in poll timeout, `"utf-8"` → `"XXutf-8XX"`. All survive, none are real problems.

The solution: dynamically find the line where `consume_data` starts and skip everything from there on:

```python
# mutmut_config.py — Kafka consumer
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

The line number is calculated once and cached. If someone adds code before `consume_data`, the boundary updates automatically.

The same pattern works in reverse for Flask apps: skip everything **before** `_register_routes` (the section with business logic), i.e., the `create_app()` body with Flask/CORS/MongoDB setup:

```python
# mutmut_config.py — Flask app with application factory
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

### Pattern 3: filter message strings

Tests verify status codes, not error message text. Mutating `"Missing required fields"` to `"XXMissing required fieldsXX"` always survives — correctly, because no test asserts (nor should it) on the exact error text.

```python
def _is_message_string(line):
    """True for lines containing only error/success text."""
    msg_markers = ('"error":', '"message":', '"success":')
    return "jsonify(" in line and any(m in line for m in msg_markers)

def pre_mutation(context):
    line = context.current_source_line.strip()

    if _is_message_string(line):
        context.skip = True
        return

    # Content-Type is a static constant
    if '"Content-Type"' in line or '"application/json"' in line:
        context.skip = True
        return
```

### The result

With all three patterns combined, each service reaches zero surviving mutants. Not because infrastructure mutants get killed by tests — they get excluded upfront. The remaining mutants are all on business logic, and the tests kill every one of them.

The distinction matters: a 100% mutation score achieved by filtering half the mutants isn't the same as 100% across all mutants. But it's a more useful number. It says: "every mutation to business logic is detected by the tests." Mutants on `print()` calls and `Content-Type` headers add no information — they add noise.
