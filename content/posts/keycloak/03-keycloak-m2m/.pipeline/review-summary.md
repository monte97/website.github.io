# Review Summary — keycloak-03-m2m

**Tech: 8/10 | Style: 8/10**

## Top findings

### Tech (P1)
1. Keycloak 17+ ha rimosso il prefisso `/auth` dall'URL. L'esempio curl lo usa ancora hardcoded.
2. Check `azp` hardcoded — menzionare role/scope-based authorization come alternativa scalabile.
3. `isServiceAccount` basato su prefisso ruolo e' fragile.

### Style (major)
1. Manca una conclusione narrativa: l'articolo finisce con checklist e risorse senza riepilogo ne' frase di chiusura.

### Style (minor principali)
2. Nessun hook/domanda retorica nell'introduzione.
3. Diagrammi ASCII senza language tag `text`.
4. Due code block oltre il limite 30-40 righe (service-token.js 66 righe, auth.js 64 righe).
5. Emoji nel corpo del testo (guideline: solo in link/risorse).
