<template>
  <!-- The definition groups of one section (a workspace's or a Project's): agent groups, then Teams, then Orgs, with their
       runs and delegated rows. The section owns its own row, expansion key and empty/loading states. Several root
       nodes, so the section's spacing applies to the groups as before. -->
  <div
    v-for="agentNode in node.agents"
    :key="agentNode.agentDefinitionId"
    class="rounded-md"
  >
    <div
      class="group/agent-header flex items-center justify-between rounded-md px-2 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-50"
    >
      <button
        type="button"
        class="flex min-w-0 flex-1 items-center text-left"
        data-test="workspace-agent-row"
        :data-workspace-root="node.workspaceRootPath"
        :data-agent-definition-id="agentNode.agentDefinitionId"
        :aria-expanded="state.isAgentExpanded(workspacePresentationId, agentNode.agentDefinitionId)"
        @click="state.toggleAgent(workspacePresentationId, agentNode.agentDefinitionId)"
      >
        <Icon
          icon="heroicons:chevron-down-20-solid"
          class="mr-1 h-3.5 w-3.5 text-gray-400 transition-transform"
          :class="state.isAgentExpanded(workspacePresentationId, agentNode.agentDefinitionId) ? 'rotate-0' : '-rotate-90'"
        />
        <span
          class="mr-1.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-[0.625rem] font-semibold text-gray-600"
        >
          <img
            v-if="avatars.showAgentAvatar(node.workspaceRootPath, agentNode.agentDefinitionId, agentNode.agentAvatarUrl)"
            :src="agentNode.agentAvatarUrl || ''"
            :alt="`${agentNode.agentName} avatar`"
            class="h-full w-full object-cover"
            @error="avatars.onAgentAvatarError(node.workspaceRootPath, agentNode.agentDefinitionId, agentNode.agentAvatarUrl)"
          >
          <span v-else>{{ avatars.getAgentInitials(agentNode.agentName) }}</span>
        </span>
        <span class="truncate font-medium">{{ agentNode.agentName }}</span>
        <span class="ml-1 text-xs text-gray-400">({{ agentNode.runs.length }})</span>
      </button>

      <div class="ml-2 flex flex-shrink-0 items-center gap-1">
      <button
        v-if="actions.onArchiveAgentGroup && canArchiveAgentGroup(agentNode)"
        type="button"
        :data-test="`workspace-agent-group-archive-${agentNode.agentDefinitionId}`"
        class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-[opacity,color,background-color] duration-150 hover:bg-amber-50 hover:text-amber-600 focus:opacity-100 md:opacity-0 md:group-hover/agent-header:opacity-100 md:group-focus-within/agent-header:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
        :title="$t('workspace.history.groupArchive.archiveAll')"
        :aria-label="$t('workspace.history.groupArchive.archiveAll')"
        :disabled="isGroupArchiving(agentGroupArchiveKey(node.workspaceRootPath, agentNode.agentDefinitionId))"
        @click.stop="actions.onArchiveAgentGroup(node, agentNode)"
      >
        <Icon icon="heroicons:archive-box-20-solid" class="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
        :title="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.new_run_with_this_agent')"
        @click="createAgentRun(agentNode.agentDefinitionId)"
      >
        <Icon icon="heroicons:plus-20-solid" class="h-4 w-4" />
      </button>
      </div>
    </div>

    <div
      v-if="state.isAgentExpanded(workspacePresentationId, agentNode.agentDefinitionId)"
      class="ml-3 space-y-0.5"
    >
      <template v-for="run in agentNode.runs" :key="run.runId">
      <button
        type="button"
        data-test="workspace-agent-run-row"
        :data-run-id="run.runId"
        :aria-current="state.selectedRunId === run.runId && !collaboration.selectedChild(run.runId) ? 'true' : undefined"
        class="group/run-row flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors"
        :class="state.selectedRunId === run.runId && !collaboration.selectedChild(run.runId)
          ? 'bg-indigo-50 text-indigo-900'
          : 'text-gray-700 hover:bg-gray-50'"
        @click="selectAgentRun(run)"
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
            data-test="terminate-agent-run"
            :data-run-id="run.runId"
            class="inline-flex h-5 w-5 items-center justify-center rounded text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:text-gray-400 disabled:hover:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed disabled:opacity-50"
            :title="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.terminate_run')"
            :aria-label="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.terminate_run')"
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
      <!-- Task Agents and task Teams brought into this run with `@`. -->
      <AgentRunTaskRows
        :run-id="run.runId"
        :label="formatRunLabel(run.summary)"
        :run-selected="state.selectedRunId === run.runId"
        :has-collaboration="run.hasCollaboration === true"
        :execution-scope="projectScope?.executionScopeOf('AGENT', run.runId) ?? null"
        @select-run="actions.onSelectRun(run)"
        @open-run="selectAgentRun(run)"
      />
      </template>
    </div>
  </div>

  <div
    v-if="teams.length > 0"
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
      <div class="group/team-header flex items-center rounded-md px-2 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-50">
      <button
        type="button"
        class="flex min-w-0 flex-1 items-center text-left"
        :data-test="`workspace-team-definition-row-${group.key}`"
        :aria-expanded="state.isTeamDefinitionExpanded(workspacePresentationId, group.key)"
        @click="state.toggleTeamDefinition(workspacePresentationId, group.key)"
      >
        <Icon
          icon="heroicons:chevron-down-20-solid"
          class="mr-1 h-3.5 w-3.5 text-gray-400 transition-transform"
          :class="state.isTeamDefinitionExpanded(workspacePresentationId, group.key) ? 'rotate-0' : '-rotate-90'"
        />
        <TeamAggregateStatusDot
          class="mr-1.5"
          :status="teamDefinitionGroupStatus(group.runs)"
        />
        <span
          class="mr-1.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-[0.625rem] font-semibold text-gray-600"
        >
          <img
            v-if="avatars.showTeamAvatar(group.representativeRun)"
            :key="avatars.getTeamAvatarUrl(group.representativeRun)"
            :src="avatars.getTeamAvatarUrl(group.representativeRun)"
            :alt="`${group.teamDefinitionName} avatar`"
            class="h-full w-full object-cover"
            @error="avatars.onTeamAvatarError(group.representativeRun, ($event.target as HTMLImageElement).getAttribute('src') || '')"
          >
          <Icon v-else icon="heroicons:user-group-20-solid" class="h-3.5 w-3.5" />
        </span>
        <span class="truncate font-medium">{{ group.teamDefinitionName }}</span>
        <span class="ml-1 text-xs text-gray-400">({{ group.runs.length }})</span>
      </button>
      <button
        v-if="actions.onArchiveTeamGroup"
        type="button"
        :data-test="`workspace-team-group-archive-${group.key}`"
        class="ml-2 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-gray-400 transition-[opacity,color,background-color] duration-150 hover:bg-amber-50 hover:text-amber-600 focus:opacity-100 md:opacity-0 md:group-hover/team-header:opacity-100 md:group-focus-within/team-header:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
        :title="$t('workspace.history.groupArchive.archiveAll')"
        :aria-label="$t('workspace.history.groupArchive.archiveAll')"
        :disabled="isGroupArchiving(teamGroupArchiveKey(workspacePresentationId, group.key))"
        @click.stop="actions.onArchiveTeamGroup(workspacePresentationId, group)"
      >
        <Icon icon="heroicons:archive-box-20-solid" class="h-3.5 w-3.5" />
      </button>
      <!-- Projects mode only (DEC-017): another run of this Team under the Project. -->
      <button
        v-if="projectScope && actions.onCreateProjectRun"
        type="button"
        :data-test="`project-team-group-add-${group.key}`"
        class="ml-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        :title="$t('projectsTree.newTeamRun')"
        :aria-label="$t('projectsTree.newTeamRun')"
        @click.stop="actions.onCreateProjectRun(projectScope.projectId, { kind: 'team', definitionId: group.teamDefinitionId })"
      >
        <Icon icon="heroicons:plus-20-solid" class="h-4 w-4" aria-hidden="true" />
      </button>
      </div>

      <div v-if="state.isTeamDefinitionExpanded(workspacePresentationId, group.key)" class="ml-3 mt-0.5 space-y-0.5">
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
              @click="actions.onSelectTeam(team, node.workspaceId)"
            >
              <Icon
                icon="heroicons:chevron-down-20-solid"
                class="mr-1 h-3.5 w-3.5 flex-shrink-0 text-gray-400 transition-transform"
                :class="state.isTeamExpanded(team.teamRunId) ? 'rotate-0' : '-rotate-90'"
                data-test="workspace-team-run-disclosure"
              />
              <TeamAggregateStatusDot
                class="mr-1.5"
                :status="teamRunStatus(team)"
              />
              <span class="truncate font-medium">{{ formatTeamRunLabel(team) }}</span>
            </button>

            <div class="ml-2 flex flex-shrink-0 items-center gap-1">
              <button
                v-if="team.isActive"
                type="button"
                class="inline-flex h-5 w-5 items-center justify-center rounded text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:text-gray-400 disabled:hover:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed disabled:opacity-50"
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

          <WorkspaceTeamExecutionTree
            v-if="state.isTeamExpanded(team.teamRunId)"
            :team="team"
            :tree-label="formatTeamRunLabel(team)"
            :avatars="avatars"
            :is-team-selected="state.isTeamRunSelected(team.teamRunId)"
            :is-row-expanded="(rowKey: string) => isTeamDisplayRowExpanded(team, rowKey)"
            :format-relative-time="formatRelativeTime"
            :execution-scope="projectScope?.executionScopeOf('AGENT_TEAM', team.teamRunId) ?? null"
            @select="(row: import('~/stores/runHistoryTypes').RunHistoryTeamExecutionRow) => selectTeamDisplayRow(team, row)"
            @toggle="(row: import('~/stores/runHistoryTypes').RunHistoryTeamExecutionRow) => toggleTeamDisplayRow(team, row)"
            @open-run="actions.onOpenTeamRun(team, node.workspaceId)"
          />
        </div>
      </div>
    </div>
  </div>

  <WorkspaceAgentOrgHistoryCollection
    :avatars="avatars"
    :workspace-id="workspacePresentationId"
    :groups="node.agentOrgDefinitions ?? []"
    :state="state"
    :actions="actions"
    :execution-scope-of="projectScope ? (rootRunId: string) => projectScope!.executionScopeOf('AGENT_ORG', rootRunId) : null"
  />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Icon } from '@iconify/vue';
import StatusDot from '~/components/workspace/common/StatusDot.vue';
import TeamAggregateStatusDot from '~/components/workspace/history/TeamAggregateStatusDot.vue';
import { teamDefinitionGroupStatus, teamRunStatus } from '~/components/workspace/history/workspaceHistoryTeamBranchStatus';
import WorkspaceTeamExecutionTree from '~/components/workspace/history/WorkspaceTeamExecutionTree.vue';
import WorkspaceAgentOrgHistoryCollection from '~/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue';
import AgentRunTaskRows from '~/components/workspace/history/AgentRunTaskRows.vue';
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore';
import type {
  ProjectSectionScope,
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
  WorkspaceHistoryWorkspaceNode,
} from '~/stores/runHistoryTypes';
import {
  agentGroupArchiveKey,
  canArchiveAgentGroup,
  teamGroupArchiveKey,
} from '~/composables/useWorkspaceHistoryGroupArchive';

const props = defineProps<{
  /** The section's node: its agent groups and Org groups; its `stableKey` keys the groups' expansion. */
  node: WorkspaceHistoryWorkspaceNode;
  teams: TeamTreeNode[];
  teamHistoryGroups: TeamRunHistoryDefinitionGroup[];
  state: WorkspaceHistorySectionState;
  avatars: WorkspaceHistoryAvatarBindings;
  actions: WorkspaceHistorySectionActions;
  /** Projects mode: the node is a Project; "+" starts under it and delegated rows show only its work. */
  projectScope?: ProjectSectionScope | null;
}>();
const collaboration = useAgentRunCollaborationStore();
/** The run row shows the run's own agent again (not a task child under it). */
const selectAgentRun = (run: Parameters<typeof props.actions.onSelectRun>[0]) => {
  collaboration.selectChild(run.runId, null);
  return props.actions.onSelectRun(run);
};
const workspacePresentationId = computed(() => props.node.stableKey);
/** "+" on an agent group: another run of that agent, in the folder (Workspaces) or under the Project (Projects). */
const createAgentRun = (agentDefinitionId: string) => props.projectScope
  ? props.actions.onCreateProjectRun?.(props.projectScope.projectId, { kind: 'agent', definitionId: agentDefinitionId })
  : props.actions.onCreateRun(props.node.workspaceRootPath, agentDefinitionId);
const isGroupArchiving = (groupKey: string): boolean => props.state.isGroupArchiving?.(groupKey) ?? false;

const groupedTeamDefinitions = computed<WorkspaceHistoryTeamDefinitionDisplayGroup[]>(() =>
  buildWorkspaceTeamDefinitionDisplayGroups(
    props.teamHistoryGroups,
    props.teams,
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

const isTeamDisplayRowExpanded = (
  team: TeamTreeNode,
  rowKey: string,
): boolean => props.state.isTeamMemberExpanded(
  workspacePresentationId.value,
  team.teamRunId,
  rowKey,
);

const toggleTeamDisplayRow = (
  team: TeamTreeNode,
  row: RunHistoryTeamExecutionRow,
): void => props.state.toggleTeamMember(
  workspacePresentationId.value,
  team.teamRunId,
  row.rowKey,
);

const selectTeamDisplayRow = (
  team: TeamTreeNode,
  row: RunHistoryTeamExecutionRow,
): Promise<void> | void => {
  if (!row.agentRunId) return;
  return props.actions.onSelectTeamMember({
    teamRunId: team.teamRunId,
    memberAddress: row.memberAddress,
    agentRunId: row.agentRunId,
  }, props.node.workspaceId);
};
</script>
