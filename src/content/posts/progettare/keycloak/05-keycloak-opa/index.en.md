---
title: "Fine-Grained Authorization with OPA and Keycloak: Separating Authentication from Authorization"
date: 2026-02-06T09:00:00.000Z
description: "How to integrate Open Policy Agent with Keycloak in an Express application to decouple authentication from authorization. Three concrete patterns: RBAC, deny list, and ownership."
pillar: progettare
category: keycloak
tags:
  - OPA
  - Keycloak
  - Authorization
  - Rego
  - OpenPolicyAgent
series: keycloak
seriesOrder: 50
lang: en
reviewed: machine
---

Blocking a user from checkout when their JWT claim is still valid until token expiry. Adding an access rule and having to touch Keycloak, the Express code, and possibly a custom mapper too. These are common problems when authentication and authorization are not kept separate.

In a system that uses Keycloak for both responsibilities, access rules end up scattered across JWT claims, custom mappers, and application logic. It works, but it creates coupling: changing who can do what requires touching Keycloak, the code, or both.

Separating the two responsibilities solves both problems: **Keycloak authenticates** (who you are), **OPA authorizes** (what you can do). The integration is demonstrated in MockMart, the same e-commerce demo used in previous articles, with three concrete patterns:

1. **RBAC on products**: only admin can create, update, and delete
2. **Deny list on checkout**: immediate block without re-login
3. **Ownership on orders**: each user sees only their own

---

## The Model: OPA as an HTTP Sidecar

Open Policy Agent (OPA) is a general-purpose policy engine. It receives an authorization decision request via HTTP, evaluates it against rules written in Rego (its declarative language), and responds with a boolean.

In the MockMart context, OPA runs as a separate container in the Docker network. Shop API calls it before executing protected operations.

### Updated Architecture

```text
Gateway (nginx:80)
+-- /        -> shop-ui (React SPA, :3000)
+-- /api/    -> shop-api (Node.js/Express, :3001)
+-- /auth/   -> keycloak (:8080)

shop-api --> opa (:8181)              <-- new
shop-api --> postgres, payment, inventory, notification
```

### Request Flow for a Protected Operation

1. The browser calls `shop-api` with a bearer token
2. `auth.js` validates the JWT via JWKS and populates `req.user` (id, roles, username)
3. `opa.js` builds an input object and calls OPA
4. OPA evaluates the Rego policy and responds with `{ "result": true }` or `{ "result": false }`. If no rule matches (wrong package, policy not loaded), OPA returns `{}` with no `result` key
5. If `allow = true`, the route handler executes. If `false`, the middleware responds `403 Forbidden`

### Separation of Responsibilities

| Component | Responsibility |
|---|---|
| Keycloak | Authentication, JWT issuance, user and role management |
| `auth.js` (Express) | JWT validation, identity extraction |
| OPA | Authorization decision (allow/deny) |
| Rego policy | Rules: who can do what on which resource |

Keycloak does not need to know anything about business rules. OPA does not need to know how login works. Each component has a clear boundary.

---

## Rego Policies: Three Concrete Patterns

Policies are `.rego` files mounted as a volume in the OPA container. Each file corresponds to an authorization domain.

```
services/opa/
+-- policies/
|   +-- products.rego      # RBAC by role
|   +-- orders.rego        # Visibility by ownership
|   +-- checkout.rego      # Deny list
+-- data.json              # External data (blocked users)
```

### Products: RBAC by Role

Rule: everyone can read products, only admin can create, update, and delete.

```rego
package mockmart.products

default allow = false

# Everyone can read
allow if {
    input.action == "read"
}

# Only admin can create/update/delete
allow if {
    input.action in {"create", "update", "delete"}
    "admin" in input.user.roles
}
```

`default allow = false` is the deny-by-default principle: if no rule matches, access is denied. Each `allow if { ... }` block defines a sufficient condition to grant access. Conditions inside a block are ANDed together: all must be true.

### Checkout: External Deny List

In the base MockMart stack, blocking a user at checkout is done via a `canCheckout` JWT claim. If a user is blocked in Keycloak, they must re-login for the claim in the token to change. With OPA, the block is immediate.

```rego
package mockmart.checkout

import data.mockmart.blocked_users

default allow = false

allow if {
    input.action == "checkout"
    not is_blocked
}

is_blocked if {
    input.user.username == blocked_users[_]
}
```

The list of blocked users comes from `data.json`, an external file mounted in the OPA container:

```json
{
  "mockmart": {
    "blocked_users": [
      "blocked"
    ]
  }
}
```

`import data.mockmart.blocked_users` makes this array available in the policy. To block a user, add their username to the file and restart the OPA container (`docker compose restart opa`): no changes to Keycloak, no application redeploy. For environments that require hot reload without a restart, OPA supports the [Bundle API](https://www.openpolicyagent.org/docs/latest/management-bundles/) with periodic HTTP-based updates.

### Orders: Ownership

Rule: admin sees all orders, a regular user sees only their own.

```rego
package mockmart.orders

default allow = false

# Admin can list and read all orders
allow if {
    input.action in {"list", "read"}
    "admin" in input.user.roles
}

# Users: only their own orders
allow if {
    input.action in {"list", "read"}
    input.resource_owner == input.user.id
}
```

This policy introduces the concept of **resource owner**: the input includes both the user's identity (`input.user.id`) and the resource owner (`input.resource_owner`). The Express middleware is responsible for populating this field before calling OPA.

---

## The Express Middleware

The `opa.js` middleware has two responsibilities: building the input object for OPA and handling the response.

```javascript
const OPA_URL = process.env.OPA_URL || 'http://opa:8181';
const AUTHORIZATION_MODE = process.env.AUTHORIZATION_MODE || 'claims';

async function checkPolicy(packageName, input) {
  const url = `${OPA_URL}/v1/data/mockmart/${packageName}/allow`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input })
  });

  if (!res.ok) {
    throw new Error(`OPA returned ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return data.result === true;
}
```

`checkPolicy` calls the OPA Data API endpoint: `POST /v1/data/mockmart/{package}/allow`. The body contains `{ input: {...} }`, the response is `{ result: true|false }`. The `data.result === true` check also handles the case where OPA returns `{}` (no `result` key): in that case access is denied, consistent with the deny-by-default principle.

```javascript
function requirePolicy(packageName, action) {
  return async (req, res, next) => {
    if (AUTHORIZATION_MODE !== 'opa') {
      return next();
    }

    const input = {
      user: req.user ? {
        id: req.user.id,
        username: req.user.username,
        roles: req.user.roles,
        email: req.user.email
      } : null,
      action: typeof action === 'function' ? action(req) : action
    };

    if (req.opaContext) {
      Object.assign(input, req.opaContext);
    }

    try {
      const allowed = await checkPolicy(packageName, input);
      if (!allowed) {
        return res.status(403).json({ error: 'Forbidden by policy' });
      }
      next();
    } catch (error) {
      console.error('OPA policy check failed:', error.message);
      return res.status(503).json({ error: 'Authorization service unavailable' });
    }
  };
}
```

Three aspects worth noting:

- **`AUTHORIZATION_MODE` switch**: if the value is not `opa`, the middleware passes through. This ensures `make up` (base stack) continues to work with claim-based logic, unchanged.
- **`req.opaContext`**: upstream middleware can attach extra context (e.g. `resource_owner` for orders). `requirePolicy` automatically includes it in the OPA input.
- **Fail closed**: if OPA is unreachable, the middleware responds with `503 Service Unavailable` instead of letting the request through. In an authorization system, the default on error must be deny.

---

## Integration in Routes

Each protected route adds `requirePolicy` to the middleware chain, after `requireAuth`.

### Products

```javascript
// Everyone can read
app.get('/api/products', optionalAuth, requirePolicy('products', 'read'), handler);

// Only admin can modify
app.post('/api/products',       requireAuth, requirePolicy('products', 'create'), handler);
app.put('/api/products/:id',    requireAuth, requirePolicy('products', 'update'), handler);
app.delete('/api/products/:id', requireAuth, requirePolicy('products', 'delete'), handler);
```

The second parameter of `requirePolicy` is the action: a string that matches the value the Rego policy expects in `input.action`.

### Checkout

```javascript
app.post('/api/checkout', requireAuth, requirePolicy('checkout', 'checkout'), async (req, res) => {
  const user = req.user;

  // In claims mode, check canCheckout from the JWT
  if (process.env.AUTHORIZATION_MODE !== 'opa' && !user.canCheckout) {
    return res.status(403).json({ error: 'You are not authorized to checkout.' });
  }
  // ...
});
```

The `AUTHORIZATION_MODE !== 'opa'` guard preserves the original behavior (JWT claim) when OPA is not active.

### Orders: Populating the Resource Owner

For orders, the middleware needs to know who owns the resource before calling OPA.

**Order list**: the owner is the current user (each user lists their own).

```javascript
app.get('/api/orders', requireAuth, (req, res, next) => {
  req.opaContext = { resource_owner: req.user.id };
  next();
}, requirePolicy('orders', 'list'), handler);
```

**Order detail**: requires a database query to know who created the order.

```javascript
app.get('/api/orders/:id', requireAuth, async (req, res, next) => {
  if (process.env.AUTHORIZATION_MODE === 'opa') {
    const result = await pool.query('SELECT user_id FROM orders WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    req.opaContext = { resource_owner: result.rows[0].user_id };
  }
  next();
}, requirePolicy('orders', 'read'), handler);
```

This is where the cost of separation becomes visible: for ownership-based decisions, an additional query is required. The trade-off is acceptable when access rules change frequently or involve complex conditions.

---

## Testing and Verification

### Offline Policy Testing

Rego policies can be tested without starting any container. Test files use the `test_` naming convention:

```rego
package mockmart.products

test_allow_read_without_auth if {
    allow with input as {"action": "read", "user": null}
}

test_deny_create_as_user if {
    not allow with input as {"action": "create", "user": {"roles": ["user"]}}
}

test_allow_create_as_admin if {
    allow with input as {"action": "create", "user": {"roles": ["admin"]}}
}
```

```bash
$ make opa-test

data.mockmart.products.test_allow_read_without_auth: PASS
data.mockmart.products.test_deny_create_as_user: PASS
data.mockmart.products.test_allow_create_as_admin: PASS
data.mockmart.orders.test_allow_admin_list_all: PASS
data.mockmart.orders.test_deny_user_list_other: PASS
data.mockmart.checkout.test_deny_blocked_user: PASS
...
PASS: 17/17
```

Offline testability is one of OPA's primary advantages: the input is JSON, the output is a boolean. No tokens needed, no Keycloak required.

### End-to-End Verification

With the stack running (`make up-opa`), flows can be verified with curl.

> **Note:** the examples use `grant_type=password` (Resource Owner Password Credentials) to obtain tokens from the terminal quickly. This flow is deprecated ([RFC 9700](https://datatracker.ietf.org/doc/html/rfc9700)) and enabled in MockMart only for local testing. In production, use Authorization Code + PKCE for users and client credentials for services.

**Regular user attempts to create a product:**

```bash
$ TOKEN=$(curl -s -X POST "http://localhost:8080/auth/realms/techstore/protocol/openid-connect/token" \
  -d "grant_type=password" -d "client_id=shop-ui" \
  -d "username=mario" -d "password=mario123" | jq -r '.access_token')

$ curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","price":10,"category":"test"}' \
  http://localhost:3001/api/products

{"error":"Forbidden by policy"}    # HTTP 403
```

**Admin creates a product:**

```bash
$ TOKEN=$(curl -s -X POST "http://localhost:8080/auth/realms/techstore/protocol/openid-connect/token" \
  -d "grant_type=password" -d "client_id=shop-ui" \
  -d "username=admin" -d "password=admin123" | jq -r '.access_token')

$ curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Product","price":29.99,"category":"electronics"}' \
  http://localhost:3001/api/products

{"id":13,"name":"New Product","price":29.99,...}    # HTTP 201
```

**Blocked user attempts checkout:**

```bash
$ TOKEN=$(curl -s -X POST "http://localhost:8080/auth/realms/techstore/protocol/openid-connect/token" \
  -d "grant_type=password" -d "client_id=shop-ui" \
  -d "username=blocked" -d "password=blocked123" | jq -r '.access_token')

$ curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"shippingAddress":{...},"paymentMethod":"credit-card"}' \
  http://localhost:3001/api/checkout

{"error":"Forbidden by policy"}    # HTTP 403
```

---

## Comparison: JWT Claims vs OPA

| Aspect | JWT Claims (`canCheckout`) | OPA (Deny List + Policy) |
|---|---|---|
| Block a user | Modify attribute in Keycloak, user must re-login | Edit `data.json`, immediate effect |
| Add a rule | New claim + KC mapper + Express code | New Rego rule, no application redeploy |
| Where rules live | Scattered across KC config, mappers, and code | Centralized in `services/opa/policies/` |
| Testability | Requires real tokens and active Keycloak | JSON input, boolean output, testable offline |
| Added latency | None (claim already in token) | One extra local HTTP call |
| Infrastructure complexity | None | Additional container to manage |

Neither approach is universally better. JWT claims work well when rules are few and static. OPA becomes advantageous when rules change frequently, involve external data (deny lists, ownership), or need to be tested in isolation.

---

## Docker Stack

OPA is added to the stack via a Docker Compose override file, without modifying the base configuration:

```yaml
# docker-compose.opa.yml
services:
  opa:
    image: openpolicyagent/opa:latest-debug
    command: run --server --log-level info --addr :8181 /policies /data.json
    ports:
      - "8181:8181"
    volumes:
      - ./services/opa/policies:/policies:ro
      - ./services/opa/data.json:/data.json:ro
    networks:
      - demo

  shop-api:
    environment:
      - OPA_URL=http://opa:8181
      - AUTHORIZATION_MODE=opa
```

> **Note:** the example uses `latest-debug` for convenience (it includes a shell useful for debugging). In production, pin a specific version (e.g. `openpolicyagent/opa:1.4.2`) for reproducibility and security.

Two commands to manage the stack:

```bash
# Start stack with OPA
make up-opa

# Base stack (without OPA, claims-based logic)
make up
```

`make up` continues to work exactly as before. Adding OPA is purely additive.

---

## Conclusions

Separating authentication (Keycloak) from authorization (OPA) produces a system where each component has a clear boundary. Keycloak answers "who you are"; OPA answers "what you can do."

The three implemented patterns cover common scenarios:
- **RBAC**: actions restricted by role (products)
- **Deny list**: blocking based on external data (checkout)
- **Ownership**: access conditional on the resource owner (orders)

The main trade-off is infrastructure complexity: one more container, one HTTP call per decision, and the need to populate context (such as `resource_owner`) in middleware. In return, rules become centralized, testable offline, and modifiable without touching application code.

Blocking a user on the fly or adding an access rule without a deploy requires no changes to application code: edit a `.rego` file.

### Resources

**Demo repository:**
- [MockMart on GitHub](https://github.com/monte97/MockMart)

**Documentation:**
- [OPA - Open Policy Agent](https://www.openpolicyagent.org/)
- [Rego Policy Language](https://www.openpolicyagent.org/docs/latest/policy-language/)
- [OPA REST API](https://www.openpolicyagent.org/docs/latest/rest-api/)

---
