import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import RemoteAgentCard from '../RemoteAgentCard.vue';

const baseAgent = {
  homeNodeId: 'remote-1',
  definitionId: 'agent-remote',
  name: 'Remote Agent',
  role: 'helper',
  description: 'Remote agent description',
  avatarUrl: null,
  toolNames: ['search_web', 'read_file', 'write_file', 'run_bash'],
  skillNames: ['planner', 'reviewer'],
};

describe('RemoteAgentCard', () => {
  it('emits run when node is ready and button is clicked', async () => {
    const wrapper = mount(RemoteAgentCard, {
      props: {
        agent: baseAgent,
        nodeStatus: 'ready',
      },
    });

    const button = wrapper.get('button');
    expect((button.element as HTMLButtonElement).disabled).toBe(false);

    await button.trigger('click');
    expect(wrapper.emitted('run')).toHaveLength(1);
    expect(wrapper.text()).toContain('Run on home node');
    expect(wrapper.text()).toContain('Tools 4');
    expect(wrapper.text()).toContain('Skills 2');
    expect(wrapper.text()).toContain('+1');
    expect(wrapper.text()).toContain('RE');
  });

  it('shows busy state while run handoff is in progress', () => {
    const wrapper = mount(RemoteAgentCard, {
      props: {
        agent: baseAgent,
        nodeStatus: 'ready',
        busy: true,
      },
    });

    const button = wrapper.get('button');
    expect((button.element as HTMLButtonElement).disabled).toBe(true);
    expect(wrapper.text()).toContain('Opening...');
    expect(wrapper.text()).toContain('Preparing destination node window...');
  });

  it('disables run when remote node is degraded', () => {
    const wrapper = mount(RemoteAgentCard, {
      props: {
        agent: baseAgent,
        nodeStatus: 'degraded',
        nodeErrorMessage: 'Node health probe failed',
      },
    });

    const button = wrapper.get('button');
    expect((button.element as HTMLButtonElement).disabled).toBe(true);
    expect(wrapper.text()).toContain('Node health probe failed');
  });

  it('renders avatar image when provided', () => {
    const wrapper = mount(RemoteAgentCard, {
      props: {
        agent: {
          ...baseAgent,
          avatarUrl: 'http://localhost:8001/images/agent.png',
          toolNames: [],
          skillNames: [],
        },
        nodeStatus: 'ready',
      },
    });

    const avatarImage = wrapper.find('img');
    expect(avatarImage.exists()).toBe(true);
    expect(avatarImage.attributes('src')).toBe('http://localhost:8001/images/agent.png');
    expect(wrapper.text()).toContain('None');
  });
});
