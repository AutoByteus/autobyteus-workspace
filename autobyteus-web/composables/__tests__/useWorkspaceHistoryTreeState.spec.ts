import { describe, expect, it } from 'vitest';
import { nextTick, reactive } from 'vue';
import { useWorkspaceHistoryTreeState } from '../useWorkspaceHistoryTreeState';
import { buildWorkspaceHistorySessionRows } from '~/stores/runHistorySessionProjection';
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
  workspaceKind: 'filesystem' as const,
  canRemoveFromWorkspaces: true,
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
          lastKnownStatus: 'IDLE' as const,
          isActive: false,
          source: 'history' as const,
          isDraft: false,
        },
      ],
    },
  ],
});

const buildTeamNode = (teamRunId = 'team-1', workspaceRootPath = '/ws/a') => ({
  teamRunId,
  teamDefinitionId: 'team-def-1',
  teamDefinitionName: 'Team Alpha',
  workspaceRootPath,
  summary: 'Team summary',
  lastActivityAt: '2026-01-01T01:00:00.000Z',
  lastKnownStatus: 'IDLE' as const,
  isActive: false,
  currentStatus: AgentTeamStatus.Idle,
  deleteLifecycle: 'READY' as const,
  focusedMemberRouteKey: 'solution_designer',
  members: [],
  memberTree: [],
});

const buildReactiveHarness = () => {
  const state = reactive({
    selectedRunId: null as string | null,
    selectedTeamRunId: null as string | null,
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
    getTreeNodes: () => state.nodes,
    getWorkspaceSessionNodes: (workspaceRootPath?: string) => {
      const workspaces = workspaceRootPath
        ? state.nodes.filter((node) => node.workspaceRootPath === workspaceRootPath)
        : state.nodes;
      return workspaces.flatMap((workspaceNode) => buildWorkspaceHistorySessionRows({
        workspaceNode,
        teamNodes: state.teams.filter((team) => team.workspaceRootPath === workspaceNode.workspaceRootPath),
      }));
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
  it('defaults workspaces and session details to collapsed', () => {
    const { state, treeState } = buildReactiveHarness();
    state.nodes = [buildAgentWorkspace()];
    state.teams = [buildTeamNode()];

    expect(treeState.isWorkspaceExpanded('workspace-a')).toBe(false);
    expect(treeState.isSessionExpanded('agent:run-1')).toBe(false);
    expect(treeState.isSessionExpanded('team:team-1')).toBe(false);

    treeState.toggleWorkspace('workspace-a');

    expect(treeState.isWorkspaceExpanded('workspace-a')).toBe(true);
    expect(treeState.isSessionExpanded('agent:run-1')).toBe(false);
    expect(treeState.isSessionExpanded('team:team-1')).toBe(false);
  });

  it('prunes workspace expansion and session detail state for removed workspaces', () => {
    const { state, treeState } = buildReactiveHarness();
    state.nodes = [buildAgentWorkspace()];
    state.teams = [buildTeamNode()];

    treeState.toggleWorkspace('workspace-a');
    treeState.toggleSession('team:team-1');

    expect(treeState.isWorkspaceExpanded('workspace-a')).toBe(true);
    expect(treeState.isSessionExpanded('team:team-1')).toBe(true);

    treeState.pruneWorkspace('workspace-a');

    expect(treeState.isWorkspaceExpanded('workspace-a')).toBe(false);
    expect(treeState.isSessionExpanded('team:team-1')).toBe(false);
  });

  it('reveals only the selected agent session workspace', async () => {
    const { state, selectionStore, treeState } = buildReactiveHarness();
    state.nodes = [
      buildAgentWorkspace('/ws/a', 'run-1'),
      buildAgentWorkspace('/ws/b', 'run-2'),
    ];
    selectionStore.selectedType = 'agent';
    selectionStore.selectedRunId = 'run-1';

    await flushReactiveUpdates();

    expect(treeState.isWorkspaceExpanded('workspace-a')).toBe(true);
    expect(treeState.isWorkspaceExpanded('workspace-b')).toBe(false);
    expect(treeState.isSessionExpanded('agent:run-1')).toBe(false);
  });

  it('reveals selected team ancestry from the run-history store selected team source', async () => {
    const { state, treeState } = buildReactiveHarness();
    state.nodes = [
      {
        workspaceId: 'workspace-a',
        workspaceRootPath: '/ws/a',
        workspaceName: 'Workspace A',
        workspaceKind: 'filesystem',
        canRemoveFromWorkspaces: true,
        agents: [],
      },
    ];
    state.teams = [buildTeamNode('team-1')];
    state.selectedTeamRunId = 'team-1';

    await flushReactiveUpdates();

    expect(treeState.isWorkspaceExpanded('workspace-a')).toBe(true);
    expect(treeState.isSessionExpanded('team:team-1')).toBe(true);
  });

  it('keeps selected reveal pending until matching data becomes available', async () => {
    const { state, selectionStore, treeState } = buildReactiveHarness();
    selectionStore.selectedType = 'agent';
    selectionStore.selectedRunId = 'run-1';

    await flushReactiveUpdates();

    expect(treeState.isWorkspaceExpanded('workspace-a')).toBe(false);

    state.nodes = [buildAgentWorkspace('/ws/a', 'run-1')];
    await flushReactiveUpdates();

    expect(treeState.isWorkspaceExpanded('workspace-a')).toBe(true);
  });

  it('does not re-open an already revealed selected team after manual session collapse and quiet refresh', async () => {
    const { state, selectionStore, treeState } = buildReactiveHarness();
    state.nodes = [{
      workspaceId: 'workspace-a',
      workspaceRootPath: '/ws/a',
      workspaceName: 'Workspace A',
      workspaceKind: 'filesystem',
      canRemoveFromWorkspaces: true,
      agents: [],
    }];
    state.teams = [buildTeamNode('team-1')];
    selectionStore.selectedType = 'team';
    selectionStore.selectedRunId = 'team-1';

    await flushReactiveUpdates();
    expect(treeState.isSessionExpanded('team:team-1')).toBe(true);

    treeState.toggleSession('team:team-1');
    expect(treeState.isSessionExpanded('team:team-1')).toBe(false);

    state.teams = [buildTeamNode('team-1')];
    await flushReactiveUpdates();

    expect(treeState.isSessionExpanded('team:team-1')).toBe(false);
  });
});
