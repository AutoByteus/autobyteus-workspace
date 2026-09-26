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

describe('memory page', () => {
  beforeEach(() => {
    routeMock.query = {};
    routeMock.fullPath = '/memory';
    routerMock.push.mockClear();
    routerMock.replace.mockClear();
  });

  it('fetches the agent Memory catalog on home mount', async () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const wrapper = shallowMount(MemoryPage, { global: { plugins: [pinia] } });
    await flushPromises();

    const store = useMemoryExplorerStore();
    expect(store.fetchHomeTab).toHaveBeenCalledTimes(1);
    expect(store.fetchHomeTab).toHaveBeenCalledWith('agents');
    expect(wrapper.exists()).toBe(true);
  });

  it('fetches the Agent Orgs catalog once for the orgs home tab', async () => {
    routeMock.query = { view: 'home', tab: 'orgs' };
    routeMock.fullPath = '/memory?view=home&tab=orgs';
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    shallowMount(MemoryPage, { global: { plugins: [pinia] } });
    await flushPromises();

    const store = useMemoryExplorerStore();
    expect(store.setHomeTab).toHaveBeenCalledWith('orgs');
    expect(store.fetchHomeTab).toHaveBeenCalledTimes(1);
    expect(store.fetchHomeTab).toHaveBeenCalledWith('orgs');
  });

  it('navigates from Memory Home to agent detail', async () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const wrapper = shallowMount(MemoryPage, { global: { plugins: [pinia] } });

    wrapper.findComponent({ name: 'MemoryHome' }).vm.$emit('select-agent', {
      attribution: 'DEFINITION',
      agentDefinitionId: 'codex',
      displayName: 'Codex',
      stableId: 'codex',
      runCount: 1,
      memory: { hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: false, hasRawArchive: false },
    });
    await nextTick();

    expect(routerMock.push).toHaveBeenCalledWith({
      path: '/memory',
      query: { view: 'agent-detail', agentAttribution: 'DEFINITION', agentDefinitionId: 'codex', agentName: 'Codex' },
    });
  });

  it('keeps Memory Home tab selection in the route query', async () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const wrapper = shallowMount(MemoryPage, { global: { plugins: [pinia] } });

    wrapper.findComponent({ name: 'MemoryHome' }).vm.$emit('change-tab', 'teams');
    await nextTick();

    expect(routerMock.push).toHaveBeenCalledWith({
      path: '/memory',
      query: { view: 'home', tab: 'teams' },
    });
  });

  it('passes concise inspector back labels without repeating Memory', async () => {
    routeMock.query = { view: 'agent-inspector', runId: 'run-1', agentName: 'Codex' };
    routeMock.fullPath = '/memory?view=agent-inspector&runId=run-1&agentName=Codex';
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const inspectorStore = useMemoryInspectorStore();
    inspectorStore.target = { kind: 'agent_run', runId: 'run-1', agentDisplayName: 'Codex' };

    const wrapper = shallowMount(MemoryPage, { global: { plugins: [pinia] } });
    await nextTick();

    expect(wrapper.findComponent({ name: 'MemoryInspector' }).props('backLabel')).toBe('Back to Codex');
  });

  it('drives real Memory Home search, pagination, badges, and card routing through the page shell', async () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const store = useMemoryExplorerStore();
    store.homeTab = 'agents';
    store.agents.page = 1;
    store.agents.totalPages = 2;
    store.agents.entries = [{
      attribution: 'DEFINITION',
      agentDefinitionId: 'codex',
      displayName: 'Codex',
      stableId: 'codex',
      runCount: 2,
      latestMemoryAt: '2026-06-19T10:06:04.000Z',
      memory: { latestMemoryAt: '2026-06-19T10:06:04.000Z', hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: true, hasRawArchive: false },
    }];

    const wrapper = mount(MemoryPage, { global: { plugins: [pinia] } });
    await nextTick();

    expect(wrapper.find('h1').exists()).toBe(false);
    expect(wrapper.text()).not.toMatch(/inspect stored agent and team memories/i);
    expect(wrapper.text()).toContain('Codex');
    expect(wrapper.text()).toMatch(/working/i);
    expect(wrapper.text()).toMatch(/raw traces/i);

    await wrapper.find('input').setValue('codex');
    await wrapper.findAll('button').find((button) => button.text() === 'Search')!.trigger('click');
    expect(store.setAgentsSearch).toHaveBeenCalledWith('codex');

    await wrapper.findAll('button').find((button) => button.text() === 'Next')!.trigger('click');
    expect(store.changeHomePage).toHaveBeenCalledWith('agents', 2);

    await wrapper.findAll('button').find((button) => button.text().includes('Codex'))!.trigger('click');
    expect(store.fetchAgentRuns).not.toHaveBeenCalled();
    expect(routerMock.push).toHaveBeenCalledWith({
      path: '/memory',
      query: { view: 'agent-detail', agentAttribution: 'DEFINITION', agentDefinitionId: 'codex', agentName: 'Codex' },
    });
  });

  it('routes real agent detail inspect actions with preserved subject, workspace, timestamp, and badges', async () => {
    routeMock.query = { view: 'agent-detail', agentAttribution: 'DEFINITION', agentDefinitionId: 'codex', agentName: 'Codex' };
    routeMock.fullPath = '/memory?view=agent-detail&agentAttribution=DEFINITION&agentDefinitionId=codex&agentName=Codex';
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const store = useMemoryExplorerStore();
    const inspectorStore = useMemoryInspectorStore();
    store.selectedAgent = { attribution: 'DEFINITION', agentDefinitionId: 'codex', displayName: 'Codex', stableId: 'codex', runCount: 1, memory: { latestMemoryAt: null, hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: true, hasRawArchive: false } };
    store.agentRuns.total = 1;
    store.agentRuns.entries = [{
      runId: 'run-1',
      agentDefinitionId: 'codex',
      agentName: 'Codex',
      summary: 'Useful run',
      workspaceRootPath: '/tmp/project',
      lastUpdatedAt: '2026-06-19T10:06:04.000Z',
      memory: { latestMemoryAt: null, hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: true, hasRawArchive: false },
    }];

    const wrapper = mount(MemoryPage, { global: { plugins: [pinia] } });
    await nextTick();

    expect(wrapper.text()).toContain('Useful run');
    expect(wrapper.text()).toMatch(/working/i);
    expect(wrapper.text()).toMatch(/raw traces/i);

    await flushPromises();
    expect(store.fetchAgentRuns).toHaveBeenCalledTimes(1);
    await wrapper.findAll('button').find((button) => button.text().includes('Useful run'))!.trigger('click');

    expect(inspectorStore.inspect).not.toHaveBeenCalled();
    expect(store.fetchAgentRuns).toHaveBeenCalledTimes(1);
    expect(routerMock.push).toHaveBeenCalledWith({
      path: '/memory',
      query: {
        view: 'agent-inspector',
        runId: 'run-1',
        agentAttribution: 'DEFINITION',
        agentDefinitionId: 'codex',
        agentName: 'Codex',
        runLabel: 'Useful run',
        workspace: '/tmp/project',
        updatedAt: '2026-06-19T10:06:04.000Z',
      },
    });
  });

  it('routes real team detail member inspect actions with preserved team and member query identity', async () => {
    routeMock.query = { view: 'team-detail', teamDefinitionId: 'team', teamName: 'Software Team' };
    routeMock.fullPath = '/memory?view=team-detail&teamDefinitionId=team&teamName=Software%20Team';
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const store = useMemoryExplorerStore();
    const inspectorStore = useMemoryInspectorStore();
    store.selectedTeam = { teamDefinitionId: 'team', teamDefinitionName: 'Software Team', teamRunCount: 1, memberMemoryCount: 1, memory: { latestMemoryAt: null, hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: true, hasRawArchive: false } };
    store.teamRuns.total = 1;
    store.teamRuns.entries = [{
      teamRunId: 'team-run-1',
      teamDefinitionId: 'team',
      teamDefinitionName: 'Software Team',
      summary: 'Planning run',
      workspaceRootPath: '/tmp/team-project',
      lastUpdatedAt: '2026-06-19T10:06:04.000Z',
      memory: { latestMemoryAt: null, hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: true, hasRawArchive: false },
      memberTargets: [{ memberAddress: '/lead', displayName: 'Lead', agentRunId: 'member-1', executionKind: 'CONFIGURED', groupPath: [], memory: { latestMemoryAt: null, hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: true, hasRawArchive: false } }],
    }];

    const wrapper = mount(MemoryPage, { global: { plugins: [pinia] } });
    await flushPromises();

    expect(store.setSelectedTeamFromRoute).toHaveBeenCalledWith('team', 'Software Team');
    expect(store.fetchTeamRuns).toHaveBeenCalledTimes(1);
    expect(store.fetchTeamRuns).toHaveBeenCalledWith('team');
    expect(wrapper.find('section h1').text()).toBe('Software Team');
    expect(wrapper.text()).toContain('Planning run');
    expect(wrapper.text()).toContain('Lead');
    expect(wrapper.text()).toMatch(/raw traces/i);

    await wrapper.find('input').setValue('plan');
    await wrapper.findAll('button').find((button) => button.text() === 'Search')!.trigger('click');
    expect(store.setTeamRunsSearch).toHaveBeenCalledWith('team', 'plan');

    await wrapper.findAll('button').find((button) => button.text().includes('Lead'))!.trigger('click');

    expect(inspectorStore.inspect).not.toHaveBeenCalled();
    expect(store.fetchTeamRuns).toHaveBeenCalledTimes(1);
    expect(routerMock.push).toHaveBeenCalledWith({
      path: '/memory',
      query: {
        view: 'team-inspector',
        teamDefinitionId: 'team',
        teamName: 'Software Team',
        teamRunId: 'team-run-1',
        agentRunId: 'member-1',
        memberAddress: '/lead',
        memberName: 'Lead',
        updatedAt: '2026-06-19T10:06:04.000Z',
      },
    });
  });

  it('navigates from a team card without fetching; the team-detail route then fetches exactly once', async () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const store = useMemoryExplorerStore();
    const wrapper = shallowMount(MemoryPage, { global: { plugins: [pinia] } });
    await flushPromises();

    wrapper.findComponent({ name: 'MemoryHome' }).vm.$emit('select-team', {
      teamDefinitionId: 'team', teamDefinitionName: 'Software Team', teamRunCount: 1, memberMemoryCount: 1,
      memory: { hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: false, hasRawArchive: false },
    });
    await flushPromises();

    expect(store.fetchTeamRuns).not.toHaveBeenCalled();
    expect(routerMock.push).toHaveBeenCalledWith({
      path: '/memory',
      query: { view: 'team-detail', teamDefinitionId: 'team', teamName: 'Software Team' },
    });
  });

  it('routes an org card to org detail, fetches org runs once and inspects members by org address', async () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const home = shallowMount(MemoryPage, { global: { plugins: [pinia] } });
    await flushPromises();
    home.findComponent({ name: 'MemoryHome' }).vm.$emit('select-org', {
      orgDefinitionId: 'org-a', orgDefinitionName: 'Alpha Org', orgRunCount: 1, memberMemoryCount: 1,
      memory: { hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: false, hasRawArchive: false },
    });
    expect(useMemoryExplorerStore().fetchOrgRuns).not.toHaveBeenCalled();
    expect(routerMock.push).toHaveBeenCalledWith({
      path: '/memory',
      query: { view: 'org-detail', orgDefinitionId: 'org-a', orgName: 'Alpha Org' },
    });

    routerMock.push.mockClear();
    routeMock.query = { view: 'org-detail', orgDefinitionId: 'org-a', orgName: 'Alpha Org' };
    routeMock.fullPath = '/memory?view=org-detail&orgDefinitionId=org-a&orgName=Alpha%20Org';
    const detailPinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const store = useMemoryExplorerStore();
    const inspectorStore = useMemoryInspectorStore();
    store.selectedOrg = { orgDefinitionId: 'org-a', orgDefinitionName: 'Alpha Org', orgRunCount: 1, memberMemoryCount: 1, memory: { latestMemoryAt: null, hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: false, hasRawArchive: false } };
    store.orgRuns.totalPages = 2;
    store.orgRuns.entries = [{
      orgRunId: 'org-run-1',
      orgDefinitionId: 'org-a',
      orgDefinitionName: 'Alpha Org',
      summary: 'Quarterly plan',
      workspaceRootPath: null,
      lastUpdatedAt: '2026-09-01T01:00:00.000Z',
      memory: { latestMemoryAt: null, hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: false, hasRawArchive: false },
      memberTargets: [{ memberAddress: '/engineering/solution_designer', displayName: 'engineering/solution_designer', agentRunId: 'designer-run', executionKind: 'CONFIGURED', groupPath: [], memory: { latestMemoryAt: null, hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: false, hasRawArchive: false } }],
    }];

    const wrapper = mount(MemoryPage, { global: { plugins: [detailPinia] } });
    await flushPromises();

    expect(store.setSelectedOrgFromRoute).toHaveBeenCalledWith('org-a', 'Alpha Org');
    expect(store.fetchOrgRuns).toHaveBeenCalledTimes(1);
    expect(store.fetchOrgRuns).toHaveBeenCalledWith('org-a');
    expect(store.fetchTeamRuns).not.toHaveBeenCalled();
    expect(wrapper.find('section h1').text()).toBe('Alpha Org');
    expect(wrapper.text()).toContain('Quarterly plan');

    await wrapper.findAll('button').find((button) => button.text() === 'Next')!.trigger('click');
    expect(store.changeOrgRunsPage).toHaveBeenCalledWith('org-a', 2);
    await wrapper.find('input').setValue('designer');
    await wrapper.findAll('button').find((button) => button.text() === 'Search')!.trigger('click');
    expect(store.setOrgRunsSearch).toHaveBeenCalledWith('org-a', 'designer');

    await wrapper.findAll('button').find((button) => button.text().includes('engineering/solution_designer'))!.trigger('click');
    expect(inspectorStore.inspect).not.toHaveBeenCalled();
    expect(routerMock.push).toHaveBeenCalledWith({
      path: '/memory',
      query: {
        view: 'org-inspector',
        orgDefinitionId: 'org-a',
        orgName: 'Alpha Org',
        orgRunId: 'org-run-1',
        agentRunId: 'designer-run',
        memberAddress: '/engineering/solution_designer',
        memberName: 'engineering/solution_designer',
        updatedAt: '2026-09-01T01:00:00.000Z',
      },
    });
  });

  it('inspects an org member once from the org-inspector route and goes back to the org detail', async () => {
    routeMock.query = {
      view: 'org-inspector', orgDefinitionId: 'org-a', orgName: 'Alpha Org', orgRunId: 'org-run-1',
      agentRunId: 'designer-run', memberAddress: '/engineering/solution_designer', memberName: 'engineering/solution_designer',
    };
    routeMock.fullPath = '/memory?view=org-inspector&orgRunId=org-run-1&agentRunId=designer-run';
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const inspectorStore = useMemoryInspectorStore();

    const wrapper = shallowMount(MemoryPage, { global: { plugins: [pinia] } });
    await flushPromises();

    expect(inspectorStore.inspect).toHaveBeenCalledTimes(1);
    expect(inspectorStore.inspect).toHaveBeenCalledWith({
      kind: 'org_member_run',
      source: { type: 'LOCAL' },
      orgDefinitionId: 'org-a',
      orgDefinitionName: 'Alpha Org',
      orgRunId: 'org-run-1',
      agentRunId: 'designer-run',
      memberAddress: '/engineering/solution_designer',
      memberName: 'engineering/solution_designer',
      lastUpdatedAt: null,
    });

    inspectorStore.target = (inspectorStore.inspect as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    await nextTick();
    const inspector = wrapper.findComponent({ name: 'MemoryInspector' });
    expect(inspector.props('backLabel')).toBe('Back to Alpha Org');
    inspector.vm.$emit('back');
    expect(routerMock.push).toHaveBeenCalledWith({
      path: '/memory',
      query: { view: 'org-detail', orgDefinitionId: 'org-a', orgName: 'Alpha Org' },
    });
  });

  it('inspects a team member once from the team-inspector route', async () => {
    routeMock.query = { view: 'team-inspector', teamDefinitionId: 'team', teamName: 'Software Team', teamRunId: 'team-run-1', agentRunId: 'task-run', memberName: 'Lead' };
    routeMock.fullPath = '/memory?view=team-inspector&teamRunId=team-run-1&agentRunId=task-run';
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const inspectorStore = useMemoryInspectorStore();
    shallowMount(MemoryPage, { global: { plugins: [pinia] } });
    await flushPromises();

    expect(inspectorStore.inspect).toHaveBeenCalledTimes(1);
    expect(inspectorStore.inspect).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'team_member_run', teamRunId: 'team-run-1', agentRunId: 'task-run', memberName: 'Lead',
    }));
  });
});

type Operation = { name: string; variables: Record<string, unknown> };
const memory = { latestMemoryAt: null, hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: false, hasRawArchive: false };
const page = <T>(entries: T[]) => ({ entries, total: entries.length, page: 1, pageSize: 25, totalPages: 1 });
const localSourceOption = { key: 'local', type: 'LOCAL', label: 'Local Memory', sourceNodeId: null, displayName: null, readOnly: false, lastImportedAt: null, lastSyncStatus: null };
const importedSourceOption = { ...localSourceOption, key: 'imported:finance', type: 'IMPORTED', label: 'Imported: Finance', sourceNodeId: 'finance', readOnly: true };

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

  it('sends exactly one request and no sources request for detail and inspector navigation (AC-012)', async () => {
    const runs = () => Promise.resolve({ listAgentTeamRunsWithMemory: page([]), listAgentOrgRunsWithMemory: page([]), listAgentRunsWithMemory: page([]) });
    const view = () => Promise.resolve({ getTeamMemberRunMemoryView: { runId: 'm' }, getAgentOrgMemberRunMemoryView: { runId: 'm' }, getAgentRunMemoryView: { runId: 'm' } });
    const routes: Array<[Record<string, string>, string]> = [
      [{ view: 'team-detail', teamDefinitionId: 'team', teamName: 'Team' }, 'ListAgentTeamRunsWithMemory'],
      [{ view: 'org-detail', orgDefinitionId: 'org', orgName: 'Org' }, 'ListAgentOrgRunsWithMemory'],
      [{ view: 'agent-detail', agentAttribution: 'DEFINITION', agentDefinitionId: 'codex', agentName: 'Codex' }, 'ListAgentRunsWithMemory'],
      [{ view: 'team-inspector', teamRunId: 'team-run', agentRunId: 'member' }, 'GetTeamMemberRunMemoryView'],
      [{ view: 'org-inspector', orgRunId: 'org-run', agentRunId: 'member' }, 'GetAgentOrgMemberRunMemoryView'],
      [{ view: 'agent-inspector', runId: 'run-1' }, 'GetAgentRunMemoryView'],
    ];
    for (const [query, expected] of routes) {
      const operations = recordOperations({
        ListAgentTeamRunsWithMemory: runs, ListAgentOrgRunsWithMemory: runs, ListAgentRunsWithMemory: runs,
        GetTeamMemberRunMemoryView: view, GetAgentOrgMemberRunMemoryView: view, GetAgentRunMemoryView: view,
      });
      setRoute(query);
      mountWithRealStores();
      await flushPromises();
      expect(operations.map((operation) => operation.name)).toEqual([expected]);
    }
  });

  it('shows "Loading runs" in the first render after a new team selection, never the empty state (AC-012, CR-001)', async () => {
    recordOperations({});
    setRoute({ view: 'team-detail', teamDefinitionId: 'team-b', teamName: 'Team B' });
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false });
    const store = useMemoryExplorerStore();
    store.selectedTeam = { teamDefinitionId: 'team-a', teamDefinitionName: 'Team A', teamRunCount: 1, memberMemoryCount: 1, memory };
    store.teamRuns.entries = [{ teamRunId: 'team-a-run', teamDefinitionId: 'team-a', teamDefinitionName: 'Team A', memory, memberTargets: [] }];

    const wrapper = mount(MemoryPage, { global: { plugins: [pinia] } });

    expect(wrapper.text()).toMatch(/loading runs/i);
    expect(wrapper.text()).not.toMatch(/no runs match/i);
    expect(wrapper.text()).not.toContain('team-a-run');
  });

  it('refreshes sources in the background on the home view without delaying the home list (AC-013)', async () => {
    let resolveSources!: (value: unknown) => void;
    const operations = recordOperations({
      ListMemoryExplorerSources: () => new Promise((resolve) => { resolveSources = resolve; }),
      ListAgentsWithMemory: () => Promise.resolve({ listAgentsWithMemory: page([{ attribution: 'DEFINITION', agentDefinitionId: 'codex', displayName: 'Codex', stableId: 'codex', runCount: 1, memory }]) }),
    });
    setRoute({ view: 'home', tab: 'agents' });
    const { wrapper, store } = mountWithRealStores();
    await flushPromises();

    expect(operations.map((operation) => operation.name).sort()).toEqual(['ListAgentsWithMemory', 'ListMemoryExplorerSources']);
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
    setRoute({ view: 'team-detail', teamDefinitionId: 'team', teamName: 'Team', source: 'imported:ghost' });
    mountWithRealStores();
    await flushPromises();

    expect(operations.map((operation) => operation.name)).toEqual(['ListMemoryExplorerSources']);
    expect(routerMock.replace).toHaveBeenCalledWith({ path: '/memory', query: { view: 'team-detail', teamDefinitionId: 'team', teamName: 'Team' } });
  });

  it('uses an imported source found by the awaited sources request, then fetches once with it', async () => {
    const operations = recordOperations({
      ListMemoryExplorerSources: () => Promise.resolve({ listMemoryExplorerSources: [localSourceOption, importedSourceOption] }),
      ListAgentTeamRunsWithMemory: () => Promise.resolve({ listAgentTeamRunsWithMemory: page([]) }),
    });
    setRoute({ view: 'team-detail', teamDefinitionId: 'team', teamName: 'Team', source: 'imported:finance' });
    mountWithRealStores();
    await flushPromises();

    expect(operations.map((operation) => operation.name)).toEqual(['ListMemoryExplorerSources', 'ListAgentTeamRunsWithMemory']);
    expect(operations[1]?.variables.source).toEqual({ type: 'IMPORTED', sourceNodeId: 'finance' });
    expect(routerMock.replace).not.toHaveBeenCalled();
  });
});
