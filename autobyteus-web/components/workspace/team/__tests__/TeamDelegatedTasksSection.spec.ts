import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { describe, expect, it } from 'vitest';
import type { TaskDelegationRecordDto } from '@autobyteus/team-stream-contracts';
import TeamDelegatedTasksSection from '../TeamDelegatedTasksSection.vue';
import {
  applyTestTeamMessage,
  buildTestTeamContext,
  testAgentNode,
  testSubTeamNode,
  testTaskRecord,
} from '~/test-support/currentTeamTestFixtures';

const reference = (referenceId: string, path: string) => ({
  reference_id: referenceId,
  path,
  type: 'file' as const,
  created_at: '2026-08-20T10:00:00.000Z',
  updated_at: '2026-08-20T10:00:00.000Z',
});
const labels: Record<string, string> = {
  'workspace.components.workspace.team.TeamDelegatedTasksSection.tasks': 'Tasks',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.task_count_singular': 'task',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.task_count_plural': 'tasks',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.empty': 'No delegated tasks yet',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.empty_detail': 'Delegated work appears here from saved task records.',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.select_task': 'Select a task to read it.',
};
const submission = {
  kind: 'submission' as const,
  submission_id: 'submission-1',
  message: 'Initial implementation is ready for review.',
  reference_files: [reference('result-ref', '/tmp/implementation-handoff.md')],
  created_at: '2026-08-20T10:28:00.000Z',
};
const revision = {
  kind: 'review' as const,
  review_id: 'review-1',
  reviewed_submission_id: 'submission-1',
  decision: 'request_revision' as const,
  comment: 'Keep the current task layout.',
  reference_files: [reference('review-ref', '/tmp/review.md')],
  created_at: '2026-08-20T10:42:00.000Z',
};
const resubmission = {
  kind: 'submission' as const,
  submission_id: 'submission-2',
  message: 'Updated implementation is ready.',
  reference_files: [],
  created_at: '2026-08-20T11:06:00.000Z',
};
const acceptance = {
  kind: 'review' as const,
  review_id: 'review-2',
  reviewed_submission_id: 'submission-2',
  decision: 'accept' as const,
  comment: null,
  reference_files: [],
  created_at: '2026-08-20T11:18:00.000Z',
};

const taskRecord = (updates: TaskDelegationRecordDto['updates'] = [submission, revision, resubmission, acceptance], status: TaskDelegationRecordDto['status'] = 'accepted') => testTaskRecord({
  taskId: 'task-agent-1',
  delegatorAgentRunId: 'worker-run',
  recipientAddress: '/reviewer',
  target: { agentRunId: 'task-reviewer-run' },
  description: 'Draft the implementation handoff.',
  referenceFiles: [reference('requirements-ref', '/tmp/requirements.md')],
  status,
  createdAt: '2026-08-20T10:10:00.000Z',
  updates,
});

const buildTeamContext = (tasks: readonly TaskDelegationRecordDto[] = [taskRecord()]) => {
  const worker = testAgentNode('/worker', { agentRunId: 'worker-run' });
  const reviewer = testAgentNode('/software_team/reviewer', { agentRunId: 'reviewer-run' });
  const reviewTeam = testSubTeamNode('/software_team', [reviewer], {
    teamRunId: 'software-team-persistent', coordinatorAddress: reviewer.address,
  });
  return buildTestTeamContext({
    teamRunId: 'team-run', coordinatorAddress: worker.address, focusedAgentRunId: worker.agentRunId,
    rootChildren: [worker, reviewTeam, testAgentNode('/reviewer', { agentRunId: 'reviewer-persistent-run' })],
    tasks,
  });
};

const mountSubject = (teamContext = buildTeamContext(), props: Record<string, unknown> = {}) => mount(TeamDelegatedTasksSection, {
  props: { teamContext, ...props },
  global: {
    stubs: {
      Icon: { props: ['icon'], template: '<span data-test="task-icon" :data-icon="icon" />' },
      MarkdownRenderer: { props: ['content'], template: '<div data-test="markdown-renderer">{{ content }}</div>' },
      TeamTaskReferenceViewer: {
        props: ['teamRunId', 'taskId', 'reference', 'refreshSignal'],
        template: '<div data-test="task-reference-viewer">{{ teamRunId }}:{{ taskId }}:{{ reference.referenceId }}:<span data-test="task-reference-refresh">{{ refreshSignal }}</span></div>',
      },
    },
    mocks: { $t: (key: string) => labels[key] ?? key },
  },
});

describe('TeamDelegatedTasksSection task lifecycle selection', () => {
  it('uses parent-controlled collapse, preserves the empty state, and keeps the split dimensions', async () => {
    const wrapper = mountSubject(buildTeamContext([]), { collapsed: true });
    expect(wrapper.get('[data-test="team-delegated-tasks-header"]').text()).toContain('0 tasks');
    expect(wrapper.get('[data-test="team-delegated-tasks-body"]').attributes('style')).toContain('display: none');
    await wrapper.get('[data-test="team-delegated-tasks-header"]').trigger('click');
    expect(wrapper.emitted('toggle')).toHaveLength(1);
    await wrapper.setProps({ collapsed: false });
    expect(wrapper.get('[data-test="team-delegated-tasks-empty"]').text()).toContain('No delegated tasks yet');

    const populated = mountSubject();
    expect(populated.get('[data-test="team-delegated-tasks-navigator"]').attributes('style')).toContain('width: 248px');
    expect(populated.get('[data-test="team-delegated-tasks-resize-handle"]').attributes('role')).toBe('separator');
  });

  it('selects the first task root initially and keeps the complete timeline only in the left navigator', () => {
    const wrapper = mountSubject();
    expect(wrapper.get('[data-test="team-delegated-tasks-header"]').text()).toContain('1 task');
    expect(wrapper.get('[data-test="team-delegated-task-summary-row"]').attributes('aria-pressed')).toBe('true');
    expect(wrapper.get('[data-test="delegated-task-item-title"]').text()).toBe('Task assigned');
    expect(wrapper.get('[data-test="delegated-task-task-body"]').text()).toContain('Draft the implementation handoff.');
    expect(wrapper.findAll('[data-test="team-delegated-task-lifecycle-row"]')).toHaveLength(4);
    expect(wrapper.get('[data-test="delegated-task-detail-pane"]').find('[data-test="team-delegated-task-lifecycle-list"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="delegated-task-detail-pane"]').find('[data-test="team-delegated-task-reference-row"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('task-reviewer-run');
    expect(wrapper.find('[data-test="team-delegated-task-technical-details"]').exists()).toBe(false);
  });

  it('shows only the selected update detail while every left-side lifecycle row remains visible', async () => {
    const wrapper = mountSubject();
    const lifecycleRows = wrapper.findAll('[data-test="team-delegated-task-lifecycle-row"]');
    await lifecycleRows[1].trigger('click');

    expect(wrapper.findAll('[data-test="team-delegated-task-lifecycle-row"]')).toHaveLength(4);
    expect(wrapper.get('[data-test="delegated-task-item-title"]').text()).toBe('Revision requested for Result 1');
    expect(wrapper.get('[data-test="delegated-task-update-body"]').text()).toContain('Keep the current task layout.');
    expect(wrapper.get('[data-test="delegated-task-item-direction"]').text()).toContain('worker → reviewer');
    expect(wrapper.get('[data-test="delegated-task-detail-pane"]').text()).not.toContain('implementation-handoff.md');
    expect(wrapper.get('[data-test="delegated-task-detail-pane"]').text()).not.toContain('review.md');

    await wrapper.findAll('[data-test="team-delegated-task-lifecycle-row"]')[3].trigger('click');
    expect(wrapper.get('[data-test="delegated-task-item-title"]').text()).toBe('Result 2 accepted');
    expect(wrapper.get('[data-test="delegated-task-update-body"]').text()).toContain('Result accepted.');
  });

  it('opens an update-owned reference, refreshes it on reselection, and returns through its owning row without changing focus', async () => {
    const team = buildTeamContext();
    const wrapper = mountSubject(team, { focusedAgentRunId: 'worker-run' });
    const resultReference = wrapper.findAll('[data-test="team-delegated-task-update-references"]')[0]
      .get('[data-test="team-delegated-task-reference-row"]');
    await resultReference.trigger('click');
    expect(wrapper.get('[data-test="task-reference-viewer"]').text())
      .toContain('team-run:task-agent-1:result-ref:0');
    expect(team.view.getFocusedAgentRunId()).toBe('worker-run');

    await resultReference.trigger('click');
    expect(wrapper.get('[data-test="task-reference-refresh"]').text()).toBe('1');

    await wrapper.findAll('[data-test="team-delegated-task-lifecycle-row"]')[0].trigger('click');
    expect(wrapper.find('[data-test="task-reference-viewer"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="delegated-task-update-body"]').text()).toContain('Initial implementation is ready for review.');
    expect(team.view.getFocusedAgentRunId()).toBe('worker-run');
  });

  it('retains an exact selected lifecycle item across a live full-record replacement and appends the new row once', async () => {
    const initial = taskRecord([submission], 'awaiting_review');
    const team = buildTeamContext([initial]);
    const wrapper = mountSubject(team);
    await wrapper.get('[data-test="team-delegated-task-lifecycle-row"]').trigger('click');
    expect(wrapper.get('[data-test="delegated-task-update-body"]').text()).toContain('Initial implementation is ready for review.');

    const accepted = taskRecord([submission, {
      ...acceptance,
      review_id: 'review-live',
      reviewed_submission_id: 'submission-1',
      created_at: '2026-08-20T10:44:00.000Z',
    }], 'accepted');
    expect(applyTestTeamMessage(team, {
      type: 'TASK_DELEGATION_EVENT',
      payload: { event_type: 'TASK_CHANGED', change_sequence: 1, task: accepted },
    }).disposition).toBe('applied');
    await nextTick();
    await flushPromises();

    expect(wrapper.findAll('[data-test="team-delegated-task-lifecycle-row"]')).toHaveLength(2);
    expect(wrapper.get('[data-test="delegated-task-update-body"]').text()).toContain('Initial implementation is ready for review.');
    expect(wrapper.get('[data-test="team-delegated-task-status"]').text()).toContain('Accepted');
  });
});
