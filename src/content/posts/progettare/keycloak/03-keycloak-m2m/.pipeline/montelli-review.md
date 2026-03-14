# Style Review — Keycloak M2M: Autenticare Servizi Senza Utente

**Score: 6/10 → 8/10 post-correzioni**

---

## Problemi Rilevati e Corretti

### P1 — Frase boilerplate in apertura

**Originale:**
> "Questo articolo mostra come implementare autenticazione machine-to-machine (M2M) con Keycloak, usando il flusso Client Credentials. Vedremo setup, codice e gli errori che tutti fanno."

Pattern esplicitamente vietato dallo style guide (`"Questo articolo mostra..."` = boilerplate, `"gli errori che tutti fanno"` = generalizzazione non supportata).

**Correzione applicata:**
> "L'approccio standard è il flusso **Client Credentials** di OAuth 2.0. Questa guida copre il setup in Keycloak, l'implementazione lato chiamante e lato ricevente, e gli errori più comuni."

---

### P1 — ASCII boxes con `┌┐└┘` (vietati dallo style guide)

Lo style guide vieta esplicitamente i box elaborati con caratteri `┌┐└┘` e prescrive di usare tabelle o flussi ASCII semplici.

Due box corretti:

1. Diagramma scenario (`shop-api → notification-service`) → sostituito con flusso a frecce su singola riga.
2. Diagramma Client Credentials Flow (4 step con box multi-riga) → sostituito con 4 righe a frecce.

---

### P2 — Frase drammatizzante in conclusione

**Originale:**
> "L'autenticazione M2M è uno di quei pezzi che, una volta implementato correttamente, diventa invisibile. Ma se fatto male, diventa il punto debole che espone tutto il sistema."

Tono da "warning drammatico" non allineato con il registro tecnico-pragmatico (fatti neutrali, no drammatizzazione).

**Correzione applicata:**
> "L'autenticazione M2M implementata correttamente diventa un meccanismo trasparente: i servizi si identificano, il token viene validato, la chiamata passa. Implementata male, è un vettore di accesso laterale tra servizi che in rete interna sembrano fidati."

---

## Elementi Positivi

- Apertura (riga 1): diretta, fattuale, parte dallo scenario reale. Nessun hook emotivo.
- Voce impersonale mantenuta in tutto l'articolo. Nessun "tu" diretto per engagement.
- Sezione "Errori Comuni": presentata come fatti tecnici, non come emergenze. Registro corretto.
- Nessun trattino lungo (—) nel corpo dell'articolo.
- Note Keycloak (warning su path `/auth`) usano il quote block correttamente.
- Tabelle usate per confronti (Authorization Code vs Client Credentials, scenari d'uso). Corretto.
- Code block con linguaggio specificato ovunque.

---

## Elementi da Monitorare (non corretti)

- La sezione `### La Domanda` (H3 che contiene solo una domanda tecnica) è borderline. La domanda è tecnica e non retorica, quindi accettabile. Da valutare se eliminare il sottotitolo e incorporare la frase nel paragrafo precedente nella prossima revisione.
- "Vedremo" nella frase corretta (ora "Questa guida copre") è stato rimosso - corretto.
