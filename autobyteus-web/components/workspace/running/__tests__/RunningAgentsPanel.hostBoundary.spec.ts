import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import RunningAgentsPanel from '../RunningAgentsPanel.vue';

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({
    query: vi.fn(),
    mutate: vi.fn(),
  }),
}));

describe('RunningAgentsPanel host boundary', () => {
  const mountComponent = () => {
    return mount(RunningAgentsPanel, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              agentDefinition: {
                agentDefinitions: [{ id: 'def-1', name: 'Test Agent' }],
              },
              agentContexts: {
                runs: new Map([
                  [
                    'inst-1',
                    {
                      config: { agentDefinitionId: 'def-1', agentDefinitionName: 'Test Agent' },
                      state: { runId: 'inst-1' },
                    },
                  ],
                ]),
              },
              teamRunConfig: { config: null },
            },
          }),
        ],
        stubs: {
          RunningAgentGroup: true,
          RunningTeamGroup: true,
        },
      },
    });
  };

  it('emits semantic run-selected event for host routing decisions', async () => {
    const wrapper = mountComponent();
    const group = wrapper.findComponent({ name: 'RunningAgentGroup' });

    await group.vm.$emit('select', 'inst-1');

    expect(wrapper.emitted('run-selected')).toEqual([[{ type: 'agent', runId: 'inst-1' }]]);
  });

  it('emits semantic run-created event for host routing decisions', async () => {
    const wrapper = mountComponent();
    const group = wrapper.findComponent({ name: 'RunningAgentGroup' });

    await group.vm.$emit('create', 'def-1');

    expect(wrapper.emitted('run-created')).toEqual([[{ type: 'agent', definitionId: 'def-1' }]]);
  });
});
