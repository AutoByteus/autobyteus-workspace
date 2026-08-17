import { beforeEach, describe, expect, it, vi } from 'vitest';
import { selectTreeRunFromHistory } from '../runHistorySelectionActions';
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures';

const {
  contexts,
  isReopenRequiredMock,
  reopenMock,
  openMock,
  selectionMock,
  teamConfigMock,
  agentConfigMock,
} = vi.hoisted(() => ({
  contexts: new Map<string, any>(),
  isReopenRequiredMock: vi.fn(),
  reopenMock: vi.fn(),
  openMock: vi.fn(),
  selectionMock: { selectRun: vi.fn() },
  teamConfigMock: { clearConfig: vi.fn() },
  agentConfigMock: { clearConfig: vi.fn() },
}));

vi.mock('~/stores/agentTeamContextsStore', () => ({
  useAgentTeamContextsStore: () => ({
    getTeamContextById: (rootTeamRunId: string) => contexts.get(rootTeamRunId),
  }),
}));
vi.mock('~/stores/agentTeamRunStore', () => ({
  useAgentTeamRunStore: () => ({ isTeamStreamReopenRequired: isReopenRequiredMock }),
}));
vi.mock('~/stores/agentSelectionStore', () => ({ useAgentSelectionStore: () => selectionMock }));
vi.mock('~/stores/agentContextsStore', () => ({ useAgentContextsStore: () => ({ getRun: vi.fn() }) }));
vi.mock('~/stores/teamRunConfigStore', () => ({ useTeamRunConfigStore: () => teamConfigMock }));
vi.mock('~/stores/agentRunConfigStore', () => ({ useAgentRunConfigStore: () => agentConfigMock }));
vi.mock('~/services/runOpen/teamRunOpenCoordinator', () => ({
  openTeamRun: openMock,
  reopenTeamRunAfterStreamLoss: reopenMock,
}));

const localContext = buildTestTeamContext({
  teamRunId: 'team-recovery',
  coordinatorAddress: '/member-a',
  rootChildren: [testAgentNode('/member-a', { agentRunId: 'run-a' })],
});

const buildStore = () => ({
  openingRun: false,
  error: null as string | null,
  selectedRunId: 'standalone-before' as string | null,
  selectedTeamRunId: 'team-before' as string | null,
  selectedTeamMemberAddress: '/before' as string | null,
  teamResumeConfigByTeamRunId: {} as Record<string, any>,
  openTeamMemberRun: vi.fn(),
  openRun: vi.fn(),
  ensureWorkspaceByRootPath: vi.fn(),
  resolveWorkspaceMetadataByRootPath: vi.fn(),
  focusTeamMemberAndEnsureHydrated: vi.fn(),
});

describe('runHistorySelectionActions failed Team stream recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contexts.clear();
    contexts.set('team-recovery', localContext);
    isReopenRequiredMock.mockReturnValue(true);
  });

  it('routes a known failed local Team selection only through checkpointed recovery', async () => {
    reopenMock.mockResolvedValue({
      teamRunId: 'team-recovery',
      focusedAgentRunId: 'run-a',
      focusedMemberAddress: '/member-a',
      resumeConfig: { teamRunId: 'team-recovery', isActive: true, executionTree: {} },
    });
    const store = buildStore();

    await selectTreeRunFromHistory(store, {
      teamRunId: 'team-recovery', agentRunId: 'run-a', memberAddress: '/member-a',
    });

    expect(reopenMock).toHaveBeenCalledTimes(1);
    expect(store.focusTeamMemberAndEnsureHydrated).not.toHaveBeenCalled();
    expect(store.openTeamMemberRun).not.toHaveBeenCalled();
    expect(store.selectedTeamRunId).toBe('team-recovery');
    expect(store.selectedTeamMemberAddress).toBe('/member-a');
    expect(store.selectedRunId).toBeNull();
  });

  it('preserves the prior selection when checkpointed recovery rejects', async () => {
    reopenMock.mockRejectedValue(new Error('TEAM_STREAM_RECOVERY_WAIT'));
    const store = buildStore();

    await expect(selectTreeRunFromHistory(store, {
      teamRunId: 'team-recovery', agentRunId: 'run-a', memberAddress: '/member-a',
    })).rejects.toThrow('TEAM_STREAM_RECOVERY_WAIT');

    expect(store.selectedTeamRunId).toBe('team-before');
    expect(store.selectedTeamMemberAddress).toBe('/before');
    expect(store.selectedRunId).toBe('standalone-before');
  });
});
