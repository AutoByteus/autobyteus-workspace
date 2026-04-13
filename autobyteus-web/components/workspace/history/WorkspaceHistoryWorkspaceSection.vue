<template>
  <section class="rounded-md">
    <button
      type="button"
      class="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
      @click="state.toggleWorkspace(workspaceNode.workspaceRootPath)"
    >
      <Icon
        icon="heroicons:chevron-down-20-solid"
        class="mr-1.5 h-4 w-4 text-gray-400 transition-transform"
        :class="state.isWorkspaceExpanded(workspaceNode.workspaceRootPath) ? 'rotate-0' : '-rotate-90'"
      />
      <Icon icon="heroicons:folder-20-solid" class="mr-1.5 h-4 w-4 text-gray-500" />
      <span class="truncate">{{ workspaceNode.workspaceName }}</span>
    </button>

    <div v-if="state.isWorkspaceExpanded(workspaceNode.workspaceRootPath)" class="ml-2 mt-0.5 space-y-1">
      <div
        v-if="workspaceNode.agents.length === 0 && workspaceTeams.length === 0"
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
            @click="state.toggleAgent(workspaceNode.workspaceRootPath, agentNode.agentDefinitionId)"
          >
            <Icon
              icon="heroicons:chevron-down-20-solid"
              class="mr-1 h-3.5 w-3.5 text-gray-400 transition-transform"
              :class="state.isAgentExpanded(workspaceNode.workspaceRootPath, agentNode.agentDefinitionId) ? 'rotate-0' : '-rotate-90'"
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
          v-if="state.isAgentExpanded(workspaceNode.workspaceRootPath, agentNode.agentDefinitionId)"
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
              <span
                v-if="run.isActive"
                class="mr-2 inline-block h-2 w-2 flex-shrink-0 rounded-full"
                :class="state.activeStatusClass"
              />
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
                class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-[opacity,color,background-color] duration-150 hover:bg-red-50 hover:text-red-600 md:opacity-0 md:group-hover/run-row:opacity-100 md:group-focus-within/run-row:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
                :title="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.delete_run_permanently')"
                :disabled="state.isRunDeleting(run.runId)"
                @click.stop="actions.onDeleteRun(run)"
              >
                <Icon icon="heroicons:trash-20-solid" class="h-3.5 w-3.5" />
              </button>
              <span class="text-xs text-gray-400">
                {{ state.formatRelativeTime(run.lastActivityAt) }}
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
            @click="toggleTeamDefinition(group.key)"
          >
            <Icon
              icon="heroicons:chevron-down-20-solid"
              class="mr-1 h-3.5 w-3.5 text-gray-400 transition-transform"
              :class="isTeamDefinitionExpanded(group.key) ? 'rotate-0' : '-rotate-90'"
            />
            <span
              class="mr-1.5 inline-block h-2 w-2 flex-shrink-0 rounded-full"
              :class="state.teamStatusClass(group.status)"
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

          <div v-if="isTeamDefinitionExpanded(group.key)" class="ml-3 mt-0.5 space-y-0.5">
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
                  @click="actions.onSelectTeam(team)"
                >
                  <Icon
                    icon="heroicons:chevron-down-20-solid"
                    class="mr-1 h-3.5 w-3.5 text-gray-400 transition-transform"
                    :class="state.isTeamExpanded(team.teamRunId) ? 'rotate-0' : '-rotate-90'"
                  />
                  <span
                    class="mr-1.5 inline-block h-2 w-2 flex-shrink-0 rounded-full"
                    :class="state.teamStatusClass(team.currentStatus)"
                  />
                  <span class="truncate font-medium">{{ formatTeamRunLabel(team) }}</span>
                </button>

                <div class="ml-2 flex flex-shrink-0 items-center gap-1">
                  <button
                    v-if="team.teamRunId.startsWith('temp-')"
                    type="button"
                    class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-[opacity,color,background-color] duration-150 hover:bg-red-50 hover:text-red-600 md:opacity-0 md:group-hover/team-row:opacity-100 md:group-focus-within/team-row:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
                    :title="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.remove_draft_team')"
                    :disabled="state.isTeamDeleting(team.teamRunId)"
                    @click.stop="actions.onDeleteTeam(team)"
                  >
                    <Icon icon="heroicons:trash-20-solid" class="h-3.5 w-3.5" />
                  </button>
                  <button
                    v-else-if="state.canTerminateTeam(team.currentStatus)"
                    type="button"
                    class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    :title="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.terminate_team')"
                    :disabled="state.isTeamTerminating(team.teamRunId)"
                    @click.stop="actions.onTerminateTeam(team.teamRunId)"
                  >
                    <Icon icon="heroicons:stop-20-solid" class="h-3.5 w-3.5" />
                  </button>
                  <button
                    v-else-if="team.deleteLifecycle === 'READY'"
                    type="button"
                    class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-[opacity,color,background-color] duration-150 hover:bg-red-50 hover:text-red-600 md:opacity-0 md:group-hover/team-row:opacity-100 md:group-focus-within/team-row:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
                    :title="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.delete_team_history_permanently')"
                    :disabled="state.isTeamDeleting(team.teamRunId)"
                    @click.stop="actions.onDeleteTeam(team)"
                  >
                    <Icon icon="heroicons:trash-20-solid" class="h-3.5 w-3.5" />
                  </button>
                  <span class="text-xs text-gray-400">
                    {{ state.formatRelativeTime(team.lastActivityAt) }}
                  </span>
                </div>
              </div>

              <div v-if="state.isTeamExpanded(team.teamRunId)" class="ml-3 space-y-0.5">
                <button
                  v-for="member in team.members"
                  :key="member.memberRouteKey"
                  type="button"
                  class="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-sm transition-colors"
                  :class="member.memberRouteKey === team.focusedMemberName ? 'bg-indigo-50 text-indigo-900' : 'text-gray-600 hover:bg-gray-50'"
                  :data-test="`workspace-team-member-${team.teamRunId}-${member.memberRouteKey}`"
                  @click="actions.onSelectTeamMember(member)"
                >
                  <div class="flex min-w-0 items-center">
                    <span
                      class="mr-1.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-[0.5625rem] font-semibold text-gray-600"
                    >
                      <img
                        v-if="avatars.showTeamMemberAvatar(member)"
                        :src="avatars.getTeamMemberAvatarUrl(member)"
                        :alt="`${avatars.getTeamMemberDisplayName(member)} avatar`"
                        class="h-full w-full object-cover"
                        @error="avatars.onTeamMemberAvatarError(member)"
                      >
                      <span v-else>{{ avatars.getTeamMemberInitials(member) }}</span>
                    </span>
                    <span class="truncate">{{ avatars.getTeamMemberDisplayName(member) }}</span>
                  </div>
                  <span class="ml-2 text-xs text-gray-400">
                    {{ state.formatRelativeTime(team.lastActivityAt) }}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Icon } from '@iconify/vue';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import type {
  WorkspaceHistoryAvatarBindings,
  WorkspaceHistorySectionActions,
  WorkspaceHistorySectionState,
} from '~/components/workspace/history/workspaceHistorySectionContracts';
import type { TeamRunHistoryDefinitionGroup, TeamTreeNode } from '~/stores/runHistoryTypes';
import type { RunTreeWorkspaceNode } from '~/utils/runTreeProjection';

type TeamDefinitionGroup = {
  key: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  runs: TeamTreeNode[];
  representativeRun: TeamTreeNode;
  status: AgentTeamStatus;
};

const props = defineProps<{
  workspaceNode: RunTreeWorkspaceNode;
  workspaceTeams: TeamTreeNode[];
  workspaceTeamHistoryGroups: TeamRunHistoryDefinitionGroup[];
  state: WorkspaceHistorySectionState;
  avatars: WorkspaceHistoryAvatarBindings;
  actions: WorkspaceHistorySectionActions;
}>();

const expandedTeamDefinitions = ref<Record<string, boolean>>({});

const resolveTeamDefinitionGroupKey = (team: Pick<TeamTreeNode, 'teamDefinitionId' | 'teamDefinitionName' | 'teamRunId'>): string =>
  team.teamDefinitionId?.trim() || team.teamDefinitionName?.trim() || 'team';

const buildDisplayGroupsFromTeamNodes = (teams: TeamTreeNode[]): TeamDefinitionGroup[] => {
  const groups = new Map<string, TeamDefinitionGroup>();

  for (const team of teams) {
    const key = resolveTeamDefinitionGroupKey(team);
    const existing = groups.get(key);
    if (existing) {
      existing.runs.push(team);
      if (existing.representativeRun.lastActivityAt < team.lastActivityAt) {
        existing.representativeRun = team;
        existing.status = team.currentStatus;
      }
      continue;
    }

    groups.set(key, {
      key,
      teamDefinitionId: team.teamDefinitionId,
      teamDefinitionName: team.teamDefinitionName || 'Team',
      runs: [team],
      representativeRun: team,
      status: team.currentStatus,
    });
  }

  return Array.from(groups.values());
};

const buildDisplayGroupsFromHistory = (
  historyGroups: TeamRunHistoryDefinitionGroup[],
  teamNodes: TeamTreeNode[],
): TeamDefinitionGroup[] => {
  const teamNodeByRunId = new Map(teamNodes.map((team) => [team.teamRunId, team]));
  const seenRunIds = new Set<string>();
  const displayGroups: TeamDefinitionGroup[] = [];

  for (const historyGroup of historyGroups) {
    const runs = historyGroup.runs
      .map((run) => {
        const node = teamNodeByRunId.get(run.teamRunId) ?? null;
        if (node) {
          seenRunIds.add(node.teamRunId);
        }
        return node;
      })
      .filter((team): team is TeamTreeNode => team !== null);

    if (runs.length === 0) {
      continue;
    }

    let representativeRun = runs[0]!;
    for (const run of runs) {
      if (representativeRun.lastActivityAt < run.lastActivityAt) {
        representativeRun = run;
      }
    }

    displayGroups.push({
      key:
        historyGroup.teamDefinitionId.trim()
        || historyGroup.teamDefinitionName.trim()
        || representativeRun.teamRunId,
      teamDefinitionId: historyGroup.teamDefinitionId,
      teamDefinitionName: historyGroup.teamDefinitionName || representativeRun.teamDefinitionName || 'Team',
      runs,
      representativeRun,
      status: representativeRun.currentStatus,
    });
  }

  const leftoverRuns = teamNodes.filter((team) => !seenRunIds.has(team.teamRunId));
  if (leftoverRuns.length > 0) {
    displayGroups.push(...buildDisplayGroupsFromTeamNodes(leftoverRuns));
  }

  return displayGroups;
};

const groupedTeamDefinitions = computed<TeamDefinitionGroup[]>(() => {
  if (props.workspaceTeamHistoryGroups.length === 0) {
    return buildDisplayGroupsFromTeamNodes(props.workspaceTeams);
  }
  return buildDisplayGroupsFromHistory(props.workspaceTeamHistoryGroups, props.workspaceTeams);
});

const isTeamDefinitionExpanded = (groupKey: string): boolean =>
  expandedTeamDefinitions.value[groupKey] ?? true;

const toggleTeamDefinition = (groupKey: string): void => {
  expandedTeamDefinitions.value = {
    ...expandedTeamDefinitions.value,
    [groupKey]: !isTeamDefinitionExpanded(groupKey),
  };
};

const USER_REQUIREMENT_PREFIX = /^\s*(?:\*\*)?\s*(?:\[\s*user requirement\s*\]|user requirement)\s*(?:\*\*)?\s*[:\-]?\s*/i;

const stripSummaryPrefix = (summary: string | null | undefined): string => {
  const trimmed = summary?.trim() || '';
  if (!trimmed) {
    return '';
  }
  return trimmed.replace(USER_REQUIREMENT_PREFIX, '').trim();
};

const formatRunLabel = (summary: string | null | undefined): string => {
  const cleaned = stripSummaryPrefix(summary);
  return cleaned.length > 0 ? cleaned : 'Untitled task';
};

const formatTeamRunLabel = (team: TeamTreeNode): string => {
  const cleaned = stripSummaryPrefix(team.summary);
  return cleaned.length > 0 ? cleaned : 'Untitled team run';
};
</script>
