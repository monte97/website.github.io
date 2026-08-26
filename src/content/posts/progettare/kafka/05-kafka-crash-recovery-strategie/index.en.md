---
title: "Kafka Crash Recovery: Three Strategies for Three Types of State"
seoTitle: "Kafka: three crash recovery strategies"
date: 2026-03-02T09:00:00.000Z
description: "Full replay, checkpoint-and-skip, or no recovery at all: which one fits depends on whether the consumer state is idempotent, additive or absent."
pillar: progettare
category: kafka
tags:
  - Kafka
  - Python
  - Recovery
  - Consumer
lang: en
series: kafka
seriesOrder: 50
reviewed: machine
---

A Kafka consumer crashes. What happens to the data it was processing? The answer does not depend on Kafka — it depends on the type of state the consumer maintains. An idempotent consumer can restart from the beginning of the topic with no consequences. A consumer that accumulates deltas cannot afford to do the same: it would recount values already recorded. A stateless consumer has nothing to recover.

Three concrete recovery strategies, drawn from an industrial IoT platform where a single Kafka topic feeds three independent consumers, each with different properties of internal state.

## Context: one topic, three consumers

The system is a telemetry platform for construction machinery. A producer periodically publishes messages to a Kafka topic containing odometric data (engine hours, kilometers) and GPS position for each sensor. Three consumers read the same topic, each with a different responsibility:

- **consumer-current**: keeps in memory the last known state of each sensor
- **consumer-usage**: computes usage deltas between consecutive messages and saves them to MongoDB
- **consumer-query**: queries MongoDB to expose usage summaries

Each consumer has a different recovery strategy because its state has different properties. The choice of `auto.offset.reset` is not a preference — it is a direct consequence of the nature of the state.

```
Topic "sensor-data"
├── consumer-current  (in-memory, idempotent)    → earliest
├── consumer-usage    (MongoDB, additive)         → latest
└── consumer-query    (stateless, query only)     → no Kafka consumer
```

## Strategy 1: full replay

consumer-current maintains an in-memory dictionary with the last message received for each sensor. It has no database, no persistence. When it crashes, everything is lost.

The recovery strategy is straightforward: re-consume the entire topic from the beginning. On every restart the consumer generates a new random `group.id`, so Kafka has no previously committed offsets to resume from, and `auto.offset.reset=earliest` forces reading from the first available position.

```python
# consumer-current/consumer.py
GROUP_ID = f"demo-current-{uuid.uuid4().hex[:8]}"  # new on every restart

state = {}  # in-memory dict, lost on crash

consumer = Consumer({
    "bootstrap.servers": BROKER,
    "group.id": GROUP_ID,
    "auto.offset.reset": "earliest",     # start from the beginning of the topic
    "enable.auto.commit": "false",       # offsets are irrelevant, no need to commit
})
consumer.subscribe([TOPIC])

while True:
    msg = consumer.poll(timeout=1.0)
    if msg is None:
        continue
    # ...error handling omitted...
    value = json.loads(msg.value().decode("utf-8"))
    key = msg.key().decode("utf-8")
    state[key] = value  # overwrite: the latest value always wins
```

The reconstruction operation is a pure overwrite per key. If a sensor produced 1000 messages, the consumer re-reads all of them, but only the last one survives in the dictionary. The final result is identical regardless of how many times the process is repeated — the operation is **idempotent**.

One important detail: `enable.auto.commit` is set to `false`. The consumer never commits offsets because it does not need to. On every restart it generates a new `group.id`, so Kafka has no previous offsets to resume from. Committing them would be pointless and would add complexity without benefit.

The trade-off is startup time. With 10 sensors and a topic containing a few thousand messages, reconstruction takes a few seconds. With millions of messages the picture changes, and at that point different approaches would be needed. Kafka's [log compaction](https://kafka.apache.org/documentation/#compaction), which removes obsolete messages while keeping only the latest per key, would significantly reduce the volume to re-read. Alternatively, periodic snapshots of the state to disk would allow restarting from an intermediate point. For this demo, full replay is sufficient.

## Strategy 2: checkpoint and skip

consumer-usage has a different task: it computes usage deltas between consecutive messages from the same sensor. If the sensor had 100 engine hours in the previous message and 102 in the current one, the delta is 2 hours. These deltas are saved to MongoDB as individual records.

This operation is **additive**: each message produces a new record that accumulates on top of the previous ones. Re-consuming the topic from the beginning would compute and insert each delta a second time, doubling the aggregated values.

The recovery strategy uses two mechanisms: a MongoDB checkpoint of the last state seen for each sensor, and `auto.offset.reset=latest` to skip history and resume only from new messages.

```python
# consumer-usage/consumer.py - checkpoint loading
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

On restart the consumer loads checkpoints from MongoDB, obtaining the last known state for each sensor. It then begins consuming only new messages:

```python
# consumer-usage/consumer.py - configuration and loop
last_state = load_state(state_col)  # load checkpoints from MongoDB

consumer = Consumer({
    "bootstrap.servers": BROKER,
    "group.id": GROUP_ID,              # fixed: Kafka remembers the offset
    "auto.offset.reset": "latest",     # skip history
    "enable.auto.commit": "true",
})

# inside the consume loop:
if key in last_state:
    delta = compute_delta(last_state[key], value)
    if delta["delta_hours"] > 0 or delta["delta_km"] > 0:
        save_usage(usage_col, delta)   # additive record to MongoDB

last_state[key] = value
save_checkpoint(state_col, key, value)  # update checkpoint
```

The delta calculation compares the current message against the previous checkpoint:

```python
# consumer-usage/consumer.py - delta calculation
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

Note the difference in `group.id` handling compared to consumer-current. Here the `group.id` is fixed (`"demo-usage"`), which allows Kafka to remember the last committed offset. When the consumer restarts, Kafka positions it where it left off. If the `group.id` has no saved offsets (first start, or offsets expired due to retention), `auto.offset.reset=latest` ensures the consumer starts reading only future messages, without touching history.

The trade-off of this strategy is the risk of data loss. There is a window between the last processed message and the crash during which the checkpoint may not have been saved. In practice, with messages every 5 seconds, the maximum exposure is one delta per sensor. In an industrial telemetry context where deltas are aggregated on a daily basis, the loss is negligible.

There is also a subtler risk: the checkpoint save and the delta insert are not in an atomic transaction. If the consumer crashes after inserting the delta but before updating the checkpoint, on restart it will recompute a slightly different delta from the next message (because the reference is the old checkpoint, not the one that would have been updated). In practice the error introduced is on the order of a single polling interval, but it is a fact worth knowing.

## Strategy 3: no recovery needed

consumer-query does not consume from Kafka. It is a pure read service that queries MongoDB with an aggregation pipeline:

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

If it crashes, it restarts and resumes answering queries. There is no state to reconstruct, no offsets to manage. The only dependency is MongoDB availability.

The reason it exists as a separate service is isolation: separating query load from the ingest process prevents a burst of reads from interfering with delta writes. In a system with multiple consumers writing and multiple clients reading, this separation becomes significant.

## The rule

The choice of recovery strategy is determined by the nature of the state:

| State property | Strategy | `auto.offset.reset` |
|---|---|---|
| Idempotent (overwrite) | Full replay | `earliest` |
| Additive (accumulate) | Checkpoint + skip | `latest` |
| None (stateless) | No recovery | Not applicable |

`earliest` works when reprocessing the same message twice produces the same result. `latest` is required when reprocessing a message duplicates its effect. This is not a configuration preference — it is a consequence of the consumer's operation semantics.

This rule applies to scenarios beyond those covered by the demo. A consumer that writes to a database with upsert on primary key is idempotent: it can use `earliest`. A consumer that sends notifications is additive: a replay would produce duplicate notifications. A consumer that feeds a machine learning model with training batches has yet different constraints. In every case, the question to ask is: what happens if I process the same message twice?

## Declared limitations

The demo prioritizes clarity over robustness. Some limitations to keep in mind for a production context:

- **No graceful shutdown**: the consumers use `KeyboardInterrupt` as the only stop mechanism. There is no SIGTERM signal handling, which means Docker Compose kills the process after the timeout. In production a signal handler would be needed to close the consumer and commit the current offset.
- **Checkpoint and delta not atomic**: consumer-usage performs two separate MongoDB writes (delta save and checkpoint update) without a transaction. A crash between the two operations can leave state inconsistent. The approach is acceptable for the demo because the introduced error is on the order of a single polling interval.
- **No health check**: none of the containers expose a health endpoint. Docker has no way to know whether a consumer is stuck in an infinite poll or actually processing messages. A proper health check should verify offset progress.
- **No backpressure handling**: if MongoDB slows down, consumer-usage continues reading from Kafka at the same rate, accumulating messages in memory. In production a flow control mechanism would be needed.

## Demo

The complete code is available as a Docker Compose project with a simulated producer, three consumers, and a test script that simulates crashes and recovery.

- **Repository**: [github.com/monte97/kafka-crash-recovery-demo](https://github.com/monte97/kafka-crash-recovery-demo)

To run the demo:

```bash
docker compose up -d
./demo.sh  # simulates a crash and verifies recovery
```

## Useful Resources

- **Kafka documentation, consumer configuration**: [kafka.apache.org/documentation/#consumerconfigs](https://kafka.apache.org/documentation/#consumerconfigs)
- **confluent-kafka-python**: [docs.confluent.io/kafka-clients/python](https://docs.confluent.io/kafka-clients/python/current/overview.html)
