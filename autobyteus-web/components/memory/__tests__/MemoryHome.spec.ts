import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import MemoryHome from '../MemoryHome.vue';
import { useMemoryExplorerStore } from '~/stores/memoryExplorerStore';

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
      memory: { latestMemoryAt: '2026-06-19T10:06:04.000Z', hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: false, hasRawArchive: false },
    }];

    const wrapper = mount(MemoryHome, { global: { plugins: [pinia] } });

    const tabLabels = wrapper.findAll('button').slice(0, 2).map((button) => button.text());
    expect(tabLabels).toEqual(['Agents', 'Agent teams']);
    expect(wrapper.find('h1').exists()).toBe(false);
    expect(wrapper.text()).toContain('Memory source');
    expect(wrapper.text()).not.toMatch(/inspect stored agent and team memories/i);
    expect(wrapper.text()).not.toMatch(/agents with memory/i);
    expect(wrapper.find('input').attributes('placeholder')).toMatch(/search agents/i);
    expect(wrapper.find('input').attributes('placeholder')).not.toMatch(/with memory/i);
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
      memory: { latestMemoryAt: null, hasWorkingContext: true, hasEpisodic: false, hasSemantic: true, hasRawTraces: false, hasRawArchive: false },
    }];

    const wrapper = mount(MemoryHome, { global: { plugins: [pinia] } });

    expect(wrapper.findAll('button').slice(0, 3).map((button) => button.text())[2]).toMatch(/agent orgs/i);
    expect(wrapper.find('input').attributes('placeholder')).toMatch(/search agent orgs/i);
    expect(wrapper.text()).toContain('Alpha Org');
    expect(wrapper.text()).toContain('org-a');
    expect(wrapper.text()).toContain('5 runs');
    expect(wrapper.text()).toContain('16');

    await wrapper.find('input').setValue(' alpha ');
    await wrapper.findAll('button').find((button) => button.text() === 'Search')!.trigger('click');
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
});
