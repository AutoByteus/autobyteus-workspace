<template>
  <div class="flex h-full flex-col bg-gray-50 text-gray-800">
    <div class="flex flex-shrink-0 items-start justify-between gap-3 p-4">
      <div class="min-w-0">
        <h3 class="text-base font-semibold text-gray-900">
          {{ $t('workspace.components.workspace.team.TeamMembersPanel.team_members') }}
        </h3>
        <p v-if="teamName" class="truncate text-sm text-gray-500" :title="teamName">{{ teamName }}</p>
        <p class="mt-1 text-xs text-gray-500">
          {{ $t('workspace.components.workspace.team.TeamMembersPanel.roster_non_execution_note') }}
        </p>
      </div>
      <button
        type="button"
        class="rounded-md border border-red-200 bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:border-red-600 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!activeTeam?.view.isRootTeamActive() || isStopPending"
        :title="$t('workspace.components.workspace.team.TeamMembersPanel.terminate_team')"
        @click="promptTerminateTeam"
      >
        Terminate
      </button>
    </div>

    <div
      ref="treeElement"
      role="tree"
      :aria-label="$t('workspace.components.workspace.team.TeamMembersPanel.team_members')"
      class="flex-1 space-y-1 overflow-y-auto p-2"
    >
      <div
        v-if="visibleRows.length === 0"
        class="pt-8 text-center text-sm text-gray-500"
      >
        {{ $t('workspace.components.workspace.team.TeamMembersPanel.no_active_team_members') }}
      </div>
      <button
        v-for="(row, index) in visibleRows"
        :key="row.key"
        :ref="(element: unknown) => registerRowElement(row.key, element)"
        type="button"
        role="treeitem"
        :aria-level="row.depth + 1"
        :aria-expanded="row.expandable ? isExpanded(row) : undefined"
        :aria-selected="row.agentRunId ? row.agentRunId === focusedAgentRunId : undefined"
        :aria-label="row.accessibleName"
        :tabindex="index === rovingIndex ? 0 : -1"
        class="flex w-full items-center gap-2 rounded-lg border p-3 text-left transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        :style="{ paddingLeft: `${12 + row.depth * 16}px` }"
        :class="row.agentRunId === focusedAgentRunId
          ? 'border-indigo-300 bg-indigo-100 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-100'"
        @click="activateRow(row)"
        @focus="rovingIndex = index"
        @keydown="onRowKeydown($event, row, index)"
      >
        <span
          v-if="row.expandable"
          aria-hidden="true"
          class="w-3 shrink-0 text-xs text-slate-500"
        >{{ isExpanded(row) ? '▾' : '▸' }}</span>
        <span v-else aria-hidden="true" class="w-3 shrink-0" />
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-medium" :title="row.displayName">{{ row.displayName }}</span>
          <span v-if="row.teamRunId" class="mt-0.5 block text-xs text-slate-500">Team</span>
        </span>
        <span
          v-if="row.coordinator"
          class="rounded-full bg-yellow-200 px-2 py-0.5 text-xs font-bold text-yellow-800"
        >Coord</span>
        <AgentStatusDisplay v-if="row.agentRunId" :status="row.currentStatus ?? 'offline'" />
      </button>
    </div>

    <AgentDeleteConfirmDialog
      :show="showTerminateConfirm"
      :item-name="teamName"
      item-type="Team Run"
      :title="$t('workspace.components.workspace.team.TeamMembersPanel.terminate_team_run')"
      :confirm-text="$t('workspace.components.workspace.team.TeamMembersPanel.terminate')"
      @confirm="onTerminateConfirmed"
      @cancel="onTerminateCanceled"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import AgentStatusDisplay from '~/components/workspace/agent/AgentStatusDisplay.vue';
import AgentDeleteConfirmDialog from '~/components/agents/AgentDeleteConfirmDialog.vue';
import type { TeamExecutionNavigationRow } from '~/services/teamExecution/teamExecutionViewModels';

const teamContextsStore = useAgentTeamContextsStore();
const runHistoryStore = useRunHistoryStore();
const teamRunStore = useAgentTeamRunStore();
const showTerminateConfirm = ref(false);
const expandedTeamRunIds = ref(new Set<string>());
const rovingIndex = ref(0);
const treeElement = ref<HTMLElement | null>(null);
const rowElements = new Map<string, HTMLElement>();

const activeTeam = computed(() => teamContextsStore.activeTeamContext);
const allRows = computed(() => activeTeam.value?.view.listNavigationRows() ?? []);
const rowByKey = computed(() => new Map(allRows.value.map((row) => [row.key, row])));
const visibleRows = computed(() => allRows.value.filter((row) => {
  let parentKey = row.parentKey;
  while (parentKey) {
    const parent = rowByKey.value.get(parentKey);
    if (!parent) return false;
    if (parent.teamRunId && !expandedTeamRunIds.value.has(parent.teamRunId)) return false;
    parentKey = parent.parentKey;
  }
  return true;
}));
const focusedAgentRunId = computed(() => activeTeam.value?.view.getFocusedAgentRunId() ?? null);
const teamName = computed(() => activeTeam.value?.view.getTeamDefinitionName() || 'this team');
const isStopPending = computed(() => {
  const rootTeamRunId = activeTeam.value?.view.getRootTeamRunId();
  return rootTeamRunId ? Boolean(teamRunStore.stopPendingTeamIds[rootTeamRunId]) : false;
});

const registerRowElement = (key: string, element: unknown): void => {
  if (element instanceof HTMLElement) rowElements.set(key, element);
  else rowElements.delete(key);
};
const isExpanded = (row: TeamExecutionNavigationRow): boolean =>
  Boolean(row.teamRunId && expandedTeamRunIds.value.has(row.teamRunId));
const toggleTeam = (row: TeamExecutionNavigationRow, expanded?: boolean): void => {
  if (!row.teamRunId || !row.expandable) return;
  const next = new Set(expandedTeamRunIds.value);
  const shouldExpand = expanded ?? !next.has(row.teamRunId);
  shouldExpand ? next.add(row.teamRunId) : next.delete(row.teamRunId);
  expandedTeamRunIds.value = next;
};
const focusVisibleRow = async (index: number): Promise<void> => {
  const bounded = Math.max(0, Math.min(index, visibleRows.value.length - 1));
  rovingIndex.value = bounded;
  await nextTick();
  const row = visibleRows.value[bounded];
  if (row) rowElements.get(row.key)?.focus();
};
const selectAgent = async (agentRunId: string): Promise<void> => {
  const rootTeamRunId = activeTeam.value?.view.getRootTeamRunId();
  if (rootTeamRunId) await runHistoryStore.focusTeamMemberAndEnsureHydrated(rootTeamRunId, agentRunId);
};
const activateRow = (row: TeamExecutionNavigationRow): void => {
  if (row.agentRunId) void selectAgent(row.agentRunId);
  else toggleTeam(row);
};
const onRowKeydown = (event: KeyboardEvent, row: TeamExecutionNavigationRow, index: number): void => {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    void focusVisibleRow(index + 1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    void focusVisibleRow(index - 1);
  } else if (event.key === 'ArrowRight' && row.expandable) {
    event.preventDefault();
    if (!isExpanded(row)) toggleTeam(row, true);
    else void focusVisibleRow(index + 1);
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    if (row.expandable && isExpanded(row)) toggleTeam(row, false);
    else if (row.parentKey) {
      const parentIndex = visibleRows.value.findIndex((candidate) => candidate.key === row.parentKey);
      if (parentIndex >= 0) void focusVisibleRow(parentIndex);
    }
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    activateRow(row);
  }
};

watch(allRows, (rows) => {
  const liveTeamIds = new Set(rows.flatMap((row) => row.teamRunId ? [row.teamRunId] : []));
  const next = new Set([...expandedTeamRunIds.value].filter((id) => liveTeamIds.has(id)));
  const rootTeamRunId = activeTeam.value?.view.getRootTeamRunId();
  if (rootTeamRunId) next.add(rootTeamRunId);
  let focusedRow = rows.find((row) => row.agentRunId === focusedAgentRunId.value) ?? null;
  while (focusedRow?.parentKey) {
    const parent = rows.find((row) => row.key === focusedRow?.parentKey) ?? null;
    if (parent?.teamRunId) next.add(parent.teamRunId);
    focusedRow = parent;
  }
  expandedTeamRunIds.value = next;
  rovingIndex.value = Math.max(0, visibleRows.value.findIndex((row) => row.agentRunId === focusedAgentRunId.value));
}, { immediate: true });

const promptTerminateTeam = (): void => { showTerminateConfirm.value = true; };
const onTerminateConfirmed = (): void => {
  teamRunStore.terminateActiveTeam();
  showTerminateConfirm.value = false;
};
const onTerminateCanceled = (): void => { showTerminateConfirm.value = false; };
</script>
