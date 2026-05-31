import { beforeEach, describe, it, expect, vi } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { nextTick } from 'vue';
import { useMemoryExplorerStore } from '~/stores/memoryExplorerStore';
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

  it('fetches Agents with Memory on home mount', async () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const wrapper = shallowMount(MemoryPage, { global: { plugins: [pinia] } });
    await nextTick();

    const store = useMemoryExplorerStore();
    expect(store.fetchAgents).toHaveBeenCalled();
    expect(wrapper.exists()).toBe(true);
  });

  it('navigates from Memory Home to Agent Memory Detail', async () => {
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
});
