---
title: "From EventBus to Pinia: Incremental State Migration in Vue 3"
date: 2026-02-14T09:00:00.000Z
description: "Practical patterns for replacing EventBus with Pinia in a Vue 3 project: cache with deduplication, selective persistence, and a hybrid migration approach"
pillar: progettare
category: web-development
tags:
  - Vue
  - Pinia
  - Nuxt
  - TypeScript
  - Frontend
lang: en
reviewed: machine
series: web-development
seriesOrder: 10
---

## EventBus: Implicit State Spread Across Components

In [Vue 2](https://v2.vuejs.org/), [Vuex](https://vuex.vuejs.org/) was the official solution for shared state, but many projects avoided it due to its verbosity and relied on an EventBus instead: a `new Vue()` instance used as an event emitter via `$on`/`$emit`/`$off`. Each component that needed data made its own API calls. No cache, no centralized state.

The limitations of this approach are well known:

- **No single source of truth** — state lives in events; there is no way to inspect the current value
- **Fragile timing** — an event emitted before a listener is mounted is lost
- **Memory leaks** — every `$on` without a matching `$off` in `beforeDestroy` accumulates orphaned listeners
- **Opaque debugging** — DevTools show nothing; events are fire-and-forget

In [Vue 3](https://vuejs.org/), `new Vue()` is replaced by [`createApp()`](https://vuejs.org/api/application.html#createapp) and, more importantly, `$on`/`$off`/`$once` are [removed from component instances](https://v3-migration.vuejs.org/breaking-changes/events-api.html). The EventBus is no longer an option. Two alternatives remain: an external event library ([mitt](https://github.com/developit/mitt), tiny-emitter) that preserves the same pattern with the same limitations, or explicit state management with [Pinia](https://pinia.vuejs.org/).

This article documents the patterns that emerged during a real EventBus-to-Pinia migration. The complete code is in the [demo repository](https://github.com/monte97/pinia-vue-demo).

## Why Pinia and Not Vuex

Vuex is in [maintenance mode](https://vuex.vuejs.org/): it receives security fixes but no new features. Pinia is its official successor, recommended by the Vue documentation. The practical advantages:

- **Less boilerplate.** No mutations, no distinction between `commit` and `dispatch`. State is modified directly inside actions.
- **First-class TypeScript.** Type inference works without additional configuration, both with Options API and Composition API.
- **Dual paradigm.** Pinia supports two styles for defining a store: the [Options API](https://pinia.vuejs.org/core-concepts/#option-stores), more declarative and structured (state/getters/actions), and the [Composition API](https://pinia.vuejs.org/core-concepts/#setup-stores), based on functions and closures (ref/computed/function). The choice depends on store complexity.
- **Plugin ecosystem.** `pinia-plugin-persistedstate` alone justifies the migration for how much it simplifies selective persistence.

## Pattern 1: UI State, from EventBus to Store

### Before (Vue 2 EventBus)

The classic pattern found throughout the codebase:

```javascript
// helpers/EventBus.js
import Vue from 'vue'
export const EventBus = new Vue()

// In a page component
EventBus.$emit('update-title', 'Products')

// In the layout
EventBus.$on('update-title', (title) => {
  this.title = title
})
```

The problems with this pattern:

- **No single source of truth.** The title lived in the layout, but any component could emit it, and there was no way to know the current value without reading the last emitted event.
- **Opaque debugging.** DevTools showed nothing useful because events were fire-and-forget.
- **Memory leaks.** Every `$on` without a matching `$off` in `beforeDestroy` was a subscription that stayed active, accumulating orphaned listeners.

### After (Pinia)

```typescript
// stores/app.ts
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    title: '' as string,
    drawer: true as boolean,
    loading: false as boolean
  }),
  actions: {
    setTitle(title: string) {
      this.title = title
    },
    toggleDrawer() {
      this.drawer = !this.drawer
    },
    setLoading(value: boolean) {
      this.loading = value
    }
  }
})
```

State is visible in DevTools, modifiable from any component, and always consistent. No listeners to clean up, no leak risk.

To avoid repeating `appStore.setTitle(...)` in every page, it is useful to extract a composable:

```typescript
// composables/useTitle.ts
import { onMounted } from 'vue'
import { useAppStore } from '~/stores/app'

export function useTitle(title: string) {
  const appStore = useAppStore()
  onMounted(() => appStore.setTitle(title))
  return { setTitle: (t: string) => appStore.setTitle(t) }
}

// In any page:
useTitle('Products')
```

A note on style: for simple, flat stores like this one, the Options API is sufficient. The Composition API adds no value when state is a set of fields with a few direct actions.

## Pattern 2: Cache Store with Request Deduplication

### Every Component for Itself

In the old application, every component that needed "products" or "categories" made its own API call. Every page had its own `mounted()` with an `api.getAll()`, unaware that another page might have fetched the same data five seconds earlier.

The result was predictable. Three pages displaying products generate three identical `GET /products` requests. A page with a table showing both products and categories produces two simultaneous product requests if two different components fire them in the same cycle. In an application with a dozen entities and several pages, duplicate requests multiply. Slow, wasteful, and with the risk of inconsistent state between components displaying the same data fetched at different moments.

### Centralized Cache with Deduplication

The solution is a Pinia store that centralizes data and manages three things:

1. **Cache-once**: data is fetched once, then served from memory.
2. **Request deduplication**: if a fetch is already in progress, new callers attach to the same promise.
3. **Manual invalidation**: after CRUD operations, the consumer calls `invalidate()` to mark the cache as stale.

Here is the complete store:

```typescript
// stores/inventory.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Product, Category, Supplier } from '~/types'
import * as api from '~/api/inventory'

type InventoryEntityType = 'products' | 'categories' | 'suppliers'

export const useInventoryStore = defineStore('inventory', () => {

  // ── Reactive state (exposed to components) ──────────────────────
  const products = ref<Product[]>([])
  const categories = ref<Category[]>([])
  const suppliers = ref<Supplier[]>([])

  // ── Entity → ref and API mapping ────────────────────────────────
  const entityRefs: Record<InventoryEntityType, typeof products> = {
    products, categories, suppliers
  }

  const apiFns: Record<InventoryEntityType, () => Promise<any[]>> = {
    products: api.fetchProducts,
    categories: api.fetchCategories,
    suppliers: api.fetchSuppliers
  }

  // ── Non-reactive internal state (bookkeeping) ───────────────────
  // Intentionally non-reactive: should not trigger re-renders
  const loaded: Record<InventoryEntityType, boolean> = {
    products: false, categories: false, suppliers: false
  }

  const loading = ref<Record<InventoryEntityType, boolean>>({
    products: false, categories: false, suppliers: false
  })

  const pendingRequests: Partial<Record<InventoryEntityType, Promise<any[]>>> = {}
```

State is organized at three levels:

- **Reactive refs** (`products`, `categories`, `suppliers`) — exposed to components, updated by fetches.
- **Internal mappings** (`entityRefs`, `apiFns`) — allow generalizing operations per entity with a single function.
- **Bookkeeping** (`loaded`, `pendingRequests`, `loading`) — intentionally non-reactive internal state, except for `loading` which components need to observe.

The fetch logic uses these mappings to operate on any entity:

```typescript
  // ── Fetch with cache and deduplication ──────────────────────────
  async function fetchEntities(
    type: InventoryEntityType,
    force = false
  ): Promise<any[]> {
    if (loaded[type] && !force) return entityRefs[type].value
    if (pendingRequests[type]) return pendingRequests[type]!

    loading.value[type] = true
    const promise = apiFns[type]()
      .then((response) => {
        entityRefs[type].value = response || []
        loaded[type] = true
        return entityRefs[type].value
      })
      .finally(() => {
        delete pendingRequests[type]
        loading.value[type] = false
      })

    pendingRequests[type] = promise
    return promise
  }

  function invalidate(type: InventoryEntityType) {
    loaded[type] = false
  }

  async function refresh(type: InventoryEntityType) {
    return fetchEntities(type, true)
  }

  const availableCategories = computed(() => {
    return [...new Set(products.value.map(p => p.category).filter(Boolean))]
  })

  return {
    products, categories, suppliers,
    loading,
    fetchEntities, invalidate, refresh,
    availableCategories
  }
})
```

> **Note**: `fetchEntities` omits error handling for brevity. In production, handle errors with a dedicated ref per entity (e.g. `errors: Record<InventoryEntityType, string | null>`) and a `.catch()` in the promise that populates the error message, so components can display feedback to users.

### Why Composition API Here

The choice is not aesthetic. `loaded` and `pendingRequests` are intentionally **non-reactive**. They are internal store state — bookkeeping that should not trigger component re-renders. The Composition API's closures allow keeping them encapsulated: they exist in the function scope, are accessible by actions, but are neither exposed nor reactive.

With Options API, everything ends up in `state`, `getters`, or `actions`. There is no natural place for non-reactive internal state. A variable outside the `defineStore` call would work but is less clean and loses encapsulation.

### Invalidation After CRUD

```typescript
// Case 1: immediate refresh after a modification (most common scenario)
async function deleteProduct(id: string) {
  await api.deleteProduct(id)
  await inventoryStore.refresh('products')
}

// Case 2: lazy invalidation, no immediate refresh
function onBulkImportComplete() {
  inventoryStore.invalidate('products')
  inventoryStore.invalidate('categories')
  // No refresh: data will be reloaded when
  // the next component calls fetchEntities()
}
```

The flow is explicit: the moment of invalidation is known, because it coincides with every operation that modifies data. No TTL expiring at the wrong time.

An important detail: `invalidate()` and `refresh()` serve different scenarios. `refresh()` calls `fetchEntities(type, true)` with `force = true`, bypassing the `loaded` flag and forcing a new fetch. There is no need to call `invalidate()` before `refresh()` because the `force` parameter makes the `loaded` check irrelevant.

`invalidate()` makes sense on its own when you want to mark data as stale without forcing an immediate refresh — for example, after a batch operation when the user is not on the page displaying that data. The next call to `fetchEntities()` (without `force`) will see `loaded = false` and reload the data automatically.

## Pattern 3: Selective Persistence

### sessionStorage for Filters

Search filters need to survive navigation between pages but reset when the tab is closed. A simple requirement, but manual implementation introduces unnecessary complexity.

Before the migration, the code was scattered across components:

```javascript
// Before: in every component using filters
mounted() {
  this.category = sessionStorage.getItem('filter-category') || ''
  this.supplier = sessionStorage.getItem('filter-supplier') || ''
},
watch: {
  category(val) {
    sessionStorage.setItem('filter-category', val)
  },
  supplier(val) {
    sessionStorage.setItem('filter-supplier', val)
  }
}
```

Every component replicated the same logic. Adding a filter meant touching both the template and the persistence code, remembering the exact key name, handling serialization for non-string types. Typical bugs: a key spelled differently, a forgotten `getItem`, a filter that stopped syncing.

With `pinia-plugin-persistedstate` it becomes declarative:

```typescript
// stores/filters.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useFiltersStore = defineStore('filters', () => {
  const category = ref('')
  const supplier = ref('')
  const search = ref('')

  const hasActiveFilters = computed(() => {
    return !!(category.value || supplier.value || search.value)
  })

  function resetFilters() {
    category.value = ''
    supplier.value = ''
    search.value = ''
  }

  return { category, supplier, search, hasActiveFilters, resetFilters }
}, {
  persist: {
    storage: sessionStorage,
    pick: ['category', 'supplier', 'search']
  }
})
```

### localStorage for Preferences

User preferences need to persist across sessions. Same pattern, different storage:

```typescript
// stores/preferences.ts
import { ref } from 'vue'
import { defineStore } from 'pinia'

export const usePreferencesStore = defineStore('preferences', () => {
  const itemsPerPage = ref(10)
  const darkMode = ref(false)

  return { itemsPerPage, darkMode }
}, {
  persist: {
    storage: localStorage,
    pick: ['itemsPerPage', 'darkMode']
  }
})
```

The key point is `pick`. It controls exactly which fields are persisted. Not everything in a store needs to go into storage: `hasActiveFilters` is a computed value — persisting it makes no sense. Without `pick`, the plugin would serialize the entire state, including fields that should be ephemeral or derived.

## Pattern 4: Layer-by-Layer Migration, Not Big Bang

In practice, the migration did not happen all at once. The approach was hybrid: Composition API for stores (more flexible, closures for internal state), but Options API in page components to minimize refactoring.

The `setup()` function acts as a bridge:

```vue
<script>
import { useInventoryStore } from '~/stores/inventory'

export default {
  setup() {
    const inventoryStore = useInventoryStore()
    return { inventoryStore }
  },
  data() {
    return { localState: [] }
  },
  mounted() {
    this.inventoryStore.fetchEntities('products')
  }
}
</script>
```

This is a pragmatic trade-off. There is no need to rewrite every component using `<script setup>` on day one. New stores use Composition API because they genuinely benefit from it (closures for private state, greater flexibility in composition). Existing components stay in Options API until there is a specific reason to touch them.

The advantage of this approach is the ability to migrate in layers. First, create Pinia stores and connect them to existing components via `setup()`. Then, when returning to a component for other reasons (a bug fix, a new feature), take the opportunity to convert it to `<script setup>`. In the meantime, the code works. Development does not stop for a complete rewrite.

## Conclusions

- **Go to Pinia directly, skip Vuex.** Vuex is in maintenance mode; Pinia is the official successor.
- **Explicit invalidation for CRUD data.** The moment of change is known (create, update, delete); TTLs are only needed for data that changes unpredictably.
- **Deduplication with promise caching.** Three components requesting the same data generate a single request.
- **Declarative persistence with `pinia-plugin-persistedstate`.** A configuration in the store replaces `getItem`/`setItem` scattered across components.
- **Incremental migration.** Stores first, then composables, then component syntax.

Migrating from EventBus to Pinia is not just a library change: it is the transition from an implicit architecture where state lives in events, to an explicit one where state has a precise, inspectable, and testable location.

## Useful Resources

* **Pinia Documentation**: [pinia.vuejs.org](https://pinia.vuejs.org/)
* **pinia-plugin-persistedstate**: [prazdevs.github.io/pinia-plugin-persistedstate](https://prazdevs.github.io/pinia-plugin-persistedstate/) (repository migrated to [Codeberg](https://codeberg.org/praz/pinia-plugin-persistedstate))
* **Vue 3 Migration Guide**: [v3-migration.vuejs.org](https://v3-migration.vuejs.org/)
* **Demo repository**: [github.com/monte97/pinia-vue-demo](https://github.com/monte97/pinia-vue-demo)
