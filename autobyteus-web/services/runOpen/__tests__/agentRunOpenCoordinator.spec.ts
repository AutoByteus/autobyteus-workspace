import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ArchivedAgentRunOpenError, openAgentRun } from '~/services/runOpen/agentRunOpenCoordinator';

const mocks = vi.hoisted(() => ({
  loadCandidate: vi.fn(), hydrateFiles: vi.fn(), mergeFiles: vi.fn(), selectRun: vi.fn(),
  selectRunWithoutShellNavigation: vi.fn(), clearTeamConfig: vi.fn(), clearAgentConfig: vi.fn(),
  connect: vi.fn(), disconnect: vi.fn(), patchConfig: vi.fn(), upsertContext: vi.fn(),
  getRun: vi.fn(), isStreamReady: vi.fn(), replaceActivities: vi.fn(), primeBaseline: vi.fn(),
}));

vi.mock('~/services/runHydration/runContextHydrationService', () => ({
  loadRunContextHydrationCandidate: mocks.loadCandidate,
}));
vi.mock('~/services/runHydration/runFileChangeHydrationService', () => ({
  hydrateRunFileChanges: mocks.hydrateFiles,
  mergeHydratedRunFileChanges: mocks.mergeFiles,
}));
vi.mock('~/services/eventMonitor/recentEventMonitorMutationCoordinator', () => ({
  primeRecentEventMonitorBaseline: mocks.primeBaseline,
}));
vi.mock('~/stores/agentActivityStore', () => ({
  useAgentActivityStore: () => ({ replaceProjectionActivitiesIfRevisions: mocks.replaceActivities }),
}));
vi.mock('~/stores/agentContextsStore', () => ({
  useAgentContextsStore: () => ({
    getRun: mocks.getRun, patchConfigOnly: mocks.patchConfig, upsertProjectionContext: mocks.upsertContext,
  }),
}));
vi.mock('~/stores/agentSelectionStore', () => ({
  useAgentSelectionStore: () => ({
    beginSelectionIntent: () => ({ isCurrent: () => true }),
    selectRun: mocks.selectRun, selectRunWithoutShellNavigation: mocks.selectRunWithoutShellNavigation,
  }),
}));
vi.mock('~/stores/agentRunConfigStore', () => ({
  useAgentRunConfigStore: () => ({ clearConfig: mocks.clearAgentConfig }),
}));
vi.mock('~/stores/teamRunConfigStore', () => ({
  useTeamRunConfigStore: () => ({ clearConfig: mocks.clearTeamConfig }),
}));
vi.mock('~/stores/agentRunStore', () => ({
  useAgentRunStore: () => ({
    connectToAgentStream: mocks.connect,
    disconnectAgentStream: mocks.disconnect,
    isAgentStreamReady: mocks.isStreamReady,
  }),
}));

const candidate = (runId: string, isActive: boolean) => ({
  runId,
  resumeConfig: { runId, isActive, metadataConfig: {} },
  config: { isLocked: false },
  conversation: {
    id: runId, messages: [], createdAt: '2026-04-10T00:00:00.000Z', updatedAt: '2026-04-10T00:00:00.000Z',
  },
  activities: [{ activityId: 'projection', activityType: 'system', message: 'projected', timestamp: new Date(1) }],
  expectedActivityRevision: 4,
  fileChanges: [{ id: `${runId}:history`, runId, path: 'history', type: 'file', status: 'available' }],
  hasEarlierActiveTraceEvents: false,
});

describe('openAgentRun', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isStreamReady.mockReturnValue(false);
    mocks.replaceActivities.mockReturnValue('applied');
    mocks.upsertContext.mockImplementation(({ runId, conversation }) => ({ state: { runId, conversation } }));
  });

  it('keeps the subscribed live context and its Activity while merging projected file changes', async () => {
    const liveContext = { state: { runId: 'run-1' } };
    mocks.getRun.mockReturnValue(liveContext);
    mocks.isStreamReady.mockReturnValue(true);
    mocks.loadCandidate.mockResolvedValue(candidate('run-1', true));

    await openAgentRun({ runId: 'run-1', fallbackAgentName: 'Agent', resolveWorkspaceMetadataByRootPath: vi.fn() });

    expect(mocks.patchConfig).toHaveBeenCalledWith('run-1', { isLocked: true });
    expect(mocks.mergeFiles).toHaveBeenCalledWith('run-1', expect.any(Array));
    expect(mocks.replaceActivities).not.toHaveBeenCalled();
    expect(mocks.upsertContext).not.toHaveBeenCalled();
    expect(mocks.primeBaseline).toHaveBeenCalledWith(liveContext);
    expect(mocks.connect).toHaveBeenCalledWith('run-1');
  });

  it('commits historical Activity before context, selection, and stream cleanup', async () => {
    mocks.getRun.mockReturnValue(undefined);
    mocks.loadCandidate.mockResolvedValue(candidate('run-2', false));

    await openAgentRun({ runId: 'run-2', fallbackAgentName: 'Agent', resolveWorkspaceMetadataByRootPath: vi.fn() });

    expect(mocks.replaceActivities).toHaveBeenCalledWith([{
      runId: 'run-2', expectedRevision: 4, activities: expect.any(Array),
    }]);
    expect(mocks.replaceActivities.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.upsertContext.mock.invocationCallOrder[0]!);
    expect(mocks.upsertContext).toHaveBeenCalledWith(expect.objectContaining({ runId: 'run-2' }));
    expect(mocks.hydrateFiles).toHaveBeenCalledWith('run-2', expect.any(Array));
    expect(mocks.selectRun).toHaveBeenCalledWith('run-2', 'agent');
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it('rejects an Activity conflict before context publication or selection', async () => {
    mocks.getRun.mockReturnValue(undefined);
    mocks.loadCandidate.mockResolvedValue(candidate('run-3', false));
    mocks.replaceActivities.mockReturnValue('conflict');

    await expect(openAgentRun({
      runId: 'run-3', fallbackAgentName: 'Agent', resolveWorkspaceMetadataByRootPath: vi.fn(),
    })).rejects.toThrow("Agent activity for 'run-3' changed before projection commit.");

    expect(mocks.upsertContext).not.toHaveBeenCalled();
    expect(mocks.selectRun).not.toHaveBeenCalled();
  });

  it('rejects a context identity change before touching Activity', async () => {
    mocks.getRun.mockReturnValueOnce(undefined).mockReturnValueOnce({ state: { runId: 'run-4' } });
    mocks.loadCandidate.mockResolvedValue(candidate('run-4', false));

    await expect(openAgentRun({
      runId: 'run-4', fallbackAgentName: 'Agent', resolveWorkspaceMetadataByRootPath: vi.fn(),
    })).rejects.toThrow("Agent run 'run-4' changed before projection commit.");

    expect(mocks.replaceActivities).not.toHaveBeenCalled();
    expect(mocks.upsertContext).not.toHaveBeenCalled();
  });
  it.each(['success', 'error'])('superseded Agent %s never publishes candidate or selection', async (completion) => {
    mocks.getRun.mockReturnValue(undefined);
    let current = true, resolve!: (value: unknown) => void, reject!: (error: Error) => void;
    mocks.loadCandidate.mockReturnValue(new Promise((yes, no) => { resolve = yes; reject = no; }));
    const pending = openAgentRun({ runId: 'old', fallbackAgentName: null, selectionIntent: { isCurrent: () => current }, resolveWorkspaceMetadataByRootPath: vi.fn() });
    current = false;
    if (completion === 'success') resolve(candidate('old', false)); else reject(new Error('old failure'));
    expect(await pending).toEqual({ disposition: 'superseded' });
    expect(mocks.replaceActivities).not.toHaveBeenCalled(); expect(mocks.upsertContext).not.toHaveBeenCalled();
    expect(mocks.selectRun).not.toHaveBeenCalled(); expect(mocks.clearAgentConfig).not.toHaveBeenCalled();
  });

  describe('archived runs', () => {
    const withEditability = (runId: string, isActive: boolean, reason: string | null) => {
      const value = candidate(runId, isActive);
      return {
        ...value,
        resumeConfig: { ...value.resumeConfig, modelConfigEditability: { editable: reason === null, reason } },
      };
    };

    it('refuses an archived, stopped run before any Activity, context, selection or stream change', async () => {
      mocks.getRun.mockReturnValue(undefined);
      mocks.loadCandidate.mockResolvedValue(withEditability('archived-1', false, 'RUN_ARCHIVED'));

      const pending = openAgentRun({ runId: 'archived-1', fallbackAgentName: null, resolveWorkspaceMetadataByRootPath: vi.fn() });

      await expect(pending).rejects.toBeInstanceOf(ArchivedAgentRunOpenError);
      await expect(pending).rejects.toMatchObject({ runId: 'archived-1' });
      expect(mocks.replaceActivities).not.toHaveBeenCalled();
      expect(mocks.upsertContext).not.toHaveBeenCalled();
      expect(mocks.patchConfig).not.toHaveBeenCalled();
      expect(mocks.hydrateFiles).not.toHaveBeenCalled();
      expect(mocks.selectRun).not.toHaveBeenCalled();
      expect(mocks.selectRunWithoutShellNavigation).not.toHaveBeenCalled();
      expect(mocks.connect).not.toHaveBeenCalled();
    });

    it('still opens an archived run that is active, so no live run is hidden', async () => {
      mocks.getRun.mockReturnValue(undefined);
      mocks.loadCandidate.mockResolvedValue(withEditability('archived-live', true, 'RUN_ARCHIVED'));

      await openAgentRun({ runId: 'archived-live', fallbackAgentName: null, resolveWorkspaceMetadataByRootPath: vi.fn() });

      expect(mocks.upsertContext).toHaveBeenCalledWith(expect.objectContaining({ runId: 'archived-live' }));
      expect(mocks.selectRun).toHaveBeenCalledWith('archived-live', 'agent');
      expect(mocks.connect).toHaveBeenCalledWith('archived-live');
    });

    it('opens a stopped run that is not archived', async () => {
      mocks.getRun.mockReturnValue(undefined);
      mocks.loadCandidate.mockResolvedValue(withEditability('stopped-1', false, null));

      await openAgentRun({ runId: 'stopped-1', fallbackAgentName: null, resolveWorkspaceMetadataByRootPath: vi.fn() });

      expect(mocks.upsertContext).toHaveBeenCalledWith(expect.objectContaining({ runId: 'stopped-1' }));
      expect(mocks.selectRun).toHaveBeenCalledWith('stopped-1', 'agent');
    });
  });
});
