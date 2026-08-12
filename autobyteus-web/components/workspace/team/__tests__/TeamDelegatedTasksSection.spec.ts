import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TeamDelegatedTasksSection from '../TeamDelegatedTasksSection.vue';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { createTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import {
  buildTestTeamContext,
  testAgentNode,
  testSubTeamNode,
  testTaskProjection,
} from '~/test-support/currentTeamTestFixtures';

const labels: Record<string, string> = {
  'workspace.components.workspace.team.TeamDelegatedTasksSection.tasks': 'Tasks',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.task_count_singular': 'task',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.task_count_plural': 'tasks',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.empty': 'No delegated tasks yet',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.empty_detail': 'Delegated work appears here from saved task records.',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.description_unavailable': 'Task description unavailable',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.focus': 'Focus',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.technical_details': 'Technical details',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.select_task': 'Select a task to read it.',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.waiting_activity_notice': 'Waiting for user action in Activity.',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.task_type': 'Task type',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.task_id': 'Task ID',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.agent_run_id': 'Agent run ID',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.agent_team_run_id': 'Agent team run ID',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.target_kind': 'Target kind',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.target': 'Target',
};

const buildTeamContext = (includeTasks = true) => {
  const logicalWorkerNode = testAgentNode('/worker', {
    displayName: 'worker',
    agentRunId: 'team-run::worker',
    agentDefinitionId: 'worker-agent',
  });
  const taskAgentAddress = createTeamExecutionAddress({
    rootTeamRunId: 'team-run',
    memberAddress: logicalWorkerNode.address,
    taskAgentRunId: 'team-run__worker__task_0001',
  });
  const taskAgent = testTaskProjection({
    taskId: 'task_0001',
    executionAddress: taskAgentAddress,
    senderAddress: createTeamExecutionAddress({ rootTeamRunId: 'team-run', memberAddress: logicalWorkerNode.address }),
    content: 'Draft the implementation handoff.',
    referenceFiles: [{
      referenceId: 'task-reference:0:/tmp/requirements.md',
      path: '/tmp/requirements.md',
      type: 'file',
      createdAt: '2026-05-30T00:00:00.000Z',
      updatedAt: '2026-05-30T00:00:00.000Z',
    }],
  });
  const taskTeamAddress = createTeamExecutionAddress({
    rootTeamRunId: 'team-run',
    taskTeamRunIds: ['task-team-run-1'],
    memberAddress: '/SoftwareEngineeringTeam',
  });
  const solutionNode = testAgentNode('/SoftwareEngineeringTeam/solution_designer', {
    displayName: 'solution_designer',
    agentRunId: 'persistent-solution-designer-run',
    agentDefinitionId: 'solution-designer',
    currentStatus: AgentStatus.Idle,
  });
  const softwareTeamNode = testSubTeamNode('/SoftwareEngineeringTeam', [solutionNode], {
    displayName: 'software_engineering_team',
    teamDefinitionId: 'software-team',
    teamRunId: 'persistent-software-team-run',
    coordinatorAddress: solutionNode.address,
  });
  const taskTeam = testTaskProjection({
    taskId: 'task_0002',
    executionAddress: taskTeamAddress,
    senderAddress: createTeamExecutionAddress({ rootTeamRunId: 'team-run', memberAddress: logicalWorkerNode.address }),
    status: 'active',
    content: 'Review the implementation as a team.',
    referenceFiles: [{
      referenceId: 'task-reference:0:/tmp/design-spec.md',
      path: '/tmp/design-spec.md',
      type: 'file',
      createdAt: '2026-05-30T00:00:00.000Z',
      updatedAt: '2026-05-30T00:00:00.000Z',
    }],
  });

  return buildTestTeamContext({
    teamRunId: 'team-run',
    coordinatorAddress: logicalWorkerNode.address,
    focusedExecutionAddress: createTeamExecutionAddress({
      rootTeamRunId: 'team-run',
      memberAddress: logicalWorkerNode.address,
    }),
    rootChildren: [logicalWorkerNode, softwareTeamNode],
    tasks: includeTasks ? [taskAgent, taskTeam] : [],
  });
};

const mountSubject = (teamContext = buildTeamContext(), props: Record<string, unknown> = {}) => mount(TeamDelegatedTasksSection, {
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

describe('TeamDelegatedTasksSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses controlled collapsed state with human task count and no approval summary', async () => {
    const wrapper = mountSubject(buildTeamContext(), { collapsed: true });

    expect(wrapper.get('[data-test="team-delegated-tasks-header"]').text()).toContain('2 tasks');
    expect(wrapper.find('[data-test="team-delegated-tasks-approval-summary"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="team-delegated-tasks-disclosure"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="team-delegated-tasks-header"]').text()).not.toMatch(/[▾▸]/);
    expect(wrapper.get('[data-test="team-delegated-tasks-body"]').attributes('style')).toContain('display: none');

    await wrapper.get('[data-test="team-delegated-tasks-header"]').trigger('click');
    expect(wrapper.emitted('toggle')).toHaveLength(1);
    expect(wrapper.get('[data-test="team-delegated-tasks-body"]').attributes('style')).toContain('display: none');

    await wrapper.setProps({ collapsed: false });
    expect(wrapper.get('[data-test="team-delegated-tasks-body"]').attributes('style') ?? '').not.toContain('display: none');
    expect(wrapper.find('[data-test="team-delegated-tasks-split"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="team-delegated-tasks-navigator"]').exists()).toBe(true);
  });

  it('renders task detail navigation without duplicating execution hierarchy rows', () => {
    const wrapper = mountSubject();

    expect(wrapper.get('[data-test="team-delegated-task-agent-entry"]').text()).toContain('Draft the implementation handoff.');
    expect(wrapper.get('[data-test="team-delegated-task-agent-entry"] [data-test="team-delegated-task-summary-row"]').text()).not.toContain('task_0001');
    expect(wrapper.get('[data-test="team-delegated-task-agent-entry"] [data-test="team-delegated-task-summary-row"]').text()).not.toContain('active');
    expect(wrapper.get('[data-test="team-delegated-task-team-entry"]').text()).toContain('Review the implementation as a team.');
    expect(wrapper.get('[data-test="team-delegated-task-team-entry"] [data-test="team-delegated-task-summary-row"]').text()).not.toContain('task_0002');
    expect(wrapper.get('[data-test="team-delegated-task-team-entry"] [data-test="team-delegated-task-summary-row"]').text()).not.toContain('awaiting_review');
    expect(wrapper.find('[data-test="left-delegated-task-actor-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="left-delegated-task-member-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="left-delegated-task-members"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="team-delegated-task-references"]').text()).toContain('requirements.md');
    expect(wrapper.get('[data-test="team-delegated-task-technical-details"]').text()).toContain('Technical details');

    expect(wrapper.get('[data-test="delegated-task-task-body"]').text()).toContain('Draft the implementation handoff.');
    expect(wrapper.find('[data-test="delegated-task-focus-primary"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="delegated-task-task-detail"]').text()).not.toContain('software_engineering_team');
    expect(wrapper.get('[data-test="delegated-task-task-detail"]').text()).not.toContain('Task Team');
    expect(wrapper.find('[data-test="delegated-task-technical-details"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="delegated-task-detail-pane"]').find('[data-test="team-delegated-task-reference-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="delegated-task-member-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="delegated-task-approve-tool"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="delegated-task-deny-tool"]').exists()).toBe(false);
  });

  it('switches the whole right pane to a task-owned reference preview and refreshes repeated reference selections', async () => {
    const wrapper = mountSubject();
    const reference = wrapper.findAll('[data-test="team-delegated-task-reference-row"]')[0];

    await reference.trigger('click');

    expect(wrapper.get('[data-test="task-reference-viewer"]').text()).toContain('/tmp/requirements.md');
    expect(wrapper.get('[data-test="task-reference-viewer"]').text()).toContain('team-run');
    expect(wrapper.get('[data-test="task-reference-viewer"]').text()).toContain('task_0001');
    expect(wrapper.get('[data-test="task-reference-refresh"]').text()).toBe('0');
    expect(wrapper.find('[data-test="delegated-task-task-body"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="viewer-back"]').exists()).toBe(false);
    expect(wrapper.emitted('select-member')).toBeUndefined();

    await reference.trigger('click');
    expect(wrapper.get('[data-test="task-reference-refresh"]').text()).toBe('1');
  });

  it('returns from reference preview to task body when a summary row is selected', async () => {
    const wrapper = mountSubject();
    const reference = wrapper.findAll('[data-test="team-delegated-task-reference-row"]')[0];
    await reference.trigger('click');
    expect(wrapper.find('[data-test="delegated-task-reference-preview"]').exists()).toBe(true);

    await wrapper.get('[data-test="team-delegated-task-team-entry"] [data-test="team-delegated-task-summary-row"]').trigger('click');
    expect(wrapper.get('[data-test="delegated-task-task-body"]').text()).toContain('Review the implementation as a team.');
    expect(wrapper.find('[data-test="delegated-task-reference-preview"]').exists()).toBe(false);
  });

  it('adds a message-style horizontal split resize handle for the task navigator', async () => {
    const wrapper = mountSubject();
    const navigator = wrapper.get('[data-test="team-delegated-tasks-navigator"]');
    const handle = wrapper.get('[data-test="team-delegated-tasks-resize-handle"]');

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

    await wrapper.get('[data-test="team-delegated-task-agent-entry"] [data-test="team-delegated-task-summary-row"]').trigger('click');

    expect(wrapper.emitted('select-member')).toBeUndefined();
    expect(wrapper.get('[data-test="delegated-task-task-body"]').text()).toContain('Draft the implementation handoff.');
    expect(wrapper.find('[data-test="left-delegated-task-actor-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="delegated-task-focus-primary"]').exists()).toBe(false);
  });

  it('keeps task-team summary selection detail-only with no member navigation', async () => {
    const wrapper = mountSubject();

    await wrapper.get('[data-test="team-delegated-task-team-entry"] [data-test="team-delegated-task-summary-row"]').trigger('click');
    expect(wrapper.emitted('select-member')).toBeUndefined();
    expect(wrapper.find('[data-test="left-delegated-task-actor-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="left-delegated-task-member-row"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="delegated-task-task-body"]').text()).toContain('Review the implementation as a team.');
  });

  it('shows the empty delegated-task state', () => {
    const empty = buildTeamContext(false);
    const wrapper = mountSubject(empty);

    expect(wrapper.get('[data-test="team-delegated-tasks-header"]').text()).toContain('0 tasks');
    const emptyState = wrapper.get('[data-test="team-delegated-tasks-empty"]');
    expect(emptyState.text()).toContain('No delegated tasks yet');
    expect(emptyState.text()).toContain('Delegated work appears here from saved task records.');
    expect(emptyState.classes()).not.toContain('border-dashed');
  });
});
