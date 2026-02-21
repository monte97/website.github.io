# Keycloak oltre il login

**M2M, OPA e i 6 problemi che incontrerai davvero**

- **Formato**: Talk 35 min + Q&A
- **Livello**: Intermedio
- **Target**: Sviluppatori backend/fullstack, security engineer

---

## Abstract

Tutti i tutorial su Keycloak finiscono al login. Ma il login e' il 20% del problema: il restante 80% emerge quando vai in produzione e scopri che il token del frontend apre anche il payment service, che 50 checkout concorrenti fanno DDoS sul token endpoint, e che un aggiornamento di Keycloak trasforma un booleano in un array.

In questo talk parto dai 6 problemi reali che ho incontrato integrando Keycloak in un e-commerce a microservizi. Per ognuno mostro il sintomo, la causa root e la fix. Poi vado oltre il login: autenticazione machine-to-machine con Client Credentials e token caching, e autorizzazione granulare separando autenticazione (Keycloak) da autorizzazione (OPA) con policy Rego testabili offline.

Il pubblico esce con una checklist di produzione e tre pattern avanzati pronti da usare.

---

## Scaletta

### 1. Keycloak in 3 minuti (3 min)

- Il problema degli identity silo: ogni app gestisce le sue credenziali.
- Keycloak centralizza l'autenticazione: le app ricevono JWT, non toccano password.
- "Se il codice non gestisce password, non puo' gestirle male."

### 2. I 6 problemi reali (15 min)

Sei war story dall'integrazione in MockMart (e-commerce a 5 microservizi).

1. **Il 401 inspiegabile** — Token valido su jwt.io, API risponde 401. Causa: issuer mismatch tra URL interna Docker e URL pubblica del browser. Il problema piu' comune e non succede mai in localhost.

2. **Token cross-client accettato** — Il token del frontend (`shop-ui`) apre anche il payment service. Causa: il middleware valida issuer ed expiry ma non l'audience. Qualsiasi token del realm apre qualsiasi servizio.

3. **Falso service account** — Un utente senza email viene riconosciuto come service account. Causa: logica di detection fragile (`!email && azp`). Fix: controllare `sub.startsWith('service-account-')`.

4. **Il booleano che diventa array** — Dopo un aggiornamento Keycloak, `canCheckout: true` genera 403. Causa: i token mapper cambiano formato tra versioni (stringa, booleano, array). Serve parsing difensivo.

5. **Thundering herd sul token endpoint** — 50 checkout concorrenti, 50 richieste token, Keycloak risponde 429. Causa: cache miss simultaneo alla scadenza. Fix: lock con `pendingRequest` per serializzare il refresh.

6. **Da localhost a produzione** — `sslRequired: "none"`, secret nel docker-compose, URL hardcoded nel frontend. Tutto funziona in locale, tutto si rompe in staging.

### 3. Machine-to-machine: Client Credentials (7 min)

- Il problema: non ogni chiamata API ha un utente dall'altra parte. Job, webhook, eventi asincroni.
- Tre approcci sbagliati: API key hardcoded, passare il token utente, zero auth.
- L'approccio giusto: Client Credentials flow con token caching.
- Pattern di caching: cache il token, rinnova 60s prima della scadenza, lock per richieste concorrenti.
- Validazione: non basta la firma — verificare `azp` e claim `service-account`.

### 4. Autorizzazione granulare: Keycloak + OPA (7 min)

- Il limite dei claim: autorizzazione sparsa tra Keycloak, mapper e codice applicativo.
- La separazione: Keycloak fa autenticazione (chi sei), OPA fa autorizzazione (cosa puoi fare).
- Tre policy Rego concrete:
  - RBAC sui prodotti: tutti leggono, solo admin crea.
  - Deny list sul checkout: blocca utenti da `data.json`, senza re-login e senza re-deploy.
  - Ownership sugli ordini: ogni utente vede solo i propri.
- Demo: modifica `data.json`, ricarica OPA, utente bloccato immediatamente. Nessun cambio Keycloak.
- Testabilita': `make opa-test` esegue 17 test offline, input JSON, output booleano.

### 5. Chiusura: la checklist (3 min)

- Tabella di production readiness: audience validation, secret management, SSL, token caching, OPA.
- "Il login e' la porta d'ingresso. Quello che succede dopo e' il vero progetto."
- Slide risorse: articoli + repo MockMart.
