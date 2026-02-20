# Montelli Style Review

**Articolo**: `eventbus-pinia-migrazione/index.md`
**Data review**: 2026-02-20
**Parole**: ~2119 (nella media)
**Punteggio complessivo**: 8/10

---

## Frontmatter

| Campo | Valore | Conforme | Note |
|-------|--------|----------|------|
| title | 64 char, pattern "Da X a Y: sottotitolo" | OK | |
| description | 142 char | OK | Lunghezza ideale per SEO |
| tags | 5 tag, PascalCase | OK | |
| categories | 1 categoria | OK | |
| reviewed | `true` | **MINOR** | L'articolo e' ancora `draft: true`, il flag `reviewed` dovrebbe essere `false` fino al completamento della pipeline |
| date | formato corretto | OK | |

---

## Tono e Voce

- **Registro**: tecnico-divulgativo, coerente con lo stile del blog (3.5/5 verso il tecnico). OK.
- **Persona**: mix di impersonale e prima persona singolare ("mi hanno convinto", "il caso che ho visto"). Lievemente piu' personale del pattern abituale che preferisce il "noi" inclusivo. Non e' una violazione, ma e' una differenza rispetto agli altri articoli.
- **Approccio**: il "perche'" viene spiegato prima del "come" in ogni pattern. OK.

Nessuna violazione maggiore.

---

## Struttura

| Elemento | Conteggio | Atteso | Conforme |
|----------|-----------|--------|----------|
| H2 | 7 | ~7.5 | OK |
| H3 | 6 | ~9.6 | OK (articolo piu' corto) |
| H4 | 0 | 0-2 | OK |

### Introduzione

- **MINOR**: Manca un hook con domanda retorica nei primi paragrafi. L'apertura e' descrittiva ("Quasi tre anni di manutenzione...") piuttosto che interrogativa. Lo stile guida indica di "Garantire sempre un hook con problema/domanda nei primi 2 paragrafi". Il problema e' descritto bene, ma manca l'aggancio diretto al lettore.

### Corpo

- Progressione logica chiara: problema -> contesto -> pattern concreti. OK.
- Ogni pattern segue lo schema Prima/Dopo. Molto efficace.

### Conclusione

- Riepilogo con lista puntata di lezioni. OK.
- Sezione Risorse Utili presente. OK.
- **MINOR**: Manca una frase di chiusura impattante dopo la lista. L'articolo finisce bruscamente con la sezione Risorse. Lo stile guida indica "Frase motivazionale finale" o "Anticipazione articoli successivi".

---

## Formattazione

### Paragrafi
- Lunghezza 2-4 frasi, una idea per paragrafo. OK.

### Liste
- Bold per termine chiave + spiegazione. OK.
- Quantita' 3-7 elementi. OK.

### Enfasi
- Bold per concetti chiave. OK.
- Code inline per comandi e API. OK.

### Separatori visivi
- **MINOR**: Nessun uso di `---` o `-----` tra sezioni principali. Gli altri articoli li usano frequentemente.

---

## Code Blocks

| Blocco | Linguaggio | Righe | Commenti | Path indicato |
|--------|-----------|-------|----------|---------------|
| 1 | javascript | 10 | No | Si (parziale) |
| 2 | typescript | 18 | No | Si |
| 3 | typescript | 10 | Si (inline) | Si |
| 4 | typescript (inventory) | 74 | Si | Si |
| 5 | typescript | 5 | No | No |
| 6 | javascript | 13 | Si (inline) | Si |
| 7 | typescript (filters) | 24 | Si | Si |
| 8 | typescript (prefs) | 12 | No | Si |
| 9 | vue | 15 | No | No |

- Linguaggio sempre specificato. OK.
- **MAJOR**: Il blocco inventory store (74 righe) supera il limite consigliato di 30-40 righe. Valutare se spezzarlo o ridurlo, oppure linkare al repository demo.
- Commenti presenti nel ~55% dei blocchi (sotto il 70% osservato). **MINOR**.

---

## Link e Riferimenti

- Link a documentazione ufficiale presenti (Pinia, Vue 3 migration, persistedstate). OK.
- Repository demo linkato nell'introduzione. OK.
- **MINOR**: Il repository demo non usa il pattern con emoji (👉) usato negli altri articoli. Non obbligatorio, ma inconsistente.
- Sezione Risorse Utili presente e ben formattata. OK.
- Nessun "clicca qui". OK.

---

## Immagini

Nessuna immagine presente. Non e' necessariamente un problema per un articolo incentrato su pattern di codice, ma un diagramma del flusso EventBus vs Pinia o della strategia di deduplicazione avrebbe aggiunto valore.

**MINOR**: Valutare l'aggiunta di almeno un diagramma ASCII (pattern gia' usato in altri articoli).

---

## Problemi Specifici

### Typo / Formattazione

- **MAJOR**: Spazi mancanti dopo "è" in molte occorrenze. Il carattere `è` appare attaccato alla parola successiva in almeno 15 punti: "èstata", "èin", "Èpossibile", "èvisibile", "èsufficiente", "èestetica", "ègià", "È`refresh()`", "èun", "èintenzionale", "è`pick`", "èun", "èbookkeeping", "èla", "ènoto". Sembra un problema sistematico di encoding o digitazione.

---

## Riepilogo Violazioni

| # | Severita' | Descrizione |
|---|-----------|-------------|
| 1 | **MAJOR** | Spazi mancanti dopo "e'" accentata (~15 occorrenze) |
| 2 | **MAJOR** | Code block inventory store troppo lungo (74 righe, limite 30-40) |
| 3 | MINOR | `reviewed: true` ma articolo ancora in draft |
| 4 | MINOR | Manca hook con domanda retorica nell'introduzione |
| 5 | MINOR | Manca frase di chiusura impattante |
| 6 | MINOR | Nessun separatore visivo (`---`) tra sezioni |
| 7 | MINOR | Commenti nei code block sotto la media (55% vs 70%) |
| 8 | MINOR | Repository demo senza emoji 👉 |
| 9 | MINOR | Nessun diagramma o immagine |

---

## Punteggio: 8/10

Articolo solido, ben strutturato, con pattern concreti e progressione logica chiara. Il tono e' coerente con il blog. I due problemi maggiori sono il bug sistematico degli spazi mancanti dopo "e'" accentata (che va corretto prima della pubblicazione) e il code block troppo lungo. Le violazioni minori sono per lo piu' questioni di coerenza stilistica con gli altri articoli del blog.
