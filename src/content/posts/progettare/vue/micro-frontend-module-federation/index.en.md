---
title: "Micro-frontends in Vue 3 with Module Federation: Shell, Contract, and Independent Deploy"
seoTitle: "Vue 3 micro-frontends: Module Federation"
date: 2026-03-14T09:00:00.000Z
description: "Module Federation in Vue 3 with Vite: shell/remote contract, singleton dependencies, and independent per-team deployments."
pillar: progettare
category: vue
tags:
  - Vue3
  - MicroFrontend
  - ModuleFederation
  - Vite
  - Architecture
  - Frontend
lang: en
reviewed: machine
---

The frontend project starts as a SPA. It grows. More teams arrive. The first warning sign is not a slow build: it is the weekly meeting where three teams block each other because they are all editing the same `router.ts`.

Module Federation is a concrete answer to this problem: a runtime composition mechanism that lets multiple applications share code and components without being compiled together. The configuration, the contract between shell and remote modules, and independent deployment are the topics of the sections that follow.

## The Problem We Are Solving

Five teams, one SPA. The initial setup is `npm run build` and everything ends up in a single bundle. It works until:

- Every change — even minor — restarts the build for the entire application: all teams wait
- Deploying a small feature requires releasing the entire application
- One team's dependencies (a heavy charting library, for example) inflate everyone's bundle
- A team wants to migrate from Vue 2 to Vue 3 without blocking the others

The classic answer is a [monorepo with selective builds](https://monorepo.tools/). It works, but it does not solve the deployment problem: bundles are still assembled together at compile time. Module Federation shifts composition to runtime: each micro-frontend is a standalone application, loaded by the shell when needed.

---

## What Is Module Federation

[Webpack 5](https://webpack.js.org/concepts/module-federation/) introduced Module Federation as a native bundler feature. The idea: one application (`remote`) exposes some of its modules. Another application (`host`) imports them at runtime, without the two bundles knowing each other at compile time.

With Vite, the equivalent functionality is provided by the [`@originjs/vite-plugin-federation`](https://github.com/originjs/vite-plugin-federation) plugin, which follows the same semantics.

The two roles:

| Role | Description |
|------|-------------|
| **Host (shell)** | The main application. Defines the global layout, top-level routing, authentication. Loads remotes on demand. |
| **Remote (module)** | A standalone application that exposes components or entire UI sections. Deployed and versioned independently. |

An application can be both host and remote simultaneously. The sections below cover the most common topology: one shell and N modules.

---

## Project Structure

```text
apps/
+-- shell/          # host — global routing, layout, auth
|   +-- vite.config.ts
|   +-- src/
|       +-- main.ts
|       +-- router/index.ts
|       +-- App.vue
+-- catalog/        # remote — product catalog section
|   +-- vite.config.ts
|   +-- src/
|       +-- main.ts          # standalone entry point (local dev)
|       +-- bootstrap.ts     # federated entry point
|       +-- components/
|           +-- CatalogView.vue
+-- checkout/       # remote — checkout section
    +-- vite.config.ts
    +-- src/
        +-- bootstrap.ts
        +-- components/
            +-- CheckoutView.vue
```

Each `apps/` directory is an independent Vite project with its own `package.json`. The shell does not know about remotes at compile time — it discovers them only through the federation configuration.

**Development workflow note**: `@originjs/vite-plugin-federation` supports the dev server only for the shell (host). Remotes must be built (`vite build --watch`) and served as static builds (e.g., `vite preview`). During development each remote runs standalone on its own port; the shell consumes them as builds.

---

## Configuration: The Remote (catalog)

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
      filename: 'remoteEntry.js',   // federated bundle entry point
      exposes: {
        // key: public module name
        // value: local path of the file to expose
        './CatalogView': './src/components/CatalogView.vue',
        './ProductCard': './src/components/ProductCard.vue',
      },
      shared: {
        vue: {
          requiredVersion: '^3.4.0',
          singleton: true,   // enforce a single instance across the page
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
    target: 'esnext',    // required by vite-plugin-federation
  },
  server: {
    port: 5001,
  },
  preview: {
    port: 5001,
  },
});
```

The `remoteEntry.js` is the remote's manifest: it contains the list of exposed modules and manages lazy loading of shared dependencies. The path `/assets/remoteEntry.js` reflects Vite's default output structure (`dist/assets/`) — it changes if you modify `build.outDir` or `build.assetsDir`.

---

## Configuration: The Shell (host)

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
          // key: name used in imports
          // value: URL of the module's remoteEntry.js
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

Environment-parameterized URLs: the shell does not need to be modified when a module's hosting changes.

---

## The Shell/Module Contract

The contract is the interface the remote exposes to the shell. There is no automatic `.d.ts` generation: it must be defined explicitly.

### Typed Remote Component

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

### Type Declaration in the Shell

The plugin does not generate typings. The pattern is a declaration file in the shell:

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

This file must be updated manually when the remote changes its interface. The boundary between applications is explicit by design.

---

## Routing in the Shell

Vue Router requires route components to be valid Vue components — not `defineAsyncComponent`. The correct pattern for loading a remote into a route is a direct dynamic import:

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
      // direct dynamic import — Vue Router handles lazy loading
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

The remote is loaded only when the user navigates to the corresponding route. To handle network errors (remote unreachable), use [`defineAsyncComponent`](https://vuejs.org/guide/components/async) at the component level in templates, not in route definitions.

---

## Handling Load Errors

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
    delay: 200,        // ms before showing the loading state
    timeout: 10000,    // ms after which to show the error state
  });
}
```

Usage in a template (not in route definitions):

```typescript
// In a Vue component that wraps the remote with error handling
const CatalogSection = loadRemote(() => import('catalog/CatalogView'));
```

---

## Shared Dependencies: The Most Treacherous Part

`singleton: true` on Vue, Vue Router, and Pinia is mandatory. Two Vue instances on the same page break everything: `inject` stops working, plugins are not found, reactivity systems become separate.

The problem surfaces with mismatched versions between shell and remote:

```text
shell:    Vue 3.4.0
catalog:  Vue 3.5.0    <- different version
```

With `singleton: true` and `requiredVersion: '^3.4.0'`, Module Federation uses the instance with the highest compatible version. If versions are not compatible with each other, the plugin uses the first instance loaded and emits a console warning — the app keeps running, but the behavior is unpredictable and hard to diagnose.

The practical rule: **Vue, Vue Router, and Pinia must always be `singleton: true`** in both the shell and the remotes. Utility libraries (lodash, date-fns, axios) do not have this constraint — each remote can carry its own copy without consequences.

---

## Shared State Between Remotes

Module Federation does not solve the shared state problem — it relocates it. Three options with different trade-offs:

**1. Store redeclared with the same key**

Pinia is singleton: if shell and remote declare the same store (same `id`) and Pinia is shared, they access the same in-memory state. There is no need to import the store from the shell — just redeclare it with the same structure.

```typescript
// apps/catalog/src/stores/auth.ts
// Same structure and same id as the store in the shell
// Singleton Pinia = same in-memory state
import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null);
  return { token };
});
```

**2. Props and events for local data**

For state local to the remote component, props and emit are sufficient and create no hidden dependencies.

**3. Custom events for loose-coupled communication**

```typescript
// Emission from a remote
window.dispatchEvent(new CustomEvent('catalog:product-selected', {
  detail: { productId: '123' }
}));

// Reception in the shell
window.addEventListener('catalog:product-selected', (e) => {
  const { productId } = (e as CustomEvent).detail;
  router.push(`/checkout?product=${productId}`);
});
```

[Custom events](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent) work when teams want to be completely independent. The trade-off: no automatic typing, no static dependency tracking.

---

## Independent Deployment

Each remote has its own CI/CD pipeline. The shell does not redeploy when a module changes — it loads the `remoteEntry.js` at runtime from the configured URL.

```yaml
# catalog/.github/workflows/deploy.yml
on:
  push:
    branches: [main]
    paths:
      - 'apps/catalog/**'   # trigger only when catalog changes

jobs:
  deploy:
    steps:
      - run: npm run build
      - run: # upload dist/ to CDN or hosting
```

### Versioning and Rollback

The main risk: if catalog deploys a breaking change to the contract (renames a prop, changes an event type), the shell stops working without being modified — and without a build error to signal it.

Strategies to handle this:

1. **Versioned URLs**: `catalog.app.example.com/v2/assets/remoteEntry.js` — the shell explicitly chooses which version to load
2. **Contract testing**: automated tests that verify the remote exposes the interface expected by the shell (the [consumer-driven contract test](https://docs.pact.io/) pattern)
3. **Explicit coordination**: shell and remote update the contract in a single PR — you lose some independence, but gain safety

---

## When to Use Module Federation (and When Not To)

Module Federation adds real complexity.

| Scenario | Recommendation |
|----------|---------------|
| One team, one SPA | Not needed. Vite with route-based lazy loading is sufficient |
| 2–3 teams, same repo | Monorepo with Turborepo or Nx. Module Federation only if deployments need to be independent |
| 3+ teams, well-defined feature areas, separate deployment SLAs | Module Federation makes sense |
| Teams using different frameworks (React + Vue) | Module Federation handles this case too |
| Startup with 5 developers | Overengineering. Revisit in 18 months |

The signal is not "we have many people": it is "we are blocking each other at deployment time."

---

## Summary

Module Federation in Vue 3 with Vite requires only a few lines of configuration, but four explicit decisions:

- **The contract**: what the remote exposes, with which props and which events. It must be documented and versioned like an API — there is no automatic type generation.
- **Singleton dependencies**: Vue, Vue Router, and Pinia must be a single instance. A wrong configuration breaks the application without a clear error.
- **The development workflow**: remotes are built with `vite build --watch`, not served via dev server. The DX differs from a classic SPA — better to know this upfront.
- **Contract versioning**: independent deployment is a real advantage, but an uncoordinated breaking change blocks the shell in production without warning.

The cost is distributed complexity: instead of a failing build, you get runtime errors that depend on which version of the remote is in production.

### Resources

- **[`@originjs/vite-plugin-federation`](https://github.com/originjs/vite-plugin-federation)** — Vite plugin for Module Federation
- **[Webpack 5 Module Federation](https://webpack.js.org/concepts/module-federation/)** — original specification and core concepts
- **[Module Federation Examples](https://github.com/module-federation/module-federation-examples)** — official examples with Vue, React, Angular
- **[Vue 3 — Async Components](https://vuejs.org/guide/components/async)** — `defineAsyncComponent`, loading/error state, Suspense
- **[Vue Router — Lazy Loading Routes](https://router.vuejs.org/guide/advanced/lazy-loading)** — dynamic import and route-level code splitting
- **[Pinia](https://pinia.vuejs.org/)** — official documentation for the state manager
- **[Vite — Env Variables](https://vitejs.dev/guide/env-and-mode)** — `loadEnv` and environment variable management
- **[Pact](https://docs.pact.io/)** — framework for consumer-driven contract testing
