import { beforeEach, describe, expect, it, vi } from 'vitest';
import { localizationRuntime } from '~/localization/runtime/localizationRuntime';
import {
  agentGroupArchiveKey,
  agentOrgGroupArchiveKey,
  canArchiveAgentGroup,
  teamGroupArchiveKey,
  useWorkspaceHistoryGroupArchive,
} from '../useWorkspaceHistoryGroupArchive';
import type { AgentRunGroupArchiveOutcome } from '~/stores/runHistoryTypes';

// Real English catalog through the runtime, so assertions pin the approved short wording (QR-003).
beforeEach(async () => {
  await localizationRuntime.setPreference('en');
});

const workspaceNode = { workspaceRootPath: '/ws/a', workspaceName: 'a' } as any;
const agentRun = (runId: string, overrides: Record<string, unknown> = {}) =>
  ({ runId, source: 'history', isActive: false, ...overrides });
const agentNode = (runs: any[], agentName = 'Codex') => ({ agentDefinitionId: 'agent-def-1', agentName, runs }) as any;
const teamGroup = (runs: any[]) => ({ key: 'team-def-1', teamDefinitionName: 'English Bridge Team', runs }) as any;
const teamRun = (teamRunId: string, overrides: Record<string, unknown> = {}) =>
  ({ teamRunId, isActive: false, deleteLifecycle: 'READY', ...overrides });
const orgGroup = (runs: any[]) => ({ definitionId: 'org-def-1', name: 'Research <Org>', runs }) as any;
const orgRun = (rootRunId: string, isActive = false) => ({ rootRunId, isActive });

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};

const buildHarness = () => {
  const params = {
    archiveAgentRunGroup: vi.fn(async (): Promise<AgentRunGroupArchiveOutcome> =>
      ({ archivedRunIds: ['run-1', 'run-2'], activeRunIds: [], failedRunIds: [] })),
    archiveTeamRuns: vi.fn(async (ids: string[]) => ({ archivedRunIds: ids, failedRunIds: [] as string[] })),
    archiveAgentOrgRuns: vi.fn(async (ids: string[]) => ({ archivedRunIds: ids, failedRunIds: [] as string[] })),
    onAgentOrgArchived: vi.fn(async () => undefined),
    addToast: vi.fn(),
  };
  return { params, groupArchive: useWorkspaceHistoryGroupArchive(params) };
};

describe('useWorkspaceHistoryGroupArchive', () => {
  it('offers agent groups only when they hold a saved run, even if that run is running', () => {
    expect(canArchiveAgentGroup(agentNode([agentRun('draft-1', { source: 'draft' })]))).toBe(false);
    expect(canArchiveAgentGroup(agentNode([agentRun('local-1', { source: 'local' })]))).toBe(false);
    expect(canArchiveAgentGroup(agentNode([agentRun('run-1', { isActive: true })]))).toBe(true);
  });

  it('blocks a group with a running run before any dialog and archives nothing', () => {
    const { params, groupArchive } = buildHarness();

    groupArchive.onArchiveAgentGroup(workspaceNode, agentNode([agentRun('run-1'), agentRun('run-2', { isActive: true })]));
    groupArchive.onArchiveTeamGroup('ws-key', teamGroup([teamRun('team-1'), teamRun('team-2', { isActive: true })]));
    groupArchive.onArchiveTeamGroup('ws-key', teamGroup([teamRun('team-3', { deleteLifecycle: 'CLEANUP_PENDING' })]));
    groupArchive.onArchiveAgentOrgGroup('ws-key', orgGroup([orgRun('org-1', true)]));

    expect(groupArchive.showGroupArchiveConfirmation.value).toBe(false);
    expect(params.addToast.mock.calls).toEqual(Array(4).fill(['Stop running runs first.', 'warning']));
    expect(params.archiveAgentRunGroup).not.toHaveBeenCalled();
    expect(params.archiveTeamRuns).not.toHaveBeenCalled();
    expect(params.archiveAgentOrgRuns).not.toHaveBeenCalled();
  });

  it('does not let drafts or unsaved local runs block an agent group', () => {
    const { groupArchive } = buildHarness();
    groupArchive.onArchiveAgentGroup(workspaceNode, agentNode([
      agentRun('run-1'),
      agentRun('draft-1', { source: 'draft', isActive: true }),
      agentRun('local-1', { source: 'local', isActive: true }),
    ]));
    expect(groupArchive.showGroupArchiveConfirmation.value).toBe(true);
  });

  it('cancel closes the confirmation without archiving', () => {
    const { params, groupArchive } = buildHarness();
    groupArchive.onArchiveTeamGroup('ws-key', teamGroup([teamRun('team-1')]));
    expect(groupArchive.showGroupArchiveConfirmation.value).toBe(true);

    groupArchive.closeGroupArchiveConfirmation();

    expect(groupArchive.showGroupArchiveConfirmation.value).toBe(false);
    expect(params.archiveTeamRuns).not.toHaveBeenCalled();
    expect(params.addToast).not.toHaveBeenCalled();
  });

  it('archives a whole agent group through the server operation and reports one short summary', async () => {
    const { params, groupArchive } = buildHarness();
    groupArchive.onArchiveAgentGroup(workspaceNode, agentNode([agentRun('run-1')]));
    expect(groupArchive.groupArchiveConfirmationMessage.value).toBe('Codex — all runs will be hidden from history.');

    await groupArchive.confirmGroupArchive();

    expect(params.archiveAgentRunGroup).toHaveBeenCalledExactlyOnceWith('/ws/a', 'agent-def-1');
    expect(params.addToast).toHaveBeenCalledExactlyOnceWith('Archived 2 runs.', 'success');
    expect(groupArchive.showGroupArchiveConfirmation.value).toBe(false);
  });

  it('shows the blocked message when the server finds a running run beyond the visible list', async () => {
    const { params, groupArchive } = buildHarness();
    params.archiveAgentRunGroup.mockResolvedValueOnce({ archivedRunIds: [], activeRunIds: ['run-hidden'], failedRunIds: [] });
    groupArchive.onArchiveAgentGroup(workspaceNode, agentNode([agentRun('run-1')]));

    await groupArchive.confirmGroupArchive();

    expect(params.addToast).toHaveBeenCalledExactlyOnceWith('Stop running runs first.', 'warning');
  });

  it('archives the listed team runs with a counted confirmation and reports partial failures', async () => {
    const { params, groupArchive } = buildHarness();
    params.archiveTeamRuns.mockResolvedValueOnce({ archivedRunIds: ['team-1'], failedRunIds: ['team-2'] });
    groupArchive.onArchiveTeamGroup('ws-key', teamGroup([teamRun('team-1'), teamRun('team-2')]));
    expect(groupArchive.groupArchiveConfirmationMessage.value)
      .toBe('English Bridge Team · 2 runs will be hidden from history.');

    await groupArchive.confirmGroupArchive();

    expect(params.archiveTeamRuns).toHaveBeenCalledExactlyOnceWith(['team-1', 'team-2']);
    expect(params.addToast).toHaveBeenCalledExactlyOnceWith('Archived 1 run. 1 failed.', 'error');
  });

  it('reports a failure when nothing could be archived or the call throws', async () => {
    const { params, groupArchive } = buildHarness();
    params.archiveTeamRuns.mockResolvedValueOnce({ archivedRunIds: [], failedRunIds: ['team-1'] });
    groupArchive.onArchiveTeamGroup('ws-key', teamGroup([teamRun('team-1')]));
    await groupArchive.confirmGroupArchive();

    params.archiveAgentRunGroup.mockRejectedValueOnce(new Error('network down'));
    groupArchive.onArchiveAgentGroup(workspaceNode, agentNode([agentRun('run-1')]));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await groupArchive.confirmGroupArchive();

    expect(params.addToast.mock.calls).toEqual([
      ['Archive failed. Try again.', 'error'],
      ['Archive failed. Try again.', 'error'],
    ]);
  });

  it('archives Org runs, escapes the group name and leaves the route of each archived Org run', async () => {
    const { params, groupArchive } = buildHarness();
    params.archiveAgentOrgRuns.mockResolvedValueOnce({ archivedRunIds: ['org-1'], failedRunIds: ['org-2'] });
    groupArchive.onArchiveAgentOrgGroup('ws-key', orgGroup([orgRun('org-1'), orgRun('org-2')]));
    expect(groupArchive.groupArchiveConfirmationMessage.value)
      .toBe('Research &lt;Org&gt; · 2 runs will be hidden from history.');

    await groupArchive.confirmGroupArchive();

    expect(params.archiveAgentOrgRuns).toHaveBeenCalledExactlyOnceWith(['org-1', 'org-2']);
    expect(params.onAgentOrgArchived).toHaveBeenCalledExactlyOnceWith('org-1');
  });

  it('marks only the archiving group as pending and ignores repeat clicks until it settles', async () => {
    const { params, groupArchive } = buildHarness();
    const pending = deferred<{ archivedRunIds: string[]; failedRunIds: string[] }>();
    params.archiveTeamRuns.mockReturnValueOnce(pending.promise);
    const group = teamGroup([teamRun('team-1')]);
    const key = teamGroupArchiveKey('ws-key', 'team-def-1');

    groupArchive.onArchiveTeamGroup('ws-key', group);
    const running = groupArchive.confirmGroupArchive();
    expect(groupArchive.isGroupArchiving(key)).toBe(true);
    expect(groupArchive.isGroupArchiving(agentGroupArchiveKey('/ws/a', 'agent-def-1'))).toBe(false);
    expect(groupArchive.isGroupArchiving(agentOrgGroupArchiveKey('ws-key', 'org-def-1'))).toBe(false);

    groupArchive.onArchiveTeamGroup('ws-key', group);
    expect(groupArchive.showGroupArchiveConfirmation.value).toBe(false);

    pending.resolve({ archivedRunIds: ['team-1'], failedRunIds: [] });
    await running;
    expect(groupArchive.isGroupArchiving(key)).toBe(false);
    expect(params.archiveTeamRuns).toHaveBeenCalledOnce();
    expect(params.addToast).toHaveBeenCalledExactlyOnceWith('Archived 1 run.', 'success');
  });
});
