# Montelli Style Review — `05-keycloak-opa/index.md`

**Data review:** 2026-02-20
**Parole:** ~2146
**Punteggio complessivo: 8/10**

---

## Frontmatter

| Check | Esito | Severita |
|-------|-------|----------|
| `title` lunghezza | 82 caratteri — supera il range consigliato 50-80 | Minor |
| `description` lunghezza | 103 caratteri — sotto il target 120-150 | Minor |
| `tags` case | Mix di PascalCase e full-uppercase (`OPA`). Accettabile per acronimi | OK |
| `reviewed: false` | Presente e corretto | OK |
| `parent` presente | Si, `KEYCLOAK` | OK |
| `date` con timezone | Si | OK |

**Violazioni:**
1. **Minor** — `title` leggermente lungo (82 char). Valutare accorciamento, es. "Autorizzazione Granulare con OPA e Keycloak".
2. **Minor** — `description` a 103 char, sotto il target SEO di 120-150. Espandere leggermente.

---

## Tono e Voce

L'articolo usa prevalentemente **costruzioni impersonali** e descrizioni dirette, coerente con lo stile del blog. Non ci sono usi del "tu" o del "noi" inclusivo — il tono e piu asciutto e tecnico rispetto alla media degli articoli analizzati nella style guide.

**Violazioni:**
1. **Minor** — Manca un hook con problema concreto o domanda retorica nei primi paragrafi. L'introduzione parte direttamente con la descrizione del problema ma senza la componente di engagement tipica (domanda retorica, scenario concreto in seconda persona). Lo stile e funzionale ma leggermente sotto il pattern atteso.

---

## Struttura

| Elemento | Conteggio | Media style guide |
|----------|-----------|-------------------|
| H2 | 7 | 7.5 |
| H3 | 9 | 9.6 |
| H4 | 0 | ~0.7 |
| Parole | ~2146 | ~2500 |

La struttura e solida e segue la progressione logica attesa: contesto, teoria, implementazione, test, confronto, conclusione.

**Violazioni:**
1. **Minor** — La "Struttura dell'articolo" esplicita nell'intro (lista numerata righe 26-32) non e un pattern presente negli altri articoli. Non e un problema grave, ma rompe leggermente la coerenza stilistica.

---

## Formattazione

| Check | Esito |
|-------|-------|
| Paragrafi 2-4 frasi | Rispettato |
| Separatori `---` tra sezioni | Presenti, coerente |
| Bold per concetti chiave | Presente e ben usato |
| Code inline per comandi/file | Corretto (`req.user`, `data.json`, `opa.js`, etc.) |
| Tabelle per confronti | Presenti (righe 63-68 e 420-427), ben formattate |
| Liste con bold + spiegazione | Presenti e coerenti |

**Violazioni:** Nessuna.

---

## Code Blocks

| Check | Esito |
|-------|-------|
| Linguaggio specificato | Si su tutti i blocchi (`rego`, `javascript`, `bash`, `json`, `yaml`) eccetto il diagramma architettura |
| Commenti inline | Presenti dove utile |
| Lunghezza < 30-40 righe | Rispettato (blocco piu lungo ~25 righe) |
| Separazione comando/output | Presente nei test bash |
| Path file indicato | Presente dove rilevante (`docker-compose.opa.yml`, struttura directory) |

**Violazioni:**
1. **Minor** — Il diagramma di architettura (righe 43-51) usa un code block senza linguaggio specificato. Dovrebbe usare `` ```text `` come indicato nella style guide per diagrammi ASCII.

---

## Link e Riferimenti

| Check | Esito |
|-------|-------|
| Link a doc ufficiale | Presenti (OPA, Rego, OPA REST API) |
| Testo link descrittivo (no "clicca qui") | Rispettato |
| Sezione Risorse in fondo | Presente e ben strutturata |
| Link repo demo prominente | Presente nella sezione Risorse |

**Violazioni:**
1. **Minor** — Il link al repo demo non e nel formato prominente con emoji usato negli altri articoli (manca il pattern con freccia). Minore, non bloccante.

---

## Immagini

Nessuna immagine presente. Per un articolo di architettura, un diagramma visuale del flusso OPA sarebbe un valore aggiunto, ma non e una violazione dello stile.

---

## Conclusioni dell'articolo

| Check | Esito |
|-------|-------|
| Riepilogo punti chiave | Presente con lista puntata dei 3 pattern |
| Trade-off esplicitato | Si, ben bilanciato |
| Risorse/next steps | Sezione Risorse presente |
| Frase di chiusura impattante | Assente |

**Violazioni:**
1. **Minor** — Manca una frase di chiusura impattante o motivazionale, pattern presente negli altri articoli. La conclusione e funzionale ma si chiude in modo piatto sulla sezione risorse.

---

## Riepilogo Violazioni

| # | Descrizione | Severita |
|---|-------------|----------|
| 1 | Titolo leggermente lungo (82 char vs 50-80) | Minor |
| 2 | Description sotto target SEO (103 vs 120-150 char) | Minor |
| 3 | Manca hook con domanda retorica/scenario concreto nell'intro | Minor |
| 4 | Lista "Struttura dell'articolo" nell'intro non coerente con pattern esistenti | Minor |
| 5 | Code block architettura senza linguaggio (`text`) specificato | Minor |
| 6 | Link repo demo senza formato prominente (freccia) | Minor |
| 7 | Manca frase di chiusura impattante | Minor |

**Nessuna violazione Major.**

---

## Verdetto

Articolo ben scritto, tecnicamente solido e strutturalmente coerente con la style guide. Il tono e leggermente piu asciutto della media ma funzionale al contenuto. Le violazioni sono tutte minori e facilmente risolvibili. La progressione logica, l'uso di tabelle comparative e la testabilita delle policy sono punti di forza.

**Score: 8/10**
