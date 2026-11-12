import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import MemoryHome from '../MemoryHome.vue';
import { useMemoryExplorerStore } from '~/stores/memoryExplorerStore';
import { useMemorySearchStore } from '~/stores/memorySearchStore';

describe('MemoryHome', () => {
  it('renders concise agent catalog copy and emits selection', async () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const store = useMemoryExplorerStore();
    store.homeTab = 'agents';
    store.agents.entries = [{
      attribution: 'DEFINITION',
      agentDefinitionId: 'codex',
      displayName: 'Codex',
      stableId: 'codex',
      runCount: 2,
      latestMemoryAt: '2026-06-19T10:06:04.000Z',
      memory: { latestMemoryAt: '2026-06-19T10:06:04.000Z', hasWorkJournal: true, hasRawTraces: true, hasRawArchive: false },
    }];

    const wrapper = mount(MemoryHome, { global: { plugins: [pinia] } });

    expect(wrapper.findAll('[role="tab"]').map((tab) => tab.text())).toEqual(['Browse', 'Search', 'Index']);
    const browseTabs = wrapper.find('[data-test="memory-browse"]').findAll('button').slice(0, 3).map((button) => button.text());
    expect(browseTabs).toEqual(['Agents', 'Agent Teams', 'Agent Orgs']);
    expect(wrapper.find('h1').exists()).toBe(false);
    // One memory source: no source selector; no availability badge while nothing is missing.
    expect(wrapper.text()).not.toContain('Memory source');
    expect(wrapper.text()).not.toMatch(/agents with memory|work journal|raw traces/i);
    expect(wrapper.find('[data-test="memory-browse-filter"]').attributes('placeholder')).toBe('Search agents'); // the template's key (test $t fallback)
    expect(wrapper.text()).toContain('Codex');
    expect(wrapper.text()).not.toContain('Latest memory:');
    await wrapper.findAll('button').find((button) => button.text().includes('Codex'))!.trigger('click');
    expect(wrapper.emitted('selectAgent')?.[0]?.[0]).toMatchObject({ displayName: 'Codex' });
  });

  it('switches to concise Agent Teams tab copy', async () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const store = useMemoryExplorerStore();
    const wrapper = mount(MemoryHome, { global: { plugins: [pinia] } });

    await wrapper.findAll('button').find((button) => /agent teams/i.test(button.text()))!.trigger('click');

    expect(wrapper.text()).not.toMatch(/agent teams with memory/i);
    expect(store.setHomeTab).toHaveBeenCalledWith('teams');
  });

  it('renders Agent Orgs cards, searches orgs and emits org selection', async () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const store = useMemoryExplorerStore();
    store.homeTab = 'orgs';
    store.orgs.entries = [{
      orgDefinitionId: 'org-a',
      orgDefinitionName: 'Alpha Org',
      orgRunCount: 5,
      memberMemoryCount: 16,
      latestMemoryAt: '2026-09-01T01:00:00.000Z',
      memory: { latestMemoryAt: null, hasWorkJournal: true, hasRawTraces: false, hasRawArchive: false },
    }];

    const wrapper = mount(MemoryHome, { global: { plugins: [pinia] } });

    expect(wrapper.find('[data-test="memory-browse-filter"]').attributes('placeholder')).toBe('Search agent orgs');
    expect(wrapper.text()).toContain('Alpha Org');
    expect(wrapper.text()).toContain('org-a');
    expect(wrapper.text()).toContain('5 runs');
    expect(wrapper.text()).toContain('16');

    // The filter applies on Enter (and as you type, after 300 ms).
    await wrapper.find('[data-test="memory-browse-filter"]').setValue(' alpha ');
    await wrapper.find('[data-test="memory-browse-filter"]').trigger('keyup.enter');
    expect(store.setOrgsSearch).toHaveBeenCalledWith('alpha');

    await wrapper.findAll('button').find((button) => button.text().includes('Alpha Org'))!.trigger('click');
    expect(wrapper.emitted('selectOrg')?.[0]?.[0]).toMatchObject({ orgDefinitionId: 'org-a' });
  });

  it('shows the Agent Orgs empty state and retries the active org tab', async () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const store = useMemoryExplorerStore();
    store.homeTab = 'orgs';
    const empty = mount(MemoryHome, { global: { plugins: [pinia] } });
    expect(empty.text()).toMatch(/no org memories yet/i);

    store.orgs.error = 'boom';
    await empty.vm.$nextTick();
    await empty.findAll('button').find((button) => button.text() === 'Retry')!.trigger('click');
    expect(store.fetchHomeTab).toHaveBeenCalledWith('orgs');
  });

  it('tags a task team with its starter and shows the missing-memory note only when something is missing', () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const store = useMemoryExplorerStore();
    store.homeTab = 'teams';
    store.teams.entries = [
      { teamDefinitionId: 'task-team-x', teamDefinitionName: 'Release Crew', teamRunCount: 1, memberMemoryCount: 2, isTaskTeam: true, startedByAgentName: 'Project Task Manager',
        memory: { latestMemoryAt: null, hasWorkJournal: false, hasRawTraces: true, hasRawArchive: false } },
      { teamDefinitionId: 'team-a', teamDefinitionName: 'Alpha Team', teamRunCount: 3, memberMemoryCount: 4,
        memory: { latestMemoryAt: null, hasWorkJournal: true, hasRawTraces: true, hasRawArchive: false } },
    ];
    const wrapper = mount(MemoryHome, { global: { plugins: [pinia] } });
    const tags = wrapper.findAll('[data-test="memory-task-team-tag"]');
    expect(tags).toHaveLength(1);
    expect(tags[0]!.text()).toBe('Task team');
    expect(tags[0]!.attributes('title')).toBe('Task team started by'); // memory.browse.task_team_started_by (test $t fallback)
    expect(wrapper.text().match(/No Work Journal/g)).toHaveLength(1);
  });

  it('shows the Index tab badge from the memory index status', () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const search = useMemorySearchStore();
    search.index = { phase: 'needs_index', steps: [], builtWithModel: null, activeModel: 'granite', updatedAt: null, runCount: 0, textIndexHasContent: false };
    const wrapper = mount(MemoryHome, { props: { section: 'browse' }, global: { plugins: [pinia] } });
    const indexTab = wrapper.find('[data-test="memory-section-index"]');
    expect(indexTab.find('.bg-amber-400').exists()).toBe(true);
    expect(search.loadIndexStatus).toHaveBeenCalled();
  });
});
