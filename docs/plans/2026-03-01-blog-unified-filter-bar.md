# Blog Unified Filter Bar — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the three overlapping blog filter levels (server-side pillar tabs, desktop-only sidebar, inline tag clicks) with a single client-side unified filter bar.

**Architecture:** A rewritten `BlogFilterable.vue` absorbs pillar toggle pills, a category dropdown, active-filter chips, and the post grid into one Vue island. `BlogListPage.astro` is simplified to pass all posts without pillar pre-filtering. The 6 server-side pillar route files are deleted.

**Tech Stack:** Astro 5, Vue 3 (client island), Tailwind CSS v4, shared data from `src/data/pillar-styles.ts` and `src/data/pillars.ts`

---

### Task 1: Rewrite BlogFilterable.vue — filter bar + pillar pills

Replace the current sidebar-based filtering with the unified filter bar.

**Files:**
- Modify: `src/components/blog/BlogFilterable.vue` (full rewrite)

**Context:**
- The component receives `posts: PostData[]` and `lang: 'it' | 'en'` as props from Astro
- `PostData` has: `id, title, description, date (ISO string), pillar, category, tags, series?, href, heroImage?, readingTime`
- Imports: `pillarStyles` from `@/data/pillar-styles`, `pillarLabels` from `@/data/pillars`, `categoryLabels` from `@/data/blog-labels`
- Pillar hex colors: progettare `#5B7FA5`, verificare `#6B9B78`, automatizzare `#9B7FB5`

**Step 1: Rewrite the template**

Replace the entire `<template>` with:

```vue
<template>
  <div>
    <!-- Unified filter bar -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <!-- Pillar pills -->
      <button
        v-for="p in pillarOptions"
        :key="p.key"
        @click="togglePillar(p.key)"
        class="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer"
        :class="activePillar === p.key
          ? pillarActiveClasses[p.key] || 'bg-accent/15 text-accent border-2 border-accent/30'
          : p.key
            ? `text-text-muted border-2 border-transparent hover:bg-pillar-${p.key}/5`
            : 'text-text-muted border-2 border-transparent hover:bg-text-muted/10'"
      >
        {{ p.label }}
        <span class="text-xs opacity-60 ml-1">{{ p.count }}</span>
      </button>

      <!-- Category dropdown -->
      <div class="relative ml-auto" ref="dropdownRef">
        <button
          @click="dropdownOpen = !dropdownOpen"
          class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors cursor-pointer"
          :class="activeCategory
            ? 'border-accent/30 bg-accent/5 text-accent font-medium'
            : 'border-border dark:border-border-dark text-text-muted hover:border-accent/30'"
        >
          {{ activeCategory ? (categoryLabels[activeCategory] || activeCategory) : (lang === 'en' ? 'Topic' : 'Argomento') }}
          <svg class="w-3.5 h-3.5 transition-transform" :class="{ 'rotate-180': dropdownOpen }" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
          </svg>
        </button>
        <Transition name="dropdown">
          <div
            v-if="dropdownOpen"
            class="absolute right-0 top-full mt-1 w-56 rounded-lg border border-border dark:border-border-dark bg-white dark:bg-surface-dark shadow-lg z-20 py-1 max-h-64 overflow-y-auto"
          >
            <button
              v-for="cat in visibleCategories"
              :key="cat.name"
              @click="selectCategory(cat.name)"
              class="w-full flex items-center justify-between px-3 py-1.5 text-sm transition-colors cursor-pointer"
              :class="activeCategory === cat.name
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
          </div>
        </Transition>
      </div>
    </div>

    <!-- Active filter chips -->
    <div v-if="hasAnyFilter" class="flex flex-wrap items-center gap-2 mb-6">
      <span class="text-xs text-text-muted">{{ lang === 'en' ? 'Filters:' : 'Filtri:' }}</span>
      <button
        v-if="activePillar"
        @click="activePillar = null"
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-colors cursor-pointer"
      >
        {{ pillarLabel(activePillar) }}
        <svg class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
      </button>
      <button
        v-if="activeCategory"
        @click="activeCategory = null"
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-colors cursor-pointer"
      >
        {{ categoryLabels[activeCategory] || activeCategory }}
        <svg class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
      </button>
      <button
        v-for="tag in activeTags"
        :key="tag"
        @click="toggleTag(tag)"
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-colors cursor-pointer"
      >
        {{ tag }}
        <svg class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
      </button>
      <button
        @click="clearAllFilters"
        class="text-xs text-text-muted hover:text-accent transition-colors cursor-pointer ml-1"
      >
        {{ lang === 'en' ? 'Clear all' : 'Rimuovi tutti' }}
      </button>
    </div>

    <!-- Post grid -->
    <Transition name="grid-fade" mode="out-in">
      <div :key="filterKey">
        <!-- Featured post (only when no filters active) -->
        <a v-if="featuredPost" :href="featuredPost.href" class="group block mb-6">
          <div class="rounded-xl border border-border/50 dark:border-border-dark/50 bg-white dark:bg-surface-dark overflow-hidden transition-shadow hover:shadow-md">
            <div class="p-6">
              <div class="flex items-center gap-2 mb-3">
                <time class="text-xs text-text-muted tabular-nums" :datetime="featuredPost.date">
                  {{ formatDate(featuredPost.date) }}
                </time>
                <span
                  v-if="featuredPost.pillar"
                  :class="['inline-flex items-center px-2 py-0.5 rounded text-xs font-medium tracking-wide', pillarBadgeClasses[featuredPost.pillar]]"
                >
                  {{ pillarLabel(featuredPost.pillar) }}
                </span>
                <span v-if="featuredPost.readingTime" class="text-xs text-text-muted">
                  {{ featuredPost.readingTime }} min
                </span>
              </div>
              <h3 class="text-xl font-bold mb-2 text-text-dark dark:text-text-light group-hover:text-accent transition-colors leading-snug">
                {{ featuredPost.title }}
              </h3>
              <p class="text-text-muted text-sm leading-relaxed">
                {{ featuredPost.description }}
              </p>
            </div>
          </div>
        </a>

        <!-- Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <a v-for="post in gridPosts" :key="post.id" :href="post.href" class="group block h-full">
            <div :class="[
              'bg-white dark:bg-surface-dark rounded-xl border border-border/70 dark:border-border-dark/70',
              'hover:border-border dark:hover:border-border-dark hover:shadow-md transition-all duration-300',
              'h-full flex flex-col',
              post.pillar ? 'border-l-[3px]' : '',
              post.pillar ? pillarBorderClasses[post.pillar] : '',
              'p-6',
            ]">
              <div class="flex items-center gap-2 mb-3">
                <time class="text-xs text-text-muted tabular-nums" :datetime="post.date">
                  {{ formatDate(post.date) }}
                </time>
                <span
                  v-if="post.pillar"
                  :class="['inline-flex items-center px-2 py-0.5 rounded text-xs font-medium tracking-wide', pillarBadgeClasses[post.pillar]]"
                >
                  {{ pillarLabel(post.pillar) }}
                </span>
                <span v-if="post.readingTime" class="text-xs text-text-muted">
                  {{ post.readingTime }} min
                </span>
              </div>
              <h3 class="text-base font-semibold mb-1.5 text-text-dark dark:text-text-light group-hover:text-accent transition-colors leading-snug">
                {{ post.title }}
              </h3>
              <p class="text-text-muted text-sm line-clamp-2 leading-relaxed">
                {{ post.description }}
              </p>
              <div v-if="post.tags && post.tags.length > 0" class="flex flex-wrap gap-1.5 mt-auto pt-3">
                <button
                  v-for="tag in post.tags.slice(0, 3)"
                  :key="tag"
                  @click.prevent.stop="toggleTag(tag)"
                  class="text-[11px] px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                  :class="isTagActive(tag)
                    ? 'bg-accent/15 text-accent'
                    : 'text-text-muted/80 bg-text-muted/8 hover:bg-text-muted/15'"
                >
                  {{ tag }}
                </button>
              </div>
            </div>
          </a>
        </div>

        <!-- Empty state -->
        <div v-if="filteredPosts.length === 0" class="text-center py-12">
          <p class="text-text-muted mb-4">
            {{ lang === 'en' ? 'No articles for this filter.' : 'Nessun articolo per questo filtro.' }}
          </p>
          <button
            @click="clearAllFilters"
            class="px-4 py-2 rounded-lg border border-border dark:border-border-dark text-sm font-medium hover:border-accent transition-colors cursor-pointer"
          >
            {{ lang === 'en' ? 'Clear filter' : 'Rimuovi filtro' }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
```

**Step 2: Rewrite the script**

Replace the entire `<script setup>` with:

```vue
<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { pillarStyles } from '@/data/pillar-styles';
import { pillarLabels } from '@/data/pillars';
import { categoryLabels } from '@/data/blog-labels';

export interface PostData {
  id: string;
  title: string;
  description: string;
  date: string;
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

// ── Pillar style maps ──

const pillarBorderClasses = Object.fromEntries(
  Object.entries(pillarStyles).map(([k, v]) => [k, v.borderLeft])
);
const pillarBadgeClasses = Object.fromEntries(
  Object.entries(pillarStyles).map(([k, v]) => [k, v.badge])
);
const pillarActiveClasses = Object.fromEntries(
  Object.entries(pillarStyles).map(([k, v]) => [k, v.tabActive])
);
const pillarDotClasses = Object.fromEntries(
  Object.entries(pillarStyles).map(([k, v]) => [k, v.bg])
);

function pillarLabel(pillar: string): string {
  const labels = pillarLabels[pillar as keyof typeof pillarLabels];
  return labels?.[props.lang] ?? pillar;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(
    props.lang === 'it' ? 'it-IT' : 'en-US',
    { year: 'numeric', month: 'short', day: 'numeric' }
  );
}

// ── Filter state ──

const activePillar = ref<string | null>(null);
const activeCategory = ref<string | null>(null);
const activeTags = ref<Set<string>>(new Set());
const dropdownOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

function togglePillar(key: string | null) {
  if (key === activePillar.value || key === null) {
    activePillar.value = null;
  } else {
    activePillar.value = key;
  }
  // Reset category when switching pillar (it may not exist in new pillar)
  activeCategory.value = null;
}

function selectCategory(name: string) {
  activeCategory.value = activeCategory.value === name ? null : name;
  dropdownOpen.value = false;
}

function toggleTag(tag: string) {
  const newSet = new Set(activeTags.value);
  if (newSet.has(tag)) newSet.delete(tag);
  else newSet.add(tag);
  activeTags.value = newSet;
}

function isTagActive(tag: string): boolean {
  return activeTags.value.has(tag);
}

function clearAllFilters() {
  activePillar.value = null;
  activeCategory.value = null;
  activeTags.value = new Set();
}

const hasAnyFilter = computed(() =>
  activePillar.value !== null || activeCategory.value !== null || activeTags.value.size > 0
);

const filterKey = computed(() =>
  `${activePillar.value}:${activeCategory.value}:${[...activeTags.value].sort().join(',')}`
);

// ── Close dropdown on outside click ──

function handleClickOutside(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    dropdownOpen.value = false;
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside));
onUnmounted(() => document.removeEventListener('click', handleClickOutside));

// ── Pillar options (with counts) ──

const pillarOptions = computed(() => {
  const allLabel = props.lang === 'en' ? 'All' : 'Tutti';
  const counts: Record<string, number> = {};
  for (const p of props.posts) {
    if (p.pillar) counts[p.pillar] = (counts[p.pillar] || 0) + 1;
  }
  return [
    { key: null as string | null, label: allLabel, count: props.posts.length },
    { key: 'progettare', label: pillarLabel('progettare'), count: counts['progettare'] || 0 },
    { key: 'verificare', label: pillarLabel('verificare'), count: counts['verificare'] || 0 },
    { key: 'automatizzare', label: pillarLabel('automatizzare'), count: counts['automatizzare'] || 0 },
  ];
});

// ── Category list (filtered by active pillar) ──

const visibleCategories = computed(() => {
  const source = activePillar.value
    ? props.posts.filter(p => p.pillar === activePillar.value)
    : props.posts;
  const map = new Map<string, { count: number; pillar: string | null }>();
  for (const post of source) {
    const existing = map.get(post.category);
    if (existing) existing.count++;
    else map.set(post.category, { count: 1, pillar: post.pillar });
  }
  return [...map.entries()]
    .map(([name, { count, pillar }]) => ({ name, count, pillar }))
    .sort((a, b) => b.count - a.count);
});

// ── Filtered posts ──

const filteredPosts = computed(() => {
  let result = props.posts;
  if (activePillar.value) {
    result = result.filter(p => p.pillar === activePillar.value);
  }
  if (activeCategory.value) {
    result = result.filter(p => p.category === activeCategory.value);
  }
  if (activeTags.value.size > 0) {
    const tags = activeTags.value;
    result = result.filter(p => p.tags.some(t => tags.has(t)));
  }
  return result;
});

const featuredPost = computed(() => {
  if (hasAnyFilter.value) return null;
  return filteredPosts.value[0] ?? null;
});

const gridPosts = computed(() => {
  if (hasAnyFilter.value) return filteredPosts.value;
  return filteredPosts.value.slice(1);
});
</script>
```

**Step 3: Update the styles**

Replace the entire `<style>` block with:

```vue
<style scoped>
.grid-fade-enter-active,
.grid-fade-leave-active {
  transition: opacity 0.15s ease;
}
.grid-fade-enter-from,
.grid-fade-leave-to {
  opacity: 0;
}
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
```

**Step 4: Verify build**

Run: `npx astro build 2>&1 | tail -5`
Expected: `Complete!` with no errors

**Step 5: Commit**

```bash
git add src/components/blog/BlogFilterable.vue
git commit -m "feat: rewrite BlogFilterable with unified filter bar"
```

---

### Task 2: Simplify BlogListPage.astro

Remove server-side pillar tabs and pass all posts to the Vue component.

**Files:**
- Modify: `src/components/blog/BlogListPage.astro`

**Step 1: Rewrite BlogListPage.astro**

Replace the entire file with:

```astro
---
import PageLayout from '@/layouts/PageLayout.astro';
import PageHero from '@/components/ui/PageHero.astro';
import BlogFilterable from '@/components/blog/BlogFilterable.vue';
import { postHref, estimateReadingTime, getHeroImage } from '@/utils/blog';

interface Props {
  allPosts: any[];
  title: string;
  description: string;
  lang?: 'it' | 'en';
}

const { allPosts, title, description, lang = 'it' } = Astro.props;

const totalCount = allPosts.length;

const t = lang === 'en'
  ? { articles: 'articles' }
  : { articles: 'articoli' };

// Hero image resolution via import.meta.glob (must stay here — Vite statically analyzes globs)
const heroImages = import.meta.glob<{ default: { src: string } }>('/src/content/posts/**/hero.webp', { eager: true });

// Serialize all posts for the Vue component (no pillar pre-filtering)
const serializedPosts = allPosts
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
    heroImage: getHeroImage(post.id, heroImages) || undefined,
    readingTime: estimateReadingTime(post.body),
  }));
---

<PageLayout title={title} description={description} lang={lang}>
  <PageHero
    title={title}
    subtitle={`${description}. ${totalCount} ${t.articles}.`}
  />

  <div class="fade-in-section">
    <BlogFilterable client:load posts={serializedPosts} lang={lang} />
  </div>
</PageLayout>
```

**Step 2: Verify build**

Run: `npx astro build 2>&1 | tail -5`
Expected: `Complete!` with no errors

**Step 3: Commit**

```bash
git add src/components/blog/BlogListPage.astro
git commit -m "refactor: simplify BlogListPage, remove server-side pillar tabs"
```

---

### Task 3: Simplify blog page routes

Update `/blog/[...page].astro` (IT and EN) to use the simplified BlogListPage props. Remove `activePillar`, `page`, and `currentPath` props since filtering is now fully client-side.

**Files:**
- Modify: `src/pages/blog/[...page].astro`
- Modify: `src/pages/en/blog/[...page].astro`

**Step 1: Rewrite `src/pages/blog/[...page].astro`**

```astro
---
import { getCollection } from 'astro:content';
import BlogListPage from '@/components/blog/BlogListPage.astro';

const allPosts = (await getCollection('posts'))
  .filter(p => p.data.lang === 'it' && !p.data.draft);
---

<BlogListPage
  allPosts={allPosts}
  title="Blog"
  description="Quello che imparo, lo scrivo"
/>
```

Note: `getStaticPaths` and pagination are removed — all filtering is now client-side.

**Step 2: Rewrite `src/pages/en/blog/[...page].astro`**

```astro
---
import { getCollection } from 'astro:content';
import BlogListPage from '@/components/blog/BlogListPage.astro';

const allPosts = (await getCollection('posts'))
  .filter(p => p.data.lang === 'en' && !p.data.draft);
---

<BlogListPage
  allPosts={allPosts}
  title="Blog"
  description="What I learn, I write down"
  lang="en"
/>
```

**Step 3: Rename the files**

Since these no longer use `getStaticPaths`/pagination, rename from `[...page].astro` to `index.astro`:

```bash
mv src/pages/blog/\[...page\].astro src/pages/blog/index.astro
mv src/pages/en/blog/\[...page\].astro src/pages/en/blog/index.astro
```

**Step 4: Verify build**

Run: `npx astro build 2>&1 | tail -5`
Expected: `Complete!`

**Step 5: Commit**

```bash
git add src/pages/blog/index.astro src/pages/en/blog/index.astro
git add -u src/pages/blog/\[...page\].astro src/pages/en/blog/\[...page\].astro
git commit -m "refactor: simplify blog page routes, remove pagination"
```

---

### Task 4: Delete server-side pillar routes

Remove the 6 pillar route files that are no longer needed.

**Files:**
- Delete: `src/pages/blog/progettare/[...page].astro`
- Delete: `src/pages/blog/verificare/[...page].astro`
- Delete: `src/pages/blog/automatizzare/[...page].astro`
- Delete: `src/pages/en/blog/progettare/[...page].astro`
- Delete: `src/pages/en/blog/verificare/[...page].astro`
- Delete: `src/pages/en/blog/automatizzare/[...page].astro`

**Step 1: Delete the files**

```bash
rm -rf src/pages/blog/progettare/ src/pages/blog/verificare/ src/pages/blog/automatizzare/
rm -rf src/pages/en/blog/progettare/ src/pages/en/blog/verificare/ src/pages/en/blog/automatizzare/
```

**Step 2: Verify no remaining references**

```bash
grep -r '/blog/progettare\|/blog/verificare\|/blog/automatizzare' src/ --include='*.astro' --include='*.vue' --include='*.ts'
```

Expected: no output (no references remain)

**Step 3: Verify build**

Run: `npx astro build 2>&1 | tail -5`
Expected: `Complete!`

**Step 4: Commit**

```bash
git add -u
git commit -m "chore: delete server-side pillar route files"
```

---

### Task 5: Clean up unused code

Remove now-unused imports, props, and the Pagefind inline search that was part of BlogListPage.

**Files:**
- Modify: `src/data/blog-labels.ts` — remove `seriesLabels` export (no longer used)
- Modify: `src/components/blog/BlogFilterable.vue` — remove `seriesLabels` import if still present

**Step 1: Check if seriesLabels is used anywhere**

```bash
grep -r 'seriesLabels' src/ --include='*.astro' --include='*.vue' --include='*.ts'
```

If only `blog-labels.ts` defines it and no file imports it, remove it.

**Step 2: Remove seriesLabels from blog-labels.ts**

Edit `src/data/blog-labels.ts` to remove the `seriesLabels` export.

**Step 3: Verify build**

Run: `npx astro build 2>&1 | tail -5`
Expected: `Complete!`

**Step 4: Commit**

```bash
git add src/data/blog-labels.ts
git commit -m "chore: remove unused seriesLabels"
```

---

### Task 6: Visual verification

Manually test the new filter bar in the browser.

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Test checklist**

Open `http://localhost:4321/blog/` and verify:

- [ ] Pillar pills render: Tutti, Progettare, Verificare, Automatizzare with counts
- [ ] Click "Verificare" → grid filters to verificare posts only, pill highlights
- [ ] Click "Verificare" again → resets to "Tutti"
- [ ] Category dropdown opens, shows categories with counts
- [ ] When pillar active, dropdown shows only relevant categories
- [ ] Click a category → grid filters, chip appears
- [ ] Click tag on a card → tag chip appears, grid filters by tag
- [ ] All three filters combine correctly (AND pillar, AND category, OR tags)
- [ ] "Rimuovi tutti" clears all filters
- [ ] Individual chip dismiss works
- [ ] Empty state shows when no posts match
- [ ] Featured post (first post, full width) only shows when no filters active
- [ ] Cards have equal height in the grid
- [ ] Mobile: pillar pills scroll horizontally, dropdown works

**Step 3: Test English version**

Open `http://localhost:4321/en/blog/` and verify same behavior with English labels.

**Step 4: Verify old pillar URLs no longer exist**

Navigate to `http://localhost:4321/blog/progettare/` — should 404.
