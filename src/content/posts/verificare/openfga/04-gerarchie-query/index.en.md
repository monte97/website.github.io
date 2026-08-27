---
title: "Deep Hierarchies, Inverse Queries, and the WHERE Problem"
date: 2026-04-18T09:00:00.000Z
description: "How to handle N-level hierarchies in OpenFGA, optimize ListObjects with fast/slow path, and implement Dynamic Data Masking as a complementary pattern."
pillar: verificare
category: openfga
tags:
  - OpenFGA
  - Authorization
  - ReBAC
  - Data Masking
  - Performance
series: openfga
seriesOrder: 40
lang: en
reviewed: machine
---

In the first three articles of this series we built a complete authorization model: types, relations, tenant stores, Keycloak integration. But the examples so far had at most two levels of nesting: organization and document, or organization and folder. The real world is different. A folder contains subfolders, which contain other subfolders, which contain documents. A user shares a folder and expects all the content below it to become accessible. And when you need to display a list of documents, you cannot run a Check for each one.

Three problems emerge as the model grows: N-level hierarchies, the cost of inverse queries (ListObjects), and the boundary between what OpenFGA can do and what must be handled elsewhere.

---

## N-Level Hierarchies

In the [first article](/en/blog/verificare/openfga/01-zanzibar-concetti/) we defined the `parent` relation between a folder and a document. In the [multi-tenancy article](/en/blog/verificare/openfga/03-multitenancy/) we added the organization as the graph root. But what happens when folders are nested?

OpenFGA's DSL handles recursion naturally. A folder can have another folder as its parent:

```dsl
type folder
  relations
    define org: [org]
    define owner: [user]
    define editor: [user] or owner or admin from org
    define viewer: [user] or editor or member from org
    define parent: [folder]
    define can_edit: editor or can_edit from parent
    define can_view: viewer or can_view from parent
```

The key line is `viewer from parent`. It means: a user is a viewer of this folder if they are a direct viewer, or if they are a viewer of the parent. And the parent can be another folder, which in turn has a parent. Resolution is recursive: OpenFGA climbs the graph until it finds a match or reaches the root.

For a document, the chain works the same way:

```dsl
type document
  relations
    define org: [org]
    define owner: [user]
    define editor: [user] or owner
    define viewer: [user] or editor
    define parent: [folder]
    define can_edit: editor or can_edit from parent
    define can_view: viewer or can_view from parent
```

### Example: Three Levels of Nesting

The structure in [VaultDrive](https://github.com/monte97/VaultDrive), the demo built for this series with a containerized setup and reproducible code:

```text
org-acme/
  projects/           (folder)
    backend/          (folder)
      api-spec.pdf    (document)
```

The tuples describing the hierarchy:

```json
[
  {"user": "org:org-acme",      "relation": "org",    "object": "folder:projects"},
  {"user": "folder:projects",  "relation": "parent", "object": "folder:backend"},
  {"user": "folder:backend",   "relation": "parent", "object": "document:api-spec"},
  {"user": "user:alice",       "relation": "member", "object": "org:org-acme"}
]
```

Alice is a member of the organization. When OpenFGA receives a Check for `user:alice` on `document:api-spec` with relation `can_view`, resolution proceeds as follows:

1. Is Alice a direct viewer of `document:api-spec`? No.
2. What is the parent of `document:api-spec`? `folder:backend`.
3. Can Alice `can_view` `folder:backend`? Not directly. What is the parent? `folder:projects`.
4. Can Alice `can_view` `folder:projects`? Alice is a member of `org:org-acme`, which is the org of `folder:projects`, so she is a viewer.
5. The viewer permission propagates via `can_view from parent` along the chain.

Result: `allowed: true`. Three levels of nesting resolved without a single line of application code. No recursive query in your database, no CTE climbing the tree. The hierarchy is in the data (tuples); the resolution logic is in the model (DSL).

---

## Permissions as Data, Not Code

In a traditional RBAC system, access rules are code. An Express middleware checks `if (user.role === 'admin')`. A Python decorator verifies `@requires_permission('documents.edit')`. These rules live in source code: changing them requires a commit, a review, a deployment.

In ReBAC, rules are tuples in the OpenFGA database. Adding a permission means writing a tuple. Removing it means deleting it. No deployment needed, no restart, no code changes.

In VaultDrive, sharing a folder with a user is a REST endpoint that writes a tuple:

```javascript
// POST /api/folders/:folderId/share
app.post('/api/folders/:folderId/share', requireAuth, async (req, res) => {
  const { userId, relation } = req.body; // relation: "viewer" | "editor"
  const { folderId } = req.params;

  // Verify that the sharer is an owner or editor of the folder
  const { allowed } = await fgaClient.check({
    user: `user:${req.user.sub}`,
    relation: 'editor',
    object: `folder:${folderId}`,
  });

  if (!allowed) {
    return res.status(403).json({ error: 'Insufficient permissions to share this folder' });
  }

  // Write the tuple: the user becomes a viewer/editor of the folder
  await fgaClient.write({
    writes: [
      { user: `user:${userId}`, relation, object: `folder:${folderId}` },
    ],
  });

  res.json({ message: 'Folder shared' });
});
```

After this call, the user has immediate access to the folder and all its contents, thanks to the recursive resolution described above. No background job, no asynchronous propagation: the tuple is written and the Check works.

Revoking access is equally direct:

```javascript
// DELETE /api/folders/:folderId/share
app.delete('/api/folders/:folderId/share', requireAuth, async (req, res) => {
  const { userId, relation } = req.body;
  const { folderId } = req.params;

  await fgaClient.write({
    deletes: [
      { user: `user:${userId}`, relation, object: `folder:${folderId}` },
    ],
  });

  res.json({ message: 'Access revoked' });
});
```

This is the operational advantage of ReBAC: permissions are a CRUD resource like any other. Create, read, update, delete. The authorization model (the DSL) changes rarely. Tuples change constantly.

---

## Contextual Tuples

Sometimes you need to simulate a permission without persisting it. The most common use case: an admin wants to see how a document appears to a viewer, without actually assigning the role.

OpenFGA supports **contextual tuples**: temporary relationships that exist only for the duration of a single Check. They are not written to the database.

```javascript
// GET /api/documents/:docId/preview-as
// Query: ?targetUserId=bob&targetRelation=viewer
app.get('/api/documents/:docId/preview-as', requireAuth, async (req, res) => {
  const { docId } = req.params;
  const { targetUserId, targetRelation } = req.query;

  // Only the owner can use preview-as
  const { allowed: isOwner } = await fgaClient.check({
    user: `user:${req.user.sub}`,
    relation: 'owner',
    object: `document:${docId}`,
  });

  if (!isOwner) {
    return res.status(403).json({ error: 'Only the owner can simulate access' });
  }

  // Check with contextual tuple: simulate that targetUserId is a viewer
  const { allowed } = await fgaClient.check({
    user: `user:${targetUserId}`,
    relation: 'can_view',
    object: `document:${docId}`,
    contextualTuples: [
      {
        user: `user:${targetUserId}`,
        relation: targetRelation,
        object: `document:${docId}`,
      },
    ],
  });

  res.json({
    simulatedUser: targetUserId,
    simulatedRelation: targetRelation,
    canView: allowed,
  });
});
```

The contextual tuple `{ user: "user:bob", relation: "viewer", object: "document:api-spec" }` is considered during Check resolution as if it were a real tuple, but disappears immediately after. Useful for debugging, admin interfaces, and sharing previews.

Another practical use case: time-based temporary access. A user gets `editor` on a document only during a specific time window. The application checks the time and, if the condition is met, passes the contextual tuple in the Check. Temporal logic stays in the application code; the authorization decision stays in OpenFGA.

---

## ListObjects and the WHERE Problem

So far we have used the **Check** API: given a user and a resource, tell me if they have access. But when displaying a list — the "My Documents" page, the folder sidebar — the problem is inverted: there is no specific resource, you need to know *which* resources the user can see.

OpenFGA provides the **ListObjects** API: given a user and a type, return all objects on which the user has a certain relation.

```javascript
const response = await fgaClient.listObjects({
  user: 'user:alice',
  relation: 'viewer',
  type: 'document',
});
// response.objects = ["document:api-spec", "document:readme", "document:notes"]
```

The result is a list of IDs. The application still needs full data: title, content, creation date. After ListObjects, a database query is needed:

```sql
SELECT * FROM documents WHERE id IN ('api-spec', 'readme', 'notes');
```

With three documents this works. With three hundred it still works. But with three thousand the `IN (...)` query becomes a problem: the list of IDs to pass is enormous, the database must do an index scan for each, and ListObjects itself grows more expensive because OpenFGA must resolve the graph for every object of the requested type.

This is the "WHERE problem": the cost of translating a list of authorized IDs into an efficient SQL query.

---

## Fast Path: Deriving Access from the Database

The solution is not to optimize the `IN (...)` query — it is to avoid it when possible.

If OpenFGA's hierarchical relationships mirror relationships already present in the application database, you can derive access with a SQL JOIN without calling OpenFGA.

In VaultDrive, the database has this structure:

```sql
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  org_id TEXT REFERENCES organizations(id),
  parent_folder_id TEXT REFERENCES folders(id)
);

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  folder_id TEXT REFERENCES folders(id),
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE org_members (
  org_id TEXT REFERENCES organizations(id),
  user_id TEXT NOT NULL,
  role TEXT NOT NULL, -- 'member', 'admin'
  PRIMARY KEY (org_id, user_id)
);
```

A member of `org-acme` can see all documents whose folder belongs to `org-acme`. This information is already in the relational database — no need to ask OpenFGA.

```sql
-- Fast path: all documents accessible through organization membership
SELECT d.*
FROM documents d
JOIN folders f ON d.folder_id = f.id
JOIN org_members om ON f.org_id = om.org_id
WHERE om.user_id = 'alice';
```

One JOIN, no HTTP call to OpenFGA, no list of IDs. This is the **fast path**: the common case where access derives from the organizational structure already present in the database.

---

## Combining Fast Path and Slow Path

The fast path covers most cases: if you are a member of an organization, you see the organization's documents. But it does not cover direct shares. If Bob received `viewer` on a single document via an explicit share (the tuple `user:bob viewer document:budget`), the JOIN on the organization will not find it.

For these cases you need the **slow path**: call ListObjects, then use `WHERE IN`. The strategy is to combine them with a UNION.

```javascript
async function listAccessibleDocuments(userId) {
  // --- Fast path: documents accessible via organization ---
  const fastPathQuery = `
    SELECT d.id, d.title, d.content, d.created_at, 'org' AS access_source
    FROM documents d
    JOIN folders f ON d.folder_id = f.id
    JOIN org_members om ON f.org_id = om.org_id
    WHERE om.user_id = $1
  `;

  // --- Slow path: directly shared documents ---
  const listResponse = await fgaClient.listObjects({
    user: `user:${userId}`,
    relation: 'viewer',
    type: 'document',
  });

  // Extract IDs from the "document:xxx" format
  const directIds = listResponse.objects
    .map(obj => obj.replace('document:', ''))
    .filter(id => id.length > 0);

  let slowPathQuery = '';
  let params = [userId];

  if (directIds.length > 0) {
    // Exclude from slow path documents already covered by fast path
    slowPathQuery = `
      UNION
      SELECT d.id, d.title, d.content, d.created_at, 'direct' AS access_source
      FROM documents d
      WHERE d.id = ANY($2)
      AND d.id NOT IN (
        SELECT d2.id FROM documents d2
        JOIN folders f ON d2.folder_id = f.id
        JOIN org_members om ON f.org_id = om.org_id
        WHERE om.user_id = $1
      )
    `;
    params.push(directIds);
  }

  const query = `${fastPathQuery} ${slowPathQuery} ORDER BY created_at DESC`;
  const result = await pool.query(query, params);

  return result.rows;
}
```

The fast path handles 80% of cases without touching OpenFGA. The slow path covers the remaining 20% — direct shares, access granted to individual users or teams on specific resources. The `access_source` column is useful for debugging: it lets you understand why a user sees a particular document.

In production, the ratio depends on the application type. A system where most access derives from organizational membership will have a fast path covering 95%. A system with many peer-to-peer shares (like Google Docs) will have a heavier slow path.

---

## What NOT to Put in OpenFGA

ReBAC models relationships between users and resources. But not everything is a relationship.

An example: "the user can see the `internal_notes` field of a document." This seems like an authorization question, and it is. But it is not a relationship between a user and a resource — it is a property of the user (their access level) combined with a property of the field (its classification). This is pure ABAC.

Creating an OpenFGA type for every field of every resource is a modeling mistake:

```dsl
// DO NOT do this
type document_field
  relations
    define viewer: [user]

// Resulting tuples:
// user:alice viewer document_field:budget.title
// user:alice viewer document_field:budget.content
// user:alice viewer document_field:budget.created_at
// ...for every field, every document, every user
```

The tuple count explodes. The model becomes unmanageable. And the fundamental problem remains: the decision "which fields to show" depends on the access level, not on the relationship with an individual field.

The solution is a complementary pattern: **Dynamic Data Masking**.

---

## Dynamic Data Masking

The idea is straightforward: OpenFGA decides *whether* the user can access the resource. An application layer decides *what* the user can see, based on their relation to that resource.

### Field Classification

Every field in a document has a visibility level. In VaultDrive, the classification lives in a dedicated table:

```sql
CREATE TABLE field_classifications (
  resource_type TEXT NOT NULL,  -- 'document', 'folder'
  field_name TEXT NOT NULL,
  min_relation TEXT NOT NULL,   -- 'can_view', 'can_edit', 'owner'
  PRIMARY KEY (resource_type, field_name)
);

-- Document field classification
INSERT INTO field_classifications VALUES
  ('document', 'id',               'can_view'),
  ('document', 'title',            'can_view'),
  ('document', 'created_at',       'can_view'),
  ('document', 'content',          'can_view'),
  ('document', 'tags',             'can_view'),
  ('document', 'updated_at',       'can_view'),
  ('document', 'sharing_settings', 'can_edit'),
  ('document', 'version_history',  'can_edit'),
  ('document', 'storage_quota',    'owner'),
  ('document', 'internal_notes',   'owner'),
  ('document', 'audit_log',        'owner');
```

The relation hierarchy is ordered: `owner > can_edit > can_view`. An owner sees all fields. An editor sees fields up to `can_edit` level. A viewer sees only `can_view` fields.

### The Middleware

The Express middleware acts after the response: it intercepts the JSON, determines the user's maximum relation on the resource, and removes fields above that level.

```javascript
const RELATION_HIERARCHY = ['can_view', 'can_edit', 'owner'];

async function getMaxRelation(userId, resourceType, resourceId) {
  // Check from highest relation down
  for (let i = RELATION_HIERARCHY.length - 1; i >= 0; i--) {
    const relation = RELATION_HIERARCHY[i];
    const { allowed } = await fgaClient.check({
      user: `user:${userId}`,
      relation,
      object: `${resourceType}:${resourceId}`,
    });
    if (allowed) return relation;
  }
  return null;
}

function maskFields(data, allowedRelation, classifications) {
  const relationLevel = RELATION_HIERARCHY.indexOf(allowedRelation);
  const masked = { ...data };

  for (const [field, minRelation] of Object.entries(classifications)) {
    const requiredLevel = RELATION_HIERARCHY.indexOf(minRelation);
    if (requiredLevel > relationLevel) {
      delete masked[field];
    }
  }

  return masked;
}
```

And the integration in the route:

```javascript
app.get('/api/documents/:docId', requireAuth, async (req, res) => {
  const { docId } = req.params;
  const userId = req.user.sub;

  // 1. Basic access check (OpenFGA)
  const { allowed } = await fgaClient.check({
    user: `user:${userId}`,
    relation: 'can_view',
    object: `document:${docId}`,
  });

  if (!allowed) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // 2. Retrieve the document from the database
  const doc = await getDocument(docId);

  // 3. Determine the maximum relation
  const maxRelation = await getMaxRelation(userId, 'document', docId);

  // 4. Load classifications and mask
  const classifications = await getFieldClassifications('document');
  const maskedDoc = maskFields(doc, maxRelation, classifications);

  res.json(maskedDoc);
});
```

A viewer requesting `GET /api/documents/budget` receives:

```json
{
  "id": "budget",
  "title": "Budget Q3",
  "created_at": "2026-01-15T10:00:00Z",
  "content": "...",
  "tags": ["finance"],
  "updated_at": "2026-03-01T14:30:00Z"
}
```

An owner receives the same document with all fields, including `sharing_settings`, `version_history`, `storage_quota`, `internal_notes`, and `audit_log`.

### Optimization: Classification Cache

Field classifications change rarely. In VaultDrive they are loaded at startup and cached in memory:

```javascript
const classificationCache = {};

async function getFieldClassifications(resourceType) {
  if (!classificationCache[resourceType]) {
    const result = await pool.query(
      'SELECT field_name, min_relation FROM field_classifications WHERE resource_type = $1',
      [resourceType]
    );
    classificationCache[resourceType] = Object.fromEntries(
      result.rows.map(r => [r.field_name, r.min_relation])
    );
  }
  return classificationCache[resourceType];
}
```

For the maximum relation, `getMaxRelation` makes up to three sequential OpenFGA Checks. If latency is a concern, run them in parallel with `Promise.all` and determine the maximum level from the results, or cache the result for the duration of the HTTP request.

---

## Integration: Which System for Which Question

At this point VaultDrive uses three systems for authorization. Each system answers a different question:

| Question | System | API/Mechanism |
|----------|--------|---------------|
| Is the user who they claim to be? | Keycloak | JWT validation |
| Can the user access the resource? | OpenFGA | Check API |
| Which resources can they see? | OpenFGA + DB | ListObjects (slow) or JOIN (fast) |
| Which fields can they see? | Data Masking (ABAC) | Classification + Check |

The boundary is clear:

- **Keycloak** handles identity: who you are, which claims you have in the token. Covered in the [Keycloak integration article](/en/blog/verificare/openfga/02-openfga-keycloak/).
- **OpenFGA** handles relationships: who can do what on which resource. The ReBAC model covers hierarchical access, sharing, and teams.
- **Data Masking** handles field-level granularity: it is not a relationship — it is a classification.

Anyone familiar with OPA will notice a fundamental difference: OPA evaluates arbitrary policies on arbitrary input; ReBAC evaluates relationships in a graph. They are different tools for different problems. OpenFGA is more constrained, but that constraint is also its strength: the model is inspectable, testable, and resolution has known performance guarantees.

---

## Operations

An authorization model in production needs operational tooling. Some is provided by OpenFGA; some must be built.

### Debugging with the Expand API

When a Check returns an unexpected result, the [**Expand** API](https://openfga.dev/docs/interacting/relationship-queries#expand) shows the resolution graph: which tuples were traversed, which branches were explored.

```bash
# Who has viewer access to document:api-spec?
curl -X POST http://localhost:8080/stores/$STORE_ID/expand \
  -H "Content-Type: application/json" \
  -d '{
    "tuple_key": {
      "relation": "viewer",
      "object": "document:api-spec"
    }
  }'
```

The response shows the complete tree: direct users, users inheriting from a folder, users inheriting from the organization. It is the primary tool for answering "why does this user have (or not have) access?"

The [OpenFGA Playground](https://play.fga.dev/) offers the same functionality with a visual interface. Useful during development to verify that the model behaves as expected before writing code.

### Model Versioning

The DSL model (`model.fga`) should be treated as code: versioned in git, reviewed, and tested in CI.

```text
openfga/
  model.fga           # DSL model
  tuples/
    seed.json         # test tuples
  tests/
    access.test.yaml  # authorization tests
```

OpenFGA supports the [CLI](https://openfga.dev/docs/getting-started/cli) for validating and testing the model:

```bash
# Validate model syntax
openfga model validate --file model.fga

# Run tests
openfga model test --tests tests/access.test.yaml
```

Tests are declarative YAML files: define tuples, then assert the result of specific Checks. In CI, these tests run on every push and block the merge if a Check returns a different result than expected.

### Backup and Monitoring

Tuples are the critical data of the authorization system. OpenFGA exposes a paginated **Read** API for exporting them:

```bash
# Export all tuples from the store
curl "http://localhost:8080/stores/$STORE_ID/read" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.tuples'
```

For monitoring, the relevant metrics are:

- **Check P99 latency**: should stay under 10ms for shallow graphs, 50ms for graphs with 4–5 nesting levels
- **ListObjects P99 latency**: depends on the number of objects of the requested type. This is the metric that justifies the fast/slow path pattern
- **Number of tuples per store**: grows linearly with users and resources. OpenFGA handles millions of tuples, but ListObjects latency is affected
- **5xx errors**: indicate connectivity issues with OpenFGA's database (PostgreSQL or MySQL)

---

## Summary

Three takeaways:

**Hierarchies are free in the model.** `viewer from parent` resolves N levels of nesting without application code. The structure is in the tuples; the logic is in the DSL.

**ListObjects has a cost. The fast path avoids it.** For inverse queries ("which resources can this user see?"), the fast/slow path pattern combines SQL JOINs (for organizationally-derived access) and ListObjects (for direct shares). The fast path covers most cases without calling OpenFGA.

**Not everything is ReBAC.** Field-level access control is ABAC: a field classification combined with the user's relation level. Dynamic Data Masking is the pattern that separates "can you access the resource" (OpenFGA) from "which fields do you see" (application).

This article's fast path avoids ListObjects in most cases, but not in all of them. [When ListObjects is the only way left](/en/blog/verificare/openfga/05-listobjects-performance/) the cost has to be attacked elsewhere: caching, a pre-materialised read model, BatchCheck.

### Resources

**Demo repository:**
- [VaultDrive on GitHub](https://github.com/monte97/VaultDrive)

**OpenFGA documentation:**
- [OpenFGA - Expand API](https://openfga.dev/docs/interacting/relationship-queries#expand)
- [OpenFGA - ListObjects API](https://openfga.dev/docs/interacting/relationship-queries#listobjects)
- [OpenFGA - Performance Guidance](https://openfga.dev/docs/interacting/performance-guidance)
- [OpenFGA - Model Testing](https://openfga.dev/docs/getting-started/testing/modeled-access)
- [OpenFGA CLI](https://openfga.dev/docs/getting-started/cli)
- [OpenFGA Playground](https://play.fga.dev/)

**Related articles:**
- [Zanzibar and the core concepts](/en/blog/verificare/openfga/01-zanzibar-concetti/)
- [OpenFGA + Keycloak](/en/blog/verificare/openfga/02-openfga-keycloak/)
- [Multi-tenancy with OpenFGA](/en/blog/verificare/openfga/03-multitenancy/)
- [ListObjects in production: caching, pre-materialization and BatchCheck](/en/blog/verificare/openfga/05-listobjects-performance/)
- [Authorization with OPA and Keycloak](/en/blog/progettare/keycloak/05-keycloak-opa/)
