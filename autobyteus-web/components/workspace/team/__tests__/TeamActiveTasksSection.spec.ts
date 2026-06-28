import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TeamActiveTasksSection from '../TeamActiveTasksSection.vue';
import { AgentStatus } from '~/types/agent/AgentStatus';

const { postToolExecutionApproval } = vi.hoisted(() => ({
  postToolExecutionApproval: vi.fn(),
}));

vi.mock('~/stores/activeContextStore', () => ({
  useActiveContextStore: () => ({
    postToolExecutionApproval,
  }),
}));

const labels: Record<string, string> = {
  'workspace.components.workspace.team.TeamActiveTasksSection.active_tasks': 'Active Tasks',
  'workspace.components.workspace.team.TeamActiveTasksSection.active_count': 'Active',
  'workspace.components.workspace.team.TeamActiveTasksSection.empty': 'No active delegated tasks',
  'workspace.components.workspace.team.TeamActiveTasksSection.task_agent': 'Task Agent',
  'workspace.components.workspace.team.TeamActiveTasksSection.task_team': 'Task Team',
  'workspace.components.workspace.team.TeamActiveTasksSection.approval_required': 'Approval required',
  'workspace.components.workspace.team.TeamActiveTasksSection.task': 'Task',
  'workspace.components.workspace.team.TeamActiveTasksSection.status': 'Status',
  'workspace.components.workspace.team.TeamActiveTasksSection.target': 'Target',
  'workspace.components.workspace.team.TeamActiveTasksSection.task_id': 'Task ID',
  'workspace.components.workspace.team.TeamActiveTasksSection.agent_run_id': 'Agent run ID',
  'workspace.components.workspace.team.TeamActiveTasksSection.agent_team_run_id': 'Agent team run ID',
  'workspace.components.workspace.team.TeamActiveTasksSection.target_member': 'member',
  'workspace.components.workspace.team.TeamActiveTasksSection.target_team': 'team',
  'workspace.components.workspace.team.TeamActiveTasksSection.description_unavailable': 'Task description unavailable',
  'workspace.components.workspace.team.TeamActiveTasksSection.open_conversation': 'Open conversation',
  'workspace.components.workspace.team.TeamActiveTasksSection.members': 'Members',
  'workspace.components.conversation.ToolCallIndicator.deny': 'Deny',
  'workspace.components.conversation.ToolCallIndicator.approve': 'Approve',
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
        messages: [
          {
            type: 'ai',
            text: '',
            timestamp: new Date('2026-05-30T00:00:01.000Z'),
            isComplete: false,
            segments: [
              {
                type: 'terminal_command',
                invocationId: 'call-run-bash-1',
                toolName: 'run_bash',
                arguments: { command: 'echo task-agent approval' },
                command: 'echo task-agent approval',
                description: 'Run task-agent approval command',
                status: 'awaiting-approval',
                logs: [],
                result: null,
                error: null,
                approvalTarget: {
                  memberRouteKey: 'worker',
                  sourceRouteKey: 'worker',
                  taskAgentRunId: 'team-run__worker__task_0001',
                },
              },
            ],
          },
        ],
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

const mountSubject = (teamContext = buildTeamContext()) => mount(TeamActiveTasksSection, {
  props: { teamContext: teamContext as any },
  global: {
    mocks: {
      $t: (key: string) => labels[key] ?? key,
    },
  },
});

describe('TeamActiveTasksSection', () => {
  beforeEach(() => {
    postToolExecutionApproval.mockReset();
  });

  it('renders task-agent and task-team rows with details and explicit run-id labels', async () => {
    const wrapper = mountSubject();

    expect(wrapper.get('[data-test="team-active-tasks-header"]').text()).toContain('2 Active');
    expect(wrapper.get('[data-test="task-agent-active-task-row"]').text()).toContain('Task Agent');
    expect(wrapper.get('[data-test="task-agent-active-task-row"]').text()).toContain('worker · task_0001');
    expect(wrapper.get('[data-test="task-team-active-task-row"]').text()).toContain('Task Team');
    expect(wrapper.get('[data-test="task-team-active-task-row"]').text()).toContain('software_engineering_team · task_0002');

    await wrapper.get('[data-test="task-agent-active-task-row"] [data-test="active-task-expand-toggle"]').trigger('click');
    const agentRow = wrapper.get('[data-test="task-agent-active-task-row"]');
    expect(agentRow.text()).toContain('Draft the implementation handoff.');
    expect(agentRow.text()).toContain('Target');
    expect(agentRow.text()).toContain('member worker');
    expect(agentRow.text()).toContain('Task ID');
    expect(agentRow.text()).toContain('task_0001');
    expect(agentRow.text()).toContain('Agent run ID');
    expect(agentRow.text()).not.toContain('Runtime');

    await wrapper.get('[data-test="task-team-active-task-row"] [data-test="active-task-expand-toggle"]').trigger('click');
    const teamRow = wrapper.get('[data-test="task-team-active-task-row"]');
    expect(teamRow.text()).toContain('Review the implementation as a team.');
    expect(teamRow.text()).toContain('Agent team run ID');
    expect(teamRow.text()).toContain('Members');
    expect(teamRow.text()).toContain('solution_designer');
  });

  it('approves a task-agent tool request with the concrete task-agent run identity', async () => {
    const wrapper = mountSubject();
    await wrapper.get('[data-test="task-agent-active-task-row"] [data-test="active-task-expand-toggle"]').trigger('click');

    await wrapper.get('[data-test="active-task-approve-tool"]').trigger('click');

    expect(postToolExecutionApproval).toHaveBeenCalledWith(
      'call-run-bash-1',
      true,
      null,
      expect.objectContaining({
        memberRouteKey: 'worker',
        sourceRouteKey: 'worker',
        taskAgentRunId: 'team-run__worker__task_0001',
      }),
    );
  });

  it('emits focus requests for task rows without expanding from row click', async () => {
    const wrapper = mountSubject();

    await wrapper.get('[data-test="task-agent-active-task-row"] [data-test="active-task-open-row"]').trigger('click');

    expect(wrapper.emitted('select-member')?.[0]).toEqual(['team-run__worker__task_0001']);
    expect(wrapper.find('[data-test="active-task-description"]').exists()).toBe(false);
  });

  it('emits focus requests for task-team members', async () => {
    const wrapper = mountSubject();
    await wrapper.get('[data-test="task-team-active-task-row"] [data-test="active-task-expand-toggle"]').trigger('click');

    await wrapper.get('[data-test="active-task-member-row"]').trigger('click');

    expect(wrapper.emitted('select-member')?.[0]).toEqual(['task-team-run-1/solution_designer']);
  });

  it('shows the empty active task state', () => {
    const wrapper = mountSubject({
      ...buildTeamContext(),
      memberTree: [],
      memberNodesByRouteKey: new Map(),
      leafAgentContextsByRouteKey: new Map(),
    });

    expect(wrapper.get('[data-test="team-active-tasks-header"]').text()).toContain('0 Active');
    expect(wrapper.get('[data-test="team-active-tasks-empty"]').text()).toContain('No active delegated tasks');
  });
});
