import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
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

const seedActiveTeam = () => {
  useAgentTeamContextsStore().addTeamContext({
    teamRunId: 'team-1',
    config: { teamDefinitionName: 'Engineering Team' },
    members: new Map([
      ['implementation_engineer', { state: { runId: 'impl-run' } }],
    ]),
    focusedMemberName: 'implementation_engineer',
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

const mountSubject = () => mount(TeamOverviewPanel, {
  global: {
    stubs: {
      TaskPlanDisplay: { template: '<div data-test="task-plan-display" />' },
      TeamCommunicationPanel: { template: '<div data-test="team-communication-panel" />' },
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
});
