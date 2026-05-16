import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { openAgentRun } from '~/services/runOpen/agentRunOpenCoordinator';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { AgentStatus } from '~/types/agent/AgentStatus';

const {
  loadRunContextHydrationPayloadMock,
  hydrateActivitiesFromProjectionMock,
  hydrateRunFileChangesMock,
  mergeHydratedRunFileChangesMock,
  connectToAgentStreamMock,
  disconnectAgentStreamMock,
  selectRunMock,
  clearTeamRunConfigMock,
  clearAgentRunConfigMock,
} = vi.hoisted(() => ({
  loadRunContextHydrationPayloadMock: vi.fn(),
  hydrateActivitiesFromProjectionMock: vi.fn(),
  hydrateRunFileChangesMock: vi.fn(),
  mergeHydratedRunFileChangesMock: vi.fn(),
  connectToAgentStreamMock: vi.fn(),
  disconnectAgentStreamMock: vi.fn(),
  selectRunMock: vi.fn(),
  clearTeamRunConfigMock: vi.fn(),
  clearAgentRunConfigMock: vi.fn(),
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

vi.mock('~/stores/agentRunStore', () => ({
  useAgentRunStore: () => ({
    connectToAgentStream: connectToAgentStreamMock,
    disconnectAgentStream: disconnectAgentStreamMock,
  }),
}));

vi.mock('~/stores/agentSelectionStore', () => ({
  useAgentSelectionStore: () => ({
    selectRun: selectRunMock,
  }),
}));

vi.mock('~/stores/teamRunConfigStore', () => ({
  useTeamRunConfigStore: () => ({
    clearConfig: clearTeamRunConfigMock,
  }),
}));

vi.mock('~/stores/agentRunConfigStore', () => ({
  useAgentRunConfigStore: () => ({
    clearConfig: clearAgentRunConfigMock,
  }),
}));

const buildConfig = (isLocked = true) => ({
  agentDefinitionId: 'agent-def-1',
  agentDefinitionName: 'SuperAgent',
  llmModelIdentifier: 'gpt-test',
  runtimeKind: 'codex_app_server',
  workspaceId: 'ws-1',
  autoExecuteTools: false,
  skillAccessMode: 'PRELOADED_ONLY',
  llmConfig: null,
  isLocked,
} as any);

const buildConversation = (updatedAt: string) => ({
  id: 'run-offline-1',
  messages: [],
  createdAt: '2026-05-16T00:00:00.000Z',
  updatedAt,
} as any);

describe('openAgentRun integration with real agent context store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    disconnectAgentStreamMock.mockImplementation((runId: string) => {
      const context = useAgentContextsStore().getRun(runId);
      if (context) {
        context.isSubscribed = false;
      }
    });
  });

  it('clears stale interrupt permission when an existing subscribed run is reopened as inactive/offline', async () => {
    const runId = 'run-offline-1';
    const store = useAgentContextsStore();
    store.upsertProjectionContext({
      runId,
      config: buildConfig(true),
      conversation: buildConversation('2026-05-16T00:01:00.000Z'),
      status: AgentStatus.Running,
    });
    const existing = store.getRun(runId)!;
    existing.isSubscribed = true;
    existing.state.canInterrupt = true;

    const offlineConversation = buildConversation('2026-05-16T00:02:00.000Z');
    loadRunContextHydrationPayloadMock.mockResolvedValue({
      runId,
      resumeConfig: {
        runId,
        isActive: false,
        metadataConfig: {},
      },
      config: buildConfig(false),
      conversation: offlineConversation,
      activities: [],
      fileChanges: [],
    });

    await openAgentRun({
      runId,
      fallbackAgentName: 'SuperAgent',
      ensureWorkspaceByRootPath: vi.fn(),
      selectRun: false,
    });

    expect(existing.state.currentStatus).toBe(AgentStatus.Offline);
    expect(existing.state.canInterrupt).toBe(false);
    expect(existing.state.conversation).toEqual(offlineConversation);
    expect(disconnectAgentStreamMock).toHaveBeenCalledWith(runId);
    expect(existing.isSubscribed).toBe(false);
    expect(connectToAgentStreamMock).not.toHaveBeenCalled();
  });
});
