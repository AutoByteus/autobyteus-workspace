<template>
  <section data-test="team-active-tasks-section" class="flex min-h-0 flex-col overflow-hidden bg-white">
    <button
      type="button"
      data-test="team-active-tasks-header"
      class="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3 py-2 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      :aria-expanded="!collapsed"
      @click="$emit('toggle')"
    >
      <div class="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="transform text-gray-500 transition-transform duration-300"
          :class="collapsed ? '-rotate-90' : ''"
          data-test="team-active-tasks-disclosure"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        <span class="text-xs font-bold leading-none tracking-wider text-gray-900">
          {{ $t('workspace.components.workspace.team.TeamActiveTasksSection.active_tasks') }}
        </span>
      </div>
      <span class="text-xs font-medium text-gray-600">
        {{ activeTaskEntries.length }} {{ activeTaskEntries.length === 1 ? $t('workspace.components.workspace.team.TeamActiveTasksSection.task_count_singular') : $t('workspace.components.workspace.team.TeamActiveTasksSection.task_count_plural') }}
      </span>
    </button>

    <div v-show="!collapsed" data-test="team-active-tasks-body" class="min-h-0 flex-1 overflow-hidden">
      <div v-if="activeTaskEntries.length === 0" class="flex h-full items-center justify-center p-6">
        <p data-test="team-active-tasks-empty" class="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
          {{ $t('workspace.components.workspace.team.TeamActiveTasksSection.empty') }}
        </p>
      </div>

      <div v-else class="flex h-full min-h-0 overflow-hidden" data-test="team-active-tasks-split">
        <aside
          class="min-h-0 shrink-0 overflow-y-auto border-r border-slate-200 pb-2"
          :style="{ width: `${leftPaneWidth}px` }"
          data-test="team-active-tasks-navigator"
        >
          <TeamActiveTaskRow
            v-for="entry in activeTaskEntries"
            :key="entry.node.memberRouteKey"
            :entry="entry"
            :selected="selectedTaskRouteKey === entry.node.memberRouteKey"
            :selected-reference-id="selectedReferenceId"
            @select-task="selectTask"
            @select-reference="selectReference"
          />
        </aside>

        <div
          class="w-1 shrink-0 cursor-col-resize bg-gray-100 transition-colors hover:bg-blue-200"
          role="separator"
          aria-orientation="vertical"
          data-test="team-active-tasks-resize-handle"
          @mousedown="startResize"
        />

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
                @click="emitFocus(selectedEntry.node.memberRouteKey)"
              >
                {{ $t('workspace.components.workspace.team.TeamActiveTasksSection.focus') }}
              </button>
            </div>

            <div v-if="selectedEntry.kind === 'task_team' && selectedEntry.members.length" class="mb-5 space-y-2">
              <button
                v-for="member in selectedEntry.members"
                :key="member.node.memberRouteKey"
                type="button"
                data-test="active-task-member-row"
                class="group flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm transition hover:border-indigo-200 hover:bg-indigo-50/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                :style="{ marginLeft: `${member.depth * 0.75}rem`, width: `calc(100% - ${member.depth * 0.75}rem)` }"
                :aria-label="`${$t('workspace.components.workspace.team.TeamActiveTasksSection.focus')} ${member.displayName}`"
                :title="`${$t('workspace.components.workspace.team.TeamActiveTasksSection.focus')} ${member.displayName}`"
                @click="emitFocus(member.node.memberRouteKey)"
              >
                <span class="flex min-w-0 items-center gap-2">
                  <span class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[0.6875rem] font-semibold uppercase text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700">
                    {{ memberInitials(member.displayName) }}
                  </span>
                  <span class="truncate font-medium text-slate-800">{{ member.displayName }}</span>
                </span>
                <span data-test="active-task-member-focus" class="shrink-0 text-xs font-semibold text-indigo-600">
                  {{ $t('workspace.components.workspace.team.TeamActiveTasksSection.focus') }}
                </span>
              </button>
            </div>

            <MarkdownRenderer
              :content="selectedEntry.taskDescription || $t('workspace.components.workspace.team.TeamActiveTasksSection.description_unavailable')"
              class="team-active-task-markdown text-[0.9375rem] leading-6 text-slate-700"
              data-test="active-task-task-body"
            />

            <details v-if="technicalRows.length || technicalInput" class="mt-5 rounded-md border border-slate-200 bg-slate-50" data-test="active-task-technical-details">
              <summary class="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-600">
                {{ $t('workspace.components.workspace.team.TeamActiveTasksSection.technical_details') }}
              </summary>
              <dl class="space-y-2 border-t border-slate-200 px-3 py-3 text-xs text-slate-700">
                <div v-for="detail in technicalRows" :key="detail.key" class="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
                  <dt class="font-semibold text-slate-500">{{ $t(detail.labelKey) }}</dt>
                  <dd :data-test="detail.dataTest" class="min-w-0 truncate font-mono" :title="detail.value">
                    {{ detail.value }}
                  </dd>
                </div>
              </dl>
              <pre v-if="technicalInput" data-test="active-task-technical-input" class="max-h-48 overflow-auto border-t border-slate-200 px-3 py-3 text-[0.6875rem] text-slate-600">{{ technicalInput }}</pre>
            </details>
          </div>

          <div v-else class="flex h-full items-center justify-center p-4 text-center text-sm text-slate-400">
            {{ $t('workspace.components.workspace.team.TeamActiveTasksSection.select_task') }}
          </div>
        </main>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import { useHorizontalSplitResize } from '~/composables/useHorizontalSplitResize';
import { deriveActiveTaskEntries, type ActiveTaskEntry } from '~/utils/teamActiveTaskEntries';
import MarkdownRenderer from '~/components/conversation/segments/renderer/MarkdownRenderer.vue';
import TeamActiveTaskRow from '~/components/workspace/team/TeamActiveTaskRow.vue';
import TeamTaskReferenceViewer from '~/components/workspace/team/TeamTaskReferenceViewer.vue';

const props = withDefaults(defineProps<{
  teamContext: AgentTeamContext;
  collapsed?: boolean;
}>(), {
  collapsed: false,
});

const emit = defineEmits<{
  (e: 'toggle'): void;
  (e: 'select-member', memberRouteKey: string): void;
}>();

const selectedTaskRouteKey = ref<string | null>(null);
const selectedReferenceId = ref<string | null>(null);
const referenceRefreshSignal = ref(0);
const { paneWidth: leftPaneWidth, startResize } = useHorizontalSplitResize({
  initialWidth: 248,
  minWidth: 168,
  maxWidth: 360,
});
const activeTaskEntries = computed<ActiveTaskEntry[]>(() => deriveActiveTaskEntries(props.teamContext));
const selectedEntry = computed(() => activeTaskEntries.value.find((entry) => entry.node.memberRouteKey === selectedTaskRouteKey.value) ?? null);
const selectedReference = computed(() => selectedEntry.value?.taskReferenceFiles.find((reference) => reference.referenceId === selectedReferenceId.value) ?? null);
const usefulStatusLabel = (statusLabel: string | null | undefined): string | null => {
  const normalized = statusLabel?.trim() ?? '';
  if (!normalized) return null;
  const key = normalized.toLowerCase();
  if (key === 'active' || key === 'unknown') return null;
  return normalized;
};
const selectedStatusLabel = computed(() => selectedEntry.value ? usefulStatusLabel(selectedEntry.value.statusLabel) : null);
const technicalRows = computed(() => {
  const entry = selectedEntry.value;
  if (!entry) return [];
  return [
    { key: 'task-kind', labelKey: 'workspace.components.workspace.team.TeamActiveTasksSection.task_type', dataTest: 'active-task-task-kind', value: entry.kind },
    ...(entry.taskId ? [{ key: 'task-id', labelKey: 'workspace.components.workspace.team.TeamActiveTasksSection.task_id', dataTest: 'active-task-id', value: entry.taskId }] : []),
    ...(entry.runId ? [{
      key: 'run-id',
      labelKey: entry.kind === 'task_team'
        ? 'workspace.components.workspace.team.TeamActiveTasksSection.agent_team_run_id'
        : 'workspace.components.workspace.team.TeamActiveTasksSection.agent_run_id',
      dataTest: 'active-task-run-id',
      value: entry.runId,
    }] : []),
    ...(entry.taskTargetKind ? [{ key: 'target-kind', labelKey: 'workspace.components.workspace.team.TeamActiveTasksSection.target_kind', dataTest: 'active-task-target-kind', value: entry.taskTargetKind }] : []),
    ...(entry.taskTargetName ? [{ key: 'target-name', labelKey: 'workspace.components.workspace.team.TeamActiveTasksSection.target', dataTest: 'active-task-target-name', value: entry.taskTargetName }] : []),
  ];
});
const technicalInput = computed(() => {
  const value = selectedEntry.value?.taskArguments ?? null;
  return value && Object.keys(value).length > 0 ? JSON.stringify(value, null, 2) : '';
});

watch(() => props.teamContext.teamRunId, () => {
  selectedTaskRouteKey.value = null;
  selectedReferenceId.value = null;
});

watch(
  () => activeTaskEntries.value.map((entry) => entry.node.memberRouteKey).join('\n'),
  () => {
    if (!activeTaskEntries.value.length) {
      selectedTaskRouteKey.value = null;
      selectedReferenceId.value = null;
      return;
    }
    if (!selectedEntry.value) {
      selectedTaskRouteKey.value = activeTaskEntries.value[0].node.memberRouteKey;
      selectedReferenceId.value = null;
    } else if (selectedReferenceId.value && !selectedReference.value) {
      selectedReferenceId.value = null;
    }
  },
  { immediate: true },
);

const selectTask = (memberRouteKey: string): void => {
  selectedTaskRouteKey.value = memberRouteKey;
  selectedReferenceId.value = null;
};

const selectReference = (referenceId: string): void => {
  if (selectedReferenceId.value === referenceId) referenceRefreshSignal.value += 1;
  selectedReferenceId.value = referenceId;
};

const emitFocus = (memberRouteKey: string): void => emit('select-member', memberRouteKey);
const memberInitials = (displayName: string): string => {
  const words = displayName.trim().split(/[\s_-]+/).filter(Boolean);
  const initials = words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('');
  return initials || '•';
};
const isWaitingStatus = (statusLabel: string): boolean => /waiting|approval|input|action/i.test(statusLabel);
</script>
