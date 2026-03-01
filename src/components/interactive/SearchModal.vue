<template>
  <div>
    <button
      @click="open = true"
      class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-text-muted hover:text-accent border border-transparent hover:border-border dark:hover:border-border-dark transition-all duration-200 text-sm"
      aria-label="Cerca"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <kbd class="hidden md:inline text-[10px] font-mono opacity-50">
        {{ isMac ? '\u2318K' : 'Ctrl+K' }}
      </kbd>
    </button>

    <Teleport to="#modal-root">
      <Transition name="modal">
        <div
          v-if="open"
          class="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]"
          @click.self="close"
          @keydown.escape="close"
        >
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div class="relative w-full max-w-lg mx-4 bg-base-light dark:bg-base-dark rounded-xl border border-border dark:border-border-dark shadow-2xl overflow-hidden">
            <div v-if="loadError" class="p-8 text-center text-text-muted text-sm">
              <p class="mb-1">Ricerca non disponibile in dev mode.</p>
              <p class="text-xs opacity-60">
                Esegui <code class="bg-border/30 dark:bg-border-dark/40 px-1 py-0.5 rounded font-mono">npm run build && npm run preview</code>
              </p>
            </div>
            <div v-else id="pagefind-container" class="p-4"></div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';

const open = ref(false);
const loadError = ref(false);
const isMac = ref(false);
let initialized = false;

onMounted(() => {
  isMac.value = /mac|iphone|ipad/i.test(navigator.userAgentData?.platform ?? navigator.userAgent);
});

function close() {
  open.value = false;
}

function loadPagefindScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src="/pagefind/pagefind-ui.js"]')) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = '/pagefind/pagefind-ui.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('pagefind-ui.js not found'));
    document.head.appendChild(s);
  });
}

watch(open, async (isOpen) => {
  if (!isOpen || initialized) return;
  await nextTick();
  try {
    await loadPagefindScript();
    const PagefindUI = window.PagefindUI;
    if (!PagefindUI) { loadError.value = true; return; }
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
  } catch {
    loadError.value = true;
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

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.15s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
