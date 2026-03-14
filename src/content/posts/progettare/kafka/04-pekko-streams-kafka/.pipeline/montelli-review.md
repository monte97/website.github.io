# Style Review — 04-pekko-streams-kafka

**Data**: 2026-03-14
**Riferimenti**: blog-style-guide.md, writing-rules/personal.md
**Score IT (pre-fix)**: 8/10 → **post-fix**: 9/10
**Score EN (pre-fix)**: 7/10 → **post-fix**: 9/10

---

## Checklist Stile

### Apertura

- [x] IT: Apertura diretta — inizia con il pattern tecnico (`while(true)` dentro un attore), nessun hook emotivo
- [x] EN: Apertura identica, stessa qualita

### Voce

- [x] IT: Nessun "tu" diretto per engagement emotivo
- [x] EN: Un "you" diretto trovato e corretto (riga 267: "If you upgrade" → "When upgrading")
- [x] IT: Nessuna drammatizzazione o aggettivi come "incubo", "game-changer"
- [x] EN: Stessa assenza di drammatizzazione

### Noi / We

- [x] IT: "abbiamo visto" in conclusione corretto → "I pattern analizzati mostrano come"
- [x] EN: "In this article we have seen how" corretto → "The patterns analyzed show how"
- [x] IT: Uso corretto di "noi tecnico" nel testo ("Nei due servizi in esame sono stati adottati" — forma passiva impersonale)

### Trattini Lunghi (—)

- [x] IT: Nessun em-dash trovato nel testo prosa
- [x] EN: `--` trovato come sostituto em-dash (riga 118) corretto → `:`

### Frasi Boilerplate

- [x] IT: Nessuna frase "questo articolo mostra/spiega/esplora"
- [x] EN: "In this article we have seen" rimossa

### Struttura

- [x] Progressione logica rispettata: problema → separazione responsabilita → Pattern 1 → Pattern 2 → Avro/Registry → Demo → Conclusioni
- [x] Code blocks con linguaggio specificato (scala, bash, text)
- [x] Commenti nei code block per righe non ovvie
- [x] Link a documentazione ufficiale presenti
- [x] Sezione "Risorse Utili" a fine articolo
- [x] Paragrafi densi ma non muri di testo

### Note Aggiuntive

- Le note a blocco citazione (`> **Nota**: ...`) sono usate correttamente per distinguere aspetti production-grade da codice demo
- I titoli delle sezioni comunicano il pattern/tecnica, non solo il topic — in linea con le regole sugli heading
- L'articolo e' centrato sull'esperienza diretta ("Il sistema in esame", "il codice attuale") — in linea con "come ho fatto, non come si fa"

---

## Modifiche Applicate

### index.md (IT)

| Riga | Prima | Dopo | Motivazione |
|------|-------|------|-------------|
| 316 | `In questo caso abbiamo visto come:` | `I pattern analizzati mostrano come:` | "abbiamo visto" e' "noi emotivo" — viola la regola voce impersonale |

### index.en.md (EN)

| Riga | Prima | Dopo | Motivazione |
|------|-------|------|-------------|
| 118 | `is never slowed down -- older data` | `is never slowed down: older data` | `--` come sostituto em-dash — sostituito con `:` per chiarezza e coerenza con style guide |
| 267 | `If you upgrade Apicurio from 2.x to 3.x` | `When upgrading Apicurio from 2.x to 3.x` | "you" diretto — violazione voce impersonale |
| 316 | `In this article we have seen how:` | `The patterns analyzed show how:` | "we have seen" + "this article" — noi emotivo + boilerplate |
