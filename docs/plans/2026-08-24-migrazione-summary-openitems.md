# Migrazione `summary` / `openItems` sugli articoli del blog — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Riempire i campi frontmatter `summary` e `openItems` sui 61 articoli italiani del blog che ancora non li hanno, senza introdurre una sola affermazione che non sia già scritta nell'articolo.

**Architecture:** Nessun codice nuovo. I componenti `PostSummary.astro` e `PostOpenItems.astro` esistono, sono cablati nelle rotte IT ed EN, e i campi sono opzionali nello schema. La migrazione è puramente editoriale: si aggiungono chiavi YAML al frontmatter di file esistenti, un articolo alla volta, verificando la build a ogni lotto.

**Tech Stack:** Astro 5 content collections, Zod schema in `src/content.config.ts`, markdown in `src/content/posts/**/index.md`.

**Spec:** questo documento. Il riferimento normativo sono i due articoli già migrati (vedi Global Constraints).

## Global Constraints

- **Repo e branch:** `/Users/monte97/Documents/1_AETE/0_Content/website.github.io`, branch `feat/case-study-section`. Non fare merge, non fare push.
- **Perimetro:** solo i file `src/content/posts/**/index.md` (italiano). I file `index.en.md` sono **fuori scope** in questo piano.
- **Vincolo di verità (il più importante):** ogni `value`, `note` e `openItems` deve essere **estraibile da una frase dell'articolo**. Vietato introdurre numeri, percentuali, nomi di strumenti, versioni, tempi o limiti che non compaiano già nel testo. Se per un campo non c'è materiale vero, il campo si omette.
- **Nessun campo obbligatorio:** `summary` e `openItems` sono indipendenti. Un articolo può avere solo uno dei due, o nessuno dei due. **Omettere è sempre preferibile a inventare.**
- **`summary`: 3-4 righe, mai 5 o più.** Ogni riga: `label` (una o due parole, sostantivo), `value` (una riga, max ~90 caratteri), `note` opzionale (una riga, max ~110 caratteri) da usare solo quando aggiunge un fatto, mai per parafrasare il `value`.
- **`openItems`: 2-4 voci.** Ogni voce è un limite, un confine o una decisione lasciata al lettore, **non** un "prossimo passo" e **non** un difetto dell'articolo. Frase intera, max ~200 caratteri.
- **`openNote`** è opzionale, una riga, introduce la lista.
- **Lingua:** italiano, minuscolo dopo la prima lettera (sentence case), nessun punto finale sui `value` e sui `note`; gli `openItems` sono frasi intere senza punto finale.
- **Niente markdown nei `value` e nelle `note`** tranne il backtick per identificatori di codice, già usato nel riferimento.
- **YAML:** stringhe sempre fra virgolette doppie. Se il testo contiene virgolette doppie, usare le virgolette tipografiche `« »` o riformulare.
- **Non toccare nessun'altra chiave del frontmatter esistente.** Le nuove chiavi vanno inserite **dopo l'ultima chiave esistente e prima del `---` di chiusura**.
- **Verifica obbligatoria a ogni lotto:** `npm run build` deve completare senza errori. Un errore di schema Zod fa fallire la build e indica YAML malformato.

## Riferimento normativo

Questi due file sono già migrati e sono lo standard da imitare. Leggerli **prima** di iniziare:

- `src/content/posts/verificare/testing/mutation-testing-oltre-la-coverage/index.md`
- `src/content/posts/progettare/kafka/03-akka-pekko-migrazione/index.md`

Esempio integrale (da `mutation-testing-oltre-la-coverage`):

```yaml
summary:
  - label: "Contesto"
    value: "Suite .NET verde, 93% di coverage"
    note: "Un bug nel calcolo del subtotale passava indisturbato"
  - label: "Scoperta"
    value: "Un terzo dei test non verificava niente"
    note: "Eseguivano il codice senza accorgersi se fosse sbagliato"
  - label: "Strumento"
    value: "Stryker.NET, mutazione sistematica del codice sotto test"
  - label: "Risultato"
    value: "Mutation score dal 65% al 92%"
openItems:
  - "Il mutation score dice se i test si accorgono di una modifica, non se verificano la cosa giusta: resta una domanda a cui risponde solo chi conosce il dominio"
  - "Il costo di esecuzione cresce con la codebase. Con `--since:main` resta proporzionale alla PR, ma una passata sull'intero progetto è un'altra cosa"
  - "Non esiste una soglia universale: 60 è un punto di partenza per bloccare le regressioni, non un obiettivo di qualità"
  - "L'esempio è un flusso di gestione ordini piccolo e con logica propria. Su codice fatto per lo più di orchestrazione e framework, la resa dei mutanti è più bassa"
openNote: "Quello che il mutation testing non risolve, e che va deciso guardando il proprio codice."
```

Ogni valore di quell'esempio è verificabile nel corpo dell'articolo: il 93%, il terzo dei test, Stryker.NET, il 65→92, il flusso di gestione ordini, la soglia 60 e `--since:main` sono tutti scritti nel testo.

## Come si sceglie una `label`

Non esiste un elenco chiuso, ma queste coprono la quasi totalità dei casi. Usare quella che descrive il contenuto, non forzare un modello unico:

| `label` | Quando |
|---|---|
| `Contesto` | la situazione di partenza |
| `Problema` | il sintomo che apre l'articolo |
| `Scelta` | la decisione presa, quando l'articolo ne racconta una |
| `Strumento` | quando l'articolo ruota su un tool specifico |
| `Scoperta` | quando c'è un ribaltamento |
| `Costo reale` | tempi, effort, dimensione dell'intervento |
| `Risultato` | il dopo, quando è misurato nel testo |
| `Ampiezza` | quanti servizi, file, componenti |
| `Prerequisiti` | quando servono versioni o setup precisi |
| `Fuori scope` | cosa l'articolo dichiara di non trattare |

## Come si scrive un `openItems`

Sono i **confini dichiarati**, non i difetti. Quattro sorgenti legittime, in ordine di preferenza:

1. **Limiti già scritti nell'articolo** ("questo non copre il caso X", "su progetti grandi cambia"). Sono i migliori: sono già veri.
2. **Il perimetro implicito**: l'articolo tratta A e non B, e B è la domanda ovvia del lettore.
3. **Le condizioni di validità**: la soluzione vale su una certa versione, scala, o tipo di codice.
4. **Le decisioni che restano al lettore**: soglie, trade-off che l'articolo non decide al posto suo.

**Vietato:** inventare bug, dichiarare che qualcosa "andrebbe migliorato", promettere articoli futuri, o scrivere limiti generici applicabili a qualunque articolo ("il contesto di ognuno è diverso").

## File Structure

Nessun file creato, nessun file di codice modificato. Solo modifiche al frontmatter di:

```
src/content/posts/
├── automatizzare/   12 articoli  (kubernetes 7, devcontainer, developer-tools, devops, docker, homelab)
├── progettare/      20 articoli  (kafka 5, keycloak 6, system-design 5, vue 1, web-development 3)
└── verificare/      31 articoli  (observability 11, openfga 5, testing 15)
```

Totale 63, di cui **2 già fatti** (`mutation-testing-oltre-la-coverage`, `03-akka-pekko-migrazione`) e **61 da fare**.

## Task Right-Sizing

Un task = un lotto tematico coerente (una serie o una categoria). La coerenza tematica conta perché gli articoli di una serie condividono contesto e vocabolario, e le `label` risultano più uniformi se scritte di seguito. Ogni task finisce con una build verde e un commit.

---

### Task 1: Lotto pilota — serie `linq` (4 articoli)

Il lotto pilota serve a validare il metodo su articoli densi di numeri, dove il rischio di invenzione è massimo. **Va rivisto dall'autore prima di procedere ai task successivi.**

**Files:**
- Modify: tutti gli `index.md` sotto `src/content/posts/progettare/system-design/` che hanno `series: linq`

- [ ] **Step 1: Leggere i due riferimenti**

```bash
cd /Users/monte97/Documents/1_AETE/0_Content/website.github.io
cat src/content/posts/verificare/testing/mutation-testing-oltre-la-coverage/index.md
cat src/content/posts/progettare/kafka/03-akka-pekko-migrazione/index.md
```

- [ ] **Step 2: Elencare gli articoli del lotto**

```bash
grep -rl "series: linq" src/content/posts/ --include=index.md
```

- [ ] **Step 3: Per ogni articolo, leggerlo integralmente e annotare i fatti citabili**

Per ciascun file, leggere il corpo per intero e scrivere (in scratch, non nel file) l'elenco dei fatti verificabili: numeri, versioni, nomi di strumenti, tempi, dimensioni, limiti dichiarati. **Solo da qui si possono pescare i valori.**

- [ ] **Step 4: Scrivere `summary` e `openItems` per ogni articolo**

Inserire le chiavi dopo l'ultima chiave esistente del frontmatter, prima del `---` di chiusura. Rispettare i Global Constraints: 3-4 righe di summary, 2-4 openItems, virgolette doppie, nessun punto finale.

- [ ] **Step 5: Verificare che la build passi**

```bash
npm run build
```
Expected: `[build] ✓ Completed` senza errori. Un errore Zod indica YAML malformato o un campo con il tipo sbagliato.

- [ ] **Step 6: Verificare che i blocchi compaiano nell'HTML**

```bash
grep -c "In sintesi" dist/blog/progettare/system-design/*/index.html
```
Expected: `1` per ogni articolo del lotto.

- [ ] **Step 7: Auto-verifica del vincolo di verità**

Per ogni valore scritto, individuare la frase dell'articolo da cui deriva. Se anche uno solo non ha una frase corrispondente, **rimuoverlo**. Riportare l'esito come elenco `valore → frase sorgente`.

- [ ] **Step 8: Commit**

```bash
git add src/content/posts/progettare/system-design/
git commit -m "content: summary e openItems sulla serie LINQ"
```

- [ ] **Step 9: FERMARSI e chiedere revisione all'autore prima del Task 2**

---

### Task 2: Serie `observability` (8 articoli)

**Files:**
- Modify: `src/content/posts/verificare/observability/**/index.md` con `series: observability`

- [ ] **Step 1: Elencare il lotto**

```bash
grep -rl "series: observability" src/content/posts/ --include=index.md
```

- [ ] **Step 2: Per ogni articolo, leggerlo integralmente e annotare i fatti citabili**

Come Task 1 Step 3. Gli articoli di observability sono i più lunghi (media 3.000 parole): non saltare la lettura del corpo.

- [ ] **Step 3: Scrivere `summary` e `openItems` per ogni articolo**

Rispettare i Global Constraints. Per questa serie, attenzione particolare: gli articoli citano percentuali di riduzione dati e soglie. **Copiare i numeri esatti dal testo, mai arrotondare.**

- [ ] **Step 4: Verificare la build**

```bash
npm run build
```
Expected: `[build] ✓ Completed` senza errori.

- [ ] **Step 5: Auto-verifica del vincolo di verità**

Come Task 1 Step 7: elenco `valore → frase sorgente` per ogni valore scritto.

- [ ] **Step 6: Commit**

```bash
git add src/content/posts/verificare/observability/
git commit -m "content: summary e openItems sulla serie observability"
```

---

### Task 3: Serie `playwright` (9 articoli)

**Files:**
- Modify: `src/content/posts/verificare/testing/**/index.md` con `series: playwright`

- [ ] **Step 1: Elencare il lotto**

```bash
grep -rl "series: playwright" src/content/posts/ --include=index.md
```

- [ ] **Step 2: Per ogni articolo, leggerlo integralmente e annotare i fatti citabili**

- [ ] **Step 3: Scrivere `summary` e `openItems` per ogni articolo**

Serie molto omogenea: nove articoli sullo stesso strumento. **Non copiare gli stessi `openItems` da un articolo all'altro** — se due articoli finiscono con gli stessi confini, uno dei due li ha inventati.

- [ ] **Step 4: Verificare la build**

```bash
npm run build
```
Expected: `[build] ✓ Completed` senza errori.

- [ ] **Step 5: Auto-verifica del vincolo di verità**

- [ ] **Step 6: Commit**

```bash
git add src/content/posts/verificare/testing/
git commit -m "content: summary e openItems sulla serie Playwright"
```

---

### Task 4: Serie `keycloak` (6 articoli)

**Files:**
- Modify: `src/content/posts/progettare/keycloak/**/index.md`

- [ ] **Step 1: Elencare il lotto**

```bash
grep -rl "category: keycloak" src/content/posts/ --include=index.md
```

- [ ] **Step 2: Per ogni articolo, leggerlo integralmente e annotare i fatti citabili**

- [ ] **Step 3: Scrivere `summary` e `openItems` per ogni articolo**

- [ ] **Step 4: Verificare la build**

```bash
npm run build
```
Expected: `[build] ✓ Completed` senza errori.

- [ ] **Step 5: Auto-verifica del vincolo di verità**

- [ ] **Step 6: Commit**

```bash
git add src/content/posts/progettare/keycloak/
git commit -m "content: summary e openItems sulla serie Keycloak"
```

---

### Task 5: Serie `openfga` (5 articoli)

**Files:**
- Modify: `src/content/posts/verificare/openfga/**/index.md`

- [ ] **Step 1: Elencare il lotto**

```bash
grep -rl "category: openfga" src/content/posts/ --include=index.md
```

- [ ] **Step 2: Per ogni articolo, leggerlo integralmente e annotare i fatti citabili**

- [ ] **Step 3: Scrivere `summary` e `openItems` per ogni articolo**

- [ ] **Step 4: Verificare la build**

```bash
npm run build
```
Expected: `[build] ✓ Completed` senza errori.

- [ ] **Step 5: Auto-verifica del vincolo di verità**

- [ ] **Step 6: Commit**

```bash
git add src/content/posts/verificare/openfga/
git commit -m "content: summary e openItems sulla serie OpenFGA"
```

---

### Task 6: Serie `kafka` (4 articoli rimanenti)

`03-akka-pekko-migrazione` è già fatto: escluderlo.

**Files:**
- Modify: `src/content/posts/progettare/kafka/**/index.md` tranne `03-akka-pekko-migrazione`

- [ ] **Step 1: Elencare il lotto escludendo quello già fatto**

```bash
grep -rL "^summary:" $(grep -rl "category: kafka" src/content/posts/ --include=index.md)
```

- [ ] **Step 2: Per ogni articolo, leggerlo integralmente e annotare i fatti citabili**

- [ ] **Step 3: Scrivere `summary` e `openItems` per ogni articolo**

- [ ] **Step 4: Verificare la build**

```bash
npm run build
```
Expected: `[build] ✓ Completed` senza errori.

- [ ] **Step 5: Auto-verifica del vincolo di verità**

- [ ] **Step 6: Commit**

```bash
git add src/content/posts/progettare/kafka/
git commit -m "content: summary e openItems sulla serie Kafka"
```

---

### Task 7: Kubernetes e CAPI (7 articoli)

**Files:**
- Modify: `src/content/posts/automatizzare/kubernetes/**/index.md`

- [ ] **Step 1: Elencare il lotto**

```bash
grep -rl "category: kubernetes" src/content/posts/ --include=index.md
```

- [ ] **Step 2: Per ogni articolo, leggerlo integralmente e annotare i fatti citabili**

- [ ] **Step 3: Scrivere `summary` e `openItems` per ogni articolo**

Serie di infrastruttura: le `label` più adatte sono spesso `Prerequisiti`, `Ampiezza`, `Fuori scope`.

- [ ] **Step 4: Verificare la build**

```bash
npm run build
```
Expected: `[build] ✓ Completed` senza errori.

- [ ] **Step 5: Auto-verifica del vincolo di verità**

- [ ] **Step 6: Commit**

```bash
git add src/content/posts/automatizzare/kubernetes/
git commit -m "content: summary e openItems su Kubernetes e CAPI"
```

---

### Task 8: Testing rimanente (4 articoli non Playwright, non mutation)

**Files:**
- Modify: gli `index.md` sotto `src/content/posts/verificare/testing/` privi di `summary:`

- [ ] **Step 1: Elencare i rimanenti**

```bash
grep -rL "^summary:" $(grep -rl "" src/content/posts/verificare/testing/ --include=index.md)
```

- [ ] **Step 2: Per ogni articolo, leggerlo integralmente e annotare i fatti citabili**

- [ ] **Step 3: Scrivere `summary` e `openItems` per ogni articolo**

- [ ] **Step 4: Verificare la build**

```bash
npm run build
```
Expected: `[build] ✓ Completed` senza errori.

- [ ] **Step 5: Auto-verifica del vincolo di verità**

- [ ] **Step 6: Commit**

```bash
git add src/content/posts/verificare/testing/
git commit -m "content: summary e openItems sul testing rimanente"
```

---

### Task 9: Coda — tutto ciò che resta (~14 articoli)

Comprende: system-design non-LINQ, la serie `saturation-alerting` dentro observability, vue, web-development, e gli articoli singoli di `automatizzare` (devcontainer, developer-tools, devops, docker, homelab). Il comando dello Step 1 è la fonte di verità: qualunque cosa elenchi va fatta.

**Files:**
- Modify: tutti gli `index.md` rimasti senza `summary:`

- [ ] **Step 1: Elencare tutto ciò che resta**

```bash
for f in $(find src/content/posts -name index.md); do grep -q "^summary:" "$f" || echo "$f"; done
```

- [ ] **Step 2: Per ogni articolo, leggerlo integralmente e annotare i fatti citabili**

Lotto eterogeneo: articoli singoli su temi non collegati. Trattarli uno per uno, senza cercare uniformità fra loro.

- [ ] **Step 3: Scrivere `summary` e `openItems` per ogni articolo**

- [ ] **Step 4: Verificare la build**

```bash
npm run build
```
Expected: `[build] ✓ Completed` senza errori.

- [ ] **Step 5: Verificare la copertura finale**

```bash
echo "articoli totali: $(find src/content/posts -name index.md | wc -l)"
echo "con summary:    $(grep -rl '^summary:' src/content/posts --include=index.md | wc -l)"
echo "con openItems:  $(grep -rl '^openItems:' src/content/posts --include=index.md | wc -l)"
```

Un articolo senza `summary` è accettabile **solo** se nel corpo non c'erano fatti citabili sufficienti. Elencare quali sono stati saltati e perché.

- [ ] **Step 6: Auto-verifica del vincolo di verità**

- [ ] **Step 7: Commit**

```bash
git add src/content/posts/
git commit -m "content: summary e openItems sugli articoli rimanenti"
```

---

## Come si sbaglia questo lavoro

Elenco dei modi noti di fallire, da rileggere prima di ogni task:

1. **Inventare un numero.** "Riduce del 40% i tempi" quando l'articolo non dice 40. È il fallimento più grave: l'autore pubblica con la propria firma.
2. **Trasformare un consiglio in un risultato.** L'articolo dice "conviene impostare la soglia a 60"; la `summary` non può dire "soglia impostata a 60".
3. **Scrivere `openItems` generici.** "Ogni contesto è diverso", "va adattato al proprio caso": veri per qualunque articolo, quindi inutili.
4. **Ripetere il `value` nella `note`.** La nota aggiunge un fatto o si omette.
5. **Copiare gli stessi `openItems` fra articoli della stessa serie.** Se valgono per tutti, non li ha ricavati dal testo.
6. **Riempire a tutti i costi.** Un articolo senza `openItems` è meglio di un articolo con `openItems` inventati.
7. **Toccare altre chiavi del frontmatter.** Titolo, data, tag, `series`, `seriesOrder`, `reviewed` restano com'erano.
