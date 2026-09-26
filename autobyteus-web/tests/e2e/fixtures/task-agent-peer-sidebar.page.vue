<template>
  <main data-test="peer-sidebar-probe" class="min-h-screen bg-slate-100 p-4 text-slate-900">
    <h1 class="mb-4 text-xl font-semibold">Task Agent peer history sidebar probe</h1>
    <div class="flex h-[48rem] bg-white">
      <aside data-test="sidebar" class="shrink-0 border-r p-2" :style="{ width: narrow ? '260px' : '360px' }">
        <WorkspaceHistoryWorkspaceSection v-if="workspaceNode" :workspace-node="workspaceNode"
          :workspace-teams="historyTeams" :workspace-team-history-groups="[]"
          :state="sectionState" :actions="actions" :avatars="avatars" />
      </aside>
      <section class="min-w-0 flex-1"><TeamWorkspaceView /></section>
    </div>
  </main>
</template>
<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import WorkspaceHistoryWorkspaceSection from '~/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue';
import TeamWorkspaceView from '~/components/workspace/team/TeamWorkspaceView.vue';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useWorkspaceStore } from '~/stores/workspace';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useWorkspaceHistorySelectionActions } from '~/composables/useWorkspaceHistorySelectionActions';
import { useWorkspaceHistoryTreeState } from '~/composables/useWorkspaceHistoryTreeState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { TeamMemberTreeRow } from '~/stores/runHistoryTypes';
import { buildTestTeamContext, testAgentNode, testSubTeamNode, testTaskRecord } from '~/test-support/currentTeamTestFixtures';
import { isTeamMemberProjectionAuthoritative } from '~/services/runHydration/teamMemberProjectionHydrationService';

definePageMeta({ layout: false });
const ROOT = 'peer-root';
const WORKER = 'peer-worker';
const REVIEWER = 'peer-reviewer';
const TASK_A = 'peer-task-a';
const TASK_B = 'peer-task-b';
const TEAM = 'peer-task-team';
const MEMBER = 'peer-task-team-member';
const NESTED = 'peer-nested-task';
const mode = useRoute().query.mode;
const retained = mode === 'retained';
const empty = mode === 'empty';
const narrow = ref(false);
const noop = () => {};
const started = '2026-09-26T08:00:00.000Z';
const settled = retained ? '2026-09-26T08:10:00.000Z' : null;
const tasks = empty ? [] : [
  testTaskRecord({ taskId: 'peer-a', delegatorAgentRunId: REVIEWER, recipientAddress: '/Worker',
    target: { agentRunId: TASK_A }, description: 'Review launch notes', status: retained ? 'accepted' : 'active' }),
  testTaskRecord({ taskId: 'peer-b', delegatorAgentRunId: REVIEWER, recipientAddress: '/Worker',
    target: { agentRunId: TASK_B }, description: 'Check documentation and release readiness', status: retained ? 'accepted' : 'active' }),
  testTaskRecord({ taskId: 'peer-team', delegatorAgentRunId: REVIEWER, recipientAddress: '/Research',
    target: { teamRunId: TEAM }, description: 'Research task Team', status: retained ? 'accepted' : 'active' }),
  testTaskRecord({ taskId: 'peer-nested', delegatorAgentRunId: MEMBER, recipientAddress: '/Research/Analyst',
    target: { agentRunId: NESTED }, description: 'Nested task Agent proof', status: retained ? 'accepted' : 'active' }),
];
const context = buildTestTeamContext({
  teamRunId: ROOT, teamDefinitionId: 'peer-definition', teamDefinitionName: 'Peer Team',
  coordinatorAddress: '/Reviewer', focusedAgentRunId: REVIEWER, workspaceRootPath: '/peer-fixture',
  isActive: !retained,
  rootChildren: [testAgentNode('/Worker', { agentRunId: WORKER, currentStatus: AgentStatus.Idle }),
    testAgentNode('/Reviewer', { agentRunId: REVIEWER, currentStatus: AgentStatus.Idle }),
    // Existing retained configured-Team shape; not new nested-Team product scope.
    ...(empty ? [] : [testSubTeamNode('/Research', [testAgentNode('/Research/Analyst', { agentRunId: 'peer-configured-analyst' })],
      { teamRunId: 'peer-configured-research', coordinatorAddress: '/Research/Analyst' })])],
  tasks,
  taskExecutions: empty ? [] : [
    ...[TASK_A, TASK_B].map(agent_run_id => ({ kind: 'task_agent' as const, address: '/Worker' as const,
      agent_run_id, platform_agent_run_id: null, started_at: started, settled_at: settled })),
    { kind: 'task_team', address: '/Research', team_run_id: TEAM, started_at: started, settled_at: settled,
      members: [{ kind: 'task_team_agent', address: '/Research/Analyst', agent_run_id: MEMBER, platform_agent_run_id: null }],
      task_executions: [{ kind: 'task_agent', address: '/Research/Analyst', agent_run_id: NESTED,
        platform_agent_run_id: null, started_at: started, settled_at: settled }] },
  ],
});
const teamStore = useAgentTeamContextsStore();
const selectionStore = useAgentSelectionStore();
const runHistoryStore = useRunHistoryStore();
const workspaceStore = useWorkspaceStore();
workspaceStore.workspaces['test-workspace'] = { workspaceId: 'test-workspace', name: 'Peer Workspace',
  absolutePath: '/peer-fixture', workspaceRootPath: '/peer-fixture', workspaceConfig: {}, kind: 'filesystem' };
workspaceStore.workspacesFetched = true;
teamStore.addTeamContext(context);
selectionStore.setRunSelection(ROOT, 'team');
runHistoryStore.refreshRunNavigationTopology('peer-fixture-seed');
const tree = useWorkspaceHistoryTreeState({ runHistoryStore, selectionStore });
const historyTeams = computed(() => runHistoryStore.getTeamNodes('/peer-fixture'));
const workspaceNode = computed(() => runHistoryStore.getTreeNodes().find(row => row.workspaceRootPath === '/peer-fixture'));
const sectionState = {
  ...tree, toggleWorkspace: (node: { stableKey: string }) => tree.toggleWorkspace(node.stableKey), selectedRunId: null, isTeamRunSelected: (id: string) => selectionStore.selectedRunId === id,
  isRunTerminating: () => false, isTeamTerminating: () => false, isRunDeleting: () => false,
  isTeamDeleting: () => false, isRunArchiving: () => false, isTeamArchiving: () => false,
  isWorkspaceRemoving: () => false, isWorkspaceHistoryLoading: () => false,
  workspaceHistoryError: () => null, formatRelativeTime: () => 'now',
};
const actions = {
  onRemoveWorkspace: noop, onTerminateRun: noop, onArchiveRun: noop, onDeleteRun: noop,
  onTerminateTeam: noop, onArchiveTeam: noop, onDeleteTeam: noop,
  ...useWorkspaceHistorySelectionActions({ runHistoryStore, selectionStore,
    setTeamExpanded: tree.setTeamExpanded, toggleTeam: tree.toggleTeam,
    expandTeamMemberAncestors: tree.expandTeamMemberAncestors,
    emitRunSelected: noop, emitRunCreated: noop, presentTeamStreamRecoveryFeedback: noop }),
};
const avatars = {
  showAgentAvatar: () => false, onAgentAvatarError: noop, getAgentInitials: () => 'A',
  showTeamAvatar: () => false, getTeamAvatarUrl: () => '', getOrgAvatarUrl: () => '', showOrgAvatar: () => false,
  onOrgAvatarError: noop, onTeamAvatarError: noop, showTeamMemberAvatar: () => false,
  getTeamMemberAvatarUrl: () => '', onTeamMemberAvatarError: noop,
  getTeamMemberDisplayName: (member: TeamMemberTreeRow) => member.displayName,
  getTeamMemberInitials: (member: TeamMemberTreeRow) => member.displayName[0].toUpperCase(),
};

const probe = {
  narrow: () => { narrow.value = true; },
  revealNested: () => tree.expandTeamMemberAncestors(workspaceNode.value!.stableKey, ROOT, NESTED),
  state: () => ({
    mode: retained ? 'retained' : empty ? 'empty' : 'live',
    focus: context.view.getFocusedAgentRunId(),
    rows: historyTeams.value[0]?.executionRows.map(row => ({ key: row.rowKey, depth: row.depth,
      children: row.hasChildren, agent: row.agentRunId })),
    ancestors: runHistoryStore.getTeamMemberNavigationAncestorRowKeys(ROOT, NESTED),
    taskAncestors: runHistoryStore.getTeamMemberNavigationAncestorRowKeys(ROOT, TASK_A),
    attempts: Object.fromEntries([TASK_A, TASK_B, WORKER, NESTED].map(id => [id, runHistoryStore.getTeamMemberInspectionAttempt(ROOT, id)])),
    authoritative: Object.fromEntries([TASK_A, TASK_B, WORKER, NESTED].map(id => [id, isTeamMemberProjectionAuthoritative(context, id)])),
  }),
};
onMounted(() => { (window as any).__peerSidebarProbe = probe; });
onBeforeUnmount(() => { delete (window as any).__peerSidebarProbe; });
</script>
