import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { openTeamRun } from '../teamRunOpenCoordinator';
import { ensureHistoricalTeamMemberHydrated } from '~/services/runHydration/teamRunContextHydrationService';
import { teamMemberNodesFromMetadata } from '~/utils/teamMemberMetadataNodes';
import { indexTeamMemberNodesByRouteKey } from '~/utils/teamDefinitionMembers';

const {
  queryMock,
  fetchTeamCommunicationMock,
  fetchTaskDelegationsMock,
  hydrateActivitiesFromProjectionMock,
  primeRecentEventMonitorBaselineMock,
  resetRecentEventMonitorBaselineMock,
  teamContextsById,
  addTeamContextMock,
  connectToTeamStreamMock,
  selectRunMock,
  clearTeamRunConfigMock,
  clearAgentRunConfigMock,
  reconstructTeamRunConfigFromMetadataMock,
} = vi.hoisted(() => ({
  queryMock: vi.fn(),
  fetchTeamCommunicationMock: vi.fn(),
  fetchTaskDelegationsMock: vi.fn(),
  hydrateActivitiesFromProjectionMock: vi.fn(),
  primeRecentEventMonitorBaselineMock: vi.fn(),
  resetRecentEventMonitorBaselineMock: vi.fn(),
  teamContextsById: new Map<string, any>(),
  addTeamContextMock: vi.fn(),
  connectToTeamStreamMock: vi.fn(),
  selectRunMock: vi.fn(),
  clearTeamRunConfigMock: vi.fn(),
  clearAgentRunConfigMock: vi.fn(),
  reconstructTeamRunConfigFromMetadataMock: vi.fn(),
}));

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({ query: queryMock }),
}));

vi.mock('~/services/runHydration/teamCommunicationHydrationService', () => ({
  fetchAndHydrateTeamCommunicationForTeam: fetchTeamCommunicationMock,
}));

vi.mock('~/services/runHydration/taskDelegationHydrationService', () => ({
  fetchAndHydrateTaskDelegationRecordsForTeam: fetchTaskDelegationsMock,
}));

vi.mock('~/services/runHydration/runProjectionActivityHydration', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/services/runHydration/runProjectionActivityHydration')>();
  return {
    ...actual,
    hydrateActivitiesFromProjection: (runId: string, activities: any[]) => {
      hydrateActivitiesFromProjectionMock(runId, activities);
      actual.hydrateActivitiesFromProjection(runId, activities);
    },
  };
});

vi.mock('~/services/eventMonitor/recentEventMonitorMutationCoordinator', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/services/eventMonitor/recentEventMonitorMutationCoordinator')>();
  return {
    ...actual,
    primeRecentEventMonitorBaseline: (context: any) => {
      primeRecentEventMonitorBaselineMock(context);
      actual.primeRecentEventMonitorBaseline(context);
    },
    resetRecentEventMonitorBaseline: (context: any) => {
      resetRecentEventMonitorBaselineMock(context);
      actual.resetRecentEventMonitorBaseline(context);
    },
  };
});

vi.mock('~/stores/agentTeamContextsStore', () => ({
  useAgentTeamContextsStore: () => ({
    getTeamContextById: (teamRunId: string) => teamContextsById.get(teamRunId) ?? null,
    addTeamContext: addTeamContextMock,
  }),
}));

vi.mock('~/stores/agentTeamRunStore', () => ({
  useAgentTeamRunStore: () => ({
    connectToTeamStream: connectToTeamStreamMock,
  }),
}));

vi.mock('~/stores/agentSelectionStore', () => ({
  useAgentSelectionStore: () => ({
    selectRun: selectRunMock,
    selectRunWithoutShellNavigation: selectRunMock,
  }),
}));

vi.mock('~/stores/agentRunConfigStore', () => ({
  useAgentRunConfigStore: () => ({
    clearConfig: clearAgentRunConfigMock,
  }),
}));

vi.mock('~/stores/teamRunConfigStore', () => ({
  useTeamRunConfigStore: () => ({
    clearConfig: clearTeamRunConfigMock,
  }),
}));

vi.mock('~/utils/teamRunConfigUtils', () => ({
  reconstructTeamRunConfigFromMetadata: reconstructTeamRunConfigFromMetadataMock,
}));

const createMemberMetadata = (suffix: string) => ({
  memberKind: 'agent',
  memberRouteKey: `member-${suffix}`,
  memberPath: [`member-${suffix}`],
  memberName: `Member ${suffix.toUpperCase()}`,
  memberRunId: `run-${suffix}`,
  runtimeKind: 'autobyteus',
  platformAgentRunId: `run-${suffix}`,
  agentDefinitionId: `agent-${suffix}`,
  llmModelIdentifier: 'gpt-test',
  autoExecuteTools: true,
  skillAccessMode: 'PRELOADED_ONLY',
  llmConfig: null,
  workspaceRootPath: null,
});

const createMetadata = (memberSuffixes = ['a']) => ({
  teamRunId: 'team-prime-ownership',
  teamDefinitionId: 'team-def-1',
  teamDefinitionName: 'Prime Ownership Team',
  coordinatorMemberRouteKey: 'member-a',
  createdAt: '2026-08-09T10:00:00.000Z',
  memberTree: memberSuffixes.map(createMemberMetadata),
});

const projectedActivity = {
  kind: 'compaction',
  activityId: 'compaction:boundary:boundary-a',
  phase: 'completed',
  message: 'Provider context compaction boundary recorded',
  turnId: 'turn-a',
  provider: 'codex',
  boundaryKey: 'boundary-a',
  ts: 30,
};

const createProjection = () => ({
  conversation: [],
  activities: [projectedActivity],
  lastActivityAt: '2026-08-09T10:01:00.000Z',
});

const createMemberContext = (suffix = 'a'): AgentContext => {
  const runId = `run-${suffix}`;
  const context = new AgentContext(
    {
      agentDefinitionId: `agent-${suffix}`,
      agentDefinitionName: `Member ${suffix.toUpperCase()}`,
      llmModelIdentifier: 'gpt-test',
      runtimeKind: 'autobyteus',
      workspaceId: null,
      workspaceMetadata: null,
      autoExecuteTools: true,
      skillAccessMode: 'PRELOADED_ONLY',
      llmConfig: null,
      isLocked: true,
    },
    new AgentRunState(runId, {
      id: `live-${suffix}`,
      messages: [],
      createdAt: '2026-08-09T10:00:00.000Z',
      updatedAt: '2026-08-09T10:00:00.000Z',
    }),
  );
  context.state.currentStatus = AgentStatus.Running;
  return context;
};

const createExistingTeamContext = (isSubscribed: boolean) => {
  const metadata = createMetadata();
  const memberTree = teamMemberNodesFromMetadata(metadata.memberTree as any);
  const memberContext = createMemberContext();
  return {
    teamContext: {
      teamRunId: metadata.teamRunId,
      config: {},
      memberTree,
      memberNodesByRouteKey: indexTeamMemberNodesByRouteKey(memberTree),
      leafAgentContextsByRouteKey: new Map([['member-a', memberContext]]),
      coordinatorMemberRouteKey: 'member-a',
      historicalHydration: null,
      focusedMemberRouteKey: 'member-a',
      isActive: true,
      isSubscribed,
    } as any,
    memberContext,
  };
};

describe('openTeamRun real loader/builder Event Monitor prime ownership', () => {
  let isActive: boolean;
  let metadata: ReturnType<typeof createMetadata>;
  let projectionByMemberRouteKey: Map<string, ReturnType<typeof createProjection> | null>;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    teamContextsById.clear();
    isActive = true;
    metadata = createMetadata();
    projectionByMemberRouteKey = new Map();
    addTeamContextMock.mockImplementation((context: any) => {
      teamContextsById.set(context.teamRunId, context);
    });
    reconstructTeamRunConfigFromMetadataMock.mockImplementation(({ metadata: inputMetadata, isLocked }) => ({
      teamDefinitionId: inputMetadata.teamDefinitionId,
      teamDefinitionName: inputMetadata.teamDefinitionName,
      isLocked,
    }));
    queryMock.mockImplementation(async ({ variables }: { variables: Record<string, unknown> }) => {
      const memberRouteKey = typeof variables.memberRouteKey === 'string'
        ? variables.memberRouteKey
        : null;
      if (memberRouteKey) {
        return {
          data: {
            getTeamMemberRunProjection: projectionByMemberRouteKey.get(memberRouteKey) ?? null,
          },
          errors: [],
        };
      }
      return {
        data: {
          getTeamRunResumeConfig: {
            teamRunId: metadata.teamRunId,
            isActive,
            metadata,
          },
        },
        errors: [],
      };
    });
  });

  const openRealTeam = async (memberRouteKey?: string) => openTeamRun({
    teamRunId: 'team-prime-ownership',
    memberRouteKey,
    resolveWorkspaceMetadataByRootPath: vi.fn().mockResolvedValue(null),
    ensureWorkspaceByRootPath: vi.fn().mockResolvedValue(null),
  });

  it.each([
    { name: 'historical projection-present open', active: false, projection: createProjection(), activityCalls: 1 },
    { name: 'active projection-present open', active: true, projection: createProjection(), activityCalls: 1 },
    { name: 'active projection-absent open', active: true, projection: null, activityCalls: 0 },
  ])('primes the final member exactly once for $name', async ({
    active,
    projection,
    activityCalls,
  }) => {
    isActive = active;
    projectionByMemberRouteKey.set('member-a', projection);

    await openRealTeam();

    const finalMember = teamContextsById.get(metadata.teamRunId)
      ?.leafAgentContextsByRouteKey.get('member-a');
    expect(finalMember).toBeDefined();
    expect(hydrateActivitiesFromProjectionMock).toHaveBeenCalledTimes(activityCalls);
    if (activityCalls > 0) {
      expect(hydrateActivitiesFromProjectionMock.mock.invocationCallOrder[0])
        .toBeLessThan(primeRecentEventMonitorBaselineMock.mock.invocationCallOrder[0]!);
    }
    expect(primeRecentEventMonitorBaselineMock).toHaveBeenCalledTimes(1);
    expect(primeRecentEventMonitorBaselineMock).toHaveBeenCalledWith(finalMember);
  });

  it('primes an existing replacement once after reset and projected activity hydration', async () => {
    projectionByMemberRouteKey.set('member-a', createProjection());
    const { teamContext, memberContext } = createExistingTeamContext(false);
    teamContextsById.set(metadata.teamRunId, teamContext);

    await openRealTeam();

    expect(teamContext.leafAgentContextsByRouteKey.get('member-a')).toBe(memberContext);
    expect(resetRecentEventMonitorBaselineMock).toHaveBeenCalledTimes(1);
    expect(hydrateActivitiesFromProjectionMock).toHaveBeenCalledTimes(1);
    expect(primeRecentEventMonitorBaselineMock).toHaveBeenCalledTimes(1);
    expect(primeRecentEventMonitorBaselineMock).toHaveBeenCalledWith(memberContext);
    expect(resetRecentEventMonitorBaselineMock.mock.invocationCallOrder[0])
      .toBeLessThan(hydrateActivitiesFromProjectionMock.mock.invocationCallOrder[0]!);
    expect(hydrateActivitiesFromProjectionMock.mock.invocationCallOrder[0])
      .toBeLessThan(primeRecentEventMonitorBaselineMock.mock.invocationCallOrder[0]!);
  });

  it('primes a preserved subscribed member once without reset or projected activity replacement', async () => {
    projectionByMemberRouteKey.set('member-a', createProjection());
    const { teamContext, memberContext } = createExistingTeamContext(true);
    teamContextsById.set(metadata.teamRunId, teamContext);

    await openRealTeam();

    expect(teamContext.leafAgentContextsByRouteKey.get('member-a')).toBe(memberContext);
    expect(resetRecentEventMonitorBaselineMock).not.toHaveBeenCalled();
    expect(hydrateActivitiesFromProjectionMock).not.toHaveBeenCalled();
    expect(primeRecentEventMonitorBaselineMock).toHaveBeenCalledTimes(1);
    expect(primeRecentEventMonitorBaselineMock).toHaveBeenCalledWith(memberContext);
  });

  it('owns a separate final prime after lazy historical projection hydration', async () => {
    isActive = false;
    metadata = createMetadata(['a', 'b']);
    projectionByMemberRouteKey.set('member-a', null);

    await openRealTeam('member-a');

    const historicalTeam = teamContextsById.get(metadata.teamRunId);
    const memberB = historicalTeam.leafAgentContextsByRouteKey.get('member-b');
    expect(historicalTeam.historicalHydration.memberProjectionLoadStateByRouteKey['member-b'])
      .toBe('unloaded');
    vi.clearAllMocks();
    projectionByMemberRouteKey.set('member-b', createProjection());

    await ensureHistoricalTeamMemberHydrated({
      teamContext: historicalTeam,
      memberRouteKey: 'member-b',
    });

    expect(resetRecentEventMonitorBaselineMock).toHaveBeenCalledTimes(1);
    expect(resetRecentEventMonitorBaselineMock).toHaveBeenCalledWith(memberB);
    expect(hydrateActivitiesFromProjectionMock).toHaveBeenCalledTimes(1);
    expect(primeRecentEventMonitorBaselineMock).toHaveBeenCalledTimes(1);
    expect(primeRecentEventMonitorBaselineMock).toHaveBeenCalledWith(memberB);
    expect(resetRecentEventMonitorBaselineMock.mock.invocationCallOrder[0])
      .toBeLessThan(hydrateActivitiesFromProjectionMock.mock.invocationCallOrder[0]!);
    expect(hydrateActivitiesFromProjectionMock.mock.invocationCallOrder[0])
      .toBeLessThan(primeRecentEventMonitorBaselineMock.mock.invocationCallOrder[0]!);
    expect(historicalTeam.historicalHydration.memberProjectionLoadStateByRouteKey['member-b'])
      .toBe('loaded');
  });
});
