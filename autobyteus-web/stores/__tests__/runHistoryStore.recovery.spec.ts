import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useRunHistoryStore } from '../runHistoryStore';

const {
  queryMock,
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
        runs.set(options.runId, {
          config: { ...options.config },
          state: {
            runId: options.runId,
            conversation: options.conversation,
            currentStatus: options.status ?? 'idle',
          },
          isSubscribed: false,
        });
      }),
      patchConfigOnly: vi.fn(),
      removeRun: vi.fn(),
      createRunFromTemplate: vi.fn(),
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
      setFocusedMember: vi.fn(),
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

describe('runHistoryStore background recovery', () => {
  const buildAgentHistoryResponse = (run: {
    runId: string;
    lastKnownStatus: 'ACTIVE' | 'IDLE';
    isActive: boolean;
  }) => ({
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
                  runId: run.runId,
                  summary: run.isActive ? 'Still running' : 'Done',
                  lastActivityAt: '2026-03-10T08:00:00.000Z',
                  lastKnownStatus: run.lastKnownStatus,
                  isActive: run.isActive,
                },
              ],
            },
          ],
        },
      ],
    },
    errors: [],
  });

  const buildTeamHistoryItem = (teamRunId: string, isActive: boolean) => ({
    teamRunId,
    teamDefinitionId: 'team-def-1',
    teamDefinitionName: 'Team Alpha',
    workspaceRootPath: '/ws/a',
    summary: isActive ? 'Still running' : 'Done',
    lastActivityAt: '2026-03-10T08:00:00.000Z',
    lastKnownStatus: isActive ? 'ACTIVE' : 'IDLE',
    deleteLifecycle: 'READY' as const,
    isActive,
    members: isActive
      ? [
          {
            memberRouteKey: 'super_agent',
            memberName: 'Super Agent',
            memberRunId: 'member-run-1',
            workspaceRootPath: '/ws/a',
          },
        ]
      : [],
  });

  const buildTeamHistoryResponse = (teamRuns: Array<ReturnType<typeof buildTeamHistoryItem>>) => ({
    data: {
      listTeamRunHistory: teamRuns,
    },
    errors: [],
  });

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    windowNodeContextStoreMock.waitForBoundBackendReady.mockResolvedValue(true);
    windowNodeContextStoreMock.lastReadyError = null;
    workspaceStoreMock.workspacesFetched = true;
    workspaceStoreMock.allWorkspaces = [];
    workspaceStoreMock.workspaces = {};
    workspaceStoreMock.createWorkspace.mockResolvedValue('ws-1');
    agentContextsStoreMock.runs.clear();
    teamContextsStoreMock.teams.clear();
    selectionStoreMock.selectedType = null;
    selectionStoreMock.selectedRunId = null;
  });

  it('recovers active agent runs in the background after fetching history', async () => {
    queryMock.mockImplementation(async ({ query, variables }: { query: string; variables?: Record<string, unknown> }) => {
      if (query === 'ListRunHistory') {
        return buildAgentHistoryResponse({
          runId: 'run-active-1',
          lastKnownStatus: 'ACTIVE',
          isActive: true,
        });
      }
      if (query === 'ListTeamRunHistory') {
        return { data: { listTeamRunHistory: [] }, errors: [] };
      }
      if (query === 'GetRunProjection') {
        expect(variables).toEqual({ runId: 'run-active-1' });
        return {
          data: {
            getRunProjection: {
              runId: 'run-active-1',
              summary: 'Still running',
              lastActivityAt: '2026-03-10T08:00:00.000Z',
              conversation: [{ kind: 'message', role: 'user', content: 'hello', ts: 1700000000 }],
            },
          },
          errors: [],
        };
      }
      if (query === 'GetRunResumeConfig') {
        expect(variables).toEqual({ runId: 'run-active-1' });
        return {
          data: {
            getRunResumeConfig: {
              runId: 'run-active-1',
              isActive: true,
              manifestConfig: {
                agentDefinitionId: 'agent-def-1',
                workspaceRootPath: '/ws/a',
                llmModelIdentifier: 'model-x',
                llmConfig: null,
                autoExecuteTools: false,
                skillAccessMode: 'PRELOADED_ONLY',
                runtimeKind: 'autobyteus',
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

    const store = useRunHistoryStore();
    await store.fetchTree();

    expect(agentContextsStoreMock.upsertProjectionContext).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-active-1',
        status: 'uninitialized',
      }),
    );
    expect(agentRunStoreMock.connectToAgentStream).toHaveBeenCalledWith('run-active-1');
    expect(selectionStoreMock.selectRun).not.toHaveBeenCalled();
    expect(store.resumeConfigByRunId['run-active-1']?.isActive).toBe(true);
  });

  it('recovers active team runs in the background after fetching history', async () => {
    queryMock.mockImplementation(async ({ query, variables }: { query: string; variables?: Record<string, unknown> }) => {
      if (query === 'ListRunHistory') {
        return { data: { listRunHistory: [] }, errors: [] };
      }
      if (query === 'ListTeamRunHistory') {
        return buildTeamHistoryResponse([buildTeamHistoryItem('team-active-1', true)]);
      }
      if (query === 'GetTeamRunResumeConfig') {
        expect(variables).toEqual({ teamRunId: 'team-active-1' });
        return {
          data: {
            getTeamRunResumeConfig: {
              teamRunId: 'team-active-1',
              isActive: true,
              manifest: {
                teamRunId: 'team-active-1',
                teamDefinitionId: 'team-def-1',
                teamDefinitionName: 'Team Alpha',
                coordinatorMemberRouteKey: 'super_agent',
                runVersion: 1,
                createdAt: '2026-03-10T08:00:00.000Z',
                updatedAt: '2026-03-10T08:05:00.000Z',
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
          teamRunId: 'team-active-1',
          memberRouteKey: 'super_agent',
        });
        return {
          data: {
            getTeamMemberRunProjection: {
              agentRunId: 'member-run-1',
              summary: 'Team member history',
              lastActivityAt: '2026-03-10T08:05:00.000Z',
              conversation: [
                { kind: 'message', role: 'assistant', content: 'working', ts: 1700000010 },
              ],
            },
          },
          errors: [],
        };
      }
      throw new Error(`Unexpected query: ${String(query)}`);
    });

    const store = useRunHistoryStore();
    await store.fetchTree();

    expect(teamContextsStoreMock.addTeamContext).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: 'team-active-1',
        focusedMemberName: 'super_agent',
        currentStatus: 'uninitialized',
      }),
    );
    expect(agentTeamRunStoreMock.connectToTeamStream).toHaveBeenCalledWith('team-active-1');
    expect(selectionStoreMock.selectRun).not.toHaveBeenCalled();
    expect(store.teamResumeConfigByTeamRunId['team-active-1']?.isActive).toBe(true);
  });

  it('reconnects existing active agent and team contexts in place during background recovery', async () => {
    queryMock.mockImplementation(async ({ query }: { query: string }) => {
      if (query === 'ListRunHistory') {
        return buildAgentHistoryResponse({
          runId: 'run-live-existing',
          lastKnownStatus: 'ACTIVE',
          isActive: true,
        });
      }
      if (query === 'ListTeamRunHistory') {
        return buildTeamHistoryResponse([buildTeamHistoryItem('team-live-existing', true)]);
      }
      throw new Error(`Unexpected query: ${String(query)}`);
    });

    const existingAgentContext = {
      isSubscribed: false,
      config: { isLocked: false },
      state: {
        currentStatus: 'shutdown_complete',
        conversation: {
          id: 'run-live-existing',
          messages: [],
          createdAt: '2026-03-10T08:00:00.000Z',
          updatedAt: '2026-03-10T08:00:00.000Z',
          agentDefinitionId: 'agent-def-1',
        },
      },
    };
    const existingTeamMemberContext = {
      config: { isLocked: false },
      state: { currentStatus: 'shutdown_complete' },
    };
    const existingTeamContext = {
      teamRunId: 'team-live-existing',
      isSubscribed: false,
      currentStatus: 'shutdown_complete',
      focusedMemberName: 'super_agent',
      config: { isLocked: false },
      members: new Map([['super_agent', existingTeamMemberContext]]),
    };

    agentContextsStoreMock.runs.set('run-live-existing', existingAgentContext);
    teamContextsStoreMock.teams.set('team-live-existing', existingTeamContext);

    const store = useRunHistoryStore();
    await store.fetchTree();

    expect(agentContextsStoreMock.upsertProjectionContext).not.toHaveBeenCalled();
    expect(teamContextsStoreMock.addTeamContext).not.toHaveBeenCalled();
    expect(agentRunStoreMock.connectToAgentStream).toHaveBeenCalledWith('run-live-existing');
    expect(agentTeamRunStoreMock.connectToTeamStream).toHaveBeenCalledWith('team-live-existing');
    expect(existingAgentContext.config.isLocked).toBe(true);
    expect(existingAgentContext.state.currentStatus).toBe('uninitialized');
    expect(existingTeamContext.config.isLocked).toBe(true);
    expect(existingTeamContext.currentStatus).toBe('uninitialized');
    expect(existingTeamMemberContext.config.isLocked).toBe(true);
    expect(existingTeamMemberContext.state.currentStatus).toBe('uninitialized');
  });

  it('does not recover inactive history rows during background fetch', async () => {
    queryMock.mockImplementation(async ({ query }: { query: string }) => {
      if (query === 'ListRunHistory') {
        return buildAgentHistoryResponse({
          runId: 'run-inactive-1',
          lastKnownStatus: 'IDLE',
          isActive: false,
        });
      }
      if (query === 'ListTeamRunHistory') {
        return buildTeamHistoryResponse([buildTeamHistoryItem('team-inactive-1', false)]);
      }
      throw new Error(`Unexpected query: ${String(query)}`);
    });

    const store = useRunHistoryStore();
    await store.fetchTree();

    expect(agentContextsStoreMock.upsertProjectionContext).not.toHaveBeenCalled();
    expect(teamContextsStoreMock.addTeamContext).not.toHaveBeenCalled();
    expect(agentRunStoreMock.connectToAgentStream).not.toHaveBeenCalled();
    expect(agentTeamRunStoreMock.connectToTeamStream).not.toHaveBeenCalled();
    expect(selectionStoreMock.selectRun).not.toHaveBeenCalled();
  });
});
