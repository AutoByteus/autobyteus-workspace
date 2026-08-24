<template>
  <section class="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50" data-testid="mobile-artifacts">
    <header class="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h2 class="text-xl font-bold text-slate-950">Artifacts</h2>
          <p class="mt-1 truncate text-sm text-slate-500">{{ subtitle }}</p>
        </div>
        <span
          v-if="focusedRunId"
          class="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"
          data-testid="mobile-artifacts-count"
        >
          {{ artifacts.length }}
        </span>
      </div>
    </header>

    <div v-if="!context" class="min-h-0 flex-1 overflow-y-auto p-5">
      <article class="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center" data-testid="mobile-artifacts-no-context">
        <p class="font-semibold text-slate-900">Choose work to see Artifacts</p>
        <p class="mt-2 text-sm text-slate-500">Open an agent or team run to inspect generated files and outputs.</p>
        <button type="button" class="mt-4 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white" @click="$emit('chooseWork')">
          Choose work
        </button>
      </article>
    </div>

    <div v-else-if="!isRunContext" class="min-h-0 flex-1 overflow-y-auto p-5">
      <article class="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center" data-testid="mobile-artifacts-no-run-context">
        <p class="font-semibold text-slate-900">Open a run to see Artifacts</p>
        <p class="mt-2 text-sm text-slate-500">Artifacts are scoped to an agent run or the focused member of a team run.</p>
        <button type="button" class="mt-4 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white" @click="$emit('chooseWork')">
          Choose run
        </button>
      </article>
    </div>

    <div v-else-if="!focusedRunId" class="min-h-0 flex-1 overflow-y-auto p-5">
      <article class="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center" data-testid="mobile-artifacts-no-run-id">
        <p class="font-semibold text-slate-900">Select an active run</p>
        <p class="mt-2 text-sm text-slate-500">The current mobile context no longer matches the selected run or focused team member.</p>
        <button type="button" class="mt-4 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white" @click="$emit('chooseWork')">
          Choose run
        </button>
      </article>
    </div>

    <div v-else-if="!artifacts.length" class="min-h-0 flex-1 overflow-y-auto p-5">
      <article class="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center" data-testid="mobile-artifacts-empty">
        <p class="font-semibold text-slate-900">No Artifacts yet</p>
        <p class="mt-2 text-sm text-slate-500">Generated or edited files for this run will appear here as they become available.</p>
      </article>
    </div>

    <div v-else class="flex min-h-0 flex-1 flex-col overflow-hidden" data-testid="mobile-artifacts-content">
      <div class="max-h-[42%] shrink-0 overflow-y-auto border-b border-slate-200 bg-white p-3" data-testid="mobile-artifacts-list">
        <button
          v-for="artifact in artifacts"
          :key="artifact.itemId"
          type="button"
          class="mb-2 flex w-full items-start gap-3 rounded-2xl border p-3 text-left shadow-sm transition last:mb-0"
          :class="artifact.itemId === selectedArtifactId ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'"
          data-testid="mobile-artifact-row"
          @click="selectArtifact(artifact)"
        >
          <span class="mt-0.5 shrink-0 text-xl" aria-hidden="true">{{ artifactIcon(artifact.type) }}</span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-bold text-slate-950">{{ fileName(artifact.path) }}</span>
            <span class="mt-0.5 block truncate text-xs text-slate-500">{{ artifact.path }}</span>
            <span class="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
              <span class="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{{ artifact.type }}</span>
              <span class="rounded-full px-2 py-0.5" :class="statusClass(artifact.status)">{{ artifact.status }}</span>
            </span>
          </span>
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-hidden bg-white" data-testid="mobile-artifacts-viewer">
        <ArtifactContentViewer :artifact="selectedArtifact" :refresh-signal="viewerRefreshSignal" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue';
import { useMobileFocusedRunIdentity } from '~/composables/mobile/useMobileFocusedRunIdentity';
import ArtifactContentViewer from '~/components/workspace/agent/ArtifactContentViewer.vue';
import {
  type ArtifactViewerItem,
  toAgentArtifactViewerItem,
} from '~/components/workspace/agent/artifactViewerItem';
import { useRunFileChangesStore, type RunFileChangeArtifactType, type RunFileChangeStatus } from '~/stores/runFileChangesStore';
import type { MobileWorkContext } from '~/types/mobileWork';

const props = defineProps<{
  context: MobileWorkContext | null;
}>();

defineEmits<{
  chooseWork: [];
}>();

const runFileChangesStore = useRunFileChangesStore();
const { focusedRunId, isRunContext } = useMobileFocusedRunIdentity(toRef(props, 'context'));

const selectedArtifactId = ref<string | null>(null);
const viewerRefreshSignal = ref(0);

const artifacts = computed<ArtifactViewerItem[]>(() => {
  if (!focusedRunId.value) {
    return [];
  }
  return [...runFileChangesStore.getArtifactsForRun(focusedRunId.value)]
    .sort((left, right) => {
      const byUpdatedAt = right.updatedAt.localeCompare(left.updatedAt);
      return byUpdatedAt !== 0 ? byUpdatedAt : left.path.localeCompare(right.path);
    })
    .map(toAgentArtifactViewerItem);
});

const latestVisibleArtifactSignal = computed(() => (
  focusedRunId.value ? runFileChangesStore.getLatestVisibleArtifactSignalForRun(focusedRunId.value) : null
));

const selectedArtifact = computed<ArtifactViewerItem | null>(() => {
  if (!selectedArtifactId.value) {
    return null;
  }
  return artifacts.value.find((artifact) => artifact.itemId === selectedArtifactId.value) || null;
});

const subtitle = computed(() => {
  if (!props.context) return 'Choose work to inspect run outputs.';
  if (!isRunContext.value) return 'Open a run to inspect generated outputs.';
  if (!focusedRunId.value) return 'Waiting for the selected run context.';
  if (!artifacts.value.length) return 'Generated outputs for this run will appear here.';
  return `${artifacts.value.length} artifact${artifacts.value.length === 1 ? '' : 's'} for the focused run.`;
});

watch(
  focusedRunId,
  () => {
    selectedArtifactId.value = null;
  },
);

watch(
  latestVisibleArtifactSignal,
  () => {
    const latestArtifactId = artifacts.value[0]?.itemId ?? null;
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

function selectArtifact(artifact: ArtifactViewerItem): void {
  if (selectedArtifactId.value === artifact.itemId) {
    viewerRefreshSignal.value += 1;
    return;
  }
  selectedArtifactId.value = artifact.itemId;
}

function fileName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() || path;
}

function artifactIcon(type: RunFileChangeArtifactType): string {
  switch (type) {
    case 'image': return '🖼️';
    case 'audio': return '🎧';
    case 'video': return '🎬';
    case 'pdf': return '📕';
    case 'csv': return '▦';
    case 'excel': return '📊';
    default: return '📄';
  }
}

function statusClass(status: RunFileChangeStatus): string {
  if (status === 'available') return 'bg-emerald-100 text-emerald-700';
  if (status === 'failed') return 'bg-red-100 text-red-700';
  if (status === 'streaming') return 'bg-blue-100 text-blue-700';
  return 'bg-amber-100 text-amber-700';
}
</script>
