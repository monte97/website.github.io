# Style Review — Akka è morto, lunga vita a Pekko

**Score prima delle modifiche: 6/10**
**Score dopo le modifiche: 8/10**
**Data review: 2026-03-14**

---

## Problemi trovati e risolti

### Apertura — framing boilerplate

**Prima:**
> "Questo articolo copre la migrazione pratica da Akka ad Apache Pekko: checklist, gotcha e lezioni dal campo."

"Questo articolo copre..." è esplicitamente nella lista delle frasi boilerplate da evitare (style guide: "questo articolo mostra...").

**Dopo:**
> "Quello che segue è la migrazione pratica da Akka ad Apache Pekko: checklist, gotcha e lezioni dal campo."

---

### Checklist — framing boilerplate

**Prima:**
> "Di seguito la checklist pratica seguita per migrare i servizi Scala da Akka a Pekko."

**Dopo:**
> "La checklist pratica seguita per migrare i servizi Scala da Akka a Pekko."

Rimosso "Di seguito" ridondante con la struttura visiva della sezione.

---

### Ecosistema — trattini lunghi nelle liste

**Prima:**
> "- **Pekko HTTP** (ex Akka HTTP) - server e client HTTP"

I trattini in questo contesto erano corti, non trattini lunghi (—). Sostituiti con due punti per maggiore chiarezza sintattica secondo lo style guide.

**Dopo:**
> "- **Pekko HTTP** (ex Akka HTTP): server e client HTTP"

---

### Conclusioni — framing boilerplate + "abbiamo" emotivo

**Prima:**
> "In questo articolo abbiamo visto come migrare da Akka ad Apache Pekko:"

"In questo articolo abbiamo visto" è doppiamente problematico: framing boilerplate e uso di "abbiamo" in senso emotivo-inclusivo anziché tecnico.

**Dopo:**
> "La migrazione da Akka ad Apache Pekko si articola in quattro punti:"

---

### Conclusioni — trattini lunghi (—)

**Prima:**
> "la maggior parte è un rename meccanico — per tre servizi..."

**Dopo:**
> sostituiti con trattino normale (-)

---

## Problemi non trovati (positivi)

- Apertura: diretta e contestuale, niente hook emotivi o domande retoriche.
- Voce: coerentemente impersonale ("si usa", "viene letta", "servono modifiche"). Nessun "tu" diretto.
- Registro: tecnico-pragmatico. I problemi sono presentati come fatti neutrali.
- Nessuna frase motivazionale.
- Nessuna drammatizzazione.
- Code block con linguaggio specificato ovunque.
- Titoli di sezione informativi, non solo descrittivi del topic.

---

## Punti di forza stilistici

- Il titolo "Akka è morto, lunga vita a Pekko" è efficace: comunica un insight (shift di paradigma), non solo il topic.
- La struttura Checklist + Gotcha è una progressione logica solida.
- Le stime di effort ("mezza giornata", "~50 file") sono dati concreti, non generalizzazioni.
- Il Gotcha 3 su `reference.conf` di terze parti è un contributo originale non ovvio, ben documentato.
