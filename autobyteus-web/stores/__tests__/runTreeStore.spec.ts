import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useRunTreeStore } from '../runTreeStore';

const {
  queryMock,
  mutateMock,
  windowNodeContextStoreMock,
  workspaceStoreMock,
  agentDefinitionStoreMock,
  agentContextsStoreMock,
  selectionStoreMock,
  agentRunConfigStoreMock,
  teamRunConfigStoreMock,
  agentRunStoreMock,
  agentTeamContextsStoreMock,
  agentTeamRunStoreMock,
  teamContextsMock,
  llmProviderConfigStoreMock,
} = vi.hoisted(() => {
  const selection = {
    selectedType: null as string | null,
    selectedRunId: null as string | null,
    selectRun: vi.fn((runId: string, type: string) => {
      selection.selectedRunId = runId;
      selection.selectedType = type;
    }),
    clearSelection: vi.fn(() => {
      selection.selectedType = null;
      selection.selectedRunId = null;
    }),
  };

  const runs = new Map<string, any>();
  const teamContexts = new Map<string, any>();

  return {
    queryMock: vi.fn(),
    mutateMock: vi.fn(),
    windowNodeContextStoreMock: {
      waitForBoundBackendReady: vi.fn().mockResolvedValue(true),
      lastReadyError: null as string | null,
    },
    workspaceStoreMock: {
      workspacesFetched: true,
      allWorkspaces: [] as Array<{ workspaceId: string; absolutePath: string; name?: string }>,
      workspaces: {} as Record<string, any>,
      fetchAllWorkspaces: vi.fn().mockResolvedValue(undefined),
      createWorkspace: vi.fn().mockResolvedValue('ws-created'),
    },
    agentDefinitionStoreMock: {
      agentDefinitions: [{ id: 'agent-def-1', name: 'SuperAgent', avatarUrl: 'https://a' }],
      fetchAllAgentDefinitions: vi.fn().mockResolvedValue(undefined),
      getAgentDefinitionById: vi.fn((id: string) => {
        if (id === 'agent-def-1') {
          return { id, name: 'SuperAgent', avatarUrl: 'https://a' };
        }
        return null;
      }),
    },
    agentContextsStoreMock: {
      runs,
      hydrateFromProjection: vi.fn(),
      upsertProjectionContext: vi.fn((options: any) => {
        const existing = runs.get(options.runId);
        if (existing) {
          existing.config = { ...options.config };
          existing.state.agentId = options.runId;
          existing.state.conversation = options.conversation;
          existing.state.currentStatus = options.status ?? 'idle';
          return;
        }
        runs.set(options.runId, {
          config: { ...options.config },
          state: {
            agentId: options.runId,
            conversation: options.conversation,
            currentStatus: options.status ?? 'idle',
          },
          isSubscribed: false,
        });
      }),
      patchConfigOnly: vi.fn((runId: string, patch: any) => {
        const context = runs.get(runId);
        if (!context) {
          return false;
        }
        context.config = {
          ...context.config,
          ...patch,
        };
        return true;
      }),
      removeRun: vi.fn((id: string) => {
        runs.delete(id);
      }),
      createRunFromTemplate: vi.fn().mockReturnValue('temp-123'),
      getRun: vi.fn((id: string) => runs.get(id)),
    },
    selectionStoreMock: selection,
    agentRunConfigStoreMock: {
      clearConfig: vi.fn(),
      setTemplate: vi.fn(),
      setAgentConfig: vi.fn(),
      updateAgentConfig: vi.fn(),
    },
    teamRunConfigStoreMock: {
      clearConfig: vi.fn(),
    },
    agentRunStoreMock: {
      connectToAgentStream: vi.fn(),
    },
    agentTeamContextsStoreMock: {
      teams: teamContexts,
      get allTeamRuns() {
        return Array.from(teamContexts.values());
      },
      addTeamContext: vi.fn((context: any) => {
        teamContexts.set(context.teamId, context);
      }),
      getTeamContextById: vi.fn((teamId: string) => teamContexts.get(teamId)),
      setFocusedMember: vi.fn((memberName: string) => {
        const selected = selection.selectedRunId ? teamContexts.get(selection.selectedRunId) : null;
        if (selected && selected.members?.has(memberName)) {
          selected.focusedMemberName = memberName;
        }
      }),
      removeTeamContext: vi.fn((teamId: string) => {
        teamContexts.delete(teamId);
      }),
    },
    teamContextsMock: teamContexts,
    agentTeamRunStoreMock: {
      connectToTeamStream: vi.fn(),
    },
    llmProviderConfigStoreMock: {
      models: ['model-default'],
      fetchProvidersWithModels: vi.fn().mockResolvedValue(undefined),
    },
  };
});

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({
    query: queryMock,
    mutate: mutateMock,
  }),
}));

vi.mock('~/graphql/queries/runHistoryQueries', () => ({
  ListRunHistory: 'ListRunHistory',
  ListTeamRunHistory: 'ListTeamRunHistory',
  GetRunProjection: 'GetRunProjection',
  GetTeamMemberRunProjection: 'GetTeamMemberRunProjection',
  GetRunResumeConfig: 'GetRunResumeConfig',
  GetTeamRunResumeConfig: 'GetTeamRunResumeConfig',
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}));

vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => workspaceStoreMock,
}));

vi.mock('~/stores/agentDefinitionStore', () => ({
  useAgentDefinitionStore: () => agentDefinitionStoreMock,
}));

vi.mock('~/stores/agentContextsStore', () => ({
  useAgentContextsStore: () => agentContextsStoreMock,
}));

vi.mock('~/stores/agentSelectionStore', () => ({
  useAgentSelectionStore: () => selectionStoreMock,
}));

vi.mock('~/stores/agentRunConfigStore', () => ({
  useAgentRunConfigStore: () => agentRunConfigStoreMock,
}));

vi.mock('~/stores/agentTeamContextsStore', () => ({
  useAgentTeamContextsStore: () => agentTeamContextsStoreMock,
}));

vi.mock('~/stores/teamRunConfigStore', () => ({
  useTeamRunConfigStore: () => teamRunConfigStoreMock,
}));

vi.mock('~/stores/agentTeamRunStore', () => ({
  useAgentTeamRunStore: () => agentTeamRunStoreMock,
}));

vi.mock('~/stores/agentRunStore', () => ({
  useAgentRunStore: () => agentRunStoreMock,
}));

vi.mock('~/stores/llmProviderConfig', () => ({
  useLLMProviderConfigStore: () => llmProviderConfigStoreMock,
}));

describe('runHistoryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    windowNodeContextStoreMock.waitForBoundBackendReady.mockResolvedValue(true);
    windowNodeContextStoreMock.lastReadyError = null;

    workspaceStoreMock.workspacesFetched = true;
    workspaceStoreMock.allWorkspaces = [];
    workspaceStoreMock.workspaces = {};
    workspaceStoreMock.fetchAllWorkspaces.mockResolvedValue(undefined);
    workspaceStoreMock.createWorkspace.mockResolvedValue('ws-created');

    agentDefinitionStoreMock.agentDefinitions = [
      { id: 'agent-def-1', name: 'SuperAgent', avatarUrl: 'https://a' },
    ];
    agentDefinitionStoreMock.fetchAllAgentDefinitions.mockResolvedValue(undefined);
    agentDefinitionStoreMock.getAgentDefinitionById.mockImplementation((id: string) => {
      if (id === 'agent-def-1') {
        return { id, name: 'SuperAgent', avatarUrl: 'https://a' };
      }
      return null;
    });

    agentContextsStoreMock.runs.clear();

    selectionStoreMock.selectedType = null;
    selectionStoreMock.selectedRunId = null;
    llmProviderConfigStoreMock.models = ['model-default'];
    llmProviderConfigStoreMock.fetchProvidersWithModels.mockResolvedValue(undefined);
    mutateMock.mockReset();
    agentTeamContextsStoreMock.addTeamContext.mockClear();
    agentTeamContextsStoreMock.getTeamContextById.mockClear();
    agentTeamContextsStoreMock.setFocusedMember.mockClear();
    agentTeamContextsStoreMock.removeTeamContext.mockClear();
    teamContextsMock.clear();
    agentTeamRunStoreMock.connectToTeamStream.mockClear();
  });

  it('fetches run history tree from GraphQL', async () => {
    queryMock.mockImplementation(async ({ query }: { query: string }) => {
      if (query === 'ListRunHistory') {
        return {
          data: {
            listRunHistory: [
              {
                workspaceRootPath: '/ws/a',
                workspaceName: 'a',
                agents: [
                  {
                    agentDefinitionId: 'agent-def-1',
                    agentName: 'SuperAgent',
                    runs: [
                      {
                        agentId: 'run-1',
                        summary: 'Do a task',
                        lastActivityAt: new Date().toISOString(),
                        lastKnownStatus: 'IDLE',
                        isActive: false,
                      },
                    ],
                  },
                ],
              },
            ],
          },
          errors: [],
        };
      }
      if (query === 'ListTeamRunHistory') {
        return {
          data: {
            listTeamRunHistory: [],
          },
          errors: [],
        };
      }
      throw new Error(`Unexpected query: ${String(query)}`);
    });

    const store = useRunTreeStore();
    await store.fetchTree();

    expect(store.error).toBeNull();
    expect(store.workspaceGroups).toHaveLength(1);
    expect(store.teamRuns).toEqual([]);
    expect(store.workspaceGroups[0]?.agents[0]?.runs[0]?.agentId).toBe('run-1');
    expect(store.agentAvatarByDefinitionId['agent-def-1']).toBe('https://a');
  });

  it('returns backend readiness error on fetchTree when backend is not ready', async () => {
    windowNodeContextStoreMock.waitForBoundBackendReady.mockResolvedValueOnce(false);
    windowNodeContextStoreMock.lastReadyError = 'Backend down';

    const store = useRunTreeStore();
    await store.fetchTree();

    expect(store.error).toContain('Backend down');
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('opens a run, hydrates projection, selects run, and connects stream when active', async () => {
    queryMock.mockImplementation(async ({ query }: { query: string }) => {
      if (query === 'GetRunProjection') {
        return {
          data: {
            getRunProjection: {
              agentId: 'run-1',
              summary: 'Describe messaging bindings',
              lastActivityAt: '2026-01-01T00:00:00.000Z',
              conversation: [
                { kind: 'message', role: 'user', content: 'hello', ts: 1700000000 },
                { kind: 'message', role: 'assistant', content: 'hi', ts: 1700000010 },
              ],
            },
          },
          errors: [],
        };
      }
      if (query === 'GetRunResumeConfig') {
        return {
          data: {
            getRunResumeConfig: {
              agentId: 'run-1',
              isActive: true,
              manifestConfig: {
                agentDefinitionId: 'agent-def-1',
                workspaceRootPath: '/ws/a',
                llmModelIdentifier: 'model-x',
                llmConfig: { temperature: 0.3 },
                autoExecuteTools: false,
                skillAccessMode: 'PRELOADED_ONLY',
              },
              editableFields: {
                llmModelIdentifier: false,
                llmConfig: false,
                autoExecuteTools: false,
                skillAccessMode: false,
                workspaceRootPath: false,
              },
            },
          },
          errors: [],
        };
      }
      throw new Error(`Unexpected query: ${String(query)}`);
    });

    workspaceStoreMock.workspacesFetched = true;
    workspaceStoreMock.allWorkspaces = [
      { workspaceId: 'ws-1', absolutePath: '/ws/a', name: 'a' },
    ];

    const store = useRunTreeStore();
    store.workspaceGroups = [
      {
        workspaceRootPath: '/ws/a',
        workspaceName: 'a',
        agents: [
          {
            agentDefinitionId: 'agent-def-1',
            agentName: 'SuperAgent',
            runs: [
              {
                agentId: 'run-1',
                summary: 'Describe messaging bindings',
                lastActivityAt: '2026-01-01T00:00:00.000Z',
                lastKnownStatus: 'ACTIVE',
                isActive: true,
              },
            ],
          },
        ],
      },
    ];

    await store.openRun('run-1');

    expect(agentContextsStoreMock.upsertProjectionContext).toHaveBeenCalledTimes(1);
    expect(selectionStoreMock.selectRun).toHaveBeenCalledWith('run-1', 'agent');
    expect(agentRunConfigStoreMock.clearConfig).toHaveBeenCalled();
    expect(teamRunConfigStoreMock.clearConfig).toHaveBeenCalled();
    expect(agentRunStoreMock.connectToAgentStream).toHaveBeenCalledWith('run-1');
    expect(store.selectedAgentId).toBe('run-1');
  });

  it('opens an inactive run and hydrates offline status without connecting stream', async () => {
    queryMock.mockImplementation(async ({ query }: { query: string }) => {
      if (query === 'GetRunProjection') {
        return {
          data: {
            getRunProjection: {
              agentId: 'run-2',
              summary: 'Historical run',
              lastActivityAt: '2026-01-01T00:00:00.000Z',
              conversation: [
                { kind: 'message', role: 'user', content: 'hello', ts: 1700000000 },
                { kind: 'message', role: 'assistant', content: 'hi', ts: 1700000010 },
              ],
            },
          },
          errors: [],
        };
      }
      if (query === 'GetRunResumeConfig') {
        return {
          data: {
            getRunResumeConfig: {
              agentId: 'run-2',
              isActive: false,
              manifestConfig: {
                agentDefinitionId: 'agent-def-1',
                workspaceRootPath: '/ws/a',
                llmModelIdentifier: 'model-x',
                llmConfig: { temperature: 0.3 },
                autoExecuteTools: false,
                skillAccessMode: 'PRELOADED_ONLY',
              },
              editableFields: {
                llmModelIdentifier: true,
                llmConfig: true,
                autoExecuteTools: true,
                skillAccessMode: true,
                workspaceRootPath: false,
              },
            },
          },
          errors: [],
        };
      }
      throw new Error(`Unexpected query: ${String(query)}`);
    });

    workspaceStoreMock.workspacesFetched = true;
    workspaceStoreMock.allWorkspaces = [
      { workspaceId: 'ws-1', absolutePath: '/ws/a', name: 'a' },
    ];

    const store = useRunTreeStore();
    store.workspaceGroups = [
      {
        workspaceRootPath: '/ws/a',
        workspaceName: 'a',
        agents: [
          {
            agentDefinitionId: 'agent-def-1',
            agentName: 'SuperAgent',
            runs: [
              {
                agentId: 'run-2',
                summary: 'Historical run',
                lastActivityAt: '2026-01-01T00:00:00.000Z',
                lastKnownStatus: 'IDLE',
                isActive: false,
              },
            ],
          },
        ],
      },
    ];

    await store.openRun('run-2');

    expect(agentContextsStoreMock.upsertProjectionContext).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-2',
        status: 'shutdown_complete',
      }),
    );
    expect(agentRunStoreMock.connectToAgentStream).not.toHaveBeenCalled();
    expect(selectionStoreMock.selectRun).toHaveBeenCalledWith('run-2', 'agent');
    expect(store.selectedAgentId).toBe('run-2');
  });

  it('does not clobber live active context state when reopening an already subscribed run', async () => {
    queryMock.mockImplementation(async ({ query }: { query: string }) => {
      if (query === 'GetRunProjection') {
        return {
          data: {
            getRunProjection: {
              agentId: 'run-1',
              summary: 'Describe messaging bindings',
              lastActivityAt: '2026-01-01T00:00:00.000Z',
              conversation: [
                { kind: 'message', role: 'user', content: 'hello', ts: 1700000000 },
                { kind: 'message', role: 'assistant', content: 'hi', ts: 1700000010 },
              ],
            },
          },
          errors: [],
        };
      }
      if (query === 'GetRunResumeConfig') {
        return {
          data: {
            getRunResumeConfig: {
              agentId: 'run-1',
              isActive: true,
              manifestConfig: {
                agentDefinitionId: 'agent-def-1',
                workspaceRootPath: '/ws/a',
                llmModelIdentifier: 'model-x',
                llmConfig: { temperature: 0.3 },
                autoExecuteTools: false,
                skillAccessMode: 'PRELOADED_ONLY',
              },
              editableFields: {
                llmModelIdentifier: false,
                llmConfig: false,
                autoExecuteTools: false,
                skillAccessMode: false,
                workspaceRootPath: false,
              },
            },
          },
          errors: [],
        };
      }
      throw new Error(`Unexpected query: ${String(query)}`);
    });

    workspaceStoreMock.workspacesFetched = true;
    workspaceStoreMock.allWorkspaces = [
      { workspaceId: 'ws-1', absolutePath: '/ws/a', name: 'a' },
    ];

    agentContextsStoreMock.runs.set('run-1', {
      isSubscribed: true,
      config: {
        agentDefinitionId: 'agent-def-1',
        agentDefinitionName: 'SuperAgent',
        agentAvatarUrl: 'https://a',
        llmModelIdentifier: 'model-old',
        workspaceId: 'ws-1',
        autoExecuteTools: true,
        skillAccessMode: 'ALL',
        llmConfig: null,
        isLocked: false,
      },
      state: {
        agentId: 'run-1',
        currentStatus: 'idle',
        conversation: {
          id: 'run-1',
          messages: [{ type: 'user', text: 'existing', timestamp: new Date(), contextFilePaths: [] }],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:01.000Z',
          agentDefinitionId: 'agent-def-1',
        },
      },
    });

    const store = useRunTreeStore();
    await store.openRun('run-1');

    expect(agentContextsStoreMock.upsertProjectionContext).not.toHaveBeenCalled();
    expect(agentContextsStoreMock.patchConfigOnly).toHaveBeenCalledWith(
      'run-1',
      expect.objectContaining({
        llmModelIdentifier: 'model-x',
        isLocked: true,
      }),
    );
    const context = agentContextsStoreMock.runs.get('run-1');
    expect(context.state.currentStatus).toBe('idle');
    expect(context.state.conversation.messages[0]?.text).toBe('existing');
  });

  it('creates draft run for selected workspace and agent', async () => {
    workspaceStoreMock.allWorkspaces = [
      { workspaceId: 'ws-1', absolutePath: '/ws/a', name: 'a' },
    ];
    workspaceStoreMock.workspacesFetched = true;
    workspaceStoreMock.createWorkspace.mockResolvedValueOnce('ws-1');

    const store = useRunTreeStore();
    await store.createDraftRun({
      workspaceRootPath: '/ws/a',
      agentDefinitionId: 'agent-def-1',
    });

    expect(agentRunConfigStoreMock.setTemplate).toHaveBeenCalled();
    expect(agentRunConfigStoreMock.updateAgentConfig).toHaveBeenCalledWith({
      workspaceId: 'ws-1',
      llmModelIdentifier: 'model-default',
    });
    expect(workspaceStoreMock.createWorkspace).toHaveBeenCalledWith({ root_path: '/ws/a' });
    expect(selectionStoreMock.clearSelection).toHaveBeenCalled();
    expect(agentContextsStoreMock.createRunFromTemplate).not.toHaveBeenCalled();
    expect(store.selectedAgentId).toBeNull();
  });

  it('reuses model from existing context when creating draft run', async () => {
    workspaceStoreMock.allWorkspaces = [
      { workspaceId: 'ws-1', absolutePath: '/ws/a', name: 'a' },
    ];
    workspaceStoreMock.workspacesFetched = true;
    workspaceStoreMock.createWorkspace.mockResolvedValueOnce('ws-1');

    agentContextsStoreMock.runs.set('run-previous', {
      config: {
        agentDefinitionId: 'agent-def-1',
        agentDefinitionName: 'SuperAgent',
        workspaceId: 'ws-1',
        llmModelIdentifier: 'model-previous',
        autoExecuteTools: false,
        skillAccessMode: 'PRELOADED_ONLY',
        isLocked: true,
      },
      state: {
        conversation: {
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      },
    });

    const store = useRunTreeStore();
    await store.createDraftRun({
      workspaceRootPath: '/ws/a',
      agentDefinitionId: 'agent-def-1',
    });

    expect(agentRunConfigStoreMock.setAgentConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        llmModelIdentifier: 'model-previous',
        workspaceId: 'ws-1',
        isLocked: false,
      }),
    );
    expect(workspaceStoreMock.createWorkspace).toHaveBeenCalledWith({ root_path: '/ws/a' });
    expect(agentContextsStoreMock.createRunFromTemplate).not.toHaveBeenCalled();
  });

  it('revalidates workspace id via backend creation even when local cache has matching root path', async () => {
    workspaceStoreMock.workspacesFetched = true;
    workspaceStoreMock.allWorkspaces = [
      { workspaceId: 'stale-ws-id', absolutePath: '/ws/a', name: 'a' },
    ];
    workspaceStoreMock.createWorkspace.mockResolvedValueOnce('fresh-ws-id');

    const store = useRunTreeStore();
    const workspaceId = await store.ensureWorkspaceByRootPath('/ws/a');

    expect(workspaceId).toBe('fresh-ws-id');
    expect(workspaceStoreMock.createWorkspace).toHaveBeenCalledWith({ root_path: '/ws/a' });
  });

  it('projects persisted history and temp drafts into workspace tree', () => {
    const store = useRunTreeStore();
    store.agentAvatarByDefinitionId = {
      'agent-def-1': 'https://a',
    };
    store.workspaceGroups = [
      {
        workspaceRootPath: '/ws/a',
        workspaceName: 'Alpha',
        agents: [
          {
            agentDefinitionId: 'agent-def-1',
            agentName: 'SuperAgent',
            runs: [
              {
                agentId: 'run-1',
                summary: 'Persisted run',
                lastActivityAt: '2026-01-01T00:00:00.000Z',
                lastKnownStatus: 'IDLE',
                isActive: false,
              },
            ],
          },
        ],
      },
    ];

    workspaceStoreMock.allWorkspaces = [
      { workspaceId: 'ws-1', absolutePath: '/ws/a', name: 'Alpha' },
      { workspaceId: 'ws-2', absolutePath: '/ws/b', name: 'Beta' },
    ];
    workspaceStoreMock.workspaces = {
      'ws-1': { workspaceId: 'ws-1', absolutePath: '/ws/a', name: 'Alpha', workspaceConfig: {} },
      'ws-2': { workspaceId: 'ws-2', absolutePath: '/ws/b', name: 'Beta', workspaceConfig: {} },
    };

    agentContextsStoreMock.runs.set('temp-1', {
      config: {
        workspaceId: 'ws-1',
        agentDefinitionId: 'agent-def-1',
        agentDefinitionName: 'SuperAgent',
      },
      state: {
        currentStatus: 'uninitialized',
        conversation: {
          id: 'temp-1',
          messages: [],
          createdAt: '2026-01-02T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      },
    });

    const nodes = store.getTreeNodes();

    expect(nodes).toHaveLength(2);
    expect(nodes[0]?.workspaceRootPath).toBe('/ws/a');

    const alphaAgent = nodes[0]?.agents[0];
    expect(alphaAgent?.agentAvatarUrl).toBe('https://a');
    expect(alphaAgent?.runs.map(run => run.agentId)).toEqual(['temp-1', 'run-1']);
    expect(alphaAgent?.runs[0]?.source).toBe('draft');
    expect(alphaAgent?.runs[1]?.source).toBe('history');

    expect(nodes[1]).toEqual({
      workspaceRootPath: '/ws/b',
      workspaceName: 'Beta',
      agents: [],
    });
  });

  it('overlays persisted run status with matching live context only', () => {
    const store = useRunTreeStore();
    store.workspaceGroups = [
      {
        workspaceRootPath: '/ws/a',
        workspaceName: 'Alpha',
        agents: [
          {
            agentDefinitionId: 'agent-def-1',
            agentName: 'SuperAgent',
            runs: [
              {
                agentId: 'run-a',
                summary: 'Run A',
                lastActivityAt: '2026-01-01T00:00:00.000Z',
                lastKnownStatus: 'IDLE',
                isActive: false,
              },
              {
                agentId: 'run-b',
                summary: 'Run B',
                lastActivityAt: '2026-01-01T00:00:00.000Z',
                lastKnownStatus: 'IDLE',
                isActive: false,
              },
            ],
          },
        ],
      },
    ];

    workspaceStoreMock.allWorkspaces = [
      { workspaceId: 'ws-1', absolutePath: '/ws/a', name: 'Alpha' },
    ];

    agentContextsStoreMock.runs.set('run-b', {
      config: {
        workspaceId: 'ws-1',
        agentDefinitionId: 'agent-def-1',
        agentDefinitionName: 'SuperAgent',
      },
      state: {
        currentStatus: 'bootstrapping',
        conversation: {
          id: 'run-b',
          messages: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-03T00:00:00.000Z',
        },
      },
    });

    const nodes = store.getTreeNodes();
    const runA = nodes[0]?.agents[0]?.runs.find((run) => run.agentId === 'run-a');
    const runB = nodes[0]?.agents[0]?.runs.find((run) => run.agentId === 'run-b');

    expect(runA?.isActive).toBe(false);
    expect(runA?.lastKnownStatus).toBe('IDLE');
    expect(runB?.isActive).toBe(true);
    expect(runB?.lastKnownStatus).toBe('ACTIVE');
    expect(runB?.lastActivityAt).toBe('2026-01-03T00:00:00.000Z');
  });

  it('treats idle draft contexts as active in tree projection', () => {
    const store = useRunTreeStore();
    workspaceStoreMock.allWorkspaces = [
      { workspaceId: 'ws-1', absolutePath: '/ws/a', name: 'Alpha' },
    ];
    workspaceStoreMock.workspaces = {
      'ws-1': { workspaceId: 'ws-1', absolutePath: '/ws/a', name: 'Alpha', workspaceConfig: {} },
    };

    agentContextsStoreMock.runs.set('temp-1', {
      config: {
        workspaceId: 'ws-1',
        agentDefinitionId: 'agent-def-1',
        agentDefinitionName: 'SuperAgent',
      },
      state: {
        currentStatus: 'idle',
        conversation: {
          id: 'temp-1',
          messages: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-03T00:00:00.000Z',
        },
      },
    });

    const nodes = store.getTreeNodes();
    const draft = nodes[0]?.agents[0]?.runs.find((run) => run.agentId === 'temp-1');

    expect(draft?.source).toBe('draft');
    expect(draft?.isActive).toBe(true);
    expect(draft?.lastKnownStatus).toBe('ACTIVE');
  });

  it('projects local temporary team contexts into team nodes before first message', () => {
    const store = useRunTreeStore();
    store.teamRuns = [];
    workspaceStoreMock.workspaces = {
      'ws-1': { workspaceId: 'ws-1', absolutePath: '/ws/a', name: 'Alpha', workspaceConfig: {} },
    };

    teamContextsMock.set('temp-team-1', {
      teamId: 'temp-team-1',
      config: {
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'Movie Maker',
      },
      members: new Map([
        [
          'coordinator',
          {
            config: { agentDefinitionName: 'Coordinator', workspaceId: 'ws-1' },
            state: {
              agentId: 'member-1',
              conversation: {
                id: 'temp-team-1::coordinator',
                messages: [],
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-02T00:00:00.000Z',
              },
            },
          },
        ],
      ]),
      focusedMemberName: 'coordinator',
      currentStatus: 'idle',
      isSubscribed: false,
      taskPlan: null,
      taskStatuses: null,
    });

    const nodes = store.getTeamNodes();
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.teamId).toBe('temp-team-1');
    expect(nodes[0]?.teamDefinitionName).toBe('Movie Maker');
    expect(nodes[0]?.members[0]?.memberRouteKey).toBe('coordinator');
    expect(nodes[0]?.members[0]?.workspaceRootPath).toBe('/ws/a');
    expect(nodes[0]?.isActive).toBe(true);
  });

  it('selectTreeRun delegates to openRun for history rows', async () => {
    const store = useRunTreeStore();
    const openRunSpy = vi.spyOn(store, 'openRun').mockResolvedValue(undefined);

    await store.selectTreeRun({
      agentId: 'run-1',
      summary: 'Persisted run',
      lastActivityAt: '2026-01-01T00:00:00.000Z',
      lastKnownStatus: 'IDLE',
      isActive: false,
      source: 'history',
      isDraft: false,
    });

    expect(openRunSpy).toHaveBeenCalledWith('run-1');
  });

  it('selectTreeRun uses local team context rows without reopening team history', async () => {
    const store = useRunTreeStore();
    teamContextsMock.set('team-1', {
      teamId: 'team-1',
      members: new Map([
        ['coordinator', { config: {}, state: { conversation: { messages: [] } } }],
      ]),
      focusedMemberName: 'coordinator',
      config: {
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'Movie Maker',
      },
      currentStatus: 'idle',
    });
    const openTeamSpy = vi.spyOn(store, 'openTeamMemberRun').mockResolvedValue(undefined);

    await store.selectTreeRun({
      teamId: 'team-1',
      memberRouteKey: 'coordinator',
      memberName: 'Coordinator',
      memberAgentId: 'member-1',
      workspaceRootPath: null,
      hostNodeId: null,
      summary: '',
      lastActivityAt: '2026-01-02T00:00:00.000Z',
      lastKnownStatus: 'ACTIVE',
      isActive: true,
      deleteLifecycle: 'READY',
    });

    expect(openTeamSpy).not.toHaveBeenCalled();
    expect(agentTeamContextsStoreMock.setFocusedMember).toHaveBeenCalledWith('coordinator');
    expect(selectionStoreMock.selectRun).toHaveBeenCalledWith('team-1', 'team');
    expect(store.selectedTeamId).toBe('team-1');
    expect(store.selectedTeamMemberRouteKey).toBe('coordinator');
  });

  it('selectTreeRun selects local temp context for draft rows', async () => {
    const store = useRunTreeStore();
    store.selectedTeamId = 'team-previous';
    store.selectedTeamMemberRouteKey = 'coordinator';
    agentContextsStoreMock.runs.set('temp-1', {
      config: { workspaceId: 'ws-1' },
      state: { conversation: { messages: [] } },
    });

    await store.selectTreeRun({
      agentId: 'temp-1',
      summary: 'New - SuperAgent',
      lastActivityAt: '2026-01-01T00:00:00.000Z',
      lastKnownStatus: 'IDLE',
      isActive: false,
      source: 'draft',
      isDraft: true,
    });

    expect(selectionStoreMock.selectRun).toHaveBeenCalledWith('temp-1', 'agent');
    expect(store.selectedAgentId).toBe('temp-1');
    expect(store.selectedTeamId).toBeNull();
    expect(store.selectedTeamMemberRouteKey).toBeNull();
    expect(agentRunConfigStoreMock.clearConfig).toHaveBeenCalled();
    expect(teamRunConfigStoreMock.clearConfig).toHaveBeenCalled();
  });

  it('deleteRun removes local state and refreshes tree when backend succeeds', async () => {
    mutateMock.mockResolvedValueOnce({
      data: {
        deleteRunHistory: {
          success: true,
          message: 'Run deleted.',
        },
      },
      errors: [],
    });

    const store = useRunTreeStore();
    store.workspaceGroups = [
      {
        workspaceRootPath: '/ws/a',
        workspaceName: 'a',
        agents: [
          {
            agentDefinitionId: 'agent-def-1',
            agentName: 'SuperAgent',
            runs: [
              {
                agentId: 'run-1',
                summary: 'Persisted run',
                lastActivityAt: '2026-01-01T00:00:00.000Z',
                lastKnownStatus: 'IDLE',
                isActive: false,
              },
            ],
          },
        ],
      },
    ];
    store.resumeConfigByAgentId = {
      'run-1': {
        agentId: 'run-1',
        isActive: false,
        manifestConfig: {
          agentDefinitionId: 'agent-def-1',
          workspaceRootPath: '/ws/a',
          llmModelIdentifier: 'model-x',
          llmConfig: null,
          autoExecuteTools: false,
          skillAccessMode: null,
        },
        editableFields: {
          llmModelIdentifier: true,
          llmConfig: true,
          autoExecuteTools: true,
          skillAccessMode: true,
          workspaceRootPath: false,
        },
      },
    };
    store.selectedAgentId = 'run-1';

    selectionStoreMock.selectedType = 'agent';
    selectionStoreMock.selectedRunId = 'run-1';
    agentContextsStoreMock.runs.set('run-1', {
      config: { workspaceId: 'ws-1' },
      state: { conversation: { messages: [] } },
    });

    const refreshSpy = vi.spyOn(store, 'refreshTreeQuietly').mockResolvedValue(undefined);
    const deleted = await store.deleteRun('run-1');

    expect(deleted).toBe(true);
    expect(mutateMock).toHaveBeenCalledTimes(1);
    expect(agentContextsStoreMock.removeRun).toHaveBeenCalledWith('run-1');
    expect(store.selectedAgentId).toBeNull();
    expect(store.resumeConfigByAgentId['run-1']).toBeUndefined();
    expect(store.workspaceGroups).toEqual([]);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('deleteRun does not mutate local state when backend rejects deletion', async () => {
    mutateMock.mockResolvedValueOnce({
      data: {
        deleteRunHistory: {
          success: false,
          message: 'Run is active.',
        },
      },
      errors: [],
    });

    const store = useRunTreeStore();
    store.workspaceGroups = [
      {
        workspaceRootPath: '/ws/a',
        workspaceName: 'a',
        agents: [
          {
            agentDefinitionId: 'agent-def-1',
            agentName: 'SuperAgent',
            runs: [
              {
                agentId: 'run-1',
                summary: 'Persisted run',
                lastActivityAt: '2026-01-01T00:00:00.000Z',
                lastKnownStatus: 'IDLE',
                isActive: false,
              },
            ],
          },
        ],
      },
    ];

    const deleted = await store.deleteRun('run-1');

    expect(deleted).toBe(false);
    expect(store.workspaceGroups[0]?.agents[0]?.runs[0]?.agentId).toBe('run-1');
    expect(agentContextsStoreMock.removeRun).not.toHaveBeenCalled();
  });

  it('deleteRun rejects draft run IDs without backend mutation call', async () => {
    const store = useRunTreeStore();
    const deleted = await store.deleteRun('temp-123');

    expect(deleted).toBe(false);
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it('selectTreeRun opens historical team member row, hydrates member history, and selects team context', async () => {
    queryMock.mockImplementation(async ({ query, variables }: { query: string; variables?: Record<string, string> }) => {
      if (query === 'GetTeamRunResumeConfig') {
        return {
          data: {
            getTeamRunResumeConfig: {
              teamId: 'team-1',
              isActive: false,
              manifest: {
                teamId: 'team-1',
                teamDefinitionId: 'team-def-1',
                teamDefinitionName: 'Classroom Team',
                coordinatorMemberRouteKey: 'coordinator',
                runVersion: 1,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
                memberBindings: [
                  {
                    memberRouteKey: 'coordinator',
                    memberName: 'Coordinator',
                    memberAgentId: 'ag-1',
                    agentDefinitionId: 'agent-def-1',
                    llmModelIdentifier: 'model-x',
                    autoExecuteTools: false,
                    llmConfig: null,
                    workspaceRootPath: '/ws/a',
                    hostNodeId: 'node-a',
                  },
                  {
                    memberRouteKey: 'student',
                    memberName: 'Student',
                    memberAgentId: 'ag-2',
                    agentDefinitionId: 'agent-def-1',
                    llmModelIdentifier: 'model-x',
                    autoExecuteTools: false,
                    llmConfig: null,
                    workspaceRootPath: '/ws/a',
                    hostNodeId: 'node-a',
                  },
                ],
              },
            },
          },
          errors: [],
        };
      }
      if (query === 'GetTeamMemberRunProjection') {
        if (variables?.teamRunId === 'team-1' && variables?.memberRouteKey === 'coordinator') {
          return {
            data: {
              getTeamMemberRunProjection: {
                agentId: 'ag-1',
                summary: 'Coordinator history',
                lastActivityAt: '2026-01-01T00:01:00.000Z',
                conversation: [
                  { kind: 'message', role: 'user', content: 'hi coordinator', ts: 1700000000 },
                  { kind: 'message', role: 'assistant', content: 'hello from coordinator', ts: 1700000010 },
                ],
              },
            },
            errors: [],
          };
        }
        if (variables?.teamRunId === 'team-1' && variables?.memberRouteKey === 'student') {
          return {
            data: {
              getTeamMemberRunProjection: {
                agentId: 'ag-2',
                summary: 'Student history',
                lastActivityAt: '2026-01-01T00:02:00.000Z',
                conversation: [
                  { kind: 'message', role: 'user', content: 'hi student', ts: 1700000020 },
                  { kind: 'message', role: 'assistant', content: 'hello from student', ts: 1700000030 },
                ],
              },
            },
            errors: [],
          };
        }
      }
      throw new Error(`Unexpected query: ${String(query)}`);
    });
    workspaceStoreMock.createWorkspace.mockResolvedValue('ws-team');

    const store = useRunTreeStore();
    await store.selectTreeRun({
      teamId: 'team-1',
      memberRouteKey: 'coordinator',
      memberName: 'Coordinator',
      memberAgentId: 'ag-1',
      workspaceRootPath: '/ws/a',
      hostNodeId: 'node-a',
      summary: 'Team summary',
      lastActivityAt: '2026-01-01T00:00:00.000Z',
      lastKnownStatus: 'IDLE',
      isActive: false,
      deleteLifecycle: 'READY',
    });

    expect(agentTeamContextsStoreMock.addTeamContext).toHaveBeenCalledTimes(1);
    expect(selectionStoreMock.selectRun).toHaveBeenCalledWith('team-1', 'team');
    expect(store.selectedTeamId).toBe('team-1');
    expect(store.selectedTeamMemberRouteKey).toBe('coordinator');
    expect(agentTeamRunStoreMock.connectToTeamStream).not.toHaveBeenCalled();

    const teamContext = teamContextsMock.get('team-1');
    expect(teamContext).toBeDefined();
    expect(teamContext.focusedMemberName).toBe('coordinator');

    const coordinatorMessages = teamContext.members.get('coordinator').state.conversation.messages;
    expect(coordinatorMessages).toHaveLength(2);
    expect(coordinatorMessages[0].type).toBe('user');
    expect(coordinatorMessages[1].type).toBe('ai');
    expect(coordinatorMessages[1].text).toContain('coordinator');

    const studentMessages = teamContext.members.get('student').state.conversation.messages;
    expect(studentMessages).toHaveLength(2);
    expect(studentMessages[1].text).toContain('student');
  });

  it('deleteTeamRun removes local team state when backend succeeds', async () => {
    mutateMock.mockResolvedValueOnce({
      data: {
        deleteTeamRunHistory: {
          success: true,
          message: 'Deleted',
        },
      },
      errors: [],
    });

    const store = useRunTreeStore();
    store.teamRuns = [
      {
        teamId: 'team-1',
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'Classroom Team',
        summary: 'summary',
        lastActivityAt: '2026-01-01T00:00:00.000Z',
        lastKnownStatus: 'IDLE',
        deleteLifecycle: 'READY',
        isActive: false,
        members: [],
      },
    ];
    store.teamResumeConfigByTeamId = {
      'team-1': {
        teamId: 'team-1',
        isActive: false,
        manifest: {
          teamId: 'team-1',
          teamDefinitionId: 'team-def-1',
          teamDefinitionName: 'Classroom Team',
          coordinatorMemberRouteKey: 'coordinator',
          runVersion: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          memberBindings: [],
        },
      },
    };
    const refreshSpy = vi.spyOn(store, 'refreshTreeQuietly').mockResolvedValue(undefined);

    const deleted = await store.deleteTeamRun('team-1');
    expect(deleted).toBe(true);
    expect(store.teamRuns).toEqual([]);
    expect(store.teamResumeConfigByTeamId['team-1']).toBeUndefined();
    expect(agentTeamContextsStoreMock.removeTeamContext).toHaveBeenCalledWith('team-1');
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });
});
