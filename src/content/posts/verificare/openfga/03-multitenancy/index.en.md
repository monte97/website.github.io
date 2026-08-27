---
title: "Multi-tenancy with OpenFGA: Isolation Without Multiplying Complexity"
date: 2026-04-04T09:00:00.000Z
description: "Two strategies for multi-tenancy with OpenFGA: store-per-tenant and type-per-tenant. How to achieve structural isolation without scattering WHERE tenant_id everywhere."
pillar: verificare
category: openfga
tags:
  - OpenFGA
  - Multitenancy
  - Authorization
  - ReBAC
  - Zanzibar
series: openfga
seriesOrder: 30
lang: en
reviewed: machine
---

Every SaaS application eventually reaches the same point: the first customer works, the second too, but by the third it becomes clear that tenant isolation is not an implementation detail — it is the architecture itself. With traditional RBAC, the typical solution is a `WHERE tenant_id = ?` on every query, middleware that injects tenant context, and the constant risk that a bug leaks data between organizations. With ReBAC the problem is approached differently: isolation is not applicative but **structural**. If a user has no relationships with an organization, they cannot access anything within it. No `WHERE` clause required.

The two strategies for managing multi-tenancy with OpenFGA build on the concepts introduced in the [first article](/en/blog/verificare/openfga/01-zanzibar-concetti/) of this series.

---

## The Multi-Tenant Problem with Classic Authorization

In a traditional RBAC system, roles are global. A user has the `editor` role, full stop. To make that work in a multi-tenant context, you have to inject the tenant context everywhere:

```sql
SELECT * FROM documents
WHERE tenant_id = :current_tenant
AND has_permission(:user_id, 'read', 'document')
```

The application code becomes responsible for isolation. Every endpoint, every query, every service must know which tenant it is operating in and filter accordingly. Miss a `WHERE` clause in one query, forget a filter on one endpoint, and you have a cross-tenant data leak.

The problem is not technical in a strict sense — the pattern works. The problem is that isolation lives in the application code, distributed across dozens of files, and its correctness depends on every developer applying it everywhere.

With ReBAC, isolation works differently. You do not filter results after retrieving them: you ask directly "which documents can Alice see?" and the relationship graph returns only those reachable through her relationships. If Alice has no relationships with `org-beta`, no document from `org-beta` will ever appear in the results. Isolation is not a filter — it is a property of the graph.

---

## Two Strategies: Store-per-Tenant vs Type-per-Tenant

OpenFGA offers two architectural approaches to multi-tenancy. The choice depends on isolation requirements, compliance, and operational complexity.

### Store-per-Tenant

Each organization gets its own OpenFGA store. Complete physical isolation: the tuples of one tenant do not even share storage with those of another.

```text
Store: org-acme     --> model + tuples for Acme
Store: org-beta     --> model + tuples for Beta
Store: org-gamma    --> model + tuples for Gamma
```

**When it makes sense:**

- **Strict compliance**: regulations requiring physical isolation of authorization data between tenants
- **Different models per tenant**: an enterprise customer needs complex hierarchies, a small customer needs simple roles
- **Scale limits**: distributing load across separate stores

**The drawbacks:**

- **Operational management**: N stores to manage, each with its own lifecycle
- **Model migration**: every authorization model update requires applying the migration to all stores
- **No cross-tenant queries**: finding "which organizations does Alice have access to?" has no single point of query
- **Routing**: the application code must know which store to query for each request, adding middleware complexity

### Type-per-Tenant

A single store, with the organization as the root of the relationship graph. Isolation is logical, not physical: tuples for all tenants live in the same store, but the graph structure ensures that each tenant sees only what belongs to it.

```text
Store: single
  org:org-acme  --> Acme tuples (linked via relationships)
  org:org-beta  --> Beta tuples (linked via relationships)
```

**When it makes sense:**

- **Most SaaS cases**: one model, different tuples per tenant
- **Cross-tenant queries**: a user can belong to multiple organizations
- **Operational simplicity**: one store to manage, one model to migrate

For the rest of this article, we focus on this second strategy: it covers the majority of real-world cases and is what [VaultDrive](https://github.com/monte97/VaultDrive) uses — the demo built for this series with a containerized setup and reproducible code.

---

## The Org as the Graph Root

The idea is straightforward: every resource in the system has a relationship that anchors it to an organization. The organization becomes the root of the sub-graph containing everything that belongs to it: users, folders, documents.

Here is the DSL model:

```dsl
model
  schema 1.1

type user

type org
  relations
    define admin: [user]
    define member: [user] or admin

type folder
  relations
    define org: [org]
    define owner: [user]
    define editor: [user] or owner or admin from org
    define viewer: [user] or editor or member from org
    define parent: [folder]
    define can_edit: editor or can_edit from parent
    define can_view: viewer or can_view from parent

type document
  relations
    define org: [org]
    define owner: [user]
    define editor: [user] or owner or admin from org
    define viewer: [user] or editor or member from org
    define parent: [folder]
    define can_edit: editor or can_edit from parent
    define can_view: viewer or can_view from parent
```

Key points in the model:

- **`org` as a relation**: every `folder` and every `document` has an `org` relation that connects it to its organization. It is not an attribute — it is a relationship in the graph.
- **Inheritance from org**: `member from org` means "anyone who is a member of the organization connected to this resource." The admin of `org-acme` is automatically an editor of all documents that have `org:org-acme` as their organization.
- **Inheritance from folder**: `can_view from parent` allows inheriting permissions from the parent folder, as covered in earlier articles.

---

## The Concrete Tuples

Suppose we have two organizations with their respective users and resources:

```text
// Org Acme: alice is admin, bob is member
org:org-acme#admin@user:alice
org:org-acme#member@user:bob

// Org Beta: charlie is admin, diana is member
org:org-beta#admin@user:charlie
org:org-beta#member@user:diana

// Acme resources
folder:folder-acme#org@org:org-acme
document:doc-acme#org@org:org-acme
document:doc-acme#parent@folder:folder-acme

// Beta resources
folder:folder-beta#org@org:org-beta
document:doc-beta#org@org:org-beta
document:doc-beta#parent@folder:folder-beta
```

With these tuples, the situation is clear:

- **alice** (admin of org-acme) can edit `doc-acme` through the `admin from org` rule. OpenFGA follows the path: `user:alice` → `org:org-acme#admin` → `document:doc-acme` has `org:org-acme` as its org → the `admin from org` clause on the `editor` relation resolves positively.
- **charlie** (admin of org-beta) can edit `doc-beta` for the same reason, through `org:org-beta`.
- **alice cannot do anything with doc-beta**: she has no relationships with `org-beta`, so no path exists in the graph connecting `user:alice` to `document:doc-beta`. Every resolution attempt stops: `admin from org` looks for an admin of the organization linked to `doc-beta`, which is `org-beta`, and alice is not an admin of `org-beta`.
- **charlie cannot do anything with doc-acme**: same logic, opposite direction.

No application-level filter is needed. The graph structure *is* the filter.

---

## Structural Isolation, Not Applicative

This is the central point. With ReBAC and the type-per-tenant pattern, isolation is not the application code's responsibility. It is a property of the relationship graph.

When charlie (admin of org-beta) calls the `ListObjects` API to get the documents he can view, OpenFGA traverses the graph starting from `user:charlie`, follows the relationships, and returns only reachable documents. `doc-acme` is not reachable from charlie because no path in the graph connects them.

```python
# The application code does not filter by tenant.
# It asks and receives only what the user can see.
response = fga_client.list_objects(
    ListObjectsRequest(
        user="user:charlie",
        relation="viewer",
        type="document"
    )
)
# response.objects == ["document:doc-beta"]
```

Compare with the RBAC equivalent:

```python
# With RBAC, you must filter explicitly
documents = db.query(
    "SELECT * FROM documents WHERE tenant_id = :tenant AND ...",
    tenant=current_tenant
)
```

The difference is not merely aesthetic. In the second case, forgetting the `tenant_id` filter on one endpoint produces a data leak. In the first, the filter does not exist in code because it is not needed: isolation is in the data, not in the logic.

This simplifies testing as well. With RBAC you must test that every endpoint correctly applies the `tenant_id` filter — and these are negative tests, the easiest to forget. With ReBAC, isolation is verified once in the model and applies to all endpoints. The `.fga.yaml` test files cover the model; the application code has no isolation logic to test.

---

## Per-Tenant Overrides: Same Model, Different Rules

A less obvious advantage of the type-per-tenant pattern is that you can have different policies per organization without writing different code. The model is the same for everyone; only the tuples change.

Concrete example: org-acme wants an open policy — all members can view all organization documents. Org-beta is more restrictive: access is granted only per folder.

For org-acme, nothing special is needed: the `member from org` rule in the model already ensures that all members see all documents linked to the organization.

For org-beta, simply do not write the tuple that links the document directly to the organization for the `viewer` relation, and manage access through folders:

```text
// Org Beta: folder-based access, not global
folder:folder-beta-hr#org@org:org-beta
folder:folder-beta-hr#viewer@user:diana

document:doc-beta-hr-1#parent@folder:folder-beta-hr
document:doc-beta-hr-1#org@org:org-beta
```

Diana can see `doc-beta-hr-1` because she is a viewer of the `folder-beta-hr` folder. But if org-beta creates another folder `folder-beta-finance` without giving diana access, she will see nothing inside it.

The application code does not change. The same `Check` API and the same `ListObjects` work for both organizations. The difference is entirely in the tuples.

This is powerful for product teams: they can offer plans with different access levels without involving developers. The "Enterprise" plan gives granular per-folder access; the "Team" plan gives access to everything in the organization. Same codebase, different tuples in tenant provisioning.

---

## Cross-Tenant Users

In the real world, users do not belong to a single tenant. An external consultant may collaborate with multiple organizations. An auditor may have read-only access to documents from different clients.

With ReBAC, managing cross-tenant users is natural. Tuples are independent: you can write relationships for the same user in different organizations without conflicts.

```text
// Eve is a member of org-acme
org:org-acme#member@user:eve

// Eve is also a viewer of a specific document in org-beta
document:doc-beta-public#viewer@user:eve
```

Eve can see all documents in org-acme (through the `member from org` rule) and can see `doc-beta-public` in org-beta (through the direct tuple). She cannot see other documents from org-beta: the tuple is specific to that document.

No conflicts, no ambiguity. The graph is additive: each tuple adds a path; it does not modify existing ones. There is no risk that giving eve access in org-beta also gives her access to things in org-acme or vice versa.

This scenario is common with service accounts as well. A notification system might need to read documents across all organizations to send weekly digests. Simply add the service user as a member of each organization, or grant granular access only to the relevant documents. The model does not change — only the tuples you write.

With traditional RBAC, managing cross-tenant users requires complex application logic: join tables between users and tenants, middleware managing multiple contexts, and endpoints accepting the tenant as an explicit parameter. With ReBAC, it is a tuple.

---

## Tests as Proof of Isolation

With OpenFGA you can write declarative tests in `.fga.yaml` format that verify isolation between tenants. This is not a heavyweight integration test — it is a readable specification that documents and verifies the model's guarantees.

```yaml
name: Multitenancy Isolation Tests
model_file: model.fga
tuples:
  # Org Acme
  - user: user:alice
    relation: admin
    object: org:org-acme
  - user: user:bob
    relation: member
    object: org:org-acme
  - user: org:org-acme
    relation: org
    object: folder:folder-acme
  - user: org:org-acme
    relation: org
    object: document:doc-acme
  - user: folder:folder-acme
    relation: parent
    object: document:doc-acme

  # Org Beta
  - user: user:charlie
    relation: admin
    object: org:org-beta
  - user: user:diana
    relation: member
    object: org:org-beta
  - user: org:org-beta
    relation: org
    object: folder:folder-beta
  - user: org:org-beta
    relation: org
    object: document:doc-beta
  - user: folder:folder-beta
    relation: parent
    object: document:doc-beta

  # Cross-tenant: eve in both orgs
  - user: user:eve
    relation: member
    object: org:org-acme
  - user: user:eve
    relation: viewer
    object: document:doc-beta

tests:
  - name: Alice (admin org-acme) accesses only Acme resources
    check:
      - user: user:alice
        object: document:doc-acme
        assertions:
          can_view: true
          can_edit: true
      - user: user:alice
        object: document:doc-beta
        assertions:
          can_view: false
          can_edit: false

  - name: Charlie (admin org-beta) accesses only Beta resources
    check:
      - user: user:charlie
        object: document:doc-beta
        assertions:
          can_view: true
          can_edit: true
      - user: user:charlie
        object: document:doc-acme
        assertions:
          can_view: false
          can_edit: false

  - name: Bob (member org-acme) sees Acme, not Beta
    check:
      - user: user:bob
        object: document:doc-acme
        assertions:
          can_view: true
          can_edit: false
      - user: user:bob
        object: document:doc-beta
        assertions:
          can_view: false

  - name: Eve (cross-tenant) sees Acme and only doc-beta-public
    check:
      - user: user:eve
        object: document:doc-acme
        assertions:
          can_view: true
      - user: user:eve
        object: document:doc-beta
        assertions:
          can_view: true
      - user: user:eve
        object: folder:folder-beta
        assertions:
          can_view: false
```

Each `check` section verifies a precise aspect of isolation:

- alice sees and edits org-acme documents, **not** org-beta documents
- charlie sees and edits org-beta documents, **not** org-acme documents
- bob, a regular org-acme member, can view documents but cannot edit them
- eve, a cross-tenant user, sees org-acme documents (she is a member) and the single org-beta document she has a direct tuple for, but cannot access org-beta folders

These tests run with [`openfga model test`](https://openfga.dev/docs/getting-started/testing/modeled-access) (`--tests model.fga.yaml`) and fail immediately if anything in the model breaks isolation. They are the safety net that lets you evolve the model without fear of introducing cross-tenant leaks.

---

## When to Reconsider: Store-per-Tenant

The type-per-tenant pattern covers most SaaS cases, but there are situations where store-per-tenant is the right choice:

- **Regulatory compliance**: some regulations (healthcare, finance) require physical isolation of data, not just logical isolation. If an enterprise customer requires a guarantee that their authorization tuples do not share storage with those of others, store-per-tenant is the only option.
- **Different models per tenant**: if a customer needs an authorization model significantly different from others (custom hierarchies, specific resource types), a single store with a single model is not sufficient.
- **Scale limits**: with millions of tuples, partitioning by store can improve query performance. OpenFGA scales well, but distributing load across separate stores remains an option.

The good news is that migrating from type-per-tenant to store-per-tenant is incremental. The DSL model is the same; only the deployment and request routing change. You can start with a single store and migrate tenants that require it to dedicated stores as needed.

A hybrid approach is workable: most tenants share a single store, while those with special requirements have dedicated stores. The application code only needs a routing layer that maps `tenant_id` to `store_id`, and the rest works the same way.

---

## Summary

| Aspect | Store-per-tenant | Type-per-tenant |
|--------|-----------------|-----------------|
| Isolation | Physical | Logical (structural) |
| Operational complexity | High (N stores) | Low (1 store) |
| Different models per tenant | Supported | Not supported |
| Cross-tenant queries | Not possible | Natural |
| Strict compliance | Well-suited | Evaluate case by case |
| Typical use case | Regulated enterprise | Standard SaaS |

Multi-tenancy with OpenFGA does not require dedicated middleware, filters scattered through the code, or hoping that nobody forgets a `WHERE`. With the type-per-tenant pattern, the organization becomes the graph root and isolation is a consequence of structure, not of an application-level filter.

The next article covers deep hierarchies and complex queries with OpenFGA, addressing the patterns for navigating intricate relationship graphs without sacrificing performance.

### Resources

**Demo repository:**
- [VaultDrive on GitHub](https://github.com/monte97/VaultDrive)

**OpenFGA documentation:**
- [OpenFGA - Multi-tenancy](https://openfga.dev/docs/modeling/advanced/multi-tenancy)
- [OpenFGA - Store concept](https://openfga.dev/docs/concepts#what-is-a-store)
- [OpenFGA - Model Testing (`fga model test`)](https://openfga.dev/docs/getting-started/testing/modeled-access)
- [OpenFGA - Configuration Language (DSL)](https://openfga.dev/docs/configuration-language)

**Related articles:**
- [Previous: Zanzibar and the core concepts](/en/blog/verificare/openfga/01-zanzibar-concetti/)
- [OpenFGA + Keycloak](/en/blog/verificare/openfga/02-openfga-keycloak/)
- [Next: Deep hierarchies and inverse queries](/en/blog/verificare/openfga/04-gerarchie-query/)
