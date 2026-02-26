<template>
  <div class="flex h-full w-full overflow-hidden bg-white">
    
    <!-- Left Pane: Artifact List -->
    <div 
        class="flex-shrink-0 flex flex-col border-r border-gray-200 h-full overflow-hidden"
        :style="{ width: treeWidth + 'px' }"
    >
        <ArtifactList 
            :artifacts="artifacts" 
            :selected-artifact-id="selectedArtifactId"
            @select="selectArtifact"
        />
    </div>

    <!-- Drag Handle -->
    <div 
      class="w-[1px] cursor-col-resize hover:w-1 hover:bg-blue-500 bg-gray-200 flex-shrink-0 z-10 transition-all duration-75 relative group"
      @mousedown.prevent="startResize"
    >
       <div class="absolute inset-y-0 -left-1 -right-1 z-0 bg-transparent"></div>
    </div>

    <!-- Right Pane: Content Viewer -->
    <div class="flex-grow min-w-0 h-full overflow-hidden bg-white">
        <ArtifactContentViewer :artifact="selectedArtifact" />
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAgentArtifactsStore, type AgentArtifact } from '~/stores/agentArtifactsStore';
import { useActiveContextStore } from '~/stores/activeContextStore';
import ArtifactList from './ArtifactList.vue';
import ArtifactContentViewer from './ArtifactContentViewer.vue';

const artifactsStore = useAgentArtifactsStore();
const activeContextStore = useActiveContextStore();

const currentAgentId = computed(() => activeContextStore.activeAgentContext?.state.agentId || '');
// Use store getter to get artifacts
const artifacts = computed(() => artifactsStore.getArtifactsForRun(currentAgentId.value));
const activeStream = computed(() => artifactsStore.getActiveStreamingArtifactForRun(currentAgentId.value));

const selectedArtifact = ref<AgentArtifact | null>(null);
const selectedArtifactId = computed(() => selectedArtifact.value?.id);

// Auto-select streaming artifact
watch(activeStream, (newArtifact) => {
  if (newArtifact) {
    selectedArtifact.value = newArtifact;
  }
}, { immediate: true });

// Auto-select first artifact if none selected and list is not empty
watch(artifacts, (newArtifacts) => {
    if (!selectedArtifact.value && newArtifacts.length > 0) {
        selectedArtifact.value = newArtifacts[0];
    }
}, { immediate: true });

const selectArtifact = (artifact: AgentArtifact) => {
  selectedArtifact.value = artifact;
};

// --- Resizing Logic (Mirrored from FileExplorerLayout) ---
const treeWidth = ref(250);
const minWidth = 150;
const maxWidth = 600;
const isDragging = ref(false);

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
    isDragging.value = false;
  };

  document.addEventListener('mousemove', doDrag);
  document.addEventListener('mouseup', stopDrag);
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  isDragging.value = true;
};


</script>
