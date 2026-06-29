import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TeamActiveTaskNavigator from '../TeamActiveTaskNavigator.vue';

const labels: Record<string, string> = {
  'workspace.components.workspace.team.TeamActiveTasksSection.technical_details': 'Technical details',
  'workspace.components.workspace.team.TeamActiveTasksSection.task_type': 'Task type',
  'workspace.components.workspace.team.TeamActiveTasksSection.task_id': 'Task ID',
  'workspace.components.workspace.team.TeamActiveTasksSection.agent_run_id': 'Agent run ID',
  'workspace.components.workspace.team.TeamActiveTasksSection.agent_team_run_id': 'Agent team run ID',
  'workspace.components.workspace.team.TeamActiveTasksSection.target_kind': 'Target kind',
  'workspace.components.workspace.team.TeamActiveTasksSection.target': 'Target',
};

const mountSubject = (entries: any[], props: Record<string, unknown> = {}) => mount(TeamActiveTaskNavigator, {
  props: {
    entries,
    selectedTaskRouteKey: null,
    selectedReferenceId: null,
    focusedMemberRouteKey: null,
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
  node: {
    memberKind: 'agent',
    memberName: 'worker',
    displayName: 'worker · task_0001',
    memberRouteKey: 'team-run__worker__task_0001',
    currentStatus: 'running',
  },
  members: [],
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
  node: {
    memberKind: 'agent_team',
    memberName: 'Software Engineering Team · task_0002',
    displayName: 'Software Engineering Team · task_0002',
    memberRouteKey: 'task-team-run-1',
    currentStatus: 'running',
  },
  members: [
    {
      depth: 0,
      displayName: 'solution_designer',
      node: {
        memberKind: 'agent',
        memberName: 'solution_designer',
        displayName: 'solution_designer',
        memberRouteKey: 'task-team-run-1/solution_designer',
        currentStatus: 'idle',
      },
    },
  ],
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

describe('TeamActiveTaskNavigator', () => {
  it('renders a single-agent task as text-only summary plus one root actor row with collapsed metadata', async () => {
    const wrapper = mountSubject([singleAgentEntry], {
      selectedTaskRouteKey: 'team-run__worker__task_0001',
      selectedReferenceId: 'task-reference:0:/tmp/requirements.md',
    });

    expect(wrapper.find('[data-test="left-task-agent-context"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="left-task-team-context"]').exists()).toBe(false);

    const summary = wrapper.get('[data-test="left-active-task-summary-row"]');
    expect(summary.text()).toContain('Draft the implementation handoff');
    expect(summary.classes()).toEqual(expect.arrayContaining(['text-gray-600']));
    expect(summary.classes()).not.toContain('text-blue-700');
    expect(summary.find('span').classes()).toEqual(expect.arrayContaining(['line-clamp-2', 'whitespace-pre-line', 'text-sm', 'leading-5']));
    expect(summary.find('span.inline-block').exists()).toBe(false);

    const actor = wrapper.get('[data-test="left-active-task-actor-row"]');
    expect(actor.text()).toContain('worker');
    expect(actor.attributes('style') ?? '').toBe('');
    expect(actor.find('span.inline-block').classes()).toEqual(expect.arrayContaining(['h-2', 'w-2', 'rounded-full', 'bg-blue-500', 'animate-pulse']));
    expect(wrapper.find('[data-test="left-active-task-member-row"]').exists()).toBe(false);

    expect(wrapper.get('[data-test="left-active-task-references"]').text()).toContain('References');
    const reference = wrapper.get('[data-test="left-active-task-reference-row"]');
    expect(reference.text()).toContain('requirements.md');
    expect(reference.classes()).toEqual(expect.arrayContaining(['text-sm', 'gap-2', 'text-blue-700']));
    await reference.trigger('click');
    expect(wrapper.emitted('select-reference')?.[0]).toEqual([{ memberRouteKey: 'team-run__worker__task_0001', referenceId: 'task-reference:0:/tmp/requirements.md' }]);

    const details = wrapper.get('[data-test="left-active-task-technical-details"]');
    expect(details.element.tagName).toBe('DETAILS');
    expect(details.attributes('open')).toBeUndefined();
    expect(details.text()).toContain('Technical details');
    expect(details.get('summary').classes()).toEqual(expect.arrayContaining(['text-xs', 'text-gray-500', 'hover:text-gray-700']));
    expect(wrapper.get('[data-test="active-task-id"]').text()).toBe('task_0001');
    expect(wrapper.get('[data-test="active-task-run-id"]').text()).toBe('task-agent-run-1');
    expect(wrapper.get('[data-test="active-task-technical-input"]').classes()).toEqual(expect.arrayContaining(['max-h-28', 'overflow-auto']));
  });

  it('renders a task-team root unindented and indents only member rows with shared status dots', async () => {
    const wrapper = mountSubject([taskTeamEntry], {
      focusedMemberRouteKey: 'task-team-run-1/solution_designer',
    });

    const summary = wrapper.get('[data-test="left-active-task-summary-row"]');
    expect(summary.text()).toContain('Review the implementation as a team.');
    expect(summary.find('span.inline-block').exists()).toBe(false);

    const actor = wrapper.get('[data-test="left-active-task-actor-row"]');
    expect(actor.text()).toContain('Software Engineering Team');
    expect(actor.text()).toContain('Team');
    expect(actor.attributes('style') ?? '').toBe('');
    expect(actor.find('span.inline-block').classes()).toEqual(expect.arrayContaining(['bg-blue-500', 'animate-pulse']));

    const member = wrapper.get('[data-test="left-active-task-member-row"]');
    expect(member.text()).toContain('solution_designer');
    expect(member.attributes('style')).toContain('margin-left: 12px');
    expect(member.attributes('style')).toContain('width: calc(100% - 12px)');
    expect(member.classes()).toEqual(expect.arrayContaining(['bg-blue-100', 'text-blue-900']));
    expect(member.find('span.inline-block').classes()).toEqual(expect.arrayContaining(['bg-green-500']));

    await summary.trigger('click');
    await actor.trigger('click');
    await member.trigger('click');

    expect(wrapper.emitted('select-task')?.[0]).toEqual(['task-team-run-1']);
    expect(wrapper.emitted('select-member')?.[0]).toEqual(['task-team-run-1']);
    expect(wrapper.emitted('select-member')?.[1]).toEqual(['task-team-run-1/solution_designer']);
  });
});
