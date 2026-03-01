<template>
  <div class="flex flex-col lg:flex-row gap-10">
    <!-- Main content -->
    <div class="flex-1 min-w-0">
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
                <span
                  v-for="tag in post.tags.slice(0, 3)"
                  :key="tag"
                  class="text-[11px] text-text-muted/80 bg-text-muted/8 px-1.5 py-0.5 rounded"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>
        </a>
      </div>
    </div>

    <!-- Sidebar placeholder -->
    <aside class="hidden lg:block lg:w-56 shrink-0">
      <div class="lg:sticky lg:top-20 space-y-8">
        <p class="text-xs text-text-muted">Sidebar placeholder</p>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

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

// ── Post splitting ──

const featuredPost = computed(() => props.posts[0] ?? null);
const gridPosts = computed(() => props.posts.slice(1));
</script>
