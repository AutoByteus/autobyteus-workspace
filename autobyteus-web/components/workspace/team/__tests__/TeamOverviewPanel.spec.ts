import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, nextTick } from 'vue';
import TeamOverviewPanel from '../TeamOverviewPanel.vue';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useTeamCommunicationStore } from '~/stores/teamCommunicationStore';
import { createTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import {
  buildTestTeamContext,
  reconcileTestTaskSnapshot,
  testAgentNode,
  testSubTeamNode,
  testTaskProjection,
} from '~/test-support/currentTeamTestFixtures';

const labels: Record<string, string> = {
  'workspace.components.workspace.team.TeamOverviewPanel.messages': 'Messages',
  'workspace.components.workspace.team.TeamOverviewPanel.messages_count': 'Messages',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.tasks': 'Tasks',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.task_count_singular': 'task',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.task_count_plural': 'tasks',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.empty': 'No delegated tasks yet',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.empty_detail': 'Delegated work appears here from saved task records.',
};

const TeamCommunicationPanelStub = defineComponent({
  name: 'TeamCommunicationPanel',
  props: ['teamRunId', 'focusedAddress'],
  template: '<div data-test="team-communication-panel" />',
});

const stable = (teamRunId: string, memberAddress: string) => createTeamExecutionAddress({ rootTeamRunId: teamRunId, memberAddress });
const task = (teamRunId: string, taskId: string) => testTaskProjection({
  taskId,
  executionAddress: createTeamExecutionAddress({
    rootTeamRunId: teamRunId,
    memberAddress: '/implementation_engineer',
    taskAgentRunId: `${taskId}-run`,
  }),
  senderAddress: stable(teamRunId, '/implementation_engineer'),
  content: 'Implement the requested change.',
  createdAt: `2026-08-10T12:00:0${taskId.endsWith('1') ? '1' : '2'}.000Z`,
  startedAt: `2026-08-10T12:00:0${taskId.endsWith('1') ? '1' : '2'}.000Z`,
  updatedAt: `2026-08-10T12:00:0${taskId.endsWith('1') ? '1' : '2'}.000Z`,
});

const seedActiveTeam = (input: { taskIds?: string[]; teamRunId?: string } = {}) => {
  const teamRunId = input.teamRunId ?? 'team-1';
  const team = buildTestTeamContext({
    teamRunId,
    teamDefinitionName: 'Engineering Team',
    rootChildren: [
      testAgentNode('/implementation_engineer', { agentRunId: 'impl-run' }),
      testAgentNode('/code_reviewer', { agentRunId: 'review-run' }),
    ],
    coordinatorAddress: '/implementation_engineer',
    focusedExecutionAddress: stable(teamRunId, '/implementation_engineer'),
    isActive: false,
    tasks: (input.taskIds ?? []).map((taskId) => task(teamRunId, taskId)),
  });
  useAgentTeamContextsStore().addTeamContext(team);
  useAgentSelectionStore().setRunSelection(teamRunId, 'team');
  useTeamCommunicationStore().replaceProjection(teamRunId, [{
    messageId: 'message-1',
    senderAddress: stable(teamRunId, '/implementation_engineer'),
    receiverAddress: stable(teamRunId, '/code_reviewer'),
    content: 'Please review this.',
    messageType: 'handoff',
    createdAt: '2026-04-12T10:00:00.000Z',
    referenceFiles: [],
  }]);
  return team;
};

const seedNestedTeam = () => {
  const team = buildTestTeamContext({
    teamRunId: 'team-subteam',
    teamDefinitionName: 'Nested Engineering Team',
    rootChildren: [
      testAgentNode('/program_manager', { agentRunId: 'pm-run' }),
      testSubTeamNode('/BuildSquad', [
        testAgentNode('/BuildSquad/review_lead', { agentRunId: 'review-run' }),
      ], { teamRunId: 'build-squad-run', coordinatorAddress: '/BuildSquad/review_lead' }),
    ],
    coordinatorAddress: '/program_manager',
    focusedExecutionAddress: stable('team-subteam', '/BuildSquad/review_lead'),
    isActive: false,
  });
  useAgentTeamContextsStore().addTeamContext(team);
  useAgentSelectionStore().setRunSelection('team-subteam', 'team');
  useTeamCommunicationStore().replaceProjection('team-subteam', [{
    messageId: 'message-to-review-lead',
    senderAddress: stable('team-subteam', '/program_manager'),
    receiverAddress: stable('team-subteam', '/BuildSquad/review_lead'),
    content: 'Please coordinate this build.',
    messageType: 'assignment',
    createdAt: '2026-04-12T10:00:00.000Z',
    referenceFiles: [],
  }]);
};

const mountSubject = () => mount(TeamOverviewPanel, {
  global: {
    stubs: { TeamCommunicationPanel: TeamCommunicationPanelStub },
    mocks: { $t: (key: string) => labels[key] ?? key },
  },
});
const tasksVisible = (wrapper: ReturnType<typeof mountSubject>) =>
  !(wrapper.get('[data-test="team-delegated-tasks-body"]').attributes('style') ?? '').includes('display: none');
const messagesVisible = (wrapper: ReturnType<typeof mountSubject>) =>
  !(wrapper.get('[data-test="team-communication-panel"]').attributes('style') ?? '').includes('display: none');

describe('TeamOverviewPanel current execution aggregate', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    seedActiveTeam();
  });

  it('shows exact focused communication count and no removed Task Plan section', () => {
    const wrapper = mountSubject();
    expect(wrapper.text()).not.toContain('Task Plan');
    expect(wrapper.get('[data-test="team-messages-header"]').text()).toContain('1 Messages');
    expect(wrapper.get('[data-test="team-delegated-tasks-header"]').text()).toContain('0 tasks');
    expect(messagesVisible(wrapper)).toBe(true);
    expect(tasksVisible(wrapper)).toBe(false);
  });

  it('keeps section expansion parent-owned with Messages open first', async () => {
    const wrapper = mountSubject();
    await wrapper.get('[data-test="team-delegated-tasks-header"]').trigger('click');
    expect(messagesVisible(wrapper)).toBe(false);
    expect(tasksVisible(wrapper)).toBe(true);
    await wrapper.get('[data-test="team-messages-header"]').trigger('click');
    expect(messagesVisible(wrapper)).toBe(true);
    expect(tasksVisible(wrapper)).toBe(false);
  });

  it('opens Tasks immediately for a retained aggregate task projection', () => {
    seedActiveTeam({ taskIds: ['task_0001'] });
    const wrapper = mountSubject();
    expect(wrapper.get('[data-test="team-delegated-tasks-header"]').text()).toContain('1 task');
    expect(tasksVisible(wrapper)).toBe(true);
  });

  it('opens Tasks when a complete snapshot adds a task while mounted', async () => {
    const wrapper = mountSubject();
    const team = useAgentTeamContextsStore().activeTeamContext!;
    expect(reconcileTestTaskSnapshot(team, [task('team-1', 'task_0001')]).disposition).toBe('applied');
    await nextTick();
    expect(wrapper.get('[data-test="team-delegated-tasks-header"]').text()).toContain('1 task');
    expect(tasksVisible(wrapper)).toBe(true);
  });

  it('preserves manual collapse for an unchanged snapshot but reopens for a new task identity', async () => {
    seedActiveTeam({ taskIds: ['task_0001'] });
    const wrapper = mountSubject();
    await wrapper.get('[data-test="team-delegated-tasks-header"]').trigger('click');
    const team = useAgentTeamContextsStore().activeTeamContext!;
    expect(reconcileTestTaskSnapshot(team, [task('team-1', 'task_0001')]).disposition).toBe('unchanged');
    await nextTick();
    expect(tasksVisible(wrapper)).toBe(false);
    expect(reconcileTestTaskSnapshot(team, [task('team-1', 'task_0001'), task('team-1', 'task_0002')]).disposition).toBe('applied');
    await nextTick();
    expect(wrapper.get('[data-test="team-delegated-tasks-header"]').text()).toContain('2 tasks');
    expect(tasksVisible(wrapper)).toBe(true);
  });

  it('resets Messages open when selection changes to a taskless TeamRun', async () => {
    const wrapper = mountSubject();
    await wrapper.get('[data-test="team-delegated-tasks-header"]').trigger('click');
    seedNestedTeam();
    await nextTick();
    expect(messagesVisible(wrapper)).toBe(true);
    expect(tasksVisible(wrapper)).toBe(false);
    expect(wrapper.getComponent({ name: 'TeamCommunicationPanel' }).props('teamRunId')).toBe('team-subteam');
  });

  it('passes the exact focused nested Agent address rather than a Team alias', () => {
    seedNestedTeam();
    const wrapper = mountSubject();
    expect(wrapper.get('[data-test="team-messages-header"]').text()).toContain('1 Messages');
    expect(wrapper.getComponent({ name: 'TeamCommunicationPanel' }).props('focusedAddress'))
      .toEqual(stable('team-subteam', '/BuildSquad/review_lead'));
  });
});
