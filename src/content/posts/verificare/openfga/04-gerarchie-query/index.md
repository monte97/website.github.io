---
title: "Gerarchie Profonde, Query Inverse e il Problema WHERE"
date: 2026-04-18T09:00:00.000Z
description: "Come gestire gerarchie a N livelli in OpenFGA, ottimizzare ListObjects con fast/slow path, e implementare Dynamic Data Masking come pattern complementare."
pillar: verificare
category: openfga
tags:
  - OpenFGA
  - Authorization
  - ReBAC
  - Data Masking
  - Performance
lang: it
draft: false
reviewed: false
series: openfga
seriesOrder: 40
reproducibility: true
summary:
  - label: "Scoperta"
    value: "`viewer from parent` risolve N livelli di nesting senza codice applicativo"
    note: "La gerarchia sta nelle tuple, la logica di risoluzione sta nel DSL"
  - label: "Problema"
    value: "Con migliaia di documenti la query IN (...) di ListObjects diventa un problema"
    note: "Cresce la latenza sia sul database sia nella risoluzione del grafo"
  - label: "Scelta"
    value: "Fast path SQL per l'accesso organizzativo, ListObjects per le condivisioni dirette"
    note: "Uniti con una UNION, la colonna access_source dice perché un documento compare"
  - label: "Fuori scope"
    value: "La visibilità a livello di campo non è ReBAC: è ABAC puro"
    note: "Dynamic Data Masking separa l'accesso alla risorsa dalla visibilità dei campi"
openItems:
  - "Il fast path presuppone che le relazioni gerarchiche di OpenFGA rispecchino relazioni già presenti nel database applicativo"
  - "L'80/20 tra fast e slow path non è fisso: con molte condivisioni peer-to-peer il peso torna su ListObjects"
  - "Determinare la relazione massima per la mascheratura costa fino a tre Check in sequenza: parallelizzarli o metterli in cache è una scelta implementativa aperta"
openNote: "Dove finisce ReBAC e inizia il lavoro del layer applicativo."
mode: how-to
caseStudy:
  slug: "il-permesso-che-non-sapeva-pronunciare"
  hook: >
    Le gerarchie profonde viste dal lato di chi le ha introdotte in un sistema già vivo.
---

Nei primi tre articoli della serie abbiamo costruito un modello di autorizzazione completo: tipi, relazioni, store per tenant, integrazione con Keycloak. Ma finora gli esempi avevano al massimo due livelli di nesting: organizzazione e documento, oppure organizzazione e folder. Il mondo reale è diverso. Una folder contiene subfolder, che contengono altre subfolder, che contengono documenti. Un utente condivide una cartella e si aspetta che tutto il contenuto sotto diventi accessibile. E quando devi mostrare una lista di documenti, non puoi fare un Check per ciascuno.

Tre problemi emergono quando il modello cresce: gerarchie a N livelli, il costo delle query inverse (ListObjects), e il confine tra ciò che OpenFGA può fare e ciò che va gestito altrove.

---

## Gerarchie a N Livelli

Nel [primo articolo]({{< ref "/posts/openfga/01-zanzibar-concetti" >}}) abbiamo definito la relazione `parent` tra folder e documento. Nel [articolo sul multitenancy]({{< ref "/posts/openfga/03-multitenancy" >}}) abbiamo aggiunto l'organizzazione come radice del grafo. Ma cosa succede quando le folder sono annidate?

Il DSL di OpenFGA gestisce la ricorsione in modo naturale. Una folder può avere come parent un'altra folder:

```dsl
type folder
  relations
    define org: [org]
    define owner: [user]
    define editor: [user] or owner or admin from org
    define viewer: [user] or editor or member from org
    define parent: [folder]
    define can_edit: editor or can_edit from parent
    define can_view: viewer or can_view from parent
```

La riga chiave è `viewer from parent`. Significa: un utente è viewer di questa folder se è viewer diretto, oppure se è viewer del parent. E il parent può essere un'altra folder, che a sua volta ha un parent. La risoluzione è ricorsiva: OpenFGA risale il grafo finché non trova una corrispondenza o raggiunge la radice.

Per un documento, la catena funziona allo stesso modo:

```dsl
type document
  relations
    define org: [org]
    define owner: [user]
    define editor: [user] or owner
    define viewer: [user] or editor
    define parent: [folder]
    define can_edit: editor or can_edit from parent
    define can_view: viewer or can_view from parent
```

### Esempio: tre livelli di nesting

La struttura in [VaultDrive](https://github.com/monte97/VaultDrive), la demo costruita per questa serie con setup containerizzato e codice riproducibile:

```text
org-acme/
  projects/           (folder)
    backend/           (folder)
      api-spec.pdf     (document)
```

Le tuple che descrivono la gerarchia:

```json
[
  {"user": "org:org-acme",      "relation": "org",    "object": "folder:projects"},
  {"user": "folder:projects",  "relation": "parent", "object": "folder:backend"},
  {"user": "folder:backend",   "relation": "parent", "object": "document:api-spec"},
  {"user": "user:alice",       "relation": "member", "object": "org:org-acme"}
]
```

Alice è member dell'organizzazione. Quando OpenFGA riceve un Check per `user:alice` su `document:api-spec` con relazione `can_view`, la risoluzione procede così:

1. Alice è viewer diretto di `document:api-spec`? No.
2. Chi è il parent di `document:api-spec`? `folder:backend`.
3. Alice può fare can_view su `folder:backend`? Non direttamente. Chi è il parent? `folder:projects`.
4. Alice può fare can_view su `folder:projects`? Alice è member di `org:org-acme`, che è la org di `folder:projects`, quindi è viewer.
5. Risultato: viewer si propaga via can_view from parent lungo la catena.

Risultato: `allowed: true`. Tre livelli di nesting risolti senza una riga di codice applicativo. Non c'è una query ricorsiva nel tuo database, non c'è una CTE che risale l'albero. La gerarchia è nei dati (tuple), la logica di risoluzione è nel modello (DSL).

---

## Permessi Come Dati, Non Come Codice

In un sistema RBAC tradizionale, le regole di accesso sono codice. Un middleware Express controlla `if (user.role === 'admin')`. Un decorator Python verifica `@requires_permission('documents.edit')`. Queste regole vivono nel codice sorgente: per modificarle serve un commit, una review, un deploy.

In ReBAC, le regole sono tuple nel database di OpenFGA. Aggiungere un permesso significa scrivere una tupla. Rimuoverlo significa cancellarla. Non serve un deploy, non serve un restart, non serve toccare il codice.

In VaultDrive, condividere una cartella con un utente è un endpoint REST che scrive una tupla:

```javascript
// POST /api/folders/:folderId/share
app.post('/api/folders/:folderId/share', requireAuth, async (req, res) => {
  const { userId, relation } = req.body; // relation: "viewer" | "editor"
  const { folderId } = req.params;

  // Verifica che chi condivide sia owner o editor della folder
  const { allowed } = await fgaClient.check({
    user: `user:${req.user.sub}`,
    relation: 'editor',
    object: `folder:${folderId}`,
  });

  if (!allowed) {
    return res.status(403).json({ error: 'Non hai i permessi per condividere questa cartella' });
  }

  // Scrivi la tupla: l'utente diventa viewer/editor della folder
  await fgaClient.write({
    writes: [
      { user: `user:${userId}`, relation, object: `folder:${folderId}` },
    ],
  });

  res.json({ message: 'Cartella condivisa' });
});
```

Dopo questa chiamata, l'utente ha accesso immediato alla folder e a tutto il contenuto sotto, grazie alla risoluzione ricorsiva vista nella sezione precedente. Nessun job in background, nessuna propagazione asincrona: la tupla è scritta, il Check funziona.

Revocare l'accesso è altrettanto diretto:

```javascript
// DELETE /api/folders/:folderId/share
app.delete('/api/folders/:folderId/share', requireAuth, async (req, res) => {
  const { userId, relation } = req.body;
  const { folderId } = req.params;

  await fgaClient.write({
    deletes: [
      { user: `user:${userId}`, relation, object: `folder:${folderId}` },
    ],
  });

  res.json({ message: 'Accesso revocato' });
});
```

Questo è il vantaggio operativo di ReBAC: i permessi sono una risorsa CRUD come qualsiasi altra. Li crei, li leggi, li aggiorni, li cancelli. Il modello di autorizzazione (il DSL) cambia raramente. Le tuple cambiano continuamente.

---

## Contextual Tuples

A volte serve simulare un permesso senza persisterlo. Il caso d'uso più comune: un admin vuole vedere come un documento appare a un viewer, senza assegnare davvero il ruolo.

OpenFGA supporta le **contextual tuples**: relazioni temporanee che esistono solo per la durata di un singolo Check. Non vengono scritte nel database.

```javascript
// GET /api/documents/:docId/preview-as
// Query: ?targetUserId=bob&targetRelation=viewer
app.get('/api/documents/:docId/preview-as', requireAuth, async (req, res) => {
  const { docId } = req.params;
  const { targetUserId, targetRelation } = req.query;

  // Solo owner può usare preview-as
  const { allowed: isOwner } = await fgaClient.check({
    user: `user:${req.user.sub}`,
    relation: 'owner',
    object: `document:${docId}`,
  });

  if (!isOwner) {
    return res.status(403).json({ error: 'Solo il proprietario può simulare accessi' });
  }

  // Check con contextual tuple: simula che targetUserId sia viewer
  const { allowed } = await fgaClient.check({
    user: `user:${targetUserId}`,
    relation: 'can_view',
    object: `document:${docId}`,
    contextualTuples: [
      {
        user: `user:${targetUserId}`,
        relation: targetRelation,
        object: `document:${docId}`,
      },
    ],
  });

  res.json({
    simulatedUser: targetUserId,
    simulatedRelation: targetRelation,
    canView: allowed,
  });
});
```

La contextual tuple `{ user: "user:bob", relation: "viewer", object: "document:api-spec" }` viene considerata durante la risoluzione del Check come se fosse una tupla reale, ma scompare subito dopo. Utile per debug, per interfacce di amministrazione, per preview di condivisione.

Un altro caso d'uso pratico: accesso temporaneo basato su condizioni esterne. Un utente ottiene `editor` su un documento solo durante un orario specifico. L'applicazione verifica l'orario e, se la condizione è soddisfatta, passa la contextual tuple nel Check. La logica temporale resta nel codice applicativo, la decisione di autorizzazione resta in OpenFGA.

---

## ListObjects e il Problema WHERE

Fin qui abbiamo usato l'API **Check**: dato un utente e una risorsa, dimmi se ha accesso. Ma quando occorre mostrare una lista - la pagina "I miei documenti", la sidebar con le cartelle - il problema si inverte: non c'è una risorsa specifica, bisogna sapere *quali* risorse l'utente può vedere.

OpenFGA offre l'API **ListObjects**: dato un utente e un tipo, restituisce tutti gli oggetti su cui l'utente ha una certa relazione.

```javascript
const response = await fgaClient.listObjects({
  user: 'user:alice',
  relation: 'viewer',
  type: 'document',
});
// response.objects = ["document:api-spec", "document:readme", "document:notes"]
```

Il risultato è una lista di ID. L'applicazione ha però bisogno dei dati completi: titolo, contenuto, data di creazione. Dopo ListObjects occorre quindi fare una query al database:

```sql
SELECT * FROM documents WHERE id IN ('api-spec', 'readme', 'notes');
```

Con tre documenti funziona. Con trecento funziona ancora. Ma con tremila la query `IN (...)` diventa un problema: la lista di ID da passare è enorme, il database deve fare un index scan per ciascuno, e la latenza di ListObjects stessa cresce perché OpenFGA deve risolvere il grafo per ogni oggetto del tipo richiesto.

Questo è il "problema WHERE": il costo di tradurre una lista di ID autorizzati in una query SQL efficiente.

---

## Fast Path: Derivare l'Accesso dal Database

La soluzione non è ottimizzare la query `IN (...)`. È evitarla quando possibile.

Se le relazioni gerarchiche di OpenFGA rispecchiano relazioni già presenti nel database applicativo, puoi derivare l'accesso con un JOIN SQL senza chiamare OpenFGA.

In VaultDrive, il database ha questa struttura:

```sql
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  org_id TEXT REFERENCES organizations(id),
  parent_folder_id TEXT REFERENCES folders(id)
);

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  folder_id TEXT REFERENCES folders(id),
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE org_members (
  org_id TEXT REFERENCES organizations(id),
  user_id TEXT NOT NULL,
  role TEXT NOT NULL, -- 'member', 'admin'
  PRIMARY KEY (org_id, user_id)
);
```

Un membro di `org-acme` può vedere tutti i documenti la cui folder appartiene a `org-acme`. Questa informazione è già nel database relazionale: non serve chiedere a OpenFGA.

```sql
-- Fast path: tutti i documenti accessibili tramite membership organizzazione
SELECT d.*
FROM documents d
JOIN folders f ON d.folder_id = f.id
JOIN org_members om ON f.org_id = om.org_id
WHERE om.user_id = 'alice';
```

Un JOIN, nessuna chiamata HTTP a OpenFGA, nessuna lista di ID. Questo è il **fast path**: il caso comune in cui l'accesso deriva dalla struttura organizzativa già presente nel database.

---

## Fast Path e Slow Path Combinati

Il fast path copre la maggior parte dei casi: se sei membro di un'organizzazione, vedi i documenti di quell'organizzazione. Ma non copre le condivisioni dirette. Se Bob ha ricevuto `viewer` su un singolo documento tramite una condivisione esplicita (la tupla `user:bob viewer document:budget`), il JOIN sull'organizzazione non lo trova.

Per questi casi serve lo **slow path**: chiama ListObjects, poi usa `WHERE IN`. La strategia è combinarli con una UNION.

```javascript
async function listAccessibleDocuments(userId) {
  // --- Fast path: documenti accessibili via organizzazione ---
  const fastPathQuery = `
    SELECT d.id, d.title, d.content, d.created_at, 'org' AS access_source
    FROM documents d
    JOIN folders f ON d.folder_id = f.id
    JOIN org_members om ON f.org_id = om.org_id
    WHERE om.user_id = $1
  `;

  // --- Slow path: documenti condivisi direttamente ---
  const listResponse = await fgaClient.listObjects({
    user: `user:${userId}`,
    relation: 'viewer',
    type: 'document',
  });

  // Estrai gli ID dal formato "document:xxx"
  const directIds = listResponse.objects
    .map(obj => obj.replace('document:', ''))
    .filter(id => id.length > 0);

  let slowPathQuery = '';
  let params = [userId];

  if (directIds.length > 0) {
    // Escludi dal slow path i documenti già coperti dal fast path
    slowPathQuery = `
      UNION
      SELECT d.id, d.title, d.content, d.created_at, 'direct' AS access_source
      FROM documents d
      WHERE d.id = ANY($2)
      AND d.id NOT IN (
        SELECT d2.id FROM documents d2
        JOIN folders f ON d2.folder_id = f.id
        JOIN org_members om ON f.org_id = om.org_id
        WHERE om.user_id = $1
      )
    `;
    params.push(directIds);
  }

  const query = `${fastPathQuery} ${slowPathQuery} ORDER BY created_at DESC`;
  const result = await pool.query(query, params);

  return result.rows;
}
```

Il fast path gestisce l'80% dei casi senza toccare OpenFGA. Lo slow path copre il restante 20% -- le condivisioni dirette, gli accessi concessi a singoli utenti o team su risorse specifiche. La colonna `access_source` è utile per debug: permette di capire perché un utente vede un certo documento.

In produzione, il rapporto dipende dal tipo di applicazione. Un sistema dove la maggior parte degli accessi deriva dall'appartenenza organizzativa avrà un fast path che copre il 95%. Un sistema con molte condivisioni peer-to-peer (stile Google Docs) avrà uno slow path più pesante.

---

## Cosa NON Mettere in OpenFGA

ReBAC modella relazioni tra utenti e risorse. Ma non tutto è una relazione.

Un esempio: "l'utente può vedere il campo `internal_notes` di un documento". Sembra una questione di autorizzazione, e lo è. Ma non è una relazione tra un utente e una risorsa. È una proprietà dell'utente (il suo livello di accesso) combinata con una proprietà del campo (la sua classificazione). È ABAC puro.

Creare un tipo OpenFGA per ogni campo di ogni risorsa è un errore di modellazione:

```dsl
// NON fare questo
type document_field
  relations
    define viewer: [user]

// Tuple risultanti:
// user:alice viewer document_field:budget.title
// user:alice viewer document_field:budget.content
// user:alice viewer document_field:budget.created_at
// ...per ogni campo, per ogni documento, per ogni utente
```

Il numero di tuple esplode. Il modello diventa ingestibile. E il problema fondamentale resta: la decisione "quali campi mostrare" dipende dal livello di accesso, non dalla relazione con il singolo campo.

La soluzione è un pattern complementare: **Dynamic Data Masking**.

---

## Dynamic Data Masking

L'idea è semplice: OpenFGA decide *se* l'utente può accedere alla risorsa. Un layer applicativo decide *cosa* dell'utente può vedere, in base alla relazione che ha con quella risorsa.

### Classificazione dei Campi

Ogni campo di un documento ha un livello di visibilità. In VaultDrive, la classificazione è in una tabella dedicata:

```sql
CREATE TABLE field_classifications (
  resource_type TEXT NOT NULL,  -- 'document', 'folder'
  field_name TEXT NOT NULL,
  min_relation TEXT NOT NULL,   -- 'can_view', 'can_edit', 'owner'
  PRIMARY KEY (resource_type, field_name)
);

-- Classificazione campi documento
INSERT INTO field_classifications VALUES
  ('document', 'id',               'can_view'),
  ('document', 'title',            'can_view'),
  ('document', 'created_at',       'can_view'),
  ('document', 'content',          'can_view'),
  ('document', 'tags',             'can_view'),
  ('document', 'updated_at',       'can_view'),
  ('document', 'sharing_settings', 'can_edit'),
  ('document', 'version_history',  'can_edit'),
  ('document', 'storage_quota',    'owner'),
  ('document', 'internal_notes',   'owner'),
  ('document', 'audit_log',        'owner');
```

La gerarchia delle relazioni è ordinata: `owner > can_edit > can_view`. Un owner vede tutti i campi. Un editor vede i campi fino al livello `can_edit`. Un viewer vede solo i campi `can_view`.

### Il Middleware

Il middleware Express agisce dopo la risposta: intercetta il JSON, determina la relazione massima dell'utente sulla risorsa, e rimuove i campi sopra quel livello.

```javascript
const RELATION_HIERARCHY = ['can_view', 'can_edit', 'owner'];

async function getMaxRelation(userId, resourceType, resourceId) {
  // Controlla dalla relazione più alta alla più bassa
  for (let i = RELATION_HIERARCHY.length - 1; i >= 0; i--) {
    const relation = RELATION_HIERARCHY[i];
    const { allowed } = await fgaClient.check({
      user: `user:${userId}`,
      relation,
      object: `${resourceType}:${resourceId}`,
    });
    if (allowed) return relation;
  }
  return null;
}

function maskFields(data, allowedRelation, classifications) {
  const relationLevel = RELATION_HIERARCHY.indexOf(allowedRelation);
  const masked = { ...data };

  for (const [field, minRelation] of Object.entries(classifications)) {
    const requiredLevel = RELATION_HIERARCHY.indexOf(minRelation);
    if (requiredLevel > relationLevel) {
      delete masked[field];
    }
  }

  return masked;
}
```

E l'integrazione nella route:

```javascript
app.get('/api/documents/:docId', requireAuth, async (req, res) => {
  const { docId } = req.params;
  const userId = req.user.sub;

  // 1. Check accesso base (OpenFGA)
  const { allowed } = await fgaClient.check({
    user: `user:${userId}`,
    relation: 'can_view',
    object: `document:${docId}`,
  });

  if (!allowed) {
    return res.status(403).json({ error: 'Accesso negato' });
  }

  // 2. Recupera il documento dal database
  const doc = await getDocument(docId);

  // 3. Determina la relazione massima
  const maxRelation = await getMaxRelation(userId, 'document', docId);

  // 4. Carica classificazioni e maschera
  const classifications = await getFieldClassifications('document');
  const maskedDoc = maskFields(doc, maxRelation, classifications);

  res.json(maskedDoc);
});
```

Un viewer che richiede `GET /api/documents/budget` riceve:

```json
{
  "id": "budget",
  "title": "Budget Q3",
  "created_at": "2026-01-15T10:00:00Z",
  "content": "...",
  "tags": ["finance"],
  "updated_at": "2026-03-01T14:30:00Z"
}
```

Un owner riceve lo stesso documento con tutti i campi, inclusi `sharing_settings`, `version_history`, `storage_quota`, `internal_notes` e `audit_log`.

### Ottimizzazione: Cache delle Classificazioni

Le classificazioni dei campi cambiano raramente. In VaultDrive, vengono caricate all'avvio e cachate in memoria:

```javascript
const classificationCache = {};

async function getFieldClassifications(resourceType) {
  if (!classificationCache[resourceType]) {
    const result = await pool.query(
      'SELECT field_name, min_relation FROM field_classifications WHERE resource_type = $1',
      [resourceType]
    );
    classificationCache[resourceType] = Object.fromEntries(
      result.rows.map(r => [r.field_name, r.min_relation])
    );
  }
  return classificationCache[resourceType];
}
```

Per la relazione massima, `getMaxRelation` fa fino a tre Check verso OpenFGA in sequenza. Se la latenza è un problema, è possibile eseguirli in parallelo con `Promise.all` e determinare il livello massimo dal risultato, oppure cachare il risultato per la durata della richiesta HTTP.

---

## Integrazione: Quale Sistema per Quale Domanda

A questo punto VaultDrive usa tre sistemi per l'autorizzazione. Ogni sistema risponde a una domanda diversa:

| Domanda | Sistema | API/Meccanismo |
|---------|---------|----------------|
| L'utente è chi dice di essere? | Keycloak | JWT validation |
| L'utente può accedere alla risorsa? | OpenFGA | Check API |
| Quali risorse può vedere? | OpenFGA + DB | ListObjects (slow) o JOIN (fast) |
| Quali campi può vedere? | Data Masking (ABAC) | Classificazione + Check |

Il confine è chiaro:

- **Keycloak** si occupa dell'identità: chi sei, quali claim hai nel token. Ne abbiamo parlato nell'[articolo sull'integrazione con Keycloak]({{< ref "/posts/openfga/02-openfga-keycloak" >}}).
- **OpenFGA** si occupa delle relazioni: chi può fare cosa su quale risorsa. Il modello ReBAC copre accesso gerarchico, condivisioni, team.
- **Data Masking** si occupa della granularità a livello di campo: non è una relazione, è una classificazione.

Chi ha esperienza con OPA (ne ho scritto nell'[articolo su OPA e Keycloak]({{< ref "/posts/keycloak/05-keycloak-opa" >}})) noterà una differenza fondamentale: OPA valuta policy arbitrarie su input arbitrario, ReBAC valuta relazioni in un grafo. Sono strumenti diversi per problemi diversi. OpenFGA è più vincolato, ma quel vincolo è anche il suo punto di forza: il modello è ispezionabile, testabile, e la risoluzione ha garanzie di performance note.

---

## Operatività

Un modello di autorizzazione in produzione ha bisogno di strumenti operativi. Alcuni sono forniti da OpenFGA, altri vanno costruiti.

### Debug con Expand API

Quando un Check restituisce un risultato inatteso, l'[API **Expand**](https://openfga.dev/docs/interacting/relationship-queries#expand) mostra il grafo di risoluzione: quali tuple sono state attraversate, quali rami sono stati esplorati.

```bash
# Chi ha accesso a document:api-spec come viewer?
curl -X POST http://localhost:8080/stores/$STORE_ID/expand \
  -H "Content-Type: application/json" \
  -d '{
    "tuple_key": {
      "relation": "viewer",
      "object": "document:api-spec"
    }
  }'
```

La risposta mostra l'albero completo: utenti diretti, utenti che ereditano da folder, utenti che ereditano dall'organizzazione. È lo strumento principale per rispondere alla domanda "perché questo utente ha (o non ha) accesso?".

Il [Playground OpenFGA](https://play.fga.dev/) offre la stessa funzionalità con un'interfaccia visuale. Utile in fase di sviluppo per verificare che il modello si comporti come previsto prima di scrivere codice.

### Versioning del Modello

Il modello DSL (`model.fga`) va trattato come codice: versionato in git, con review e test in CI.

```text
openfga/
  model.fga           # modello DSL
  tuples/
    seed.json          # tuple di test
  tests/
    access.test.yaml   # test di autorizzazione
```

OpenFGA supporta la [CLI](https://openfga.dev/docs/getting-started/cli) per validare e testare il modello:

```bash
# Valida la sintassi del modello
openfga model validate --file model.fga

# Esegui i test
openfga model test --tests tests/access.test.yaml
```

I test sono file YAML dichiarativi: definiscono tuple, poi asseriscono il risultato di Check specifici. In CI, questi test girano a ogni push e bloccano il merge se un Check restituisce un risultato diverso dall'atteso.

### Backup e Monitoring

Le tuple sono i dati critici del sistema di autorizzazione. OpenFGA espone un'API di **Read** paginata per esportarle:

```bash
# Esporta tutte le tuple dello store
curl "http://localhost:8080/stores/$STORE_ID/read" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.tuples'
```

Per il monitoring, le metriche rilevanti sono:

- **Latenza Check P99**: dovrebbe restare sotto i 10ms per grafi poco profondi, 50ms per grafi con 4-5 livelli di nesting
- **Latenza ListObjects P99**: dipende dal numero di oggetti del tipo richiesto. È la metrica che giustifica il pattern fast path/slow path
- **Numero di tuple per store**: cresce linearmente con utenti e risorse. OpenFGA gestisce milioni di tuple, ma la latenza di ListObjects ne risente
- **Errori 5xx**: indicano problemi di connessione al database di OpenFGA (PostgreSQL o MySQL)

---

## Riepilogo

Tre concetti da portare via:

**Le gerarchie sono gratuite nel modello.** `viewer from parent` risolve N livelli di nesting senza codice applicativo. La struttura è nelle tuple, la logica è nel DSL.

**ListObjects ha un costo. Il fast path lo evita.** Per le query inverse ("quali risorse può vedere l'utente"), il pattern fast/slow path combina JOIN SQL (per accesso derivato dall'organizzazione) e ListObjects (per condivisioni dirette). Il fast path copre la maggior parte dei casi senza chiamare OpenFGA.

**Non tutto è ReBAC.** Il field-level access control è ABAC: una classificazione dei campi combinata con il livello di relazione dell'utente. Dynamic Data Masking è il pattern che separa il "puoi accedere alla risorsa" (OpenFGA) dal "quali campi vedi" (applicazione).

Nel prossimo articolo affronteremo i test: come scrivere test di autorizzazione dichiarativi, come integrarli in CI, e come verificare che una modifica al modello non rompa i permessi esistenti.

### Risorse

**Repository demo:**
- [VaultDrive su GitHub](https://github.com/monte97/VaultDrive)

**Documentazione OpenFGA:**
- [OpenFGA - Expand API](https://openfga.dev/docs/interacting/relationship-queries#expand)
- [OpenFGA - ListObjects API](https://openfga.dev/docs/interacting/relationship-queries#listobjects)
- [OpenFGA - Performance Guidance](https://openfga.dev/docs/interacting/performance-guidance)
- [OpenFGA - Model Testing](https://openfga.dev/docs/getting-started/testing/modeled-access)
- [OpenFGA CLI](https://openfga.dev/docs/getting-started/cli)
- [OpenFGA Playground](https://play.fga.dev/)

**Articoli correlati:**
- [Zanzibar e i concetti fondamentali]({{< ref "/posts/openfga/01-zanzibar-concetti" >}})
- [OpenFGA + Keycloak]({{< ref "/posts/openfga/02-openfga-keycloak" >}})
- [Multitenancy con OpenFGA]({{< ref "/posts/openfga/03-multitenancy" >}})
- [ListObjects in produzione: caching, pre-materializzazione e BatchCheck]({{< ref "/posts/openfga/05-listobjects-performance" >}})
- [Autorizzazione con OPA e Keycloak]({{< ref "/posts/keycloak/05-keycloak-opa" >}})
