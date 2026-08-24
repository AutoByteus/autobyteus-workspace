<template>
  <div class="mermaid-diagram-component relative my-4 min-w-0 max-w-full overflow-x-hidden">
    <div
      v-if="isLoading"
      class="loading-state flex min-h-[100px] flex-col items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 p-6 dark:border-gray-600 dark:bg-gray-800"
    >
      <svg class="h-8 w-8 animate-spin text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span class="mt-3 text-sm text-gray-600 dark:text-gray-300">
        {{ $t('workspace.components.conversation.segments.renderer.MermaidDiagram.rendering_diagram') }}
      </span>
    </div>

    <div
      v-else-if="error"
      class="error-state flex min-h-[100px] min-w-0 max-w-full flex-col items-center justify-center overflow-hidden rounded border border-dashed border-red-400 bg-red-50 p-6 dark:border-red-600 dark:bg-gray-800"
    >
      <svg class="h-8 w-8 text-red-500 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
      </svg>
      <span class="mermaid-error-message mt-3 min-w-0 max-w-full whitespace-pre-wrap text-center font-mono text-sm text-red-600 dark:text-red-400">
        {{ error }}
      </span>
    </div>

    <div
      v-else-if="svgContent"
      ref="inlinePreviewRef"
      class="diagram-content relative flex w-full flex-col overflow-auto rounded bg-white p-2 dark:bg-[#1e1e1e]"
      :style="lockedPreviewStyle"
      @click="handleInlinePreviewClick"
    >
      <button
        ref="expandButtonRef"
        type="button"
        class="mermaid-expand-button absolute right-1 top-1 z-10 inline-flex items-center justify-center"
        :aria-label="$t('workspace.components.conversation.segments.renderer.MermaidDiagram.expand_diagram')"
        :title="$t('workspace.components.conversation.segments.renderer.MermaidDiagram.expand_diagram')"
        @click.stop="openViewer"
      >
        <Icon icon="heroicons:arrows-pointing-out-20-solid" class="relative z-10 h-[17px] w-[17px]" aria-hidden="true" />
      </button>

      <div
        v-if="!isViewerOpen"
        class="mermaid-svg-container flex w-full justify-center"
        v-html="svgContent"
      ></div>
    </div>

    <MermaidDiagramViewer
      v-if="isViewerOpen && svgContent"
      :svg-content="svgContent"
      @close="closeViewer"
      @external-link="forwardExternalLink"
    />
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { mermaidService } from '~/services/mermaidService';
import MermaidDiagramViewer from './MermaidDiagramViewer.vue';

const props = defineProps<{
  content: string;
  diagramId?: string;
}>();

const emit = defineEmits<{
  (event: 'external-link', url: string): void;
}>();

const uniqueDiagramId = computed(() =>
  props.diagramId || `mermaid-${Math.floor(Math.random() * 100000)}`,
);
const isLoading = ref(true);
const error = ref<string | null>(null);
const svgContent = ref('');
const isViewerOpen = ref(false);
const lockedPreviewHeight = ref<string | null>(null);
const inlinePreviewRef = ref<HTMLElement | null>(null);
const expandButtonRef = ref<HTMLButtonElement | null>(null);
const lockedPreviewStyle = computed(() =>
  lockedPreviewHeight.value ? { height: lockedPreviewHeight.value } : undefined,
);

let renderGeneration = 0;
let shouldRestoreFocus = false;

const invalidateViewer = () => {
  shouldRestoreFocus = false;
  isViewerOpen.value = false;
  lockedPreviewHeight.value = null;
};

const renderDiagram = async () => {
  const generation = ++renderGeneration;
  invalidateViewer();
  isLoading.value = true;
  error.value = null;
  svgContent.value = '';

  try {
    mermaidService.initialize();
    const svg = await mermaidService.render(props.content, uniqueDiagramId.value);
    if (generation !== renderGeneration) return;
    svgContent.value = svg;
  } catch (caught: unknown) {
    if (generation !== renderGeneration) return;
    console.error('Mermaid rendering failed:', caught);
    error.value = caught instanceof Error
      ? caught.message
      : 'Failed to render mermaid diagram';
  } finally {
    if (generation === renderGeneration) {
      isLoading.value = false;
    }
  }
};

const interactiveSelector = [
  'a', '[role="link"]', 'button', 'input', 'select', 'textarea', 'summary',
  '[contenteditable="true"]', '[tabindex]:not([tabindex="-1"])', '.clickable', '[onclick]',
].join(',');

const openViewer = () => {
  if (!svgContent.value || isViewerOpen.value) return;
  const previewHeight = inlinePreviewRef.value?.getBoundingClientRect().height;
  lockedPreviewHeight.value = previewHeight && previewHeight > 0
    ? `${previewHeight}px`
    : null;
  shouldRestoreFocus = true;
  isViewerOpen.value = true;
};

const handleInlinePreviewClick = (event: MouseEvent) => {
  if (event.button !== 0 || !(event.target instanceof Element)) return;
  if (event.target.closest(interactiveSelector)) return;
  openViewer();
};

const afterBrowserLayout = (callback: () => void) => {
  if (typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(callback);
  } else {
    callback();
  }
};

const closeViewer = async () => {
  if (!isViewerOpen.value) return;
  const restoreFocus = shouldRestoreFocus;
  shouldRestoreFocus = false;
  isViewerOpen.value = false;
  await nextTick();
  afterBrowserLayout(() => {
    lockedPreviewHeight.value = null;
    if (restoreFocus && expandButtonRef.value?.isConnected) {
      expandButtonRef.value.focus();
    }
  });
};

const forwardExternalLink = (url: string) => emit('external-link', url);

onMounted(renderDiagram);
watch(() => props.content, renderDiagram);
onBeforeUnmount(() => {
  renderGeneration += 1;
  invalidateViewer();
});
</script>

<style>
.mermaid-svg-container svg {
  display: block;
  height: auto;
  max-width: 100%;
}

.mermaid-error-message {
  overflow-wrap: anywhere;
  word-break: break-word;
}

.mermaid-expand-button {
  background: transparent;
  border: 0;
  border-radius: 0.5rem;
  color: rgb(51 65 85);
  height: 44px;
  padding: 0;
  transition: color 140ms ease, opacity 140ms ease, transform 140ms ease;
  width: 44px;
}

.mermaid-expand-button::before {
  backdrop-filter: blur(6px);
  background: rgb(255 255 255 / 68%);
  border: 1px solid rgb(203 213 225 / 65%);
  border-radius: 0.5rem;
  box-shadow: 0 1px 5px rgb(15 23 42 / 12%);
  content: '';
  inset: 5px;
  position: absolute;
  transition: background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease;
}

.mermaid-expand-button:hover {
  color: rgb(67 56 202);
}

.mermaid-expand-button:hover::before {
  background: rgb(238 242 255 / 88%);
  border-color: rgb(129 140 248);
  box-shadow: 0 2px 8px rgb(79 70 229 / 16%);
}

.mermaid-expand-button:active::before {
  transform: scale(0.94);
}

.mermaid-expand-button:focus-visible {
  outline: 2px solid rgb(79 70 229);
  outline-offset: 1px;
}

@media (hover: hover) and (pointer: fine) {
  .mermaid-expand-button {
    height: 34px;
    opacity: 0;
    pointer-events: none;
    transform: translateY(-2px) scale(0.96);
    width: 34px;
  }

  .mermaid-expand-button::before {
    inset: 2px;
  }

  .diagram-content:hover .mermaid-expand-button,
  .diagram-content:focus-within .mermaid-expand-button,
  .mermaid-expand-button:focus-visible {
    opacity: 1;
    pointer-events: auto;
    transform: none;
  }
}

/* A coarse secondary pointer must win over the fine-primary resting state. */
@media (any-pointer: coarse) {
  .mermaid-expand-button {
    height: 44px;
    opacity: 1;
    pointer-events: auto;
    transform: none;
    width: 44px;
  }

  .mermaid-expand-button::before {
    inset: 5px;
  }
}

@media (prefers-color-scheme: dark) {
  .mermaid-expand-button {
    color: rgb(226 232 240);
  }

  .mermaid-expand-button::before {
    background: rgb(30 41 59 / 68%);
    border-color: rgb(100 116 139 / 70%);
    box-shadow: 0 1px 5px rgb(0 0 0 / 28%);
  }

  .mermaid-expand-button:hover {
    color: rgb(238 242 255);
  }

  .mermaid-expand-button:hover::before {
    background: rgb(49 46 129 / 86%);
    border-color: rgb(129 140 248);
  }
}

@media (prefers-reduced-motion: reduce) {
  .mermaid-expand-button,
  .mermaid-expand-button::before {
    transition-duration: 0.01ms;
  }
}
</style>
