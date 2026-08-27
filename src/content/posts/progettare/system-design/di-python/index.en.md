---
title: "Dependency Injection in Python: From Untestable Code to Clean Architecture"
date: 2026-02-26T08:00:00.000Z
description: DI in Python without a framework, using Protocol and constructor injection, and when to reach for dependency-injector. From theory to refactoring 3 real Flask services.
pillar: progettare
category: system-design
tags:
  - Python
  - DependencyInjection
  - Flask
  - Testing
  - Patterns
lang: en
reviewed: machine
---

I refactored 3 Flask services. Total conftest lines dropped from 228 to 148. The `sys.modules` hacks disappeared. The mutation score on business logic reached zero surviving mutants. But the lesson was not about Flask — it was about how Python manages dependencies.

This article captures what I learned: dependency injection in Python, without a framework, using `Protocol` and constructor injection. Then when `dependency-injector` makes sense, and when Flask's application factory becomes a natural DI container.

---

## The Problem in 30 Seconds

Python is an imperative language. The lines of a module execute in the order they appear, at import time. If you write this at the top level:

```python
# usage.py — executes at top level
mongo_client = MongoClient(mongo_connection_string)
schema_registry_client = SchemaRegistryClient({...})
kafka_producer = SerializingProducer(producer_conf)
```

...you are creating three external connections every time anyone imports the module. Even in tests. There is no `if __name__ == '__main__'` to protect you. The `import` **is** the execution.

The result: the conftest becomes the mirror image of the code. Every connection in the module requires a corresponding mock in the conftest. Every mock must be configured **before** the import, in the right order: first `sys.modules` with fake modules, then environment variables, then the threading patch, and only then the import of the module under test. Get the order wrong and the module crashes looking for missing brokers and databases. Mock the wrong library (as happened to me with `kafka-python` vs `confluent-kafka`) and the tests pass but test nothing.

In the three services I refactored, the total conftest was 228 lines — almost half the application code. The conftest had no tests of its own: if a mock was misconfigured, nobody noticed. The two files evolved in sync, but the contract was implicit and undocumented.

The details of these problems — the four `sys.modules` mocking traps, mocks on C-backed libraries, test contamination — are covered in [Your Flask service is untestable](/en/blog/verificare/testing/02-mock-traps-python-flask/). The complete refactoring of the three services is in [Testable Flask microservices](/en/blog/verificare/testing/03-flask-factory-testabile/). Here I focus on the underlying pattern: dependency injection.

---

## DI in Python: No Framework Needed

In many languages, dependency injection requires infrastructure: a container, a registration system, explicit interfaces. Python does not. Two things are needed: `Protocol` (from `typing`) and the class constructor.

`Protocol` defines a structural contract. No inheritance required: an object just needs to have the right methods. It is duck typing made explicit and verifiable.

```python
from typing import Protocol

class OrderRepository(Protocol):
    """Contract: any object with save() and find_by_id()."""
    def save(self, order: dict) -> str: ...
    def find_by_id(self, order_id: str) -> dict | None: ...

class OrderService:
    def __init__(self, repo: OrderRepository):
        self._repo = repo

    def place_order(self, items: list[str]) -> str:
        order = {"items": items, "status": "pending"}
        return self._repo.save(order)
```

`OrderService` knows nothing about the implementation. It does not import MongoDB, it does not import SQLAlchemy. It receives an object that satisfies the `OrderRepository` contract and uses it. The dependency is injected through the constructor — constructor injection.

Testing becomes trivial:

```python
class FakeRepo:
    """No inheritance needed. Just implement save() and find_by_id()."""
    def __init__(self):
        self.orders = {}

    def save(self, order):
        oid = str(len(self.orders))
        self.orders[oid] = order
        return oid

    def find_by_id(self, oid):
        return self.orders.get(oid)

def test_place_order():
    service = OrderService(FakeRepo())
    oid = service.place_order(["item1"])
    assert oid == "0"
```

`FakeRepo` does not declare that it implements `OrderRepository`. It does not need to. Python verifies structural compatibility: if it has `save()` and `find_by_id()` with the right signatures, it is an `OrderRepository`. This is the heart of Python's duck typing, made explicit and verifiable by the type checker.

The advantage over `MagicMock()`: the fake has deterministic behavior. `MagicMock` returns a new mock for any attribute — which means a typo like `service._repo.svae(order)` generates no error. A `FakeRepo` with real methods fails immediately if code calls a method that does not exist. Fewer surprises, more reliable tests.

No mocks, no patches, no `sys.modules`.

### The .NET Comparison

If you work with .NET, the pattern is familiar. The difference is in ceremony. In C# you would write:

```csharp
services.AddScoped<IOrderRepository, SqlOrderRepository>();
```

This requires an interface (`IOrderRepository`), a class that explicitly implements it (`SqlOrderRepository : IOrderRepository`), and a container (`IServiceCollection`) to wire them together. Three pieces of infrastructure.

Python achieves the same result with less ceremony: `Protocol` instead of an interface (no `interface` keyword, no explicit inheritance), the constructor instead of a container. The type checker (`mypy`, `pyright`) verifies compatibility at compile time, exactly as the C# compiler verifies interface implementation. The difference: in Python you can also skip the type checker and rely on tests. The flexibility is greater, but the responsibility shifts to you.

For services with few dependencies, Protocol + constructor is all you need.

---

## `dependency-injector`: When Plain Python Is Not Enough

The Protocol + constructor injection pattern works as long as the dependency graph is simple. When it grows — more services, more environments, more configurations — manual composition becomes noise. `dependency-injector` is a library that brings DI containers to Python without sacrificing explicitness.

```python
from dependency_injector import containers, providers

class Container(containers.DeclarativeContainer):
    config = providers.Configuration()

    order_repo = providers.Singleton(
        MongoOrderRepository,
        connection_string=config.mongo_uri,
    )

    order_service = providers.Factory(
        OrderService,
        repo=order_repo,
    )
```

The container declares who creates what. `Singleton` guarantees a single repository instance. `Factory` creates a new `OrderService` on each request, injecting the repository. Configuration comes from the `Configuration` provider, which can read from files, environment variables, or dictionaries.

The real strength emerges in tests: you can override a single provider without rebuilding the entire graph.

```python
# Test with repository override
container = Container()
container.order_repo.override(providers.Object(FakeRepo()))

service = container.order_service()
oid = service.place_order(["item1"])
assert oid == "0"
```

Production uses `MongoOrderRepository`, tests use `FakeRepo`, and `OrderService` code does not change.

### When It Makes Sense

- **Multiple environments** (dev/test/prod) with different dependencies: `MongoOrderRepository` in production, `FakeRepo` in tests, `SqliteOrderRepository` in local dev. The container lets you override individual providers without touching the rest.
- **Complex dependency graphs**: when a service depends on 5 collaborators, each with their own dependencies, manual composition becomes a 40-line `main()` of setup boilerplate.
- **Decorator-based wiring**: `dependency-injector` can inject automatically into Flask/FastAPI functions via `@inject`. Less boilerplate in routes.

### When It Is Overkill

- **Few dependencies**: if the service has 2–3 collaborators, the constructor suffices. The container adds an abstraction layer that does not pay for itself.
- **Small services**: a microservice with 5 endpoints and one database does not need a declarative container. Protocol + constructor injection is enough.
- **Prototypes**: if the code lives less than a month, the container investment does not pay off.

The practical rule: `dependency-injector` starts paying off with 10+ dependencies or when you need to manage configurations across multiple environments. Below that threshold, the plain pattern is clearer.

---

## The Flask Pattern: Application Factory as Natural DI

Flask has a dependency injection mechanism hidden in plain sight: the [application factory](https://flask.palletsprojects.com/en/2.3.x/patterns/appfactories/). The `create_app(config)` function receives dependencies from outside and attaches them to the app object. It is an implicit DI container.

This is the real pattern that emerged from refactoring the three services:

```python
def create_app(config=None):
    app = Flask("c40 usage api")
    cfg = config if config is not None else load_config()

    # DI: accepts mock client from config, or creates the real one
    if "mongo_client" in cfg:
        app.mongo_client = cfg["mongo_client"]
    else:
        app.mongo_client = MongoClient(cfg["mongo_uri"])

    if "kafka_producer" in cfg:
        app.kafka_producer = cfg["kafka_producer"]
    else:
        app.kafka_producer = create_producer(cfg)

    _register_routes(app)
    return app
```

The conftest becomes:

```python
from app import create_app

@pytest.fixture
def app():
    return create_app({
        "mongo_client": MagicMock(),
        "kafka_producer": MagicMock(),
        # ... test config ...
    })
```

No `sys.modules`. No import order. The test creates the app with whatever dependencies it wants, and the app uses them without knowing whether they are real or fake.

The mechanism is simple: the `config` dictionary is the container. If it contains a `"mongo_client"` key, the app uses that client (which in tests is a `MagicMock`). If the key is absent, the app creates the real client from the connection string in configuration. The same pattern applies to the Kafka producer, the schema registry, and any other external dependency.

The separation extends beyond the conftest. The production entrypoint remains isolated:

```python
# main.py — the only place with side effects
if __name__ == "__main__":
    app = create_app()
    consumer_thread = threading.Thread(
        target=consume_data, args=(app,))
    consumer_thread.start()
    app.run(host="0.0.0.0", port=8092)
```

The Kafka consumer thread starts only in `main.py`. Importing `app` does not start it. Importing `business` does not import Flask. Each module has a single level of responsibility.

### The Real Numbers

Refactoring three services (`current`, `history`, `usage`) produced:

- **Conftest**: from 228 to 148 total lines (-35%)
- **`sys.modules` hacks**: from 12 to 0
- **Mutation score on business logic**: zero surviving mutants (before: 19%, 41%, and 46% kill rate across the three services)

The most significant improvement is not in conftest line count. It is in the separation between business logic and infrastructure. The `usage` service has 469 lines in the original file. After refactoring, pure functions (`compute_delta`, `should_compute_delta`, `get_cost_sources`) live in `business.py` — a module that imports only `datetime` from the standard library. Zero Flask, zero Kafka, zero MongoDB. These functions are testable with a direct import, no fixtures needed:

```python
# test_business.py — zero mocks, zero fixtures
from business import compute_delta

def test_compute_delta_normal():
    ref = {"identifier": "EX001", "timestamp": 1000,
           "c40": {"odometry": {"hours_tot": 100.0}}}
    upd = {"identifier": "EX001", "timestamp": 2000,
           "c40": {"odometry": {"hours_tot": 101.5}}}
    dt, dh, dk = compute_delta(ref, upd)
    assert dh == 1.5
```

Dependency injection did not just make tests simpler. It forced an architectural separation that did not previously exist.

---

## When You Do Not Need It

Dependency injection is not always the answer. It adds structure — and structure has a cost.

**One-shot scripts.** A file that reads a CSV, transforms it, and writes it somewhere else does not need `Protocol` and constructor injection. The code runs once and is discarded.

**CLI tools.** If the entry point is `argparse` or `click`, and the tool does one thing, injecting dependencies via constructor adds complexity without benefit.

**Prototypes.** A service that lives less than a week does not justify the investment.

**Few dependencies, few tests.** If you have 2 dependencies and 5 tests, Protocol + constructor injection is already overkill. Pass the collaborator as a function parameter and be done with it.

A concrete example: in the three Flask services I refactored, the `business.py` module of the `usage` service contains functions like `compute_delta` and `should_compute_delta`. These functions have no external dependencies — they receive dictionaries and return values. Nothing to inject. Just pass the data as parameters. DI would be unnecessary overhead on code that is already pure by nature.

The rule: if you do not need to test the code in isolation, you do not need DI. If you need to test it but the dependencies are few and simple, the constructor suffices. If dependencies grow and environments multiply, consider a container. YAGNI applies to architectural patterns too.

---

## Adoption Ladder

You do not need to jump from zero to `dependency-injector` in one step. DI in Python is a gradient:

1. **Function parameter.** The simplest form. The function receives the collaborator as an argument. No classes, no Protocol. Example: `compute_delta(ref_data, update_data)` — a pure function that receives input and returns output. If tomorrow the data source changes from MongoDB to PostgreSQL, the function does not care.

2. **Constructor injection with Protocol.** The class declares dependencies in the constructor. `Protocol` formalizes the contract. Suitable for services with non-trivial business logic and more than one method that uses the same dependency. The `OrderService` example in this article is at this level.

3. **Application factory.** For Flask (and similar frameworks): `create_app(config)` receives dependencies and attaches them to the app. The conftest creates the app with fake dependencies. This is the level I used for the three telemetry services. No library needed: the `config` dictionary is the container.

4. **Declarative container.** `dependency-injector` or similar. For complex graphs, multiple environments, automatic wiring. Setup cost pays off on medium-to-long-term projects with dozens of services and per-environment configurations.

In my experience, 90% of Python services I have seen in production stay at level 2 or 3. The declarative container belongs in larger projects — and in those cases, it is worth every line of configuration. The important thing is not to skip levels: start with the simplest thing that solves your problem, and move up only when complexity demands it.

---

## Resources

- **Unit testing series** — Flask refactoring details: [Your Flask service is untestable](/en/blog/verificare/testing/02-mock-traps-python-flask/) and [Testable Flask microservices](/en/blog/verificare/testing/03-flask-factory-testabile/)
- **dependency-injector** — Official documentation: [python-dependency-injector.ets-labs.org](https://python-dependency-injector.ets-labs.org/)
- **Flask Application Factory** — Official Flask pattern: [flask.palletsprojects.com/en/2.3.x/patterns/appfactories/](https://flask.palletsprojects.com/en/2.3.x/patterns/appfactories/)
- **PEP 544 — Protocols** — The PEP that introduced Protocol in Python: [peps.python.org/pep-0544/](https://peps.python.org/pep-0544/)
