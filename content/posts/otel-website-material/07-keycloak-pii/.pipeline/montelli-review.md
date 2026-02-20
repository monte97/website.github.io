# Montelli Style Review — 07-keycloak-pii

**Data review:** 2026-02-20
**Parole:** ~2685
**Score: 5/10**

> **Nota dell'autore nel frontmatter:** *"Mi convince veramente poco, come problematica da analizzare ci sta ma non in questo modo, mi sembra tutto finto"* — questa review conferma e dettaglia le criticita'.

---

## Riepilogo

L'articolo e' tecnicamente corretto e ben strutturato, ma soffre di un problema di fondo: suona artificiale. Le sezioni sembrano una checklist compilata piuttosto che un percorso narrativo. Manca la voce dell'autore — il tono pratico-esperienziale che caratterizza gli altri articoli del blog e' quasi assente.

---

## Violazioni Rilevate

### Tono e Voce

| # | Severita' | Problema | Dettaglio |
|---|-----------|----------|-----------|
| 1 | **MAJOR** | Tono robotico, manca la voce dell'autore | L'intero articolo legge come documentazione tecnica, non come un blog post. Nessun aneddoto, nessuna esperienza personale. Confronta con l'hook di DevContainers ("Quante volte hai sentito...") o Ingress ("Ammettiamolo: tutti abbiamo iniziato cosi"). |
| 2 | **MAJOR** | Assenza quasi totale del "tu" e del "noi" inclusivo | La style guide prescrive "tu" per hook e problemi comuni, "noi" per soluzioni. L'articolo usa quasi esclusivamente costruzioni impersonali anche dove il coinvolgimento diretto sarebbe naturale. |
| 3 | **Minor** | Hook iniziale funzionale ma freddo | "Cosa succede quando abiliti il tracing..." e' una domanda retorica valida, ma manca il momento di connessione personale che caratterizza gli altri articoli. |

### Struttura

| # | Severita' | Problema | Dettaglio |
|---|-----------|----------|-----------|
| 4 | **MAJOR** | Sezione GDPR (retention, access control, Art.17) sproporzionata | Occupa ~1/4 dell'articolo ma resta superficiale su ogni punto. Sembra messa per completezza piuttosto che per reale utilita'. O si approfondisce seriamente o si riduce a un paragrafo con link esterni. |
| 5 | **Minor** | Conclusione debole — lista riepilogativa senza frase di chiusura impattante | La style guide richiede "frase motivazionale finale". La conclusione attuale e' un elenco puntato + tabella, corretto ma piatto. |
| 6 | **Minor** | "Prossimi Passi" dovrebbe essere H2, non una sezione di chiusura sotto-dimensionata | Pattern della style guide: anticipazione articoli successivi con contesto, qui e' solo una lista. |

### Formattazione

| # | Severita' | Problema | Dettaglio |
|---|-----------|----------|-----------|
| 7 | **Minor** | Immagini usano tag `<img>` HTML anziche' sintassi Markdown | La style guide mostra `![alt](imgs/file.png)`. L'articolo usa `<img src="..." width="80%">` in 4 punti. Accettabile per il width, ma rompe il pattern. |
| 8 | **Minor** | Troppe note/blockquote consecutive | Nella sezione setup ci sono 3 blockquote ravvicinate (righe 71, 79, 123). Appesantisce la lettura. |
| 9 | **Minor** | Code block senza linguaggio specificato (riga 30) | Il diagramma architetturale usa ` ``` ` senza `text`. La style guide richiede sempre il linguaggio. |

### Frontmatter

| # | Severita' | Problema | Dettaglio |
|---|-----------|----------|-----------|
| 10 | **MAJOR** | `reviewed: true` ma l'articolo e' `draft: true` con commento negativo dell'autore | Incoerenza: se l'autore stesso dice "mi convince veramente poco", il flag reviewed non dovrebbe essere true. |
| 11 | **Minor** | Campo `comment` non standard nel frontmatter | Non presente nella style guide. Va bene come nota interna, ma da rimuovere prima della pubblicazione. |

### Code Blocks

| # | Severita' | Problema | Dettaglio |
|---|-----------|----------|-----------|
| 12 | **Minor** | Configurazione OTel spezzata in 6 frammenti senza link al file completo | La spiegazione frammentata e' comprensibile, ma manca un riferimento diretto al file completo nel repo per chi vuole copiare la config. |

### Link e Riferimenti

| # | Severita' | Problema | Dettaglio |
|---|-----------|----------|-----------|
| 13 | **Minor** | Manca il pattern repo prominente con emoji puntatore | La style guide mostra il pattern con l'emoji per i link al repo demo. Il link al repository MockMart e' presente ma non evidenziato come negli altri articoli. |

---

## Cosa Funziona

- Struttura tecnica solida: le 4 tecniche di filtering (DELETE/REDACT/HASH/SANITIZE) sono ben spiegate e distinte
- Tabella before/after degli span attributes e' molto efficace
- Code blocks con commenti esplicativi e path file indicato
- Tag in PascalCase coerente
- Description di buona lunghezza per SEO (~150 caratteri)
- Separatori `---` tra sezioni principali usati correttamente
- Checklist per generalizzare l'approccio ad altri servizi e' utile
- Immagini con alt text descrittivi nella sottocartella `imgs/`

---

## Raccomandazioni Prioritarie

1. **Riscrivere con voce autentica** — L'articolo ha bisogno di essere riscritto partendo da un'esperienza reale: "Ho abilitato il tracing su Keycloak e mi sono ritrovato username in chiaro su Grafana". Il problema e' interessante, la presentazione e' sterile.
2. **Tagliare o ripensare la sezione GDPR** — O diventa un articolo a parte, o si riduce a "Considerazioni GDPR" con 1 paragrafo e link esterni. Nella forma attuale e' troppo superficiale per essere utile e troppo lunga per essere un accenno.
3. **Aggiungere momenti di connessione** — "Noi" quando si costruisce la soluzione, "tu" quando si descrive il problema. Almeno 3-4 passaggi diretti nel testo.
4. **Correggere `reviewed: false`** nel frontmatter e rimuovere il campo `comment` non standard.
5. **Convertire `<img>` in sintassi Markdown** o almeno uniformare con il resto del blog.

---

## Verdict

**needs-rework**

L'articolo copre un tema rilevante (PII filtering e' un problema reale e poco documentato), ma nella forma attuale legge come un documento tecnico interno piuttosto che un blog post di montelli.dev. Il gap principale e' nel tono: manca completamente la voce dell'autore. La valutazione dell'autore ("mi sembra tutto finto") e' accurata — l'articolo necessita di una riscrittura sostanziale del tono, non del contenuto tecnico.
