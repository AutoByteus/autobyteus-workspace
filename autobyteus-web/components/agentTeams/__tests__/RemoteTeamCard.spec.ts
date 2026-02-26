import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import RemoteTeamCard from '../RemoteTeamCard.vue';

const baseTeam = {
  homeNodeId: 'remote-1',
  definitionId: 'team-1',
  name: 'Remote Team',
  description: 'Distributed team',
  role: 'orchestrator',
  avatarUrl: 'http://localhost:8001/avatar.png',
  coordinatorMemberName: 'lead',
  memberCount: 4,
  nestedTeamCount: 1,
};

describe('RemoteTeamCard', () => {
  it('renders team details and emits run when enabled', async () => {
    const wrapper = mount(RemoteTeamCard, {
      props: {
        team: baseTeam,
        nodeStatus: 'ready',
      },
    });

    expect(wrapper.text()).toContain('Remote Team');
    expect(wrapper.text()).toContain('Coordinator: lead');
    expect(wrapper.text()).toContain('Members 4');
    expect(wrapper.text()).toContain('Nested 1');

    const runButton = wrapper.get('button');
    expect(runButton.attributes('disabled')).toBeUndefined();

    await runButton.trigger('click');
    expect(wrapper.emitted('run')).toHaveLength(1);
  });

  it('shows fallback initials when avatar URL is missing', () => {
    const wrapper = mount(RemoteTeamCard, {
      props: {
        team: {
          ...baseTeam,
          avatarUrl: null,
        },
        nodeStatus: 'ready',
      },
    });

    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.text()).toContain('RT');
  });

  it('disables run with remote node message when node is not ready', () => {
    const wrapper = mount(RemoteTeamCard, {
      props: {
        team: {
          ...baseTeam,
          avatarUrl: null,
        },
        nodeStatus: 'degraded',
        nodeErrorMessage: 'Node check failed',
      },
    });

    const runButton = wrapper.get('button');
    expect(runButton.attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('Node check failed');
  });

  it('shows busy state while remote run handoff is in progress', () => {
    const wrapper = mount(RemoteTeamCard, {
      props: {
        team: {
          ...baseTeam,
          avatarUrl: null,
        },
        nodeStatus: 'ready',
        busy: true,
      },
    });

    expect(wrapper.get('button').text()).toBe('Opening...');
    expect(wrapper.text()).toContain('Preparing destination node window...');
  });
});
