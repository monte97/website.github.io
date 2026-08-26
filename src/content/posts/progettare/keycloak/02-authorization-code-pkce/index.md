---
title: "Login con Keycloak: Authorization Code + PKCE in MockMart"
seoTitle: "Keycloak: Authorization Code Flow e PKCE"
date: 2026-02-15T09:00:00.000Z
description: "Setup pratico di Authorization Code Flow con PKCE: configurazione Keycloak, integrazione frontend React e validazione backend Express."
pillar: progettare
category: keycloak
mode: how-to
tags:
  - Keycloak
  - OAuth2
  - PKCE
  - OpenID Connect
  - Security
lang: it
draft: false
reviewed: false
series: keycloak
seriesOrder: 20
summary:
  - label: "Contesto"
    value: "SPA React e API Express delegate a un realm Keycloak unico"
    note: "MockMart, e-commerce demo: le credenziali si inseriscono solo su Keycloak"
  - label: "Scelta"
    value: "Authorization Code Flow con PKCE e challenge SHA-256 (S256)"
    note: "In una SPA qualunque secret nel codice JavaScript è leggibile dai DevTools"
  - label: "Validazione"
    value: "Express verifica firma, issuer, scadenza e audience via JWKS"
    note: "Due URL Keycloak per design: interno per le chiavi, pubblico per l'issuer"
  - label: "Risultato"
    value: "Frontend senza secret, backend senza database utenti"
openItems:
  - "Access token a 5 minuti e sessioni SSO a 30 minuti di inattività o 10 ore totali sono default del realm: le finestre valide dipendono dalla configurazione scelta"
  - "`checkLoginIframe` resta disabilitato per i cookie cross-origin di localhost: in produzione l'articolo consiglia di riabilitarlo"
  - "Su localhost la redirect URI con wildcard copre tutte le route: per la produzione l'indicazione è registrare URI esatti e prevenire open redirect"
  - "Senza un audience mapper il claim aud resta «account»: abilitare la validazione dell'audience richiede un intervento anche sul realm, non solo nel codice"
openNote: "Dove i default di Keycloak e le comodità di localhost smettono di valere"
---

Keycloak configurato, realm creato, client registrato. Il passo successivo è collegare concretamente un frontend React e un backend Express all'Identity Provider. L'[articolo introduttivo](/blog/progettare/keycloak/01-keycloak-intro/) copre il concetto di delegare l'autenticazione. Qui si implementa il pezzo pratico.

L'implementazione usa **Authorization Code Flow con PKCE** in MockMart, un e-commerce demo. Il risultato: l'utente clicca "Login", viene reindirizzato a Keycloak, inserisce le credenziali, e torna nell'app con un token JWT che il backend valida ad ogni richiesta. L'applicazione non tocca mai le password.

---

Alla fine di questo percorso il realm `techstore` avrà un client public configurato per PKCE, il frontend React reindirizzerà a Keycloak per il login, il backend Express validerà i token che riceve, e un utente potrà entrare, vedere i prodotti e arrivare al checkout.

Serve poco per seguirlo: Docker con Compose, [MockMart](https://github.com/monte97/MockMart) clonato in locale, e Keycloak avviato come nell'[articolo introduttivo](/blog/progettare/keycloak/01-keycloak-intro/).

---

## Come funziona il login con PKCE

Prima di toccare la configurazione, vediamo cosa succede quando l'utente clicca "Login":

1. Il frontend genera un `code_verifier` random e ne calcola l'hash (`code_challenge`)
2. Il browser viene reindirizzato alla pagina di login di Keycloak, con il `code_challenge` nella query string
3. L'utente inserisce le credenziali **su Keycloak** (non sull'app)
4. Keycloak reindirizza il browser all'app con un `code` temporaneo
5. Il frontend scambia il `code` + `code_verifier` con Keycloak e riceve i token (access, id, refresh)
6. Il frontend usa l'access token per chiamare le API del backend

Il `code_verifier` è la parte PKCE: garantisce che solo chi ha iniziato il flusso possa completarlo. Se un attaccante intercetta il `code`, non può scambiarlo senza il verifier originale.

> **Perché PKCE e non un client secret?** Una SPA gira nel browser: qualsiasi secret nel codice JavaScript è leggibile da chiunque apra i DevTools. PKCE risolve il problema con un segreto generato *per ogni singolo login* e mai esposto nell'URL.

---

## Configurazione Keycloak

MockMart usa un realm export che configura tutto automaticamente. Ma per capire cosa succede sotto, vediamo i passi manuali.

### Creare il realm

Dalla console admin (`http://localhost:8080`):

1. Passa il mouse sul realm corrente (in alto a sinistra) e clicca **Create Realm**
2. Inserisci `techstore` come **Realm name**
3. Clicca **Create**

Il realm è il contenitore isolato di tutta la configurazione: utenti, client, ruoli. Ogni progetto ne ha uno.

### Creare il client public

In **Clients → Create client**:

| Campo | Valore |
|-------|--------|
| **Client ID** | `shop-ui` |
| **Client authentication** | OFF (client public) |
| **Standard flow** | ON |
| **Direct access grants** | OFF |

Nella scheda **Settings**, configura gli URL:

| Campo | Valore |
|-------|--------|
| **Valid redirect URIs** | `http://localhost:3000/*` |
| **Valid post logout redirect URIs** | `http://localhost:3000/*` |
| **Web origins** | `http://localhost:3000` |

Nella scheda **Advanced**, sotto **Proof Key for Code Exchange**:

| Campo | Valore |
|-------|--------|
| **Code Challenge Method** | `S256` |

> **`S256`** indica che il `code_challenge` è un hash SHA-256 del `code_verifier`. È l'unico metodo raccomandato: il metodo `plain` (che invia il verifier in chiaro) non offre protezione reale.

### Creare i ruoli

In **Realm roles → Create role**, crea due ruoli:

- `user`: utente base, può navigare e fare checkout
- `admin`: può anche gestire prodotti e vedere tutti gli ordini

### Creare utenti di test

In **Users → Add user**, crea due utenti:

**Utente: `mario`**

| Campo | Valore |
|-------|--------|
| **Username** | `mario` |
| **Email** | `mario@techstore.local` |
| **Email verified** | ON |

Nella scheda **Credentials**, imposta la password `mario123` con **Temporary** = OFF.
Nella scheda **Role mapping**, assegna il ruolo `user`.

**Utente: `admin`**

| Campo | Valore |
|-------|--------|
| **Username** | `admin` |
| **Email** | `admin@techstore.local` |
| **Email verified** | ON |

Password `admin123`, ruoli `user` e `admin`.

### Verificare con la CLI

Una volta configurato, è possibile verificare che Keycloak risponda correttamente:

```bash
# OIDC Discovery: elenca tutti gli endpoint disponibili
curl -s http://localhost:8080/realms/techstore/.well-known/openid-configuration | jq '.authorization_endpoint, .token_endpoint'
```

Output atteso:
```text
"http://localhost:8080/realms/techstore/protocol/openid-connect/auth"
"http://localhost:8080/realms/techstore/protocol/openid-connect/token"
```

---

## Integrazione Frontend (React + keycloak-js)

Il frontend usa `keycloak-js`, l'adapter JavaScript ufficiale. Gestisce automaticamente il redirect, lo scambio dei token e il refresh.

### Inizializzazione

```javascript
// AuthContext.jsx
import Keycloak from 'keycloak-js';

const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM || 'techstore';
const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'shop-ui';

const kc = new Keycloak({
  url: KEYCLOAK_URL,
  realm: KEYCLOAK_REALM,
  clientId: KEYCLOAK_CLIENT_ID,
});
```

L'URL di Keycloak è configurabile via variabile d'ambiente. In produzione sarà diverso da `localhost`: hardcodarlo è uno degli errori più comuni (vedi sezione errori).

### Init con PKCE

```javascript
async function initKeycloak() {
  const authenticated = await kc.init({
    onLoad: 'check-sso',
    pkceMethod: 'S256',
    checkLoginIframe: false,
  });

  if (authenticated) {
    // L'utente ha già una sessione Keycloak attiva
    const tokenParsed = kc.tokenParsed;
    setUser({
      id: tokenParsed.sub,
      username: tokenParsed.preferred_username,
      email: tokenParsed.email,
      roles: tokenParsed.realm_access?.roles || [],
    });
  }
}
```

Tre parametri chiave:

- **`onLoad: 'check-sso'`** - controlla se l'utente ha già una sessione Keycloak attiva (SSO), senza forzare il login
- **`pkceMethod: 'S256'`** - abilita PKCE con hash SHA-256. Dalla versione 24+ di `keycloak-js`, PKCE con S256 è il default: il parametro è ridondante ma lo rendiamo esplicito per chiarezza
- **`checkLoginIframe: false`** - disabilita l'iframe di verifica sessione. Su `localhost` è necessario per evitare problemi di cookie cross-origin. In produzione è consigliabile riabilitarlo

### Login e Logout

```javascript
function login() {
  kc.login();
  // Il browser viene reindirizzato a Keycloak
  // Dopo il login, Keycloak reindirizza alla redirect URI
  // keycloak-js gestisce automaticamente lo scambio code → token
}

function logout() {
  kc.logout({
    redirectUri: window.location.origin,
  });
  // Termina sia la sessione locale che quella su Keycloak (SSO logout)
}
```

### Token nelle chiamate API

Ogni richiesta al backend deve includere l'access token nell'header `Authorization`:

```javascript
async function apiFetch(url, options = {}) {
  // Aggiorna il token se sta per scadere (margine di 30 secondi)
  await kc.updateToken(30);

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${kc.token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
}
```

`kc.updateToken(30)` è il refresh proattivo: se il token scade entro 30 secondi, `keycloak-js` lo rinnova automaticamente usando il refresh token. Il rinnovo avviene in modo trasparente.

---

## Integrazione Backend (Express + jose)

Il backend non partecipa al login. Riceve l'access token dal frontend e lo valida ad ogni richiesta.

### Validazione JWT con JWKS

```javascript
// middleware/auth.js
const { createRemoteJWKSet, jwtVerify } = require('jose');

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://keycloak:8080';
const KEYCLOAK_PUBLIC_URL = process.env.KEYCLOAK_PUBLIC_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'techstore';

const ISSUER = `${KEYCLOAK_PUBLIC_URL}/realms/${KEYCLOAK_REALM}`;
const JWKS_URL = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`;

// jose scarica e cacha automaticamente le chiavi pubbliche
let jwks = null;
function getJWKS() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(JWKS_URL));
  }
  return jwks;
}
```

Due URL diversi per Keycloak, ed è intenzionale:

- **`KEYCLOAK_URL`** (`http://keycloak:8080`) - l'URL interno via Docker DNS, usato dal backend per scaricare le chiavi JWKS
- **`KEYCLOAK_PUBLIC_URL`** (`http://localhost:8080`) - l'URL che il browser raggiunge, e che Keycloak inserisce come `iss` nel token

Se i due non corrispondono, la validazione dell'issuer fallisce con un 401 inspiegabile. È il problema più comune in staging e produzione.

### Il middleware

```javascript
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: ISSUER,
      audience: 'shop-api',  // Richiede un audience mapper in Keycloak (vedi nota sotto)
      clockTolerance: 30,  // Dev: 30s per comodità. In produzione usare 5-10s
    });

    req.user = {
      id: payload.sub,
      username: payload.preferred_username,
      email: payload.email,
      roles: payload.realm_access?.roles || [],
    };

    next();
  } catch (error) {
    if (error.code === 'ERR_JWT_EXPIRED') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

`jwtVerify` della libreria [jose](https://github.com/panva/jose) fa tre cose:

1. **Verifica la firma** - scarica la chiave pubblica dall'endpoint JWKS di Keycloak e controlla che il token sia stato firmato con la chiave privata corrispondente
2. **Controlla l'issuer** - il claim `iss` deve corrispondere all'URL di Keycloak atteso
3. **Controlla la scadenza** - il claim `exp` non deve essere nel passato (con 30 secondi di tolleranza)

Se una qualsiasi di queste verifiche fallisce, il token viene rifiutato.

> **Audience validation**: La validazione del claim `audience` non è opzionale. Senza di essa, un token emesso per un altro servizio potrebbe essere accettato dal backend (token confusion attack). Keycloak di default imposta `aud` a `"account"`: per aggiungere l'audience della propria API, configurare un **Audience mapper** nel client (Client → Mappers → Add mapper → Audience, con valore `shop-api`).

### Proteggere le route

```javascript
// Route protette: richiedono un token valido
app.get('/api/products', requireAuth, getProducts);
app.post('/api/checkout', requireAuth, handleCheckout);
app.get('/api/orders', requireAuth, getOrders);

// Route pubblica: nessun token necessario
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
```

---

## Test End-to-End

Con MockMart avviato (`make up`), il flusso completo:

### 1. Avviare lo stack

```bash
cd MockMart
make up
```

| Servizio | URL |
|----------|-----|
| Shop UI (frontend) | http://localhost:3000 |
| Shop API (backend) | http://localhost:3001 |
| Keycloak | http://localhost:8080 |

### 2. Login dall'interfaccia

1. Apri `http://localhost:3000`
2. Clicca **Login** → il browser viene reindirizzato a Keycloak
3. Inserisci `mario` / `mario123`
4. Dopo il redirect, l'utente è autenticato nell'app

### 3. Verificare il token

Apri i DevTools del browser (F12 → Network). Nelle chiamate a `/api/products`, osserva l'header:

```http
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

È possibile decodificare il payload del token (la parte tra i due punti) su [jwt.io](https://jwt.io) o da terminale:

```bash
# Decodifica il payload del JWT (seconda parte, separata da '.')
echo "eyJhbGci..." | cut -d'.' -f2 | tr '_-' '/+' | base64 -d 2>/dev/null | jq
```

Output (semplificato):

```json
{
  "iss": "http://localhost:8080/realms/techstore",
  "sub": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "preferred_username": "mario",
  "email": "mario@techstore.local",
  "realm_access": {
    "roles": ["user"]
  },
  "exp": 1708000000
}
```

### 4. Verificare PKCE con curl

Per vedere il flusso PKCE passo per passo, è possibile simularlo da terminale.

**Generare code_verifier e code_challenge:**

```bash
# Genera un code_verifier random (43-128 caratteri)
CODE_VERIFIER=$(openssl rand -base64 48 | tr -d '=/+' | head -c 128)

# Calcola il code_challenge (SHA-256 del verifier, codificato base64url)
CODE_CHALLENGE=$(echo -n "$CODE_VERIFIER" | openssl dgst -sha256 -binary | base64 | tr '+/' '-_' | tr -d '=')

echo "code_verifier:  $CODE_VERIFIER"
echo "code_challenge: $CODE_CHALLENGE"
```

**Authorization request** (questo normalmente lo fa il browser via redirect):

```text
http://localhost:8080/realms/techstore/protocol/openid-connect/auth?
  response_type=code
  &client_id=shop-ui
  &redirect_uri=http://localhost:3000/
  &scope=openid profile email
  &code_challenge_method=S256
  &code_challenge=<CODE_CHALLENGE>
  &state=random123
```

Dopo il login, Keycloak reindirizza a:

```text
http://localhost:3000/?code=SplxlOBeZQQ...&state=random123
```

**Token request** (scambio code → token, con il verifier originale):

```bash
curl -s -X POST \
  'http://localhost:8080/realms/techstore/protocol/openid-connect/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "grant_type=authorization_code" \
  -d "client_id=shop-ui" \
  -d "code=<CODE_RICEVUTO>" \
  -d "redirect_uri=http://localhost:3000/" \
  -d "code_verifier=$CODE_VERIFIER" | jq
```

Se il `code_verifier` corrisponde al `code_challenge` inviato nella authorization request, Keycloak restituisce i token. Altrimenti: errore.

---

## Dove si rompe

### Redirect URI mismatch

```text
error: invalid_redirect_uri
error_description: Invalid redirect uri
```

L'URL a cui Keycloak deve reindirizzare dopo il login non corrisponde a quelli registrati nel client. In Keycloak, **Valid redirect URIs** è un filtro esatto (con supporto wildcard `*`).

**Fix:** La `redirect_uri` nella richiesta deve corrispondere esattamente a una di quelle configurate nel client. Su localhost, `http://localhost:3000/*` copre tutte le route. In produzione, è preferibile evitare i wildcard e registrare gli URI esatti per prevenire attacchi di open redirect.

### Issuer mismatch (401 inspiegabile)

```text
JWT validation failed: unexpected "iss" claim value
```

Il token contiene `iss: http://localhost:8080/realms/techstore`, ma il backend sta validando contro `http://keycloak:8080/realms/techstore`. Succede quando `KEYCLOAK_PUBLIC_URL` non è configurato o punta all'URL Docker interno.

**Fix:** `KEYCLOAK_PUBLIC_URL` deve corrispondere all'URL che il browser usa per raggiungere Keycloak. Sono due URL diversi per design: uno per la rete Docker (JWKS), uno per il browser (issuer).

### CORS bloccato

```text
Access to fetch at 'http://localhost:8080/...' has been blocked by CORS policy
```

Il browser blocca richieste cross-origin se Keycloak non include l'header `Access-Control-Allow-Origin`. Succede quando **Web origins** nel client non è configurato.

**Fix:** In Keycloak → Client → Settings → **Web origins**, aggiungere `http://localhost:3000`. In alternativa, `+` usa automaticamente tutte le redirect URI registrate.

### Token scaduto ma nessun refresh

L'utente naviga normalmente, poi improvvisamente riceve 401 su tutte le chiamate. Il token è scaduto (default: 5 minuti) e il frontend non ha rinnovato.

**Fix:** Chiamare `kc.updateToken(30)` prima di ogni richiesta API. Con un wrapper come `apiFetch` (visto sopra), il refresh è automatico. Se il refresh token è scaduto (default: 30 minuti di inattività tramite SSO Session Idle, o 10 ore in totale tramite SSO Session Max), l'utente deve ri-loggarsi. Entrambi i valori sono configurabili nel realm.

### PKCE challenge fallito

```json
{
  "error": "invalid_grant",
  "error_description": "PKCE verification failed"
}
```

Il `code_verifier` inviato nel token request non corrisponde al `code_challenge` della authorization request. Può succedere se la libreria non gestisce correttamente la persistenza del verifier tra i due step (es. dopo un refresh della pagina durante il login).

**Fix:** `keycloak-js` gestisce PKCE automaticamente. Per implementazioni manuali, il `code_verifier` va salvato in `sessionStorage` (non `localStorage`) e riletto nel callback.

---

## Cosa contiene il JWT

Il JWT che il frontend riceve è quello che il backend usa per tutte le decisioni. Ecco cosa contiene.

### Access Token

| Claim | Descrizione | Esempio |
|-------|-------------|---------|
| `iss` | Chi ha emesso il token (Keycloak) | `http://localhost:8080/realms/techstore` |
| `sub` | ID univoco dell'utente | `f47ac10b-58cc-...` |
| `aud` | Destinatario del token | `account` |
| `exp` | Scadenza (Unix timestamp) | `1708000300` |
| `azp` | Client che ha richiesto il token | `shop-ui` |
| `realm_access.roles` | Ruoli dell'utente nel realm | `["user"]` |
| `preferred_username` | Username leggibile | `mario` |

### ID Token vs Access Token

Due token con scopi diversi:

| | ID Token | Access Token |
|---|---|---|
| **Destinatario** | Il frontend (chi ha fatto login) | Il backend (chi protegge le risorse) |
| **Contiene** | Identità dell'utente | Autorizzazioni concesse |
| **Uso** | Mostrare "Ciao, Mario" nell'UI | Validare le richieste API |
| **Inviarlo al backend?** | No | Sì, nell'header `Authorization` |

> `keycloak-js` espone entrambi: `kc.token` (access token) e `kc.idToken` (ID token). Per le chiamate API, usa sempre l'access token.

---

## Conclusione

Il flusso di autenticazione coperto in questo articolo:

1. **Keycloak** gestisce realm, client, utenti e ruoli
2. **React + keycloak-js** gestisce il redirect, PKCE, e il refresh dei token
3. **Express + jose** valida i JWT ad ogni richiesta, usando le chiavi pubbliche JWKS

Il codice dell'applicazione non tocca mai le credenziali. Il frontend non ha secret. Il backend non ha un database utenti. Tutto è delegato a Keycloak.

Nei prossimi articoli vedremo come autenticare servizi tra loro senza utente ([Client Credentials](/blog/progettare/keycloak/03-keycloak-m2m/)) e i problemi reali che emergono quando l'integrazione incontra la produzione ([6 Problemi Reali](/blog/progettare/keycloak/04-keycloak-e2e/)).

---

## Risorse Utili

- [MockMart - Repository Demo](https://github.com/monte97/MockMart)
- [Keycloak Documentation - OIDC Clients](https://www.keycloak.org/docs/latest/server_admin/#_oidc_clients)
- [Keycloak JavaScript Adapter](https://www.keycloak.org/securing-apps/javascript-adapter)
- [jose - JWT Validation Library](https://github.com/panva/jose)
- [RFC 7636 - Proof Key for Code Exchange (PKCE)](https://datatracker.ietf.org/doc/html/rfc7636)
- [OAuth 2.0 for Browser-Based Apps](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps)
