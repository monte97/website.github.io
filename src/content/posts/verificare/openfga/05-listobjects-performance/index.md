---
title: "ListObjects in Produzione: Caching, Pre-materializzazione e BatchCheck"
seoTitle: "OpenFGA: ListObjects, caching e invalidazione"
date: 2026-05-02T09:00:00.000Z
description: "Caching, read model pre-materializzato e BatchCheck per risolvere il collo di bottiglia di ListObjects in OpenFGA, con strategie di invalidazione."
pillar: verificare
category: openfga
tags:
  - OpenFGA
  - Performance
  - ReBAC
  - Caching
  - Authorization
lang: it
draft: false
reviewed: false
series: openfga
seriesOrder: 50
reproducibility: true
summary:
  - label: "Problema"
    value: "ListObjects scala con il numero di oggetti: da 5-15ms a 200-500ms"
    note: "Da qualche centinaio di documenti a 50.000 con gerarchie a 4 livelli"
  - label: "Scelta"
    value: "Cache con TTL, pre-materializzazione o BatchCheck secondo il pattern di accesso"
    note: "Non sono mutualmente esclusive: in produzione si usano in combinazione"
  - label: "Costo reale"
    value: "Una cache senza invalidazione corretta è pericolosa in autorizzazione"
    note: "Lo spostamento di un documento cambia la tupla parent senza toccare la cache di chi lo vedeva"
  - label: "Risultato"
    value: "VaultDrive sceglie fast path, cache TTL 60 secondi e invalidazione on-write"
openItems:
  - "L'invalidazione a cascata dipende dalla frequenza degli spostamenti: broadcast via pub/sub se sono rari, TTL basso o niente cache se sono frequenti"
  - "La pre-materializzazione offre le query più veloci ma introduce overhead sui write e consistenza eventuale: non conviene quando le tuple cambiano più spesso di quanto la lista venga letta"
  - "BatchCheck non sostituisce ListObjects: risponde su candidati già noti, come i risultati di una ricerca, non sull'intero store"
openNote: "Il prezzo di ogni strategia emerge quando i permessi devono cambiare subito."
mode: explanation
---

Nell'[articolo precedente](/blog/verificare/openfga/04-gerarchie-query/) abbiamo visto il pattern fast/slow path: usare un JOIN SQL per i casi comuni (accesso derivato dall'organizzazione) e ListObjects solo per le condivisioni dirette. È una buona euristica. Ma non è sempre sufficiente.

Sistemi con milioni di documenti, gerarchie profonde, o molte condivisioni peer-to-peer vedono ListObjects diventare il collo di bottiglia primario. Questo articolo affronta il problema con tre strategie: caching del risultato, pre-materializzazione del grafo di accesso, e BatchCheck come alternativa per certi pattern. Non sono mutualmente esclusive: in produzione si usano in combinazione.

---

## Perché ListObjects è costoso

ListObjects risolve una domanda inversa: dato un utente e un tipo, quali oggetti sono accessibili? Per rispondere, OpenFGA deve attraversare il grafo delle relazioni per ogni oggetto del tipo richiesto nello store.

Il costo cresce con tre variabili:

- **Fan-out**: quante tuple di tipo `parent` e `member from org` devono essere seguite per ogni oggetto. Un documento in una gerarchia a 5 livelli richiede 5 hop per ogni check.
- **Numero di oggetti**: se ci sono 100.000 documenti nello store, OpenFGA deve valutare (almeno parzialmente) 100.000 cammini. Internamente applica ottimizzazioni, ma il bound superiore è proporzionale alla cardinalità.
- **Condivisioni dirette**: ogni tupla `user:alice viewer document:X` è un caso da valutare separatamente.

In [VaultDrive](https://github.com/monte97/VaultDrive) — la demo che ho costruito per questa serie — con pochi utenti e qualche centinaio di documenti la latenza di ListObjects è nell'ordine dei 5-15ms. Con 50.000 documenti e gerarchie a 4 livelli, si sale facilmente a 200-500ms. Non è un problema di OpenFGA in sé: è la natura del problema che si sta risolvendo.

La soluzione non è evitare ListObjects. È non chiamarla quando il risultato è già noto.

---

## Strategia 1: Caching del risultato

La cache più semplice è in-memory, per singola istanza applicativa. Funziona bene per sistemi con un numero contenuto di utenti attivi contemporaneamente e un pattern di accesso read-heavy.

### Cache in-memory con TTL

```javascript
// services/fga-cache.js
class FGACache {
  constructor(ttlSeconds = 60) {
    this.cache = new Map();
    this.ttl = ttlSeconds * 1000;
  }

  _key(userId, relation, type) {
    return `${userId}:${relation}:${type}`;
  }

  get(userId, relation, type) {
    const key = this._key(userId, relation, type);
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.objects;
  }

  set(userId, relation, type, objects) {
    const key = this._key(userId, relation, type);
    this.cache.set(key, {
      objects,
      expiresAt: Date.now() + this.ttl,
    });
  }

  invalidate(userId) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.cache.delete(key);
      }
    }
  }
}

export default new FGACache(60); // TTL 60 secondi
```

Integrazione nel layer che chiama ListObjects:

```javascript
// services/openfga.js
import fgaCache from './fga-cache.js';

async function listAccessibleObjects(userId, relation, type) {
  // 1. Controlla la cache
  const cached = fgaCache.get(userId, relation, type);
  if (cached) {
    return cached;
  }

  // 2. Chiama OpenFGA
  const response = await fgaClient.listObjects({
    user: `user:${userId}`,
    relation,
    type,
  });

  const objects = response.objects.map(o => o.replace(`${type}:`, ''));

  // 3. Salva in cache
  fgaCache.set(userId, relation, type, objects);

  return objects;
}
```

Il TTL da usare dipende dal pattern di utilizzo:

| Scenario | TTL consigliato |
|----------|----------------|
| Dashboard read-heavy, permessi stabili | 5-10 minuti |
| Condivisioni frequenti peer-to-peer | 30-60 secondi |
| Permessi critici (es. dati finanziari) | 0 (nessuna cache) |

### Cache distribuita con Redis

In-memory non scala su più istanze applicative: ogni istanza ha la propria cache, e un'invalidazione su un'istanza non raggiunge le altre. Se hai più pod in Kubernetes, serve Redis.

```javascript
// services/fga-redis-cache.js
import Redis from 'ioredis';
const client = new Redis(process.env.REDIS_URL);

const TTL = 60; // secondi

export async function getFromCache(userId, relation, type) {
  const key = `fga:${userId}:${relation}:${type}`;
  const value = await client.get(key);
  return value ? JSON.parse(value) : null;
}

export async function setInCache(userId, relation, type, objects) {
  const key = `fga:${userId}:${relation}:${type}`;
  await client.setex(key, TTL, JSON.stringify(objects));
}

export async function invalidateUser(userId) {
  // SCAN con cursor -- non usare KEYS in produzione (bloccante)
  const pattern = `fga:${userId}:*`;
  const keys = [];
  let cursor = '0';
  do {
    const [nextCursor, found] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    keys.push(...found);
  } while (cursor !== '0');
  if (keys.length > 0) {
    await client.del(...keys);
  }
}
```

Su Redis in produzione, `KEYS` è bloccante e blocca il server per tutta la durata della scansione. Il codice sopra usa `SCAN` con cursor, che itera incrementalmente senza bloccare. In alternativa, mantieni un set Redis dedicato per tracciare le chiavi per utente e aggiornalo ad ogni scrittura.

---

## Invalidazione: il problema vero

Una cache senza invalidazione corretta è pericolosa in un sistema di autorizzazione. Se Alice revoca l'accesso a Bob su un documento, Bob non deve continuare a vedere quel documento per 60 secondi.

Ci sono due momenti in cui la cache va invalidata:

### Invalidazione on-write

Ogni endpoint che scrive o cancella tuple deve invalidare le cache degli utenti coinvolti.

```javascript
// routes/folders.js
import { writeTuples, deleteTuples } from '../services/openfga.js';
import { invalidateUser } from '../services/fga-redis-cache.js';

router.post('/:folderId/share', authenticate, async (req, res) => {
  const { userId, relation } = req.body;
  const { folderId } = req.params;

  // Scrivi la tupla
  await writeTuples([
    { user: `user:${userId}`, relation, object: `folder:${folderId}` },
  ]);

  // Invalida la cache dell'utente a cui è stato dato accesso
  await invalidateUser(userId);

  res.json({ ok: true });
});

router.delete('/:folderId/share', authenticate, async (req, res) => {
  const { userId, relation } = req.body;
  const { folderId } = req.params;

  await deleteTuples([
    { user: `user:${userId}`, relation, object: `folder:${folderId}` },
  ]);

  // Invalida sia l'utente che perde l'accesso sia quello che lo revoca
  await invalidateUser(userId);
  await invalidateUser(req.user.sub);

  res.json({ ok: true });
});
```

### Invalidazione a cascata

Se Bob è viewer di `folder:projects` e Alice sposta `document:api-spec` fuori da quella cartella, cambia la tupla `parent` del documento -- ma la cache di Bob non viene toccata.

Questo è il caso più insidioso. La soluzione dipende dalla frequenza dell'operazione:

- **Spostamento raro**: invalida tutte le cache (broadcast di invalidazione via Redis pub/sub)
- **Spostamento frequente**: abbassa il TTL globale o non cachare ListObjects per quel tipo

```javascript
// Invalidazione broadcast via Redis pub/sub
import Redis from 'ioredis';

// publisher
const redisPublisher = new Redis(process.env.REDIS_URL);

export async function broadcastInvalidation(event) {
  await redisPublisher.publish('fga:invalidation', JSON.stringify(event));
}

// subscriber (ogni istanza applicativa)
const redisSubscriber = new Redis(process.env.REDIS_URL);
redisSubscriber.subscribe('fga:invalidation');
redisSubscriber.on('message', (channel, message) => {
  const event = JSON.parse(message);
  if (event.type === 'tuple_changed') {
    localCache.invalidateAll(); // svuota la cache in-memory locale
  }
});
```

---

## Strategia 2: Pre-materializzazione

Il caching riduce le chiamate a OpenFGA, ma non elimina la latenza alla prima miss. La pre-materializzazione cambia il modello: invece di calcolare l'accesso al momento della query, mantieni una tabella nel database applicativo che registra chi può vedere cosa.

### Read model

```sql
-- Tabella pre-materializzata: user_document_access
CREATE TABLE user_document_access (
  user_id    TEXT NOT NULL,
  document_id TEXT NOT NULL,
  relation   TEXT NOT NULL,  -- 'can_view', 'can_edit', 'owner'
  source     TEXT,           -- 'org', 'direct', 'folder'
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, document_id, relation)
);

CREATE INDEX idx_uda_user ON user_document_access(user_id);
CREATE INDEX idx_uda_document ON user_document_access(document_id);
```

Con questa tabella, la query "quali documenti può vedere alice?" diventa un semplice lookup:

```sql
SELECT document_id FROM user_document_access
WHERE user_id = 'alice'
AND relation = 'can_view';
```

Nessuna chiamata HTTP a OpenFGA, nessun grafo da attraversare.

### Aggiornamento event-driven

Il read model va mantenuto aggiornato quando cambiano le tuple. In VaultDrive, ogni operazione che modifica l'accesso emette un evento interno:

```javascript
// services/access-materializer.js
async function handleTupleChanged(event) {
  const { type, tuples } = event; // type: 'write' | 'delete'

  for (const tuple of tuples) {
    const [, userId] = tuple.user.split(':');
    const [objectType, objectId] = tuple.object.split(':');

    if (objectType === 'document') {
      await rematerializeDocument(objectId);
    } else if (objectType === 'folder') {
      // Una modifica alla folder può cambiare l'accesso a tutti i documenti sotto
      const docs = await getDocumentsInFolder(objectId); // ricorsivo
      for (const docId of docs) {
        await rematerializeDocument(docId);
      }
    } else if (objectType === 'org') {
      // Cambio di membership: aggiorna tutti i documenti dell'org
      await rematerializeOrg(userId, objectId);
    }
  }
}

async function rematerializeDocument(docId) {
  // Chiedi a OpenFGA chi ha accesso a questo documento
  const viewers = await fgaClient.listUsers({
    object: { type: 'document', id: docId },
    relation: 'can_view',
    userFilters: [{ type: 'user' }],
  });

  // Cancella le righe esistenti per questo documento
  await db.query('DELETE FROM user_document_access WHERE document_id = $1', [docId]);

  // Reinserisci con query parametrizzata
  for (const u of viewers.users) {
    await db.query(
      `INSERT INTO user_document_access (user_id, document_id, relation)
       VALUES ($1, $2, 'can_view')
       ON CONFLICT DO NOTHING`,
      [u.user.id, docId]
    );
  }
}
```

### Quando ha senso

La pre-materializzazione è la soluzione più performante per le query, ma ha un costo operativo:

| Aspetto | Caching | Pre-materializzazione |
|---------|---------|----------------------|
| Latenza query | Bassa (cache hit) / Alta (miss) | Sempre bassa |
| Latenza write | Nessuna | Overhead di rematerializzazione |
| Consistenza | Eventuale (TTL) | Eventuale (async) |
| Complessità | Bassa | Alta |
| Storage extra | RAM / Redis | PostgreSQL |
| Adatto per | Read-heavy con permessi stabili | Dashboard, search, listing |

La pre-materializzazione è la scelta giusta quando:

- La lista di documenti accessibili viene mostrata in ogni pagina (dashboard, sidebar)
- Il numero di utenti attivi è elevato e il TTL della cache genera troppi miss
- Hai bisogno di query SQL complesse sui documenti accessibili (es. `WHERE can_view AND category = 'finance' AND created_at > ...`)

Non vale la pena quando:
- Le tuple cambiano più spesso di quanto venga letta la lista
- Il numero di oggetti per tipo è piccolo (< qualche migliaio)
- L'accesso è granulare e imprevedibile

---

## Strategia 3: BatchCheck

ListObjects risponde alla domanda "quali oggetti può vedere l'utente?". BatchCheck risponde alla domanda inversa: "su questa lista di oggetti specifici, quali sono accessibili?". Non è la stessa cosa, ma per certi pattern è più efficiente.

Caso d'uso: hai già recuperato dal database un insieme di documenti (filtrati per categoria, data, testo) e vuoi sapere quali di questi l'utente può vedere. Non serve ListObjects -- sai già quali documenti valutare.

```javascript
// services/openfga.js
async function batchCheck(userId, relation, objects) {
  // OpenFGA BatchCheck (disponibile dall'API v1)
  const checks = objects.map(obj => ({
    tuple_key: {
      user: `user:${userId}`,
      relation,
      object: obj,
    },
    correlation_id: obj, // usato per mappare il risultato
  }));

  const response = await fetch(
    `${process.env.FGA_API_URL}/stores/${process.env.FGA_STORE_ID}/batch-check`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checks }),
    }
  );

  const data = await response.json();

  // Restituisce solo gli oggetti su cui il check è true
  return Object.entries(data.results)
    .filter(([, result]) => result.allowed)
    .map(([correlationId]) => correlationId);
}
```

Integrazione in una route con filtro pre-esistente:

```javascript
// Scenario: search full-text + filtro permessi
router.get('/search', authenticate, async (req, res) => {
  const { q } = req.query;
  const userId = req.user.sub;

  // 1. Full-text search nel database (Postgres FTS, Elasticsearch, Typesense...)
  const candidates = await db.query(
    `SELECT id FROM documents
     WHERE to_tsvector('italian', title || ' ' || content) @@ plainto_tsquery('italian', $1)
     LIMIT 100`,
    [q]
  );

  if (candidates.rows.length === 0) {
    return res.json([]);
  }

  // 2. BatchCheck: quali di questi l'utente può vedere?
  const docObjects = candidates.rows.map(r => `document:${r.id}`);
  const accessible = await batchCheck(userId, 'can_view', docObjects);

  // 3. Recupera i dettagli dei documenti accessibili
  const docIds = accessible.map(o => o.replace('document:', ''));
  const documents = await db.query(
    'SELECT * FROM documents WHERE id = ANY($1)',
    [docIds]
  );

  res.json(documents.rows);
});
```

BatchCheck è più efficiente di N chiamate Check sequenziali perché OpenFGA parallelizza la risoluzione internamente. È più prevedibile di ListObjects perché il numero di check è limitato dalla cardinalità dei candidati, non dall'intero store.

---

## Quale strategia per quale scenario

Non esiste una soluzione universale. La scelta dipende dal pattern di accesso dell'applicazione e dalla frequenza dei cambiamenti ai permessi.

| Scenario | Strategia consigliata |
|----------|----------------------|
| Dashboard "i miei documenti", permessi stabili | Cache Redis + TTL medio |
| Ricerca full-text con filtro permessi | BatchCheck sui candidati |
| Accesso ad alto throughput, permessi che cambiano raramente | Pre-materializzazione |
| Admin panel con visione d'insieme | ListObjects diretta (frequenza bassa) |
| API pubblica con SLA di latenza < 10ms | Pre-materializzazione |
| Prototipo / MVP | Fast path SQL + ListObjects senza cache |

In VaultDrive, la strategia scelta per l'MVP è:

1. **Fast path SQL** per i documenti dell'organizzazione (accesso strutturale, copre il caso comune senza OpenFGA)
2. **Cache in-memory con TTL 60s** per i risultati ListObjects sulle condivisioni dirette
3. **Invalidazione on-write** nei middleware di share/unshare

La pre-materializzazione è segnata come lavoro futuro per la versione con carico reale.

---

## Monitoring

Per tenere sotto controllo le performance di ListObjects, monitora queste metriche:

```javascript
// middleware/fga-metrics.js
import { Histogram } from 'prom-client';

const listObjectsLatency = new Histogram({
  name: 'fga_list_objects_duration_seconds',
  help: 'Latenza ListObjects OpenFGA',
  labelNames: ['type', 'cache_hit'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0],
});

const listObjectsResultSize = new Histogram({
  name: 'fga_list_objects_result_size',
  help: 'Numero di oggetti restituiti da ListObjects',
  labelNames: ['type'],
  buckets: [1, 10, 50, 100, 500, 1000, 5000],
});

async function instrumentedListObjects(userId, relation, type) {
  const cacheHit = !!fgaCache.get(userId, relation, type);
  const timer = listObjectsLatency.startTimer({ type, cache_hit: String(cacheHit) });

  try {
    const objects = await listAccessibleObjects(userId, relation, type);
    listObjectsResultSize.observe({ type }, objects.length);
    return objects;
  } finally {
    timer();
  }
}
```

Le metriche da guardare in fase di ottimizzazione:

- **`fga_list_objects_duration_seconds{cache_hit="false"}` P99** — latenza reale verso OpenFGA, senza cache
- **`fga_list_objects_result_size`** — distribuzione del numero di oggetti restituiti; code con risultati da 1000+ oggetti indicano che serve pre-materializzazione
- **Hit rate della cache** — se è sotto il 60-70%, il TTL è troppo basso o la chiave non è abbastanza specifica

---

## Riepilogo

Tre strumenti, tre problemi distinti:

**Caching** risolve la ripetizione: se lo stesso utente chiede la stessa lista a distanza di secondi, non serve ricalcolare. È la soluzione più semplice da aggiungere a un sistema esistente, con il rischio di visibilità ritardata sui cambiamenti di permesso.

**Pre-materializzazione** risolve la latenza: mantieni una tabella sempre aggiornata e le query di listing diventano semplici SELECT. È la soluzione giusta per sistemi ad alto throughput e dashboard con SLA stringenti. Il costo è la complessità dell'aggiornamento event-driven.

**BatchCheck** risolve il caso in cui hai già un sottoinsieme di candidati: non serve sapere tutti gli oggetti accessibili, solo quali di questi specifici lo sono. È la strategia naturale per ricerca + filtro permessi.

### Risorse

**Repository demo:**
- [VaultDrive su GitHub](https://github.com/monte97/VaultDrive)

**Documentazione OpenFGA:**
- [OpenFGA - Performance Guidance](https://openfga.dev/docs/interacting/performance-guidance)
- [OpenFGA - ListObjects API](https://openfga.dev/docs/interacting/relationship-queries#listobjects)
- [OpenFGA - BatchCheck API](https://openfga.dev/docs/interacting/relationship-queries#batch-check)
- [OpenFGA - ListUsers API](https://openfga.dev/docs/interacting/relationship-queries#listusers)

**Articoli della serie:**
- [Zanzibar per tutti: concetti e modello](/blog/verificare/openfga/01-zanzibar-concetti/)
- [OpenFGA + Keycloak](/blog/verificare/openfga/02-openfga-keycloak/)
- [Multitenancy con OpenFGA](/blog/verificare/openfga/03-multitenancy/)
- [Gerarchie profonde e ListObjects](/blog/verificare/openfga/04-gerarchie-query/)
