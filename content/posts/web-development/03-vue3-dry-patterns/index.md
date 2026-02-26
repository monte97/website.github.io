---
title: "3 pattern (+1 anti-pattern) per eliminare la duplicazione in Vue 3"
date: 2026-02-18T10:00:00+01:00
description: "Tre pattern Vue 3 per eliminare la duplicazione nelle SPA enterprise, più un anti-pattern su quando fermarsi"
menu:
  sidebar:
    name: Vue 3 DRY Patterns
    identifier: vue3-dry-patterns
    weight: 30
    parent: WEBDEV
tags: ["Vue", "Nuxt", "Vuetify", "Composables", "Frontend"]
categories: ["Frontend"]
reviewed: human
pillar: "System Design"
---

Nelle SPA di grandi dimensioni con Vue 3 è comune trovarsi con decine di pagine che sono variazioni dello stesso tema: stessa struttura, stesso boilerplate, stesse cinque righe di setup. Si parte con copia-incolla, poi un bug nel flusso di salvataggio va corretto in dodici posti.

Tre pattern aiutano a gestire il problema, ciascuno per un tipo di duplicazione diverso. Un quarto caso mostra quando è meglio fermarsi. Gli esempi usano Nuxt 3 e Vuetify 3. Nel repository demo [pinia-vue-demo](https://github.com/monte97/pinia-vue-demo) si trova tutto il codice eseguibile.

---

## Pattern 1: Composable per setup condiviso

### Sette righe che non aggiungono nulla

Una tipica pagina di dettaglio - prodotti, per esempio - inizia così:

```javascript
const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const inventoryStore = useInventoryStore()
import { mockApi } from '~/helpers/mockApi'

const code = computed(() => route.params.id)

function goBack() {
  router.push('/products')
}
```

Sette righe identiche compaiono nella pagina magazzini, fornitori, categorie. Non aggiungono nulla alla comprensione della pagina specifica: sono il costo di ingresso per usare l'infrastruttura condivisa.

### Una riga al posto di sette

La soluzione è un [composable](https://vuejs.org/guide/reusability/composables.html) che restituisce tutte le dipendenze condivise:

```typescript
// composables/useEntityDetail.ts
import { useAppStore } from '~/stores/app'
import { useInventoryStore } from '~/stores/inventory'
import { mockApi } from '~/helpers/mockApi'

export function useEntityDetail(entityType: string) {
  const route = useRoute()
  const router = useRouter()
  const appStore = useAppStore()
  const inventoryStore = useInventoryStore()

  const code = computed(() => route.params.id as string)

  function goBack() {
    router.push(`/${entityType}`)
  }

  return {
    route, router, appStore, inventoryStore,
    mockApi, code, goBack
  }
}
```

Nella pagina di dettaglio basta una riga:

```javascript
const { appStore, mockApi, code, goBack } = useEntityDetail('products')
```

Router, store, id dalla route, funzione per tornare indietro: tutto disponibile. Nel momento in cui si aggiunge un nuovo store o un nuovo servizio condiviso, la modifica avviene in un punto solo.

Dallo stesso modulo è possibile esportare utilità correlate. Per esempio, `loadFieldOptions` carica le opzioni di una select da un endpoint:

```typescript
export async function loadFieldOptions(
  fetchFn: () => Promise<Array<Record<string, any>>>,
  fieldName: string
): Promise<string[]> {
  try {
    const items = await fetchFn()
    return [...new Set(items.map(item => item[fieldName]).filter(Boolean))]
  } catch {
    return []
  }
}
```

Nella pagina prodotti:

```javascript
categories.value = await loadFieldOptions(mockApi.categories.getAll, 'name')
```

### Quando usarlo

Quando più componenti condividono le stesse dipendenze di setup.

---

## Pattern 2: Wrapper component con slot

### Il template ripetuto è il vero problema

Le pagine di dettaglio non condividono solo il setup. Condividono anche il template. Tutte hanno:

- **Bottone "Torna alla lista"**
- **Card** con titolo e icona
- **Tab** Info ed Export
- **Form** dentro la tab Info con bottone Salva
- **Snackbar** per le notifiche

Senza questo pattern, ogni pagina conterrebbe questo template completo:

```vue
<template>
  <v-container>
    <v-btn variant="text" prepend-icon="mdi-arrow-left" class="mb-4"
           @click="goBack">
      Torna alla lista
    </v-btn>

    <v-card>
      <v-card-title>
        <v-icon icon="mdi-package-variant" class="mr-2" />
        {{ product?.name || 'Prodotto' }}
      </v-card-title>

      <v-tabs v-model="tab">
        <v-tab value="info">Info</v-tab>
        <v-tab value="export">Export</v-tab>
      </v-tabs>

      <v-window v-model="tab">
        <v-window-item value="info">
          <v-card-text>
            <!-- Campi specifici del form -->
            <v-btn color="primary" class="mt-4"
                   :loading="saving" @click="handleSave">
              Salva
            </v-btn>
          </v-card-text>
        </v-window-item>

        <v-window-item value="export">
          <v-card-text>
            <v-btn prepend-icon="mdi-download" variant="outlined"
                   @click="handleExport">
              Esporta JSON
            </v-btn>
          </v-card-text>
        </v-window-item>
      </v-window>
    </v-card>

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>
```

Circa cinquanta righe di struttura identica ripetuta in ogni pagina, differenziate solo per icone, campi e qualche tab.

### Il componente diventa un tag

L'idea è creare un [componente](https://vuejs.org/guide/essentials/component-basics.html) che incapsula tutta la struttura comune - navigazione, card, tab, snackbar - e lo rende riutilizzabile come un qualsiasi elemento Vue. Ogni pagina di dettaglio lo usa come se fosse un tag nativo, limitandosi a dichiarare le parti che la rendono unica tramite tre [slot](https://vuejs.org/guide/components/slots.html) strategici:

```vue
<!-- components/EntityDetailPage.vue -->
<template>
  <v-container>
    <v-btn variant="text" prepend-icon="mdi-arrow-left" class="mb-4"
           @click="$emit('back')">
      Torna alla lista
    </v-btn>

    <v-card>
      <v-card-title>
        <v-icon :icon="icon" class="mr-2" />
        {{ title }}
      </v-card-title>

      <v-tabs v-model="tab">
        <v-tab value="info">Info</v-tab>
        <slot name="extra-tabs" />
        <v-tab value="export">Export</v-tab>
      </v-tabs>

      <v-window v-model="tab">
        <v-window-item value="info">
          <v-card-text>
            <slot name="info-fields" />
            <v-btn color="primary" class="mt-4"
                   :loading="saving" @click="$emit('save')">
              Salva
            </v-btn>
          </v-card-text>
        </v-window-item>

        <slot name="extra-tab-items" />

        <v-window-item value="export">
          <v-card-text>
            <v-btn prepend-icon="mdi-download" variant="outlined"
                   @click="$emit('export')">
              Esporta JSON
            </v-btn>
          </v-card-text>
        </v-window-item>
      </v-window>
    </v-card>

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>
```

Il componente espone tre slot, ovvero tre "buchi" che ogni pagina riempie con il proprio contenuto:

- **`#info-fields`** - i campi del form specifici dell'entità
- **`#extra-tabs`** - tab aggiuntive oltre a Info ed Export
- **`#extra-tab-items`** - il contenuto di quelle tab aggiuntive

Il blocco `<script setup lang="ts">` (omesso per brevità) gestisce il resto:

- **Props** (`title`, `icon`, `saving`) per configurare titolo, icona e stato di caricamento
- **Emit** (`back`, `save`, `export`) per delegare le azioni alla pagina padre
- **Stato interno** (`tab`, `snackbar`, `snackbarColor`, `snackbarText`) per tab attiva e notifiche
- **Metodi esposti** via [`defineExpose`](https://vuejs.org/api/sfc-script-setup.html#defineexpose) (`showSuccess`, `showError`) per permettere alle pagine figlie di attivare le notifiche

Il risultato: una pagina semplice come i magazzini diventa:

```vue
<template>
  <EntityDetailPage
    ref="page"
    :title="warehouse.name || 'Magazzino'"
    icon="mdi-warehouse"
    :saving="saving"
    @back="goBack"
    @save="handleSave"
    @export="handleExport"
  >
    <template #info-fields>
      <v-text-field v-model="warehouse.name" label="Nome"
                    variant="outlined" density="compact" />
      <v-text-field v-model="warehouse.city" label="Città"
                    variant="outlined" density="compact" />
      <v-text-field v-model="warehouse.address" label="Indirizzo"
                    variant="outlined" density="compact" />
    </template>
  </EntityDetailPage>
</template>
```

Venticinque righe totali, template e script. I tab "Info" ed "Export" sono già definiti nel wrapper: la pagina non li dichiara perché sono sempre presenti. L'unica cosa che la pagina esprime è ciò che la rende unica: i tre campi del form. Navigazione, tab, salvataggio, notifiche sono gestiti dal wrapper.

Una pagina più complessa come i prodotti, con una tab aggiuntiva "Storico Giacenza", resta comunque sotto le cinquanta righe:

```vue
<template>
  <EntityDetailPage
    ref="page"
    :title="product?.name || 'Prodotto'"
    icon="mdi-package-variant"
    :saving="saving"
    @back="goBack"
    @save="handleSave"
    @export="handleExport"
  >
    <template #info-fields>
      <v-text-field v-model="product.name" label="Nome"
                    variant="outlined" density="compact" />
      <v-select v-model="product.category" :items="categories"
                label="Categoria" variant="outlined" density="compact" />
      <v-text-field v-model.number="product.quantity" label="Quantità"
                    type="number" variant="outlined" density="compact" />
      <v-text-field v-model.number="product.price" label="Prezzo"
                    type="number" prefix="€" variant="outlined" density="compact" />
    </template>

    <template #extra-tabs>
      <v-tab value="stock">Storico Giacenza</v-tab>
    </template>

    <template #extra-tab-items>
      <v-window-item value="stock">
        <v-card-text>
          <p class="text-medium-emphasis">Storico movimenti giacenza</p>
        </v-card-text>
      </v-window-item>
    </template>
  </EntityDetailPage>
</template>
```

Il vantaggio è nella manutenzione: aggiungere un elemento comune a tutte le pagine - un breadcrumb, un banner - richiede una modifica in un file solo. Il limite è che il wrapper funziona finché le pagine restano davvero simili: se le differenze crescono, si rischia di ricadere nell'anti-pattern descritto più avanti.

### Quando usarlo

Quando la struttura HTML è identica e il contenuto varia. Se servono più di 3-4 slot, il wrapper sta facendo troppo: probabilmente le pagine non sono così simili come sembrano.

---

## Pattern 3: Utility function estratta

### Logica pura copiata ovunque

Le pagine di lista - prodotti, magazzini, fornitori - hanno tutte bisogno di filtrare e ordinare i dati di una tabella. Il codice che compare in ogni componente è sempre una variazione di questo:

```javascript
const filtered = items.filter(item => {
  if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
    return false
  }
  if (categoryFilter && item.category !== categoryFilter) {
    return false
  }
  return true
})

const sorted = [...filtered].sort((a, b) => {
  const val = a[sortKey] > b[sortKey] ? 1 : -1
  return sortOrder === 'asc' ? val : -val
})
```

Quindici righe copiate con piccole variazioni: cambiano i nomi dei campi, le condizioni di filtro, ma la struttura è identica. Nessuno stato reattivo, nessuna dipendenza da Vue: pura logica su array.

### Dichiarare cosa filtrare, non come

```typescript
// helpers/tableUtils.ts
export interface FilterConfig<T> {
  field: keyof T
  value: string | number | undefined
  match?: 'exact' | 'contains'
}

export function filterItems<T extends Record<string, any>>(
  items: T[],
  filters: FilterConfig<T>[]
): T[] {
  return items.filter(item =>
    filters.every(({ field, value, match = 'exact' }) => {
      if (!value) return true
      const itemValue = item[field]
      if (match === 'contains') {
        return String(itemValue).toLowerCase().includes(String(value).toLowerCase())
      }
      return itemValue === value
    })
  )
}

export function sortItems<T>(
  items: T[],
  key: keyof T,
  order: 'asc' | 'desc' = 'asc'
): T[] {
  return [...items].sort((a, b) => {
    const val = a[key] > b[key] ? 1 : -1
    return order === 'asc' ? val : -val
  })
}
```

Nella pagina prodotti:

```typescript
import { filterItems, sortItems } from '~/helpers/tableUtils'

const visibleProducts = computed(() => {
  const filtered = filterItems(products.value, [
    { field: 'name', value: searchQuery.value, match: 'contains' },
    { field: 'category', value: categoryFilter.value },
  ])
  return sortItems(filtered, sortKey.value, sortOrder.value)
})
```

Ogni pagina dichiara solo *quali* filtri applicare e su *quali* campi. La logica di confronto, ordinamento e gestione dei valori vuoti è centralizzata. Se domani serve un filtro per range numerico, si aggiunge un `match: 'range'` in un punto solo.

### Quando usarlo

Per logica pura, senza stato. Se serve accesso a `ref`, `reactive`, `onMounted` o qualsiasi API Vue, non è una utility function: è un composable. La distinzione è importante: le utility vanno in `helpers/`, i composable in `composables/`. Chi legge il codice sa subito cosa aspettarsi.

---

## Anti-pattern: L'astrazione prematura

### La configurazione che supera il codice

Tre pagine di lista: prodotti, magazzini, fornitori. Tutte hanno una tabella, un dialog per aggiungere, un bottone per cancellare. La struttura è simile. L'istinto è creare un componente generico:

```vue
<GenericCrudPage
  :entity-key="'products'"
  :api="productApi"
  :columns="[
    { title: 'Nome', key: 'name' },
    { title: 'Categoria', key: 'category' },
    { title: 'Quantità', key: 'quantity' },
    { title: 'Prezzo', key: 'price' },
  ]"
  :default-item="{ name: '', category: '', quantity: 0, price: 0 }"
  :map-for-save="(item) => ({ ...item, price: parseFloat(item.price) })"
  :has-nested-data="false"
  :confirmation-fields="['name']"
  :filters="['category', 'supplier']"
  :show-fab="true"
>
  <template #dialog-content="{ item, update }">
    <v-text-field v-model="item.name" label="Nome" />
    <v-select v-model="item.category" :items="categories" label="Categoria" />
    <v-text-field v-model.number="item.quantity" label="Quantità" type="number" />
    <v-text-field v-model.number="item.price" label="Prezzo" type="number" />
  </template>
  <template #extra-actions="{ item }">
    <v-btn icon="mdi-eye" @click="goToDetail(item.id)" />
  </template>
  <template #custom-filters>
    <v-slider v-model="minQty" label="Quantita minima" />
  </template>
</GenericCrudPage>
```

Il problema emerge con le eccezioni. Ogni entità ha le sue particolarità:

- **Prodotti**: filtri per categoria e fornitore, prezzo formattato con il simbolo dell'euro
- **Magazzini**: nessun filtro, ma una colonna "capacità" con progress bar personalizzata
- **Fornitori**: struttura dati annidata (indirizzo come sotto-oggetto), dialog di conferma cancellazione con campi aggiuntivi

Ogni eccezione diventa una prop. Ogni prop diventa un `if` dentro il componente generico. Dopo tre mesi il risultato è un componente da 120 righe con 15 prop, 4 slot, e una logica condizionale che nessuno riesce a seguire.

Il componente generico non semplifica: sposta la complessità dalla duplicazione alla configurazione. E la configurazione è più difficile da debuggare, perché il flusso non è più lineare.

### L'alternativa: duplicazione consapevole

Tre pagine di lista da 40-50 righe ciascuna, dove il flusso è leggibile dall'inizio alla fine senza saltare tra file. Il Pattern 1 (composable) gestisce il setup condiviso e il Pattern 3 (utility) le funzioni pure. Ogni pagina gestisce la propria tabella, il proprio dialog, i propri filtri.

È il principio che Sandi Metz riassume in [The Wrong Abstraction](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction): *"Duplication is far cheaper than the wrong abstraction."* Un buon segnale per riconoscere l'astrazione sbagliata: se la configurazione del componente generico richiede più righe del codice che sostituisce, la direzione è sbagliata.

---

## Albero decisionale

```text
La logica duplicata ha bisogno di reattività Vue?
|
+-- No --> Utility function (helpers/)
|
+-- Sì --> è solo setup / dipendenze condivise?
    |
    +-- Sì --> Composable (composables/)
    |
    +-- No --> è struttura HTML ripetuta?
        |
        +-- Sì --> Wrapper component con slot
        |
        +-- No --> La duplicazione è accettabile?
            |
            +-- Sì --> Tieni i file separati
            |
            +-- No --> Ripensa il design
```

La directory `helpers/` contiene funzioni pure, testabili in isolamento. La directory `composables/` contiene funzioni che usano le API Vue (`ref`, `computed`, lifecycle hooks, router). I `components/` wrapper racchiudono struttura HTML condivisa e offrono slot per le varianti.

---

## Conclusione

L'articolo ha coperto tre strumenti complementari per la duplicazione in Vue 3:

1. **Composable** per il setup condiviso: estrae dipendenze e logica reattiva comune in una funzione riutilizzabile (`composables/`)
2. **Wrapper component con slot** per la struttura HTML ripetuta: incapsula il layout condiviso e lascia alle pagine figlie solo i contenuti specifici
3. **Utility function** per la logica pura: isola funzioni senza stato in moduli testabili (`helpers/`)
4. **Anti-pattern da evitare**: il componente generico iper-configurabile che sposta la complessità dalla duplicazione alla configurazione

Si può sempre estrarre dopo. Disfare un'astrazione sbagliata è molto più costoso.

## Risorse Utili

* **Repository demo**: [github.com/monte97/pinia-vue-demo](https://github.com/monte97/pinia-vue-demo)
* **Documentazione Vue 3 Composables**: [vuejs.org/guide/reusability/composables](https://vuejs.org/guide/reusability/composables.html)
* **Sandi Metz - The Wrong Abstraction**: [sandimetz.com/blog/2016/1/20/the-wrong-abstraction](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction)
