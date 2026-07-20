<template>
  <div class="mermaid-diagram-component relative my-4">
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
      class="error-state flex min-h-[100px] flex-col items-center justify-center rounded border border-dashed border-red-400 bg-red-50 p-6 dark:border-red-600 dark:bg-gray-800"
    >
      <svg class="h-8 w-8 text-red-500 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
      </svg>
      <span class="mt-3 whitespace-pre-wrap text-center font-mono text-sm text-red-600 dark:text-red-400">
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
        class="mermaid-expand-button mb-2 inline-flex min-h-11 min-w-11 shrink-0 self-end items-center justify-center rounded-lg border border-slate-300 bg-white/95 p-2 text-slate-700 shadow-sm transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:border-slate-600 dark:bg-slate-800/95 dark:text-slate-100 dark:hover:border-indigo-400 dark:hover:bg-indigo-950"
        :aria-label="$t('workspace.components.conversation.segments.renderer.MermaidDiagram.expand_diagram')"
        :title="$t('workspace.components.conversation.segments.renderer.MermaidDiagram.expand_diagram')"
        @click.stop="openViewer"
      >
        <Icon icon="heroicons:arrows-pointing-out-20-solid" class="h-5 w-5" aria-hidden="true" />
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
</style>
