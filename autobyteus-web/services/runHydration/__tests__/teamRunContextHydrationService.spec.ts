import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { hydrateLiveTeamRunContext } from '../teamRunContextHydrationService';

const {
  queryMock,
  fetchTeamCommunicationMock,
  fetchTaskDelegationsMock,
  hydrateActivitiesFromProjectionMock,
  primeRecentEventMonitorBaselineMock,
  reconstructTeamRunConfigFromMetadataMock,
} = vi.hoisted(() => ({
  queryMock: vi.fn(),
  fetchTeamCommunicationMock: vi.fn(),
  fetchTaskDelegationsMock: vi.fn(),
  hydrateActivitiesFromProjectionMock: vi.fn(),
  primeRecentEventMonitorBaselineMock: vi.fn(),
  reconstructTeamRunConfigFromMetadataMock: vi.fn(),
}));

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({ query: queryMock }),
}));

vi.mock('../teamCommunicationHydrationService', () => ({
  fetchAndHydrateTeamCommunicationForTeam: fetchTeamCommunicationMock,
}));

vi.mock('../taskDelegationHydrationService', () => ({
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

vi.mock('~/utils/teamRunConfigUtils', () => ({
  reconstructTeamRunConfigFromMetadata: reconstructTeamRunConfigFromMetadataMock,
}));

vi.mock('~/services/eventMonitor/recentEventMonitorMutationCoordinator', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/services/eventMonitor/recentEventMonitorMutationCoordinator')>();
  return {
    ...actual,
    primeRecentEventMonitorBaseline: (context: any) => {
      primeRecentEventMonitorBaselineMock(context);
      actual.primeRecentEventMonitorBaseline(context);
    },
  };
});

const metadata = {
  teamRunId: 'team-live-recovery',
  teamDefinitionId: 'team-def-1',
  teamDefinitionName: 'Recovery Team',
  coordinatorMemberRouteKey: 'member-a',
  createdAt: '2026-08-09T10:00:00.000Z',
  memberTree: [{
    memberKind: 'agent',
    memberRouteKey: 'member-a',
    memberPath: ['member-a'],
    memberName: 'Member A',
    memberRunId: 'run-a',
    runtimeKind: 'autobyteus',
    platformAgentRunId: 'run-a',
    agentDefinitionId: 'agent-a',
    llmModelIdentifier: 'gpt-test',
    autoExecuteTools: true,
    skillAccessMode: 'PRELOADED_ONLY',
    llmConfig: null,
    workspaceRootPath: null,
  }],
};

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

describe('hydrateLiveTeamRunContext Event Monitor final-prime ownership', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    reconstructTeamRunConfigFromMetadataMock.mockReturnValue({
      teamDefinitionId: 'team-def-1',
      teamDefinitionName: 'Recovery Team',
      isLocked: true,
    });
  });

  it.each([
    {
      name: 'after projected activity hydration',
      projection: { conversation: [], activities: [projectedActivity] },
      expectedActivityCalls: 1,
    },
    {
      name: 'when the member projection is absent',
      projection: null,
      expectedActivityCalls: 0,
    },
  ])('primes each real loader/builder context exactly once $name', async ({
    projection,
    expectedActivityCalls,
  }) => {
    queryMock.mockImplementation(async ({ variables }: { variables: Record<string, unknown> }) => (
      variables.memberRouteKey
        ? { data: { getTeamMemberRunProjection: projection }, errors: [] }
        : {
            data: {
              getTeamRunResumeConfig: {
                teamRunId: 'team-live-recovery',
                isActive: true,
                metadata,
              },
            },
            errors: [],
          }
    ));

    const result = await hydrateLiveTeamRunContext({
      teamRunId: 'team-live-recovery',
      resolveWorkspaceMetadataByRootPath: vi.fn().mockResolvedValue(null),
      ensureWorkspaceByRootPath: vi.fn().mockResolvedValue(null),
    });

    const memberContext = result.hydratedContext.leafAgentContextsByRouteKey.get('member-a');
    expect(memberContext).toBeDefined();
    expect(hydrateActivitiesFromProjectionMock).toHaveBeenCalledTimes(expectedActivityCalls);
    if (projection) {
      expect(hydrateActivitiesFromProjectionMock).toHaveBeenCalledWith(
        'run-a', projection.activities,
      );
      expect(hydrateActivitiesFromProjectionMock.mock.invocationCallOrder[0])
        .toBeLessThan(primeRecentEventMonitorBaselineMock.mock.invocationCallOrder[0]!);
    }
    expect(primeRecentEventMonitorBaselineMock).toHaveBeenCalledTimes(1);
    expect(primeRecentEventMonitorBaselineMock).toHaveBeenCalledWith(memberContext);
  });
});
