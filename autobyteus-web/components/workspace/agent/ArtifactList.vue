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
      <div v-if="agentArtifacts.length > 0" class="mb-6">
        <div class="px-4 py-2 text-[0.6875rem] font-bold text-gray-600 uppercase tracking-widest">
          {{ $t('workspace.components.workspace.agent.ArtifactList.agent_artifacts') }}
        </div>
        <ArtifactItem
          v-for="artifact in agentArtifacts"
          :key="artifact.itemId"
          :artifact="artifact"
          :is-selected="artifact.itemId === selectedArtifactId"
          @select="$emit('select', artifact)"
        />
      </div>

      <div v-if="sentGroups.length > 0" class="mb-6">
        <div class="px-4 py-2 text-[0.6875rem] font-bold text-gray-600 uppercase tracking-widest">
          {{ $t('workspace.components.workspace.agent.ArtifactList.sent_artifacts') }}
        </div>
        <div v-for="group in sentGroups" :key="`sent:${group.counterpartKey}`" class="mb-2">
          <div class="px-4 pb-1.5 flex items-baseline gap-1.5 min-w-0">
            <span class="text-[0.625rem] font-bold text-gray-500 uppercase tracking-wide">
              {{ $t('workspace.components.workspace.agent.ArtifactList.to_counterpart_prefix') }}
            </span>
            <span class="text-[0.8125rem] font-semibold text-gray-700 truncate">
              {{ group.counterpartLabel }}
            </span>
          </div>
          <ArtifactItem
            v-for="artifact in group.items"
            :key="artifact.itemId"
            :artifact="artifact"
            :is-selected="artifact.itemId === selectedArtifactId"
            :show-provenance-label="false"
            @select="$emit('select', artifact)"
          />
        </div>
      </div>

      <div v-if="receivedGroups.length > 0">
        <div class="px-4 py-2 text-[0.6875rem] font-bold text-gray-600 uppercase tracking-widest">
          {{ $t('workspace.components.workspace.agent.ArtifactList.received_artifacts') }}
        </div>
        <div v-for="group in receivedGroups" :key="`received:${group.counterpartKey}`" class="mb-2">
          <div class="px-4 pb-1.5 flex items-baseline gap-1.5 min-w-0">
            <span class="text-[0.625rem] font-bold text-gray-500 uppercase tracking-wide">
              {{ $t('workspace.components.workspace.agent.ArtifactList.from_counterpart_prefix') }}
            </span>
            <span class="text-[0.8125rem] font-semibold text-gray-700 truncate">
              {{ group.counterpartLabel }}
            </span>
          </div>
          <ArtifactItem
            v-for="artifact in group.items"
            :key="artifact.itemId"
            :artifact="artifact"
            :is-selected="artifact.itemId === selectedArtifactId"
            :show-provenance-label="false"
            @select="$emit('select', artifact)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import { useLocalization } from '~/composables/useLocalization';
import type { ArtifactViewerItem, MessageReferenceArtifactViewerItem } from './artifactViewerItem';
import ArtifactItem from './ArtifactItem.vue';

const props = defineProps<{
  artifacts: ArtifactViewerItem[];
  selectedArtifactId?: string | null;
}>();

const emit = defineEmits(['select']);
const { t } = useLocalization();

interface ArtifactCounterpartGroup {
  counterpartKey: string;
  counterpartLabel: string;
  items: MessageReferenceArtifactViewerItem[];
}

const compareUpdatedDesc = (left: ArtifactViewerItem, right: ArtifactViewerItem): number => {
  const byUpdatedAt = right.updatedAt.localeCompare(left.updatedAt);
  if (byUpdatedAt !== 0) {
    return byUpdatedAt;
  }
  return left.path.localeCompare(right.path);
};

const isEmpty = computed(() => props.artifacts.length === 0);
const agentArtifacts = computed(() => props.artifacts.filter((artifact) => artifact.kind === 'agent'));
const messageReferenceArtifacts = computed(() =>
  props.artifacts.filter((artifact): artifact is MessageReferenceArtifactViewerItem => artifact.kind === 'message_reference'),
);

const buildCounterpartGroups = (direction: 'sent' | 'received'): ArtifactCounterpartGroup[] => {
  const groupsByKey = new Map<string, ArtifactCounterpartGroup>();
  for (const artifact of messageReferenceArtifacts.value.filter((item) => item.direction === direction)) {
    const counterpartKey = artifact.counterpartRunId || artifact.counterpartMemberName || 'unknown';
    if (!groupsByKey.has(counterpartKey)) {
      groupsByKey.set(counterpartKey, {
        counterpartKey,
        counterpartLabel: artifact.counterpartMemberName || artifact.counterpartRunId || t('workspace.components.workspace.agent.ArtifactList.unknown_teammate'),
        items: [],
      });
    }
    groupsByKey.get(counterpartKey)!.items.push(artifact);
  }

  return Array.from(groupsByKey.values())
    .map((group) => ({
      ...group,
      items: group.items.sort(compareUpdatedDesc),
    }))
    .sort((left, right) => {
      const leftUpdatedAt = left.items[0]?.updatedAt || '';
      const rightUpdatedAt = right.items[0]?.updatedAt || '';
      const byUpdatedAt = rightUpdatedAt.localeCompare(leftUpdatedAt);
      if (byUpdatedAt !== 0) {
        return byUpdatedAt;
      }
      return left.counterpartLabel.localeCompare(right.counterpartLabel);
    });
};

const sentGroups = computed(() => buildCounterpartGroups('sent'));
const receivedGroups = computed(() => buildCounterpartGroups('received'));
const flattenedArtifacts = computed(() => [
  ...agentArtifacts.value,
  ...sentGroups.value.flatMap((group) => group.items),
  ...receivedGroups.value.flatMap((group) => group.items),
]);

const handleKeydown = (event: KeyboardEvent) => {
  if (props.artifacts.length === 0) return;

  const currentIndex = flattenedArtifacts.value.findIndex((artifact) => artifact.itemId === props.selectedArtifactId);

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
