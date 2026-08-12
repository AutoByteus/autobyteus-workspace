import { beforeEach, describe, expect, it, vi } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import AgentTeamEventMonitor from '../AgentTeamEventMonitor.vue';
import { buildTestTeamContext, testAgentContext, testAgentNode, testSubTeamNode } from '~/test-support/currentTeamTestFixtures';
import { createTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';

const { state, teamContextsStoreMock } = vi.hoisted(() => {
  const localState = {
    activeTeamContext: null as any,
    focusedMemberContext: null as any,
    focusedMemberNode: null as any,
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
      get focusedMemberNode() {
        return localState.focusedMemberNode;
      },
      focusMemberAndEnsureHydrated: vi.fn().mockResolvedValue(undefined),
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
    const professorContext = testAgentContext({
      runId: 'member_a111',
      displayName: 'Professor',
      agentDefinitionId: 'agent-professor-def',
    });
    professorContext.state.conversation = createConversation() as any;
    professorContext.state.compactionStatus = {
      phase: 'requested',
      message: 'Compaction queued',
      turnId: 'turn-1',
    } as any;
    const studentContext = testAgentContext({
      runId: 'member_b222',
      displayName: 'Student',
      agentDefinitionId: 'agent-student-def',
    });
    studentContext.state.conversation = { ...createConversation(), id: 'team-1::student' } as any;

    const professorNode = testAgentNode('/Professor', {
      displayName: 'Professor',
      agentRunId: 'member_a111',
      agentDefinitionId: 'agent-professor-def',
    });
    const studentNode = testAgentNode('/sub-team/Student', {
      displayName: 'Student',
      agentRunId: 'member_b222',
      agentDefinitionId: 'agent-student-def',
    });
    state.activeTeamContext = buildTestTeamContext({
      teamRunId: 'team-1',
      coordinatorAddress: '/Professor',
      focusedExecutionAddress: createTeamExecutionAddress({ rootTeamRunId: 'team-1', memberAddress: '/Professor' }),
      rootChildren: [
        professorNode,
        testSubTeamNode('/sub-team', [studentNode], { displayName: 'Sub Team', coordinatorAddress: '/sub-team/Student' }),
      ],
      contexts: [
        { executionAddress: createTeamExecutionAddress({ rootTeamRunId: 'team-1', memberAddress: '/Professor' }), context: professorContext },
        { executionAddress: createTeamExecutionAddress({ rootTeamRunId: 'team-1', memberAddress: '/sub-team/Student' }), context: studentContext },
      ],
    });
    state.focusedMemberContext = professorContext;
    state.focusedMemberNode = professorNode;
  });

  it('passes sender-id to member-name mapping to AgentEventMonitor', () => {
    const wrapper = shallowMount(AgentTeamEventMonitor, {
      global: {
        stubs: {
          AgentEventMonitor: {
            name: 'AgentEventMonitor',
            props: ['conversation', 'runId', 'agentName', 'agentAvatarUrl', 'interAgentSenderNameById'],
            template: '<div class="agent-event-monitor-stub" />',
          },
        },
      },
    });

    const monitor = wrapper.findComponent({ name: 'AgentEventMonitor' });
    expect(monitor.exists()).toBe(true);
    expect(wrapper.get('[data-testid="agent-team-event-monitor"]').classes()).toEqual(expect.arrayContaining([
      'h-full',
      'min-h-0',
      'flex-col',
      'overflow-hidden',
    ]));
    expect(monitor.classes()).toEqual(expect.arrayContaining(['min-h-0', 'flex-1', 'overflow-hidden']));
    expect(monitor.props('interAgentSenderNameById')).toEqual({
      member_a111: 'Professor',
      member_b222: 'Student',
    });
    expect(monitor.props('conversation')).toMatchObject({ id: 'team-1::professor' });
    expect(monitor.props('runId')).toBe('member_a111');
  });

  it('passes focused member display name and avatar to AgentEventMonitor', () => {
    const wrapper = shallowMount(AgentTeamEventMonitor, {
      global: {
        stubs: {
          AgentEventMonitor: {
            name: 'AgentEventMonitor',
            props: ['conversation', 'runId', 'agentName', 'agentAvatarUrl', 'interAgentSenderNameById'],
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

  it('uses roster focus for displayed Focus history while active execution can remain on the coordinator', () => {
    const studentAddress = createTeamExecutionAddress({ rootTeamRunId: 'team-1', memberAddress: '/sub-team/Student' });
    expect(state.activeTeamContext.executions.focus(studentAddress).disposition).toBe('applied');
    state.focusedMemberContext = state.activeTeamContext.executions.getAgentContext(studentAddress);
    state.focusedMemberNode = state.activeTeamContext.topology.getNode('/sub-team/Student');

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
    expect(monitor.props('agentName')).toBe('Student');
    expect((monitor.props('conversation') as any).id).toBe('team-1::student');
  });

  it('does not render task-agent work packets as the logical parent conversation', () => {
    const studentAddress = createTeamExecutionAddress({ rootTeamRunId: 'team-1', memberAddress: '/sub-team/Student' });
    const studentContext = state.activeTeamContext.executions.getAgentContext(studentAddress);
    studentContext.state.conversation.messages.push({
      type: 'user',
      text: 'You have been activated as task agent task_agent_task_0001.\nTask-agent run: team-1__student__task_0001',
      timestamp: new Date('2026-05-30T00:00:00.000Z'),
    });
    expect(state.activeTeamContext.executions.focus(studentAddress).disposition).toBe('applied');
    state.focusedMemberContext = studentContext;
    state.focusedMemberNode = state.activeTeamContext.topology.getNode('/sub-team/Student');

    const wrapper = shallowMount(AgentTeamEventMonitor, {
      global: {
        mocks: {
          $t: (key: string) => key,
        },
        stubs: {
          AgentEventMonitor: {
            name: 'AgentEventMonitor',
            props: ['conversation', 'agentName', 'agentAvatarUrl', 'interAgentSenderNameById'],
            template: '<div class="agent-event-monitor-stub" />',
          },
        },
      },
    });

    expect(wrapper.findComponent({ name: 'AgentEventMonitor' }).exists()).toBe(false);
    expect(wrapper.text()).toContain('workspace.components.workspace.team.AgentTeamEventMonitor.no_activity_yet');
  });
});
