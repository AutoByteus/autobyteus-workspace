import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent } from 'vue';
import TeamOverviewPanel from '../TeamOverviewPanel.vue';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useTeamCommunicationStore } from '~/stores/teamCommunicationStore';

const labels: Record<string, string> = {
  'workspace.components.workspace.team.TeamOverviewPanel.messages': 'Messages',
  'workspace.components.workspace.team.TeamOverviewPanel.messages_count': 'Messages',
  'workspace.components.workspace.team.TeamActiveTasksSection.active_tasks': 'Tasks',
  'workspace.components.workspace.team.TeamActiveTasksSection.active_count': 'Active',
  'workspace.components.workspace.team.TeamActiveTasksSection.task_count_singular': 'task',
  'workspace.components.workspace.team.TeamActiveTasksSection.task_count_plural': 'tasks',
  'workspace.components.workspace.team.TeamActiveTasksSection.empty': 'No active delegated tasks',
  'workspace.components.workspace.team.TeamActiveTasksSection.empty_detail': 'Delegated work will appear here automatically.',
  'workspace.components.workspace.team.TeamActiveTasksSection.task_agent': 'Task Agent',
  'workspace.components.workspace.team.TeamActiveTasksSection.task_team': 'Task Team',
  'workspace.components.workspace.team.TeamActiveTasksSection.approval_required': 'Approval required',
};

const TeamCommunicationPanelStub = defineComponent({
  name: 'TeamCommunicationPanel',
  props: ['teamRunId', 'focusedAddress'],
  template: '<div data-test="team-communication-panel" />',
});

const memberAddress = (memberRouteKey: string) => ({
  segments: [{ kind: 'member' as const, memberRouteKey }],
});

const buildTaskAgentNode = (taskId: string, runId = `${taskId}-run`) => ({
  memberKind: 'agent',
  memberName: `Implementation Engineer · ${taskId}`,
  displayName: `Implementation Engineer · ${taskId}`,
  memberPath: ['implementation_engineer', runId],
  memberRouteKey: `implementation_engineer__${taskId}`,
  memberRunId: runId,
  agentDefinitionId: 'implementation-engineer-def',
  isTaskAgentInstance: true,
  taskAgentRunId: runId,
  taskId,
  taskDescription: 'Implement the requested change.',
  taskReferenceFiles: [],
  taskArguments: {},
  taskTargetKind: 'member',
  taskTargetName: 'Implementation Engineer',
  logicalMemberRouteKey: 'implementation_engineer',
  taskExecutionStatus: 'active',
  currentStatus: 'running',
});

const seedActiveTeam = (options: { taskIds?: string[]; teamRunId?: string } = {}) => {
  const teamRunId = options.teamRunId ?? 'team-1';
  const implementationEngineer = {
    memberKind: 'agent',
    memberName: 'implementation_engineer',
    displayName: 'Implementation Engineer',
    memberPath: ['implementation_engineer'],
    memberRouteKey: 'implementation_engineer',
    agentDefinitionId: 'implementation-engineer-def',
  };
  const taskNodes = (options.taskIds ?? []).map((taskId) => buildTaskAgentNode(taskId));
  const memberTree = [implementationEngineer, ...taskNodes];
  useAgentTeamContextsStore().addTeamContext({
    teamRunId,
    config: { teamDefinitionName: 'Engineering Team' },
    memberTree,
    memberNodesByRouteKey: new Map<string, any>(memberTree.map((member) => [member.memberRouteKey, member])),
    leafAgentContextsByRouteKey: new Map<string, any>([
      ['implementation_engineer', { state: { runId: 'impl-run', currentStatus: 'idle' } }],
      ...taskNodes.map((member) => [
        member.memberRouteKey,
        { state: { runId: member.memberRunId, currentStatus: 'running' } },
      ] as const),
    ]),
    focusedMemberRouteKey: 'implementation_engineer',
    currentStatus: 'idle',
    isSubscribed: false,
  } as any);
  useAgentSelectionStore().$patch({ selectedRunId: teamRunId, selectedType: 'team' });
  useTeamCommunicationStore().replaceProjection(teamRunId, [
    {
      messageId: 'message-1',
      senderAddress: memberAddress('implementation_engineer'),
      receiverAddress: memberAddress('code_reviewer'),
      content: 'Please review this.',
      messageType: 'handoff',
      createdAt: '2026-04-12T10:00:00.000Z',
      referenceFiles: [],
    },
  ]);
};

const seedFocusedSubteam = () => {
  const programManager = {
    memberKind: 'agent',
    memberName: 'program_manager',
    displayName: 'Program Manager',
    memberPath: ['program_manager'],
    memberRouteKey: 'program_manager',
    agentDefinitionId: 'program-manager-def',
  };
  const reviewLead = {
    memberKind: 'agent',
    memberName: 'review_lead',
    displayName: 'Review Lead',
    memberPath: ['BuildSquad', 'review_lead'],
    memberRouteKey: 'BuildSquad/review_lead',
    agentDefinitionId: 'review-lead-def',
  };
  const buildSquad = {
    memberKind: 'agent_team',
    memberName: 'BuildSquad',
    displayName: 'BuildSquad',
    memberPath: ['BuildSquad'],
    memberRouteKey: 'BuildSquad',
    memberRunId: null,
    teamDefinitionId: 'build-squad-def',
    children: [reviewLead],
  };
  const memberTree = [programManager, buildSquad] as any[];
  useAgentTeamContextsStore().addTeamContext({
    teamRunId: 'team-subteam',
    config: { teamDefinitionName: 'Nested Engineering Team' },
    memberTree,
    memberNodesByRouteKey: new Map<string, any>([
      ['program_manager', programManager],
      ['BuildSquad', buildSquad],
      ['BuildSquad/review_lead', reviewLead],
    ]),
    leafAgentContextsByRouteKey: new Map<string, any>([
      ['program_manager', { state: { runId: 'pm-run' } }],
      ['BuildSquad/review_lead', { state: { runId: 'review-run' } }],
    ]),
    focusedMemberRouteKey: 'BuildSquad',
    currentStatus: 'idle',
    isSubscribed: false,
  } as any);
  useAgentSelectionStore().$patch({ selectedRunId: 'team-subteam', selectedType: 'team' });
  useTeamCommunicationStore().replaceProjection('team-subteam', [
    {
      messageId: 'message-to-build-squad',
      senderAddress: memberAddress('program_manager'),
      receiverAddress: memberAddress('BuildSquad'),
      content: 'Please coordinate this build.',
      messageType: 'assignment',
      createdAt: '2026-04-12T10:00:00.000Z',
      referenceFiles: [],
    },
  ]);
};

const mountSubject = () => mount(TeamOverviewPanel, {
  global: {
    stubs: {
      TeamCommunicationPanel: TeamCommunicationPanelStub,
    },
    mocks: {
      $t: (key: string) => labels[key] ?? key,
    },
  },
});

const activeTasksBodyIsVisible = (wrapper: ReturnType<typeof mountSubject>): boolean =>
  !(wrapper.get('[data-test="team-active-tasks-body"]').attributes('style') ?? '').includes('display: none');

const messagesPanelIsVisible = (wrapper: ReturnType<typeof mountSubject>): boolean =>
  !(wrapper.get('[data-test="team-communication-panel"]').attributes('style') ?? '').includes('display: none');

describe('TeamOverviewPanel.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    seedActiveTeam();
  });

  it('renders Messages without the removed Task Plan section', () => {
    const wrapper = mountSubject();

    expect(wrapper.text()).not.toContain('Engineering Team');
    expect(wrapper.find('[data-test="team-task-plan-toggle"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="team-task-plan-section"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="team-task-plan-compact-empty"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Task Plan');
    expect(wrapper.text()).not.toContain('No task plan yet');
    expect(wrapper.get('[data-test="team-messages-header"]').text()).toContain('1 Messages');
    expect(wrapper.get('[data-test="team-active-tasks-header"]').text()).toContain('0 tasks');
    expect(wrapper.find('[data-test="team-messages-disclosure"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="team-active-tasks-disclosure"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="team-messages-header"]').text()).not.toMatch(/[▾▸]/);
    expect(wrapper.get('[data-test="team-active-tasks-header"]').text()).not.toMatch(/[▾▸]/);
    expect(messagesPanelIsVisible(wrapper)).toBe(true);
    expect(activeTasksBodyIsVisible(wrapper)).toBe(false);
  });

  it('keeps Team tab section expansion parent-owned with Messages open first', async () => {
    const wrapper = mountSubject();

    expect(messagesPanelIsVisible(wrapper)).toBe(true);
    expect(activeTasksBodyIsVisible(wrapper)).toBe(false);

    await wrapper.get('[data-test="team-active-tasks-header"]').trigger('click');
    expect(messagesPanelIsVisible(wrapper)).toBe(false);
    expect(activeTasksBodyIsVisible(wrapper)).toBe(true);

    await wrapper.get('[data-test="team-messages-header"]').trigger('click');
    expect(messagesPanelIsVisible(wrapper)).toBe(true);
    expect(activeTasksBodyIsVisible(wrapper)).toBe(false);
  });

  it('opens Tasks immediately when the selected team already has active task entries', () => {
    seedActiveTeam({ taskIds: ['task_0001'] });

    const wrapper = mountSubject();

    expect(wrapper.get('[data-test="team-active-tasks-header"]').text()).toContain('1 task');
    expect(messagesPanelIsVisible(wrapper)).toBe(false);
    expect(activeTasksBodyIsVisible(wrapper)).toBe(true);
  });

  it('opens Tasks when active task entries appear while mounted', async () => {
    const wrapper = mountSubject();

    expect(messagesPanelIsVisible(wrapper)).toBe(true);
    expect(activeTasksBodyIsVisible(wrapper)).toBe(false);

    const teamContext = useAgentTeamContextsStore().activeTeamContext as any;
    const taskNode = buildTaskAgentNode('task_0001');
    teamContext.memberTree = [...teamContext.memberTree, taskNode];
    teamContext.memberNodesByRouteKey = new Map([
      ...teamContext.memberNodesByRouteKey,
      [taskNode.memberRouteKey, taskNode],
    ]);
    teamContext.leafAgentContextsByRouteKey = new Map([
      ...teamContext.leafAgentContextsByRouteKey,
      [taskNode.memberRouteKey, { state: { runId: taskNode.memberRunId, currentStatus: 'running' } }],
    ]);
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[data-test="team-active-tasks-header"]').text()).toContain('1 task');
    expect(messagesPanelIsVisible(wrapper)).toBe(false);
    expect(activeTasksBodyIsVisible(wrapper)).toBe(true);
  });

  it('preserves manual collapse for the same task set but reopens for a new task identity', async () => {
    seedActiveTeam({ taskIds: ['task_0001'] });
    const wrapper = mountSubject();

    expect(activeTasksBodyIsVisible(wrapper)).toBe(true);

    await wrapper.get('[data-test="team-active-tasks-header"]').trigger('click');
    expect(activeTasksBodyIsVisible(wrapper)).toBe(false);

    const teamContext = useAgentTeamContextsStore().activeTeamContext as any;
    const existingTask = teamContext.memberTree.find((member: any) =>
      member.memberRouteKey === 'implementation_engineer__task_0001');
    existingTask.taskExecutionStatus = 'waiting_for_user';
    await wrapper.vm.$nextTick();

    expect(activeTasksBodyIsVisible(wrapper)).toBe(false);

    const nextTaskNode = buildTaskAgentNode('task_0002');
    teamContext.memberTree = [...teamContext.memberTree, nextTaskNode];
    teamContext.memberNodesByRouteKey = new Map([
      ...teamContext.memberNodesByRouteKey,
      [nextTaskNode.memberRouteKey, nextTaskNode],
    ]);
    teamContext.leafAgentContextsByRouteKey = new Map([
      ...teamContext.leafAgentContextsByRouteKey,
      [nextTaskNode.memberRouteKey, { state: { runId: nextTaskNode.memberRunId, currentStatus: 'running' } }],
    ]);
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[data-test="team-active-tasks-header"]').text()).toContain('2 tasks');
    expect(activeTasksBodyIsVisible(wrapper)).toBe(true);
  });

  it('resets Messages open when the selected team run changes without taking over message identity', async () => {
    const wrapper = mountSubject();

    await wrapper.get('[data-test="team-active-tasks-header"]').trigger('click');
    expect(wrapper.get('[data-test="team-active-tasks-body"]').attributes('style') ?? '').not.toContain('display: none');

    seedFocusedSubteam();
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[data-test="team-messages-header"]').text()).toContain('1 Messages');
    expect(wrapper.get('[data-test="team-communication-panel"]').attributes('style') ?? '').not.toContain('display: none');
    expect(wrapper.get('[data-test="team-active-tasks-body"]').attributes('style')).toContain('display: none');
    const panel = wrapper.getComponent({ name: 'TeamCommunicationPanel' });
    expect(panel.props('teamRunId')).toBe('team-subteam');
  });

  it('opens Tasks when the selected team run changes to another run with active task entries', async () => {
    const wrapper = mountSubject();

    expect(messagesPanelIsVisible(wrapper)).toBe(true);
    expect(activeTasksBodyIsVisible(wrapper)).toBe(false);

    seedActiveTeam({ teamRunId: 'team-2', taskIds: ['task_2001'] });
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[data-test="team-active-tasks-header"]').text()).toContain('1 task');
    expect(messagesPanelIsVisible(wrapper)).toBe(false);
    expect(activeTasksBodyIsVisible(wrapper)).toBe(true);
  });

  it('counts and passes route/path identity for a focused subteam without a member run id', () => {
    seedFocusedSubteam();

    const wrapper = mountSubject();
    const panel = wrapper.getComponent({ name: 'TeamCommunicationPanel' });

    expect(wrapper.get('[data-test="team-messages-header"]').text()).toContain('1 Messages');
    expect(panel.props('teamRunId')).toBe('team-subteam');
    expect(panel.props('focusedAddress')).toEqual(memberAddress('BuildSquad'));
  });
});
