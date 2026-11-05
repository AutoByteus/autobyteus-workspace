import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useRunListArchiveOlder } from '~/composables/useRunListArchiveOlder';
import type { RunListEntry } from '~/utils/runListProjection';

const agent = (runId: string, overrides: { isActive?: boolean; source?: 'history' | 'local' } = {}): RunListEntry => ({
  kind: 'agent', key: `agent:${runId}`, runId, name: 'Agent', lastActivityAt: '', isActive: overrides.isActive ?? false, folderRootPath: null,
  agentDefinitionId: 'agent', avatarUrl: null,
  run: { runId, summary: '', lastActivityAt: '', currentStatus: 'offline', lastKnownStatus: 'IDLE', isActive: overrides.isActive ?? false, source: overrides.source ?? 'history', isDraft: false },
} as RunListEntry);
const team = (runId: string, deleteLifecycle = 'READY', isActive = false): RunListEntry => ({
  kind: 'team', key: `team:${runId}`, runId, name: 'Team', lastActivityAt: '', isActive, folderRootPath: null,
  team: { teamRunId: runId, isActive, deleteLifecycle },
} as unknown as RunListEntry);
const org = (runId: string, isActive = false): RunListEntry => ({
  kind: 'org', key: `org:${runId}`, runId, name: 'Org', lastActivityAt: '', isActive, folderRootPath: null, definitionId: 'org', orgRun: { rootRunId: runId },
} as unknown as RunListEntry);

const setup = (older: RunListEntry[], outcome = { archivedRunIds: [] as string[], failedRunIds: [] as string[] }) => {
  const archiveRuns = vi.fn(async () => outcome);
  const addToast = vi.fn();
  const onAgentOrgArchived = vi.fn();
  const archive = useRunListArchiveOlder({ olderEntries: ref(older), archiveRuns, addToast, onAgentOrgArchived });
  return { archive, archiveRuns, addToast, onAgentOrgArchived };
};

describe('useRunListArchiveOlder ("Archive all older", UIT-010)', () => {
  it('archives every older run, by kind, after the existing confirmation, with one summary toast', async () => {
    const older = [agent('a-1'), team('t-1'), org('o-1'), agent('a-local', { source: 'local' })];
    const { archive, archiveRuns, addToast, onAgentOrgArchived } = setup(older, { archivedRunIds: ['a-1', 't-1', 'o-1'], failedRunIds: [] });
    expect(archive.canArchiveOlder.value).toBe(true);
    archive.requestArchiveOlder();
    expect(archive.showConfirmation.value).toBe(true);
    expect(archive.confirmationMessage.value).toBe('Older runs · 3 runs will be hidden from history.');
    await archive.confirmArchiveOlder();
    expect(archiveRuns).toHaveBeenCalledExactlyOnceWith({ agentRunIds: ['a-1'], teamRunIds: ['t-1'], orgRunIds: ['o-1'] });
    expect(addToast).toHaveBeenCalledExactlyOnceWith('Archived 3 runs.', 'success');
    expect(onAgentOrgArchived).toHaveBeenCalledExactlyOnceWith('o-1');
    expect(archive.showConfirmation.value).toBe(false);
  });

  it.each([
    ['a running Agent run', agent('a-1', { isActive: true })],
    ['a running Team run', team('t-1', 'READY', true)],
    ['a Team run that is being stopped or deleted', team('t-1', 'CLEANUP_PENDING')],
    ['a running Org run', org('o-1', true)],
  ])('archives nothing while %s is among them', (_label, blocking) => {
    const { archive, archiveRuns, addToast } = setup([agent('a-2'), blocking]);
    archive.requestArchiveOlder();
    expect(archive.showConfirmation.value).toBe(false);
    expect(addToast).toHaveBeenCalledExactlyOnceWith('Stop running runs first.', 'info');
    expect(archiveRuns).not.toHaveBeenCalled();
  });

  it('reports partial and total failures as the group archive did', async () => {
    const partial = setup([agent('a-1'), agent('a-2')], { archivedRunIds: ['a-1'], failedRunIds: ['a-2'] });
    partial.archive.requestArchiveOlder();
    await partial.archive.confirmArchiveOlder();
    expect(partial.addToast).toHaveBeenCalledWith(expect.stringContaining('1 run'), 'error');

    const none = setup([agent('a-1')], { archivedRunIds: [], failedRunIds: ['a-1'] });
    none.archive.requestArchiveOlder();
    await none.archive.confirmArchiveOlder();
    expect(none.addToast).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('does nothing on cancel', async () => {
    const { archive, archiveRuns } = setup([agent('a-1')]);
    archive.requestArchiveOlder();
    archive.cancelArchiveOlder();
    await archive.confirmArchiveOlder();
    expect(archiveRuns).not.toHaveBeenCalled();
  });
});
