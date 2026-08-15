import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hydrateLiveTeamRunContext } from '../teamRunContextHydrationService';
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures';

const {
  queryMock,
  fetchTeamCommunicationMock,
  fetchTaskDelegationsMock,
  hydrateActivitiesFromProjectionMock,
  primeRecentEventMonitorBaselineMock,
} = vi.hoisted(() => ({
  queryMock: vi.fn(),
  fetchTeamCommunicationMock: vi.fn(),
  fetchTaskDelegationsMock: vi.fn(),
  hydrateActivitiesFromProjectionMock: vi.fn(),
  primeRecentEventMonitorBaselineMock: vi.fn(),
}));

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: queryMock }) }));
vi.mock('../teamCommunicationHydrationService', () => ({
  fetchTeamCommunicationForTeam: fetchTeamCommunicationMock,
}));
vi.mock('../taskDelegationHydrationService', () => ({
  fetchTaskDelegationRecordsForTeam: fetchTaskDelegationsMock,
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
  };
});

const tree = buildTestTeamContext({
  teamRunId: 'team-live-recovery',
  teamDefinitionId: 'team-def-1',
  teamDefinitionName: 'Recovery Team',
  coordinatorAddress: '/member-a',
  rootChildren: [testAgentNode('/member-a', {
    agentRunId: 'run-a', agentDefinitionId: 'agent-a', llmModelIdentifier: 'gpt-test',
  })],
}).view.getExecutionTree();

const projectedActivity = {
  kind: 'compaction', activityId: 'compaction:boundary:boundary-a', phase: 'completed',
  message: 'Provider context compaction boundary recorded', turnId: 'turn-a',
  provider: 'codex', boundaryKey: 'boundary-a', ts: 30,
};

describe('hydrateLiveTeamRunContext current V1 aggregate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchTaskDelegationsMock.mockResolvedValue([]);
    fetchTeamCommunicationMock.mockResolvedValue([]);
  });

  it.each([
    { name: 'with its persisted projection', projection: {
      agentRunId: 'run-a', conversation: [], activities: [projectedActivity], hasEarlierActiveTraceEvents: false,
    }, expectedActivityCalls: 1, expectedPrimeCalls: 1 },
    { name: 'without a persisted projection', projection: null, expectedActivityCalls: 0, expectedPrimeCalls: 0 },
  ])('hydrates one exact AgentRun $name', async ({ projection, expectedActivityCalls, expectedPrimeCalls }) => {
    queryMock.mockImplementation(async ({ variables }: { variables: Record<string, unknown> }) => (
      variables.agentRunId
        ? { data: { getTeamMemberRunProjection: projection }, errors: [] }
        : { data: { getTeamRunResumeConfig: {
            teamRunId: 'team-live-recovery', isActive: true, executionTree: tree,
          } }, errors: [] }
    ));

    const result = await hydrateLiveTeamRunContext({
      teamRunId: 'team-live-recovery',
      agentRunId: 'run-a',
      resolveWorkspaceMetadataByRootPath: vi.fn().mockResolvedValue(null),
      ensureWorkspaceByRootPath: vi.fn().mockResolvedValue(null),
    });

    const memberContext = result.hydratedContext.view.getAgentContext('run-a');
    expect(result.focusedAgentRunId).toBe('run-a');
    expect(result.hydratedContext.view.getMemberAddress('run-a')).toBe('/member-a');
    expect(memberContext?.state.runId).toBe('run-a');
    expect(hydrateActivitiesFromProjectionMock).toHaveBeenCalledTimes(expectedActivityCalls);
    expect(primeRecentEventMonitorBaselineMock).toHaveBeenCalledTimes(expectedPrimeCalls);
    if (projection) {
      expect(hydrateActivitiesFromProjectionMock).toHaveBeenCalledWith('run-a', projection.activities);
      expect(hydrateActivitiesFromProjectionMock.mock.invocationCallOrder[0])
        .toBeLessThan(primeRecentEventMonitorBaselineMock.mock.invocationCallOrder[0]!);
      expect(primeRecentEventMonitorBaselineMock).toHaveBeenCalledWith(memberContext);
    }
  });

  it('rejects a requested root that disagrees with the execution tree', async () => {
    queryMock.mockResolvedValue({ data: { getTeamRunResumeConfig: {
      teamRunId: 'foreign-root', isActive: false, executionTree: tree,
    } }, errors: [] });
    await expect(hydrateLiveTeamRunContext({
      teamRunId: 'team-live-recovery',
      resolveWorkspaceMetadataByRootPath: vi.fn().mockResolvedValue(null),
    })).rejects.toThrow("Team execution tree root identity mismatch for 'team-live-recovery'.");
  });
});
