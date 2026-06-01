# Blog URL Filter Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sincronizzare i filtri di `/blog` con i query params dell'URL, bidirezionalmente, per rendere i link condivisibili.

**Architecture:** Un singolo `watch` sui filtri non-testo e un `watch` debounced sul testo libero, entrambi in `BlogFilterable.vue`. Lettura iniziale dall'URL in `onMounted`. Scrittura con `history.replaceState` (non `pushState`) per non sporcare la history del browser.

**Tech Stack:** Vue 3 (Composition API), `URLSearchParams`, `history.replaceState`

---

### Task 1: URL sync in BlogFilterable.vue

**Files:**
- Modify: `src/components/blog/BlogFilterable.vue` (sezione `<script setup>`)

- [ ] **Step 1: Aggiungi `watch` agli import Vue**

Nel file `src/components/blog/BlogFilterable.vue`, riga 355, cambia:

```ts
import { computed, ref, onMounted, onUnmounted } from 'vue';
```

in:

```ts
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
```

- [ ] **Step 2: Aggiungi la funzione `syncUrl` dopo i filter actions (dopo riga 472)**

Inserisci dopo la funzione `clearAllFilters` (riga 472), prima del commento `// ── Outside click for dropdown ──`:

```ts
// ── URL sync ──

function syncUrl() {
  const params = new URLSearchParams();
  if (searchQuery.value.trim()) params.set('q', searchQuery.value.trim());
  if (activePillar.value) params.set('pillar', activePillar.value);
  if (activeCategory.value) params.set('category', activeCategory.value);
  for (const tag of activeTags.value) params.append('tag', tag);
  const qs = params.toString();
  history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
}

let searchDebounce: ReturnType<typeof setTimeout> | null = null;

watch(searchQuery, () => {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(syncUrl, 200);
});

watch([activePillar, activeCategory, activeTags], syncUrl, { deep: true });
```

- [ ] **Step 3: Leggi i params dall'URL in `onMounted`**

Nel blocco `onMounted` esistente (riga 482), aggiungi la lettura dei params PRIMA di `document.addEventListener`:

```ts
onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (q) searchQuery.value = q;
  const p = params.get('pillar');
  if (p && (pillars as readonly string[]).includes(p)) {
    activePillar.value = p as typeof activePillar.value;
  }
  const cat = params.get('category');
  if (cat) activeCategory.value = cat;
  const tags = params.getAll('tag');
  if (tags.length) activeTags.value = new Set(tags);

  document.addEventListener('click', onDocumentClick);
});
```

- [ ] **Step 4: Verifica manuale in dev**

```bash
cd /home/monte97/Documents/1_WORK/1_AETE_RIORGANIZZATA/0_Content/website.github.io
make dev
```

Aprire `http://localhost:4321/blog` e verificare:

1. Digita "kubernetes" nella barra di ricerca → dopo ~200ms l'URL diventa `?q=kubernetes`
2. Clicca pillar "Verificare" → URL diventa `?q=kubernetes&pillar=verificare`
3. Seleziona una categoria → URL aggiornato con `&category=...`
4. Clicca un tag → URL aggiornato con `&tag=...`
5. Rimuovi tutti i filtri → URL torna a `/blog` senza `?`
6. Naviga direttamente a `http://localhost:4321/blog?q=kafka&pillar=automatizzare` → la pagina si apre già filtrata

- [ ] **Step 5: Commit**

```bash
git add src/components/blog/BlogFilterable.vue
git commit -m "feat(blog): sincronizza filtri con query params URL"
```
