<template>
  <div class="flex h-full w-full overflow-hidden bg-white">
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

    <div
      class="w-[1px] cursor-col-resize hover:w-1 hover:bg-blue-500 bg-gray-200 flex-shrink-0 z-10 transition-all duration-75 relative group"
      @mousedown.prevent="startResize"
    >
      <div class="absolute inset-y-0 -left-1 -right-1 z-0 bg-transparent"></div>
    </div>

    <div class="flex-grow min-w-0 h-full overflow-hidden bg-white">
      <ArtifactContentViewer :artifact="selectedArtifact" :refresh-signal="viewerRefreshSignal" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRunFileChangesStore } from '~/stores/runFileChangesStore';
import { useMessageFileReferencesStore } from '~/stores/messageFileReferencesStore';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import ArtifactList from './ArtifactList.vue';
import ArtifactContentViewer from './ArtifactContentViewer.vue';
import {
  type ArtifactViewerItem,
  toAgentArtifactViewerItem,
  toMessageReferenceArtifactViewerItem,
} from './artifactViewerItem';

const runFileChangesStore = useRunFileChangesStore();
const messageFileReferencesStore = useMessageFileReferencesStore();
const activeContextStore = useActiveContextStore();
const selectionStore = useAgentSelectionStore();
const teamContextsStore = useAgentTeamContextsStore();

const currentAgentRunId = computed(() => activeContextStore.activeAgentContext?.state.runId || '');
const currentTeamRunId = computed(() =>
  selectionStore.selectedType === 'team' ? (teamContextsStore.activeTeamContext?.teamRunId || '') : '',
);

const agentArtifactItems = computed<ArtifactViewerItem[]>(() =>
  [...runFileChangesStore.getArtifactsForRun(currentAgentRunId.value)]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map(toAgentArtifactViewerItem),
);

const messageReferenceItems = computed<ArtifactViewerItem[]>(() => {
  if (!currentTeamRunId.value || !currentAgentRunId.value) {
    return [];
  }
  const perspective = messageFileReferencesStore.getPerspectiveForMember(
    currentTeamRunId.value,
    currentAgentRunId.value,
  );
  return [
    ...perspective.sentGroups.flatMap((group) => group.items),
    ...perspective.receivedGroups.flatMap((group) => group.items),
  ].map(toMessageReferenceArtifactViewerItem);
});

const artifacts = computed<ArtifactViewerItem[]>(() => [
  ...agentArtifactItems.value,
  ...messageReferenceItems.value,
]);

const latestVisibleArtifactSignal = computed(() =>
  runFileChangesStore.getLatestVisibleArtifactSignalForRun(currentAgentRunId.value),
);

const selectedArtifactId = ref<string | null>(null);
const viewerRefreshSignal = ref(0);
const selectedArtifact = computed<ArtifactViewerItem | null>(() => {
  if (!selectedArtifactId.value) {
    return null;
  }
  return artifacts.value.find((artifact) => artifact.itemId === selectedArtifactId.value) || null;
});

watch(
  latestVisibleArtifactSignal,
  () => {
    const latestArtifactId = agentArtifactItems.value[0]?.itemId ?? null;
    if (latestArtifactId) {
      selectedArtifactId.value = latestArtifactId;
    }
  },
  { immediate: true },
);

watch(
  artifacts,
  (newArtifacts) => {
    if (newArtifacts.length === 0) {
      selectedArtifactId.value = null;
      return;
    }

    const hasCurrentSelection = newArtifacts.some((artifact) => artifact.itemId === selectedArtifactId.value);
    if (!hasCurrentSelection) {
      selectedArtifactId.value = newArtifacts[0].itemId;
    }
  },
  { immediate: true },
);

const selectArtifact = (artifact: ArtifactViewerItem) => {
  if (selectedArtifactId.value === artifact.itemId) {
    viewerRefreshSignal.value += 1;
    return;
  }
  selectedArtifactId.value = artifact.itemId;
};

const treeWidth = ref(250);
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
