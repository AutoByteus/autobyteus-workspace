<template>
  <div class="flex h-full w-full overflow-hidden">
    <!-- File Explorer Tree (Resizable) -->
    <div 
      class="flex-shrink-0 flex flex-col border-r border-gray-200 bg-gray-50 h-full overflow-hidden"
      :style="{ width: treeWidth + 'px' }"
    >
      <FileExplorer />
    </div>

    <!-- Drag Handle -->
    <div 
      class="w-[1px] cursor-col-resize hover:w-1 hover:bg-blue-500 bg-gray-200 flex-shrink-0 z-10 transition-all duration-75 relative group"
      @mousedown.prevent="startResize"
    >
       <!-- Invisible hit area for easier grabbing -->
       <div class="absolute inset-y-0 -left-1 -right-1 z-0 bg-transparent"></div>
    </div>

    <!-- File Content Viewer -->
    <div class="flex-grow min-w-0 h-full overflow-hidden bg-white">
      <FileExplorerTabs />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import FileExplorer from '~/components/fileExplorer/FileExplorer.vue';
import FileExplorerTabs from '~/components/fileExplorer/FileExplorerTabs.vue';

const treeWidth = ref(250); // Default width
const minWidth = 150;
const maxWidth = 600;

const startResize = (event: MouseEvent) => {
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
