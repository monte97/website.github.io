# Tech Review — 05-kafka-crash-recovery-strategie

**Score: 9/10**
**Data review: 2026-03-14**

---

## Valutazione Generale

L'articolo e' tecnicamente corretto e ben fondato. Le tre strategie di recovery sono descritte con accuratezza e i trade-off sono dichiarati esplicitamente. Il codice Python con `confluent-kafka-python` e' coerente con l'API reale della libreria.

---

## Problemi Trovati

### P2 — Auto-commit e at-least-once delivery

**Sezione**: Strategia 2, configurazione consumer-usage

L'articolo usa `enable.auto.commit: "true"` per consumer-usage senza menzionare la finestra di rischio specifica: con auto-commit, Kafka committa l'offset al successivo `poll()`, non al completamento del processing. Se il consumer crasha dopo il poll ma prima di salvare il delta e il checkpoint, l'offset viene comunque committato (da Kafka, al timeout di auto-commit o al poll successivo). Questo significa che il messaggio potrebbe essere perso senza che il checkpoint venga aggiornato.

L'articolo discute correttamente il rischio di non-atomicita' tra delta e checkpoint (linea 144), ma non distingue il contributo specifico di auto-commit a questo scenario.

**Impatto**: L'omissione e' accettabile nel contesto della demo — il rischio e' gia' coperto dal paragrafo sui limiti dichiarati. In un articolo di produzione andrebbe disambiguato.

**Suggerimento**: Aggiungere una nota che con `enable.auto.commit=true` l'offset puo' essere committato prima che il processing sia completato, il che amplifica la finestra di perdita dati gia' identificata. In produzione si userebbe `enable.auto.commit=false` con commit manuale dopo il salvataggio del checkpoint.

---

## Conferme di Correttezza

- `auto.offset.reset=earliest` con `group.id` casuale: corretto. Senza offset committati, Kafka va all'inizio del topic.
- `auto.offset.reset=latest` con `group.id` fisso: corretto. Se gli offset sono validi Kafka li usa; se non esistono (primo avvio, offset scaduti per retention) parte dalla fine.
- Log compaction: correttamente descritta come meccanismo che mantiene solo l'ultimo valore per chiave.
- Pipeline di aggregazione MongoDB: sintassi `$group`, `$sum`, `$sort` corretta.
- Calcolo delta (`current - previous`): logica corretta per valori cumulativi odometrici.
- Il naming `consumer-query` come servizio stateless che non consuma Kafka e' una scelta progettuale valida e dichiarata.

---

## Note

L'articolo e' parte di una serie (seriesOrder: 50). I riferimenti impliciti a concetti precedenti (topic, partition, offset) sono appropriati per il livello della serie.
