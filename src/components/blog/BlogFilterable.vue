<template>
  <div class="flex flex-col lg:flex-row gap-10">
    <!-- Main content -->
    <div class="flex-1 min-w-0">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div v-for="post in posts" :key="post.id" class="p-4 border rounded">
          {{ post.title }}
        </div>
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
