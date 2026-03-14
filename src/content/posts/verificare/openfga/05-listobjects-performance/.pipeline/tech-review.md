# Tech Review — 05-listobjects-performance

**Score: 7/10**

---

## Problemi rilevati

### P1 — `client.keys()` bloccante in Redis (CORRETTO)

**Posizione**: `services/fga-redis-cache.js`, funzione `invalidateUser`

**Problema**: L'implementazione originale usava `client.keys(pattern)`, che è un comando Redis bloccante O(N). Su store con migliaia di chiavi blocca il server Redis per tutta la durata della scansione, causando latenza a raffica su tutti gli altri client. Il commento avvertiva del problema ma non mostrava l'alternativa corretta.

**Correzione applicata**: Sostituita con un loop `SCAN` con cursor. La spiegazione in prosa è stata aggiornata per essere più precisa: descrive sia il problema che le due alternative (SCAN vs set dedicato).

---

### P1 — Campo errato in `rematerializeDocument` (CORRETTO)

**Posizione**: `services/access-materializer.js`, funzione `rematerializeDocument`

**Problema**: Il codice inseriva `u.object.id` come `user_id` nel read model. Nella risposta di OpenFGA `listUsers`, gli utenti sono restituiti nel campo `users`, che contiene oggetti con struttura `{ user: { type, id } }`. Il campo corretto è `u.user.id`, non `u.object.id`. Con `u.object.id` undefined, la query INSERT avrebbe inserito `null` come `user_id`.

**Correzione applicata**: `u.object.id` → `u.user.id`.

**Riferimento API**: [OpenFGA ListUsers](https://openfga.dev/docs/interacting/relationship-queries#listusers)

---

### P2 — Typo "distribuizione" (CORRETTO)

**Posizione**: Sezione Monitoring, commento alla metrica `fga_list_objects_result_size`

**Problema**: Typo: "distribuizione" invece di "distribuzione".

**Correzione applicata**: Typo corretto.

---

## Punti corretti (nessuna modifica necessaria)

- **Modello di caching in-memory**: implementazione corretta. TTL, invalidazione per prefisso, e singleton `export default new FGACache(60)` sono pattern validi.
- **BatchCheck API**: l'uso di `correlation_id` è corretto per OpenFGA v1 API. Il mapping `results[correlationId].allowed` è conforme alla specifica.
- **`listUsers` per rematerializzazione**: scelta corretta per ottenere tutti gli utenti con accesso a un oggetto. Alternativa valida sarebbe `ReadTuples` + risoluzione locale, ma `listUsers` è più semplice e corretto per questo pattern.
- **Redis pub/sub per broadcast**: pattern corretto per invalidazione cross-istanza. L'uso di due connessioni separate (publisher/subscriber) è la pratica raccomandata con ioredis.
- **Latency numbers**: 5-15ms per dataset piccoli, 200-500ms per 50k documenti con gerarchie a 4 livelli — plausibili per un'istanza OpenFGA con storage Postgres, non esagerati.
- **Tabella di comparazione** (caching vs pre-materializzazione): accurata e utile.
- **Prometheus Histogram con buckets espliciti**: corretti per latenze nell'ordine dei ms.

---

## Note per versioni future

- La `FGACache` in-memory non ha un meccanismo di eviction per dimensione massima. Su sistemi con molti utenti attivi contemporaneamente, la Map può crescere illimitatamente. Da aggiungere in una versione più robusta (es. LRU con `lru-cache`).
- `rematerializeDocument` fa N INSERT separati in un loop. Per documenti con molti viewer, sarebbe più efficiente un `INSERT ... VALUES` parametrizzato con un singolo statement.
