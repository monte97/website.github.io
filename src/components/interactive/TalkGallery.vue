<template>
  <div>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <button
        v-for="(src, i) in images"
        :key="i"
        type="button"
        class="block overflow-hidden rounded-lg border border-border/60 bg-surface dark:bg-surface-dark focus:outline-none focus:ring-2 focus:ring-accent"
        @click="open(i)"
      >
        <img :src="src" :alt="`${title} - foto ${i + 1}`" loading="lazy" class="w-full h-64 object-contain hover:opacity-90 transition-opacity" />
      </button>
    </div>

    <div
      v-if="current !== null"
      class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      @click.self="close"
    >
      <button type="button" class="absolute top-4 right-4 text-white/80 hover:text-white p-2" aria-label="Chiudi" @click="close">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <button v-if="images.length > 1" type="button" class="absolute left-2 sm:left-6 text-white/80 hover:text-white p-2" aria-label="Precedente" @click="prev">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <img :src="images[current]" :alt="`${title} - foto ${current + 1}`" class="max-h-[85vh] max-w-full object-contain rounded" />

      <button v-if="images.length > 1" type="button" class="absolute right-2 sm:right-6 text-white/80 hover:text-white p-2" aria-label="Successiva" @click="next">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div v-if="images.length > 1" class="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
        {{ current + 1 }} / {{ images.length }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';

const props = defineProps<{ images: string[]; title: string }>();
const current = ref<number | null>(null);

function open(i: number) { current.value = i; }
function close() { current.value = null; }
function next() { if (current.value !== null) current.value = (current.value + 1) % props.images.length; }
function prev() { if (current.value !== null) current.value = (current.value - 1 + props.images.length) % props.images.length; }

function onKey(e: KeyboardEvent) {
  if (current.value === null) return;
  if (e.key === 'Escape') close();
  else if (e.key === 'ArrowRight') next();
  else if (e.key === 'ArrowLeft') prev();
}

watch(current, (v) => {
  if (v !== null) {
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
  } else {
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
  }
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
});
</script>
