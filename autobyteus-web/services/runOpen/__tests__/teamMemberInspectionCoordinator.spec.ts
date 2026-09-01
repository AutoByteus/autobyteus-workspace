import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inspectMountedTeamMember } from '../teamMemberInspectionCoordinator';
import { buildTestTeamContext, testAgentNode, testTaskRecord } from '~/test-support/currentTeamTestFixtures';

const mocks = vi.hoisted(() => ({
  mounted: null as any,
  ensureProjection: vi.fn(),
}));
vi.mock('~/stores/agentTeamContextsStore', () => ({
  useAgentTeamContextsStore: () => ({ getTeamContextById: () => mocks.mounted }),
}));
vi.mock('~/services/runHydration/teamMemberProjectionHydrationService', () => ({
  ensureAuthoritativeTeamMemberProjection: mocks.ensureProjection,
}));

const team = () => buildTestTeamContext({
  teamRunId: 'team-1',
  coordinatorAddress: '/member-a',
  focusedAgentRunId: 'run-a',
  rootChildren: [testAgentNode('/member-a', { agentRunId: 'run-a' })],
  tasks: [testTaskRecord({
    taskId: 'task-1', delegatorAgentRunId: 'run-a', recipientAddress: '/member-a',
    target: { agentRunId: 'task-run' },
  })],
});

describe('teamMemberInspectionCoordinator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mounted = team();
  });

  it('hydrates before committing focus and outer selection metadata', async () => {
    let finish!: () => void;
    mocks.ensureProjection.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
    const commit = vi.fn();

    const pending = inspectMountedTeamMember({ teamRunId: 'team-1', agentRunId: 'task-run', commit });
    await vi.waitFor(() => expect(mocks.ensureProjection).toHaveBeenCalledTimes(1));
    expect(mocks.mounted.view.getFocusedAgentRunId()).toBe('run-a');
    expect(commit).not.toHaveBeenCalled();
    finish();
    await expect(pending).resolves.toMatchObject({
      disposition: 'committed', teamRunId: 'team-1', agentRunId: 'task-run', memberAddress: '/member-a',
    });
    expect(mocks.mounted.view.getFocusedAgentRunId()).toBe('task-run');
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('preserves focus and selection metadata when exact hydration fails', async () => {
    mocks.ensureProjection.mockRejectedValue(new Error('projection unavailable'));
    const commit = vi.fn();

    await expect(inspectMountedTeamMember({
      teamRunId: 'team-1', agentRunId: 'task-run', commit,
    })).resolves.toMatchObject({ disposition: 'rejected', message: 'projection unavailable' });

    expect(mocks.mounted.view.getFocusedAgentRunId()).toBe('run-a');
    expect(commit).not.toHaveBeenCalled();
  });

  it('rejects a root replacement that happens before focus commit', async () => {
    const original = mocks.mounted;
    mocks.ensureProjection.mockImplementation(async () => { mocks.mounted = team(); });
    const commit = vi.fn();

    await expect(inspectMountedTeamMember({
      teamRunId: 'team-1', agentRunId: 'task-run', commit,
    })).resolves.toMatchObject({ disposition: 'rejected', message: expect.stringContaining('changed before selection commit') });

    expect(original.view.getFocusedAgentRunId()).toBe('run-a');
    expect(commit).not.toHaveBeenCalled();
  });
});
