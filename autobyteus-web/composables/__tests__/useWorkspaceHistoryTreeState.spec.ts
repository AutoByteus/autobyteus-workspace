import { describe, expect, it } from 'vitest';
import { nextTick, reactive } from 'vue';
import { useWorkspaceHistoryTreeState } from '../useWorkspaceHistoryTreeState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { createTeamExecutionAddress, serializeTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';

const flushReactiveUpdates = async () => {
  await nextTick();
  await Promise.resolve();
  await nextTick();
};

const workspaceIdForRoot = (workspaceRootPath: string): string =>
  workspaceRootPath === '/ws/a' ? 'workspace-a' : 'workspace-b';

const buildAgentWorkspace = (workspaceRootPath = '/ws/a', runId = 'run-1') => ({
  workspaceId: workspaceIdForRoot(workspaceRootPath),
  workspaceRootPath,
  workspaceName: workspaceRootPath === '/ws/a' ? 'Workspace A' : 'Workspace B',
  agents: [
    {
      agentDefinitionId: workspaceRootPath === '/ws/a' ? 'agent-def-1' : 'agent-def-2',
      agentName: workspaceRootPath === '/ws/a' ? 'Agent One' : 'Agent Two',
      agentAvatarUrl: null,
      runs: [
        {
          runId,
          summary: 'Run summary',
          lastActivityAt: '2026-01-01T00:00:00.000Z',
          currentStatus: AgentStatus.Idle,
          lastKnownStatus: 'IDLE',
          isActive: false,
          source: 'history',
          isDraft: false,
        },
      ],
    },
  ],
});

const buildTeamNode = (teamRunId = 'team-1') => ({
  teamRunId,
  teamDefinitionId: 'team-def-1',
  teamDefinitionName: 'Team Alpha',
  workspaceRootPath: '/ws/a',
  summary: 'Team summary',
  lastActivityAt: '2026-01-01T01:00:00.000Z',
  lastKnownStatus: 'IDLE',
  isActive: false,
  deleteLifecycle: 'READY',
  focusedExecutionAddress: createTeamExecutionAddress({ rootTeamRunId: teamRunId, memberAddress: '/solution_designer' }),
  rootTeam: {
    teamRunId,
    kind: 'agent_team',
    memberAddress: '/',
    displayName: 'Team Alpha',
    teamDefinitionId: 'team-def-1',
    teamRunIdForNode: teamRunId,
    coordinatorAddress: '/solution_designer',
    workspaceRootPath: null,
    summary: 'Team summary',
    lastActivityAt: '2026-01-01T01:00:00.000Z',
    currentStatus: null,
    isActive: false,
    deleteLifecycle: 'READY',
    children: [],
  },
  members: [],
  executionRows: [],
});

const buildTeamHistoryWorkspace = (teamRunId = 'team-1') => ({
  workspaceRootPath: '/ws/a',
  workspaceName: 'Workspace A',
  agentDefinitions: [],
  teamDefinitions: [
    {
      teamDefinitionId: 'team-def-1',
      teamDefinitionName: 'Team Alpha',
      runs: [
        {
          teamRunId,
          teamDefinitionId: 'team-def-1',
          teamDefinitionName: 'Team Alpha',
        },
      ],
    },
  ],
});

const buildReactiveHarness = () => {
  const state = reactive({
    selectedRunId: null as string | null,
    selectedTeamRunId: null as string | null,
    workspaceGroups: [] as any[],
    nodes: [] as any[],
    teams: [] as any[],
    navigationTopologyRevision: 0,
  });
  const selectionStore = reactive({
    selectedType: null as string | null,
    selectedRunId: null as string | null,
  });
  const runHistoryStore = {
    get selectedRunId() {
      return state.selectedRunId;
    },
    get selectedTeamRunId() {
      return state.selectedTeamRunId;
    },
    get workspaceGroups() {
      return state.workspaceGroups;
    },
    get navigationTopologyRevision() {
      return state.navigationTopologyRevision;
    },
    getTreeNodes: () => state.nodes,
    getTeamNodes: (workspaceRootPath?: string) => {
      if (!workspaceRootPath) {
        return state.teams;
      }
      return state.teams.filter((team) => team.workspaceRootPath === workspaceRootPath);
    },
    getAgentNavigationAncestry: (runId: string) => {
      for (const workspace of state.nodes) {
        const agent = workspace.agents.find((candidate: any) =>
          candidate.runs.some((run: any) => run.runId === runId));
        if (agent) {
          return {
            workspaceId: workspace.workspaceId,
            agentDefinitionId: agent.agentDefinitionId,
          };
        }
      }
      return null;
    },
    getTeamNavigationAncestry: (teamRunId: string) => {
      const team = state.teams.find((candidate) => candidate.teamRunId === teamRunId);
      if (!team) return null;
      const workspace = state.nodes.find((candidate) =>
        candidate.workspaceRootPath === team.workspaceRootPath);
      return workspace ? {
        workspaceId: workspace.workspaceId,
        teamDefinitionGroupKey: team.teamDefinitionId,
      } : null;
    },
    getTeamMemberNavigationAncestorAddresses: (teamRunId: string, executionAddress: any) => {
      const team = state.teams.find((candidate) => candidate.teamRunId === teamRunId);
      const targetIndex = team?.executionRows.findIndex(
        (row: any) => serializeTeamExecutionAddress(row.executionAddress) === serializeTeamExecutionAddress(executionAddress),
      ) ?? -1;
      if (!team || targetIndex < 0) return [];
      const ancestorAddresses: string[] = [];
      let expectedDepth = team.executionRows[targetIndex].depth - 1;
      for (let index = targetIndex - 1; index >= 0 && expectedDepth >= 0; index -= 1) {
        const row = team.executionRows[index];
        if (row.depth !== expectedDepth || !row.hasChildren) continue;
        ancestorAddresses.unshift(row.memberAddress);
        expectedDepth -= 1;
      }
      return ancestorAddresses;
    },
  };

  return {
    state,
    selectionStore,
    treeState: useWorkspaceHistoryTreeState({
      runHistoryStore,
      selectionStore,
    }),
  };
};

describe('useWorkspaceHistoryTreeState', () => {
  it('defaults workspaces, agent groups, team-definition groups, and team runs to collapsed', () => {
    const { state, treeState } = buildReactiveHarness();
    state.nodes = [buildAgentWorkspace()];
    state.teams = [buildTeamNode()];
    state.workspaceGroups = [buildTeamHistoryWorkspace()];

    expect(treeState.isWorkspaceExpanded('workspace-a')).toBe(false);
    expect(treeState.isAgentExpanded('workspace-a', 'agent-def-1')).toBe(false);
    expect(treeState.isTeamDefinitionExpanded('workspace-a', 'team-def-1')).toBe(false);
    expect(treeState.isTeamExpanded('team-1')).toBe(false);

    treeState.toggleWorkspace('workspace-a');

    expect(treeState.isWorkspaceExpanded('workspace-a')).toBe(true);
    expect(treeState.isAgentExpanded('workspace-a', 'agent-def-1')).toBe(false);
    expect(treeState.isTeamDefinitionExpanded('workspace-a', 'team-def-1')).toBe(false);
  });

  it('prunes workspace expansion state for removed workspaces', () => {
    const { state, treeState } = buildReactiveHarness();
    state.nodes = [buildAgentWorkspace()];
    state.teams = [buildTeamNode()];
    state.workspaceGroups = [buildTeamHistoryWorkspace()];

    treeState.toggleWorkspace('workspace-a');
    treeState.toggleAgent('workspace-a', 'agent-def-1');
    treeState.toggleTeamDefinition('workspace-a', 'team-def-1');

    expect(treeState.isWorkspaceExpanded('workspace-a')).toBe(true);
    expect(treeState.isAgentExpanded('workspace-a', 'agent-def-1')).toBe(true);
    expect(treeState.isTeamDefinitionExpanded('workspace-a', 'team-def-1')).toBe(true);

    treeState.pruneWorkspace('workspace-a');

    expect(treeState.isWorkspaceExpanded('workspace-a')).toBe(false);
    expect(treeState.isAgentExpanded('workspace-a', 'agent-def-1')).toBe(false);
    expect(treeState.isTeamDefinitionExpanded('workspace-a', 'team-def-1')).toBe(false);
  });

  it('reveals only the selected agent run ancestry', async () => {
    const { state, selectionStore, treeState } = buildReactiveHarness();
    state.nodes = [
      buildAgentWorkspace('/ws/a', 'run-1'),
      buildAgentWorkspace('/ws/b', 'run-2'),
    ];
    selectionStore.selectedType = 'agent';
    selectionStore.selectedRunId = 'run-1';

    await flushReactiveUpdates();

    expect(treeState.isWorkspaceExpanded('workspace-a')).toBe(true);
    expect(treeState.isAgentExpanded('workspace-a', 'agent-def-1')).toBe(true);
    expect(treeState.isWorkspaceExpanded('workspace-b')).toBe(false);
    expect(treeState.isAgentExpanded('workspace-b', 'agent-def-2')).toBe(false);
  });

  it('reveals selected team ancestry from the run-history store selected team source', async () => {
    const { state, treeState } = buildReactiveHarness();
    state.nodes = [
      {
        workspaceId: 'workspace-a',
        workspaceRootPath: '/ws/a',
        workspaceName: 'Workspace A',
        agents: [],
      },
    ];
    state.teams = [buildTeamNode('team-1')];
    state.workspaceGroups = [buildTeamHistoryWorkspace('team-1')];
    state.selectedTeamRunId = 'team-1';

    await flushReactiveUpdates();

    expect(treeState.isWorkspaceExpanded('workspace-a')).toBe(true);
    expect(treeState.isTeamDefinitionExpanded('workspace-a', 'team-def-1')).toBe(true);
    expect(treeState.isTeamExpanded('team-1')).toBe(true);
  });

  it('keeps selected reveal pending until matching data becomes available', async () => {
    const { state, selectionStore, treeState } = buildReactiveHarness();
    selectionStore.selectedType = 'agent';
    selectionStore.selectedRunId = 'run-1';

    await flushReactiveUpdates();

    expect(treeState.isWorkspaceExpanded('workspace-a')).toBe(false);
    expect(treeState.isAgentExpanded('workspace-a', 'agent-def-1')).toBe(false);

    state.nodes = [buildAgentWorkspace('/ws/a', 'run-1')];
    state.navigationTopologyRevision += 1;
    await flushReactiveUpdates();

    expect(treeState.isWorkspaceExpanded('workspace-a')).toBe(true);
    expect(treeState.isAgentExpanded('workspace-a', 'agent-def-1')).toBe(true);
  });

  it('does not re-open an already revealed selected path after manual collapse and quiet refresh', async () => {
    const { state, selectionStore, treeState } = buildReactiveHarness();
    state.nodes = [buildAgentWorkspace('/ws/a', 'run-1')];
    selectionStore.selectedType = 'agent';
    selectionStore.selectedRunId = 'run-1';

    await flushReactiveUpdates();
    expect(treeState.isAgentExpanded('workspace-a', 'agent-def-1')).toBe(true);

    treeState.toggleAgent('workspace-a', 'agent-def-1');
    expect(treeState.isAgentExpanded('workspace-a', 'agent-def-1')).toBe(false);

    state.nodes = [buildAgentWorkspace('/ws/a', 'run-1')];
    await flushReactiveUpdates();

    expect(treeState.isAgentExpanded('workspace-a', 'agent-def-1')).toBe(false);
  });

  it('expands exact member ancestors from the cached navigation index', () => {
    const { state, treeState } = buildReactiveHarness();
    const address = (memberAddress: string, taskAgentRunId: string | null = null) =>
      createTeamExecutionAddress({ rootTeamRunId: 'team-1', memberAddress, taskAgentRunId });
    state.teams = [{
      ...buildTeamNode('team-1'),
      executionRows: [
        { memberAddress: '/BuildSquad', executionAddress: address('/BuildSquad'), depth: 0, hasChildren: true },
        { memberAddress: '/BuildSquad/reviewer', executionAddress: address('/BuildSquad/reviewer'), depth: 1, hasChildren: true },
        { memberAddress: '/BuildSquad/reviewer', executionAddress: address('/BuildSquad/reviewer', 'task-agent-run-1'), depth: 2, hasChildren: false },
      ],
    }];

    expect(treeState.expandTeamMemberAncestors(
      'workspace-a',
      'team-1',
      address('/BuildSquad/reviewer', 'task-agent-run-1'),
    )).toBe(true);
    expect(treeState.isTeamMemberExpanded('workspace-a', 'team-1', '/BuildSquad')).toBe(true);
    expect(treeState.isTeamMemberExpanded('workspace-a', 'team-1', '/BuildSquad/reviewer')).toBe(true);
  });
});
