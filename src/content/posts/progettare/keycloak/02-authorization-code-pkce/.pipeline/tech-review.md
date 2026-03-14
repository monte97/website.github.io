# Tech Review — 02-authorization-code-pkce

**Score: 8/10**

## Correttezza Tecnica

Il flusso Authorization Code + PKCE è descritto correttamente in tutti i suoi passaggi. La spiegazione di `code_verifier`/`code_challenge`, il metodo S256, e la sequenza redirect → code → token è accurata e conforme a RFC 7636.

La validazione JWT con `jose` è implementata correttamente: firma tramite JWKS remoto, verifica issuer, verifica scadenza. Il pattern con `createRemoteJWKSet` e lazy init è appropriato.

## Problemi Rilevati

### P2 — seriesOrder: 20 (probabile typo)
Il frontmatter riportava `seriesOrder: 20` per il secondo articolo della serie. Corretto a `seriesOrder: 2`.

### P2 — clockTolerance a 30s in ambiente di sviluppo
Il valore `clockTolerance: 30` è marcato come "Dev: 30s per comodità" nel commento inline, il che è corretto. Il suggerimento "In produzione usare 5-10s" è presente. Nessuna modifica necessaria, ma va verificato che il valore non sia ereditato in produzione senza override esplicito della variabile d'ambiente.

### P2 — Audience mapper: configurazione assente dalla sezione Keycloak
Il middleware usa `audience: 'shop-api'` e la nota spiega che serve un Audience mapper. Tuttavia, la sezione "Configurazione Keycloak" non include il passaggio per creare il mapper (Client → Mappers → Add mapper → Audience). Un lettore che segue i passi in ordine non avrà il mapper configurato e riceverà 401 inspiegabili. Il blocco informativo nella nota del middleware è sufficiente come workaround documentale, ma sarebbe più chiaro nella sezione di configurazione.

### P2 — Generazione code_verifier: lunghezza effettiva
Il comando `openssl rand -base64 48 | tr -d '=/+' | head -c 128` produce meno di 128 caratteri (48 byte in base64 = 64 caratteri, meno i caratteri rimossi). Il `head -c 128` è quindi inoperativo. Il codice funziona (il verifier sarà ~60 caratteri, ben dentro il range 43-128 richiesto da RFC 7636), ma il commento "43-128 caratteri" potrebbe far credere che si arrivi davvero a 128. Per ottenere 128 caratteri, servirebbe `openssl rand -base64 96`.

## Punti di Forza

- Spiegazione della doppia URL Keycloak (interna vs pubblica) per la validazione issuer: precisa e pratica.
- Sezione "Dove si rompe" con errori reali e fix concreti: ottima per un tutorial pratico.
- Uso corretto di `kc.updateToken(30)` per il refresh proattivo.
- Nota su `checkLoginIframe: false` con indicazione di riabilitarlo in produzione.
- Distinzione ID Token vs Access Token nella sezione JWT.
