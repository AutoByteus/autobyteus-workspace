import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useRunHistoryStore } from '../runHistoryStore';

const {
  queryMock,
  mutateMock,
  windowNodeContextStoreMock,
  workspaceStoreMock,
  agentDefinitionStoreMock,
  agentContextsStoreMock,
  teamContextsStoreMock,
  selectionStoreMock,
  agentRunConfigStoreMock,
  teamRunConfigStoreMock,
  agentRunStoreMock,
  agentTeamRunStoreMock,
  llmProviderConfigStoreMock,
  activeRuntimeSyncStoreMock,
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
  const teams = new Map<string, any>();

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
          existing.state.runId = options.runId;
          existing.state.conversation = options.conversation;
          existing.state.currentStatus = options.status ?? 'idle';
          return;
        }
        runs.set(options.runId, {
          config: { ...options.config },
          state: {
            agentRunId: options.runId,
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
    teamContextsStoreMock: {
      teams,
      get allTeamRuns() {
        return Array.from(teams.values());
      },
      addTeamContext: vi.fn((context: any) => {
        teams.set(context.teamRunId, context);
      }),
      removeTeamContext: vi.fn((teamRunId: string) => {
        teams.delete(teamRunId);
      }),
      getTeamContextById: vi.fn((teamRunId: string) => teams.get(teamRunId)),
      setFocusedMember: vi.fn((memberName: string) => {
        const activeTeam = Array.from(teams.values())[0];
        if (activeTeam?.members?.has(memberName)) {
          activeTeam.focusedMemberName = memberName;
        }
      }),
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
      disconnectAgentStream: vi.fn(),
    },
    agentTeamRunStoreMock: {
      connectToTeamStream: vi.fn(),
    },
    llmProviderConfigStoreMock: {
      models: ['model-default'],
      fetchProvidersWithModels: vi.fn().mockResolvedValue(undefined),
    },
    activeRuntimeSyncStoreMock: {
      getActiveRunSnapshot: vi.fn().mockReturnValue(null),
      getActiveTeamRunSnapshot: vi.fn().mockReturnValue(null),
      ensureActiveRunSnapshot: vi.fn().mockResolvedValue(null),
      ensureActiveTeamRunSnapshot: vi.fn().mockResolvedValue(null),
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
  GetRunResumeConfig: 'GetRunResumeConfig',
  GetTeamRunResumeConfig: 'GetTeamRunResumeConfig',
  GetTeamMemberRunProjection: 'GetTeamMemberRunProjection',
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

vi.mock('~/stores/agentTeamContextsStore', () => ({
  useAgentTeamContextsStore: () => teamContextsStoreMock,
}));

vi.mock('~/stores/agentSelectionStore', () => ({
  useAgentSelectionStore: () => selectionStoreMock,
}));

vi.mock('~/stores/agentRunConfigStore', () => ({
  useAgentRunConfigStore: () => agentRunConfigStoreMock,
}));

vi.mock('~/stores/teamRunConfigStore', () => ({
  useTeamRunConfigStore: () => teamRunConfigStoreMock,
}));

vi.mock('~/stores/agentRunStore', () => ({
  useAgentRunStore: () => agentRunStoreMock,
}));

vi.mock('~/stores/agentTeamRunStore', () => ({
  useAgentTeamRunStore: () => agentTeamRunStoreMock,
}));

vi.mock('~/stores/llmProviderConfig', () => ({
  useLLMProviderConfigStore: () => llmProviderConfigStoreMock,
}));

vi.mock('~/stores/activeRuntimeSyncStore', () => ({
  useActiveRuntimeSyncStore: () => activeRuntimeSyncStoreMock,
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
    teamContextsStoreMock.teams.clear();

    selectionStoreMock.selectedType = null;
    selectionStoreMock.selectedRunId = null;
    llmProviderConfigStoreMock.models = ['model-default'];
    llmProviderConfigStoreMock.fetchProvidersWithModels.mockResolvedValue(undefined);
    activeRuntimeSyncStoreMock.getActiveRunSnapshot.mockReset();
    activeRuntimeSyncStoreMock.getActiveRunSnapshot.mockReturnValue(null);
    activeRuntimeSyncStoreMock.getActiveTeamRunSnapshot.mockReset();
    activeRuntimeSyncStoreMock.getActiveTeamRunSnapshot.mockReturnValue(null);
    activeRuntimeSyncStoreMock.ensureActiveRunSnapshot.mockReset();
    activeRuntimeSyncStoreMock.ensureActiveRunSnapshot.mockResolvedValue(null);
    activeRuntimeSyncStoreMock.ensureActiveTeamRunSnapshot.mockReset();
    activeRuntimeSyncStoreMock.ensureActiveTeamRunSnapshot.mockResolvedValue(null);
    mutateMock.mockReset();
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
                        runId: 'run-1',
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
            listTeamRunHistory: [
              {
                teamRunId: 'team-1',
                teamDefinitionId: 'team-def-1',
                teamDefinitionName: 'Team Alpha',
                workspaceRootPath: '/ws/a',
                summary: 'Team task',
                lastActivityAt: new Date().toISOString(),
                lastKnownStatus: 'IDLE',
                deleteLifecycle: 'READY',
                isActive: false,
                members: [
                  {
                    memberRouteKey: 'super_agent',
                    memberName: 'Super Agent',
                    memberRunId: 'member-run-1',
                    workspaceRootPath: '/ws/a',
                  },
                ],
              },
            ],
          },
          errors: [],
        };
      }
      throw new Error(`Unexpected query: ${String(query)}`);
    });

    const store = useRunHistoryStore();
    await store.fetchTree();

    expect(store.error).toBeNull();
    expect(store.workspaceGroups).toHaveLength(1);
    expect(store.teamRuns).toHaveLength(1);
    expect(store.workspaceGroups[0]?.agents[0]?.runs[0]?.runId).toBe('run-1');
    expect(store.agentAvatarByDefinitionId['agent-def-1']).toBe('https://a');
  });

  it('returns backend readiness error on fetchTree when backend is not ready', async () => {
    windowNodeContextStoreMock.waitForBoundBackendReady.mockResolvedValueOnce(false);
    windowNodeContextStoreMock.lastReadyError = 'Backend down';

    const store = useRunHistoryStore();
    await store.fetchTree();

    expect(store.error).toContain('Backend down');
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('opens a run, hydrates projection, selects runContext, and connects stream when active', async () => {
    activeRuntimeSyncStoreMock.ensureActiveRunSnapshot.mockResolvedValue({
      id: 'run-1',
      name: 'SuperAgent',
      currentStatus: 'PROCESSING_USER_INPUT',
    });

    queryMock.mockImplementation(async ({ query }: { query: string }) => {
      if (query === 'GetRunProjection') {
        return {
          data: {
            getRunProjection: {
              runId: 'run-1',
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
              runId: 'run-1',
              isActive: true,
              manifestConfig: {
                agentDefinitionId: 'agent-def-1',
                workspaceRootPath: '/ws/a',
                llmModelIdentifier: 'model-x',
                llmConfig: { temperature: 0.3 },
                autoExecuteTools: false,
                skillAccessMode: 'PRELOADED_ONLY',
                runtimeKind: 'codex_app_server',
                runtimeReference: {
                  runtimeKind: 'codex_app_server',
                  sessionId: 'session-1',
                  threadId: 'thread-1',
                  metadata: { origin: 'test' },
                },
              },
              editableFields: {
                llmModelIdentifier: false,
                llmConfig: false,
                autoExecuteTools: false,
                skillAccessMode: false,
                workspaceRootPath: false,
                runtimeKind: false,
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

    const store = useRunHistoryStore();
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
                runId: 'run-1',
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
    expect(store.isRuntimeLockedForRun('run-1')).toBe(true);
    expect(activeRuntimeSyncStoreMock.ensureActiveRunSnapshot).toHaveBeenCalledWith('run-1');
    expect(agentContextsStoreMock.upsertProjectionContext).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'processing_user_input',
        config: expect.objectContaining({
          runtimeKind: 'codex_app_server',
        }),
      }),
    );
    expect(store.selectedRunId).toBe('run-1');
  });

  it('opens an inactive run and hydrates offline status without connecting stream', async () => {
    queryMock.mockImplementation(async ({ query }: { query: string }) => {
      if (query === 'GetRunProjection') {
        return {
          data: {
            getRunProjection: {
              runId: 'run-2',
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
              runId: 'run-2',
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
                runtimeKind: false,
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

    const store = useRunHistoryStore();
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
                runId: 'run-2',
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
    expect(store.isRuntimeLockedForRun('run-2')).toBe(true);
    expect(agentRunStoreMock.connectToAgentStream).not.toHaveBeenCalled();
    expect(selectionStoreMock.selectRun).toHaveBeenCalledWith('run-2', 'agent');
    expect(store.selectedRunId).toBe('run-2');
  });

  it('does not reconnect an agent stream when persisted history says active but no live snapshot exists', async () => {
    queryMock.mockImplementation(async ({ query }: { query: string }) => {
      if (query === 'GetRunProjection') {
        return {
          data: {
            getRunProjection: {
              runId: 'run-stale-1',
              summary: 'Stale active run',
              lastActivityAt: '2026-01-01T00:00:00.000Z',
              conversation: [
                { kind: 'message', role: 'user', content: 'hello', ts: 1700000000 },
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
              runId: 'run-stale-1',
              isActive: true,
              manifestConfig: {
                agentDefinitionId: 'agent-def-1',
                workspaceRootPath: '/ws/a',
                llmModelIdentifier: 'model-x',
                llmConfig: null,
                autoExecuteTools: false,
                skillAccessMode: 'PRELOADED_ONLY',
                runtimeKind: 'codex_app_server',
                runtimeReference: null,
              },
              editableFields: {
                llmModelIdentifier: false,
                llmConfig: false,
                autoExecuteTools: false,
                skillAccessMode: false,
                workspaceRootPath: false,
                runtimeKind: false,
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

    const store = useRunHistoryStore();
    await store.openRun('run-stale-1');

    expect(activeRuntimeSyncStoreMock.ensureActiveRunSnapshot).toHaveBeenCalledWith('run-stale-1');
    expect(agentRunStoreMock.connectToAgentStream).not.toHaveBeenCalled();
    expect(agentContextsStoreMock.upsertProjectionContext).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-stale-1',
        status: 'shutdown_complete',
        config: expect.objectContaining({
          isLocked: false,
        }),
      }),
    );
  });

  it('does not clobber live active context state when reopening an already subscribed run', async () => {
    queryMock.mockImplementation(async ({ query }: { query: string }) => {
      if (query === 'GetRunProjection') {
        return {
          data: {
            getRunProjection: {
              runId: 'run-1',
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
              runId: 'run-1',
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
                runtimeKind: false,
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
        agentRunId: 'run-1',
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
    activeRuntimeSyncStoreMock.ensureActiveRunSnapshot.mockResolvedValueOnce({
      id: 'run-1',
      name: 'SuperAgent',
      currentStatus: 'IDLE',
    });

    const store = useRunHistoryStore();
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

    const store = useRunHistoryStore();
    await store.createDraftRun({
      workspaceRootPath: '/ws/a',
      agentDefinitionId: 'agent-def-1',
    });

    expect(agentRunConfigStoreMock.setTemplate).toHaveBeenCalled();
    expect(agentRunConfigStoreMock.updateAgentConfig).toHaveBeenCalledWith({
      workspaceId: 'ws-1',
      llmModelIdentifier: 'model-default',
    });
    expect(workspaceStoreMock.createWorkspace).not.toHaveBeenCalled();
    expect(selectionStoreMock.clearSelection).toHaveBeenCalled();
    expect(agentContextsStoreMock.createRunFromTemplate).not.toHaveBeenCalled();
    expect(store.selectedRunId).toBeNull();
  });

  it('reuses model from existing context when creating draft run', async () => {
    workspaceStoreMock.allWorkspaces = [
      { workspaceId: 'ws-1', absolutePath: '/ws/a', name: 'a' },
    ];
    workspaceStoreMock.workspacesFetched = true;

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

    const store = useRunHistoryStore();
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
    expect(workspaceStoreMock.createWorkspace).not.toHaveBeenCalled();
    expect(agentContextsStoreMock.createRunFromTemplate).not.toHaveBeenCalled();
  });

  it('reuses an existing workspace id when local cache has matching root path', async () => {
    workspaceStoreMock.workspacesFetched = true;
    workspaceStoreMock.allWorkspaces = [
      { workspaceId: 'stale-ws-id', absolutePath: '/ws/a', name: 'a' },
    ];

    const store = useRunHistoryStore();
    const workspaceId = await store.ensureWorkspaceByRootPath('/ws/a');

    expect(workspaceId).toBe('stale-ws-id');
    expect(workspaceStoreMock.createWorkspace).not.toHaveBeenCalled();
  });

  it('fetches workspaces before creating one when cache is not loaded yet', async () => {
    workspaceStoreMock.workspacesFetched = false;
    workspaceStoreMock.fetchAllWorkspaces.mockImplementation(async () => {
      workspaceStoreMock.workspacesFetched = true;
      workspaceStoreMock.allWorkspaces = [
        { workspaceId: 'resolved-ws-id', absolutePath: '/ws/a', name: 'a' },
      ];
    });

    const store = useRunHistoryStore();
    const workspaceId = await store.ensureWorkspaceByRootPath('/ws/a');

    expect(workspaceStoreMock.fetchAllWorkspaces).toHaveBeenCalledTimes(1);
    expect(workspaceId).toBe('resolved-ws-id');
    expect(workspaceStoreMock.createWorkspace).not.toHaveBeenCalled();
  });

  it('projects persisted history and temp drafts into workspace tree', () => {
    const store = useRunHistoryStore();
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
                runId: 'run-1',
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
    expect(alphaAgent?.runs.map(run => run.runId)).toEqual(['temp-1', 'run-1']);
    expect(alphaAgent?.runs[0]?.source).toBe('draft');
    expect(alphaAgent?.runs[1]?.source).toBe('history');

    expect(nodes[1]).toEqual({
      workspaceRootPath: '/ws/b',
      workspaceName: 'Beta',
      agents: [],
    });
  });

  it('overlays persisted run status with matching live context only', () => {
    const store = useRunHistoryStore();
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
                runId: 'run-a',
                summary: 'Run A',
                lastActivityAt: '2026-01-01T00:00:00.000Z',
                lastKnownStatus: 'IDLE',
                isActive: false,
              },
              {
                runId: 'run-b',
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
    const runA = nodes[0]?.agents[0]?.runs.find((run) => run.runId === 'run-a');
    const runB = nodes[0]?.agents[0]?.runs.find((run) => run.runId === 'run-b');

    expect(runA?.isActive).toBe(false);
    expect(runA?.lastKnownStatus).toBe('IDLE');
    expect(runB?.isActive).toBe(true);
    expect(runB?.lastKnownStatus).toBe('ACTIVE');
    expect(runB?.lastActivityAt).toBe('2026-01-03T00:00:00.000Z');
  });

  it('treats idle draft contexts as active in tree projection', () => {
    const store = useRunHistoryStore();
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
    const draft = nodes[0]?.agents[0]?.runs.find((run) => run.runId === 'temp-1');

    expect(draft?.source).toBe('draft');
    expect(draft?.isActive).toBe(true);
    expect(draft?.lastKnownStatus).toBe('ACTIVE');
  });

  it('selectTreeRun delegates to openRun for history rows', async () => {
    const store = useRunHistoryStore();
    const openRunSpy = vi.spyOn(store, 'openRun').mockResolvedValue(undefined);

    await store.selectTreeRun({
      runId: 'run-1',
      summary: 'Persisted run',
      lastActivityAt: '2026-01-01T00:00:00.000Z',
      lastKnownStatus: 'IDLE',
      isActive: false,
      source: 'history',
      isDraft: false,
    });

    expect(openRunSpy).toHaveBeenCalledWith('run-1');
  });

  it('selectTreeRun selects local temp context for draft rows', async () => {
    const store = useRunHistoryStore();
    agentContextsStoreMock.runs.set('temp-1', {
      config: { workspaceId: 'ws-1' },
      state: { conversation: { messages: [] } },
    });

    await store.selectTreeRun({
      runId: 'temp-1',
      summary: 'New - SuperAgent',
      lastActivityAt: '2026-01-01T00:00:00.000Z',
      lastKnownStatus: 'IDLE',
      isActive: false,
      source: 'draft',
      isDraft: true,
    });

    expect(selectionStoreMock.selectRun).toHaveBeenCalledWith('temp-1', 'agent');
    expect(store.selectedRunId).toBe('temp-1');
    expect(agentRunConfigStoreMock.clearConfig).toHaveBeenCalled();
    expect(teamRunConfigStoreMock.clearConfig).toHaveBeenCalled();
  });

  it('projects persisted team history into team nodes for a workspace', () => {
    const store = useRunHistoryStore();
    store.teamRuns = [
      {
        teamRunId: 'team-1',
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'Team Alpha',
        workspaceRootPath: '/ws/a',
        summary: 'Persisted team task',
        lastActivityAt: '2026-01-01T00:00:00.000Z',
        lastKnownStatus: 'IDLE',
        deleteLifecycle: 'READY',
        isActive: false,
        members: [
          {
            memberRouteKey: 'super_agent',
            memberName: 'Super Agent',
            memberRunId: 'member-run-1',
            workspaceRootPath: '/ws/a',
          },
        ],
      },
    ];

    const teamNodes = store.getTeamNodes('/ws/a');
    expect(teamNodes).toHaveLength(1);
    expect(teamNodes[0]).toEqual(
      expect.objectContaining({
        teamRunId: 'team-1',
        teamDefinitionName: 'Team Alpha',
        focusedMemberName: 'super_agent',
        workspaceRootPath: '/ws/a',
      }),
    );
    expect(teamNodes[0]?.members[0]).toEqual(
      expect.objectContaining({
        memberRouteKey: 'super_agent',
        memberRunId: 'member-run-1',
      }),
    );
  });

  it('keeps team node order stable instead of re-sorting by last activity time', () => {
    const store = useRunHistoryStore();
    store.teamRuns = [
      {
        teamRunId: 'team-older',
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'Team Alpha',
        workspaceRootPath: '/ws/a',
        summary: 'Older team',
        lastActivityAt: '2026-01-01T00:00:00.000Z',
        lastKnownStatus: 'IDLE',
        deleteLifecycle: 'READY',
        isActive: false,
        members: [],
      },
      {
        teamRunId: 'team-newer',
        teamDefinitionId: 'team-def-2',
        teamDefinitionName: 'Team Beta',
        workspaceRootPath: '/ws/a',
        summary: 'Newer team',
        lastActivityAt: '2026-01-02T00:00:00.000Z',
        lastKnownStatus: 'IDLE',
        deleteLifecycle: 'READY',
        isActive: false,
        members: [],
      },
    ];

    const teamNodes = store.getTeamNodes('/ws/a');
    expect(teamNodes.map((team) => team.teamRunId)).toEqual(['team-older', 'team-newer']);
  });

  it('uses live member status for team member rows when a team context is active', () => {
    const store = useRunHistoryStore();
    workspaceStoreMock.allWorkspaces = [
      { workspaceId: 'ws-1', absolutePath: '/ws/a', name: 'Alpha' },
    ];
    workspaceStoreMock.workspaces = {
      'ws-1': { workspaceId: 'ws-1', absolutePath: '/ws/a', name: 'Alpha', workspaceConfig: {} },
    };

    teamContextsStoreMock.teams.set('team-live-1', {
      teamRunId: 'team-live-1',
      config: {
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'Team Alpha',
        runtimeKind: 'codex_app_server',
        workspaceId: 'ws-1',
        llmModelIdentifier: 'model-x',
        autoExecuteTools: false,
        memberOverrides: {},
        isLocked: true,
      },
      members: new Map([
        ['professor', {
          config: { workspaceId: 'ws-1', agentDefinitionName: 'Professor' },
          state: {
            runId: 'member-professor-1',
            currentStatus: 'awaiting_llm_response',
            conversation: {
              id: 'member-professor-1',
              messages: [],
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:01:00.000Z',
            },
          },
        }],
        ['student', {
          config: { workspaceId: 'ws-1', agentDefinitionName: 'Student' },
          state: {
            runId: 'member-student-1',
            currentStatus: 'shutdown_complete',
            conversation: {
              id: 'member-student-1',
              messages: [],
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:30.000Z',
            },
          },
        }],
      ]),
      focusedMemberName: 'professor',
      currentStatus: 'processing',
      isSubscribed: true,
      taskPlan: null,
      taskStatuses: null,
    });

    const teamNodes = store.getTeamNodes('/ws/a');
    const teamNode = teamNodes.find((team) => team.teamRunId === 'team-live-1');
    const professorRow = teamNode?.members.find((member) => member.memberRouteKey === 'professor');
    const studentRow = teamNode?.members.find((member) => member.memberRouteKey === 'student');

    expect(teamNode?.isActive).toBe(true);
    expect(professorRow).toEqual(
      expect.objectContaining({
        isActive: true,
        lastKnownStatus: 'ACTIVE',
      }),
    );
    expect(studentRow).toEqual(
      expect.objectContaining({
        isActive: false,
        lastKnownStatus: 'IDLE',
      }),
    );
  });

  it('selectTreeRun opens persisted team member when local team context is absent', async () => {
    const store = useRunHistoryStore();
    const openTeamMemberRunSpy = vi.spyOn(store, 'openTeamMemberRun').mockResolvedValue(undefined);

    await store.selectTreeRun({
      teamRunId: 'team-1',
      memberRouteKey: 'super_agent',
      memberName: 'Super Agent',
      memberRunId: 'member-run-1',
      workspaceRootPath: '/ws/a',
      summary: 'Persisted team task',
      lastActivityAt: '2026-01-01T00:00:00.000Z',
      lastKnownStatus: 'IDLE',
      isActive: false,
      deleteLifecycle: 'READY',
    });

    expect(openTeamMemberRunSpy).toHaveBeenCalledWith('team-1', 'super_agent');
  });

  it('selectTreeRun keeps a subscribed live team context and only changes focus', async () => {
    const store = useRunHistoryStore();
    const openTeamMemberRunSpy = vi.spyOn(store, 'openTeamMemberRun').mockResolvedValue(undefined);

    teamContextsStoreMock.teams.set('team-1', {
      teamRunId: 'team-1',
      config: {
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'Team Alpha',
        runtimeKind: 'codex_app_server',
        workspaceId: 'ws-1',
        llmModelIdentifier: 'model-x',
        autoExecuteTools: false,
        memberOverrides: {},
        isLocked: true,
      },
      members: new Map([
        ['super_agent', {
          config: { workspaceId: 'ws-1', agentDefinitionName: 'Super Agent' },
          state: { runId: 'member-run-1', conversation: { messages: [] } },
        }],
      ]),
      focusedMemberName: 'super_agent',
      currentStatus: 'idle',
      isSubscribed: true,
      taskPlan: null,
      taskStatuses: null,
    });

    await store.selectTreeRun({
      teamRunId: 'team-1',
      memberRouteKey: 'super_agent',
      memberName: 'Super Agent',
      memberRunId: 'member-run-1',
      workspaceRootPath: '/ws/a',
      summary: 'Persisted team task',
      lastActivityAt: '2026-01-01T00:00:00.000Z',
      lastKnownStatus: 'IDLE',
      isActive: false,
      deleteLifecycle: 'READY',
    });

    expect(openTeamMemberRunSpy).not.toHaveBeenCalled();
    expect(teamContextsStoreMock.setFocusedMember).toHaveBeenCalledWith('super_agent');
    expect(selectionStoreMock.selectRun).toHaveBeenCalledWith('team-1', 'team');
    expect(store.selectedTeamRunId).toBe('team-1');
    expect(store.selectedTeamMemberRouteKey).toBe('super_agent');
  });

  it('selectTreeRun still reopens persisted team history when the local team context is not subscribed', async () => {
    const store = useRunHistoryStore();
    const openTeamMemberRunSpy = vi.spyOn(store, 'openTeamMemberRun').mockResolvedValue(undefined);

    teamContextsStoreMock.teams.set('team-1', {
      teamRunId: 'team-1',
      config: {
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'Team Alpha',
        runtimeKind: 'codex_app_server',
        workspaceId: 'ws-1',
        llmModelIdentifier: 'model-x',
        autoExecuteTools: false,
        memberOverrides: {},
        isLocked: true,
      },
      members: new Map([
        ['super_agent', {
          config: { workspaceId: 'ws-1', agentDefinitionName: 'Super Agent' },
          state: { runId: 'member-run-1', conversation: { messages: [] } },
        }],
      ]),
      focusedMemberName: 'super_agent',
      currentStatus: 'idle',
      isSubscribed: false,
      taskPlan: null,
      taskStatuses: null,
    });

    await store.selectTreeRun({
      teamRunId: 'team-1',
      memberRouteKey: 'super_agent',
      memberName: 'Super Agent',
      memberRunId: 'member-run-1',
      workspaceRootPath: '/ws/a',
      summary: 'Persisted team task',
      lastActivityAt: '2026-01-01T00:00:00.000Z',
      lastKnownStatus: 'IDLE',
      isActive: false,
      deleteLifecycle: 'READY',
    });

    expect(openTeamMemberRunSpy).toHaveBeenCalledWith('team-1', 'super_agent');
  });

  it('openTeamMemberRun hydrates persisted member projection and selects team focus', async () => {
    queryMock.mockImplementation(async ({ query, variables }: { query: string; variables?: Record<string, unknown> }) => {
      if (query === 'GetTeamRunResumeConfig') {
        return {
          data: {
            getTeamRunResumeConfig: {
              teamRunId: 'team-1',
              isActive: false,
              manifest: {
                teamRunId: 'team-1',
                teamDefinitionId: 'team-def-1',
                teamDefinitionName: 'Team Alpha',
                coordinatorMemberRouteKey: 'super_agent',
                runVersion: 1,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:05:00.000Z',
                memberBindings: [
                  {
                    memberRouteKey: 'super_agent',
                    memberName: 'Super Agent',
                    memberRunId: 'member-run-1',
                    agentDefinitionId: 'agent-def-1',
                    llmModelIdentifier: 'model-x',
                    autoExecuteTools: false,
                    llmConfig: null,
                    workspaceRootPath: '/ws/a',
                  },
                ],
              },
            },
          },
          errors: [],
        };
      }
      if (query === 'GetTeamMemberRunProjection') {
        expect(variables).toEqual({
          teamRunId: 'team-1',
          memberRouteKey: 'super_agent',
        });
        return {
          data: {
            getTeamMemberRunProjection: {
              agentRunId: 'member-run-1',
              summary: 'Team member history',
              lastActivityAt: '2026-01-01T00:05:00.000Z',
              conversation: [
                { kind: 'message', role: 'user', content: 'hello', ts: 1700000000 },
                { kind: 'message', role: 'assistant', content: 'hi', ts: 1700000010 },
              ],
            },
          },
          errors: [],
        };
      }
      throw new Error(`Unexpected query: ${String(query)}`);
    });

    workspaceStoreMock.createWorkspace.mockResolvedValue('ws-1');

    const store = useRunHistoryStore();
    await store.openTeamMemberRun('team-1', 'super_agent');

    const hydratedTeam = teamContextsStoreMock.teams.get('team-1');
    expect(hydratedTeam).toBeTruthy();
    expect(hydratedTeam.focusedMemberName).toBe('super_agent');
    expect(hydratedTeam.members.get('super_agent')?.state.conversation.messages.length).toBe(2);
    expect(hydratedTeam.members.get('super_agent')?.state.currentStatus).toBe('shutdown_complete');
    expect(selectionStoreMock.selectRun).toHaveBeenCalledWith('team-1', 'team');
    expect(store.selectedTeamRunId).toBe('team-1');
    expect(store.selectedTeamMemberRouteKey).toBe('super_agent');
    expect(teamRunConfigStoreMock.clearConfig).toHaveBeenCalled();
    expect(agentRunConfigStoreMock.clearConfig).toHaveBeenCalled();
    expect(agentTeamRunStoreMock.connectToTeamStream).not.toHaveBeenCalled();
  });

  it('openTeamMemberRun applies active runtime snapshot status immediately for active teams', async () => {
    activeRuntimeSyncStoreMock.ensureActiveTeamRunSnapshot.mockResolvedValue({
      id: 'team-1',
      name: 'Team Alpha',
      currentStatus: 'ACTIVE',
      members: [
        {
          memberRouteKey: 'super_agent',
          memberName: 'Super Agent',
          memberRunId: 'member-run-1',
          currentStatus: 'PROCESSING_USER_INPUT',
        },
      ],
    });

    queryMock.mockImplementation(async ({ query, variables }: { query: string; variables?: Record<string, unknown> }) => {
      if (query === 'GetTeamRunResumeConfig') {
        return {
          data: {
            getTeamRunResumeConfig: {
              teamRunId: 'team-1',
              isActive: true,
              manifest: {
                teamRunId: 'team-1',
                teamDefinitionId: 'team-def-1',
                teamDefinitionName: 'Team Alpha',
                coordinatorMemberRouteKey: 'super_agent',
                runVersion: 1,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:05:00.000Z',
                memberBindings: [
                  {
                    memberRouteKey: 'super_agent',
                    memberName: 'Super Agent',
                    memberRunId: 'member-run-1',
                    agentDefinitionId: 'agent-def-1',
                    llmModelIdentifier: 'model-x',
                    autoExecuteTools: false,
                    llmConfig: null,
                    workspaceRootPath: '/ws/a',
                  },
                ],
              },
            },
          },
          errors: [],
        };
      }
      if (query === 'GetTeamMemberRunProjection') {
        expect(variables).toEqual({
          teamRunId: 'team-1',
          memberRouteKey: 'super_agent',
        });
        return {
          data: {
            getTeamMemberRunProjection: {
              agentRunId: 'member-run-1',
              summary: 'Team member history',
              lastActivityAt: '2026-01-01T00:05:00.000Z',
              conversation: [
                { kind: 'message', role: 'user', content: 'hello', ts: 1700000000 },
                { kind: 'message', role: 'assistant', content: 'hi', ts: 1700000010 },
              ],
            },
          },
          errors: [],
        };
      }
      throw new Error(`Unexpected query: ${String(query)}`);
    });

    workspaceStoreMock.createWorkspace.mockResolvedValue('ws-1');

    const store = useRunHistoryStore();
    await store.openTeamMemberRun('team-1', 'super_agent');

    const hydratedTeam = teamContextsStoreMock.teams.get('team-1');
    expect(hydratedTeam).toBeTruthy();
    expect(activeRuntimeSyncStoreMock.ensureActiveTeamRunSnapshot).toHaveBeenCalledWith('team-1');
    expect(hydratedTeam.currentStatus).toBe('processing');
    expect(hydratedTeam.members.get('super_agent')?.state.currentStatus).toBe('processing_user_input');
    expect(agentTeamRunStoreMock.connectToTeamStream).toHaveBeenCalledWith('team-1');
  });

  it('openTeamMemberRun does not reconnect a team stream when no live snapshot exists', async () => {
    queryMock.mockImplementation(async ({ query, variables }: { query: string; variables?: Record<string, unknown> }) => {
      if (query === 'GetTeamRunResumeConfig') {
        return {
          data: {
            getTeamRunResumeConfig: {
              teamRunId: 'team-stale-1',
              isActive: true,
              manifest: {
                teamRunId: 'team-stale-1',
                teamDefinitionId: 'team-def-1',
                teamDefinitionName: 'Team Alpha',
                coordinatorMemberRouteKey: 'super_agent',
                runVersion: 1,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:05:00.000Z',
                memberBindings: [
                  {
                    memberRouteKey: 'super_agent',
                    memberName: 'Super Agent',
                    memberRunId: 'member-run-1',
                    agentDefinitionId: 'agent-def-1',
                    llmModelIdentifier: 'model-x',
                    autoExecuteTools: false,
                    llmConfig: null,
                    workspaceRootPath: '/ws/a',
                  },
                ],
              },
            },
          },
          errors: [],
        };
      }
      if (query === 'GetTeamMemberRunProjection') {
        expect(variables).toEqual({
          teamRunId: 'team-stale-1',
          memberRouteKey: 'super_agent',
        });
        return {
          data: {
            getTeamMemberRunProjection: {
              agentRunId: 'member-run-1',
              summary: 'Team member history',
              lastActivityAt: '2026-01-01T00:05:00.000Z',
              conversation: [
                { kind: 'message', role: 'user', content: 'hello', ts: 1700000000 },
              ],
            },
          },
          errors: [],
        };
      }
      throw new Error(`Unexpected query: ${String(query)}`);
    });

    workspaceStoreMock.createWorkspace.mockResolvedValue('ws-1');

    const store = useRunHistoryStore();
    await store.openTeamMemberRun('team-stale-1', 'super_agent');

    const hydratedTeam = teamContextsStoreMock.teams.get('team-stale-1');
    expect(hydratedTeam).toBeTruthy();
    expect(activeRuntimeSyncStoreMock.ensureActiveTeamRunSnapshot).toHaveBeenCalledWith('team-stale-1');
    expect(agentTeamRunStoreMock.connectToTeamStream).not.toHaveBeenCalled();
    expect(hydratedTeam.currentStatus).toBe('shutdown_complete');
    expect(hydratedTeam.config.isLocked).toBe(false);
  });

  it('openTeamMemberRun refreshes an existing team context in place', async () => {
    queryMock.mockImplementation(async ({ query, variables }: { query: string; variables?: Record<string, unknown> }) => {
      if (query === 'GetTeamRunResumeConfig') {
        return {
          data: {
            getTeamRunResumeConfig: {
              teamRunId: 'team-1',
              isActive: false,
              manifest: {
                teamRunId: 'team-1',
                teamDefinitionId: 'team-def-1',
                teamDefinitionName: 'Team Alpha',
                coordinatorMemberRouteKey: 'super_agent',
                runVersion: 1,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:05:00.000Z',
                memberBindings: [
                  {
                    memberRouteKey: 'super_agent',
                    memberName: 'Super Agent',
                    memberRunId: 'member-run-1',
                    agentDefinitionId: 'agent-def-1',
                    llmModelIdentifier: 'model-x',
                    autoExecuteTools: false,
                    llmConfig: null,
                    workspaceRootPath: '/ws/a',
                  },
                ],
              },
            },
          },
          errors: [],
        };
      }
      if (query === 'GetTeamMemberRunProjection') {
        expect(variables).toEqual({
          teamRunId: 'team-1',
          memberRouteKey: 'super_agent',
        });
        return {
          data: {
            getTeamMemberRunProjection: {
              agentRunId: 'member-run-1',
              summary: 'Refreshed history',
              lastActivityAt: '2026-01-01T00:05:00.000Z',
              conversation: [
                { kind: 'message', role: 'user', content: 'hello again', ts: 1700000000 },
                { kind: 'message', role: 'assistant', content: 'hi again', ts: 1700000010 },
              ],
            },
          },
          errors: [],
        };
      }
      throw new Error(`Unexpected query: ${String(query)}`);
    });

    workspaceStoreMock.createWorkspace.mockResolvedValue('ws-1');

    const existingTeamContextUnsubscribeSpy = vi.fn(function (this: any) {
      this.isSubscribed = false;
    });

    const existingTeamContext = {
      teamRunId: 'team-1',
      config: {
        teamDefinitionId: 'team-def-old',
        teamDefinitionName: 'Team Old',
        runtimeKind: 'codex_app_server',
        workspaceId: 'ws-old',
        llmModelIdentifier: 'old-model',
        autoExecuteTools: true,
        memberOverrides: {},
        isLocked: true,
      },
      members: new Map([
        ['super_agent', {
          config: { workspaceId: 'ws-old', agentDefinitionName: 'Super Agent' },
          state: {
            runId: 'member-run-1',
            conversation: {
              id: 'member-run-1',
              messages: [{ type: 'assistant', text: 'stale' }],
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
            currentStatus: 'idle',
          },
        }],
      ]),
      focusedMemberName: 'super_agent',
      currentStatus: 'idle',
      isSubscribed: true,
      unsubscribe: existingTeamContextUnsubscribeSpy,
      taskPlan: { steps: ['stale'] },
      taskStatuses: { stale: 'done' },
    };
    teamContextsStoreMock.teams.set('team-1', existingTeamContext);

    const store = useRunHistoryStore();
    await store.openTeamMemberRun('team-1', 'super_agent');

    expect(teamContextsStoreMock.teams.get('team-1')).toBe(existingTeamContext);
    expect(teamContextsStoreMock.addTeamContext).not.toHaveBeenCalled();
    expect(existingTeamContext.config.teamDefinitionId).toBe('team-def-1');
    expect(existingTeamContext.members.get('super_agent')?.state.conversation.messages).toHaveLength(2);
    expect(existingTeamContext.focusedMemberName).toBe('super_agent');
    expect(existingTeamContext.taskPlan).toBeNull();
    expect(existingTeamContext.taskStatuses).toBeNull();
    expect(existingTeamContextUnsubscribeSpy).toHaveBeenCalledTimes(1);
    expect(existingTeamContext.unsubscribe).toBeUndefined();
    expect(existingTeamContext.isSubscribed).toBe(false);
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

    const store = useRunHistoryStore();
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
                runId: 'run-1',
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
    store.resumeConfigByRunId = {
      'run-1': {
        runId: 'run-1',
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
                runtimeKind: false,
        },
      },
    };
    store.selectedRunId = 'run-1';

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
    expect(store.selectedRunId).toBeNull();
    expect(store.resumeConfigByRunId['run-1']).toBeUndefined();
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

    const store = useRunHistoryStore();
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
                runId: 'run-1',
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
    expect(store.workspaceGroups[0]?.agents[0]?.runs[0]?.runId).toBe('run-1');
    expect(agentContextsStoreMock.removeRun).not.toHaveBeenCalled();
  });

  it('deleteRun rejects draft run IDs without backend mutation call', async () => {
    const store = useRunHistoryStore();
    const deleted = await store.deleteRun('temp-123');

    expect(deleted).toBe(false);
    expect(mutateMock).not.toHaveBeenCalled();
  });
});
