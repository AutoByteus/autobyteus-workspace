<template>
  <div 
    class="flex flex-col h-full bg-white overflow-hidden outline-none" 
    tabindex="0"
    @keydown="handleKeydown"
  >
    <!-- Empty State -->
    <div v-if="isEmpty" class="flex flex-col items-center justify-center flex-1 p-6 text-center text-gray-400">
      <Icon icon="heroicons:document-plus" class="w-10 h-10 mb-2 text-gray-300" />
      <p class="text-sm">No artifacts created yet.</p>
    </div>

    <!-- Grouped Lists -->
    <div v-else class="flex-1 overflow-y-auto py-4">
      <!-- Asset Section -->
      <div v-if="assetArtifacts.length > 0" class="mb-6">
        <div class="px-4 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
            Assets
        </div>
        <ArtifactItem 
            v-for="artifact in assetArtifacts" 
            :key="artifact.id" 
            :artifact="artifact"
            :is-selected="artifact.id === selectedArtifactId"
            @select="$emit('select', artifact)"
        />
      </div>

      <!-- Files Section -->
      <div v-if="fileArtifacts.length > 0">
         <div class="px-4 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest" :class="{ 'mt-2': assetArtifacts.length > 0 }">
            Files
        </div>
        <ArtifactItem 
            v-for="artifact in fileArtifacts" 
            :key="artifact.id" 
            :artifact="artifact"
            :is-selected="artifact.id === selectedArtifactId"
            @select="$emit('select', artifact)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import type { AgentArtifact } from '~/stores/agentArtifactsStore';
import { determineFileType } from '~/utils/fileExplorer/fileUtils';
import ArtifactItem from './ArtifactItem.vue';

const props = defineProps<{
  artifacts: AgentArtifact[];
  selectedArtifactId?: string;
}>();

const emit = defineEmits(['select']);

const isEmpty = computed(() => props.artifacts.length === 0);

// Using determineFileType logic to categorize
// Since determineFileType is async (though currently implementation is sync-ish but typed as Promise),
// we might want a synchronous check or just do simple extension check here for UI grouping to avoid async complexity in computed.
// Let's reimplement simplest extension check here for grouping to ensure instant rendering.
// The actual Viewer will use the robust check.

const isAsset = (path: string) => {
    const lower = path.toLowerCase();
    const assetExts = [
        // Images
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
        // Audio
        '.mp3', '.wav', '.m4a', '.flac', '.ogg',
        // Video
        '.mp4', '.mov', '.avi', '.mkv', '.webm',
        // Documents / Data
        '.pdf', '.csv', '.xlsx', '.xls', '.xlsm'
    ];
    return assetExts.some(ext => lower.endsWith(ext));
};

const assetArtifacts = computed(() => props.artifacts.filter(a => isAsset(a.path)));
const fileArtifacts = computed(() => props.artifacts.filter(a => !isAsset(a.path)));

// Flattened list respecting the UI order (Assets then Files) for keyboard navigation
const flattenedArtifacts = computed(() => [...assetArtifacts.value, ...fileArtifacts.value]);

const handleKeydown = (event: KeyboardEvent) => {
  if (props.artifacts.length === 0) return;

  const currentIndex = flattenedArtifacts.value.findIndex(a => a.id === props.selectedArtifactId);
  
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    const nextIndex = currentIndex + 1;
    if (nextIndex < flattenedArtifacts.value.length) {
      emit('select', flattenedArtifacts.value[nextIndex]);
    }
  } else if (event.key === 'ArrowUp') {
    // ...
    event.preventDefault();
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      emit('select', flattenedArtifacts.value[prevIndex]);
    }
  }
};
</script>
