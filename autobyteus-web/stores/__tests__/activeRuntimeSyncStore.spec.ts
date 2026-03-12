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
  hydrateLiveRunContextMock,
  hydrateLiveTeamRunContextMock,
} = vi.hoisted(() => {
  const runs = new Map<string, any>();
  const teams = new Map<string, any>();
  const normalizeAgentStatus = (status?: string | null) => {
    switch (String(status || '').toLowerCase()) {
      case 'active':
      case 'processing':
      case 'running':
        return 'processing_user_input';
      case 'idle':
        return 'idle';
      case 'error':
        return 'error';
      default:
        return 'uninitialized';
    }
  };
  const normalizeTeamStatus = (status?: string | null) => {
    switch (String(status || '').toLowerCase()) {
      case 'active':
      case 'processing':
      case 'running':
        return 'processing';
      case 'idle':
        return 'idle';
      case 'error':
        return 'error';
      default:
        return 'uninitialized';
    }
  };

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
    hydrateLiveRunContextMock: vi.fn().mockImplementation(async (input: any) => {
      runs.set(input.runId, {
        config: { isLocked: true },
        state: {
          currentStatus: normalizeAgentStatus(input.currentStatus),
          runId: input.runId,
        },
        isSubscribed: false,
      });
    }),
    hydrateLiveTeamRunContextMock: vi.fn().mockImplementation(async (input: any) => {
      teams.set(input.teamRunId, {
        teamRunId: input.teamRunId,
        config: { isLocked: true },
        currentStatus: normalizeTeamStatus(input.currentStatus),
        isSubscribed: false,
        members: new Map(
          (input.memberStatuses || []).map((member: any) => [
            member.memberRouteKey || member.memberName,
            {
              config: { isLocked: true },
              state: {
                runId: member.memberRunId || member.memberRouteKey || member.memberName,
                currentStatus: normalizeAgentStatus(member.currentStatus),
              },
            },
          ]),
        ),
      });
    }),
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

vi.mock('~/services/runHydration/runContextHydrationService', () => ({
  hydrateLiveRunContext: hydrateLiveRunContextMock,
}));

vi.mock('~/services/runHydration/teamRunContextHydrationService', () => ({
  hydrateLiveTeamRunContext: hydrateLiveTeamRunContextMock,
  applyLiveTeamStatusSnapshot: (context: any, snapshot: any) => {
    const normalizeStatus = (status?: string | null) => {
      switch (String(status || '').toLowerCase()) {
        case 'active':
        case 'processing':
        case 'running':
        case 'processing_user_input':
          return 'processing_user_input';
        case 'idle':
          return 'idle';
        case 'error':
          return 'error';
        default:
          return 'uninitialized';
      }
    };
    context.currentStatus = String(snapshot?.currentStatus || '').toLowerCase() === 'active'
      ? 'processing'
      : String(snapshot?.currentStatus || '').toLowerCase() === 'idle'
        ? 'idle'
        : String(snapshot?.currentStatus || '').toLowerCase() === 'error'
          ? 'error'
          : 'uninitialized';
    const byRouteKey = new Map(
      (snapshot?.memberStatuses || []).map((member: any) => [member.memberRouteKey || member.memberName, member]),
    );
    const byRunId = new Map(
      (snapshot?.memberStatuses || []).map((member: any) => [member.memberRunId, member]),
    );
    context.members.forEach((memberContext: any, memberRouteKey: string) => {
      const matched = byRouteKey.get(memberRouteKey) || byRunId.get(memberContext.state?.runId);
      if (matched) {
        memberContext.state.currentStatus = normalizeStatus(matched.currentStatus);
      }
    });
  },
}));

vi.mock('~/graphql/queries/activeRuntimeQueries', () => ({
  GetActiveRuntimeSnapshot: 'GetActiveRuntimeSnapshot',
  GetActiveAgentRunSnapshot: 'GetActiveAgentRunSnapshot',
  GetActiveAgentTeamRunSnapshot: 'GetActiveAgentTeamRunSnapshot',
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
    hydrateLiveRunContextMock.mockClear();
    hydrateLiveTeamRunContextMock.mockClear();
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
        agentRuns: [{ id: 'run-live-1', name: 'Professor', currentStatus: 'ACTIVE' }],
        agentTeamRuns: [
          {
            id: 'team-live-1',
            name: 'Professor Student Team',
            currentStatus: 'ACTIVE',
            members: [
              {
                memberRouteKey: 'professor',
                memberName: 'Professor',
                memberRunId: 'professor-live-1',
                currentStatus: 'IDLE',
              },
            ],
          },
        ],
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
    expect(agentContextsStoreMock.runs.get('run-live-1')?.state.currentStatus).toBe('processing_user_input');
    const teamContext = teamContextsStoreMock.teams.get('team-live-1');
    expect(teamContext?.config.isLocked).toBe(true);
    expect(teamContext?.currentStatus).toBe('processing');
    expect(teamContext?.members.get('professor')?.config.isLocked).toBe(true);
    expect(teamContext?.members.get('professor')?.state.currentStatus).toBe('idle');
    expect(hydrateLiveRunContextMock).not.toHaveBeenCalled();
    expect(hydrateLiveTeamRunContextMock).not.toHaveBeenCalled();
  });

  it('hydrates missing active runs and teams from the backend active snapshot', async () => {
    queryMock.mockResolvedValue({
      data: {
        agentRuns: [{ id: 'run-missing-1', name: 'Professor', currentStatus: 'ACTIVE' }],
        agentTeamRuns: [
          {
            id: 'team-missing-1',
            name: 'Professor Student Team',
            currentStatus: 'ACTIVE',
            members: [
              {
                memberRouteKey: 'professor',
                memberName: 'Professor',
                memberRunId: 'professor-team-missing-1',
                currentStatus: 'IDLE',
              },
              {
                memberRouteKey: 'student',
                memberName: 'Student',
                memberRunId: 'student-team-missing-1',
                currentStatus: 'PROCESSING_USER_INPUT',
              },
            ],
          },
        ],
      },
      errors: [],
    });

    const store = useActiveRuntimeSyncStore();
    await store.refresh();

    expect(hydrateLiveRunContextMock).toHaveBeenCalledWith({
      runId: 'run-missing-1',
      fallbackAgentName: 'Professor',
      ensureWorkspaceByRootPath: expect.any(Function),
      currentStatus: 'ACTIVE',
    });
    expect(hydrateLiveTeamRunContextMock).toHaveBeenCalledWith({
      teamRunId: 'team-missing-1',
      memberRouteKey: null,
      ensureWorkspaceByRootPath: expect.any(Function),
      currentStatus: 'ACTIVE',
      memberStatuses: [
        {
          memberRouteKey: 'professor',
          memberName: 'Professor',
          memberRunId: 'professor-team-missing-1',
          currentStatus: 'IDLE',
        },
        {
          memberRouteKey: 'student',
          memberName: 'Student',
          memberRunId: 'student-team-missing-1',
          currentStatus: 'PROCESSING_USER_INPUT',
        },
      ],
    });
    expect(agentContextsStoreMock.runs.get('run-missing-1')?.state.currentStatus).toBe('processing_user_input');
    expect(teamContextsStoreMock.teams.get('team-missing-1')?.currentStatus).toBe('processing');
    expect(store.getActiveRunSnapshot('run-missing-1')?.currentStatus).toBe('ACTIVE');
    expect(store.getActiveTeamRunSnapshot('team-missing-1')?.members?.[1]?.memberRouteKey).toBe('student');
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

  it('ensureActiveRunSnapshot uses the targeted active-run query when the cache is empty', async () => {
    queryMock.mockResolvedValue({
      data: {
        activeAgentRunSnapshot: { id: 'run-live-2', name: 'Professor', currentStatus: 'ACTIVE' },
      },
      errors: [],
    });

    const store = useActiveRuntimeSyncStore();
    const snapshot = await store.ensureActiveRunSnapshot('run-live-2');

    expect(snapshot).toEqual({
      id: 'run-live-2',
      name: 'Professor',
      currentStatus: 'ACTIVE',
    });
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock).toHaveBeenCalledWith({
      query: 'GetActiveAgentRunSnapshot',
      variables: { id: 'run-live-2' },
      fetchPolicy: 'network-only',
    });
  });

  it('ensureActiveRunSnapshot waits for the bound backend before querying', async () => {
    windowNodeContextStoreMock.waitForBoundBackendReady.mockResolvedValue(false);
    windowNodeContextStoreMock.lastReadyError = 'backend restarting';

    const store = useActiveRuntimeSyncStore();

    await expect(store.ensureActiveRunSnapshot('run-live-2')).rejects.toThrow('backend restarting');
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('ensureActiveTeamRunSnapshot uses the targeted active-team query when the cache is empty', async () => {
    queryMock.mockResolvedValue({
      data: {
        activeAgentTeamRunSnapshot: {
          id: 'team-live-2',
          name: 'Professor Student Team',
          currentStatus: 'ACTIVE',
          members: [
            {
              memberRouteKey: 'professor',
              memberName: 'Professor',
              memberRunId: 'professor-team-live-2',
              currentStatus: 'IDLE',
            },
          ],
        },
      },
      errors: [],
    });

    const store = useActiveRuntimeSyncStore();
    const snapshot = await store.ensureActiveTeamRunSnapshot('team-live-2');

    expect(snapshot).toEqual({
      id: 'team-live-2',
      name: 'Professor Student Team',
      currentStatus: 'ACTIVE',
      members: [
        {
          memberRouteKey: 'professor',
          memberName: 'Professor',
          memberRunId: 'professor-team-live-2',
          currentStatus: 'IDLE',
        },
      ],
    });
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock).toHaveBeenCalledWith({
      query: 'GetActiveAgentTeamRunSnapshot',
      variables: { id: 'team-live-2' },
      fetchPolicy: 'network-only',
    });
  });

  it('ensureActiveTeamRunSnapshot waits for the bound backend before querying', async () => {
    windowNodeContextStoreMock.waitForBoundBackendReady.mockResolvedValue(false);
    windowNodeContextStoreMock.lastReadyError = 'backend restarting';

    const store = useActiveRuntimeSyncStore();

    await expect(store.ensureActiveTeamRunSnapshot('team-live-2')).rejects.toThrow(
      'backend restarting',
    );
    expect(queryMock).not.toHaveBeenCalled();
  });
});
