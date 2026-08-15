import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TeamDelegatedTasksSection from '../TeamDelegatedTasksSection.vue';
import {
  buildTestTeamContext,
  testAgentNode,
  testSubTeamNode,
  testTaskRecord,
} from '~/test-support/currentTeamTestFixtures';

const labels: Record<string, string> = {
  'workspace.components.workspace.team.TeamDelegatedTasksSection.tasks': 'Tasks',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.task_count_singular': 'task',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.task_count_plural': 'tasks',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.empty': 'No delegated tasks yet',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.empty_detail': 'Delegated work appears here from saved task records.',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.description_unavailable': 'Task description unavailable',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.select_task': 'Select a task to read it.',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.technical_details': 'Technical details',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.task_type': 'Task type',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.task_id': 'Task ID',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.agent_run_id': 'Agent run ID',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.agent_team_run_id': 'Agent team run ID',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.target_kind': 'Target kind',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.target': 'Target',
};

const reference = {
  reference_id: 'ref-requirements', path: '/tmp/requirements.md', type: 'file' as const,
  created_at: '2026-08-10T12:00:00.000Z', updated_at: '2026-08-10T12:00:00.000Z',
};

const buildTeamContext = (includeTasks = true) => {
  const worker = testAgentNode('/worker', { agentRunId: 'worker-run' });
  const reviewer = testAgentNode('/software_team/reviewer', { agentRunId: 'reviewer-run' });
  const reviewTeam = testSubTeamNode('/software_team', [reviewer], {
    teamRunId: 'software-team-persistent', coordinatorAddress: reviewer.address,
  });
  return buildTestTeamContext({
    teamRunId: 'team-run', coordinatorAddress: worker.address, focusedAgentRunId: worker.agentRunId,
    rootChildren: [worker, reviewTeam],
    tasks: includeTasks ? [
      testTaskRecord({
        taskId: 'task-agent-1', delegatorAgentRunId: worker.agentRunId,
        recipientAddress: worker.address, target: { agentRunId: 'task-worker-run' },
        description: 'Draft the implementation handoff.', referenceFiles: [reference],
      }),
      testTaskRecord({
        taskId: 'task-team-1', delegatorAgentRunId: worker.agentRunId,
        recipientAddress: reviewTeam.address, target: { teamRunId: 'task-review-team-run' },
        description: 'Review the implementation as a team.', status: 'awaiting_review',
      }),
    ] : [],
  });
};

const mountSubject = (teamContext = buildTeamContext(), props: Record<string, unknown> = {}) => mount(TeamDelegatedTasksSection, {
  props: { teamContext, ...props },
  global: {
    stubs: {
      Icon: { template: '<span data-test="reference-icon" />' },
      MarkdownRenderer: { props: ['content'], template: '<div data-test="markdown-renderer">{{ content }}</div>' },
      TeamTaskReferenceViewer: {
        props: ['teamRunId', 'taskId', 'reference', 'refreshSignal'],
        template: '<div data-test="task-reference-viewer">{{ teamRunId }}:{{ taskId }}:{{ reference.referenceId }}:<span data-test="task-reference-refresh">{{ refreshSignal }}</span></div>',
      },
    },
    mocks: { $t: (key: string) => labels[key] ?? key },
  },
});

describe('TeamDelegatedTasksSection current task records', () => {
  it('uses parent-controlled collapse and shows human task counts', async () => {
    const wrapper = mountSubject(buildTeamContext(), { collapsed: true });
    expect(wrapper.get('[data-test="team-delegated-tasks-header"]').text()).toContain('2 tasks');
    expect(wrapper.get('[data-test="team-delegated-tasks-body"]').attributes('style')).toContain('display: none');
    await wrapper.get('[data-test="team-delegated-tasks-header"]').trigger('click');
    expect(wrapper.emitted('toggle')).toHaveLength(1);
    await wrapper.setProps({ collapsed: false });
    expect(wrapper.get('[data-test="team-delegated-tasks-body"]').attributes('style') ?? '')
      .not.toContain('display: none');
  });

  it('renders task Agent and task Team summaries without using run IDs as ordinary copy', () => {
    const wrapper = mountSubject();
    expect(wrapper.get('[data-test="team-delegated-task-agent-entry"]').text()).toContain('Draft the implementation handoff.');
    expect(wrapper.get('[data-test="team-delegated-task-team-entry"]').text()).toContain('Review the implementation as a team.');
    expect(wrapper.get('[data-test="delegated-task-task-body"]').text()).toContain('Draft the implementation handoff.');
    expect(wrapper.get('[data-test="team-delegated-task-agent-entry"] [data-test="team-delegated-task-summary-row"]').text()).not.toContain('task-worker-run');
    expect(wrapper.get('[data-test="team-delegated-task-team-entry"] [data-test="team-delegated-task-summary-row"]').text()).not.toContain('task-review-team-run');
  });

  it('opens and refreshes a task-owned reference without changing execution focus', async () => {
    const team = buildTeamContext();
    const wrapper = mountSubject(team, { focusedAgentRunId: 'worker-run' });
    const row = wrapper.get('[data-test="team-delegated-task-reference-row"]');
    await row.trigger('click');
    expect(wrapper.get('[data-test="task-reference-viewer"]').text())
      .toContain('team-run:task-agent-1:ref-requirements:0');
    expect(team.view.getFocusedAgentRunId()).toBe('worker-run');
    await row.trigger('click');
    expect(wrapper.get('[data-test="task-reference-refresh"]').text()).toBe('1');
  });

  it('shows the empty current-task state', () => {
    const wrapper = mountSubject(buildTeamContext(false));
    expect(wrapper.get('[data-test="team-delegated-tasks-header"]').text()).toContain('0 tasks');
    expect(wrapper.get('[data-test="team-delegated-tasks-empty"]').text())
      .toContain('No delegated tasks yet');
  });
});
