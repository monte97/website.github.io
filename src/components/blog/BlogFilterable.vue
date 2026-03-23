<template>
  <div>
    <!-- ═══ Filter Bar ═══ -->
    <div class="mb-6 space-y-3">
      <!-- Row 0: Search input -->
      <div class="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="t('searchPlaceholder')"
          class="w-full pl-9 pr-9 py-2 rounded-lg text-sm border border-border/50 dark:border-border-dark/50 bg-white dark:bg-surface-dark text-text-dark dark:text-text-light placeholder-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
        />
        <button
          v-if="searchQuery"
          @click="clearSearch"
          aria-label="Clear search"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-accent transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>

      <!-- Row 1: Pillar pills + Category dropdown -->
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <!-- Pillar pills -->
        <div class="flex items-center gap-2 flex-wrap">
          <!-- "Tutti / All" pill -->
          <button
            @click="setPillar(null)"
            :aria-pressed="activePillar === null"
            class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer"
            :class="activePillar === null
              ? 'bg-accent/15 text-accent border-2 border-accent/30'
              : 'text-text-muted border-2 border-transparent hover:bg-text-muted/10'"
          >
            {{ t('all') }}
            <span class="ml-1 text-xs opacity-70">{{ props.posts.length }}</span>
          </button>

          <!-- Per-pillar pills -->
          <button
            v-for="p in pillars"
            :key="p"
            @click="setPillar(p)"
            :aria-pressed="activePillar === p"
            class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer"
            :class="activePillar === p
              ? pillarStyles[p].tabActive
              : 'text-text-muted border-2 border-transparent hover:bg-text-muted/10'"
          >
            {{ getPillarLabel(p) }}
            <span class="ml-1 text-xs opacity-70">{{ pillarCounts[p] }}</span>
          </button>
        </div>

        <!-- Category dropdown -->
        <div class="relative" ref="dropdownRef">
          <button
            @click="dropdownOpen = !dropdownOpen"
            aria-haspopup="listbox"
            :aria-expanded="dropdownOpen"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer border"
            :class="activeCategory
              ? 'bg-accent/10 text-accent border-accent/30'
              : 'text-text-muted border-border/50 dark:border-border-dark/50 hover:border-border dark:hover:border-border-dark'"
          >
            {{ activeCategory ? (categoryLabels[activeCategory] || activeCategory) : t('topic') }}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-3.5 h-3.5 transition-transform"
              :class="{ 'rotate-180': dropdownOpen }"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
            </svg>
          </button>

          <!-- Dropdown panel -->
          <Transition name="dropdown">
            <div
              v-if="dropdownOpen"
              role="listbox"
              @keydown.escape="dropdownOpen = false"
              class="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-surface-dark border border-border/70 dark:border-border-dark/70 rounded-xl shadow-lg z-20 py-1 overflow-hidden"
            >
              <button
                v-for="cat in availableCategories"
                :key="cat.name"
                @click="setCategory(cat.name)"
                role="option"
                :aria-selected="activeCategory === cat.name"
                class="w-full flex items-center justify-between px-3 py-2 text-sm transition-colors cursor-pointer"
                :class="activeCategory === cat.name
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'hover:bg-text-muted/8 text-text-dark dark:text-text-light'"
              >
                <span class="flex items-center gap-2">
                  <span
                    v-if="cat.pillar"
                    class="w-2 h-2 rounded-full shrink-0"
                    :class="pillarStyles[cat.pillar].bg"
                  />
                  <span
                    v-else
                    class="w-2 h-2 rounded-full shrink-0 bg-text-muted/30"
                  />
                  {{ categoryLabels[cat.name] || cat.name }}
                </span>
                <span class="text-xs text-text-muted tabular-nums">{{ cat.count }}</span>
              </button>
            </div>
          </Transition>
        </div>
      </div>

      <!-- Row 2: Active filter chips -->
      <div v-if="hasAnyFilter" class="flex items-center gap-2 flex-wrap">
        <span class="text-xs text-text-muted font-medium">{{ t('filters') }}</span>

        <!-- Search chip -->
        <button
          v-if="searchQuery.trim()"
          @click="clearSearch"
          aria-label="Remove search filter"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-text-muted/15 text-text-dark dark:text-text-light hover:bg-text-muted/25 transition-colors cursor-pointer"
        >
          {{ t('search') }} "{{ searchQuery.trim() }}"
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>

        <!-- Pillar chip -->
        <button
          v-if="activePillar"
          @click="setPillar(null)"
          aria-label="Remove pillar filter"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer"
          :class="pillarStyles[activePillar].badge"
        >
          {{ getPillarLabel(activePillar) }}
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>

        <!-- Category chip -->
        <button
          v-if="activeCategory"
          @click="clearCategory"
          aria-label="Remove category filter"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-colors cursor-pointer"
        >
          {{ categoryLabels[activeCategory] || activeCategory }}
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>

        <!-- Tag chips -->
        <button
          v-for="tag in activeTags"
          :key="tag"
          @click="toggleTag(tag)"
          :aria-label="`Remove tag filter: ${tag}`"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-colors cursor-pointer"
        >
          {{ tag }}
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>

        <!-- Clear all link -->
        <button
          v-if="filterCount > 1"
          @click="clearAllFilters"
          class="text-xs text-text-muted hover:text-accent transition-colors cursor-pointer ml-1 underline underline-offset-2"
        >
          {{ t('clearAll') }}
        </button>
      </div>
    </div>

    <!-- ═══ Post Grid ═══ -->
    <Transition name="grid-fade" mode="out-in">
      <div :key="filterKey">
        <!-- Featured post (only when NO filters active) -->
        <a
          v-if="featuredPost"
          :href="featuredPost.href"
          class="group block mb-6"
          data-umami-event="blog-read"
          :data-umami-event-pillar="featuredPost.pillar ?? ''"
          :data-umami-event-category="featuredPost.category ?? ''"
        >
          <div class="rounded-xl border border-border/50 dark:border-border-dark/50 bg-white dark:bg-surface-dark overflow-hidden transition-shadow hover:shadow-md">
            <div class="p-6">
              <!-- Meta row -->
              <div class="flex items-center gap-2 mb-3">
                <time
                  class="text-xs text-text-muted tabular-nums"
                  :datetime="featuredPost.date"
                >
                  {{ formatDate(featuredPost.date) }}
                </time>
                <span
                  v-if="featuredPost.pillar"
                  :class="[
                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium tracking-wide',
                    pillarStyles[featuredPost.pillar].badge,
                  ]"
                >
                  {{ getPillarLabel(featuredPost.pillar) }}
                </span>
                <span
                  v-if="featuredPost.readingTime"
                  class="text-xs text-text-muted"
                >
                  {{ featuredPost.readingTime }} min
                </span>
              </div>
              <!-- Title -->
              <h3 class="text-xl font-bold mb-2 text-text-dark dark:text-text-light group-hover:text-accent transition-colors leading-snug">
                {{ featuredPost.title }}
              </h3>
              <!-- Description (no line-clamp) -->
              <p class="text-text-muted text-sm leading-relaxed">
                {{ featuredPost.description }}
              </p>
              <!-- Tags -->
              <div
                v-if="featuredPost.tags && featuredPost.tags.length > 0"
                class="flex flex-wrap gap-1.5 mt-auto pt-3"
              >
                <button
                  v-for="tag in featuredPost.tags.slice(0, 5)"
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
          </div>
        </a>

        <!-- Grid of regular post cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <a
            v-for="post in gridPosts"
            :key="post.id"
            :href="post.href"
            class="group block h-full"
            data-umami-event="blog-read"
            :data-umami-event-pillar="post.pillar ?? ''"
            :data-umami-event-category="post.category ?? ''"
          >
            <div
              :class="[
                'h-full flex flex-col',
                'bg-white dark:bg-surface-dark rounded-xl border border-border/70 dark:border-border-dark/70',
                'hover:border-border dark:hover:border-border-dark hover:shadow-md transition-all duration-300',
                post.pillar ? 'border-l-[3px]' : '',
                post.pillar ? pillarStyles[post.pillar].borderLeft : '',
                'p-6',
              ]"
            >
              <!-- Meta row -->
              <div class="flex items-center gap-2 mb-3">
                <time
                  class="text-xs text-text-muted tabular-nums"
                  :datetime="post.date"
                >
                  {{ formatDate(post.date) }}
                </time>
                <span
                  v-if="post.pillar"
                  :class="[
                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium tracking-wide',
                    pillarStyles[post.pillar].badge,
                  ]"
                >
                  {{ getPillarLabel(post.pillar) }}
                </span>
                <span
                  v-if="post.readingTime"
                  class="text-xs text-text-muted"
                >
                  {{ post.readingTime }} min
                </span>
              </div>
              <!-- Title -->
              <h3 class="text-base font-semibold mb-1.5 text-text-dark dark:text-text-light group-hover:text-accent transition-colors leading-snug">
                {{ post.title }}
              </h3>
              <!-- Description -->
              <p class="text-text-muted text-sm line-clamp-2 leading-relaxed">
                {{ post.description }}
              </p>
              <!-- Tags (first 3) — pushed to bottom -->
              <div
                v-if="post.tags && post.tags.length > 0"
                class="flex flex-wrap gap-1.5 mt-auto pt-3"
              >
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
        <div v-if="filteredPosts.length === 0" class="text-center py-16">
          <p class="text-text-muted mb-4 text-sm">
            {{ t('empty') }}
          </p>
          <button
            @click="clearAllFilters"
            class="px-4 py-2 rounded-lg border border-border dark:border-border-dark text-sm font-medium hover:border-accent hover:text-accent transition-colors cursor-pointer"
          >
            {{ t('clearFilter') }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { pillarStyles } from '@/data/pillar-styles';
import { pillarLabels } from '@/data/pillars';
import { categoryLabels } from '@/data/blog-labels';

export interface PostData {
  id: string;
  title: string;
  description: string;
  date: string;       // ISO string
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

// ── Pillar constants ──

const pillars = ['progettare', 'verificare', 'automatizzare'] as const;

// ── i18n ──

const i18n: Record<string, { it: string; en: string }> = {
  all:               { it: 'Tutti',           en: 'All' },
  topic:             { it: 'Argomento',       en: 'Topic' },
  filters:           { it: 'Filtri:',         en: 'Filters:' },
  clearAll:          { it: 'Rimuovi tutti',   en: 'Clear all' },
  clearFilter:       { it: 'Rimuovi filtro',  en: 'Clear filter' },
  empty:             { it: 'Nessun articolo per questo filtro.', en: 'No articles for this filter.' },
  searchPlaceholder: { it: 'Cerca articoli...',  en: 'Search articles...' },
  search:            { it: 'Ricerca:',           en: 'Search:' },
};

function t(key: string): string {
  return i18n[key]?.[props.lang] ?? key;
}

// ── Helpers ──

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(
    props.lang === 'it' ? 'it-IT' : 'en-US',
    { year: 'numeric', month: 'short', day: 'numeric' }
  );
}

function getPillarLabel(pillar: string): string {
  const labels = pillarLabels[pillar as keyof typeof pillarLabels];
  return labels?.[props.lang] ?? pillar;
}

// ── Filter state ──

const searchQuery = ref('');
const activePillar = ref<'progettare' | 'verificare' | 'automatizzare' | null>(null);
const activeCategory = ref<string | null>(null);
const activeTags = ref<Set<string>>(new Set());
const dropdownOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

// ── Filter actions ──

function setPillar(p: typeof activePillar.value) {
  if (activePillar.value === p) {
    // Click active pillar -> back to Tutti
    activePillar.value = null;
  } else {
    activePillar.value = p;
  }
  // Reset category when switching pillar (category may not exist in new pillar)
  activeCategory.value = null;
}

function setCategory(cat: string) {
  if (activeCategory.value === cat) {
    activeCategory.value = null;
  } else {
    activeCategory.value = cat;
  }
  dropdownOpen.value = false;
}

function clearCategory() {
  activeCategory.value = null;
}

function toggleTag(tag: string) {
  const newSet = new Set(activeTags.value);
  if (newSet.has(tag)) {
    newSet.delete(tag);
  } else {
    newSet.add(tag);
  }
  activeTags.value = newSet;
}

function isTagActive(tag: string): boolean {
  return activeTags.value.has(tag);
}

function clearSearch() {
  searchQuery.value = '';
}

function clearAllFilters() {
  searchQuery.value = '';
  activePillar.value = null;
  activeCategory.value = null;
  activeTags.value = new Set();
}

// ── Outside click for dropdown ──

function onDocumentClick(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    dropdownOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick);
});

// ── Computed: counts & available categories ──

const pillarCounts = computed(() => {
  const counts: Record<string, number> = { progettare: 0, verificare: 0, automatizzare: 0 };
  for (const post of props.posts) {
    if (post.pillar && counts[post.pillar] !== undefined) {
      counts[post.pillar]++;
    }
  }
  return counts;
});

const availableCategories = computed(() => {
  // When a pillar is active, show only categories for that pillar
  const source = activePillar.value
    ? props.posts.filter(p => p.pillar === activePillar.value)
    : props.posts;

  const map = new Map<string, { count: number; pillar: string | null }>();
  for (const post of source) {
    const existing = map.get(post.category);
    if (existing) {
      existing.count++;
    } else {
      map.set(post.category, { count: 1, pillar: post.pillar });
    }
  }
  return [...map.entries()]
    .map(([name, { count, pillar }]) => ({ name, count, pillar }))
    .sort((a, b) => b.count - a.count);
});

// ── Computed: filter state helpers ──

const hasAnyFilter = computed(() => {
  return searchQuery.value.trim() !== '' || activePillar.value !== null || activeCategory.value !== null || activeTags.value.size > 0;
});

const filterCount = computed(() => {
  let c = 0;
  if (searchQuery.value.trim()) c++;
  if (activePillar.value) c++;
  if (activeCategory.value) c++;
  c += activeTags.value.size;
  return c;
});

const filterKey = computed(() => {
  const parts = [
    searchQuery.value.trim(),
    activePillar.value ?? 'all',
    activeCategory.value ?? 'none',
    [...activeTags.value].sort().join(','),
  ];
  return parts.join(':');
});

// ── Computed: filtered posts ──

const filteredPosts = computed(() => {
  let result = props.posts;

  // Text search filter (AND)
  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    result = result.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some(tag => tag.toLowerCase().includes(q))
    );
  }

  // Pillar filter (AND)
  if (activePillar.value) {
    result = result.filter(p => p.pillar === activePillar.value);
  }

  // Category filter (AND)
  if (activeCategory.value) {
    result = result.filter(p => p.category === activeCategory.value);
  }

  // Tag filter (OR among tags, AND with above)
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

<style scoped>
.grid-fade-enter-active,
.grid-fade-leave-active {
  transition: opacity 0.15s ease;
}
.grid-fade-enter-from,
.grid-fade-leave-to {
  opacity: 0;
}

.dropdown-enter-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}
.dropdown-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}
.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
