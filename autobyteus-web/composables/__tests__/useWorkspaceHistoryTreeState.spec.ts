import { describe, expect, it } from 'vitest';
import { nextTick, reactive } from 'vue';
import { useWorkspaceHistoryTreeState } from '../useWorkspaceHistoryTreeState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';

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
  currentStatus: AgentTeamStatus.Idle,
  deleteLifecycle: 'READY',
  focusedMemberRouteKey: 'solution_designer',
  members: [],
  memberTree: [],
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
    getTreeNodes: () => state.nodes,
    getTeamNodes: (workspaceRootPath?: string) => {
      if (!workspaceRootPath) {
        return state.teams;
      }
      return state.teams.filter((team) => team.workspaceRootPath === workspaceRootPath);
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
});
