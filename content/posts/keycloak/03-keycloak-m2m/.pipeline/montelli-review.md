# Montelli Style Review — 03-keycloak-m2m

**Data**: 2026-02-20
**Parole**: ~1523
**Struttura**: 8 H2, 7 H3, 0 H4

---

## Punteggio Complessivo: 8/10

Articolo solido, ben strutturato, con progressione logica chiara (problema -> soluzione -> implementazione -> errori comuni). Aderisce bene allo stile montelli.dev. Le violazioni sono quasi tutte minor.

---

## Violazioni

### Frontmatter

| # | Riga | Elemento | Severita | Nota |
|---|------|----------|----------|------|
| 1 | 4 | `description` | **Minor** | 103 caratteri, nel range accettabile ma potrebbe essere piu descrittiva per SEO (target 120-150 car.). Suggerimento: aggiungere il contesto MockMart o "senza utente loggato". |

### Tono e Voce

| # | Sezione | Severita | Nota |
|---|---------|----------|------|
| 2 | Intro (riga 17-19) | **Minor** | L'introduzione e diretta e chiara ma manca un vero **hook con problema concreto o domanda retorica** come da style guide ("Quante volte hai...?", "Ammettiamolo..."). Si entra subito nel contesto senza catturare il lettore. |

### Struttura

| # | Sezione | Severita | Nota |
|---|---------|----------|------|
| 3 | Conclusione | **Major** | Manca una vera sezione di **conclusione/riepilogo**. L'articolo termina con "Checklist" e "Risorse" ma non c'e un paragrafo conclusivo che riepiloghi i punti chiave ne una frase di chiusura impattante, come richiesto dalla style guide. |
| 4 | "Checklist" (riga 406) | **Minor** | La checklist funziona come riepilogo operativo ma non sostituisce una conclusione narrativa. Aggiungere un H2 "Conclusione" o "Riepilogo" prima della checklist. |

### Formattazione

| # | Sezione/Riga | Severita | Nota |
|---|--------------|----------|------|
| 5 | Riga 39-59 | **Minor** | Uso di emoji nei titoli delle soluzioni sbagliate (cross mark). La style guide indica che le emoji vanno limitate a link repo e sezioni risorse. Tuttavia l'uso qui e contestuale e funzionale, quindi e una violazione lieve. |
| 6 | Riga 337 | **Minor** | Emoji warning nei commenti codice. Stesso principio del punto 5, uso accettabile ma non allineato alla regola. |

### Code Blocks

| # | Sezione/Riga | Severita | Nota |
|---|--------------|----------|------|
| 7 | Riga 29-34, 73-85 | **Minor** | Diagrammi ASCII senza language tag `text`. Manca la specifica del linguaggio come richiesto dalla style guide ("Usa `text` per output, diagrammi ASCII, log"). |
| 8 | Riga 158-224 | **Minor** | Il blocco `service-token.js` e di 66 righe, oltre il limite consigliato di 30-40. Considerare di spezzarlo in due blocchi (cache logic + fetch logic) con testo esplicativo tra i due. |
| 9 | Riga 252-316 | **Minor** | Il blocco `auth.js` e di 64 righe, stesso problema del punto 8. |
| 10 | Riga 378-387 | **Minor** | Diagramma trace senza language tag `text`. |

### Link e Riferimenti

| # | Sezione/Riga | Severita | Nota |
|---|--------------|----------|------|
| 11 | Riga 417 | **Minor** | La sezione risorse e presente ma minimale (3 link). Il pattern della style guide include anche bold per il nome della risorsa e formato piu ricco. Attualmente manca il bold sui nomi. Esempio: `* **MockMart**: [Demo E-commerce con OTEL](...)`. |

### Immagini

Nessuna immagine presente nell'articolo. Non e una violazione, ma per un tutorial con UI Keycloak Admin Console (riga 109: "In Keycloak Admin Console -> Clients -> Create"), uno screenshot sarebbe utile per il lettore.

| # | Sezione/Riga | Severita | Nota |
|---|--------------|----------|------|
| 12 | Riga 109 | **Minor** | Manca screenshot della configurazione client in Keycloak Admin Console. La style guide richiede alt text e cartella `imgs/`. |

---

## Riepilogo per Severita

- **Major**: 1 (manca conclusione narrativa)
- **Minor**: 11

---

## Punti di Forza

- Progressione logica eccellente: problema -> soluzioni sbagliate -> soluzione corretta -> implementazione -> errori comuni
- Le "Soluzioni Sbagliate" con anti-pattern sono molto efficaci didatticamente
- Buon uso di tabelle comparative (Authorization Code vs Client Credentials, Quando usare)
- Commenti inline nel codice ben fatti
- Checklist operativa utile
- Sezione "Errori Comuni" con pattern fix chiaro e pratico

---

## Azioni Suggerite

1. **Aggiungere hook nell'introduzione** — domanda retorica o scenario concreto nei primi 2 paragrafi
2. **Aggiungere sezione conclusiva** (H2) prima della checklist con riepilogo narrativo e frase di chiusura
3. **Aggiungere `text` come language tag** ai diagrammi ASCII (righe 29, 73, 378)
4. **Spezzare i code block lunghi** (service-token.js e auth.js) in blocchi piu piccoli con testo intermedio
5. **Formattare la sezione Risorse** con bold sui nomi delle risorse
