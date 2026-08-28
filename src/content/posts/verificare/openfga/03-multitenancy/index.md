---
title: "Multitenancy con OpenFGA: Isolamento Senza Moltiplicare la Complessità"
seoTitle: "OpenFGA multitenancy: isolamento nel grafo"
date: 2026-04-04T09:00:00.000Z
description: "Due strategie per multitenancy con OpenFGA: store-per-tenant e type-per-tenant. Come ottenere isolamento strutturale senza WHERE tenant_id ovunque."
pillar: verificare
category: openfga
tags:
  - OpenFGA
  - Multitenancy
  - Authorization
  - ReBAC
  - Zanzibar
lang: it
draft: false
reviewed: false
series: openfga
seriesOrder: 30
reproducibility: true
summary:
  - label: "Problema"
    value: "Con RBAC l'isolamento vive nel codice: basta un WHERE dimenticato per il data leak"
    note: "La correttezza dipende da ogni sviluppatore che applica il filtro ovunque"
  - label: "Scoperta"
    value: "Nel grafo l'isolamento è strutturale: senza cammini tra le relazioni non c'è accesso"
    note: "L'organizzazione è la radice del grafo e ogni risorsa le resta collegata dalla relazione org"
  - label: "Scelta"
    value: "Type-per-tenant per la maggior parte dei casi, store-per-tenant per la compliance"
    note: "Compliance, modelli diversi o milioni di tuple sono i motivi per store dedicati"
  - label: "Risultato"
    value: "Stesso modello, regole diverse per tenant: cambiano le tuple, non il codice"
    note: "I team di prodotto possono differenziare i piani senza coinvolgere gli sviluppatori"
openItems:
  - "Con store separati non esiste un punto unico da interrogare per le query cross-tenant, e ogni aggiornamento del modello va applicato su tutti gli store"
  - "Alcuni regolamenti, come quelli su sanità e finanza, richiedono l'isolamento fisico dei dati: in quel caso l'isolamento logico del type-per-tenant non basta"
  - "Passare successivamente a store dedicati è incrementale, ma richiede un layer di routing che mappa ogni tenant sul suo store"
openNote: "Quando il modello unico smette di bastare, e cosa costa spostarsi su store dedicati."
mode: explanation
figures:
  - kind: flow
    at: isolamento-strutturale-non-applicativo
    label: "Il cammino che charlie percorre, e quello che non esiste"
    caption: "`doc-acme` non compare nel risultato perché non è mai stato raggiunto, non perché è stato scartato"
    nodes:
      - kind: "Domanda"
        name: "`ListObjects` per `user:charlie`, relazione viewer"
        desc: "Il codice applicativo non passa nessun tenant. Chiede quali documenti l'utente può vedere, e basta."
        edge: "OpenFGA parte dall'utente, non dai documenti"
      - kind: "Primo tratto"
        name: "`user:charlie` è admin di `org:org-beta`"
        desc: "La tupla esiste. E nel modello `member` include `admin`, quindi charlie è anche member dell'organizzazione."
        edge: "`member from org` sulla relazione viewer"
      - kind: "Secondo tratto"
        name: "`document:doc-beta` ha `org:org-beta` come org"
        desc: "La risorsa è ancorata all'organizzazione da una relazione nel grafo, non da una colonna in tabella."
        edge: "il cammino si chiude"
      - kind: "Risposta"
        name: "`[\"document:doc-beta\"]`"
        desc: "Fra charlie e `doc-acme` non esiste nessun cammino: la risoluzione si ferma prima, e quel documento non entra mai nella lista da filtrare."
        key: true
---

Ogni applicazione SaaS, prima o poi, arriva allo stesso punto: il primo cliente funziona, il secondo pure, ma al terzo emerge che l'isolamento tra tenant non è un dettaglio. È l'architettura stessa. Con RBAC tradizionale, la soluzione tipica è un `WHERE tenant_id = ?` in ogni query, un middleware che inietta il contesto del tenant, e il rischio costante che un bug faccia trapelare dati da un'organizzazione all'altra. Con ReBAC il problema si affronta diversamente: l'isolamento non è applicativo, ma **strutturale**. Se un utente non ha relazioni con un'organizzazione, non può accedere a nulla al suo interno. Nessun `WHERE` necessario.

Le due strategie per gestire il multitenancy con OpenFGA partono dai concetti introdotti nel [primo articolo](/blog/verificare/openfga/01-zanzibar-concetti/) della serie.

---

## Il problema multi-tenant con l'autorizzazione classica

In un sistema RBAC tradizionale, i ruoli sono globali. Un utente ha il ruolo `editor`, punto. Per farlo funzionare in un contesto multi-tenant, è necessario aggiungere il contesto del tenant ovunque:

```sql
SELECT * FROM documents
WHERE tenant_id = :current_tenant
AND has_permission(:user_id, 'read', 'document')
```

Il codice applicativo diventa responsabile dell'isolamento. Ogni endpoint, ogni query, ogni servizio deve sapere in quale tenant sta operando e filtrare di conseguenza. Basta dimenticare un `WHERE` in una query, un filtro in un endpoint, e si ha un data leak cross-tenant.

Il problema non è tecnico in senso stretto: il pattern funziona. Il problema è che l'isolamento vive nel codice applicativo, distribuito su decine di file, e la correttezza dipende da ogni singolo sviluppatore che lo applichi ovunque.

Con ReBAC, l'isolamento è diverso. Non filtri i risultati dopo averli recuperati: chiedi direttamente "quali documenti può vedere alice?" e il grafo delle relazioni restituisce solo quelli raggiungibili tramite le sue relazioni. Se alice non ha relazioni con `org-beta`, nessun documento di `org-beta` comparirà mai nei risultati. L'isolamento non è un filtro, è una proprietà del grafo.

---

## Due strategie: store-per-tenant vs type-per-tenant

OpenFGA offre due approcci architetturali per il multitenancy. La scelta dipende dai requisiti di isolamento, compliance e complessità operativa.

### Store-per-tenant

Ogni organizzazione ha il proprio store OpenFGA. Isolamento fisico completo: le tuple di un tenant non condividono nemmeno lo storage con quelle di un altro.

```text
Store: org-acme     --> modello + tuple di Acme
Store: org-beta     --> modello + tuple di Beta
Store: org-gamma    --> modello + tuple di Gamma
```

**Quando ha senso:**

- **Compliance stringente**: regolamenti che richiedono isolamento fisico dei dati di autorizzazione tra tenant
- **Modelli diversi per tenant**: un cliente enterprise ha bisogno di gerarchie complesse, un cliente small di ruoli semplici
- **Limiti di scala**: distribuire il carico su store separati

**I contro:**

- **Gestione operativa**: N store da gestire, ognuno con il proprio lifecycle
- **Migrazione modello**: ogni aggiornamento al modello di autorizzazione richiede di applicare la migrazione su tutti gli store
- **Nessuna query cross-tenant**: per sapere "in quali organizzazioni alice ha accesso?", non c'è un singolo punto da interrogare
- **Routing**: il codice applicativo deve sapere quale store interrogare per ogni richiesta, aggiungendo complessità al middleware

### Type-per-tenant

Unico store, con l'organizzazione come radice del grafo di relazioni. L'isolamento è logico, non fisico: le tuple di tutti i tenant vivono nello stesso store, ma la struttura del grafo garantisce che ogni tenant veda solo ciò che gli appartiene.

```text
Store: unico
  org:org-acme  --> tuple di Acme (collegate tramite relazioni)
  org:org-beta  --> tuple di Beta (collegate tramite relazioni)
```

**Quando ha senso:**

- **La maggior parte dei casi SaaS**: un unico modello, tuple diverse per tenant
- **Query cross-tenant**: un utente può appartenere a più organizzazioni
- **Semplicità operativa**: un solo store da gestire, un solo modello da migrare

Per il resto dell'articolo, ci concentriamo su questa seconda strategia: è quella che copre la maggior parte dei casi reali e quella usata in [VaultDrive](https://github.com/monte97/VaultDrive), la demo che ho costruito per questa serie con setup containerizzato e codice riproducibile.

---

## Org come radice del grafo

L'idea è semplice: ogni risorsa del sistema ha una relazione che la ancora a un'organizzazione. L'organizzazione diventa la radice del sotto-grafo che contiene tutto ciò che le appartiene: utenti, cartelle, documenti.

Ecco il modello DSL:

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

I punti chiave del modello:

- **`org` come relazione**: ogni `folder` e ogni `document` ha una relazione `org` che la collega alla sua organizzazione. Non è un attributo, è una relazione nel grafo.
- **Ereditarietà dal org**: `member from org` significa "chi è member dell'organizzazione collegata a questa risorsa". L'admin di `org-acme` è automaticamente editor di tutti i documenti che hanno `org:org-acme` come organizzazione.
- **Ereditarietà dalla cartella**: `can_view from parent` consente di ereditare i permessi dalla cartella genitore, come visto negli articoli precedenti.

---

## Le tuple concrete

Supponiamo di avere due organizzazioni con i rispettivi utenti e risorse:

```text
// Org Acme: alice è admin, bob è member
org:org-acme#admin@user:alice
org:org-acme#member@user:bob

// Org Beta: charlie è admin, diana è member
org:org-beta#admin@user:charlie
org:org-beta#member@user:diana

// Risorse Acme
folder:folder-acme#org@org:org-acme
document:doc-acme#org@org:org-acme
document:doc-acme#parent@folder:folder-acme

// Risorse Beta
folder:folder-beta#org@org:org-beta
document:doc-beta#org@org:org-beta
document:doc-beta#parent@folder:folder-beta
```

Con queste tuple, la situazione è chiara:

- **alice** (admin di org-acme) può editare `doc-acme` grazie alla regola `admin from org`. OpenFGA segue il cammino: `user:alice` -> `org:org-acme#admin` -> `document:doc-acme` ha `org:org-acme` come org -> la regola `admin from org` sulla relazione `editor` si risolve positivamente
- **charlie** (admin di org-beta) può editare `doc-beta` per lo stesso motivo, attraverso `org:org-beta`
- **alice non può fare nulla con doc-beta**: non ha relazioni con `org-beta`, quindi non esiste nessun cammino nel grafo che colleghi `user:alice` a `document:doc-beta`. Ogni tentativo di risoluzione si ferma: `admin from org` cerca un admin dell'organizzazione collegata a `doc-beta`, che è `org-beta`, e alice non è admin di `org-beta`
- **charlie non può fare nulla con doc-acme**: stessa logica, direzione opposta

Non serve nessun filtro applicativo. La struttura del grafo *è* il filtro.

---

## Isolamento strutturale, non applicativo

Questo è il punto centrale. Con ReBAC e il pattern type-per-tenant, l'isolamento non è responsabilità del codice applicativo. È una proprietà del grafo delle relazioni.

Quando charlie (admin di org-beta) chiama l'API `ListObjects` per ottenere i documenti che può vedere, OpenFGA attraversa il grafo partendo da `user:charlie`, segue le relazioni, e restituisce solo i documenti raggiungibili. `doc-acme` non è raggiungibile da charlie perché non esiste nessun cammino nel grafo che li colleghi.

```python
# Il codice applicativo non filtra per tenant.
# Chiede e riceve solo ciò che l'utente può vedere.
response = fga_client.list_objects(
    ListObjectsRequest(
        user="user:charlie",
        relation="viewer",
        type="document"
    )
)
# response.objects == ["document:doc-beta"]
```

Confronta con l'equivalente RBAC:

```python
# Con RBAC, devi filtrare esplicitamente
documents = db.query(
    "SELECT * FROM documents WHERE tenant_id = :tenant AND ...",
    tenant=current_tenant
)
```

La differenza non è solo estetica. Nel secondo caso, dimenticare il filtro `tenant_id` in un endpoint produce un data leak. Nel primo, il filtro non esiste nel codice perché non serve: l'isolamento è nel dato, non nella logica.

Questo semplifica anche i test. Con RBAC occorre testare che ogni endpoint applichi correttamente il filtro `tenant_id` - e sono test negativi, i più facili da dimenticare. Con ReBAC, l'isolamento è verificato una volta nel modello e vale per tutti gli endpoint. I test nel file `.fga.yaml` coprono il modello; il codice applicativo non ha logica di isolamento da testare.

---

## Override per-tenant: stesso modello, regole diverse

Un vantaggio poco ovvio del pattern type-per-tenant è che puoi avere politiche diverse per organizzazione senza scrivere codice diverso. Il modello è lo stesso per tutti; cambiano le tuple.

Esempio concreto. Org-acme vuole una politica aperta: tutti i membri possono vedere tutti i documenti dell'organizzazione. Org-beta è più restrittiva: l'accesso è concesso solo per cartella.

Per org-acme non serve fare nulla di speciale: la regola `member from org` nel modello garantisce già che tutti i member vedano tutti i documenti collegati all'organizzazione.

Per org-beta, basta non scrivere la tupla che collega il documento direttamente all'organizzazione per la relazione `viewer`, e gestire l'accesso tramite le cartelle:

```text
// Org Beta: accesso per cartella, non globale
folder:folder-beta-hr#org@org:org-beta
folder:folder-beta-hr#viewer@user:diana

document:doc-beta-hr-1#parent@folder:folder-beta-hr
document:doc-beta-hr-1#org@org:org-beta
```

Diana può vedere `doc-beta-hr-1` perché è viewer della cartella `folder-beta-hr`. Ma se org-beta crea un'altra cartella `folder-beta-finance` senza dare accesso a diana, lei non vedrà nulla al suo interno.

Il codice applicativo non cambia. La stessa API `Check` e la stessa `ListObjects` funzionano per entrambe le organizzazioni. La differenza è tutta nelle tuple.

Questo è potente per i team di prodotto: possono offrire piani con livelli di accesso diversi senza coinvolgere gli sviluppatori. Il piano "Enterprise" dà accesso granulare per cartella; il piano "Team" dà accesso a tutto nell'organizzazione. Stessa codebase, tuple diverse nel provisioning del tenant.

---

## Utenti cross-tenant

Nel mondo reale, gli utenti non appartengono a un singolo tenant. Un consulente esterno può collaborare con più organizzazioni. Un auditor può avere accesso in sola lettura a documenti di clienti diversi.

Con ReBAC, gestire utenti cross-tenant è naturale. Le tuple sono indipendenti: puoi scrivere relazioni per lo stesso utente in organizzazioni diverse senza conflitti.

```text
// Eve è member di org-acme
org:org-acme#member@user:eve

// Eve è anche viewer di un documento specifico in org-beta
document:doc-beta-public#viewer@user:eve
```

Eve può vedere tutti i documenti di org-acme (grazie alla regola `member from org`) e può vedere `doc-beta-public` in org-beta (grazie alla tupla diretta). Non può vedere altri documenti di org-beta: la tupla è specifica per quel documento.

Nessun conflitto, nessuna ambiguità. Il grafo è additivo: ogni tupla aggiunge un cammino, non modifica quelli esistenti. Non c'è il rischio che dare accesso a eve in org-beta le dia accesso a cose in org-acme o viceversa.

Questo scenario è comune anche con gli account di servizio. Un sistema di notifiche potrebbe aver bisogno di leggere documenti in tutte le organizzazioni per inviare digest settimanali. Basta aggiungere l'utente di servizio come member di ogni organizzazione, oppure dare accesso granulare solo ai documenti rilevanti. Il modello non cambia: cambia solo quali tuple scrivi.

Con RBAC tradizionale, gestire utenti cross-tenant richiede logica applicativa complessa: tabelle di join tra utenti e tenant, middleware che gestisce il contesto multiplo, e endpoint che accettano il tenant come parametro esplicito. Con ReBAC, è una tupla.

---

## Test come prova dell'isolamento

Con OpenFGA puoi scrivere test dichiarativi in formato `.fga.yaml` che verificano l'isolamento tra tenant. Non è un test di integrazione pesante: è una specifica leggibile che documenta e verifica le garanzie del modello.

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

  # Cross-tenant: eve in entrambe le org
  - user: user:eve
    relation: member
    object: org:org-acme
  - user: user:eve
    relation: viewer
    object: document:doc-beta

tests:
  - name: Alice (admin org-acme) accede solo a risorse Acme
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

  - name: Charlie (admin org-beta) accede solo a risorse Beta
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

  - name: Bob (member org-acme) vede Acme, non Beta
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

  - name: Eve (cross-tenant) vede Acme e solo doc-beta-public
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

Ogni sezione `check` verifica un aspetto preciso dell'isolamento:

- alice vede e modifica i documenti di org-acme, **non** quelli di org-beta
- charlie vede e modifica i documenti di org-beta, **non** quelli di org-acme
- bob, membro semplice di org-acme, vede i documenti ma non può modificarli
- eve, utente cross-tenant, vede i documenti di org-acme (è member) e il singolo documento di org-beta su cui ha una tupla diretta, ma non può accedere alle cartelle di org-beta

Questi test si eseguono con [`openfga model test`](https://openfga.dev/docs/getting-started/testing/modeled-access) (`--tests model.fga.yaml`) e falliscono immediatamente se qualcosa nel modello rompe l'isolamento. Sono la rete di sicurezza che ti permette di evolvere il modello senza paura di introdurre leak cross-tenant.

---

## Quando riconsiderare: store-per-tenant

Il pattern type-per-tenant copre la maggior parte dei casi SaaS, ma ci sono situazioni in cui store-per-tenant è la scelta giusta:

- **Compliance normativa**: alcuni regolamenti (sanità, finanza) richiedono isolamento fisico dei dati, non solo logico. Se un cliente enterprise richiede la garanzia che le sue tuple di autorizzazione non condividano lo storage con quelle di altri, store-per-tenant è l'unica opzione.
- **Modelli diversi per tenant**: se un cliente ha bisogno di un modello di autorizzazione significativamente diverso dagli altri (gerarchie custom, tipi di risorsa specifici), un singolo store con un singolo modello non basta.
- **Limiti di scala**: con milioni di tuple, partizionare per store può migliorare le performance delle query. OpenFGA scala bene, ma la distribuzione del carico su store separati rimane un'opzione.

La buona notizia è che la migrazione da type-per-tenant a store-per-tenant è incrementale. Il modello DSL è lo stesso; cambiano solo il deployment e il routing delle richieste. Puoi partire con un singolo store e migrare i tenant che lo richiedono su store dedicati quando serve.

Un approccio ibrido è praticabile: la maggior parte dei tenant condivide un singolo store, mentre quelli con requisiti speciali hanno store dedicati. Il codice applicativo ha bisogno solo di un layer di routing che mappa `tenant_id` -> `store_id`, e il resto funziona allo stesso modo.

---

## Riepilogo

| Aspetto | Store-per-tenant | Type-per-tenant |
|---------|-----------------|-----------------|
| Isolamento | Fisico | Logico (strutturale) |
| Complessità operativa | Alta (N store) | Bassa (1 store) |
| Modelli diversi per tenant | Supportato | Non supportato |
| Query cross-tenant | Non possibili | Naturali |
| Compliance stringente | Adatto | Da valutare |
| Caso d'uso tipico | Enterprise regulated | SaaS standard |

Il multitenancy con OpenFGA non richiede middleware dedicati, filtri distribuiti nel codice, o la speranza che nessuno dimentichi un `WHERE`. Con il pattern type-per-tenant, l'organizzazione diventa la radice del grafo e l'isolamento è una conseguenza della struttura, non di un filtro applicativo.

Nel prossimo articolo della serie vedremo come gestire gerarchie profonde e query complesse con OpenFGA, affrontando i pattern per navigare grafi di relazioni articolati senza sacrificare le performance.

### Risorse

**Repository demo:**
- [VaultDrive su GitHub](https://github.com/monte97/VaultDrive)

**Documentazione OpenFGA:**
- [OpenFGA - Multitenancy](https://openfga.dev/docs/modeling/advanced/multi-tenancy)
- [OpenFGA - Concetto di Store](https://openfga.dev/docs/concepts#what-is-a-store)
- [OpenFGA - Model Testing (`fga model test`)](https://openfga.dev/docs/getting-started/testing/modeled-access)
- [OpenFGA - Configuration Language (DSL)](https://openfga.dev/docs/configuration-language)

**Articoli correlati:**
- [Articolo precedente: Zanzibar e i concetti fondamentali](/blog/verificare/openfga/01-zanzibar-concetti/)
- [OpenFGA + Keycloak](/blog/verificare/openfga/02-openfga-keycloak/)
- [Prossimo articolo: Gerarchie profonde e query inverse](/blog/verificare/openfga/04-gerarchie-query/)
