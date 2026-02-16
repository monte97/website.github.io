---
title: "Da EventBus a Pinia: migrazione progressiva dello stato in Vue 3"
date: 2026-02-14T10:00:00+01:00
description: "Pattern concreti per sostituire EventBus con Pinia in un progetto Vue 3: cache con deduplication, persistenza selettiva, approccio ibrido"
tags: ["Vue", "Pinia", "Nuxt", "TypeScript", "Frontend"]
categories: ["Frontend"]
draft: true
---

## Il punto di partenza

Per quasi tre anni ho mantenuto un'applicazione enterprise costruita con Nuxt 2 e Vuetify 2. Non abbiamo mai introdotto Vuex. Lo stato condiviso tra componenti passava attraverso un EventBus, il classico `new Vue()` usato come emettitore di eventi, e ogni componente che aveva bisogno di dati li recuperava in modo autonomo con chiamate API proprie. Nessuna cache, nessuno stato centralizzato.

Il sistema funzionava, nei limiti del termine. Debugging difficile, chiamate duplicate ovunque, memory leak silenziosi quando qualcuno dimenticava un `$off`. Ma funzionava.

Col tempo, i limiti si sono fatti sentire. Il caso piu' frequente: un componente emetteva un evento, ma il listener non era ancora montato. L'evento andava perso. Oppure il contrario: un listener restava attivo dopo la distruzione del componente, e reagiva a eventi destinati ad altri. Non c'era modo di ispezionare lo stato corrente dell'applicazione in un dato momento, solo un flusso di eventi senza storia.

Quando e' arrivato il momento di migrare a Vue 3, il problema si e' posto in modo netto: `new Vue()` non esiste piu', e con esso l'EventBus. Avevo due strade: introdurre una libreria di eventi esterna (mitt, tiny-emitter) e mantenere lo stesso pattern, oppure ripensare la gestione dello stato. Ho scelto la seconda, saltando Vuex del tutto e andando direttamente su Pinia.

In questo articolo descrivo i pattern che ho adottato durante la migrazione, con esempi concreti. Ho preparato anche un [repository demo](https://github.com/monte97/pinia-vue-demo) che contiene un'applicazione minimale con tutti i pattern descritti qui, applicati a un dominio inventario/prodotti.

## Perche' Pinia e non Vuex

La scelta e' stata semplice. Vuex e' in maintenance mode: riceve fix di sicurezza, ma nessuna nuova funzionalita'. Pinia e' il suo successore ufficiale, raccomandato dalla documentazione di Vue.

I vantaggi concreti che mi hanno convinto:

- **Meno boilerplate.** Niente mutations, niente distinzione tra `commit` e `dispatch`. Lo stato si modifica direttamente nelle actions.
- **TypeScript di prima classe.** L'inferenza dei tipi funziona senza configurazione aggiuntiva, sia con Options API che con Composition API.
- **Doppio paradigma.** E' possibile definire store in Options API (state/getters/actions) o in Composition API (ref/computed/function), in base alla complessita' dello store.
- **Ecosistema plugin.** `pinia-plugin-persistedstate` da solo giustifica la migrazione per come semplifica la persistenza selettiva.

In una migrazione a Vue 3, non ha senso passare per Vuex. Pinia e' la scelta diretta.

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

I problemi erano tre. Primo: nessuna single source of truth. Il titolo viveva nel layout, ma qualsiasi componente poteva emetterlo, e non c'era modo di sapere qual era il valore corrente senza andare a leggere l'ultimo evento emesso. Secondo: debugging opaco. I DevTools non mostravano nulla di utile, perche' gli eventi erano fire-and-forget. Terzo: memory leak. Ogni `$on` senza un corrispondente `$off` nel `beforeDestroy` era una sottoscrizione che restava attiva, accumulando listener orfani.

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

Lo stato e' visibile nei DevTools, modificabile da qualsiasi componente, e sempre coerente. Nessun listener da pulire, nessun rischio di leak.

Per evitare di ripetere `appStore.setTitle(...)` in ogni pagina, ho estratto un composable:

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

Una nota sulla scelta stilistica: per store semplici e piatti come questo, Options API e' sufficiente. La Composition API non aggiunge valore quando lo stato e' un insieme di campi con qualche action diretta.

## Pattern 2: Cache Store con Request Deduplication

### Ogni componente per se'

Nella vecchia applicazione, ogni componente che aveva bisogno di "prodotti" o "categorie" faceva la propria chiamata API. Ogni pagina aveva il suo `mounted()` con un `api.getAll()`, senza sapere se un'altra pagina avesse gia' recuperato gli stessi dati cinque secondi prima.

Il risultato era prevedibile. Tre pagine che mostrano prodotti generano tre `GET /products` identiche. Una pagina con tabella che mostra sia prodotti che categorie produce due chiamate simultanee per prodotti se due componenti diversi le lanciano nello stesso ciclo. In un'applicazione con una decina di entita' e diverse pagine, le chiamate duplicate si moltiplicano. Lento, dispendioso, e con il rischio di stato inconsistente tra componenti che mostrano gli stessi dati recuperati in momenti diversi.

### Cache centralizzata con deduplicazione

Uno store centralizzato con tre caratteristiche:

1. **Cache-once**: i dati vengono recuperati una volta, poi serviti dalla memoria.
2. **Request deduplication**: se una fetch e' gia' in corso, i nuovi chiamanti si agganciano alla stessa promise.
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
  const products = ref<Product[]>([])
  const categories = ref<Category[]>([])
  const suppliers = ref<Supplier[]>([])

  const entityRefs: Record<InventoryEntityType, typeof products> = {
    products, categories, suppliers
  }

  const apiFns: Record<InventoryEntityType, () => Promise<any[]>> = {
    products: api.fetchProducts,
    categories: api.fetchCategories,
    suppliers: api.fetchSuppliers
  }

  // Non reattivo di proposito: e' bookkeeping interno
  const loaded: Record<InventoryEntityType, boolean> = {
    products: false, categories: false, suppliers: false
  }

  // Questo E' reattivo: i componenti devono mostrare lo stato di caricamento
  const loading = ref<Record<InventoryEntityType, boolean>>({
    products: false, categories: false, suppliers: false
  })

  // Il trucco della deduplicazione: cache di promise pendenti
  const pendingRequests: Partial<Record<InventoryEntityType, Promise<any[]>>> = {}

  async function fetchEntities(
    type: InventoryEntityType,
    force = false
  ): Promise<any[]> {
    // 1. Restituisci i dati in cache se disponibili
    if (loaded[type] && !force) return entityRefs[type].value

    // 2. Deduplicazione: restituisci la promise esistente se ce n'e' una in volo
    if (pendingRequests[type]) return pendingRequests[type]!

    // 3. Nuova fetch
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

  // Aggregati derivati: calcolati dai dati in cache
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

### Perche' Composition API qui

La scelta non e' estetica. `loaded` e `pendingRequests` sono intenzionalmente **non reattivi**. Sono stato interno dello store, bookkeeping che non deve triggerare re-render nei componenti. Le closure della Composition API permettono di tenerli incapsulati: esistono nello scope della funzione, sono accessibili dalle actions, ma non sono esposti ne' reattivi.

Con Options API, tutto finisce in `state`, `getters` o `actions`. Non c'e' un posto naturale per stato interno non reattivo. Si potrebbe usare una variabile esterna al `defineStore`, ma e' meno pulito e perde l'incapsulamento.

### Invalidazione dopo CRUD

```typescript
async function deleteProduct(id: string) {
  await api.deleteProduct(id)
  inventoryStore.invalidate('products')
  await inventoryStore.refresh('products')
}
```

Il flusso e' esplicito: il momento dell'invalidazione e' noto, perche' coincide con ogni operazione che modifica i dati. Non c'e' magia, non ci sono TTL che scadono nel momento sbagliato. Dopo una delete, si invalida. Dopo una create, si invalida. Il prossimo componente che accede allo store ottiene dati freschi.

Un dettaglio importante: `invalidate()` non lancia una nuova fetch. Si limita a resettare il flag `loaded`. E' `refresh()` (o la prossima chiamata a `fetchEntities`) che effettua la richiesta. Questa separazione e' intenzionale: in alcuni casi ha senso invalidare la cache senza forzare un refresh immediato, ad esempio quando l'utente non si trova sulla pagina che mostra quei dati.

## Pattern 3: Persistenza Selettiva

### sessionStorage per i filtri

I filtri di ricerca devono sopravvivere alla navigazione tra pagine, ma azzerarsi alla chiusura del tab. Un requisito semplice, ma la cui implementazione manuale introduce complessita' non necessaria.

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

Il punto chiave e' `pick`. Controlla esattamente quali campi vengono persistiti. Non tutto in uno store deve finire nello storage: `hasActiveFilters` e' un computed, non ha senso persistirlo. Senza `pick`, il plugin serializzerebbe l'intero stato, inclusi campi che dovrebbero essere effimeri o derivati.

## Pattern 4: migrazione per strati, non per big bang

Nella pratica, la migrazione non e' avvenuta tutta in una volta. Ho adottato un approccio ibrido: Composition API per gli store (piu' flessibile, closure per lo stato interno), ma Options API nei componenti pagina per minimizzare il refactoring.

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

Si tratta di un compromesso pragmatico. Non serve riscrivere ogni componente in `<script setup>` il primo giorno. Gli store nuovi usano Composition API perche' ne beneficiano concretamente (closure per stato privato, maggiore flessibilita' nella composizione). I componenti esistenti restano in Options API finche' non c'e' un motivo specifico per toccarli.

Il vantaggio di questo approccio e' la possibilita' di migrare per strati. Prima si creano gli store Pinia e si collegano ai componenti esistenti tramite `setup()`. Poi, quando si torna su un componente per altre ragioni (un bug, una nuova feature) si approfitta per convertirlo a `<script setup>`. Nel frattempo, il codice funziona. Lo sviluppo non si blocca per una riscrittura completa.

## Lezioni apprese

Dopo aver completato la migrazione, queste sono le conclusioni che porto con me:

- **Saltare Vuex ha funzionato.** Pinia e' piu' semplice, piu' allineato con Vue 3, e non c'e' motivo per passare da un'architettura senza state management a Vuex nel 2026. La scelta diretta e' Pinia.

- **Invalidazione esplicita batte scadenza temporale.** Per dati CRUD, il momento del cambiamento e' noto: dopo create, update, delete. L'invalidazione avviene in quel momento preciso. I TTL con scadenza temporale hanno senso per dati che cambiano in modo imprevedibile, non per quelli che l'applicazione stessa modifica.

- **`pendingRequests` e' un pattern sottovalutato.** La deduplicazione delle richieste previene race condition e spreco di banda. Quando tre componenti chiedono gli stessi dati nello stesso secondo, una sola richiesta parte. Semplice da implementare, impatto significativo.

- **La persistenza dichiarativa elimina bug di sincronizzazione.** Niente piu' `getItem` dimenticati, niente serializzazione manuale, niente chiavi di storage duplicate. La configurazione avviene una volta nello store.

- **Migrazione incrementale.** Prima gli store, poi i composable, poi la sintassi dei componenti. Non tutto insieme. L'approccio ibrido Options API (componenti) + Composition API (store) permette di procedere senza riscrivere l'intera applicazione.

## Risorse Utili

* **Documentazione Pinia**: [pinia.vuejs.org](https://pinia.vuejs.org/)
* **pinia-plugin-persistedstate**: [prazdevs.github.io/pinia-plugin-persistedstate](https://prazdevs.github.io/pinia-plugin-persistedstate/)
* **Guida migrazione Vue 3**: [v3-migration.vuejs.org](https://v3-migration.vuejs.org/)
* **Repository demo**: [github.com/monte97/pinia-vue-demo](https://github.com/monte97/pinia-vue-demo)
