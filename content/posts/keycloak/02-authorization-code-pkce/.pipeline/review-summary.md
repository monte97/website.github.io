# Review Summary — keycloak-02-authorization-code-pkce

**Tech: 8/10 | Style: 8.5/10**

## Top findings

### Tech (P1)
1. `code_verifier` generation: `openssl rand -base64 32` may produce <43 valid chars after stripping, violating RFC 7636 minimum. Use `-base64 48`.
2. Audience validation in comment as "optional" — essential in production to prevent token confusion.
3. Refresh token timeout: manca il max assoluto (default 10h), citato solo il session idle (30min).
4. `clockTolerance: 30` + 30s proactive refresh = accetta token fino a 60s dopo scadenza. Nota per produzione.

### Style (major)
1. Nessuna immagine in un tutorial hands-on con Keycloak console e browser DevTools.

### Style (minor)
2. Hook debole: manca domanda retorica o "tu" diretto nell'apertura.
3. H2 numerati ("## 1. Configurazione") invece del pattern "Titolo: Sottotitolo".
4. "Risorse utili" come testo bold invece di H2.
