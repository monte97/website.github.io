---
title: "ListObjects in Production: Caching, Pre-materialization, and BatchCheck"
date: 2026-05-02T09:00:00.000Z
description: "Why ListObjects becomes the bottleneck in OpenFGA, and how to address it: Redis caching, pre-materialized read models, BatchCheck, and invalidation strategies."
pillar: verificare
category: openfga
tags:
  - OpenFGA
  - Performance
  - ReBAC
  - Caching
  - Authorization
series: openfga
seriesOrder: 50
lang: en
reviewed: machine
---

In the [previous article](/blog/verificare/openfga/04-gerarchie-query/) we introduced the fast/slow path pattern: use a SQL JOIN for common cases (organizationally-derived access) and ListObjects only for direct shares. It is a good heuristic. But it is not always enough.

Systems with millions of documents, deep hierarchies, or heavy peer-to-peer sharing see ListObjects become the primary bottleneck. This article addresses the problem with three strategies: result caching, access graph pre-materialization, and BatchCheck as an alternative for certain patterns. These strategies are not mutually exclusive — in production they are used in combination.

---

## Why ListObjects Is Expensive

ListObjects answers an inverse question: given a user and a type, which objects are accessible? To answer, OpenFGA must traverse the relationship graph for every object of the requested type in the store.

The cost grows with three variables:

- **Fan-out**: how many `parent` and `member from org` tuples must be followed for each object. A document five levels deep in a hierarchy requires five hops per check.
- **Number of objects**: if there are 100,000 documents in the store, OpenFGA must evaluate (at least partially) 100,000 paths. It applies internal optimizations, but the upper bound is proportional to cardinality.
- **Direct shares**: each `user:alice viewer document:X` tuple is a case to evaluate separately.

In [VaultDrive](https://github.com/monte97/VaultDrive) — the demo built for this series — with a handful of users and a few hundred documents, ListObjects latency is in the 5–15ms range. With 50,000 documents and four-level hierarchies, it easily climbs to 200–500ms. This is not a flaw in OpenFGA: it is the nature of the problem being solved.

The solution is not to avoid ListObjects. It is to avoid calling it when the result is already known.

---

## Strategy 1: Result Caching

The simplest cache is in-memory, per application instance. It works well for systems with a moderate number of concurrent active users and a read-heavy access pattern.

### In-Memory Cache with TTL

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

export default new FGACache(60); // TTL 60 seconds
```

Integration in the ListObjects layer:

```javascript
// services/openfga.js
import fgaCache from './fga-cache.js';

async function listAccessibleObjects(userId, relation, type) {
  // 1. Check the cache
  const cached = fgaCache.get(userId, relation, type);
  if (cached) {
    return cached;
  }

  // 2. Call OpenFGA
  const response = await fgaClient.listObjects({
    user: `user:${userId}`,
    relation,
    type,
  });

  const objects = response.objects.map(o => o.replace(`${type}:`, ''));

  // 3. Store in cache
  fgaCache.set(userId, relation, type, objects);

  return objects;
}
```

The appropriate TTL depends on the usage pattern:

| Scenario | Recommended TTL |
|----------|----------------|
| Read-heavy dashboard, stable permissions | 5–10 minutes |
| Frequent peer-to-peer sharing | 30–60 seconds |
| Critical permissions (e.g. financial data) | 0 (no cache) |

### Distributed Cache with Redis

In-memory caching does not scale across multiple application instances: each instance has its own cache, and an invalidation on one instance does not reach the others. With multiple pods in Kubernetes, Redis is needed.

```javascript
// services/fga-redis-cache.js
import Redis from 'ioredis';
const client = new Redis(process.env.REDIS_URL);

const TTL = 60; // seconds

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
  // SCAN with cursor — do not use KEYS in production (blocking)
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

In production Redis, `KEYS` is blocking and stalls the server for the entire duration of the scan. The code above uses `SCAN` with a cursor, which iterates incrementally without blocking. Alternatively, maintain a dedicated Redis set to track keys per user and update it on every write.

---

## Invalidation: The Real Problem

A cache without correct invalidation is dangerous in an authorization system. If Alice revokes Bob's access to a document, Bob must not continue to see that document for 60 seconds.

There are two moments when the cache must be invalidated.

### On-Write Invalidation

Every endpoint that writes or deletes tuples must invalidate the cache for the users involved.

```javascript
// routes/folders.js
import { writeTuples, deleteTuples } from '../services/openfga.js';
import { invalidateUser } from '../services/fga-redis-cache.js';

router.post('/:folderId/share', authenticate, async (req, res) => {
  const { userId, relation } = req.body;
  const { folderId } = req.params;

  // Write the tuple
  await writeTuples([
    { user: `user:${userId}`, relation, object: `folder:${folderId}` },
  ]);

  // Invalidate the cache of the user who gained access
  await invalidateUser(userId);

  res.json({ ok: true });
});

router.delete('/:folderId/share', authenticate, async (req, res) => {
  const { userId, relation } = req.body;
  const { folderId } = req.params;

  await deleteTuples([
    { user: `user:${userId}`, relation, object: `folder:${folderId}` },
  ]);

  // Invalidate both the user losing access and the one revoking it
  await invalidateUser(userId);
  await invalidateUser(req.user.sub);

  res.json({ ok: true });
});
```

### Cascading Invalidation

If Bob is a viewer of `folder:projects` and Alice moves `document:api-spec` out of that folder, the `parent` tuple of the document changes — but Bob's cache is not touched.

This is the trickiest case. The solution depends on how often the operation occurs:

- **Rare moves**: invalidate all caches (broadcast invalidation via Redis pub/sub)
- **Frequent moves**: lower the global TTL or do not cache ListObjects for that type

```javascript
// Broadcast invalidation via Redis pub/sub
import Redis from 'ioredis';

// publisher
const redisPublisher = new Redis(process.env.REDIS_URL);

export async function broadcastInvalidation(event) {
  await redisPublisher.publish('fga:invalidation', JSON.stringify(event));
}

// subscriber (each application instance)
const redisSubscriber = new Redis(process.env.REDIS_URL);
redisSubscriber.subscribe('fga:invalidation');
redisSubscriber.on('message', (channel, message) => {
  const event = JSON.parse(message);
  if (event.type === 'tuple_changed') {
    localCache.invalidateAll(); // clear the local in-memory cache
  }
});
```

---

## Strategy 2: Pre-materialization

Caching reduces calls to OpenFGA but does not eliminate latency on the first miss. Pre-materialization changes the model: instead of computing access at query time, maintain a table in the application database that records who can see what.

### Read Model

```sql
-- Pre-materialized table: user_document_access
CREATE TABLE user_document_access (
  user_id     TEXT NOT NULL,
  document_id TEXT NOT NULL,
  relation    TEXT NOT NULL,  -- 'can_view', 'can_edit', 'owner'
  source      TEXT,           -- 'org', 'direct', 'folder'
  updated_at  TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, document_id, relation)
);

CREATE INDEX idx_uda_user ON user_document_access(user_id);
CREATE INDEX idx_uda_document ON user_document_access(document_id);
```

With this table, the query "which documents can Alice see?" becomes a simple lookup:

```sql
SELECT document_id FROM user_document_access
WHERE user_id = 'alice'
AND relation = 'can_view';
```

No HTTP call to OpenFGA, no graph to traverse.

### Event-Driven Updates

The read model must be kept up to date when tuples change. In VaultDrive, every operation that modifies access emits an internal event:

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
      // A folder change can affect access to all documents below it
      const docs = await getDocumentsInFolder(objectId); // recursive
      for (const docId of docs) {
        await rematerializeDocument(docId);
      }
    } else if (objectType === 'org') {
      // Membership change: update all documents in the org
      await rematerializeOrg(userId, objectId);
    }
  }
}

async function rematerializeDocument(docId) {
  // Ask OpenFGA who has access to this document
  const viewers = await fgaClient.listUsers({
    object: { type: 'document', id: docId },
    relation: 'can_view',
    userFilters: [{ type: 'user' }],
  });

  // Delete existing rows for this document
  await db.query('DELETE FROM user_document_access WHERE document_id = $1', [docId]);

  // Re-insert with parameterized query
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

### When It Makes Sense

Pre-materialization is the most performant solution for queries, but carries an operational cost:

| Aspect | Caching | Pre-materialization |
|--------|---------|---------------------|
| Query latency | Low (cache hit) / High (miss) | Always low |
| Write latency | None | Rematerialization overhead |
| Consistency | Eventual (TTL) | Eventual (async) |
| Complexity | Low | High |
| Extra storage | RAM / Redis | PostgreSQL |
| Best for | Read-heavy with stable permissions | Dashboards, search, listing |

Pre-materialization is the right choice when:

- The list of accessible documents appears on every page (dashboard, sidebar)
- The number of active users is high and the cache TTL generates too many misses
- You need complex SQL queries on accessible documents (e.g. `WHERE can_view AND category = 'finance' AND created_at > ...`)

It is not worth it when:
- Tuples change more often than the list is read
- The number of objects per type is small (fewer than a few thousand)
- Access is granular and unpredictable

---

## Strategy 3: BatchCheck

ListObjects answers the question "which objects can the user see?". BatchCheck answers the inverse question: "out of this specific list of objects, which are accessible?" These are not the same question, but for certain patterns BatchCheck is more efficient.

Use case: you have already retrieved a set of documents from the database (filtered by category, date, full-text search) and want to know which of them the user can see. You do not need ListObjects — you already know which documents to evaluate.

```javascript
// services/openfga.js
async function batchCheck(userId, relation, objects) {
  // OpenFGA BatchCheck (available from API v1)
  const checks = objects.map(obj => ({
    tuple_key: {
      user: `user:${userId}`,
      relation,
      object: obj,
    },
    correlation_id: obj, // used to map the result back
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

  // Return only the objects where the check is true
  return Object.entries(data.results)
    .filter(([, result]) => result.allowed)
    .map(([correlationId]) => correlationId);
}
```

Integration in a route with a pre-existing filter:

```javascript
// Scenario: full-text search + permission filter
router.get('/search', authenticate, async (req, res) => {
  const { q } = req.query;
  const userId = req.user.sub;

  // 1. Full-text search in the database (Postgres FTS, Elasticsearch, Typesense...)
  const candidates = await db.query(
    `SELECT id FROM documents
     WHERE to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', $1)
     LIMIT 100`,
    [q]
  );

  if (candidates.rows.length === 0) {
    return res.json([]);
  }

  // 2. BatchCheck: which of these can the user see?
  const docObjects = candidates.rows.map(r => `document:${r.id}`);
  const accessible = await batchCheck(userId, 'can_view', docObjects);

  // 3. Fetch details for accessible documents
  const docIds = accessible.map(o => o.replace('document:', ''));
  const documents = await db.query(
    'SELECT * FROM documents WHERE id = ANY($1)',
    [docIds]
  );

  res.json(documents.rows);
});
```

BatchCheck is more efficient than N sequential Check calls because OpenFGA parallelizes resolution internally. It is more predictable than ListObjects because the number of checks is bounded by the number of candidates, not by the entire store.

---

## Choosing a Strategy

No universal solution exists. The choice depends on the application's access patterns and the frequency of permission changes.

| Scenario | Recommended strategy |
|----------|---------------------|
| "My documents" dashboard, stable permissions | Redis cache + medium TTL |
| Full-text search with permission filtering | BatchCheck on candidates |
| High-throughput access, rarely changing permissions | Pre-materialization |
| Admin panel with a broad overview | Direct ListObjects (low frequency) |
| Public API with < 10ms latency SLA | Pre-materialization |
| Prototype / MVP | Fast path SQL + ListObjects without cache |

In VaultDrive, the strategy chosen for the MVP is:

1. **SQL fast path** for organization documents (structural access, covers the common case without OpenFGA)
2. **In-memory cache with 60s TTL** for ListObjects results on direct shares
3. **On-write invalidation** in the share/unshare middleware

Pre-materialization is tracked as future work for the version handling real load.

---

## Monitoring

To keep ListObjects performance in check, monitor these metrics:

```javascript
// middleware/fga-metrics.js
import { Histogram } from 'prom-client';

const listObjectsLatency = new Histogram({
  name: 'fga_list_objects_duration_seconds',
  help: 'OpenFGA ListObjects latency',
  labelNames: ['type', 'cache_hit'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0],
});

const listObjectsResultSize = new Histogram({
  name: 'fga_list_objects_result_size',
  help: 'Number of objects returned by ListObjects',
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

The metrics to watch during optimization:

- **`fga_list_objects_duration_seconds{cache_hit="false"}` P99** — actual latency against OpenFGA, without cache
- **`fga_list_objects_result_size`** — distribution of returned object counts; tails with 1,000+ results indicate that pre-materialization is needed
- **Cache hit rate** — if it is below 60–70%, the TTL is too low or the key is not specific enough

---

## Summary

Three tools, three distinct problems:

**Caching** solves repetition: if the same user requests the same list seconds apart, there is no need to recompute. It is the simplest solution to add to an existing system, with the risk of delayed visibility into permission changes.

**Pre-materialization** solves latency: maintain an always-up-to-date table and listing queries become simple SELECTs. It is the right solution for high-throughput systems and dashboards with strict SLAs. The cost is the complexity of event-driven updates.

**BatchCheck** solves the case where you already have a subset of candidates: you do not need to know all accessible objects — only which of these specific ones are accessible. It is the natural strategy for search-plus-permission-filter.

### Resources

**Demo repository:**
- [VaultDrive on GitHub](https://github.com/monte97/VaultDrive)

**OpenFGA documentation:**
- [OpenFGA - Performance Guidance](https://openfga.dev/docs/interacting/performance-guidance)
- [OpenFGA - ListObjects API](https://openfga.dev/docs/interacting/relationship-queries#listobjects)
- [OpenFGA - BatchCheck API](https://openfga.dev/docs/interacting/relationship-queries#batch-check)
- [OpenFGA - ListUsers API](https://openfga.dev/docs/interacting/relationship-queries#listusers)

**Series articles:**
- [Zanzibar for Everyone: concepts and model](/blog/verificare/openfga/01-zanzibar-concetti/)
- [OpenFGA + Keycloak](/blog/verificare/openfga/02-openfga-keycloak/)
- [Multi-tenancy with OpenFGA](/blog/verificare/openfga/03-multitenancy/)
- [Deep hierarchies and ListObjects](/blog/verificare/openfga/04-gerarchie-query/)
