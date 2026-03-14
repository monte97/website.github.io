# Review Summary — 04-gerarchie-query

**Tech score: 7/10 | Style score: 8/10**

---

## Top Issues

**P1 Tech — classificationCache bug:** La cache era un singolo `null` non keyed per `resourceType`. Chiamate successive con tipo diverso restituivano dati sbagliati. Corretto: cache come oggetto indicizzato.

**P1 Tech — getMaxRelation ottimizzazione errata:** Il suggerimento "parti da can_view e sali" descriveva una logica scorretta. Corretto: suggerita esecuzione parallela con `Promise.all`.

**P2 Style — "Questo articolo affronta":** Frase boilerplate che descrive l'articolo invece di stare nel punto del lettore. Corretta: soggetto spostato sul problema tecnico.

**P2 Style — seconda persona implicita:** "devi mostrare", "devi sapere", "la tua applicazione", "Immagina" — quattro occorrenze di voce diretta. Tutte corrette in forma impersonale.

**P2 Style — trattino doppio (`--`):** Usato come punteggiatura nella sezione ListObjects. Corretto con due punti.

---

## Modifiche Applicate

1. Bug cache `classificationCache`: `null` → oggetto keyed per `resourceType`
2. Ottimizzazione `getMaxRelation`: suggerimento errato sostituito con `Promise.all`
3. "Questo articolo affronta" → "Tre problemi emergono"
4. "Immagina questa struttura" → "La struttura in [VaultDrive]" (impersonale)
5. "devi mostrare / tua applicazione / devi sapere" → forma impersonale in tre punti

---

## Note

P2 non corretto: ListObjects senza paginazione esplicita. Richiederebbe aggiunta di contenuto (fuori scope). Segnalato in tech-review.md.
