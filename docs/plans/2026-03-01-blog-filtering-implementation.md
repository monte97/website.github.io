# Blog Client-Side Filtering — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the static blog sidebar and post grid with an interactive Vue island that filters posts client-side by category, series, or tag.

**Architecture:** A single `BlogFilterable.vue` component receives all posts as JSON props from `BlogListPage.astro` and manages filter state reactively. The Astro page continues to handle pillar tabs, search, and layout. Pagination is removed in favor of showing all posts (filtered or not).

**Tech Stack:** Vue 3 (Composition API, `<script setup>`), Astro Vue integration (`client:load`), Tailwind CSS v4.

---

### Task 1: Create BlogFilterable.vue — Skeleton with Props

**Files:**
- Create: `src/components/blog/BlogFilterable.vue`

**Step 1: Create the Vue component with props and basic rendering**

```vue
<template>
  <div class="flex flex-col lg:flex-row gap-10">
    <!-- Main content -->
    <div class="flex-1 min-w-0">
      <!-- Post grid placeholder -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div v-for="post in posts" :key="post.id" class="p-4 border rounded">
          {{ post.title }}
        </div>
      </div>
    </div>

    <!-- Sidebar placeholder -->
    <aside class="hidden lg:block lg:w-56 shrink-0">
      <div class="lg:sticky lg:top-20 space-y-8">
        <p class="text-xs text-text-muted">Sidebar</p>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
export interface PostData {
  id: string;
  title: string;
  description: string;
  date: string;       // ISO string (serialized from Astro)
  pillar: 'progettare' | 'verificare' | 'automatizzare' | null;
  category: string;
  tags: string[];
  series?: string;
  href: string;
  heroImage?: string;
  readingTime: number;
}

const props = defineProps<{
  posts: PostData[];
  lang: 'it' | 'en';
}>();
</script>
```

**Step 2: Wire it into BlogListPage.astro**

Modify `src/components/blog/BlogListPage.astro`:

1. Import the Vue component:
   ```ts
   import BlogFilterable from '@/components/blog/BlogFilterable.vue';
   ```

2. Serialize posts for the Vue component. Add this after `const featuredDate` (line ~87):
   ```ts
   const serializedPosts = (activePillar
     ? allPosts.filter(p => p.data.pillar === activePillar)
     : allPosts
   )
     .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
     .map(post => ({
       id: post.id,
       title: post.data.title,
       description: post.data.description,
       date: post.data.date.toISOString(),
       pillar: post.data.pillar,
       category: post.data.category,
       tags: post.data.tags,
       series: post.data.series,
       href: postHref(post.id, lang),
       heroImage: getHeroImage(post.id) || undefined,
       readingTime: estimateReadingTime(post),
     }));
   ```

3. Replace everything from `<!-- Featured first post -->` (line ~127) through `<!-- Sidebar -->` and the `<BlogSidebar>` tag (line ~204) with:
   ```astro
   <BlogFilterable client:load posts={serializedPosts} lang={lang} />
   ```

4. Remove the pagination block (lines ~176-200) — it's now inside the Vue component or gone.

5. Remove the `BlogSidebar` and `PostCard` imports (lines 6, 5) since they're no longer used.

**Step 3: Run dev server and verify the skeleton renders**

Run: `cd /home/monte97/Documents/1_WORK/1_AETE_RIORGANIZZATA/0_Content/website.github.io && npm run dev`

Navigate to `http://localhost:4321/blog/`. Expect: pillar tabs and search at top (Astro), then a list of post titles in a simple grid (Vue skeleton), sidebar placeholder on the right.

**Step 4: Commit**

```bash
git add src/components/blog/BlogFilterable.vue src/components/blog/BlogListPage.astro
git commit -m "feat(blog): add BlogFilterable Vue skeleton wired into listing page"
```

---

### Task 2: Implement Post Cards inside Vue

**Files:**
- Modify: `src/components/blog/BlogFilterable.vue`

**Step 1: Add the card template matching the existing PostCard.astro design**

Replace the post grid placeholder in the template with the full card implementation. The card must replicate the existing design from `PostCard.astro` and `Card.astro`:

- Card wrapper: `bg-white dark:bg-surface-dark rounded-xl border border-border/70 dark:border-border-dark/70 p-6 hover:border-border dark:hover:border-border-dark hover:shadow-md transition-all duration-300`
- Pillar left border: `border-l-[3px]` with `border-l-pillar-progettare` / `verificare` / `automatizzare`
- Hero image: `w-full h-36 object-cover` with `loading="lazy"`, card becomes `overflow-hidden !p-0` when hero present, content wrapped in `p-6`
- Meta row: date (formatted via `toLocaleDateString`), pillar badge, reading time
- Badge: `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium tracking-wide` with pillar colors `bg-pillar-X/10 text-pillar-X`
- Title: `text-base font-semibold mb-1.5 leading-snug` with hover accent
- Description: `text-sm line-clamp-2 leading-relaxed text-text-muted`
- Tags: first 3, `text-[11px] text-text-muted/80 bg-text-muted/8 px-1.5 py-0.5 rounded` — these will be `<button>` elements (interactive in Task 4)

Also add the featured post card (first post, full width) with the existing design:
- Rounded-xl, border, overflow-hidden
- Hero: `w-full h-48 md:h-56 object-cover`, `loading="eager"`
- Content in `p-6` with meta row, title (`text-xl font-bold leading-snug`), description

Add pillar label helper and date formatting as computed/methods in `<script setup>`:
```ts
const pillarLabels: Record<string, Record<string, string>> = {
  progettare: { it: 'Progettare', en: 'Design' },
  verificare: { it: 'Verificare', en: 'Verify' },
  automatizzare: { it: 'Automatizzare', en: 'Automate' },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(
    props.lang === 'it' ? 'it-IT' : 'en-US',
    { year: 'numeric', month: 'short', day: 'numeric' }
  );
}

function getPillarLabel(pillar: string): string {
  return pillarLabels[pillar]?.[props.lang] ?? pillar;
}
```

**Step 2: Verify cards render correctly**

Run dev server, navigate to `/blog/`. Cards should look identical to the previous Astro-rendered version: hero images, dates, badges, tags, pillar borders.

**Step 3: Commit**

```bash
git add src/components/blog/BlogFilterable.vue
git commit -m "feat(blog): implement post cards in Vue component"
```

---

### Task 3: Implement Sidebar

**Files:**
- Modify: `src/components/blog/BlogFilterable.vue`

**Step 1: Add computed properties for categories and series**

```ts
import { computed, ref } from 'vue';

const categoryLabels: Record<string, string> = {
  kafka: 'Kafka',
  kubernetes: 'Kubernetes',
  'system-design': 'System Design',
  keycloak: 'Keycloak',
  observability: 'Observability',
  devops: 'DevOps',
  docker: 'Docker',
  homelab: 'Homelab',
  testing: 'Testing',
  'web-development': 'Web Dev',
  devcontainer: 'Dev Container',
};

const seriesLabels: Record<string, string> = {
  kafka: 'Apache Kafka',
  keycloak: 'Keycloak',
  'kubernetes-fondamenti': 'Kubernetes Fondamenti',
  'homelab-capi': 'Homelab CAPI',
  linq: 'LINQ Deep Dive',
  observability: 'Observability',
  'performance-engineering': 'Performance Engineering',
  cicd: 'CI/CD',
  'unit-testing': 'Unit Testing',
  playwright: 'Playwright',
  'web-development': 'Web Development',
};

const pillarDotClasses: Record<string, string> = {
  progettare: 'bg-pillar-progettare',
  verificare: 'bg-pillar-verificare',
  automatizzare: 'bg-pillar-automatizzare',
};

const categories = computed(() => {
  const map = new Map<string, { count: number; pillar: string | null }>();
  for (const post of props.posts) {
    const existing = map.get(post.category);
    if (existing) existing.count++;
    else map.set(post.category, { count: 1, pillar: post.pillar });
  }
  return [...map.entries()]
    .map(([name, { count, pillar }]) => ({ name, count, pillar }))
    .sort((a, b) => b.count - a.count);
});

const series = computed(() => {
  const map = new Map<string, number>();
  for (const post of props.posts) {
    if (post.series) map.set(post.series, (map.get(post.series) || 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
});
```

**Step 2: Add sidebar template**

Replace sidebar placeholder with the interactive sidebar. Each item is a `<button>`:

```html
<aside class="hidden lg:block lg:w-56 shrink-0">
  <div class="lg:sticky lg:top-20 space-y-8">
    <!-- Categories -->
    <div>
      <h3 class="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
        {{ lang === 'en' ? 'Topics' : 'Argomenti' }}
      </h3>
      <ul class="space-y-1">
        <li v-for="cat in categories" :key="cat.name">
          <button
            @click="toggleFilter('category', cat.name)"
            class="w-full flex items-center justify-between py-1 px-2 rounded-md text-sm transition-colors cursor-pointer"
            :class="isActive('category', cat.name)
              ? 'bg-accent/10 text-accent font-medium'
              : 'hover:bg-text-muted/10 text-text-dark dark:text-text-light'"
          >
            <span class="flex items-center gap-2">
              <span
                v-if="cat.pillar"
                class="w-1.5 h-1.5 rounded-full"
                :class="pillarDotClasses[cat.pillar]"
              />
              {{ categoryLabels[cat.name] || cat.name }}
            </span>
            <span class="text-xs text-text-muted">{{ cat.count }}</span>
          </button>
        </li>
      </ul>
    </div>

    <!-- Series -->
    <div v-if="series.length > 0">
      <h3 class="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
        {{ lang === 'en' ? 'Series' : 'Serie' }}
      </h3>
      <ul class="space-y-1">
        <li v-for="s in series" :key="s.name">
          <button
            @click="toggleFilter('series', s.name)"
            class="w-full flex items-center justify-between py-1 px-2 rounded-md text-sm transition-colors cursor-pointer"
            :class="isActive('series', s.name)
              ? 'bg-accent/10 text-accent font-medium'
              : 'hover:bg-text-muted/10 text-text-dark dark:text-text-light'"
          >
            {{ seriesLabels[s.name] || s.name }}
            <span class="text-xs text-text-muted">{{ s.count }}</span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</aside>
```

**Step 3: Verify sidebar renders with all categories and series**

Run dev server. Sidebar should show clickable items with hover effects. Clicking should not do anything yet (filter logic in next task).

**Step 4: Commit**

```bash
git add src/components/blog/BlogFilterable.vue
git commit -m "feat(blog): add interactive sidebar with categories and series"
```

---

### Task 4: Implement Filter Logic

**Files:**
- Modify: `src/components/blog/BlogFilterable.vue`

**Step 1: Add filter state and computed filtered posts**

```ts
const activeFilter = ref<{ type: 'category' | 'series' | 'tag'; value: string } | null>(null);

function toggleFilter(type: 'category' | 'series' | 'tag', value: string) {
  if (activeFilter.value?.type === type && activeFilter.value?.value === value) {
    activeFilter.value = null;
  } else {
    activeFilter.value = { type, value };
  }
}

function isActive(type: string, value: string): boolean {
  return activeFilter.value?.type === type && activeFilter.value?.value === value;
}

function clearFilter() {
  activeFilter.value = null;
}

const filteredPosts = computed(() => {
  if (!activeFilter.value) return props.posts;
  const { type, value } = activeFilter.value;
  switch (type) {
    case 'category':
      return props.posts.filter(p => p.category === value);
    case 'series':
      return props.posts.filter(p => p.series === value);
    case 'tag':
      return props.posts.filter(p => p.tags.includes(value));
    default:
      return props.posts;
  }
});

const featuredPost = computed(() => {
  if (activeFilter.value) return null;
  return filteredPosts.value[0] ?? null;
});

const gridPosts = computed(() => {
  if (activeFilter.value) return filteredPosts.value;
  return filteredPosts.value.slice(1);
});
```

**Step 2: Make tags clickable in post cards**

Change tag `<span>` to `<button>` in card template. Use `@click.prevent.stop` to prevent navigation:

```html
<button
  v-for="tag in post.tags.slice(0, 3)"
  :key="tag"
  @click.prevent.stop="toggleFilter('tag', tag)"
  class="text-[11px] px-1.5 py-0.5 rounded transition-colors cursor-pointer"
  :class="isActive('tag', tag)
    ? 'bg-accent/15 text-accent'
    : 'text-text-muted/80 bg-text-muted/8 hover:bg-text-muted/15'"
>
  {{ tag }}
</button>
```

**Step 3: Add active filter chip above sidebar categories**

```html
<!-- Active filter chip -->
<div v-if="activeFilter" class="flex items-center gap-2 mb-4">
  <span class="text-xs text-text-muted">{{ lang === 'en' ? 'Filter:' : 'Filtro:' }}</span>
  <button
    @click="clearFilter"
    class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-colors cursor-pointer"
  >
    {{ filterDisplayLabel }}
    <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
    </svg>
  </button>
</div>
```

Add the label computed:
```ts
const filterDisplayLabel = computed(() => {
  if (!activeFilter.value) return '';
  const { type, value } = activeFilter.value;
  switch (type) {
    case 'category': return categoryLabels[value] || value;
    case 'series': return seriesLabels[value] || value;
    case 'tag': return value;
  }
});
```

**Step 4: Add empty state**

After the grid, add:
```html
<div v-if="filteredPosts.length === 0" class="text-center py-12">
  <p class="text-text-muted mb-4">
    {{ lang === 'en' ? 'No articles for this filter.' : 'Nessun articolo per questo filtro.' }}
  </p>
  <button
    @click="clearFilter"
    class="px-4 py-2 rounded-lg border border-border dark:border-border-dark text-sm font-medium hover:border-accent transition-colors cursor-pointer"
  >
    {{ lang === 'en' ? 'Clear filter' : 'Rimuovi filtro' }}
  </button>
</div>
```

**Step 5: Verify all filter interactions**

Run dev server and test:
1. Click "Kafka" in sidebar -> grid shows only Kafka posts, sidebar highlights Kafka
2. Click "Kafka" again -> filter clears, all posts shown
3. Click a tag on a card -> grid filters by that tag
4. Click filter chip "x" -> filter clears
5. Featured post visible only when no filter active
6. Pillar tabs still work (page navigation)

**Step 6: Commit**

```bash
git add src/components/blog/BlogFilterable.vue
git commit -m "feat(blog): implement client-side filtering by category, series, and tag"
```

---

### Task 5: Add Fade Transition

**Files:**
- Modify: `src/components/blog/BlogFilterable.vue`

**Step 1: Add CSS transition for grid changes**

Wrap the grid and featured post in a `<TransitionGroup>` or simpler: use a reactive key on the grid container so Vue re-renders with a fade.

Simplest approach — use a CSS transition on the grid wrapper:

```html
<div
  class="grid grid-cols-1 md:grid-cols-2 gap-5 transition-opacity duration-200"
  :key="activeFilter?.value ?? 'all'"
>
```

Add scoped CSS:
```css
.grid-enter-active,
.grid-leave-active {
  transition: opacity 0.2s ease;
}
.grid-enter-from,
.grid-leave-to {
  opacity: 0;
}
```

Or even simpler: use Vue's `<Transition>` with `mode="out-in"` wrapping the entire content area and keyed on the filter value.

**Step 2: Verify smooth transitions when filtering**

Click filters and verify the grid fades in/out smoothly.

**Step 3: Commit**

```bash
git add src/components/blog/BlogFilterable.vue
git commit -m "feat(blog): add fade transition on filter change"
```

---

### Task 6: Cleanup and Final Verification

**Files:**
- Modify: `src/components/blog/BlogListPage.astro` — verify no dead imports/code
- No delete: `src/components/blog/PostCard.astro` and `src/components/blog/BlogSidebar.astro` stay (may be used elsewhere)

**Step 1: Verify all blog pages work**

Run dev server and check:
- `/blog/` — main listing with filtering
- `/blog/progettare/` — pillar page with filtering (only progettare posts)
- `/blog/verificare/` — pillar page
- `/blog/automatizzare/` — pillar page
- `/en/blog/` — English version
- Click through to individual posts — links work
- Dark mode toggle — styles correct
- Mobile view — sidebar hidden, tags clickable, layout responsive

**Step 2: Run production build**

```bash
npm run build
```

Expected: no build errors.

**Step 3: Commit any final cleanup**

```bash
git add -A
git commit -m "chore(blog): clean up unused imports after filtering refactor"
```
