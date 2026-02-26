import { beforeEach, describe, expect, it, vi } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import AgentTeamEventMonitor from '../AgentTeamEventMonitor.vue';

const { state, teamContextsStoreMock } = vi.hoisted(() => {
  const localState = {
    activeTeamContext: null as any,
    focusedMemberContext: null as any,
  };

  return {
    state: localState,
    teamContextsStoreMock: {
      get activeTeamContext() {
        return localState.activeTeamContext;
      },
      get focusedMemberContext() {
        return localState.focusedMemberContext;
      },
    },
  };
});

vi.mock('~/stores/agentTeamContextsStore', () => ({
  useAgentTeamContextsStore: () => teamContextsStoreMock,
}));

const createConversation = () => ({
  id: 'team-1::professor',
  createdAt: '2026-02-17T00:00:00.000Z',
  updatedAt: '2026-02-17T00:00:00.000Z',
  messages: [],
});

describe('AgentTeamEventMonitor.vue', () => {
  beforeEach(() => {
    const professorContext = {
      state: {
        agentId: 'member_a111',
        conversation: createConversation(),
      },
    };
    const studentContext = {
      state: {
        agentId: 'member_b222',
        conversation: {
          ...createConversation(),
          id: 'team-1::student',
        },
      },
    };

    state.activeTeamContext = {
      teamId: 'team-1',
      members: new Map<string, any>([
        ['professor', professorContext],
        ['sub-team/student', studentContext],
      ]),
    };
    state.focusedMemberContext = professorContext;
  });

  it('passes sender-id to member-name mapping to AgentEventMonitor', () => {
    const wrapper = shallowMount(AgentTeamEventMonitor, {
      global: {
        stubs: {
          AgentEventMonitor: {
            name: 'AgentEventMonitor',
            props: ['conversation', 'interAgentSenderNameById'],
            template: '<div class="agent-event-monitor-stub" />',
          },
        },
      },
    });

    const monitor = wrapper.findComponent({ name: 'AgentEventMonitor' });
    expect(monitor.exists()).toBe(true);
    expect(monitor.props('interAgentSenderNameById')).toEqual({
      member_a111: 'Professor',
      member_b222: 'Student',
    });
  });
});
