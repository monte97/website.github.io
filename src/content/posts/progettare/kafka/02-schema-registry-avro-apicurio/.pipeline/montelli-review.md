# Style Review — 02-schema-registry-avro-apicurio

**Data review**: 2026-03-14
**Files**: `index.md` (IT), `index.en.md` (EN)
**Riferimenti**: blog-style-guide.md, writing-rules/personal.md

---

## Score

| File | Style score |
|------|-------------|
| `index.md` (IT) | 7/10 → 8.5/10 dopo fix |
| `index.en.md` (EN) | 7/10 → 8.5/10 dopo fix |

---

## Problemi trovati e risolti

### IT — Apertura con hook emotivo / "tu" diretto

**Prima**:
> "Ti è mai capitato di scoprire che un campo aggiunto tre mesi fa da un altro team non è mai arrivato a destinazione?"

La domanda retorica in seconda persona viola il principio di apertura diretta e la regola "Mai tu per engagement emotivo".

**Dopo**:
La frase è rimossa. L'articolo ora apre direttamente con il contesto tecnico ("In un sistema a microservizi con Kafka al centro...").

---

### IT — Frase boilerplate in conclusione

**Prima**:
> "In questo articolo abbiamo visto come passare da JSON senza contratto ad Avro con schema registry:"

Pattern "questo articolo mostra/abbiamo visto" esplicitamente vietato dallo style guide. "Abbiamo" è anche un "noi" emotivo.

**Dopo**:
> "Il percorso da JSON senza contratto ad Avro con schema registry ha coinvolto:"

---

### EN — Apertura con domanda retorica

**Prima**:
> "Have you ever found out that a field added three months ago by another team never actually reached its destination?"

Stessa violazione della versione IT.

**Dopo**: rimossa. L'articolo apre direttamente con il contesto.

---

### EN — "you can browse" (voce diretta)

**Prima**:
> "From there you can browse all registered schemas, view versions, and test compatibility."

Uso di "you" per engagement diretto.

**Dopo**:
> "From there, all registered schemas can be browsed, versions inspected, and compatibility tested."

---

### EN — "we use" in namespace note

**Prima**:
> "In production, we use `c40.telemetry`, `c40.registry`, `c40.usage`."

"We" emotivo/possessivo che implica inclusione del lettore.

**Dopo**:
> "In production, the namespaces are `c40.telemetry`, `c40.registry`, `c40.usage`."

---

### EN — Frase boilerplate in conclusione

**Prima**:
> "In this article we covered how to move from schemaless JSON to Avro with a schema registry:"

Pattern "In this article we covered" equivalente inglese del boilerplate vietato.

**Dopo**:
> "The migration from schemaless JSON to Avro with a schema registry covered:"

---

## Punti già conformi allo style guide

- Struttura progressiva: problema -> scelta -> implementazione -> lezioni apprese -> demo - corretta.
- Titoli H2 dichiarativi e diretti, non generici.
- Tabella comparativa Avro vs JSON Schema ben formattata.
- Code blocks con linguaggio specificato e commenti inline.
- Tono tecnico-pragmatico mantenuto in tutto l'articolo.
- Problemi presentati come fatti neutrali (nessuna drammatizzazione).
- Sezione "Lezioni apprese" basata su esperienza diretta, non consigli generici.
- Trattini lunghi (—) presenti solo all'interno di commenti in code block: non modificati (sono parte del codice, non della prosa).
- Voce impersonale ("si usa", "si sceglie") mantenuta nella maggior parte del testo.
