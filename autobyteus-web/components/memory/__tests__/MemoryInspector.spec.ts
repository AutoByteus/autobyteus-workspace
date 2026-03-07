import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import MemoryInspector from '../MemoryInspector.vue';
import { useAgentMemoryViewStore } from '~/stores/agentMemoryViewStore';
import { useMemoryScopeStore } from '~/stores/memoryScopeStore';
import { useTeamMemoryViewStore } from '~/stores/teamMemoryViewStore';

describe('MemoryInspector', () => {
  const mountComponent = () => {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true });
    const wrapper = mount(MemoryInspector, {
      global: {
        plugins: [pinia],
      },
    });
    return { wrapper, pinia };
  };

  it('renders empty state when no selection', () => {
    const { wrapper } = mountComponent();
    expect(wrapper.text()).toContain('Select a memory entry');
  });

  it('calls setIncludeRawTraces when opening raw tab', async () => {
    const { wrapper } = mountComponent();
    const viewStore = useAgentMemoryViewStore();
    viewStore.selectedRunId = 'agent-1';
    await wrapper.vm.$nextTick();

    const rawTab = wrapper.findAll('button').find((btn) => btn.text().includes('Raw Traces'));
    expect(rawTab).toBeTruthy();
    await rawTab!.trigger('click');

    expect(viewStore.setIncludeRawTraces).toHaveBeenCalledWith(true);
  });

  it('renders team context header when team scope selection exists', async () => {
    const { wrapper } = mountComponent();
    const scopeStore = useMemoryScopeStore();
    const teamViewStore = useTeamMemoryViewStore();

    scopeStore.scope = 'team';
    teamViewStore.selectedTeamRunId = 'team-1';
    teamViewStore.selectedTeamDefinitionName = 'Alpha Team';
    teamViewStore.selectedMemberName = 'Coordinator';
    teamViewStore.selectedMemberRunId = 'member-1';

    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Team: Alpha Team / Member: Coordinator / Run: member-1');
  });
});
