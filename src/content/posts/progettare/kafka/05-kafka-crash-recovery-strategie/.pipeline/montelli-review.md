# Style Review — 05-kafka-crash-recovery-strategie

**Score: 9/10**
**Data review: 2026-03-14**

---

## Valutazione Generale

L'articolo rispetta lo stile del blog in modo solido. Apertura diretta, voce impersonale, problemi presentati come fatti tecnici neutrali. Nessun hook emotivo, nessuna drammatizzazione, nessuna frase motivazionale.

---

## Problemi Trovati

### Corretto — Boilerplate framing nell'introduzione

**Originale (riga 21)**:
> "Questo articolo analizza tre strategie di recovery concrete..."

Violazione della regola: "la prima frase risponde a 'da dove arrivo', non a 'cosa trovero' qui'". La costruzione "Questo articolo analizza" e' framing boilerplate.

**Modifica applicata**:
> "Tre strategie di recovery concrete, estratte da una piattaforma IoT industriale..."

La frase ora dichiara direttamente il contenuto senza metadiscorso sull'articolo.

---

## Conferme di Correttezza

- **Apertura**: diretta, nessuna domanda retorica, nessun hook emotivo. La prima frase ("Un consumer Kafka crasha. Cosa succede ai dati...") e' un'apertura per contrasto fattuale — pattern corretto.
- **Voce**: impersonale. Nessun "tu" diretto, nessun "noi" emotivo.
- **Trattini**: i trattini lunghi (—) nelle liste ("**Nessun graceful shutdown**: ...") seguono il pattern canonico delle liste con bold + due punti, non il trattino inline vietato.
- **Sezione "La regola"**: il sommario in tabella e' efficace e segue la progressione corretta.
- **Limiti dichiarati**: i problemi sono elencati come fatti tecnici neutri, senza drammatizzazione.
- **Codice**: tutti i blocchi hanno linguaggio specificato e commenti per le righe non ovvie.
- **ASCII**: il diagramma del topic/consumer rispetta i vincoli (< 10 righe, caratteri semplici).
- **Sezione Demo e Risorse**: formato corretto con bold + link.
- **Tono**: nessuna frase motivazionale, nessun superlativo, nessuna promessa emotiva.

---

## Osservazioni Minori (non modificate)

- "Da notare la differenza..." (riga 140): costruzione leggermente passiva ma grammaticalmente corretta e non contraria allo stile.
- La sezione "La regola" come H2 funziona bene — il titolo comunica l'insight, non solo il topic.
