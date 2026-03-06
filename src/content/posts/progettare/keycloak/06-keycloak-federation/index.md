---
title: "Keycloak Federation: Integrare Utenti da LDAP, Okta, Google e Altri Identity Provider"
date: 2026-03-06T09:00:00.000Z
description: "Come Keycloak integra identità esterne con due meccanismi distinti: User Federation per directory come LDAP/AD, e Identity Brokering per provider come Okta, Google e altri Keycloak."
pillar: progettare
category: keycloak
tags:
  - Keycloak
  - Federation
  - LDAP
  - Identity Brokering
  - SSO
  - Security
lang: it
draft: true
series: keycloak
seriesOrder: 15
---

In un mondo ideale, tutti gli utenti di un'organizzazione vivono in un unico sistema. Nella realta', non succede quasi mai.

L'azienda ha un Active Directory con migliaia di dipendenti accumulati in quindici anni. Il team marketing vuole che i clienti facciano login con Google. Una business unit in un altro paese usa il proprio Keycloak. Un partner commerciale autentica i propri utenti tramite Okta e deve poter accedere al portale senza creare un nuovo account.

Il risultato e' sempre lo stesso: le identita' sono sparse in sistemi diversi, e serve un punto unico dove le applicazioni possano verificare "chi e' questo utente e cosa puo' fare".

Keycloak risolve questo problema con due meccanismi distinti: **User Federation** e **Identity Brokering**. Sembrano simili — entrambi portano utenti esterni dentro Keycloak — ma funzionano in modo radicalmente diverso. Capire la differenza e' fondamentale per scegliere l'approccio giusto.

---

## Il Problema: Identita' Frammentate

Nell'[articolo introduttivo](../01-keycloak-intro) abbiamo visto come un Identity Provider centralizzato elimini i silos di identita'. Ma c'e' un presupposto implicito: che gli utenti vengano creati dentro Keycloak. In molti scenari reali non e' cosi'.

Considera questa situazione:

```text
+------------------+     +------------------+     +------------------+
|   Active Dir.    |     |     Google       |     |   Okta (Partner) |
|   3000 utenti    |     |   Social Login   |     |   200 utenti     |
|   dipendenti     |     |   clienti        |     |   consulenti     |
+------------------+     +------------------+     +------------------+
        |                        |                        |
        v                        v                        v
+----------------------------------------------------------------+
|                         Keycloak                               |
|          punto unico di autenticazione per le app              |
+----------------------------------------------------------------+
        |                        |                        |
        v                        v                        v
   App Interna              Portale Clienti           Area Partner
```

Tre sorgenti di identita' completamente diverse, tre protocolli diversi, ma le applicazioni devono vedere un unico token JWT con la stessa struttura. Non vogliono sapere se l'utente arriva da LDAP, da Google o da Okta. Vogliono un token firmato da Keycloak, con i claim giusti.

Keycloak raggiunge questo risultato con due strategie complementari. Vediamole.

---

## Strategia 1: User Federation

### Il Concetto

User Federation significa che Keycloak si collega a un **database di utenti esterno** e lo usa come se fosse il proprio. Le credenziali non vengono copiate — ogni login viene delegato al sistema esterno. Gli attributi (nome, email, gruppi), invece, vengono importati nel database locale di Keycloak per default e sincronizzati periodicamente. E' possibile disabilitare l'importazione e interrogare la directory ad ogni richiesta, ma il comportamento standard prevede una cache locale.

Il caso classico e' LDAP/Active Directory: l'organizzazione ha gia' migliaia di utenti in una directory e non ha alcuna intenzione di migrarli. Con la User Federation, Keycloak diventa una "facciata" davanti a quella directory.

### Come Funziona

```text
Utente           Keycloak              LDAP / Active Directory
  |                  |                          |
  |-- login -------->|                          |
  |                  |-- bind (verifica) ------>|
  |                  |<-- credenziali ok -------|
  |                  |-- query attributi ------>|
  |                  |<-- nome, email, gruppi --|
  |                  |                          |
  |                  | [crea sessione locale,   |
  |                  |  emette JWT con claim    |
  |                  |  derivati da LDAP]       |
  |                  |                          |
  |<-- JWT ---------|                          |
```

Il punto chiave: **l'utente fa login su Keycloak**, inserendo le credenziali nella pagina di login di Keycloak. Ma Keycloak non valida quelle credenziali contro il proprio database — le inoltra al sistema esterno. Se LDAP conferma, Keycloak crea una sessione e emette un token JWT come farebbe per qualsiasi utente locale.

Dal punto di vista dell'applicazione, non cambia nulla. Il token JWT e' identico a quello di un utente creato direttamente in Keycloak. La differenza e' tutta dietro le quinte.

### Caratteristiche

- **Le credenziali restano nel sistema esterno.** Keycloak non memorizza la password dell'utente — ogni login la delega alla directory.
- **Attributi sincronizzati.** Nome, email, gruppi, ruoli: Keycloak li importa dalla directory e li mappa nei propri claim. La sincronizzazione avviene al login dell'utente e tramite sync periodiche configurabili. Un cambio di reparto in AD si riflette nel token dopo la prossima sincronizzazione — non istantaneamente.
- **Trasparente per l'utente.** L'utente vede la pagina di login di Keycloak e inserisce le stesse credenziali che usa per la posta aziendale. Non sa (e non deve sapere) che dietro c'e' LDAP.
- **Bidirezionale (opzionale).** Keycloak puo' anche scrivere sulla directory: se un utente si registra tramite Keycloak o cambia password, la modifica puo' propagarsi a LDAP.

### Quando Ha Senso

User Federation e' la scelta giusta quando **si controlla il sistema di identita' esterno** e si vuole che Keycloak lo usi come sorgente di verita' per gli utenti. Lo scenario tipico:

- L'organizzazione ha un Active Directory o un server LDAP esistente con gli utenti
- Non e' possibile o desiderabile migrare gli utenti dentro Keycloak
- Le applicazioni moderne (SPA, microservizi) devono usare token JWT, ma le credenziali devono restare nella directory aziendale

Il punto fondamentale e' che **Keycloak e' l'unica pagina di login**. L'utente non interagisce mai direttamente con LDAP — inserisce le credenziali su Keycloak, che fa il lavoro sporco dietro le quinte.

---

## Strategia 2: Identity Brokering

### Il Concetto

Identity Brokering e' un meccanismo completamente diverso. Invece di collegarsi a un database esterno, Keycloak **delega l'intero processo di login a un altro Identity Provider**. L'utente non inserisce le credenziali su Keycloak: viene reindirizzato al provider esterno, fa login la', e torna indietro con un token o un'asserzione che Keycloak consuma.

In altre parole: con la User Federation, Keycloak chiede "dammi le credenziali e le verifico per te". Con l'Identity Brokering, Keycloak dice "vai a fare login la' e poi torna da me con la prova".

### Come Funziona

```text
Utente           Keycloak              Provider Esterno
  |                  |                  (Google / Okta / altro KC)
  |-- login -------->|                          |
  |                  |                          |
  |<-- redirect al --|                          |
  |   provider ------|                          |
  |                  |                          |
  |-- login diretto sul provider -------------->|
  |<-- authorization code (via redirect) -------|
  |                  |                          |
  |-- callback ----->|                          |
  |                  |-- scambia code --------->|
  |                  |<-- token provider -------|
  |                  |                          |
  |                  | [valida token esterno,   |
  |                  |  mappa utente locale,    |
  |                  |  crea sessione,          |
  |                  |  emette proprio JWT]     |
  |                  |                          |
  |<-- JWT ---------|                          |
```

> Il diagramma mostra il flusso OIDC (Authorization Code). Con SAML, il meccanismo e' diverso: l'asserzione transita direttamente via browser POST, senza lo scambio code-token server-to-server.

La differenza e' visibile dall'esperienza utente: **l'utente vede due pagine di login** (o almeno potenzialmente — se ha gia' una sessione attiva sul provider esterno, il redirect e' trasparente). Prima viene reindirizzato al provider esterno, poi torna su Keycloak.

Keycloak, in questo scenario, non tocca mai le credenziali dell'utente. Riceve un token dal provider esterno (tramite scambio server-to-server nel caso OIDC, o un'asserzione via browser nel caso SAML), lo valida, e crea una rappresentazione locale dell'utente nel proprio database. Da quel momento in poi, emette i propri token JWT, firmati con la propria chiave — esattamente come per qualsiasi altro utente.

### Protocolli Supportati

L'Identity Brokering funziona con diversi protocolli standard:

- **OpenID Connect / OAuth 2.0** — il piu' comune. Google, Okta, Auth0, un altro Keycloak: tutti espongono endpoint OIDC. Keycloak si registra come client presso il provider esterno, e il flusso segue il normale Authorization Code Flow.
- **SAML 2.0** — ancora diffuso in ambito enterprise. Se il partner usa ADFS, Shibboleth, o un IdP SAML, Keycloak funge da Service Provider (verso il provider esterno) e da Identity Provider (verso le proprie applicazioni client), consumando le asserzioni SAML e ri-emettendo token nel proprio formato.
- **Social Login** — Google, GitHub, Facebook, Apple, Microsoft: Keycloak ha connettori preconfigurati che semplificano l'integrazione. Tecnicamente sono casi specifici di OIDC/OAuth2, ma con configurazione semplificata.

### Cosa Succede all'Utente Locale

Quando un utente fa login per la prima volta tramite un broker esterno, Keycloak esegue il **First Broker Login Flow** — un flusso configurabile che decide cosa fare con l'identita' ricevuta. Le strategie principali:

- **Creazione automatica**: Keycloak crea un utente locale con gli attributi ricevuti dal provider esterno (email, nome, ecc.)
- **Collegamento a utente esistente**: se esiste gia' un utente con la stessa email, Keycloak puo' collegare l'identita' esterna a quella locale. L'utente finisce con un account Keycloak che ha piu' "link" a provider diversi
- **Prompt esplicito**: Keycloak puo' chiedere all'utente di confermare il collegamento o di completare la registrazione

Questo significa che un singolo utente Keycloak puo' avere **piu' identita' federate collegate**: fa login con Google dal telefono, con le credenziali aziendali dal laptop, e Keycloak sa che e' la stessa persona. Le applicazioni vedono sempre lo stesso `sub` nel token JWT.

### Esempi Concreti

**Social Login (Google):** il caso piu' semplice. L'utente clicca "Accedi con Google" nella pagina di login di Keycloak, viene reindirizzato a Google, autorizza, e torna. Keycloak riceve il token OIDC di Google, crea (o aggiorna) l'utente locale, e emette il proprio JWT. L'applicazione non sa e non si preoccupa che l'utente abbia usato Google.

**Federazione Enterprise (Okta):** un partner commerciale gestisce i propri utenti in Okta. Invece di creare account duplicati in Keycloak, si configura Okta come Identity Provider esterno. Quando un consulente del partner accede al portale, viene reindirizzato a Okta, fa login con le proprie credenziali aziendali, e torna. Per le applicazioni e' un utente Keycloak come tutti gli altri.

**Multi-Keycloak (KC che fa da broker verso un altro KC):** scenario multi-region o multi-business-unit. Ogni unita' ha il proprio Keycloak con i propri utenti. Un Keycloak centrale funge da broker: quando un utente di un'altra region accede, viene reindirizzato al Keycloak della propria region, fa login, e torna al Keycloak centrale con un token che viene consumato e ri-emesso. Le applicazioni vedono un unico Keycloak e un unico formato di token.

```text
                    +-------------------+
                    |   KC Centrale     |
                    |   (broker)        |
                    +-------------------+
                   /         |          \
                  v          v           v
        +----------+  +----------+  +----------+
        | KC Italy |  | KC Germany|  | KC Spain |
        | 500 users|  | 800 users |  | 300 users|
        +----------+  +----------+  +----------+
```

Ogni KC regionale gestisce i propri utenti. Il KC centrale non duplica nulla: fa brokering verso quello giusto in base al dominio email, alla scelta dell'utente, o a qualsiasi logica di routing configurata.

### Quando Ha Senso

Identity Brokering e' la scelta giusta quando **l'identita' e' gestita da un terzo** e non si ha accesso diretto allo storage delle credenziali. Gli scenari tipici:

- Offrire social login (Google, GitHub, Apple) agli utenti dell'applicazione
- Un partner o un cliente enterprise gestisce i propri utenti in un IdP separato (Okta, Azure AD, ADFS)
- Piu' istanze Keycloak in diverse region/business unit con necessita' di un punto di accesso unificato
- Integrazione con un sistema legacy che parla solo SAML

---

## Federation vs Brokering: Le Differenze

| Aspetto | User Federation | Identity Brokering |
|---|---|---|
| **Dove vivono le credenziali** | Nel sistema esterno (LDAP/AD) | Nel provider esterno (Okta, Google, altro KC) |
| **Chi autentica** | Keycloak valida le credenziali contro il sistema esterno | Il provider esterno autentica direttamente |
| **Pagina di login** | Solo Keycloak | Redirect al provider esterno |
| **L'utente vede** | Una sola pagina di login (Keycloak) | Potenzialmente due (Keycloak + provider) |
| **Protocollo verso l'esterno** | LDAP bind / query | OIDC, SAML, OAuth2 |
| **Utente locale in KC** | Importato per default; facoltativo con Import Users = OFF | Creato al primo login (necessario per la sessione) |
| **Keycloak tocca le credenziali?** | Si' — le riceve e le inoltra | No — vede solo il token/asserzione risultante |
| **Caso d'uso tipico** | Directory aziendale esistente | Social login, partner esterni, multi-IdP |

La regola pratica e' semplice:

- **Controlli lo storage degli utenti** (LDAP, AD, database custom) → **User Federation**
- **L'identita' e' gestita da altri** (Google, Okta, partner) → **Identity Brokering**
- **Servono entrambi** → si combinano nello stesso realm, senza conflitti

---

## Combinare le Due Strategie

Le due strategie non si escludono. In uno scenario enterprise realistico, e' comune trovarle entrambe attive nello stesso realm Keycloak:

```text
+------------------+     +------------------+     +------------------+
|   LDAP Aziendale |     |     Google       |     |   Okta Partner   |
+------------------+     +------------------+     +------------------+
        |                        |                        |
   User Federation         Identity Broker          Identity Broker
        |                        |                        |
        v                        v                        v
+----------------------------------------------------------------+
|                       Realm "produzione"                        |
|                                                                |
|   Dipendenti: credenziali LDAP, login su KC                   |
|   Clienti: login con Google, account locale creato auto        |
|   Consulenti partner: redirect a Okta, account linkato         |
|                                                                |
|   --> Tutte le app ricevono lo stesso JWT                      |
+----------------------------------------------------------------+
```

I dipendenti fanno login con le credenziali LDAP sulla pagina di Keycloak. I clienti cliccano "Accedi con Google" e vengono reindirizzati. I consulenti del partner vengono reindirizzati a Okta. Ma alla fine, l'applicazione riceve sempre un JWT firmato da Keycloak con la stessa struttura, gli stessi claim, lo stesso formato.

Questo e' il valore reale della federation: **Keycloak diventa il punto di convergenza**. Non importa quante sorgenti di identita' esistano — le applicazioni ne vedono una sola.

---

## Conclusione

Keycloak offre due meccanismi per integrare identita' esterne, e la distinzione e' netta:

- **User Federation**: Keycloak si collega a uno storage esterno (LDAP/AD) e lo usa come proprio database utenti. Le credenziali passano attraverso Keycloak.
- **Identity Brokering**: Keycloak delega il login a un provider esterno (Okta, Google, altro KC). Le credenziali non passano mai per Keycloak.

Nella pratica, i due meccanismi si combinano liberamente nello stesso realm. Il risultato e' un singolo punto di autenticazione per tutte le applicazioni, indipendentemente da dove vivono gli utenti.

Nel prossimo articolo della serie passeremo dalla teoria alla pratica: vedremo come implementare il login con Authorization Code Flow e PKCE in un'applicazione reale.

---

**Risorse utili:**
- [Keycloak User Federation](https://www.keycloak.org/docs/latest/server_admin/index.html#_user-storage-federation) — documentazione ufficiale
- [Keycloak Identity Brokering](https://www.keycloak.org/docs/latest/server_admin/index.html#_identity_broker) — documentazione ufficiale
- [LDAP Integration](https://www.keycloak.org/docs/latest/server_admin/index.html#_ldap) — configurazione LDAP/AD
- [OpenID Connect](https://openid.net/connect/) — lo standard dietro il brokering OIDC
