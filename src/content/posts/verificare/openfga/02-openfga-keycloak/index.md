---
title: "OpenFGA + Keycloak: Identità e Permessi si Parlano"
seoTitle: "OpenFGA + Keycloak: JWT e sincronizzazione"
date: 2026-03-21T09:00:00.000Z
description: "Come integrare OpenFGA con Keycloak: sincronizzazione utenti, JWT come ponte, contextual tuples e strategie per tenere identità e autorizzazione allineate."
pillar: verificare
category: openfga
tags:
  - OpenFGA
  - Keycloak
  - Authorization
  - Authentication
  - JWT
lang: it
draft: false
reviewed: false
series: openfga
seriesOrder: 20
reproducibility: true
summary:
  - label: "Scelta"
    value: "Il `sub` del JWT diventa `user:{sub}`: identità e permessi si incontrano lì"
    note: "Keycloak non sa nulla delle risorse, OpenFGA non sa nulla di login e sessioni"
  - label: "Prerequisiti"
    value: "Claim groups configurato una volta come client scope di realm"
    note: "Tutti i client del realm ereditano il mapper senza configurazione per singolo client"
  - label: "Scoperta"
    value: "Si sincronizzano le relazioni di identità, non quelle sulle risorse"
    note: "Le tuple su folder e documenti le scrive l'applicazione quando crea o condivide"
  - label: "Risultato"
    value: "La combinazione più comune è on-demand al login più batch di riconciliazione"
openItems:
  - "La sincronizzazione on-demand copre solo chi fa login: chi deve avere permessi pre-assegnati senza essersi mai autenticato richiede il batch di riconciliazione"
  - "Le contextual tuples vivono per la singola chiamata: le relazioni strutturali passate così restano invisibili a ListObjects e a tutti gli altri utenti"
  - "Il middleware è fail closed: se OpenFGA non è raggiungibile la richiesta si ferma con un 503 e non passa"
openNote: "I confini delle tre strategie di sincronizzazione, prima di sceglierne una."
figures:
  - kind: flow
    at: jwt-come-ponte
    label: "Dove i due sistemi si toccano"
    caption: "Nessuno dei due conosce il mondo dell'altro: l'unico dato che attraversa il confine è il claim sub"
    nodes:
      - kind: "Client"
        name: "Browser"
        desc: "Fa il login e da lì in poi presenta il JWT come Bearer token su ogni richiesta protetta."
        edge: "Authorization Code + PKCE"
      - kind: "Identità"
        name: "Keycloak"
        desc: "Autentica l'utente e firma il token con sub, realm_access.roles e groups. Non sa che esistano documenti, folder o workspace."
        edge: "il claim sub, e i gruppi dell'utente"
      - kind: "Applicazione"
        name: "Express"
        desc: "Valida la firma via JWKS, estrae sub e groups, e traduce la richiesta HTTP in una domanda di autorizzazione."
        edge: "Check su user:{sub} e la risorsa richiesta"
      - kind: "Autorizzazione"
        name: "OpenFGA"
        desc: "Attraversa il grafo delle relazioni e risponde allow o deny. Non sa nulla di login, token o sessioni."
        key: true
  - kind: timeline
    at: 4-flusso-completo
    label: "Una richiesta di Alice, dal login ai documenti"
    caption: "La sincronizzazione sta al passo due e non si ripete: le richieste successive costano solo una validazione e un ListObjects"
    steps:
      - kind: "Login"
        title: "Alice si autentica su Keycloak"
        desc: "Authorization Code + PKCE con il client vaultdrive-app. Il token che torna porta il claim groups ereditato dal client scope di realm."
      - kind: "Sincronizzazione"
        title: "POST /auth/callback"
        desc: "syncUserOnLogin legge i gruppi dal token, verifica se la tupla member esiste in OpenFGA e la scrive se manca. Avviene qui, non a ogni richiesta."
      - kind: "Richiesta"
        title: "GET dei documenti con il Bearer token"
        desc: "Express valida firma e scadenza del JWT tramite JWKS, senza chiamare Keycloak a ogni richiesta."
      - kind: "Autorizzazione"
        title: "ListObjects su OpenFGA"
        desc: "La domanda è quali documenti l'utente può vedere, non se può vedere questo documento. OpenFGA risponde con gli id accessibili."
      - kind: "Dati"
        title: "SELECT con WHERE id IN"
        desc: "Il database recupera i dettagli dei soli documenti già filtrati per permesso, dentro l'organizzazione richiesta."
      - kind: "Risposta"
        title: "200 con i documenti di Alice"
        desc: "OpenFGA attraversa il grafo, il database filtra le righe: ognuno fa la parte per cui è ottimizzato."
        done: true
mode: explanation
caseStudy:
  slug: "il-permesso-che-non-sapeva-pronunciare"
  hook: >
    Cosa succede quando identità e permessi devono parlarsi dentro un prodotto che non è
    nato per questo.
---

Un identity provider gestisce utenti, ruoli e login. Un authorization engine decide chi può fare cosa su quale risorsa. Il problema non è farli funzionare: è farli parlare senza che uno invada il territorio dell'altro. Nell'[articolo precedente](/blog/verificare/openfga/01-zanzibar-concetti/) abbiamo costruito un modello di autorizzazione relationship-based con OpenFGA. Ora lo colleghiamo a Keycloak, usando [VaultDrive](https://github.com/monte97/VaultDrive) come progetto di riferimento: una demo costruita per questa serie con setup containerizzato e codice riproducibile.

---

## Separazione delle responsabilità

Se hai letto l'[articolo introduttivo su Keycloak](/blog/progettare/keycloak/01-keycloak-intro/) o quello su [Authorization Code + PKCE](/blog/progettare/keycloak/02-authorization-code-pkce/), il principio è familiare: Keycloak autentica, qualcun altro autorizza. Nell'articolo su OPA il "qualcun altro" era un policy engine con regole Rego. Qui il modello cambia: non sono più policy dichiarative che valutano un input JSON, ma relazioni tra entità memorizzate in un grafo.

| Componente | Responsabilità |
|---|---|
| Keycloak | Autenticazione, emissione JWT, gestione utenti e ruoli realm |
| Express (middleware) | Validazione JWT, estrazione identità |
| OpenFGA | Decisione di autorizzazione basata su relazioni (tuple) |
| Modello FGA | Definizione dei tipi, delle relazioni e delle regole di accesso |

Keycloak non sa nulla delle risorse dell'applicazione. Non sa che esistono folder, documenti o workspace. OpenFGA non sa nulla del login, dei token o delle sessioni. I due sistemi si incontrano in un punto preciso: il `sub` claim del JWT.

---

## JWT come ponte

Il token JWT emesso da Keycloak contiene un campo `sub` - un UUID che identifica univocamente l'utente. Questo valore diventa l'identità dell'utente nel mondo OpenFGA.

Il flusso per ogni richiesta protetta:

1. L'utente fa login tramite Keycloak (Authorization Code + PKCE)
2. Keycloak emette un JWT con `sub`, `realm_access.roles`, `groups` e altri claim
3. Express valida il JWT tramite JWKS
4. Il middleware estrae `sub` e `groups` dal token
5. Express chiama OpenFGA Check con `user:{sub}` sulla risorsa richiesta
6. OpenFGA attraversa il grafo delle relazioni e risponde allow/deny

Un punto importante: il claim `groups` non viene configurato su ogni singolo client. In Keycloak si definisce un **client scope** a livello di realm con il mapper `oidc-group-membership-mapper`, poi lo si aggiunge ai default client scopes. Tutti i client del realm lo ereditano automaticamente. In VaultDrive il realm ha tre client -- `vaultdrive-app` (SPA pubblica), `vaultdrive-admin` (dashboard confidential), `analytics-service` (M2M) -- e i primi due ricevono il claim `groups` senza configurazione aggiuntiva. Il client M2M, che usa Client Credentials e non ha utenti, non ne ha bisogno.

In Express, il middleware che fa da ponte è lineare:

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
    const userId = req.user.sub; // dal JWT Keycloak
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

Due aspetti da notare:

- **Fail closed**: se OpenFGA non è raggiungibile, il middleware risponde 503, non lascia passare la richiesta. In un sistema di autorizzazione, il default in caso di errore deve essere il deny.
- **`req.user.sub`**: il campo proviene dalla validazione JWT fatta dal middleware di autenticazione. Non c'è nessuna logica di autorizzazione nel token, solo l'identità.

---

## Sincronizzazione: tre strategie

Keycloak gestisce gli utenti e i **gruppi**. In VaultDrive, ogni organizzazione è un gruppo Keycloak: `org-acme`, `org-beta`. Quando un utente viene aggiunto a un gruppo in Keycloak, quella relazione deve riflettersi in OpenFGA come tupla `user:{sub} member org:{gruppo}`. Chi scrive questa tupla? Ci sono tre modi per farlo, e nessuno è perfetto.

### Event-driven: webhook su Admin Events

Keycloak genera Admin Events per ogni operazione amministrativa: creazione utente, assegnazione a un gruppo, rimozione da un gruppo. Un listener custom (SPI Event Listener o un webhook tramite estensione) intercetta questi eventi e scrive le tuple corrispondenti in OpenFGA.

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
// webhook-handler.js (esempio semplificato)
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

### Batch: job periodico

Un job schedulato (cron, Kubernetes CronJob) legge tutti gli utenti e i loro gruppi da Keycloak Admin API, confronta con le tuple esistenti in OpenFGA, e scrive le differenze.

```javascript
// sync-batch.js
async function syncGroupMemberships() {
  // Leggi gruppi da Keycloak Admin API
  const groups = await fetchKeycloakGroups(); // [{name: "org-acme", members: [...]}]

  for (const group of groups) {
    const orgObject = `org:${group.name}`;

    // Leggi tuple esistenti per questa org
    const existingTuples = await fgaClient.read({ object: orgObject });
    const existingUserIds = new Set(
      existingTuples.tuples.map(t => t.key.user)
    );

    // Membri KC che non hanno ancora una tupla
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

### On-demand: sincronizzazione al login

Al primo login di un utente, il middleware legge il claim `groups` dal JWT e verifica se le tuple `member` corrispondenti esistono già. Se no, le scrive. Nessun job esterno, nessun webhook. L'informazione sui gruppi è già nel token grazie al client scope configurato a livello di realm.

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

Il middleware itera su tutti i gruppi dell'utente: un utente può appartenere a più organizzazioni, e la sync li copre tutti. In VaultDrive, la chiamata avviene al token exchange:

```javascript
// routes/auth.js — callback dopo il login
const groups = (payload.groups || []).map(g =>
  g.startsWith('/') ? g.slice(1) : g  // KC può restituire /org-acme
);
await syncUserOnLogin({ sub: payload.sub, username: payload.preferred_username, groups, roles });
```

Il costo è un Check OpenFGA per gruppo a ogni login. Si può mitigare con una cache in-memory breve (es. 60 secondi): se l'utente è già stato sincronizzato di recente, salta il controllo.

---

## Quale strategia scegliere

La scelta dipende da quattro fattori. Nessuna strategia copre tutti gli scenari in modo ottimale.

| Fattore | Event-driven | Batch | On-demand |
|---|---|---|---|
| Latenza | Real-time | Minuti/ore di lag | Zero per utenti attivi |
| Copertura utenti | Tutti | Tutti | Solo chi fa login |
| Complessità infra | Alta (webhook, SPI, coda) | Media (cron job) | Bassa (middleware) |
| Resilienza | Serve gestire retry e idempotenza | Idempotente per natura (diff) | Idempotente (check prima di write) |
| Adatto per | Permessi critici, compliance | Migrazione iniziale, audit | MVP, team piccoli, SaaS multi-tenant |

Nella pratica, la combinazione più comune è **on-demand + batch di riconciliazione**. L'on-demand copre il caso comune (utente attivo che fa login), il batch periodico riallinea eventuali inconsistenze e gestisce gli utenti che non hanno mai fatto login ma devono avere permessi pre-assegnati.

VaultDrive usa la strategia on-demand perché il caso d'uso è semplice: un utente esiste nel sistema di autorizzazione dal momento in cui fa il primo login. Le risorse (folder, documenti) vengono create dall'applicazione, e le tuple corrispondenti vengono scritte nello stesso momento.

---

## Contextual tuples: quando non serve sincronizzare

Non tutte le relazioni vanno scritte come tuple persistenti. Alcune sono già presenti nel JWT e hanno senso solo nel contesto della singola richiesta.

Esempio: il JWT Keycloak contiene `realm_access.roles: ["admin"]`. Potresti scrivere una tupla `user:alice admin org:org-acme` e mantenerla sincronizzata. Ma se il ruolo è già nel token e cambia solo quando l'admin lo modifica in Keycloak, puoi passarlo come **contextual tuple** nella chiamata Check.

```javascript
// middleware/fga-contextual.js
async function checkWithContext(req, relation, objectType, objectId) {
  const userId = req.user.sub;
  const roles = req.user.roles || [];
  const groups = req.user.groups || [];

  // Costruisci contextual tuples dai ruoli JWT per ogni gruppo
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

Le contextual tuples vengono considerate da OpenFGA come se fossero tuple reali, ma solo per la durata di quella singola chiamata. Non vengono scritte nello store.

Quando usarle:

- **Ruoli realm o claim JWT** che cambiano raramente e sono già nel token
- **Attributi derivabili** dalla sessione corrente (es: IP range, orario)
- **Relazioni temporanee** che non ha senso persistere

Quando NON usarle:

- **Relazioni strutturali** (alice è membro di org-acme): servono per attraversare il grafo e risolvere permessi indiretti. Se sono solo contestuali, le query `ListObjects` non le vedranno.
- **Permessi che devono essere visibili ad altri utenti**: le contextual tuples esistono solo nella singola chiamata, nessun altro le vede.

Il modello FGA deve supportare le relazioni usate come contextual tuples. Se il tipo `org` non ha una relazione `admin`, passare `{user:alice, relation:admin, object:org:org-acme}` come contextual tuple non avrà effetto.

---

## Cosa non sincronizzare

Un errore comune nell'integrazione Keycloak-OpenFGA è cercare di sincronizzare tutto. Non tutto appartiene al confine tra identità e autorizzazione.

**Da sincronizzare** (relazioni user-to-organization, derivate dai gruppi KC):
- Utente X è membro dell'organizzazione Y (gruppo KC `org-y`)
- Utente X appartiene al team Z (gruppo KC `team-z`)
- Utente X ha il ruolo admin nell'organizzazione Y (ruolo realm + gruppo)

Queste relazioni nascono in Keycloak (assegnazione a un gruppo) e devono riflettersi in OpenFGA perché sono il punto di partenza per risolvere i permessi. Il claim `groups` nel JWT è il ponte: Keycloak lo emette tramite il client scope, l'applicazione lo legge e scrive le tuple.

**Da NON sincronizzare** (relazioni resource-level):
- La folder "Progetti" è figlia della folder "Root"
- Il documento "report.pdf" è nella folder "Progetti"
- Alice è editor del documento "report.pdf"

Queste tuple si scrivono quando la risorsa viene creata o condivisa, direttamente dall'applicazione. Non hanno nulla a che fare con Keycloak. Non transitano per l'identity provider.

```javascript
// routes/documents.js -- scrittura tuple alla creazione della risorsa
app.post('/api/documents', requireAuth, async (req, res) => {
  const userId = req.user.sub;
  const { name, folderId } = req.body;

  // Crea il documento nel database
  const doc = await db.documents.create({ name, folderId, ownerId: userId });

  // Scrivi le tuple in OpenFGA
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

La regola è semplice: se la relazione nasce dall'identità dell'utente (chi è, a quale organizzazione appartiene), va sincronizzata da Keycloak. Se la relazione nasce da un'azione nell'applicazione (creazione, condivisione, spostamento), la scrive l'applicazione stessa.

---

## Esempio end-to-end con VaultDrive

Di seguito il flusso completo. Alice fa login a VaultDrive, naviga le sue folder e apre un documento.

### 1. Login e emissione JWT

Alice fa login tramite il client `vaultdrive-app` con Authorization Code + PKCE. Keycloak emette un JWT con il claim `groups` (ereditato dal client scope di realm):

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

Il claim `groups` viene dal mapper `oidc-group-membership-mapper` definito nel client scope `groups` a livello di realm. Se alice facesse login dal client `vaultdrive-admin`, riceverebbe lo stesso claim perché entrambi i client ereditano lo scope.

### 2. Sincronizzazione on-login

Al token exchange, il middleware `syncUserOnLogin` legge `groups` dal JWT. Per ogni gruppo, verifica se la tupla esiste in OpenFGA. Alice appartiene a `org-acme`, quindi il middleware scrive:

```yaml
# Tupla scritta da syncUserOnLogin
user: "user:a1b2c3d4-e5f6-7890-abcd-ef1234567890"
relation: "member"
object: "org:org-acme"
```

Se alice appartenesse a più gruppi (es. `org-acme` e `org-beta`), il middleware scriverebbe una tupla per ciascuno.

### 3. Richiesta documenti

Alice chiama `GET /api/orgs/org-acme/documents`. Express valida il JWT, poi chiede a OpenFGA quali documenti Alice può vedere.

```javascript
// routes/documents.js
app.get('/api/orgs/:orgId/documents', requireAuth, async (req, res) => {
  const userId = req.user.sub;
  const { orgId } = req.params;

  // Chiedi a OpenFGA quali documenti l'utente può vedere
  const { objects } = await fgaClient.listObjects({
    user: `user:${userId}`,
    relation: 'can_view',
    type: 'document',
  });

  // objects = ["document:doc-1", "document:doc-3", "document:doc-7"]
  const docIds = objects.map(o => o.replace('document:', ''));

  // Filtra dal database solo i documenti nell'org richiesta
  const documents = await db.query(
    'SELECT * FROM documents WHERE id = ANY($1) AND org_id = $2',
    [docIds, orgId]
  );

  res.json(documents);
});
```

### 4. Flusso completo

Il pattern `ListObjects` + `WHERE IN` è il modo standard per filtrare risorse in base ai permessi senza caricare tutto in memoria. OpenFGA restituisce gli ID delle risorse accessibili, il database filtra i dettagli. Questo approccio scala bene perché OpenFGA è ottimizzato per attraversare il grafo delle relazioni, e il database è ottimizzato per filtrare righe per ID.

---

## Struttura del progetto

In VaultDrive, i file rilevanti per l'integrazione Keycloak-OpenFGA sono:

```text
vaultdrive-api/src/
+-- middleware/
|   +-- authenticate.js       # Validazione JWT via JWKS, estrae sub + groups
|   +-- authorize.js          # OpenFGA Check wrapper
|   +-- data-masking.js       # Dynamic Data Masking (post 4)
+-- services/
|   +-- openfga.js            # SDK client (check, listObjects, writeTuples)
|   +-- keycloak-sync.js      # Sync gruppi KC -> tuple OpenFGA
|   +-- query-builder.js      # ListObjects + WHERE builder
+-- routes/
|   +-- auth.js               # Token exchange + sync on-login
|   +-- documents.js          # CRUD documenti con check FGA
|   +-- folders.js            # CRUD folder con check FGA

keycloak/
+-- realm-export.json          # Realm con gruppi, 3 client, client scope groups

openfga/
+-- model.fga                  # Modello di autorizzazione
+-- store.fga.yaml             # Test del modello
```

Ogni middleware ha una responsabilità singola. `authenticate.js` valida il JWT e popola `req.user` con `sub`, `groups`, `roles` e `clientId`. `keycloak-sync.js` garantisce che l'utente esista in OpenFGA per ogni gruppo a cui appartiene. `authorize.js` esegue i Check di autorizzazione. Le route li compongono nell'ordine corretto:

```javascript
// La sync avviene al login (POST /auth/callback), non a ogni richiesta.
// Le richieste successive usano solo authenticate + authorize.
router.get('/api/orgs/:orgId/documents',
  authenticate,                           // chi sei? (JWT, estrae groups)
  authorize('can_view', 'org', 'orgId'),  // puoi accedere a questa org?
  listDocuments                           // cosa puoi vedere? (ListObjects + DB)
);
```

---

## Conclusioni

L'integrazione tra Keycloak e OpenFGA si riduce a tre decisioni:

1. **Come mappare l'identità**: il `sub` del JWT diventa `user:{sub}` in OpenFGA. I gruppi KC diventano organizzazioni. Il claim `groups`, configurato una volta come client scope di realm, porta l'informazione in ogni token senza ripetere la configurazione per ogni client.

2. **Come sincronizzare le relazioni utente-organizzazione**: on-demand al login per MVP e team piccoli (leggi `groups` dal JWT, scrivi le tuple), event-driven per sistemi critici, batch per riconciliazione. Le relazioni sulle risorse non si sincronizzano: le scrive l'applicazione.

3. **Cosa passare come contextual tuple**: i ruoli realm e gli attributi derivabili dal JWT possono viaggiare come tuple temporanee, senza occupare spazio nello store. Ma le relazioni strutturali (membership da gruppi, gerarchia risorse) devono essere persistenti, altrimenti `ListObjects` non le vede.

La separazione è la stessa vista con OPA -- Keycloak autentica, un engine esterno autorizza -- ma il modello cambia: non più policy dichiarative che ricevono un input e restituiscono un booleano, ma un grafo di relazioni che viene attraversato per risolvere i permessi. Il vantaggio diventa evidente quando le regole di accesso seguono strutture gerarchiche (folder, team, organizzazioni), che è esattamente il caso di VaultDrive.

Nel prossimo articolo vedremo come gestire la multi-tenancy: più organizzazioni nello stesso sistema, con isolamento completo dei permessi e modelli FGA condivisi.

### Risorse

**Repository demo:**
- [VaultDrive su GitHub](https://github.com/monte97/VaultDrive)

**Documentazione OpenFGA:**
- [OpenFGA SDK Node.js (`@openfga/sdk`)](https://www.npmjs.com/package/@openfga/sdk)
- [OpenFGA - Contextual Tuples](https://openfga.dev/docs/modeling/contextual-time-based-authorization)
- [OpenFGA - ListObjects API](https://openfga.dev/docs/interacting/relationship-queries#listobjects)
- [OpenFGA - Check API](https://openfga.dev/docs/interacting/relationship-queries#check)
- [OpenFGA - Write Tuples](https://openfga.dev/docs/interacting/managing-relationships-between-objects)

**Documentazione Keycloak:**
- [Keycloak Admin Events](https://www.keycloak.org/docs/latest/server_admin/#auditing-and-events)
- [Keycloak - Group Membership Mapper](https://www.keycloak.org/docs/latest/server_admin/#_group-membership-claims)
- [Keycloak - Client Scopes](https://www.keycloak.org/docs/latest/server_admin/#_client_scopes)

**Articoli correlati:**
- [Articolo precedente: Zanzibar e i concetti fondamentali](/blog/verificare/openfga/01-zanzibar-concetti/)
- [Autorizzazione granulare con OPA e Keycloak](/blog/progettare/keycloak/05-keycloak-opa/)
- [Keycloak: introduzione](/blog/progettare/keycloak/01-keycloak-intro/)

---
