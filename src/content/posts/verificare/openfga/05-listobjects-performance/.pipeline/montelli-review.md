# Style Review — 05-listobjects-performance

**Score: 8/10**

---

## Checklist

| Criterio | Stato | Note |
|----------|-------|------|
| Apertura diretta (no hook emotivi) | OK | Parte dal contesto dell'articolo precedente, nessun hook |
| Voce impersonale | OK | Nessun "tu" diretto per engagement |
| Nessuna frase motivazionale | OK | |
| Problemi come fatti tecnici neutrali | OK | "Non è un problema di OpenFGA in sé: è la natura del problema" — corretto |
| Trattini lunghi (—) assenti | CORRETTO | Un caso `--` trovato e corretto |
| Nessun boilerplate "questo articolo mostra" | OK | |
| Code block con linguaggio | OK | Tutti i blocchi hanno linguaggio specificato |
| Commenti nei code block | OK | Commenti presenti sulle righe non ovvie |
| Link a documentazione ufficiale | OK | Sezione Risorse completa |
| Nessuna drammatizzazione | OK | |

---

## Problemi rilevati

### S1 — Doppio trattino `--` (CORRETTO)

**Posizione**: secondo paragrafo dell'introduzione

**Problema**: "Non sono mutualmente esclusive -- in produzione si usano in combinazione." Il doppio trattino `--` è un trattino lungo non conforme alle regole di stile.

**Correzione applicata**: `--` → `:` (due punti, più puliti nel contesto).

---

### S2 — Commento nel codice Redis usava `--` (CORRETTO indirettamente)

**Posizione**: commento nella funzione `invalidateUser`

Il commento originale "Scan per pattern -- usa con attenzione" è stato riscritto perché il codice è stato corretto (P1). Il nuovo commento non usa `--`.

---

## Punti positivi

**Apertura**: corretta. La prima frase riprende l'articolo precedente e introduce immediatamente il problema, senza hook emotivi o domande retoriche. La struttura è "da dove arrivi" → "il problema residuo" → "le tre strategie" in tre frasi.

**Problem framing nella sezione "Perché ListObjects è costoso"**: ben costruito. Elenca le tre variabili di costo con nomi specifici (fan-out, cardinalità, condivisioni dirette), poi ancora numeri reali (5-15ms vs 200-500ms). La chiusura "La soluzione non è evitare ListObjects. È non chiamarla quando il risultato è già noto." è efficace: contrasto fattuale, nessuna drammatizzazione.

**Tabelle**: usate correttamente per confronti strutturati (TTL consigliati, caching vs pre-materializzazione, scenario vs strategia).

**Sezione "Quale strategia per quale scenario"**: formato corretto. Non generalizza, mappa casi specifici a soluzioni.

**Sezione "Riepilogo"**: asciutta e funzionale. Tre paragrafi, tre strumenti, tre problemi distinti. Nessuna frase motivazionale.

**Coerenza con la serie**: i riferimenti a VaultDrive e agli articoli precedenti sono integrati nel testo, non appendici.

---

## Note minori (non corrette — sotto soglia)

- "Nessuna chiamata HTTP a OpenFGA, nessun grafo da attraversare." (sezione Pre-materializzazione): il tono è leggermente enfatico ma rimane nel registro tecnico-pragmatico. Non richiede intervento.
- Il commento `// Invalida sia l'utente che perde l'accesso sia quello che lo revoca` è tecnicamente discutibile (il chiamante non perde l'accesso: revoca l'accesso altrui). Il commento potrebbe essere più preciso, ma non è un problema di stile rilevante per l'articolo.
