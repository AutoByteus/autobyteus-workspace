<template>
  <div :class="layoutClasses">
    <!-- File Explorer Tree (Resizable) -->
    <div 
      :class="treePaneClasses"
      :style="treePaneStyle"
    >
      <FileExplorer :active="props.active" />
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
      <FileExplorerTabs :active="props.active" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import FileExplorer from '~/components/fileExplorer/FileExplorer.vue';
import FileExplorerTabs from '~/components/fileExplorer/FileExplorerTabs.vue';

const props = withDefaults(defineProps<{
  active?: boolean
  layout?: 'split' | 'stacked'
}>(), {
  active: true,
  layout: 'split',
});


const treeWidth = ref(250); // Default width
const minWidth = 150;
const maxWidth = 600;
const isStacked = computed(() => props.layout === 'stacked');
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
    : { width: `${treeWidth.value}px` },
);

const startResize = (event: MouseEvent) => {
  if (!props.active || isStacked.value) return;

  const startX = event.clientX;
  const startWidth = treeWidth.value;

  const doDrag = (e: MouseEvent) => {
    const newWidth = startWidth + (e.clientX - startX);
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      treeWidth.value = newWidth;
    }
  };

  const stopDrag = () => {
    document.removeEventListener('mousemove', doDrag);
    document.removeEventListener('mouseup', stopDrag);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  document.addEventListener('mousemove', doDrag);
  document.addEventListener('mouseup', stopDrag);
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
};
</script>
