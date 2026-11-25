<template>
  <div ref="layoutRoot" :class="layoutClasses" :data-layout="isStacked ? 'stacked' : 'split'">
    <template v-if="props.workspaceId !== null">
      <!-- File Explorer Tree (Resizable) -->
      <div
        :class="treePaneClasses"
        :style="treePaneStyle"
      >
        <FileExplorer :active="props.active" :workspace-id="props.workspaceId" />
      </div>

      <!-- Drag Handle -->
      <div
        v-if="!isStacked"
        class="w-[1px] cursor-col-resize hover:w-1 hover:bg-blue-500 bg-gray-200 flex-shrink-0 z-10 transition-all duration-75 relative group"
        @mousedown.prevent="startResize"
      >
         <!-- Invisible hit area for easier grabbing -->
         <div class="absolute inset-y-0 -left-1 -right-1 z-0 bg-transparent"></div>
      </div>
      <div v-else class="h-[1px] flex-shrink-0 bg-gray-200"></div>

      <!-- File Content Viewer -->
      <div class="flex-grow min-w-0 h-full overflow-hidden bg-white">
        <FileExplorerTabs :active="props.active" :workspace-id="props.workspaceId" />
      </div>
    </template>
    <div v-else role="status" data-test="workspace-unavailable" class="flex h-full w-full items-center justify-center p-6 text-center text-sm text-gray-500">
      {{ t('fileExplorer.workspaceUnavailable') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
const { t } = useLocalization();
import FileExplorer from '~/components/fileExplorer/FileExplorer.vue';
import FileExplorerTabs from '~/components/fileExplorer/FileExplorerTabs.vue';

const props = withDefaults(defineProps<{
  active?: boolean
  layout?: 'split' | 'stacked'
  workspaceId?: string | null
}>(), {
  active: true,
  layout: 'split',
});


// The file viewer is never narrower than this beside the tree (autobyteus-642 D-3, REQ-003).
const MIN_VIEWER_WIDTH = 400;
const DIVIDER_WIDTH = 1;
const MIN_TREE_WIDTH = 150;
const MAX_TREE_WIDTH = 600;

/** The width the user gave the tree (250 at first); shown narrower while the panel has no room for it. */
const treeWidth = ref(250);
/** The layout's own width, measured (0 until mounted). */
const panelWidth = ref(0);
const layoutRoot = ref<HTMLElement | null>(null);

/** The widest tree that leaves the viewer its minimum. */
const maxTreeWidth = computed(() => Math.min(MAX_TREE_WIDTH, panelWidth.value - DIVIDER_WIDTH - MIN_VIEWER_WIDTH));
// Side by side only when the narrowest tree fits beside a viewer of its minimum width; otherwise the tree goes above.
const isStacked = computed(() =>
  props.layout === 'stacked' || panelWidth.value < MIN_TREE_WIDTH + DIVIDER_WIDTH + MIN_VIEWER_WIDTH);
const shownTreeWidth = computed(() => Math.min(treeWidth.value, maxTreeWidth.value));
const layoutClasses = computed(() =>
  isStacked.value
    ? 'flex h-full w-full flex-col overflow-hidden'
    : 'flex h-full w-full overflow-hidden',
);
const treePaneClasses = computed(() => [
  'flex-shrink-0 flex flex-col bg-gray-50 overflow-hidden',
  isStacked.value
    ? 'w-full border-b border-gray-200'
    : 'h-full border-r border-gray-200',
]);
const treePaneStyle = computed(() =>
  isStacked.value
    ? { height: '42%', minHeight: '180px', width: '100%' }
    : { width: `${shownTreeWidth.value}px` },
);

let widthObserver: ResizeObserver | null = null;
onMounted(() => {
  const root = layoutRoot.value;
  if (!root) return;
  panelWidth.value = root.getBoundingClientRect().width;
  widthObserver = new ResizeObserver((entries) => {
    panelWidth.value = entries[entries.length - 1]?.contentRect.width ?? panelWidth.value;
  });
  widthObserver.observe(root);
});
onBeforeUnmount(() => { widthObserver?.disconnect(); });

let stopResize: (() => void) | null = null;
watch(() => [props.workspaceId, props.active], () => { stopResize?.(); });
onBeforeUnmount(() => { stopResize?.(); });

const startResize = (event: MouseEvent) => {
  if (!props.active || isStacked.value || props.workspaceId === null) return;
  stopResize?.();

  const startX = event.clientX;
  const startWidth = shownTreeWidth.value;

  // The divider stops where the tree reaches its minimum, or the viewer its own.
  const doDrag = (e: MouseEvent) => {
    treeWidth.value = Math.max(MIN_TREE_WIDTH, Math.min(maxTreeWidth.value, startWidth + (e.clientX - startX)));
  };

  const stopDrag = () => {
    document.removeEventListener('mousemove', doDrag);
    document.removeEventListener('mouseup', stopDrag);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    stopResize = null;
  };
  stopResize = stopDrag;

  document.addEventListener('mousemove', doDrag);
  document.addEventListener('mouseup', stopDrag);
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
};
</script>
