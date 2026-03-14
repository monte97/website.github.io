# Style Review (montelli.dev) — 06-keycloak-federation

**Score pre-correzioni: 5/10**
**Score post-correzioni: 7/10**
**Data review: 2026-03-14**

---

## Problemi rilevati e stato

### P1 — Apertura con hook narrativo (CORRETTO)

**Originale:**
> "In un mondo ideale, tutti gli utenti di un'organizzazione vivono in un unico sistema. Nella realta', non succede quasi mai."

Apertura emotiva/narrativa. Lo style guide richiede un'apertura diretta che dichiari il problema tecnico, non un contrasto idealizzato.

**Corretto con:**
> "In molte organizzazioni le identita' degli utenti sono distribuite su sistemi eterogenei: un Active Directory con migliaia di dipendenti, un provider di social login per i clienti, un IdP esterno per i partner commerciali."

---

### P1 — "tu" diretto / imperativo (CORRETTO)

**Originale:** "Considera questa situazione:"

**Corretto con:** "Uno scenario tipico:"

---

### P1 — Trattini lunghi (—) diffusi (CORRETTI)

Presenti in oltre 10 occorrenze. Tutti sostituiti con `:` o `-` secondo il contesto:
- "Le credenziali non vengono copiate — ogni login..." → ":"
- "Keycloak non valida quelle credenziali — le inoltra..." → ":"
- "si riflette nel token dopo la prossima sincronizzazione — non istantaneamente" → ","
- "un flusso configurabile che decide — ..." → ":"
- Liste protocolli ("OIDC — il piu' comune") → ":"
- Tabella ("Si' — le riceve", "No — vede solo") → "-"
- Link risorse ("documentazione ufficiale") → "-"

---

### P1 — ASCII box elaborati (CORRETTI)

Tre diagrammi con box `+--+` e `|` vietati dallo style guide. Sostituiti con flussi lineari compatti:

**Diagramma sorgenti -> Keycloak -> app:** sostituito con frecce su tre righe.

**Diagramma KC centrale -> KC regionali:** sostituito con albero ASCII semplice (senza box).

**Diagramma realm produzione:** sostituito con tre righe `--[tipo]-->`.

---

### P1 — Frase colloquiale conversazionale (CORRETTA)

**Originale:**
> "con la User Federation, Keycloak chiede 'dammi le credenziali e le verifico per te'. Con l'Identity Brokering, Keycloak dice 'vai a fare login la' e poi torna da me con la prova'."

Registro colloquiale incompatibile con lo stile tecnico-pragmatico.

**Corretto con:** parafrasi tecnica diretta.

---

### P1 — "il lavoro sporco" (CORRETTO)

Espressione colloquiale nella frase su LDAP. Sostituita con "gestisce la comunicazione con la directory".

---

### P1 — Frase boilerplate di transizione (CORRETTA)

**Originale:** "Keycloak raggiunge questo risultato con due strategie complementari. Vediamole."

**Corretto con:** "...descritte nelle sezioni seguenti."

---

## Problemi P2 non corretti (non bloccanti)

- I diagrammi sequence (User Federation e Identity Brokering) usano ancora il formato ASCII a colonne con `|`. Sono tecnicamente nel formato "sequence diagram" che lo style guide tollera per flussi temporali multi-attore, ma potrebbero beneficiare di Mermaid in futuro.
- Il paragrafo "In altre parole:" e' stato riscritto ma la sezione mantiene un tono leggermente piu' narrativo rispetto ad altri articoli della serie.

---

## Elementi positivi (non modificati)

- Struttura in H2/H3 coerente con le convenzioni.
- Tabella comparativa Federation vs Brokering: formato corretto, contenuto chiaro.
- Note tecniche in blockquote per il SAML (formato corretto).
- Conclusione con riepilogo tecnico e anticipazione del prossimo articolo.
- Sezione "Risorse utili" con link alla documentazione ufficiale.
- Nessuna frase motivazionale o drammatizzazione.
