# Tech Review — 04-gerarchie-query

**Score: 7/10**

---

## P1 — Bug: classificationCache non keyed per resourceType

**Posizione:** funzione `getFieldClassifications`, sezione "Ottimizzazione: Cache delle Classificazioni"

**Problema:** La variabile `classificationCache` era definita come `null` e popolata senza considerare il parametro `resourceType`. Una seconda chiamata con un tipo diverso (es. `'folder'`) avrebbe restituito la cache di `'document'` invece di interrogare il database.

**Correzione applicata:** La cache è ora un oggetto `{}` indicizzato per `resourceType`. Ogni tipo ha la propria entry.

---

## P1 — Errore concettuale: ottimizzazione getMaxRelation suggeriva direzione sbagliata

**Posizione:** paragrafo dopo la funzione `getMaxRelation`

**Problema originale:** Il testo suggeriva "parti da `can_view` e sali e fermati al primo `false`" come ottimizzazione. Questa logica è errata: fermarsi al primo `false` partendo dal basso è lo stesso identico comportamento del codice esistente (che invece parte dall'alto e si ferma al primo `true`). Non è un'ottimizzazione.

**Correzione applicata:** Il suggerimento è stato sostituito con l'approccio corretto: eseguire i tre Check in parallelo con `Promise.all`.

---

## P2 — Nessun limite su ListObjects

**Posizione:** sezione "ListObjects e il Problema WHERE"

**Problema:** L'API `listObjects` non specifica il parametro `pageSize` né gestisce la paginazione. In OpenFGA, `listObjects` ha un limite configurabile (default 1000 oggetti). Per store con molti oggetti, la risposta è troncata senza un'indicazione esplicita nel codice di esempio.

**Stato:** Non corretto (richiederebbe aggiunta di contenuto, fuori scope).

---

## P2 — Latenza benchmark potrebbero essere datati

**Posizione:** sezione "Backup e Monitoring"

**Testo:** "sotto i 10ms per grafi poco profondi, 50ms per grafi con 4-5 livelli di nesting"

**Nota:** I valori sono plausibili per deployment locali o cloud con bassa latenza di rete verso PostgreSQL, ma dipendono fortemente dall'infrastruttura. Non è un errore, ma andrebbe contestualizzato come ordine di grandezza indicativo.

**Stato:** Non corretto (è una nota editoriale, i valori sono difendibili).

---

## Verifica Best Practice

| Area | Stato |
|------|-------|
| DSL ricorsione (`viewer from parent`) | Corretto |
| Contextual tuples | Corretto — uso appropriato per simulazione senza persistenza |
| UNION fast+slow path | Corretto — SQL valido per PostgreSQL con `ANY($2::text[])` |
| Expand API | Corretto — endpoint e payload corretti |
| Model testing con CLI | Corretto — comandi `openfga model validate/test` attuali |
| Versioning del modello in git | Corretto |
| `fgaClient.check` / `fgaClient.write` / `fgaClient.listObjects` | API corrette per OpenFGA JS SDK v0.x/v1.x |
