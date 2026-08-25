# Review editoriale B2B degli articoli del blog — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portare 20 articoli su 66 da "tutorial" a "contenuto d'autorità" per un lettore Tech Lead / CTO / Senior Engineer, senza introdurre una sola affermazione che non sia già sostenuta dall'articolo o dall'esperienza reale dell'autore.

**Architecture:** Nessun codice nuovo. `summary`/`openItems` (Executive Summary e analisi trade-off) e `PostCTA.astro` (call to action per categoria) esistono già e coprono strutturalmente 3 delle 5 leve editoriali. Il lavoro è puramente sul corpo dell'articolo: apertura, tesi, taglio del materiale enciclopedico, heading, chiusura.

**Tech Stack:** Astro 5 content collections, markdown in `src/content/posts/**/index.md`.

**Spec:** questo documento. Il riferimento normativo è la style guide prodotta dal Task 0.

---

## Global Constraints

- **Repo e branch:** `/Users/monte97/Documents/1_AETE/0_Content/website.github.io`. Branch `feat/review-editoriale-b2b`, creato **da `feat/case-study-section`** (non da `main`: i campi `summary`/`openItems` vivono solo sul branch di case study). Non fare merge, non fare push.
- **Perimetro:** solo i file `src/content/posts/**/index.md` (italiano). I file `index.en.md` sono **fuori scope in questo piano** — 58 articoli hanno il gemello inglese, si riadatta in una passata separata quando l'italiano è definitivo.
- **Vincolo di verità (il più importante):** vietato introdurre numeri, percentuali, tempi, benchmark, nomi di cliente o aneddoti che non compaiano già nel testo o che l'autore non abbia confermato in chat. Dove un numero servirebbe e non c'è, si scrive `[NUMERO DA FORNIRE: <cosa servirebbe>]` e si va avanti. **Omettere è sempre preferibile a inventare.**
- **Niente doppioni strutturali:**
  - **Mai** un box TL;DR nel corpo: c'è `summary` nel frontmatter, renderizzato in cima.
  - **Mai** una sezione "Limiti"/"Cosa non copre" nel corpo: c'è `openItems`. Se un articolo ne ha già una, si fonde nel frontmatter e si toglie dal corpo.
  - **Mai** una CTA nel corpo: c'è `PostCTA.astro`, scelto per `category`. Se serve una variante dedicata, si annota nel report finale e si valuta a parte.
- **Una sola frase di business bridge per articolo**, nella tesi o nella chiusura. Collega la scelta tecnica a velocità del team, riduzione dei guasti o costo infrastrutturale. Più di una diventa marketing.
- **Non toccare il frontmatter** salvo `title` e `description`, e solo quando il Task lo prevede esplicitamente. `summary`, `openItems`, `pillar`, `category`, `tags`, `series`, `seriesOrder`, `date` restano invariati.
- **Non toccare le immagini né i loro path.** Se una sezione che contiene un'immagine viene tagliata, l'immagine va ricollocata, non persa: va segnalata nel commit.
- **La voce resta quella dell'autore.** Questa è una revisione, non una riscrittura di stile. Se un paragrafo funziona, non si tocca.

## Nota operativa — verifica differita

Non lanciare `npm run build` a ogni step: `.astro/` e `dist/` sono condivisi e build concorrenti producono fallimenti fantasma. Durante i task si verifica il YAML del frontmatter:

```bash
python3 -c "import yaml,re,sys; f=sys.argv[1]; yaml.safe_load(re.match(r'^---\n(.*?)\n---', open(f).read(), re.S).group(1)); print('YAML ok:', f)" <file>
```

La build completa si fa **una volta per Task**, alla chiusura del lotto, prima del commit.

---

## I cinque criteri della revisione

Ogni articolo si misura contro questi. Sono la griglia di diagnosi e la checklist di uscita.

| # | Criterio | Cosa significa in concreto |
|---|---|---|
| 1 | **Problem-first** | L'articolo apre su un sintomo di produzione o un collo di bottiglia, non su una definizione. Il primo heading non è mai "Cos'è X". |
| 2 | **Niente hello world** | Nessuna spiegazione propedeutica di tecnologie che il lettore target conosce (Docker, CI/CD, async/await, cos'è un container). Eccezione: nel n.1 di una serie il minimo indispensabile resta, ma compresso e subordinato al problema. |
| 3 | **Opinionated** | C'è una tesi difendibile, e si capisce contro cosa è stata scelta. "X è utile" non è una tesi; "X invece di Y, perché Z" lo è. |
| 4 | **Business bridge** | Una frase collega la scelta tecnica a un effetto organizzativo o economico. Nella tesi o nella chiusura. |
| 5 | **Specificità** | Config, versioni, numeri reali dove esistono. Dove non esistono, il segnaposto `[NUMERO DA FORNIRE: …]`, mai un numero inventato. |

**Il gate:** se un articolo soddisfa già 1-5, si scrive `PASSA` nel report e **non si tocca**. I 46 articoli fuori dai Tier A e B sono già stati giudicati così: non rientrano nel perimetro di questo piano.

---

## File Structure

Nessun file di codice modificato. Un file creato (la style guide), 20 `index.md` modificati.

```
_strategy/writing-rules/blog.md            (vault) — riparare il link morto
2_repo/.../style-guide.md                  (vault) — ricreare, vedi Task 0

src/content/posts/
├── Tier A — ristrutturazione   11 articoli
└── Tier B — interventi mirati   9 articoli
```

---

## Task Right-Sizing

Un task = un lotto tematico coerente. Il Tier A ha un **ciclo di revisione lungo**: per ogni articolo si presenta diagnosi + scaletta dei titoli, l'autore approva o corregge, e **solo dopo** si scrive il testo. Il Tier B si lavora in blocco.

Ogni task finisce con una build verde e un commit.

---

### Task 0: Ricostruire la style guide del blog

Il riferimento normativo di tutto il piano. `_strategy/writing-rules/blog.md` punta a `2_repo/CONTENT/website.github.io/.claude/rules/style-guide.md`, che **non esiste**.

**Files:**
- Create: la style guide, al path a cui punta il vault (o a un path nuovo, aggiornando il puntatore)
- Modify: `_strategy/writing-rules/blog.md` (riparare il link)

- [ ] **Step 1: Leggere integralmente i sei articoli-campione**

Sono i Tier C che già soddisfano tutti e cinque i criteri. La style guide si **deriva da questi**, non si inventa a priori.

```bash
cd /Users/monte97/Documents/1_AETE/0_Content/website.github.io
cat src/content/posts/verificare/testing/mutation-testing-oltre-la-coverage/index.md
cat src/content/posts/progettare/kafka/05-kafka-crash-recovery-strategie/index.md
cat src/content/posts/progettare/keycloak/04-keycloak-e2e/index.md
cat src/content/posts/verificare/observability/05-management/index.md
cat src/content/posts/progettare/system-design/01-errori-produzione/index.md
cat src/content/posts/altro/devcontainer/devcontainer/index.md
```

- [ ] **Step 2: Estrarre i pattern ricorrenti**

Per ciascuno: come apre, dove sta la tesi, come sono formulati gli heading (sono frasi che affermano qualcosa, non etichette), come chiude, che rapporto ha con `summary`/`openItems`.

- [ ] **Step 3: Scrivere la style guide**

Sezioni minime: apertura, tesi, heading, code block, chiusura, rapporto col frontmatter, rapporto con la CTA, cose da evitare (con esempi presi dai Tier A, per contrasto).

- [ ] **Step 4: Riparare il puntatore in `_strategy/writing-rules/blog.md`**

- [ ] **Step 5: Far approvare la style guide all'autore prima di procedere**

**Gate:** nessun Task successivo parte finché la style guide non è approvata.

---

### Task 1: I tre difetti pubblicati

Trenta secondi, indipendenti dalla revisione, visibili adesso in produzione.

**Files:**
- Modify: `src/content/posts/progettare/kubernetes/03-capi-part3-talos/index.md` (riga 664)
- Modify: `src/content/posts/progettare/keycloak/01-keycloak-intro/index.md` (righe 73, 120)

- [ ] **Step 1: Talos — `### 4. Monitoring e Alerting (⚠️ TO BE TESTED ⚠️)`**

La sezione dichiara di sé stessa di non essere verificata. Due esiti leciti: verificarla e togliere il marcatore, oppure tagliare la sezione e spostarne il contenuto in un `openItems`. **Decisione dell'autore**, non dell'esecutore.

- [ ] **Step 2: Keycloak — i due `<!-- TODO: link a … quando importata -->`**

Se le sezioni `theory/` non verranno importate, i commenti vanno cancellati. Se verranno, i link vanno messi ora verso `02-authorization-code-pkce`, che copre già il secondo dei due.

- [ ] **Step 3: Verificare che non ne siano rimasti**

```bash
grep -rn -E "TO BE TESTED|<!-- TODO|TODO:" src/content/posts --include=index.md
```

- [ ] **Step 4: Commit**

---

### Task 2: Tier A, lotto pilota (2 articoli)

I due con la distanza massima tra com'è e come dovrebbe essere. Servono a validare il metodo prima di applicarlo agli altri nove. **Vanno rivisti dall'autore prima di procedere.**

**Files:**
- Modify: `src/content/posts/verificare/testing/01-intro/index.md` (2452 parole)
- Modify: `src/content/posts/automatizzare/docker/docker-internals/index.md` (2108 parole)

Per **ciascuno** dei due, nell'ordine:

- [ ] **Step 1: Leggere l'articolo per intero e annotare i fatti citabili**

In scratch, non nel file: numeri, versioni, comandi, output reali, limiti dichiarati. È l'unico materiale da cui si può pescare.

- [ ] **Step 2: Produrre la diagnosi**

Max 5 punti, ciascuno ancorato a un heading o a una riga. Verdetto contro i cinque criteri.

- [ ] **Step 3: Produrre la nuova scaletta dei titoli**

Titolo dell'articolo, sequenza degli heading, cosa si taglia e dove finisce il materiale tagliato (in `openItems`, in un altro articolo della serie, o via del tutto).

- [ ] **Step 4: Far approvare diagnosi e scaletta all'autore** ← **gate, non procedere senza**

- [ ] **Step 5: Scrivere il testo**

- [ ] **Step 6: Verificare il YAML e che le immagini tagliate siano ricollocate o segnalate**

- [ ] **Step 7: Build verde, commit, e revisione dell'autore sul risultato finale**

**Gate:** se la resa non convince, si rivede il metodo prima del Task 3, non dopo.

Note sui due:

- **`testing/01-intro`** — la forma peggiore del corpus: `## Introduzione` → `### Definizione` → `### Perché misuriamo?` sono appunti da corso. Heading misti IT/EN (`Risks Addressed Through Performance Testing`). Nessuna chiusura. Il materiale su RED e USE è buono e va salvato: è lì la tesi.
- **`docker-internals`** — il 45% iniziale ("Cos'è Docker?", "Caratteristiche Principali", "Casi d'Uso", "Docker vs VM") è enciclopedia. Il contenuto vero — namespace e cgroup con quattro demo eseguibili — è sepolto in fondo e va promosso all'apertura.

---

### Task 3: Tier A, lotto observability (3 articoli)

I tre più enciclopedici della serie. Vanno lavorati insieme perché condividono materiale e rischiano di ripetersi a vicenda: parte del lavoro è **decidere quale dei tre tiene quale contenuto**.

**Files:**
- Modify: `src/content/posts/verificare/observability/01-observability/index.md` (5015 parole — il più lungo del blog)
- Modify: `src/content/posts/verificare/observability/02-opentelenetry/index.md` (2536)
- Modify: `src/content/posts/verificare/observability/03-lgtm/index.md` (2369)

- [ ] **Step 1: Leggere i tre e mappare le sovrapposizioni**
- [ ] **Step 2: Diagnosi + scaletta per tutti e tre, presentate insieme**
- [ ] **Step 3: Approvazione dell'autore** ← **gate**
- [ ] **Step 4: Scrivere**
- [ ] **Step 5: Build verde, commit**

Note:

- **`01-observability`** — "Le Radici dell'Observability: dagli anni '60", "I Tre Pilastri", "Best Practices": zero sintomi di produzione, zero tesi. Candidato al taglio più aggressivo del piano.
- **`02-opentelenetry`** — enciclopedico, più due sezioni che invecchiano male: "Il Futuro di OpenTelemetry" e "AI/ML Workloads (non roadmap prioritaria)". Il contenuto speculativo va tagliato, non aggiornato.
- **`03-lgtm`** — quattro sezioni che descrivono Loki/Tempo/Mimir/Grafana una per una: è la pagina prodotto di Grafana Labs. Serve una decisione al centro (perché LGTM e non altro, e a quale costo).

---

### Task 4: Tier A, lotto Kubernetes/CAPI (3 articoli)

**Files:**
- Modify: `src/content/posts/progettare/kubernetes/01-capi-part1-intro/index.md` (1471)
- Modify: `src/content/posts/progettare/kubernetes/02-capi-part2-internals/index.md` (2345)
- Modify: `src/content/posts/automatizzare/homelab/homelab-n8n/index.md` (2534)

- [ ] **Step 1: Diagnosi + scaletta per tutti e tre**
- [ ] **Step 2: Approvazione dell'autore** ← **gate**
- [ ] **Step 3: Scrivere**
- [ ] **Step 4: Build verde, commit**

Note:

- **`01-capi-part1-intro`** — "Principi Architetturali" + "Vantaggi Operativi" + "Struttura della Serie": forma da slide deck di vendita.
- **`02-capi-part2-internals`** — heading quasi tutti in inglese ("Phase 1: Resource Creation", "Common Debugging Patterns"), nessuna apertura, nessuna chiusura. **Traduzione degli heading inclusa nel task.**
- **`homelab-n8n`** — "Che cos'è OpenTofu?" e "Che cos'è Ansible?" sono hello world dichiarato. Più `## 📚 Risorse Utili`, unico heading con emoji del blog.

---

### Task 5: Tier A, lotto residuo (3 articoli)

**Files:**
- Modify: `src/content/posts/verificare/testing/01-guida-completa-e2e/index.md` (3490)
- Modify: `src/content/posts/progettare/keycloak/01-keycloak-intro/index.md` (1484)
- Modify: `src/content/posts/progettare/kafka/01-intro/index.md` (2533)

- [ ] **Step 1: Diagnosi + scaletta per tutti e tre**
- [ ] **Step 2: Approvazione dell'autore** ← **gate**
- [ ] **Step 3: Scrivere**
- [ ] **Step 4: Build verde, commit**

Note:

- **`01-guida-completa-e2e`** — "I Tre Pilastri Architetturali", "Adozione e Ecosistema", "Percorso di Apprendimento": brochure Playwright.
- **`01-keycloak-intro`** — scaletta già proposta e discussa (titolo *"Il login scritto in casa non è il problema. Il secondo lo è."*, tesi sul codice che non tocca le password, "Come funziona il login" delegato al pezzo 02, business bridge sull'offboarding). Da ripresentare per approvazione formale.
- **`kafka/01-intro`** — il corpo è buono. L'unico intervento vero è tagliare "Deep Dive: `async/await` e il Loop di Produzione", che spiega async/await a un lettore senior. **Intervento chirurgico, non riscrittura.**

---

### Task 6: Tier B — interventi mirati (9 articoli)

Il corpo tiene. Si toccano solo apertura, chiusura e due o tre heading per articolo. Si lavora in blocco, senza il ciclo di approvazione lungo: la revisione dell'autore è sul diff finale.

**Files:**

| File | Intervento |
|---|---|
| `progettare/kubernetes/03-capi-part3-talos/index.md` | oltre al Task 1, apertura e chiusura |
| `progettare/kubernetes/04-capi-part4-day1/index.md` | runbook puro: manca apertura sul problema e chiusura. Heading da tradurre |
| `progettare/keycloak/02-authorization-code-pkce/index.md` | `## Obiettivo` / `## Prerequisiti` è forma da documentazione. Promuovere "Dove si rompe" più in alto |
| `progettare/kubernetes/01-article-ingress-k8s/index.md` | asciugare, togliere "La Magia Dichiarativa" |
| `progettare/vue/micro-frontend-module-federation/index.md` | comprimere "Cos'è Module Federation" |
| `verificare/openfga/01-zanzibar-concetti/index.md` | comprimere la sezione storica "Google Zanzibar" |
| `verificare/observability/04-correlation/index.md` | "Limiti di Questo Tutorial" duplica `openItems`: fondere e togliere dal corpo |
| `automatizzare/devops/pipeline-proxmox-opentofu-ansible/index.md` | "Il contesto" generico; manca il business bridge |
| `verificare/testing/03-cicd-strategie-avanzate/index.md` | chiusura debole |

- [ ] **Step 1: Un passaggio per articolo, nell'ordine della tabella**
- [ ] **Step 2: Verificare che nessun intervento abbia introdotto un doppione di `summary`/`openItems`/CTA**
- [ ] **Step 3: Build verde, commit**

---

### Task 7: Chiusura

- [ ] **Step 1: Build completa verde**

```bash
npm run build
```

- [ ] **Step 2: Grep di controllo sui doppioni strutturali introdotti**

```bash
grep -rn -E "^#{2,3} .*(TL;DR|In sintesi|Limiti di|Cosa non copre)" src/content/posts --include=index.md
grep -rn -E "cal\.com|mailto:francesco" src/content/posts --include=index.md
grep -rn -E "\[NUMERO DA FORNIRE" src/content/posts --include=index.md
```

I primi due devono essere **vuoti**. Il terzo elenca i segnaposto rimasti: vanno risolti con l'autore o tolti prima del merge.

- [ ] **Step 3: Report finale**

Cosa è cambiato per articolo, quali segnaposto restano aperti, e per quali articoli si consiglia una **variante CTA dedicata** in `PostCTA.astro` invece della generica per categoria.

- [ ] **Step 4: Aprire il piano successivo per le versioni EN**

20 articoli, 20 `index.en.md`. Non è traduzione letterale: le regole di adattamento stanno in `_strategy/writing-rules/personal.md`.

---

## Fuori scope, dichiarato

- I 46 articoli Tier C. Sono stati valutati e passano.
- Tutti i file `index.en.md`. Piano separato, dopo.
- Le varianti CTA in `PostCTA.astro`. Si raccolgono come raccomandazione nel Task 7, si decidono a parte.
- La grafica, il layout, i componenti. Questo piano tocca solo testo.
