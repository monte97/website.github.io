# Tech Review: Keycloak in Pratica - 6 Problemi Reali

**Reviewer**: Claude Opus 4.6 (tech-review)
**Date**: 2026-03-12 (aggiornamento; prima review: 2026-02-20)
**Article**: `content/posts/keycloak/04-keycloak-e2e/index.md`

---

## Overall Score: 9/10

Articolo solido e pratico. I 3 P1 della review precedente sono stati corretti. La review di aggiornamento ha trovato 2 nuovi P1 (checkLoginIframe e session_state in KC 26+), entrambi ora risolti.

---

## Storico Issue

### P1 risolti (review 2026-02-20)

1. **`sub` does not start with `service-account-`** - Rimosso, sostituito con `preferred_username`
2. **`realm_access.roles` non contiene `service-account` di default** - Rimosso
3. **`payload.roles` invece di `payload.realm_access.roles`** - Corretto in `realm_access?.roles`

### P1 risolti (review 2026-03-12)

4. **`checkLoginIframe: false` presentato come problema** - Invertito: ora presentato come best practice (CVE-2024-1249)
5. **`!payload.session_state` non affidabile in KC 26+** - `preferred_username` promosso a soluzione primaria, aggiunto caveat su `session_state`

### P2 risolti (review 2026-03-12)

6. **`/auth` path prefix** - Aggiunta nota su KC pre-17 vs 17+ (Quarkus)
7. **Audience mapper generico** - Aggiunti passi concreti per configurare il mapper
8. **`clientId` camelCase vs `client_id`** - Aggiunto caveat nel codice corretto
9. **Titoli sezione topic-only** - Riscritti con insight
10. **Diagramma ASCII con box `┌┐└┘`** - Convertito in formato albero

### P2 aperti (non bloccanti)

11. **Error handling in `getServiceToken()`** - Se `fetchToken()` fallisce, la Promise rejected si propaga a tutti i caller. Funziona correttamente ma un commento nel codice aiuterebbe i lettori.

---

## Knowledge Report

### Fonti consultate

| # | Fonte | URL | Cosa verificato | Takeaway chiave | Versione/Data |
|---|-------|-----|-----------------|-----------------|---------------|
| 1 | RFC 9700 | https://datatracker.ietf.org/doc/rfc9700/ | Numero RFC corretto | RFC 9700, BCP 240, pubblicato gennaio 2025. Precedentemente draft-ietf-oauth-security-topics | Gennaio 2025 |
| 2 | panva/jose | https://github.com/panva/jose | API jwtVerify | Opzioni `issuer`, `audience`, `clockTolerance` corrette e stabili | v6.x |
| 3 | Keycloak 26 Release Notes | https://docs.redhat.com/en/documentation/red_hat_build_of_keycloak/26.0/html/release_notes/ | session_state removal | `session_state` rimosso da tutti i token di default in KC 26+. `sid` è l'alternativa | KC 26.0 |
| 4 | CVE-2024-1249 | https://github.com/keycloak/keycloak/security/advisories/GHSA-m6q9-p373-g5q8 | checkLoginIframe security | Vulnerabilità DoS cross-origin nell'iframe di login check. Disabilitare è la mitigazione raccomandata | 2024 |
| 5 | Keycloak GitHub #16329 | https://github.com/keycloak/keycloak/issues/16329 | clientId vs client_id | Il mapper di default usa `clientId` (camelCase), non conforme a OAuth2 che prevede `client_id` | 2023 |
| 6 | Keycloak Migration Guide | https://www.keycloak.org/migration/migrating-to-quarkus | /auth path removal | KC 17+ (Quarkus) non usa `/auth` di default. Configurabile con `--http-relative-path` | KC 17+ |

### Sintesi delle scoperte

**Service Account Detection**
- `preferred_username?.startsWith('service-account-')` è l'indicatore più affidabile cross-versione
- `session_state` rimosso in KC 26+, non più utilizzabile come discriminante
- `clientId` dipende dalla configurazione del mapper, non è esclusivo dei token client credentials

**checkLoginIframe**
- CVE-2024-1249 rende la disabilitazione una best practice, non un compromesso
- Per gestire il logout cross-tab senza iframe: Back-Channel Logout o polling esplicito

**Audience Validation**
- Keycloak non popola `aud` negli access token di default (solo ID token)
- Richiede mapper esplicito: tipo "Audience", "Included Client Audience", "Add to access token"

### Punti aperti

| # | Punto aperto | Contesto | Suggerimento |
|---|-------------|----------|--------------|
| 1 | `client_id` vs `clientId` stabilizzazione | Issue #16329 aperta dal 2023 | Monitorare se KC 27+ standardizza su `client_id` |
