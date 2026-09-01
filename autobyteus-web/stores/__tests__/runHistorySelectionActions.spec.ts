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
  teamMemberInspectionByIdentity: {},
  openTeamMemberRun: vi.fn(),
  openRun: vi.fn(),
  ensureWorkspaceByRootPath: vi.fn(),
  resolveWorkspaceMetadataByRootPath: vi.fn(),
  inspectTeamMember: vi.fn(),
});

describe('runHistorySelectionActions failed Team stream recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contexts.clear();
    contexts.set('team-recovery', localContext);
    isReopenRequiredMock.mockReturnValue(true);
  });

  it('routes a mounted exact shell through inspection instead of fresh Team replacement', async () => {
    isReopenRequiredMock.mockReturnValue(false);
    const store = buildStore();
    store.inspectTeamMember.mockResolvedValue({
      disposition: 'committed', teamRunId: 'team-recovery', agentRunId: 'run-a', memberAddress: '/member-a',
    });

    await selectTreeRunFromHistory(store, {
      teamRunId: 'team-recovery', agentRunId: 'run-a', memberAddress: '/member-a',
    });

    expect(store.inspectTeamMember).toHaveBeenCalledWith('team-recovery', 'run-a');
    expect(openMock).not.toHaveBeenCalled();
    expect(reopenMock).not.toHaveBeenCalled();
  });

  it('keeps the previous selection and row surface when mounted inspection is rejected', async () => {
    isReopenRequiredMock.mockReturnValue(false);
    const store = buildStore();
    store.inspectTeamMember.mockResolvedValue({
      disposition: 'rejected', code: 'TEAM_MEMBER_INSPECTION_FAILED', message: 'projection unavailable',
    });

    await expect(selectTreeRunFromHistory(store, {
      teamRunId: 'team-recovery', agentRunId: 'run-a', memberAddress: '/member-a',
    })).rejects.toThrow('projection unavailable');

    expect(store.selectedTeamRunId).toBe('team-before');
    expect(store.selectedTeamMemberAddress).toBe('/before');
    expect(store.error).toBeNull();
    expect(openMock).not.toHaveBeenCalled();
  });

  it('routes a known failed local Team selection only through checkpointed recovery', async () => {
    reopenMock.mockImplementation(async (input: any) => {
      const result = {
      teamRunId: 'team-recovery',
      focusedAgentRunId: 'run-a',
      focusedMemberAddress: '/member-a',
      resumeConfig: { teamRunId: 'team-recovery', isActive: true, executionTree: {} },
      };
      input.onCommitted(result);
      return result;
    });
    const store = buildStore();

    await selectTreeRunFromHistory(store, {
      teamRunId: 'team-recovery', agentRunId: 'run-a', memberAddress: '/member-a',
    });

    expect(reopenMock).toHaveBeenCalledTimes(1);
    expect(store.inspectTeamMember).not.toHaveBeenCalled();
    expect(store.openTeamMemberRun).not.toHaveBeenCalled();
    expect(store.selectedTeamRunId).toBe('team-recovery');
    expect(store.selectedTeamMemberAddress).toBe('/member-a');
    expect(store.selectedRunId).toBeNull();
  });

  it.each([
    'TEAM_STREAM_RECOVERY_WAIT: still working',
    'TEAM_STREAM_RECOVERY_CHECKPOINT_CHANGED: changed during hydration',
    'TEAM_STREAM_SNAPSHOT_BASE_MISMATCH: candidate base changed',
  ])('preserves navigation and avoids the panel-fatal error for retryable refusal %s', async (message) => {
    reopenMock.mockRejectedValue(new Error(message));
    const store = buildStore();

    await expect(selectTreeRunFromHistory(store, {
      teamRunId: 'team-recovery', agentRunId: 'run-a', memberAddress: '/member-a',
    })).rejects.toThrow(message);

    expect(store.selectedTeamRunId).toBe('team-before');
    expect(store.selectedTeamMemberAddress).toBe('/before');
    expect(store.selectedRunId).toBe('standalone-before');
    expect(store.error).toBeNull();
  });

  it('retries the same Team member after a retryable refusal', async () => {
    reopenMock
      .mockRejectedValueOnce(new Error('TEAM_STREAM_RECOVERY_WAIT: still working'))
      .mockImplementationOnce(async (input: any) => {
        const result = {
          teamRunId: 'team-recovery',
          focusedAgentRunId: 'run-a',
          focusedMemberAddress: '/member-a',
          resumeConfig: { teamRunId: 'team-recovery', isActive: true, executionTree: {} },
        };
        input.onCommitted(result);
        return result;
      });
    const store = buildStore();
    const target = {
      teamRunId: 'team-recovery', agentRunId: 'run-a', memberAddress: '/member-a',
    };

    await expect(selectTreeRunFromHistory(store, target)).rejects.toThrow('TEAM_STREAM_RECOVERY_WAIT');
    await selectTreeRunFromHistory(store, target);

    expect(reopenMock).toHaveBeenCalledTimes(2);
    expect(store.error).toBeNull();
    expect(store.selectedTeamRunId).toBe('team-recovery');
    expect(store.selectedTeamMemberAddress).toBe('/member-a');
  });
});
