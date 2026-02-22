# Review Summary — kafka-pekko-streams

**Tech: 7/10 | Style: 8/10**

## Top findings

### Tech (P0)
1. `producer.send()` dentro `.map()` blocca il materializer thread e swallow errori silenziosamente — contraddice la premessa dell'articolo. Usare `mapAsync` o `Producer.flexiFlow`.
2. Claim backpressure per `Source.queue` con `dropHead` impreciso — `dropHead` e' load shedding, non backpressure.

### Tech (P1)
3. Race condition in `EnrichmentState` sottostimata (lost update, non "last timestamp wins").
4. Risultato `queue.offer()` ignorato.
5. Nessun graceful shutdown per consumer thread.
6. Nessun error handling nei consumer thread.

### Style (major)
1. Blocco output demo senza tag `text`.

### Style (minor)
2. Description corta (106 chars).
3. Code block Pattern 2 troppo lungo (~57 righe).
