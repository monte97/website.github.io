# Tech Review — Keycloak M2M: Autenticare Servizi Senza Utente

**Score: 7/10**

---

## P1 — Claim name errato: `clientId` vs `client_id`

**File**: `index.md`, middleware `requireServiceAuth`

Il codice originale usava `payload.clientId` per identificare i token di service account Keycloak. In un JWT emesso da Keycloak per un service account, il claim è `client_id` (snake_case), non `clientId` (camelCase). Usare il nome errato rende il check `isServiceAccount` sempre falso, rifiutando tutti i token di service account validi.

**Correzione applicata**: `payload.clientId` → `payload.client_id` nel middleware e nel commento associato.

---

## P1 — URL endpoint nel curl example (Keycloak 17+)

**File**: `index.md`, sezione "Test: Ottenere un Token"

Il curl di esempio usa il path legacy `/auth/realms/...` (Keycloak <= 16). Le versioni 17+ (distribuzione Quarkus, ora l'unica supportata) usano `/realms/...` senza il prefisso `/auth`.

**Stato**: L'articolo ha già una nota `> **Nota:**` che spiega la differenza. La nota è adeguata. Non modificato ulteriormente.

---

## P2 — JWKS singleton senza invalidazione esplicita

Il pattern `getJWKS()` crea un singleton ma non ha logica di invalidazione manuale. Non è un problema in pratica: `jose`'s `createRemoteJWKSet` recupera automaticamente nuove chiavi quando incontra un `kid` sconosciuto. Documentato per chiarezza, non corretto.

---

## Correttezza tecnica generale

- Il pattern di caching con `pendingRequest` per deduplicare richieste concorrenti al token endpoint è corretto.
- Il buffer di 60 secondi (`EXPIRY_BUFFER_SECONDS`) prima della scadenza è una best practice standard.
- La validazione con `jwtVerify` usando `issuer` e `clockTolerance` è corretta.
- La separazione tra check `isServiceAccount` e check `azp` è architetturalmente corretta.
- Il suggerimento di usare roles/scopes invece di `azp` hardcodato per sistemi con più servizi è appropriato e ben contestualizzato.
- RFC 6749 referenziato correttamente.
