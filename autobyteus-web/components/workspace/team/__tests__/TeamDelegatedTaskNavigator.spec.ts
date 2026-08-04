import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TeamDelegatedTaskNavigator from '../TeamDelegatedTaskNavigator.vue';

const labels: Record<string, string> = {
  'workspace.components.workspace.team.TeamDelegatedTasksSection.technical_details': 'Technical details',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.task_type': 'Task type',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.task_id': 'Task ID',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.agent_run_id': 'Agent run ID',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.agent_team_run_id': 'Agent team run ID',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.target_kind': 'Target kind',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.target': 'Target',
};

const mountSubject = (entries: any[], props: Record<string, unknown> = {}) => mount(TeamDelegatedTaskNavigator, {
  props: {
    entries,
    selectedEntryKey: null,
    selectedReferenceId: null,
    ...props,
  },
  global: {
    stubs: {
      Icon: { template: '<span data-test="reference-icon" />' },
    },
    mocks: {
      $t: (key: string) => labels[key] ?? key,
    },
  },
});

const singleAgentEntry = {
  kind: 'task_agent',
  entryKey: 'task:task_0001',
  node: {
    memberKind: 'agent',
    memberName: 'worker',
    displayName: 'worker · task_0001',
    memberRouteKey: 'team-run__worker__task_0001',
  },
  status: 'running',
  statusLabel: 'active',
  targetDisplayName: 'worker',
  taskLabel: 'worker · task_0001',
  taskDescription: 'Draft the implementation handoff with enough words to exercise narrow-panel line clamping.',
  taskReferenceFiles: [
    {
      referenceId: 'task-reference:0:/tmp/requirements.md',
      path: '/tmp/requirements.md',
      type: 'file',
      createdAt: '2026-05-30T00:00:00.000Z',
      updatedAt: '2026-05-30T00:00:00.000Z',
    },
  ],
  taskArguments: {
    description: 'Draft the implementation handoff.',
    reference_files: ['/tmp/requirements.md'],
  },
  taskId: 'task_0001',
  runId: 'task-agent-run-1',
  teamRunId: 'team-run',
  taskTargetKind: 'member',
  taskTargetName: 'worker',
};

const taskTeamEntry = {
  kind: 'task_team',
  entryKey: 'task:task_0002',
  node: {
    memberKind: 'agent_team',
    memberName: 'Software Engineering Team · task_0002',
    displayName: 'Software Engineering Team · task_0002',
    memberRouteKey: 'task-team-run-1',
  },
  status: 'running',
  statusLabel: 'awaiting_review',
  targetDisplayName: 'Software Engineering Team',
  taskLabel: 'Software Engineering Team · task_0002',
  taskDescription: 'Review the implementation as a team.',
  taskReferenceFiles: [
    {
      referenceId: 'task-reference:0:/tmp/design-spec.md',
      path: '/tmp/design-spec.md',
      type: 'file',
      createdAt: '2026-05-30T00:00:00.000Z',
      updatedAt: '2026-05-30T00:00:00.000Z',
    },
  ],
  taskArguments: {
    description: 'Review the implementation as a team.',
    reference_files: ['/tmp/design-spec.md'],
  },
  taskId: 'task_0002',
  runId: 'task-team-run-1',
  teamRunId: 'team-run',
  taskTargetKind: 'team',
  taskTargetName: 'Software Engineering Team',
};

describe('TeamDelegatedTaskNavigator', () => {
  it('renders task detail summary, message-style references, and collapsed metadata without actor hierarchy rows', async () => {
    const wrapper = mountSubject([singleAgentEntry], {
      selectedEntryKey: 'task:task_0001',
      selectedReferenceId: 'task-reference:0:/tmp/requirements.md',
    });

    expect(wrapper.find('[data-test="team-delegated-task-agent-entry"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="team-delegated-task-team-entry"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="left-delegated-task-actor-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="left-delegated-task-member-row"]').exists()).toBe(false);

    const summary = wrapper.get('[data-test="team-delegated-task-summary-row"]');
    expect(summary.text()).toContain('Draft the implementation handoff');
    expect(summary.text()).not.toContain('active');
    expect(summary.find('.line-clamp-2').classes()).toEqual(expect.arrayContaining(['whitespace-pre-line', 'text-sm', 'leading-5']));

    expect(wrapper.get('[data-test="team-delegated-task-references"]').text()).not.toContain('References');
    const reference = wrapper.get('[data-test="team-delegated-task-reference-row"]');
    expect(reference.text()).toContain('requirements.md');
    expect(reference.classes()).toEqual(expect.arrayContaining(['text-sm', 'gap-2', 'text-blue-700']));
    await reference.trigger('click');
    expect(wrapper.emitted('select-reference')?.[0]).toEqual([{ entryKey: 'task:task_0001', referenceId: 'task-reference:0:/tmp/requirements.md' }]);

    const details = wrapper.get('[data-test="team-delegated-task-technical-details"]');
    expect(details.element.tagName).toBe('DETAILS');
    expect(details.attributes('open')).toBeUndefined();
    expect(details.text()).toContain('Technical details');
    expect(wrapper.get('[data-test="delegated-task-id"]').text()).toBe('task_0001');
    expect(wrapper.get('[data-test="delegated-task-run-id"]').text()).toBe('task-agent-run-1');
    expect(wrapper.get('[data-test="delegated-task-technical-input"]').classes()).toEqual(expect.arrayContaining(['max-h-28', 'overflow-auto']));
  });

  it('selects task-team detail summaries without emitting member focus', async () => {
    const wrapper = mountSubject([taskTeamEntry]);

    expect(wrapper.get('[data-test="team-delegated-task-team-entry"]').text()).toContain('Review the implementation as a team.');
    expect(wrapper.find('[data-test="left-delegated-task-actor-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="left-delegated-task-members"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="left-delegated-task-member-row"]').exists()).toBe(false);

    await wrapper.get('[data-test="team-delegated-task-summary-row"]').trigger('click');

    expect(wrapper.emitted('select-task')?.[0]).toEqual(['task:task_0002']);
    expect(wrapper.emitted('select-member')).toBeUndefined();
  });
});
