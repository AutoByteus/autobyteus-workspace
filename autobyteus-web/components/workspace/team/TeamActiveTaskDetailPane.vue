<template>
  <main class="min-h-0 min-w-0 flex-1 overflow-hidden" data-test="active-task-detail-pane">
    <div v-if="selectedEntry && selectedReference && selectedEntry.taskId" class="h-full" data-test="active-task-reference-preview">
      <TeamTaskReferenceViewer
        :team-run-id="selectedEntry.teamRunId"
        :task-id="selectedEntry.taskId"
        :reference="selectedReference"
        :refresh-signal="referenceRefreshSignal"
      />
    </div>

    <div v-else-if="selectedEntry" class="h-full overflow-y-auto p-4" data-test="active-task-task-detail">
      <div class="mb-4 flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="truncate text-base font-semibold text-slate-900">{{ selectedEntry.targetDisplayName }}</span>
            <span v-if="selectedStatusLabel" class="rounded-full bg-slate-50 px-2 py-0.5 text-[0.68rem] font-medium text-slate-500 ring-1 ring-slate-100">
              {{ selectedStatusLabel }}
            </span>
          </div>
          <p v-if="isWaitingStatus(selectedEntry.statusLabel)" data-test="active-task-waiting-notice" class="mt-2 rounded-md bg-slate-50 px-2.5 py-2 text-xs text-slate-500 ring-1 ring-slate-100">
            {{ $t('workspace.components.workspace.team.TeamActiveTasksSection.waiting_activity_notice') }}
          </p>
        </div>
        <button
          type="button"
          data-test="active-task-focus-primary"
          class="shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          :aria-label="`${$t('workspace.components.workspace.team.TeamActiveTasksSection.focus')} ${selectedEntry.targetDisplayName}`"
          :title="`${$t('workspace.components.workspace.team.TeamActiveTasksSection.focus')} ${selectedEntry.targetDisplayName}`"
          @click="$emit('select-member', selectedEntry.node.memberRouteKey)"
        >
          {{ $t('workspace.components.workspace.team.TeamActiveTasksSection.focus') }}
        </button>
      </div>

      <MarkdownRenderer
        :content="selectedEntry.taskDescription || $t('workspace.components.workspace.team.TeamActiveTasksSection.description_unavailable')"
        class="team-active-task-markdown text-[0.9375rem] leading-6 text-slate-700"
        data-test="active-task-task-body"
      />
    </div>

    <div v-else class="flex h-full items-center justify-center p-4 text-center text-sm text-slate-400">
      {{ $t('workspace.components.workspace.team.TeamActiveTasksSection.select_task') }}
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import { useTeamActiveTaskSelectionStore } from '~/stores/teamActiveTaskSelectionStore';
import { deriveActiveTaskEntries, type ActiveTaskEntry } from '~/utils/teamActiveTaskEntries';
import MarkdownRenderer from '~/components/conversation/segments/renderer/MarkdownRenderer.vue';
import TeamTaskReferenceViewer from '~/components/workspace/team/TeamTaskReferenceViewer.vue';

const props = defineProps<{
  teamContext: AgentTeamContext;
}>();

defineEmits<{
  (e: 'select-member', memberRouteKey: string): void;
}>();

const selectionStore = useTeamActiveTaskSelectionStore();
const activeTaskEntries = computed<ActiveTaskEntry[]>(() => deriveActiveTaskEntries(props.teamContext));
const selection = computed(() => selectionStore.getSelection(props.teamContext.teamRunId));
const selectedEntry = computed(() => {
  const selectedMemberRouteKey = selection.value?.memberRouteKey ?? '';
  return activeTaskEntries.value.find((entry) => entry.node.memberRouteKey === selectedMemberRouteKey)
    ?? activeTaskEntries.value[0]
    ?? null;
});
const selectedReference = computed(() => {
  const referenceId = selection.value?.referenceId ?? '';
  return selectedEntry.value?.taskReferenceFiles.find((reference) => reference.referenceId === referenceId) ?? null;
});
const referenceRefreshSignal = ref(0);

watch(selection, (nextSelection, previousSelection) => {
  if (
    nextSelection?.referenceId
    && nextSelection.memberRouteKey === previousSelection?.memberRouteKey
    && nextSelection.referenceId === previousSelection.referenceId
  ) {
    referenceRefreshSignal.value += 1;
  }
});

const usefulStatusLabel = (statusLabel: string | null | undefined): string | null => {
  const normalized = statusLabel?.trim() ?? '';
  if (!normalized) return null;
  const key = normalized.toLowerCase();
  if (key === 'active' || key === 'unknown') return null;
  return normalized;
};
const selectedStatusLabel = computed(() => selectedEntry.value ? usefulStatusLabel(selectedEntry.value.statusLabel) : null);
const isWaitingStatus = (statusLabel: string): boolean => /waiting|approval|input|action/i.test(statusLabel);
</script>
