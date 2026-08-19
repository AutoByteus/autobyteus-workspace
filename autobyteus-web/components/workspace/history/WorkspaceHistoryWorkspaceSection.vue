<template>
  <section class="rounded-md">
    <div
      class="group/workspace-row flex items-center rounded-md text-sm text-gray-700 transition-colors hover:bg-gray-50 focus-within:bg-gray-50"
      data-test="workspace-row"
      :data-workspace-id="workspaceNode.workspaceId"
      :data-workspace-root="workspaceNode.workspaceRootPath"
      :aria-expanded="state.isWorkspaceExpanded(workspaceNode.workspaceId)"
    >
      <button
        type="button"
        class="flex min-w-0 flex-1 items-center px-2 py-1.5 text-left"
        :aria-expanded="state.isWorkspaceExpanded(workspaceNode.workspaceId)"
        @click="state.toggleWorkspace(workspaceNode)"
      >
        <Icon
          icon="heroicons:chevron-down-20-solid"
          class="mr-1.5 h-4 w-4 text-gray-400 transition-transform"
          :class="state.isWorkspaceExpanded(workspaceNode.workspaceId) ? 'rotate-0' : '-rotate-90'"
        />
        <Icon icon="heroicons:folder-20-solid" class="mr-1.5 h-4 w-4 text-gray-500" />
        <span class="truncate">{{ workspaceNode.workspaceName }}</span>
      </button>
      <button
        v-if="workspaceNode.canRemoveFromWorkspaces"
        type="button"
        class="mr-1 inline-flex h-6 w-6 items-center justify-center rounded text-gray-400 transition-[opacity,color,background-color] duration-150 hover:bg-red-50 hover:text-red-600 focus:opacity-100 md:opacity-0 md:group-hover/workspace-row:opacity-100 md:group-focus-within/workspace-row:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
        :title="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.remove_from_workspaces')"
        :aria-label="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.remove_from_workspaces')"
        :disabled="state.isWorkspaceRemoving(workspaceNode.workspaceId)"
        @click.stop="actions.onRemoveWorkspace(workspaceNode)"
      >
        <Icon icon="heroicons:x-mark-20-solid" class="h-4 w-4" />
      </button>
    </div>

    <div v-if="state.isWorkspaceExpanded(workspaceNode.workspaceId)" class="ml-2 mt-0.5 space-y-1">
      <div
        v-if="state.isWorkspaceHistoryLoading(workspaceNode.workspaceId)"
        class="px-3 py-1 text-xs text-gray-400"
      >{{$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.loading_workspace_history')}}</div>
      <div
        v-else-if="state.workspaceHistoryError(workspaceNode.workspaceId)"
        class="px-3 py-1 text-xs text-red-500"
      >{{ state.workspaceHistoryError(workspaceNode.workspaceId) }}</div>
      <div
        v-else-if="workspaceNode.agents.length === 0 && workspaceTeams.length === 0"
        class="px-3 py-1 text-xs text-gray-400"
      >{{ $t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.no_task_history_in_this_workspace') }}</div>

      <div
        v-for="agentNode in workspaceNode.agents"
        :key="agentNode.agentDefinitionId"
        class="rounded-md"
      >
        <div
          class="flex items-center justify-between rounded-md px-2 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-50"
        >
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center text-left"
            data-test="workspace-agent-row"
            :data-workspace-root="workspaceNode.workspaceRootPath"
            :data-agent-definition-id="agentNode.agentDefinitionId"
            :aria-expanded="state.isAgentExpanded(workspaceNode.workspaceId, agentNode.agentDefinitionId)"
            @click="state.toggleAgent(workspaceNode.workspaceId, agentNode.agentDefinitionId)"
          >
            <Icon
              icon="heroicons:chevron-down-20-solid"
              class="mr-1 h-3.5 w-3.5 text-gray-400 transition-transform"
              :class="state.isAgentExpanded(workspaceNode.workspaceId, agentNode.agentDefinitionId) ? 'rotate-0' : '-rotate-90'"
            />
            <span
              class="mr-1.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-[0.625rem] font-semibold text-gray-600"
            >
              <img
                v-if="avatars.showAgentAvatar(workspaceNode.workspaceRootPath, agentNode.agentDefinitionId, agentNode.agentAvatarUrl)"
                :src="agentNode.agentAvatarUrl || ''"
                :alt="`${agentNode.agentName} avatar`"
                class="h-full w-full object-cover"
                @error="avatars.onAgentAvatarError(workspaceNode.workspaceRootPath, agentNode.agentDefinitionId, agentNode.agentAvatarUrl)"
              >
              <span v-else>{{ avatars.getAgentInitials(agentNode.agentName) }}</span>
            </span>
            <span class="truncate font-medium">{{ agentNode.agentName }}</span>
            <span class="ml-1 text-xs text-gray-400">({{ agentNode.runs.length }})</span>
          </button>

          <button
            type="button"
            class="ml-2 inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
            :title="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.new_run_with_this_agent')"
            @click="actions.onCreateRun(workspaceNode.workspaceRootPath, agentNode.agentDefinitionId)"
          >
            <Icon icon="heroicons:plus-20-solid" class="h-4 w-4" />
          </button>
        </div>

        <div
          v-if="state.isAgentExpanded(workspaceNode.workspaceId, agentNode.agentDefinitionId)"
          class="ml-3 space-y-0.5"
        >
          <button
            v-for="run in agentNode.runs"
            :key="run.runId"
            type="button"
            class="group/run-row flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors"
            :class="state.selectedRunId === run.runId
              ? 'bg-indigo-50 text-indigo-900'
              : 'text-gray-700 hover:bg-gray-50'"
            @click="actions.onSelectRun(run)"
          >
            <div class="min-w-0 flex items-center">
              <StatusDot class="mr-2" :status="run.currentStatus" />
              <span class="truncate">
                {{ formatRunLabel(run.summary) }}
              </span>
            </div>
            <div class="ml-2 flex flex-shrink-0 items-center gap-1">
              <button
                v-if="run.isActive"
                type="button"
                class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                :title="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.terminate_run')"
                :disabled="state.isRunTerminating(run.runId)"
                @click.stop="actions.onTerminateRun(run.runId)"
              >
                <Icon icon="heroicons:stop-20-solid" class="h-3.5 w-3.5" />
              </button>
              <button
                v-else-if="run.source === 'draft'"
                type="button"
                class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-[opacity,color,background-color] duration-150 hover:bg-red-50 hover:text-red-600 md:opacity-0 md:group-hover/run-row:opacity-100 md:group-focus-within/run-row:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
                :title="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.remove_draft_run')"
                :disabled="state.isRunDeleting(run.runId)"
                @click.stop="actions.onDeleteRun(run)"
              >
                <Icon icon="heroicons:trash-20-solid" class="h-3.5 w-3.5" />
              </button>
              <button
                v-else-if="run.source === 'history' && !run.isActive"
                type="button"
                class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-[opacity,color,background-color] duration-150 hover:bg-amber-50 hover:text-amber-600 md:opacity-0 md:group-hover/run-row:opacity-100 md:group-focus-within/run-row:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
                :title="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.archive_run')"
                :disabled="state.isRunArchiving(run.runId) || state.isRunDeleting(run.runId)"
                @click.stop="actions.onArchiveRun(run)"
              >
                <Icon icon="heroicons:archive-box-20-solid" class="h-3.5 w-3.5" />
              </button>
              <button
                v-if="run.source === 'history' && !run.isActive"
                type="button"
                class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-[opacity,color,background-color] duration-150 hover:bg-red-50 hover:text-red-600 md:opacity-0 md:group-hover/run-row:opacity-100 md:group-focus-within/run-row:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
                :title="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.delete_run_permanently')"
                :disabled="state.isRunDeleting(run.runId) || state.isRunArchiving(run.runId)"
                @click.stop="actions.onDeleteRun(run)"
              >
                <Icon icon="heroicons:trash-20-solid" class="h-3.5 w-3.5" />
              </button>
              <span class="text-xs text-gray-400">
                {{ formatRelativeTime(run.lastActivityAt) }}
              </span>
            </div>
          </button>
        </div>
      </div>

      <div
        v-if="workspaceTeams.length > 0"
        class="mt-1 space-y-0.5"
      >
        <div class="px-2 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-gray-400">
          Teams
        </div>
        <div
          v-for="group in groupedTeamDefinitions"
          :key="group.key"
          class="rounded-md"
        >
          <button
            type="button"
            class="flex w-full items-center rounded-md px-2 py-1 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
            :data-test="`workspace-team-definition-row-${group.key}`"
            :aria-expanded="state.isTeamDefinitionExpanded(workspaceNode.workspaceId, group.key)"
            @click="state.toggleTeamDefinition(workspaceNode.workspaceId, group.key)"
          >
            <Icon
              icon="heroicons:chevron-down-20-solid"
              class="mr-1 h-3.5 w-3.5 text-gray-400 transition-transform"
              :class="state.isTeamDefinitionExpanded(workspaceNode.workspaceId, group.key) ? 'rotate-0' : '-rotate-90'"
            />
            <TeamActivityDot
              class="mr-1.5"
              :is-active="group.hasActiveRuns"
              :label="$t(group.hasActiveRuns
                ? 'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.active_team_runs'
                : 'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.no_active_team_runs')"
            />
            <span
              class="mr-1.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-[0.625rem] font-semibold text-gray-600"
            >
              <img
                v-if="avatars.showTeamAvatar(group.representativeRun)"
                :src="avatars.getTeamAvatarUrl(group.representativeRun)"
                :alt="`${group.teamDefinitionName} avatar`"
                class="h-full w-full object-cover"
                @error="avatars.onTeamAvatarError(group.representativeRun)"
              >
              <span v-else>{{ avatars.getTeamInitials(group.teamDefinitionName) }}</span>
            </span>
            <span class="truncate font-medium">{{ group.teamDefinitionName }}</span>
            <span class="ml-1 text-xs text-gray-400">({{ group.runs.length }})</span>
          </button>

          <div v-if="state.isTeamDefinitionExpanded(workspaceNode.workspaceId, group.key)" class="ml-3 mt-0.5 space-y-0.5">
            <div
              v-for="team in group.runs"
              :key="team.teamRunId"
              class="rounded-md"
            >
              <div class="group/team-row flex items-center justify-between rounded-md px-2 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-50">
                <button
                  type="button"
                  class="flex min-w-0 flex-1 items-center text-left"
                  :data-test="`workspace-team-row-${team.teamRunId}`"
                  :aria-expanded="state.isTeamExpanded(team.teamRunId)"
                  @click="actions.onSelectTeam(team, workspaceNode.workspaceId)"
                >
                  <Icon
                    icon="heroicons:chevron-down-20-solid"
                    class="mr-1 h-3.5 w-3.5 flex-shrink-0 text-gray-400 transition-transform"
                    :class="state.isTeamExpanded(team.teamRunId) ? 'rotate-0' : '-rotate-90'"
                    data-test="workspace-team-run-disclosure"
                  />
                  <TeamActivityDot
                    class="mr-1.5"
                    :is-active="team.isActive"
                    :label="$t(team.isActive
                      ? 'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.active_team_run'
                      : 'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.inactive_team_run')"
                  />
                  <span class="truncate font-medium">{{ formatTeamRunLabel(team) }}</span>
                </button>

                <div class="ml-2 flex flex-shrink-0 items-center gap-1">
                  <button
                    v-if="team.isActive"
                    type="button"
                    class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    :title="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.terminate_team')"
                    :aria-label="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.terminate_team')"
                    :disabled="state.isTeamTerminating(team.teamRunId)"
                    @click.stop="actions.onTerminateTeam(team.teamRunId)"
                  >
                    <Icon icon="heroicons:stop-20-solid" class="h-3.5 w-3.5" />
                  </button>
                  <button
                    v-if="!team.isActive && team.deleteLifecycle === 'READY'"
                    type="button"
                    class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-[opacity,color,background-color] duration-150 hover:bg-amber-50 hover:text-amber-600 md:opacity-0 md:group-hover/team-row:opacity-100 md:group-focus-within/team-row:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
                    :title="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.archive_team_history')"
                    :disabled="state.isTeamArchiving(team.teamRunId) || state.isTeamDeleting(team.teamRunId) || state.isTeamTerminating(team.teamRunId)"
                    @click.stop="actions.onArchiveTeam(team)"
                  >
                    <Icon icon="heroicons:archive-box-20-solid" class="h-3.5 w-3.5" />
                  </button>
                  <button
                    v-if="!team.isActive && team.deleteLifecycle === 'READY'"
                    type="button"
                    class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-[opacity,color,background-color] duration-150 hover:bg-red-50 hover:text-red-600 md:opacity-0 md:group-hover/team-row:opacity-100 md:group-focus-within/team-row:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
                    :title="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.delete_team_history_permanently')"
                    :aria-label="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.delete_team_history_permanently')"
                    :disabled="state.isTeamDeleting(team.teamRunId) || state.isTeamArchiving(team.teamRunId) || state.isTeamTerminating(team.teamRunId)"
                    @click.stop="actions.onDeleteTeam(team)"
                  >
                    <Icon icon="heroicons:trash-20-solid" class="h-3.5 w-3.5" />
                  </button>
                  <span class="text-xs text-gray-400">
                    {{ formatRelativeTime(team.lastActivityAt) }}
                  </span>
                </div>
              </div>

              <div v-if="state.isTeamExpanded(team.teamRunId)" class="ml-3 space-y-0.5">
                <template
                  v-for="displayRow in visibleTeamExecutionRows(team)"
                  :key="displayRow.row.rowKey"
                >
                  <div
                    v-if="displayRow.row.kind === 'stable_member'"
                    class="flex w-full cursor-pointer items-center rounded-md text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    :class="isSelectedTeamMember(team, displayRow.row) ? 'bg-indigo-50 text-indigo-900' : 'text-gray-600 hover:bg-gray-50'"
                    :style="teamExecutionRowStyle(displayRow.row)"
                    :data-test="`workspace-team-member-${team.teamRunId}-${displayRow.row.memberAddress}`"
                    data-row-kind="stable_member"
                    :aria-current="isSelectedTeamMember(team, displayRow.row) ? 'true' : undefined"
                    role="button"
                    tabindex="0"
                    @click="activateTeamDisplayRow(team, displayRow.row, displayRow.hasChildren)"
                    @keydown.enter="activateTeamDisplayRow(team, displayRow.row, displayRow.hasChildren)"
                    @keydown.space.prevent="activateTeamDisplayRow(team, displayRow.row, displayRow.hasChildren)"
                  >
                    <button
                      v-if="displayRow.hasChildren"
                      type="button"
                      class="ml-2 mr-1 inline-flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      data-test="workspace-team-member-disclosure"
                      :data-team-run-id="team.teamRunId"
                      :data-member-address="displayRow.row.memberAddress"
                      :aria-expanded="isTeamDisplayRowExpanded(team, displayRow.row)"
                      @click.stop="toggleTeamDisplayRow(team, displayRow.row)"
                      @keydown.enter.stop
                      @keydown.space.stop
                    >
                      <Icon
                        icon="heroicons:chevron-down-20-solid"
                        class="h-3.5 w-3.5 transition-transform"
                        :class="isTeamDisplayRowExpanded(team, displayRow.row) ? 'rotate-0' : '-rotate-90'"
                        aria-hidden="true"
                      />
                    </button>
                    <span
                      v-else
                      class="ml-2 mr-1 h-3.5 w-3.5 flex-shrink-0"
                      aria-hidden="true"
                    />

                    <div class="flex min-w-0 flex-1 items-center justify-between py-1 pr-2">
                      <div class="flex min-w-0 items-center">
                        <StatusDot v-if="displayRow.row.row.kind === 'agent'" class="mr-1.5" :status="displayRow.row.row.currentStatus" />
                        <span
                          class="mr-1.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-[0.5625rem] font-semibold text-gray-600"
                        >
                          <img
                            v-if="avatars.showTeamMemberAvatar(displayRow.row.row)"
                            :src="avatars.getTeamMemberAvatarUrl(displayRow.row.row)"
                            :alt="`${avatars.getTeamMemberDisplayName(displayRow.row.row)} avatar`"
                            class="h-full w-full object-cover"
                            @error="avatars.onTeamMemberAvatarError(displayRow.row.row)"
                          >
                          <span v-else>{{ avatars.getTeamMemberInitials(displayRow.row.row) }}</span>
                        </span>
                        <span class="truncate">{{ displayRow.row.displayName || avatars.getTeamMemberDisplayName(displayRow.row.row) }}</span>
                        <span
                          v-if="displayRow.row.row.kind === 'agent_team'"
                          class="ml-1 rounded bg-slate-100 px-1 text-[0.625rem] font-semibold uppercase tracking-wide text-slate-500"
                        >Team</span>
                      </div>

                      <span class="ml-2 flex-shrink-0 text-xs text-gray-400">
                        {{ state.formatRelativeTime(team.lastActivityAt) }}
                      </span>
                    </div>
                  </div>
                  <WorkspaceTransientExecutionRow
                    v-else
                    :row="displayRow.row"
                    :is-selected="isSelectedTeamMember(team, displayRow.row)"
                    :has-children="displayRow.hasChildren"
                    :expanded="isTeamDisplayRowExpanded(team, displayRow.row)"
                    @select="(row: import('~/stores/runHistoryTypes').RunHistoryTransientExecutionRow) => selectTeamDisplayRow(team, row)"
                    @toggle="(row: import('~/stores/runHistoryTypes').RunHistoryTransientExecutionRow) => toggleTeamDisplayRow(team, row)"
                  />
                </template>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Icon } from '@iconify/vue';
import StatusDot from '~/components/workspace/common/StatusDot.vue';
import TeamActivityDot from '~/components/workspace/common/TeamActivityDot.vue';
import WorkspaceTransientExecutionRow from '~/components/workspace/history/WorkspaceTransientExecutionRow.vue';
import type {
  WorkspaceHistoryAvatarBindings,
  WorkspaceHistorySectionActions,
  WorkspaceHistorySectionState,
} from '~/components/workspace/history/workspaceHistorySectionContracts';
import {
  buildWorkspaceTeamDefinitionDisplayGroups,
  type WorkspaceHistoryTeamDefinitionDisplayGroup,
} from '~/components/workspace/history/workspaceHistoryTeamDefinitionGroups';
import {
  formatRunLabel,
  formatTeamRunLabel,
} from '~/components/workspace/history/workspaceHistoryRunLabels';
import type {
  RunHistoryTeamExecutionRow,
  TeamRunHistoryDefinitionGroup,
  TeamTreeNode,
} from '~/stores/runHistoryTypes';
import type { RunTreeWorkspaceNode } from '~/utils/runTreeProjection';

const props = defineProps<{
  workspaceNode: RunTreeWorkspaceNode;
  workspaceTeams: TeamTreeNode[];
  workspaceTeamHistoryGroups: TeamRunHistoryDefinitionGroup[];
  state: WorkspaceHistorySectionState;
  avatars: WorkspaceHistoryAvatarBindings;
  actions: WorkspaceHistorySectionActions;
}>();

const groupedTeamDefinitions = computed<WorkspaceHistoryTeamDefinitionDisplayGroup[]>(() =>
  buildWorkspaceTeamDefinitionDisplayGroups(
    props.workspaceTeamHistoryGroups,
    props.workspaceTeams,
  ),
);

const relativeTimeTick = ref(0);
let relativeTimeTimer: ReturnType<typeof setInterval> | null = null;
const formatRelativeTime = (isoTime: string): string => {
  void relativeTimeTick.value;
  return props.state.formatRelativeTime(isoTime);
};
onMounted(() => {
  relativeTimeTimer = setInterval(() => { relativeTimeTick.value += 1; }, 60_000);
});
onBeforeUnmount(() => {
  if (relativeTimeTimer !== null) clearInterval(relativeTimeTimer);
});

interface VisibleTeamExecutionRow {
  row: RunHistoryTeamExecutionRow;
  hasChildren: boolean;
}
const isTeamDisplayRowExpanded = (
  team: TeamTreeNode,
  row: RunHistoryTeamExecutionRow,
): boolean => props.state.isTeamMemberExpanded(
  props.workspaceNode.workspaceId,
  team.teamRunId,
  row.rowKey,
);

const toggleTeamDisplayRow = (
  team: TeamTreeNode,
  row: RunHistoryTeamExecutionRow,
): void => props.state.toggleTeamMember(
  props.workspaceNode.workspaceId,
  team.teamRunId,
  row.rowKey,
);

const visibleTeamExecutionRows = (team: TeamTreeNode): VisibleTeamExecutionRow[] => {
  const visibleRows: VisibleTeamExecutionRow[] = [];
  const rows = team.executionRows;
  let collapsedDepth: number | null = null;

  for (const row of rows) {
    if (collapsedDepth !== null) {
      if (row.depth > collapsedDepth) {
        continue;
      }
      collapsedDepth = null;
    }

    const hasChildren = row.hasChildren;
    visibleRows.push({ row, hasChildren });

    if (hasChildren && !isTeamDisplayRowExpanded(team, row)) {
      collapsedDepth = row.depth;
    }
  }

  return visibleRows;
};

const isSelectedTeamMember = (
  team: TeamTreeNode,
  row: RunHistoryTeamExecutionRow,
): boolean => props.state.isTeamRunSelected(team.teamRunId)
  && row.agentRunId !== null
  && row.agentRunId === team.focusedAgentRunId;

const teamExecutionRowStyle = (row: RunHistoryTeamExecutionRow): Record<string, string> => ({ marginLeft: `${row.depth * 12}px` });

const selectTeamDisplayRow = (
  team: TeamTreeNode,
  row: RunHistoryTeamExecutionRow,
): Promise<void> | void => {
  if (!row.agentRunId) return;
  return props.actions.onSelectTeamMember({
    teamRunId: team.teamRunId,
    memberAddress: row.memberAddress,
    agentRunId: row.agentRunId,
  }, props.workspaceNode.workspaceId);
};

const activateTeamDisplayRow = (
  team: TeamTreeNode,
  row: RunHistoryTeamExecutionRow,
  hasChildren: boolean,
): Promise<void> | void => {
  if (hasChildren) toggleTeamDisplayRow(team, row);
  if (!row.agentRunId) return;
  return selectTeamDisplayRow(team, row);
};

</script>
