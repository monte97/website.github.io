---
title: "Zanzibar for Everyone: Authorization Models and the Tuple Approach"
date: 2026-03-07T09:00:00.000Z
description: "From RBAC to Zanzibar: how OpenFGA's tuple model works, the DSL for defining relationships, and the three fundamental questions of authorization."
pillar: verificare
category: openfga
tags:
  - OpenFGA
  - Authorization
  - ReBAC
  - Zanzibar
  - Access Control
series: openfga
seriesOrder: 10
lang: en
reviewed: machine
---

In a file-sharing system like Google Drive, Alice creates a folder called "Project X" with three documents and shares it with Bob as an editor. Bob should be able to edit all documents in the folder, including ones added later, without any manual intervention.

With classic RBAC, this scenario requires roles like `folder-project-x-editor`, `document-readme-viewer`, `org-acme-member` — one for every combination of resource and permission. As resources grow, the number of roles grows combinatorially. When hierarchies nest (organization, team, folder, subfolder, document), the model breaks down.

In 2019, Google published **Zanzibar**, the authorization system built to handle exactly this kind of problem. This article covers the core concepts of that model and how OpenFGA, its open-source implementation, exposes them through an API.

---

## Why RBAC Falls Short

RBAC (Role-Based Access Control) works well for simple cases: users, roles, permissions. An `admin` can do everything, a `viewer` can only read. For an application with two or three roles and homogeneous resources, it's the right choice.

The problem emerges when resources have relationships with each other. In a document-sharing system:

- A document lives in a folder
- A folder lives in an organization
- Access to a folder implies access to the documents inside
- Access to the organization implies access to all folders
- A user can receive a sharing link for a single document

With RBAC, every relationship becomes a role. Three folders with five documents each and three access levels (owner, editor, viewer) already produce dozens of roles. Add teams, organizations, and link-based sharing, and the role count explodes combinatorially.

ReBAC needs a different model — one that treats relationships as first-class data.

---

## Google Zanzibar

In 2019, Google published ["Zanzibar: Google's Consistent, Global Authorization System"](https://research.google/pubs/pub48190/). The paper describes the system powering authorization for Google Drive, YouTube, Google Maps, Cloud, and dozens of other products. Stated numbers: over a trillion access checks per second, with latency under 10 milliseconds at the 95th percentile.

The central insight: **relationships between users and resources are data, not configuration**. Rather than defining roles and assigning users to them, you write the relationships directly. "Alice is an editor of the readme document" is not a role assigned in an admin panel — it's a record in a database.

Three fundamental concepts:

1. **Tuples**: the atomic unit, a relationship between a user and an object
2. **Authorization model**: the rules defining which relationships exist and how they are inherited
3. **Queries**: questions about relationships — "can Alice view this document?"

Several implementations have emerged from this paper. The most relevant for the open-source ecosystem is **OpenFGA** (Fine-Grained Authorization), created by the Auth0 team and now a [CNCF project](https://www.cncf.io/projects/openfga/). It offers the same conceptual model as Zanzibar with a readable DSL, HTTP/gRPC APIs, and a [web playground](https://play.fga.dev/) for experimentation.

---

## The Tuple: The Basic Building Block

Everything in OpenFGA starts from a tuple. A tuple has three mandatory fields:

```json
{
  "user": "user:alice",
  "relation": "owner",
  "object": "document:readme"
}
```

`user` and `object` follow the `type:id` format. The type is not decorative: it is part of the authorization model's type system. `user:alice` is an entity of type `user` with id `alice`; `document:readme` is an entity of type `document` with id `readme`.

Consider [VaultDrive](https://github.com/monte97/VaultDrive) — a demo built specifically for this series, with reproducible code and a containerized setup. The first tuples you write are direct assignments:

```json
{ "user": "user:alice",   "relation": "owner",  "object": "document:readme" }
{ "user": "user:bob",     "relation": "editor", "object": "document:readme" }
{ "user": "user:charlie", "relation": "viewer", "object": "folder:project-x" }
```

"Alice is owner of document:readme" is not a global role. Alice is not "an owner" in general — she is owner *of that specific document*. If she creates a second document, a second tuple is required.

### Objects as Subjects

The `user` field does not have to contain a user. It can contain any entity in the system, including objects themselves. This is the mechanism that makes hierarchies possible:

```json
{ "user": "folder:project-x", "relation": "parent", "object": "document:readme" }
```

"Folder project-x is the parent of document readme." No user is involved in this tuple — it is a structural relationship between two objects. The authorization model uses this relationship to propagate permissions: anyone with access to the folder inherits access to the document.

### Userset: A Set as Subject

The third type of subject is a **userset**: not a single user or a single object, but *the set of all users who have a certain relation with an object*. It is written with `#`:

```json
{ "user": "folder:project-x#viewer", "relation": "viewer", "object": "document:readme" }
```

`folder:project-x#viewer` means "anyone who is a viewer of folder project-x." This tuple says: "all viewers of the folder are also viewers of the document." OpenFGA resolves the userset at runtime — when a Check arrives for `user:charlie viewer document:readme`, it verifies whether charlie is a viewer of the folder and finds it through the tuple assigning charlie to the folder.

This is the form OpenFGA builds internally whenever you write `viewer from parent` in the DSL. It is also the notation you will see in Expand API responses and `.fga.yaml` test files.

In summary, the `user` field in a tuple can be:

| Form | Example | Meaning |
|------|---------|---------|
| Direct identifier | `user:alice` | a single user |
| Object | `folder:project-x` | an object as a structural subject |
| Userset | `folder:project-x#viewer` | all users with that relation on that object |

Tuples are written via the Write API and persisted in a relational database (PostgreSQL, MySQL). Every change is a transaction: you can add and remove tuples atomically.

---

## The DSL: Types, Relations, Inheritance

Tuples define the data: who has which relation with what. The **authorization model** defines the structure: which object types exist, which relations are valid, and how permissions propagate.

OpenFGA uses a declarative DSL (Domain Specific Language). Start with the simplest case: a document with three access levels.

```dsl
model
  schema 1.1

type user

type document
  relations
    define owner: [user]
    define editor: [user] or owner
    define viewer: [user] or editor
```

This model says:

- There is a `user` type (with no relations of its own — it is the base entity)
- There is a `document` type with three relations: `owner`, `editor`, `viewer`
- `owner` can be directly assigned to a `user`
- `editor` can be directly assigned to a `user`, **or** is anyone who is `owner`
- `viewer` can be directly assigned to a `user`, **or** is anyone who is `editor`

Inheritance is declarative and transitive. If Alice is an owner, she is automatically also an editor and viewer. No three tuples needed — one is enough. The `or owner` clause in the `editor` definition and the `or editor` clause in the `viewer` definition create the chain: owner → editor → viewer.

### Adding Folders

Now make the model more realistic by adding folders and a `parent` relation:

```dsl
model
  schema 1.1

type user

type folder
  relations
    define owner: [user]
    define editor: [user] or owner
    define viewer: [user] or editor

type document
  relations
    define parent: [folder]
    define owner: [user]
    define editor: [user] or owner or editor from parent
    define viewer: [user] or editor or viewer from parent
```

The key addition is `editor from parent`. This clause says: "anyone who is an editor of the parent folder is also an editor of this document." If Bob is an editor of `folder:project-x`, and `folder:project-x` is the parent of `document:readme`, then Bob is an editor of `document:readme`.

Resolution happens at runtime. When you ask "can Bob edit document:readme?", OpenFGA:

1. Looks for direct tuples: is Bob an editor of document:readme? No.
2. Checks via owner: is Bob an owner of document:readme? No.
3. Checks via parent: which folder is the parent of document:readme? folder:project-x. Is Bob an editor of folder:project-x? Yes. Result: **allowed**.

This is the complete model used in [VaultDrive](https://github.com/monte97/VaultDrive), the demo project accompanying this series. In subsequent articles, we will extend it with organizations, teams, and multi-tenancy.

### What the DSL Cannot Do

OpenFGA's DSL is intentionally limited. It does not support arbitrary attribute-based conditions (that is ABAC territory), does not do string pattern matching, and does not evaluate arithmetic expressions. It does one thing only — resolving relationship graphs — and it does it very efficiently.

---

## The Three Fundamental Questions

Once tuples are written and the model is defined, OpenFGA answers three types of question. Each question corresponds to an API endpoint.

### Check: "Can this user do this thing?"

The most common question. Takes a user, a relation, and an object, and responds with a boolean.

```bash
curl -X POST http://localhost:8080/stores/$STORE_ID/check \
  -H "Content-Type: application/json" \
  -d '{
    "tuple_key": {
      "user": "user:alice",
      "relation": "viewer",
      "object": "document:readme"
    }
  }'
```

Response:

```json
{
  "allowed": true
}
```

This is the equivalent of an OPA check (`POST /v1/data/.../allow`), but the evaluation model is completely different. OPA executes Rego rules; OpenFGA traverses a relationship graph.

### ListObjects: "Which resources can this user see?"

Useful for populating a UI: show the user only the documents they have access to.

```bash
curl -X POST http://localhost:8080/stores/$STORE_ID/list-objects \
  -H "Content-Type: application/json" \
  -d '{
    "user": "user:alice",
    "relation": "viewer",
    "type": "document"
  }'
```

Response:

```json
{
  "objects": [
    "document:readme",
    "document:design-doc",
    "document:meeting-notes"
  ]
}
```

ListObjects is the most expensive operation: it must explore all tuples and resolve inheritance for every object of the requested type. In systems with millions of documents, use it carefully (pagination, caching, or pre-materialization).

### ListUsers: "Who has access to this resource?"

The inverse of ListObjects. Useful for auditing, compliance, or displaying the list of collaborators on a document.

```bash
curl -X POST http://localhost:8080/stores/$STORE_ID/list-users \
  -H "Content-Type: application/json" \
  -d '{
    "object": {
      "type": "document",
      "id": "readme"
    },
    "relation": "editor",
    "user_filters": [
      { "type": "user" }
    ]
  }'
```

Response:

```json
{
  "users": [
    { "object": { "type": "user", "id": "alice" } },
    { "object": { "type": "user", "id": "bob" } }
  ]
}
```

These three queries cover the majority of use cases. Check for access gating in middleware, ListObjects to filter resources in the UI, ListUsers for audit and sharing.

---

## RBAC, ABAC, ReBAC: When to Use What

Zanzibar does not make RBAC obsolete. Each model has its natural domain.

| Aspect | RBAC | ABAC | ReBAC (Zanzibar) |
|--------|------|------|-------------------|
| **Core concept** | Global roles | Attributes and policies | Relationships between entities |
| **Example** | admin, viewer, editor | `if user.dept == "finance" and resource.classification < 3` | `alice` is `editor` of `document:readme` |
| **Scales with** | Few roles, homogeneous resources | Dynamic conditions, variable attributes | Hierarchies, sharing, ownership |
| **Weak point** | Explodes with hierarchies and granular resources | Policy complexity (Rego/Cedar) | Overhead for simple cases |
| **Typical tool** | Keycloak roles, Spring Security | OPA/Rego, AWS Cedar | OpenFGA, SpiceDB, Authzed |
| **Use when** | Internal apps with 3–5 fixed roles | Context-based rules (time, IP, user attributes) | Systems with hierarchical resources and sharing |

In practice, these models complement each other. A real system might use Keycloak for authentication and global roles (admin/user), OPA for context-dependent policies (deny lists, rate limiting), and OpenFGA for fine-grained resource permissions (who can see which document).

The next article in this series covers exactly this integration: Keycloak for login, OpenFGA for fine-grained authorization.

---

## Minimal Setup with Docker Compose

Experimenting with OpenFGA requires very little: the OpenFGA server, a PostgreSQL database for tuples, and optionally the web Playground.

```yaml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: openfga
      POSTGRES_PASSWORD: openfga
      POSTGRES_DB: openfga
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U openfga -d openfga"]
      interval: 5s
      timeout: 3s
      retries: 5

  openfga-migrate:
    image: openfga/openfga:v1.8
    command: migrate
    environment:
      OPENFGA_DATASTORE_ENGINE: postgres
      OPENFGA_DATASTORE_URI: postgres://openfga:openfga@postgres:5432/openfga?sslmode=disable
    depends_on:
      postgres:
        condition: service_healthy

  openfga:
    image: openfga/openfga:v1.8
    command: run
    environment:
      OPENFGA_DATASTORE_ENGINE: postgres
      OPENFGA_DATASTORE_URI: postgres://openfga:openfga@postgres:5432/openfga?sslmode=disable
      OPENFGA_PLAYGROUND_ENABLED: "true"
    ports:
      - "8080:8080"   # HTTP API
      - "8081:8081"   # gRPC
      - "3000:3000"   # Playground
    depends_on:
      openfga-migrate:
        condition: service_completed_successfully

volumes:
  pgdata:
```

The Compose file has three services but two images: `openfga-migrate` and `openfga` use the same image with different commands. `openfga-migrate` runs `migrate` — creates the tables in PostgreSQL — then exits. Only when it exits successfully (`service_completed_successfully`) does Docker Compose start `openfga run`, the actual server. This is the standard pattern for separating database migration from application startup: it avoids having to handle "retry until schema is ready" logic inside the server itself.

Start everything with `docker compose up -d`. After a few seconds, the Playground is available at `http://localhost:3000` — a web interface where you can write models, add tuples, and test queries without writing curl commands.

### First Store and First Model

OpenFGA organizes data into **stores**, isolated containers (similar to Keycloak realms). Create the first store:

```bash
curl -X POST http://localhost:8080/stores \
  -H "Content-Type: application/json" \
  -d '{ "name": "vaultdrive" }'
```

The response contains the store `id`. Export it as a variable:

```bash
export STORE_ID=<id-from-response>
```

Now write the authorization model. The body uses the JSON format of the DSL:

```bash
curl -X POST http://localhost:8080/stores/$STORE_ID/authorization-models \
  -H "Content-Type: application/json" \
  -d '{
    "schema_version": "1.1",
    "type_definitions": [
      { "type": "user" },
      {
        "type": "document",
        "relations": {
          "owner":  { "this": {} },
          "editor": { "union": { "child": [{ "this": {} }, { "computedUserset": { "relation": "owner" } }] } },
          "viewer": { "union": { "child": [{ "this": {} }, { "computedUserset": { "relation": "editor" } }] } }
        },
        "metadata": {
          "relations": {
            "owner":  { "directly_related_user_types": [{ "type": "user" }] },
            "editor": { "directly_related_user_types": [{ "type": "user" }] },
            "viewer": { "directly_related_user_types": [{ "type": "user" }] }
          }
        }
      }
    ]
  }'
```

The JSON format is verbose — in practice you use the textual DSL via the [Playground](https://play.fga.dev/) or the [`fga` CLI](https://openfga.dev/docs/getting-started/cli). Under the hood, the DSL compiles to this JSON.

### First Tuple and First Check

Write a tuple: Alice is the owner of document:readme.

```bash
curl -X POST http://localhost:8080/stores/$STORE_ID/write \
  -H "Content-Type: application/json" \
  -d '{
    "writes": {
      "tuple_keys": [
        {
          "user": "user:alice",
          "relation": "owner",
          "object": "document:readme"
        }
      ]
    }
  }'
```

Now verify: can Alice view document:readme? Recall that in the model, `viewer` inherits from `editor`, which inherits from `owner`.

```bash
curl -X POST http://localhost:8080/stores/$STORE_ID/check \
  -H "Content-Type: application/json" \
  -d '{
    "tuple_key": {
      "user": "user:alice",
      "relation": "viewer",
      "object": "document:readme"
    }
  }'
```

```json
{ "allowed": true }
```

Alice is the owner, so she is also editor and viewer. One tuple, three permissions resolved through the model.

What about Bob? He has no tuple on document:readme.

```bash
curl -X POST http://localhost:8080/stores/$STORE_ID/check \
  -H "Content-Type: application/json" \
  -d '{
    "tuple_key": {
      "user": "user:bob",
      "relation": "viewer",
      "object": "document:readme"
    }
  }'
```

```json
{ "allowed": false }
```

Deny-by-default: if no tuple exists (direct or inherited), access is denied.

---

## What Comes Next

This article covered the fundamentals: the problem with RBAC and hierarchies, Zanzibar's tuple model, OpenFGA's DSL, the three main query types, and a working setup for experimentation.

The next article connects OpenFGA to Keycloak: users log in with Keycloak (authentication), and fine-grained resource permissions are handled by OpenFGA (authorization). We will use [VaultDrive](https://github.com/monte97/VaultDrive) as the reference project — a document-sharing application that puts everything covered here into practice.

The complete code for the minimal setup and the VaultDrive model is available in the [GitHub repository](https://github.com/monte97/VaultDrive).

### Resources

**Original paper:**
- [Zanzibar: Google's Consistent, Global Authorization System](https://research.google/pubs/pub48190/) — the 2019 Google paper that started it all

**Demo repository:**
- [VaultDrive on GitHub](https://github.com/monte97/VaultDrive)

**OpenFGA documentation:**
- [Core concepts](https://openfga.dev/docs/concepts) — tuples, stores, authorization models
- [Configuration Language (DSL)](https://openfga.dev/docs/configuration-language) — complete DSL reference
- [Setup with Docker](https://openfga.dev/docs/getting-started/setup-openfga/docker)
- [OpenFGA CLI (`fga`)](https://openfga.dev/docs/getting-started/cli)
- [Interactive Playground](https://play.fga.dev/) — experiment with models and queries in the browser
- [OpenFGA on CNCF](https://www.cncf.io/projects/openfga/)

**Related articles:**
- [Next: OpenFGA + Keycloak]({{< ref "/blog/verificare/openfga/02-openfga-keycloak/" >}})
- [Authorization with OPA and Keycloak]({{< ref "/blog/progettare/keycloak/05-keycloak-opa/" >}})
