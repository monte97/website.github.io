---
title: "Playwright: Authentication Testing con storageState e Keycloak"
seoTitle: "Playwright: storageState e login Keycloak"
date: 2026-03-04T09:00:00.000Z
description: "Come gestire l'autenticazione nei test E2E: storageState per evitare login ripetuti, ruoli multipli, session management e composizione con mock"
pillar: verificare
category: testing
tags:
  - Playwright
  - Testing
  - E2E
  - Authentication
  - Keycloak
  - TypeScript
lang: it
reviewed: false
series: playwright
seriesOrder: 80
reproducibility: true
summary:
  - label: "Problema"
    value: "Login ripetuto in ogni test: tre secondi a testa"
    note: "Keycloak lento raddoppia i tempi, Keycloak down mette in rosso tutta la suite"
  - label: "Scelta"
    value: "`storageState`: login una volta nel setup, stato riusato dai test"
    note: "Cookie e localStorage serializzati in un file JSON per utente"
  - label: "Risultato"
    value: "Con 50 test e 3 utenti si passa da 50 login a 3"
  - label: "Ampiezza"
    value: "Ruoli multipli via progetti, logout e token scaduto"
    note: "La scadenza si simula mockando l'endpoint di refresh, senza attese reali"
openItems:
  - "I file di `storageState` contengono token reali: sono credenziali valide e vanno esclusi dal repository con .gitignore"
  - "Il timer di refresh di keycloak-js resta non testato: è logica della libreria, si verifica il comportamento dell'app quando il refresh fallisce"
  - "`canCheckout` non è un ruolo Keycloak ma un custom claim del JWT: la decisione di autorizzazione sta nel backend che legge il token"
openNote: "Ciò che resta fuori appartiene alla libreria, al backend o al repository."
mode: how-to
figures:
  - kind: flow
    at: utenti-multipli--un-progetto-per-ruolo
    label: "Dall'unico login all'identità di ogni test"
    caption: "L'identità di un test non è scritta nel test: la decide il progetto che lo raccoglie"
    nodes:
      - kind: "Progetto setup"
        name: "`auth.setup.ts`"
        desc: "Un login Keycloak reale per ogni utente. È l'unico punto della suite che parla con l'identity provider."
        edge: "`storageState()` serializza cookie e localStorage"
      - kind: "File"
        name: "`mario.json`, `admin.json`, `blocked.json`"
        desc: "Un file per utente nella directory `.auth/`, esclusa dal repository: sono token validi, non dati di test."
        edge: "`dependencies: ['setup']`"
      - kind: "Progetti"
        name: "chromium, chromium-admin, chromium-blocked"
        desc: "Ogni progetto carica il proprio `storageState` e raccoglie i file spec con il proprio `testMatch`."
        edge: "il nome del file spec sceglie l'utente"
      - kind: "Test"
        name: "Parte già autenticato"
        desc: "Nessun login, nessun redirect, nessuna dipendenza da Keycloak mentre i test girano."
        key: true
---

La suite ha 50 test. Ogni test parte dalla pagina di login, compila username e password, clicca "Accedi", aspetta il redirect, verifica il cookie. Tre secondi per ogni login. 50 test per 3 secondi: due minuti e mezzo spesi solo per autenticarsi, prima ancora di verificare qualcosa. Se Keycloak è lento -- e nei runner CI con risorse condivise lo è spesso -- i tempi raddoppiano. Se Keycloak è down, tutta la suite è rossa. Non per un bug, non per una regressione: perché il servizio di autenticazione non risponde.

Il problema non è il login in sé. È la ripetizione: ogni test esegue lo stesso flusso di autenticazione, lo stesso redirect, la stessa attesa. Informazione già nota, lavoro già fatto, tempo già speso.

`storageState` di Playwright risolve questo: si esegue il login una volta sola in un progetto di setup, si salvano cookie e localStorage in un file JSON, e tutti i test successivi partono già autenticati. Nessun login, nessun redirect, nessuna dipendenza da Keycloak durante l'esecuzione dei test. Questo articolo usa [MockMart](https://github.com/monte97/MockMart), lo stesso ambiente dell'intera [serie Playwright](/blog/verificare/testing/01-guida-completa-e2e/). Il codice completo è nel [repository](https://github.com/monte97/MockMart), nella directory `tests/e2e/`.

---

## storageState in 30 secondi

Il pattern è composto da due parti: un progetto di setup che esegue il login reale e salva lo stato, e i progetti di test che ereditano quello stato.

Il setup è un file `.setup.ts` che Playwright esegue per primo. Al suo interno, un test normale: navigazione alla pagina, compilazione del form, click sul bottone di login. L'unica differenza è l'ultima riga:

```typescript
await page.context().storageState({ path: storageStatePath('mario') });
```

`storageState()` serializza tutti i cookie e il contenuto di `localStorage` in un file JSON. Quel file contiene tutto ciò che serve al browser per risultare autenticato: token, session ID, flag di sessione.

I progetti di test lo caricano nella configurazione:

```typescript
{
  name: 'chromium',
  use: {
    ...devices['Desktop Chrome'],
    storageState: 'tests/.auth/mario.json',
  },
  dependencies: ['setup'],
},
```

`dependencies: ['setup']` garantisce che il progetto di setup venga eseguito prima dei test. Quando un test parte, il browser ha già i cookie e il localStorage caricati dal file JSON. La pagina si apre come se l'utente fosse già autenticato. Nessuna richiesta a Keycloak, nessun redirect, nessuna attesa.

Il risultato: il login avviene una volta per utente, non una volta per test. Con 50 test e 3 utenti, si passa da 50 login a 3. Il tempo risparmiato è direttamente proporzionale al numero di test.

---

## Login Keycloak nel setup

MockMart usa Keycloak come identity provider. Il flusso di autenticazione è: l'utente arriva sulla homepage, clicca "Login" nell'header, viene reindirizzato al form Keycloak, compila username e password, Keycloak lo reindirizza alla homepage con i token.

Il file `auth.setup.ts` implementa questo flusso per ogni utente di test:

```typescript
import { test as setup, expect } from '@playwright/test';
import path from 'path';

interface TestUser {
  username: string;
  email: string;
  password: string;
}

const USERS: Record<string, TestUser> = {
  mario: {
    username: 'mario',
    email: 'mario.rossi@example.com',
    password: 'mario123',
  },
  admin: {
    username: 'admin',
    email: 'admin@techstore.com',
    password: 'admin123',
  },
  blocked: {
    username: 'blocked',
    email: 'blocked@example.com',
    password: 'blocked123',
  },
};

const AUTH_DIR = path.join(__dirname, '../.auth');

function storageStatePath(userKey: string): string {
  return path.join(AUTH_DIR, `${userKey}.json`);
}
```

La funzione `keycloakLogin` incapsula il flusso di autenticazione. Ogni passo corrisponde a un'azione visibile nell'interfaccia:

```typescript
async function keycloakLogin(page: any, user: TestUser): Promise<void> {
  // Navigazione alla homepage -- Keycloak check-sso verifica la sessione
  await page.goto('/');

  // Click sul link Login nell'header
  await page.getByRole('link', { name: 'Login' }).click();

  // Attesa del form Keycloak -- redirect esterno
  await page.waitForURL(/\/auth\/realms\/techstore\//);

  // Compilazione delle credenziali
  await page.locator('#username').fill(user.email);
  await page.locator('#password').fill(user.password);
  await page.locator('#kc-login').click();

  // Attesa del redirect alla homepage
  await page.waitForURL('http://localhost/');

  // Verifica: il bottone Logout e' visibile = autenticazione riuscita
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible({
    timeout: 10_000,
  });
}
```

Due punti da notare. Primo: `waitForURL` con una regex per il form Keycloak. Il redirect a Keycloak include parametri dinamici (nonce, state, redirect_uri), quindi un match esatto non funzionerebbe -- la regex `/\/auth\/realms\/techstore\//` matcha qualsiasi URL che contenga quel path. Secondo: il `timeout: 10_000` sulla verifica del bottone Logout. Il redirect da Keycloak alla homepage può essere lento nel CI. Un timeout generoso evita falsi positivi.

Con la funzione helper pronta, i setup test sono tre chiamate identiche nella struttura:

```typescript
setup('authenticate as mario', async ({ page }) => {
  await keycloakLogin(page, USERS.mario);
  await page.context().storageState({ path: storageStatePath('mario') });
});

setup('authenticate as admin', async ({ page }) => {
  await keycloakLogin(page, USERS.admin);
  await page.context().storageState({ path: storageStatePath('admin') });
});

setup('authenticate as blocked', async ({ page }) => {
  await keycloakLogin(page, USERS.blocked);
  await page.context().storageState({ path: storageStatePath('blocked') });
});
```

Ogni setup esegue il login e salva lo stato in un file dedicato: `mario.json`, `admin.json`, `blocked.json`. I file vengono creati nella directory `.auth/` sotto `tests/e2e/`.

Questo è l'unico punto della suite in cui si interagisce con Keycloak direttamente. Tutti gli altri test partono dallo stato salvato -- non hanno bisogno di sapere che l'autenticazione usa Keycloak, OIDC, o qualsiasi altro protocollo.

---

## Utenti multipli -- un progetto per ruolo

MockMart ha tre tipi di utente con permessi diversi:

| Utente | Ruolo | canCheckout | Accesso |
|--------|-------|-------------|---------|
| `mario` | user | true | Pagine utente, ordini, checkout |
| `admin` | admin, user | true | Tutto + pannello admin |
| `blocked` | user | false | Pagine utente, ordini, checkout bloccato |

Ogni utente ha il proprio file di storageState. La configurazione Playwright associa ogni progetto al file corrispondente:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  reporter: [['html'], ['list']],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Setup: login Keycloak per ogni utente
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Progetto default: utente mario
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/mario.json',
      },
      dependencies: ['setup'],
    },

    // Progetto admin
    {
      name: 'chromium-admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/admin.json',
      },
      dependencies: ['setup'],
      testMatch: /.*admin.*\.spec\.ts/,
    },

    // Progetto utente bloccato
    {
      name: 'chromium-blocked',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/blocked.json',
      },
      dependencies: ['setup'],
      testMatch: /.*blocked.*\.spec\.ts/,
    },
  ],
});
```

Il pattern: ogni progetto ha il suo `storageState` e il suo `testMatch`. I test admin vivono in file che contengono "admin" nel nome (es. `admin-panel.spec.ts`). I test per l'utente bloccato in file con "blocked" (es. `blocked-checkout.spec.ts`). I test senza prefisso specifico girano nel progetto `chromium` con l'utente mario.

`testMatch` usa una regex. `.*admin.*\.spec\.ts` matcha qualsiasi file `.spec.ts` che contenga "admin" nel nome. Questo evita di dover elencare ogni file individualmente -- basta seguire la convenzione di naming.

La directory `.auth/` va aggiunta al `.gitignore`:

```
# tests/e2e/.gitignore
.auth/
```

I file di storageState contengono token reali. Non sono dati di test -- sono credenziali valide che permettono di autenticarsi con Keycloak. Non devono finire nel repository.

---

## Test role-based

Con tre utenti e tre progetti, si possono scrivere test che verificano i permessi di ciascun ruolo. Ogni test parte già autenticato -- non serve nessun login nel test.

### Mario: utente standard

Il progetto `chromium` usa lo storageState di mario. I test verificano cosa può e cosa non può fare un utente con ruolo `user`:

```typescript
import { test as base, expect } from '@playwright/test';

base.describe('Role-Based Access', () => {
  base('mario should NOT see the Admin link', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Admin' })).not.toBeVisible();
  });

  base('mario should see the Orders link', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('link', { name: 'Ordini' })).toBeVisible();
  });
});
```

Il primo test verifica l'assenza: il link "Admin" non deve essere visibile per un utente standard. Il secondo verifica la presenza: il link "Ordini" deve esserci. Due facce della stessa medaglia: il sistema di autorizzazione mostra e nasconde elementi in base al ruolo.

### Checkout e custom claim

Il campo `canCheckout` non è un ruolo Keycloak -- è un custom claim nel token JWT, configurato come attributo utente in Keycloak. Il backend lo legge dal token e decide se autorizzare il checkout.

Mario ha `canCheckout: true`, quindi il checkout funziona:

```typescript
base.describe('Checkout Authorization', () => {
  base('mario (canCheckout=true) should complete checkout', async ({ page }) => {
    await page.goto('/');

    // Aggiungi prodotto al carrello
    await page.locator('[data-testid="product-card"]').first().click();
    await page.locator('[data-testid="add-to-cart"]').click();

    // Vai al carrello e procedi al checkout
    await page.locator('[data-testid="cart-icon"]').click();
    await page.locator('[data-testid="checkout-button"]').click();
    await page.locator('[data-testid="confirm-order"]').click();

    // Il checkout deve completarsi
    await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible({
      timeout: 10_000,
    });
  });
});
```

L'utente `blocked` ha `canCheckout: false`. Il suo test (in un file separato, matchato dal progetto `chromium-blocked`) verifica che il backend rifiuti il checkout con un 403. Il frontend non decide -- il backend legge il claim dal token e blocca l'operazione.

Questa separazione è fondamentale: i test per mario girano nel progetto `chromium`, i test per blocked girano nel progetto `chromium-blocked`. Stesso test runner, storageState diverso, risultati diversi. Non c'è bisogno di parametrizzare il test o fare login condizionali -- il progetto Playwright si occupa di tutto.

---

## Session management

L'autenticazione non è solo login. Ci sono due scenari critici: il logout esplicito e la scadenza del token.

### Logout

Il test è lineare: verifica lo stato autenticato, clicca Logout, verifica il ritorno allo stato non autenticato.

```typescript
base.describe('Session Management', () => {
  base('logout should redirect to homepage without auth', async ({ page }) => {
    await page.goto('/');

    // Verifica stato autenticato
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();

    // Click logout
    await page.getByRole('button', { name: 'Logout' }).click();

    // Verifica stato non autenticato
    await page.waitForURL('http://localhost/');
    await expect(page.getByRole('link', { name: 'Login' })).toBeVisible({
      timeout: 10_000,
    });
  });
```

La verifica è bidirezionale: prima si conferma che il bottone Logout sia visibile (siamo autenticati grazie allo storageState), poi dopo il click si conferma che il link Login sia visibile (la sessione è terminata). Il `waitForURL` serve perché Keycloak gestisce il logout con un redirect -- l'applicazione viene reindirizzata alla homepage dopo che Keycloak ha invalidato la sessione.

### Token scaduto

Scenario più sottile: il token JWT nel storageState è scaduto, e il refresh token non funziona. La libreria `keycloak-js` tenta il refresh, riceve un errore, e forza un nuovo login. Come si testa senza aspettare la scadenza reale del token?

Si intercetta l'endpoint di refresh:

```typescript
  base('expired token should trigger re-authentication', async ({ page }) => {
    // Intercetta il refresh del token -- simula scadenza
    await page.route(
      '**/auth/realms/techstore/protocol/openid-connect/token',
      (route) =>
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'invalid_grant',
            error_description: 'Token expired',
          }),
        }),
    );

    await page.goto('/');

    // keycloak-js rileva il refresh fallito e forza il redirect a Keycloak
    await page.waitForURL(/\/auth\/realms\/techstore\/|\/login/, {
      timeout: 15_000,
    });
  });
});
```

`page.route()` intercetta la chiamata che `keycloak-js` fa per rinnovare il token. Invece di contattare Keycloak, la richiesta riceve un errore `invalid_grant`. La libreria interpreta l'errore come token scaduto e forza un redirect alla pagina di login.

Questo pattern combina il network mocking dell'[articolo 04](/blog/verificare/testing/04-network-mocking/) con l'autenticazione. Non si sta mockando il login -- si sta mockando il refresh, che è un'operazione diversa. Il login avviene nel setup, il refresh avviene durante la vita del test.

> Non testare il timer di refresh di `keycloak-js`. La libreria ha la sua logica interna per decidere quando rinnovare il token -- tipicamente quando manca il 30% della durata all'expiry. Quella logica è responsabilità della libreria, non della tua applicazione. Testa il comportamento della tua app quando il refresh fallisce, non quando viene invocato.

---

## Combinare autenticazione e mock

Fino a qui i test usavano servizi reali: i prodotti arrivano dal backend, il checkout chiama il payment-service. Ma ci sono scenari dove serve controllare sia l'autenticazione sia le risposte API. Per esempio: un utente autenticato che vede prodotti mockati, o un checkout autenticato che fallisce con un errore simulato.

Nell'[articolo 05](/blog/verificare/testing/05-network-mocking-avanzato/) abbiamo visto `mergeTests` per combinare fixture da moduli diversi. Lo stesso pattern funziona con l'autenticazione:

```typescript
import { mergeTests } from '@playwright/test';
import { test as base, expect } from '@playwright/test';
import { test as mockTest } from '../fixtures/mock-api';
import { fakeProduct } from '../fixtures/mock-api';

const test = mergeTests(base, mockTest);
```

`mergeTests(base, mockTest)` crea un nuovo test object che ha le fixture di entrambi i moduli. Il `base` test porta lo storageState (ereditato dal progetto nella configurazione), il `mockTest` porta la fixture `mockApi`. Il risultato è un test che parte autenticato e può mockare le API.

### Utente autenticato con prodotti mockati

```typescript
test.describe('Auth + Mock Composition', () => {
  test('authenticated user with mocked products', async ({ page, mockApi }) => {
    await mockApi.products([
      fakeProduct({ id: 1, name: 'Auth Widget', price: 99.99 }),
    ]);

    await page.goto('/');

    // Autenticato (storageState) + prodotti mockati (mockApi)
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
    await expect(page.getByText('Auth Widget')).toBeVisible();
  });
```

Il bottone Logout è visibile perché lo storageState ha caricato i cookie di mario. Il testo "Auth Widget" è visibile perché `mockApi.products()` ha intercettato la chiamata a `/api/products` e ha restituito il prodotto finto. Due meccanismi indipendenti che lavorano insieme.

### Checkout autenticato con errore di pagamento

```typescript
  test('authenticated checkout with mocked payment error', async ({ page, mockApi }) => {
    await mockApi.checkoutError(402);

    await page.goto('/');

    await page.locator('[data-testid="product-card"]').first().click();
    await page.locator('[data-testid="add-to-cart"]').click();
    await page.locator('[data-testid="cart-icon"]').click();
    await page.locator('[data-testid="checkout-button"]').click();
    await page.locator('[data-testid="confirm-order"]').click();

    // Autenticato ma pagamento rifiutato
    await expect(page.getByText(/declined|rifiutato/i)).toBeVisible();
  });
});
```

L'utente è autenticato (lo storageState include il token di mario con `canCheckout: true`), i prodotti arrivano dal backend reale, ma il checkout è mockato con un 402. Il test verifica che l'applicazione gestisca correttamente il pagamento rifiutato anche quando l'utente ha i permessi per fare checkout -- il problema è nel pagamento, non nell'autorizzazione.

Questo tipo di scenario è impossibile da testare senza composizione. Senza mock, servirebbe un account di test con una carta di credito che viene rifiutata. Senza autenticazione, non si potrebbe arrivare al checkout. La combinazione dei due pattern copre l'intero spettro.

> La fixture `MockApi` dell'[articolo 05](/blog/verificare/testing/05-network-mocking-avanzato/) opera su endpoint specifici: `products()` intercetta `/api/products`, `checkoutError()` intercetta `/api/checkout`. L'autenticazione opera a livello di cookie e localStorage. Non c'è conflitto: sono strati diversi della comunicazione HTTP.

---

## Riepilogo

L'autenticazione nei test E2E è un problema di efficienza prima che di correttezza. Ripetere il login in ogni test spreca tempo, introduce dipendenze da servizi esterni e rende la suite fragile.

I pattern di questo articolo risolvono il problema a tre livelli:

1. **storageState** -- login una volta nel setup, riuso dello stato in tutti i test. Il costo del login diventa costante, non lineare nel numero di test.
2. **Progetti per ruolo** -- un progetto Playwright per ogni tipo di utente, con `testMatch` per filtrare i test e `storageState` per il file corrispondente. Ogni progetto ha il suo contesto di autenticazione.
3. **Composizione con mock** -- `mergeTests` per combinare autenticazione e network mocking nello stesso test. Utente autenticato con risposte API controllate.

Il principio guida: il setup di autenticazione è l'unico punto dove si tocca il provider di identità. Tutti i test successivi operano sullo stato salvato. Se Keycloak cambia, si aggiorna un file. Se si aggiunge un utente, si aggiunge un setup test e un progetto nella configurazione.

### La serie completa

1. [Guida completa E2E con Playwright](/blog/verificare/testing/01-guida-completa-e2e/) -- setup, primi test, best practice
2. [Trace correlation con OpenTelemetry](/blog/verificare/testing/02-opentelemetry-trace-correlation/) -- collegare test E2E e trace backend
3. [CI/CD: retry, sharding e parallelismo](/blog/verificare/testing/03-cicd-strategie-avanzate/) -- esecuzione scalabile in pipeline
4. [Network mocking con page.route()](/blog/verificare/testing/04-network-mocking/) -- isolare la UI dai servizi
5. [Network mocking avanzato: fixture e HAR](/blog/verificare/testing/05-network-mocking-avanzato/) -- pattern riusabili per il mocking
6. [Visual regression testing](/blog/verificare/testing/06-visual-regression/) -- catturare bug visivi con screenshot
7. [Diagnosticare e risolvere test flaky](/blog/verificare/testing/07-flaky-debugging/) -- cause, strumenti e pattern anti-flaky
8. Authentication testing con storageState e Keycloak -- questo articolo

Il codice completo è nel repository [MockMart](https://github.com/monte97/MockMart), nella directory `tests/e2e/`.
