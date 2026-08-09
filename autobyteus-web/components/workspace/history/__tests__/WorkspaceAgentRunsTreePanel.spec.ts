import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import WorkspaceAgentRunsTreePanel from '../WorkspaceAgentRunsTreePanel.vue';

const flushPromises = async () => {
  await Promise.resolve();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

const buildWorkspaceHistoryGroup = (workspace: Record<string, any>) => {
  const {
    agents,
    agentDefinitions,
    teamRuns,
    teamDefinitions,
    ...rest
  } = workspace;

  const groupedTeamDefinitions = teamDefinitions ?? (teamRuns ?? []).reduce((groups: Array<any>, teamRun: any) => {
    const key = teamRun.teamDefinitionId || teamRun.teamDefinitionName || teamRun.teamRunId;
    const existing = groups.find((group) => group.teamDefinitionId === key);
    if (existing) {
      existing.runs.push(teamRun);
      return groups;
    }
    groups.push({
      teamDefinitionId: teamRun.teamDefinitionId,
      teamDefinitionName: teamRun.teamDefinitionName,
      runs: [teamRun],
    });
    return groups;
  }, []);

  return {
    ...rest,
    agentDefinitions: agentDefinitions ?? agents ?? [],
    teamDefinitions: groupedTeamDefinitions,
  };
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
  const normalizeMember = (member: any): any => ({
    ...member,
    memberKind: member.memberKind ?? 'agent',
    memberRouteKey: member.memberRouteKey ?? member.memberName ?? '',
    memberPath: member.memberPath ?? [member.memberRouteKey ?? member.memberName ?? ''],
    displayName: member.displayName ?? member.memberName ?? member.memberRouteKey ?? '',
    currentStatus: member.currentStatus ?? member.status ?? 'offline',
    children: (member.children ?? []).map(normalizeMember),
  });

  const normalizeTeamNode = (team: any): any => {
    const members = (team.members ?? []).map(normalizeMember);
    const memberTree = (team.memberTree ?? []).map(normalizeMember);
    const flattenRows = (rows: any[], depth = 0): any[] => rows.flatMap((row) => [{
      kind: 'stable_member',
      teamRunId: team.teamRunId,
      memberKind: row.memberKind,
      memberRouteKey: row.memberRouteKey,
      memberPath: row.memberPath,
      displayName: row.displayName,
      depth,
      hasChildren: row.children.length > 0,
      row,
    }, ...flattenRows(row.children, depth + 1)]);
    return {
      ...team,
      focusedMemberRouteKey: team.focusedMemberRouteKey ?? team.focusedMemberName ?? '',
      members,
      memberTree,
      executionRows: team.executionRows ?? flattenRows(memberTree.length > 0 ? memberTree : members),
    };
  };

  const normalizeTeamNodes = (teams: any[]): any[] => teams.map(normalizeTeamNode);

  const workspaceIdFromRoot = (workspaceRootPath: string | null | undefined): string =>
    `workspace:${workspaceRootPath || 'unknown'}`;

  const normalizeWorkspaceNode = (workspace: any): any => ({
    ...workspace,
    workspaceId: workspace.workspaceId ?? workspaceIdFromRoot(workspace.workspaceRootPath),
    workspaceKind: workspace.workspaceKind ?? 'filesystem',
    canRemoveFromWorkspaces: workspace.canRemoveFromWorkspaces ?? true,
  });

  const state = {
    loading: false,
    error: null as string | null,
    selectedRunId: null as string | null,
    selectedTeamRunId: null as string | null,
    workspaceGroups: [] as any[],
    workspaceHistoryLoadingById: {} as Record<string, boolean>,
    workspaceHistoryErrorById: {} as Record<string, string | null>,
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
                currentStatus: 'offline',
                isActive: false,
                source: 'draft',
                isDraft: true,
              },
              {
                runId: 'run-1',
                summary: 'Describe messaging bindings',
                lastActivityAt: '2026-01-01T00:00:00.000Z',
                lastKnownStatus: 'ACTIVE',
                currentStatus: 'running',
                isActive: true,
                source: 'history',
                isDraft: false,
              },
              {
                runId: 'run-2',
                summary: 'Historical draft cleanup',
                lastActivityAt: '2026-01-01T00:10:00.000Z',
                lastKnownStatus: 'IDLE',
                currentStatus: 'offline',
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
      refreshTreeQuietly: vi.fn().mockResolvedValue(undefined),
      fetchWorkspaceHistory: vi.fn().mockResolvedValue(undefined),
      refreshWorkspaceHistoryQuietly: vi.fn().mockResolvedValue(undefined),
      pruneWorkspace: vi.fn(),
      getTreeNodes: vi.fn(() => state.nodes.map(normalizeWorkspaceNode)),
      getTeamNodes: vi.fn((workspaceRootPath?: string) => {
        if (!workspaceRootPath) {
          return normalizeTeamNodes(Object.values(state.teamNodesByWorkspace).flat());
        }
        return normalizeTeamNodes(state.teamNodesByWorkspace[workspaceRootPath] || []);
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
      getTeamMemberNavigationAncestorRouteKeys: vi.fn((teamRunId: string, memberRouteKey: string) => {
        const team = normalizeTeamNodes(Object.values(state.teamNodesByWorkspace).flat())
          .find((candidate) => candidate.teamRunId === teamRunId);
        const targetIndex = team?.executionRows.findIndex(
          (row: any) => row.memberRouteKey === memberRouteKey,
        ) ?? -1;
        if (!team || targetIndex < 0) return [];
        const ancestors: string[] = [];
        let expectedDepth = team.executionRows[targetIndex].depth - 1;
        for (let index = targetIndex - 1; index >= 0 && expectedDepth >= 0; index -= 1) {
          const row = team.executionRows[index];
          if (row.depth !== expectedDepth || !row.hasChildren) continue;
          ancestors.unshift(row.memberRouteKey);
          expectedDepth -= 1;
        }
        return ancestors;
      }),
      formatRelativeTime: vi.fn((iso: string) => (iso.includes('01:00') ? 'now' : '4h')),
      selectTreeRun: vi.fn().mockResolvedValue(undefined),
      createDraftRun: vi.fn().mockResolvedValue('temp-2'),
      createWorkspace: vi.fn(async (rootPath: string) => rootPath),
      deleteRun: vi.fn().mockResolvedValue(true),
      deleteTeamRun: vi.fn().mockResolvedValue(true),
      archiveRun: vi.fn().mockResolvedValue(true),
      archiveTeamRun: vi.fn().mockResolvedValue(true),
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
      selectedType: null as string | null,
      selectedRunId: null as string | null,
      selectRun: vi.fn(),
    },
    agentRunStoreMock: {
      terminateRun: vi.fn().mockResolvedValue(true),
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
    setActivePinia(createPinia());
    vi.clearAllMocks();
    runHistoryState.loading = false;
    runHistoryState.error = null;
    runHistoryState.selectedRunId = null;
    runHistoryState.selectedTeamRunId = null;
    runHistoryState.workspaceHistoryLoadingById = {};
    runHistoryState.workspaceHistoryErrorById = {};
    runHistoryState.nodes = [
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
                currentStatus: 'offline',
                isActive: false,
                source: 'draft',
                isDraft: true,
              },
              {
                runId: 'run-1',
                summary: 'Describe messaging bindings',
                lastActivityAt: '2026-01-01T00:00:00.000Z',
                lastKnownStatus: 'ACTIVE',
                currentStatus: 'running',
                isActive: true,
                source: 'history',
                isDraft: false,
              },
              {
                runId: 'run-2',
                summary: 'Historical draft cleanup',
                lastActivityAt: '2026-01-01T00:10:00.000Z',
                lastKnownStatus: 'IDLE',
                currentStatus: 'offline',
                isActive: false,
                source: 'history',
                isDraft: false,
              },
            ],
          },
        ],
      },
    ];
    runHistoryState.workspaceGroups = [];
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

  const expandWorkspace = async (wrapper: any, workspaceRootPath = '/ws/a') => {
    const workspaceRow = wrapper.get(
      `[data-test="workspace-row"][data-workspace-root="${workspaceRootPath}"]`,
    );
    if (workspaceRow.attributes('aria-expanded') !== 'true') {
      await workspaceRow.get('button').trigger('click');
      await flushPromises();
    }
  };

  const getRemoveWorkspaceButton = (wrapper: any) => {
    const button = wrapper.findAll('button').find((candidate: any) =>
      candidate.attributes('title')?.toLowerCase() === 'remove from workspaces',
    );
    expect(button).toBeTruthy();
    return button!;
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

  const seedNestedTeamRun = (focusedMemberRouteKey = 'coordinator') => {
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
        currentStatus: 'offline',
        deleteLifecycle: 'READY',
        focusedMemberRouteKey,
        members: [
          {
            teamRunId: 'team-1',
            memberKind: 'agent',
            memberRouteKey: 'coordinator',
            memberName: 'Coordinator',
            displayName: 'Coordinator',
            memberRunId: 'coordinator-run',
            workspaceRootPath: '/ws/a',
            summary: 'Coordinator summary',
            lastActivityAt: '2026-01-01T02:00:00.000Z',
            lastKnownStatus: 'IDLE',
            isActive: false,
            deleteLifecycle: 'READY',
          },
          {
            teamRunId: 'team-1',
            memberKind: 'agent_team',
            memberRouteKey: 'engineering_org',
            memberPath: ['engineering_org'],
            memberName: 'Engineering Org',
            displayName: 'Engineering Org',
            memberRunId: 'engineering-org-run',
            teamDefinitionId: 'engineering-org-def',
            workspaceRootPath: '/ws/a',
            summary: 'Engineering org summary',
            lastActivityAt: '2026-01-01T02:00:00.000Z',
            lastKnownStatus: 'IDLE',
            isActive: false,
            deleteLifecycle: 'READY',
            children: [
              {
                teamRunId: 'team-1',
                memberKind: 'agent',
                memberRouteKey: 'engineering_org/implementation_engineer',
                memberPath: ['engineering_org', 'implementation_engineer'],
                memberName: 'Implementation Engineer',
                displayName: 'Implementation Engineer',
                memberRunId: 'implementation-run',
                workspaceRootPath: '/ws/a',
                summary: 'Implementation summary',
                lastActivityAt: '2026-01-01T02:00:00.000Z',
                lastKnownStatus: 'IDLE',
                isActive: false,
                deleteLifecycle: 'READY',
              },
            ],
          },
        ],
      },
    ];
  };

  it('loads workspace list without eager history tree on mount', async () => {
    mountComponent();
    await flushPromises();

    expect(workspaceStoreMock.fetchAllWorkspaces).toHaveBeenCalledTimes(1);
    expect(runHistoryStoreMock.fetchTree).not.toHaveBeenCalled();
    expect(runHistoryStoreMock.fetchWorkspaceHistory).not.toHaveBeenCalled();
  });

  it('renders workspace rows collapsed by default', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.text()).toContain('autobyteus_org');
    expect(wrapper.text()).not.toContain('SuperAgent');
    expect(wrapper.text()).not.toContain('Describe messaging bindings');
    expect(wrapper.find('[data-test="workspace-row"][data-workspace-root="/ws/a"]').attributes('aria-expanded')).toBe('false');
  });

  it('fetches scoped workspace history when a workspace row is expanded', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    await wrapper
      .get('[data-test="workspace-row"][data-workspace-root="/ws/a"]')
      .get('button')
      .trigger('click');
    await flushPromises();

    expect(runHistoryStoreMock.fetchWorkspaceHistory).toHaveBeenCalledWith('workspace:/ws/a');
    expect(runHistoryStoreMock.fetchTree).not.toHaveBeenCalled();
    expect(wrapper.find('[data-test="workspace-row"][data-workspace-root="/ws/a"]').attributes('aria-expanded')).toBe('true');
  });

  it('renders scoped workspace history loading, error, and empty states', async () => {
    runHistoryState.workspaceHistoryLoadingById = { 'workspace:/ws/a': true };
    let wrapper = mountComponent();
    await flushPromises();
    await expandWorkspace(wrapper);
    expect(wrapper.text()).toContain('Loading workspace history');
    wrapper.unmount();

    runHistoryState.workspaceHistoryLoadingById = {};
    runHistoryState.workspaceHistoryErrorById = { 'workspace:/ws/a': 'Could not load workspace history.' };
    wrapper = mountComponent();
    await flushPromises();
    await expandWorkspace(wrapper);
    expect(wrapper.text()).toContain('Could not load workspace history.');
    wrapper.unmount();

    runHistoryState.workspaceHistoryErrorById = {};
    runHistoryState.nodes = [
      {
        workspaceRootPath: '/ws/a',
        workspaceName: 'autobyteus_org',
        agents: [],
      },
    ];
    wrapper = mountComponent();
    await flushPromises();
    await expandWorkspace(wrapper);
    expect(wrapper.text()).toContain('No task history in this workspace');
  });

  it('opens workspace removal confirmation from the row action without expanding the row', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    const vm = wrapper.vm as any;

    await getRemoveWorkspaceButton(wrapper).trigger('click');
    await flushPromises();

    expect(vm.showRemoveWorkspaceConfirmation).toBe(true);
    expect(runHistoryStoreMock.fetchWorkspaceHistory).not.toHaveBeenCalled();
    expect(wrapper.find('[data-test="workspace-row"][data-workspace-root="/ws/a"]').attributes('aria-expanded')).toBe('false');
  });

  it('does not render remove action for non-removable temp workspace rows', async () => {
    runHistoryState.nodes = [
      {
        workspaceId: 'temp_ws_default',
        workspaceRootPath: '/tmp/autobyteus-temp',
        workspaceName: 'Temp Workspace',
        workspaceKind: 'temp',
        canRemoveFromWorkspaces: false,
        agents: [],
      },
    ];

    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.text()).toContain('Temp Workspace');
    expect(wrapper.find('button[title="Remove from Workspaces"]').exists()).toBe(false);
  });

  it('cancels workspace removal without mutating workspace or history state', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    const vm = wrapper.vm as any;

    await getRemoveWorkspaceButton(wrapper).trigger('click');
    await flushPromises();
    expect(vm.showRemoveWorkspaceConfirmation).toBe(true);

    await wrapper.get('[data-test="delete-confirmation-cancel"]').trigger('click');
    await flushPromises();

    expect(workspaceStoreMock.removeWorkspace).not.toHaveBeenCalled();
    expect(runHistoryStoreMock.pruneWorkspace).not.toHaveBeenCalled();
    expect(vm.showRemoveWorkspaceConfirmation).toBe(false);
    expect(wrapper.find('[data-test="workspace-row"][data-workspace-root="/ws/a"]').exists()).toBe(true);
  });

  it('confirms workspace removal and prunes history plus expansion state after success', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    await expandWorkspace(wrapper);
    expect(wrapper.find('[data-test="workspace-row"][data-workspace-root="/ws/a"]').attributes('aria-expanded')).toBe('true');

    await getRemoveWorkspaceButton(wrapper).trigger('click');
    await flushPromises();
    await wrapper.get('[data-test="delete-confirmation-confirm"]').trigger('click');
    await flushPromises();

    expect(workspaceStoreMock.removeWorkspace).toHaveBeenCalledWith('workspace:/ws/a');
    expect(runHistoryStoreMock.pruneWorkspace).toHaveBeenCalledWith('workspace:/ws/a', '/ws/a');
    expect(addToastMock).toHaveBeenCalledWith('removed', 'success');
    expect((wrapper.vm as any).showRemoveWorkspaceConfirmation).toBe(false);
    expect(wrapper.find('[data-test="workspace-row"][data-workspace-root="/ws/a"]').attributes('aria-expanded')).toBe('false');
  });

  it('keeps the workspace visible and reports an error when workspace removal fails', async () => {
    workspaceStoreMock.removeWorkspace.mockRejectedValueOnce(
      new Error('Stop active runs before removing this workspace.'),
    );
    const wrapper = mountComponent();
    await flushPromises();

    await getRemoveWorkspaceButton(wrapper).trigger('click');
    await flushPromises();
    await wrapper.get('[data-test="delete-confirmation-confirm"]').trigger('click');
    await flushPromises();

    expect(workspaceStoreMock.removeWorkspace).toHaveBeenCalledWith('workspace:/ws/a');
    expect(runHistoryStoreMock.pruneWorkspace).not.toHaveBeenCalled();
    expect(addToastMock).toHaveBeenCalledWith(
      'Stop active runs before removing this workspace.',
      'error',
    );
    expect(wrapper.find('[data-test="workspace-row"][data-workspace-root="/ws/a"]').exists()).toBe(true);
  });

  it('shows groups after opening a workspace but keeps run histories collapsed', async () => {
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
        currentStatus: 'offline',
        deleteLifecycle: 'READY',
        focusedMemberName: 'super_agent',
        members: [],
      },
    ];

    const wrapper = mountComponent();
    await flushPromises();
    await expandWorkspace(wrapper);

    expect(wrapper.text()).toContain('SuperAgent');
    expect(wrapper.text()).toContain('Teams');
    expect(wrapper.text()).toContain('Team Alpha');
    expect(wrapper.text()).not.toContain('Describe messaging bindings');
    expect(wrapper.text()).not.toContain('Team summary');
    expect(wrapper.find('[data-test="workspace-agent-row"][data-agent-definition-id="agent-def-1"]').attributes('aria-expanded')).toBe('false');
    expect(wrapper.find('[data-test="workspace-team-definition-row-team-def-1"]').attributes('aria-expanded')).toBe('false');
  });

  it('keeps the individual team run disclosure chevron visually consistent with the parent team chevron', async () => {
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
        currentStatus: 'offline',
        deleteLifecycle: 'READY',
        focusedMemberName: 'super_agent',
        members: [
          {
            teamRunId: 'team-1',
            memberRouteKey: 'super_agent',
            memberName: 'Super Agent',
            memberRunId: 'member-1',
            workspaceRootPath: '/ws/a',
            summary: 'Member summary',
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

    expect(wrapper.find('[data-test="workspace-team-definition-disclosure"]').exists()).toBe(false);

    const teamRow = wrapper.get('[data-test="workspace-team-row-team-1"]');
    expect(teamRow.attributes('aria-expanded')).toBe('false');

    const teamRunDisclosure = wrapper.get('[data-test="workspace-team-run-disclosure"]');
    expect(teamRunDisclosure.classes()).toEqual(expect.arrayContaining([
      'h-3.5',
      'w-3.5',
      'text-gray-400',
      '-rotate-90',
    ]));
    expect(teamRunDisclosure.classes()).not.toContain('h-5');
    expect(teamRunDisclosure.classes()).not.toContain('w-5');
    expect(teamRunDisclosure.classes()).not.toContain('text-indigo-500');
    expect(teamRunDisclosure.classes()).not.toContain('text-indigo-600');
    expect(teamRunDisclosure.classes()).not.toContain('rounded-md');
    expect(teamRunDisclosure.classes()).not.toContain('border');
    expect(teamRunDisclosure.classes()).not.toContain('shadow-sm');

    await teamRow.trigger('click');
    await flushPromises();

    expect(teamRow.attributes('aria-expanded')).toBe('true');
    expect(wrapper.get('[data-test="workspace-team-run-disclosure"]').classes()).toEqual(expect.arrayContaining([
      'rotate-0',
      'text-gray-400',
    ]));
    expect(wrapper.find('[data-test="workspace-team-member-team-1-super_agent"]').exists()).toBe(true);
  });

  it('renders nested team members collapsed by default with a disclosure control', async () => {
    seedNestedTeamRun();

    const wrapper = mountComponent();
    await flushPromises();
    await expandTeamDefinitionGroup(wrapper);

    await wrapper.get('[data-test="workspace-team-row-team-1"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-test="workspace-team-member-team-1-coordinator"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="workspace-team-member-team-1-engineering_org"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="workspace-team-member-team-1-engineering_org/implementation_engineer"]').exists()).toBe(false);

    const disclosure = wrapper.get(
      '[data-test="workspace-team-member-disclosure"][data-member-route-key="engineering_org"]',
    );
    expect(disclosure.attributes('aria-expanded')).toBe('false');
  });

  it('toggles nested team member disclosure without selecting the member', async () => {
    seedNestedTeamRun();

    const wrapper = mountComponent();
    await flushPromises();
    await expandTeamDefinitionGroup(wrapper);
    await wrapper.get('[data-test="workspace-team-row-team-1"]').trigger('click');
    await flushPromises();
    runHistoryStoreMock.selectTreeRun.mockClear();

    const disclosure = wrapper.get(
      '[data-test="workspace-team-member-disclosure"][data-member-route-key="engineering_org"]',
    );
    await disclosure.trigger('click');
    await flushPromises();

    expect(disclosure.attributes('aria-expanded')).toBe('true');
    expect(wrapper.find('[data-test="workspace-team-member-team-1-engineering_org/implementation_engineer"]').exists()).toBe(true);
    expect(runHistoryStoreMock.selectTreeRun).not.toHaveBeenCalled();

    await disclosure.trigger('click');
    await flushPromises();

    expect(disclosure.attributes('aria-expanded')).toBe('false');
    expect(wrapper.find('[data-test="workspace-team-member-team-1-engineering_org/implementation_engineer"]').exists()).toBe(false);
    expect(runHistoryStoreMock.selectTreeRun).not.toHaveBeenCalled();
  });

  it('toggles and selects a nested team row from the row body', async () => {
    seedNestedTeamRun();

    const wrapper = mountComponent();
    await flushPromises();
    await expandTeamDefinitionGroup(wrapper);
    await wrapper.get('[data-test="workspace-team-row-team-1"]').trigger('click');
    await flushPromises();
    runHistoryStoreMock.selectTreeRun.mockClear();

    await wrapper.get('[data-test="workspace-team-member-team-1-engineering_org"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-test="workspace-team-member-team-1-engineering_org/implementation_engineer"]').exists()).toBe(true);
    expect(runHistoryStoreMock.selectTreeRun).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: 'team-1',
        memberRouteKey: 'engineering_org',
      }),
    );

    await wrapper.get('[data-test="workspace-team-member-team-1-engineering_org"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-test="workspace-team-member-team-1-engineering_org/implementation_engineer"]').exists()).toBe(false);
    expect(runHistoryStoreMock.selectTreeRun).toHaveBeenCalledTimes(2);
  });

  it('keeps an expanded nested child visible after selecting it', async () => {
    seedNestedTeamRun();

    const wrapper = mountComponent();
    await flushPromises();
    await expandTeamDefinitionGroup(wrapper);
    await wrapper.get('[data-test="workspace-team-row-team-1"]').trigger('click');
    await flushPromises();

    await wrapper
      .get('[data-test="workspace-team-member-disclosure"][data-member-route-key="engineering_org"]')
      .trigger('click');
    await flushPromises();

    const childSelector = '[data-test="workspace-team-member-team-1-engineering_org/implementation_engineer"]';
    expect(wrapper.find(childSelector).exists()).toBe(true);
    await wrapper.get(childSelector).trigger('click');
    await flushPromises();

    expect(runHistoryStoreMock.selectTreeRun).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: 'team-1',
        memberRouteKey: 'engineering_org/implementation_engineer',
      }),
    );
    expect(wrapper.find(childSelector).exists()).toBe(true);
  });

  it('expands nested ancestors when a team row opens a focused nested member', async () => {
    seedNestedTeamRun('engineering_org/implementation_engineer');

    const wrapper = mountComponent();
    await flushPromises();
    await expandTeamDefinitionGroup(wrapper);

    await wrapper.get('[data-test="workspace-team-row-team-1"]').trigger('click');
    await flushPromises();

    expect(runHistoryStoreMock.selectTreeRun).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: 'team-1',
        memberRouteKey: 'engineering_org/implementation_engineer',
      }),
    );
    expect(wrapper.find('[data-test="workspace-team-member-team-1-engineering_org/implementation_engineer"]').exists()).toBe(true);
    expect(
      wrapper
        .get('[data-test="workspace-team-member-disclosure"][data-member-route-key="engineering_org"]')
        .attributes('aria-expanded'),
    ).toBe('true');
  });

  it('refreshes expanded workspace history quietly on the background interval while mounted', async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountComponent();
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(0);
      const workspaceRow = wrapper.get('[data-test="workspace-row"][data-workspace-root="/ws/a"]');
      await workspaceRow.get('button').trigger('click');
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(0);

      expect(runHistoryStoreMock.refreshWorkspaceHistoryQuietly).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(5000);
      expect(runHistoryStoreMock.refreshTreeQuietly).not.toHaveBeenCalled();
      expect(runHistoryStoreMock.refreshWorkspaceHistoryQuietly).toHaveBeenCalledWith('workspace:/ws/a');
      wrapper.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders agent avatar image when the tree node provides avatar URL', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    await expandWorkspace(wrapper);

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
    await expandAgentGroup(wrapper);

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
    await expandWorkspace(wrapper);

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

  it('does not render Skill Improvement actions on run-history rows', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    await expandAgentGroup(wrapper);

    expect(wrapper.find('button[aria-label="Improve skills from this run"]').exists()).toBe(false);
    expect(wrapper.find('button[title="Improve skills from this run"]').exists()).toBe(false);
  });

  it('renders grouped team rows under workspace and selects the team run when clicked', async () => {
    runHistoryState.workspaceGroups = [
      buildWorkspaceHistoryGroup({
        workspaceRootPath: '/ws/a',
        workspaceName: 'autobyteus_org',
        agents: [],
        teamRuns: [],
        teamDefinitions: [
          {
            teamDefinitionId: 'team-def-1',
            teamDefinitionName: 'Team Alpha',
            runs: [
              {
                teamRunId: 'team-1',
                teamDefinitionId: 'team-def-1',
                teamDefinitionName: 'Team Alpha',
                workspaceRootPath: '/ws/a',
                summary: 'Team summary',
                lastActivityAt: '2026-01-01T02:00:00.000Z',
                lastKnownStatus: 'IDLE',
                deleteLifecycle: 'READY',
                isActive: false,
                members: [],
              },
            ],
          },
        ],
      }),
    ];
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
        currentStatus: 'offline',
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
    await expandTeamDefinitionGroup(wrapper);

    expect(wrapper.text()).toContain('Teams');
    const groupRow = wrapper.find('[data-test="workspace-team-definition-row-team-def-1"]');
    expect(groupRow.exists()).toBe(true);
    expect(groupRow.text()).toContain('Team Alpha');
    const row = wrapper.find('[data-test="workspace-team-row-team-1"]');
    expect(row.exists()).toBe(true);
    expect(row.text()).toContain('Team summary');
    expect(row.text()).not.toContain('team-1');

    await row.trigger('click');
    await flushPromises();

    expect(selectionStoreMock.selectRun).toHaveBeenCalledWith('team-1', 'team');
    expect(wrapper.emitted('run-selected')).toContainEqual([
      { type: 'team', runId: 'team-1' },
    ]);
  });

  it('opens a historical team row through the coordinator-focused member instead of the first alphabetical member', async () => {
    runHistoryState.workspaceGroups = [
      buildWorkspaceHistoryGroup({
        workspaceRootPath: '/ws/a',
        workspaceName: 'autobyteus_org',
        agents: [],
        teamDefinitions: [
          {
            teamDefinitionId: 'team-def-1',
            teamDefinitionName: 'Team Alpha',
            runs: [
              {
                teamRunId: 'team-1',
                teamDefinitionId: 'team-def-1',
                teamDefinitionName: 'Team Alpha',
                coordinatorMemberRouteKey: 'solution_designer',
                workspaceRootPath: '/ws/a',
                summary: 'Team summary',
                lastActivityAt: '2026-01-01T02:00:00.000Z',
                lastKnownStatus: 'IDLE',
                deleteLifecycle: 'READY',
                isActive: false,
                members: [
                  {
                    memberRouteKey: 'architect_reviewer',
                    memberName: 'Architect Reviewer',
                    memberRunId: 'member-run-2',
                    runtimeKind: 'AUTOBYTEUS',
                    workspaceRootPath: '/ws/a',
                  },
                  {
                    memberRouteKey: 'solution_designer',
                    memberName: 'Solution Designer',
                    memberRunId: 'member-run-1',
                    runtimeKind: 'AUTOBYTEUS',
                    workspaceRootPath: '/ws/a',
                  },
                ],
              },
            ],
          },
        ],
      }),
    ];
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
        currentStatus: 'offline',
        deleteLifecycle: 'READY',
        focusedMemberName: 'solution_designer',
        members: [
          {
            teamRunId: 'team-1',
            memberRouteKey: 'architect_reviewer',
            memberName: 'Architect Reviewer',
            memberRunId: 'member-run-2',
            workspaceRootPath: '/ws/a',
            summary: 'Team summary',
            lastActivityAt: '2026-01-01T02:00:00.000Z',
            lastKnownStatus: 'IDLE',
            isActive: false,
            deleteLifecycle: 'READY',
          },
          {
            teamRunId: 'team-1',
            memberRouteKey: 'solution_designer',
            memberName: 'Solution Designer',
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
    await expandTeamDefinitionGroup(wrapper);

    const row = wrapper.find('[data-test="workspace-team-row-team-1"]');
    expect(row.exists()).toBe(true);

    await row.trigger('click');
    await flushPromises();

    expect(runHistoryStoreMock.selectTreeRun).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: 'team-1',
        memberRouteKey: 'solution_designer',
        memberRunId: 'member-run-1',
      }),
    );
  });

  it('strips the user requirement prefix from agent and team summary labels', async () => {
    runHistoryState.workspaceGroups = [
      buildWorkspaceHistoryGroup({
        workspaceRootPath: '/ws/a',
        workspaceName: 'Workspace A',
        agents: [],
        teamRuns: [],
        teamDefinitions: [
          {
            teamDefinitionId: 'team-def-1',
            teamDefinitionName: 'Team Alpha',
            runs: [
              {
                teamRunId: 'team-1',
                teamDefinitionId: 'team-def-1',
                teamDefinitionName: 'Team Alpha',
                workspaceRootPath: '/ws/a',
                summary: '**[User Requirement]** Build the demo fruit shop',
                lastActivityAt: '2026-01-01T02:00:00.000Z',
                lastKnownStatus: 'IDLE',
                deleteLifecycle: 'READY',
                isActive: false,
                members: [],
              },
            ],
          },
        ],
      }),
    ];
    runHistoryState.nodes = [
      {
        workspaceRootPath: '/ws/a',
        workspaceName: 'Workspace A',
        agents: [
          {
            agentDefinitionId: 'agent-def-1',
            agentName: 'SuperAgent',
            agentAvatarUrl: 'https://a',
            runs: [
              {
                runId: 'run-1',
                summary: '**[User Requirement]** Build a stable sidebar label',
                lastActivityAt: '2026-01-01T01:00:00.000Z',
                lastKnownStatus: 'IDLE',
                isActive: false,
                source: 'history',
              },
            ],
          },
        ],
      },
    ];
    runHistoryState.teamNodesByWorkspace['/ws/a'] = [
      {
        teamRunId: 'team-1',
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'Team Alpha',
        workspaceRootPath: '/ws/a',
        summary: '**[User Requirement]** Build the demo fruit shop',
        lastActivityAt: '2026-01-01T02:00:00.000Z',
        lastKnownStatus: 'IDLE',
        isActive: false,
        currentStatus: 'offline',
        deleteLifecycle: 'READY',
        focusedMemberName: 'super_agent',
        members: [],
      },
    ];

    const wrapper = mountComponent();
    await flushPromises();
    await expandAgentGroup(wrapper);
    await expandTeamDefinitionGroup(wrapper);

    expect(wrapper.text()).toContain('Build a stable sidebar label');
    expect(wrapper.text()).toContain('Build the demo fruit shop');
    expect(wrapper.text()).not.toContain('**[User Requirement]**');
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
        currentStatus: 'offline',
        deleteLifecycle: 'READY',
        focusedMemberName: 'super_agent',
        members: [],
      },
    ];

    const wrapper = mountComponent();
    await flushPromises();
    await expandWorkspace(wrapper);

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
        currentStatus: 'offline',
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
    await expandTeamDefinitionGroup(wrapper);

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
        currentStatus: 'offline',
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
    await expandTeamDefinitionGroup(wrapper);

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

  it('keeps the global Workspaces tree free of delegated-task detail and full-context UI under an expanded live team', async () => {
    runHistoryState.teamNodesByWorkspace['/ws/a'] = [
      {
        teamRunId: 'team-1',
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'Team Alpha',
        workspaceRootPath: '/ws/a',
        summary: 'Team summary',
        lastActivityAt: '2026-01-01T02:00:00.000Z',
        lastKnownStatus: 'ACTIVE',
        isActive: true,
        currentStatus: 'running',
        deleteLifecycle: 'CLEANUP_PENDING',
        focusedMemberRouteKey: 'implementation_engineer',
        members: [
          {
            teamRunId: 'team-1',
            memberKind: 'agent',
            memberRouteKey: 'implementation_engineer',
            memberName: 'implementation_engineer',
            displayName: 'implementation_engineer',
            currentStatus: 'running',
            workspaceRootPath: '/ws/a',
            lastActivityAt: '2026-01-01T02:00:00.000Z',
          },
        ],
      },
    ];

    const wrapper = mountComponent();
    await flushPromises();
    await expandTeamDefinitionGroup(wrapper);
    await wrapper.get('[data-test="workspace-team-row-team-1"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-test="workspace-team-member-team-1-implementation_engineer"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="team-delegated-task-context-tree"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="team-delegated-task-navigator"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="left-delegated-task-summary-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="left-delegated-task-reference-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="left-delegated-task-technical-details"]').exists()).toBe(false);
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
        currentStatus: 'offline',
        deleteLifecycle: 'READY',
        focusedMemberName: 'super_agent',
        members: [],
      },
    ];

    const wrapper = mountComponent();
    await flushPromises();
    await expandTeamDefinitionGroup(wrapper);

    const deleteButtons = wrapper.findAll('button[title="Delete team history permanently"]');
    expect(deleteButtons).toHaveLength(1);
  });

  it('renders archive action for inactive team history rows', async () => {
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
        currentStatus: 'offline',
        deleteLifecycle: 'READY',
        focusedMemberName: 'super_agent',
        members: [],
      },
    ];

    const wrapper = mountComponent();
    await flushPromises();
    await expandTeamDefinitionGroup(wrapper);

    const archiveButtons = wrapper.findAll('button[title="Archive team history"]');
    expect(archiveButtons).toHaveLength(1);
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
        currentStatus: 'offline',
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
    await expandTeamDefinitionGroup(wrapper);

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
        currentStatus: 'offline',
        deleteLifecycle: 'READY',
        focusedMemberName: 'super_agent',
        members: [],
      },
    ];

    const wrapper = mountComponent();
    await flushPromises();
    await expandTeamDefinitionGroup(wrapper);
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

  it('archives inactive team history from team row action without selecting the row', async () => {
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
        currentStatus: 'offline',
        deleteLifecycle: 'READY',
        focusedMemberName: 'super_agent',
        members: [],
      },
    ];

    const wrapper = mountComponent();
    await flushPromises();
    await expandTeamDefinitionGroup(wrapper);

    const archiveButton = wrapper.find('button[title="Archive team history"]');
    expect(archiveButton.exists()).toBe(true);

    await archiveButton.trigger('click');
    await flushPromises();

    expect(runHistoryStoreMock.archiveTeamRun).toHaveBeenCalledWith('team-1');
    expect(selectionStoreMock.selectRun).not.toHaveBeenCalled();
    expect(addToastMock).toHaveBeenCalledWith('Team history archived.', 'success');
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
    await flushPromises();
    await expandAgentGroup(wrapper);
    const activeDot = wrapper.find('.bg-blue-500.animate-pulse');
    expect(activeDot.exists()).toBe(true);
  });

  it('does not render status indicator for inactive runs', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    await expandAgentGroup(wrapper);
    const statusDots = wrapper.findAll('span.bg-blue-500.animate-pulse');
    expect(statusDots).toHaveLength(1);
  });

  it('renders delete action only for inactive history runs', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    await expandAgentGroup(wrapper);

    const deleteButtons = wrapper.findAll('button[title="Delete run permanently"]');
    expect(deleteButtons).toHaveLength(1);
  });

  it('renders archive action only for inactive persisted history runs', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    await expandAgentGroup(wrapper);

    const archiveButtons = wrapper.findAll('button[title="Archive run"]');
    expect(archiveButtons).toHaveLength(1);
  });

  it('terminates active run from row action without selecting the row', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    await expandAgentGroup(wrapper);

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
    await expandAgentGroup(wrapper);

    const terminateButton = wrapper.find('button[title="Terminate run"]');
    await terminateButton.trigger('click');
    await flushPromises();

    expect(addToastMock).toHaveBeenCalledWith('Failed to terminate run. Please try again.', 'error');
  });

  it('deletes inactive history run from row action without selecting the row', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    await expandAgentGroup(wrapper);
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

  it('archives inactive history run from row action without selecting the row', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    await expandAgentGroup(wrapper);

    const archiveButton = wrapper.find('button[title="Archive run"]');
    expect(archiveButton.exists()).toBe(true);

    await archiveButton.trigger('click');
    await flushPromises();

    expect(runHistoryStoreMock.archiveRun).toHaveBeenCalledWith('run-2');
    expect(runHistoryStoreMock.selectTreeRun).not.toHaveBeenCalled();
    expect(addToastMock).toHaveBeenCalledWith('Run archived.', 'success');
  });

  it('shows an error toast when archive fails', async () => {
    runHistoryStoreMock.archiveRun.mockResolvedValueOnce(false);
    const wrapper = mountComponent();
    await flushPromises();
    await expandAgentGroup(wrapper);

    const archiveButton = wrapper.find('button[title="Archive run"]');
    await archiveButton.trigger('click');
    await flushPromises();

    expect(addToastMock).toHaveBeenCalledWith('Failed to archive run. Please try again.', 'error');
  });

  it('does not call delete when confirmation is cancelled', async () => {
    const wrapper = mountComponent();
    await flushPromises();
    await expandAgentGroup(wrapper);
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
    await expandAgentGroup(wrapper);
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
