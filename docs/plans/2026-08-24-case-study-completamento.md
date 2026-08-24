# Completamento della sezione case study — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portare sul sito il case study observability già scritto e anonimizzato, produrre le bozze dei tre case study rimasti, allineare la skill interna, e chiudere con una review di stile su tutti i pezzi.

**Architecture:** Nessun componente nuovo. La sezione `/case-study/` è completa: schema, rotte, elenco filtrabile, figure (`FlowDiagram`, `Decisions`, `SwapFigure`, `MatrixFigure`), gate di pubblicazione. Il lavoro è di contenuto: nuove entry in `src/content/projects/` con `type: case-study`, più una skill da aggiornare e una review da produrre.

**Tech Stack:** Astro 5 content collections, schema Zod in `src/content.config.ts`, Vue 3 per l'elenco filtrabile.

**Spec:** questo documento, più le regole di canale in `/Users/monte97/Documents/1_AETE/0_Content/_strategy/writing-rules/case-study.md`.

## Global Constraints

- **Repo e branch:** `/Users/monte97/Documents/1_AETE/0_Content/website.github.io`, branch `feat/case-study-section`. Non fare merge, non fare push.
- **Non lanciare `npm run build` mentre gira `astro dev`**: condividono lo store in `.astro/` e la build lo corrompe. Se serve buildare, prima `pkill -f "astro dev"`.
- **Il vault** (`/Users/monte97/Documents/1_AETE/0_Content/`) è **sola lettura** per questo piano, con una sola eccezione dichiarata nel Task 3.
- **Un case study è un file singolo** in `src/content/projects/<slug>.md` con `type: case-study`. Nessuna cartella.
- **Zero invenzione sui fatti:** valgono le stesse regole della migrazione degli articoli. Numeri, versioni, tempi, esiti si copiano dalla fonte o si omettono. Un campo assente batte sempre un campo inventato.
- **Anonimizzazione:** ogni case study derivato dal lavoro per un cliente dichiara nel campo `anonimizzazione` cosa è stato omesso e perché. Mai nomi di committenti, fornitori, prodotti, modelli, indirizzi o host.
- **Bozze, non pubblicazioni:** i Task 3 e 4 producono **bozze** che l'autore riscriverà. Non devono essere «pronte da pubblicare», devono essere complete e fedeli alla fonte.
- **Report finale obbligatorio** per ogni task, con l'elenco dei file toccati.

## Riferimento normativo

Prima di iniziare, leggere i tre case study già online, che sono lo standard:

- `src/content/projects/quante-versioni-stai-mantenendo.md` — il più completo: `specs`, `decisions`, `matrix`, `openItems`
- `src/content/projects/il-fornitore-non-ha-una-api.md` — con `flow` e `swap`
- `src/content/projects/tracking-live-mezzi-mobile.md` — con `shots`

E lo schema autorevole dei campi in `src/content.config.ts`, collection `projects`.

---

### Task 1: Portare il case study observability sul sito

La fonte è **già scritta, già anonimizzata e già completa**. Questo task è una trasposizione, non una scrittura: nessuna frase va inventata, nessuna riformulata se non per adattarla al campo che la ospita.

**Files:**
- Create: `src/content/projects/dalla-cecita-alla-traccia.md`
- Read-only: `/Users/monte97/Documents/1_AETE/0_Content/_ideas/sorgenti/observability-case-study/CaseStudyWeb.dc.html`
- Già presenti: `public/img/case-study/observability/{trace-end-to-end,service-graph,metriche-jvm,log-con-trace-id}.png`

- [ ] **Step 1: Leggere la fonte per intero**

```bash
cd /Users/monte97/Documents/1_AETE/0_Content/website.github.io
python3 - <<'EOF'
import re, html
p='/Users/monte97/Documents/1_AETE/0_Content/_ideas/sorgenti/observability-case-study/CaseStudyWeb.dc.html'
s=open(p, encoding='utf-8').read()
t=re.sub(r'<(script|style)[^>]*>.*?</\1>','',s,flags=re.S)
t=re.sub(r'<[^>]+>','\n',t); t=html.unescape(t)
print(re.sub(r'\n\s*\n+','\n',t).strip())
EOF
```

- [ ] **Step 2: Leggere i tre case study di riferimento e lo schema**

```bash
cat src/content/projects/quante-versioni-stai-mantenendo.md
sed -n '/^const projects/,/^});/p' src/content.config.ts
```

- [ ] **Step 3: Creare la entry**

Mappatura dalla fonte ai campi, da rispettare:

| Nella fonte | Nel frontmatter |
|---|---|
| «Case study · osservabilità di un sistema a eventi» | `eyebrow` |
| «Dalla cecità alla traccia: strumentare una pipeline esistente» | `title` |
| La riga su cosa costa aggiungere l'osservabilità | `description` |
| Blocco «Oggetto» | `oggetto` |
| Blocco «Metodo» | `metodo` |
| Blocco «Anonimizzato» | `anonimizzazione` |
| «Percorso del dato» (sorgenti → normalizzazione → arricchimento → API) | `flow` |
| La decisione scelto/scartato sulla propagazione del contesto | `decisions` (una voce) |
| La tabella dei segnali (quattro righe, ognuna con la domanda a cui risponde) | `specs` |
| I capitoli 01-05 | `sections` |
| Le quattro catture | `shots` |
| «Poi il resto: anagrafiche, rapportini, perimetro — pianificati, non ancora in esercizio» | `openItems` |

Valori fissi: `type: case-study`, `pillar: verificare`, `pillarApplied: verificare`, `featured: true`, `weight: 3`.

Le quattro `shots` puntano a `/img/case-study/observability/<nome>.png`. Le didascalie si prendono dalle didascalie della fonte.

Per `thesis`, usare la frase della fonte sulla verifica prima del codice: vale quando l'alternativa è codice permanente nei punti di passaggio.

Il **corpo markdown** è la prosa dei capitoli della fonte, riportata. Non riassumere: la fonte è già della lunghezza giusta.

- [ ] **Step 4: Verificare la build**

```bash
pkill -f "astro dev" 2>/dev/null; sleep 1
npm run build
```
Expected: `[build] ✓ Completed` senza errori Zod.

- [ ] **Step 5: Verificare il rendering**

```bash
grep -c "Dalla cecità" dist/case-study/index.html
ls dist/case-study/dalla-cecita-alla-traccia/
```
Expected: 1 occorrenza nell'elenco, e la cartella di dettaglio esistente.

- [ ] **Step 6: Verificare che nessun nome proprio sia passato**

```bash
grep -riE "committente|nome del fornitore|provider-telematico-[0-9]" src/content/projects/dalla-cecita-alla-traccia.md
```
La fonte usa già segnaposto per i ruoli. Se compare un nome proprio di azienda, prodotto o host, va rimosso.

- [ ] **Step 7: Commit**

```bash
git add src/content/projects/dalla-cecita-alla-traccia.md
git commit -m "content(case-study): dalla cecita alla traccia"
```

---

### Task 2: Aggiornare la skill interna `add-case-study`

La skill descrive il modello vecchio: parla di `/progetti/`, conosce solo `type: project | workshop`, e ignora tutti i campi introdotti dalla sezione case study. Chi la usasse oggi produrrebbe una entry che non compare in `/case-study/`.

**Files:**
- Modify: `.claude/skills/add-case-study/SKILL.md`
- Modify: `CLAUDE.md` (il riferimento alla style guide punta a un file inesistente)

- [ ] **Step 1: Rilevare le divergenze**

```bash
cat .claude/skills/add-case-study/SKILL.md
sed -n '/^const projects/,/^});/p' src/content.config.ts
ls .claude/rules/ 2>/dev/null || echo "rules/ NON esiste"
```

- [ ] **Step 2: Riscrivere la skill sullo schema reale**

Deve coprire: `type: case-study` e la rotta `/case-study/`, i campi documentali (`eyebrow`, `oggetto`, `metodo`, `anonimizzazione`, `sections`, `readingPaths`, `readingNote`, `thesis`), i blocchi (`specs`, `decisions`, `decisionsNote`, `flow`, `matrix`, `swap`, `shots`, `openItems`), e la distinzione fra i tre tipi che convivono nella collection `projects` (`project`, `workshop`, `case-study`).

Aggiungere il richiamo alle regole di canale in `_strategy/writing-rules/case-study.md` del vault, e la nota che i case study derivati da lavoro per clienti richiedono il campo `anonimizzazione` compilato.

- [ ] **Step 3: Correggere il riferimento rotto in CLAUDE.md**

La riga che rimanda a `.claude/rules/style-guide.md` punta a un file che non esiste. Sostituirla con il riferimento alle regole del vault: `_strategy/writing-rules/` (`blog.md`, `case-study.md`, `tone-of-voice.md`). Non inventare il contenuto della style guide mancante: cambiare solo il puntatore.

- [ ] **Step 4: Verificare che nulla si sia rotto**

```bash
pkill -f "astro dev" 2>/dev/null; sleep 1
npm run build
```
Expected: build verde (i file toccati non entrano nella build, la verifica è di non regressione).

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/add-case-study/SKILL.md CLAUDE.md
git commit -m "docs: allinea la skill add-case-study allo schema reale"
```

---

### Task 3: Bozza del case study «Il permesso che il sistema non sapeva pronunciare»

**L'impianto narrativo esiste già** e va seguito: otto battute, dominio sostitutivo, artifici assegnati, affermazioni da tenere vere. Questo task lo trasforma in una entry con una bozza di corpo. **Non è la versione finale**: l'autore la riscriverà.

**Files:**
- Create: `src/content/projects/il-permesso-che-non-sapeva-pronunciare.md`
- Read-only: `/Users/monte97/Documents/1_AETE/0_Content/_ideas/case-study-il-permesso-che-non-sapeva-pronunciare.md`
- Eccezione al vincolo di sola lettura sul vault: a fine task, aggiornare **solo** lo `status` di quella idea da `draft` a `review`.

- [ ] **Step 1: Leggere l'impianto**

```bash
cat "/Users/monte97/Documents/1_AETE/0_Content/_ideas/case-study-il-permesso-che-non-sapeva-pronunciare.md"
```

- [ ] **Step 2: Leggere le regole di canale**

```bash
cat "/Users/monte97/Documents/1_AETE/0_Content/_strategy/writing-rules/case-study.md"
```

- [ ] **Step 3: Creare la entry con frontmatter completo**

`type: case-study`, `pillar: progettare`, `pillarApplied: progettare`, `weight: 4`, `featured: false`.

Il **dominio sostitutivo è obbligatorio** ed è già scelto nell'impianto: piattaforma di gestione cantieri edili. Usare la tabella di terminologia dell'impianto senza uscirne: cantiere, capitolato, ordine di lavoro, amministratore, progettista, operativo, subappaltatore.

`decisions` deve contenere almeno il bivio centrale: replicare il comportamento vecchio dietro un'interfaccia con più implementazioni, contro riscrivere i punti di controllo uno per uno.

`openItems` deve dichiarare che il percorso vecchio è ancora attivo dietro un flag: è il finale dell'impianto, non un difetto da nascondere.

- [ ] **Step 4: Scrivere il corpo seguendo le otto battute**

Una sezione per battuta, nell'ordine dell'impianto. Apertura in media res sulla richiesta di dieci parole. **Le tre affermazioni elencate come da tenere vere nell'impianto restano vere alla lettera.** Chiudere con la nota che dichiara cosa è ricostruito, come negli altri tre case study.

- [ ] **Step 5: Verificare build e assenza di token vietati**

```bash
pkill -f "astro dev" 2>/dev/null; sleep 1
npm run build
grep -riE "ruledesigner|rdwr|webplayer|buildernetcore|deploy2019|192\.168|solid ?edge|siemens" src/content/projects/il-permesso-che-non-sapeva-pronunciare.md
```
Expected: build verde, e **nessuna occorrenza** dei token. Se ne compare uno, il pezzo non va committato: va corretto.

- [ ] **Step 6: Aggiornare lo stato dell'idea nel vault**

Solo il campo `status`, da `draft` a `review`. Nessun'altra modifica al file.

- [ ] **Step 7: Commit**

```bash
git add src/content/projects/il-permesso-che-non-sapeva-pronunciare.md
git commit -m "content(case-study): bozza - il permesso che non sapeva pronunciare"
```

---

### Task 4: Impianto e bozza per i due case study dai repo personali

Queste due proposte sono state validate ma **non hanno un impianto narrativo**. Questo task lo costruisce e produce una bozza.

I repo sono in `/Users/monte97/Documents/3_ET/1_repo/`, in **sola lettura**: `grep`, `cat`, `ls`, `git log`. Non modificare nulla lì dentro.

**Files:**
- Create: `src/content/projects/software-per-chi-non-apre-il-terminale.md`
- Create: `src/content/projects/estrarre-prima-che-scada.md`
- Read-only: `/Users/monte97/Documents/3_ET/1_repo/e57-win-sampler/`, `/Users/monte97/Documents/3_ET/1_repo/matterport-photo-demo/`

- [ ] **Step 1: Leggere le fonti del primo pezzo**

```bash
cd /Users/monte97/Documents/3_ET/1_repo/e57-win-sampler
ls
cat TROUBLESHOOTING.md 2>/dev/null
cat README.md 2>/dev/null
ls *.bat 2>/dev/null && cat *.bat
```

Il tema è: software consegnato a persone che non apriranno mai un terminale. Cercare nelle fonti gli attriti reali incontrati dall'utente non tecnico e le scelte fatte per rimuoverli.

- [ ] **Step 2: Creare la entry del primo pezzo**

`type: case-study`, `pillar: progettare`, `weight: 5`, `featured: false`.
Nessuna anonimizzazione necessaria (repo dell'autore, nessun cliente): il campo `anonimizzazione` dichiara proprio questo.
`decisions` deve contenere almeno un bivio ricavato dalle fonti, con l'alternativa scartata e perché era tentante.
Corpo: 900-1.400 parole. Le strutture portano parte del carico.

- [ ] **Step 3: Leggere le fonti del secondo pezzo**

```bash
cd /Users/monte97/Documents/3_ET/1_repo/matterport-photo-demo
cat README.md 2>/dev/null
cat CLAUDE.md 2>/dev/null
ls docs/ 2>/dev/null
```

Il tema è: estrarre i propri dati da un servizio in abbonamento prima che serva, non quando scade.

- [ ] **Step 4: Creare la entry del secondo pezzo**

`type: case-study`, `pillar: progettare`, `weight: 6`, `featured: false`.

**Vincolo specifico:** il pezzo non deve descrivere come aggirare protezioni o limiti d'uso del fornitore, né nominare il fornitore. Il tema è la **dipendenza da un servizio di terzi** e cosa si decide prima che diventi un problema. In `openItems` va dichiarato che i termini di servizio del fornitore vanno verificati caso per caso e che il pezzo non li interpreta.

- [ ] **Step 5: Verificare build e perimetro**

```bash
cd /Users/monte97/Documents/1_AETE/0_Content/website.github.io
pkill -f "astro dev" 2>/dev/null; sleep 1
npm run build
cd /Users/monte97/Documents/3_ET/1_repo && git -C e57-win-sampler status --porcelain; git -C matterport-photo-demo status --porcelain
```
Expected: build verde, e **output vuoto** da entrambi i `git status`: i repo sorgente non vanno toccati.

- [ ] **Step 6: Commit**

```bash
cd /Users/monte97/Documents/1_AETE/0_Content/website.github.io
git add src/content/projects/
git commit -m "content(case-study): bozze - terminale e dipendenza da SaaS"
```

---

### Task 5: Review di stile su tutti i case study

Produce un **rapporto**, non correzioni. Le modifiche le decide l'autore.

**Files:**
- Create: `docs/reviews/2026-08-24-case-study-stile.md`
- Read-only: tutte le entry `type: case-study` in `src/content/projects/`
- Read-only: le regole nel vault

- [ ] **Step 1: Raccogliere le regole**

```bash
cat "/Users/monte97/Documents/1_AETE/0_Content/_strategy/writing-rules/case-study.md"
cat "/Users/monte97/Documents/1_AETE/0_Content/_strategy/tone-of-voice.md"
cat "/Users/monte97/Documents/1_AETE/0_Content/_strategy/writing-rules/blog.md"
```

- [ ] **Step 2: Raccogliere i pezzi**

```bash
cd /Users/monte97/Documents/1_AETE/0_Content/website.github.io
grep -l "^type: case-study" src/content/projects/*.md
```

- [ ] **Step 3: Valutare ogni pezzo su cinque assi**

Per ognuno, con citazioni testuali:

1. **Voce** — prima persona, registro tecnico-divulgativo, nessun vanto, il cliente esce come chi ha vincoli e non come chi ha sbagliato.
2. **Apertura** — in media res su una scena concreta; nessun «in questo articolo vedremo».
3. **Struttura** — i blocchi (`specs`, `decisions`, figure) portano informazione che la prosa non ripete. Segnalare le ripetizioni fra blocco e corpo.
4. **Confini** — `openItems` presenti, specifici, non generici. Nessun confine valido per qualunque pezzo.
5. **Chiusura** — `thesis` in una riga, memorabile, e coerente con il corpo.

- [ ] **Step 4: Rilevare le divergenze di famiglia**

Confrontare i pezzi fra loro e segnalare: lunghezze molto diverse senza motivo, formule ripetute fra pezzi (è il difetto emerso nella migrazione degli articoli), figure presenti in alcuni e assenti in altri senza ragione, `eyebrow` con forme incoerenti.

- [ ] **Step 5: Scrivere il rapporto**

Struttura: verdetto per pezzo (`solido` / `da ritoccare` / `da riscrivere`), poi i rilievi puntuali con citazione e motivo, poi le divergenze di famiglia, poi le tre correzioni a più alto rendimento.

**Non modificare nessun case study.**

- [ ] **Step 6: Commit**

```bash
git add docs/reviews/
git commit -m "docs: review di stile sui case study"
```

---

## Come si sbaglia questo lavoro

1. **Riscrivere l'observability invece di trasporlo.** La fonte è già buona e già anonimizzata: ogni riformulazione è un rischio senza guadagno.
2. **Inventare fatti nelle bozze.** I Task 3 e 4 partono da impianti e da repo reali: quello che non c'è nella fonte non entra nel pezzo.
3. **Nominare il fornitore SaaS** nel Task 4, o spiegare come aggirarne i limiti.
4. **Consegnare i Task 3 e 4 come se fossero definitivi.** Sono bozze fedeli alla fonte, non pezzi pronti.
5. **Correggere i pezzi durante la review.** Il Task 5 riporta e basta.
6. **Lanciare la build con il dev server acceso.** Corrompe lo store delle content collection e produce diagnosi false.
