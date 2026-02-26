---
title: "Dependency Injection in Python: dal codice non testabile all'architettura pulita"
date: 2026-02-26T10:00:00+02:00
description: "DI in Python senza framework, con Protocol e constructor injection, e quando usare dependency-injector. Dalla teoria al refactoring reale di 3 servizi Flask."
menu:
  sidebar:
    name: "DI in Python"
    identifier: di-python
    weight: 10
    parent: patterns
tags: ["Python", "DependencyInjection", "Flask", "Testing", "Patterns"]
categories: ["Patterns"]
draft: true
reviewed: false
pillar: "System Design"
---

Ho refactorizzato 3 servizi Flask. I conftest sono passati da 228 a 148 righe totali. Gli hack su `sys.modules` sono scomparsi. Il mutation score sulla logica di business e' arrivato a zero mutanti sopravvissuti. Ma la lezione non era su Flask -- era su come Python gestisce le dipendenze.

Questo articolo raccoglie quello che ho imparato: dependency injection in Python, senza framework, con `Protocol` e constructor injection. Poi quando `dependency-injector` ha senso, e quando l'application factory di Flask diventa un container DI naturale.

---

## Il problema in 30 secondi

Python e' un linguaggio imperativo. Le righe di un modulo vengono eseguite nell'ordine in cui appaiono, al momento dell'import. Se scrivi questo al top level:

```python
# usage.py -- eseguito al top level
mongo_client = MongoClient(mongo_connection_string)
schema_registry_client = SchemaRegistryClient({...})
kafka_producer = SerializingProducer(producer_conf)
```

...stai creando tre connessioni esterne ogni volta che qualcuno importa il modulo. Anche nei test. Non c'e' un `if __name__ == '__main__'` a proteggerti. L'`import` **e'** l'esecuzione.

Il risultato: il conftest diventa l'immagine speculare del codice. Ogni connessione nel modulo richiede un mock corrispondente nel conftest. Ogni mock deve essere configurato **prima** dell'import, nell'ordine giusto: prima `sys.modules` con i moduli fake, poi le variabili d'ambiente, poi il patch del threading, e solo alla fine l'import del modulo sotto test. Se sbagli l'ordine, il modulo crasha cercando broker e database inesistenti. Se mocki la libreria sbagliata (come e' successo a me con `kafka-python` vs `confluent-kafka`), i test passano lo stesso ma non testano nulla.

Nei tre servizi che ho refactorizzato, il conftest totale era di 228 righe -- quasi la meta' del codice applicativo. Il conftest non aveva test propri: se un mock era configurato in modo errato, nessuno se ne accorgeva. I due file evolvevano in sincrono, ma il contratto era implicito e non documentato.

I dettagli di questi problemi -- le quattro trappole del mocking con `sys.modules`, i mock su librerie C-backed, la contaminazione tra test -- sono descritti in [Il tuo servizio Flask e' impossibile da testare](/posts/testing/unit-testing/02-mock-traps-python-flask/). Il refactoring completo dei tre servizi e' in [Microservizi Flask testabili](/posts/testing/unit-testing/03-flask-factory-testabile/). Qui mi concentro sul pattern sottostante: la dependency injection.

---

## DI in Python: non serve un framework

In molti linguaggi, la dependency injection richiede infrastruttura: un container, un sistema di registrazione, interfacce esplicite. Python no. Servono due cose: `Protocol` (da `typing`) e il costruttore della classe.

`Protocol` definisce un contratto strutturale. Non serve ereditare da nulla: basta che un oggetto abbia i metodi giusti. E' duck typing formalizzato.

```python
from typing import Protocol

class OrderRepository(Protocol):
    """Contratto: qualsiasi oggetto con save() e find_by_id()."""
    def save(self, order: dict) -> str: ...
    def find_by_id(self, order_id: str) -> dict | None: ...

class OrderService:
    def __init__(self, repo: OrderRepository):
        self._repo = repo

    def place_order(self, items: list[str]) -> str:
        order = {"items": items, "status": "pending"}
        return self._repo.save(order)
```

`OrderService` non sa nulla dell'implementazione. Non importa MongoDB, non importa SQLAlchemy. Riceve un oggetto che rispetta il contratto `OrderRepository` e lo usa. La dipendenza e' iniettata tramite il costruttore -- constructor injection.

Testare diventa banale:

```python
class FakeRepo:
    """Nessuna eredita'. Basta avere save() e find_by_id()."""
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

`FakeRepo` non dichiara di implementare `OrderRepository`. Non serve. Python verifica la compatibilita' strutturale: se ha `save()` e `find_by_id()` con le signature giuste, e' un `OrderRepository`. Questo e' il cuore del duck typing di Python, reso esplicito e verificabile dal type checker.

Il vantaggio rispetto a `MagicMock()`: il fake ha un comportamento deterministico. `MagicMock` restituisce un nuovo mock per qualsiasi attributo -- il che significa che un typo come `service._repo.svae(order)` non genera errore. Un `FakeRepo` con metodi reali fallisce immediatamente se il codice chiama un metodo che non esiste. Meno sorprese, test piu' affidabili.

Niente mock, niente patch, niente `sys.modules`.

### Il confronto con .NET

Se lavori con .NET, il pattern e' familiare. La differenza e' nella cerimonia. In C# scriveresti:

```csharp
services.AddScoped<IOrderRepository, SqlOrderRepository>();
```

Serve un'interfaccia (`IOrderRepository`), una classe che la implementa esplicitamente (`SqlOrderRepository : IOrderRepository`), e un container (`IServiceCollection`) che li collega. Tre pezzi di infrastruttura.

Python raggiunge lo stesso risultato con meno cerimonia: `Protocol` al posto dell'interfaccia (senza keyword `interface`, senza ereditarieta' esplicita), il costruttore al posto del container. Il type checker (`mypy`, `pyright`) verifica la compatibilita' a compile time, esattamente come il compilatore C# verifica l'implementazione dell'interfaccia. La differenza: in Python puoi anche non usare il type checker e affidarti ai test. La flessibilita' e' maggiore, ma la responsabilita' si sposta su di te.

Per servizi con poche dipendenze, Protocol + costruttore e' tutto quello che serve.

---

## `dependency-injector`: quando il vanilla non basta

Il pattern Protocol + constructor injection funziona finche' il grafo delle dipendenze e' semplice. Quando cresce -- piu' servizi, piu' ambienti, piu' configurazioni -- la composizione manuale diventa rumore. `dependency-injector` e' una libreria che porta i container DI in Python senza perdere l'esplicitezza.

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

Il container dichiara chi crea cosa. `Singleton` garantisce una sola istanza del repository. `Factory` crea un nuovo `OrderService` ad ogni richiesta, iniettando il repository. La configurazione viene dal provider `Configuration`, che puo' leggere da file, variabili d'ambiente, o dizionari.

Il punto di forza emerge nei test: puoi sovrascrivere un singolo provider senza ricostruire l'intero grafo.

```python
# test con override del repository
container = Container()
container.order_repo.override(providers.Object(FakeRepo()))

service = container.order_service()
oid = service.place_order(["item1"])
assert oid == "0"
```

La produzione usa `MongoOrderRepository`, i test usano `FakeRepo`, e il codice di `OrderService` non cambia.

### Quando ha senso

- **Ambienti multipli** (dev/test/prod) con dipendenze diverse: un `MongoOrderRepository` in produzione, un `FakeRepo` nei test, un `SqliteOrderRepository` in dev locale. Il container permette di sovrascrivere singoli provider senza toccare il resto.
- **Grafi di dipendenze complessi**: quando un servizio dipende da 5 collaboratori, ognuno con le proprie dipendenze, la composizione manuale diventa un `main()` da 40 righe di setup.
- **Wiring con decoratori**: `dependency-injector` puo' iniettare automaticamente nelle funzioni Flask/FastAPI tramite `@inject`. Meno boilerplate nelle route.

### Quando e' overkill

- **Poche dipendenze**: se il servizio ha 2-3 collaboratori, il costruttore basta. Il container aggiunge un livello di astrazione che non paga.
- **Servizi piccoli**: un microservizio con 5 endpoint e un database non ha bisogno di un container dichiarativo. Protocol + constructor injection e' sufficiente.
- **Prototipi**: se il codice vive meno di un mese, l'investimento nel container non si ripaga.

La regola pratica: `dependency-injector` inizia a pagare con 10+ dipendenze o quando devi gestire configurazioni per ambienti multipli. Sotto quella soglia, il vanilla pattern e' piu' chiaro.

---

## Il pattern Flask: application factory come DI naturale

Flask ha un meccanismo di dependency injection nascosto in bella vista: l'[application factory](https://flask.palletsprojects.com/en/2.3.x/patterns/appfactories/). La funzione `create_app(config)` riceve le dipendenze dall'esterno e le attacca all'oggetto app. E' un container DI implicito.

Questo e' il pattern reale emerso dal refactoring dei tre servizi:

```python
def create_app(config=None):
    app = Flask("c40 usage api")
    cfg = config if config is not None else load_config()

    # DI: accetta client mock dal config, o crea quello reale
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

Il conftest diventa:

```python
from app import create_app

@pytest.fixture
def app():
    return create_app({
        "mongo_client": MagicMock(),
        "kafka_producer": MagicMock(),
        # ... config di test ...
    })
```

Niente `sys.modules`. Niente ordine di import. Il test crea l'app con le dipendenze che vuole, e l'app le usa senza sapere se sono reali o fake.

Il meccanismo e' semplice: il dizionario `config` e' il container. Se contiene una chiave `"mongo_client"`, l'app usa quel client (che nei test e' un `MagicMock`). Se la chiave non c'e', l'app crea il client reale con la connection string dalla configurazione. Lo stesso pattern si applica al producer Kafka, allo schema registry, e a qualsiasi altra dipendenza esterna.

La separazione va oltre il conftest. L'entrypoint di produzione resta isolato:

```python
# main.py -- unico punto con side-effect
if __name__ == "__main__":
    app = create_app()
    consumer_thread = threading.Thread(
        target=consume_data, args=(app,))
    consumer_thread.start()
    app.run(host="0.0.0.0", port=8092)
```

Il thread Kafka parte solo in `main.py`. L'import di `app` non lo avvia. L'import di `business` non importa Flask. Ogni modulo ha un unico livello di responsabilita'.

### I numeri reali

Il refactoring di tre servizi (`current`, `history`, `usage`) ha prodotto:

- **Conftest**: da 228 a 148 righe totali (-35%)
- **Hack `sys.modules`**: da 12 a 0
- **Mutation score su logica di business**: zero mutanti sopravvissuti (prima: 19%, 41% e 46% di kill rate sui tre servizi)

Il miglioramento piu' significativo non e' nelle righe di conftest. E' nella separazione tra logica di business e infrastruttura. Il servizio `usage` ha 469 righe nel file originale. Dopo il refactoring, le funzioni pure (`compute_delta`, `should_compute_delta`, `get_cost_sources`) vivono in `business.py` -- un modulo che importa solo `datetime` dalla libreria standard. Zero Flask, zero Kafka, zero MongoDB. Queste funzioni sono testabili con un import diretto, senza fixture:

```python
# test_business.py -- zero mock, zero fixture
from business import compute_delta

def test_compute_delta_normal():
    ref = {"identifier": "EX001", "timestamp": 1000,
           "c40": {"odometry": {"hours_tot": 100.0}}}
    upd = {"identifier": "EX001", "timestamp": 2000,
           "c40": {"odometry": {"hours_tot": 101.5}}}
    dt, dh, dk = compute_delta(ref, upd)
    assert dh == 1.5
```

La dependency injection non ha solo reso i test piu' semplici. Ha forzato una separazione architetturale che prima non esisteva.

---

## Quando NON serve

La dependency injection non e' sempre la risposta. Aggiunge struttura -- e la struttura ha un costo.

**Script one-shot.** Un file che legge un CSV, lo trasforma e lo scrive da un'altra parte non ha bisogno di `Protocol` e constructor injection. Il codice viene eseguito una volta e buttato.

**CLI tool.** Se il punto di ingresso e' `argparse` o `click`, e il tool fa una cosa sola, iniettare le dipendenze tramite costruttore aggiunge complessita' senza beneficio.

**Prototipi.** Un servizio che vive meno di una settimana non giustifica l'investimento.

**Poche dipendenze, pochi test.** Se hai 2 dipendenze e 5 test, Protocol + constructor injection e' gia' overkill. Passa il collaboratore come parametro della funzione e finiscila li'.

Un esempio concreto: nei tre servizi Flask che ho refactorizzato, il modulo `business.py` del servizio `usage` contiene funzioni come `compute_delta` e `should_compute_delta`. Queste funzioni non hanno dipendenze esterne -- ricevono dizionari e restituiscono valori. Non serve iniettare nulla. Serve solo passare i dati come parametri. La DI sarebbe overhead inutile su codice che e' gia' puro per natura.

La regola: se non hai bisogno di testare il codice in isolamento, non hai bisogno di DI. Se hai bisogno di testarlo ma le dipendenze sono poche e semplici, il costruttore basta. Se le dipendenze crescono e gli ambienti si moltiplicano, valuta un container. YAGNI si applica anche ai pattern architetturali.

---

## Scala di adozione

Non serve passare da zero a `dependency-injector` in un colpo. La DI in Python e' un gradiente:

1. **Parametro di funzione.** La forma piu' semplice. La funzione riceve il collaboratore come argomento. Nessuna classe, nessun Protocol. Esempio: `compute_delta(ref_data, update_data)` -- una funzione pura che riceve input e restituisce output. Se domani la fonte dei dati cambia da MongoDB a PostgreSQL, la funzione non se ne accorge.

2. **Constructor injection con Protocol.** La classe dichiara le dipendenze nel costruttore. `Protocol` formalizza il contratto. Adatto a servizi con logica di business non banale e piu' di un metodo che usa la stessa dipendenza. L'esempio `OrderService` di questo articolo e' a questo livello.

3. **Application factory.** Per Flask (e framework simili): `create_app(config)` riceve le dipendenze e le attacca all'app. Il conftest crea l'app con dipendenze fake. E' il livello che ho usato per i tre servizi di telemetria. Non serve una libreria: il dizionario `config` e' il container.

4. **Container dichiarativo.** `dependency-injector` o simili. Per grafi complessi, ambienti multipli, wiring automatico. Il costo di setup si ripaga su progetti di media-lunga durata con decine di servizi e configurazioni per ambiente.

Nella mia esperienza, il 90% dei servizi Python che ho visto in produzione si ferma al livello 2 o 3. Il container dichiarativo serve in progetti piu' grandi -- e in quei casi, vale ogni riga di configurazione. La cosa importante e' non saltare livelli: parti dal piu' semplice che risolve il tuo problema, e sali solo quando la complessita' lo richiede.

---

## Risorse

- **Serie unit testing** -- I dettagli del refactoring Flask: [Il tuo servizio Flask e' impossibile da testare](/posts/testing/unit-testing/02-mock-traps-python-flask/) e [Microservizi Flask testabili](/posts/testing/unit-testing/03-flask-factory-testabile/)
- **dependency-injector** -- Documentazione ufficiale: [python-dependency-injector.ets-labs.org](https://python-dependency-injector.ets-labs.org/)
- **Flask Application Factory** -- Pattern ufficiale Flask: [flask.palletsprojects.com/en/2.3.x/patterns/appfactories/](https://flask.palletsprojects.com/en/2.3.x/patterns/appfactories/)
- **PEP 544 -- Protocols** -- La PEP che ha introdotto Protocol in Python: [peps.python.org/pep-0544/](https://peps.python.org/pep-0544/)
