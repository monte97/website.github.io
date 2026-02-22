---
title: "Da EventBus a Pinia: migrazione progressiva dello stato in Vue 3"
date: 2026-02-14T10:00:00+01:00
description: "Pattern concreti per sostituire EventBus con Pinia in un progetto Vue 3: cache con deduplication, persistenza selettiva, approccio ibrido"
menu:
  sidebar:
    name: EventBus → Pinia
    identifier: eventbus-pinia-migrazione
    weight: 10
    parent: WEBDEV
tags: ["Vue", "Pinia", "Nuxt", "TypeScript", "Frontend"]
categories: ["Frontend"]
reviewed: human
---

## EventBus: stato implicito distribuito tra componenti

In [Vue 2](https://v2.vuejs.org/), [Vuex](https://vuex.vuejs.org/) era la soluzione ufficiale per lo stato condiviso, ma molti progetti lo evitavano per la sua verbosità e ricorrevano all'EventBus: un'istanza `new Vue()` usata come emettitore di eventi tramite `$on`/`$emit`/`$off`. Ogni componente che aveva bisogno di dati li recuperava con chiamate API proprie. Nessuna cache, nessuno stato centralizzato.

I limiti di questo approccio sono noti:

- **Nessuna single source of truth** - lo stato vive negli eventi, non c'è modo di ispezionare il valore corrente
- **Timing fragile** - un evento emesso prima che il listener sia montato va perso
- **Memory leak** - ogni `$on` senza il corrispondente `$off` nel `beforeDestroy` accumula listener orfani
- **Debugging opaco** - i DevTools non mostrano nulla, gli eventi sono fire-and-forget

In [Vue 3](https://vuejs.org/), `new Vue()` è sostituito da [`createApp()`](https://vuejs.org/api/application.html#createapp) e soprattutto `$on`/`$off`/`$once` sono [rimossi dalle istanze componente](https://v3-migration.vuejs.org/breaking-changes/events-api.html). L'EventBus non è più possibile. Le alternative sono due: una libreria di eventi esterna ([mitt](https://github.com/developit/mitt), tiny-emitter) che mantiene lo stesso pattern con gli stessi limiti, oppure uno state management esplicito con [Pinia](https://pinia.vuejs.org/).

Questo articolo raccoglie i pattern emersi durante una migrazione concreta da EventBus a Pinia. Il codice completo è nel [repository demo](https://github.com/monte97/pinia-vue-demo).

## Perché Pinia e non Vuex

Vuex è in [maintenance mode](https://vuex.vuejs.org/): riceve fix di sicurezza, ma nessuna nuova funzionalità. Pinia è il suo successore ufficiale, raccomandato dalla documentazione di Vue. I vantaggi concreti:

- **Meno boilerplate.** Niente mutations, niente distinzione tra `commit` e `dispatch`. Lo stato si modifica direttamente nelle actions.
- **TypeScript di prima classe.** L'inferenza dei tipi funziona senza configurazione aggiuntiva, sia con Options API che con Composition API.
- **Doppio paradigma.** Pinia supporta due stili per definire uno store: l'[Options API](https://pinia.vuejs.org/core-concepts/#option-stores), più dichiarativo e strutturato (state/getters/actions), e la [Composition API](https://pinia.vuejs.org/core-concepts/#setup-stores), basata su funzioni e closure (ref/computed/function). La scelta dipende dalla complessità dello store.
- **Ecosistema plugin.** `pinia-plugin-persistedstate` da solo giustifica la migrazione per come semplifica la persistenza selettiva.

## Pattern 1: UI State, da EventBus a Store

### Prima (Vue 2 EventBus)

Il pattern classico presente ovunque nel codice:

```javascript
// helpers/EventBus.js
import Vue from 'vue'
export const EventBus = new Vue()

// In un componente pagina
EventBus.$emit('update-title', 'Prodotti')

// Nel layout
EventBus.$on('update-title', (title) => {
  this.title = title
})
```

I problemi di questo pattern:

- **Nessuna single source of truth.** Il titolo viveva nel layout, ma qualsiasi componente poteva emetterlo, e non c'era modo di sapere qual era il valore corrente senza leggere l'ultimo evento emesso.
- **Debugging opaco.** I DevTools non mostravano nulla di utile, perché gli eventi erano fire-and-forget.
- **Memory leak.** Ogni `$on` senza un corrispondente `$off` nel `beforeDestroy` era una sottoscrizione che restava attiva, accumulando listener orfani.

### Dopo (Pinia)

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

Lo stato è visibile nei DevTools, modificabile da qualsiasi componente, e sempre coerente. Nessun listener da pulire, nessun rischio di leak.

Per evitare di ripetere `appStore.setTitle(...)` in ogni pagina, è utile estrarre un composable:

```typescript
// composables/useTitle.ts
import { onMounted } from 'vue'
import { useAppStore } from '~/stores/app'

export function useTitle(title: string) {
  const appStore = useAppStore()
  onMounted(() => appStore.setTitle(title))
  return { setTitle: (t: string) => appStore.setTitle(t) }
}

// In qualsiasi pagina:
useTitle('Prodotti')
```

Una nota sulla scelta stilistica: per store semplici e piatti come questo, l'Options API è sufficiente. La Composition API non aggiunge valore quando lo stato è un insieme di campi con qualche action diretta.

## Pattern 2: Cache Store con Request Deduplication

### Ogni componente per sé

Nella vecchia applicazione, ogni componente che aveva bisogno di "prodotti" o "categorie" faceva la propria chiamata API. Ogni pagina aveva il suo `mounted()` con un `api.getAll()`, senza sapere se un'altra pagina avesse già recuperato gli stessi dati cinque secondi prima.

Il risultato era prevedibile. Tre pagine che mostrano prodotti generano tre `GET /products` identiche. Una pagina con tabella che mostra sia prodotti che categorie produce due chiamate simultanee per prodotti se due componenti diversi le lanciano nello stesso ciclo. In un'applicazione con una decina di entità e diverse pagine, le chiamate duplicate si moltiplicano. Lento, dispendioso, e con il rischio di stato inconsistente tra componenti che mostrano gli stessi dati recuperati in momenti diversi.

### Cache centralizzata con deduplicazione

La soluzione è uno store Pinia che centralizza i dati e gestisce tre aspetti:

1. **Cache-once**: i dati vengono recuperati una volta, poi serviti dalla memoria.
2. **Request deduplication**: se una fetch è già in corso, i nuovi chiamanti si agganciano alla stessa promise.
3. **Invalidazione manuale**: dopo operazioni CRUD, il consumatore chiama `invalidate()` per invalidare la cache.

Ecco lo store completo:

```typescript
// stores/inventory.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Product, Category, Supplier } from '~/types'
import * as api from '~/api/inventory'

type InventoryEntityType = 'products' | 'categories' | 'suppliers'

export const useInventoryStore = defineStore('inventory', () => {

  // ── Stato reattivo (esposto ai componenti) ──────────────────────
  const products = ref<Product[]>([])
  const categories = ref<Category[]>([])
  const suppliers = ref<Supplier[]>([])

  // ── Mapping entità → ref e API ──────────────────────────────────
  const entityRefs: Record<InventoryEntityType, typeof products> = {
    products, categories, suppliers
  }

  const apiFns: Record<InventoryEntityType, () => Promise<any[]>> = {
    products: api.fetchProducts,
    categories: api.fetchCategories,
    suppliers: api.fetchSuppliers
  }

  // ── Stato interno non reattivo (bookkeeping) ────────────────────
  // Non reattivo di proposito: non deve triggerare re-render
  const loaded: Record<InventoryEntityType, boolean> = {
    products: false, categories: false, suppliers: false
  }

  const loading = ref<Record<InventoryEntityType, boolean>>({
    products: false, categories: false, suppliers: false
  })

  const pendingRequests: Partial<Record<InventoryEntityType, Promise<any[]>>> = {}
```

Lo stato è organizzato su tre livelli:

- **Ref reattivi** (`products`, `categories`, `suppliers`) - esposti ai componenti, aggiornati dalle fetch.
- **Mapping interni** (`entityRefs`, `apiFns`) - permettono di generalizzare le operazioni per entità con una sola funzione.
- **Bookkeeping** (`loaded`, `pendingRequests`, `loading`) - stato interno non reattivo di proposito, tranne `loading` che i componenti devono poter osservare.

La logica di fetch usa questi mapping per operare su qualsiasi entità:

```typescript
  // ── Fetch con cache e deduplicazione ────────────────────────────
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

> **Nota**: `fetchEntities` non include error handling per brevità. Sarebbe opportuno gestire gli errori con un ref dedicato per entità (ad esempio `errors: Record<InventoryEntityType, string | null>`) e un `.catch()` nella promise che popoli il messaggio di errore, così i componenti possono mostrare feedback all'utente.

### Perché Composition API qui

La scelta non è estetica. `loaded` e `pendingRequests` sono intenzionalmente **non reattivi**. Sono stato interno dello store, bookkeeping che non deve triggerare re-render nei componenti. Le closure della Composition API permettono di tenerli incapsulati: esistono nello scope della funzione, sono accessibili dalle actions, ma non sono esposti né reattivi.

Con Options API, tutto finisce in `state`, `getters` o `actions`. Non c'è un posto naturale per stato interno non reattivo. Si potrebbe usare una variabile esterna al `defineStore`, ma è meno pulito e perde l'incapsulamento.

### Invalidazione dopo CRUD

```typescript
// Caso 1: refresh immediato dopo una modifica (scenario più comune)
async function deleteProduct(id: string) {
  await api.deleteProduct(id)
  await inventoryStore.refresh('products')
}

// Caso 2: invalidazione lazy, senza refresh immediato
function onBulkImportComplete() {
  inventoryStore.invalidate('products')
  inventoryStore.invalidate('categories')
  // Nessun refresh: i dati verranno ricaricati quando
  // il prossimo componente chiamerà fetchEntities()
}
```

Il flusso è esplicito: il momento dell'invalidazione è noto, perché coincide con ogni operazione che modifica i dati. Nessun TTL che scade nel momento sbagliato.

Un dettaglio importante: `invalidate()` e `refresh()` servono a scenari diversi. `refresh()` chiama `fetchEntities(type, true)` con `force = true`, quindi bypassa il flag `loaded` e forza una nuova fetch. Non è necessario chiamare `invalidate()` prima di `refresh()`, perché il parametro `force` rende il controllo su `loaded` irrilevante.

`invalidate()` ha senso da solo quando si vuole marcare i dati come stale senza forzare un refresh immediato, ad esempio dopo un'operazione batch quando l'utente non si trova sulla pagina che mostra quei dati. La prossima chiamata a `fetchEntities()` (senza `force`) vedrà `loaded = false` e ricaricherà i dati automaticamente.

## Pattern 3: Persistenza Selettiva

### sessionStorage per i filtri

I filtri di ricerca devono sopravvivere alla navigazione tra pagine, ma azzerarsi alla chiusura del tab. Un requisito semplice, ma la cui implementazione manuale introduce complessità non necessaria.

Prima della migrazione, il codice era sparso nei componenti:

```javascript
// Prima: in ogni componente che usava filtri
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

Ogni componente replicava la stessa logica. Aggiungere un filtro significava toccare sia il template che il codice di persistenza, ricordarsi la chiave giusta, gestire la serializzazione per tipi non-stringa. I bug tipici: una chiave scritta diversamente, un `getItem` dimenticato, un filtro che non si sincronizzava.

Con `pinia-plugin-persistedstate` diventa dichiarativo:

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

### localStorage per le preferenze

Le preferenze utente devono persistere tra sessioni. Stesso pattern, storage diverso:

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

Il punto chiave è `pick`. Controlla esattamente quali campi vengono persistiti. Non tutto in uno store deve finire nello storage: `hasActiveFilters` è un computed, non ha senso persistirlo. Senza `pick`, il plugin serializzerebbe l'intero stato, inclusi campi che dovrebbero essere effimeri o derivati.

## Pattern 4: migrazione per strati, non per big bang

Nella pratica, la migrazione non è avvenuta tutta in una volta. L'approccio adottato è ibrido: Composition API per gli store (più flessibile, closure per lo stato interno), ma Options API nei componenti pagina per minimizzare il refactoring.

La funzione `setup()` fa da ponte:

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

Si tratta di un compromesso pragmatico. Non serve riscrivere ogni componente in `<script setup>` il primo giorno. Gli store nuovi usano Composition API perché ne beneficiano concretamente (closure per stato privato, maggiore flessibilità nella composizione). I componenti esistenti restano in Options API finché non c'è un motivo specifico per toccarli.

Il vantaggio di questo approccio è la possibilità di migrare per strati. Prima si creano gli store Pinia e si collegano ai componenti esistenti tramite `setup()`. Poi, quando si torna su un componente per altre ragioni (un bug, una nuova feature) si approfitta per convertirlo a `<script setup>`. Nel frattempo, il codice funziona. Lo sviluppo non si blocca per una riscrittura completa.

## Conclusioni

- **Pinia direttamente, senza passare per Vuex.** Vuex è in maintenance mode, Pinia è il successore ufficiale.
- **Invalidazione esplicita per dati CRUD.** Il momento del cambiamento è noto (create, update, delete), i TTL servono solo per dati che cambiano in modo imprevedibile.
- **Deduplicazione con promise caching.** Tre componenti che chiedono gli stessi dati generano una sola richiesta.
- **Persistenza dichiarativa con `pinia-plugin-persistedstate`.** Una configurazione nello store sostituisce `getItem`/`setItem` sparsi nei componenti.
- **Migrazione incrementale.** Prima gli store, poi i composable, poi la sintassi dei componenti.

La migrazione da EventBus a Pinia non è solo un cambio di libreria: è il passaggio da un'architettura implicita, dove lo stato vive negli eventi, a una esplicita, dove lo stato ha un posto preciso, ispezionabile e testabile.

## Risorse Utili

* **Documentazione Pinia**: [pinia.vuejs.org](https://pinia.vuejs.org/)
* **pinia-plugin-persistedstate**: [prazdevs.github.io/pinia-plugin-persistedstate](https://prazdevs.github.io/pinia-plugin-persistedstate/) (il repository è migrato su [Codeberg](https://codeberg.org/praz/pinia-plugin-persistedstate))
* **Guida migrazione Vue 3**: [v3-migration.vuejs.org](https://v3-migration.vuejs.org/)
* **Repository demo**: [github.com/monte97/pinia-vue-demo](https://github.com/monte97/pinia-vue-demo)
