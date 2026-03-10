import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
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
  const state = {
    loading: false,
    error: null as string | null,
    selectedRunId: null as string | null,
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
      fetchTree: vi.fn().mockResolvedValue(undefined),
      refreshTreeQuietly: vi.fn().mockResolvedValue(undefined),
      getTreeNodes: vi.fn(() => state.nodes),
      getTeamNodes: vi.fn((workspaceRootPath: string) => state.teamNodesByWorkspace[workspaceRootPath] || []),
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
      terminateTeamRun: vi.fn().mockResolvedValue(undefined),
      discardDraftTeamRun: vi.fn().mockResolvedValue(true),
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
    vi.clearAllMocks();
    runHistoryState.loading = false;
    runHistoryState.error = null;
    runHistoryState.selectedRunId = null;
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
        currentStatus: 'shutdown_complete',
        deleteLifecycle: 'READY',
        focusedMemberName: 'super_agent',
        members: [
          {
            teamRunId: 'team-1',
            memberRouteKey: 'super_agent',
            memberName: 'Super Agent',
            memberRunId: 'member-run-1',
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

    await wrapper.get('[data-test="workspace-team-row-team-1"]').trigger('click');
    await flushPromises();

    expect(runHistoryStoreMock.selectTreeRun).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: 'team-1',
        memberRouteKey: 'super_agent',
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
        focusedMemberName: 'live_member',
        members: [
          {
            teamRunId: 'team-live',
            memberRouteKey: 'live_member',
            memberName: 'Live Member',
            memberRunId: 'member-live-1',
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
        currentStatus: 'shutdown_complete',
        deleteLifecycle: 'READY',
        focusedMemberName: 'history_member',
        members: [
          {
            teamRunId: 'team-history',
            memberRouteKey: 'history_member',
            memberName: 'History Member',
            memberRunId: 'member-history-1',
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

    expect(wrapper.find('[data-test="workspace-team-member-team-live-live_member"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="workspace-team-member-team-history-history_member"]').exists()).toBe(false);

    await wrapper.get('[data-test="workspace-team-row-team-history"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-test="workspace-team-member-team-live-live_member"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="workspace-team-member-team-history-history_member"]').exists()).toBe(true);
  });

  it('removes a draft agent row through the local close path', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    await wrapper.get('button[title="Remove draft run"]').trigger('click');
    await flushPromises();

    expect(agentRunStoreMock.closeAgent).toHaveBeenCalledWith('temp-1', { terminate: false });
    expect(runHistoryStoreMock.deleteRun).not.toHaveBeenCalled();
    expect(addToastMock).toHaveBeenCalledWith('Draft run removed.', 'success');
  });

  it('removes a draft team row through the local discard path', async () => {
    runHistoryState.teamNodesByWorkspace['/ws/a'] = [
      {
        teamRunId: 'temp-team-1',
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'Team Alpha',
        workspaceRootPath: '/ws/a',
        summary: 'Draft team summary',
        lastActivityAt: '2026-01-01T02:00:00.000Z',
        lastKnownStatus: 'IDLE',
        isActive: false,
        currentStatus: 'idle',
        deleteLifecycle: 'READY',
        focusedMemberName: 'super_agent',
        members: [
          {
            teamRunId: 'temp-team-1',
            memberRouteKey: 'super_agent',
            memberName: 'Super Agent',
            memberRunId: 'temp-member-1',
            workspaceRootPath: '/ws/a',
            summary: 'Draft team summary',
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

    await wrapper.get('button[title="Remove draft team"]').trigger('click');
    await flushPromises();

    expect(teamRunStoreMock.discardDraftTeamRun).toHaveBeenCalledWith('temp-team-1');
    expect(teamRunStoreMock.terminateTeamRun).not.toHaveBeenCalled();
    expect(runHistoryStoreMock.deleteTeamRun).not.toHaveBeenCalled();
    expect(addToastMock).toHaveBeenCalledWith('Draft team removed.', 'success');
  });
});
