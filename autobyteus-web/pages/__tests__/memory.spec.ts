import { beforeEach, describe, it, expect, vi } from 'vitest';
import { mount, shallowMount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { nextTick } from 'vue';
import { useMemoryExplorerStore } from '~/stores/memoryExplorerStore';
import { useMemoryInspectorStore } from '~/stores/memoryInspectorStore';
import MemoryPage from '../memory.vue';

const { routeMock, routerMock } = vi.hoisted(() => ({
  routeMock: { query: {} as Record<string, unknown>, fullPath: '/memory' },
  routerMock: { push: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => routerMock,
}));

describe('memory page', () => {
  beforeEach(() => {
    routeMock.query = {};
    routeMock.fullPath = '/memory';
    routerMock.push.mockClear();
  });

  it('fetches the agent Memory catalog on home mount', async () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const wrapper = shallowMount(MemoryPage, { global: { plugins: [pinia] } });
    await nextTick();

    const store = useMemoryExplorerStore();
    expect(store.fetchAgents).toHaveBeenCalled();
    expect(wrapper.exists()).toBe(true);
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
    expect(store.openAgentMemory).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Codex', stableId: 'codex' }));
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

    await wrapper.findAll('button').find((button) => button.text().includes('Useful run'))!.trigger('click');

    expect(inspectorStore.inspect).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'agent_run',
      runId: 'run-1',
      agentDefinitionId: 'codex',
      agentDisplayName: 'Codex',
      runLabel: 'Useful run',
      workspaceRootPath: '/tmp/project',
      lastUpdatedAt: '2026-06-19T10:06:04.000Z',
    }));
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
      memberTargets: [{ memberAddress: '/lead', memberName: 'Lead', agentRunId: 'member-1', memory: { latestMemoryAt: null, hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: true, hasRawArchive: false } }],
    }];

    const wrapper = mount(MemoryPage, { global: { plugins: [pinia] } });
    await nextTick();

    expect(wrapper.text()).toContain('Planning run');
    expect(wrapper.text()).toContain('Lead');
    expect(wrapper.text()).toMatch(/raw traces/i);

    await wrapper.findAll('button').find((button) => button.text().includes('Lead'))!.trigger('click');

    expect(inspectorStore.inspect).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'team_member_run',
      teamDefinitionId: 'team',
      teamDefinitionName: 'Software Team',
      teamRunId: 'team-run-1',
      agentRunId: 'member-1',
      memberAddress: '/lead',
      memberName: 'Lead',
      lastUpdatedAt: '2026-06-19T10:06:04.000Z',
    }));
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

});
