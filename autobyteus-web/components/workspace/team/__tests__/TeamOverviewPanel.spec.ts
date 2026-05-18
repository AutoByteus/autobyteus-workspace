import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent } from 'vue';
import TeamOverviewPanel from '../TeamOverviewPanel.vue';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useTeamCommunicationStore } from '~/stores/teamCommunicationStore';

const labels: Record<string, string> = {
  'workspace.components.workspace.team.TeamOverviewPanel.task_plan': 'Task Plan',
  'workspace.components.workspace.team.TeamOverviewPanel.messages': 'Messages',
  'workspace.components.workspace.team.TeamOverviewPanel.tasks': 'Tasks',
  'workspace.components.workspace.team.TeamOverviewPanel.messages_count': 'Messages',
  'workspace.components.workspace.team.TaskPlanDisplay.no_task_plan_yet': 'No task plan yet',
};

const TeamCommunicationPanelStub = defineComponent({
  name: 'TeamCommunicationPanel',
  props: ['teamRunId', 'focusedMemberRunId', 'focusedMemberRouteKey', 'focusedMemberPath', 'focusedMemberKind'],
  template: '<div data-test="team-communication-panel" />',
});

const seedActiveTeam = () => {
  const memberTree = [{
    memberKind: 'agent',
    memberName: 'implementation_engineer',
    displayName: 'Implementation Engineer',
    memberPath: ['implementation_engineer'],
    memberRouteKey: 'implementation_engineer',
    agentDefinitionId: 'implementation-engineer-def',
  }];
  useAgentTeamContextsStore().addTeamContext({
    teamRunId: 'team-1',
    config: { teamDefinitionName: 'Engineering Team' },
    memberTree,
    memberNodesByRouteKey: new Map(memberTree.map((member) => [member.memberRouteKey, member])),
    leafAgentContextsByRouteKey: new Map([
      ['implementation_engineer', { state: { runId: 'impl-run' } }],
    ]),
    focusedMemberRouteKey: 'implementation_engineer',
    currentStatus: 'idle',
    isSubscribed: false,
    taskPlan: null,
    taskStatuses: null,
  } as any);
  useAgentSelectionStore().$patch({ selectedRunId: 'team-1', selectedType: 'team' });
  useTeamCommunicationStore().replaceProjection('team-1', [
    {
      messageId: 'message-1',
      teamRunId: 'team-1',
      senderRunId: 'impl-run',
      senderMemberName: 'Implementation Engineer',
      receiverRunId: 'reviewer-run',
      receiverMemberName: 'Code Reviewer',
      content: 'Please review this.',
      messageType: 'handoff',
      createdAt: '2026-04-12T10:00:00.000Z',
      updatedAt: '2026-04-12T10:00:00.000Z',
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
    taskPlan: null,
    taskStatuses: null,
  } as any);
  useAgentSelectionStore().$patch({ selectedRunId: 'team-subteam', selectedType: 'team' });
  useTeamCommunicationStore().replaceProjection('team-subteam', [
    {
      messageId: 'message-to-build-squad',
      teamRunId: 'team-subteam',
      senderRunId: 'pm-run',
      senderMemberKind: 'agent',
      senderMemberName: 'program_manager',
      senderMemberPath: ['program_manager'],
      senderMemberRouteKey: 'program_manager',
      receiverRunId: 'internal-child-team-run',
      receiverMemberKind: 'agent_team',
      receiverMemberName: 'BuildSquad',
      receiverMemberPath: ['BuildSquad'],
      receiverMemberRouteKey: 'BuildSquad',
      content: 'Please coordinate this build.',
      messageType: 'assignment',
      createdAt: '2026-04-12T10:00:00.000Z',
      updatedAt: '2026-04-12T10:00:00.000Z',
      referenceFiles: [],
    },
  ]);
};

const mountSubject = () => mount(TeamOverviewPanel, {
  global: {
    stubs: {
      TaskPlanDisplay: { template: '<div data-test="task-plan-display" />' },
      TeamCommunicationPanel: TeamCommunicationPanelStub,
    },
    mocks: {
      $t: (key: string) => labels[key] ?? key,
    },
  },
});

describe('TeamOverviewPanel.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    seedActiveTeam();
  });

  it('renders compact collapsible Task Plan and default-expanded Messages without an internal Team header', async () => {
    const wrapper = mountSubject();

    expect(wrapper.text()).not.toContain('Engineering Team');
    expect(wrapper.get('[data-test="team-task-plan-toggle"]').attributes('aria-expanded')).toBe('false');
    expect(wrapper.get('[data-test="team-messages-toggle"]').attributes('aria-expanded')).toBe('true');
    expect(wrapper.get('[data-test="team-messages-toggle"]').text()).toContain('1 Messages');
    expect(wrapper.find('[data-test="team-communication-panel"]').isVisible()).toBe(true);

    await wrapper.get('[data-test="team-task-plan-toggle"]').trigger('click');

    expect(wrapper.get('[data-test="team-task-plan-toggle"]').attributes('aria-expanded')).toBe('true');
    expect(wrapper.get('[data-test="team-messages-toggle"]').attributes('aria-expanded')).toBe('false');
    expect(wrapper.get('[data-test="team-task-plan-compact-empty"]').text()).toBe('No task plan yet');
    expect(wrapper.find('[data-test="task-plan-display"]').exists()).toBe(false);
  });

  it('counts and passes route/path identity for a focused subteam without a member run id', () => {
    seedFocusedSubteam();

    const wrapper = mountSubject();
    const panel = wrapper.getComponent({ name: 'TeamCommunicationPanel' });

    expect(wrapper.get('[data-test="team-messages-toggle"]').text()).toContain('1 Messages');
    expect(panel.props('teamRunId')).toBe('team-subteam');
    expect(panel.props('focusedMemberRunId')).toBe('');
    expect(panel.props('focusedMemberRouteKey')).toBe('BuildSquad');
    expect(panel.props('focusedMemberPath')).toEqual(['BuildSquad']);
    expect(panel.props('focusedMemberKind')).toBe('agent_team');
  });
});
