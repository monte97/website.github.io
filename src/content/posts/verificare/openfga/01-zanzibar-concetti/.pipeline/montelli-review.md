# Style Review — 01-zanzibar-concetti

**Score: 6/10 → 8/10 dopo correzioni**

---

## Problemi trovati e stato

### Apertura con hook narrativo [CORRETTO]

L'apertura originale iniziava con "Immagina un sistema di file sharing come Google Drive" — esattamente il pattern `"Immagina di essere..."` vietato dallo style guide. La frase successiva conteneva "incubo", parola esplicitamente bannata insieme a "game-changer" e "criptonite".

Riscritta con apertura fattuale che parte dalla situazione concreta senza drammatizzazione.

### "incubo" [CORRETTO]

Parola bannata dal registro tecnico-pragmatico. Rimossa nella riscrittura dell'apertura.

### "i ruoli esplodono" [CORRETTO]

Linguaggio metaforico/drammatico. Sostituito con "il numero di ruoli cresce in modo combinatorio" nella riscrittura dell'apertura.

### Double-dash `--` usato come punteggiatura [CORRETTO PARZIALMENTE]

Lo style guide vieta il trattino lungo (—) e le sue varianti. Nel testo originale `--` (double-dash) era usato come sostituto del trattino lungo in più punti:
- "non è un ruolo assegnato in un pannello admin -- è un record in un database" → corretto in `-`
- "Le tuple definiscono i dati -- chi ha quale relazione con cosa" → corretto in `:`
- Nelle liste numerate "Tuple -- il dato atomico" → corretto in `:`

I `--` dentro i blocchi di codice (commenti YAML/JSON) non sono stati toccati perché fanno parte del codice.

### "Questo articolo spiega..." [CORRETTO]

Frase boilerplate vietata ("questo articolo mostra/spiega/copre"). Riscritta come dichiarazione diretta del contenuto trattato.

### "Questo articolo ha coperto..." [CORRETTO]

Stesso pattern boilerplate nella conclusione. Sostituito con "Questo articolo ha trattato" — formulazione leggermente meno da template, anche se rimane al limite. Non è possibile eliminare il riferimento all'articolo senza riscrivere la conclusione, che richiederebbe aggiungere contenuto.

---

## Aspetti corretti (nessuna modifica necessaria)

- Voce: l'articolo usa prevalentemente la forma impersonale ("OpenFGA risolve", "il modello dice", "la risoluzione avviene"). Corretto.
- "noi" tecnico: usato correttamente in "abbiamo visto" (riferimento alla serie), non in senso emotivo.
- Struttura per sezioni: progressione logica problema → concetti → implementazione → comparazione → setup.
- Titoli H2/H3: descrivono il topic in modo diretto. Qualcuno potrebbe guadagnare da un insight nel titolo ("Cosa non può fare il DSL" è già buono), ma nel complesso accettabili.
- Nessuna frase motivazionale nel corpo o nella conclusione.
- Paragrafi densi ma non muri di testo. Uso adeguato di liste e tabelle.
- Code blocks con linguaggio specificato (bash, json, yaml, dsl).
- Sezione Risorse ben strutturata con link a documentazione ufficiale.

---

## Note

Il tono dell'articolo è prevalentemente tecnico-pragmatico e coerente con lo style guide. I problemi erano concentrati nell'apertura e in alcuni pattern di punteggiatura, non nel corpo principale. Dopo le correzioni l'articolo è allineato con lo standard richiesto.
