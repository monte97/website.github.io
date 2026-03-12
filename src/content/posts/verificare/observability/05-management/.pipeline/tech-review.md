# Tech Review — 05-management

**Score: 8/10**

## Errori (P0 — fattuali)

Nessuno.

## Imprecisioni (P1 — fuorvianti)

1. **Tail sampling policy evaluation** (riga ~140): "Le policy vengono valutate indipendentemente: se almeno una policy decide di mantenere la trace, questa viene mantenuta" — corretto, ma vale la pena specificare che la `probabilistic` policy campiona indipendentemente, quindi una trace senza errori e con latenza normale ha comunque il 10% di probabilita' di essere mantenuta dalla probabilistic policy. Il lettore potrebbe pensare che le policy siano mutuamente esclusive.

2. **`num_traces: 50000`** (riga ~148): Questo parametro controlla il numero massimo di trace in memoria durante il decision_wait. Se il traffico supera questo limite, il Collector inizia a prendere decisioni premature (prima che la trace sia completa). Sarebbe utile menzionare come dimensionarlo: `expected_new_traces_per_sec * decision_wait_seconds`.

## Note minori (P2)

1. **Costo storage S3** (riga ~603): $0.023/GB e' il prezzo S3 Standard us-east-1. In EU il prezzo e' leggermente diverso (~$0.024/GB). Per un blog italiano potrebbe essere piu' rilevante citare il prezzo EU.

2. **Metriche Collector** (riga ~404): `otelcol_processor_tail_sampling_global_count_traces_sampled_total` — nome corretto, ma il suffisso `_total` viene aggiunto dall'endpoint Prometheus. Il nome interno nel Collector e' senza `_total`. Chiarito nella nota successiva ma potrebbe confondere.

3. **Cardinality explosion** (riga ~525-526): Il calcolo "12.5M × 1 sample/sec × ~2 bytes = 25 MB/sec ≈ 2 TB/giorno" assume 1 sample/sec per ogni time series. In pratica il default scrape interval di Prometheus e' 15s, quindi il volume reale sarebbe ~130 GB/giorno. Il calcolo e' conservativo in eccesso, non un errore, ma vale la pena notare.

4. **Alert `OtelCollectorBackpressure`** (riga ~447): "Queue size > 5000 per 5m" — la metrica di queue size dipende dalla configurazione dell'exporter (sending_queue). Verificare che il threshold sia coerente con la config demo.

## Punti di forza

- Struttura eccellente: problema → soluzione → verifica → monitoring → costi
- La sezione "steady state" e' molto chiara con i diagrammi before/after
- Alert rules ben progettate con due gruppi logici
- Checklist finale pratica e azionabile
- Confronto costi a 12 mesi molto efficace per CTO/decision maker
