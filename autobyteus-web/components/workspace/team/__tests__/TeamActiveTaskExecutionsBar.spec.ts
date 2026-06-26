import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TeamActiveTaskExecutionsBar from '../TeamActiveTaskExecutionsBar.vue';
import { AgentStatus } from '~/types/agent/AgentStatus';

const { postToolExecutionApproval } = vi.hoisted(() => ({
  postToolExecutionApproval: vi.fn(),
}));

vi.mock('~/stores/activeContextStore', () => ({
  useActiveContextStore: () => ({
    postToolExecutionApproval,
  }),
}));

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
    memberName: 'worker task task_0001',
    displayName: 'worker task task_0001',
    memberPath: ['worker', 'team-run__worker__task_0001'],
    memberRouteKey: 'team-run__worker__task_0001',
    memberRunId: 'team-run__worker__task_0001',
    agentDefinitionId: 'worker-agent',
    isTaskAgentInstance: true,
    taskAgentInstanceId: 'task_agent_task_0001',
    taskAgentRunId: 'team-run__worker__task_0001',
    taskId: 'task_0001',
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
  const taskTeamNode = {
    memberKind: 'agent_team',
    memberName: 'Software Engineering Team · task_0001',
    displayName: 'Software Engineering Team · task_0001',
    memberPath: ['task-team-run-1'],
    memberRouteKey: 'task-team-run-1',
    memberRunId: 'task-team-run-1',
    teamDefinitionId: 'software-team',
    teamRunId: 'task-team-run-1',
    children: [],
    isTaskTeamInstance: true,
    taskTeamInstanceId: 'task-team-instance-1',
    taskTeamRunId: 'task-team-run-1',
    taskId: 'task_0001',
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
      ['team-run__worker__task_0001', taskAgentNode],
    ]),
    leafAgentContextsByRouteKey: new Map<string, any>([
      ['team-run__worker__task_0001', taskAgentContext],
    ]),
    focusedMemberRouteKey: 'worker',
  };
};

describe('TeamActiveTaskExecutionsBar', () => {
  beforeEach(() => {
    postToolExecutionApproval.mockReset();
  });

  it('renders active task-agent entities and pending approvals in focus mode surfaces', () => {
    const wrapper = mount(TeamActiveTaskExecutionsBar, {
      props: {
        teamContext: buildTeamContext() as any,
      },
      global: {
        stubs: {
          AgentStatusDisplay: {
            props: ['status'],
            template: '<span data-test="agent-status">{{ status }}</span>',
          },
        },
      },
    });

    expect(wrapper.get('[data-test="team-active-task-executions-bar"]').text()).toContain('Active task executions');
    expect(wrapper.get('[data-test="task-team-entity-card"]').text()).toContain('Task team');
    expect(wrapper.get('[data-test="task-team-entity-card"]').text()).toContain('awaiting_review');
    expect(wrapper.get('[data-test="task-agent-entity-card"]').text()).toContain('Task agent');
    expect(wrapper.text()).toContain('team-run__worker__task_0001');
    expect(wrapper.text()).toContain('Approval required');
    expect(wrapper.text()).toContain('run_bash');
    expect(wrapper.get('[data-test="agent-status"]').text()).toContain('running');
  });

  it('approves a task-agent tool request with the concrete task-agent run identity', async () => {
    const wrapper = mount(TeamActiveTaskExecutionsBar, {
      props: {
        teamContext: buildTeamContext() as any,
      },
      global: {
        stubs: {
          AgentStatusDisplay: true,
        },
      },
    });

    await wrapper.get('[data-test="task-agent-approve-tool"]').trigger('click');

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

  it('selects the concrete task-agent entity when its card is clicked', async () => {
    const wrapper = mount(TeamActiveTaskExecutionsBar, {
      props: {
        teamContext: buildTeamContext() as any,
      },
      global: {
        stubs: {
          AgentStatusDisplay: true,
        },
      },
    });

    await wrapper.get('[data-test="task-agent-entity-card"]').trigger('click');

    expect(wrapper.emitted('select-member')?.[0]).toEqual(['team-run__worker__task_0001']);
  });
});
