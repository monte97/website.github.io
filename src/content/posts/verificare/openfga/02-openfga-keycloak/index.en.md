---
title: "OpenFGA + Keycloak: Bridging Identity and Permissions"
date: 2026-03-21T09:00:00.000Z
description: "How to integrate OpenFGA with Keycloak: user synchronization, JWT as the bridge, contextual tuples, and strategies for keeping identity and authorization aligned."
pillar: verificare
category: openfga
tags:
  - OpenFGA
  - Keycloak
  - Authorization
  - Authentication
  - JWT
series: openfga
seriesOrder: 20
lang: en
reviewed: machine
---

An identity provider manages users, roles, and login. An authorization engine decides who can do what on which resource. The challenge is not making them work — it is making them communicate without one invading the other's territory. In the [previous article]({{< ref "/posts/openfga/01-zanzibar-concetti" >}}) we built a relationship-based authorization model with OpenFGA. Now we connect it to Keycloak, using [VaultDrive](https://github.com/monte97/VaultDrive) as the reference project: a demo built for this series with a containerized setup and reproducible code.

---

## Separation of Concerns

The principle is familiar if you have worked with Keycloak before: Keycloak authenticates, something else authorizes. In an OPA-based setup the "something else" is a policy engine evaluating Rego rules. Here the model changes: instead of declarative policies evaluating a JSON input, we have relationships between entities stored in a graph.

| Component | Responsibility |
|-----------|---------------|
| Keycloak | Authentication, JWT issuance, user and realm role management |
| Express (middleware) | JWT validation, identity extraction |
| OpenFGA | Authorization decision based on relationships (tuples) |
| FGA model | Type definitions, relations, and access rules |

Keycloak knows nothing about application resources. It does not know that folders, documents, or workspaces exist. OpenFGA knows nothing about login, tokens, or sessions. The two systems meet at exactly one point: the `sub` claim of the JWT.

---

## JWT as the Bridge

The JWT issued by Keycloak contains a `sub` field — a UUID that uniquely identifies the user. This value becomes the user's identity in the OpenFGA world.

The flow for every protected request:

1. The user logs in through Keycloak (Authorization Code + PKCE)
2. Keycloak issues a JWT with `sub`, `realm_access.roles`, `groups`, and other claims
3. Express validates the JWT via JWKS
4. The middleware extracts `sub` and `groups` from the token
5. Express calls OpenFGA Check with `user:{sub}` on the requested resource
6. OpenFGA traverses the relationship graph and responds allow/deny

One important point: the `groups` claim is not configured on each individual client. In Keycloak, you define a **client scope** at the realm level with the `oidc-group-membership-mapper`, then add it to the default client scopes. All clients in the realm inherit it automatically. In VaultDrive, the realm has three clients — `vaultdrive-app` (public SPA), `vaultdrive-admin` (confidential dashboard), `analytics-service` (M2M) — and the first two receive the `groups` claim without any additional configuration. The M2M client, which uses Client Credentials and has no users, does not need it.

```text
Browser                Keycloak             Express              OpenFGA
  |                       |                    |                     |
  |--- login ------------>|                    |                     |
  |<-- JWT -------------  |                    |                     |
  |    sub=abc-123        |                    |                     |
  |    groups=[org-acme]  |                    |                     |
  |                       |                    |                     |
  |--- GET /documents ----|--- Bearer JWT ---->|                     |
  |                       |                    |--- validate JWT --->|
  |                       |                    |    (JWKS)           |
  |                       |                    |                     |
  |                       |                    |--- Check            |
  |                       |                    |    user:abc-123     |
  |                       |                    |    can_view         |
  |                       |                    |    document:X ----->|
  |                       |                    |                     |
  |                       |                    |<-- allowed: true ---|
  |<-- 200 [documents] ---|                    |                     |
```

In Express, the bridging middleware is straightforward:

```javascript
// middleware/fga.js
const { OpenFgaClient } = require('@openfga/sdk');

const fgaClient = new OpenFgaClient({
  apiUrl: process.env.FGA_API_URL || 'http://openfga:8080',
  storeId: process.env.FGA_STORE_ID,
});

async function checkPermission(userId, relation, objectType, objectId) {
  const { allowed } = await fgaClient.check({
    user: `user:${userId}`,
    relation,
    object: `${objectType}:${objectId}`,
  });
  return allowed;
}

function requirePermission(relation, objectType, getObjectId) {
  return async (req, res, next) => {
    const userId = req.user.sub; // from Keycloak JWT
    const objectId = typeof getObjectId === 'function'
      ? getObjectId(req)
      : req.params.id;

    try {
      const allowed = await checkPermission(userId, relation, objectType, objectId);
      if (!allowed) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next();
    } catch (error) {
      console.error('OpenFGA check failed:', error.message);
      return res.status(503).json({ error: 'Authorization service unavailable' });
    }
  };
}
```

Two things to note:

- **Fail closed**: if OpenFGA is unreachable, the middleware returns 503 rather than letting the request through. In an authorization system, the default on error must be deny.
- **`req.user.sub`**: this field comes from JWT validation performed by the authentication middleware. There is no authorization logic in the token — only identity.

---

## Synchronization: Three Strategies

Keycloak manages users and **groups**. In VaultDrive, each organization is a Keycloak group: `org-acme`, `org-beta`. When a user is added to a group in Keycloak, that relationship must be reflected in OpenFGA as a tuple `user:{sub} member org:{group}`. Who writes this tuple? There are three ways to do it, and none is perfect.

### Event-driven: Webhook on Admin Events

Keycloak generates Admin Events for every administrative operation: user creation, group assignment, removal from a group. A custom listener (SPI Event Listener or a webhook via extension) intercepts these events and writes the corresponding tuples to OpenFGA.

```text
Keycloak                    Webhook Handler              OpenFGA
  |                              |                          |
  |-- GROUP_MEMBERSHIP_ADD ----->|                          |
  |   (alice -> org-acme)        |-- WriteTuples            |
  |                              |   user:alice member      |
  |                              |   org:org-acme --------->|
  |                              |                          |
  |-- GROUP_MEMBERSHIP_REMOVE -->|                          |
  |   (bob -> org-acme)          |-- DeleteTuples           |
  |                              |   user:bob member        |
  |                              |   org:org-acme --------->|
```

```javascript
// webhook-handler.js (simplified example)
app.post('/keycloak-events', async (req, res) => {
  const event = req.body;

  if (event.type === 'GROUP_MEMBERSHIP_ADD') {
    const groupName = event.groupPath.replace(/^\//, ''); // /org-acme -> org-acme
    await fgaClient.write({
      writes: [{
        user: `user:${event.userId}`,
        relation: 'member',
        object: `org:${groupName}`,
      }],
    });
  }

  if (event.type === 'GROUP_MEMBERSHIP_REMOVE') {
    const groupName = event.groupPath.replace(/^\//, '');
    await fgaClient.write({
      deletes: [{
        user: `user:${event.userId}`,
        relation: 'member',
        object: `org:${groupName}`,
      }],
    });
  }

  res.sendStatus(200);
});
```

### Batch: Periodic Job

A scheduled job (cron, Kubernetes CronJob) reads all users and their groups from the Keycloak Admin API, compares them with existing tuples in OpenFGA, and writes the differences.

```javascript
// sync-batch.js
async function syncGroupMemberships() {
  // Read groups from Keycloak Admin API
  const groups = await fetchKeycloakGroups(); // [{name: "org-acme", members: [...]}]

  for (const group of groups) {
    const orgObject = `org:${group.name}`;

    // Read existing tuples for this org
    const existingTuples = await fgaClient.read({ object: orgObject });
    const existingUserIds = new Set(
      existingTuples.tuples.map(t => t.key.user)
    );

    // KC members that do not yet have a tuple
    const writes = group.members
      .filter(u => !existingUserIds.has(`user:${u.id}`))
      .map(u => ({
        user: `user:${u.id}`,
        relation: 'member',
        object: orgObject,
      }));

    if (writes.length > 0) {
      await fgaClient.write({ writes });
      console.log(`Synced ${writes.length} members to ${group.name}`);
    }
  }
}
```

### On-demand: Sync at Login

On the user's first login, the middleware reads the `groups` claim from the JWT and checks whether the corresponding `member` tuples already exist. If not, it writes them. No external job, no webhook. The group information is already in the token thanks to the realm-level client scope.

```javascript
// services/keycloak-sync.js
async function syncUserOnLogin(user) {
  if (!user.sub || !user.groups || user.groups.length === 0) {
    return;
  }

  const userId = `user:${user.sub}`;
  const isAdmin = (user.roles || []).includes('admin');

  for (const group of user.groups) {
    const orgObject = `org:${group}`;

    const isMember = await fgaClient.check({
      user: userId, relation: 'member', object: orgObject,
    });

    if (!isMember.allowed) {
      const relation = isAdmin ? 'admin' : 'member';
      await fgaClient.write({
        writes: [{ user: userId, relation, object: orgObject }],
      });
      console.log(`Synced ${user.username} as ${relation} of ${group}`);
    }
  }
}
```

The middleware iterates over all the user's groups: a user can belong to multiple organizations, and the sync covers all of them. In VaultDrive, the call happens at token exchange:

```javascript
// routes/auth.js — callback after login
const groups = (payload.groups || []).map(g =>
  g.startsWith('/') ? g.slice(1) : g  // KC may return /org-acme
);
await syncUserOnLogin({ sub: payload.sub, username: payload.preferred_username, groups, roles });
```

The cost is one OpenFGA Check per group at each login. This can be mitigated with a short in-memory cache (e.g. 60 seconds): if the user was already synced recently, skip the check.

---

## Choosing a Strategy

The choice depends on four factors. No single strategy covers all scenarios optimally.

| Factor | Event-driven | Batch | On-demand |
|--------|-------------|-------|-----------|
| Latency | Real-time | Minutes/hours of lag | Zero for active users |
| User coverage | All users | All users | Only users who log in |
| Infrastructure complexity | High (webhook, SPI, queue) | Medium (cron job) | Low (middleware) |
| Resilience | Requires retry and idempotency handling | Naturally idempotent (diff) | Idempotent (check before write) |
| Best for | Critical permissions, compliance | Initial migration, audit | MVP, small teams, multi-tenant SaaS |

In practice, the most common combination is **on-demand + reconciliation batch**. On-demand covers the common case (active users logging in), while the periodic batch re-aligns any inconsistencies and handles users who have never logged in but need pre-assigned permissions.

VaultDrive uses the on-demand strategy because the use case is simple: a user exists in the authorization system from the moment of their first login. Resources (folders, documents) are created by the application, and the corresponding tuples are written at the same time.

---

## Contextual Tuples: When You Don't Need Sync

Not all relationships need to be written as persistent tuples. Some are already present in the JWT and only make sense for the duration of a single request.

Example: the Keycloak JWT contains `realm_access.roles: ["admin"]`. You could write a tuple `user:alice admin org:org-acme` and keep it synchronized. But if the role is already in the token and only changes when an admin modifies it in Keycloak, you can pass it as a **contextual tuple** in the Check call.

```javascript
// middleware/fga-contextual.js
async function checkWithContext(req, relation, objectType, objectId) {
  const userId = req.user.sub;
  const roles = req.user.roles || [];
  const groups = req.user.groups || [];

  // Build contextual tuples from JWT roles for each group
  const contextualTuples = [];
  for (const group of groups) {
    for (const role of roles) {
      if (role === 'admin') {
        contextualTuples.push({
          user: `user:${userId}`,
          relation: 'admin',
          object: `org:${group}`,
        });
      }
    }
  }

  const { allowed } = await fgaClient.check({
    user: `user:${userId}`,
    relation,
    object: `${objectType}:${objectId}`,
    contextualTuples,
  });

  return allowed;
}
```

Contextual tuples are treated by OpenFGA as if they were real tuples, but only for the duration of that single call. They are not written to the store.

When to use them:

- **Realm roles or JWT claims** that change infrequently and are already in the token
- **Attributes derivable** from the current session (e.g. IP range, time of day)
- **Temporary relationships** that make no sense to persist

When NOT to use them:

- **Structural relationships** (alice is a member of org-acme): these are needed to traverse the graph and resolve indirect permissions. If they are only contextual, `ListObjects` queries will not see them.
- **Permissions that must be visible to other users**: contextual tuples only exist within the single call — nobody else sees them.

The FGA model must support the relations used as contextual tuples. If the `org` type does not have an `admin` relation, passing `{user:alice, relation:admin, object:org:org-acme}` as a contextual tuple will have no effect.

---

## What Not to Synchronize

A common mistake in the Keycloak-OpenFGA integration is trying to synchronize everything. Not everything belongs at the boundary between identity and authorization.

**Synchronize** (user-to-organization relationships, derived from KC groups):
- User X is a member of organization Y (KC group `org-y`)
- User X belongs to team Z (KC group `team-z`)
- User X has the admin role in organization Y (realm role + group)

These relationships originate in Keycloak (group assignment) and must be reflected in OpenFGA because they are the starting point for resolving permissions. The `groups` claim in the JWT is the bridge: Keycloak emits it via the client scope, the application reads it and writes the tuples.

**Do NOT synchronize** (resource-level relationships):
- The "Projects" folder is a child of the "Root" folder
- The document "report.pdf" is in the "Projects" folder
- Alice is an editor of the document "report.pdf"

These tuples are written when the resource is created or shared, directly by the application. They have nothing to do with Keycloak and never travel through the identity provider.

```javascript
// routes/documents.js — write tuples on resource creation
app.post('/api/documents', requireAuth, async (req, res) => {
  const userId = req.user.sub;
  const { name, folderId } = req.body;

  // Create the document in the database
  const doc = await db.documents.create({ name, folderId, ownerId: userId });

  // Write tuples to OpenFGA
  await fgaClient.write({
    writes: [
      {
        user: `user:${userId}`,
        relation: 'owner',
        object: `document:${doc.id}`,
      },
      {
        user: `folder:${folderId}`,
        relation: 'parent',
        object: `document:${doc.id}`,
      },
    ],
  });

  res.status(201).json(doc);
});
```

The rule is simple: if a relationship originates from the user's identity (who they are, which organization they belong to), synchronize it from Keycloak. If a relationship originates from an action in the application (creation, sharing, moving), the application writes it directly.

---

## End-to-End Example with VaultDrive

The complete flow: Alice logs into VaultDrive, navigates her folders, and opens a document.

### 1. Login and JWT Issuance

Alice logs in through the `vaultdrive-app` client with Authorization Code + PKCE. Keycloak issues a JWT with the `groups` claim (inherited from the realm-level client scope):

```json
{
  "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "preferred_username": "alice",
  "azp": "vaultdrive-app",
  "groups": ["org-acme"],
  "realm_access": {
    "roles": ["user"]
  }
}
```

The `groups` claim comes from the `oidc-group-membership-mapper` defined in the `groups` client scope at the realm level. If alice logged in through `vaultdrive-admin`, she would receive the same claim because both clients inherit the scope.

### 2. On-Login Synchronization

At token exchange, the `syncUserOnLogin` middleware reads `groups` from the JWT. For each group, it checks whether the tuple exists in OpenFGA. Alice belongs to `org-acme`, so the middleware writes:

```yaml
# Tuple written by syncUserOnLogin
user: "user:a1b2c3d4-e5f6-7890-abcd-ef1234567890"
relation: "member"
object: "org:org-acme"
```

If alice belonged to multiple groups (e.g. `org-acme` and `org-beta`), the middleware would write one tuple for each.

### 3. Document Request

Alice calls `GET /api/orgs/org-acme/documents`. Express validates the JWT, then asks OpenFGA which documents Alice can see.

```javascript
// routes/documents.js
app.get('/api/orgs/:orgId/documents', requireAuth, async (req, res) => {
  const userId = req.user.sub;
  const { orgId } = req.params;

  // Ask OpenFGA which documents the user can view
  const { objects } = await fgaClient.listObjects({
    user: `user:${userId}`,
    relation: 'can_view',
    type: 'document',
  });

  // objects = ["document:doc-1", "document:doc-3", "document:doc-7"]
  const docIds = objects.map(o => o.replace('document:', ''));

  // Filter from the database only the documents in the requested org
  const documents = await db.query(
    'SELECT * FROM documents WHERE id = ANY($1) AND org_id = $2',
    [docIds, orgId]
  );

  res.json(documents);
});
```

### 4. Complete Flow

```text
Alice          Browser        Express           OpenFGA           Keycloak        DB
  |               |              |                  |                 |            |
  |-- login ----->|              |                  |                 |            |
  |               |-- auth code (vaultdrive-app) -->|                 |            |
  |               |<-- JWT (sub=a1b2               |                 |            |
  |               |     groups=[org-acme]) --------|                 |            |
  |               |              |                  |                 |            |
  |               |-- POST /auth/callback -------->|                 |            |
  |               |              |-- syncUserOnLogin                  |            |
  |               |              |   check member org:org-acme ------>|            |
  |               |              |<- not found -----|                 |            |
  |               |              |-- write member ->|                 |            |
  |               |              |                  |                 |            |
  |-- GET /docs ->|              |                  |                 |            |
  |               |-- Bearer --->|                  |                 |            |
  |               |              |-- validate JWT (JWKS) ----------->|            |
  |               |              |                  |                 |            |
  |               |              |-- listObjects -->|                 |            |
  |               |              |   user:a1b2      |                 |            |
  |               |              |   can_view       |                 |            |
  |               |              |   type:document  |                 |            |
  |               |              |<- [doc-1,doc-3] -|                 |            |
  |               |              |                  |                 |            |
  |               |              |-- SELECT WHERE id IN (doc-1,doc-3) ----------->|
  |               |              |<-- rows ----------------------------------------|
  |               |<-- 200 ------|                  |                 |            |
  |<-- documents -|              |                  |                 |            |
```

The `ListObjects` + `WHERE IN` pattern is the standard approach for filtering resources by permission without loading everything into memory. OpenFGA returns the IDs of accessible resources; the database fetches the details. This scales well because OpenFGA is optimized for traversing relationship graphs and the database is optimized for filtering rows by ID.

---

## Project Structure

In VaultDrive, the files relevant to the Keycloak-OpenFGA integration are:

```text
vaultdrive-api/src/
+-- middleware/
|   +-- authenticate.js       # JWT validation via JWKS, extracts sub + groups
|   +-- authorize.js          # OpenFGA Check wrapper
|   +-- data-masking.js       # Dynamic Data Masking (post 4)
+-- services/
|   +-- openfga.js            # SDK client (check, listObjects, writeTuples)
|   +-- keycloak-sync.js      # Sync KC groups -> OpenFGA tuples
|   +-- query-builder.js      # ListObjects + WHERE builder
+-- routes/
|   +-- auth.js               # Token exchange + on-login sync
|   +-- documents.js          # Document CRUD with FGA checks
|   +-- folders.js            # Folder CRUD with FGA checks

keycloak/
+-- realm-export.json         # Realm with groups, 3 clients, groups client scope

openfga/
+-- model.fga                 # Authorization model
+-- store.fga.yaml            # Model tests
```

Each middleware has a single responsibility. `authenticate.js` validates the JWT and populates `req.user` with `sub`, `groups`, `roles`, and `clientId`. `keycloak-sync.js` ensures the user exists in OpenFGA for every group they belong to. `authorize.js` executes the authorization Checks. Routes compose them in the correct order:

```javascript
// Sync happens at login (POST /auth/callback), not on every request.
// Subsequent requests use only authenticate + authorize.
router.get('/api/orgs/:orgId/documents',
  authenticate,                           // who are you? (JWT, extracts groups)
  authorize('can_view', 'org', 'orgId'),  // can you access this org?
  listDocuments                           // what can you see? (ListObjects + DB)
);
```

---

## Conclusions

The integration between Keycloak and OpenFGA comes down to three decisions:

1. **How to map identity**: the JWT `sub` becomes `user:{sub}` in OpenFGA. KC groups become organizations. The `groups` claim, configured once as a realm-level client scope, carries the information in every token without repeating the configuration for each client.

2. **How to synchronize user-organization relationships**: on-demand at login for MVPs and small teams (read `groups` from the JWT, write the tuples), event-driven for critical systems, batch for reconciliation. Resource-level relationships are not synchronized — the application writes them directly.

3. **What to pass as contextual tuples**: realm roles and JWT-derivable attributes can travel as temporary tuples without occupying space in the store. But structural relationships (group membership, resource hierarchy) must be persistent, otherwise `ListObjects` will not see them.

The separation is the same as with OPA — Keycloak authenticates, an external engine authorizes — but the model changes: no longer declarative policies that receive an input and return a boolean, but a relationship graph that is traversed to resolve permissions. The advantage becomes clear when access rules follow hierarchical structures (folders, teams, organizations), which is exactly the VaultDrive use case.

The next article covers multi-tenancy: multiple organizations in the same system, with complete permission isolation and shared FGA models.

### Resources

**Demo repository:**
- [VaultDrive on GitHub](https://github.com/monte97/VaultDrive)

**OpenFGA documentation:**
- [OpenFGA SDK Node.js (`@openfga/sdk`)](https://www.npmjs.com/package/@openfga/sdk)
- [OpenFGA - Contextual Tuples](https://openfga.dev/docs/modeling/contextual-time-based-authorization)
- [OpenFGA - ListObjects API](https://openfga.dev/docs/interacting/relationship-queries#listobjects)
- [OpenFGA - Check API](https://openfga.dev/docs/interacting/relationship-queries#check)
- [OpenFGA - Write Tuples](https://openfga.dev/docs/interacting/managing-relationships-between-objects)

**Keycloak documentation:**
- [Keycloak Admin Events](https://www.keycloak.org/docs/latest/server_admin/#auditing-and-events)
- [Keycloak - Group Membership Mapper](https://www.keycloak.org/docs/latest/server_admin/#_group-membership-claims)
- [Keycloak - Client Scopes](https://www.keycloak.org/docs/latest/server_admin/#_client_scopes)

**Related articles:**
- [Previous: Zanzibar and the core concepts]({{< ref "/posts/openfga/01-zanzibar-concetti" >}})
- [Fine-grained authorization with OPA and Keycloak]({{< ref "/posts/keycloak/05-keycloak-opa" >}})
- [Keycloak: introduction]({{< ref "/posts/keycloak/01-keycloak-intro" >}})
