import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { hydrateLiveTeamRunContext } from '../teamRunContextHydrationService';
import { AgentStatus } from '~/types/agent/AgentStatus';

const {
  queryMock,
  fetchTeamMemberProjectionsMock,
  buildLiveTeamMemberContextsMock,
  fetchTeamCommunicationMock,
  fetchTaskDelegationsMock,
  hydrateActivitiesFromProjectionMock,
  primeRecentEventMonitorBaselineMock,
  reconstructTeamRunConfigFromMetadataMock,
} = vi.hoisted(() => ({
  queryMock: vi.fn(),
  fetchTeamMemberProjectionsMock: vi.fn(),
  buildLiveTeamMemberContextsMock: vi.fn(),
  fetchTeamCommunicationMock: vi.fn(),
  fetchTaskDelegationsMock: vi.fn(),
  hydrateActivitiesFromProjectionMock: vi.fn(),
  primeRecentEventMonitorBaselineMock: vi.fn(),
  reconstructTeamRunConfigFromMetadataMock: vi.fn(),
}));

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({ query: queryMock }),
}));

vi.mock('~/stores/runHistoryTeamMemberProjectionHydrator', () => ({
  applyProjectionToTeamMemberContext: vi.fn(),
  buildHistoricalTeamMemberContextShells: vi.fn(),
  buildLiveTeamMemberContexts: buildLiveTeamMemberContextsMock,
  fetchTeamMemberProjection: vi.fn(),
  fetchTeamMemberProjections: fetchTeamMemberProjectionsMock,
}));

vi.mock('../teamCommunicationHydrationService', () => ({
  fetchAndHydrateTeamCommunicationForTeam: fetchTeamCommunicationMock,
}));

vi.mock('../taskDelegationHydrationService', () => ({
  fetchAndHydrateTaskDelegationRecordsForTeam: fetchTaskDelegationsMock,
}));

vi.mock('../runProjectionActivityHydration', () => ({
  hydrateActivitiesFromProjection: hydrateActivitiesFromProjectionMock,
}));

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

const buildMemberContext = () => ({
  config: { isLocked: false },
  state: {
    runId: 'run-a',
    currentStatus: AgentStatus.Running,
    conversation: {
      id: 'conversation-a',
      messages: [],
      createdAt: '2026-08-09T10:00:00.000Z',
      updatedAt: '2026-08-09T10:00:00.000Z',
    },
    eventMonitorPresentationRevision: 0,
    markEventMonitorPresentationChanged() {
      this.eventMonitorPresentationRevision += 1;
    },
  },
});

describe('hydrateLiveTeamRunContext Event Monitor final-prime ownership', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    reconstructTeamRunConfigFromMetadataMock.mockReturnValue({
      teamDefinitionId: 'team-def-1',
      teamDefinitionName: 'Recovery Team',
      isLocked: true,
    });
    queryMock.mockResolvedValue({
      data: {
        getTeamRunResumeConfig: {
          teamRunId: 'team-live-recovery',
          isActive: true,
          metadata,
        },
      },
      errors: [],
    });
  });

  it.each([
    {
      name: 'after projected activity hydration',
      projection: { activities: [{ invocationId: 'tool-a' }] },
      expectedActivityCalls: 1,
    },
    {
      name: 'when the member projection is absent',
      projection: null,
      expectedActivityCalls: 0,
    },
  ])('primes each final context exactly once $name', async ({ projection, expectedActivityCalls }) => {
    const memberContext = buildMemberContext();
    const members = new Map([['member-a', memberContext]]);
    fetchTeamMemberProjectionsMock.mockResolvedValue(new Map([['member-a', projection]]));
    buildLiveTeamMemberContextsMock.mockResolvedValue({
      members,
      primaryWorkspaceMetadata: null,
      memberWorkspaceMetadatasByRouteKey: {},
    });

    const result = await hydrateLiveTeamRunContext({
      teamRunId: 'team-live-recovery',
      resolveWorkspaceMetadataByRootPath: vi.fn(),
      ensureWorkspaceByRootPath: vi.fn(),
    });

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
    expect(result.hydratedContext.leafAgentContextsByRouteKey.get('member-a')).toBe(memberContext);
  });
});
