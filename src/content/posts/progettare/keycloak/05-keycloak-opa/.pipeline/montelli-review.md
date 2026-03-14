# Style Review (montelli.dev) — 05-keycloak-opa

**Score: 7/10**
**Data review: 2026-03-14**
**Riferimento style guide**: `/home/monte/.claude/knowledge/blog-style-guide.md`

---

## Checklist

- [x] Apertura diretta (no hook emotivi) — OK, parte dallo stato del lettore con fatti tecnici
- [x] Voce impersonale nel corpo — OK nella maggior parte dell'articolo
- [x] Nessun trattino lungo (—) — verificato, nessuna occorrenza
- [x] Nessuna drammatizzazione — OK
- [x] Code blocks con linguaggio e commenti — OK
- [x] Link a documentazione ufficiale — OK
- [x] ASCII schemi consentiti (alberi/flussi) — OK, conforme alle regole

---

## Problemi Rilevati

### Violazione — Frase boilerplate "Questo articolo mostra..."

**Posizione**: paragrafo introduttivo, terza frase

**Originale**:
> "Questo articolo mostra come separare le due responsabilita': **Keycloak autentica** (chi sei), **OPA autorizza** (cosa puoi fare)."

Lo style guide vieta esplicitamente questo pattern:
```
✗ "Questo articolo mostra come gestire il volume di dati OpenTelemetry."
```

**Correzione applicata**: riformulato come affermazione diretta sulla soluzione, eliminando il riferimento all'articolo come soggetto.

---

### Violazione — "Tu" diretto in chiusura

**Posizione**: ultimo paragrafo delle Conclusioni

**Originale**:
> "La prossima volta che dovrai bloccare un utente al volo o aggiungere una regola di accesso senza deploy, saprai dove mettere mano: non nel codice, ma in un file `.rego`."

Usa "dovrai" e "saprai" — voce in seconda persona diretta. Lo style guide richiede voce impersonale.

**Correzione applicata**: riformulato in forma impersonale mantenendo lo stesso contenuto informativo.

---

## Aspetti Positivi

- Apertura con scenario tecnico concreto (claim JWT ancora valido dopo blocco utente) — conforme al pattern "Partire dallo stato del lettore"
- Struttura progressiva corretta: contesto -> architettura -> implementazione -> test -> confronto -> conclusioni
- Tabelle usate correttamente per confronti (Claims JWT vs OPA)
- Note contestuali (deprecation RFC 9700, versione Docker) ben posizionate come blockquote
- Conclusioni con riepilogo tecnico neutro dei tre pattern — nessun tono motivazionale
- ASCII art conforme: schema ad albero per architettura, max ~10 righe
