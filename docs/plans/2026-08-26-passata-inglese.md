# Passata inglese — allineare le versioni EN agli articoli riscritti — Implementation Plan

> **For agentic workers:** piano pensato per l'esecuzione delegata, un task per dispatch. Ogni task dice **quali file** e **quale trasformazione**. Dove serve una decisione, il piano si ferma.

**Goal:** Riportare le versioni inglesi in pari con gli articoli italiani riscritti durante la revisione editoriale del 25-26 agosto 2026.

**Spec:** `.claude/rules/style-guide.md` — vale per l'inglese esattamente come per l'italiano, con in più il §13 di questo piano sulla voce EN.

---

## Il quadro, misurato

Non a occhio: dal diff fra `eda63665` (inizio revisione) e `HEAD`.

| Situazione | Articoli | Cosa serve |
|---|---|---|
| **A.** L'italiano è stato riscritto (diff > 100 righe) | 11 | riscrivere l'inglese |
| **B.** Interventi mirati sull'italiano (20-100 righe) | 5 | toccare apertura e chiusura EN |
| **C.** Solo `seoTitle` e `description` cambiati | 24 | allineare il frontmatter EN |
| **D.** Nessuna versione EN esistente | 5 | **decisione, non esecuzione** |

Ritocchi sotto le 20 righe non compaiono: erano rimozioni meccaniche (shortcode Hugo, CTA manuali, crediti Unsplash) **già applicate anche ai file EN** nella stessa passata.

---

## Global Constraints

- **Repo:** `/Users/monte97/Documents/1_AETE/0_Content/website.github.io`. Non fare push, non fare merge, non fare commit.
- **Perimetro:** solo i file `index.en.md`. **Nessun file italiano va toccato**, per nessun motivo. L'italiano è la sorgente di verità.
- **Adattamento, non traduzione.** La struttura e i fatti restano identici; la formulazione deve suonare scritta in inglese, non tradotta.
- **Vincolo di verità:** nessun numero, versione, comando o fatto che non sia nell'articolo italiano corrispondente. Se l'italiano non lo dice, l'inglese non lo inventa.
- **Il codice non si traduce.** Blocchi di codice, comandi, nomi di file, chiavi YAML e output restano identici all'italiano. Si traducono **i commenti dentro il codice** solo se erano in italiano.
- **Non accorciare per "adattare".** Se l'italiano ha 1400 parole, l'inglese ne ha circa 1400.
- `reviewed: false` su ogni file EN toccato. Mai `human`.
- Il `mode`, il `series`, il `seriesOrder` e la `date` dell'EN devono coincidere con quelli dell'italiano.

## Verifica

```bash
python3 scripts/post-facts.py <frammento>    # mostra il drift EN/IT sugli heading
npm run build                                 # una volta a fine task
```

Il campo **`versione EN`** in fondo alla scheda dice quanti heading ha l'inglese e il drift rispetto all'italiano. **A fine lavoro il drift di ogni articolo toccato deve essere 0**, perché la struttura è la stessa.

---

## §13 — La voce inglese di questo blog

Non è una regola inventata: è ricavata dagli articoli EN che già funzionano. Leggerne uno prima di scrivere:

- `progettare/kafka/05-kafka-crash-recovery-strategie/index.en.md`
- `progettare/keycloak/04-keycloak-e2e/index.en.md`

**Cosa fanno bene.** Sono fedeli nella struttura e idiomatici nella formulazione:

| Italiano | Inglese |
|---|---|
| «è uno scenario comune» | «is a familiar story» — non «is a common scenario» |
| «La risposta non dipende da Kafka, ma dal tipo di stato» | «The answer does not depend on Kafka — it depends on the type of state» |

**Le regole:**

1. **Stessa voce.** Prima persona dove l'italiano la usa, stessa diretteza, stessa presa di posizione. Un articolo opinionated in italiano resta opinionated in inglese.
2. **Stessa struttura.** Stessi heading, stesso ordine, stesso numero di sezioni. Gli heading si traducono, non si riorganizzano.
3. **Niente registro da blog aziendale.** Vietati: *"In this article we will explore…"*, *"It is worth noting that…"*, *"Let's dive into…"*, *"In today's fast-paced world…"*.
4. **I termini tecnici restano in inglese**, che è la loro lingua: `tail sampling`, `configuration drift`, `Page Object Model`. In italiano erano già così.
5. **I link interni puntano alla versione inglese quando esiste**, all'italiana quando non esiste. Non si inventano URL: si controlla che il file `index.en.md` di destinazione esista.

---

## Task 1: I 24 frontmatter da allineare — **il più semplice, da fare per primo**

Gli articoli il cui italiano ha cambiato solo `seoTitle` e `description`. Il corpo inglese va bene com'è: manca solo il `seoTitle` sul lato EN, e la `description` inglese va verificata contro il range.

**File** (tutti `index.en.md` sotto `src/content/posts/`):

```
altro/devcontainer/devcontainer
altro/web-development/01-eventbus-pinia-migrazione
altro/web-development/02-openlayers-vue3-composables
altro/web-development/03-vue3-dry-patterns
automatizzare/developer-tools/ridurre-token-ai-coding-rtk-tokensave
progettare/kafka/02-schema-registry-avro-apicurio
progettare/kafka/03-akka-pekko-migrazione
progettare/kafka/04-pekko-streams-kafka
progettare/kafka/05-kafka-crash-recovery-strategie
progettare/keycloak/03-keycloak-m2m
progettare/keycloak/04-keycloak-e2e
progettare/keycloak/06-keycloak-federation
progettare/system-design/01-errori-produzione
progettare/system-design/03-compilatore-state-machine
progettare/vue/micro-frontend-module-federation
verificare/observability/08-console-to-grafana
verificare/testing/01-unit-test-nuxt3-logica-pura
verificare/testing/02-mock-traps-python-flask
verificare/testing/04-network-mocking
verificare/testing/05-network-mocking-avanzato
verificare/testing/06-visual-regression
verificare/testing/07-flaky-debugging
verificare/testing/08-authentication-testing
verificare/testing/09-page-object-model
```

- [ ] **Step 1: `seoTitle` in inglese**

Stesso meccanismo dell'italiano: `<title>{seoTitle ?? title} | montelli.dev</title>`, budget **45 caratteri**.

Il `seoTitle` inglese **non è la traduzione di quello italiano**: è scritto per chi cerca in inglese. Il termine cercabile resta lo stesso (è un nome di tecnologia), cambia il resto.

Esempio, dall'italiano già scritto:

```yaml
# IT
seoTitle: "Playwright: mock di rete con page.route"
# EN
seoTitle: "Playwright: network mocking with page.route"
```

Va aggiunto solo dove il `title` inglese supera i 45 caratteri.

- [ ] **Step 2: `description` inglese nel range 120-160**

Verificare ognuna. Le lunghe si accorciano, le corte si allungano con un fatto già presente **nell'articolo inglese**.

- [ ] **Step 3: Verifica**

```bash
python3 scripts/post-facts.py | grep '!'    # deve restare vuoto
npm run build
```

`post-facts.py` legge solo i file italiani: per l'inglese la verifica sul budget va fatta contando i caratteri.

---

## Task 2: I 5 interventi mirati

L'italiano ha cambiato apertura, chiusura o una sezione. L'inglese va toccato **negli stessi punti e solo lì**.

Per ciascuno: leggere il diff italiano, e applicare la stessa trasformazione al file EN.

```bash
git diff eda63665..HEAD -- src/content/posts/<slug>/index.md
```

| Articolo | Cosa è cambiato in italiano |
|---|---|
| `verificare/observability/04-correlation` | nuova apertura sul fallimento silenzioso; la sezione «Limiti di questo tutorial» è diventata «Due conti da fare prima di portarlo in produzione»; nuova chiusura |
| `automatizzare/devops/pipeline-proxmox-opentofu-ansible` | nuova apertura sul costo del deploy manuale; il «Riepilogo» numerato è diventato «Perché i tre livelli restano separati» |
| `progettare/kafka/01-intro` | tolta la spiegazione di `async/await`, tenuti i due fatti (kafkajs non mantenuto, protocollo wire Avro); nuova chiusura sulla garanzia d'ordine |
| `progettare/keycloak/02-authorization-code-pkce` | `## Obiettivo` e `## Prerequisiti` fusi nella prosa d'apertura |
| `verificare/testing/03-cicd-strategie-avanzate` | via l'indice della serie in fondo, nuova chiusura |

- [ ] **Step 1: un articolo per volta, diff alla mano**
- [ ] **Step 2: verifica che il drift heading sia 0**
- [ ] **Step 3: Build verde**

---

## Task 3: Le 11 riscritture

**Il lavoro grosso. Va spezzato: massimo due articoli per dispatch.**

Ordinati per ampiezza del diff italiano, che è la misura di quanto l'inglese sia fuori posto:

| # | Articolo | Righe cambiate in IT | Stato dell'EN |
|---|---|---|---|
| 1 | `verificare/testing/01-guida-completa-e2e` | 833 | **è uno stub**: 18 parole di testo segnaposto del template, messo `draft: true`. Va scritto da zero. |
| 2 | `progettare/kubernetes/02-capi-part2-internals` | 638 | vecchio articolo, 38 heading contro i 6 dell'italiano |
| 3 | `automatizzare/homelab/homelab-n8n` | 446 | vecchio articolo, 30 heading contro 9 |
| 4 | `progettare/kubernetes/01-capi-part1-intro` | 270 | vecchio articolo, 24 heading contro 6 |
| 5 | `automatizzare/docker/docker-internals` | 237 | vecchio articolo, 23 heading contro 5 |
| 6 | `verificare/observability/dalla-strumentazione-allo-storage` | 166 | **assemblaggio meccanico** delle sezioni superstiti di `02` e `03`, con un commento HTML in testa che lo dichiara |
| 7 | `progettare/keycloak/01-keycloak-intro` | 144 | vecchio articolo |
| 8 | `verificare/testing/red-use-quando-e-perche` | 121 | **scissione meccanica**, commento HTML in testa |
| 9 | `verificare/testing/performance-senza-baseline` | 110 | **scissione meccanica**, commento HTML in testa |
| 10 | `progettare/kubernetes/04-capi-part4-day1` | 110 | apertura, chiusura e 39 heading cambiati in italiano |
| 11 | `progettare/kubernetes/03-capi-part3-talos` | 102 | apertura, chiusura e 30 heading cambiati in italiano |

- [ ] **Step 1: per ogni articolo, l'italiano è la sorgente**

Leggere l'`index.md` per intero, poi scrivere l'`index.en.md` che gli corrisponde: stessa struttura, stessi heading tradotti, stessi fatti, stessi blocchi di codice, stessa lunghezza.

**Non partire dal vecchio file inglese.** Su questi articoli il vecchio EN corrisponde a un articolo che non esiste più: leggerlo porta a conservare sezioni che l'italiano ha tagliato.

- [ ] **Step 2: i tre file con il commento HTML**

`dalla-strumentazione-allo-storage`, `red-use-quando-e-perche` e `performance-senza-baseline` hanno in testa un commento che dice che sono assemblaggi meccanici in attesa di adattamento. **Quel commento va rimosso** quando il file è stato riscritto davvero.

- [ ] **Step 3: `01-guida-completa-e2e`**

Il file EN è `draft: true` perché conteneva il testo segnaposto del template. Scritto l'articolo, **togliere `draft: true`**.

- [ ] **Step 4: frontmatter allineato**

`mode`, `series`, `seriesOrder`, `date` uguali all'italiano. `summary` e `openItems` tradotti dall'italiano corrente, non ereditati dal vecchio EN. `seoTitle` inglese se il titolo supera i 45 caratteri.

- [ ] **Step 5: verifica per articolo**

```bash
python3 scripts/post-facts.py <frammento>
```

Il drift heading deve essere **0**. Se non lo è, la struttura non corrisponde.

- [ ] **Step 6: Build verde a fine lotto**

---

## Task 4: I 5 articoli senza versione inglese — **decisione, non esecuzione**

Questi cinque non hanno un `index.en.md`, e tre di essi sono fra i migliori del corpus:

```
verificare/testing/mutation-testing-oltre-la-coverage
verificare/testing/chiudere-il-loop-mutation-testing
verificare/observability/burn-rate-alerts-slo-multi-window
verificare/observability/prometheus-predict-linear-alert-predittivi
verificare/observability/alert-routing-severity-inhibition
```

**Non crearli senza decisione dell'autore.** Creare cinque articoli inglesi nuovi è lavoro di scrittura, non di allineamento, e sta fuori dal perimetro di questo piano.

- [ ] **Step 1:** portare la questione all'autore, con il dato che manca: quanto traffico arriva dalle pagine EN.

---

## Task 5: Chiusura

- [ ] **Step 1:** build completa verde
- [ ] **Step 2:** nessun drift residuo

```bash
python3 scripts/post-facts.py | grep "DRIFT"
```

- [ ] **Step 3:** nessun marcatore di assemblaggio residuo

```bash
grep -rn "assemblaggio meccanico\|scissione meccanica\|Write here the" src/content/posts/
```

- [ ] **Step 4:** nessun link interno rotto

```bash
npm run build && python3 - <<'EOF'
import re,os,glob
bad=set()
for f in glob.glob('dist/**/*.html',recursive=True):
    for m in re.findall(r'href="(/[^":#?]*)"',open(f,encoding='utf-8',errors='ignore').read()):
        if m.startswith(('/_astro','/og/','/images/','/img/','/files/','/assets/')): continue
        if re.search(r'\.\w{2,5}$',m): continue
        if not os.path.exists('dist'+m.rstrip('/')+'/index.html'): bad.add(m)
print("rotti:", sorted(bad))
EOF
```

Il valore atteso è **0**: gli articoli EN nuovi possono rendere raggiungibili link `/en/` che prima cadevano sull'italiano, ma non devono romperne di nuovi.

- [ ] **Step 5:** report — articoli riscritti, drift residuo, e cosa non è stato possibile fare

---

## Fuori scope, dichiarato

- **Tutti i file italiani.** Sono la sorgente di verità.
- I 5 articoli senza EN: Task 4, decisione dell'autore.
- La qualità editoriale degli articoli EN che l'italiano non ha toccato: se un vecchio articolo inglese ha difetti suoi, non è questo il piano che li corregge.
- I 14 link `/en/` che oggi cadono sull'italiano per assenza del gemello: si risolvono da soli man mano che gli articoli EN esistono, e quelli che restano sono coperti dal meccanismo in `Header.astro`.
