---
title: "3 Patterns (+1 Anti-Pattern) for Eliminating Duplication in Vue 3"
date: 2026-02-18T09:00:00.000Z
description: Three Vue 3 patterns for eliminating duplication in enterprise SPAs, plus an anti-pattern on knowing when to stop
pillar: progettare
category: web-development
tags:
  - Vue
  - Nuxt
  - Vuetify
  - Composables
  - Frontend
lang: en
reviewed: machine
series: web-development
seriesOrder: 30
---

In large Vue 3 SPAs, it is common to end up with dozens of pages that are variations on the same theme: same structure, same boilerplate, same five lines of setup. It starts with copy-paste, and then a bug in the save flow needs to be fixed in twelve places.

Three patterns address this problem, each for a different type of duplication. A fourth case shows when it is better to stop. Examples use Nuxt 3 and Vuetify 3. The full runnable code is in the [pinia-vue-demo](https://github.com/monte97/pinia-vue-demo) repository.

---

## Pattern 1: Composable for Shared Setup

### Seven Lines That Add Nothing

A typical detail page — products, for example — starts like this:

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

These seven identical lines appear on the warehouses, suppliers, and categories pages. They add nothing to understanding the specific page: they are the entry cost for using shared infrastructure.

### One Line Instead of Seven

The solution is a [composable](https://vuejs.org/guide/reusability/composables.html) that returns all shared dependencies:

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

In the detail page, a single line is enough:

```javascript
const { appStore, mockApi, code, goBack } = useEntityDetail('products')
```

Router, store, ID from the route, back navigation function: all available. When a new store or shared service needs to be added, the change happens in one place.

Related utilities can be exported from the same module. For example, `loadFieldOptions` loads select options from an endpoint:

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

On the products page:

```javascript
categories.value = await loadFieldOptions(mockApi.categories.getAll, 'name')
```

### When to Use It

When multiple components share the same setup dependencies.

---

## Pattern 2: Wrapper Component with Slots

### The Repeated Template Is the Real Problem

Detail pages do not just share setup. They share structure too. All of them have:

- A **back to list** button
- A **card** with title and icon
- **Info and Export tabs**
- A **form** inside the Info tab with a Save button
- A **snackbar** for notifications

Without this pattern, every page would contain this full template:

```vue
<template>
  <v-container>
    <v-btn variant="text" prepend-icon="mdi-arrow-left" class="mb-4"
           @click="goBack">
      Back to list
    </v-btn>

    <v-card>
      <v-card-title>
        <v-icon icon="mdi-package-variant" class="mr-2" />
        {{ product?.name || 'Product' }}
      </v-card-title>

      <v-tabs v-model="tab">
        <v-tab value="info">Info</v-tab>
        <v-tab value="export">Export</v-tab>
      </v-tabs>

      <v-window v-model="tab">
        <v-window-item value="info">
          <v-card-text>
            <!-- Form fields specific to this entity -->
            <v-btn color="primary" class="mt-4"
                   :loading="saving" @click="handleSave">
              Save
            </v-btn>
          </v-card-text>
        </v-window-item>

        <v-window-item value="export">
          <v-card-text>
            <v-btn prepend-icon="mdi-download" variant="outlined"
                   @click="handleExport">
              Export JSON
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

About fifty lines of identical structure repeated on every page, differentiated only by icons, fields, and the occasional tab.

### The Component Becomes a Tag

The idea is to create a [component](https://vuejs.org/guide/essentials/component-basics.html) that encapsulates the entire common structure — navigation, card, tabs, snackbar — and makes it reusable like any Vue element. Each detail page uses it like a native tag, declaring only what makes it unique through three strategic [slots](https://vuejs.org/guide/components/slots.html):

```vue
<!-- components/EntityDetailPage.vue -->
<template>
  <v-container>
    <v-btn variant="text" prepend-icon="mdi-arrow-left" class="mb-4"
           @click="$emit('back')">
      Back to list
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
              Save
            </v-btn>
          </v-card-text>
        </v-window-item>

        <slot name="extra-tab-items" />

        <v-window-item value="export">
          <v-card-text>
            <v-btn prepend-icon="mdi-download" variant="outlined"
                   @click="$emit('export')">
              Export JSON
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

The component exposes three slots — three "holes" that each page fills with its own content:

- **`#info-fields`** — the entity-specific form fields
- **`#extra-tabs`** — additional tabs beyond Info and Export
- **`#extra-tab-items`** — the content of those extra tabs

The `<script setup lang="ts">` block (omitted for brevity) manages the rest:

- **Props** (`title`, `icon`, `saving`) to configure the title, icon, and loading state
- **Emits** (`back`, `save`, `export`) to delegate actions to the parent page
- **Internal state** (`tab`, `snackbar`, `snackbarColor`, `snackbarText`) for the active tab and notifications
- **Exposed methods** via [`defineExpose`](https://vuejs.org/api/sfc-script-setup.html#defineexpose) (`showSuccess`, `showError`) so child pages can trigger notifications

The result: a simple page like warehouses becomes:

```vue
<template>
  <EntityDetailPage
    ref="page"
    :title="warehouse.name || 'Warehouse'"
    icon="mdi-warehouse"
    :saving="saving"
    @back="goBack"
    @save="handleSave"
    @export="handleExport"
  >
    <template #info-fields>
      <v-text-field v-model="warehouse.name" label="Name"
                    variant="outlined" density="compact" />
      <v-text-field v-model="warehouse.city" label="City"
                    variant="outlined" density="compact" />
      <v-text-field v-model="warehouse.address" label="Address"
                    variant="outlined" density="compact" />
    </template>
  </EntityDetailPage>
</template>
```

Twenty-five lines total, template and script. The Info and Export tabs are already defined in the wrapper: the page does not declare them because they are always present. The only thing the page expresses is what makes it unique: the three form fields. Navigation, tabs, saving, and notifications are handled by the wrapper.

A more complex page like products, with an additional "Stock History" tab, still stays under fifty lines:

```vue
<template>
  <EntityDetailPage
    ref="page"
    :title="product?.name || 'Product'"
    icon="mdi-package-variant"
    :saving="saving"
    @back="goBack"
    @save="handleSave"
    @export="handleExport"
  >
    <template #info-fields>
      <v-text-field v-model="product.name" label="Name"
                    variant="outlined" density="compact" />
      <v-select v-model="product.category" :items="categories"
                label="Category" variant="outlined" density="compact" />
      <v-text-field v-model.number="product.quantity" label="Quantity"
                    type="number" variant="outlined" density="compact" />
      <v-text-field v-model.number="product.price" label="Price"
                    type="number" prefix="$" variant="outlined" density="compact" />
    </template>

    <template #extra-tabs>
      <v-tab value="stock">Stock History</v-tab>
    </template>

    <template #extra-tab-items>
      <v-window-item value="stock">
        <v-card-text>
          <p class="text-medium-emphasis">Stock movement history</p>
        </v-card-text>
      </v-window-item>
    </template>
  </EntityDetailPage>
</template>
```

The maintenance advantage: adding a common element to all pages — a breadcrumb, a banner — requires a change in a single file. The limitation is that the wrapper works as long as pages remain genuinely similar: as differences grow, you risk falling into the anti-pattern described later.

### When to Use It

When HTML structure is identical and only content varies. If more than 3-4 slots are needed, the wrapper is doing too much: the pages are probably not as similar as they appear.

---

## Pattern 3: Extracted Utility Function

### Pure Logic Copied Everywhere

List pages — products, warehouses, suppliers — all need to filter and sort table data. The code that appears in every component is always a variation of this:

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

Fifteen lines copied with small variations: field names change, filter conditions differ, but the structure is identical. No reactive state, no Vue dependencies: pure array logic.

### Declare What to Filter, Not How

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

On the products page:

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

Each page declares only *which* filters to apply and on *which* fields. The comparison logic, sorting, and empty-value handling are centralized. If tomorrow a numeric range filter is needed, a `match: 'range'` is added in one place.

### When to Use It

For pure logic, no state. If access to `ref`, `reactive`, `onMounted`, or any Vue API is needed, it is not a utility function — it is a composable. The distinction matters: utilities go in `helpers/`, composables in `composables/`. Anyone reading the code knows immediately what to expect.

---

## Anti-Pattern: Premature Abstraction

### The Configuration That Exceeds the Code

Three list pages: products, warehouses, suppliers. All have a table, a dialog for adding, a delete button. The structure is similar. The instinct is to create a generic component:

```vue
<GenericCrudPage
  :entity-key="'products'"
  :api="productApi"
  :columns="[
    { title: 'Name', key: 'name' },
    { title: 'Category', key: 'category' },
    { title: 'Quantity', key: 'quantity' },
    { title: 'Price', key: 'price' },
  ]"
  :default-item="{ name: '', category: '', quantity: 0, price: 0 }"
  :map-for-save="(item) => ({ ...item, price: parseFloat(item.price) })"
  :has-nested-data="false"
  :confirmation-fields="['name']"
  :filters="['category', 'supplier']"
  :show-fab="true"
>
  <template #dialog-content="{ item, update }">
    <v-text-field v-model="item.name" label="Name" />
    <v-select v-model="item.category" :items="categories" label="Category" />
    <v-text-field v-model.number="item.quantity" label="Quantity" type="number" />
    <v-text-field v-model.number="item.price" label="Price" type="number" />
  </template>
  <template #extra-actions="{ item }">
    <v-btn icon="mdi-eye" @click="goToDetail(item.id)" />
  </template>
  <template #custom-filters>
    <v-slider v-model="minQty" label="Minimum quantity" />
  </template>
</GenericCrudPage>
```

The problem emerges with exceptions. Each entity has its own peculiarities:

- **Products**: filters for category and supplier, price formatted with a currency symbol
- **Warehouses**: no filters, but a "capacity" column with a custom progress bar
- **Suppliers**: nested data structure (address as a sub-object), delete confirmation dialog with additional fields

Each exception becomes a prop. Each prop becomes an `if` inside the generic component. Three months later the result is a 120-line component with 15 props, 4 slots, and conditional logic nobody can follow.

The generic component does not simplify: it moves complexity from duplication to configuration. And configuration is harder to debug because the flow is no longer linear.

### The Alternative: Deliberate Duplication

Three list pages of 40-50 lines each, where the flow is readable from start to finish without jumping between files. Pattern 1 (composable) handles shared setup and Pattern 3 (utility) handles pure functions. Each page manages its own table, its own dialog, its own filters.

This is the principle that Sandi Metz summarizes in [The Wrong Abstraction](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction): *"Duplication is far cheaper than the wrong abstraction."* A good signal for recognizing the wrong abstraction: if the generic component's configuration requires more lines than the code it replaces, the direction is wrong.

---

## Decision Tree

```text
Does the duplicated logic need Vue reactivity?
|
+-- No --> Utility function (helpers/)
|
+-- Yes --> Is it just shared setup / dependencies?
    |
    +-- Yes --> Composable (composables/)
    |
    +-- No --> Is it repeated HTML structure?
        |
        +-- Yes --> Wrapper component with slots
        |
        +-- No --> Is the duplication acceptable?
            |
            +-- Yes --> Keep the files separate
            |
            +-- No --> Rethink the design
```

The `helpers/` directory contains pure functions, testable in isolation. The `composables/` directory contains functions that use Vue APIs (`ref`, `computed`, lifecycle hooks, router). Component wrappers encapsulate shared HTML structure and offer slots for variants.

---

## Conclusion

This article covered three complementary tools for duplication in Vue 3:

1. **Composable** for shared setup: extracts common dependencies and reactive logic into a reusable function (`composables/`)
2. **Wrapper component with slots** for repeated HTML structure: encapsulates shared layout and leaves child pages with only their specific content
3. **Utility function** for pure logic: isolates stateless functions in testable modules (`helpers/`)
4. **Anti-pattern to avoid**: the hyper-configurable generic component that moves complexity from duplication to configuration

You can always extract later. Undoing a wrong abstraction is far more expensive.

## Useful Resources

* **Demo repository**: [github.com/monte97/pinia-vue-demo](https://github.com/monte97/pinia-vue-demo)
* **Vue 3 Composables Documentation**: [vuejs.org/guide/reusability/composables](https://vuejs.org/guide/reusability/composables.html)
* **Sandi Metz - The Wrong Abstraction**: [sandimetz.com/blog/2016/1/20/the-wrong-abstraction](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction)
