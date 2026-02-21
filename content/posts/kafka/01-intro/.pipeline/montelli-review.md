# Style Review — kafka-01-intro

**Score: 8/10**

## Major violations

Nessuna.

## Minor violations

1. **Code block producer lungo (righe 112-158, ~47 righe)** — Supera il limite consigliato di 30-40 righe. Considerare di spezzarlo o ridurre le parti meno rilevanti (es. le costanti `LOCATIONS`, la funzione `randomReading` completa).

2. **Code block consumer lungo (righe 173-224, ~51 righe)** — Stesso problema, supera il limite di 30-40 righe.

3. **Bullet point denso sulla segmentazione (riga 48)** — Il punto elenco sugli indici (`.index`, `.timeindex`) contiene 3+ frasi in un singolo bullet. Potrebbe essere spezzato per maggiore leggibilita.

4. **Tag "Event Streaming" con spazio** — Non e un problema di case, ma di consistenza con tag monoparola. Deviazione minima.

5. **Sezione "Risorse per Approfondire"** — La style guide usa il pattern "Risorse Utili" come nome. Deviazione minima.

6. **Campo frontmatter `reproducibility: true`** — Non documentato nella style guide. Non e una violazione ma un campo extra non standard.

7. **Link alla doc Kafka assente nella sezione replicazione** — Nella sezione dove si discutono `acks`, `min.insync.replicas`, `replica.lag.time.max.ms`, un link diretto alla pagina di configurazione del broker sarebbe utile.

## Frontmatter check

- **Titolo**: "Kafka in Pratica 1: Architettura di un Flusso di Eventi" - 55 caratteri, nel range 50-80. Pattern "Argomento: Sottotitolo" rispettato. OK.
- **Description**: 126 caratteri, nel range 80-150. OK.
- **Tags**: PascalCase rispettato ("Kafka", "Node.js", "Python", "Architettura", "Event Streaming"). 5 tag, nel range 4-9. OK.
- **Categories**: PascalCase rispettato ("Backend", "Tecnologie"). OK.
- **reviewed: false**: Presente e corretto.

## Note positive

- Apertura diretta senza hook emotivi o domande retoriche. Conforme alla guida aggiornata (blog-style-guide).
- Voce impersonale mantenuta in tutto l'articolo. Nessun "tu" per engagement.
- Progressione logica eccellente: contesto/problema, teoria (partizioni, replica), pratica (codice), conclusione, risorse.
- Conclusione tecnica con riepilogo a lista numerata dei 5 punti chiave e anticipazione del prossimo articolo.
- Code blocks con linguaggio specificato e commenti inline.
- Link a documentazione ufficiale inline (kafkajs, confluent-kafka, Apicurio).
- Repo demo con pattern 👉 presente.
- Sezione risorse a fine articolo con link strutturati (libri + articoli/doc).
- Blockquote usato correttamente per nota tecnica (garanzia ordinamento e numero partizioni).
- Separatori `---` tra sezioni principali.
- Nessuna frase motivazionale, nessun hook emotivo, nessuna drammatizzazione.
- Problemi presentati come fatti tecnici neutrali.
