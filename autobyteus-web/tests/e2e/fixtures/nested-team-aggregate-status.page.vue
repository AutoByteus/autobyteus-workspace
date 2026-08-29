<template>
  <main data-test="nested-team-aggregate-status-probe" class="min-h-screen bg-slate-100 p-6 text-slate-900">
    <header class="mx-auto mb-6 max-w-3xl rounded-lg bg-white p-4 shadow-sm">
      <h1 class="text-xl font-semibold">Nested Team aggregate status probe</h1>
      <p data-test="resolved-locale" class="mt-1 text-sm text-slate-600">{{ resolvedLocale }}</p>
      <p data-test="interaction-counters" class="mt-1 text-sm text-slate-600">
        toggles={{ toggleCount }} memberSelections={{ memberSelectionCount }} teamSelections={{ teamSelectionCount }}
      </p>
    </header>

    <section data-test="history-surface" class="mx-auto max-w-3xl rounded-lg bg-white p-4 shadow-sm">
      <WorkspaceHistoryWorkspaceSection
        :workspace-node="workspaceNode"
        :workspace-teams="workspaceTeams"
        :workspace-team-history-groups="[]"
        :state="historyState"
        :avatars="avatars"
        :actions="actions"
      />
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import WorkspaceHistoryWorkspaceSection from '~/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue';
import { useLocalization } from '~/composables/useLocalization';
import type {
  WorkspaceHistoryAvatarBindings,
  WorkspaceHistorySectionActions,
  WorkspaceHistorySectionState,
} from '~/components/workspace/history/workspaceHistorySectionContracts';
import type {
  RunHistoryStableExecutionRow,
  RunHistoryTeamExecutionRow,
  RunHistoryTransientExecutionRow,
  TeamMemberTreeRow,
  TeamTreeNode,
} from '~/stores/runHistoryTypes';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { RunTreeWorkspaceNode } from '~/utils/runTreeProjection';

const TEAM_RUN_ID = 'aggregate-browser-team-run';
const PRODUCT_TEAM_KEY = 'team:aggregate-product-team-run';
const DEEP_TEAM_KEY = 'team:aggregate-deep-team-run';
const SIBLING_TEAM_KEY = 'team:aggregate-sibling-team-run';
const EMPTY_TEAM_KEY = 'team:aggregate-empty-team-run';

const { resolvedLocale, setPreference } = useLocalization();
const directStatus = ref<AgentStatus>(AgentStatus.Idle);
const deepStatus = ref<AgentStatus>(AgentStatus.Offline);
const taskStatus = ref<AgentStatus | string | null>(AgentStatus.Running);
const siblingStatus = ref<AgentStatus>(AgentStatus.Offline);
const expandedMembers = reactive<Record<string, boolean>>({});
const toggleCount = ref(0);
const memberSelectionCount = ref(0);
const teamSelectionCount = ref(0);

const stableAgent = (
  memberAddress: string,
  displayName: string,
  agentRunId: string,
  status: AgentStatus,
): TeamMemberTreeRow => ({
  teamRunId: TEAM_RUN_ID,
  kind: 'agent',
  memberAddress,
  displayName,
  agentRunId,
  teamRunIdForNode: null,
  workspaceRootPath: '/api-e2e-aggregate',
  summary: 'Deterministic browser fixture Agent',
  lastActivityAt: '2026-08-29T00:00:00.000Z',
  currentStatus: status,
  isActive: status !== AgentStatus.Offline,
  deleteLifecycle: 'READY',
  children: [],
});

const stableTeam = (
  memberAddress: string,
  displayName: string,
  teamRunIdForNode: string,
  children: TeamMemberTreeRow[],
): TeamMemberTreeRow => ({
  teamRunId: TEAM_RUN_ID,
  kind: 'agent_team',
  memberAddress,
  displayName,
  agentRunId: null,
  teamDefinitionId: `${teamRunIdForNode}-definition`,
  teamRunIdForNode,
  coordinatorAddress: children.find((child) => child.kind === 'agent')?.memberAddress ?? null,
  workspaceRootPath: '/api-e2e-aggregate',
  summary: 'Deterministic browser fixture Team',
  lastActivityAt: '2026-08-29T00:00:00.000Z',
  currentStatus: null,
  isActive: true,
  deleteLifecycle: 'READY',
  children,
});

const stableExecutionRow = (
  row: TeamMemberTreeRow,
  rowKey: string,
  depth: number,
  hasChildren: boolean,
): RunHistoryStableExecutionRow => ({
  kind: 'stable_member',
  rowKey,
  teamRunId: TEAM_RUN_ID,
  memberAddress: row.memberAddress,
  agentRunId: row.agentRunId ?? null,
  teamRunIdForNode: row.teamRunIdForNode ?? null,
  memberKind: row.kind,
  displayName: row.displayName,
  depth,
  hasChildren,
  row,
});

const taskTeamChildRow = (): RunHistoryTransientExecutionRow => ({
  kind: 'transient_execution',
  transientKind: 'task_team_child',
  rowKey: 'task-team-child:aggregate-task-worker-run',
  teamRunId: TEAM_RUN_ID,
  memberAddress: '/product_team/deep_team/task_worker',
  agentRunId: 'aggregate-task-worker-run',
  teamRunIdForNode: null,
  memberKind: 'agent',
  displayName: 'Task: task_worker',
  currentStatus: taskStatus.value,
  depth: 2,
  hasChildren: false,
});

const rootTaskTeamRow = (): RunHistoryTransientExecutionRow => ({
  kind: 'transient_execution',
  transientKind: 'task_team',
  rowKey: 'task-team:aggregate-outside-task-team-run',
  teamRunId: TEAM_RUN_ID,
  memberAddress: '/outside_task_team',
  agentRunId: null,
  teamRunIdForNode: 'aggregate-outside-task-team-run',
  memberKind: 'agent_team',
  displayName: 'Task: Outside Team',
  currentStatus: AgentStatus.Running,
  depth: 0,
  hasChildren: false,
});

const fixtureTree = computed(() => {
  const directAgent = stableAgent(
    '/product_team/direct_agent',
    'direct_agent',
    'aggregate-direct-agent-run',
    directStatus.value,
  );
  const deepAgent = stableAgent(
    '/product_team/deep_team/deep_agent',
    'deep_agent',
    'aggregate-deep-agent-run',
    deepStatus.value,
  );
  const deepTeam = stableTeam(
    '/product_team/deep_team',
    'Deep Configured Team',
    'aggregate-deep-team-run',
    [deepAgent],
  );
  const productTeam = stableTeam(
    '/product_team',
    'Product Design & Prototyping Team',
    'aggregate-product-team-run',
    [directAgent, deepTeam],
  );
  const siblingAgent = stableAgent(
    '/sibling_team/sibling_agent',
    'sibling_agent',
    'aggregate-sibling-agent-run',
    siblingStatus.value,
  );
  const siblingTeam = stableTeam(
    '/sibling_team',
    'Unrelated Sibling Team',
    'aggregate-sibling-team-run',
    [siblingAgent],
  );
  const emptyTeam = stableTeam(
    '/empty_team',
    'Empty Configured Team',
    'aggregate-empty-team-run',
    [],
  );
  const rootAgent = stableAgent(
    '/root_agent',
    'root_agent',
    'aggregate-root-agent-run',
    AgentStatus.Running,
  );
  const members = [productTeam, siblingTeam, emptyTeam, rootAgent];
  const executionRows: RunHistoryTeamExecutionRow[] = [
    stableExecutionRow(productTeam, PRODUCT_TEAM_KEY, 0, true),
    stableExecutionRow(directAgent, 'agent:aggregate-direct-agent-run', 1, false),
    stableExecutionRow(deepTeam, DEEP_TEAM_KEY, 1, true),
    stableExecutionRow(deepAgent, 'agent:aggregate-deep-agent-run', 2, false),
    taskTeamChildRow(),
    stableExecutionRow(siblingTeam, SIBLING_TEAM_KEY, 0, true),
    stableExecutionRow(siblingAgent, 'agent:aggregate-sibling-agent-run', 1, false),
    stableExecutionRow(emptyTeam, EMPTY_TEAM_KEY, 0, false),
    stableExecutionRow(rootAgent, 'agent:aggregate-root-agent-run', 0, false),
    rootTaskTeamRow(),
  ];
  return { members, executionRows };
});

const workspaceTeams = computed<TeamTreeNode[]>(() => {
  const { members, executionRows } = fixtureTree.value;
  const rootTeam = stableTeam('/', 'Aggregate Browser Team', TEAM_RUN_ID, members);
  rootTeam.teamDefinitionId = 'aggregate-browser-team-definition';
  rootTeam.coordinatorAddress = '/root_agent';
  return [{
    teamRunId: TEAM_RUN_ID,
    teamDefinitionId: 'aggregate-browser-team-definition',
    teamDefinitionName: 'Aggregate Browser Team',
    workspaceRootPath: '/api-e2e-aggregate',
    summary: 'Nested Team aggregate status browser fixture',
    lastActivityAt: '2026-08-29T00:00:00.000Z',
    isActive: true,
    deleteLifecycle: 'READY',
    focusedAgentRunId: 'aggregate-root-agent-run',
    rootTeam,
    members,
    executionRows,
  }];
});

const workspaceNode: RunTreeWorkspaceNode = {
  workspaceId: 'workspace:api-e2e-aggregate',
  workspaceRootPath: '/api-e2e-aggregate',
  workspaceName: 'Aggregate Status Fixture',
  workspaceKind: 'filesystem',
  canRemoveFromWorkspaces: false,
  agents: [],
};

const historyState: WorkspaceHistorySectionState = {
  selectedRunId: null,
  isTeamRunSelected: () => false,
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
  isTeamExpanded: () => true,
  isTeamMemberExpanded: (_workspaceId, _teamRunId, rowKey) => Boolean(expandedMembers[rowKey]),
  toggleTeamMember: (_workspaceId, _teamRunId, rowKey) => {
    toggleCount.value += 1;
    expandedMembers[rowKey] = !expandedMembers[rowKey];
  },
};

const avatars: WorkspaceHistoryAvatarBindings = {
  showAgentAvatar: () => false,
  onAgentAvatarError: () => {},
  getAgentInitials: () => 'A',
  showTeamAvatar: () => false,
  getTeamAvatarUrl: () => '',
  onTeamAvatarError: () => {},
  getTeamInitials: () => 'AT',
  showTeamMemberAvatar: () => false,
  getTeamMemberAvatarUrl: () => '',
  onTeamMemberAvatarError: () => {},
  getTeamMemberDisplayName: (member) => member.displayName,
  getTeamMemberInitials: (member) => member.kind === 'agent_team' ? 'T' : 'A',
};

const actions: WorkspaceHistorySectionActions = {
  onRemoveWorkspace: () => {},
  onCreateRun: () => {},
  onSelectRun: () => {},
  onTerminateRun: () => {},
  onArchiveRun: () => {},
  onDeleteRun: () => {},
  onTerminateTeam: () => {},
  onArchiveTeam: () => {},
  onDeleteTeam: () => {},
  onSelectTeam: () => { teamSelectionCount.value += 1; },
  onSelectTeamMember: () => { memberSelectionCount.value += 1; },
};

type ProbeStatusInput = {
  direct: AgentStatus;
  deep: AgentStatus;
  task: AgentStatus | string | null;
  sibling: AgentStatus;
};

type NestedTeamAggregateStatusProbeControl = {
  getCounters: () => { toggles: number; memberSelections: number; teamSelections: number };
  resetCounters: () => void;
  setExpanded: (rowKey: string, expanded: boolean) => void;
  setLocale: (locale: 'en' | 'zh-CN') => Promise<void>;
  setStatuses: (input: ProbeStatusInput) => void;
};

onMounted(() => {
  const globalWindow = window as typeof window & {
    __nestedTeamAggregateStatusProbe?: NestedTeamAggregateStatusProbeControl;
  };
  globalWindow.__nestedTeamAggregateStatusProbe = {
    getCounters: () => ({
      toggles: toggleCount.value,
      memberSelections: memberSelectionCount.value,
      teamSelections: teamSelectionCount.value,
    }),
    resetCounters: () => {
      toggleCount.value = 0;
      memberSelectionCount.value = 0;
      teamSelectionCount.value = 0;
    },
    setExpanded: (rowKey, expanded) => { expandedMembers[rowKey] = expanded; },
    setLocale: setPreference,
    setStatuses: (input) => {
      directStatus.value = input.direct;
      deepStatus.value = input.deep;
      taskStatus.value = input.task;
      siblingStatus.value = input.sibling;
    },
  };
});

onBeforeUnmount(() => {
  const globalWindow = window as typeof window & {
    __nestedTeamAggregateStatusProbe?: NestedTeamAggregateStatusProbeControl;
  };
  delete globalWindow.__nestedTeamAggregateStatusProbe;
});
</script>
