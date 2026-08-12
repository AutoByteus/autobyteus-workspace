import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import WorkspaceAgentRunsTreePanel from '../WorkspaceAgentRunsTreePanel.vue';

const flushPromises = async () => {
  await Promise.resolve();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

const {
  runHistoryState,
  runHistoryStoreMock,
  workspaceStoreMock,
  selectionStoreMock,
  agentRunStoreMock,
  teamRunStoreMock,
  agentDefinitionStoreMock,
  agentTeamDefinitionStoreMock,
  windowNodeContextStoreMock,
  addToastMock,
} = vi.hoisted(() => {
  const exactAddress = (value: string): string => value.startsWith('/') ? value : `/${value}`;
  const executionAddress = (teamRunId: string, memberAddress: string) => ({
    rootTeamRunId: teamRunId,
    taskTeamRunIds: [],
    memberAddress,
    taskAgentRunId: null,
  });
  const buildCurrentMember = (member: any): any => {
    const memberAddress = exactAddress(member.memberAddress);
    const kind = member.kind ?? 'agent';
    return {
      ...member,
      kind,
      memberAddress,
      displayName: member.displayName ?? memberAddress.split('/').filter(Boolean).at(-1) ?? 'member',
      agentRunId: kind === 'agent' ? (member.agentRunId ?? `${memberAddress}-run`) : null,
      teamRunIdForNode: kind === 'agent_team' ? (member.teamRunIdForNode ?? `${memberAddress}-team-run`) : null,
      coordinatorAddress: kind === 'agent_team'
        ? exactAddress(member.coordinatorAddress ?? member.children?.[0]?.memberAddress ?? memberAddress)
        : null,
      currentStatus: member.currentStatus ?? 'offline',
      children: (member.children ?? []).map(buildCurrentMember),
    };
  };

  const buildCurrentTeamNode = (team: any): any => {
    const members = (team.members ?? []).map(buildCurrentMember);
    const flattenRows = (rows: any[], depth = 0): any[] => rows.flatMap((row) => [{
      kind: 'stable_member',
      teamRunId: team.teamRunId,
      memberKind: row.kind,
      memberAddress: row.memberAddress,
      executionAddress: executionAddress(team.teamRunId, row.memberAddress),
      displayName: row.displayName,
      depth,
      hasChildren: row.children.length > 0,
      row,
    }, ...flattenRows(row.children, depth + 1)]);
    return {
      ...team,
      focusedExecutionAddress: team.focusedExecutionAddress ?? executionAddress(
        team.teamRunId,
        exactAddress(team.focusedAddress ?? team.coordinatorAddress ?? members[0]?.memberAddress ?? '/'),
      ),
      rootTeam: team.rootTeam ?? {
        teamRunId: team.teamRunId,
        kind: 'agent_team',
        memberAddress: '/',
        displayName: team.teamDefinitionName,
        teamDefinitionId: team.teamDefinitionId,
        teamRunIdForNode: team.teamRunId,
        coordinatorAddress: exactAddress(team.coordinatorAddress ?? members[0]?.memberAddress ?? '/'),
        workspaceRootPath: team.workspaceRootPath ?? null,
        summary: team.summary,
        lastActivityAt: team.lastActivityAt,
        currentStatus: null,
        isActive: team.isActive,
        deleteLifecycle: team.deleteLifecycle,
        children: members,
      },
      members,
      executionRows: flattenRows(members),
    };
  };

  const buildCurrentTeamNodes = (teams: any[]): any[] => teams.map(buildCurrentTeamNode);

  const workspaceIdFromRoot = (workspaceRootPath: string | null | undefined): string =>
    `workspace:${workspaceRootPath || 'unknown'}`;

  const normalizeWorkspaceNode = (workspace: any): any => ({
    ...workspace,
    workspaceId: workspace.workspaceId ?? workspaceIdFromRoot(workspace.workspaceRootPath),
  });

  const state = {
    loading: false,
    error: null as string | null,
    selectedRunId: null as string | null,
    selectedTeamRunId: null as string | null,
    workspaceGroups: [] as any[],
    workspaceHistoryLoadingById: {} as Record<string, boolean>,
    workspaceHistoryErrorById: {} as Record<string, string | null>,
    nodes: [
      {
        workspaceRootPath: '/ws/a',
        workspaceName: 'autobyteus_org',
        agents: [
          {
            agentDefinitionId: 'agent-def-1',
            agentName: 'SuperAgent',
            agentAvatarUrl: 'https://example.com/superagent.png',
            runs: [
              {
                runId: 'temp-1',
                summary: 'New - SuperAgent',
                lastActivityAt: '2026-01-01T01:00:00.000Z',
                lastKnownStatus: 'IDLE',
                isActive: false,
                source: 'draft',
                isDraft: true,
              },
              {
                runId: 'run-1',
                summary: 'Describe messaging bindings',
                lastActivityAt: '2026-01-01T00:00:00.000Z',
                lastKnownStatus: 'ACTIVE',
                isActive: true,
                source: 'history',
                isDraft: false,
              },
            ],
          },
        ],
      },
    ] as any[],
    teamNodesByWorkspace: {} as Record<string, any[]>,
  };

  return {
    runHistoryState: state,
    runHistoryStoreMock: {
      get loading() {
        return state.loading;
      },
      get error() {
        return state.error;
      },
      get selectedRunId() {
        return state.selectedRunId;
      },
      get selectedTeamRunId() {
        return state.selectedTeamRunId;
      },
      get workspaceGroups() {
        return state.workspaceGroups;
      },
      get workspaceHistoryLoadingById() {
        return state.workspaceHistoryLoadingById;
      },
      get workspaceHistoryErrorById() {
        return state.workspaceHistoryErrorById;
      },
      get navigationTopologyRevision() {
        return 0;
      },
      fetchTree: vi.fn().mockResolvedValue(undefined),
      loadWorkspaceCatalogForNavigation: vi.fn().mockResolvedValue(undefined),
      refreshTreeQuietly: vi.fn().mockResolvedValue(undefined),
      fetchWorkspaceHistory: vi.fn().mockResolvedValue(undefined),
      refreshWorkspaceHistoryQuietly: vi.fn().mockResolvedValue(undefined),
      pruneWorkspace: vi.fn(),
      getTreeNodes: vi.fn(() => state.nodes.map(normalizeWorkspaceNode)),
      getTeamNodes: vi.fn((workspaceRootPath?: string) => {
        if (!workspaceRootPath) {
          return buildCurrentTeamNodes(Object.values(state.teamNodesByWorkspace).flat());
        }
        return buildCurrentTeamNodes(state.teamNodesByWorkspace[workspaceRootPath] || []);
      }),
      getAgentNavigationAncestry: vi.fn((runId: string) => {
        for (const workspace of state.nodes.map(normalizeWorkspaceNode)) {
          const agent = workspace.agents.find((candidate: any) =>
            candidate.runs.some((run: any) => run.runId === runId));
          if (agent) return { workspaceId: workspace.workspaceId, agentDefinitionId: agent.agentDefinitionId };
        }
        return null;
      }),
      getTeamNavigationAncestry: vi.fn((teamRunId: string) => {
        for (const [workspaceRootPath, teams] of Object.entries(state.teamNodesByWorkspace)) {
          const team = teams.find((candidate: any) => candidate.teamRunId === teamRunId);
          if (team) {
            return {
              workspaceId: workspaceIdFromRoot(workspaceRootPath),
              teamDefinitionGroupKey: team.teamDefinitionId,
            };
          }
        }
        return null;
      }),
      getTeamMemberNavigationAncestorAddresses: vi.fn(() => []),
      formatRelativeTime: vi.fn((iso: string) => (iso.includes('01:00') ? 'now' : '4h')),
      selectTreeRun: vi.fn(),
      createDraftRun: vi.fn().mockResolvedValue('temp-2'),
      createWorkspace: vi.fn(async (rootPath: string) => rootPath),
      deleteRun: vi.fn().mockResolvedValue(true),
      deleteTeamRun: vi.fn().mockResolvedValue(true),
    },
    workspaceStoreMock: {
      workspaces: {
        'ws-1': {
          absolutePath: '/ws/a',
          workspaceConfig: { root_path: '/ws/a' },
        },
      },
      fetchAllWorkspaces: vi.fn().mockResolvedValue(undefined),
      removeWorkspace: vi.fn().mockResolvedValue({ workspaceRootPath: '/ws/a', message: 'removed' }),
    },
    selectionStoreMock: {
      selectedType: null as 'agent' | 'team' | null,
      selectedRunId: null as string | null,
      selectRun: vi.fn(),
    },
    agentRunStoreMock: {
      terminateRun: vi.fn().mockResolvedValue(true),
      closeAgent: vi.fn().mockResolvedValue(undefined),
    },
    teamRunStoreMock: {
      stopPendingTeamIds: { __v_isRef: true, value: {} },
      terminateTeamRun: vi.fn().mockResolvedValue(undefined),
    },
    agentDefinitionStoreMock: {
      agentDefinitions: [
        {
          id: 'agent-def-1',
          name: 'Super Agent',
          avatarUrl: 'https://example.com/team-member.png',
        },
      ],
      fetchAllAgentDefinitions: vi.fn().mockResolvedValue(undefined),
    },
    agentTeamDefinitionStoreMock: {
      agentTeamDefinitions: [
        {
          id: 'team-def-1',
          name: 'Team Alpha',
          avatarUrl: 'https://example.com/team-alpha.png',
        },
      ],
      fetchAllAgentTeamDefinitions: vi.fn().mockResolvedValue(undefined),
    },
    windowNodeContextStoreMock: {
      isEmbeddedWindow: { __v_isRef: true, value: false },
    },
    addToastMock: vi.fn(),
  };
});

vi.mock('~/stores/runHistoryStore', () => ({
  useRunHistoryStore: () => runHistoryStoreMock,
}));

vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => workspaceStoreMock,
}));

vi.mock('~/stores/agentSelectionStore', () => ({
  useAgentSelectionStore: () => selectionStoreMock,
}));

vi.mock('~/stores/agentRunStore', () => ({
  useAgentRunStore: () => agentRunStoreMock,
}));

vi.mock('~/stores/agentTeamRunStore', () => ({
  useAgentTeamRunStore: () => teamRunStoreMock,
}));

vi.mock('~/stores/agentDefinitionStore', () => ({
  useAgentDefinitionStore: () => agentDefinitionStoreMock,
}));

vi.mock('~/stores/agentTeamDefinitionStore', () => ({
  useAgentTeamDefinitionStore: () => agentTeamDefinitionStoreMock,
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}));

vi.mock('~/composables/useNativeFolderDialog', () => ({
  pickFolderPath: vi.fn().mockResolvedValue(null),
}));

vi.mock('~/composables/useToasts', () => ({
  useToasts: () => ({
    addToast: addToastMock,
  }),
}));

describe('WorkspaceAgentRunsTreePanel regressions', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    runHistoryState.loading = false;
    runHistoryState.error = null;
    runHistoryState.selectedRunId = null;
    runHistoryState.selectedTeamRunId = null;
    runHistoryState.workspaceHistoryLoadingById = {};
    runHistoryState.workspaceHistoryErrorById = {};
    runHistoryState.workspaceGroups = [];
    runHistoryState.teamNodesByWorkspace = {};
    selectionStoreMock.selectedType = null;
    selectionStoreMock.selectedRunId = null;
    selectionStoreMock.selectRun.mockImplementation((runId: string, type: 'agent' | 'team') => {
      selectionStoreMock.selectedRunId = runId;
      selectionStoreMock.selectedType = type;
    });
    runHistoryStoreMock.selectTreeRun.mockImplementation(async (row: any) => {
      if ('teamRunId' in row) {
        selectionStoreMock.selectedType = 'team';
        selectionStoreMock.selectedRunId = row.teamRunId;
        return;
      }

      selectionStoreMock.selectedType = 'agent';
      selectionStoreMock.selectedRunId = row.runId;
      runHistoryState.selectedRunId = row.runId;
    });
  });

  const mountComponent = () => mount(WorkspaceAgentRunsTreePanel, {
    global: {
      stubs: {
        Icon: { template: '<span class="icon-stub" />' },
        ConfirmationModal: {
          props: ['show'],
          template: '<div v-if="show" data-test="delete-confirmation-modal" />',
        },
      },
    },
  });

  const expandWorkspace = async (wrapper: any, workspaceRootPath = '/ws/a') => {
    const workspaceRow = wrapper.get(
      `[data-test="workspace-row"][data-workspace-root="${workspaceRootPath}"]`,
    );
    if (workspaceRow.attributes('aria-expanded') !== 'true') {
      await workspaceRow.get('button').trigger('click');
      await flushPromises();
    }
  };

  const expandAgentGroup = async (
    wrapper: any,
    workspaceRootPath = '/ws/a',
    agentDefinitionId = 'agent-def-1',
  ) => {
    await expandWorkspace(wrapper, workspaceRootPath);
    const agentRow = wrapper.get(
      `[data-test="workspace-agent-row"][data-workspace-root="${workspaceRootPath}"][data-agent-definition-id="${agentDefinitionId}"]`,
    );
    if (agentRow.attributes('aria-expanded') !== 'true') {
      await agentRow.trigger('click');
      await flushPromises();
    }
  };

  const expandTeamDefinitionGroup = async (
    wrapper: any,
    workspaceRootPath = '/ws/a',
    groupKey = 'team-def-1',
  ) => {
    await expandWorkspace(wrapper, workspaceRootPath);
    const teamDefinitionRow = wrapper.get(`[data-test="workspace-team-definition-row-${groupKey}"]`);
    if (teamDefinitionRow.attributes('aria-expanded') !== 'true') {
      await teamDefinitionRow.trigger('click');
      await flushPromises();
    }
  };

  it('routes team top-row clicks through persisted member hydration instead of blind team selection', async () => {
    runHistoryState.teamNodesByWorkspace['/ws/a'] = [
      {
        teamRunId: 'team-1',
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'Team Alpha',
        workspaceRootPath: '/ws/a',
        summary: 'Team summary',
        lastActivityAt: '2026-01-01T02:00:00.000Z',
        lastKnownStatus: 'IDLE',
        isActive: false,
        currentStatus: 'idle',
        deleteLifecycle: 'READY',
        focusedAddress: '/super_agent',
        members: [
          {
            teamRunId: 'team-1',
            memberAddress: '/super_agent',
            displayName: 'Super Agent',
            agentRunId: 'member-run-1',
            workspaceRootPath: '/ws/a',
            summary: 'Team summary',
            lastActivityAt: '2026-01-01T02:00:00.000Z',
            lastKnownStatus: 'IDLE',
            isActive: false,
            deleteLifecycle: 'READY',
          },
        ],
      },
    ];

    const wrapper = mountComponent();
    await flushPromises();
    await expandTeamDefinitionGroup(wrapper);

    await wrapper.get('[data-test="workspace-team-row-team-1"]').trigger('click');
    await flushPromises();

    expect(runHistoryStoreMock.selectTreeRun).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: 'team-1',
        memberAddress: '/super_agent',
      }),
    );
  });

  it('keeps a previously selected team expanded when another team row is opened', async () => {
    selectionStoreMock.selectedType = 'team';
    selectionStoreMock.selectedRunId = 'team-live';
    runHistoryState.teamNodesByWorkspace['/ws/a'] = [
      {
        teamRunId: 'team-live',
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'Live Team',
        workspaceRootPath: '/ws/a',
        summary: 'Live team summary',
        lastActivityAt: '2026-01-01T02:00:00.000Z',
        lastKnownStatus: 'ACTIVE',
        isActive: true,
        currentStatus: 'processing',
        deleteLifecycle: 'CLEANUP_PENDING',
        focusedAddress: '/live_member',
        members: [
          {
            teamRunId: 'team-live',
            memberAddress: '/live_member',
            displayName: 'Live Member',
            agentRunId: 'member-live-1',
            workspaceRootPath: '/ws/a',
            summary: 'Live member summary',
            lastActivityAt: '2026-01-01T02:00:00.000Z',
            lastKnownStatus: 'ACTIVE',
            isActive: true,
            deleteLifecycle: 'CLEANUP_PENDING',
          },
        ],
      },
      {
        teamRunId: 'team-history',
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'History Team',
        workspaceRootPath: '/ws/a',
        summary: 'History team summary',
        lastActivityAt: '2026-01-01T03:00:00.000Z',
        lastKnownStatus: 'IDLE',
        isActive: false,
        currentStatus: 'idle',
        deleteLifecycle: 'READY',
        focusedAddress: '/history_member',
        members: [
          {
            teamRunId: 'team-history',
            memberAddress: '/history_member',
            displayName: 'History Member',
            agentRunId: 'member-history-1',
            workspaceRootPath: '/ws/a',
            summary: 'History member summary',
            lastActivityAt: '2026-01-01T03:00:00.000Z',
            lastKnownStatus: 'IDLE',
            isActive: false,
            deleteLifecycle: 'READY',
          },
        ],
      },
    ];

    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.find('[data-test="workspace-team-member-team-live-/live_member"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="workspace-team-member-team-history-/history_member"]').exists()).toBe(false);

    await wrapper.get('[data-test="workspace-team-row-team-history"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-test="workspace-team-member-team-live-/live_member"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="workspace-team-member-team-history-/history_member"]').exists()).toBe(true);
  });

  it('removes a draft agent row through the local close path', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    await expandAgentGroup(wrapper);

    await wrapper.get('button[title="Remove draft run"]').trigger('click');
    await flushPromises();

    expect(agentRunStoreMock.closeAgent).toHaveBeenCalledWith('temp-1', { terminate: false });
    expect(runHistoryStoreMock.deleteRun).not.toHaveBeenCalled();
    expect(addToastMock).toHaveBeenCalledWith('Draft run removed.', 'success');
  });

});
