---
title: "Micro-frontend in Vue 3 con Module Federation: Shell, Contratto e Deploy Indipendente"
date: 2026-03-14T09:00:00.000Z
description: "Module Federation in Vue 3 con Vite: contratto shell/remote, dipendenze singleton e deploy indipendente per team."
pillar: progettare
category: vue
tags:
  - Vue3
  - MicroFrontend
  - ModuleFederation
  - Vite
  - Architecture
  - Frontend
lang: it
draft: false
reviewed: false
reproducibility: true
---

Il progetto frontend nasce come una SPA. Cresce. Arrivano più team. Il primo segnale di allarme non è la lentezza del build: è la riunione settimanale in cui tre team si bloccano a vicenda perché lavorano sullo stesso `router.ts`.

Module Federation è una risposta concreta a questo problema: un meccanismo di composizione runtime che consente a più applicazioni di condividere codice e componenti senza essere compilate insieme. La configurazione, il contratto tra shell e moduli remoti e il deploy indipendente sono gli argomenti delle sezioni seguenti.

## Il problema che stiamo risolvendo

Cinque team, una SPA. Il setup iniziale è `npm run build` e tutto finisce in un bundle. Funziona fino a quando:

- Ogni modifica — anche minima — fa ripartire il build dell'intera applicazione: tutti i team aspettano
- Il deploy di una feature piccola richiede il rilascio dell'intera applicazione
- Le dipendenze di un team (una libreria di charting pesante, per esempio) appesantiscono il bundle di tutti
- Un team vuole migrare da Vue 2 a Vue 3 senza bloccare gli altri

La risposta classica è il [monorepo con build selettivi](https://monorepo.tools/). Funziona, ma non risolve il problema del deploy: i bundle vengono ancora assemblati insieme a compile time. Module Federation sposta la composizione a runtime: ogni micro-frontend è un'applicazione autonoma, caricata dalla shell quando serve.

---

## Cos'è Module Federation

[Webpack 5](https://webpack.js.org/concepts/module-federation/) ha introdotto Module Federation come funzionalità nativa del bundler. L'idea: un'applicazione (`remote`) espone alcuni dei suoi moduli. Un'altra applicazione (`host`) li importa a runtime, senza che i due bundle si conoscano a compile time.

Con Vite, la funzionalità analoga è fornita dal plugin [`@originjs/vite-plugin-federation`](https://github.com/originjs/vite-plugin-federation), che segue la stessa semantica.

I due ruoli:

| Ruolo | Descrizione |
|-------|-------------|
| **Host (shell)** | L'applicazione principale. Definisce il layout globale, il routing di primo livello, l'autenticazione. Carica i remoti on demand. |
| **Remote (modulo)** | Un'applicazione autonoma che espone componenti o intere sezioni dell'UI. Si deploya e si versiona indipendentemente. |

Un'applicazione può essere sia host che remote contemporaneamente. Le sezioni seguenti coprono la topologia più comune: una shell e N moduli.

---

## Struttura del progetto

```text
apps/
├── shell/          # host — routing globale, layout, auth
│   ├── vite.config.ts
│   └── src/
│       ├── main.ts
│       ├── router/index.ts
│       └── App.vue
├── catalog/        # remote — sezione catalogo prodotti
│   ├── vite.config.ts
│   └── src/
│       ├── main.ts          # entry point standalone (dev locale)
│       ├── bootstrap.ts     # entry point federato
│       └── components/
│           └── CatalogView.vue
└── checkout/       # remote — sezione checkout
    ├── vite.config.ts
    └── src/
        ├── bootstrap.ts
        └── components/
            └── CheckoutView.vue
```

Ogni `apps/` directory è un progetto Vite indipendente con il proprio `package.json`. La shell non conosce i remote a compile time — li scopre solo tramite la configurazione di federation.

**Nota sul workflow di sviluppo**: `@originjs/vite-plugin-federation` supporta il dev server solo per la shell (host). I remote vanno buildati (`vite build --watch`) e serviti come build statici (es. `vite preview`). In sviluppo ogni remote gira autonomamente sulla propria porta; la shell li consuma come build.

---

## Configurazione: il remote (catalog)

```typescript
// apps/catalog/vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    vue(),
    federation({
      name: 'catalog',
      filename: 'remoteEntry.js',   // entry point del bundle federato
      exposes: {
        // chiave: nome pubblico del modulo
        // valore: path locale del file da esporre
        './CatalogView': './src/components/CatalogView.vue',
        './ProductCard': './src/components/ProductCard.vue',
      },
      shared: {
        vue: {
          requiredVersion: '^3.4.0',
          singleton: true,   // forza un'unica istanza in tutta la pagina
        },
        'vue-router': {
          requiredVersion: '^4.0.0',
          singleton: true,
        },
        pinia: {
          requiredVersion: '^2.0.0',
          singleton: true,
        },
      },
    }),
  ],
  build: {
    target: 'esnext',    // richiesto da vite-plugin-federation
  },
  server: {
    port: 5001,
  },
  preview: {
    port: 5001,
  },
});
```

Il `remoteEntry.js` è il manifest del remote: contiene la lista dei moduli esposti e gestisce il caricamento lazy delle dipendenze condivise. Il path `/assets/remoteEntry.js` riflette la struttura di output di Vite (`dist/assets/`) — cambia se si modifica `build.outDir` o `build.assetsDir`.

---

## Configurazione: la shell (host)

```typescript
// apps/shell/vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [
      vue(),
      federation({
        name: 'shell',
        remotes: {
          // chiave: nome usato negli import
          // valore: URL del remoteEntry.js del modulo
          catalog: env.VITE_CATALOG_URL + '/assets/remoteEntry.js',
          checkout: env.VITE_CHECKOUT_URL + '/assets/remoteEntry.js',
        },
        shared: {
          vue: { requiredVersion: '^3.4.0', singleton: true },
          'vue-router': { requiredVersion: '^4.0.0', singleton: true },
          pinia: { requiredVersion: '^2.0.0', singleton: true },
        },
      }),
    ],
    build: {
      target: 'esnext',
    },
  };
});
```

```bash
# .env.development
VITE_CATALOG_URL=http://localhost:5001
VITE_CHECKOUT_URL=http://localhost:5002

# .env.production
VITE_CATALOG_URL=https://catalog.app.example.com
VITE_CHECKOUT_URL=https://checkout.app.example.com
```

URL parametrizzati per ambiente: la shell non va modificata quando cambia l'hosting di un modulo.

---

## Il contratto shell/modulo

Il contratto è l'interfaccia che il remote espone alla shell. Non c'è un `.d.ts` automatico: va definito esplicitamente.

### Componente remoto tipizzato

```typescript
// apps/catalog/src/components/CatalogView.vue
<script setup lang="ts">
interface Props {
  category?: string;
}

const props = withDefaults(defineProps<Props>(), {
  category: 'all',
});

const emit = defineEmits<{
  productSelected: [productId: string];
}>();
</script>
```

### Dichiarazione di tipo nella shell

Il plugin non genera tipizzazioni. Il pattern è un file di dichiarazione nella shell:

```typescript
// apps/shell/src/types/remotes.d.ts
declare module 'catalog/CatalogView' {
  import type { DefineComponent } from 'vue';

  export interface CatalogViewProps {
    category?: string;
  }

  const CatalogView: DefineComponent<CatalogViewProps>;
  export default CatalogView;
}

declare module 'catalog/ProductCard' {
  import type { DefineComponent } from 'vue';
  const ProductCard: DefineComponent<{ productId: string }>;
  export default ProductCard;
}
```

Questo file va aggiornato manualmente quando il remote cambia interfaccia. Il confine tra applicazioni è esplicito per design.

---

## Routing nella shell

Vue Router richiede che le route component siano componenti Vue validi — non `defineAsyncComponent`. Il pattern corretto per caricare un remote in una route è il dynamic import diretto:

```typescript
// apps/shell/src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/catalog',
      // dynamic import diretto — Vue Router gestisce il lazy loading
      component: () => import('catalog/CatalogView'),
    },
    {
      path: '/checkout',
      component: () => import('checkout/CheckoutView'),
    },
  ],
});

export default router;
```

Il remote si carica solo quando l'utente naviga alla rotta corrispondente. Per gestire errori di rete (remote non raggiungibile), usa [`defineAsyncComponent`](https://vuejs.org/guide/components/async) a livello di componente nei template, non nelle definizioni di route.

---

## Gestione degli errori di caricamento

```typescript
// apps/shell/src/utils/remote-loader.ts
import { defineAsyncComponent, type Component } from 'vue';
import RemoteError from '../components/RemoteError.vue';
import RemoteSkeleton from '../components/RemoteSkeleton.vue';

export function loadRemote(loader: () => Promise<{ default: Component }>) {
  return defineAsyncComponent({
    loader,
    loadingComponent: RemoteSkeleton,
    errorComponent: RemoteError,
    delay: 200,        // ms prima di mostrare il loading
    timeout: 10000,    // ms dopo cui mostrare l'errore
  });
}
```

Uso in un template (non nelle definizioni di route):

```typescript
// In un componente Vue che wrappa il remote con gestione errori
const CatalogSection = loadRemote(() => import('catalog/CatalogView'));
```

---

## Dipendenze condivise: il punto più insidioso

`singleton: true` su Vue, Vue Router e Pinia è obbligatorio. Due istanze di Vue nella stessa pagina rompono tutto: gli inject non funzionano, i plugin non vengono trovati, le reattività si separano.

Il problema si manifesta con versioni diverse tra shell e remote:

```text
shell:    Vue 3.4.0
catalog:  Vue 3.5.0    ← versione diversa
```

Con `singleton: true` e `requiredVersion: '^3.4.0'`, Module Federation usa l'istanza con la versione più alta compatibile. Se le versioni non sono compatibili tra loro, il plugin usa la prima istanza caricata ed emette un warning a console - l'app continua a girare, ma il comportamento è imprevedibile e difficile da diagnosticare.

La regola pratica: **Vue, Vue Router e Pinia devono sempre essere `singleton: true`** sia nella shell che nei remote. Le librerie utility (lodash, date-fns, axios) non hanno questo vincolo — ogni remote può portare la propria copia senza conseguenze.

---

## State condiviso tra remoti

Module Federation non risolve il problema dello state condiviso — lo sposta. Tre opzioni con trade-off diversi:

**1. Store ridichiarato con la stessa chiave**

Pinia è singleton: se shell e remote dichiarano lo stesso store (stessa `id`) e Pinia è condivisa, accedono allo stesso stato in memoria. Non serve importare lo store dalla shell — basta ridichiararlo con la stessa struttura.

```typescript
// apps/catalog/src/stores/auth.ts
// Stessa struttura e stessa id dello store nella shell
// Pinia singleton = stesso stato in memoria
import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null);
  return { token };
});
```

**2. Props e eventi per dati locali**

Per state locale al componente remoto, props ed emit sono sufficienti e non creano dipendenze nascoste.

**3. Custom events per comunicazione loose-coupled**

```typescript
// Emissione da un remote
window.dispatchEvent(new CustomEvent('catalog:product-selected', {
  detail: { productId: '123' }
}));

// Ricezione nella shell
window.addEventListener('catalog:product-selected', (e) => {
  const { productId } = (e as CustomEvent).detail;
  router.push(`/checkout?product=${productId}`);
});
```

I [custom events](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent) funzionano quando i team vogliono essere completamente indipendenti. Il trade-off: nessuna tipizzazione automatica, nessun tracciamento statico delle dipendenze.

---

## Deploy indipendente

Ogni remote ha la propria pipeline CI/CD. La shell non si ridistribuisce quando cambia un modulo — carica il `remoteEntry.js` a runtime dall'URL configurato.

```yaml
# catalog/.github/workflows/deploy.yml
on:
  push:
    branches: [main]
    paths:
      - 'apps/catalog/**'   # trigger solo se cambia catalog

jobs:
  deploy:
    steps:
      - run: npm run build
      - run: # upload dist/ su CDN o hosting
```

### Versioning e rollback

L'insidia principale: se catalog deploya una breaking change al contratto (rinomina una prop, cambia il tipo di un evento), la shell smette di funzionare senza essere modificata — e senza un build error che lo segnali.

Le strategie per gestirlo:

1. **URL con versione**: `catalog.app.example.com/v2/assets/remoteEntry.js` — la shell sceglie esplicitamente quale versione caricare
2. **Contract testing**: test automatici che verificano che il remote esponga l'interfaccia attesa dalla shell (pattern [consumer-driven contract test](https://docs.pact.io/))
3. **Coordinamento esplicito**: shell e remote aggiornano il contratto in un'unica PR — si perde parte dell'indipendenza, ma si guadagna in sicurezza

---

## Quando usare Module Federation (e quando no)

Module Federation aggiunge complessità reale.

| Scenario | Consiglio |
|----------|-----------|
| Un team, una SPA | Non serve. Vite con route-based lazy loading è sufficiente |
| 2-3 team, stesso repo | Monorepo con Turborepo o Nx. Module Federation solo se i deploy devono essere indipendenti |
| 3+ team, feature aree ben definite, SLA di deploy separati | Module Federation ha senso |
| Team che usano framework diversi (React + Vue) | Module Federation gestisce anche questo caso |
| Startup con 5 sviluppatori | Overengineering. Tornarci tra 18 mesi |

Il segnale non è "siamo tanti": è "ci blocchiamo a vicenda nel deploy".

---

## Riepilogo

Module Federation in Vue 3 con Vite si configura in poche righe, ma richiede quattro decisioni esplicite:

- **Il contratto**: cosa espone il remote, con quali props e quali eventi. Va documentato e versionato come un'API — non c'è generazione automatica dei tipi.
- **Le dipendenze singleton**: Vue, Vue Router e Pinia devono essere una sola istanza. Una configurazione sbagliata rompe l'applicazione senza un errore chiaro.
- **Il workflow di sviluppo**: i remote si buildano con `vite build --watch`, non si servono via dev server. Il DX è diverso da una SPA classica — meglio saperlo prima.
- **Il versioning del contratto**: il deploy indipendente è un vantaggio reale, ma una breaking change non coordinata blocca la shell in produzione senza avvisi.

Il costo è la complessità distribuita: invece di un build che fallisce, hai runtime error che dipendono da quale versione del remote è in produzione.

### Risorse

- **[`@originjs/vite-plugin-federation`](https://github.com/originjs/vite-plugin-federation)** — plugin Vite per Module Federation
- **[Webpack 5 Module Federation](https://webpack.js.org/concepts/module-federation/)** — specifica originale e concetti base
- **[Module Federation Examples](https://github.com/module-federation/module-federation-examples)** — esempi ufficiali con Vue, React, Angular
- **[Vue 3 — Async Components](https://vuejs.org/guide/components/async)** — `defineAsyncComponent`, loading/error state, Suspense
- **[Vue Router — Lazy Loading Routes](https://router.vuejs.org/guide/advanced/lazy-loading)** — dynamic import e route-level code splitting
- **[Pinia](https://pinia.vuejs.org/)** — documentazione ufficiale dello store manager
- **[Vite — Env Variables](https://vitejs.dev/guide/env-and-mode)** — `loadEnv` e gestione variabili per ambiente
- **[Pact](https://docs.pact.io/)** — framework per consumer-driven contract testing
