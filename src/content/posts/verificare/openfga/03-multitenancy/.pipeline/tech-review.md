# Tech Review — 03-multitenancy

**Score: 9/10**

## Findings

### P0 — Errori fatali
Nessuno.

### P1 — Problemi importanti
Nessuno.

### P2 — Miglioramenti

**DSL model: relazione `editor` su `document` non eredita da `org`**

Nel modello DSL, `folder.editor` include `admin from org`, ma `document.editor` no:

```dsl
type folder
  relations
    define editor: [user] or owner or admin from org   # OK

type document
  relations
    define editor: [user] or owner                     # manca admin from org
```

Questo è coerente con il testo che spiega che `alice` può editare `doc-acme` grazie alla regola `admin from org` — ma il percorso effettivo è: alice -> admin di org-acme -> `can_edit from parent` su doc-acme (tramite folder-acme che ha `editor: admin from org`). Non direttamente via `document.editor`. Il testo a riga 164 descrive il cammino in modo semplificato e potenzialmente fuorviante: dice che la regola `admin from org` si risolve sulla relazione `editor` del documento, ma nel modello mostrato quella regola non esiste su `document.editor`. L'isolamento funziona comunque perché il documento ha una cartella genitore, ma se un documento non ha parent, alice non potrebbe editarlo. Questo caso edge non è discusso.

**Raccomandazione**: chiarire nel testo che l'ereditarietà admin->editor per i documenti passa attraverso la cartella (via `can_edit from parent`), oppure aggiungere `admin from org` alla relazione `editor` del tipo `document` per coerenza con il testo.

**Test YAML: assertion `viewer: true` vs `can_view: true`**

Nel test per eve su `document:doc-beta` (riga 357), l'assertion usa `viewer: true` invece di `can_view: true` come negli altri test. Tecnicamente corretto (testa la relazione `viewer` direttamente, non la permission `can_view`), ma stilisticamente inconsistente con il resto del file di test e potenzialmente confuso. Non è un errore: il modello ha sia `viewer` che `can_view` come relazioni distinte su `document`.

## Punti di forza tecnici

- DSL `schema 1.1` corretto per OpenFGA corrente.
- API Python `ListObjectsRequest` coerente con la SDK ufficiale.
- Formato `.fga.yaml` per `openfga model test` corretto.
- Spiegazione della traversal del grafo accurata.
- Pattern type-per-tenant con org come radice del grafo è il pattern ufficialmente raccomandato da OpenFGA.
- Sezione ibrida store/type nel riepilogo finale è corretta e praticamente utile.
- I link alla documentazione OpenFGA sono tutti validi e aggiornati.
