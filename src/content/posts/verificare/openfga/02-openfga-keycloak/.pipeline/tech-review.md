# Tech Review — 02-openfga-keycloak

**Score: 8/10**

---

## P1 — Problemi Importanti

### P1-1: Null safety su `user.roles` in `syncUserOnLogin`
**Riga originale ~225**: `const isAdmin = user.roles.includes('admin');`

La guardia iniziale controlla `user.sub` e `user.groups`, ma non `user.roles`. Se il JWT non include il claim `realm_access.roles` o se il chiamante non passa `roles`, la chiamata `includes` su `undefined` lancia `TypeError`.

**Fix applicato**: `const isAdmin = (user.roles || []).includes('admin');`

---

## P2 — Miglioramenti

### P2-1: `listObjects` senza filtro org
**Riga ~429**: La chiamata `fgaClient.listObjects({ user, relation: 'can_view', type: 'document' })` restituisce tutti i documenti visibili all'utente in qualsiasi organizzazione. Il filtro per `orgId` è delegato al database. Questo è architetturalmente corretto ma il comportamento potrebbe sorprendere: un utente membro di `org-acme` e `org-beta` riceverà gli ID di tutti i documenti di entrambe le org dalla chiamata OpenFGA, e solo il `WHERE org_id = $2` li filtra. Il pattern è documentato implicitamente nel commento. Nessun errore, ma merita un commento esplicito.

### P2-2: Assenza di retry/idempotenza nel webhook handler
Il webhook handler (sezione Event-driven) non gestisce retry idempotenti: se OpenFGA non è raggiungibile al momento dell'evento, la tupla non viene scritta e non c'è meccanismo di recupero. La sezione della tabella comparativa menziona "Serve gestire retry e idempotenza" come punto di attenzione, ma il codice di esempio non lo mostra. Per un articolo didattico va bene, ma vale la pena aggiungere una nota.

### P2-3: `fgaClient.check()` nella sync batch vs `read()`
**Riga ~191** (batch sync): `fgaClient.read({ object: orgObject })` con accesso `t.key.user` - la struttura risposta è corretta per l'SDK `@openfga/sdk` v0.x/v1.x dove ogni tupla ha la forma `{ key: { user, relation, object }, timestamp }`. Corretto.

### P2-4: Client Credentials e claim `groups`
**Riga 53**: "Il client M2M, che usa Client Credentials e non ha utenti, non ne ha bisogno." - corretto, ma da notare che in Keycloak anche i client M2M con Client Credentials possono ricevere un token con `realm_access.roles` se si configurano service account roles. Il fatto che non ricevano `groups` è preciso perché i gruppi si applicano agli utenti, non ai service account.

---

## Verifica Tecnica Generale

| Area | Valutazione |
|------|-------------|
| Flusso JWT/JWKS | Corretto |
| OpenFGA SDK (`@openfga/sdk`) check/write/listObjects | Corretto |
| Keycloak client scope `oidc-group-membership-mapper` | Corretto |
| Pattern `ListObjects + WHERE IN` | Corretto, best practice documentata |
| Contextual tuples - comportamento `ListObjects` | Corretto (non visibili da altri) |
| Fail-closed su errore 503 | Corretto |
| Sincronizzazione on-demand con check prima di write | Idempotente, corretto |
| Struttura tuple OpenFGA (`user:X relation object:Y`) | Corretta |
