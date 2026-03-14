# Tech Review — 01-zanzibar-concetti

**Score: 7/10**

---

## Problemi trovati

### P0 — Errore fatale

**postgres:18-alpine non esiste**
- Riga 310 (originale): `image: postgres:18-alpine`
- PostgreSQL 18 non è ancora rilasciato come stable (a marzo 2026 la versione stabile è PostgreSQL 17).
- Correzione applicata: `postgres:17-alpine`

---

### P1 — Problemi importanti

**openfga/openfga:latest in Docker Compose**
- Usare `latest` in un file Docker Compose di riferimento è una bad practice: il comportamento cambia tra esecuzioni e non è riproducibile.
- Correzione applicata: `openfga/openfga:v1.8` (versione stabile disponibile a marzo 2026).

**URL paper Zanzibar**
- L'URL `https://research.google/pubs/pub48190/` è un link numerico che può smettere di funzionare. L'URL canonico è `https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/`.
- Non corretto nel testo perché il link numerico attualmente fa redirect, ma va segnalato.

---

### P2 — Miglioramenti

**ListObjects e paginazione**
- La nota sulla scalabilità di ListObjects è corretta. Sarebbe utile menzionare che OpenFGA v1.x supporta `continuation_token` nella risposta per la paginazione, e che esiste anche la variante streaming `StreamedListObjects` per dataset grandi.
- Non applicato: aggiungerebbe contenuto nuovo.

**openfga-migrate senza restart policy**
- Il servizio `openfga-migrate` non ha `restart: "no"` esplicito. In alcuni ambienti Docker il default potrebbe causare retry non desiderati. È una best practice dichiararlo esplicitamente.
- Non applicato: dettaglio minore, non altera la correttezza dell'esempio.

---

## Aspetti corretti

- Modello a tuple (user, relation, object) descritto correttamente.
- Meccanismo userset con `#` notation: corretto.
- DSL schema 1.1 con `define owner: [user]` e clausole `or`: corretto.
- Ereditarietà `editor from parent`: comportamento descritto correttamente.
- Endpoint Check, ListObjects, ListUsers: path e body JSON corretti per OpenFGA v1.x HTTP API.
- Pattern `service_completed_successfully` per dipendenza migrate -> run: corretto.
- Distinzione RBAC / ABAC / ReBAC nella tabella: accurata.
- Affermazione "deny-by-default": corretta per OpenFGA.
- Numeri del paper Zanzibar (trilioni di check, P95 < 10ms): riportati fedelmente dal paper originale.
