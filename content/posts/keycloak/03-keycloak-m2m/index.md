---
title: "Keycloak M2M: Autenticare Servizi Senza Utente"
date: 2026-02-05T10:00:00+01:00
description: "Come autenticare chiamate tra microservizi con Keycloak Client Credentials. Setup, codice e errori comuni."
menu:
  sidebar:
    name: Keycloak M2M
    identifier: kc-m2m
    weight: 30
    parent: KEYCLOAK
tags: ["Keycloak", "OAuth2", "Microservizi", "M2M", "Security"]
categories: ["Security", "Backend"]
draft: true
reviewed: false
---

Ti sei mai chiesto come fanno due microservizi a fidarsi l'uno dell'altro quando non c'è nessun utente loggato? Job schedulati, webhook, eventi asincroni: in questi casi non c'è nessuno davanti allo schermo, ma i servizi devono comunque autenticarsi tra loro.

Questo articolo mostra come implementare autenticazione machine-to-machine (M2M) con Keycloak, usando il flusso **Client Credentials**. Vedremo setup, codice e gli errori che tutti fanno.

---

## Il Problema: Servizi che Parlano Senza Utente

### Lo Scenario

In [MockMart](https://github.com/monte97/MockMart), quando un utente completa un ordine, `shop-api` deve notificare `notification-service`:

```text
┌──────────────┐         ┌───────────────────┐
│   shop-api   │ ──────► │notification-service│
│  (checkout)  │         │   (send email)     │
└──────────────┘         └───────────────────┘
```

Il problema: questa chiamata avviene **dopo** che il checkout è completato. Non c'è un utente "attivo" in quel momento - è una chiamata server-to-server.

### Soluzioni Sbagliate

**Hardcodare API key nei servizi:**
```javascript
// NON FARE QUESTO
headers: { 'X-API-Key': 'super-secret-key-123' }
```
Problemi: se una chiave viene compromessa, va cambiata ovunque. Nessuna scadenza, nessun audit.

**Passare il token dell'utente:**
```javascript
// NON FARE QUESTO
headers: { 'Authorization': `Bearer ${userToken}` }
```
Problemi: il token scade (tipicamente 5 minuti), ha permessi dell'utente (non del servizio), e non funziona per job schedulati.

**Nessuna autenticazione ("tanto è rete interna"):**
```javascript
// NON FARE QUESTO
await fetch('http://notification-service/send', { body: data });
```
Problemi: qualsiasi servizio compromesso può chiamare qualsiasi altro servizio. Zero tracciabilità.

### La Domanda

Come fa `shop-api` a dimostrare la propria identità a `notification-service`, senza coinvolgere un utente?

---

## La Soluzione: Client Credentials Flow

Il flusso **Client Credentials** permette a un servizio di autenticarsi come "se stesso", non per conto di un utente.

### Come Funziona

```text
┌──────────────┐                         ┌──────────────┐
│   shop-api   │ ─── (1) credentials ───►│   Keycloak   │
│              │ ◄── (2) access_token ───│              │
└──────┬───────┘                         └──────────────┘
       │
       │ (3) Bearer token
       ▼
┌──────────────┐
│ notification │ ─── (4) validate JWKS
│   service    │
└──────────────┘
```

1. `shop-api` invia le proprie credenziali (client_id + secret) a Keycloak
2. Keycloak verifica e rilascia un access token
3. `shop-api` usa il token per chiamare `notification-service`
4. `notification-service` valida il token via JWKS (chiavi pubbliche di Keycloak)

### Differenze con Authorization Code

| | Authorization Code | Client Credentials |
|---|---|---|
| **Chi si autentica** | Utente (tramite browser) | Servizio (backend) |
| **Richiede browser** | Sì | No |
| **Refresh token** | Sì | No (richiedi nuovo token) |
| **Uso tipico** | Login frontend | M2M, job, webhook |

---

## Setup Keycloak: Service Account

Per usare Client Credentials, serve un client Keycloak con **service account abilitato**.

### Configurazione Client

In Keycloak Admin Console → Clients → Create:

```json
{
  "clientId": "shop-api",
  "secret": "shop-api-secret",
  "serviceAccountsEnabled": true,
  "standardFlowEnabled": false,
  "directAccessGrantsEnabled": false
}
```

**Punti chiave:**
- `serviceAccountsEnabled: true` - abilita il flusso Client Credentials
- `standardFlowEnabled: false` - disabilita Authorization Code (non serve per un servizio)
- `directAccessGrantsEnabled: false` - disabilita Resource Owner Password (deprecato)

### Test: Ottenere un Token

```bash
curl -X POST "http://localhost:8080/auth/realms/techstore/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=shop-api" \
  -d "client_secret=shop-api-secret"
```

> **Nota:** A partire da Keycloak 17+ (distribuzione Quarkus, ora l'unica supportata), il prefisso `/auth` è stato rimosso dal context path di default. Se usi una versione recente, l'URL diventa `http://localhost:8080/realms/techstore/protocol/openid-connect/token`. Nel codice di MockMart, la variabile `KEYCLOAK_AUTH_PATH` permette di gestire entrambi i casi.

**Risposta:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 300,
  "token_type": "Bearer"
}
```

Il token ha vita breve (default 5 minuti). Questo è intenzionale: riduce la finestra di rischio se viene compromesso.

---

## Implementazione nel Codice

### Lato Chiamante: shop-api

Il servizio che deve chiamare altri servizi ha bisogno di:
1. Ottenere un token da Keycloak
2. Cacharlo per evitare richieste inutili
3. Rinnovarlo prima della scadenza

```javascript
// lib/service-token.js

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://keycloak:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'techstore';
const KEYCLOAK_AUTH_PATH = process.env.KEYCLOAK_AUTH_PATH || '/auth';
const CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || 'shop-api';
const CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET;

const TOKEN_ENDPOINT = `${KEYCLOAK_URL}${KEYCLOAK_AUTH_PATH}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;

// Token cache
let cachedToken = null;
let tokenExpiry = null;
let pendingRequest = null;
const EXPIRY_BUFFER_SECONDS = 60; // Rinnova 60s prima della scadenza

async function getServiceToken() {
  const now = Date.now();

  // Riusa token se ancora valido
  if (cachedToken && tokenExpiry && now < tokenExpiry) {
    return cachedToken;
  }

  // Se c'è già una richiesta in corso, aspetta quella
  // (evita N chiamate parallele al token endpoint)
  if (pendingRequest) {
    return pendingRequest;
  }

  // Prima richiesta: chiama Keycloak e condividi la Promise
  pendingRequest = fetchNewToken();
  return pendingRequest;
}

async function fetchNewToken() {
  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      })
    });

    if (!response.ok) {
      throw new Error(`Token request failed: ${response.status}`);
    }

    const data = await response.json();

    // Cache con buffer di sicurezza
    cachedToken = data.access_token;
    const expiresIn = data.expires_in || 300;
    tokenExpiry = Date.now() + (expiresIn - EXPIRY_BUFFER_SECONDS) * 1000;

    return cachedToken;
  } finally {
    pendingRequest = null;
  }
}

module.exports = { getServiceToken };
```

**Uso:**
```javascript
const { getServiceToken } = require('./lib/service-token');

async function notifyOrder(orderId, userEmail) {
  const token = await getServiceToken();

  const response = await fetch(`${NOTIFICATION_URL}/api/notifications/order`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ orderId, userEmail })
  });

  return response.json();
}
```

### Lato Ricevente: notification-service

Il servizio che riceve la chiamata deve:
1. Validare il token JWT (firma, scadenza, issuer)
2. Verificare che il chiamante sia un service account autorizzato

```javascript
// middleware/auth.js

const { createRemoteJWKSet, jwtVerify } = require('jose');

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://keycloak:8080';
const KEYCLOAK_PUBLIC_URL = process.env.KEYCLOAK_PUBLIC_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'techstore';
const KEYCLOAK_AUTH_PATH = process.env.KEYCLOAK_AUTH_PATH || '/auth';

const ISSUER = `${KEYCLOAK_PUBLIC_URL}${KEYCLOAK_AUTH_PATH}/realms/${KEYCLOAK_REALM}`;
const JWKS_URL = `${KEYCLOAK_URL}${KEYCLOAK_AUTH_PATH}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`;

// Cache JWKS
let jwks = null;
function getJWKS() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(JWKS_URL));
  }
  return jwks;
}

async function requireServiceAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: ISSUER,
      clockTolerance: 30
    });

    // Verifica che sia un service account
    // Il claim clientId è l'indicatore primario: è presente solo nei token di service account
    // Il check sul ruolo è supplementare (Keycloak assegna "service-account-<clientId>" di default)
    const isServiceAccount = payload.clientId !== undefined
      && payload.clientId === payload.azp;
    if (!isServiceAccount) {
      return res.status(403).json({
        error: 'This endpoint only accepts service account tokens'
      });
    }

    // Verifica che sia il servizio autorizzato
    if (payload.azp !== 'shop-api') {
      return res.status(403).json({
        error: 'Unauthorized service'
      });
    }

    req.serviceAccount = payload;
    next();
  } catch (error) {
    if (error.code === 'ERR_JWT_EXPIRED') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { requireServiceAuth };
```

**Punto critico:** Due check distinti proteggono l'endpoint. Il primo (`isServiceAccount`) verifica che il token provenga da un service account tramite il claim `clientId`. Il secondo (`payload.azp !== 'shop-api'`) restringe l'accesso al solo servizio autorizzato. Senza entrambi, un token utente o di un altro servizio passerebbe la validazione.

> **Verso la produzione:** In questo esempio l'`azp` è hardcodato, ma in un sistema con molti servizi questo approccio diventa fragile. L'alternativa scalabile è assegnare **client roles o scopes** (es. `notifications:send`) al service account in Keycloak e verificarli nel middleware, invece di controllare il singolo client ID. In questo modo si disaccoppia l'autorizzazione dall'identità specifica del chiamante.

---

## Errori Comuni

### Errore 1: Token Scaduto, Nessun Retry

```
POST /api/notifications/order → 401 Unauthorized
```

Il token Client Credentials ha vita breve (default 5 minuti). Senza cache con rinnovo anticipato, le chiamate falliscono dopo la scadenza.

**Fix:** Il pattern `expiresIn - EXPIRY_BUFFER_SECONDS` rinnova il token 60 secondi prima della scadenza effettiva.

### Errore 2: Validare Solo la Firma

```javascript
// INSICURO
const { payload } = await jwtVerify(token, getJWKS());
// Accetta QUALSIASI token valido!
```

Un token utente rubato dal frontend passa questa validazione.

**Fix:** Verificare sempre `azp` (authorized party):
```javascript
if (payload.azp !== 'shop-api') {
  return res.status(403).json({ error: 'Unauthorized service' });
}
```

### Errore 3: Secret nel Codice

```javascript
// MAI FARE QUESTO
const CLIENT_SECRET = 'shop-api-secret';
```

Se il repo è pubblico (o viene compromesso), il secret è esposto.

**Fix:** Environment variable, mai nel repository:
```bash
# .env (aggiungi a .gitignore)
KEYCLOAK_CLIENT_SECRET=shop-api-secret
```

---

## Debug con OpenTelemetry

Con MockMart puoi tracciare l'intero flusso M2M:

```bash
make up-otel-keycloak
```

In Grafana → Explore → Tempo vedrai:

```text
shop-api                     keycloak                  notification
    │                            │                           │
    ├── POST /token ────────────►│                           │
    │◄── 200 {access_token} ─────│                           │
    │                            │                           │
    ├── POST /api/notifications/order ─────────────────────►│
    │                            │◄── GET /certs (JWKS) ─────│
    │◄── 200 OK ─────────────────┼───────────────────────────│
```

La trace mostra chi ha chiamato chi, con quale token, e quanto tempo ha impiegato ogni step.

---

## Quando Usare Client Credentials

| Scenario | Client Credentials? |
|----------|:------------------:|
| Job schedulati (cron, batch) | ✅ |
| Webhook in ingresso | ✅ |
| Eventi async (queue consumer) | ✅ |
| Servizio chiama servizio | ✅ |
| Utente loggato chiama API | ❌ usa il token utente |

---

## Checklist

- [ ] Client Keycloak con `serviceAccountsEnabled: true`
- [ ] Secret in environment variable, mai nel codice
- [ ] Cache token con rinnovo anticipato e lock su richieste concorrenti (`pendingRequest`)
- [ ] Validare `clientId` + ruolo service-account e `azp` nel servizio ricevente, non solo la firma
- [ ] Tracing abilitato per debug in produzione

---

## Conclusione

Abbiamo visto come:

1. Il flusso **Client Credentials** permette ai servizi di autenticarsi tra loro senza coinvolgere un utente
2. La **cache con rinnovo anticipato** e deduplicazione delle richieste evita chiamate inutili a Keycloak
3. Il servizio ricevente deve validare non solo la firma del token, ma anche verificare che il chiamante sia un service account autorizzato
4. In produzione, preferire **roles e scopes** rispetto a check hardcodati su `azp` per un'architettura disaccoppiata

L'autenticazione M2M è uno di quei pezzi che, una volta implementato correttamente, diventa invisibile. Ma se fatto male, diventa il punto debole che espone tutto il sistema.

---

## Risorse

- **MockMart**: [Demo E-commerce con OTEL](https://github.com/monte97/MockMart)
- **RFC 6749**: [OAuth 2.0 Client Credentials Grant](https://datatracker.ietf.org/doc/html/rfc6749#section-4.4)
- **Keycloak Documentation**: [Service Accounts](https://www.keycloak.org/docs/latest/server_admin/#_service_accounts)
