---
title: "Micro-frontend in Vue 3 con Module Federation: Shell, Contratto e Deploy Indipendente"
date: 2026-03-14T09:00:00.000Z
description: "Come strutturare un'architettura micro-frontend in Vue 3 con Module Federation: shell app, contratto host/remote, dipendenze condivise e deploy indipendente per team."
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
draft: true
reviewed: false
reproducibility: true
---

Il progetto frontend nasce come una SPA. Cresce. Arrivano più team. Il primo segnale di allarme non è la lentezza del build — è la riunione settimanale in cui tre team si bloccano a vicenda perché lavorano sullo stesso `router.ts`.

Module Federation è una risposta concreta a questo problema. Non è hype da conferenza: è un meccanismo di composizione runtime che consente a più applicazioni di condividere codice e componenti senza dover essere compilate insieme. Questo articolo mostra come funziona in pratica con Vue 3 e Vite, dalle basi al contratto tra shell e moduli fino al deploy indipendente.

---

## Il problema che stiamo risolvendo

Cinque team, una SPA. Il setup iniziale è `npm run build` e tutto finisce in un bundle. Funziona fino a quando:

- Il build richiede 8 minuti — e ogni team deve aspettare gli altri per vedere le proprie modifiche in staging
- Il deploy di una feature piccola richiede il rilascio dell'intera applicazione
- Le dipendenze di un team (una libreria di charting pesante, per esempio) appesantiscono il bundle di tutti
- Un team vuole migrare da Vue 2 a Vue 3 senza bloccare gli altri

La risposta classica è il monorepo con build selettivi. Funziona, ma non risolve il problema del deploy: i bundle vengono ancora assemblati insieme a compile time. Module Federation sposta la composizione a runtime: ogni micro-frontend è un'applicazione autonoma, caricata dalla shell quando serve.

---

## Cos'è Module Federation

Webpack 5 ha introdotto Module Federation come funzionalità nativa del bundler. L'idea: un'applicazione (`remote`) espone alcuni dei suoi moduli. Un'altra applicazione (`host`) li importa a runtime, senza che i due bundle si conoscano a compile time.

Con Vite, la funzionalità analoga è fornita dal plugin [`@originjs/vite-plugin-federation`](https://github.com/originjs/vite-plugin-federation), che segue la stessa semantica.

I due ruoli:

| Ruolo | Descrizione |
|-------|-------------|
| **Host (shell)** | L'applicazione principale. Definisce il layout globale, il routing di primo livello, l'autenticazione. Carica i remoti on demand. |
| **Remote (modulo)** | Un'applicazione autonoma che espone componenti o intere sezioni dell'UI. Viene deploiata e versionata indipendentemente. |

Un'applicazione può essere sia host che remote contemporaneamente, ma per semplicità iniziamo con la topologia più comune: una shell e N moduli.

---

## Struttura del progetto

```
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

Ogni `apps/` directory è un progetto Vite indipendente. Può girare da solo in sviluppo. La shell non sa nulla dei remote a compile time — li scopre solo tramite la configurazione di federation.

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
      },
    }),
  ],
  build: {
    target: 'esnext',    // richiesto da vite-plugin-federation
    minify: false,       // opzionale, facilita il debug
  },
  server: {
    port: 5001,
  },
  preview: {
    port: 5001,
  },
});
```

Il `remoteEntry.js` è il manifest del remote: contiene la lista dei moduli esposti e gestisce il caricamento lazy delle dipendenze condivise.

---

## Configurazione: la shell (host)

```typescript
// apps/shell/vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    vue(),
    federation({
      name: 'shell',
      remotes: {
        // chiave: nome usato negli import
        // valore: URL del remoteEntry.js del modulo
        catalog: 'http://localhost:5001/assets/remoteEntry.js',
        checkout: 'http://localhost:5002/assets/remoteEntry.js',
      },
      shared: {
        vue: {
          requiredVersion: '^3.4.0',
          singleton: true,
        },
        'vue-router': {
          requiredVersion: '^4.0.0',
          singleton: true,
        },
      },
    }),
  ],
  build: {
    target: 'esnext',
  },
});
```

---

## Il contratto shell/modulo

Il contratto è l'interfaccia che il remote espone alla shell. Non c'è un file `.d.ts` automatico: va definito esplicitamente. Questo è il punto più critico dell'architettura.

### Componente remoto tipizzato

```typescript
// apps/catalog/src/components/CatalogView.vue
<script setup lang="ts">
interface Props {
  category?: string;
  onProductSelected?: (productId: string) => void;
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

Vite-plugin-federation non genera le tipizzazioni automaticamente. La soluzione più semplice è mantenere un file di dichiarazione nella shell:

```typescript
// apps/shell/src/types/remotes.d.ts
declare module 'catalog/CatalogView' {
  import type { DefineComponent } from 'vue';

  export interface CatalogViewProps {
    category?: string;
    onProductSelected?: (productId: string) => void;
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

Questo file va aggiornato manualmente quando il remote cambia la propria interfaccia. È una scomodità consapevole: il confine tra applicazioni deve essere esplicito.

---

## Routing nella shell

Il lazy loading dei componenti remoti usa la stessa API di `defineAsyncComponent`:

```typescript
// apps/shell/src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import { defineAsyncComponent } from 'vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/catalog',
      component: defineAsyncComponent(
        () => import('catalog/CatalogView')
      ),
    },
    {
      path: '/checkout',
      component: defineAsyncComponent(
        () => import('checkout/CheckoutView')
      ),
    },
  ],
});

export default router;
```

Il remote viene caricato solo quando l'utente naviga alla rotta corrispondente. Se il remote non è raggiungibile, `defineAsyncComponent` può gestire l'errore con `errorComponent` e `loadingComponent`.

---

## Gestione degli errori di caricamento

```typescript
// apps/shell/src/utils/remote-loader.ts
import { defineAsyncComponent, h } from 'vue';
import RemoteError from '../components/RemoteError.vue';
import RemoteSkeleton from '../components/RemoteSkeleton.vue';

export function loadRemote(loader: () => Promise<unknown>) {
  return defineAsyncComponent({
    loader: loader as () => Promise<{ default: unknown }>,
    loadingComponent: RemoteSkeleton,
    errorComponent: RemoteError,
    delay: 200,        // ms prima di mostrare il loading
    timeout: 10000,    // ms dopo cui mostrare l'errore
  });
}
```

Uso nel router:

```typescript
{
  path: '/catalog',
  component: loadRemote(() => import('catalog/CatalogView')),
}
```

---

## Dipendenze condivise: il punto più insidioso

`singleton: true` su Vue e Vue Router è obbligatorio. Due istanze di Vue nella stessa pagina rompono tutto: gli inject non funzionano, i plugin non vengono trovati, le reattività si separano.

Il problema si manifesta in questo scenario:

```
shell:  Vue 3.4.0
catalog: Vue 3.5.0    ← versione diversa
```

Con `singleton: true` e `requiredVersion: '^3.4.0'`, module federation usa l'istanza con la versione più alta compatibile. Se le versioni non sono compatibili, viene usata una seconda istanza — e l'applicazione si rompe in modi non ovvi.

La regola pratica: **Vue, Vue Router, Pinia, e qualsiasi store globale devono essere sempre `singleton: true`**. Le librerie utility (lodash, date-fns, axios) possono essere duplicate senza conseguenze.

```typescript
// Dipendenze che DEVONO essere singleton
shared: {
  vue: { singleton: true, requiredVersion: '^3.4.0' },
  'vue-router': { singleton: true, requiredVersion: '^4.0.0' },
  pinia: { singleton: true, requiredVersion: '^2.0.0' },
}

// Dipendenze che possono essere duplicate senza problemi
// (non dichiararle in shared = ogni remote porta la sua copia)
// axios, date-fns, zod, ...
```

---

## State condiviso tra remoti

Module Federation non risolve il problema dello state condiviso — lo sposta. Le opzioni:

**1. Store nella shell, iniettato nei remoti**

La shell crea il Pinia store. I remoti lo importano via `provide/inject` o tramite l'istanza Pinia condivisa (grazie al singleton).

```typescript
// apps/shell/src/main.ts
import { createPinia } from 'pinia';
import { useAuthStore } from './stores/auth';

const pinia = createPinia();
app.use(pinia);

// Il token auth è disponibile a tutti i remoti che usano la stessa istanza Pinia
const authStore = useAuthStore();
```

```typescript
// apps/catalog/src/stores/auth.ts
// Stesso store, stessa chiave — funziona perché Pinia è singleton
import { useAuthStore } from 'shell/stores/auth';  // oppure ridichiarato localmente con stessa struttura
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

I custom events funzionano quando i team vogliono essere completamente indipendenti. Il trade-off: nessuna tipizzazione automatica, nessun tracciamento statico delle dipendenze.

---

## Deploy indipendente

Il vantaggio principale di Module Federation è che ogni remote può essere deploiato senza toccare gli altri. Ma l'URL del `remoteEntry.js` nella configurazione della shell deve essere gestito correttamente per ambiente.

### URL dinamici per ambiente

Hardcodare `http://localhost:5001` funziona solo in sviluppo. In produzione serve una configurazione dinamica:

```typescript
// apps/shell/vite.config.ts
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [
      federation({
        remotes: {
          catalog: env.VITE_CATALOG_URL + '/assets/remoteEntry.js',
          checkout: env.VITE_CHECKOUT_URL + '/assets/remoteEntry.js',
        },
        // ...
      }),
    ],
  };
});
```

```bash
# .env.production
VITE_CATALOG_URL=https://catalog.app.example.com
VITE_CHECKOUT_URL=https://checkout.app.example.com
```

### Pipeline CI/CD separata per ogni modulo

Ogni applicazione ha la propria pipeline:

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

La shell non viene ridistribuita quando cambia un modulo. Questo è il punto: il `remoteEntry.js` viene caricato dalla shell a runtime — basta che l'URL sia raggiungibile.

### Versioning e rollback

Un'insidia: se il catalog deploya una breaking change al contratto (rinomina una prop, cambia il tipo di un evento), la shell smette di funzionare senza essere stata modificata.

Le strategie per gestirlo:

1. **URL con versione**: `catalog.app.example.com/v2/assets/remoteEntry.js` — la shell sceglie esplicitamente quale versione caricare
2. **Contract testing**: test automatici che verificano che il remote esponga l'interfaccia attesa dalla shell (simile ai consumer-driven contract test di Pact)
3. **Blue/green sulla shell**: entrambe le versioni del remote disponibili, la shell viene aggiornata in modo coordinato

---

## Quando usare Module Federation (e quando no)

Module Federation aggiunge complessità reale. Non è la risposta giusta per tutti i progetti.

| Scenario | Consiglio |
|----------|-----------|
| Un team, una SPA | Non serve. Usa Vite con build selettivi e route-based lazy loading |
| 2-3 team, stesso repo | Monorepo con Turborepo o Nx. Module Federation solo se i deploy devono essere indipendenti |
| 3+ team, feature aree ben definite, SLA di deploy separati | Module Federation ha senso |
| Team che usano framework diversi (React + Vue) | Module Federation gestisce anche questo caso |
| Startup con 5 sviluppatori | Overengineering. Tornarci tra 18 mesi |

Il segnale che indica che Module Federation è la mossa giusta non è "siamo tanti" — è "ci blocchiamo a vicenda nel deploy". Se il problema non è il deploy ma il build, ci sono soluzioni più semplici.

---

## Riepilogo

Module Federation in Vue 3 con Vite si configura in poche righe, ma richiede decisioni esplicite su:

- **Il contratto**: cosa espone il remote, con quali props e quali eventi. Va documentato e versionato come un'API.
- **Le dipendenze singleton**: Vue, Vue Router e Pinia devono essere una sola istanza. Configurarlo male rompe l'applicazione in modo non ovvio.
- **La gestione degli URL**: gli indirizzi dei remote cambiano per ambiente. Parametrizzare dalla prima ora.
- **Il versioning del contratto**: il deploy indipendente è un vantaggio solo finché i contratti non si rompono in modo non coordinato.

L'architettura micro-frontend non è free. Il costo è la complessità distribuita: invece di un build che fallisce, hai runtime error che dipendono da quale versione del remote è in produzione. Vale la pena solo quando il problema che risolve — team che si bloccano a vicenda — è reale.

### Risorse

- [`@originjs/vite-plugin-federation`](https://github.com/originjs/vite-plugin-federation) — plugin Vite per Module Federation
- [Webpack 5 Module Federation](https://webpack.js.org/concepts/module-federation/) — specifica originale
- [Module Federation Examples](https://github.com/module-federation/module-federation-examples) — esempi con Vue, React, Angular
