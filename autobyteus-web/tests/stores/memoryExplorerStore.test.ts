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

  it('route agent selection fetches runs for the selected agent selector', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      data: { listAgentRunsWithMemory: { entries: [{ runId: 'run-1', memory: { hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: false, hasRawArchive: false } }], total: 1, page: 1, pageSize: 25, totalPages: 1 } },
    });
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);

    const store = useMemoryExplorerStore();
    store.setSelectedAgentFromRoute({ attribution: 'DEFINITION', agentDefinitionId: 'codex' }, 'Codex');
    await store.fetchAgentRuns({ attribution: 'DEFINITION', agentDefinitionId: 'codex' });

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][0].variables.selector).toEqual({ attribution: 'DEFINITION', agentDefinitionId: 'codex' });
    expect(queryMock.mock.calls[0][0].variables.source).toEqual({ type: 'LOCAL' });
    expect(store.selectedAgent?.displayName).toBe('Codex');
    expect(store.agentRuns.entries[0]?.runId).toBe('run-1');
  });

  it('resets a detail list only when the selected team, org or agent identity changes (REQ-003)', () => {
    const store = useMemoryExplorerStore();
    const staleTeamRun = { teamRunId: 'team-a-run', teamDefinitionId: 'team-a', teamDefinitionName: 'Team A', memory: store.emptyMemory(), memberTargets: [] };

    store.setSelectedTeamFromRoute('team-a', 'Team A');
    store.teamRuns.entries = [staleTeamRun];
    store.teamRuns.total = 1;
    store.teamRuns.page = 3;
    store.teamRuns.totalPages = 4;
    store.teamRuns.search = 'plan';

    // Returning to the same team (for example from the inspector) keeps page and search.
    store.setSelectedTeamFromRoute('team-a', 'Team A');
    expect(store.teamRuns).toMatchObject({ entries: [staleTeamRun], page: 3, search: 'plan' });

    // Another team never shows team A's runs.
    store.setSelectedTeamFromRoute('team-b', 'Team B');
    expect(store.teamRuns).toMatchObject({ entries: [], total: 0, page: 1, totalPages: 1, search: '' });
    expect(store.selectedTeam?.teamDefinitionName).toBe('Team B');

    // A fresh card click from Home clears the selection first, so even the same team starts clean.
    store.teamRuns.entries = [staleTeamRun];
    store.setHomeTab('teams');
    store.setSelectedTeamFromRoute('team-b', 'Team B');
    expect(store.teamRuns.entries).toEqual([]);

    store.setSelectedOrgFromRoute('org-a', 'Alpha Org');
    store.orgRuns.entries = [{ orgRunId: 'org-a-run', orgDefinitionId: 'org-a', orgDefinitionName: 'Alpha Org', memory: store.emptyMemory(), memberTargets: [] }];
    store.setSelectedOrgFromRoute('org-b', null);
    expect(store.orgRuns.entries).toEqual([]);
    expect(store.selectedOrg?.orgDefinitionName).toBe('org-b');
    expect(store.selectedTeam).toBeNull();

    store.setSelectedAgentFromRoute({ attribution: 'DEFINITION', agentDefinitionId: 'codex' }, 'Codex');
    store.agentRuns.entries = [{ runId: 'codex-run', memory: store.emptyMemory() }];
    store.setSelectedAgentFromRoute({ attribution: 'DEFINITION', agentDefinitionId: 'codex' }, 'Codex');
    expect(store.agentRuns.entries).toHaveLength(1);
    store.setSelectedAgentFromRoute({ attribution: 'UNATTRIBUTED' });
    expect(store.agentRuns.entries).toEqual([]);
  });

  it('ignores a late response for the previous selection after the identity changes', async () => {
    let resolveFirst!: (value: unknown) => void;
    const queryMock = vi.fn()
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce({ data: { listAgentTeamRunsWithMemory: { entries: [{ teamRunId: 'team-b-run', teamDefinitionId: 'team-b', teamDefinitionName: 'Team B', memory: { hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: false, hasRawArchive: false }, memberTargets: [] }], total: 1, page: 1, pageSize: 25, totalPages: 1 } } });
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);
    const store = useMemoryExplorerStore();

    store.setSelectedTeamFromRoute('team-a', 'Team A');
    const first = store.fetchTeamRuns('team-a');
    store.setSelectedTeamFromRoute('team-b', 'Team B');
    await store.fetchTeamRuns('team-b');
    resolveFirst({ data: { listAgentTeamRunsWithMemory: { entries: [{ teamRunId: 'team-a-run' }], total: 1, page: 1, pageSize: 25, totalPages: 1 } } });
    await first;

    expect(store.teamRuns.entries.map((entry) => entry.teamRunId)).toEqual(['team-b-run']);
    expect(store.teamRuns.loading).toBe(false);
  });

  it('fetches Agent Orgs and one org definition\'s runs with the selected source', async () => {
    const memory = { hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: false, hasRawArchive: false };
    const queryMock = vi.fn()
      .mockResolvedValueOnce({ data: { listAgentOrgsWithMemory: { entries: [{ orgDefinitionId: 'org-a', orgDefinitionName: 'Alpha Org', orgRunCount: 2, memberMemoryCount: 3, memory }], total: 1, page: 1, pageSize: 25, totalPages: 1 } } })
      .mockResolvedValueOnce({ data: { listAgentOrgRunsWithMemory: { entries: [{ orgRunId: 'org-run-1', orgDefinitionId: 'org-a', orgDefinitionName: 'Alpha Org', memory, memberTargets: [{ memberAddress: '/ceo', displayName: 'ceo', agentRunId: 'ceo-run', memory }] }], total: 1, page: 1, pageSize: 25, totalPages: 1 } } })
      .mockResolvedValueOnce({ data: { listAgentOrgRunsWithMemory: { entries: [], total: 0, page: 2, pageSize: 25, totalPages: 1 } } });
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);
    const store = useMemoryExplorerStore();

    await store.fetchHomeTab('orgs');
    expect(queryMock.mock.calls[0][0].variables).toMatchObject({ source: { type: 'LOCAL' }, search: null, page: 1, pageSize: 25 });
    expect(store.orgs.entries[0]?.orgDefinitionName).toBe('Alpha Org');

    await store.setOrgRunsSearch('org-a', 'ceo');
    expect(queryMock.mock.calls[1][0].variables).toMatchObject({ orgDefinitionId: 'org-a', search: 'ceo', page: 1 });
    expect(store.orgRuns.entries[0]?.memberTargets[0]?.displayName).toBe('ceo');

    await store.changeOrgRunsPage('org-a', 2);
    expect(queryMock.mock.calls[2][0].variables).toMatchObject({ orgDefinitionId: 'org-a', search: 'ceo', page: 2 });
  });

  it('fetchTeamRuns preserves previous entries on error', async () => {
    vi.mocked(getApolloClient).mockReturnValue({ query: vi.fn().mockRejectedValue(new Error('boom')) } as any);
    const store = useMemoryExplorerStore();
    store.teamRuns.entries = [{ teamRunId: 'team-keep', teamDefinitionId: 'team', teamDefinitionName: 'Team', memory: store.emptyMemory(), memberTargets: [] }];

    await store.fetchTeamRuns('team');

    expect(store.teamRuns.error).toBe('boom');
    expect(store.teamRuns.entries[0]?.teamRunId).toBe('team-keep');
  });

  it('loadSources only replaces the list: it never changes the selected source, and a failure keeps the previous list (REQ-011)', async () => {
    const local = { key: 'local', type: 'LOCAL', label: 'Local Memory', sourceNodeId: null, displayName: null, readOnly: false, lastImportedAt: null, lastSyncStatus: null };
    const imported = { ...local, key: 'imported:finance', type: 'IMPORTED', label: 'Imported: Finance', sourceNodeId: 'finance', readOnly: true };
    const queryMock = vi.fn()
      .mockResolvedValueOnce({ data: { listMemoryExplorerSources: [local, imported] } })
      .mockResolvedValueOnce({ data: { listMemoryExplorerSources: [local] } })
      .mockRejectedValueOnce(new Error('hub offline'));
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);
    const store = useMemoryExplorerStore();
    expect(store.sourcesLoaded).toBe(false);
    expect(store.hasSource('local')).toBe(true);

    await store.loadSources();
    expect(store.sourcesLoaded).toBe(true);
    expect(store.hasSource('imported:finance')).toBe(true);
    expect(store.setSelectedSourceByKey('imported:finance')).toBe(true);

    await store.loadSources();
    expect(store.hasSource('imported:finance')).toBe(false);
    expect(store.selectedSource.key).toBe('imported:finance');

    await store.loadSources();
    expect(store.sourceError).toBe('hub offline');
    expect(store.sources.map((source) => source.key)).toEqual(['local']);
    expect(store.selectedSource.key).toBe('imported:finance');
    expect(store.sourceLoading).toBe(false);
  });

  it('shares one in-flight sources request between concurrent loadSources calls', async () => {
    let resolveSources!: (value: unknown) => void;
    const queryMock = vi.fn().mockReturnValue(new Promise((resolve) => { resolveSources = resolve; }));
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);
    const store = useMemoryExplorerStore();

    const first = store.loadSources();
    const second = store.loadSources();
    expect(queryMock).toHaveBeenCalledTimes(1);
    resolveSources({ data: { listMemoryExplorerSources: [] } });
    expect(await first).toBe(await second);

    queryMock.mockResolvedValueOnce({ data: { listMemoryExplorerSources: [] } });
    await store.loadSources();
    expect(queryMock).toHaveBeenCalledTimes(2);
  });
});
