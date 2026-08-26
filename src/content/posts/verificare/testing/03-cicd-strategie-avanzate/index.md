---
title: "Playwright in CI/CD: Sharding, Mobile Testing e Automazione Agent-Driven"
seoTitle: "Playwright in CI: sharding e mobile"
date: 2025-01-24T09:00:00.000Z
description: "Playwright in CI: sharding con blob reporter e job di merge, 200 test su 4 shard in un quarto del tempo, più emulazione mobile e API testing."
pillar: verificare
category: testing
mode: how-to
tags:
  - Playwright
  - CI/CD
  - GitHub Actions
  - Sharding
  - Agent-Driven Development
lang: it
reviewed: false
series: playwright
seriesOrder: 30
reproducibility: true
summary:
  - label: "Problema"
    value: "La suite passa in locale e fallisce in CI"
    note: "Runner con meno CPU, nessun display, report da rendere persistenti"
  - label: "Scelta"
    value: "Sharding su più macchine con blob reporter e job di merge"
    note: "Con `fail-fast: false` uno shard in errore non cancella gli altri"
  - label: "Risultato"
    value: "200 test su 4 shard riducono il tempo totale di circa 4 volte"
  - label: "Ampiezza"
    value: "Da CI GitHub Actions a emulazione mobile, API testing e agent-driven"
    note: "iOS via WebKit, Android via Chromium, senza dispositivi fisici"
openItems:
  - "La soglia dei 10-15 minuti oltre cui conviene lo sharding dipende dall'infrastruttura CI e dalla tolleranza del team"
  - "Con matrici multi-dimensionali `strategy.job-total` restituisce il prodotto di tutte le dimensioni, non il numero di shard: meglio hardcodare il totale"
  - "In pipeline il mobile è emulazione di viewport, user agent ed eventi touch: non è coinvolto nessun dispositivo fisico"
  - "Senza test chiari e semantici l'automazione agent-driven non è praticabile: la suite ne è il prerequisito"
---

Una suite di test E2E completa che passa in locale e fallisce in CI - timeout, browser che non si avviano, report frammentati - è uno scenario comune. Una suite di test ha valore solo se viene eseguita in modo sistematico e affidabile. Integrare Playwright in una pipeline CI/CD non si limita ad aggiungere un `npx playwright test` nel workflow: servono configurazioni specifiche per runner con risorse limitate, strategie di parallelizzazione su più macchine e reporter adatti all'ambiente.

In questo articolo vediamo come configurare Playwright per la CI, come scalare la suite con sharding ed emulazione mobile, come usare le API per velocizzare il setup dei test, e come i selettori semantici preparino la codebase all'automazione agent-driven.

---

## Feedback automatico a ogni commit

L'obiettivo della CI è eseguire la nostra suite di test in un ambiente pulito e automatico ogni volta che viene proposto un cambiamento (es. in una Pull Request). Se i test passano, il codice è considerato sicuro da integrare.

Playwright è progettato per la CI. Fornisce [reporter dedicati](https://playwright.dev/docs/ci-intro) (es. per GitHub Actions), configurazioni specifiche e strumenti per analizzare i fallimenti.

### Esempio con GitHub Actions

[GitHub Actions](https://github.com/features/actions) è uno degli strumenti di CI/CD più diffusi. Il workflow seguente mostra un setup completo e commentato.

```yaml
# .github/workflows/playwright.yml
name: Playwright Tests

# Trigger: esegui su push a 'main'/'develop' e su Pull Request verso 'main'
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    name: 'Playwright Tests'
    # Esegui su una macchina Ubuntu fresca
    runs-on: ubuntu-latest
    # Timeout per l'intero job per evitare che rimanga bloccato
    timeout-minutes: 30

    steps:
      # 1. Clona il repository
      - uses: actions/checkout@v4

      # 2. Imposta l'ambiente Node.js
      - uses: actions/setup-node@v4
        with:
          node-version: 22 # Usa la versione LTS corrente

      # 3. Installa le dipendenze del progetto
      - name: Install dependencies
        run: npm ci

      # 4. Installa i browser richiesti da Playwright
      #    --with-deps installa anche le dipendenze di sistema (un must in CI)
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      # 5. Esegui i test Playwright
      - name: Run Playwright tests
        run: npx playwright test

      # 6. Carica il report dei test come artefatto
      #    'if: always()' assicura che il report venga caricato anche se i test falliscono
      - name: Upload test report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7 # Conserva il report per 7 giorni
```

> **Container Docker**: Per ambienti CI diversi da GitHub Actions, è possibile usare l'immagine Docker ufficiale `mcr.microsoft.com/playwright`, che include browser e dipendenze di sistema pre-installate. L'immagine va pinnata alla versione di Playwright del progetto (es. `mcr.microsoft.com/playwright:v1.50.0-noble`).

### Altri Sistemi di CI

Il pattern è simile per altri sistemi come [GitLab CI](https://docs.gitlab.com/ee/ci/), Jenkins, o CircleCI. La [guida ufficiale di Playwright sulla CI](https://playwright.dev/docs/ci-intro) contiene esempi per diverse piattaforme.

---

## Configurazione e sharding per ridurre i tempi di feedback

In CI le risorse e il contesto sono diversi dall'ambiente locale: meno CPU, nessun display, necessità di report persistenti. Dobbiamo adattare la configurazione di Playwright di conseguenza.

```typescript
// playwright.config.ts
const isCI = !!process.env.CI;

export default defineConfig({
  // Senza configurazione esplicita, Playwright usa il 50% dei core disponibili.
  // In CI, con runner a 2 core, questo si traduce in 1 worker.
  // Se il runner ha risorse sufficienti, è possibile aumentare:
  // workers: process.env.CI ? 2 : undefined,
  retries: isCI ? 2 : 0,

  // Reporter 'github' genera annotazioni sulle PR.
  // Con sharding e matrix strategy, le annotazioni si moltiplicano:
  // in quel caso è preferibile usare 'dot' o 'list' e consultare il report HTML.
  reporter: isCI ? 'github' : 'list',

  use: {
    // Registra un trace solo al primo retry, per non appesantire gli artefatti.
    trace: 'on-first-retry',
  },
});
```

### Sharding: dividere la suite su più macchine

Quando una suite di test supera i 10-15 minuti (il valore esatto dipende dall'infrastruttura CI e dalla tolleranza del team) anche con la parallelizzazione su una singola macchina, lo [sharding](https://playwright.dev/docs/test-sharding) permette di distribuire i test su **più macchine in parallelo**. Con 200 test distribuiti su 4 shard, ciascuna macchina ne esegue 50, riducendo il tempo totale di circa 4 volte.

**Esempio di sharding con GitHub Actions:**

```yaml
jobs:
  test:
    name: 'Playwright Tests'
    runs-on: ubuntu-latest
    # Definisci una 'matrix' per creare job paralleli
    strategy:
      # fail-fast: false è fondamentale nello sharding.
      # Senza di esso, se uno shard fallisce GitHub Actions cancella
      # gli altri shard in esecuzione, impedendo di vedere l'intera
      # superficie di fallimento.
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4] # Crea 4 job, uno per ogni shard

    steps:
      # ... (checkout, setup-node, etc.) ...

      - name: Run Playwright tests
        # Passa lo shard corrente e il numero totale di shard a Playwright
        run: npx playwright test --shard=${{ matrix.shard }}/${{ strategy.job-total }}

      # Carica il blob report come artefatto (necessario per il merge successivo)
      - name: Upload blob report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: blob-report-${{ matrix.shard }}
          path: blob-report/
          retention-days: 7
```

> **Attenzione**: `strategy.job-total` restituisce il prodotto di **tutte** le dimensioni della matrice. Con una matrice mono-dimensionale (`shard: [1,2,3,4]`) il valore è 4. Se la matrice ha più dimensioni (es. `shard` + `project`), il valore sarà il prodotto totale, non il numero di shard. In quel caso, è preferibile hardcodare il totale degli shard o definire una variabile dedicata nella matrice.

### Blob reporter e merge dei report

Quando usiamo lo sharding, ogni shard produce un report parziale. Per ottenere una visione unificata dei risultati, la best practice di Playwright prevede l'uso del **blob reporter** e un job di merge separato.

La configurazione del reporter va adattata per lo sharding:

```typescript
// playwright.config.ts
reporter: process.env.CI ? 'blob' : 'html',
```

Dopo che tutti gli shard hanno completato l'esecuzione, un job dedicato scarica i blob report e li unifica con `npx playwright merge-reports`:

```yaml
  # Job separato che unifica i report di tutti gli shard
  merge-reports:
    needs: test
    runs-on: ubuntu-latest
    if: always()
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22 # Usa la versione LTS corrente
      - run: npm ci

      - name: Download blob reports
        uses: actions/download-artifact@v4
        with:
          pattern: blob-report-*
          merge-multiple: true
          path: all-blob-reports

      - name: Merge reports
        run: npx playwright merge-reports --reporter html ./all-blob-reports

      - name: Upload merged HTML report
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

Senza questo passaggio, ci ritroveremmo con report frammentati e inutilizzabili: un report per shard, ciascuno con solo un quarto dei risultati. La [documentazione ufficiale sullo sharding](https://playwright.dev/docs/test-sharding) tratta il blob reporter come parte integrante del flusso.

---

## Emulazione mobile e API testing

Una volta ottimizzata la pipeline, possiamo allargare la copertura della nostra suite. Oltre ai test E2E su browser desktop, Playwright copre due aree complementari: l'emulazione di dispositivi mobili e il testing diretto delle API.

### Emulazione di viewport e touch

Il [testing su dispositivi mobili](https://playwright.dev/docs/emulation) con Playwright non richiede un dispositivo fisico. L'emulazione integrata simula viewport, user agent ed eventi touch di [decine di dispositivi mobili](https://github.com/nicedoc/playwright-devices/blob/master/README.md), e si integra nella configurazione a progetti. I dispositivi iOS usano il motore **WebKit** (Safari), quelli Android usano **Chromium**.

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    // Progetto per desktop
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    // Progetto per iPhone
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13 Pro'] },
    },
    // Progetto per Android
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
```
Eseguendo `npx playwright test --project="Mobile Safari"`, i test girano in un ambiente che simula un iPhone, con viewport ridotto e `hasTouch: true` (necessario per `page.tap()` e gli eventi touch). La reattività del layout e il comportamento touch sono verificabili direttamente nella pipeline CI.

### API testing per setup e verifica

Il [testing delle API con Playwright](https://playwright.dev/docs/api-testing) non serve solo a verificare i backend, ma anche a rendere i test UI più veloci e stabili.

**Casi d'uso principali:**
1.  **Verifica diretta degli endpoint**: test che controllano stato, risposta e schema di un'API, indipendentemente dall'interfaccia utente.
2.  **Setup e teardown dello stato**: invece di usare l'UI per creare un utente o configurare uno stato specifico, è preferibile utilizzare una chiamata API all'inizio del test. Il setup via API riduce significativamente il tempo di preparazione e le cause di flakiness.

**Esempio di setup via API:**

```typescript
test.beforeEach('Crea un prodotto di test', async ({ request }) => {
  // Questa chiamata API assicura che il prodotto esista prima che il test parta
  await request.post('/api/products', {
    data: { id: 'test-product-123', name: 'Prodotto di Test', price: 99 },
  });
});

test('il prodotto creato via API è visibile nella UI', async ({ page }) => {
  await page.goto('/products/test-product-123');
  await expect(page.getByRole('heading', { name: 'Prodotto di Test' })).toBeVisible();
});
```
Questa strategia ibrida (setup via API, verifica via UI) è un pattern consolidato per suite E2E mature.

## Test semantici come base per automazione e agenti AI

Fin qui ci siamo concentrati su come eseguire i test in modo efficiente. Ma l'approccio di Playwright, basato su selettori semantici e test che descrivono il comportamento dell'utente, ha implicazioni che vanno oltre il testing: i test diventano leggibili sia da persone che da strumenti automatici, aprendo la porta a due paradigmi emergenti.

### Test come documentazione eseguibile

Quando i test E2E sono scritti in modo leggibile e dichiarativo, diventano una **documentazione vivente ed eseguibile** del sistema. Un test come:

```javascript
test('Un utente non autenticato viene rediretto alla pagina di login', ...)
```
è più chiaro di una documentazione statica, perché è costantemente verificato contro il sistema reale. La suite di test diventa la fonte primaria di verità sul comportamento dell'applicazione.

### Agent-Driven Development

Una suite di test ben strutturata e basata sull'accessibilità è anche il prerequisito per l'**Agent-Driven Development**. Un agente AI che riceve un compito come *"Implementa la possibilità per un utente di aggiornare il proprio indirizzo email dalla pagina del profilo"* ha bisogno di due cose:

1.  **Comprendere lo stato attuale del sistema**: i test esistenti descrivono come funziona il flusso di login, come accedere alla pagina del profilo, quali elementi sono presenti. I selettori semantici (`getByRole`, `getByLabel`) sono un linguaggio interpretabile sia da persone che da agenti.
2.  **Verificare il proprio lavoro**: una volta implementata la funzionalità, l'agente deve poter scrivere un nuovo test E2E per validare il risultato, seguendo i pattern già presenti nella codebase.

Strumenti come [Claude Code](https://claude.ai/claude-code), [Cursor](https://cursor.sh/) e [SWE-Agent](https://swe-agent.com/) utilizzano già i test come feedback loop per validare le modifiche generate. Senza test chiari e semantici, questo livello di automazione non è praticabile. L'enfasi di Playwright su selettori semantici e accessibilità lo rende compatibile sia con le pratiche di testing attuali sia con gli scenari di automazione basati su agenti.

---

## Quanto vale far girare la suite in CI

Una suite E2E che gira solo in locale è una suite che qualcuno deve ricordarsi di lanciare, e prima o poi nessuno se lo ricorda. Portarla in CI non la rende migliore: **la rende inevitabile**, che è la sola proprietà che conta per un test di regressione.

Lo sharding serve a rendere quella inevitabilità sopportabile: 200 test su quattro shard scendono a circa un quarto del tempo, ed è la differenza fra un controllo che si aspetta e uno che si salta.

**Tradotto per chi guarda i tempi di rilascio:** una regressione trovata in pipeline costa i minuti della pipeline; la stessa regressione trovata da un cliente costa una segnalazione, un'indagine e un rilascio d'emergenza — più la fiducia, che non si misura in minuti.

## Da provare domani

Prendete il test più lento della suite e mettetelo su uno shard suo. Se il tempo totale scende, avete il caso pronto da portare a chi decide come si spende il tempo di CI.

## Risorse Utili

* **Playwright Docs**: [playwright.dev](https://playwright.dev)
* **Best Practices**: [playwright.dev/docs/best-practices](https://playwright.dev/docs/best-practices)
* **VS Code Extension**: [marketplace.visualstudio.com](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright)
* **Discord**: [aka.ms/playwright/discord](https://aka.ms/playwright/discord)
* **GitHub**: [github.com/microsoft/playwright](https://github.com/microsoft/playwright)

---

## Repository

Tutto il codice del workshop:

[workshop-playwright](https://github.com/monte97/workshop-playwright)

```bash
git clone https://github.com/monte97/workshop-playwright
cd workshop-playwright

# Demo app
cd infrastructure-demo && npm install && npm start

# Test
cd ../demo && npm install && npx playwright test --ui
```

---
