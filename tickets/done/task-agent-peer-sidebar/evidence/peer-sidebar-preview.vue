<template>
  <main class="min-h-screen bg-slate-100 p-6 text-slate-900">
    <h1 class="mb-4 text-lg font-semibold">Sidebar peer placement — implementation preview</h1>
    <div class="mb-4 flex gap-3">
      <button class="rounded border bg-white px-3 py-1" @click="narrow = !narrow">Toggle narrow sidebar</button>
      <button class="rounded border bg-white px-3 py-1" @click="showTasks = !showTasks">Toggle tasks</button>
    </div>
    <div class="flex gap-6">
      <aside class="shrink-0 rounded border bg-white p-2" :style="{ width: narrow ? '260px' : '360px' }">
        <WorkspaceHistoryWorkspaceSection :workspace-node="workspaceNode" :workspace-teams="[team]"
          :workspace-team-history-groups="[]" :state="state" :actions="actions" :avatars="avatars" />
      </aside>
      <section class="rounded border bg-white p-4"><h2 class="font-semibold">Selected exact execution</h2><p data-test="selection">{{ selected }}</p>
      <p class="mt-3 text-sm text-slate-500">Local rendering fixture; selection events are captured, not backend hydration.</p></section>
    </div>
  </main>
</template>
<script setup lang="ts">
import { computed, ref, reactive } from 'vue';
import WorkspaceHistoryWorkspaceSection from '~/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { buildRunHistoryTeamExecutionRows } from '~/stores/runHistoryTeamExecutionRows';
import type { TeamMemberTreeRow, TeamTreeNode } from '~/stores/runHistoryTypes';
import { buildTestTeamContext, testAgentNode, testTaskRecord } from '~/test-support/currentTeamTestFixtures';
definePageMeta({ layout: false });
const stableAgent = (
  memberAddress: string,
  overrides: Partial<TeamMemberTreeRow> = {},
): TeamMemberTreeRow => ({
  teamRunId: 'team-run-1',
  kind: 'agent',
  memberAddress,
  displayName: memberAddress.split('/').filter(Boolean).at(-1) ?? memberAddress,
  agentRunId: `${memberAddress.replace(/[^a-z0-9]+/gi, '-')}-run`,
  workspaceRootPath: '/ws/a',
  summary: 'Team task summary',
  lastActivityAt: '2026-06-30T00:00:00.000Z',
  currentStatus: AgentStatus.Idle,
  isActive: true,
  deleteLifecycle: 'READY',
  children: [],
  ...overrides,
});

const rootRow = (children: TeamMemberTreeRow[], teamRunId = 'team-run-1'): TeamMemberTreeRow => ({
  teamRunId,
  kind: 'agent_team',
  memberAddress: '/',
  displayName: 'Team Alpha',
  teamDefinitionId: 'team-def-1',
  teamRunIdForNode: teamRunId,
  coordinatorAddress: children[0]?.memberAddress ?? '/worker',
  workspaceRootPath: '/ws/a',
  summary: 'Team task summary',
  lastActivityAt: '2026-06-30T00:00:00.000Z',
  currentStatus: null,
  isActive: true,
  deleteLifecycle: 'READY',
  children,
});


const narrow = ref(false);
const showTasks = ref(true);
const expanded = ref(true);
const selected = ref('worker-run');
const memberExpansion = reactive<Record<string, boolean>>({});
const noop = () => {};
const context = buildTestTeamContext({
  teamRunId: 'team-run-1', coordinatorAddress: '/worker',
  rootChildren: [testAgentNode('/worker', { agentRunId: 'worker-run' }), testAgentNode('/reviewer', { agentRunId: 'reviewer-run' })],
  tasks: ['Review launch notes', 'Check documentation and release readiness'].map((description, index) => testTaskRecord({
    taskId: `task-${index}`, delegatorAgentRunId: 'reviewer-run', recipientAddress: '/worker',
    target: { agentRunId: `task-${index}-run` }, description,
  })),
});
context.view.getAgentContext('task-0-run')!.state.currentStatus = AgentStatus.Running;
const members = [stableAgent('/worker', { agentRunId: 'worker-run' }), stableAgent('/reviewer', { agentRunId: 'reviewer-run' })];
const team = computed(() => {
  const base: TeamTreeNode = {
    teamRunId: 'team-run-1', teamDefinitionId: 'team-def-1', teamDefinitionName: 'Team Alpha',
    workspaceRootPath: '/ws/a', summary: 'Prepare launch', lastActivityAt: '2026-09-26T06:00:00.000Z',
    isActive: true, deleteLifecycle: 'READY', focusedAgentRunId: selected.value,
    rootTeam: rootRow(members), members, executionRows: [],
  };
  base.executionRows = buildRunHistoryTeamExecutionRows(base, showTasks.value ? context : null);
  return base;
});
const workspaceNode = { workspaceId: 'workspace:/ws/a', workspaceRootPath: '/ws/a', workspaceName: 'Workspace A',
  workspaceKind: 'filesystem' as const, canRemoveFromWorkspaces: false, agents: [], stableKey: 'workspace:/ws/a', agentOrgDefinitions: [] };
const state = {
  selectedRunId: null, isTeamRunSelected: () => true,
  isRunTerminating: () => false, isTeamTerminating: () => false, isRunDeleting: () => false, isTeamDeleting: () => false,
  isRunArchiving: () => false, isTeamArchiving: () => false, isWorkspaceRemoving: () => false,
  isWorkspaceHistoryLoading: () => false, workspaceHistoryError: () => null, formatRelativeTime: () => 'now',
  isWorkspaceExpanded: () => true, toggleWorkspace: noop, isAgentExpanded: () => false, toggleAgent: noop,
  isTeamDefinitionExpanded: () => true, toggleTeamDefinition: noop, isTeamExpanded: () => expanded.value,
  isTeamMemberExpanded: (_w: string, _t: string, key: string) => Boolean(memberExpansion[key]),
  toggleTeamMember: (_w: string, _t: string, key: string) => { memberExpansion[key] = !memberExpansion[key]; },
};
const actions = {
  onRemoveWorkspace: noop, onCreateRun: noop, onSelectRun: noop, onTerminateRun: noop, onArchiveRun: noop, onDeleteRun: noop,
  onSelectTeam: () => { expanded.value = !expanded.value; }, onTerminateTeam: noop, onArchiveTeam: noop, onDeleteTeam: noop,
  onSelectTeamMember: (row: { agentRunId?: string | null }) => { selected.value = row.agentRunId!; },
};
const avatars = {
  showAgentAvatar: () => false, onAgentAvatarError: noop, getAgentInitials: () => 'A',
  showTeamAvatar: () => false, getTeamAvatarUrl: () => '', getOrgAvatarUrl: () => '', showOrgAvatar: () => false,
  onOrgAvatarError: noop, onTeamAvatarError: noop, showTeamMemberAvatar: () => false,
  getTeamMemberAvatarUrl: () => '', onTeamMemberAvatarError: noop,
  getTeamMemberDisplayName: (member: TeamMemberTreeRow) => member.displayName,
  getTeamMemberInitials: (member: TeamMemberTreeRow) => member.displayName[0].toUpperCase(),
};
</script>
