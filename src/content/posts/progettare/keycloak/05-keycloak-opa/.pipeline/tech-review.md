# Tech Review — 05-keycloak-opa

**Score: 7/10**
**Data review: 2026-03-14**

---

## Punti Corretti

- Architettura OPA come sidecar HTTP con Data API `/v1/data/mockmart/{package}/allow` — corretta
- `default allow = false` come deny-by-default — best practice confermata
- Nota su `grant_type=password` deprecato (RFC 9700) appropriata e contestualizzata
- Check `data.result === true` per gestire risposta `{}` (nessuna regola match) — corretto
- Fail-closed con 503 in caso di OPA irraggiungibile — pratica corretta per sistemi di autorizzazione
- Docker Compose override senza modificare la configurazione base — pattern solido

---

## Problemi Rilevati

### P1 — Gap su meccanismo di reload OPA

**Posizione**: sezione "Checkout: Deny List Esterna"

**Problema**: L'articolo afferma "Per bloccare un utente basta aggiungere il suo username al file e ricaricare OPA" senza specificare come. OPA non recepisce modifiche ai file a runtime senza un restart del processo o senza configurare la Bundle API. Questo e' un gap rilevante per la feature presentata come principale vantaggio rispetto ai claim JWT.

**Risoluzione applicata**: Aggiunto `docker compose restart opa` come meccanismo base e riferimento alla Bundle API per reload a caldo.

---

### P2 — Sintassi Rego `[_]` vs `some ... in`

**Posizione**: `checkout.rego`, regola `is_blocked`

```rego
is_blocked if {
    input.user.username == blocked_users[_]
}
```

La sintassi `[_]` per iterazione implicita e' valida ma la sintassi moderna OPA preferisce:

```rego
is_blocked if {
    some u in blocked_users
    input.user.username == u
}
```

Non e' un errore funzionale. Non modificato per non alterare il flusso didattico.

---

### P2 — Immagine Docker `latest-debug`

**Posizione**: `docker-compose.opa.yml`

L'esempio usa `openpolicyagent/opa:latest-debug`. La nota gia' lo segnala come pattern da evitare in produzione con suggerimento di versione specifica. Gestito adeguatamente.

---

### P2 — Query DB aggiuntiva per ownership

**Posizione**: sezione "Dettaglio ordine"

Il middleware fa una query `SELECT user_id FROM orders` prima di ogni chiamata OPA per `GET /api/orders/:id`. Il trade-off e' menzionato genericamente ("costo della separazione") ma senza specificare che si tratta di una query per ogni singola lettura. Accettabile nel contesto didattico.
