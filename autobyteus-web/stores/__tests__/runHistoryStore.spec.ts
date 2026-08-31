import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useRunHistoryStore } from '../runHistoryStore';
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures';

const buildWorkspaceHistoryGroup = (workspace: Record<string, any>): any => {
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

  const normalizedAgentDefinitions = (agentDefinitions ?? agents ?? []).map((agent: any) => ({
    ...agent,
    runs: (agent.runs ?? []).map((run: any) => ({
      ...run,
      createdAt: run.createdAt ?? run.lastActivityAt ?? '2026-01-01T00:00:00.000Z',
      status: run.status ?? (run.isActive ? 'running' : run.lastKnownStatus === 'ERROR' ? 'error' : 'offline'),
    })),
  }));

  const normalizedTeamDefinitions = groupedTeamDefinitions.map((definition: any) => ({
    ...definition,
    runs: (definition.runs ?? []).map((teamRun: any) => {
      const members = (teamRun.members ?? []).map((member: any) => ({
        ...member,
        status: member.status ?? 'offline',
      }));
      const coordinatorAddress = teamRun.coordinatorAddress ?? members[0]?.memberAddress ?? '/';
      return {
        ...teamRun,
        coordinatorAddress,
        createdAt: teamRun.createdAt ?? teamRun.lastActivityAt ?? '2026-01-01T00:00:00.000Z',
        members,
        rootTeam: teamRun.rootTeam ?? {
          team_definition_id: teamRun.teamDefinitionId,
          team_definition_name: teamRun.teamDefinitionName,
          team_run_id: teamRun.teamRunId,
          coordinator_address: coordinatorAddress,
          members: members.map((member: any) => ({
            kind: 'configured_agent',
            address: member.memberAddress,
            agent_definition_id: member.agentDefinitionId ?? 'agent-def-1',
            role: null,
            description: null,
            agent_run_id: member.agentRunId,
            platform_agent_run_id: null,
            launch_configuration: {
              runtime_kind: 'AUTOBYTEUS',
              llm_model_identifier: 'model-x',
              llm_config: null,
              auto_execute_tools: false,
              skill_access_mode: 'NONE',
              workspace_root_path: member.workspaceRootPath ?? teamRun.workspaceRootPath ?? null,
            },
          })),
          task_executions: [],
        },
      };
    }),
  }));

  return {
    ...rest,
    agentDefinitions: normalizedAgentDefinitions,
    teamDefinitions: normalizedTeamDefinitions,
  };
};

const flattenWorkspaceGroupTeamRuns = (workspaceGroup: Record<string, any> | undefined): Array<any> =>
  workspaceGroup?.teamDefinitions?.flatMap((definition: any) => definition.runs) ?? [];

const asRunTreeRow = (row: Record<string, any>): any => row;

const buildTeamResumeMetadata = (input: {
  teamRunId?: string;
  teamDefinitionId?: string;
  teamDefinitionName?: string;
  coordinatorAddress?: string;
  createdAt?: string;
  members?: Array<Record<string, any>>;
} = {}): any => ({
  schemaVersion: 3,
  teamDefinitionName: input.teamDefinitionName ?? 'Team Alpha',
  createdAt: input.createdAt ?? '2026-01-01T00:00:00.000Z',
  archivedAt: null,
  rootTeam: {
    kind: 'agent_team',
    address: '/',
    teamDefinitionId: input.teamDefinitionId ?? 'team-def-1',
    teamRunId: input.teamRunId ?? 'team-1',
    coordinatorAddress: input.coordinatorAddress ?? '/super_agent',
    children: (input.members ?? []).map((member) => ({
      kind: 'agent',
      address: member.memberAddress,
      role: null,
      description: null,
      agentRunId: member.agentRunId,
      runtimeKind: member.runtimeKind ?? 'codex_app_server',
      platformAgentRunId: member.platformAgentRunId ?? null,
      agentDefinitionId: member.agentDefinitionId,
      llmModelIdentifier: member.llmModelIdentifier ?? 'model-x',
      autoExecuteTools: member.autoExecuteTools ?? false,
      skillAccessMode: member.skillAccessMode ?? 'PRELOADED_ONLY',
      llmConfig: member.llmConfig ?? null,
      workspaceRootPath: member.workspaceRootPath ?? '/ws/a',
      applicationExecutionContext: null,
    })),
  },
  handoffs: [],
});

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
  hydrateLiveRunContextMock,
  hydrateLiveTeamRunContextMock,
  hydrateTeamMemberActivitiesFromProjectionMock,
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
      allWorkspaces: [] as Array<{
        workspaceId: string;
        absolutePath: string;
        workspaceRootPath?: string;
        name?: string;
        displayName?: string;
        kind?: string;
        isTemp?: boolean;
      }>,
      workspaces: {} as Record<string, any>,
      workspaceMetadataById: {} as Record<string, any>,
      fetchAllWorkspaces: vi.fn().mockResolvedValue(undefined),
      createWorkspace: vi.fn().mockResolvedValue('ws-created'),
      resolveWorkspaceMetadataByRootPath: vi.fn(async (rootPath: string) => ({
        workspaceId: `ref:${rootPath}`,
        workspaceRootPath: rootPath,
        displayName: rootPath.split('/').filter(Boolean).pop() || rootPath,
        kind: 'filesystem',
      })),
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
          existing.state.currentStatus = options.status ?? 'offline';
          return existing;
        }
        const context = {
          config: { ...options.config },
          state: {
            runId: options.runId,
            agentRunId: options.runId,
            conversation: options.conversation,
            currentStatus: options.status ?? 'offline',
          },
          isSubscribed: false,
        };
        runs.set(options.runId, context);
        return context;
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
        teams.set(context.view.getRootTeamRunId(), context);
      }),
      removeTeamContext: vi.fn((teamRunId: string) => {
        teams.delete(teamRunId);
      }),
      getTeamContextById: vi.fn((teamRunId: string) => teams.get(teamRunId)),
      focusMemberAndEnsureHydrated: vi.fn(async (teamRunId: string, agentRunId: string) => {
        const teamContext = teams.get(teamRunId);
        teamContext?.view.focusAgent(agentRunId);
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
      selectDraft: vi.fn(),
    },
    agentRunStoreMock: {
      connectToAgentStream: vi.fn(),
      disconnectAgentStream: vi.fn(),
      isAgentStreamReady: vi.fn().mockReturnValue(false),
    },
    agentTeamRunStoreMock: {
      connectToTeamStream: vi.fn(),
      disconnectTeamStream: vi.fn(),
      isTeamStreamReady: vi.fn().mockReturnValue(false),
      isTeamStreamReopenRequired: vi.fn().mockReturnValue(false),
    },
    llmProviderConfigStoreMock: {
      models: vi.fn(() => ['model-default']),
      fetchProvidersWithModels: vi.fn().mockResolvedValue(undefined),
      ensureMissingDynamicProviders: vi.fn().mockResolvedValue(undefined),
    },
    hydrateLiveRunContextMock: vi.fn().mockResolvedValue(undefined),
    hydrateLiveTeamRunContextMock: vi.fn().mockResolvedValue(undefined),
    hydrateTeamMemberActivitiesFromProjectionMock: vi.fn(),
  };
});

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({
    query: queryMock,
    mutate: mutateMock,
  }),
}));

vi.mock('~/graphql/queries/runHistoryQueries', () => ({
  ListWorkspaceRunHistory: 'ListWorkspaceRunHistory',
  GetWorkspaceRunHistory: 'GetWorkspaceRunHistory',
  GetRunProjection: 'GetRunProjection',
  GetRunFileChanges: 'GetRunFileChanges',
  GetAgentRunResumeConfig: 'GetAgentRunResumeConfig',
  GetTeamRunResumeConfig: 'GetTeamRunResumeConfig',
  GetTeamMemberRunProjection: 'GetTeamMemberRunProjection',
  GetTeamCommunicationMessages: 'GetTeamCommunicationMessages',
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

vi.mock('~/services/runHydration/runContextHydrationService', async () => {
  const actual = await vi.importActual<typeof import('~/services/runHydration/runContextHydrationService')>(
    '~/services/runHydration/runContextHydrationService',
  );
  return {
    ...actual,
    hydrateLiveRunContext: hydrateLiveRunContextMock,
  };
});

vi.mock('~/services/runHydration/teamRunContextHydrationService', async () => {
  const actual = await vi.importActual<typeof import('~/services/runHydration/teamRunContextHydrationService')>(
    '~/services/runHydration/teamRunContextHydrationService',
  );
  return {
    ...actual,
    hydrateLiveTeamRunContext: hydrateLiveTeamRunContextMock,
    hydrateTeamMemberActivitiesFromProjection: hydrateTeamMemberActivitiesFromProjectionMock,
  };
});

describe('runHistoryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    windowNodeContextStoreMock.waitForBoundBackendReady.mockResolvedValue(true);
    windowNodeContextStoreMock.lastReadyError = null;

    workspaceStoreMock.workspacesFetched = true;
    workspaceStoreMock.allWorkspaces = [];
    workspaceStoreMock.workspaces = {};
    workspaceStoreMock.workspaceMetadataById = {};
    workspaceStoreMock.fetchAllWorkspaces.mockResolvedValue(undefined);
    workspaceStoreMock.createWorkspace.mockResolvedValue('ws-created');
    workspaceStoreMock.resolveWorkspaceMetadataByRootPath.mockImplementation(async (rootPath: string) => ({
      workspaceId: `ref:${rootPath}`,
      workspaceRootPath: rootPath,
      displayName: rootPath.split('/').filter(Boolean).pop() || rootPath,
      kind: 'filesystem',
    }));

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
    llmProviderConfigStoreMock.models.mockReturnValue(['model-default']);
    llmProviderConfigStoreMock.fetchProvidersWithModels.mockResolvedValue(undefined);
    hydrateLiveRunContextMock.mockReset();
    hydrateLiveRunContextMock.mockResolvedValue(undefined);
    hydrateLiveTeamRunContextMock.mockReset();
    hydrateTeamMemberActivitiesFromProjectionMock.mockReset();
    hydrateLiveTeamRunContextMock.mockImplementation(async ({ teamRunId }: { teamRunId: string }) => {
      const member = testAgentNode('/super_agent', {
        displayName: 'Super Agent',
        agentDefinitionId: 'agent-def-1',
        agentRunId: 'member-run-live-1',
        currentStatus: 'offline' as any,
      });
      const hydratedContext = buildTestTeamContext({
        teamRunId,
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'Team Alpha',
        rootChildren: [member],
        coordinatorAddress: member.address,
        focusedAgentRunId: member.agentRunId,
        workspaceRootPath: '/ws/a',
        isActive: true,
      });
      const metadata = buildTeamResumeMetadata({
        teamRunId,
        members: [{
          memberAddress: member.address,
          agentRunId: member.agentRunId,
          agentDefinitionId: member.agentDefinitionId,
        }],
      });
      return {
        teamRunId,
        focusedAgentRunId: hydratedContext.view.getFocusedAgentRunId(),
        resumeConfig: { teamRunId, isActive: true, metadata },
        hydratedContext,
        projectionByAgentRunId: new Map([[member.agentRunId, { agentRunId: member.agentRunId }]]),
        activityReplacements: [],
      };
    });
    mutateMock.mockReset();
    agentRunStoreMock.isAgentStreamReady.mockReturnValue(false);
    agentTeamRunStoreMock.isTeamStreamReady.mockReturnValue(false);
  });

  it('publishes the asynchronously loaded initial workspace catalog with exactly one topology refresh', async () => {
    workspaceStoreMock.workspacesFetched = false;
    workspaceStoreMock.allWorkspaces = [];
    workspaceStoreMock.workspaces = {};
    let resolveCatalogLoad!: () => void;
    workspaceStoreMock.fetchAllWorkspaces.mockImplementation(() => new Promise<void>((resolve) => {
      resolveCatalogLoad = () => {
        const workspace = {
          workspaceId: 'ws-boot',
          absolutePath: '/persisted/workspace',
          workspaceRootPath: '/persisted/workspace',
          name: 'Persisted Workspace',
          displayName: 'Persisted Workspace',
          kind: 'filesystem',
          isTemp: false,
          workspaceConfig: { root_path: '/persisted/workspace' },
        };
        workspaceStoreMock.allWorkspaces = [workspace];
        workspaceStoreMock.workspaces = { 'ws-boot': workspace };
        workspaceStoreMock.workspacesFetched = true;
        resolve();
      };
    }));

    const store = useRunHistoryStore();
    const fetchTreeSpy = vi.spyOn(store, 'fetchTree');
    expect(store.navigationProjection).toBeNull();
    expect(store.getTreeNodes()).toEqual([]);
    expect(store.navigationTopologyRevision).toBe(1);

    const catalogLoad = store.loadWorkspaceCatalogForNavigation();
    await Promise.resolve();
    expect(store.getTreeNodes()).toEqual([]);
    resolveCatalogLoad();
    await catalogLoad;

    expect(store.navigationTopologyRevision).toBe(2);
    expect(store.getTreeNodes()).toEqual([
      expect.objectContaining({
        workspaceId: 'ws-boot',
        workspaceRootPath: '/persisted/workspace',
        workspaceName: 'Persisted Workspace',
      }),
    ]);
    expect(fetchTreeSpy).not.toHaveBeenCalled();

    await store.loadWorkspaceCatalogForNavigation();
    expect(workspaceStoreMock.fetchAllWorkspaces).toHaveBeenCalledTimes(1);
    expect(store.navigationTopologyRevision).toBe(2);
  });

  it('fetches run history tree from GraphQL', async () => {
    queryMock.mockImplementation(async ({ query }: { query: string }) => {
      if (query === 'ListWorkspaceRunHistory') {
        return {
          data: {
            listWorkspaceRunHistory: [
              buildWorkspaceHistoryGroup({
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
                teamRuns: [
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
                        memberAddress: '/super_agent',
                        displayName: 'Super Agent',
                        agentRunId: 'member-run-1',
                        workspaceRootPath: '/ws/a',
                      },
                    ],
                  },
                ],
              }),
            ],
          },
          errors: [],
        };
      }
      if (query === 'GetTeamCommunicationMessages') {
        return { data: { getTeamCommunicationMessages: [] } };
      }
      throw new Error(`Unexpected query: ${String(query)}`);
    });

    const store = useRunHistoryStore();
    await store.fetchTree();

    expect(store.error).toBeNull();
    expect(store.workspaceGroups).toHaveLength(1);
    expect(flattenWorkspaceGroupTeamRuns(store.workspaceGroups[0])).toHaveLength(1);
    expect(store.workspaceGroups[0]?.agentDefinitions[0]?.runs[0]?.runId).toBe('run-1');
    expect(store.agentAvatarByDefinitionId['agent-def-1']).toBe('https://a');
  });

  it('hydrates and connects newly discovered active runs from workspace history', async () => {
    queryMock.mockResolvedValue({
      data: {
        listWorkspaceRunHistory: [
          buildWorkspaceHistoryGroup({
            workspaceRootPath: '/ws/a',
            workspaceName: 'a',
            agents: [
              {
                agentDefinitionId: 'agent-def-1',
                agentName: 'SuperAgent',
                runs: [
                  {
                    runId: 'run-live-1',
                    summary: 'Live task',
                    lastActivityAt: new Date().toISOString(),
                    lastKnownStatus: 'ACTIVE',
                    isActive: true,
                  },
                ],
              },
            ],
            teamRuns: [
              {
                teamRunId: 'team-live-1',
                teamDefinitionId: 'team-def-1',
                teamDefinitionName: 'Team Alpha',
                workspaceRootPath: '/ws/a',
                summary: 'Live team task',
                lastActivityAt: new Date().toISOString(),
                lastKnownStatus: 'ACTIVE',
                deleteLifecycle: 'READY',
                isActive: true,
                members: [
                  {
                    memberAddress: '/super_agent',
                    displayName: 'Super Agent',
                    agentRunId: 'member-run-live-1',
                    workspaceRootPath: '/ws/a',
                  },
                ],
              },
            ],
          }),
        ],
      },
      errors: [],
    });

    const store = useRunHistoryStore();
    await store.fetchTree();

    expect(hydrateLiveRunContextMock).toHaveBeenCalledWith({
      runId: 'run-live-1',
      fallbackAgentName: 'SuperAgent',
      resolveWorkspaceMetadataByRootPath: expect.any(Function),
      ensureWorkspaceByRootPath: expect.any(Function),
      currentStatus: 'running',
    });
    expect(agentRunStoreMock.connectToAgentStream).toHaveBeenCalledWith('run-live-1');
    expect(hydrateLiveTeamRunContextMock).toHaveBeenCalledWith({
      teamRunId: 'team-live-1',
      agentRunId: 'member-run-live-1',
      resolveWorkspaceMetadataByRootPath: expect.any(Function),
      ensureWorkspaceByRootPath: expect.any(Function),
      selectRun: false,
    });
    expect(agentTeamRunStoreMock.connectToTeamStream).toHaveBeenCalledWith('team-live-1');
  });

  it('fetchWorkspaceHistory does not reconcile unrelated active contexts outside the scoped workspace', async () => {
    queryMock.mockImplementation(async ({ query, variables }: { query: string; variables: Record<string, unknown> }) => {
      expect(query).toBe('GetWorkspaceRunHistory');
      expect(variables).toEqual({ workspaceId: 'ws-a', limitPerAgent: 6 });
      return {
        data: {
          workspaceRunHistory: buildWorkspaceHistoryGroup({
            workspaceRootPath: '/ws/a',
            workspaceName: 'a',
            agents: [],
            teamRuns: [],
          }),
        },
        errors: [],
      };
    });

    const activeAgentContext = {
      config: { workspaceId: 'ws-b', agentDefinitionId: 'agent-def-1' },
      state: {
        currentStatus: 'running',
        conversation: { messages: [] },
      },
      isSubscribed: true,
    };
    const activeTeamNode = testAgentNode('/member_b', {
      agentDefinitionId: 'agent-def-1',
      agentRunId: 'member-b-run',
      currentStatus: 'running' as any,
    });
    const activeTeamContext = buildTestTeamContext({
      teamRunId: 'team-b-active',
      rootChildren: [activeTeamNode],
      coordinatorAddress: activeTeamNode.address,
      workspaceRootPath: '/ws/b',
      isActive: true,
      configuration: { workspaceId: 'ws-b' },
    });
    const activeTeamMemberContext = activeTeamContext.view.getAgentContext(activeTeamNode.agentRunId)!;
    activeTeamMemberContext.state.currentStatus = 'running' as any;
    agentContextsStoreMock.runs.set('run-b-active', activeAgentContext);
    teamContextsStoreMock.teams.set('team-b-active', activeTeamContext);

    const store = useRunHistoryStore();
    await store.fetchWorkspaceHistory('ws-a');

    expect(store.workspaceGroups).toHaveLength(1);
    expect(store.workspaceGroups[0]?.workspaceRootPath).toBe('/ws/a');
    expect(agentRunStoreMock.disconnectAgentStream).not.toHaveBeenCalled();
    expect(agentTeamRunStoreMock.disconnectTeamStream).not.toHaveBeenCalled();
    expect(activeAgentContext.state.currentStatus).toBe('running');
    expect(activeTeamContext.view.isRootTeamActive()).toBe(true);
    expect(activeTeamMemberContext.state.currentStatus).toBe('running');
  });

  it('projects backend-visible temp workspace descriptors as non-removable roots with local drafts', () => {
    workspaceStoreMock.allWorkspaces = [
      {
        workspaceId: 'temp_ws_default',
        absolutePath: '/tmp/autobyteus-temp',
        workspaceRootPath: '/tmp/autobyteus-temp',
        name: 'Temp Workspace',
        kind: 'temp',
        isTemp: true,
      },
    ];
    workspaceStoreMock.workspaces = {
      temp_ws_default: {
        workspaceId: 'temp_ws_default',
        absolutePath: '/tmp/autobyteus-temp',
        workspaceRootPath: '/tmp/autobyteus-temp',
        workspaceConfig: { root_path: '/tmp/autobyteus-temp' },
      },
    };
    agentContextsStoreMock.runs.set('temp-123', {
      config: {
        agentDefinitionId: 'agent-def-1',
        agentDefinitionName: 'SuperAgent',
        workspaceId: 'temp_ws_default',
        workspaceMetadata: { workspaceRootPath: '/tmp/autobyteus-temp' },
      },
      state: {
        currentStatus: 'offline',
        conversation: {
          id: 'temp-123',
          messages: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    });

    const store = useRunHistoryStore();
    const nodes = store.getTreeNodes();

    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({
      workspaceId: 'temp_ws_default',
      workspaceName: 'Temp Workspace',
      workspaceKind: 'temp',
      canRemoveFromWorkspaces: false,
    });
    expect(nodes[0]?.agents[0]?.runs[0]).toMatchObject({
      runId: 'temp-123',
      source: 'draft',
      isDraft: true,
    });
  });

  it('prefers fixed temp identity and non-removability when temp and filesystem descriptors share one root', () => {
    workspaceStoreMock.allWorkspaces = [
      {
        workspaceId: 'agent_ws_duplicate',
        absolutePath: '/tmp/autobyteus-temp',
        workspaceRootPath: '/tmp/autobyteus-temp',
        name: 'Registered duplicate',
        kind: 'filesystem',
        isTemp: false,
      },
      {
        workspaceId: 'temp_ws_default',
        absolutePath: '/tmp/autobyteus-temp',
        workspaceRootPath: '/tmp/autobyteus-temp',
        name: 'Temp Workspace',
        kind: 'temp',
        isTemp: true,
      },
    ];

    const store = useRunHistoryStore();
    const nodes = store.getTreeNodes();

    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({
      workspaceId: 'temp_ws_default',
      workspaceName: 'Temp Workspace',
      workspaceKind: 'temp',
      canRemoveFromWorkspaces: false,
    });
  });

  it('keeps permanent local standalone contexts visible until history reconciliation dedupes them', () => {
    workspaceStoreMock.allWorkspaces = [
      { workspaceId: 'ws-1', absolutePath: '/ws/a', workspaceRootPath: '/ws/a', name: 'Workspace A' },
    ];
    workspaceStoreMock.workspaces = {
      'ws-1': {
        workspaceId: 'ws-1',
        absolutePath: '/ws/a',
        workspaceRootPath: '/ws/a',
        workspaceConfig: { root_path: '/ws/a' },
      },
    };
    agentContextsStoreMock.runs.set('run-permanent', {
      config: {
        agentDefinitionId: 'agent-def-1',
        agentDefinitionName: 'SuperAgent',
        workspaceId: 'ws-1',
        workspaceMetadata: { workspaceRootPath: '/ws/a' },
      },
      state: {
        currentStatus: 'running',
        conversation: {
          id: 'run-permanent',
          messages: [],
          createdAt: '2026-01-02T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      },
    });

    const store = useRunHistoryStore();
    let rows = store.getTreeNodes()[0]?.agents[0]?.runs ?? [];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      runId: 'run-permanent',
      source: 'local',
      isDraft: false,
    });

    store.workspaceGroups = [
      buildWorkspaceHistoryGroup({
        workspaceRootPath: '/ws/a',
        workspaceName: 'Workspace A',
        agents: [
          {
            agentDefinitionId: 'agent-def-1',
            agentName: 'SuperAgent',
            runs: [
              {
                runId: 'run-permanent',
                summary: 'Persisted row',
                lastActivityAt: '2026-01-01T00:00:00.000Z',
                status: 'offline',
                isActive: false,
              },
            ],
          },
        ],
        teamRuns: [],
      }),
    ];
    store.refreshRunNavigationTopology('test-history-reconciliation');

    rows = store.getTreeNodes()[0]?.agents[0]?.runs ?? [];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      runId: 'run-permanent',
      source: 'history',
      summary: 'Persisted row',
    });
  });

  it('does not project history-only removed workspace roots without visible descriptors', () => {
    const store = useRunHistoryStore();
    store.workspaceGroups = [
      buildWorkspaceHistoryGroup({
        workspaceRootPath: '/ws/removed',
        workspaceName: 'Removed',
        agents: [
          {
            agentDefinitionId: 'agent-def-1',
            agentName: 'SuperAgent',
            runs: [
              {
                runId: 'run-removed',
                summary: 'Removed root history',
                lastActivityAt: '2026-01-01T00:00:00.000Z',
                status: 'offline',
                isActive: false,
              },
            ],
          },
        ],
        teamRuns: [],
      }),
    ];

    expect(store.getTreeNodes()).toEqual([]);
  });

  it('preserves failed-stream member statuses without background stream resurrection', async () => {
    queryMock.mockResolvedValue({
      data: {
        listWorkspaceRunHistory: [
          buildWorkspaceHistoryGroup({
            workspaceRootPath: '/ws/a',
            workspaceName: 'a',
            agents: [],
            teamRuns: [
              {
                teamRunId: 'team-live-1',
                teamDefinitionId: 'team-def-1',
                teamDefinitionName: 'Team Alpha',
                coordinatorAddress: '/solution_designer',
                workspaceRootPath: '/ws/a',
                summary: 'Live team task',
                lastActivityAt: '2026-01-01T00:00:00.000Z',
                lastKnownStatus: 'ACTIVE',
                status: 'running',
                deleteLifecycle: 'READY',
                isActive: true,
                members: [
                  {
                    memberAddress: '/solution_designer',
                    displayName: 'Solution Designer',
                    agentRunId: 'member-run-solution',
                    workspaceRootPath: '/ws/a',
                    status: 'running',
                  },
                  {
                    memberAddress: '/implementation_engineer',
                    displayName: 'Implementation Engineer',
                    agentRunId: 'member-run-implementation',
                    workspaceRootPath: '/ws/a',
                    status: 'offline',
                  },
                  {
                    memberAddress: '/code_reviewer',
                    displayName: 'Code Reviewer',
                    agentRunId: 'member-run-review',
                    workspaceRootPath: '/ws/a',
                    status: 'offline',
                  },
                ],
              },
            ],
          }),
        ],
      },
      errors: [],
    });
    const solution = testAgentNode('/solution_designer', { displayName: 'Solution Designer', agentRunId: 'member-run-solution' });
    const implementation = testAgentNode('/implementation_engineer', { displayName: 'Implementation Engineer', agentRunId: 'member-run-implementation' });
    const review = testAgentNode('/code_reviewer', { displayName: 'Code Reviewer', agentRunId: 'member-run-review' });
    const liveTeam = buildTestTeamContext({
      teamRunId: 'team-live-1',
      teamDefinitionId: 'team-def-1',
      teamDefinitionName: 'Team Alpha',
      rootChildren: [solution, implementation, review],
      coordinatorAddress: solution.address,
      workspaceRootPath: '/ws/a',
      isActive: true,
      configuration: { workspaceId: 'ws-1', isLocked: false },
    });
    const liveMember = (agentRunId: string) => liveTeam.view.getAgentContext(agentRunId)!;
    liveMember(solution.agentRunId).state.currentStatus = 'offline' as any;
    liveMember(implementation.agentRunId).state.currentStatus = 'idle' as any;
    liveMember(review.agentRunId).state.currentStatus = 'running' as any;
    teamContextsStoreMock.teams.set('team-live-1', liveTeam);
    agentTeamRunStoreMock.isTeamStreamReady.mockReturnValue(false);
    agentTeamRunStoreMock.isTeamStreamReopenRequired.mockImplementation(
      (teamRunId: string) => teamRunId === 'team-live-1',
    );

    const store = useRunHistoryStore();
    await store.fetchTree();

    const context = teamContextsStoreMock.teams.get('team-live-1');
    expect(context.view.isRootTeamActive()).toBe(true);
    expect(liveMember(solution.agentRunId).state.currentStatus).toBe('offline');
    expect(liveMember(implementation.agentRunId).state.currentStatus).toBe('idle');
    expect(liveMember(review.agentRunId).state.currentStatus).toBe('running');
    expect(agentTeamRunStoreMock.connectToTeamStream).not.toHaveBeenCalledWith('team-live-1');

    const teamNode = store.getTeamNodes().find((node) => node.teamRunId === 'team-live-1');
    expect(teamNode?.isActive).toBe(true);
    expect(Object.fromEntries(
      (teamNode?.members || []).map((member) => [member.memberAddress, member.currentStatus]),
    )).toEqual({
      '/solution_designer': 'offline',
      '/implementation_engineer': 'idle',
      '/code_reviewer': 'running',
    });
  });

  it('preserves subscribed single-agent live status during active history refresh', async () => {
    queryMock.mockResolvedValue({
      data: {
        listWorkspaceRunHistory: [
          buildWorkspaceHistoryGroup({
            workspaceRootPath: '/ws/a',
            workspaceName: 'a',
            agents: [
              {
                agentDefinitionId: 'agent-def-1',
                agentName: 'SuperAgent',
                runs: [
                  {
                    runId: 'run-live-1',
                    summary: 'Live task',
                    lastActivityAt: '2026-01-01T00:00:00.000Z',
                    lastKnownStatus: 'ACTIVE',
                    status: 'running',
                    isActive: true,
                  },
                ],
              },
            ],
            teamRuns: [],
          }),
        ],
      },
      errors: [],
    });
    agentContextsStoreMock.runs.set('run-live-1', {
      config: { isLocked: false },
      state: {
        runId: 'run-live-1',
        conversation: { id: 'run-live-1', messages: [] },
        currentStatus: 'running',
      },
      isSubscribed: true,
    });
    agentRunStoreMock.isAgentStreamReady.mockImplementation((runId: string) => runId === 'run-live-1');

    const store = useRunHistoryStore();
    await store.fetchTree();

    const context = agentContextsStoreMock.runs.get('run-live-1');
    expect(context.config.isLocked).toBe(true);
    expect(context.state.currentStatus).toBe('running');
    expect(agentRunStoreMock.connectToAgentStream).not.toHaveBeenCalledWith('run-live-1');
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
      if (query === 'GetRunFileChanges') {
        return {
          data: {
            getRunFileChanges: [],
          },
          errors: [],
        };
      }
      if (query === 'GetAgentRunResumeConfig') {
        return {
          data: {
            getAgentRunResumeConfig: {
              runId: 'run-1',
              isActive: true,
              metadataConfig: {
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
              modelConfigEditability: { editable: true, reason: null },
            },
          },
          errors: [],
        };
      }
      if (query === 'GetRunFileChanges') {
        return {
          data: {
            getRunFileChanges: [],
          },
          errors: [],
        };
      }
      if (query === 'GetTeamCommunicationMessages') {
        return { data: { getTeamCommunicationMessages: [] } };
      }
      throw new Error(`Unexpected query: ${String(query)}`);
    });

    workspaceStoreMock.workspacesFetched = true;
    workspaceStoreMock.allWorkspaces = [
      { workspaceId: 'ws-1', absolutePath: '/ws/a', name: 'a' },
    ];

    const store = useRunHistoryStore();
    store.workspaceGroups = [
      buildWorkspaceHistoryGroup({
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
        teamRuns: [],
      }),
    ];

    await store.openRun('run-1');

    expect(agentContextsStoreMock.upsertProjectionContext).toHaveBeenCalledTimes(1);
    expect(selectionStoreMock.selectRun).toHaveBeenCalledWith('run-1', 'agent');
    expect(agentRunConfigStoreMock.clearConfig).toHaveBeenCalled();
    expect(teamRunConfigStoreMock.clearConfig).toHaveBeenCalled();
    expect(agentRunStoreMock.connectToAgentStream).toHaveBeenCalledWith('run-1');
    expect(store.isRuntimeLockedForRun('run-1')).toBe(true);
    expect(agentContextsStoreMock.upsertProjectionContext).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'running',
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
      if (query === 'GetRunFileChanges') {
        return {
          data: {
            getRunFileChanges: [],
          },
          errors: [],
        };
      }
      if (query === 'GetAgentRunResumeConfig') {
        return {
          data: {
            getAgentRunResumeConfig: {
              runId: 'run-2',
              isActive: false,
              metadataConfig: {
                agentDefinitionId: 'agent-def-1',
                workspaceRootPath: '/ws/a',
                llmModelIdentifier: 'model-x',
                llmConfig: { temperature: 0.3 },
                autoExecuteTools: false,
                skillAccessMode: 'PRELOADED_ONLY',
              },
              modelConfigEditability: { editable: true, reason: null },
            },
          },
          errors: [],
        };
      }
      if (query === 'GetRunFileChanges') {
        return {
          data: {
            getRunFileChanges: [],
          },
          errors: [],
        };
      }
      if (query === 'GetTeamCommunicationMessages') {
        return { data: { getTeamCommunicationMessages: [] } };
      }
      throw new Error(`Unexpected query: ${String(query)}`);
    });

    workspaceStoreMock.workspacesFetched = true;
    workspaceStoreMock.allWorkspaces = [
      { workspaceId: 'ws-1', absolutePath: '/ws/a', name: 'a' },
    ];

    const store = useRunHistoryStore();
    store.workspaceGroups = [
      buildWorkspaceHistoryGroup({
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
                status: 'offline',
                lastKnownStatus: 'IDLE',
                isActive: false,
              },
            ],
          },
        ],
        teamRuns: [],
      }),
    ];

    await store.openRun('run-2');

    expect(agentContextsStoreMock.upsertProjectionContext).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-2',
        status: 'offline',
      }),
    );
    expect(store.isRuntimeLockedForRun('run-2')).toBe(true);
    expect(workspaceStoreMock.resolveWorkspaceMetadataByRootPath).toHaveBeenCalledWith('/ws/a');
    expect(workspaceStoreMock.createWorkspace).not.toHaveBeenCalled();
    expect(agentContextsStoreMock.upsertProjectionContext).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          workspaceId: 'ref:/ws/a',
          workspaceMetadata: expect.objectContaining({
            workspaceId: 'ref:/ws/a',
            workspaceRootPath: '/ws/a',
          }),
        }),
      }),
    );
    expect(agentRunStoreMock.connectToAgentStream).not.toHaveBeenCalled();
    expect(selectionStoreMock.selectRun).toHaveBeenCalledWith('run-2', 'agent');
    expect(store.selectedRunId).toBe('run-2');
  });

  it('trusts history active state and reconnects an agent stream when reopening an active run', async () => {
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
      if (query === 'GetRunFileChanges') {
        return {
          data: {
            getRunFileChanges: [],
          },
          errors: [],
        };
      }
      if (query === 'GetAgentRunResumeConfig') {
        return {
          data: {
            getAgentRunResumeConfig: {
              runId: 'run-stale-1',
              isActive: true,
              metadataConfig: {
                agentDefinitionId: 'agent-def-1',
                workspaceRootPath: '/ws/a',
                llmModelIdentifier: 'model-x',
                llmConfig: null,
                autoExecuteTools: false,
                skillAccessMode: 'PRELOADED_ONLY',
                runtimeKind: 'codex_app_server',
                runtimeReference: null,
              },
              modelConfigEditability: { editable: true, reason: null },
            },
          },
          errors: [],
        };
      }
      if (query === 'GetRunFileChanges') {
        return {
          data: {
            getRunFileChanges: [],
          },
          errors: [],
        };
      }
      if (query === 'GetTeamCommunicationMessages') {
        return { data: { getTeamCommunicationMessages: [] } };
      }
      throw new Error(`Unexpected query: ${String(query)}`);
    });

    workspaceStoreMock.workspacesFetched = true;
    workspaceStoreMock.allWorkspaces = [
      { workspaceId: 'ws-1', absolutePath: '/ws/a', name: 'a' },
    ];

    const store = useRunHistoryStore();
    await store.openRun('run-stale-1');

    expect(agentRunStoreMock.connectToAgentStream).toHaveBeenCalledWith('run-stale-1');
    expect(agentContextsStoreMock.upsertProjectionContext).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-stale-1',
        status: 'running',
        config: expect.objectContaining({
          isLocked: true,
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
      if (query === 'GetRunFileChanges') {
        return {
          data: {
            getRunFileChanges: [],
          },
          errors: [],
        };
      }
      if (query === 'GetAgentRunResumeConfig') {
        return {
          data: {
            getAgentRunResumeConfig: {
              runId: 'run-1',
              isActive: true,
              metadataConfig: {
                agentDefinitionId: 'agent-def-1',
                workspaceRootPath: '/ws/a',
                llmModelIdentifier: 'model-x',
                llmConfig: { temperature: 0.3 },
                autoExecuteTools: false,
                skillAccessMode: 'PRELOADED_ONLY',
              },
              modelConfigEditability: { editable: true, reason: null },
            },
          },
          errors: [],
        };
      }
      if (query === 'GetRunFileChanges') {
        return {
          data: {
            getRunFileChanges: [],
          },
          errors: [],
        };
      }
      if (query === 'GetTeamCommunicationMessages') {
        return { data: { getTeamCommunicationMessages: [] } };
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
    agentRunStoreMock.isAgentStreamReady.mockImplementation((runId: string) => runId === 'run-1');
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
    expect(agentRunConfigStoreMock.updateAgentConfig).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: 'ws-1',
      llmModelIdentifier: 'model-default',
      workspaceMetadata: expect.objectContaining({
        workspaceRootPath: '/ws/a',
      }),
    }));
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

  it('prefers the selected same-definition context and deep-clones its llmConfig when creating a draft run', async () => {
    workspaceStoreMock.allWorkspaces = [
      { workspaceId: 'ws-1', absolutePath: '/ws/a', name: 'a' },
    ];
    workspaceStoreMock.workspacesFetched = true;
    selectionStoreMock.selectedType = 'agent';
    selectionStoreMock.selectedRunId = 'run-selected';

    agentContextsStoreMock.runs.set('run-newer', {
      config: {
        agentDefinitionId: 'agent-def-1',
        agentDefinitionName: 'SuperAgent',
        workspaceId: 'ws-1',
        llmModelIdentifier: 'model-newer',
        runtimeKind: 'codex_app_server',
        autoExecuteTools: false,
        skillAccessMode: 'PRELOADED_ONLY',
        isLocked: true,
        llmConfig: { reasoning_effort: 'low' },
      },
      state: {
        conversation: {
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      },
    });
    agentContextsStoreMock.runs.set('run-selected', {
      config: {
        agentDefinitionId: 'agent-def-1',
        agentDefinitionName: 'SuperAgent',
        workspaceId: 'ws-1',
        llmModelIdentifier: 'model-selected',
        runtimeKind: 'codex_app_server',
        autoExecuteTools: true,
        skillAccessMode: 'PRELOADED_ONLY',
        isLocked: true,
        llmConfig: {
          reasoning_effort: 'xhigh',
          nested: { values: ['xhigh'] },
        },
      },
      state: {
        conversation: {
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    });

    const store = useRunHistoryStore();
    await store.createDraftRun({
      workspaceRootPath: '/ws/a',
      agentDefinitionId: 'agent-def-1',
    });

    const seed = agentRunConfigStoreMock.setAgentConfig.mock.calls.at(-1)?.[0];
    expect(seed).toEqual(expect.objectContaining({
      llmModelIdentifier: 'model-selected',
      autoExecuteTools: true,
      skillAccessMode: 'PRELOADED_ONLY',
      isLocked: false,
      llmConfig: {
        reasoning_effort: 'xhigh',
        nested: { values: ['xhigh'] },
      },
    }));

    (seed.llmConfig.nested.values as string[]).push('mutated');
    expect(
      agentContextsStoreMock.runs.get('run-selected')?.config.llmConfig.nested.values,
    ).toEqual(['xhigh']);
  });

  it('clears copied llmConfig when model resolution changes the source model for a draft run', async () => {
    workspaceStoreMock.allWorkspaces = [
      { workspaceId: 'ws-1', absolutePath: '/ws/a', name: 'a' },
    ];
    workspaceStoreMock.workspacesFetched = true;
    selectionStoreMock.selectedType = 'agent';
    selectionStoreMock.selectedRunId = 'run-selected';
    llmProviderConfigStoreMock.models.mockReturnValue(['model-default']);

    agentContextsStoreMock.runs.set('run-selected', {
      config: {
        agentDefinitionId: 'agent-def-1',
        agentDefinitionName: 'SuperAgent',
        workspaceId: 'ws-1',
        llmModelIdentifier: '',
        runtimeKind: 'codex_app_server',
        autoExecuteTools: false,
        skillAccessMode: 'PRELOADED_ONLY',
        isLocked: true,
        llmConfig: { reasoning_effort: 'xhigh' },
      },
      state: {
        conversation: {
          updatedAt: '2026-01-01T00:00:00.000Z',
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
        llmModelIdentifier: 'model-default',
        llmConfig: null,
      }),
    );
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
      buildWorkspaceHistoryGroup({
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
        teamRuns: [],
      }),
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
        currentStatus: 'offline',
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
      workspaceId: 'ws-2',
      workspaceRootPath: '/ws/b',
      workspaceName: 'Beta',
      workspaceKind: 'filesystem',
      canRemoveFromWorkspaces: true,
      agents: [],
    });
  });

  it('pruneWorkspace clears global agent selection when the selected run belongs to the removed workspace', () => {
    const store = useRunHistoryStore();
    store.workspaceGroups = [
      buildWorkspaceHistoryGroup({
        workspaceRootPath: '/ws/a',
        workspaceName: 'Alpha',
        agents: [
          {
            agentDefinitionId: 'agent-def-1',
            agentName: 'SuperAgent',
            runs: [
              {
                runId: 'run-removed',
                summary: 'Removed workspace run',
                lastActivityAt: '2026-01-01T00:00:00.000Z',
                lastKnownStatus: 'IDLE',
                isActive: false,
              },
            ],
          },
        ],
        teamRuns: [],
      }),
      buildWorkspaceHistoryGroup({
        workspaceRootPath: '/ws/b',
        workspaceName: 'Beta',
        agents: [],
        teamRuns: [],
      }),
    ];
    store.selectedRunId = 'run-removed';
    selectionStoreMock.selectedType = 'agent';
    selectionStoreMock.selectedRunId = 'run-removed';

    store.pruneWorkspace('ws-a', '/ws/a');

    expect(selectionStoreMock.clearSelection).toHaveBeenCalledTimes(1);
    expect(store.selectedRunId).toBeNull();
    expect(store.workspaceGroups.map((group) => group.workspaceRootPath)).toEqual(['/ws/b']);
  });

  it('pruneWorkspace clears global team selection when the selected team belongs to the removed workspace', () => {
    const store = useRunHistoryStore();
    store.workspaceGroups = [
      buildWorkspaceHistoryGroup({
        workspaceRootPath: '/ws/a',
        workspaceName: 'Alpha',
        agents: [],
        teamRuns: [
          {
            teamRunId: 'team-removed',
            teamDefinitionId: 'team-def-1',
            teamDefinitionName: 'Team Alpha',
            workspaceRootPath: '/ws/a',
            summary: 'Removed workspace team',
            lastActivityAt: '2026-01-01T00:00:00.000Z',
            lastKnownStatus: 'IDLE',
            deleteLifecycle: 'READY',
            isActive: false,
            members: [],
          },
        ],
      }),
      buildWorkspaceHistoryGroup({
        workspaceRootPath: '/ws/b',
        workspaceName: 'Beta',
        agents: [],
        teamRuns: [],
      }),
    ];
    store.selectedTeamRunId = 'team-removed';
    store.selectedTeamMemberAddress = '/super_agent';
    selectionStoreMock.selectedType = 'team';
    selectionStoreMock.selectedRunId = 'team-removed';

    store.pruneWorkspace('ws-a', '/ws/a');

    expect(selectionStoreMock.clearSelection).toHaveBeenCalledTimes(1);
    expect(store.selectedTeamRunId).toBeNull();
    expect(store.selectedTeamMemberAddress).toBeNull();
    expect(store.workspaceGroups.map((group) => group.workspaceRootPath)).toEqual(['/ws/b']);
  });

  it('overlays persisted run status with matching live context only', () => {
    const store = useRunHistoryStore();
    store.workspaceGroups = [
      buildWorkspaceHistoryGroup({
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
        teamRuns: [],
      }),
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
        currentStatus: 'running',
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

  it('projects offline draft contexts as inactive in tree projection', () => {
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
        currentStatus: 'offline',
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
    expect(draft?.isActive).toBe(false);
    expect(draft?.currentStatus).toBe('offline');
    expect(draft?.lastKnownStatus).toBe('IDLE');
  });

  it('selectTreeRun delegates to openRun for history rows', async () => {
    const store = useRunHistoryStore();
    const openRunSpy = vi.spyOn(store, 'openRun').mockResolvedValue(undefined);

    await store.selectTreeRun(asRunTreeRow({
      runId: 'run-1',
      summary: 'Persisted run',
      lastActivityAt: '2026-01-01T00:00:00.000Z',
      currentStatus: 'offline' as any,
      lastKnownStatus: 'IDLE',
      isActive: false,
      source: 'history',
      isDraft: false,
    }));

    expect(openRunSpy).toHaveBeenCalledWith('run-1');
  });

  it('selectTreeRun selects local temp context for draft rows', async () => {
    const store = useRunHistoryStore();
    agentContextsStoreMock.runs.set('temp-1', {
      config: { workspaceId: 'ws-1' },
      state: { conversation: { messages: [] } },
    });

    await store.selectTreeRun(asRunTreeRow({
      runId: 'temp-1',
      summary: 'New - SuperAgent',
      lastActivityAt: '2026-01-01T00:00:00.000Z',
      currentStatus: 'offline' as any,
      lastKnownStatus: 'IDLE',
      isActive: false,
      source: 'draft',
      isDraft: true,
    }));

    expect(selectionStoreMock.selectRun).toHaveBeenCalledWith('temp-1', 'agent');
    expect(store.selectedRunId).toBe('temp-1');
    expect(agentRunConfigStoreMock.clearConfig).toHaveBeenCalled();
    expect(teamRunConfigStoreMock.clearConfig).toHaveBeenCalled();
  });

  // Current rooted Team history, selection, transient task execution, and lazy hydration
  // are maintained in the focused runHistoryNavigationProjection, runHistoryTeamRows,
  // runHistoryTeamExecutionRows, teamRunOpenCoordinator, and historical integration suites.

  it('deleteRun removes local state and refreshes tree when backend succeeds', async () => {
    mutateMock.mockResolvedValueOnce({
      data: {
        deleteStoredRun: {
          success: true,
          message: 'Run deleted.',
        },
      },
      errors: [],
    });

    const store = useRunHistoryStore();
    store.workspaceGroups = [
      buildWorkspaceHistoryGroup({
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
        teamRuns: [],
      }),
    ];
    store.resumeConfigByRunId = {
      'run-1': {
        runId: 'run-1',
        isActive: false,
        metadataConfig: {
          agentDefinitionId: 'agent-def-1',
          workspaceRootPath: '/ws/a',
          llmModelIdentifier: 'model-x',
          llmConfig: null,
          autoExecuteTools: false,
          skillAccessMode: null,
        },
        modelConfigEditability: { editable: true, reason: null },
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
        deleteStoredRun: {
          success: false,
          message: 'Run is active.',
        },
      },
      errors: [],
    });

    const store = useRunHistoryStore();
    store.workspaceGroups = [
      buildWorkspaceHistoryGroup({
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
        teamRuns: [],
      }),
    ];

    const deleted = await store.deleteRun('run-1');

    expect(deleted).toBe(false);
    expect(store.workspaceGroups[0]?.agentDefinitions[0]?.runs[0]?.runId).toBe('run-1');
    expect(agentContextsStoreMock.removeRun).not.toHaveBeenCalled();
  });

  it('deleteRun rejects draft run IDs without backend mutation call', async () => {
    const store = useRunHistoryStore();
    const deleted = await store.deleteRun('temp-123');

    expect(deleted).toBe(false);
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it('archiveRun removes local state and refreshes tree when backend succeeds', async () => {
    mutateMock.mockResolvedValueOnce({
      data: {
        archiveStoredRun: {
          success: true,
          message: 'Run archived.',
        },
      },
      errors: [],
    });

    const store = useRunHistoryStore();
    store.workspaceGroups = [
      buildWorkspaceHistoryGroup({
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
        teamRuns: [],
      }),
    ];
    store.resumeConfigByRunId = {
      'run-1': {
        runId: 'run-1',
        isActive: false,
        metadataConfig: {
          agentDefinitionId: 'agent-def-1',
          workspaceRootPath: '/ws/a',
          llmModelIdentifier: 'model-x',
          llmConfig: null,
          autoExecuteTools: false,
          skillAccessMode: null,
        },
        modelConfigEditability: { editable: true, reason: null },
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
    const archived = await store.archiveRun('run-1');

    expect(archived).toBe(true);
    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      variables: { runId: 'run-1' },
    }));
    expect(agentContextsStoreMock.removeRun).toHaveBeenCalledWith('run-1');
    expect(selectionStoreMock.clearSelection).toHaveBeenCalledTimes(1);
    expect(store.selectedRunId).toBeNull();
    expect(store.resumeConfigByRunId['run-1']).toBeUndefined();
    expect(store.workspaceGroups).toEqual([]);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('archiveRun does not mutate local state when backend rejects archive', async () => {
    mutateMock.mockResolvedValueOnce({
      data: {
        archiveStoredRun: {
          success: false,
          message: 'Run is active.',
        },
      },
      errors: [],
    });

    const store = useRunHistoryStore();
    store.workspaceGroups = [
      buildWorkspaceHistoryGroup({
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
        teamRuns: [],
      }),
    ];

    const archived = await store.archiveRun('run-1');

    expect(archived).toBe(false);
    expect(store.workspaceGroups[0]?.agentDefinitions[0]?.runs[0]?.runId).toBe('run-1');
    expect(agentContextsStoreMock.removeRun).not.toHaveBeenCalled();
  });

  it('archiveRun rejects draft run IDs without backend mutation call', async () => {
    const store = useRunHistoryStore();
    const archived = await store.archiveRun('temp-123');

    expect(archived).toBe(false);
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it('archiveTeamRun removes local team state and refreshes tree when backend succeeds', async () => {
    mutateMock.mockResolvedValueOnce({
      data: {
        archiveStoredTeamRun: {
          success: true,
          message: 'Team archived.',
        },
      },
      errors: [],
    });

    const store = useRunHistoryStore();
    store.workspaceGroups = [
      buildWorkspaceHistoryGroup({
        workspaceRootPath: '/ws/a',
        workspaceName: 'a',
        agents: [],
        teamRuns: [
          {
            teamRunId: 'team-1',
            teamDefinitionId: 'team-def-1',
            teamDefinitionName: 'Team Alpha',
            workspaceRootPath: '/ws/a',
            summary: 'Team task',
            lastActivityAt: '2026-01-01T00:00:00.000Z',
            lastKnownStatus: 'IDLE',
            deleteLifecycle: 'READY',
            isActive: false,
            members: [],
          },
        ],
      }),
    ];
    store.teamResumeConfigByTeamRunId = {
      'team-1': {
        teamRunId: 'team-1',
        isActive: false,
        metadata: buildTeamResumeMetadata({ teamRunId: 'team-1' }),
      },
    };
    store.selectedTeamRunId = 'team-1';
    store.selectedTeamMemberAddress = '/super_agent';
    selectionStoreMock.selectedType = 'team';
    selectionStoreMock.selectedRunId = 'team-1';
    teamContextsStoreMock.teams.set('team-1', { teamRunId: 'team-1' });

    const refreshSpy = vi.spyOn(store, 'refreshTreeQuietly').mockResolvedValue(undefined);
    const archived = await store.archiveTeamRun('team-1');

    expect(archived).toBe(true);
    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      variables: { teamRunId: 'team-1' },
    }));
    expect(teamContextsStoreMock.removeTeamContext).toHaveBeenCalledWith('team-1');
    expect(selectionStoreMock.clearSelection).toHaveBeenCalledTimes(1);
    expect(store.selectedTeamRunId).toBeNull();
    expect(store.selectedTeamMemberAddress).toBeNull();
    expect(store.teamResumeConfigByTeamRunId['team-1']).toBeUndefined();
    expect(store.workspaceGroups).toEqual([]);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('archiveTeamRun leaves local state unchanged when backend rejects archive', async () => {
    mutateMock.mockResolvedValueOnce({
      data: {
        archiveStoredTeamRun: {
          success: false,
          message: 'Team is active.',
        },
      },
      errors: [],
    });

    const store = useRunHistoryStore();
    store.workspaceGroups = [
      buildWorkspaceHistoryGroup({
        workspaceRootPath: '/ws/a',
        workspaceName: 'a',
        agents: [],
        teamRuns: [
          {
            teamRunId: 'team-1',
            teamDefinitionId: 'team-def-1',
            teamDefinitionName: 'Team Alpha',
            workspaceRootPath: '/ws/a',
            summary: 'Team task',
            lastActivityAt: '2026-01-01T00:00:00.000Z',
            lastKnownStatus: 'IDLE',
            deleteLifecycle: 'READY',
            isActive: false,
            members: [],
          },
        ],
      }),
    ];

    const archived = await store.archiveTeamRun('team-1');

    expect(archived).toBe(false);
    expect(flattenWorkspaceGroupTeamRuns(store.workspaceGroups[0])[0]?.teamRunId).toBe('team-1');
    expect(teamContextsStoreMock.removeTeamContext).not.toHaveBeenCalled();
  });

});
