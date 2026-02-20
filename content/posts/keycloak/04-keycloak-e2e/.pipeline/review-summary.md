# Review Summary — keycloak-04-e2e

**Tech: 8/10 | Style: 8/10**

## Top findings

### Tech (P1)
1. Problema 3: `sub` in Keycloak e' un UUID, non una stringa leggibile. Il check `sub.startsWith('service-account-')` e' sbagliato — usare `preferred_username` o `clientId !== undefined && !payload.session_state`.
2. Problema 3: `realm_access.roles.includes('service-account')` — questo ruolo non esiste di default in Keycloak.
3. Problema 4: `payload.roles?.includes('can-checkout')` — i realm roles sono sotto `payload.realm_access.roles`, non `payload.roles`.

### Style (minor principali)
1. H1 duplicato: titolo sia nel frontmatter che nel markdown — produce doppio titolo.
2. Manca hook con domanda retorica nell'introduzione.
3. Sezione "Prossimi Passi" troppo breve con TODO comment visibile.
4. Diagramma ASCII senza tag `text`.
5. Description frontmatter corta (95 chars vs 120-150 raccomandati).
