---
title: "3 pattern (+1 anti-pattern) per eliminare la duplicazione in Vue 3"
date: 2026-02-18T10:00:00+01:00
description: "Composable, wrapper con slot e utility function: tre pattern Vue 3 per eliminare la duplicazione nelle SPA enterprise, più un anti-pattern su quando fermarsi"
menu:
  sidebar:
    name: Vue 3 DRY Patterns
    identifier: vue3-dry-patterns
    weight: 30
    parent: WEBDEV
tags: ["Vue", "Nuxt", "Vuetify", "Composables", "Frontend"]
categories: ["Frontend"]
draft: true
reviewed: false
---

Quante volte ti sei ritrovato a correggere lo stesso bug in dodici file diversi, perché quella funzione di salvataggio era stata copiata ovunque?

Nelle SPA di grandi dimensioni con Vue 3 è comune trovarsi con decine di pagine che sono variazioni dello stesso tema: stessa struttura, stesso boilerplate, stesse cinque righe di setup. Si parte con copia-incolla, poi un bug nel flusso di salvataggio va corretto in dodici posti.

Questo articolo presenta tre pattern Vue 3 per eliminare la duplicazione, ciascuno con un caso d'uso specifico, più un anti-pattern su quando fermarsi. Gli esempi usano Nuxt 3 e Vuetify 3. Nel repository demo [pinia-vue-demo](https://github.com/monte97/pinia-vue-demo) si trova tutto il codice eseguibile.

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

### Un composable per il setup comune

La soluzione è un composable che restituisce tutte le dipendenze condivise:

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

Router, store, id dalla route, funzione per tornare indietro: tutto disponibile. Se domani si aggiunge un nuovo store o un nuovo servizio condiviso, la modifica avviene in un punto solo.

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

Quando 3 o più componenti condividono le stesse dipendenze di setup. Con solo due componenti, il copia-incolla è ancora accettabile: l'overhead cognitivo del composable non si ripaga.

---

## Pattern 2: Wrapper component con slot

### Il template ripetuto è il vero problema

Le pagine di dettaglio non condividono solo il setup. Condividono anche il template. Tutte hanno:

- **Bottone "Torna alla lista"**
- **Card** con titolo e icona
- **Tab** Info ed Export
- **Form** dentro la tab Info con bottone Salva
- **Snackbar** per le notifiche

Prima del refactoring, ogni pagina conteneva questo template completo:

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

Cinquanta righe di struttura identica ripetute in ogni pagina. Le uniche differenze reali: l'icona, i campi del form, e talvolta una tab aggiuntiva.

### Slot per le parti variabili

Un wrapper component con tre slot strategici risolve il problema:

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

`#info-fields` per i campi del form, `#extra-tabs` per tab aggiuntive, `#extra-tab-items` per il contenuto di quelle tab. Il blocco `<script setup lang="ts">` (omesso per brevità) definisce le props `title`, `icon`, `saving`, gli emit `back`, `save`, `export`, i ref interni `tab`, `snackbar`, `snackbarColor`, `snackbarText`, e espone `showSuccess`/`showError` via `defineExpose` per permettere alle pagine figlie di attivare le notifiche.

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

Venticinque righe totali, template e script. La pagina esprime solo ciò che la rende unica: i tre campi del form. Navigazione, tab, salvataggio, notifiche sono gestiti dal wrapper.

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

Il pattern scala bene. Se domani cambia il layout di tutte le pagine di dettaglio - un breadcrumb, un sidebar - la modifica avviene in un file solo.

### Quando usarlo

Quando la struttura HTML è identica e il contenuto varia. Se servono più di 3-4 slot, il wrapper sta facendo troppo: probabilmente le pagine non sono così simili come sembrano.

---

## Pattern 3: Utility function estratta

### Logica pura copiata ovunque

Diverse pagine hanno bisogno di esportare dati in JSON. Il codice è sempre lo stesso:

```javascript
function downloadDocument(data, filename) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}
```

Otto righe copiate in ogni componente con una funzione di export. Nessuno stato reattivo, nessuna dipendenza da Vue: pura logica di manipolazione DOM.

### Estrazione in un modulo helper

```typescript
// helpers/fileDownload.ts
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}

export function downloadJson(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  downloadBlob(blob, filename)
}
```

Nella pagina:

```typescript
import { downloadJson } from '~/helpers/fileDownload'

// nel handler:
downloadJson(product.value, `product-${code.value}.json`)
```

La separazione tra `downloadBlob` e `downloadJson` permette di aggiungere varianti (CSV, Excel) componendo sulla funzione base.

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

Il problema emerge con le eccezioni. I prodotti hanno filtri per categoria e fornitore. I magazzini no. I fornitori hanno una struttura dati annidata (indirizzo come sotto-oggetto). I prodotti hanno un prezzo che va formattato con il simbolo dell'euro. I magazzini hanno una colonna "capacità" con una progress bar personalizzata. I fornitori hanno un dialog di conferma cancellazione con campi aggiuntivi.

Ogni eccezione diventa una prop. Ogni prop diventa un `if` dentro il componente generico. Dopo tre mesi il risultato è un componente da 120 righe con 15 prop, 4 slot, e una logica condizionale che nessuno riesce a seguire. Modificare il comportamento di una singola entità richiede di capire come la modifica interagisce con tutte le altre.

Il componente generico non semplifica: sposta la complessità dalla duplicazione alla configurazione. E la configurazione è più difficile da debuggare del codice duplicato, perché il flusso non è lineare.

### L'alternativa: duplicazione consapevole

Tre pagine di lista da 40-50 righe ciascuna, dove il flusso è leggibile dall'inizio alla fine senza saltare tra file. Il Pattern 1 (composable) gestisce il setup condiviso e il Pattern 3 (utility) le funzioni pure. Ogni pagina gestisce la propria tabella, il proprio dialog, i propri filtri.

Come dice Sandi Metz: *"Duplication is far cheaper than the wrong abstraction."*

Il segnale è semplice: se la configurazione del componente generico richiede più righe del codice che sostituisce, la direzione è sbagliata.

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

Abbiamo visto come affrontare la duplicazione in Vue 3 con tre strumenti complementari:

1. **Composable** per il setup condiviso: estrae dipendenze e logica reattiva comune in una funzione riutilizzabile (`composables/`)
2. **Wrapper component con slot** per la struttura HTML ripetuta: incapsula il layout condiviso e lascia alle pagine figlie solo i contenuti specifici
3. **Utility function** per la logica pura: isola funzioni senza stato in moduli testabili (`helpers/`)
4. **Anti-pattern da evitare**: il componente generico iper-configurabile che sposta la complessità dalla duplicazione alla configurazione

La regola pratica resta una sola: se la configurazione dell'astrazione richiede più righe del codice che sostituisce, la direzione è sbagliata. Si può sempre estrarre dopo - disfare un'astrazione sbagliata è molto più costoso.

## Risorse Utili

* **Repository demo**: [github.com/monte97/pinia-vue-demo](https://github.com/monte97/pinia-vue-demo)
* **Documentazione Vue 3 Composables**: [vuejs.org/guide/reusability/composables](https://vuejs.org/guide/reusability/composables.html)
* **Sandi Metz - The Wrong Abstraction**: [sandimetz.com/blog/2016/1/20/the-wrong-abstraction](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction)
