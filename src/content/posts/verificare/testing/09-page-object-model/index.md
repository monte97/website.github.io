---
title: "Playwright: Page Object Model per Test Manutenibili"
seoTitle: "Playwright: il Page Object Model"
date: 2026-03-05T09:00:00.000Z
description: "Come organizzare i test E2E con il Page Object Model: classi riusabili, fixture Playwright, composizione con mock e refactoring guidato"
pillar: verificare
category: testing
tags:
  - Playwright
  - Testing
  - E2E
  - Page Object Model
  - TypeScript
  - Architecture
lang: it
reviewed: false
series: playwright
seriesOrder: 90
reproducibility: true
summary:
  - label: "Problema"
    value: "Lo stesso selettore sparso in cinque file diversi"
    note: "Un rename del frontend costa otto aggiornamenti, e basta perderne uno"
  - label: "Scelta"
    value: "Classi per pagina: locator come proprietà, azioni utente come metodi"
    note: "Il Page Object non fa asserzioni: decidere cosa verificare spetta al test"
  - label: "Risultato"
    value: "Il checkout flow scende da quindici locator a cinque righe di scenario"
  - label: "Composizione"
    value: "`mergeTests` unisce fixture POM e mockApi nello stesso test"
openItems:
  - "Con un selettore usato in un solo test, una pagina da una-due interazioni o uno spike esplorativo, il POM è boilerplate senza beneficio"
  - "Page Object creati per ogni pagina al giorno zero producono classi mai usate: il pattern deve emergere dal refactoring"
  - "Le asserzioni su testi generici senza `data-testid` restano su `page.getByText()`: il POM copre azioni ripetute e selettori strutturali"
  - "L'indirezione non elimina l'accoppiamento, lo sposta dal DOM alla classe: quando la UI cambia si aggiorna la pagina object, non i test"
mode: how-to
---

La suite funziona. Otto articoli di test, dieci file spec, copertura su checkout, autenticazione, visual regression, network mocking. I test passano, la CI è verde, il team si fida della suite. Ma apri un file qualsiasi e trovi questo:

```typescript
await page.locator('[data-testid="checkout-button"]').click();
```

Lo stesso selettore appare in cinque file diversi. `[data-testid="first-name"]` in tre. `[data-testid="add-to-cart-${id}"]` in quattro. Ogni volta che il frontend cambia un `data-testid`, servono N aggiornamenti in N file. Non è un problema oggi -- è un problema che cresce linearmente con la suite.

Il Page Object Model risolve questo centralizzando selettori e azioni utente in classi riusabili. Non è un pattern nuovo, non è un'invenzione di Playwright -- è il modo standard di scalare una suite E2E oltre il singolo file. Martin Fowler lo ha descritto nel 2013, Selenium lo ha adottato come best practice, e Playwright lo supporta nativamente attraverso il sistema di fixture.

Questo articolo usa [MockMart](https://github.com/monte97/MockMart), lo stesso ambiente dell'intera [serie Playwright](/blog/verificare/testing/01-guida-completa-e2e/). Il codice completo è nel [repository](https://github.com/monte97/MockMart), nella directory `tests/e2e/`.

---

## Il problema: selettori sparsi

Apri cinque file spec della suite MockMart e conta le occorrenze dei selettori. Il risultato è prevedibile:

| Selettore | File in cui appare | Occorrenze totali |
|-----------|-------------------|-------------------|
| `[data-testid="checkout-button"]` | 5 | 8 |
| `[data-testid="first-name"]` | 3 | 5 |
| `[data-testid="add-to-cart-${id}"]` | 4 | 7 |
| `[data-testid="cart-total"]` | 3 | 4 |
| `[data-testid="place-order-button"]` | 4 | 6 |
| `[data-testid="order-number"]` | 3 | 5 |

Il costo è diretto: se il team frontend rinomina `checkout-button` in `proceed-to-checkout`, servono 8 aggiornamenti in 5 file. Se dimentichi un file, il test fallisce. Se il rename avviene in un PR diverso da chi mantiene i test, il problema emerge solo in CI.

Ma il costo più sottile è nella leggibilità. Un test che contiene `page.locator('[data-testid="payment-credit-card"]').click()` parla di attributi DOM. Un test che contiene `checkoutPage.selectCreditCard()` parla di azioni utente. Il primo è un dettaglio implementativo, il secondo è un'intenzione. Quando un test fallisce, il secondo si legge in un secondo -- il primo richiede di ricostruire mentalmente cosa fa quel selettore.

Il selettore è un dettaglio implementativo. Il test dovrebbe parlare di azioni utente, non di attributi DOM.

---

## Page Object in 30 secondi

Il pattern è semplice: una classe per pagina, i locator come proprietà, le azioni utente come metodi. Il test non vede selettori.

**Prima -- selettori inline:**

```typescript
test('should add product and proceed to checkout', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="add-to-cart-1"]').click();
  await page.goto('/cart');
  await page.locator('[data-testid="checkout-button"]').click();
  await page.locator('[data-testid="first-name"]').fill('Mario');
  await page.locator('[data-testid="last-name"]').fill('Rossi');
  // ... altri 6 campi ...
  await page.locator('[data-testid="place-order-button"]').click();
});
```

**Dopo -- Page Object:**

```typescript
test('should add product and proceed to checkout', async ({ page }) => {
  const home = new HomePage(page);
  const cart = new CartPage(page);
  const checkout = new CheckoutPage(page);

  await home.goto();
  await home.addToCart(1);
  await cart.goto();
  await cart.proceedToCheckout();
  await checkout.fillShipping({ firstName: 'Mario', lastName: 'Rossi', /* ... */ });
  await checkout.placeOrder();
});
```

Il test si legge come una sequenza di azioni utente: vai alla home, aggiungi al carrello, vai al carrello, procedi al checkout, compila, ordina. I selettori sono nascosti dentro le classi. Se il frontend cambia un `data-testid`, si aggiorna la classe -- non i test.

Una regola importante: **il Page Object non fa asserzioni**. Espone locator e metodi, ma non decide cosa verificare. È il test che chiama `expect()`. Questo mantiene le classi riusabili -- la stessa classe funziona sia per un test che verifica il totale del carrello sia per uno che verifica il numero di prodotti. Se il Page Object contenesse asserzioni, diventerebbe specifico per un singolo scenario e perderebbe il vantaggio della centralizzazione.

---

## Page Object per MockMart

MockMart ha tre pagine principali nel flusso d'acquisto: la homepage con il catalogo prodotti, il carrello e il checkout. Ogni pagina diventa una classe.

### HomePage

La homepage gestisce il catalogo: ricerca, filtri e azione di aggiunta al carrello.

```typescript
import { type Page, type Locator } from '@playwright/test';

export class HomePage {
  // -- Locators --
  readonly searchInput: Locator;
  readonly categoryFilter: Locator;
  readonly sortFilter: Locator;

  constructor(private page: Page) {
    this.searchInput = page.locator('[data-testid="search-input"]');
    this.categoryFilter = page.locator('[data-testid="category-filter"]');
    this.sortFilter = page.locator('[data-testid="sort-filter"]');
  }

  // -- Navigation --

  async goto() {
    await this.page.goto('/');
  }

  // -- Product Actions --

  productCard(id: number) {
    return this.page.locator(`[data-testid="product-${id}"]`);
  }

  /** Get all visible product cards (use .count() or .nth()). */
  get productCards() {
    return this.page.locator('[class="product-card"]');
  }

  addToCartButton(id: number) {
    return this.page.locator(`[data-testid="add-to-cart-${id}"]`);
  }

  async addToCart(productId: number) {
    await this.addToCartButton(productId).click();
  }

  // -- Search & Filters --

  async search(query: string) {
    await this.searchInput.fill(query);
  }

  async filterByCategory(category: string) {
    await this.categoryFilter.selectOption(category);
  }

  async sortBy(option: string) {
    await this.sortFilter.selectOption(option);
  }
}
```

I locator statici (`searchInput`, `categoryFilter`) sono proprietà `readonly` inizializzate nel costruttore. I locator dinamici (`productCard(id)`, `addToCartButton(id)`) sono metodi che accettano parametri. Questa distinzione è intenzionale: i locator statici si risolvono una volta, quelli dinamici dipendono dal contesto.

### CartPage

Il carrello gestisce quantità, rimozione e navigazione verso il checkout.

```typescript
import { type Page, type Locator } from '@playwright/test';

export class CartPage {
  // -- Locators --
  readonly subtotal: Locator;
  readonly total: Locator;
  readonly checkoutButton: Locator;

  constructor(private page: Page) {
    this.subtotal = page.locator('[data-testid="cart-subtotal"]');
    this.total = page.locator('[data-testid="cart-total"]');
    this.checkoutButton = page.locator('[data-testid="checkout-button"]');
  }

  // -- Navigation --

  async goto() {
    await this.page.goto('/cart');
  }

  // -- Cart Item Actions --

  cartItem(productId: number) {
    return this.page.locator(`[data-testid="cart-item-${productId}"]`);
  }

  quantity(productId: number) {
    return this.page.locator(`[data-testid="quantity-${productId}"]`);
  }

  async increase(productId: number) {
    await this.page.locator(`[data-testid="increase-${productId}"]`).click();
  }

  async decrease(productId: number) {
    await this.page.locator(`[data-testid="decrease-${productId}"]`).click();
  }

  async remove(productId: number) {
    await this.page.locator(`[data-testid="remove-${productId}"]`).click();
  }

  // -- Checkout --

  async proceedToCheckout() {
    await this.checkoutButton.click();
  }
}
```

`proceedToCheckout()` è un metodo che wrappa un singolo click. Sembra eccessivo, ma il valore è nella leggibilità del test: `cartPage.proceedToCheckout()` comunica l'intenzione, `page.locator('[data-testid="checkout-button"]').click()` comunica l'implementazione.

### CheckoutPage

Il checkout è la pagina più complessa: form di spedizione con sei campi, selezione del metodo di pagamento e conferma ordine.

```typescript
import { type Page, type Locator } from '@playwright/test';

interface ShippingInfo {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  zipCode: string;
  phone: string;
}

export class CheckoutPage {
  // -- Locators --
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly address: Locator;
  readonly city: Locator;
  readonly zipCode: Locator;
  readonly phone: Locator;
  readonly orderTotal: Locator;
  readonly placeOrderButton: Locator;
  readonly orderNumber: Locator;

  constructor(private page: Page) {
    this.firstName = page.locator('[data-testid="first-name"]');
    this.lastName = page.locator('[data-testid="last-name"]');
    this.address = page.locator('[data-testid="address"]');
    this.city = page.locator('[data-testid="city"]');
    this.zipCode = page.locator('[data-testid="zip-code"]');
    this.phone = page.locator('[data-testid="phone"]');
    this.orderTotal = page.locator('[data-testid="order-total"]');
    this.placeOrderButton = page.locator('[data-testid="place-order-button"]');
    this.orderNumber = page.locator('[data-testid="order-number"]');
  }

  // -- Navigation --

  async goto() {
    await this.page.goto('/checkout');
  }

  // -- Shipping Form --

  async fillShipping(info: ShippingInfo) {
    await this.firstName.fill(info.firstName);
    await this.lastName.fill(info.lastName);
    await this.address.fill(info.address);
    await this.city.fill(info.city);
    await this.zipCode.fill(info.zipCode);
    await this.phone.fill(info.phone);
  }

  // -- Payment --

  async selectCreditCard() {
    await this.page.locator('[data-testid="payment-credit-card"]').click();
  }

  async selectPayPal() {
    await this.page.locator('[data-testid="payment-paypal"]').click();
  }

  async selectBankTransfer() {
    await this.page.locator('[data-testid="payment-bank-transfer"]').click();
  }

  // -- Order --

  async placeOrder() {
    await this.placeOrderButton.click();
  }

  /** Complete checkout with default shipping data and credit card. */
  async completeWithDefaults() {
    await this.fillShipping({
      firstName: 'Mario',
      lastName: 'Rossi',
      address: 'Via Roma 1',
      city: 'Bologna',
      zipCode: '40100',
      phone: '+39 051 1234567',
    });
    await this.selectCreditCard();
    await this.placeOrder();
  }
}
```

`completeWithDefaults()` è un metodo helper che compila il form con dati di test standard e seleziona carta di credito. Senza questo metodo, ogni test che arriva al checkout deve ripetere le stesse 8 righe di compilazione form. Con il metodo, una riga. Non è un pattern obbligatorio -- se ogni test ha dati diversi, `fillShipping()` è sufficiente. Ma per i test dove il form di checkout è un passaggio intermedio e non il soggetto della verifica, `completeWithDefaults()` elimina rumore.

L'interfaccia `ShippingInfo` tipizza i dati del form. Se il frontend aggiunge un campo (email, stato), il compilatore TypeScript segnala tutti i test che non passano il nuovo campo. L'errore emerge in fase di compilazione, non in fase di esecuzione.

---

## Fixture POM

I Page Object funzionano, ma ogni test deve creare le istanze manualmente:

```typescript
const home = new HomePage(page);
const cart = new CartPage(page);
const checkout = new CheckoutPage(page);
```

Tre righe identiche in ogni file. Il sistema di fixture di Playwright risolve questo: si definiscono i Page Object come fixture, e il test li riceve come parametri.

```typescript
import { test as base } from '@playwright/test';
import { HomePage } from '../pages/home.page';
import { CartPage } from '../pages/cart.page';
import { CheckoutPage } from '../pages/checkout.page';

export const test = base.extend<{
  homePage: HomePage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
}>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
});

export { expect } from '@playwright/test';
```

`base.extend()` crea un nuovo test object con fixture aggiuntive. Ogni fixture riceve `page` (la fixture built-in di Playwright) e chiama `use()` con l'istanza del Page Object. Il test che importa questo `test` riceve `homePage`, `cartPage` e `checkoutPage` già pronti.

Il vantaggio non è solo estetico. Le fixture sono lazy: se un test usa solo `homePage`, Playwright non crea `cartPage` e `checkoutPage`. E il ciclo di vita è gestito: dopo il `use()`, si può aggiungere logica di cleanup (per esempio, svuotare il carrello dopo ogni test). Un singolo punto di creazione per tutte le istanze, nessun `new HomePage(page)` sparso nei file.

---

## Refactoring: da inline a POM

Il valore del Page Object emerge nel confronto diretto. Ecco il checkout flow di MockMart prima e dopo il refactoring.

**Prima -- selettori inline:**

```typescript
test('complete purchase flow', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="add-to-cart-1"]').click();

  await page.goto('/cart');
  await expect(page.locator('[data-testid="cart-total"]')).toBeVisible();
  await page.locator('[data-testid="checkout-button"]').click();

  await page.locator('[data-testid="first-name"]').fill('Mario');
  await page.locator('[data-testid="last-name"]').fill('Rossi');
  await page.locator('[data-testid="address"]').fill('Via Roma 1');
  await page.locator('[data-testid="city"]').fill('Bologna');
  await page.locator('[data-testid="zip-code"]').fill('40100');
  await page.locator('[data-testid="phone"]').fill('+39 051 1234567');
  await page.locator('[data-testid="payment-credit-card"]').click();
  await page.locator('[data-testid="place-order-button"]').click();

  await expect(page.locator('[data-testid="order-number"]')).toBeVisible();
});
```

Quindici righe di `page.locator(...)`. Il test funziona, ma per capire cosa fa serve leggere ogni selettore e ricostruire il flusso mentalmente. I selettori dominano, le intenzioni sono implicite.

**Dopo -- Page Object con fixture:**

```typescript
test('complete purchase: home -> cart -> checkout -> confirmation', async ({
  homePage,
  cartPage,
  checkoutPage,
}) => {
  // Browse and add to cart
  await homePage.goto();
  await homePage.addToCart(1);

  // Cart review
  await cartPage.goto();
  await expect(cartPage.total).toBeVisible();
  await cartPage.proceedToCheckout();

  // Checkout and order
  await checkoutPage.completeWithDefaults();
  await expect(checkoutPage.orderNumber).toBeVisible({ timeout: 10_000 });
});
```

Cinque righe di logica. Il test si legge come uno scenario utente: vai alla home, aggiungi il prodotto 1 al carrello, vai al carrello, verifica il totale, procedi al checkout, completa con i dati di default, verifica il numero d'ordine. Nessun selettore visibile, nessun dettaglio implementativo. Se il frontend rinomina `checkout-button` in `proceed-to-checkout`, questo test non cambia -- cambia `CartPage`.

La riduzione non è solo cosmetica. Ogni `page.locator(...)` inline è un punto di accoppiamento tra test e DOM. Ogni `cartPage.proceedToCheckout()` è un punto di accoppiamento tra test e Page Object. Il secondo è uno strato di indirezione, ma è uno strato che assorbe i cambiamenti del frontend. Quando la UI cambia, si aggiorna la classe -- e tutti i test che la usano continuano a funzionare.

---

## POM + mockApi composition

I Page Object si occupano della UI. Le fixture mock si occupano delle API. In scenari reali servono entrambi: navigare con i Page Object e controllare le risposte del backend con il mock. Playwright supporta la composizione di fixture da moduli diversi con `mergeTests`.

```typescript
import { mergeTests } from '@playwright/test';
import { test as pomTest, expect } from '../fixtures/pages';
import { test as mockTest, fakeProduct } from '../fixtures/mock-api';

const test = mergeTests(pomTest, mockTest);
```

`mergeTests(pomTest, mockTest)` crea un nuovo test object che include sia le fixture POM (`homePage`, `cartPage`, `checkoutPage`) sia la fixture mock (`mockApi`). Il test ha accesso a entrambi i mondi. Questo è lo stesso pattern visto nell'[articolo 05](/blog/verificare/testing/05-network-mocking-avanzato/) e nell'[articolo 08](/blog/verificare/testing/08-authentication-testing/) per combinare autenticazione e mock.

### Checkout con prodotti mockati

```typescript
test.describe('POM + MockApi', () => {
  test('checkout with mocked products and payment', async ({
    homePage,
    cartPage,
    checkoutPage,
    mockApi,
  }) => {
    // Mock: custom products + successful checkout
    await mockApi.products([
      fakeProduct({ id: 1, name: 'POM Widget', price: 49.99 }),
    ]);
    await mockApi.checkoutSuccess(42);

    // Navigate and add product
    await homePage.goto();
    await homePage.addToCart(1);

    // Cart and checkout
    await cartPage.goto();
    await cartPage.proceedToCheckout();
    await checkoutPage.completeWithDefaults();

    // Order confirmation
    await expect(checkoutPage.orderNumber).toBeVisible({ timeout: 10_000 });
  });
```

Il test controlla cosa mostra il backend (`mockApi.products()`, `mockApi.checkoutSuccess()`) e come l'utente interagisce con la UI (`homePage.addToCart()`, `checkoutPage.completeWithDefaults()`). Due livelli di controllo, due livelli di astrazione, zero selettori nel test.

### Checkout con errore di pagamento

```typescript
  test('checkout with mocked payment error', async ({
    homePage,
    cartPage,
    checkoutPage,
    mockApi,
    page,
  }) => {
    await mockApi.products([
      fakeProduct({ id: 1, name: 'Error Widget', price: 99.99 }),
    ]);
    await mockApi.checkoutError(402);

    await homePage.goto();
    await homePage.addToCart(1);

    await cartPage.goto();
    await cartPage.proceedToCheckout();
    await checkoutPage.completeWithDefaults();

    // Payment declined
    await expect(page.getByText(/declined|rifiutato/i)).toBeVisible();
    await expect(checkoutPage.orderNumber).not.toBeVisible();
  });
});
```

L'unica riga che usa `page` direttamente è l'asserzione sul messaggio di errore (`page.getByText()`). Non è un caso: il messaggio di errore è un testo generico che non ha un `data-testid` dedicato e non è un'azione utente -- è un risultato da verificare. Usare `page.getByText()` per asserzioni su testi generici è accettabile; il Page Object serve per azioni ripetute e selettori strutturali.

---

## Quando NON usare il POM

Il Page Object Model non è sempre la scelta giusta. Come ogni pattern, ha un costo: una classe in più, un livello di indirezione, tempo di setup iniziale. In certi contesti il costo supera il beneficio.

| Scenario | POM? | Motivazione |
|----------|------|-------------|
| Selettore usato in 1 solo test | No | Inline è più semplice, nessun beneficio dalla centralizzazione |
| Flusso ripetuto in 3+ test | Si | Il costo di manutenzione cresce linearmente senza POM |
| Test esplorativo / spike | No | Il POM aggiunge overhead su codice che potrebbe non sopravvivere |
| Suite con 20+ test | Si | La manutenzione senza POM diventa insostenibile |
| Pagina con 1-2 interazioni | No | Il Page Object avrebbe più boilerplate che logica |
| Form complesso usato ovunque | Si | `fillShipping()` è più leggibile di 6 righe di fill() |

La regola pratica: se stai copiando lo stesso selettore in un terzo file, è il momento di estrarre un Page Object. Se stai scrivendo un test singolo su una pagina che non tocchi altrove, il selettore inline va benissimo.

Un antipattern comune è creare Page Object per ogni pagina dell'applicazione al giorno zero. Questo produce classi che nessun test usa, metodi che nessuno chiama, e manutenzione su codice morto. Il Page Object emerge dal refactoring -- prima scrivi i test con selettori inline, poi estrai le classi quando la duplicazione diventa evidente. Il pattern nasce dalla necessità, non dalla pianificazione.

---

## Riepilogo

Il Page Object Model non aggiunge capacità ai test -- aggiunge struttura. I test funzionano allo stesso modo, verificano le stesse cose, coprono gli stessi scenari. La differenza è nella manutenzione: un cambio frontend si propaga in un punto invece che in N file.

I concetti chiave di questo articolo:

1. **Page Object** -- una classe per pagina con locator come proprietà e azioni utente come metodi. Il test non vede selettori.
2. **Fixture POM** -- `test.extend()` per fornire Page Object come parametri del test. Creazione lazy, un singolo punto di istanziazione.
3. **Composizione** -- `mergeTests()` per combinare fixture POM e fixture mock nello stesso test. Navigazione con Page Object, risposte con mock.
4. **Regola pratica** -- il Page Object non fa asserzioni, non è per ogni pagina, e nasce dal refactoring quando la duplicazione emerge.

### La serie completa

1. [Guida completa E2E con Playwright](/blog/verificare/testing/01-guida-completa-e2e/) -- setup, primi test, best practice
2. [Trace correlation con OpenTelemetry](/blog/verificare/testing/02-opentelemetry-trace-correlation/) -- collegare test E2E e trace backend
3. [CI/CD: retry, sharding e parallelismo](/blog/verificare/testing/03-cicd-strategie-avanzate/) -- esecuzione scalabile in pipeline
4. [Network mocking con page.route()](/blog/verificare/testing/04-network-mocking/) -- isolare la UI dai servizi
5. [Network mocking avanzato: fixture e HAR](/blog/verificare/testing/05-network-mocking-avanzato/) -- pattern riusabili per il mocking
6. [Visual regression testing](/blog/verificare/testing/06-visual-regression/) -- catturare bug visivi con screenshot
7. [Diagnosticare e risolvere test flaky](/blog/verificare/testing/07-flaky-debugging/) -- cause, strumenti e pattern anti-flaky
8. [Authentication testing con storageState e Keycloak](/blog/verificare/testing/08-authentication-testing/) -- login una volta, test sempre autenticati
9. Page Object Model per test manutenibili -- questo articolo

Il codice completo è nel repository [MockMart](https://github.com/monte97/MockMart), nella directory `tests/e2e/`.
