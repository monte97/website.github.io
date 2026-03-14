# Style Review — 04-gerarchie-query

**Score: 8/10**

Riferimento: blog-style-guide.md (montelli.dev)

---

## Apertura

**Stato: OK.** L'apertura parte dal contesto della serie e dichiara subito il problema tecnico. Non usa hook emotivi né domande retoriche. Il problema è introdotto come fatto tecnico (le gerarchie reali sono più profonde di due livelli).

---

## Voce

### "Immagina questa struttura" — seconda persona diretta

**Posizione:** linea 63 (originale)
**Problema:** "Immagina" è imperativo diretto rivolto al lettore. Viola la regola della voce impersonale.
**Correzione applicata:** "La struttura in [VaultDrive]..." — forma impersonale.

### "Questo articolo affronta tre problemi" — boilerplate

**Posizione:** secondo paragrafo dell'introduzione
**Problema:** Frase che descrive cosa fa l'articolo invece di stare nel punto di vista del lettore. Pattern da evitare secondo lo style guide ("Questo articolo mostra...").
**Correzione applicata:** "Tre problemi emergono quando il modello cresce: ..." — il soggetto diventa il problema tecnico, non l'articolo.

### "Ma quando devi mostrare" / "devi sapere" — "tu" implicito

**Posizione:** sezione ListObjects
**Problema:** "devi" rivolto al lettore è seconda persona implicita.
**Correzione applicata:** "quando occorre mostrare" / "bisogna sapere" — forma impersonale.

### "Ma la tua applicazione ha bisogno" — "tua" diretto

**Posizione:** sezione ListObjects, dopo il primo snippet
**Problema:** "tua applicazione" è seconda persona possessiva per creare engagement.
**Correzione applicata:** "L'applicazione ha però bisogno" — impersonale.

---

## Em-Dash

**Stato: OK.** Nessun em-dash (—) trovato nel testo.

---

## Trattini doppi nel testo

**Posizione:** sezione ListObjects, "la pagina 'I miei documenti', la sidebar con le cartelle -- il problema si inverte"
**Problema:** Uso di `--` (trattino doppio) come punteggiatura. Lo style guide indica trattino singolo `-`.
**Correzione applicata:** Riformulato con due punti: "il problema si inverte:" eliminando i trattini.

---

## Tono e Registro

**Stato: buono.** Il testo è tecnico-pragmatico, nessuna drammatizzazione, nessun superlativo non supportato. I problemi sono presentati come fatti neutri ("è un problema", "il costo cresce"). La sezione "Cosa NON Mettere in OpenFGA" usa il contrasto fattuale correttamente (numero di tuple che esplode = fatto, non emergenza).

---

## Problem Framing e Titoli di Sezione

| Sezione | Valutazione |
|---------|-------------|
| "Gerarchie a N Livelli" | Descrittivo, accettabile |
| "Permessi Come Dati, Non Come Codice" | Buono — insight nel titolo |
| "ListObjects e il Problema WHERE" | Buono — il problema è nominato esplicitamente |
| "Fast Path: Derivare l'Accesso dal Database" | Buono — comunicazione dell'approccio |
| "Cosa NON Mettere in OpenFGA" | Buono — contro-narrativa esplicita |
| "Dynamic Data Masking" | Neutro — solo topic, non insight |
| "Integrazione: Quale Sistema per Quale Domanda" | Buono — framing come domanda concreta |

---

## Conclusione

**Stato: buono.** Il riepilogo è tecnico, in grassetto per i tre concetti chiave, senza frasi motivazionali. L'anticipazione del prossimo articolo è diretta.

---

## Checklist

- [x] Apertura diretta (no hook emotivi)
- [x] Voce impersonale (dopo correzioni)
- [x] Nessuna frase motivazionale
- [x] Problemi come fatti neutrali
- [x] Code blocks con linguaggio e commenti
- [x] Link a documentazione ufficiale
- [x] Nessun em-dash
- [x] Nessun ASCII elaborato con box
