<template>
  <!-- Artifacts (UIS-004, VIS-007): the open agent's artifacts. One is shown directly; several are one-line rows, and a
       row shows its artifact. A run on another node: its files are on that node (278). -->
  <section class="fixed inset-0 z-20 flex h-[100dvh] flex-col bg-white text-slate-900" data-testid="mobile-artifacts">
    <MobileScreenBar title="Artifacts" @back="back" />

    <p v-if="remote" class="px-4 py-10 text-center text-sm text-slate-500" data-testid="mobile-artifacts-remote">
      {{ t('remote.panel.artifacts', { node: remote.nodeName }) }}
    </p>
    <div v-else-if="!artifacts.length" class="px-8 py-10 text-center" data-testid="mobile-artifacts-empty">
      <p class="text-base font-semibold text-slate-900">No Artifacts yet</p>
      <p class="mt-1 text-sm text-slate-500">Generated or edited files for this run will appear here as they become available.</p>
    </div>
    <ul v-else-if="!shown" class="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-testid="mobile-artifacts-list">
      <li v-for="artifact in artifacts" :key="artifact.itemId">
        <button
          type="button"
          class="flex min-h-[2.75rem] w-full items-center gap-3 border-b border-slate-100 px-4 py-2 text-left active:bg-slate-50"
          data-testid="mobile-artifact-row"
          @click="selectedId = artifact.itemId"
        >
          <span class="min-w-0 flex-1 truncate text-[0.9375rem] font-medium text-slate-900">{{ fileName(artifact.path) }}</span>
          <Icon icon="heroicons:chevron-right-20-solid" class="h-5 w-5 flex-shrink-0 text-slate-300" aria-hidden="true" />
        </button>
      </li>
    </ul>
    <div v-else class="min-h-0 flex-1 overflow-hidden" data-testid="mobile-artifacts-viewer">
      <ArtifactContentViewer :artifact="shown" :read-subject="target.browse" :refresh-signal="0" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import MobileScreenBar from '~/components/mobile/MobileScreenBar.vue';
import ArtifactContentViewer from '~/components/workspace/agent/ArtifactContentViewer.vue';
import { toAgentArtifactViewerItem, type ArtifactViewerItem } from '~/components/workspace/agent/artifactViewerItem';
import { useRemoteRun } from '~/composables/remoteRuns/useRemoteRun';
import { useLocalization } from '~/composables/useLocalization';
import { useRunFileChangesStore } from '~/stores/runFileChangesStore';
import type { ActiveAgentWorkspaceTarget } from '~/types/workspace/activeAgentWorkspaceTarget';

const props = defineProps<{ target: ActiveAgentWorkspaceTarget }>();
const emit = defineEmits<{ (event: 'back'): void }>();

const { t } = useLocalization();
const runFileChangesStore = useRunFileChangesStore();
const remote = useRemoteRun(() => props.target.context.state.runId);
const runId = computed(() => props.target.context.state.runId);

const artifacts = computed<ArtifactViewerItem[]>(() => [...runFileChangesStore.getArtifactsForRun(runId.value)]
  .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.path.localeCompare(right.path))
  .map(toAgentArtifactViewerItem));
const selectedId = ref<string | null>(null);
watch(runId, () => { selectedId.value = null; });
/** One artifact is shown directly; of several, the one the user chose. */
const shown = computed(() => (artifacts.value.length === 1
  ? artifacts.value[0]!
  : artifacts.value.find((artifact) => artifact.itemId === selectedId.value) ?? null));

/** ← closes a chosen artifact first, then leaves the screen. */
const back = (): void => {
  if (artifacts.value.length > 1 && selectedId.value) selectedId.value = null;
  else emit('back');
};
const fileName = (path: string): string => path.split(/[\\/]/).filter(Boolean).pop() || path;
</script>
