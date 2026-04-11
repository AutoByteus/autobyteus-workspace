<template>
  <div
    class="flex flex-col h-full bg-white overflow-hidden outline-none"
    tabindex="0"
    @keydown="handleKeydown"
  >
    <div v-if="isEmpty" class="flex flex-col items-center justify-center flex-1 p-6 text-center text-gray-400">
      <Icon icon="heroicons:document-plus" class="w-10 h-10 mb-2 text-gray-300" />
      <p class="text-sm">{{ $t('workspace.components.workspace.agent.ArtifactList.no_touched_files_yet') }}</p>
    </div>

    <div v-else class="flex-1 overflow-y-auto py-4">
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
import type { RunFileChangeArtifact } from '~/stores/runFileChangesStore';
import ArtifactItem from './ArtifactItem.vue';

const props = defineProps<{
  artifacts: RunFileChangeArtifact[];
  selectedArtifactId?: string;
}>();

const emit = defineEmits(['select']);

const isEmpty = computed(() => props.artifacts.length === 0);
const isAssetArtifact = (artifact: RunFileChangeArtifact): boolean => artifact.type !== 'file' && artifact.type !== 'other';

const assetArtifacts = computed(() => props.artifacts.filter((artifact) => isAssetArtifact(artifact)));
const fileArtifacts = computed(() => props.artifacts.filter((artifact) => !isAssetArtifact(artifact)));
const flattenedArtifacts = computed(() => [...assetArtifacts.value, ...fileArtifacts.value]);

const handleKeydown = (event: KeyboardEvent) => {
  if (props.artifacts.length === 0) return;

  const currentIndex = flattenedArtifacts.value.findIndex((artifact) => artifact.id === props.selectedArtifactId);

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    const nextIndex = currentIndex + 1;
    if (nextIndex < flattenedArtifacts.value.length) {
      emit('select', flattenedArtifacts.value[nextIndex]);
    }
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      emit('select', flattenedArtifacts.value[prevIndex]);
    }
  }
};
</script>
