import { describe, it, expect, vi } from 'vitest';
import { mount, config } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import RunningAgentsPanel from '../RunningAgentsPanel.vue';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({
    query: vi.fn(),
    mutate: vi.fn(),
  }),
}));

describe('RunningAgentsPanel', () => {
  const mountComponent = () => {
    return mount(RunningAgentsPanel, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              agentDefinition: {
                agentDefinitions: [{ id: 'def-1', name: 'Test Agent' }]
              },
              agentContexts: {
                runs: new Map([
                  ['inst-1', {
                    config: { agentDefinitionId: 'def-1', agentDefinitionName: 'Test Agent' },
                    state: { runId: 'inst-1' }
                  }]
                ])
              }
            }
          })
        ],
        stubs: {
          AgentPickerDropdown: true,
          RunningAgentGroup: true,
          RunningTeamGroup: true
        }
      }
    });
  };

  it('should render agent groups correctly', () => {
    const wrapper = mountComponent();
    const group = wrapper.findComponent({ name: 'RunningAgentGroup' });
    
    expect(group.exists()).toBe(true);
    expect(group.props('definitionId')).toBe('def-1');
  });

  it('should select an agent runContext when emitted from group', async () => {
    const wrapper = mountComponent();
    const store = useAgentSelectionStore(); // Mocked store
    const group = wrapper.findComponent({ name: 'RunningAgentGroup' });

    await group.vm.$emit('select', 'inst-1');

    expect(store.selectRun).toHaveBeenCalledWith('inst-1', 'agent');
  });

  it('should prepare new run config from definition', async () => {
    const wrapper = mountComponent();
    const configStore = useAgentRunConfigStore();
    const contextsStore = useAgentContextsStore();
    const selectionStore = useAgentSelectionStore();
    const group = wrapper.findComponent({ name: 'RunningAgentGroup' });

    await group.vm.$emit('create', 'def-1');

    expect(configStore.setAgentConfig).toHaveBeenCalled();
    expect(selectionStore.clearSelection).toHaveBeenCalled();
    expect(contextsStore.createRunFromTemplate).not.toHaveBeenCalled();
  });
});
