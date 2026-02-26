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
  teamContextsStoreMock,
  agentRunStoreMock,
  agentTeamRunStoreMock,
  windowNodeContextStoreMock,
  pickFolderPathMock,
  addToastMock,
} = vi.hoisted(() => {
  const state = {
    loading: false,
    error: null as string | null,
    selectedAgentId: null as string | null,
    selectedTeamId: null as string | null,
    selectedTeamMemberRouteKey: null as string | null,
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
                agentId: 'temp-1',
                summary: 'New - SuperAgent',
                lastActivityAt: '2026-01-01T01:00:00.000Z',
                lastKnownStatus: 'IDLE',
                isActive: false,
                source: 'draft',
                isDraft: true,
              },
              {
                agentId: 'run-1',
                summary: 'Describe messaging bindings',
                lastActivityAt: '2026-01-01T00:00:00.000Z',
                lastKnownStatus: 'ACTIVE',
                isActive: true,
                source: 'history',
                isDraft: false,
              },
              {
                agentId: 'run-2',
                summary: 'Historical draft cleanup',
                lastActivityAt: '2026-01-01T00:10:00.000Z',
                lastKnownStatus: 'IDLE',
                isActive: false,
                source: 'history',
                isDraft: false,
              },
            ],
          },
        ],
      },
    ] as any[],
    teamNodes: [] as any[],
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
      get selectedAgentId() {
        return state.selectedAgentId;
      },
      get selectedTeamId() {
        return state.selectedTeamId;
      },
      get selectedTeamMemberRouteKey() {
        return state.selectedTeamMemberRouteKey;
      },
      fetchTree: vi.fn().mockResolvedValue(undefined),
      getTreeNodes: vi.fn(() => state.nodes),
      getTeamNodes: vi.fn(() => state.teamNodes),
      formatRelativeTime: vi.fn((iso: string) => (iso.includes('01:00') ? 'now' : '4h')),
      selectTreeRun: vi.fn().mockResolvedValue(undefined),
      createDraftRun: vi.fn().mockResolvedValue('temp-2'),
      createWorkspace: vi.fn(async (rootPath: string) => rootPath),
      deleteRun: vi.fn().mockResolvedValue(true),
      deleteTeamRun: vi.fn().mockResolvedValue(true),
    },
    workspaceStoreMock: {
      fetchAllWorkspaces: vi.fn().mockResolvedValue(undefined),
    },
    selectionStoreMock: {
      selectedType: null as string | null,
      selectedRunId: null as string | null,
    },
    teamContextsStoreMock: {
      getTeamContextById: vi.fn(() => null),
    },
    agentRunStoreMock: {
      terminateRun: vi.fn().mockResolvedValue(true),
    },
    agentTeamRunStoreMock: {
      terminateTeamRun: vi.fn().mockResolvedValue(undefined),
    },
    windowNodeContextStoreMock: {
      isEmbeddedWindow: { __v_isRef: true, value: false },
    },
    pickFolderPathMock: vi.fn().mockResolvedValue(null),
    addToastMock: vi.fn(),
  };
});

vi.mock('~/stores/runTreeStore', () => ({
  useRunTreeStore: () => runHistoryStoreMock,
}));

vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => workspaceStoreMock,
}));

vi.mock('~/stores/agentSelectionStore', () => ({
  useAgentSelectionStore: () => selectionStoreMock,
}));

vi.mock('~/stores/agentTeamContextsStore', () => ({
  useAgentTeamContextsStore: () => teamContextsStoreMock,
}));

vi.mock('~/stores/agentRunStore', () => ({
  useAgentRunStore: () => agentRunStoreMock,
}));

vi.mock('~/stores/agentTeamRunStore', () => ({
  useAgentTeamRunStore: () => agentTeamRunStoreMock,
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}));

vi.mock('~/composables/useNativeFolderDialog', () => ({
  pickFolderPath: pickFolderPathMock,
}));

vi.mock('~/composables/useToasts', () => ({
  useToasts: () => ({
    addToast: addToastMock,
  }),
}));

describe('WorkspaceAgentRunsTreePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runHistoryState.loading = false;
    runHistoryState.error = null;
    runHistoryState.selectedAgentId = null;
    runHistoryState.selectedTeamId = null;
    runHistoryState.selectedTeamMemberRouteKey = null;
    runHistoryState.teamNodes = [];
    selectionStoreMock.selectedType = null;
    selectionStoreMock.selectedRunId = null;
    teamContextsStoreMock.getTeamContextById.mockReset();
    teamContextsStoreMock.getTeamContextById.mockReturnValue(null);
    windowNodeContextStoreMock.isEmbeddedWindow.value = false;
    pickFolderPathMock.mockResolvedValue(null);
    delete (window as any).electronAPI;
  });

  const mountComponent = () => mount(WorkspaceAgentRunsTreePanel, {
    global: {
      stubs: {
        Icon: { template: '<span class="icon-stub" />' },
        ConfirmationModal: {
          props: ['show'],
          template: `
            <div v-if="show" data-test="delete-confirmation-modal">
              <button
                type="button"
                data-test="delete-confirmation-confirm"
                @click="$emit('confirm')"
              >
                confirm
              </button>
              <button
                type="button"
                data-test="delete-confirmation-cancel"
                @click="$emit('cancel')"
              >
                cancel
              </button>
            </div>
          `,
        },
      },
    },
  });

  it('loads workspace list and history tree on mount', async () => {
    mountComponent();
    await flushPromises();

    expect(workspaceStoreMock.fetchAllWorkspaces).toHaveBeenCalledTimes(1);
    expect(runHistoryStoreMock.fetchTree).toHaveBeenCalledTimes(1);
  });

  it('renders agent avatar image when the tree node provides avatar URL', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    const avatar = wrapper.find('img[alt="SuperAgent avatar"]');
    expect(avatar.exists()).toBe(true);
    expect(avatar.attributes('src')).toBe('https://example.com/superagent.png');
  });

  it('handles avatar error events without breaking tree rendering', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    const avatar = wrapper.find('img[alt="SuperAgent avatar"]');
    expect(avatar.exists()).toBe(true);
    await avatar.trigger('error');
    await flushPromises();
    expect(wrapper.text()).toContain('SuperAgent');
  });

  it('selects run via runHistoryStore.selectTreeRun and emits run-selected', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    const runButton = wrapper.findAll('button').find((button) =>
      button.text().includes('Describe messaging bindings'),
    );
    expect(runButton).toBeTruthy();

    await runButton!.trigger('click');
    await flushPromises();

    expect(runHistoryStoreMock.selectTreeRun).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: 'run-1', source: 'history' }),
    );
    expect(wrapper.emitted('run-selected')).toEqual([
      [{ type: 'agent', runId: 'run-1' }],
    ]);
  });

  it('creates draft run from agent row plus button and emits run-created', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    const createButtons = wrapper.findAll('button[title="New run with this agent"]');
    expect(createButtons.length).toBe(1);

    await createButtons[0]!.trigger('click');
    await flushPromises();

    expect(runHistoryStoreMock.createDraftRun).toHaveBeenCalledWith({
      workspaceRootPath: '/ws/a',
      agentDefinitionId: 'agent-def-1',
    });
    expect(wrapper.emitted('run-created')).toEqual([
      [{ type: 'agent', definitionId: 'agent-def-1' }],
    ]);
  });

  it('opens native folder picker on embedded electron and creates workspace from selected path', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow.value = true;
    (window as any).electronAPI = {
      showFolderDialog: vi.fn(),
    };
    pickFolderPathMock.mockResolvedValue('/ws/from-picker');

    const wrapper = mountComponent();
    await flushPromises();

    await wrapper.find('button[title="Add workspace"]').trigger('click');
    await flushPromises();

    expect(pickFolderPathMock).toHaveBeenCalledTimes(1);
    expect(runHistoryStoreMock.createWorkspace).toHaveBeenCalledWith('/ws/from-picker');
    expect(wrapper.find('[data-test="create-workspace-form"]').exists()).toBe(false);
  });

  it('does not create workspace when embedded electron picker is canceled', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow.value = true;
    (window as any).electronAPI = {
      showFolderDialog: vi.fn(),
    };
    pickFolderPathMock.mockResolvedValue(null);

    const wrapper = mountComponent();
    await flushPromises();

    await wrapper.find('button[title="Add workspace"]').trigger('click');
    await flushPromises();

    expect(pickFolderPathMock).toHaveBeenCalledTimes(1);
    expect(runHistoryStoreMock.createWorkspace).not.toHaveBeenCalled();
    expect(wrapper.find('[data-test="create-workspace-form"]').exists()).toBe(false);
  });

  it('renders active status indicator for active runs', async () => {
    const wrapper = mountComponent();
    await nextTick();
    const activeDot = wrapper.find('.bg-blue-500.animate-pulse');
    expect(activeDot.exists()).toBe(true);
  });

  it('does not render status indicator for inactive runs', async () => {
    const wrapper = mountComponent();
    await nextTick();
    const statusDots = wrapper.findAll('span.bg-blue-500.animate-pulse');
    expect(statusDots).toHaveLength(1);
  });

  it('renders delete action only for inactive history runs', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    const deleteButtons = wrapper.findAll('button[title="Delete run permanently"]');
    expect(deleteButtons).toHaveLength(1);
  });

  it('terminates active run from row action without selecting the row', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    const terminateButton = wrapper.find('button[title="Terminate run"]');
    expect(terminateButton.exists()).toBe(true);

    await terminateButton.trigger('click');
    await flushPromises();

    expect(agentRunStoreMock.terminateRun).toHaveBeenCalledWith('run-1');
    expect(runHistoryStoreMock.selectTreeRun).not.toHaveBeenCalled();
  });

  it('shows an error toast when terminate fails', async () => {
    agentRunStoreMock.terminateRun.mockResolvedValueOnce(false);
    const wrapper = mountComponent();
    await flushPromises();

    const terminateButton = wrapper.find('button[title="Terminate run"]');
    await terminateButton.trigger('click');
    await flushPromises();

    expect(addToastMock).toHaveBeenCalledWith('Failed to terminate run. Please try again.', 'error');
  });

  it('selects team member row and emits team run-selected', async () => {
    runHistoryState.teamNodes = [
      {
        teamId: 'team-1',
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'Classroom Team',
        summary: 'summary',
        lastActivityAt: '2026-01-01T00:00:00.000Z',
        lastKnownStatus: 'IDLE',
        isActive: false,
        deleteLifecycle: 'READY',
        members: [
          {
            teamId: 'team-1',
            memberRouteKey: 'coordinator',
            memberName: 'Coordinator',
            memberAgentId: 'ag-1',
            workspaceRootPath: '/ws/a',
            hostNodeId: 'node-a',
            summary: 'summary',
            lastActivityAt: '2026-01-01T00:00:00.000Z',
            lastKnownStatus: 'IDLE',
            isActive: false,
            deleteLifecycle: 'READY',
          },
        ],
      },
    ];
    const wrapper = mountComponent();
    await flushPromises();

    const memberButton = wrapper.findAll('button').find((button) => button.text().includes('Coordinator'));
    expect(memberButton).toBeTruthy();
    await memberButton!.trigger('click');
    await flushPromises();

    expect(runHistoryStoreMock.selectTreeRun).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: 'team-1', memberRouteKey: 'coordinator' }),
    );
    expect(wrapper.emitted('run-selected')).toContainEqual([
      { type: 'team', runId: 'team-1' },
    ]);
  });

  it('renders only the workspace leaf name for team members', async () => {
    const fullWorkspacePath = '/Users/normy/autobyteus_org/worktrees/team-history-restore/autobyteus-web';
    runHistoryState.teamNodes = [
      {
        teamId: 'team-1',
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'Classroom Team',
        summary: 'summary',
        lastActivityAt: '2026-01-01T00:00:00.000Z',
        lastKnownStatus: 'IDLE',
        isActive: false,
        deleteLifecycle: 'READY',
        members: [
          {
            teamId: 'team-1',
            memberRouteKey: 'coordinator',
            memberName: 'Coordinator',
            memberAgentId: 'ag-1',
            workspaceRootPath: fullWorkspacePath,
            hostNodeId: 'node-a',
            summary: 'summary',
            lastActivityAt: '2026-01-01T00:00:00.000Z',
            lastKnownStatus: 'IDLE',
            isActive: false,
            deleteLifecycle: 'READY',
          },
        ],
      },
    ];
    const wrapper = mountComponent();
    await flushPromises();

    const workspaceLabel = wrapper.find(`span[title="${fullWorkspacePath}"]`);
    expect(workspaceLabel.exists()).toBe(true);
    expect(workspaceLabel.text()).toBe('autobyteus-web');
  });

  it('highlights only the focused team member from team context', async () => {
    runHistoryState.selectedTeamId = 'team-1';
    runHistoryState.teamNodes = [
      {
        teamId: 'team-1',
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'Classroom Team',
        summary: 'summary',
        lastActivityAt: '2026-01-01T00:00:00.000Z',
        lastKnownStatus: 'IDLE',
        isActive: false,
        deleteLifecycle: 'READY',
        members: [
          {
            teamId: 'team-1',
            memberRouteKey: 'coordinator',
            memberName: 'Coordinator',
            memberAgentId: 'ag-1',
            workspaceRootPath: '/ws/a',
            hostNodeId: null,
            summary: 'summary',
            lastActivityAt: '2026-01-01T00:00:00.000Z',
            lastKnownStatus: 'IDLE',
            isActive: false,
            deleteLifecycle: 'READY',
          },
          {
            teamId: 'team-1',
            memberRouteKey: 'student',
            memberName: 'Student',
            memberAgentId: 'ag-2',
            workspaceRootPath: '/ws/a',
            hostNodeId: null,
            summary: 'summary',
            lastActivityAt: '2026-01-01T00:00:00.000Z',
            lastKnownStatus: 'IDLE',
            isActive: false,
            deleteLifecycle: 'READY',
          },
        ],
      },
    ];
    teamContextsStoreMock.getTeamContextById.mockImplementation((teamId: string) => {
      if (teamId === 'team-1') {
        return { focusedMemberName: 'student' };
      }
      return null;
    });

    const wrapper = mountComponent();
    await flushPromises();

    const coordinatorButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Coordinator'));
    const studentButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Student'));

    expect(coordinatorButton).toBeTruthy();
    expect(studentButton).toBeTruthy();
    expect(coordinatorButton!.classes()).not.toContain('bg-indigo-50');
    expect(studentButton!.classes()).toContain('bg-indigo-50');
  });

  it('terminates active team from Teams section row action', async () => {
    runHistoryState.teamNodes = [
      {
        teamId: 'team-2',
        teamDefinitionId: 'team-def-2',
        teamDefinitionName: 'Ops Team',
        summary: 'summary',
        lastActivityAt: '2026-01-01T00:00:00.000Z',
        lastKnownStatus: 'ACTIVE',
        isActive: true,
        deleteLifecycle: 'READY',
        members: [],
      },
    ];
    const wrapper = mountComponent();
    await flushPromises();

    const terminateButton = wrapper.find('button[title="Terminate team"]');
    expect(terminateButton.exists()).toBe(true);
    await terminateButton.trigger('click');
    await flushPromises();

    expect(agentTeamRunStoreMock.terminateTeamRun).toHaveBeenCalledWith('team-2');
  });
});
