---
title: "Kafka crash recovery: tre strategie per tre tipi di stato"
date: 2026-02-16T09:00:00.000Z
description: "Tre strategie di recovery per consumer Kafka con stato diverso: replay completo per idempotenti, checkpoint per additivi, nessun recovery per stateless"
pillar: progettare
category: kafka
tags:
  - Kafka
  - Python
  - Recovery
  - Consumer
lang: it
draft: true
series: kafka
seriesOrder: 50
reviewed: true
reproducibility: true
---

Un consumer Kafka crasha. Cosa succede ai dati che stava processando? La risposta non dipende da Kafka, ma dal tipo di stato che il consumer mantiene. Un consumer idempotente puo' ripartire dall'inizio del topic senza conseguenze. Un consumer che accumula delta non puo' permetterselo: ricalcolerebbe valori gia' contati. Un consumer stateless non ha nulla da recuperare.

Questo articolo analizza tre strategie di recovery concrete, estratte da una piattaforma IoT industriale dove un singolo topic Kafka alimenta tre consumer indipendenti, ciascuno con proprieta' diverse dello stato interno.

## Contesto: un topic, tre consumer

Il sistema in esame e' una piattaforma di telemetria per mezzi d'opera. Un producer pubblica periodicamente su un topic Kafka messaggi con dati odometrici (ore motore, chilometri) e posizione GPS per ogni sensore. Tre consumer leggono lo stesso topic, ognuno con una responsabilita' diversa:

* **consumer-current**: mantiene in memoria l'ultimo stato noto di ogni sensore
* **consumer-usage**: calcola i delta di utilizzo tra messaggi consecutivi e li salva su MongoDB
* **consumer-query**: interroga MongoDB per esporre riepiloghi di utilizzo

Ogni consumer ha una strategia di recovery diversa perche' il suo stato ha proprieta' diverse. La scelta di `auto.offset.reset` non e' una preferenza: e' una conseguenza diretta della natura dello stato.

```
Topic "sensor-data"
├── consumer-current  (in-memory, idempotente)    → earliest
├── consumer-usage    (MongoDB, additivo)          → latest
└── consumer-query    (stateless, solo query)      → nessun consumer Kafka
```

## Strategia 1: replay completo

Il consumer-current mantiene un dizionario in memoria con l'ultimo messaggio ricevuto per ogni sensore. Non ha database, non ha persistenza. Quando crasha, perde tutto.

La strategia di recovery e' semplice: riconsuma l'intero topic dall'inizio. Ad ogni restart il consumer genera un nuovo `group.id` casuale, cosi' Kafka non ha offset committati da cui riprendere, e `auto.offset.reset=earliest` forza la lettura dalla prima posizione disponibile.

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

L'operazione di ricostruzione e' un overwrite puro per chiave. Se un sensore ha prodotto 1000 messaggi, il consumer li rilegge tutti, ma solo l'ultimo sopravvive nel dizionario. Il risultato finale e' identico indipendentemente da quante volte si ripete il processo: l'operazione e' **idempotente**.

Un dettaglio importante: `enable.auto.commit` e' impostato a `false`. Il consumer non committa mai gli offset perche' non ne ha bisogno. Ad ogni restart genera un `group.id` nuovo, quindi Kafka non ha offset precedenti da cui riprendere. Committarli sarebbe inutile e aggiungerebbe complessita' senza beneficio.

Il trade-off e' lo startup time. Con 10 sensori e un topic di poche migliaia di messaggi, la ricostruzione richiede pochi secondi. Con milioni di messaggi la situazione cambia, e a quel punto servirebbero approcci diversi: la [log compaction](https://kafka.apache.org/documentation/#compaction) di Kafka, che elimina i messaggi obsoleti mantenendo solo l'ultimo per ogni chiave, ridurrebbe il volume da rileggere in modo significativo. In alternativa, snapshot periodici dello stato su disco consentirebbero di ripartire da un punto intermedio. Nel contesto della demo, il replay completo e' sufficiente.

## Strategia 2: checkpoint e skip

Il consumer-usage ha un compito diverso: calcola i delta di utilizzo tra messaggi consecutivi dello stesso sensore. Se il sensore aveva 100 ore motore nel messaggio precedente e 102 nel messaggio corrente, il delta e' 2 ore. Questi delta vengono salvati su MongoDB come record individuali.

Questa operazione e' **additiva**: ogni messaggio produce un nuovo record che si somma ai precedenti. Riconsumando il topic dall'inizio, ogni delta verrebbe calcolato e inserito una seconda volta, raddoppiando i valori aggregati.

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

Da notare la differenza nella gestione del `group.id` rispetto al consumer-current. Qui il `group.id` e' fisso (`"demo-usage"`), il che permette a Kafka di ricordare l'ultimo offset committato. Quando il consumer riparte, Kafka lo posiziona dove si era fermato. Se invece il `group.id` non avesse offset salvati (primo avvio, o offset scaduto per retention), `auto.offset.reset=latest` garantisce che il consumer inizi a leggere solo i messaggi futuri, senza toccare la storia.

Il trade-off di questa strategia e' il rischio di perdita dati. Esiste una finestra tra l'ultimo messaggio processato e il crash in cui il checkpoint potrebbe non essere stato salvato. In pratica, con messaggi ogni 5 secondi, si rischia di perdere al massimo un delta per sensore. In un contesto di telemetria industriale, dove i delta vengono aggregati su base giornaliera, la perdita e' trascurabile.

C'e' anche un rischio piu' sottile: il checkpoint e il salvataggio del delta non sono in una transazione atomica. Se il consumer crasha dopo aver inserito il delta ma prima di aggiornare il checkpoint, al restart calcolera' di nuovo lo stesso delta con il messaggio successivo, producendo un valore leggermente diverso (perche' il riferimento e' il checkpoint vecchio, non quello che sarebbe stato aggiornato). In pratica, l'errore introdotto e' dell'ordine di un singolo intervallo di polling, ma e' un fatto da conoscere.

## Strategia 3: nessun recovery necessario

Il consumer-query non consuma da Kafka. E' un servizio di pura lettura che interroga MongoDB con una pipeline di aggregazione:

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

Se crasha, riparte e ricomincia a rispondere. Non c'e' stato da ricostruire, non ci sono offset da gestire. L'unica dipendenza e' la disponibilita' di MongoDB.

La ragione per cui esiste come servizio separato e' l'isolamento: separare il carico delle query dal processo di ingest evita che un picco di letture interferisca con la scrittura dei delta. In un sistema con piu' consumer che scrivono e piu' client che leggono, questa separazione diventa rilevante.

## La regola

La scelta della strategia di recovery e' determinata dalla natura dello stato:

| Proprieta' dello stato | Strategia | `auto.offset.reset` |
|---|---|---|
| Idempotente (overwrite) | Replay completo | `earliest` |
| Additivo (accumulo) | Checkpoint + skip | `latest` |
| Nessuno (stateless) | Nessun recovery | Non applicabile |

`earliest` funziona quando rielaborare lo stesso messaggio due volte produce lo stesso risultato. `latest` e' necessario quando rielaborare un messaggio ne duplica l'effetto. Non e' una preferenza di configurazione: e' una conseguenza della semantica delle operazioni del consumer.

Questa regola si applica anche a scenari non coperti dalla demo. Un consumer che scrive su un database con upsert per chiave primaria e' idempotente: puo' usare `earliest`. Un consumer che invia notifiche e' additivo: un replay produrrebbe notifiche duplicate. Un consumer che alimenta un modello di machine learning con batch di training ha vincoli ancora diversi. In ogni caso, la domanda da porsi e': cosa succede se processo lo stesso messaggio due volte?

## Limiti dichiarati

La demo privilegia la chiarezza sulla robustezza. Alcuni limiti da tenere presenti in un contesto di produzione:

* **Nessun graceful shutdown**: i consumer usano `KeyboardInterrupt` come unico meccanismo di arresto. Non c'e' gestione di segnali SIGTERM, il che significa che Docker Compose uccide il processo dopo il timeout. In produzione servirebbe un signal handler che chiude il consumer e committa l'offset corrente.
* **Checkpoint e delta non atomici**: il consumer-usage esegue due scritture MongoDB separate (salvataggio delta e aggiornamento checkpoint) senza una transazione. Un crash tra le due operazioni puo' lasciare lo stato inconsistente. L'approccio e' accettabile per la demo perche' l'errore introdotto e' dell'ordine di un singolo intervallo di polling.
* **Health check assente**: nessuno dei container espone un endpoint di health. Docker non ha modo di sapere se un consumer e' bloccato in un poll infinito o se sta effettivamente processando messaggi. Un health check reale dovrebbe verificare l'avanzamento dell'offset.
* **Nessuna gestione del backpressure**: se MongoDB rallenta, il consumer-usage continua a leggere da Kafka alla stessa velocita', accumulando messaggi in memoria. In produzione servirebbe un meccanismo di flow control.

## Demo

Il codice completo e' disponibile come progetto Docker Compose con producer simulato, tre consumer e uno script di test che simula crash e recovery.

* **Repository**: [github.com/monte97/kafka-crash-recovery-demo](https://github.com/monte97/kafka-crash-recovery-demo)

Per avviare la demo:

```bash
docker compose up -d
./demo.sh  # simula crash e verifica recovery
```

## Risorse utili

* **Documentazione Kafka, consumer configuration**: [kafka.apache.org/documentation/#consumerconfigs](https://kafka.apache.org/documentation/#consumerconfigs)
* **confluent-kafka-python**: [docs.confluent.io/kafka-clients/python](https://docs.confluent.io/kafka-clients/python/current/overview.html)
