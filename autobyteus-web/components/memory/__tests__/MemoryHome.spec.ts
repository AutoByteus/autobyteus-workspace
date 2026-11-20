import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import MemoryHome from '../MemoryHome.vue';
import { useMemorySearchStore } from '~/stores/memorySearchStore';

/** The Memory page's home: the Browse / Search / Index control; Browse is MemoryBrowse (its own spec). */
describe('MemoryHome', () => {
  const mountHome = (props: Record<string, unknown> = {}) => mount(MemoryHome, {
    props: { section: 'browse', nodeKey: 'agents', pane: null, ...props },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: true })],
      stubs: { MemoryBrowse: { props: ['nodeKey', 'pane'], template: '<div data-test="browse-stub">{{ nodeKey }}</div>' } },
    },
  });

  it('shows Browse, Search and Index, and passes the Browse address to MemoryBrowse', async () => {
    const wrapper = mountHome({ nodeKey: 'teams/team:se', pane: 'runs' });
    expect(wrapper.findAll('[role="tab"]').map((tab) => tab.text())).toEqual(['Browse', 'Search', 'Index']);
    expect(wrapper.find('[data-test="browse-stub"]').text()).toBe('teams/team:se');
    await wrapper.find('[data-test="memory-section-search"]').trigger('click');
    expect(wrapper.emitted('changeSection')?.[0]).toEqual(['search']);
  });

  it('shows the Index tab badge from the memory index status', async () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const search = useMemorySearchStore();
    search.index = { phase: 'needs_index', steps: [], builtWithModel: null, activeModel: 'granite', updatedAt: null, runCount: 0, textIndexHasContent: false };
    const wrapper = mount(MemoryHome, {
      props: { section: 'browse', nodeKey: 'agents', pane: null },
      global: { plugins: [pinia], stubs: { MemoryBrowse: true } },
    });
    expect(wrapper.find('[data-test="memory-section-index"]').find('.bg-amber-400').exists()).toBe(true);
    expect(search.loadIndexStatus).toHaveBeenCalled();
  });
});
