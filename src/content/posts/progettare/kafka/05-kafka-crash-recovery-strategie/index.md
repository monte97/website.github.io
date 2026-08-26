---
title: "Kafka crash recovery: tre strategie per tre tipi di stato"
seoTitle: "Kafka: tre strategie di crash recovery"
date: 2026-03-02T09:00:00.000Z
description: "Tre strategie di recovery per consumer Kafka con stato diverso: replay completo per idempotenti, checkpoint per additivi, nessun recovery per stateless"
pillar: progettare
category: kafka
tags:
  - Kafka
  - Python
  - Recovery
  - Consumer
lang: it
series: kafka
seriesOrder: 50
reviewed: true
reproducibility: true
summary:
  - label: "Tesi"
    value: "La strategia di recovery segue il tipo di stato, non una preferenza di configurazione"
    note: "Domanda guida: cosa succede se processo lo stesso messaggio due volte"
  - label: "Strategia 1"
    value: "Stato idempotente in memoria: replay completo con `earliest`"
    note: "`group.id` nuovo ad ogni restart, offset che non serve committare"
  - label: "Strategia 2"
    value: "Delta additivi: checkpoint su MongoDB e ripartenza con `latest`"
    note: "Riconsumare raddoppierrebbe i valori aggregati"
  - label: "Strategia 3"
    value: "Consumer stateless di sola lettura: nessun recovery"
    note: "Separato dall'ingest per isolare il carico delle query"
openItems:
  - "Con pochi sensori e qualche migliaio di messaggi il replay richiede secondi: con milioni servono log compaction o snapshot periodici"
  - "Checkpoint e salvataggio del delta non sono in transazione atomica: un crash tra le due scritture produce un delta ricalcolato, errore dell'ordine di un intervallo di polling"
  - "Con messaggi ogni 5 secondi la finestra di perdita è al massimo un delta per sensore, trascurabile su aggregazioni giornaliere"
  - "La demo non gestisce SIGTERM, non espone health check e non ha flow control: in produzione ognuno di questi punti va risolto"
openNote: "I limiti dichiarati dalla demo, da ripensare prima dell'uso in produzione."
mode: explanation
---

Un consumer Kafka crasha. Cosa succede ai dati che stava processando? La risposta non dipende da Kafka, ma dal tipo di stato che il consumer mantiene. Un consumer idempotente può ripartire dall'inizio del topic senza conseguenze. Un consumer che accumula delta non può permetterselo: ricalcolerebbe valori già contati. Un consumer stateless non ha nulla da recuperare.

Tre strategie di recovery concrete, estratte da una piattaforma IoT industriale dove un singolo topic Kafka alimenta tre consumer indipendenti, ciascuno con proprietà diverse dello stato interno.

## Contesto: un topic, tre consumer

Il sistema in esame è una piattaforma di telemetria per mezzi d'opera. Un producer pubblica periodicamente su un topic Kafka messaggi con dati odometrici (ore motore, chilometri) e posizione GPS per ogni sensore. Tre consumer leggono lo stesso topic, ognuno con una responsabilità diversa:

* **consumer-current**: mantiene in memoria l'ultimo stato noto di ogni sensore
* **consumer-usage**: calcola i delta di utilizzo tra messaggi consecutivi e li salva su MongoDB
* **consumer-query**: interroga MongoDB per esporre riepiloghi di utilizzo

Ogni consumer ha una strategia di recovery diversa perché il suo stato ha proprietà diverse. La scelta di `auto.offset.reset` non è una preferenza: è una conseguenza diretta della natura dello stato.

```
Topic "sensor-data"
├── consumer-current  (in-memory, idempotente)    → earliest
├── consumer-usage    (MongoDB, additivo)          → latest
└── consumer-query    (stateless, solo query)      → nessun consumer Kafka
```

## Strategia 1: replay completo

Il consumer-current mantiene un dizionario in memoria con l'ultimo messaggio ricevuto per ogni sensore. Non ha database, non ha persistenza. Quando crasha, perde tutto.

La strategia di recovery è semplice: riconsuma l'intero topic dall'inizio. Ad ogni restart il consumer genera un nuovo `group.id` casuale, così Kafka non ha offset committati da cui riprendere, e `auto.offset.reset=earliest` forza la lettura dalla prima posizione disponibile.

```python
# consumer-current/consumer.py
GROUP_ID = f"demo-current-{uuid.uuid4().hex[:8]}"  # nuovo ad ogni restart

state = {}  # dizionario in-memory, perso al crash

consumer = Consumer({
    "bootstrap.servers": BROKER,
    "group.id": GROUP_ID,
    "auto.offset.reset": "earliest",     # riparte dall'inizio del topic
    "enable.auto.commit": "false",       # offset irrilevanti, non serve committarli
})
consumer.subscribe([TOPIC])

while True:
    msg = consumer.poll(timeout=1.0)
    if msg is None:
        continue
    # ...error handling omesso...
    value = json.loads(msg.value().decode("utf-8"))
    key = msg.key().decode("utf-8")
    state[key] = value  # overwrite: l'ultimo valore vince sempre
```

L'operazione di ricostruzione è un overwrite puro per chiave. Se un sensore ha prodotto 1000 messaggi, il consumer li rilegge tutti, ma solo l'ultimo sopravvive nel dizionario. Il risultato finale è identico indipendentemente da quante volte si ripete il processo: l'operazione è **idempotente**.

Un dettaglio importante: `enable.auto.commit` è impostato a `false`. Il consumer non committa mai gli offset perché non ne ha bisogno. Ad ogni restart genera un `group.id` nuovo, quindi Kafka non ha offset precedenti da cui riprendere. Committarli sarebbe inutile e aggiungerebbe complessità senza beneficio.

Il trade-off è lo startup time. Con 10 sensori e un topic di poche migliaia di messaggi, la ricostruzione richiede pochi secondi. Con milioni di messaggi la situazione cambia, e a quel punto servirebbero approcci diversi: la [log compaction](https://kafka.apache.org/documentation/#compaction) di Kafka, che elimina i messaggi obsoleti mantenendo solo l'ultimo per ogni chiave, ridurrebbe il volume da rileggere in modo significativo. In alternativa, snapshot periodici dello stato su disco consentirebbero di ripartire da un punto intermedio. Nel contesto della demo, il replay completo è sufficiente.

## Strategia 2: checkpoint e skip

Il consumer-usage ha un compito diverso: calcola i delta di utilizzo tra messaggi consecutivi dello stesso sensore. Se il sensore aveva 100 ore motore nel messaggio precedente e 102 nel messaggio corrente, il delta è 2 ore. Questi delta vengono salvati su MongoDB come record individuali.

Questa operazione è **additiva**: ogni messaggio produce un nuovo record che si somma ai precedenti. Riconsumando il topic dall'inizio, ogni delta verrebbe calcolato e inserito una seconda volta, raddoppiando i valori aggregati.

La strategia di recovery prevede due meccanismi: un checkpoint su MongoDB dell'ultimo stato visto per ogni sensore, e `auto.offset.reset=latest` per ignorare la storia e riprendere solo dai messaggi nuovi.

```python
# consumer-usage/consumer.py - caricamento checkpoint
def load_state(state_col):
    state = {}
    for doc in state_col.find({}, {"_id": 0}):
        state[doc["sensor_id"]] = doc
    return state

def save_checkpoint(state_col, sensor_id, message):
    state_col.update_one(
        {"sensor_id": sensor_id},
        {"$set": message},
        upsert=True,
    )
```

Al restart il consumer carica i checkpoint da MongoDB, ottenendo l'ultimo stato noto per ogni sensore. Poi inizia a consumare solo i nuovi messaggi:

```python
# consumer-usage/consumer.py - configurazione e loop
last_state = load_state(state_col)  # recupera checkpoint da MongoDB

consumer = Consumer({
    "bootstrap.servers": BROKER,
    "group.id": GROUP_ID,              # fisso: Kafka ricorda l'offset
    "auto.offset.reset": "latest",     # salta la storia
    "enable.auto.commit": "true",
})

# nel loop di consumo:
if key in last_state:
    delta = compute_delta(last_state[key], value)
    if delta["delta_hours"] > 0 or delta["delta_km"] > 0:
        save_usage(usage_col, delta)   # record additivo su MongoDB

last_state[key] = value
save_checkpoint(state_col, key, value)  # aggiorna checkpoint
```

Il calcolo del delta confronta il messaggio corrente con il checkpoint precedente:

```python
# consumer-usage/consumer.py - calcolo delta
def compute_delta(previous, current):
    delta_hours = current["odometry"]["hours_tot"] - previous["odometry"]["hours_tot"]
    delta_km = current["odometry"]["km_tot"] - previous["odometry"]["km_tot"]
    return {
        "sensor_id": current["sensor_id"],
        "date": datetime.fromtimestamp(
            current["timestamp"] / 1000, tz=timezone.utc
        ).strftime("%Y-%m-%d"),
        "delta_hours": round(delta_hours, 2),
        "delta_km": round(delta_km, 2),
    }
```

Da notare la differenza nella gestione del `group.id` rispetto al consumer-current. Qui il `group.id` è fisso (`"demo-usage"`), il che permette a Kafka di ricordare l'ultimo offset committato. Quando il consumer riparte, Kafka lo posiziona dove si era fermato. Se invece il `group.id` non avesse offset salvati (primo avvio, o offset scaduto per retention), `auto.offset.reset=latest` garantisce che il consumer inizi a leggere solo i messaggi futuri, senza toccare la storia.

Il trade-off di questa strategia è il rischio di perdita dati. Esiste una finestra tra l'ultimo messaggio processato e il crash in cui il checkpoint potrebbe non essere stato salvato. In pratica, con messaggi ogni 5 secondi, si rischia di perdere al massimo un delta per sensore. In un contesto di telemetria industriale, dove i delta vengono aggregati su base giornaliera, la perdita è trascurabile.

C'è anche un rischio più sottile: il checkpoint e il salvataggio del delta non sono in una transazione atomica. Se il consumer crasha dopo aver inserito il delta ma prima di aggiornare il checkpoint, al restart calcolerà di nuovo lo stesso delta con il messaggio successivo, producendo un valore leggermente diverso (perché il riferimento è il checkpoint vecchio, non quello che sarebbe stato aggiornato). In pratica, l'errore introdotto è dell'ordine di un singolo intervallo di polling, ma è un fatto da conoscere.

## Strategia 3: nessun recovery necessario

Il consumer-query non consuma da Kafka. È un servizio di pura lettura che interroga MongoDB con una pipeline di aggregazione:

```python
# consumer-query/query.py
def query_usage(usage_col):
    pipeline = [
        {
            "$group": {
                "_id": "$sensor_id",
                "total_hours": {"$sum": "$delta_hours"},
                "total_km": {"$sum": "$delta_km"},
                "records": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    return list(usage_col.aggregate(pipeline))
```

Se crasha, riparte e ricomincia a rispondere. Non c'è stato da ricostruire, non ci sono offset da gestire. L'unica dipendenza è la disponibilità di MongoDB.

La ragione per cui esiste come servizio separato è l'isolamento: separare il carico delle query dal processo di ingest evita che un picco di letture interferisca con la scrittura dei delta. In un sistema con più consumer che scrivono e più client che leggono, questa separazione diventa rilevante.

## La regola

La scelta della strategia di recovery è determinata dalla natura dello stato:

| Proprietà dello stato | Strategia | `auto.offset.reset` |
|---|---|---|
| Idempotente (overwrite) | Replay completo | `earliest` |
| Additivo (accumulo) | Checkpoint + skip | `latest` |
| Nessuno (stateless) | Nessun recovery | Non applicabile |

`earliest` funziona quando rielaborare lo stesso messaggio due volte produce lo stesso risultato. `latest` è necessario quando rielaborare un messaggio ne duplica l'effetto. Non è una preferenza di configurazione: è una conseguenza della semantica delle operazioni del consumer.

Questa regola si applica anche a scenari non coperti dalla demo. Un consumer che scrive su un database con upsert per chiave primaria è idempotente: può usare `earliest`. Un consumer che invia notifiche è additivo: un replay produrrebbe notifiche duplicate. Un consumer che alimenta un modello di machine learning con batch di training ha vincoli ancora diversi. In ogni caso, la domanda da porsi è: cosa succede se processo lo stesso messaggio due volte?

## Limiti dichiarati

La demo privilegia la chiarezza sulla robustezza. Alcuni limiti da tenere presenti in un contesto di produzione:

* **Nessun graceful shutdown**: i consumer usano `KeyboardInterrupt` come unico meccanismo di arresto. Non c'è gestione di segnali SIGTERM, il che significa che Docker Compose uccide il processo dopo il timeout. In produzione servirebbe un signal handler che chiude il consumer e committa l'offset corrente.
* **Checkpoint e delta non atomici**: il consumer-usage esegue due scritture MongoDB separate (salvataggio delta e aggiornamento checkpoint) senza una transazione. Un crash tra le due operazioni può lasciare lo stato inconsistente. L'approccio è accettabile per la demo perché l'errore introdotto è dell'ordine di un singolo intervallo di polling.
* **Health check assente**: nessuno dei container espone un endpoint di health. Docker non ha modo di sapere se un consumer è bloccato in un poll infinito o se sta effettivamente processando messaggi. Un health check reale dovrebbe verificare l'avanzamento dell'offset.
* **Nessuna gestione del backpressure**: se MongoDB rallenta, il consumer-usage continua a leggere da Kafka alla stessa velocità, accumulando messaggi in memoria. In produzione servirebbe un meccanismo di flow control.

## Demo

Il codice completo è disponibile come progetto Docker Compose con producer simulato, tre consumer e uno script di test che simula crash e recovery.

* **Repository**: [github.com/monte97/kafka-crash-recovery-demo](https://github.com/monte97/kafka-crash-recovery-demo)

Per avviare la demo:

```bash
docker compose up -d
./demo.sh  # simula crash e verifica recovery
```

## Risorse utili

* **Documentazione Kafka, consumer configuration**: [kafka.apache.org/documentation/#consumerconfigs](https://kafka.apache.org/documentation/#consumerconfigs)
* **confluent-kafka-python**: [docs.confluent.io/kafka-clients/python](https://docs.confluent.io/kafka-clients/python/current/overview.html)
