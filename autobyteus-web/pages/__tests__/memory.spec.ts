import { describe, it, expect, vi } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useAgentMemoryIndexStore } from '~/stores/agentMemoryIndexStore';
import MemoryPage from '../memory.vue';

describe('memory page', () => {
  it('fetches memory index on mount', () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    setActivePinia(pinia);
    const wrapper = shallowMount(MemoryPage, {
      global: {
        plugins: [pinia],
        stubs: {
          MemoryIndexPanel: true,
          MemoryInspector: true,
        },
      },
    });

    const indexStore = useAgentMemoryIndexStore();
    expect(indexStore.fetchIndex).toHaveBeenCalled();
    expect(wrapper.exists()).toBe(true);
  });
});
