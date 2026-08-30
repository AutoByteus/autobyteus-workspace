<template>
  <main data-test="nested-team-hierarchy-probe" class="min-h-screen bg-slate-100 p-6 text-slate-900">
    <header class="mb-4 rounded-lg bg-white p-4 shadow-sm">
      <h1 class="text-xl font-semibold">Nested Team hierarchy probe</h1>
      <p data-test="probe-state" class="mt-1 text-sm text-slate-600">
        width={{ panelWidth }} font={{ fontScale }} locale={{ resolvedLocale }} refreshes={{ refreshCount }}
      </p>
      <p data-test="interaction-counters" class="mt-1 text-sm text-slate-600">
        toggles={{ toggleCount }} members={{ memberSelectionCount }} teams={{ teamSelectionCount }} stops={{ terminateCount }}
      </p>
    </header>

    <section
      data-test="history-panel"
      class="probe-history-panel bg-white shadow-sm"
      :style="{ width: `${panelWidth}px` }"
    >
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

const TEAM_RUN_ID = 'hierarchy-browser-team-run';
const PRODUCT_KEY = 'team:hierarchy-product-team-run';
const SOFTWARE_KEY = 'team:hierarchy-software-team-run';
const QUALITY_KEY = 'team:hierarchy-quality-team-run';
const OPERATIONS_KEY = 'team:hierarchy-operations-team-run';
const TASK_TEAM_KEY = 'task-team:hierarchy-task-team-run';
const SELECTED_RUN_ID = 'hierarchy-accessibility-agent-run';

const { resolvedLocale, setPreference } = useLocalization();
const panelWidth = ref(320);
const fontScale = ref<'default' | 'large' | 'extra-large'>('default');
const selectedAgentRunId = ref(SELECTED_RUN_ID);
const refreshCount = ref(0);
const coordinatorStatus = ref<AgentStatus>(AgentStatus.Running);
const expandedMembers = reactive<Record<string, boolean>>({
  [PRODUCT_KEY]: true,
  [SOFTWARE_KEY]: true,
  [QUALITY_KEY]: true,
  [OPERATIONS_KEY]: true,
  [TASK_TEAM_KEY]: true,
});
const toggleCount = ref(0);
const memberSelectionCount = ref(0);
const teamSelectionCount = ref(0);
const terminateCount = ref(0);
const archiveCount = ref(0);
const deleteCount = ref(0);
const originalRootFontSize = ref('');

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
  workspaceRootPath: '/api-e2e-hierarchy',
  summary: 'Deterministic hierarchy browser fixture Agent',
  lastActivityAt: '2026-08-30T10:00:00.000Z',
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
  workspaceRootPath: '/api-e2e-hierarchy',
  summary: 'Deterministic hierarchy browser fixture Team',
  lastActivityAt: '2026-08-30T10:00:00.000Z',
  currentStatus: null,
  isActive: true,
  deleteLifecycle: 'READY',
  children,
});

const stableExecutionRow = (
  row: TeamMemberTreeRow,
  rowKey: string,
  depth: number,
  hasChildren = row.children.length > 0,
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

const transientRow = (input: Omit<RunHistoryTransientExecutionRow, 'kind' | 'teamRunId'>): RunHistoryTransientExecutionRow => ({
  kind: 'transient_execution',
  teamRunId: TEAM_RUN_ID,
  ...input,
});

const fixtureTree = computed(() => {
  void refreshCount.value;
  const coordinator = stableAgent(
    '/coordinator',
    'Workspace Program Coordinator',
    'hierarchy-coordinator-run',
    coordinatorStatus.value,
  );

  const productAgents = [
    stableAgent('/product/research', 'Research Operations Specialist With A Very Long Localized Role', 'hierarchy-research-run', AgentStatus.Idle),
    stableAgent('/product/interaction', 'Interaction Designer', 'hierarchy-interaction-run', AgentStatus.Running),
    stableAgent('/product/prototype', 'Production Prototyper', 'hierarchy-prototype-run', AgentStatus.Initializing),
    stableAgent('/product/content', 'Content Systems Designer', 'hierarchy-content-run', AgentStatus.Offline),
    stableAgent('/product/localization', '本地化与国际化体验设计协调专家超长显示名称', 'hierarchy-localization-run', AgentStatus.Idle),
    stableAgent('/product/accessibility', 'Accessibility & Design System Coordinator', SELECTED_RUN_ID, AgentStatus.Error),
  ];
  const productTeam = stableTeam('/product', 'Product Design & Prototyping', 'hierarchy-product-team-run', productAgents);

  const qualityAgent = stableAgent('/software/quality/automation', 'Quality Automation Engineer', 'hierarchy-quality-agent-run', AgentStatus.Running);
  const qualityTeam = stableTeam('/software/quality', 'Quality Engineering', 'hierarchy-quality-team-run', [qualityAgent]);
  const softwareArchitect = stableAgent('/software/architect', 'Architecture Designer', 'hierarchy-architect-run', AgentStatus.Idle);
  const softwareTeam = stableTeam('/software', 'Software Engineering', 'hierarchy-software-team-run', [softwareArchitect, qualityTeam]);

  const operationsAgent = stableAgent('/operations/reliability', 'Reliability Operator', 'hierarchy-operations-agent-run', AgentStatus.Offline);
  const operationsTeam = stableTeam('/operations', 'Delivery & Operations', 'hierarchy-operations-team-run', [operationsAgent]);

  const members = [coordinator, productTeam, softwareTeam, operationsTeam];
  const executionRows: RunHistoryTeamExecutionRow[] = [
    stableExecutionRow(coordinator, 'agent:hierarchy-coordinator-run', 0, false),
    stableExecutionRow(productTeam, PRODUCT_KEY, 0),
    ...productAgents.map((agent) => stableExecutionRow(agent, `agent:${agent.agentRunId}`, 1, false)),
    stableExecutionRow(softwareTeam, SOFTWARE_KEY, 0),
    stableExecutionRow(softwareArchitect, 'agent:hierarchy-architect-run', 1, false),
    stableExecutionRow(qualityTeam, QUALITY_KEY, 1),
    stableExecutionRow(qualityAgent, 'agent:hierarchy-quality-agent-run', 2, false),
    stableExecutionRow(operationsTeam, OPERATIONS_KEY, 0),
    stableExecutionRow(operationsAgent, 'agent:hierarchy-operations-agent-run', 1, false),
    transientRow({
      transientKind: 'task_team',
      rowKey: TASK_TEAM_KEY,
      memberAddress: '/temporary-review',
      agentRunId: null,
      teamRunIdForNode: 'hierarchy-task-team-run',
      memberKind: 'agent_team',
      displayName: 'Task: Independent UX Review',
      currentStatus: AgentStatus.Running,
      depth: 0,
      hasChildren: true,
    }),
    transientRow({
      transientKind: 'task_team_child',
      rowKey: 'task-team-child:hierarchy-task-worker-run',
      memberAddress: '/temporary-review/reviewer',
      agentRunId: 'hierarchy-task-worker-run',
      teamRunIdForNode: null,
      memberKind: 'agent',
      displayName: 'Task: Browser Accessibility Reviewer',
      currentStatus: AgentStatus.Initializing,
      depth: 1,
      hasChildren: false,
    }),
  ];
  return { members, executionRows };
});

const workspaceTeams = computed<TeamTreeNode[]>(() => {
  const { members, executionRows } = fixtureTree.value;
  const rootTeam = stableTeam('/', 'Hierarchy Browser Team', TEAM_RUN_ID, members);
  rootTeam.teamDefinitionId = 'hierarchy-browser-team-definition';
  rootTeam.coordinatorAddress = '/coordinator';
  return [{
    teamRunId: TEAM_RUN_ID,
    teamDefinitionId: 'hierarchy-browser-team-definition',
    teamDefinitionName: 'Hierarchy Browser Team',
    workspaceRootPath: '/api-e2e-hierarchy',
    summary: 'Active Coordination Run With A Long Localized Summary',
    lastActivityAt: '2026-08-30T10:00:00.000Z',
    isActive: true,
    deleteLifecycle: 'READY',
    focusedAgentRunId: selectedAgentRunId.value,
    rootTeam,
    members,
    executionRows,
  }];
});

const workspaceNode: RunTreeWorkspaceNode = {
  workspaceId: 'workspace:api-e2e-hierarchy',
  workspaceRootPath: '/api-e2e-hierarchy',
  workspaceName: 'Hierarchy Fixture Workspace',
  workspaceKind: 'filesystem',
  canRemoveFromWorkspaces: false,
  agents: [],
};

const historyState: WorkspaceHistorySectionState = {
  selectedRunId: null,
  isTeamRunSelected: (teamRunId) => teamRunId === TEAM_RUN_ID,
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
  isTeamExpanded: (teamRunId) => teamRunId === TEAM_RUN_ID,
  isTeamMemberExpanded: (_workspaceId, _teamRunId, rowKey) => Boolean(expandedMembers[rowKey]),
  toggleTeamMember: (_workspaceId, _teamRunId, rowKey) => {
    toggleCount.value += 1;
    expandedMembers[rowKey] = !expandedMembers[rowKey];
  },
};

const avatars: WorkspaceHistoryAvatarBindings = {
  showAgentAvatar: () => false,
  onAgentAvatarError: () => {},
  getAgentInitials: (name) => name.slice(0, 2).toUpperCase(),
  showTeamAvatar: () => false,
  getTeamAvatarUrl: () => '',
  onTeamAvatarError: () => {},
  getTeamInitials: (name) => name.slice(0, 2).toUpperCase(),
  showTeamMemberAvatar: () => false,
  getTeamMemberAvatarUrl: () => '',
  onTeamMemberAvatarError: () => {},
  getTeamMemberDisplayName: (member) => member.displayName,
  getTeamMemberInitials: (member) => member.displayName.slice(0, 2).toUpperCase(),
};

const actions: WorkspaceHistorySectionActions = {
  onRemoveWorkspace: () => {},
  onCreateRun: () => {},
  onSelectRun: () => {},
  onTerminateRun: () => {},
  onArchiveRun: () => {},
  onDeleteRun: () => {},
  onTerminateTeam: () => { terminateCount.value += 1; },
  onArchiveTeam: () => { archiveCount.value += 1; },
  onDeleteTeam: () => { deleteCount.value += 1; },
  onSelectTeam: () => { teamSelectionCount.value += 1; },
  onSelectTeamMember: (member) => {
    memberSelectionCount.value += 1;
    selectedAgentRunId.value = member.agentRunId;
  },
};

type FontScale = 'default' | 'large' | 'extra-large';
type ProbeControl = {
  constants: Record<string, string>;
  getState: () => Record<string, unknown>;
  quietRefresh: () => void;
  resetCounters: () => void;
  setAllExpanded: (expanded: boolean) => void;
  setExpanded: (rowKey: string, expanded: boolean) => void;
  setFontScale: (scale: FontScale) => void;
  setLocale: (locale: 'en' | 'zh-CN') => Promise<void>;
  setPanelWidth: (width: number) => void;
  setSelectedAgentRun: (agentRunId: string) => void;
};

const applyFontScale = (scale: FontScale): void => {
  const pixels = scale === 'large' ? 18 : scale === 'extra-large' ? 20 : 16;
  fontScale.value = scale;
  document.documentElement.style.fontSize = `${pixels}px`;
};

onMounted(() => {
  originalRootFontSize.value = document.documentElement.style.fontSize;
  applyFontScale('default');
  const globalWindow = window as typeof window & { __nestedTeamHierarchyProbe?: ProbeControl };
  globalWindow.__nestedTeamHierarchyProbe = {
    constants: {
      TEAM_RUN_ID,
      PRODUCT_KEY,
      SOFTWARE_KEY,
      QUALITY_KEY,
      OPERATIONS_KEY,
      TASK_TEAM_KEY,
      SELECTED_RUN_ID,
    },
    getState: () => ({
      panelWidth: panelWidth.value,
      fontScale: fontScale.value,
      selectedAgentRunId: selectedAgentRunId.value,
      refreshCount: refreshCount.value,
      coordinatorStatus: coordinatorStatus.value,
      expanded: { ...expandedMembers },
      counters: {
        toggles: toggleCount.value,
        memberSelections: memberSelectionCount.value,
        teamSelections: teamSelectionCount.value,
        terminate: terminateCount.value,
        archive: archiveCount.value,
        delete: deleteCount.value,
      },
    }),
    quietRefresh: () => {
      refreshCount.value += 1;
      coordinatorStatus.value = coordinatorStatus.value === AgentStatus.Running
        ? AgentStatus.Idle
        : AgentStatus.Running;
    },
    resetCounters: () => {
      toggleCount.value = 0;
      memberSelectionCount.value = 0;
      teamSelectionCount.value = 0;
      terminateCount.value = 0;
      archiveCount.value = 0;
      deleteCount.value = 0;
    },
    setAllExpanded: (expanded) => {
      for (const key of [PRODUCT_KEY, SOFTWARE_KEY, QUALITY_KEY, OPERATIONS_KEY, TASK_TEAM_KEY]) {
        expandedMembers[key] = expanded;
      }
    },
    setExpanded: (rowKey, expanded) => { expandedMembers[rowKey] = expanded; },
    setFontScale: applyFontScale,
    setLocale: setPreference,
    setPanelWidth: (width) => { panelWidth.value = width; },
    setSelectedAgentRun: (agentRunId) => { selectedAgentRunId.value = agentRunId; },
  };
});

onBeforeUnmount(() => {
  document.documentElement.style.fontSize = originalRootFontSize.value;
  const globalWindow = window as typeof window & { __nestedTeamHierarchyProbe?: ProbeControl };
  delete globalWindow.__nestedTeamHierarchyProbe;
});
</script>

<style scoped>
.probe-history-panel {
  container: workspace-history-panel / inline-size;
}
</style>
