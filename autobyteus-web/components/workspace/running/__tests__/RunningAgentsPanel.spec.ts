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
  const mountComponent = (initialStateOverrides: Record<string, unknown> = {}) => {
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
              },
              ...initialStateOverrides,
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

  it('prefers the selected same-definition run when preparing a new agent run config', async () => {
    const wrapper = mountComponent({
      agentSelection: {
        selectedType: 'agent',
        selectedRunId: 'inst-selected',
      },
      agentContexts: {
        runs: new Map([
          ['inst-first', {
            config: {
              agentDefinitionId: 'def-1',
              agentDefinitionName: 'Test Agent',
              llmModelIdentifier: 'model-first',
              llmConfig: { reasoning_effort: 'low' },
              isLocked: true,
            },
            state: {
              runId: 'inst-first',
              conversation: { updatedAt: '2026-01-02T00:00:00.000Z' },
            },
          }],
          ['inst-selected', {
            config: {
              agentDefinitionId: 'def-1',
              agentDefinitionName: 'Test Agent',
              llmModelIdentifier: 'model-selected',
              llmConfig: {
                reasoning_effort: 'xhigh',
                nested: { values: ['xhigh'] },
              },
              isLocked: true,
            },
            state: {
              runId: 'inst-selected',
              conversation: { updatedAt: '2026-01-01T00:00:00.000Z' },
            },
          }],
        ]),
      },
    });
    const configStore = useAgentRunConfigStore();
    const group = wrapper.findComponent({ name: 'RunningAgentGroup' });

    await group.vm.$emit('create', 'def-1');

    const seed = (configStore.setAgentConfig as any).mock.calls.at(-1)?.[0];
    expect(seed).toEqual(expect.objectContaining({
      llmModelIdentifier: 'model-selected',
      isLocked: false,
      llmConfig: {
        reasoning_effort: 'xhigh',
        nested: { values: ['xhigh'] },
      },
    }));
  });
});
