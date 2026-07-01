import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TeamActiveTasksSection from '../TeamActiveTasksSection.vue';
import { AgentStatus } from '~/types/agent/AgentStatus';

const labels: Record<string, string> = {
  'workspace.components.workspace.team.TeamActiveTasksSection.active_tasks': 'Tasks',
  'workspace.components.workspace.team.TeamActiveTasksSection.task_count_singular': 'task',
  'workspace.components.workspace.team.TeamActiveTasksSection.task_count_plural': 'tasks',
  'workspace.components.workspace.team.TeamActiveTasksSection.empty': 'No active delegated tasks',
  'workspace.components.workspace.team.TeamActiveTasksSection.empty_detail': 'Delegated work will appear here automatically.',
  'workspace.components.workspace.team.TeamActiveTasksSection.description_unavailable': 'Task description unavailable',
  'workspace.components.workspace.team.TeamActiveTasksSection.focus': 'Focus',
  'workspace.components.workspace.team.TeamActiveTasksSection.technical_details': 'Technical details',
  'workspace.components.workspace.team.TeamActiveTasksSection.select_task': 'Select a task to read it.',
  'workspace.components.workspace.team.TeamActiveTasksSection.waiting_activity_notice': 'Waiting for user action in Activity.',
  'workspace.components.workspace.team.TeamActiveTasksSection.task_type': 'Task type',
  'workspace.components.workspace.team.TeamActiveTasksSection.task_id': 'Task ID',
  'workspace.components.workspace.team.TeamActiveTasksSection.agent_run_id': 'Agent run ID',
  'workspace.components.workspace.team.TeamActiveTasksSection.agent_team_run_id': 'Agent team run ID',
  'workspace.components.workspace.team.TeamActiveTasksSection.target_kind': 'Target kind',
  'workspace.components.workspace.team.TeamActiveTasksSection.target': 'Target',
};

const buildTeamContext = () => {
  const logicalWorkerNode = {
    memberKind: 'agent',
    memberName: 'worker',
    displayName: 'worker',
    memberPath: ['worker'],
    memberRouteKey: 'worker',
    memberRunId: 'team-run::worker',
    agentDefinitionId: 'worker-agent',
  };
  const taskAgentNode = {
    memberKind: 'agent',
    memberName: 'worker · task_0001',
    displayName: 'worker · task_0001',
    memberPath: ['worker', 'team-run__worker__task_0001'],
    memberRouteKey: 'team-run__worker__task_0001',
    memberRunId: 'team-run__worker__task_0001',
    agentDefinitionId: 'worker-agent',
    isTaskAgentInstance: true,
    taskAgentInstanceId: 'task_agent_task_0001',
    taskAgentRunId: 'team-run__worker__task_0001',
    taskId: 'task_0001',
    taskDescription: 'Draft the implementation handoff.',
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
      target: { kind: 'member', name: 'worker' },
      description: 'Draft the implementation handoff.',
      reference_files: ['/tmp/requirements.md'],
    },
    taskTargetKind: 'member',
    taskTargetName: 'worker',
    taskExecutionStatus: 'active',
    logicalMemberRouteKey: 'worker',
  };
  const taskAgentContext = {
    state: {
      currentStatus: AgentStatus.Running,
      conversation: {
        id: 'team-run__worker__task_0001',
        createdAt: '2026-05-30T00:00:00.000Z',
        updatedAt: '2026-05-30T00:00:00.000Z',
        messages: [],
      },
    },
  };
  const solutionNode = {
    memberKind: 'agent',
    memberName: 'solution_designer',
    displayName: 'solution_designer',
    memberPath: ['task-team-run-1', 'solution_designer'],
    memberRouteKey: 'task-team-run-1/solution_designer',
    agentDefinitionId: 'solution-designer',
    currentStatus: AgentStatus.Idle,
    isTaskTeamChildProjection: true,
    parentTaskTeamRunId: 'task-team-run-1',
  };
  const taskTeamNode = {
    memberKind: 'agent_team',
    memberName: 'software_engineering_team · task_0002',
    displayName: 'software_engineering_team · task_0002',
    memberPath: ['task-team-run-1'],
    memberRouteKey: 'task-team-run-1',
    memberRunId: 'task-team-run-1',
    teamDefinitionId: 'software-team',
    teamRunId: 'task-team-run-1',
    children: [solutionNode],
    isTaskTeamInstance: true,
    taskTeamInstanceId: 'task-team-instance-1',
    taskTeamRunId: 'task-team-run-1',
    taskId: 'task_0002',
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
      target: { kind: 'team', name: 'software_engineering_team' },
      description: 'Review the implementation as a team.',
      reference_files: ['/tmp/design-spec.md'],
    },
    taskTargetKind: 'team',
    taskTargetName: 'software_engineering_team',
    logicalTeamRouteKey: 'SoftwareEngineeringTeam',
    logicalTeamPath: ['SoftwareEngineeringTeam'],
    taskExecutionStatus: 'awaiting_review',
    currentStatus: AgentStatus.Running,
  };

  return {
    teamRunId: 'team-run',
    memberTree: [logicalWorkerNode, taskTeamNode, taskAgentNode],
    memberNodesByRouteKey: new Map<string, any>([
      ['worker', logicalWorkerNode],
      ['task-team-run-1', taskTeamNode],
      ['task-team-run-1/solution_designer', solutionNode],
      ['team-run__worker__task_0001', taskAgentNode],
    ]),
    leafAgentContextsByRouteKey: new Map<string, any>([
      ['team-run__worker__task_0001', taskAgentContext],
    ]),
    focusedMemberRouteKey: 'worker',
  };
};

const mountSubject = (teamContext = buildTeamContext(), props: Record<string, unknown> = {}) => mount(TeamActiveTasksSection, {
  props: { teamContext: teamContext as any, ...props },
  global: {
    stubs: {
      Icon: { template: '<span data-test="reference-icon" />' },
      MarkdownRenderer: {
        props: ['content'],
        template: '<div data-test="markdown-renderer">{{ content }}</div>',
      },
      TeamTaskReferenceViewer: {
        props: ['teamRunId', 'taskId', 'reference', 'refreshSignal'],
        template: '<div data-test="task-reference-viewer"><span>{{ teamRunId }}</span><span>{{ taskId }}</span><span>{{ reference.path }}</span><span data-test="task-reference-refresh">{{ refreshSignal }}</span></div>',
      },
    },
    mocks: {
      $t: (key: string) => labels[key] ?? key,
    },
  },
});

describe('TeamActiveTasksSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses controlled collapsed state with human task count and no approval summary', async () => {
    const wrapper = mountSubject(buildTeamContext(), { collapsed: true });

    expect(wrapper.get('[data-test="team-active-tasks-header"]').text()).toContain('2 tasks');
    expect(wrapper.find('[data-test="team-active-tasks-approval-summary"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="team-active-tasks-disclosure"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="team-active-tasks-header"]').text()).not.toMatch(/[▾▸]/);
    expect(wrapper.get('[data-test="team-active-tasks-body"]').attributes('style')).toContain('display: none');

    await wrapper.get('[data-test="team-active-tasks-header"]').trigger('click');
    expect(wrapper.emitted('toggle')).toHaveLength(1);
    expect(wrapper.get('[data-test="team-active-tasks-body"]').attributes('style')).toContain('display: none');

    await wrapper.setProps({ collapsed: false });
    expect(wrapper.get('[data-test="team-active-tasks-body"]').attributes('style') ?? '').not.toContain('display: none');
    expect(wrapper.find('[data-test="team-active-tasks-split"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="team-active-tasks-navigator"]').exists()).toBe(true);
  });

  it('renders task detail navigation without duplicating execution hierarchy rows', () => {
    const wrapper = mountSubject();

    expect(wrapper.get('[data-test="team-task-detail-agent-entry"]').text()).toContain('Draft the implementation handoff.');
    expect(wrapper.get('[data-test="team-task-detail-agent-entry"] [data-test="team-active-task-summary-row"]').text()).not.toContain('task_0001');
    expect(wrapper.get('[data-test="team-task-detail-agent-entry"] [data-test="team-active-task-summary-row"]').text()).not.toContain('active');
    expect(wrapper.get('[data-test="team-task-detail-team-entry"]').text()).toContain('Review the implementation as a team.');
    expect(wrapper.get('[data-test="team-task-detail-team-entry"] [data-test="team-active-task-summary-row"]').text()).not.toContain('task_0002');
    expect(wrapper.get('[data-test="team-task-detail-team-entry"] [data-test="team-active-task-summary-row"]').text()).not.toContain('awaiting_review');
    expect(wrapper.find('[data-test="left-active-task-actor-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="left-active-task-member-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="left-active-task-members"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="team-active-task-references"]').text()).toContain('design-spec.md');
    expect(wrapper.get('[data-test="team-active-task-technical-details"]').text()).toContain('Technical details');

    expect(wrapper.get('[data-test="active-task-task-body"]').text()).toContain('Review the implementation as a team.');
    expect(wrapper.find('[data-test="active-task-focus-primary"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="active-task-task-detail"]').text()).not.toContain('software_engineering_team');
    expect(wrapper.get('[data-test="active-task-task-detail"]').text()).not.toContain('Task Team');
    expect(wrapper.find('[data-test="active-task-technical-details"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="active-task-detail-pane"]').find('[data-test="team-active-task-reference-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="active-task-member-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="active-task-approve-tool"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="active-task-deny-tool"]').exists()).toBe(false);
  });

  it('switches the whole right pane to a task-owned reference preview and refreshes repeated reference selections', async () => {
    const wrapper = mountSubject();
    const reference = wrapper.findAll('[data-test="team-active-task-reference-row"]')[0];

    await reference.trigger('click');

    expect(wrapper.get('[data-test="task-reference-viewer"]').text()).toContain('/tmp/design-spec.md');
    expect(wrapper.get('[data-test="task-reference-viewer"]').text()).toContain('team-run');
    expect(wrapper.get('[data-test="task-reference-viewer"]').text()).toContain('task_0002');
    expect(wrapper.get('[data-test="task-reference-refresh"]').text()).toBe('0');
    expect(wrapper.find('[data-test="active-task-task-body"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="viewer-back"]').exists()).toBe(false);
    expect(wrapper.emitted('select-member')).toBeUndefined();

    await reference.trigger('click');
    expect(wrapper.get('[data-test="task-reference-refresh"]').text()).toBe('1');
  });

  it('returns from reference preview to task body when a summary row is selected', async () => {
    const wrapper = mountSubject();
    const reference = wrapper.findAll('[data-test="team-active-task-reference-row"]')[0];
    await reference.trigger('click');
    expect(wrapper.find('[data-test="active-task-reference-preview"]').exists()).toBe(true);

    await wrapper.get('[data-test="team-task-detail-team-entry"] [data-test="team-active-task-summary-row"]').trigger('click');
    expect(wrapper.get('[data-test="active-task-task-body"]').text()).toContain('Review the implementation as a team.');
    expect(wrapper.find('[data-test="active-task-reference-preview"]').exists()).toBe(false);
  });

  it('adds a message-style horizontal split resize handle for the task navigator', async () => {
    const wrapper = mountSubject();
    const navigator = wrapper.get('[data-test="team-active-tasks-navigator"]');
    const handle = wrapper.get('[data-test="team-active-tasks-resize-handle"]');

    expect(handle.attributes('role')).toBe('separator');
    expect(handle.attributes('aria-orientation')).toBe('vertical');
    expect(navigator.attributes('style')).toContain('width: 248px');

    await handle.trigger('mousedown', { clientX: 200 });
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 500 }));
    await wrapper.vm.$nextTick();
    expect(navigator.attributes('style')).toContain('width: 360px');
    window.dispatchEvent(new MouseEvent('mouseup'));

    await handle.trigger('mousedown', { clientX: 500 });
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100 }));
    await wrapper.vm.$nextTick();
    expect(navigator.attributes('style')).toContain('width: 168px');
    window.dispatchEvent(new MouseEvent('mouseup'));
  });

  it('selects task summaries for reading without focusing execution targets', async () => {
    const wrapper = mountSubject();

    await wrapper.get('[data-test="team-task-detail-agent-entry"] [data-test="team-active-task-summary-row"]').trigger('click');

    expect(wrapper.emitted('select-member')).toBeUndefined();
    expect(wrapper.get('[data-test="active-task-task-body"]').text()).toContain('Draft the implementation handoff.');
    expect(wrapper.find('[data-test="left-active-task-actor-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="active-task-focus-primary"]').exists()).toBe(false);
  });

  it('keeps task-team summary selection detail-only with no member navigation', async () => {
    const wrapper = mountSubject();

    await wrapper.get('[data-test="team-task-detail-team-entry"] [data-test="team-active-task-summary-row"]').trigger('click');
    expect(wrapper.emitted('select-member')).toBeUndefined();
    expect(wrapper.find('[data-test="left-active-task-actor-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="left-active-task-member-row"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="active-task-task-body"]').text()).toContain('Review the implementation as a team.');
  });

  it('shows the empty active task state', () => {
    const wrapper = mountSubject({
      ...buildTeamContext(),
      memberTree: [],
      memberNodesByRouteKey: new Map(),
      leafAgentContextsByRouteKey: new Map(),
    });

    expect(wrapper.get('[data-test="team-active-tasks-header"]').text()).toContain('0 tasks');
    const emptyState = wrapper.get('[data-test="team-active-tasks-empty"]');
    expect(emptyState.text()).toContain('No active delegated tasks');
    expect(emptyState.text()).toContain('Delegated work will appear here automatically.');
    expect(emptyState.classes()).not.toContain('border-dashed');
  });
});
