import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useMemoryExplorerStore } from '~/stores/memoryExplorerStore';
import { getApolloClient } from '~/utils/apolloClient';

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn() }));

const page = <T>(entries: T[], extra: Record<string, unknown> = {}) => ({ entries, total: entries.length, page: 1, pageSize: 25, totalPages: 1, ...extra });
const operationOf = (call: any): string => call[0].query.definitions[0].name.value;
const memory = { hasWorkJournal: true, hasRawTraces: false, hasRawArchive: false };

/** A query mock answering by operation name; every call is recorded. */
const answering = (answers: Record<string, (variables: any) => unknown>) => {
  const queryMock = vi.fn(async (options: any) => {
    const name = options.query.definitions[0].name.value as string;
    const answer = answers[name];
    if (!answer) throw new Error(`unexpected ${name}`);
    return { data: answer(options.variables) };
  });
  vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);
  return queryMock;
};

const owners = {
  ListAgentsWithMemory: () => ({ listAgentsWithMemory: page([
    { attribution: 'DEFINITION', agentDefinitionId: 'researcher', displayName: 'Research Assistant', stableId: 'researcher', runCount: 2, latestMemoryAt: '2026-11-20T10:00:00Z' },
    { attribution: 'UNATTRIBUTED', agentDefinitionId: null, displayName: 'Unattributed runs', stableId: 'unattributed', runCount: 1, latestMemoryAt: null },
  ]) }),
  ListAgentTeamsWithMemory: () => ({ listAgentTeamsWithMemory: page([{ teamDefinitionId: 'se-team', teamDefinitionName: 'Software Engineering Team', teamRunCount: 3, memberMemoryCount: 2, memberCount: 4, memory }]) }),
  ListAgentOrgsWithMemory: () => ({ listAgentOrgsWithMemory: page([{ orgDefinitionId: 'launch-org', orgDefinitionName: 'Launch Org', orgRunCount: 1, memberMemoryCount: 1, memberCount: 2, memory }]) }),
};

describe('memoryExplorerStore (Browse by owner, autobyteus-554)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('loads every owner card of the selected source at once (no paging) and only once per source for an owner page', async () => {
    const queryMock = answering(owners);
    const store = useMemoryExplorerStore();
    await store.fetchOwners();

    expect(queryMock.mock.calls.map(operationOf).sort()).toEqual(['ListAgentOrgsWithMemory', 'ListAgentTeamsWithMemory', 'ListAgentsWithMemory']);
    expect(queryMock.mock.calls[0]![0].variables).toMatchObject({ source: { type: 'LOCAL' }, search: null, page: 1, pageSize: 500 });
    expect(store.agents.entries.map((agent) => agent.displayName)).toEqual(['Research Assistant', 'Unattributed runs']);
    expect(store.teams.entries[0]?.memberCount).toBe(4);

    await store.ensureOwners();
    expect(queryMock).toHaveBeenCalledTimes(3);
  });

  it('a source change clears every list of the previous source and sends the new source', async () => {
    const imported = { key: 'imported:finance', type: 'IMPORTED', label: 'Imported: Finance', memorySyncSourceId: 'finance', displayName: 'Finance', readOnly: true, lastImportedAt: null, lastSyncStatus: null };
    const queryMock = answering({
      ...owners,
      ListMemoryExplorerSources: () => ({ listMemoryExplorerSources: [{ ...imported, key: 'local', type: 'LOCAL', memorySyncSourceId: null, readOnly: false }, imported] }),
      ListAgentEpisodes: () => ({ listAgentEpisodes: page([{ runId: 'r1', subject: { kind: 'AGENT', runId: 'r1', agentDefinitionId: 'researcher' }, memory }]) }),
    });
    const store = useMemoryExplorerStore();
    await store.loadSources();
    await store.fetchOwners();
    await store.fetchEpisodes({ attribution: 'DEFINITION', agentDefinitionId: 'researcher' });
    store.groupMembers['TEAM:se-team'] = [];

    expect(store.setSelectedSourceByKey('imported:finance')).toBe(true);
    expect(store.isImportedSource).toBe(true);
    expect(store.agents.entries).toEqual([]);
    expect(store.episodes.entries).toEqual([]);
    expect(store.groupMembers).toEqual({});
    expect(store.ownersSourceKey).toBeNull();

    await store.ensureOwners();
    expect(queryMock.mock.calls.at(-1)![0].variables.source).toEqual({ type: 'IMPORTED', memorySyncSourceId: 'finance' });
  });

  it("loads an agent's episodes by its selector, with the filter and page; another agent's list never shows", async () => {
    const queryMock = answering({
      ListAgentEpisodes: (variables) => ({ listAgentEpisodes: page([{ runId: `${variables.selector.agentDefinitionId ?? 'unattributed'}-run`, subject: { kind: 'AGENT', runId: 'x', agentDefinitionId: null }, memory }], { total: 30, totalPages: 2, page: variables.page }) }),
    });
    const store = useMemoryExplorerStore();
    const researcher = { attribution: 'DEFINITION' as const, agentDefinitionId: 'researcher' };
    await store.fetchEpisodes(researcher);
    expect(store.episodes.ownerKey).toBe('DEFINITION:researcher');
    expect(queryMock.mock.calls[0]![0].variables).toMatchObject({ selector: researcher, source: { type: 'LOCAL' }, pageSize: 24 });

    await store.setEpisodesSearch(researcher, 'spec');
    await store.changeEpisodesPage(researcher, 2);
    expect(queryMock.mock.calls[2]![0].variables).toMatchObject({ search: 'spec', page: 2 });
    expect(store.episodes.page).toBe(2);

    store.episodes.entries = [{ runId: 'stale', subject: { kind: 'AGENT', runId: 'stale', agentDefinitionId: 'researcher' }, memory }];
    const other = store.fetchEpisodes({ attribution: 'UNATTRIBUTED' });
    expect(store.episodes.entries).toEqual([]);
    expect(store.episodes.search).toBe('');
    await other;
    expect(store.episodes.entries.map((episode) => episode.runId)).toEqual(['unattributed-run']);
  });

  it("loads a group's members and knows where an agent works: its team (team-local) and the teams and orgs that list it", async () => {
    const queryMock = answering({
      ...owners,
      ListMemoryGroupMembers: (variables) => ({ listMemoryGroupMembers: variables.kind === 'TEAM'
        ? [{ kind: 'AGENT', id: 'team-local-agent:se-team:designer', name: 'Solution Designer', shared: false }, { kind: 'AGENT', id: 'researcher', name: 'Research Assistant', shared: true }]
        : [{ kind: 'TEAM', id: 'se-team', name: 'Software Engineering Team', shared: true, memberCount: 2 }, { kind: 'AGENT', id: 'researcher', name: 'Research Assistant', shared: true }] }),
    });
    const store = useMemoryExplorerStore();
    await store.fetchOwners();
    await store.fetchMembers('TEAM', 'se-team');
    expect(store.members.key).toBe('TEAM:se-team');
    expect(store.members.entries.map((member) => member.name)).toEqual(['Solution Designer', 'Research Assistant']);

    await store.loadAllGroupMembers();
    expect(queryMock.mock.calls.filter((call) => operationOf(call) === 'ListMemoryGroupMembers').map((call) => call[0].variables.kind)).toEqual(['TEAM', 'ORG']);
    expect(store.placesOf('team-local-agent:se-team:designer')).toEqual([{ kind: 'TEAM', id: 'se-team', name: 'Software Engineering Team', local: true }]);
    expect(store.placesOf('researcher').map((place) => [place.name, place.local])).toEqual([['Software Engineering Team', false], ['Launch Org', false]]);
    expect(store.placesOf('nobody')).toEqual([]);
  });

  it('resets a runs list only when the selected team or org changes', () => {
    const store = useMemoryExplorerStore();
    const staleTeamRun = { teamRunId: 'team-a-run', teamDefinitionId: 'team-a', teamDefinitionName: 'Team A', memory: store.emptyMemory(), memberTargets: [] };

    store.setSelectedTeamFromRoute('team-a', 'Team A');
    store.teamRuns.entries = [staleTeamRun];
    store.teamRuns.page = 3;
    store.teamRuns.search = 'plan';
    // Returning to the same team (for example from the inspector) keeps page and search.
    store.setSelectedTeamFromRoute('team-a', 'Team A');
    expect(store.teamRuns).toMatchObject({ entries: [staleTeamRun], page: 3, search: 'plan' });

    store.setSelectedTeamFromRoute('team-b', 'Team B');
    expect(store.teamRuns).toMatchObject({ entries: [], total: 0, page: 1, totalPages: 1, search: '' });
    expect(store.selectedTeam?.teamDefinitionName).toBe('Team B');

    store.setSelectedOrgFromRoute('org-a', 'Alpha Org');
    store.orgRuns.entries = [{ orgRunId: 'org-a-run', orgDefinitionId: 'org-a', orgDefinitionName: 'Alpha Org', memory: store.emptyMemory(), memberTargets: [] }];
    store.setSelectedOrgFromRoute('org-b', null);
    expect(store.orgRuns.entries).toEqual([]);
    expect(store.selectedOrg?.orgDefinitionName).toBe('org-b');
  });

  it('ignores a late response for the previous team after the identity changes', async () => {
    let resolveFirst!: (value: unknown) => void;
    const queryMock = vi.fn()
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce({ data: { listAgentTeamRunsWithMemory: page([{ teamRunId: 'team-b-run', teamDefinitionId: 'team-b', teamDefinitionName: 'Team B', memory, memberTargets: [] }]) } });
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);
    const store = useMemoryExplorerStore();

    store.setSelectedTeamFromRoute('team-a', 'Team A');
    const first = store.fetchTeamRuns('team-a');
    store.setSelectedTeamFromRoute('team-b', 'Team B');
    await store.fetchTeamRuns('team-b');
    resolveFirst({ data: { listAgentTeamRunsWithMemory: page([{ teamRunId: 'team-a-run' }]) } });
    await first;

    expect(store.teamRuns.entries.map((entry) => entry.teamRunId)).toEqual(['team-b-run']);
    expect(store.teamRuns.loading).toBe(false);
  });

  it("searches and pages an org's runs with the selected source", async () => {
    const queryMock = vi.fn()
      .mockResolvedValueOnce({ data: { listAgentOrgRunsWithMemory: page([{ orgRunId: 'org-run-1', orgDefinitionId: 'org-a', orgDefinitionName: 'Alpha Org', memory, memberTargets: [{ memberAddress: '/ceo', displayName: 'ceo', agentRunId: 'ceo-run', memory }] }]) } })
      .mockResolvedValueOnce({ data: { listAgentOrgRunsWithMemory: page([], { page: 2 }) } });
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);
    const store = useMemoryExplorerStore();

    await store.setOrgRunsSearch('org-a', 'ceo');
    expect(queryMock.mock.calls[0][0].variables).toMatchObject({ orgDefinitionId: 'org-a', search: 'ceo', page: 1, source: { type: 'LOCAL' } });
    expect(store.orgRuns.entries[0]?.memberTargets[0]?.displayName).toBe('ceo');
    await store.changeOrgRunsPage('org-a', 2);
    expect(queryMock.mock.calls[1][0].variables).toMatchObject({ orgDefinitionId: 'org-a', search: 'ceo', page: 2 });
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
    const local = { key: 'local', type: 'LOCAL', label: 'Local Memory', memorySyncSourceId: null, displayName: null, readOnly: false, lastImportedAt: null, lastSyncStatus: null };
    const imported = { ...local, key: 'imported:finance', type: 'IMPORTED', label: 'Imported: Finance', memorySyncSourceId: 'finance', readOnly: true };
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
