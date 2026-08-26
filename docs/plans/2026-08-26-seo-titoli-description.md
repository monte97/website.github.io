# SEO — titoli, description e residui di migrazione — Implementation Plan

> **For agentic workers:** piano pensato per l'esecuzione delegata. Ogni task è meccanico e verificabile con uno script. Dove serve un giudizio, il piano lo dice e si ferma.

**Goal:** Portare titoli e `description` di 51 articoli dentro i vincoli tecnici della SERP, **senza toccare i titoli editoriali**, e ripulire i residui di migrazione Hugo ancora visibili in produzione.

**Spec:** `.claude/rules/style-guide.md` §5 (heading) e §7 (numeri e specificità).

---

## Il meccanismo da capire prima di cominciare

`src/layouts/BaseLayout.astro:63` rende:

```astro
<title>{seoTitle ?? title} | montelli.dev</title>
```

Quindi:

- **`title`** è il titolo editoriale. Finisce nell'`<h1>`, in `og:title`, nel JSON-LD e nell'RSS. **Non si accorcia mai per ragioni SEO.**
- **`seoTitle`** è opzionale e sovrascrive **solo** il `<title>`. È il campo da aggiungere quando il titolo editoriale è troppo lungo per la SERP.

Il suffisso ` | montelli.dev` costa 15 caratteri: **il budget utile è ~45.**

Esempio già applicato, da imitare (`progettare/keycloak/01-keycloak-intro`):

```yaml
title: "Il login scritto in casa non è il problema. Il secondo lo è."   # 60 char, resta
seoTitle: "Keycloak: perché centralizzare l'identità"                    # 41 char, va in SERP
```

---

## Global Constraints

- **Repo:** `/Users/monte97/Documents/1_AETE/0_Content/website.github.io`. Non fare push, non fare merge.
- **Non modificare `title`.** Mai, per nessun motivo, in questo piano. Se un titolo è brutto è un problema editoriale, non SEO, e non si risolve qui.
- **`seoTitle` si aggiunge solo dove serve**, cioè dove il titolo supera i 45 caratteri. Non aggiungerlo agli articoli che stanno già dentro.
- **`seoTitle` descrive, non ammicca.** Deve contenere il termine che una persona cercherebbe (`Keycloak`, `OpenTelemetry`, `Playwright`, `Cluster API`) e dire di cosa parla il pezzo. La frase a effetto sta nel `title`.
- **`description`:** range 120-160 caratteri. Se è corta si allunga con un fatto che è già nell'articolo; se è lunga si taglia. **Vietato aggiungere fatti non presenti nel testo.**
- **Non toccare** il corpo degli articoli, salvo il Task 3 che riguarda solo markup rotto.
- **`index.en.md` è fuori scope**, tranne al Task 3.
- `reviewed` **non cambia**: questo piano non tocca il testo dell'articolo.

## Lo strumento di verifica

```bash
python3 scripts/post-facts.py                 # tabella su tutti
python3 scripts/post-facts.py <frammento>     # scheda singola
```

`post-facts.py` legge il titolo effettivo (`seoTitle ?? title`) e segnala con `!` chi sfora. **L'obiettivo del piano è azzerare i `!` nelle colonne `ttl` e `dsc`.**

---

## Task 1: I 51 `seoTitle` mancanti

**Tutti e 51 gli articoli non ancora revisionati hanno il titolo oltre il budget, e nessuno ha `seoTitle`.**

I casi peggiori, per dare la misura:

| Articolo | Caratteri |
|---|---|
| `progettare/kubernetes/01-article-ingress-k8s` | 97 |
| `automatizzare/devops/pipeline-proxmox-opentofu-ansible` | 87 |
| `progettare/keycloak/05-keycloak-opa`, `06-keycloak-federation` | 85 |
| `progettare/vue/micro-frontend-module-federation` | 85 |
| `progettare/system-design/03-compilatore-state-machine` | 84 |

- [ ] **Step 1: Ottenere l'elenco esatto**

```bash
python3 scripts/post-facts.py | awk '$0 ~ /!/ {print}'
```

- [ ] **Step 2: Per ogni articolo, leggere il `title` e i primi due heading, e scrivere il `seoTitle`**

Procedere **una categoria per volta** (`keycloak`, poi `openfga`, poi `testing`…): articoli della stessa serie devono avere `seoTitle` coerenti fra loro, e scritti di seguito vengono uniformi.

Forma che funziona: `<Tecnologia>: <cosa fa il pezzo>`. Esempi già in repo:

- `Keycloak: perché centralizzare l'identità`
- `Cluster API: le CRD e il provisioning`
- `OpenTelemetry e LGTM: architettura e costi`
- `Playwright e la fine dei test flaky`

Il campo va **subito dopo `title:`**, come negli articoli già fatti.

- [ ] **Step 3: Verifica**

```bash
python3 scripts/post-facts.py | grep -c '!'
```

- [ ] **Step 4: Build verde, commit per categoria**

---

## Task 2: Le 18 `description` fuori range

Range 120-160 caratteri.

**Troppo lunghe** (tagliare, non riscrivere il concetto):

| Articolo | Char |
|---|---|
| `verificare/testing/mutation-testing-oltre-la-coverage` | 246 |
| `verificare/testing/chiudere-il-loop-mutation-testing` | 230 |
| `progettare/keycloak/06-keycloak-federation` | 181 |
| `automatizzare/developer-tools/ridurre-token-ai-coding-rtk-tokensave` | 173 |
| `progettare/system-design/03-compilatore-state-machine` | 172 |
| `progettare/system-design/04-tracing-otel-grafana-tempo` | 174 |
| `verificare/openfga/05-listobjects-performance` | 170 |
| `progettare/system-design/02-benchmark-net8` | 166 |
| `verificare/testing/03-cicd-strategie-avanzate` | 165 |
| `altro/devcontainer/devcontainer`, `progettare/kubernetes/05-capi-part5-ubuntu` | 164 |
| `progettare/system-design/01-errori-produzione` | 161 |

**Troppo corte** (allungare con un fatto già presente nell'articolo):

| Articolo | Char |
|---|---|
| `verificare/testing/05-network-mocking-avanzato` | 101 |
| `progettare/keycloak/03-keycloak-m2m` | 106 |
| `altro/web-development/03-vue3-dry-patterns` | 108 |
| `verificare/testing/04-network-mocking` | 110 |
| `altro/web-development/02-openlayers-vue3-composables` | 111 |
| `progettare/vue/micro-frontend-module-federation` | 113 |

- [ ] **Step 1: Le lunghe** — tagliare la parte che ripete il titolo, non quella che aggiunge informazione
- [ ] **Step 2: Le corte** — leggere il `summary` del frontmatter: contiene già i fatti verificati dell'articolo ed è la fonte da cui pescare
- [ ] **Step 3: Verifica e commit**

---

## Task 3: I residui di shortcode Hugo — **COMPLETATO 2026-08-26**

> Eseguito in delega da opencode (`big-pickle`), run `.claude/oc-runs/20260826-172349-seo-task3/`.
> 55 occorrenze convertite in 13 file, verifica indipendente superata: perimetro rispettato,
> frontmatter intatto, build verde, link rotti fermi a 14.
> L'esecutore ha trovato e gestito anche la variante `{{< relref >}}` in `03-cicd-strategie-avanzate`,
> non prevista dal piano.

**Questo difetto è visibile in produzione adesso.** 13 file contengono `{{< ref "..." >}}`, che Astro non interpreta e rende **letteralmente**. Il lettore vede:

```
primo articolo]({{< ref "/posts/openfga/01-zanzibar-concetti" >}}) abbiamo definito…
```

I file, con il numero di occorrenze:

| File | N |
|---|---|
| `verificare/openfga/04-gerarchie-query/index.md` | 8 |
| `verificare/openfga/04-gerarchie-query/index.en.md` | 7 |
| `verificare/openfga/05-listobjects-performance/index.md` / `.en.md` | 5 + 5 |
| `verificare/openfga/02-openfga-keycloak/index.md` / `.en.md` | 5 + 4 |
| `verificare/openfga/03-multitenancy/index.md` / `.en.md` | 4 + 4 |
| `verificare/openfga/01-zanzibar-concetti/index.md` / `.en.md` | 3 + 2 |
| `progettare/keycloak/02-authorization-code-pkce/index.md` / `.en.md` | 3 + 3 |
| `verificare/testing/03-cicd-strategie-avanzate/index.md` | 2 |

**Le versioni EN sono dentro il perimetro di questo task**, perché il difetto è identico e la correzione è meccanica.

- [x] **Step 1: La trasformazione**

```
[testo]({{< ref "/blog/pillar/categoria/slug/" >}})   →   [testo](/blog/pillar/categoria/slug/)
```

- [x] **Step 2: Verificare che ogni URL risolva davvero**

Attenzione: alcuni percorsi dentro gli shortcode possono essere ancora nel vecchio formato `/posts/...`, che non esiste più. Ogni link va risolto sulla struttura attuale delle cartelle in `src/content/posts/`.

Dopo la conversione:

```bash
grep -rn "{{< \|{{% " src/content/           # deve essere vuoto
npm run build
python3 - <<'EOF'
import re,os,glob
bad=set()
for f in glob.glob('dist/**/*.html',recursive=True):
    for m in re.findall(r'href="(/(?:en/)?blog/[^"#?]*)"',open(f,encoding='utf-8',errors='ignore').read()):
        if not os.path.exists('dist'+m.rstrip('/')+'/index.html'): bad.add(m)
print("link /blog/ rotti:", sorted(bad))
EOF
```

Il numero di link rotti **non deve aumentare** rispetto a prima del task. Alcuni preesistenti sono noti e fuori scope: le rotte `/blog/<pillar>/` e i link `/en/` verso articoli senza gemello inglese.

- [x] **Step 3: Build verde, commit**

---

## Task 4: Chiusura

- [ ] **Step 1:** build completa verde
- [ ] **Step 2:** verifica finale

```bash
python3 scripts/post-facts.py | tail -3        # 0 occorrenze di '!' nelle colonne ttl e dsc
grep -rn "{{< \|{{% " src/content/             # vuoto
```

- [ ] **Step 3:** rigenerare le card OG degli articoli il cui `title` fosse cambiato

Non dovrebbe essercene nessuno — questo piano non tocca `title`. Se ne emergono, è un errore di esecuzione da segnalare.

- [ ] **Step 4:** report — quanti `seoTitle` aggiunti, quante `description` corrette, quanti shortcode convertiti, e **l'elenco degli URL che non è stato possibile risolvere**

---

## Fuori scope, dichiarato

- **Il campo `title`.** Non si tocca.
- Il corpo degli articoli, salvo la conversione degli shortcode del Task 3.
- Le card OG: dipendono da `title` e `description`, e vanno rigenerate solo se cambia il `title` — cosa che qui non accade.
- Le rotte `/blog/<pillar>/` che danno 404 e i link `/en/` verso articoli senza gemello: difetti di componenti, altro piano.
- La passata inglese sul contenuto.
