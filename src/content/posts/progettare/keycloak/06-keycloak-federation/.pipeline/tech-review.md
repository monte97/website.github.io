# Tech Review — 06-keycloak-federation

**Score: 8/10**
**Data review: 2026-03-14**

---

## Risultato

Nessun problema P0 o P1. L'articolo e' tecnicamente corretto e completo per lo scopo dichiarato (concettuale/comparativo).

---

## Analisi per sezione

### User Federation

- Corretto: Keycloak esegue un LDAP bind per verificare le credenziali, non le memorizza.
- Corretto: gli attributi vengono importati per default e sincronizzati periodicamente; l'opzione `Import Users = OFF` per interrogare la directory ad ogni richiesta e' menzionata.
- Corretto: la sincronizzazione non e' istantanea - un cambio in AD si riflette dopo la prossima sync.
- Corretto: la scrittura bidirezionale (write-back) e' opzionale e correttamente presentata come tale.

### Identity Brokering

- Corretto: il flusso OIDC Authorization Code e' rappresentato accuratamente (redirect, code, scambio server-to-server).
- Corretto: la nota sul flusso SAML (asserzione via browser POST, no code exchange server-to-server) e' tecnicamente precisa.
- Corretto: il First Broker Login Flow e' descritto con le tre strategie principali (creazione automatica, linking, prompt).
- Corretto: la possibilita' di avere piu' identita' federate sullo stesso `sub` e' accurata.
- Corretto: i protocolli supportati (OIDC, SAML 2.0, Social Login) sono elencati correttamente.

### Tabella comparativa

- Corretto: tutte le colonne sono tecnicamente accurate.
- Nota: "Keycloak tocca le credenziali?" per User Federation e' descritto come "le riceve e le inoltra". Piu' precisamente, Keycloak riceve le credenziali nella propria pagina di login e le usa per eseguire un bind LDAP - non le "inoltra" in senso stretto, ma il concetto e' sufficientemente chiaro per un articolo concettuale.

### Multi-KC broker

- Corretto: lo scenario KC centrale come broker verso KC regionali e' un pattern reale e supportato.

---

## Problemi P2 (miglioramenti non bloccanti)

- P2: non viene menzionato il comportamento con `Sync Mode` (OIDC brokering) introdotto in Keycloak 12+, che controlla quando gli attributi del broker vengono ri-sincronizzati (sempre vs solo al primo login). Rilevante per scenari con attributi che cambiano frequentemente.
- P2: il termine "cookie di sessione Keycloak" non e' esplicitato nel contesto del redirect trasparente con Identity Brokering - il lettore potrebbe non capire perche' il redirect sia a volte invisibile.

---

## Versioni e deprecazioni

Nessun riferimento a versioni specifiche di Keycloak nell'articolo. I link alla documentazione puntano a `/latest/` - corretto per un articolo concettuale che non dipende da versioni specifiche.
