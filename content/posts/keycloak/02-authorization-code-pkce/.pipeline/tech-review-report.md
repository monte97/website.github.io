# Tech Review Report

**Articolo:** `content/posts/keycloak/02-authorization-code-pkce/index.md`
**Titolo:** Login con Keycloak: Authorization Code + PKCE in MockMart
**Data review:** 2026-02-19
**Parole:** ~2437

---

## Tabella di Review

### 1. Flusso Authorization Code + PKCE (righe 44-56)

| # | Claim | Verdetto | Dettaglio |
|---|-------|----------|-----------|
| 1.1 | Il frontend genera un `code_verifier` e ne calcola l'hash `code_challenge` | **CONFERMATO** | Conforme a RFC 7636 Section 4.1-4.2. Il client crea un `code_verifier` e calcola `code_challenge = BASE64URL(SHA256(code_verifier))`. |
| 1.2 | Il browser viene reindirizzato con il `code_challenge` nella query string | **CONFERMATO** | RFC 7636 Section 4.3: il client invia `code_challenge` e `code_challenge_method` nella authorization request. |
| 1.3 | Il frontend scambia `code` + `code_verifier` con Keycloak e riceve i token | **CONFERMATO** | RFC 7636 Section 4.5: il client invia il `code_verifier` nel token request. |
| 1.4 | "Se un attaccante intercetta il code, non puo scambiarlo senza il verifier originale" | **CONFERMATO** | Questo e esattamente lo scopo di PKCE (RFC 7636 Section 1). |

### 2. Nota su PKCE vs client secret (riga 55)

| # | Claim | Verdetto | Dettaglio |
|---|-------|----------|-----------|
| 2.1 | "PKCE risolve il problema con un segreto generato per ogni singolo login e mai esposto nell'URL" | **CONFERMATO** | Il `code_verifier` viene inviato nel body del POST al token endpoint, non nella query string/URL. Il `code_challenge` (hash) e nella query string ma non e reversibile. |

### 3. Configurazione Keycloak (righe 59-146)

| # | Claim | Verdetto | Dettaglio |
|---|-------|----------|-----------|
| 3.1 | Client authentication OFF = client public | **CONFERMATO** | Nella UI Keycloak, disattivare "Client authentication" crea un client public (nessun client secret). |
| 3.2 | `Valid redirect URIs: http://localhost:3000/*` | **BAD PRACTICE** | Per sviluppo locale e accettabile, ma il wildcard `*` in coda ai redirect URI e una pratica sconsigliata in produzione. L'articolo e un tutorial locale, quindi e appropriato, ma manca un avvertimento. **Suggerimento:** aggiungere una nota che in produzione vanno specificate le URI esatte. |
| 3.3 | Code Challenge Method `S256` nella tab Advanced | **CONFERMATO** | In Keycloak, la sezione "Proof Key for Code Exchange" si trova nelle impostazioni avanzate del client. `S256` forza PKCE con SHA-256. |
| 3.4 | "Il metodo `plain` (che invia il verifier in chiaro) non offre protezione reale" | **CONFERMATO** | RFC 7636 Section 7.2: "plain" SHOULD NOT be used e esiste solo per compatibilita. S256 e l'unico metodo raccomandato. |
| 3.5 | OIDC Discovery URL: `http://localhost:8080/realms/techstore/.well-known/openid-configuration` | **CONFERMATO** | Path standard per Keycloak OIDC discovery. |
| 3.6 | Direct access grants = OFF | **CONFERMATO** | Best practice: il Resource Owner Password Credentials grant e deprecato in OAuth 2.1 e non dovrebbe essere abilitato per client SPA. |

### 4. Frontend keycloak-js (righe 149-239)

| # | Claim | Verdetto | Dettaglio |
|---|-------|----------|-----------|
| 4.1 | Inizializzazione con `new Keycloak({ url, realm, clientId })` | **CONFERMATO** | API corretta per keycloak-js. |
| 4.2 | `pkceMethod: 'S256'` nel `kc.init()` | **OUTDATED** | A partire da keycloak-js **v24.0.0** (marzo 2024, PR #26412), PKCE con S256 e abilitato **di default**. Specificarlo esplicitamente non causa errori (e ridondante ma non dannoso), tuttavia l'affermazione "Senza questo parametro, keycloak-js usa il flusso senza PKCE" (riga 198) e **errata** per versioni >= 24. **Correzione:** specificare che da keycloak-js 24+ PKCE S256 e il default. Il parametro e comunque utile per rendere esplicita l'intenzione, ma ommetterlo non disabilita PKCE. |
| 4.3 | `onLoad: 'check-sso'` — controlla se c'e gia una sessione | **CONFERMATO** | Documentazione ufficiale keycloak-js: `check-sso` verifica la sessione SSO senza forzare il login. |
| 4.4 | `checkLoginIframe: false` — disabilita iframe di verifica sessione | **CONFERMATO** | Opzione documentata. Il default e `true`. La motivazione (problemi cookie cross-origin su localhost) e corretta. La nota che in produzione va valutato di riabilitarlo e appropriata, anche se la funzionalita e in declino per via delle policy sui third-party cookies. |
| 4.5 | `kc.login()` reindirizza a Keycloak e gestisce automaticamente lo scambio code -> token | **CONFERMATO** | keycloak-js gestisce il flusso completo: redirect, callback, token exchange. |
| 4.6 | `kc.logout({ redirectUri })` termina sessione locale e SSO | **CONFERMATO** | La funzione `logout()` invalida la sessione su Keycloak e redirige alla URI specificata. |
| 4.7 | `kc.updateToken(30)` rinnova il token se scade entro 30 secondi | **CONFERMATO** | API documentata: il parametro e il numero minimo di secondi di validita rimanente. Se il token scade prima, viene eseguito il refresh. |

### 5. Backend Express + jose (righe 243-329)

| # | Claim | Verdetto | Dettaglio |
|---|-------|----------|-----------|
| 5.1 | `createRemoteJWKSet(new URL(JWKS_URL))` per scaricare e cachare le chiavi pubbliche | **CONFERMATO** | API corretta della libreria jose. La funzione ritorna un resolver che scarica e cacha automaticamente il JWKS. |
| 5.2 | Due URL diversi per Keycloak (interno Docker per JWKS, pubblico per issuer) | **CONFERMATO** | Pattern corretto e ben spiegato. Il token contiene `iss` con l'URL pubblico, mentre il backend deve raggiungere il JWKS via rete Docker. |
| 5.3 | `jwtVerify` con opzioni `issuer` e `clockTolerance: 30` | **CONFERMATO** | Sintassi corretta. `clockTolerance` accetta un numero (secondi) o una stringa. 30 secondi e un valore ragionevole. |
| 5.4 | "jwtVerify fa tre cose: verifica firma, controlla issuer, controlla scadenza" | **CONFERMATO** | Corretto per la configurazione mostrata. `jwtVerify` verifica sempre la firma e l'expiration automaticamente. L'issuer viene verificato perche passato come opzione. |
| 5.5 | Nessuna verifica audience (`aud`) nel middleware | **BAD PRACTICE** | Il middleware non verifica il claim `aud`. In Keycloak, l'access token ha `aud: "account"` di default. Per un setup di produzione, si dovrebbe configurare un audience mapper e validare con `audience: 'shop-api'` nelle opzioni di `jwtVerify`. Per un tutorial introduttivo puo essere accettabile ometterlo, ma vale la pena menzionarlo. **Suggerimento:** aggiungere una nota che in produzione va aggiunto `audience` alla validazione. |
| 5.6 | `error.code === 'ERR_JWT_EXPIRED'` per token scaduti | **CONFERMATO** | Codice di errore documentato nella libreria jose per token con `exp` nel passato. |
| 5.7 | `require('jose')` con CommonJS syntax | **CONFERMATO** | jose supporta sia ESM che CJS. La sintassi `require()` e valida. |

### 6. Anatomia del Token (righe 494-521)

| # | Claim | Verdetto | Dettaglio |
|---|-------|----------|-----------|
| 6.1 | Tabella claims: `iss`, `sub`, `aud`, `exp`, `azp`, `realm_access.roles`, `preferred_username` | **CONFERMATO** | Claims standard OIDC/Keycloak. `azp` (Authorized Party) e `realm_access` sono specifici di Keycloak ma presenti di default. |
| 6.2 | `aud: "account"` come esempio | **CONFERMATO** | In Keycloak, senza audience mapper configurato, l'access token ha `aud: "account"` di default (riferito al built-in account client). |
| 6.3 | ID Token vs Access Token: "ID Token per il frontend, Access Token per il backend" | **CONFERMATO** | Distinzione corretta secondo le specifiche OIDC Core Section 2 e RFC 6749. L'ID Token identifica l'utente per il client, l'access token autorizza l'accesso alle risorse. |
| 6.4 | "Non inviare l'ID Token al backend" | **CONFERMATO** | Best practice OIDC: l'ID Token e destinato al client, non alle resource API. |

### 7. Errori Comuni (righe 440-490)

| # | Claim | Verdetto | Dettaglio |
|---|-------|----------|-----------|
| 7.1 | Redirect URI mismatch — filtro esatto con supporto wildcard `*` | **CONFERMATO** | Keycloak usa prefix matching con `*` in coda. |
| 7.2 | Web origins: `+` usa automaticamente tutte le redirect URI | **CONFERMATO** | Il valore speciale `+` in Web Origins permette tutte le origini derivate dai redirect URI configurati. |
| 7.3 | Access token default: 5 minuti | **CONFERMATO** | Il default di Keycloak per "Access Token Lifespan" e 5 minuti (300 secondi). |
| 7.4 | Refresh token scadenza: "30 minuti di inattivita" | **CONFERMATO** | Il default "SSO Session Idle" in Keycloak e 30 minuti. Dopo 30 minuti senza refresh, la sessione scade. Nota: esiste un margine di ~2 minuti per sincronizzazione cluster. |
| 7.5 | Salvare `code_verifier` in `sessionStorage` (non `localStorage`) | **CONFERMATO** | Best practice: `sessionStorage` e isolato per tab e si cancella alla chiusura, riducendo la superficie di attacco rispetto a `localStorage`. |

### 8. Comandi bash (righe 367-433)

| # | Claim | Verdetto | Dettaglio |
|---|-------|----------|-----------|
| 8.1 | Decodifica JWT: `echo "..." \| cut -d'.' -f2 \| base64 -d 2>/dev/null \| jq` | **ERRORE FATTUALE** | I JWT usano codifica **base64url**, non standard base64. Le differenze: `-` al posto di `+`, `_` al posto di `/`, nessun padding `=`. Il comando mostrato non esegue la conversione base64url->base64 e non aggiunge il padding necessario. Su molti payload funzionera per caso, ma fallira su token con caratteri `-` o `_` o lunghezza non multipla di 4. **Correzione:** il comando dovrebbe essere: `echo "..." \| cut -d'.' -f2 \| tr '_-' '/+' \| base64 -d 2>/dev/null \| jq` oppure con padding: `echo "..." \| cut -d'.' -f2 \| tr '_-' '/+' \| awk '{while(length%4)$0=$0"=";print}' \| base64 -d \| jq` |
| 8.2 | Generazione code_verifier con `openssl rand -base64 32 \| tr -d '=/+' \| head -c 43` | **CONFERMATO** | Genera una stringa URL-safe di 43 caratteri. RFC 7636 richiede 43-128 caratteri con charset `[A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"`. Il risultato e conforme (contiene solo alfanumerici dopo la rimozione di `=`, `/`, `+`). |
| 8.3 | Calcolo code_challenge: `echo -n "$CODE_VERIFIER" \| openssl dgst -sha256 -binary \| base64 \| tr '+/' '-_' \| tr -d '='` | **CONFERMATO** | Corretto: SHA-256 binario, poi base64, poi conversione a base64url rimuovendo il padding. Conforme a RFC 7636 Appendix B. |

### 9. Link e Risorse (righe 539-546)

| # | Claim | Verdetto | Dettaglio |
|---|-------|----------|-----------|
| 9.1 | Link Keycloak docs: `https://www.keycloak.org/docs/latest/server_admin/#_oidc_clients` | **CONFERMATO** | URL valido per la documentazione OIDC clients di Keycloak. |
| 9.2 | Link JS adapter: `https://www.keycloak.org/docs/latest/securing_apps/#_javascript_adapter` | **OUTDATED** | La documentazione del JavaScript adapter e stata spostata a `https://www.keycloak.org/securing-apps/javascript-adapter`. Il vecchio URL potrebbe fare redirect, ma l'URL diretto e preferibile. **Correzione:** aggiornare il link. |
| 9.3 | Link RFC 7636 | **CONFERMATO** | URL corretto per la specifica PKCE. |
| 9.4 | Link OAuth 2.0 Browser-Based Apps: `draft-ietf-oauth-browser-based-apps` | **CONFERMATO** | Draft attivo (ultimo aggiornamento dicembre 2025, draft-26). Non e ancora un RFC, lo status di "draft" e corretto. |
| 9.5 | Link jose GitHub | **CONFERMATO** | URL corretto. |

### 10. Sicurezza generale

| # | Claim | Verdetto | Dettaglio |
|---|-------|----------|-----------|
| 10.1 | Password di test `mario123` e `admin123` | **SECURITY** | Password deboli in chiaro nell'articolo. Accettabile per un tutorial locale, ma va sottolineato che in produzione vanno usate password forti. L'articolo e chiaro sul contesto demo, ma un avvertimento esplicito non farebbe male. |
| 10.2 | `Content-Type: 'application/json'` aggiunto a tutte le richieste nel wrapper `apiFetch` | **BAD PRACTICE** | Il wrapper aggiunge `Content-Type: application/json` anche a richieste GET, dove non ha un body. Non causa errori ma e tecnicamente superfluo e potrebbe confondere in contesti CORS (potrebbe scatenare preflight non necessari). **Suggerimento:** impostare Content-Type solo per richieste con body. |

---

## Riepilogo

| Categoria | Count |
|-----------|-------|
| CONFERMATO | 28 |
| BAD PRACTICE | 3 |
| OUTDATED | 2 |
| ERRORE FATTUALE | 1 |
| SECURITY | 1 |

### Issue da Correggere (priorita alta)

1. **ERRORE FATTUALE (8.1):** Il comando bash per decodificare il JWT non gestisce la codifica base64url. Aggiungere `tr '_-' '/+'` prima di `base64 -d`.

2. **OUTDATED (4.2):** L'affermazione "Senza questo parametro, keycloak-js usa il flusso senza PKCE" e errata per keycloak-js >= 24.0.0 (rilasciato marzo 2024). PKCE S256 e il default. Il parametro `pkceMethod: 'S256'` e ridondante ma non dannoso.

3. **OUTDATED (9.2):** Link al JavaScript adapter punta alla vecchia struttura della documentazione Keycloak.

### Suggerimenti (priorita media)

4. **BAD PRACTICE (3.2):** Aggiungere nota che i wildcard nei redirect URI vanno evitati in produzione.

5. **BAD PRACTICE (5.5):** Menzionare che in produzione andrebbe aggiunta la validazione audience nel middleware JWT.

6. **BAD PRACTICE (10.2):** Il wrapper `apiFetch` dovrebbe impostare `Content-Type` solo per richieste con body.

7. **SECURITY (10.1):** Aggiungere un avvertimento sulle password demo.

---

## Fonti Consultate

| # | URL | Cosa verificato | Takeaway |
|---|-----|-----------------|----------|
| F1 | https://datatracker.ietf.org/doc/html/rfc7636 | Flusso PKCE, metodi code_challenge, sicurezza di plain vs S256 | RFC 7636: plain SHOULD NOT be used; S256 e il metodo raccomandato. code_verifier deve essere 43-128 caratteri. |
| F2 | https://www.keycloak.org/securing-apps/javascript-adapter | API keycloak-js: init options, pkceMethod default, checkLoginIframe | Da keycloak-js 24+, pkceMethod default e `S256`. checkLoginIframe default `true` ma limitato dai browser moderni. |
| F3 | https://github.com/keycloak/keycloak/issues/26411 | Quando PKCE e diventato default in keycloak-js | PR #26412 merged in keycloak-js 24.0.0 (marzo 2024): PKCE S256 abilitato di default. |
| F4 | https://github.com/panva/jose/blob/main/docs/jwt/verify/functions/jwtVerify.md | API jwtVerify, opzioni di validazione | jwtVerify verifica firma e exp automaticamente; issuer/audience solo se configurati nelle opzioni. |
| F5 | https://github.com/panva/jose/blob/main/docs/jwt/verify/interfaces/JWTVerifyOptions.md | Opzioni clockTolerance, audience, issuer | clockTolerance accetta numero (secondi) o stringa. audience non e verificato di default. |
| F6 | https://github.com/panva/jose/blob/main/docs/jwks/remote/functions/createRemoteJWKSet.md | API createRemoteJWKSet | Scarica e cacha JWKS automaticamente con cooldown di 30s tra richieste. |
| F7 | https://github.com/keycloak/keycloak/issues/24851 | Comportamento wildcard in Valid redirect URIs | Keycloak usa prefix matching con `*`. Da Keycloak 22+ il wildcard `*` da solo non e piu accettato. |
| F8 | https://github.com/keycloak/keycloak/issues/25544 | Significato di `+` in Web Origins | `+` in Web Origins permette tutte le origini derivate dai redirect URI configurati. |
| F9 | https://ixday.github.io/post/bash_base64_padding/ | Problemi base64url vs base64 in bash | JWT usa base64url: servono `tr '_-' '/+'` e padding prima di `base64 -d`. |
| F10 | https://gist.github.com/angelo-v/e0208a18d455e2e6ea3c40ad637aac53 | Decodifica JWT da CLI | Approccio corretto include conversione base64url e aggiunta padding. |
| F11 | https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps | Status del draft OAuth Browser-Based Apps | Draft-26 (dicembre 2025), non ancora RFC. Intended status: Best Current Practice. |
| F12 | https://medium.com/@torinks/keycloak-and-aud-claim-usage-as-an-additional-authorization-layer-3e0ab921e569 | Audience claim in Keycloak access token | Default `aud: "account"` senza audience mapper. Va configurato per validazione lato resource server. |
| F13 | https://skycloak.io/blog/session-management-in-keycloak-from-refresh-to-idle-timeouts/ | SSO Session Idle timeout default | Default 30 minuti con margine di ~2 minuti per sincronizzazione cluster. |
| F14 | https://issues.apache.org/jira/browse/AIRAVATA-2507 | Access token lifespan default | Default Keycloak: 5 minuti (300 secondi). |

---

## Punti Aperti

1. **Versione keycloak-js usata nel progetto MockMart:** L'articolo non specifica la versione di keycloak-js. Se il progetto usa una versione < 24.0.0, l'affermazione sul pkceMethod sarebbe corretta. Verificare il `package.json` di MockMart per determinare la versione esatta e adeguare il testo.

2. **Audience validation in produzione:** L'articolo non affronta la configurazione dell'audience mapper in Keycloak. Per un tutorial introduttivo puo essere appropriato, ma per la serie Keycloak sarebbe utile un approfondimento dedicato (magari in un articolo successivo).

3. **Refresh token rotation:** Keycloak supporta refresh token rotation (revocazione del vecchio refresh token ad ogni uso). L'articolo non lo menziona. Per un setup di produzione, e una best practice di sicurezza rilevante.
