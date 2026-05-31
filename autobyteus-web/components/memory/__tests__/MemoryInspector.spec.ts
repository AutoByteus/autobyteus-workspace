import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import MemoryInspector from '../MemoryInspector.vue';
import { useMemoryInspectorStore } from '~/stores/memoryInspectorStore';

describe('MemoryInspector', () => {
  it('renders empty state when no target is selected', () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const wrapper = mount(MemoryInspector, { global: { plugins: [pinia] } });
    expect(wrapper.text()).toContain('Select a memory entry');
  });

  it('calls setActiveTab when opening Raw Traces', async () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const store = useMemoryInspectorStore();
    store.target = { kind: 'agent_run', runId: 'run-1', agentDisplayName: 'Codex' };
    const wrapper = mount(MemoryInspector, { global: { plugins: [pinia] } });

    await wrapper.findAll('button').find((button) => button.text().includes('Raw Traces'))!.trigger('click');

    expect(store.setActiveTab).toHaveBeenCalledWith('raw');
  });

  it('renders team breadcrumb context', () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const store = useMemoryInspectorStore();
    store.target = { kind: 'team_member_run', teamDefinitionName: 'Alpha Team', teamRunId: 'team-1', memberRunId: 'member-1', memberName: 'Coordinator' };
    const wrapper = mount(MemoryInspector, { global: { plugins: [pinia] } });
    expect(wrapper.text()).toContain('Agent Teams / Alpha Team / team-1 / Coordinator');
  });
});
