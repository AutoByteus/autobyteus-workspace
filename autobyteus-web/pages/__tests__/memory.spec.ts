import { beforeEach, describe, it, expect, vi } from 'vitest';
import { flushPromises, mount, shallowMount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { nextTick } from 'vue';
import { useMemoryExplorerStore } from '~/stores/memoryExplorerStore';
import { useMemoryInspectorStore } from '~/stores/memoryInspectorStore';
import { getApolloClient } from '~/utils/apolloClient';
import MemoryPage from '../memory.vue';

const { routeMock, routerMock } = vi.hoisted(() => ({
  routeMock: { query: {} as Record<string, unknown>, fullPath: '/memory' },
  routerMock: { push: vi.fn().mockResolvedValue(undefined), replace: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => routerMock,
}));

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn() }));

const episode = (overrides: Record<string, unknown>) => ({
  runId: 'run-1', subject: { kind: 'AGENT' as const, runId: 'run-1', agentDefinitionId: 'codex' }, summary: 'Useful run', taskTitle: null, workspaceRootPath: '/tmp/project', lastActivityAt: '2026-11-20T10:31:00Z',
  memory: { latestMemoryAt: null, hasWorkJournal: true, hasRawTraces: false, hasRawArchive: false }, place: null, ...overrides,
});

describe('memory page: Browse by owner (autobyteus-554)', () => {
  beforeEach(() => {
    routeMock.query = {};
    routeMock.fullPath = '/memory';
    routerMock.push.mockClear();
    routerMock.replace.mockClear();
  });

  const mountAt = (query: Record<string, string>) => {
    routeMock.query = query;
    routeMock.fullPath = `/memory?${new URLSearchParams(query).toString()}`;
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const wrapper = shallowMount(MemoryPage, { global: { plugins: [pinia] } });
    return { wrapper, store: useMemoryExplorerStore() };
  };

  it('loads the owner cards once for the Agents tab (the entry), a group tab, and never for Global', async () => {
    for (const [query, loads] of [[{}, 1], [{ view: 'home', section: 'browse', node: 'teams' }, 1], [{ view: 'home', section: 'browse', node: 'global' }, 0]] as const) {
      const { store } = mountAt(query as Record<string, string>);
      await flushPromises();
      expect(store.fetchOwners).toHaveBeenCalledTimes(loads);
      expect(store.fetchEpisodes).not.toHaveBeenCalled();
    }
  });

  it("loads an agent page's episodes and the teams and orgs it works in; a team page's members, and its runs on Runs", async () => {
    const agent = mountAt({ view: 'home', section: 'browse', node: 'agents/agent:codex' });
    await flushPromises();
    expect(agent.store.ensureOwners).toHaveBeenCalledTimes(1);
    expect(agent.store.loadAllGroupMembers).toHaveBeenCalledTimes(1);
    expect(agent.store.fetchEpisodes).toHaveBeenCalledWith({ attribution: 'DEFINITION', agentDefinitionId: 'codex' });

    const unattributed = mountAt({ view: 'home', section: 'browse', node: 'agents/unattributed' });
    await flushPromises();
    expect(unattributed.store.fetchEpisodes).toHaveBeenCalledWith({ attribution: 'UNATTRIBUTED' });
    expect(unattributed.store.loadAllGroupMembers).not.toHaveBeenCalled();

    const teamLocal = encodeURIComponent('team-local-agent:se:designer');
    const member = mountAt({ view: 'home', section: 'browse', node: `teams/team:se/agent:${teamLocal}` });
    await flushPromises();
    expect(member.store.fetchEpisodes).toHaveBeenCalledWith({ attribution: 'DEFINITION', agentDefinitionId: 'team-local-agent:se:designer' });

    const team = mountAt({ view: 'home', section: 'browse', node: 'teams/team:se', pane: 'runs' });
    await flushPromises();
    expect(team.store.fetchMembers).toHaveBeenCalledWith('TEAM', 'se');
    expect(team.store.setSelectedTeamFromRoute).toHaveBeenCalledWith('se');
    expect(team.store.fetchTeamRuns).toHaveBeenCalledWith('se');

    const org = mountAt({ view: 'home', section: 'browse', node: 'orgs/org:launch' });
    await flushPromises();
    expect(org.store.fetchMembers).toHaveBeenCalledWith('ORG', 'launch');
    expect(org.store.fetchOrgRuns).not.toHaveBeenCalled();
  });

  it('keeps the Browse address in the route: a card, a tab, a pane; Browse comes back to the same owner', async () => {
    const { wrapper } = mountAt({ view: 'home', section: 'browse', node: 'agents/agent:codex' });
    const home = wrapper.findComponent({ name: 'MemoryHome' });
    home.vm.$emit('select-node', 'agents/agent:codex', 'semantic');
    expect(routerMock.push).toHaveBeenLastCalledWith({ path: '/memory', query: { view: 'home', section: 'browse', node: 'agents/agent:codex', pane: 'semantic' } });
    home.vm.$emit('change-section', 'browse');
    expect(routerMock.push).toHaveBeenLastCalledWith({ path: '/memory', query: { view: 'home', section: 'browse', node: 'agents/agent:codex' } });
    home.vm.$emit('select-node', 'teams');
    expect(routerMock.push).toHaveBeenLastCalledWith({ path: '/memory', query: { view: 'home', section: 'browse', node: 'teams' } });
  });

  it("opens an agent's episode on its run's inspector by its subject; Back returns to the agent page", async () => {
    const { wrapper } = mountAt({ view: 'home', section: 'browse', node: 'teams/team:se/agent:codex' });
    const home = wrapper.findComponent({ name: 'MemoryHome' });
    const back = { back: 'teams/team:se/agent:codex', backName: 'Codex', updatedAt: '2026-11-20T10:31:00Z' };

    home.vm.$emit('open-episode', episode({ subject: { kind: 'AGENT', runId: 'run-1', agentDefinitionId: 'codex' } }), 'Codex');
    expect(routerMock.push).toHaveBeenLastCalledWith({ path: '/memory', query: {
      view: 'agent-inspector', agentAttribution: 'DEFINITION', agentDefinitionId: 'codex', agentName: 'Codex', runId: 'run-1',
      runLabel: 'Useful run', workspace: '/tmp/project', ...back,
    } });
    home.vm.$emit('open-episode', episode({ subject: { kind: 'TEAM_MEMBER', teamRunId: 'team-run', agentRunId: 'member-run' }, place: { kind: 'TEAM', name: 'SE Team' } }), 'Codex');
    expect(routerMock.push).toHaveBeenLastCalledWith({ path: '/memory', query: {
      view: 'team-inspector', teamName: 'SE Team', teamRunId: 'team-run', agentRunId: 'member-run', memberName: 'Codex', ...back,
    } });
    home.vm.$emit('open-episode', episode({ subject: { kind: 'ORG_MEMBER', orgRunId: 'org-run', agentRunId: 'member-run' }, place: { kind: 'ORG', name: 'Launch Org' } }), 'Codex');
    expect(routerMock.push).toHaveBeenLastCalledWith({ path: '/memory', query: {
      view: 'org-inspector', orgName: 'Launch Org', orgRunId: 'org-run', agentRunId: 'member-run', memberName: 'Codex', ...back,
    } });
  });

  it("opens a team run's member from the Runs tab; Back returns to the team's Runs tab", async () => {
    const { wrapper } = mountAt({ view: 'home', section: 'browse', node: 'teams/team:se', pane: 'runs' });
    wrapper.findComponent({ name: 'MemoryHome' }).vm.$emit('inspect-member', 'team-run-1', {
      memberAddress: '/lead', displayName: 'Lead', agentRunId: 'member-1', executionKind: 'CONFIGURED', groupPath: [],
      lastUpdatedAt: '2026-06-19T10:06:04.000Z', memory: { hasWorkJournal: true, hasRawTraces: false, hasRawArchive: false },
    }, 'Software Team');
    expect(routerMock.push).toHaveBeenLastCalledWith({ path: '/memory', query: {
      view: 'team-inspector', teamDefinitionId: 'se', teamName: 'Software Team', teamRunId: 'team-run-1', agentRunId: 'member-1',
      memberAddress: '/lead', memberName: 'Lead', updatedAt: '2026-06-19T10:06:04.000Z', back: 'teams/team:se', backPane: 'runs', backName: 'Software Team',
    } });
  });

  it('labels and leads Back from an inspector to the owner page it was opened from, else to Memory', async () => {
    const opened = mountAt({ view: 'team-inspector', teamRunId: 'team-run-1', agentRunId: 'member-1', back: 'teams/team:se', backPane: 'runs', backName: 'Software Team' });
    await flushPromises();
    const inspector = opened.wrapper.findComponent({ name: 'MemoryInspector' });
    expect(inspector.props('backLabel')).toBe('Back to Software Team');
    inspector.vm.$emit('back');
    expect(routerMock.push).toHaveBeenLastCalledWith({ path: '/memory', query: { view: 'home', section: 'browse', node: 'teams/team:se', pane: 'runs' } });

    const direct = mountAt({ view: 'agent-inspector', runId: 'run-1', agentName: 'Codex' });
    await flushPromises();
    const plain = direct.wrapper.findComponent({ name: 'MemoryInspector' });
    expect(plain.props('backLabel')).toBe('Back to Memory');
    plain.vm.$emit('back');
    expect(routerMock.push).toHaveBeenLastCalledWith({ path: '/memory', query: { view: 'home', section: 'browse', node: 'agents' } });
  });

  it('inspects an org member once from the org-inspector route', async () => {
    const { store } = mountAt({
      view: 'org-inspector', orgDefinitionId: 'org-a', orgName: 'Alpha Org', orgRunId: 'org-run-1',
      agentRunId: 'designer-run', memberAddress: '/engineering/solution_designer', memberName: 'engineering/solution_designer',
    });
    await flushPromises();
    const inspectorStore = useMemoryInspectorStore();
    expect(inspectorStore.inspect).toHaveBeenCalledTimes(1);
    expect(inspectorStore.inspect).toHaveBeenCalledWith({
      kind: 'org_member_run', source: { type: 'LOCAL' }, orgDefinitionId: 'org-a', orgDefinitionName: 'Alpha Org', orgRunId: 'org-run-1',
      agentRunId: 'designer-run', memberAddress: '/engineering/solution_designer', memberName: 'engineering/solution_designer', lastUpdatedAt: null,
    });
    expect(store.fetchOwners).not.toHaveBeenCalled();
  });

  it('opens Browse on Agents for an address of a removed view (the old agent, team and org runs pages)', async () => {
    const { wrapper, store } = mountAt({ view: 'agent-detail', agentDefinitionId: 'codex' });
    await flushPromises();
    expect(wrapper.findComponent({ name: 'MemoryHome' }).props('nodeKey')).toBe('agents');
    expect(store.fetchOwners).toHaveBeenCalledTimes(1);
    expect(store.fetchEpisodes).not.toHaveBeenCalled();
  });
});

describe('memory page: opening a memory search result', () => {
  beforeEach(() => {
    routeMock.query = { view: 'home', section: 'search', q: 'ddns' };
    routeMock.fullPath = '/memory?view=home&section=search&q=ddns';
    routerMock.push.mockClear();
  });

  const match = { file: 'work_journal_active.md', fromLine: 812, toLine: 814, day: '2026-08-27', snippet: [], kind: 'text', matchedWords: ['ddns', 'home'] };
  const base = { runId: 'run-1', agentName: 'Codex', team: null, member: null, workspace: '/w/home', firstDay: null, latestDay: null, matches: [match] };
  const lines = { q: 'ddns', file: 'work_journal_active.md', from: '812', to: '814', kind: 'text', words: 'ddns,home' };

  const open = async (result: Record<string, unknown>) => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const { useMemorySearchStore } = await import('~/stores/memorySearchStore');
    useMemorySearchStore().query = 'ddns';
    const wrapper = shallowMount(MemoryPage, { global: { plugins: [pinia] } });
    wrapper.findComponent({ name: 'MemoryHome' }).vm.$emit('open-result', result, match);
    await nextTick();
    return routerMock.push.mock.calls.at(-1)?.[0];
  };

  it('opens each run kind at the matched lines by its subject; the cue stays in the address for Back', async () => {
    expect(await open({ ...base, subject: { kind: 'AGENT', runId: 'run-1', agentDefinitionId: 'codex' } })).toEqual({ path: '/memory', query: {
      view: 'agent-inspector', agentAttribution: 'DEFINITION', agentDefinitionId: 'codex', agentName: 'Codex', runId: 'run-1', runLabel: 'run-1', workspace: '/w/home', ...lines,
    } });
    expect(await open({ ...base, subject: { kind: 'AGENT', runId: 'run-1', agentDefinitionId: null } })).toMatchObject({ query: { agentAttribution: 'UNATTRIBUTED' } });
    expect(await open({ ...base, team: { name: 'Software Team', kind: 'team' }, member: 'lead', subject: { kind: 'TEAM_MEMBER', teamRunId: 'team-1', agentRunId: 'run-1' } })).toEqual({ path: '/memory', query: {
      view: 'team-inspector', teamName: 'Software Team', teamRunId: 'team-1', agentRunId: 'run-1', memberName: 'lead', ...lines,
    } });
    expect(await open({ ...base, team: { name: 'Alpha Org', kind: 'org' }, subject: { kind: 'ORG_MEMBER', orgRunId: 'org-1', agentRunId: 'run-1' } })).toEqual({ path: '/memory', query: {
      view: 'org-inspector', orgName: 'Alpha Org', orgRunId: 'org-1', agentRunId: 'run-1', memberName: 'Codex', ...lines,
    } });
    expect(await open({ ...base, team: { name: 'old_team', kind: 'team' }, subject: { kind: 'RUN_FOLDER', runKey: 'agent_teams/old_team/run-1' } })).toEqual({ path: '/memory', query: {
      view: 'folder-inspector', runKey: 'agent_teams/old_team/run-1', runId: 'run-1', agentName: 'Codex', teamName: 'old_team', ...lines,
    } });
  });

  it('opens a run known only by its folder on its Work Journal, and goes back to the search results', async () => {
    routeMock.query = { view: 'folder-inspector', runKey: 'agent_teams/old_team/run-1', runId: 'run-1', agentName: 'Codex', q: 'ddns', file: 'work_journal_active.md', from: '812', to: '814', kind: 'text', words: 'ddns,home' };
    routeMock.fullPath = '/memory?view=folder-inspector&runKey=agent_teams%2Fold_team%2Frun-1';
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const { useMemoryJournalStore } = await import('~/stores/memoryJournalStore');
    const journal = useMemoryJournalStore();
    const inspectorStore = useMemoryInspectorStore();
    const wrapper = shallowMount(MemoryPage, { global: { plugins: [pinia] } });
    await flushPromises();
    expect(journal.open).toHaveBeenCalledWith({ kind: 'folder', runKey: 'agent_teams/old_team/run-1' }, 'run-1', { file: 'work_journal_active.md', fromLine: 812, toLine: 814, cue: 'ddns', kind: 'text', words: ['ddns', 'home'] });
    expect(inspectorStore.inspect).not.toHaveBeenCalled();
    const inspector = wrapper.findComponent({ name: 'MemoryInspector' });
    expect(inspector.props('folderRun')).toEqual({ runKey: 'agent_teams/old_team/run-1', runId: 'run-1', agentName: 'Codex', groupName: null });
    expect(inspector.props('backLabel')).toBe('Back to search results');
    inspector.vm.$emit('back');
    expect(routerMock.push).toHaveBeenCalledWith({ path: '/memory', query: { view: 'home', section: 'search', q: 'ddns' } });
  });
});

type Operation = { name: string; variables: Record<string, unknown> };
const memory = { latestMemoryAt: null, hasWorkJournal: true, hasRawTraces: false, hasRawArchive: false };
const page = <T>(entries: T[]) => ({ entries, total: entries.length, page: 1, pageSize: 25, totalPages: 1 });
const localSourceOption = { key: 'local', type: 'LOCAL', label: 'Local Memory', memorySyncSourceId: null, displayName: null, readOnly: false, lastImportedAt: null, lastSyncStatus: null };
const importedSourceOption = { ...localSourceOption, key: 'imported:finance', type: 'IMPORTED', label: 'Imported: Finance', memorySyncSourceId: 'finance', readOnly: true };

/**
 * Real store actions over a recording Apollo client: each mount is one route sync, so the recorded operations are
 * exactly the network requests of one navigation (AC-012, AC-013).
 */
const recordOperations = (responses: Record<string, () => Promise<unknown>>) => {
  const operations: Operation[] = [];
  const query = vi.fn(({ query: document, variables }: { query: { definitions: Array<{ name?: { value: string } }> }; variables?: Record<string, unknown> }) => {
    const name = document.definitions[0]?.name?.value ?? 'unknown';
    operations.push({ name, variables: variables ?? {} });
    const respond = responses[name];
    return respond ? respond().then((data) => ({ data })) : new Promise(() => undefined);
  });
  vi.mocked(getApolloClient).mockReturnValue({ query } as never);
  return operations;
};

const setRoute = (query: Record<string, string>) => {
  routeMock.query = query;
  routeMock.fullPath = `/memory?${new URLSearchParams(query).toString()}`;
};

describe('memory page route sync request ownership (REQ-011)', () => {
  beforeEach(() => {
    routeMock.query = {};
    routeMock.fullPath = '/memory';
    routerMock.push.mockClear();
    routerMock.replace.mockClear();
    vi.mocked(getApolloClient).mockReset();
  });

  const mountWithRealStores = () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false });
    const wrapper = mount(MemoryPage, { global: { plugins: [pinia] } });
    return { wrapper, store: useMemoryExplorerStore() };
  };
  const owners = {
    ListAgentsWithMemory: () => Promise.resolve({ listAgentsWithMemory: page([{ attribution: 'DEFINITION', agentDefinitionId: 'codex', displayName: 'Codex', stableId: 'codex', runCount: 1 }]) }),
    ListAgentTeamsWithMemory: () => Promise.resolve({ listAgentTeamsWithMemory: page([]) }),
    ListAgentOrgsWithMemory: () => Promise.resolve({ listAgentOrgsWithMemory: page([]) }),
  };

  it('sends exactly one request and no sources request for inspector navigation (AC-012)', async () => {
    // The run detail opens on its Work Journal: one journal read; the view is read when Raw Traces are opened.
    const view = () => Promise.resolve({ getTeamMemberRunMemoryView: { runId: 'm', workJournal: null }, getAgentOrgMemberRunMemoryView: { runId: 'm', workJournal: null }, getAgentRunMemoryView: { runId: 'm', workJournal: null } });
    const routes: Array<[Record<string, string>, string]> = [
      [{ view: 'team-inspector', teamRunId: 'team-run', agentRunId: 'member' }, 'GetTeamMemberRunWorkJournal'],
      [{ view: 'org-inspector', orgRunId: 'org-run', agentRunId: 'member' }, 'GetAgentOrgMemberRunWorkJournal'],
      [{ view: 'agent-inspector', runId: 'run-1' }, 'GetAgentRunWorkJournal'],
      [{ view: 'folder-inspector', runKey: 'agent_teams/old/member', runId: 'member' }, 'GetRunFolderWorkJournal'],
    ];
    for (const [query, expected] of routes) {
      const operations = recordOperations({
        GetTeamMemberRunWorkJournal: view, GetAgentOrgMemberRunWorkJournal: view, GetAgentRunWorkJournal: view,
        GetRunFolderWorkJournal: () => Promise.resolve({ runFolderWorkJournal: null }),
      });
      setRoute(query);
      mountWithRealStores();
      await flushPromises();
      expect(operations.map((operation) => operation.name)).toEqual([expected]);
    }
  });

  it("an agent page asks for the cards once, then the agent's episodes, with no whole-memory reads", async () => {
    const operations = recordOperations({
      ...owners,
      ListAgentEpisodes: () => Promise.resolve({ listAgentEpisodes: page([{ ...episode({ subject: { kind: 'AGENT', runId: 'run-1', agentDefinitionId: 'codex' } }) }]) }),
      ListMemoryExplorerSources: () => Promise.resolve({ listMemoryExplorerSources: [localSourceOption] }),
    });
    setRoute({ view: 'home', section: 'browse', node: 'agents/agent:codex' });
    const { wrapper } = mountWithRealStores();
    await flushPromises();

    // The Index tab's badge reads the memory index status once per page (whichever test mounts it first).
    expect(operations.map((operation) => operation.name).filter((name) => name !== 'MemoryIndexStatus').sort()).toEqual([
      'ListAgentEpisodes', 'ListAgentOrgsWithMemory', 'ListAgentTeamsWithMemory', 'ListAgentsWithMemory', 'ListMemoryExplorerSources',
    ]);
    expect(operations.find((operation) => operation.name === 'ListAgentEpisodes')?.variables.selector).toEqual({ attribution: 'DEFINITION', agentDefinitionId: 'codex' });
    expect(wrapper.find('h1').text()).toBe('Codex');
    expect(wrapper.text()).toContain('Useful run');
  });

  it("shows \"Loading runs\" in the first render of another agent's page, never the previous agent's episodes (AC-012, CR-001)", async () => {
    recordOperations({ ...owners });
    setRoute({ view: 'home', section: 'browse', node: 'agents/agent:codex' });
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false });
    const store = useMemoryExplorerStore();
    store.agents.entries = [{ attribution: 'DEFINITION', agentDefinitionId: 'codex', displayName: 'Codex', stableId: 'codex', runCount: 1 }];
    store.ownersSourceKey = 'local';
    store.episodes.ownerKey = 'DEFINITION:other';
    store.episodes.entries = [episode({ runId: 'other-run', summary: 'Other agent run', subject: { kind: 'AGENT', runId: 'other-run', agentDefinitionId: 'other' } })];

    const wrapper = mount(MemoryPage, { global: { plugins: [pinia] } });

    expect(wrapper.text()).toMatch(/loading runs/i);
    expect(wrapper.text()).not.toContain('Other agent run');
  });

  it('refreshes sources in the background on the home view without delaying the cards (AC-013)', async () => {
    let resolveSources!: (value: unknown) => void;
    const operations = recordOperations({
      ...owners,
      ListMemoryExplorerSources: () => new Promise((resolve) => { resolveSources = resolve; }),
    });
    setRoute({ view: 'home', node: 'agents' });
    const { wrapper, store } = mountWithRealStores();
    await flushPromises();

    expect(operations.map((operation) => operation.name).filter((name) => name !== 'MemoryIndexStatus').sort())
      .toEqual(['ListAgentOrgsWithMemory', 'ListAgentTeamsWithMemory', 'ListAgentsWithMemory', 'ListMemoryExplorerSources']);
    expect(wrapper.text()).toContain('Codex');
    expect(store.sourceLoading).toBe(true);

    resolveSources({ listMemoryExplorerSources: [localSourceOption, importedSourceOption] });
    await flushPromises();
    expect(store.sources.map((source) => source.key)).toEqual(['local', 'imported:finance']);
    expect(store.selectedSource.key).toBe('local');
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it('awaits one sources request for an unknown imported source, then falls back to Local (AC-012 alternate)', async () => {
    const operations = recordOperations({
      ListMemoryExplorerSources: () => Promise.resolve({ listMemoryExplorerSources: [localSourceOption] }),
    });
    setRoute({ view: 'home', section: 'browse', node: 'teams/team:se', source: 'imported:ghost' });
    mountWithRealStores();
    await flushPromises();

    expect(operations.map((operation) => operation.name)).toEqual(['ListMemoryExplorerSources']);
    expect(routerMock.replace).toHaveBeenCalledWith({ path: '/memory', query: { view: 'home', section: 'browse', node: 'teams/team:se' } });
  });

  it('uses an imported source found by the awaited sources request for every Browse request', async () => {
    const operations = recordOperations({
      ...owners,
      ListMemoryExplorerSources: () => Promise.resolve({ listMemoryExplorerSources: [localSourceOption, importedSourceOption] }),
    });
    setRoute({ view: 'home', section: 'browse', node: 'agents', source: 'imported:finance' });
    mountWithRealStores();
    await flushPromises();

    expect(operations[0]?.name).toBe('ListMemoryExplorerSources');
    const browse = operations.filter((operation) => operation.name.startsWith('List') && operation.name !== 'ListMemoryExplorerSources');
    expect(browse.map((operation) => operation.name).sort()).toEqual(['ListAgentOrgsWithMemory', 'ListAgentTeamsWithMemory', 'ListAgentsWithMemory']);
    for (const operation of browse) expect(operation.variables.source).toEqual({ type: 'IMPORTED', memorySyncSourceId: 'finance' });
    expect(routerMock.replace).not.toHaveBeenCalled();
  });
});
