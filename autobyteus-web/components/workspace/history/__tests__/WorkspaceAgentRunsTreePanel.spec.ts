import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
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
  workspaceCenterViewStoreMock,
  windowNodeContextStoreMock,
  pickFolderPathMock,
  addToastMock,
} = vi.hoisted(() => {
  const state = {
    loading: false,
    error: null as string | null,
    selectedRunId: null as string | null,
    teamNodesByWorkspace: {} as Record<string, any[]>,
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
              {
                runId: 'run-2',
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
      getTreeNodes: vi.fn(() => state.nodes),
      getTeamNodes: vi.fn((workspaceRootPath: string) => state.teamNodesByWorkspace[workspaceRootPath] || []),
      formatRelativeTime: vi.fn((iso: string) => (iso.includes('01:00') ? 'now' : '4h')),
      selectTreeRun: vi.fn().mockResolvedValue(undefined),
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
      selectedType: null as string | null,
      selectedRunId: null as string | null,
      selectRun: vi.fn(),
    },
    agentRunStoreMock: {
      terminateRun: vi.fn().mockResolvedValue(true),
    },
    teamRunStoreMock: {
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
    workspaceCenterViewStoreMock: {
      showChat: vi.fn(),
      showConfig: vi.fn(),
    },
    windowNodeContextStoreMock: {
      isEmbeddedWindow: { __v_isRef: true, value: false },
    },
    pickFolderPathMock: vi.fn().mockResolvedValue(null),
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

vi.mock('~/stores/workspaceCenterViewStore', () => ({
  useWorkspaceCenterViewStore: () => workspaceCenterViewStoreMock,
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
    runHistoryState.selectedRunId = null;
    runHistoryState.teamNodesByWorkspace = {};
    selectionStoreMock.selectedType = null;
    selectionStoreMock.selectedRunId = null;
    agentDefinitionStoreMock.agentDefinitions = [
      {
        id: 'agent-def-1',
        name: 'Super Agent',
        avatarUrl: 'https://example.com/team-member.png',
      },
    ];
    agentTeamDefinitionStoreMock.agentTeamDefinitions = [
      {
        id: 'team-def-1',
        name: 'Team Alpha',
        avatarUrl: 'https://example.com/team-alpha.png',
      },
    ];
    windowNodeContextStoreMock.isEmbeddedWindow.value = false;
    pickFolderPathMock.mockResolvedValue(null);
    workspaceCenterViewStoreMock.showChat.mockReset();
    workspaceCenterViewStoreMock.showConfig.mockReset();
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

  it('tracks broken avatar per URL key so a changed avatar URL can recover', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    const vm = wrapper.vm as any;
    const workspaceRootPath = '/ws/a';
    const agentDefinitionId = 'agent-def-1';
    const firstAvatarUrl = 'https://example.com/superagent.png';
    const replacementAvatarUrl = 'https://example.com/superagent-v2.png';

    expect(vm.showAgentAvatar(workspaceRootPath, agentDefinitionId, firstAvatarUrl)).toBe(true);
    vm.onAgentAvatarError(workspaceRootPath, agentDefinitionId, firstAvatarUrl);
    await nextTick();
    expect(vm.showAgentAvatar(workspaceRootPath, agentDefinitionId, firstAvatarUrl)).toBe(false);
    expect(vm.showAgentAvatar(workspaceRootPath, agentDefinitionId, replacementAvatarUrl)).toBe(true);
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
      expect.objectContaining({ runId: 'run-1', source: 'history' }),
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

  it('does not render run-row configuration button', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    const configButton = wrapper.find('[data-test="workspace-run-config-run-1"]');
    expect(configButton.exists()).toBe(false);
  });

  it('renders team rows under workspace and selects the team when clicked', async () => {
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

    expect(wrapper.text()).toContain('Teams');
    const row = wrapper.find('[data-test="workspace-team-row-team-1"]');
    expect(row.exists()).toBe(true);

    await row.trigger('click');
    await flushPromises();

    expect(selectionStoreMock.selectRun).toHaveBeenCalledWith('team-1', 'team');
    expect(wrapper.emitted('run-selected')).toContainEqual([
      { type: 'team', runId: 'team-1' },
    ]);
  });

  it('renders team avatar image when team definition avatar is available', async () => {
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
        members: [],
      },
    ];

    const wrapper = mountComponent();
    await flushPromises();

    const teamAvatar = wrapper.find('img[alt="Team Alpha avatar"]');
    expect(teamAvatar.exists()).toBe(true);
    expect(teamAvatar.attributes('src')).toBe('https://example.com/team-alpha.png');
  });

  it('renders team member avatar image when matching agent definition avatar is available', async () => {
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

    const teamRow = wrapper.find('[data-test="workspace-team-row-team-1"]');
    expect(teamRow.exists()).toBe(true);
    await teamRow.trigger('click');
    await flushPromises();

    const memberAvatar = wrapper.find('img[alt="Super Agent avatar"]');
    expect(memberAvatar.exists()).toBe(true);
    expect(memberAvatar.attributes('src')).toBe('https://example.com/team-member.png');
  });

  it('selects team member through runHistoryStore so persisted member history can hydrate', async () => {
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

    const teamRow = wrapper.find('[data-test="workspace-team-row-team-1"]');
    expect(teamRow.exists()).toBe(true);
    await teamRow.trigger('click');
    await flushPromises();

    const memberButton = wrapper.find('[data-test="workspace-team-member-team-1-super_agent"]');
    expect(memberButton.exists()).toBe(true);
    await memberButton.trigger('click');
    await flushPromises();

    expect(runHistoryStoreMock.selectTreeRun).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: 'team-1',
        memberRouteKey: 'super_agent',
      }),
    );
    expect(wrapper.emitted('run-selected')).toContainEqual([
      { type: 'team', runId: 'team-1' },
    ]);
  });

  it('renders delete action for inactive team history rows', async () => {
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
        members: [],
      },
    ];

    const wrapper = mountComponent();
    await flushPromises();

    const deleteButtons = wrapper.findAll('button[title="Delete team history permanently"]');
    expect(deleteButtons).toHaveLength(1);
  });

  it('does not render team-row configuration button', async () => {
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

    const configButton = wrapper.find('[data-test="workspace-team-config-team-1"]');
    expect(configButton.exists()).toBe(false);
  });

  it('deletes inactive team history from team row action without selecting the row', async () => {
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
        members: [],
      },
    ];

    const wrapper = mountComponent();
    await flushPromises();
    const vm = wrapper.vm as any;

    const deleteButton = wrapper.find('button[title="Delete team history permanently"]');
    expect(deleteButton.exists()).toBe(true);

    await deleteButton.trigger('click');
    await nextTick();
    expect(vm.showDeleteConfirmation).toBe(true);
    expect(runHistoryStoreMock.deleteTeamRun).not.toHaveBeenCalled();

    await vm.confirmDeleteRun();
    await flushPromises();

    expect(runHistoryStoreMock.deleteTeamRun).toHaveBeenCalledWith('team-1');
    expect(selectionStoreMock.selectRun).not.toHaveBeenCalled();
  });

  it('creates workspace from inline input when user presses Enter', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    const vm = wrapper.vm as any;

    await vm.onCreateWorkspace();
    await flushPromises();
    expect(vm.showCreateWorkspaceInline).toBe(true);
    vm.workspacePathDraft = '/ws/new';
    await vm.confirmCreateWorkspace();
    await flushPromises();

    expect(runHistoryStoreMock.createWorkspace).toHaveBeenCalledWith('/ws/new');
    expect(workspaceStoreMock.fetchAllWorkspaces).toHaveBeenCalledTimes(2);
    expect(vm.showCreateWorkspaceInline).toBe(false);
  });

  it('opens native folder picker on embedded electron and creates workspace from selected path', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow.value = true;
    (window as any).electronAPI = {
      showFolderDialog: vi.fn(),
    };
    pickFolderPathMock.mockResolvedValue('/ws/from-picker');

    const wrapper = mountComponent();
    await flushPromises();
    const vm = wrapper.vm as any;

    await vm.onCreateWorkspace();
    await flushPromises();

    expect(pickFolderPathMock).toHaveBeenCalledTimes(1);
    expect(runHistoryStoreMock.createWorkspace).toHaveBeenCalledWith('/ws/from-picker');
    expect(vm.showCreateWorkspaceInline).toBe(false);
  });

  it('does not create workspace when embedded electron picker is canceled', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow.value = true;
    (window as any).electronAPI = {
      showFolderDialog: vi.fn(),
    };
    pickFolderPathMock.mockResolvedValue(null);

    const wrapper = mountComponent();
    await flushPromises();
    const vm = wrapper.vm as any;

    await vm.onCreateWorkspace();
    await flushPromises();

    expect(pickFolderPathMock).toHaveBeenCalledTimes(1);
    expect(runHistoryStoreMock.createWorkspace).not.toHaveBeenCalled();
    expect(vm.showCreateWorkspaceInline).toBe(false);
  });

  it('closes inline add workspace input without creating workspace on cancel', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    const vm = wrapper.vm as any;

    await vm.onCreateWorkspace();
    await flushPromises();
    expect(vm.showCreateWorkspaceInline).toBe(true);

    vm.closeCreateWorkspaceInput();
    await flushPromises();

    expect(runHistoryStoreMock.createWorkspace).not.toHaveBeenCalled();
    expect(vm.showCreateWorkspaceInline).toBe(false);
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

  it('deletes inactive history run from row action without selecting the row', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    const vm = wrapper.vm as any;

    const deleteButton = wrapper.find('button[title="Delete run permanently"]');
    await deleteButton.trigger('click');
    await nextTick();
    expect(vm.showDeleteConfirmation).toBe(true);
    expect(runHistoryStoreMock.deleteRun).not.toHaveBeenCalled();
    await vm.confirmDeleteRun();
    await flushPromises();

    expect(runHistoryStoreMock.deleteRun).toHaveBeenCalledWith('run-2');
    expect(runHistoryStoreMock.selectTreeRun).not.toHaveBeenCalled();
  });

  it('does not call delete when confirmation is cancelled', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    const vm = wrapper.vm as any;

    const deleteButton = wrapper.find('button[title="Delete run permanently"]');
    await deleteButton.trigger('click');
    await nextTick();
    expect(vm.showDeleteConfirmation).toBe(true);
    vm.closeDeleteConfirmation();
    await flushPromises();

    expect(runHistoryStoreMock.deleteRun).not.toHaveBeenCalled();
    expect(vm.showDeleteConfirmation).toBe(false);
  });

  it('shows an error toast when delete fails', async () => {
    runHistoryStoreMock.deleteRun.mockResolvedValueOnce(false);
    const wrapper = mountComponent();
    await flushPromises();
    const vm = wrapper.vm as any;

    const deleteButton = wrapper.find('button[title="Delete run permanently"]');
    await deleteButton.trigger('click');
    await nextTick();
    expect(vm.showDeleteConfirmation).toBe(true);
    await vm.confirmDeleteRun();
    await flushPromises();

    expect(addToastMock).toHaveBeenCalledWith('Failed to delete run. Please try again.', 'error');
  });
});
