---
title: "Autorizzazione Granulare con OPA e Keycloak: Separare Autenticazione e Autorizzazione"
date: 2026-02-06T09:00:00.000Z
description: "Come integrare Open Policy Agent con Keycloak in un'app Express per separare autenticazione e autorizzazione. Tre pattern concreti: RBAC, deny list e ownership."
pillar: progettare
category: keycloak
tags:
  - OPA
  - Keycloak
  - Authorization
  - Rego
  - OpenPolicyAgent
lang: it
draft: false
reviewed: true
series: keycloak
seriesOrder: 50
summary:
  - label: "Problema"
    value: "Regole d'accesso sparse tra claim JWT, mapper Keycloak e codice Express"
    note: "Aggiungere una regola tocca più componenti, bloccare un utente aspetta la scadenza del token"
  - label: "Scelta"
    value: "Keycloak autentica chi sei, OPA decide cosa puoi fare"
    note: "Policy Rego in container sidecar interrogato via HTTP prima di ogni operazione protetta"
  - label: "Ampiezza"
    value: "Tre policy: RBAC sui prodotti, deny list sul checkout, ownership sugli ordini"
    note: "Gli utenti bloccati vivono in `data.json`: effetto immediato, senza re-login né deploy"
  - label: "Costo reale"
    value: "Un container in più e una chiamata HTTP per ogni decisione"
    note: "L'ownership chiede una query aggiuntiva per risalire al proprietario della risorsa"
openItems:
  - "Nessuno dei due approcci vince in assoluto: i claims JWT restano ragionevoli con poche regole statiche, OPA conviene quando le regole cambiano spesso o usano dati esterni"
  - "Se OPA non risponde, il middleware risponde 503: negare per default in caso di errore è una scelta di sistema da assumersi"
  - "Gli esempi da terminale usano il flusso Resource Owner Password Credentials, deprecato e tenuto in MockMart solo per il testing locale"
  - "L'immagine `latest-debug` dell'esempio serve al debug: in produzione l'indicazione è fissare una versione specifica"
openNote: "Punti in cui serve una decisione architetturale, non soltanto codice"
---

Bloccare un utente dal checkout quando il claim JWT è ancora valido fino alla scadenza del token. Aggiungere una regola di accesso e dover modificare Keycloak, il codice Express, e magari anche un mapper custom. Sono problemi comuni quando autenticazione e autorizzazione non sono separate.

In un sistema che usa Keycloak per entrambe le responsabilità, le regole di accesso finiscono sparse tra claim JWT, mapper custom e logica applicativa. Funziona, ma crea un accoppiamento: modificare chi può fare cosa richiede toccare Keycloak, il codice, o entrambi.

La separazione delle due responsabilità risolve entrambi i problemi: **Keycloak autentica** (chi sei), **OPA autorizza** (cosa puoi fare). L'integrazione avviene in MockMart, lo stesso e-commerce demo usato negli articoli precedenti, con tre pattern concreti:

1. **RBAC su prodotti**: solo admin può creare, modificare ed eliminare
2. **Deny list su checkout**: blocco immediato senza re-login
3. **Ownership su ordini**: ogni utente vede solo i propri

---

## Il Modello: OPA come Sidecar HTTP

Open Policy Agent (OPA) è un policy engine general-purpose. Riceve una richiesta di decisione via HTTP, la valuta contro regole scritte in Rego (il suo linguaggio dichiarativo), e risponde con un booleano.

Nel contesto MockMart, OPA gira come container separato nella rete Docker. Shop API lo chiama prima di eseguire operazioni protette.

### Architettura Aggiornata

```text
Gateway (nginx:80)
+-- /        -> shop-ui (React SPA, :3000)
+-- /api/    -> shop-api (Node.js/Express, :3001)
+-- /auth/   -> keycloak (:8080)

shop-api --> opa (:8181)              <-- nuovo
shop-api --> postgres, payment, inventory, notification
```

### Flusso di una Richiesta Protetta

1. Il browser chiama `shop-api` con un Bearer JWT
2. `auth.js` valida il JWT via JWKS e popola `req.user` (id, ruoli, username)
3. `opa.js` costruisce un oggetto input e chiama OPA
4. OPA valuta la policy Rego e risponde `{ "result": true }` o `{ "result": false }`. Se nessuna regola matcha (package errato, policy non caricata), OPA restituisce `{}` senza chiave `result`
5. Se `allow = true`, il route handler esegue. Se `false`, il middleware risponde `403 Forbidden`

### Separazione delle Responsabilità

| Componente | Responsabilità |
|---|---|
| Keycloak | Autenticazione, emissione JWT, gestione utenti e ruoli |
| `auth.js` (Express) | Validazione JWT, estrazione identità |
| OPA | Decisione di autorizzazione (allow/deny) |
| Policy Rego | Regole: chi può fare cosa su quale risorsa |

Keycloak non ha bisogno di sapere nulla delle regole di business. OPA non ha bisogno di sapere come funziona il login. Ogni componente ha un perimetro chiaro.

---

## Policy Rego: Tre Pattern Concreti

Le policy sono file `.rego` montati come volume nel container OPA. Ogni file corrisponde a un dominio di autorizzazione.

```
services/opa/
+-- policies/
|   +-- products.rego      # RBAC per ruolo
|   +-- orders.rego        # Visibilità per ownership
|   +-- checkout.rego      # Deny list
+-- data.json              # Dati esterni (utenti bloccati)
```

### Prodotti: RBAC per Ruolo

Regola: tutti possono leggere i prodotti, solo admin può creare, modificare ed eliminare.

```rego
package mockmart.products

default allow = false

# Tutti possono leggere
allow if {
    input.action == "read"
}

# Solo admin può creare/modificare/eliminare
allow if {
    input.action in {"create", "update", "delete"}
    "admin" in input.user.roles
}
```

`default allow = false` è il principio di deny-by-default: se nessuna regola matcha, l'accesso è negato. Ogni blocco `allow if { ... }` definisce una condizione sufficiente per concedere l'accesso. Le condizioni all'interno di un blocco sono in AND: devono essere tutte vere.

### Checkout: Deny List Esterna

Nello stack base MockMart, il blocco al checkout avviene tramite un claim JWT `canCheckout`. Se un utente viene bloccato in Keycloak, deve ri-loggarsi perché il claim nel token cambi. Con OPA, il blocco è immediato.

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

La lista degli utenti bloccati proviene da `data.json`, un file esterno montato nel container OPA:

```json
{
  "mockmart": {
    "blocked_users": [
      "blocked"
    ]
  }
}
```

`import data.mockmart.blocked_users` rende disponibile questo array nella policy. Per bloccare un utente basta aggiungere il suo username al file e riavviare il container OPA (`docker compose restart opa`): nessuna modifica a Keycloak, nessun re-deploy dell'applicazione. Per ambienti che richiedono reload a caldo senza restart, OPA supporta la [Bundle API](https://www.openpolicyagent.org/docs/latest/management-bundles/) con aggiornamenti periodici via HTTP.

### Ordini: Ownership

Regola: admin vede tutti gli ordini, un utente normale vede solo i propri.

```rego
package mockmart.orders

default allow = false

# Admin può listare e leggere tutti gli ordini
allow if {
    input.action in {"list", "read"}
    "admin" in input.user.roles
}

# Utenti: solo i propri ordini
allow if {
    input.action in {"list", "read"}
    input.resource_owner == input.user.id
}
```

Questa policy introduce il concetto di **resource owner**: l'input include sia l'identità dell'utente (`input.user.id`) sia il proprietario della risorsa (`input.resource_owner`). Il middleware Express è responsabile di popolare questo campo prima di chiamare OPA.

---

## Il Middleware Express

Il middleware `opa.js` ha due responsabilità: costruire l'oggetto input per OPA e gestire la risposta.

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

`checkPolicy` chiama l'endpoint OPA Data API: `POST /v1/data/mockmart/{package}/allow`. Il body contiene `{ input: {...} }`, la risposta è `{ result: true|false }`. Il check `data.result === true` gestisce anche il caso in cui OPA restituisca `{}` (nessuna chiave `result`): in quel caso l'accesso viene negato, coerente con il principio deny-by-default.

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

Tre aspetti rilevanti:

- **Switch `AUTHORIZATION_MODE`**: se il valore non è `opa`, il middleware fa passthrough. Questo garantisce che `make up` (stack base) continui a funzionare con la logica claims, senza toccare nulla
- **`req.opaContext`**: middleware precedenti possono aggiungere contesto extra (es. `resource_owner` per gli ordini). `requirePolicy` lo include automaticamente nell'input OPA
- **Fail closed**: se OPA non è raggiungibile, il middleware risponde `503 Service Unavailable` invece di lasciar passare la richiesta. In un sistema di autorizzazione, il default in caso di errore deve essere il deny

---

## Integrazione nelle Route

Ogni route protetta aggiunge `requirePolicy` nella catena middleware, dopo `requireAuth`.

### Prodotti

```javascript
// Tutti leggono
app.get('/api/products', optionalAuth, requirePolicy('products', 'read'), handler);

// Solo admin modifica
app.post('/api/products',       requireAuth, requirePolicy('products', 'create'), handler);
app.put('/api/products/:id',    requireAuth, requirePolicy('products', 'update'), handler);
app.delete('/api/products/:id', requireAuth, requirePolicy('products', 'delete'), handler);
```

Il secondo parametro di `requirePolicy` è l'azione: una stringa che corrisponde al valore che la policy Rego si aspetta in `input.action`.

### Checkout

```javascript
app.post('/api/checkout', requireAuth, requirePolicy('checkout', 'checkout'), async (req, res) => {
  const user = req.user;

  // In claims mode, controlla canCheckout dal JWT
  if (process.env.AUTHORIZATION_MODE !== 'opa' && !user.canCheckout) {
    return res.status(403).json({ error: 'You are not authorized to checkout.' });
  }
  // ...
});
```

La guardia `AUTHORIZATION_MODE !== 'opa'` mantiene il comportamento originale (claim JWT) quando OPA non è attivo.

### Ordini: Popolare il Resource Owner

Per gli ordini, il middleware deve sapere chi è il proprietario della risorsa prima di chiamare OPA.

**Lista ordini**: il proprietario è l'utente corrente (ogni utente lista i propri).

```javascript
app.get('/api/orders', requireAuth, (req, res, next) => {
  req.opaContext = { resource_owner: req.user.id };
  next();
}, requirePolicy('orders', 'list'), handler);
```

**Dettaglio ordine**: serve una query al database per sapere chi ha creato l'ordine.

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

Questo è il caso in cui il costo della separazione diventa visibile: per decisioni basate su ownership serve una query aggiuntiva. Il trade-off è accettabile se le regole di accesso cambiano frequentemente o sono complesse.

---

## Test e Verifica

### Test Offline delle Policy

Le policy Rego si possono testare senza avviare alcun container. I file di test usano la convenzione `test_` nel nome della regola:

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

Testabilità offline è uno dei vantaggi principali di OPA: l'input è JSON, l'output è un booleano. Non servono token, non serve Keycloak.

### Verifica End-to-End

Con lo stack attivo (`make up-opa`), si possono verificare i flussi con curl.

> **Nota:** gli esempi usano `grant_type=password` (Resource Owner Password Credentials) per ottenere token da terminale in modo rapido. Questo flusso è deprecato ([RFC 9700](https://datatracker.ietf.org/doc/html/rfc9700)) e abilitato in MockMart solo per testing locale. In produzione, usare Authorization Code + PKCE per utenti e Client Credentials per servizi.

**Utente normale tenta di creare un prodotto:**

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

**Admin crea un prodotto:**

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

**Utente bloccato tenta il checkout:**

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

## Confronto: Claims JWT vs OPA

| Aspetto | Claims JWT (`canCheckout`) | OPA (Deny List + Policy) |
|---|---|---|
| Bloccare un utente | Modificare attributo in Keycloak, utente deve ri-loggarsi | Editare `data.json`, effetto immediato |
| Aggiungere una regola | Nuovo claim + mapper KC + codice Express | Nuova regola Rego, nessun deploy applicativo |
| Dove vivono le regole | Sparse tra KC config, mapper e codice | Centralizzate in `services/opa/policies/` |
| Testabilità | Richiede token reali e Keycloak attivo | Input JSON, output booleano, testabile offline |
| Latenza aggiuntiva | Nessuna (claim già nel token) | Chiamata HTTP locale aggiuntiva |
| Complessità infrastruttura | Nessuna | Container aggiuntivo da gestire |

Nessuno dei due approcci è universalmente migliore. Claims JWT funzionano bene quando le regole sono poche e statiche. OPA diventa vantaggioso quando le regole cambiano frequentemente, coinvolgono dati esterni (deny list, ownership), o devono essere testate in isolamento.

---

## Stack Docker

OPA si aggiunge allo stack tramite un file Docker Compose di override, senza modificare la configurazione base:

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

> **Nota:** l'esempio usa `latest-debug` per semplicità (include una shell utile per il debug). In produzione, fissa una versione specifica (es. `openpolicyagent/opa:1.4.2`) per garantire riproducibilità e sicurezza.

Due comandi per gestire lo stack:

```bash
# Avvio stack con OPA
make up-opa

# Stack base (senza OPA, logica claims)
make up
```

`make up` continua a funzionare esattamente come prima. L'aggiunta di OPA è puramente additiva.

---

## Conclusioni

La separazione tra autenticazione (Keycloak) e autorizzazione (OPA) produce un sistema in cui ogni componente ha un perimetro preciso. Keycloak risponde a "chi sei", OPA risponde a "cosa puoi fare".

I tre pattern implementati coprono scenari comuni:
- **RBAC**: azioni limitate per ruolo (prodotti)
- **Deny list**: blocco basato su dati esterni (checkout)
- **Ownership**: accesso condizionato al proprietario della risorsa (ordini)

Il trade-off principale è la complessità infrastrutturale: un container in più, una chiamata HTTP per ogni decisione, e la necessità di popolare il contesto (come `resource_owner`) nel middleware. In cambio, le regole diventano centralizzate, testabili offline, e modificabili senza toccare il codice applicativo.

Bloccare un utente al volo o aggiungere una regola di accesso senza deploy non richiede intervento sul codice applicativo: basta modificare un file `.rego`.

### Risorse

**Repository demo:**
- [MockMart su GitHub](https://github.com/monte97/MockMart)

**Documentazione:**
- [OPA - Open Policy Agent](https://www.openpolicyagent.org/)
- [Rego Policy Language](https://www.openpolicyagent.org/docs/latest/policy-language/)
- [OPA REST API](https://www.openpolicyagent.org/docs/latest/rest-api/)

---

*Per domande o feedback: [LinkedIn](https://www.linkedin.com/in/francesco-montelli/) | [GitHub](https://github.com/monte97)*
