<template>
  <main data-test="selection-probe" class="min-h-screen bg-slate-100 p-6 text-slate-900">
    <header class="mx-auto mb-6 max-w-4xl rounded-lg bg-white p-4 shadow-sm">
      <h1 class="text-xl font-semibold">Event-monitor single-selection browser probe</h1>
      <p data-test="selection-state">type={{ selectedType }} run={{ selectedTeamRunId || 'none' }}</p>
      <div class="mt-3 flex gap-2">
        <button data-test="select-team-a-stable" type="button" @click="selectTeam('team-run-a', 'reviewer')">Select A stable</button>
        <button data-test="select-team-b-transient" type="button" @click="selectTeam('team-run-b', 'task-b')">Select B transient</button>
        <button data-test="clear-selection" type="button" @click="clearSelection">Clear</button>
      </div>
    </header>
    <section class="mx-auto max-w-4xl rounded-lg bg-white p-4 shadow-sm">
      <WorkspaceHistoryWorkspaceSection
        :workspace-node="workspaceNode"
        :workspace-teams="teams"
        :workspace-team-history-groups="[]"
        :state="state"
        :avatars="avatars"
        :actions="actions"
      />
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import WorkspaceHistoryWorkspaceSection from '~/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { RunHistoryTeamExecutionRow, TeamMemberTreeRow, TeamTreeNode } from '~/stores/runHistoryTypes';
import type { RunTreeWorkspaceNode } from '~/utils/runTreeProjection';
import type {
  WorkspaceHistoryAvatarBindings,
  WorkspaceHistorySectionActions,
  WorkspaceHistorySectionState,
} from '~/components/workspace/history/workspaceHistorySectionContracts';

const selectedType = ref<'agent' | 'team' | null>('team');
const selectedTeamRunId = ref<string | null>('team-run-a');
const focusedRouteByTeam = reactive<Record<string, string>>({ 'team-run-a': 'reviewer', 'team-run-b': 'task-b' });
const expandedTeams = reactive<Record<string, boolean>>({ 'team-run-a': true, 'team-run-b': true });

const stableMember = (teamRunId: string, routeKey: string): TeamMemberTreeRow => ({
  teamRunId,
  memberKind: 'agent',
  memberRouteKey: routeKey,
  memberPath: [routeKey],
  memberName: routeKey,
  displayName: `${teamRunId} ${routeKey}`,
  memberRunId: `${teamRunId}-${routeKey}-run`,
  workspaceRootPath: '/probe',
  summary: 'Stable member',
  lastActivityAt: '2026-08-11T00:00:00.000Z',
  currentStatus: AgentStatus.Running,
  isActive: true,
  deleteLifecycle: 'READY',
  children: [],
});

const teamFor = (teamRunId: string, transientRouteKey: string): TeamTreeNode => {
  const stable = stableMember(teamRunId, 'reviewer');
  const rows: RunHistoryTeamExecutionRow[] = [
    { kind: 'stable_member', teamRunId, memberKind: 'agent', memberRouteKey: 'reviewer', memberPath: ['reviewer'], displayName: `${teamRunId} reviewer`, depth: 0, hasChildren: false, row: stable },
    { kind: 'transient_execution', transientKind: 'task_agent', teamRunId, memberKind: 'agent', memberRouteKey: transientRouteKey, memberPath: [transientRouteKey], displayName: `${teamRunId} transient`, depth: 0, hasChildren: false, currentStatus: 'RUNNING' },
  ];
  return {
    teamRunId,
    teamDefinitionId: 'selection-probe-team',
    teamDefinitionName: 'Selection Probe Team',
    workspaceRootPath: '/probe',
    summary: `${teamRunId} summary`,
    lastActivityAt: '2026-08-11T00:00:00.000Z',
    isActive: true,
    deleteLifecycle: 'READY',
    focusedMemberRouteKey: focusedRouteByTeam[teamRunId] || 'reviewer',
    members: [stable],
    memberTree: [stable],
    executionRows: rows,
  };
};

const teams = computed(() => [teamFor('team-run-a', 'task-a'), teamFor('team-run-b', 'task-b')]);
const workspaceNode: RunTreeWorkspaceNode = {
  workspaceId: 'workspace:probe',
  workspaceRootPath: '/probe',
  workspaceName: 'Selection Probe Workspace',
  workspaceKind: 'filesystem',
  canRemoveFromWorkspaces: false,
  agents: [],
};

const selectTeam = (teamRunId: string, memberRouteKey: string) => {
  selectedType.value = 'team';
  selectedTeamRunId.value = teamRunId;
  focusedRouteByTeam[teamRunId] = memberRouteKey;
};
const clearSelection = () => {
  selectedType.value = null;
  selectedTeamRunId.value = null;
};

const state: WorkspaceHistorySectionState = {
  selectedRunId: null,
  isTeamRunSelected: (teamRunId) => selectedType.value === 'team' && selectedTeamRunId.value === teamRunId,
  isRunTerminating: () => false,
  isTeamTerminating: () => false,
  isRunDeleting: () => false,
  isTeamDeleting: () => false,
  isRunArchiving: () => false,
  isTeamArchiving: () => false,
  isWorkspaceRemoving: () => false,
  isWorkspaceHistoryLoading: () => false,
  workspaceHistoryError: () => null,
  formatRelativeTime: () => 'now',
  isWorkspaceExpanded: () => true,
  toggleWorkspace: () => {},
  isAgentExpanded: () => false,
  toggleAgent: () => {},
  isTeamDefinitionExpanded: () => true,
  toggleTeamDefinition: () => {},
  isTeamExpanded: (teamRunId) => expandedTeams[teamRunId] ?? false,
  isTeamMemberExpanded: () => false,
  toggleTeamMember: () => {},
  canTerminateTeam: () => false,
};

const actions: WorkspaceHistorySectionActions = {
  onRemoveWorkspace: () => {}, onCreateRun: () => {}, onSelectRun: () => {}, onTerminateRun: () => {},
  onArchiveRun: () => {}, onDeleteRun: () => {}, onTerminateTeam: () => {}, onArchiveTeam: () => {},
  onDeleteTeam: () => {}, onSelectTeam: (team) => selectTeam(team.teamRunId, team.focusedMemberRouteKey),
  onSelectTeamMember: (row) => selectTeam(row.teamRunId, row.memberRouteKey),
};

const avatars: WorkspaceHistoryAvatarBindings = {
  showAgentAvatar: () => false, onAgentAvatarError: () => {}, getAgentInitials: () => 'A',
  showTeamAvatar: () => false, getTeamAvatarUrl: () => '', onTeamAvatarError: () => {}, getTeamInitials: () => 'SP',
  showTeamMemberAvatar: () => false, getTeamMemberAvatarUrl: () => '', onTeamMemberAvatarError: () => {},
  getTeamMemberDisplayName: (member) => member.displayName || member.memberName, getTeamMemberInitials: () => 'M',
};
</script>
