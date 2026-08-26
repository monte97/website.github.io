# Tier B — interventi mirati su 9 articoli — Implementation Plan

> **ESEGUITO 2026-08-26**, direttamente in Claude Code e non in delega:
> opencode era bloccato da contesa sulla quota condivisa. Resta aperto un solo
> punto, il Task 2 Step 2, che il piano stesso marca come decisione dell'autore.

> **For agentic workers:** questo piano è pensato per l'esecuzione delegata. Ogni task prescrive **cosa fare su quale riga**, non "migliora l'articolo". Dove serve un giudizio editoriale, il piano lo dice e si ferma.

**Goal:** Portare 9 articoli del Tier B a rispettare la style guide senza riscriverli. Il corpo di questi pezzi funziona: si toccano apertura, chiusura, heading e i difetti puntuali elencati.

**Spec:** `.claude/rules/style-guide.md` — **da leggere per intero prima di cominciare.** Le sezioni che governano questo piano sono la 1 (apertura), la 4 (ponte business), la 5 (heading), la 11 (chiusura) e la 12 (articoli in serie).

**Riferimento di stile:** i 10 articoli del Tier A già riscritti. Prima di scrivere una riga, leggerne almeno due:
- `verificare/observability/dalla-strumentazione-allo-storage/index.md`
- `progettare/kubernetes/02-capi-part2-internals/index.md`

---

## Global Constraints

- **Repo:** `/Users/monte97/Documents/1_AETE/0_Content/website.github.io`. Non fare push, non fare merge.
- **Perimetro:** solo i 9 `index.md` elencati. **I file `index.en.md` sono fuori scope**, tranne dove un task lo dice esplicitamente.
- **Questo NON è un piano di riscrittura.** Il corpo tecnico di questi articoli non si tocca: niente sezioni tagliate, niente contenuto nuovo, niente esempi riscritti. Se un intervento sembra richiedere di riscrivere una sezione, **fermarsi e chiedere.**
- **Vincolo di verità:** vietato introdurre numeri, versioni, tempi o fatti che non siano già nel testo dell'articolo. Il ponte col business si costruisce da quello che c'è, o non si costruisce.
- **`reviewed`:** ogni articolo toccato passa a `reviewed: false`. Non metterlo mai a `human`.
- **`mode`:** ognuno dei 9 va classificato. Solo `explanation` o `how-to` — vedi §0 della style guide.
- **Non toccare** `summary`, `openItems`, `date`, `series`, `seriesOrder`, `tags`, `pillar`, `category`.
- **Titoli e description sono fuori scope**: li tratta il piano `2026-08-26-seo-titoli-description.md`. Non modificarli qui, per non fare due volte lo stesso lavoro in modo divergente.

## Verifica dopo ogni articolo

```bash
python3 scripts/post-facts.py <frammento-del-path>
```

Devono risultare: `mode` valorizzato, 0 marcatori, nessun doppione strutturale, nessuna apertura enciclopedica. La build si lancia **una volta alla fine di ogni task**, non a ogni file:

```bash
npm run build
```

---

## Task 0: I difetti meccanici, su tutti e 9 insieme

Prima degli interventi editoriali, perché sono verificabili e non richiedono giudizio.

- [x] **Step 1: Assegnare il `mode`**

Uno per articolo, subito dopo `category:` nel frontmatter. Criterio §0: `explanation` se il lettore esce con una tesi, `how-to` se esce con un problema risolto.

Assegnazioni proposte, da confermare leggendo l'articolo:

| Articolo | `mode` proposto |
|---|---|
| `progettare/kubernetes/03-capi-part3-talos` | `explanation` |
| `progettare/kubernetes/04-capi-part4-day1` | `how-to` |
| `progettare/keycloak/02-authorization-code-pkce` | `how-to` |
| `progettare/kubernetes/01-article-ingress-k8s` | `how-to` |
| `progettare/vue/micro-frontend-module-federation` | `explanation` |
| `verificare/openfga/01-zanzibar-concetti` | `explanation` |
| `verificare/observability/04-correlation` | `how-to` |
| `automatizzare/devops/pipeline-proxmox-opentofu-ansible` | `explanation` |
| `verificare/testing/03-cicd-strategie-avanzate` | `how-to` |

- [x] **Step 2: Heading in inglese o misti**

Tradurre in italiano, mantenendo i nomi propri di tecnologie. Occorrenze note:

- `03-capi-part3-talos`: `## Best Practices e Considerations`
- `04-capi-part4-day1`: **tutti** gli heading sono in inglese (`Management Cluster Setup`, `Day 1 Readiness Validation`, `Python Generator Setup e Walkthrough`, …)

- [x] **Step 3: `reviewed: false` su tutti e 9**

- [x] **Step 4: Verifica**

```bash
for a in 03-capi-part3-talos 04-capi-part4-day1 02-authorization-code-pkce \
         01-article-ingress-k8s micro-frontend-module-federation 01-zanzibar-concetti \
         04-correlation pipeline-proxmox 03-cicd-strategie; do
  python3 scripts/post-facts.py $a | sed -n '2,4p'
done
```

- [x] **Step 5: Build verde, commit**

---

## Task 1: Le aperture che mancano o sono astratte

**Quattro articoli su nove.** Gli altri cinque hanno già un'apertura problem-first che funziona e **non vanno toccati** — sono elencati in fondo al task perché non li si tocchi per errore.

### 1.1 — `progettare/kubernetes/04-capi-part4-day1`

**Difetto:** l'articolo apre con `*Quarto articolo della serie "Deploy Kubernetes con Cluster API…"*` in corsivo. È un'etichetta di serie, che `SeriesNav` già rende, e non è un'apertura.

**Intervento:** sostituirla con 2-3 paragrafi che aprano sul problema concreto del day 1 — cosa si sta per fare e cosa può andare storto. Poi, se serve, il gancio alla parte precedente (§12: il gancio viene **dopo** il sintomo, mai al posto suo).

Il materiale per l'apertura esiste già nel corpo dell'articolo: la prima sezione è `## Configurazione Proxmox VE`.

### 1.2 — `progettare/kubernetes/03-capi-part3-talos`

**Difetto:** apre in astratto — *«La gestione tradizionale dei sistemi operativi in ambiente Kubernetes presenta numerose sfide: drift di configurazione, surface di attacco estesa…»*. Elenca categorie, non mostra un sintomo.

**Intervento:** rendere concreto il drift di configurazione con un esempio che l'articolo già contiene o implica: due nodi che dovrebbero essere identici e non lo sono, e cosa succede quando te ne accorgi. **Non inventare un incidente:** se nel testo non c'è materiale, riformulare la stessa frase in modo concreto senza aggiungere fatti.

### 1.3 — `verificare/observability/04-correlation`

**Difetto:** l'apertura è accettabile ma generica — *«Chi ha strumentato un'applicazione con OpenTelemetry ha trace e log centralizzati. Resta una domanda pratica…»*.

**Intervento:** minimo. Portare in apertura uno dei tre scenari che l'articolo già tratta (silent failure: il checkout risponde 200 e la notifica non parte) come sintomo di partenza.

### 1.4 — `automatizzare/devops/pipeline-proxmox-opentofu-ansible`

**Difetto:** l'apertura descrive un'architettura (*«Un'applicazione composta da più servizi containerizzati…»*), non un problema. E il primo heading è `## Il contesto`, che è un'etichetta.

**Intervento:** aprire sul costo che la pipeline elimina, ricavandolo dalla sezione `## Il contesto` esistente. Rinominare quell'heading in qualcosa che affermi (§5).

### Da NON toccare

Queste quattro aperture funzionano e rispettano la §1. Lasciarle invariate:

- `progettare/vue/micro-frontend-module-federation` — *«Il primo segnale di allarme non è la lentezza del build: è la riunione settimanale…»*
- `verificare/openfga/01-zanzibar-concetti` — Alice, Bob e la cartella condivisa
- `verificare/testing/03-cicd-strategie-avanzate` — la suite che passa in locale e fallisce in CI
- `progettare/keycloak/02-authorization-code-pkce` — vedi Task 2, ha un problema diverso
- `progettare/kubernetes/01-article-ingress-k8s` — i terminali aperti per ogni `port-forward`

- [x] Build verde, commit

---

## Task 2: `02-authorization-code-pkce` — la forma da documentazione

Trattato a parte perché il difetto è strutturale e non è l'apertura.

**Difetto:** l'articolo apre bene, poi i primi due heading sono `## Obiettivo` e `## Prerequisiti`. È la forma di una pagina di documentazione, non di un articolo.

E la sezione più forte del pezzo — **`## Dove si rompe`**, con cinque guasti reali (redirect URI mismatch, issuer mismatch, CORS, token scaduto senza refresh, PKCE challenge fallito) — sta in fondo, dopo la configurazione e i test.

- [x] **Step 1:** `## Obiettivo` e `## Prerequisiti` si fondono nell'apertura in prosa, o diventano una riga sola. Non restano heading.
- [ ] **Step 2:** valutare se `## Dove si rompe` può salire subito dopo `## Come funziona il login con PKCE`. **Questa è una decisione editoriale: proporla, non applicarla senza conferma.**
- [x] **Step 3:** Build verde, commit

---

## Task 3: Le chiusure

**Sei articoli su nove chiudono male.** Tre non chiudono affatto: finiscono su un comando, un link o una lista.

| Articolo | Come finisce oggi | Cosa serve |
|---|---|---|
| `04-capi-part4-day1` | `kubectl --kubeconfig ... get events` — un comando | una chiusura vera |
| `01-article-ingress-k8s` | *«Ricordare di rimuovere `miodominio.local` dal file hosts»* | la pulizia resta, ma non è la chiusura |
| `pipeline-proxmox-opentofu-ansible` | un elenco puntato di link | chiusura + ponte business |
| `04-correlation` | *«L'auto-instrumentation cattura:»* — **due punti sospesi, il testo si interrompe** | verificare se manca contenuto, poi chiudere |
| `03-cicd-strategie-avanzate` | un elenco numerato dei tre articoli della serie, con *«(questo articolo)»* | via: è un indice, lo fa `SeriesNav` |
| `03-capi-part3-talos` | *«Per approfondimenti consultare la Talos Documentation»* | chiusura + ponte business |

**Nota su `04-correlation`:** i due punti sospesi possono indicare testo perduto in migrazione. **Prima di scrivere una chiusura, verificare nella storia git se quel paragrafo esisteva.** Se esisteva, il compito è recuperarlo, non riscriverlo.

- [x] **Step 1:** per ciascuno dei sei, scrivere una chiusura secondo la §11 — la regola generalizzata, oppure il "cosa fare domani"
- [x] **Step 2:** una sola frase di ponte col business per articolo (§4), costruita **solo** su fatti già presenti nel testo
- [x] **Step 3:** Build verde, commit

### Da NON toccare

`micro-frontend-module-federation` chiude già bene, con il trade-off dichiarato: *«Il costo è la complessità distribuita: invece di un build che fallisce, hai runtime error che dipendono da quale versione del remote è in produzione.»* È un modello, non un problema.

---

## Task 4: `04-correlation` — il doppione strutturale

- [x] **Step 1:** l'articolo ha `## Limiti di Questo Tutorial` nel corpo, mentre il campo `openItems` esiste già nel frontmatter. Secondo la §6, quello che va tolto è **ciò che `openItems` già dice**; quello che richiede una spiegazione può restare come sezione, ma con un titolo che non duplichi il campo.

Confrontare le due liste voce per voce: le sovrapposizioni si eliminano dal corpo, il resto resta e la sezione si rinomina.

- [x] **Step 2:** Build verde, commit

---

## Task 5: Chiusura

- [x] **Step 1:** build completa verde
- [x] **Step 2:** controlli finali

```bash
python3 scripts/post-facts.py | grep -E "mode:—|apertura-enciclopedica|doppione|marcatori"
grep -rn "Struttura dell'articolo\|Da qui in avanti:" src/content/posts --include=index.md
grep -rn -E "^#{1,4} .*[📚🚀✅⚠️🔥]" src/content/posts --include="index*.md"
```

Tutti e tre devono essere vuoti sui 9 articoli di questo piano.

- [x] **Step 3:** report — cosa è stato cambiato per articolo, e **quali interventi sono stati proposti ma non applicati** perché richiedevano una decisione

---

## Fuori scope, dichiarato

- I file `index.en.md`.
- Titoli e `description`: piano SEO separato.
- Il corpo tecnico degli articoli: sezioni, esempi, codice, configurazioni.
- I 46 articoli Tier C e i 10 del Tier A già riscritti.
