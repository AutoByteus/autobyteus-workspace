import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useActiveRuntimeSyncStore } from '../activeRuntimeSyncStore';

const {
  queryMock,
  windowNodeContextStoreMock,
  runHistoryStoreMock,
  agentContextsStoreMock,
  agentRunStoreMock,
  teamContextsStoreMock,
  agentTeamRunStoreMock,
  openRunWithCoordinatorMock,
  openTeamRunWithCoordinatorMock,
} = vi.hoisted(() => {
  const runs = new Map<string, any>();
  const teams = new Map<string, any>();

  return {
    queryMock: vi.fn(),
    windowNodeContextStoreMock: {
      waitForBoundBackendReady: vi.fn().mockResolvedValue(true),
      lastReadyError: null as string | null,
    },
    runHistoryStoreMock: {
      reconcileActiveRunIds: vi.fn(),
      reconcileActiveTeamRunIds: vi.fn(),
      ensureWorkspaceByRootPath: vi.fn().mockResolvedValue('ws-1'),
      findAgentNameByRunId: vi.fn().mockReturnValue('Professor'),
    },
    agentContextsStoreMock: {
      runs,
      getRun: vi.fn((runId: string) => runs.get(runId)),
    },
    agentRunStoreMock: {
      connectToAgentStream: vi.fn(),
      disconnectAgentStream: vi.fn(),
    },
    teamContextsStoreMock: {
      teams,
      get allTeamRuns() {
        return Array.from(teams.values());
      },
      getTeamContextById: vi.fn((teamRunId: string) => teams.get(teamRunId)),
    },
    agentTeamRunStoreMock: {
      connectToTeamStream: vi.fn(),
      disconnectTeamStream: vi.fn(),
    },
    openRunWithCoordinatorMock: vi.fn().mockResolvedValue(undefined),
    openTeamRunWithCoordinatorMock: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({
    query: queryMock,
  }),
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}));

vi.mock('~/stores/runHistoryStore', () => ({
  useRunHistoryStore: () => runHistoryStoreMock,
}));

vi.mock('~/stores/agentContextsStore', () => ({
  useAgentContextsStore: () => agentContextsStoreMock,
}));

vi.mock('~/stores/agentRunStore', () => ({
  useAgentRunStore: () => agentRunStoreMock,
}));

vi.mock('~/stores/agentTeamContextsStore', () => ({
  useAgentTeamContextsStore: () => teamContextsStoreMock,
}));

vi.mock('~/stores/agentTeamRunStore', () => ({
  useAgentTeamRunStore: () => agentTeamRunStoreMock,
}));

vi.mock('~/services/runOpen/runOpenCoordinator', () => ({
  openRunWithCoordinator: openRunWithCoordinatorMock,
}));

vi.mock('~/services/runOpen/teamRunOpenCoordinator', () => ({
  openTeamRunWithCoordinator: openTeamRunWithCoordinatorMock,
}));

vi.mock('~/graphql/queries/activeRuntimeQueries', () => ({
  GetActiveRuntimeSnapshot: 'GetActiveRuntimeSnapshot',
}));

describe('activeRuntimeSyncStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    windowNodeContextStoreMock.waitForBoundBackendReady.mockResolvedValue(true);
    windowNodeContextStoreMock.lastReadyError = null;

    agentContextsStoreMock.runs.clear();
    teamContextsStoreMock.teams.clear();

    runHistoryStoreMock.ensureWorkspaceByRootPath.mockResolvedValue('ws-1');
    runHistoryStoreMock.findAgentNameByRunId.mockReturnValue('Professor');
    openRunWithCoordinatorMock.mockResolvedValue(undefined);
    openTeamRunWithCoordinatorMock.mockResolvedValue(undefined);
  });

  it('reconnects existing active agent and team contexts without using history recovery', async () => {
    agentContextsStoreMock.runs.set('run-live-1', {
      config: { isLocked: false },
      state: {
        currentStatus: 'shutdown_complete',
      },
      isSubscribed: false,
    });

    teamContextsStoreMock.teams.set('team-live-1', {
      teamRunId: 'team-live-1',
      config: { isLocked: false },
      currentStatus: 'shutdown_complete',
      isSubscribed: false,
      members: new Map([
        [
          'professor',
          {
            config: { isLocked: false },
            state: { currentStatus: 'shutdown_complete' },
          },
        ],
      ]),
    });

    queryMock.mockResolvedValue({
      data: {
        agentRuns: [{ id: 'run-live-1', currentStatus: 'ACTIVE' }],
        agentTeamRuns: [{ id: 'team-live-1', currentStatus: 'ACTIVE' }],
      },
      errors: [],
    });

    const store = useActiveRuntimeSyncStore();
    await store.refresh();

    expect(runHistoryStoreMock.reconcileActiveRunIds).toHaveBeenCalledWith(new Set(['run-live-1']));
    expect(runHistoryStoreMock.reconcileActiveTeamRunIds).toHaveBeenCalledWith(new Set(['team-live-1']));
    expect(agentRunStoreMock.connectToAgentStream).toHaveBeenCalledWith('run-live-1');
    expect(agentTeamRunStoreMock.connectToTeamStream).toHaveBeenCalledWith('team-live-1');
    expect(agentContextsStoreMock.runs.get('run-live-1')?.config.isLocked).toBe(true);
    expect(agentContextsStoreMock.runs.get('run-live-1')?.state.currentStatus).toBe('uninitialized');
    const teamContext = teamContextsStoreMock.teams.get('team-live-1');
    expect(teamContext?.config.isLocked).toBe(true);
    expect(teamContext?.currentStatus).toBe('uninitialized');
    expect(teamContext?.members.get('professor')?.config.isLocked).toBe(true);
    expect(teamContext?.members.get('professor')?.state.currentStatus).toBe('uninitialized');
    expect(openRunWithCoordinatorMock).not.toHaveBeenCalled();
    expect(openTeamRunWithCoordinatorMock).not.toHaveBeenCalled();
  });

  it('hydrates missing active runs and teams from the backend active snapshot', async () => {
    queryMock.mockResolvedValue({
      data: {
        agentRuns: [{ id: 'run-missing-1', currentStatus: 'ACTIVE' }],
        agentTeamRuns: [{ id: 'team-missing-1', currentStatus: 'ACTIVE' }],
      },
      errors: [],
    });

    const store = useActiveRuntimeSyncStore();
    await store.refresh();

    expect(openRunWithCoordinatorMock).toHaveBeenCalledWith({
      runId: 'run-missing-1',
      fallbackAgentName: 'Professor',
      ensureWorkspaceByRootPath: expect.any(Function),
      selectRun: false,
    });
    expect(openTeamRunWithCoordinatorMock).toHaveBeenCalledWith({
      teamRunId: 'team-missing-1',
      memberRouteKey: null,
      ensureWorkspaceByRootPath: expect.any(Function),
      selectRun: false,
    });
  });

  it('disconnects contexts that are no longer active on the backend', async () => {
    agentContextsStoreMock.runs.set('run-stale-1', {
      config: { isLocked: true },
      state: {
        currentStatus: 'processing_user_input',
      },
      isSubscribed: true,
    });

    teamContextsStoreMock.teams.set('team-stale-1', {
      teamRunId: 'team-stale-1',
      config: { isLocked: true },
      currentStatus: 'processing',
      isSubscribed: true,
      members: new Map([
        [
          'student',
          {
            config: { isLocked: true },
            state: { currentStatus: 'processing_user_input' },
          },
        ],
      ]),
    });

    queryMock.mockResolvedValue({
      data: {
        agentRuns: [],
        agentTeamRuns: [],
      },
      errors: [],
    });

    const store = useActiveRuntimeSyncStore();
    await store.refresh();

    expect(agentRunStoreMock.disconnectAgentStream).toHaveBeenCalledWith('run-stale-1');
    expect(agentTeamRunStoreMock.disconnectTeamStream).toHaveBeenCalledWith('team-stale-1');
    expect(agentContextsStoreMock.runs.get('run-stale-1')?.state.currentStatus).toBe('shutdown_complete');
    const teamContext = teamContextsStoreMock.teams.get('team-stale-1');
    expect(teamContext?.currentStatus).toBe('shutdown_complete');
    expect(teamContext?.members.get('student')?.state.currentStatus).toBe('shutdown_complete');
  });
});
