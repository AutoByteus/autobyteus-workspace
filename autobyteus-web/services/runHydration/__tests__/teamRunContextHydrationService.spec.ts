import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  hydrateLiveTeamRunContext,
  hydrateTeamRunContextForStreamRecovery,
} from '../teamRunContextHydrationService';
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

describe('hydrateLiveTeamRunContext current V2 aggregate', () => {
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

  it('accepts the exact non-null empty projection inside a stable recovery checkpoint', async () => {
    const checkpoints = [
      { rootTeamRunId: 'team-live-recovery', changeSequence: 9, hasOpenExecutionWork: false },
      { rootTeamRunId: 'team-live-recovery', changeSequence: 9, hasOpenExecutionWork: false },
    ];
    const emptyProjection = {
      agentRunId: 'run-a', conversation: [], activities: [], summary: null,
      lastActivityAt: null, hasEarlierActiveTraceEvents: false,
    };
    queryMock.mockImplementation(async ({ query, variables }: { query: any; variables: Record<string, unknown> }) => {
      const operation = query.definitions[0]?.name?.value;
      if (operation === 'GetTeamRunExecutionCheckpoint') {
        return { data: { getTeamRunExecutionCheckpoint: checkpoints.shift() }, errors: [] };
      }
      if (variables.agentRunId) {
        return { data: { getTeamMemberRunProjection: emptyProjection }, errors: [] };
      }
      return { data: { getTeamRunResumeConfig: {
        teamRunId: 'team-live-recovery', isActive: true, executionTree: tree,
      } }, errors: [] };
    });

    const result = await hydrateTeamRunContextForStreamRecovery({
      teamRunId: 'team-live-recovery',
      agentRunId: 'run-a',
      resolveWorkspaceMetadataByRootPath: vi.fn().mockResolvedValue(null),
      ensureWorkspaceByRootPath: vi.fn().mockResolvedValue(null),
    });

    expect(result.expectedBaseChangeSequence).toBe(9);
    expect(result.projectionByAgentRunId.get('run-a')).toBe(emptyProjection);
    expect(result.hydratedContext.view.getAgentContext('run-a')?.state.conversation.messages).toEqual([]);
    expect(checkpoints).toEqual([]);
  });

  it('refuses recovery before hydration while the root still has open work', async () => {
    queryMock.mockResolvedValue({ data: { getTeamRunExecutionCheckpoint: {
      rootTeamRunId: 'team-live-recovery', changeSequence: 9, hasOpenExecutionWork: true,
    } }, errors: [] });

    await expect(hydrateTeamRunContextForStreamRecovery({
      teamRunId: 'team-live-recovery',
      agentRunId: 'run-a',
      resolveWorkspaceMetadataByRootPath: vi.fn().mockResolvedValue(null),
      ensureWorkspaceByRootPath: vi.fn().mockResolvedValue(null),
    })).rejects.toThrow('TEAM_STREAM_RECOVERY_WAIT');
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it('cancels recovery when the root checkpoint changes during hydration', async () => {
    const checkpoints = [
      { rootTeamRunId: 'team-live-recovery', changeSequence: 9, hasOpenExecutionWork: false },
      { rootTeamRunId: 'team-live-recovery', changeSequence: 10, hasOpenExecutionWork: false },
    ];
    queryMock.mockImplementation(async ({ query, variables }: { query: any; variables: Record<string, unknown> }) => {
      const operation = query.definitions[0]?.name?.value;
      if (operation === 'GetTeamRunExecutionCheckpoint') {
        return { data: { getTeamRunExecutionCheckpoint: checkpoints.shift() }, errors: [] };
      }
      if (variables.agentRunId) {
        return { data: { getTeamMemberRunProjection: {
          agentRunId: 'run-a', conversation: [], activities: [], summary: null,
          lastActivityAt: null, hasEarlierActiveTraceEvents: false,
        } }, errors: [] };
      }
      return { data: { getTeamRunResumeConfig: {
        teamRunId: 'team-live-recovery', isActive: true, executionTree: tree,
      } }, errors: [] };
    });

    await expect(hydrateTeamRunContextForStreamRecovery({
      teamRunId: 'team-live-recovery',
      agentRunId: 'run-a',
      resolveWorkspaceMetadataByRootPath: vi.fn().mockResolvedValue(null),
      ensureWorkspaceByRootPath: vi.fn().mockResolvedValue(null),
    })).rejects.toThrow('TEAM_STREAM_RECOVERY_CHECKPOINT_CHANGED');
    expect(checkpoints).toEqual([]);
  });

  it.each([
    { name: 'missing payload', projection: null, error: "projection payload missing for 'run-a'" },
    { name: 'identity mismatch', projection: {
      agentRunId: 'foreign-run', conversation: [], activities: [], hasEarlierActiveTraceEvents: false,
    }, error: "projection 'foreign-run' does not match 'run-a'" },
  ])('aborts recovery on $name instead of inventing empty history', async ({ projection, error }) => {
    queryMock.mockImplementation(async ({ query, variables }: { query: any; variables: Record<string, unknown> }) => {
      const operation = query.definitions[0]?.name?.value;
      if (operation === 'GetTeamRunExecutionCheckpoint') {
        return { data: { getTeamRunExecutionCheckpoint: {
          rootTeamRunId: 'team-live-recovery', changeSequence: 9, hasOpenExecutionWork: false,
        } }, errors: [] };
      }
      if (variables.agentRunId) return { data: { getTeamMemberRunProjection: projection }, errors: [] };
      return { data: { getTeamRunResumeConfig: {
        teamRunId: 'team-live-recovery', isActive: true, executionTree: tree,
      } }, errors: [] };
    });

    await expect(hydrateTeamRunContextForStreamRecovery({
      teamRunId: 'team-live-recovery',
      agentRunId: 'run-a',
      resolveWorkspaceMetadataByRootPath: vi.fn().mockResolvedValue(null),
      ensureWorkspaceByRootPath: vi.fn().mockResolvedValue(null),
    })).rejects.toThrow(error);
  });
});
