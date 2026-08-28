---
title: "Playwright: Visual Regression Testing per Catturare Bug Invisibili"
seoTitle: "Playwright: visual regression testing"
date: 2026-03-04T09:00:00.000Z
description: "Come usare toHaveScreenshot() per catturare bug visivi che i test funzionali non vedono: masking, stati mockati, cross-browser e CI"
pillar: verificare
category: testing
tags:
  - Playwright
  - Testing
  - E2E
  - Visual Testing
  - Screenshot
  - TypeScript
lang: it
series: playwright
seriesOrder: 60
reproducibility: true
summary:
  - label: "Problema"
    value: "I test funzionali vedono il DOM, non il rendering"
    note: "Elementi spostati o coperti, font non caricato: il DOM è corretto, lo schermo no"
  - label: "Strumento"
    value: "`toHaveScreenshot()` confronta pixel per pixel con una baseline approvata"
    note: "Al fallimento produce screenshot attuale, baseline attesa e immagine diff"
  - label: "Scelta"
    value: "Dati mockati per rendere la baseline deterministica"
    note: "Errore, vuoto e caricamento diventano stati catturabili su richiesta"
  - label: "Costo reale"
    value: "Tre browser significano tre volte baseline, esecuzione e review"
openItems:
  - "Le baseline vanno generate nello stesso ambiente dei test: quelle del laptop macOS generano falsi positivi sui runner Linux di CI"
  - "Il cross-browser paga dove gli utenti usano browser diversi: con un target noto, come Chrome aziendale, è overkill"
  - "Il visual testing aggiunge valore a design stabilizzato: in prototipazione ogni commit genera diff e i fallimenti vengono ignorati"
  - "Restano esclusi API, backend e prodotti in early stage: si introduce quando il design è abbastanza maturo da proteggere"
openNote: "Dove la rete di sicurezza visiva non va installata."
mode: how-to
figures:
  - kind: timeline
    at: tohavescreenshot-in-30-secondi
    label: "La vita di una baseline"
    caption: "Il fallimento al primo run non è un bug: è il momento in cui la baseline non esiste ancora"
    steps:
      - kind: "Primo run"
        title: "La baseline non c'è, e il test fallisce"
        desc: "Playwright genera lo screenshot in `__snapshots__` accanto al file di test e chiede di rieseguire. Non c'era niente con cui confrontare."
      - kind: "Secondo run"
        title: "Confronto pixel per pixel"
        desc: "Nuovo screenshot contro baseline salvata. Immagini identiche: verde."
      - kind: "Differenza"
        title: "Tre file in `test-results/`"
        desc: "Screenshot attuale, baseline attesa, immagine diff. Il fallimento è una domanda, non un verdetto: quella differenza può essere una regressione o un cambiamento voluto."
      - kind: "Cambiamento voluto"
        title: "`--update-snapshots`, poi il commit"
        desc: "La nuova baseline sostituisce la vecchia e va nel repository. È un'approvazione visiva: qualcuno deve guardarla prima di committarla."
        done: true
---

Il test funzionale passa: il bottone esiste, il testo è corretto, il redirect funziona. Ma il layout è rotto. Un CSS override ha spostato il bottone fuori dallo schermo, un `z-index` sbagliato nasconde il messaggio di errore sotto un altro elemento, un font non caricato rende il testo illeggibile. I test funzionali non vedono questi problemi -- verificano la struttura del DOM, non il rendering. Un `toBeVisible()` controlla che l'elemento non abbia `display: none`, non che sia effettivamente leggibile a schermo.

Il visual regression testing risolve questo gap: cattura screenshot della pagina e li confronta con una baseline approvata. Se qualcosa cambia visivamente -- un margine, un colore, un allineamento -- il test fallisce con un'immagine diff che evidenzia le differenze pixel per pixel. Non sostituisce i test funzionali: li complementa, coprendo una categoria di bug che nessuna asserzione sul DOM può intercettare.

Questo articolo copre cinque pattern di visual testing con Playwright, partendo dal confronto base fino alla configurazione per CI cross-browser. Il codice usa [MockMart](https://github.com/monte97/MockMart), lo stesso ambiente degli articoli precedenti su [network mocking](/blog/verificare/testing/04-network-mocking/) e [fixture riusabili](/blog/verificare/testing/05-network-mocking-avanzato/). Per il setup iniziale e la configurazione di Playwright, fai riferimento alla [guida introduttiva](/blog/verificare/testing/01-guida-completa-e2e/).

---

## toHaveScreenshot() in 30 secondi

Playwright include il visual testing nativamente, senza librerie esterne. Il pattern base è una singola riga:

```typescript
test('should match homepage baseline', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="product-card"]').first().waitFor();

  await expect(page).toHaveScreenshot('homepage.png');
});
```

Alla **prima esecuzione** il test non ha una baseline con cui confrontare. Playwright genera automaticamente lo screenshot e lo salva nella cartella `__snapshots__` accanto al file di test. Il test fallisce con un messaggio che indica che la baseline è stata creata e che serve rieseguire il test per il confronto.

Alla **seconda esecuzione** Playwright cattura un nuovo screenshot e lo confronta pixel per pixel con la baseline salvata. Se le due immagini sono identiche, il test passa. Se ci sono differenze, il test fallisce e genera tre file nella cartella `test-results/`: lo screenshot attuale, la baseline attesa, e un'immagine diff che evidenzia i pixel diversi.

Per catturare l'intera pagina scrollabile, non solo la viewport visibile:

```typescript
test('should match full page screenshot', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="product-card"]').first().waitFor();

  await expect(page).toHaveScreenshot('homepage-full.png', {
    fullPage: true,
  });
});
```

Quando il design cambia intenzionalmente -- un restyling, un nuovo componente, un aggiornamento dei colori -- le baseline vanno aggiornate:

```bash
npx playwright test --update-snapshots
```

Questo comando riesegue tutti i test e sostituisce le baseline con i nuovi screenshot. Le baseline aggiornate vanno committate nel repository: sono l'approvazione visiva dello stato corrente dell'applicazione.

> **Attenzione al waitFor()**: lo screenshot viene catturato nell'istante in cui `toHaveScreenshot()` viene chiamato. Se la pagina sta ancora caricando dati o renderizzando componenti, lo screenshot catturerà uno stato intermedio. Usa sempre `waitFor()` o un'asserzione Playwright (che ha auto-waiting) prima di catturare lo screenshot.

---

## Mascherare elementi dinamici

Il primo ostacolo pratico: elementi che cambiano a ogni esecuzione. Un timestamp mostra l'ora corrente, un session ID è diverso per ogni visita, un contatore mostra valori che variano. Questi elementi generano diff a ogni run, anche se il layout è identico. Sono falsi positivi -- il test fallisce per un motivo irrilevante.

La soluzione è il parametro `mask`: un array di locator che Playwright copre con un blocco colorato prima di catturare lo screenshot.

```typescript
test('should mask timestamps and session IDs in cart', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="product-card"]').first().click();
  await page.locator('[data-testid="add-to-cart"]').click();

  await page.locator('[data-testid="cart-icon"]').click();
  await page.locator('[data-testid="cart-item"]').first().waitFor();

  await expect(page).toHaveScreenshot('cart-with-items.png', {
    mask: [
      page.locator('[data-testid="timestamp"]'),
      page.locator('[data-testid="cart-id"]'),
    ],
  });
});
```

L'area coperta dai locator viene sostituita da un rettangolo rosa nella baseline e nello screenshot attuale. Il confronto ignora quelle zone, eliminando i falsi positivi da contenuto dinamico.

Un altro problema frequente sono le animazioni CSS: transizioni, fade-in, spinner. Se lo screenshot viene catturato durante un'animazione, il frame esatto varia tra esecuzioni. Il parametro `animations` le disattiva:

```typescript
test('should disable animations for consistent screenshots', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="product-card"]').first().waitFor();

  await expect(page).toHaveScreenshot('homepage-no-animations.png', {
    animations: 'disabled',
  });
});
```

Con `animations: 'disabled'`, Playwright forza tutte le animazioni CSS al frame finale prima di catturare lo screenshot. Transizioni, keyframe, `transition-duration` -- tutto viene completato istantaneamente.

> **Mascherare troppo vanifica il test**. Se si mascherano 10 elementi su una pagina con 12, si sta testando solo il background e la navbar. La regola: mascherare solo ciò che è genuinamente dinamico e non controllabile (timestamp, ID di sessione, contatori real-time). Se un valore cambia perché i dati cambiano, la soluzione è mockare i dati, non mascherare il rendering.

---

## Screenshot di stati specifici

Qui il visual testing diventa potente: combinarlo con il network mocking degli articoli [04](/blog/verificare/testing/04-network-mocking/) e [05](/blog/verificare/testing/05-network-mocking-avanzato/). La `MockApi` fixture permette di forzare l'applicazione in qualsiasi stato -- errore, vuoto, caricamento -- e catturare uno screenshot di quello stato esatto.

### Stato di errore

```typescript
test('should capture error state', async ({ page, mockApi }) => {
  await mockApi.productsError(500);
  await page.goto('/');

  await page.getByText(/error|errore/i).waitFor();

  await expect(page).toHaveScreenshot('error-state.png');
});
```

Il test forza un errore 500, aspetta che la UI di errore appaia, e cattura lo screenshot. La baseline diventa la rappresentazione visiva approvata dello stato di errore. Se qualcuno modifica il componente di errore -- cambia il colore, sposta l'icona, rimuove il messaggio -- il test visual lo intercetta.

### Stato vuoto

```typescript
test('should capture empty product list', async ({ page, mockApi }) => {
  await mockApi.emptyProducts();
  await page.goto('/');

  await page.getByText(/no products|nessun prodotto/i).waitFor();

  await expect(page).toHaveScreenshot('empty-state.png');
});
```

Lo stato vuoto è spesso trascurato nel design. Un test funzionale verifica che il messaggio "Nessun prodotto" esista nel DOM. Un test visual verifica che sia centrato, leggibile, con il giusto padding e senza elementi sovrapposti.

### Stato di caricamento

```typescript
test('should capture loading state with delayed response', async ({ page, mockApi }) => {
  await mockApi.delay('**/api/products', 3000);
  await page.goto('/');

  await page.getByText(/loading|caricamento/i).waitFor();

  await expect(page).toHaveScreenshot('loading-state.png');
});
```

Il delay di 3 secondi crea la finestra temporale per catturare lo spinner o lo skeleton in azione. Senza il mock del delay, l'API risponde in millisecondi e lo stato di caricamento non è mai visibile abbastanza a lungo per uno screenshot.

### Layout con dati controllati

```typescript
test('should capture custom product layout', async ({ page, mockApi }) => {
  await mockApi.products([
    fakeProduct({ id: 1, name: 'Visual Test Product A', price: 9.99 }),
    fakeProduct({ id: 2, name: 'Visual Test Product B', price: 19.99 }),
  ]);
  await page.goto('/');
  await page.locator('[data-testid="product-card"]').first().waitFor();

  await expect(page).toHaveScreenshot('custom-products.png');
});
```

Mockare i dati rende la baseline deterministica: stessi prodotti, stessi nomi, stessi prezzi a ogni esecuzione. Senza mock, i dati dal backend possono cambiare (nuovi prodotti, prezzi aggiornati, immagini diverse) e generare diff che non hanno nulla a che fare con il codice.

Questo pattern rende testabile il design di **ogni stato dell'applicazione**. Non solo l'happy path con 10 prodotti -- ma anche l'errore, il vuoto, il caricamento, il singolo prodotto, i 100 prodotti. Ogni combinazione di mock produce una baseline visiva indipendente.

---

## Screenshot di componenti

Finora gli screenshot catturano l'intera pagina. Ma spesso il test visual riguarda un singolo componente: una card prodotto, un elemento del carrello, un widget. Playwright supporta screenshot a livello di elemento con la stessa API:

```typescript
test('should match single product card', async ({ page, mockApi }) => {
  await mockApi.products([
    fakeProduct({ id: 1, name: 'Screenshot Card', price: 42.00 }),
  ]);
  await page.goto('/');
  await page.locator('[data-testid="product-card"]').first().waitFor();

  const card = page.locator('[data-testid="product-card"]').first();
  await expect(card).toHaveScreenshot('product-card.png');
});
```

La differenza chiave: `expect(card)` invece di `expect(page)`. Playwright cattura solo il bounding box del locator, non l'intera viewport. Il risultato è uno screenshot più piccolo, focalizzato sul componente.

Lo stesso pattern per un elemento del carrello, combinando screenshot di componente e masking:

```typescript
test('should match cart item component', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="product-card"]').first().click();
  await page.locator('[data-testid="add-to-cart"]').click();

  await page.locator('[data-testid="cart-icon"]').click();
  await page.locator('[data-testid="cart-item"]').first().waitFor();

  const cartItem = page.locator('[data-testid="cart-item"]').first();
  await expect(cartItem).toHaveScreenshot('cart-item.png', {
    mask: [page.locator('[data-testid="timestamp"]')],
  });
});
```

I vantaggi degli screenshot di componente rispetto alla pagina intera:

- **Stabilità**: meno area catturata significa meno probabilità di diff irrilevanti. Un cambiamento nella navbar non rompe il test della product card.
- **Leggibilità**: le diff sono più facili da interpretare. Un diff su una card 300x200 è immediatamente comprensibile. Un diff su una pagina 1920x5000 richiede zoom e analisi.
- **Velocità di review**: quando il test fallisce, si capisce subito cosa è cambiato guardando l'immagine diff del componente.
- **Design system**: per team che mantengono una libreria di componenti, gli screenshot di componente funzionano come test di regressione visiva del design system.

Il trade-off: servono più test per coprire l'intera pagina. Ma nella pratica, gli screenshot di componente coprono il 90% dei casi d'uso con una frazione della fragilità.

---

## Cross-browser visual testing

Il rendering CSS non è identico tra i browser engine. Un `flexbox` con `gap` può avere un pixel di differenza tra Chromium e Firefox. Un `border-radius` può essere anti-aliased diversamente in WebKit. Un font può avere metriche leggermente diverse.

Playwright gestisce questo generando **baseline separate per ogni progetto**. Nel `playwright.config.ts`, ogni progetto produce i propri screenshot nella cartella `__snapshots__`, organizzati per nome del progetto:

```typescript
// playwright.config.ts — sezione projects
projects: [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
  {
    name: 'firefox',
    use: { ...devices['Desktop Firefox'] },
  },
  {
    name: 'webkit',
    use: { ...devices['Desktop Safari'] },
  },
],
```

Con questa configurazione, il test `toHaveScreenshot('homepage.png')` produce tre baseline separate: una per Chromium, una per Firefox, una per WebKit. Ogni browser viene confrontato solo con la propria baseline, eliminando i falsi positivi da differenze di rendering tra engine.

**Quando serve**: applicazioni rivolte al pubblico dove gli utenti usano browser diversi. Differenze di rendering in `grid`, `flexbox`, font fallback, `backdrop-filter` possono creare bug visivi significativi su un browser ma non sugli altri.

**Quando è overkill**: applicazioni interne dove il browser target è noto (es. Chrome aziendale). In questo caso, un singolo progetto Chromium è sufficiente e dimezza il tempo di esecuzione e la manutenzione delle baseline.

> Il costo del cross-browser visual testing è lineare: 3 browser = 3x baseline da mantenere, 3x tempo di esecuzione, 3x screenshot da revisionare quando un test fallisce. Valuta se il beneficio giustifica il costo per il tuo caso d'uso.

---

## Visual testing in CI

Il problema più comune con il visual testing in CI: le baseline generate sulla macchina di sviluppo non corrispondono a quelle generate nel runner CI. Lo stesso font ha rendering diverso tra macOS e Linux. L'antialiasing varia tra schede grafiche. La risoluzione di default può essere diversa. Il risultato: test che passano localmente e falliscono in CI, o viceversa.

La soluzione è semplice nel principio: **generare le baseline nello stesso ambiente in cui i test vengono eseguiti**. In pratica, questo significa usare il container Docker ufficiale di Playwright:

```yaml
# .github/workflows/visual-tests.yml
jobs:
  visual-test:
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v1.50.0-noble
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright test --grep @visual
```

Per aggiornare le baseline in CI, un job dedicato le rigenera e le committa:

```yaml
  update-baselines:
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v1.50.0-noble
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright test --grep @visual --update-snapshots
      - uses: actions/upload-artifact@v4
        with:
          name: updated-baselines
          path: tests/e2e/tests/**/__snapshots__/**
```

Le baseline aggiornate vengono caricate come artifact. Un membro del team le revisiona e le committa nel repository se le differenze sono intenzionali.

Quando un test visual fallisce in CI, le immagini diff sono fondamentali per il debug. Configurare i risultati come artifact del workflow rende le diff accessibili direttamente dalla PR:

```yaml
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: visual-diffs
          path: test-results/
          retention-days: 7
```

La cartella `test-results/` contiene, per ogni test fallito, tre file: `*-actual.png` (lo screenshot catturato), `*-expected.png` (la baseline), `*-diff.png` (le differenze evidenziate). Chi revisiona la PR può scaricare l'artifact e capire immediatamente cosa è cambiato.

> **Non committare baseline generate sul laptop**. Anche se il test passa localmente, la baseline di macOS non corrisponde a quella di Linux e genererà falsi positivi in CI. Il workflow corretto è: scrivere il test localmente, pushare senza baseline, lasciare che il job CI generi le baseline, scaricare e committare quelle.

---

## Limiti e trade-off

Il visual testing non è adatto a tutti i contesti. Come ogni strumento di testing, ha un costo di manutenzione che va bilanciato con il valore che fornisce.

| Limite | Mitigazione |
|--------|-------------|
| Font rendering diverso tra OS | Docker per baseline consistenti |
| Flakiness da antialiasing | `threshold: 0.3`, `maxDiffPixelRatio: 0.01` |
| Costo manutenzione baseline | Aggiornare solo quando il design cambia |
| Screenshot fragili (cambiano con ogni modifica UI) | Preferire component-level a full-page |
| Non adatto per: API, backend, early stage | Introdurre quando il design si stabilizza |

I parametri `threshold` e `maxDiffPixelRatio` sono la leva principale contro la flakiness:

```typescript
test('should pass with relaxed threshold', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="product-card"]').first().waitFor();

  await expect(page).toHaveScreenshot('homepage-tolerant.png', {
    maxDiffPixelRatio: 0.01,
    threshold: 0.3,
  });
});
```

- **`threshold`** (0-1): sensibilità per singolo pixel. Un valore di 0.3 tollera variazioni minime di colore dovute all'antialiasing. Il default è 0.2.
- **`maxDiffPixelRatio`** (0-1): percentuale massima di pixel diversi sull'intera immagine. 0.01 significa che l'1% dei pixel può differire senza far fallire il test.

Per scenari dove serve precisione assoluta -- un design system, un componente con specifiche pixel-perfect -- si possono stringere i parametri:

```typescript
test('should compare with strict settings', async ({ page, mockApi }) => {
  await mockApi.products([
    fakeProduct({ id: 1, name: 'Pixel Perfect', price: 100 }),
  ]);
  await page.goto('/');
  await page.locator('[data-testid="product-card"]').first().waitFor();

  await expect(page).toHaveScreenshot('pixel-perfect.png', {
    maxDiffPixelRatio: 0,
    threshold: 0.1,
    animations: 'disabled',
  });
});
```

Qui `maxDiffPixelRatio: 0` non tollera nessun pixel diverso. È utile con dati mockati e animazioni disattivate, dove ogni variazione è un bug reale.

Il principio guida: il visual testing aggiunge valore quando il design è stabile. In fase di prototipazione, ogni commit modifica il layout e ogni modifica genera diff. Il risultato è rumore: il team inizia a ignorare i fallimenti visual, o peggio, aggiorna le baseline meccanicamente senza revisionarle. Introdurre il visual testing quando l'interfaccia ha raggiunto una maturità sufficiente da giustificare la protezione contro le regressioni.

---

## Riepilogo

Cinque pattern di visual regression testing con Playwright:

1. **Screenshot base** -- `toHaveScreenshot('name.png')` per catturare e confrontare la pagina con una baseline approvata. `fullPage: true` per l'intera pagina scrollabile.
2. **Masking** -- `mask` per coprire elementi dinamici (timestamp, session ID) che generano falsi positivi. `animations: 'disabled'` per eliminare la variabilità delle animazioni CSS.
3. **Stati mockati** -- combinare `MockApi` con `toHaveScreenshot()` per catturare baseline di ogni stato dell'applicazione: errore, vuoto, caricamento, dati controllati.
4. **Screenshot di componente** -- `expect(locator).toHaveScreenshot()` per testare singoli elementi. Più stabile, più leggibile, più facile da mantenere.
5. **Configurazione** -- `threshold` e `maxDiffPixelRatio` per bilanciare sensibilità e stabilità. Parametri stretti per design system, rilassati per pagine complesse.

Il visual testing non sostituisce i test funzionali -- copre un gap diverso. I test funzionali verificano che il bottone esista e funzioni. I test visual verificano che sia visibile, allineato, e non coperto da un altro elemento. Insieme, coprono sia la logica sia il rendering.

Articoli della serie Playwright:

- [01 - Guida completa E2E](/blog/verificare/testing/01-guida-completa-e2e/)
- [02 - OpenTelemetry Trace Correlation](/blog/verificare/testing/02-opentelemetry-trace-correlation/)
- [03 - CI/CD Strategie avanzate](/blog/verificare/testing/03-cicd-strategie-avanzate/)
- [04 - Network Mocking](/blog/verificare/testing/04-network-mocking/)
- [05 - Mock Fixture, HAR Replay e Composizione](/blog/verificare/testing/05-network-mocking-avanzato/)
- 06 - Visual Regression Testing (questo articolo)

Il codice completo è nel repository [MockMart](https://github.com/monte97/MockMart). Con mock deterministici, masking degli elementi dinamici, e baseline generate in CI, il visual testing diventa una rete di sicurezza affidabile per il design della tua applicazione.
