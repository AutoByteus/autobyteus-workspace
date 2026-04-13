import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openAgentRun } from '~/services/runOpen/agentRunOpenCoordinator';

const {
  loadRunContextHydrationPayloadMock,
  hydrateActivitiesFromProjectionMock,
  hydrateRunFileChangesMock,
  mergeHydratedRunFileChangesMock,
  selectRunMock,
  clearTeamRunConfigMock,
  clearAgentRunConfigMock,
  connectToAgentStreamMock,
  disconnectAgentStreamMock,
  patchConfigOnlyMock,
  upsertProjectionContextMock,
  getRunMock,
} = vi.hoisted(() => ({
  loadRunContextHydrationPayloadMock: vi.fn(),
  hydrateActivitiesFromProjectionMock: vi.fn(),
  hydrateRunFileChangesMock: vi.fn(),
  mergeHydratedRunFileChangesMock: vi.fn(),
  selectRunMock: vi.fn(),
  clearTeamRunConfigMock: vi.fn(),
  clearAgentRunConfigMock: vi.fn(),
  connectToAgentStreamMock: vi.fn(),
  disconnectAgentStreamMock: vi.fn(),
  patchConfigOnlyMock: vi.fn(),
  upsertProjectionContextMock: vi.fn(),
  getRunMock: vi.fn(),
}));

vi.mock('~/services/runHydration/runContextHydrationService', () => ({
  loadRunContextHydrationPayload: loadRunContextHydrationPayloadMock,
}));

vi.mock('~/services/runHydration/runProjectionActivityHydration', () => ({
  hydrateActivitiesFromProjection: hydrateActivitiesFromProjectionMock,
}));

vi.mock('~/services/runHydration/runFileChangeHydrationService', () => ({
  hydrateRunFileChanges: hydrateRunFileChangesMock,
  mergeHydratedRunFileChanges: mergeHydratedRunFileChangesMock,
}));

vi.mock('~/stores/agentContextsStore', () => ({
  useAgentContextsStore: () => ({
    getRun: getRunMock,
    patchConfigOnly: patchConfigOnlyMock,
    upsertProjectionContext: upsertProjectionContextMock,
  }),
}));

vi.mock('~/stores/agentSelectionStore', () => ({
  useAgentSelectionStore: () => ({
    selectRun: selectRunMock,
  }),
}));

vi.mock('~/stores/agentRunConfigStore', () => ({
  useAgentRunConfigStore: () => ({
    clearConfig: clearAgentRunConfigMock,
  }),
}));

vi.mock('~/stores/teamRunConfigStore', () => ({
  useTeamRunConfigStore: () => ({
    clearConfig: clearTeamRunConfigMock,
  }),
}));

vi.mock('~/stores/agentRunStore', () => ({
  useAgentRunStore: () => ({
    connectToAgentStream: connectToAgentStreamMock,
    disconnectAgentStream: disconnectAgentStreamMock,
  }),
}));

describe('openAgentRun', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merges authoritative file changes into an active subscribed context instead of skipping hydration', async () => {
    getRunMock.mockReturnValue({
      isSubscribed: true,
      state: { runId: 'run-1' },
    });
    loadRunContextHydrationPayloadMock.mockResolvedValue({
      runId: 'run-1',
      resumeConfig: {
        isActive: true,
        metadataConfig: {},
      },
      config: {
        isLocked: false,
      },
      conversation: {
        updatedAt: '2026-04-10T00:00:00.000Z',
      },
      activities: [
        {
          invocationId: 'tool-1',
          toolName: 'run_bash',
          status: 'success',
          contextText: 'pwd',
        },
      ],
      fileChanges: [
        {
          id: 'run-1:src/history.txt',
          runId: 'run-1',
          path: 'src/history.txt',
          type: 'file',
          status: 'available',
          sourceTool: 'edit_file',
          sourceInvocationId: 'edit-1',
          content: 'history',
          createdAt: '2026-04-10T00:00:00.000Z',
          updatedAt: '2026-04-10T00:00:00.000Z',
        },
      ],
    });

    await openAgentRun({
      runId: 'run-1',
      fallbackAgentName: 'Agent',
      ensureWorkspaceByRootPath: vi.fn(),
    });

    expect(patchConfigOnlyMock).toHaveBeenCalledWith('run-1', {
      isLocked: true,
    });
    expect(mergeHydratedRunFileChangesMock).toHaveBeenCalledWith('run-1', [
      expect.objectContaining({
        id: 'run-1:src/history.txt',
        path: 'src/history.txt',
      }),
    ]);
    expect(hydrateActivitiesFromProjectionMock).toHaveBeenCalledWith('run-1', [
      expect.objectContaining({
        invocationId: 'tool-1',
        toolName: 'run_bash',
      }),
    ]);
    expect(hydrateRunFileChangesMock).not.toHaveBeenCalled();
    expect(connectToAgentStreamMock).toHaveBeenCalledWith('run-1');
  });

  it('hydrates projected activities when reopening a historical run from projection', async () => {
    getRunMock.mockReturnValue(undefined);
    loadRunContextHydrationPayloadMock.mockResolvedValue({
      runId: 'run-2',
      resumeConfig: {
        isActive: false,
        metadataConfig: {},
      },
      config: {
        isLocked: false,
      },
      conversation: {
        updatedAt: '2026-04-10T00:00:00.000Z',
      },
      activities: [
        {
          invocationId: 'history-2',
          toolName: 'write_file',
          status: 'success',
          contextText: 'fibonacci.py',
        },
      ],
      fileChanges: [],
    });

    await openAgentRun({
      runId: 'run-2',
      fallbackAgentName: 'Agent',
      ensureWorkspaceByRootPath: vi.fn(),
    });

    expect(upsertProjectionContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-2',
      }),
    );
    expect(hydrateActivitiesFromProjectionMock).toHaveBeenCalledWith('run-2', [
      expect.objectContaining({
        invocationId: 'history-2',
        toolName: 'write_file',
      }),
    ]);
    expect(hydrateRunFileChangesMock).toHaveBeenCalledWith('run-2', []);
    expect(connectToAgentStreamMock).not.toHaveBeenCalled();
  });
});
