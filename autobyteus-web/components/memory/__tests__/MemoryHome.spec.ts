import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import MemoryHome from '../MemoryHome.vue';
import { useMemorySearchStore } from '~/stores/memorySearchStore';

/**
 * The Memory page's home: Browse · Search · Index (MemorySectionTabs) on each top-level page; on Browse they are given to
 * MemoryBrowse's top row (autobyteus-608 DC-001), which shows them on its tabs and never on an owner's page (its spec).
 */
const browseStub = {
  props: ['nodeKey', 'pane'],
  emits: ['inspectMember'],
  template: `<div><slot name="sections" /><div data-test="browse-stub">{{ nodeKey }}</div>
    <button data-test="browse-inspect" @click="$emit('inspectMember', 'r1', { agentRunId: 'm1' }, 'SE Team', 'Planning run')" /></div>`,
};

describe('MemoryHome', () => {
  const mountHome = (props: Record<string, unknown> = {}, pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true })) => mount(MemoryHome, {
    props: { section: 'browse', nodeKey: 'agents', pane: null, ...props },
    global: {
      plugins: [pinia],
      stubs: { MemoryBrowse: browseStub, MemorySearchPanel: true, MemorySearchResults: true, MemoryIndexPanel: true },
    },
  });

  it("gives Browse, Search and Index to MemoryBrowse's top row, and passes the Browse address to it", async () => {
    const wrapper = mountHome({ nodeKey: 'teams/team:se', pane: 'runs' });
    expect(wrapper.findAll('[role="tab"]').map((tab) => tab.text())).toEqual(['Browse', 'Search', 'Index']);
    expect(wrapper.get('[data-test="memory-section-browse"]').attributes('aria-selected')).toBe('true');
    expect(wrapper.find('[data-test="browse-stub"]').text()).toBe('teams/team:se');
    await wrapper.find('[data-test="memory-section-search"]').trigger('click');
    expect(wrapper.emitted('changeSection')?.[0]).toEqual(['search']);
  });

  it('shows Browse, Search and Index above Search and Index', () => {
    for (const section of ['search', 'index'] as const) {
      const wrapper = mountHome({ section });
      expect(wrapper.findAll('[role="tab"]').map((tab) => tab.text())).toEqual(['Browse', 'Search', 'Index']);
      expect(wrapper.get(`[data-test="memory-section-${section}"]`).attributes('aria-selected')).toBe('true');
      expect(wrapper.find('[data-test="browse-stub"]').exists()).toBe(false);
    }
  });

  it("passes a member run's summary on to the page with the member (autobyteus-608 DEC-002)", async () => {
    const wrapper = mountHome();
    await wrapper.get('[data-test="browse-inspect"]').trigger('click');
    expect(wrapper.emitted('inspectMember')).toEqual([['r1', { agentRunId: 'm1' }, 'SE Team', 'Planning run']]);
  });

  it('shows the Index tab badge from the memory index status', () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const search = useMemorySearchStore();
    search.index = { phase: 'needs_index', steps: [], builtWithModel: null, activeModel: 'granite', updatedAt: null, runCount: 0, textIndexHasContent: false };
    const wrapper = mountHome({}, pinia);
    expect(wrapper.find('[data-test="memory-section-index"]').find('.bg-amber-400').exists()).toBe(true);
    expect(search.loadIndexStatus).toHaveBeenCalled();
  });
});
