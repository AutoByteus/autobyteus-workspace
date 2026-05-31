import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import MemoryHome from '../MemoryHome.vue';
import { useMemoryExplorerStore } from '~/stores/memoryExplorerStore';

describe('MemoryHome', () => {
  it('renders agents with memory and emits selection', async () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const store = useMemoryExplorerStore();
    store.homeTab = 'agents';
    store.agents.entries = [{ attribution: 'DEFINITION', agentDefinitionId: 'codex', displayName: 'Codex', stableId: 'codex', runCount: 2, memory: { latestMemoryAt: null, hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: false, hasRawArchive: false } }];

    const wrapper = mount(MemoryHome, { global: { plugins: [pinia] } });

    expect(wrapper.text()).toMatch(/agents with memory/i);
    expect(wrapper.text()).toContain('Codex');
    await wrapper.findAll('button').find((button) => button.text().includes('Codex'))!.trigger('click');
    expect(wrapper.emitted('selectAgent')?.[0]?.[0]).toMatchObject({ displayName: 'Codex' });
  });

  it('switches to Agent Teams with Memory', async () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const store = useMemoryExplorerStore();
    const wrapper = mount(MemoryHome, { global: { plugins: [pinia] } });

    await wrapper.findAll('button').find((button) => /agent teams with memory/i.test(button.text()))!.trigger('click');

    expect(store.setHomeTab).toHaveBeenCalledWith('teams');
  });
});
