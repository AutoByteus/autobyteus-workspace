import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useMemoryExplorerStore } from '~/stores/memoryExplorerStore';
import { getApolloClient } from '~/utils/apolloClient';

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn() }));

describe('memoryExplorerStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('fetchAgents populates agents with memory from the BFF API', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      data: {
        listAgentsWithMemory: {
          entries: [{ attribution: 'DEFINITION', agentDefinitionId: 'codex', displayName: 'Codex', stableId: 'codex', runCount: 2, latestMemoryAt: '2026-01-01T00:00:00Z', memory: { hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: true, hasRawArchive: false } }],
          total: 1,
          page: 1,
          pageSize: 25,
          totalPages: 1,
        },
      },
    });
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);

    const store = useMemoryExplorerStore();
    await store.fetchAgents();

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][0].variables.source).toEqual({ type: 'LOCAL' });
    expect(store.agents.entries[0]?.displayName).toBe('Codex');
    expect(store.agents.total).toBe(1);
  });

  it('loads imported memory sources and sends the selected source in BFF calls', async () => {
    const importedSource = {
      key: 'imported:finance-node',
      type: 'IMPORTED',
      label: 'Imported: Finance Node',
      sourceNodeId: 'finance-node',
      displayName: 'Finance Node',
      readOnly: true,
      lastImportedAt: '2026-06-23T00:00:00Z',
      lastSyncStatus: 'success',
    };
    const queryMock = vi.fn()
      .mockResolvedValueOnce({
        data: {
          listMemoryExplorerSources: [
            {
              key: 'local',
              type: 'LOCAL',
              label: 'Local Memory',
              sourceNodeId: null,
              displayName: null,
              readOnly: false,
              lastImportedAt: null,
              lastSyncStatus: null,
            },
            importedSource,
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          listAgentsWithMemory: {
            entries: [{ attribution: 'DEFINITION', agentDefinitionId: 'finance-agent', displayName: 'Finance Agent', stableId: 'finance-agent', runCount: 1, latestMemoryAt: '2026-06-23T00:00:00Z', memory: { hasWorkingContext: false, hasEpisodic: false, hasSemantic: false, hasRawTraces: true, hasRawArchive: false } }],
            total: 1,
            page: 1,
            pageSize: 25,
            totalPages: 1,
          },
        },
      });
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);

    const store = useMemoryExplorerStore();
    const sources = await store.loadSources();
    store.agents.page = 3;
    store.selectedAgent = { attribution: 'DEFINITION', agentDefinitionId: 'codex', displayName: 'Codex', stableId: 'codex', runCount: 1, memory: store.emptyMemory() };

    expect(sources).toHaveLength(2);
    expect(store.setSelectedSourceByKey('imported:finance-node')).toBe(true);
    expect(store.selectedSource).toMatchObject(importedSource);
    expect(store.selectedSourceInput).toEqual({ type: 'IMPORTED', sourceNodeId: 'finance-node' });
    expect(store.selectedSourceQueryValue).toBe('imported:finance-node');
    expect(store.isImportedSource).toBe(true);
    expect(store.agents.page).toBe(1);
    expect(store.selectedAgent).toBeNull();

    await store.fetchAgents();

    expect(queryMock.mock.calls[1][0].variables.source).toEqual({ type: 'IMPORTED', sourceNodeId: 'finance-node' });
    expect(store.agents.entries[0]?.agentDefinitionId).toBe('finance-agent');
  });

  it('openAgentMemory fetches runs for the selected agent selector', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      data: { listAgentRunsWithMemory: { entries: [{ runId: 'run-1', memory: { hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: false, hasRawArchive: false } }], total: 1, page: 1, pageSize: 25, totalPages: 1 } },
    });
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);

    const store = useMemoryExplorerStore();
    await store.openAgentMemory({ attribution: 'DEFINITION', agentDefinitionId: 'codex', displayName: 'Codex', stableId: 'codex', runCount: 1, memory: store.emptyMemory() });

    expect(queryMock.mock.calls[0][0].variables.selector).toEqual({ attribution: 'DEFINITION', agentDefinitionId: 'codex' });
    expect(queryMock.mock.calls[0][0].variables.source).toEqual({ type: 'LOCAL' });
    expect(store.selectedAgent?.displayName).toBe('Codex');
    expect(store.agentRuns.entries[0]?.runId).toBe('run-1');
  });

  it('fetchTeamRuns preserves previous entries on error', async () => {
    vi.mocked(getApolloClient).mockReturnValue({ query: vi.fn().mockRejectedValue(new Error('boom')) } as any);
    const store = useMemoryExplorerStore();
    store.teamRuns.entries = [{ teamRunId: 'team-keep', teamDefinitionId: 'team', teamDefinitionName: 'Team', memory: store.emptyMemory(), memberTargets: [] }];

    await store.fetchTeamRuns('team');

    expect(store.teamRuns.error).toBe('boom');
    expect(store.teamRuns.entries[0]?.teamRunId).toBe('team-keep');
  });
});
