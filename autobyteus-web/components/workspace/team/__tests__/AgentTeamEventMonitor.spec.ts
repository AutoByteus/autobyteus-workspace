import { beforeEach, describe, expect, it, vi } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import AgentTeamEventMonitor from '../AgentTeamEventMonitor.vue';
import {
  buildTestTeamContext,
  testAgentContext,
  testAgentNode,
  testSubTeamNode,
  testTaskRecord,
} from '~/test-support/currentTeamTestFixtures';

const { state, teamContextsStoreMock, activityStoreMock, authorityMock } = vi.hoisted(() => {
  const localState = { activeTeamContext: null as any, activities: [] as any[] };
  return { state: localState, teamContextsStoreMock: {
    get activeTeamContext() { return localState.activeTeamContext; },
  }, activityStoreMock: { getActivities: vi.fn(() => localState.activities) }, authorityMock: vi.fn() };
});
vi.mock('~/stores/agentTeamContextsStore', () => ({ useAgentTeamContextsStore: () => teamContextsStoreMock }));
vi.mock('~/stores/agentActivityStore', () => ({ useAgentActivityStore: () => activityStoreMock }));
vi.mock('~/services/runHydration/teamMemberProjectionHydrationService', () => ({
  isTeamMemberProjectionAuthoritative: authorityMock,
}));

const agentDefinitionStoreMock = vi.hoisted(() => ({
  agentDefinitions: [{ id: 'agent-professor-def', name: 'Professor', avatarUrl: 'https://example.com/professor.png' }],
  getAgentDefinitionById: vi.fn((id: string) => id === 'agent-professor-def'
    ? { id, name: 'Professor', avatarUrl: 'https://example.com/professor.png' } : null),
}));
vi.mock('~/stores/agentDefinitionStore', () => ({ useAgentDefinitionStore: () => agentDefinitionStoreMock }));

const mountSubject = () => shallowMount(AgentTeamEventMonitor, {
  global: { mocks: { $t: (key: string) => key === 'workspace.task_monitor.empty'
    ? 'No activity recorded for this task yet.' : key }, stubs: { AgentEventMonitor: {
    name: 'AgentEventMonitor',
    props: ['conversation', 'runId', 'agentName', 'agentAvatarUrl', 'interAgentSenderNameById', 'browseSubject'],
    template: '<div class="agent-event-monitor-stub" />',
  } } },
});

describe('AgentTeamEventMonitor exact AgentRun focus', () => {
  beforeEach(() => {
    state.activities = [];
    authorityMock.mockReturnValue(false);
    const professor = testAgentContext({ runId: 'professor-run', displayName: 'Professor', agentDefinitionId: 'agent-professor-def' });
    const student = testAgentContext({ runId: 'student-run', displayName: 'Student', agentDefinitionId: 'agent-student-def' });
    const professorNode = testAgentNode('/Professor', { agentRunId: 'professor-run', agentDefinitionId: 'agent-professor-def' });
    const studentNode = testAgentNode('/sub-team/Student', { agentRunId: 'student-run', agentDefinitionId: 'agent-student-def' });
    state.activeTeamContext = buildTestTeamContext({
      teamRunId: 'team-1', coordinatorAddress: '/Professor', focusedAgentRunId: 'professor-run',
      rootChildren: [professorNode, testSubTeamNode('/sub-team', [studentNode], { coordinatorAddress: '/sub-team/Student' })],
      contexts: [
        { agentRunId: 'professor-run', context: professor },
        { agentRunId: 'student-run', context: student },
      ],
    });
  });

  it('passes exact run identity, human sender labels, conversation, and avatar to the monitor', () => {
    const wrapper = mountSubject();
    const monitor = wrapper.findComponent({ name: 'AgentEventMonitor' });
    expect(monitor.props('runId')).toBe('professor-run');
    expect(monitor.props('agentName')).toBe('Professor');
    expect(monitor.props('agentAvatarUrl')).toBe('https://example.com/professor.png');
    expect(monitor.props('interAgentSenderNameById')).toEqual({
      'professor-run': 'Professor', 'student-run': 'Student',
    });
    expect(monitor.props('browseSubject')).toEqual({
      kind: 'teamMember', teamRunId: 'team-1', memberAddress: '/Professor', agentRunId: 'professor-run',
    });
  });

  it('switches to the exact nested configured AgentRun', async () => {
    expect(state.activeTeamContext.view.focusAgent('student-run').disposition).toBe('applied');
    const wrapper = mountSubject();
    await wrapper.vm.$nextTick();
    const monitor = wrapper.findComponent({ name: 'AgentEventMonitor' });
    expect(monitor.props('runId')).toBe('student-run');
    expect(monitor.props('agentName')).toBe('Student');
  });

  it('renders a task Agent at the same placement as its own conversation, never the persistent substitute', () => {
    const persistent = state.activeTeamContext;
    const tree = persistent.view.getExecutionTree();
    const rebuilt = buildTestTeamContext({
      teamRunId: 'team-1', coordinatorAddress: '/Professor', focusedAgentRunId: 'task-student-run',
      rootChildren: [
        testAgentNode('/Professor', { agentRunId: 'professor-run', agentDefinitionId: 'agent-professor-def' }),
        testSubTeamNode('/sub-team', [testAgentNode('/sub-team/Student', { agentRunId: 'student-run' })], { coordinatorAddress: '/sub-team/Student' }),
      ],
      tasks: [testTaskRecord({
        taskId: 'task-1', delegatorAgentRunId: 'professor-run', recipientAddress: '/sub-team/Student',
        target: { agentRunId: 'task-student-run' }, description: 'Dedicated student work.',
      })],
      contexts: [{ agentRunId: 'task-student-run', context: testAgentContext({
        runId: 'task-student-run', displayName: 'Student', messages: [{
          type: 'user', text: 'Dedicated task packet', timestamp: new Date('2026-08-15T00:00:00.000Z'),
        }] as any,
      }) }],
      configuration: persistent.view.getConfigurationView(),
    });
    expect(tree.root_team.team_run_id).toBe(rebuilt.view.getRootTeamRunId());
    state.activeTeamContext = rebuilt;
    const monitor = mountSubject().findComponent({ name: 'AgentEventMonitor' });
    expect(monitor.props('runId')).toBe('task-student-run');
    expect((monitor.props('conversation') as any).messages[0].text).toBe('Dedicated task packet');
  });

  it('shows true-empty wording only for an authoritative exact task projection', () => {
    state.activeTeamContext = buildTestTeamContext({
      teamRunId: 'team-1', coordinatorAddress: '/Professor', focusedAgentRunId: 'empty-task-run',
      rootChildren: [testAgentNode('/Professor', { agentRunId: 'professor-run' })],
      tasks: [testTaskRecord({
        taskId: 'empty-task', delegatorAgentRunId: 'professor-run', recipientAddress: '/Professor',
        target: { agentRunId: 'empty-task-run' },
      })],
    });
    authorityMock.mockReturnValue(true);

    const wrapper = mountSubject();

    expect(wrapper.get('[data-test="team-task-authoritative-empty"]').text())
      .toBe('No activity recorded for this task yet.');
    expect(wrapper.text()).not.toContain(
      'workspace.components.workspace.team.AgentTeamEventMonitor.select_a_team_member_from_the',
    );
  });
});
