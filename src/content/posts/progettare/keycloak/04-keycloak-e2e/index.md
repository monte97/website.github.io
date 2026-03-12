---
title: "Keycloak in Pratica: 6 Problemi Reali nell'Integrazione di un E-Commerce"
date: 2026-02-06T09:00:00.000Z
description: "6 problemi concreti nell'integrazione Keycloak con microservizi Node.js: issuer mismatch, audience mancante, service account fragili e race condition M2M."
pillar: progettare
category: keycloak
tags:
  - Keycloak
  - OAuth2
  - OIDC
  - Microservizi
  - Security
  - PKCE
  - M2M
lang: it
reviewed: true
series: keycloak
seriesOrder: 40
---

Un'integrazione Keycloak che funziona perfettamente su localhost e poi esplode al primo deploy in staging è uno scenario comune.

Keycloak configurato, login funzionante, checkout che gira. L'integrazione sembra completa. I problemi iniziano dopo: un 401 inspiegabile in staging, un token che passa la validazione di servizi a cui non era destinato, un service account che qualsiasi utente può impersonare.

Questo articolo documenta 6 problemi concreti emersi nell'integrazione di Keycloak in MockMart, un e-commerce con 5 microservizi Node.js. Per ogni problema: il sintomo, la causa nel codice, e la correzione.

| Problema | Dove | Impatto |
|---|---|---|
| Issuer mismatch (401 inspiegabile) | JWT validation | API inaccessibile in staging/prod |
| Audience non validata | JWT validation | Token cross-client accettati |
| Service account detection fragile | Notification service | Bypass della sicurezza M2M |
| `canCheckout` string vs boolean | Checkout | Authorization che fallisce silenziosamente |
| Race condition nel token caching | M2M | Keycloak sovraccaricato sotto carico |
| Configurazione non portabile | Realm + frontend | Tutto si rompe fuori da localhost |

## Architettura MockMart

```text
┌─────────────────────────────────────────────────────────────┐
│                    Gateway (nginx:80)                        │
└────┬──────────────┬──────────────┬──────────────────────────┘
     │              │              │
┌────▼────┐   ┌─────▼─────┐  ┌─────▼─────┐
│ Shop UI │   │ Shop API  │  │ Keycloak  │
│ React   │   │ Express   │  │   :8080   │
│ :3000   │   │   :3001   │  └───────────┘
└─────────┘   └─────┬─────┘
                    │
      ┌─────────────┼─────────────┐
      │             │             │
┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼──────┐
│  Payment  │ │ Inventory │ │Notification│
│   :3010   │ │   :3011   │ │   :3009    │
└───────────┘ └───────────┘ └────────────┘
```

L'autenticazione usa tre pattern: Authorization Code + PKCE per il frontend, JWT validation via JWKS per l'API, Client Credentials per la comunicazione M2M tra servizi.

```bash
# Per seguire gli esempi
cd demo/MockMart
make up && make health
```

---

## Problema 1: Il 401 Inspiegabile (Issuer Mismatch)

### Sintomo

L'utente si logga con successo. Il frontend riceve il token. La chiamata `GET /api/products` con `Authorization: Bearer <token>` risponde 401. Il token è valido su jwt.io. I log dell'API dicono: `JWT validation failed: unexpected "iss" claim value`.

### Causa

In `middleware/auth.js`, la validazione JWT controlla l'issuer:

```javascript
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://keycloak:8080';
const KEYCLOAK_PUBLIC_URL = process.env.KEYCLOAK_PUBLIC_URL || 'http://localhost:8080';
const KEYCLOAK_ISSUER = `${KEYCLOAK_PUBLIC_URL}${KEYCLOAK_AUTH_PATH}/realms/${KEYCLOAK_REALM}`;
const KEYCLOAK_JWKS_URL = `${KEYCLOAK_URL}${KEYCLOAK_AUTH_PATH}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`;

const { payload } = await jwtVerify(token, getJWKS(), {
  issuer: KEYCLOAK_ISSUER,   // Valida contro l'URL PUBBLICO
  clockTolerance: 30
});
```

Due URL distinti servono due scopi diversi:

- **`KEYCLOAK_URL`** (`http://keycloak:8080`) - URL interno via Docker DNS, usato per scaricare le chiavi JWKS
- **`KEYCLOAK_PUBLIC_URL`** (`http://localhost:8080`) - URL pubblico, usato per validare l'issuer del token

Il frontend genera token con `iss: http://localhost:8080/auth/realms/techstore` perché il browser raggiunge Keycloak su `localhost`. L'API deve validare contro lo stesso URL. Se l'API validasse contro l'URL Docker interno (`http://keycloak:8080`), l'issuer non corrisponderebbe.

### Quando si rompe

Su localhost funziona perché il default di `KEYCLOAK_PUBLIC_URL` è `http://localhost:8080`. In staging o produzione, Keycloak è raggiungibile su un URL diverso (es. `https://auth.example.com`). Il frontend genera token con `iss: https://auth.example.com/auth/realms/techstore`. Se l'API non ha `KEYCLOAK_PUBLIC_URL=https://auth.example.com`, continua a validare contro `http://localhost:8080`. Risultato: 401 su tutte le chiamate.

Il problema è amplificato dal fatto che il frontend ha l'URL hardcoded:

```javascript
// AuthContext.jsx
const KEYCLOAK_URL = 'http://localhost:8080/auth'
```

In produzione, anche questo valore deve cambiare. Due configurazioni da allineare, in due codebase diverse (frontend e backend), con errori che si manifestano solo a runtime.

### Correzione

Rendere l'URL configurabile in entrambi i servizi e validare all'avvio:

```javascript
// Validazione all'avvio del servizio
const KEYCLOAK_PUBLIC_URL = process.env.KEYCLOAK_PUBLIC_URL;
if (!KEYCLOAK_PUBLIC_URL) {
  throw new Error('KEYCLOAK_PUBLIC_URL is required - must match the issuer in JWT tokens');
}
```

---

## Problema 2: Token Cross-Client Accettati (Audience Mancante)

### Sintomo

Un token ottenuto per il frontend (`shop-ui`) viene usato per chiamare direttamente il payment service. La chiamata viene accettata. Qualsiasi token emesso dal realm `techstore` passa la validazione di qualsiasi servizio.

### Causa

Il middleware `requireAuth` in `shop-api/middleware/auth.js` valida issuer e scadenza, ma non l'audience:

```javascript
const { payload } = await jwtVerify(token, getJWKS(), {
  issuer: KEYCLOAK_ISSUER,
  clockTolerance: 30
  // Manca: audience: 'shop-api'
});
```

Lo stesso pattern si ripete in `notification/server.js` e `payment/server.js`. Nessun servizio controlla per chi il token è stato emesso.

### Conseguenza

Il claim `aud` (audience) nel JWT indica a quale risorsa il token è destinato. Senza validazione, un token emesso per `shop-ui` (il frontend) è accettabile anche per `payment-service` o `notification-service`. In un realm con più applicazioni, qualsiasi token valido apre qualsiasi porta.

Scenario concreto: un attaccante intercetta un token frontend (es. da un log, da un proxy, da un'estensione browser). Senza audience validation, quel token può chiamare API interne che non dovrebbero essere raggiungibili dal frontend.

### Correzione

Aggiungere `audience` alla validazione JWT in ogni servizio:

```javascript
const { payload } = await jwtVerify(token, getJWKS(), {
  issuer: KEYCLOAK_ISSUER,
  audience: 'shop-api',    // Accetta solo token destinati a questo servizio
  clockTolerance: 30
});
```

Lato Keycloak, configurare un audience mapper nel client scope per includere l'`aud` corretto nel token.

---

## Problema 3: Chiunque Può Essere un Service Account

### Sintomo

Un utente senza email nel profilo Keycloak riesce a chiamare `/api/notifications/order`, un endpoint riservato alla comunicazione M2M tra servizi.

### Causa

Il notification service distingue tra token utente e token di servizio con questa logica:

```javascript
// notification/server.js
req.auth = {
  isServiceAccount: !payload.email && (payload.azp || payload.clientId),
  callingService: payload.azp || payload.clientId || 'unknown',
  subject: payload.sub
};
```

Il check si basa su due condizioni: assenza di `email` nel token E presenza di `azp` (authorized party). L'assunzione è: i service account non hanno email, gli utenti sì.

```javascript
app.post('/api/notifications/order', requireAuth, async (req, res) => {
  if (!isServiceAccount) {
    return res.status(403).json({ error: 'This endpoint only accepts service account tokens' });
  }
  if (req.auth.callingService !== 'shop-api') {
    return res.status(403).json({ error: 'This endpoint only accepts calls from shop-api' });
  }
  // ...
});
```

### Perché si rompe

L'assunzione è fragile. Un utente Keycloak può non avere email (campo non obbligatorio). Il suo token avrà `azp: shop-ui` (il client da cui ha fatto login) e nessun `email`. Il check:

```javascript
!payload.email && (payload.azp || payload.clientId)
// !undefined && 'shop-ui'
// true && true = true → identificato come service account
```

Il primo controllo (`isServiceAccount`) passa. Il secondo (`callingService !== 'shop-api'`) lo blocca solo perché `azp` è `shop-ui`, non `shop-api`. Ma se un altro client confidenziale nel realm viene compromesso, i suoi token passano entrambi i controlli.

### Correzione

Non basare l'identificazione sull'assenza di un campo. Verificare un claim esplicito:

```javascript
// Approccio più robusto: clientId è presente solo nei token client credentials (Keycloak 17+)
// e i token ottenuti via client credentials non hanno session_state
const isServiceAccount = payload.clientId !== undefined && !payload.session_state;

// In alternativa, preferred_username segue il pattern "service-account-<clientId>"
// const isServiceAccount = payload.preferred_username?.startsWith('service-account-');
```

La soluzione ideale è combinare audience validation (Problema 2) con un check esplicito sul tipo di token. Un token destinato a `shop-api` con `azp: shop-api` è un service account confermato.

---

## Problema 4: `canCheckout` Che Smette di Funzionare

### Sintomo

Dopo un aggiornamento di Keycloak, l'utente `mario` (che ha `canCheckout: true` nel profilo) riceve 403 al checkout: "You are not authorized to checkout." Nessuna modifica al codice.

### Causa

Il realm config definisce `canCheckout` come attributo utente (array di stringhe) e lo mappa nel token con un mapper di tipo boolean:

```json
{
  "name": "canCheckout",
  "protocolMapper": "oidc-usermodel-attribute-mapper",
  "config": {
    "user.attribute": "canCheckout",
    "claim.name": "canCheckout",
    "jsonType.label": "boolean"
  }
}
```

L'attributo in Keycloak è salvato come `["true"]` (array di stringhe). Il mapper dovrebbe convertirlo in `true` (boolean). Il codice gestisce entrambi i casi:

```javascript
// shop-api/middleware/auth.js
canCheckout: payload.canCheckout === 'true' || payload.canCheckout === true
```

### Perché si rompe

Il doppio check (`=== 'true' || === true`) copre stringa e boolean. Ma non copre il caso in cui il mapper invii il valore raw dell'attributo: `["true"]` (array). In quel caso:

```javascript
["true"] === 'true'  // false
["true"] === true     // false
// canCheckout = false → 403 Forbidden
```

Questo succede quando il comportamento del mapper cambia tra versioni di Keycloak, o quando la configurazione del mapper viene ricreata senza `jsonType.label`. L'utente vede un 403 senza spiegazione. Il token contiene il valore corretto (`canCheckout: ["true"]`), ma il parsing fallisce.

Lo stesso pattern si ripete nel frontend (`AuthContext.jsx`), dove l'utente potrebbe vedere l'interfaccia di checkout disabilitata senza motivo.

### Correzione

Parsing difensivo che gestisce tutti i formati possibili:

```javascript
function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  if (Array.isArray(value)) return value[0] === 'true';
  return false;
}

canCheckout: parseBoolean(payload.canCheckout)
```

In alternativa, evitare il problema alla radice: usare un ruolo Keycloak (`can-checkout`) invece di un attributo utente. I ruoli sono sempre array di stringhe nel token e il check diventa:

```javascript
canCheckout: payload.realm_access?.roles?.includes('can-checkout') || false
```

---

## Problema 5: Keycloak Sotto Carico (Race Condition M2M)

### Sintomo

Con 50+ checkout simultanei, i log mostrano decine di richieste al token endpoint di Keycloak nello stesso secondo. Keycloak risponde 429 (Too Many Requests). I checkout falliscono con "Failed to obtain service token for M2M communication".

### Causa

In `lib/service-token.js`, il token caching non gestisce le richieste concorrenti:

```javascript
let cachedToken = null;
let tokenExpiry = null;

async function getServiceToken() {
  const now = Date.now();
  if (cachedToken && tokenExpiry && now < tokenExpiry) {
    return cachedToken;    // Cache hit
  }

  // Cache miss: chiama Keycloak
  const tokenResponse = await fetchToken();
  cachedToken = tokenResponse.access_token;
  tokenExpiry = now + (tokenResponse.expires_in - EXPIRY_BUFFER_SECONDS) * 1000;
  return cachedToken;
}
```

Quando il token scade, tutte le richieste concorrenti trovano la cache vuota e chiamano Keycloak simultaneamente. Con 50 checkout, il token endpoint riceve 50 richieste identiche in parallelo.

### Perché è un problema

Su localhost con un solo utente, il pattern funziona. In produzione, il checkout è un fan-out: ogni checkout chiama `getServiceToken()` prima di contattare inventory, payment, e notification. Un picco di traffico (es. flash sale) causa un'esplosione di richieste al token endpoint.

Il buffer di 60 secondi (`EXPIRY_BUFFER_SECONDS`) mitiga il problema in condizioni normali, rinnovando il token prima della scadenza. Ma se il servizio viene riavviato (deploy, crash), la cache si svuota e tutte le richieste colpiscono Keycloak insieme.

### Correzione

Usare un lock asincrono per garantire una sola richiesta al token endpoint:

```javascript
let cachedToken = null;
let tokenExpiry = null;
let pendingRequest = null;

async function getServiceToken() {
  const now = Date.now();
  if (cachedToken && tokenExpiry && now < tokenExpiry) {
    return cachedToken;
  }

  // Se c'è già una richiesta in corso, aspetta quella
  if (pendingRequest) {
    return pendingRequest;
  }

  // Prima richiesta: chiama Keycloak e condividi la Promise
  pendingRequest = fetchToken()
    .then(response => {
      cachedToken = response.access_token;
      tokenExpiry = Date.now() + (response.expires_in - EXPIRY_BUFFER_SECONDS) * 1000;
      return cachedToken;
    })
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}
```

Con questo pattern, 50 richieste concorrenti producono una sola chiamata a Keycloak. Le altre 49 attendono la stessa Promise.

---

## Problema 6: Da localhost a Produzione

I problemi precedenti emergono nel codice applicativo. Questa sezione copre le configurazioni che funzionano su localhost e si rompono altrove.

### `sslRequired: "none"` nel realm

```json
{
  "realm": "techstore",
  "sslRequired": "none"
}
```

Necessario per Docker su HTTP. Ma se questo realm config viene usato come template per produzione, Keycloak accetta connessioni HTTP. Token, credenziali e sessioni viaggiano in chiaro. Il valore corretto per produzione è `"external"` (HTTPS obbligatorio per richieste esterne) o `"all"`.

### Secret nel codice e nel repository

Il client secret appare in tre posti:

```javascript
// service-token.js - default nel codice
const KEYCLOAK_CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET || 'shop-api-secret';
```

```json
// realm-config.json - committato nel repo
"secret": "shop-api-secret"
```

```yaml
# docker-compose.yml - visibile in chiaro
- KEYCLOAK_CLIENT_SECRET=shop-api-secret
```

Chiunque abbia accesso al repository ha il secret. In produzione, il secret deve essere iniettato tramite un secret manager (Vault, AWS Secrets Manager, Kubernetes Secrets) e il fallback nel codice deve essere rimosso:

```javascript
const KEYCLOAK_CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET;
if (!KEYCLOAK_CLIENT_SECRET) {
  throw new Error('KEYCLOAK_CLIENT_SECRET is required');
}
```

### `checkLoginIframe: false` nel frontend

```javascript
// AuthContext.jsx
const authenticated = await kc.init({
  pkceMethod: 'S256',
  checkLoginIframe: false
})
```

L'iframe di sessione verifica periodicamente che la sessione Keycloak sia ancora valida. Disabilitato per evitare problemi di cookie cross-origin su localhost, ma in produzione la conseguenza è che un utente che fa logout da un'altra tab resta autenticato nel frontend fino alla scadenza del token (5 minuti).

### URL hardcoded nel frontend

```javascript
// AuthContext.jsx
const KEYCLOAK_URL = 'http://localhost:8080/auth'
```

In produzione, questo valore deve provenire da una variabile d'ambiente iniettata al build time (Vite: `import.meta.env.VITE_KEYCLOAK_URL`) o a runtime da un file di configurazione.

---

## Checklist di Sicurezza

Riepilogo delle verifiche da effettuare prima di portare un'integrazione Keycloak in produzione:

| Verifica | Dove | Stato in MockMart |
|---|---|---|
| Audience validation nei servizi | `jwtVerify` options | Mancante |
| Issuer URL configurabile | env var, no default `localhost` | Parziale (default fallback) |
| Service account detection esplicita | Middleware M2M | Fragile (basata su assenza email) |
| Parsing robusto dei claim custom | Middleware auth | Parziale (non gestisce array) |
| Lock su token caching M2M | `getServiceToken()` | Mancante |
| `sslRequired: "external"` o `"all"` | Realm config | `"none"` |
| Secret non nel codice/repo | env var senza default | Default hardcoded |
| `checkLoginIframe` abilitato | Frontend init | Disabilitato |
| URL Keycloak configurabile nel frontend | Build/runtime config | Hardcoded |
| HTTPS per tutte le comunicazioni | Nginx, docker-compose | HTTP |

### Considerazioni pratiche

- **L'issuer mismatch è il problema più comune.** È il primo 401 che si incontra in staging. Due URL per Keycloak (interno ed esterno) è un pattern obbligatorio in ambienti containerizzati.

- **L'audience validation è il gap di sicurezza più sottile.** Tutto funziona senza, fino a quando un token viene usato su un servizio a cui non era destinato. Il problema non genera errori: genera accessi non autorizzati.

- **Il token caching M2M non è un'ottimizzazione, è un requisito.** Senza lock sulle richieste concorrenti, il token endpoint di Keycloak diventa un single point of failure sotto carico.

- **I claim custom sono fragili per design.** Il formato del valore nel token dipende dalla versione di Keycloak, dal tipo di mapper, e dalla configurazione. I ruoli sono più stabili degli attributi per le decisioni di authorization.

## Prossimi Passi

Questi 6 problemi coprono le trappole più comuni nell'integrazione applicativa. Ma la sicurezza non finisce nel codice: la configurazione del realm, i flussi di autenticazione custom e il monitoring in produzione aprono un altro insieme di sfide.

Con `make up-otel-keycloak` è possibile tracciare i flussi di autenticazione end-to-end in Grafana, utile per diagnosticare i problemi descritti in questo articolo. Se un 401 non si spiega dai log applicativi, le trace distribuite mostrano esattamente dove il flusso si interrompe.

## Risorse Utili

* **Repository MockMart**: [github.com/monte97/MockMart](https://github.com/monte97/MockMart)
* **Documentazione Keycloak**: [keycloak.org/documentation](https://www.keycloak.org/documentation)
* **Libreria jose (JWT)**: [github.com/panva/jose](https://github.com/panva/jose)
* **keycloak-js**: [keycloak.org/docs/latest/securing_apps/#_javascript_adapter](https://www.keycloak.org/docs/latest/securing_apps/#_javascript_adapter)
* **OAuth 2.0 Security Best Current Practice**: [RFC 9700](https://datatracker.ietf.org/doc/html/rfc9700)
