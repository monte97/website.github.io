<script setup lang="ts">
import { ref, computed } from 'vue';
import { pillarStyles } from '@/data/pillar-styles';
import { pillarLabels } from '@/data/pillars';

interface CaseStudy {
  id: string;
  title: string;
  description: string;
  eyebrow?: string;
  pillar: 'progettare' | 'verificare' | 'automatizzare';
  tags: string[];
  problem?: string;
  result?: string;
  href: string;
}

const props = defineProps<{ items: CaseStudy[]; lang?: 'it' | 'en' }>();
const lang = props.lang ?? 'it';

const T = {
  it: {
    search: 'Cerca fra i case study…',
    all: 'Tutti',
    tech: 'Tecnologia',
    clear: 'Azzera i filtri',
    none: 'Nessun case study corrisponde ai filtri.',
    constraint: 'Il vincolo',
    outcome: 'L’esito',
    read: 'Leggi l’analisi',
    count: (n: number) => (n === 1 ? '1 case study' : `${n} case study`),
  },
  en: {
    search: 'Search case studies…',
    all: 'All',
    tech: 'Technology',
    clear: 'Clear filters',
    none: 'No case study matches these filters.',
    constraint: 'The constraint',
    outcome: 'The outcome',
    read: 'Read the analysis',
    count: (n: number) => (n === 1 ? '1 case study' : `${n} case studies`),
  },
}[lang];

const query = ref('');
const pillar = ref<string | null>(null);
const tag = ref<string | null>(null);

const pillars = computed(() => {
  const seen = new Map<string, number>();
  for (const i of props.items) seen.set(i.pillar, (seen.get(i.pillar) ?? 0) + 1);
  return [...seen.entries()];
});

const tags = computed(() => {
  const seen = new Map<string, number>();
  for (const i of props.items) for (const t of i.tags) seen.set(t, (seen.get(t) ?? 0) + 1);
  return [...seen.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
});

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  return props.items.filter((i) => {
    if (pillar.value && i.pillar !== pillar.value) return false;
    if (tag.value && !i.tags.includes(tag.value)) return false;
    if (!q) return true;
    return [i.title, i.description, i.eyebrow, i.problem, i.result, ...i.tags]
      .filter(Boolean).join(' ').toLowerCase().includes(q);
  });
});

const active = computed(() => !!(query.value.trim() || pillar.value || tag.value));
function clearAll() { query.value = ''; pillar.value = null; tag.value = null; }
</script>

<template>
  <div>
    <!-- Ricerca -->
    <div class="relative mb-5 max-w-md mx-auto">
      <input v-model="query" type="search" :placeholder="T.search"
        class="w-full pl-4 pr-9 py-2.5 rounded-lg text-sm border border-border/50 dark:border-border-dark/60 bg-white dark:bg-surface-dark text-text-dark dark:text-text-light placeholder:text-text-muted/70 focus:outline-none focus:border-accent transition-colors" />
      <button v-if="query" @click="query = ''" aria-label="Cancella"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-accent text-lg leading-none">&times;</button>
    </div>

    <!-- Pillole: pilastro -->
    <div class="flex flex-wrap justify-center gap-2 mb-3">
      <button @click="pillar = null"
        :class="['px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
          pillar === null ? 'border-accent text-accent bg-accent-subtle' : 'border-border/60 dark:border-border-dark/60 text-text-muted hover:border-accent/50']">
        {{ T.all }}<span class="ml-1.5 opacity-60">{{ items.length }}</span>
      </button>
      <button v-for="[p, n] in pillars" :key="p" @click="pillar = pillar === p ? null : p"
        :class="['px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
          pillar === p ? pillarStyles[p].badge + ' border-transparent' : 'border-border/60 dark:border-border-dark/60 text-text-muted hover:border-accent/50']">
        {{ pillarLabels[p][lang] }}<span class="ml-1.5 opacity-60">{{ n }}</span>
      </button>
    </div>

    <!-- Pillole: tecnologia -->
    <div v-if="tags.length > 1" class="flex flex-wrap justify-center gap-1.5 mb-6">
      <button v-for="[tg, n] in tags" :key="tg" @click="tag = tag === tg ? null : tg"
        :class="['px-2.5 py-1 rounded-md text-[11px] border transition-colors',
          tag === tg ? 'border-accent text-accent bg-accent-subtle' : 'border-transparent bg-text-muted/8 text-text-muted hover:text-accent']">
        {{ tg }}<span class="ml-1 opacity-50">{{ n }}</span>
      </button>
    </div>

    <div class="flex items-center justify-center gap-3 mb-8 text-xs text-text-muted">
      <span>{{ T.count(filtered.length) }}</span>
      <button v-if="active" @click="clearAll" class="text-accent hover:underline font-medium">{{ T.clear }}</button>
    </div>

    <!-- Elenco -->
    <p v-if="!filtered.length" class="text-center text-text-muted py-12">{{ T.none }}</p>

    <div v-else class="space-y-5 md:space-y-6">
      <a v-for="cs in filtered" :key="cs.id" :href="cs.href"
        class="group block rounded-2xl border border-border/60 dark:border-border-dark/60 bg-white dark:bg-surface-dark p-6 md:p-8 shadow-sm hover:shadow-md hover:border-accent/40 transition-all duration-200">
        <div class="flex items-start justify-between gap-4 mb-4">
          <p v-if="cs.eyebrow" class="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted/80">{{ cs.eyebrow }}</p>
          <span :class="['text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full whitespace-nowrap shrink-0', pillarStyles[cs.pillar].badge]">
            {{ pillarLabels[cs.pillar][lang] }}
          </span>
        </div>

        <h2 class="text-xl md:text-2xl font-bold text-text-dark dark:text-text-light mb-3 group-hover:text-accent transition-colors text-balance">
          {{ cs.title }}
        </h2>
        <p class="text-text-muted text-sm md:text-base leading-relaxed mb-5 max-w-2xl">{{ cs.description }}</p>

        <div v-if="cs.problem || cs.result" class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mb-5">
          <div v-if="cs.problem" class="border-l-2 border-border dark:border-border-dark pl-4">
            <p class="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted/70 mb-1.5">{{ T.constraint }}</p>
            <p class="text-sm text-text-muted leading-relaxed">{{ cs.problem }}</p>
          </div>
          <div v-if="cs.result" class="border-l-2 border-accent pl-4">
            <p class="text-[10px] font-mono uppercase tracking-[0.15em] text-accent mb-1.5">{{ T.outcome }}</p>
            <p class="text-sm text-text-muted leading-relaxed">{{ cs.result }}</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span class="text-sm font-semibold text-accent">{{ T.read }} &rarr;</span>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="tg in cs.tags.slice(0, 5)" :key="tg" class="text-[11px] text-text-muted/80 bg-text-muted/8 px-1.5 py-0.5 rounded">{{ tg }}</span>
          </div>
        </div>
      </a>
    </div>
  </div>
</template>
