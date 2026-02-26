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

const agentDefinitionStoreMock = vi.hoisted(() => ({
  agentDefinitions: [
    {
      id: 'agent-professor-def',
      name: 'Professor',
      avatarUrl: 'https://example.com/professor.png',
    },
  ],
  getAgentDefinitionById: vi.fn((id: string) => {
    if (id === 'agent-professor-def') {
      return {
        id: 'agent-professor-def',
        name: 'Professor',
        avatarUrl: 'https://example.com/professor.png',
      };
    }
    return null;
  }),
}));

vi.mock('~/stores/agentDefinitionStore', () => ({
  useAgentDefinitionStore: () => agentDefinitionStoreMock,
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
      config: {
        agentDefinitionId: 'agent-professor-def',
        agentDefinitionName: 'Professor',
        agentAvatarUrl: null,
      },
      state: {
        runId: 'member_a111',
        conversation: createConversation(),
      },
    };
    const studentContext = {
      config: {
        agentDefinitionId: 'agent-student-def',
        agentDefinitionName: 'Student',
        agentAvatarUrl: null,
      },
      state: {
        runId: 'member_b222',
        conversation: {
          ...createConversation(),
          id: 'team-1::student',
        },
      },
    };

    state.activeTeamContext = {
      teamRunId: 'team-1',
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
            props: ['conversation', 'agentName', 'agentAvatarUrl', 'interAgentSenderNameById'],
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

  it('passes focused member display name and avatar to AgentEventMonitor', () => {
    const wrapper = shallowMount(AgentTeamEventMonitor, {
      global: {
        stubs: {
          AgentEventMonitor: {
            name: 'AgentEventMonitor',
            props: ['conversation', 'agentName', 'agentAvatarUrl', 'interAgentSenderNameById'],
            template: '<div class="agent-event-monitor-stub" />',
          },
        },
      },
    });

    const monitor = wrapper.findComponent({ name: 'AgentEventMonitor' });
    expect(monitor.exists()).toBe(true);
    expect(monitor.props('agentName')).toBe('Professor');
    expect(monitor.props('agentAvatarUrl')).toBe('https://example.com/professor.png');
  });
});
