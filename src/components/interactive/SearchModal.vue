<template>
  <div>
    <button @click="open = true" class="p-2 rounded-lg hover:bg-border/30 dark:hover:bg-border-dark/30 transition-colors" aria-label="Cerca">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </button>

    <Teleport to="body">
      <div v-if="open" class="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" @click.self="close" @keydown.escape="close">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
        <div class="relative w-full max-w-xl mx-4 bg-base-light dark:bg-base-dark rounded-xl border border-border dark:border-border-dark shadow-2xl overflow-hidden">
          <div id="pagefind-container" class="p-4"></div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';

const open = ref(false);
let initialized = false;

function close() {
  open.value = false;
}

/**
 * Dynamically load pagefind-ui.js via script tag to avoid Vite/Rollup resolution.
 * Pagefind files are generated at build time in dist/pagefind/.
 */
function loadPagefindScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src="/pagefind/pagefind-ui.js"]')) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = '/pagefind/pagefind-ui.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load pagefind-ui.js'));
    document.head.appendChild(script);
  });
}

watch(open, async (isOpen) => {
  if (!isOpen || initialized) return;
  await nextTick();
  try {
    await loadPagefindScript();
    // PagefindUI is attached to window by the script
    const PagefindUI = (window as any).PagefindUI;
    if (!PagefindUI) {
      console.warn('PagefindUI not found on window');
      return;
    }
    new PagefindUI({
      element: '#pagefind-container',
      showSubResults: false,
      showImages: false,
      autofocus: true,
      translations: {
        placeholder: 'Cerca nel blog...',
        zero_results: 'Nessun risultato per [SEARCH_TERM]',
      },
    });
    initialized = true;
  } catch (e) {
    console.warn('Pagefind not available (run npm run build first)', e);
  }
});

function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    open.value = !open.value;
  }
}

onMounted(() => document.addEventListener('keydown', handleKeydown));
onUnmounted(() => document.removeEventListener('keydown', handleKeydown));
</script>
