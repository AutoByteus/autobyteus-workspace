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
      <div class="mb-6">
        <div class="px-4 py-2 text-[0.6875rem] font-bold text-gray-600 uppercase tracking-widest">
          {{ $t('workspace.components.workspace.agent.ArtifactList.agent_artifacts') }}
        </div>
        <ArtifactItem
          v-for="artifact in sortedArtifacts"
          :key="artifact.itemId"
          :artifact="artifact"
          :is-selected="artifact.itemId === selectedArtifactId"
          @select="$emit('select', artifact)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import type { ArtifactViewerItem } from './artifactViewerItem';
import ArtifactItem from './ArtifactItem.vue';

const props = defineProps<{
  artifacts: ArtifactViewerItem[];
  selectedArtifactId?: string | null;
}>();

const emit = defineEmits(['select']);

const compareUpdatedDesc = (left: ArtifactViewerItem, right: ArtifactViewerItem): number => {
  const byUpdatedAt = right.updatedAt.localeCompare(left.updatedAt);
  if (byUpdatedAt !== 0) {
    return byUpdatedAt;
  }
  return left.path.localeCompare(right.path);
};

const isEmpty = computed(() => props.artifacts.length === 0);
const sortedArtifacts = computed(() => [...props.artifacts].sort(compareUpdatedDesc));

const handleKeydown = (event: KeyboardEvent) => {
  if (sortedArtifacts.value.length === 0) return;

  const currentIndex = sortedArtifacts.value.findIndex((artifact) => artifact.itemId === props.selectedArtifactId);

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    const nextIndex = currentIndex + 1;
    if (nextIndex < sortedArtifacts.value.length) {
      emit('select', sortedArtifacts.value[nextIndex]);
    }
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      emit('select', sortedArtifacts.value[prevIndex]);
    }
  }
};
</script>
