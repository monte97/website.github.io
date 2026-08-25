---
title: "Zanzibar per Tutti: Concetti e Modello di Autorizzazione"
date: 2026-03-07T09:00:00.000Z
description: "Da RBAC a Zanzibar: come funziona il modello a tuple di OpenFGA, il DSL per le relazioni, e le tre domande fondamentali dell'autorizzazione."
pillar: verificare
category: openfga
tags:
  - OpenFGA
  - Authorization
  - ReBAC
  - Zanzibar
  - Access Control
lang: it
draft: false
reviewed: false
series: openfga
seriesOrder: 10
reproducibility: true
summary:
  - label: "Problema"
    value: "Con RBAC i ruoli crescono in modo combinatorio appena le risorse hanno gerarchie"
    note: "Tre cartelle con cinque documenti e tre livelli di accesso producono già decine di ruoli"
  - label: "Scoperta"
    value: "In Zanzibar le relazioni tra utenti e risorse sono dati, non configurazione"
    note: "Il soggetto della tupla può essere un utente, un altro oggetto o un userset"
  - label: "Strumento"
    value: "OpenFGA: DSL dichiarativo con ereditarietà transitiva e deny-by-default"
  - label: "Ampiezza"
    value: "Check, ListObjects e ListUsers coprono le tre domande dell'autorizzazione"
    note: "Gate nel middleware, filtraggio della UI, audit e condivisione"
openItems:
  - "ListObjects è l'operazione più costosa del modello: con milioni di documenti va contenuta con paginazione, caching o pre-materializzazione"
  - "Il DSL non valuta attributi, non fa pattern matching e non fa calcoli: risolve grafi di relazioni, per condizioni arbitrarie serve un modello come ABAC"
  - "Il modello qui resta su user, folder e document: organizzazioni, team e multitenancy sono estensioni successive della serie"
  - "I numeri di scala del paper Zanzibar riguardano il sistema Google, non le implementazioni open source come OpenFGA"
openNote: "Cosa resta fuori dal modello base descritto in questo articolo."
caseStudy:
  slug: "il-permesso-che-non-sapeva-pronunciare"
  hook: >
    Il modello raccontato qui, applicato a un sistema in esercizio che aveva tre ruoli
    globali e quindici anni di storia.
---

In un sistema di file sharing come Google Drive, Alice crea una cartella "Progetto X" con tre documenti e la condivide con Bob come editor. Bob deve poter modificare tutti i documenti nella cartella, inclusi quelli aggiunti in seguito, senza che nessuno intervenga manualmente.

Con RBAC classico, questo scenario richiede ruoli come `cartella-progetto-x-editor`, `documento-readme-viewer`, `org-acme-member` - uno per ogni combinazione di risorsa e permesso. Quando le risorse crescono, il numero di ruoli cresce in modo combinatorio. Quando le gerarchie si annidano (organizzazione, team, cartella, sottocartella, documento), il modello non regge.

Google ha pubblicato nel 2019 **Zanzibar**, il sistema di autorizzazione che gestisce questo tipo di problema. Questo documento copre i concetti fondamentali di quel modello e come OpenFGA, la sua implementazione open source, li espone tramite API.

---

## Perché RBAC non basta

RBAC (Role-Based Access Control) funziona bene per un caso semplice: hai utenti, hai ruoli, hai permessi. Un `admin` può fare tutto, un `viewer` può solo leggere. Per un'applicazione con due o tre ruoli e risorse omogenee, è la scelta giusta.

Il problema emerge quando le risorse hanno relazioni tra loro. In un sistema di document sharing:

- Un documento sta in una cartella
- Una cartella sta in un'organizzazione
- Chi ha accesso alla cartella ha accesso ai documenti dentro
- Chi ha accesso all'organizzazione ha accesso a tutte le cartelle
- Un utente può ricevere un link di condivisione per un singolo documento

Con RBAC, ogni relazione diventa un ruolo. Tre cartelle con cinque documenti ciascuna e tre livelli di accesso (owner, editor, viewer) producono già decine di ruoli. Aggiungi team, organizzazioni e condivisione per link, e il numero di ruoli cresce in modo combinatorio.

Nell'[articolo su OPA]({{< ref "/blog/progettare/keycloak/05-keycloak-opa/" >}}) abbiamo visto come separare autenticazione e autorizzazione usando policy Rego. OPA risolve il problema della *logica* di autorizzazione (regole flessibili, deny-by-default, dati esterni), ma il modello resta basato su attributi: l'input contiene ruoli, proprietario della risorsa, e condizioni da valutare. Le relazioni tra risorse non sono un concetto nativo.

Serve un modello diverso: uno che tratti le relazioni come dati di prima classe.

---

## Google Zanzibar

Nel 2019, Google ha pubblicato ["Zanzibar: Google's Consistent, Global Authorization System"](https://research.google/pubs/pub48190/). Il paper descrive il sistema che gestisce l'autorizzazione per Google Drive, YouTube, Google Maps, Cloud e decine di altri prodotti. Numeri dichiarati: oltre un trilione di access check al secondo, con latenza sotto i 10 millisecondi al 95esimo percentile.

L'intuizione centrale: **le relazioni tra utenti e risorse sono dati, non configurazione**. Invece di definire ruoli e poi assegnare utenti ai ruoli, si scrivono direttamente le relazioni. "Alice è editor del documento readme" non è un ruolo assegnato in un pannello admin - è un record in un database.

Tre concetti fondamentali:

1. **Tuple**: il dato atomico, una relazione tra un utente e un oggetto
2. **Modello di autorizzazione**: le regole che definiscono quali relazioni esistono e come si ereditano
3. **Query**: domande sulle relazioni, "può Alice vedere questo documento?"

Da questo paper sono nate diverse implementazioni. La più rilevante per l'ecosistema open source è **OpenFGA** (Fine-Grained Authorization), creata dal team Auth0 e ora [progetto CNCF](https://www.cncf.io/projects/openfga/). Offre lo stesso modello concettuale di Zanzibar con un DSL leggibile, API HTTP/gRPC, e un [playground web](https://play.fga.dev/) per sperimentare.

---

## La tupla: il mattone base

Tutto in OpenFGA parte dalla tupla. Una tupla ha tre campi obbligatori:

```json
{
  "user": "user:alice",
  "relation": "owner",
  "object": "document:readme"
}
```

`user` e `object` seguono il formato `tipo:id`. Il tipo non è decorativo: è parte del sistema di tipi del modello di autorizzazione. `user:alice` è un'entità di tipo `user` con id `alice`; `document:readme` è un'entità di tipo `document` con id `readme`.

Pensando a [VaultDrive](https://github.com/monte97/VaultDrive) — una demo che ho costruito appositamente per questa serie, con codice riproducibile e setup containerizzato — le prime tuple che scrivi sono assegnazioni dirette:

```json
{ "user": "user:alice", "relation": "owner",  "object": "document:readme" }
{ "user": "user:bob",   "relation": "editor", "object": "document:readme" }
{ "user": "user:charlie","relation": "viewer", "object": "folder:progetto-x" }
```

"Alice è owner di document:readme" non è un ruolo globale. Alice non è "owner" in generale, è owner *di quel documento specifico*. Se crea un secondo documento, servirà una seconda tupla.

### Oggetti come soggetti

Il campo `user` non deve necessariamente contenere un utente. Può contenere qualsiasi entità del sistema, inclusi gli oggetti stessi. Questo è il meccanismo che rende possibili le gerarchie:

```json
{ "user": "folder:progetto-x", "relation": "parent", "object": "document:readme" }
```

"La cartella progetto-x è parent del documento readme." Non c'è nessun utente coinvolto in questa tupla — è una relazione strutturale tra due oggetti. Il modello di autorizzazione userà questa relazione per propagare i permessi: chi ha accesso alla cartella lo eredita sul documento.

### Userset: un insieme come soggetto

Il terzo tipo di soggetto è l'**userset**: non un singolo utente né un singolo oggetto, ma *l'insieme di tutti gli utenti che hanno una certa relazione con un oggetto*. Si scrive con `#`:

```json
{ "user": "folder:progetto-x#viewer", "relation": "viewer", "object": "document:readme" }
```

`folder:progetto-x#viewer` significa "chiunque sia viewer della cartella progetto-x". Questa tupla dice: "tutti i viewer della cartella sono anche viewer del documento". OpenFGA risolve l'userset a runtime — quando arriva un Check per `user:charlie viewer document:readme`, verifica se charlie è viewer della cartella, e lo trova tramite la tupla che lo assegna alla cartella.

Questa è la forma che OpenFGA costruisce internamente ogni volta che nel DSL scrivi `viewer from parent`. È anche la notazione che vedrai nelle risposte dell'API Expand e nei file di test `.fga.yaml`.

In sintesi, il campo `user` in una tupla può essere:

| Forma | Esempio | Significa |
|-------|---------|-----------|
| Identificatore diretto | `user:alice` | un singolo utente |
| Oggetto | `folder:progetto-x` | un oggetto come soggetto strutturale |
| Userset | `folder:progetto-x#viewer` | tutti gli utenti con quella relazione su quell'oggetto |

Le tuple vengono scritte tramite l'API Write e persistite in un database relazionale (PostgreSQL, MySQL). Ogni modifica è una transazione: puoi aggiungere e rimuovere tuple in modo atomico.

---

## Il DSL: tipi, relazioni, ereditarietà

Le tuple definiscono i dati: chi ha quale relazione con cosa. Il **modello di autorizzazione** definisce la struttura: quali tipi di oggetto esistono, quali relazioni sono valide, e come i permessi si propagano.

OpenFGA usa un DSL (Domain Specific Language) dichiarativo. Partiamo dal caso più semplice: un documento con tre livelli di accesso.

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

Questo modello dice:

- Esiste un tipo `user` (senza relazioni proprie -- è l'entità base)
- Esiste un tipo `document` con tre relazioni: `owner`, `editor`, `viewer`
- `owner` può essere assegnato direttamente a un `user`
- `editor` può essere assegnato direttamente a un `user`, **oppure** è chiunque sia `owner`
- `viewer` può essere assegnato direttamente a un `user`, **oppure** è chiunque sia `editor`

L'ereditarietà è dichiarativa e transitiva. Se Alice è owner, è automaticamente anche editor e viewer. Non servono tre tuple -- ne basta una. La clausola `or owner` nella definizione di `editor` e la clausola `or editor` nella definizione di `viewer` creano la catena: owner -> editor -> viewer.

### Aggiungere le cartelle

Ora rendiamo il modello più realistico aggiungendo le cartelle e la relazione `parent`:

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

La novità è `editor from parent`. Questa clausola dice: "è editor del documento chiunque sia editor della cartella parent". Se Bob è editor di `folder:progetto-x`, e `folder:progetto-x` è parent di `document:readme`, allora Bob è editor di `document:readme`.

La risoluzione avviene a runtime. Quando chiedi "Bob può editare document:readme?", OpenFGA:

1. Cerca tuple dirette: Bob è editor di document:readme? No.
2. Cerca via owner: Bob è owner di document:readme? No.
3. Cerca via parent: quale folder è parent di document:readme? folder:progetto-x. Bob è editor di folder:progetto-x? Sì. Risultato: **consentito**.

Questo è il modello completo usato in [VaultDrive](https://github.com/monte97/VaultDrive), il progetto demo che accompagna questa serie. Negli articoli successivi lo estenderemo con organizzazioni, team e multi-tenancy.

### Cosa non può fare il DSL

Il DSL di OpenFGA è volutamente limitato. Non supporta condizioni arbitrarie sugli attributi (per quello c'è ABAC), non fa pattern matching su stringhe, non valuta espressioni aritmetiche. Sa fare una cosa sola -- risolvere grafi di relazioni -- e la fa in modo molto efficiente.

---

## Le tre domande fondamentali

Una volta scritte le tuple e definito il modello, OpenFGA risponde a tre tipi di domanda. Ogni domanda corrisponde a un endpoint API.

### Check: "può questo utente fare questa cosa?"

La domanda più comune. Prende un utente, una relazione e un oggetto, e risponde con un booleano.

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

Risposta:

```json
{
  "allowed": true
}
```

Questo è l'equivalente del check OPA (`POST /v1/data/.../allow`), ma il modello di valutazione è completamente diverso. OPA esegue regole Rego; OpenFGA attraversa un grafo di relazioni.

### ListObjects: "quali risorse può vedere questo utente?"

Utile per popolare una UI: mostra all'utente solo i documenti a cui ha accesso.

```bash
curl -X POST http://localhost:8080/stores/$STORE_ID/list-objects \
  -H "Content-Type: application/json" \
  -d '{
    "user": "user:alice",
    "relation": "viewer",
    "type": "document"
  }'
```

Risposta:

```json
{
  "objects": [
    "document:readme",
    "document:design-doc",
    "document:meeting-notes"
  ]
}
```

ListObjects è l'operazione più costosa: deve esplorare tutte le tuple e risolvere le ereditarietà per ogni oggetto del tipo richiesto. In sistemi con milioni di documenti, va usata con attenzione (paginazione, caching, o pre-materializzazione).

### ListUsers: "chi ha accesso a questa risorsa?"

L'inverso di ListObjects. Utile per audit, compliance, o per mostrare la lista di collaboratori su un documento.

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

Risposta:

```json
{
  "users": [
    { "object": { "type": "user", "id": "alice" } },
    { "object": { "type": "user", "id": "bob" } }
  ]
}
```

Queste tre query coprono la maggior parte dei casi d'uso. Check per il gate di accesso nel middleware, ListObjects per filtrare le risorse nella UI, ListUsers per audit e condivisione.

---

## RBAC, ABAC, ReBAC: quando usare cosa

Zanzibar non rende RBAC obsoleto. Ogni modello ha il suo dominio naturale.

| Aspetto | RBAC | ABAC | ReBAC (Zanzibar) |
|---------|------|------|-------------------|
| **Concetto base** | Ruoli globali | Attributi e policy | Relazioni tra entità |
| **Esempio** | admin, viewer, editor | `if user.dept == "finance" and resource.classification < 3` | `alice` è `editor` di `document:readme` |
| **Scala con** | Pochi ruoli, risorse omogenee | Condizioni dinamiche, attributi variabili | Gerarchie, condivisione, ownership |
| **Punto debole** | Esplode con gerarchie e risorse granulari | Complessità delle policy (Rego/Cedar) | Overhead per casi semplici |
| **Tool tipico** | Keycloak roles, Spring Security | OPA/Rego, AWS Cedar | OpenFGA, SpiceDB, Authzed |
| **Quando usarlo** | App interne con 3-5 ruoli fissi | Regole basate su contesto (orario, IP, attributi utente) | Sistemi con risorse gerarchiche e condivisione |

In pratica, i modelli si combinano. Un sistema reale può usare Keycloak per l'autenticazione e i ruoli globali (admin/user), OPA per policy context-dependent (deny list, rate limiting), e OpenFGA per i permessi granulari sulle risorse (chi può vedere quale documento).

Nella prossima puntata di questa serie vedremo esattamente questa integrazione: Keycloak per il login, OpenFGA per l'autorizzazione fine-grained.

---

## Setup minimale con Docker Compose

Per sperimentare con OpenFGA serve poco: il server OpenFGA, un database PostgreSQL per le tuple, e opzionalmente il Playground web.

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

Il Compose ha tre servizi ma due immagini: `openfga-migrate` e `openfga` usano la stessa immagine con comandi diversi. `openfga-migrate` esegue `migrate` -- crea le tabelle su PostgreSQL -- e poi termina. Solo quando è uscito con successo (`service_completed_successfully`) Docker Compose avvia `openfga run`, il server vero. È il pattern standard per separare la migrazione del database dall'avvio dell'applicazione: evita di dover gestire "retry finché lo schema è pronto" dentro il server stesso.

Avvia tutto con `docker compose up -d`. Dopo qualche secondo, il Playground è disponibile su `http://localhost:3000` -- un'interfaccia web dove puoi scrivere il modello, aggiungere tuple e testare query senza scrivere curl.

### Primo store e primo modello

OpenFGA organizza i dati in **store**, contenitori isolati (simili ai realm di Keycloak). Crea il primo store:

```bash
curl -X POST http://localhost:8080/stores \
  -H "Content-Type: application/json" \
  -d '{ "name": "vaultdrive" }'
```

La risposta contiene l'`id` dello store. Esportalo come variabile:

```bash
export STORE_ID=<id-dalla-risposta>
```

Ora scrivi il modello di autorizzazione. Il body usa il formato JSON del DSL:

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

Il formato JSON è verboso -- in pratica si usa il DSL testuale tramite il [Playground](https://play.fga.dev/) o la [CLI `fga`](https://openfga.dev/docs/getting-started/cli). Ma sotto il cofano, il DSL viene compilato in questo JSON.

### Prima tupla e primo check

Scrivi una tupla: Alice è owner di document:readme.

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

Ora verifica: Alice può vedere document:readme? Ricorda che nel modello, `viewer` eredita da `editor`, che eredita da `owner`.

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

Alice è owner, quindi è anche editor e viewer. Una sola tupla, tre permessi risolti tramite il modello.

E Bob? Non ha nessuna tupla su document:readme.

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

Deny-by-default: se non esiste una tupla (diretta o ereditata), l'accesso è negato.

---

## Cosa viene dopo

Questo articolo ha trattato i fondamentali: il problema di RBAC con le gerarchie, il modello a tuple di Zanzibar, il DSL di OpenFGA, le tre query principali, e un setup funzionante per sperimentare.

Nel prossimo articolo della serie collegheremo OpenFGA a Keycloak: l'utente fa login con Keycloak (autenticazione), e i permessi granulari sulle risorse vengono gestiti da OpenFGA (autorizzazione). Useremo [VaultDrive](https://github.com/monte97/VaultDrive) come progetto di riferimento, un'applicazione di document sharing che mette in pratica tutto quello che abbiamo visto qui.

Il codice completo del setup minimale e del modello VaultDrive è disponibile nel [repository GitHub](https://github.com/monte97/VaultDrive).

### Risorse

**Paper originale:**
- [Zanzibar: Google's Consistent, Global Authorization System](https://research.google/pubs/pub48190/) — il paper Google (2019) da cui nasce il modello

**Repository demo:**
- [VaultDrive su GitHub](https://github.com/monte97/VaultDrive)

**Documentazione OpenFGA:**
- [Concetti fondamentali](https://openfga.dev/docs/concepts) — tuple, store, modelli di autorizzazione
- [Configuration Language (DSL)](https://openfga.dev/docs/configuration-language) — riferimento completo del DSL
- [Setup con Docker](https://openfga.dev/docs/getting-started/setup-openfga/docker)
- [OpenFGA CLI (`fga`)](https://openfga.dev/docs/getting-started/cli)
- [Playground interattivo](https://play.fga.dev/) — sperimenta modelli e query nel browser
- [OpenFGA su CNCF](https://www.cncf.io/projects/openfga/)

**Articoli correlati:**
- [Prossimo articolo: OpenFGA + Keycloak]({{< ref "/blog/verificare/openfga/02-openfga-keycloak/" >}})
- [Autorizzazione con OPA e Keycloak]({{< ref "/blog/progettare/keycloak/05-keycloak-opa/" >}})
