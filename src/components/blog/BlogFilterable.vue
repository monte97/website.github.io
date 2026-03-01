<template>
  <div class="flex flex-col lg:flex-row gap-10">
    <!-- Main content -->
    <div class="flex-1 min-w-0">
      <Transition name="grid-fade" mode="out-in">
      <div :key="(activeGroupFilter ? `${activeGroupFilter.type}:${activeGroupFilter.value}` : 'none') + ':' + [...activeTags.value].sort().join(',')">
      <!-- Featured post (first post, full width) -->
      <a
        v-if="featuredPost"
        :href="featuredPost.href"
        class="group block mb-6"
      >
        <div class="rounded-xl border border-border/50 dark:border-border-dark/50 bg-white dark:bg-surface-dark overflow-hidden transition-shadow hover:shadow-md">
          <img
            v-if="featuredPost.heroImage"
            :src="featuredPost.heroImage"
            alt=""
            class="w-full h-48 md:h-56 object-cover"
            loading="eager"
          />
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
                  pillarBadgeClasses[featuredPost.pillar] || 'bg-text-muted/10 text-text-muted',
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
          </div>
        </div>
      </a>

      <!-- Grid of regular post cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <a
          v-for="post in gridPosts"
          :key="post.id"
          :href="post.href"
          class="group block"
        >
          <div
            :class="[
              'bg-white dark:bg-surface-dark rounded-xl border border-border/70 dark:border-border-dark/70',
              'hover:border-border dark:hover:border-border-dark hover:shadow-md transition-all duration-300',
              post.pillar ? 'border-l-[3px]' : '',
              post.pillar ? pillarBorderClasses[post.pillar] : '',
              post.heroImage ? 'overflow-hidden !p-0' : 'p-6',
            ]"
          >
            <img
              v-if="post.heroImage"
              :src="post.heroImage"
              alt=""
              class="w-full h-36 object-cover"
              loading="lazy"
            />
            <div :class="post.heroImage ? 'p-6' : ''">
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
                    pillarBadgeClasses[post.pillar] || 'bg-text-muted/10 text-text-muted',
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
              <!-- Tags (first 3) -->
              <div
                v-if="post.tags && post.tags.length > 0"
                class="flex flex-wrap gap-1.5 mt-3"
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

    <!-- Sidebar -->
    <aside class="hidden lg:block lg:w-56 shrink-0">
      <div class="lg:sticky lg:top-20 space-y-8">

        <!-- Active filter chips -->
        <div v-if="hasAnyFilter" class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-text-muted">{{ lang === 'en' ? 'Filters:' : 'Filtri:' }}</span>
          <!-- Group filter chip -->
          <button
            v-if="activeGroupFilter"
            @click="clearGroupFilter"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-colors cursor-pointer"
          >
            {{ groupFilterLabel }}
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
          <!-- Tag chips -->
          <button
            v-for="tag in activeTags"
            :key="tag"
            @click="toggleTag(tag)"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-colors cursor-pointer"
          >
            {{ tag }}
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
          <!-- Clear all -->
          <button
            v-if="activeGroupFilter && activeTags.size > 0"
            @click="clearAllFilters"
            class="text-xs text-text-muted hover:text-accent transition-colors cursor-pointer ml-1"
          >
            {{ lang === 'en' ? 'Clear all' : 'Rimuovi tutti' }}
          </button>
        </div>

        <!-- Categories -->
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
            {{ lang === 'en' ? 'Topics' : 'Argomenti' }}
          </h3>
          <ul class="space-y-1">
            <li v-for="cat in categories" :key="cat.name">
              <button
                @click="toggleGroupFilter('category', cat.name)"
                class="w-full flex items-center justify-between py-1 px-2 rounded-md text-sm transition-colors cursor-pointer"
                :class="isGroupActive('category', cat.name)
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
                @click="toggleGroupFilter('series', s.name)"
                class="w-full flex items-center justify-between py-1 px-2 rounded-md text-sm transition-colors cursor-pointer"
                :class="isGroupActive('series', s.name)
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'hover:bg-text-muted/10 text-text-dark dark:text-text-light'"
              >
                {{ seriesLabels[s.name] || s.name }}
                <span class="text-xs text-text-muted">{{ s.count }}</span>
              </button>
            </li>
          </ul>
        </div>

        <!-- Tags -->
        <div v-if="allTags.length > 0">
          <h3 class="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
            Tags
          </h3>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="tag in allTags"
              :key="tag.name"
              @click="toggleTag(tag.name)"
              class="text-[11px] px-2 py-0.5 rounded-full transition-colors cursor-pointer"
              :class="isTagActive(tag.name)
                ? 'bg-accent/15 text-accent font-medium'
                : 'text-text-muted/80 bg-text-muted/8 hover:bg-text-muted/15'"
            >
              {{ tag.name }}
              <span class="opacity-60 ml-0.5">{{ tag.count }}</span>
            </button>
          </div>
        </div>

      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

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

// ── Pillar helpers ──

const pillarLabels: Record<string, Record<string, string>> = {
  progettare: { it: 'Progettare', en: 'Design' },
  verificare: { it: 'Verificare', en: 'Verify' },
  automatizzare: { it: 'Automatizzare', en: 'Automate' },
};

const pillarBorderClasses: Record<string, string> = {
  progettare: 'border-l-pillar-progettare',
  verificare: 'border-l-pillar-verificare',
  automatizzare: 'border-l-pillar-automatizzare',
};

const pillarBadgeClasses: Record<string, string> = {
  progettare: 'bg-pillar-progettare/10 text-pillar-progettare',
  verificare: 'bg-pillar-verificare/10 text-pillar-verificare',
  automatizzare: 'bg-pillar-automatizzare/10 text-pillar-automatizzare',
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

// ── Filter state ──

// Group filter: category OR series (single select, mutually exclusive)
const activeGroupFilter = ref<{ type: 'category' | 'series'; value: string } | null>(null);

// Tag filter: multi-select, OR logic among tags
const activeTags = ref<Set<string>>(new Set());

function toggleGroupFilter(type: 'category' | 'series', value: string) {
  if (activeGroupFilter.value?.type === type && activeGroupFilter.value?.value === value) {
    activeGroupFilter.value = null;
  } else {
    activeGroupFilter.value = { type, value };
  }
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

function isGroupActive(type: string, value: string): boolean {
  return activeGroupFilter.value?.type === type && activeGroupFilter.value?.value === value;
}

function isTagActive(tag: string): boolean {
  return activeTags.value.has(tag);
}

function clearAllFilters() {
  activeGroupFilter.value = null;
  activeTags.value = new Set();
}

function clearGroupFilter() {
  activeGroupFilter.value = null;
}

function clearTags() {
  activeTags.value = new Set();
}

const hasAnyFilter = computed(() => {
  return activeGroupFilter.value !== null || activeTags.value.size > 0;
});

// ── Filtered posts & splitting ──

const filteredPosts = computed(() => {
  let result = props.posts;

  // Apply group filter (category or series)
  if (activeGroupFilter.value) {
    const { type, value } = activeGroupFilter.value;
    if (type === 'category') {
      result = result.filter(p => p.category === value);
    } else if (type === 'series') {
      result = result.filter(p => p.series === value);
    }
  }

  // Apply tag filter (OR logic: post must have at least one of the selected tags)
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

const groupFilterLabel = computed(() => {
  if (!activeGroupFilter.value) return '';
  const { type, value } = activeGroupFilter.value;
  if (type === 'category') return categoryLabels[value] || value;
  if (type === 'series') return seriesLabels[value] || value;
  return value;
});

// ── Sidebar: labels & helpers ──

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

// ── Sidebar: computed data ──

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

const allTags = computed(() => {
  const map = new Map<string, number>();
  for (const post of props.posts) {
    for (const tag of post.tags) {
      map.set(tag, (map.get(tag) || 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
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
</style>
