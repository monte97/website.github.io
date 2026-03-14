# Style Review — 02-openfga-keycloak

**Score: 8/10** (post correzioni: 9/10)

---

## Violazioni Trovate

### S1 — Apertura con voce diretta (seconda persona)
**Riga originale 21**: "Hai un identity provider che gestisce utenti, ruoli e login. Hai un authorization engine che decide chi può fare cosa su quale risorsa."

Apertura con "hai" (seconda persona diretta) usata come hook di engagement. Viola la regola di voce impersonale dello style guide. Non è una domanda retorica, ma costruisce artificialmente una situazione del lettore invece di dichiarare un fatto tecnico.

**Fix applicato**: Riscritta in voce impersonale — "Un identity provider gestisce... Un authorization engine decide..."

### S2 — Em-dash in prosa (trattino lungo)
**Riga originale 21**: `— una demo che ho costruito per questa serie`

Lo style guide indica esplicitamente: "Trattino lungo (—) — usare trattino normale (-) o due punti (:)". L'em-dash era in prosa, non in codice.

**Fix applicato**: Sostituito con due punti — "come progetto di riferimento: una demo costruita..."

**Non modificato**: L'em-dash nel commento di codice (`// routes/auth.js — callback dopo il login`) è interno a un code block, non prosa.

### S3 — Double hyphen (`--`) in prosa
**Riga originale 42**: `contiene un campo \`sub\` -- un UUID`

Il `--` non è em-dash ma double hyphen tipografico informale. Nessuno dei due è corretto secondo lo style guide.

**Fix applicato**: Sostituito con singolo trattino `-`.

### S4 — "Mettiamo insieme tutti i pezzi" (noi emotivo)
**Riga originale ~385**: "Mettiamo insieme tutti i pezzi."

"Noi" in senso narrativo/emotivo. Lo style guide distingue "noi" tecnico ("Definiamo le caratteristiche") da "noi" emotivo ("Vogliamo un unico punto d'ingresso"). "Mettiamo insieme i pezzi" è idiomatico e non tecnico.

**Fix applicato**: "Di seguito il flusso completo."

---

## Aspetti Positivi

- **Apertura del problema**: dopo le prime due frasi (corrette nella versione modificata), la struttura è solida. "Il problema non è farli funzionare: è farli parlare senza che uno invada il territorio dell'altro." - tensione costruita con contrasto fattuale, non drammatizzazione.
- **Tabella separazione responsabilità**: formato corretto, conciso, impersonale.
- **Sezione "Quale strategia scegliere"**: tabella comparativa senza superlativo, fatti neutrali.
- **Sezione "Cosa non sincronizzare"**: chiarezza della regola di separazione, nessuna drammatizzazione.
- **Conclusioni**: riepilogo tecnico numerato, nessuna frase motivazionale.
- **ASCII diagrams**: sequence diagrams multi-attore con flusso temporale — consentiti dallo style guide.
- **Code blocks**: tutti con linguaggio specificato, commenti nelle righe non ovvie.
- **Anticipazione prossimo articolo**: breve, fattuale.

---

## Checklist Pre-Pubblicazione

- [x] Apertura diretta (corretta dopo fix)
- [x] Voce impersonale (corretta dopo fix)
- [x] Nessuna frase motivazionale
- [x] Problemi presentati come fatti neutrali
- [x] Code blocks con linguaggio e commenti
- [x] Link a documentazione ufficiale
- [ ] Tags in PascalCase (non verificabile da questo file, dipende dal frontmatter)
- [x] ASCII solo per sequence diagram, nessun box elaborato
