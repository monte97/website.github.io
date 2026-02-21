# Review Summary — kafka-01-intro

**Tech: 8/10 | Style: 8/10**

## Top findings

### Tech (P1)
1. `batch.size` e `createPartitioner` non sono opzioni kafkajs per batching — il metodo corretto è `producer.sendBatch()`.
2. kafkajs non mantenuto dal 2023 — serve disclaimer o suggerimento migrazione a `@confluentinc/kafka-javascript`.
3. Sticky Partitioner: evoluzione post-2.4 (deprecato in 3.3, KIP-794) non menzionata.
4. `acks=1` come "default fino a Kafka 2.x" è ambiguo — specificare "fino a 2.8".

### Style (minor)
1. Code block producer (~47 righe) e consumer (~51 righe) oltre il limite di 30-40.
2. Link alla documentazione Kafka mancante nella sezione replicazione.
