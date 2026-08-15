import { describe, expect, it } from 'vitest';
import type { TaskExecutionDto } from '@autobyteus/team-stream-contracts';
import {
  buildTestTeamContext,
  testAgentNode,
  testSubTeamNode,
  testTaskRecord,
} from '~/test-support/currentTeamTestFixtures';
import { deriveDelegatedTaskEntries } from '~/utils/teamDelegatedTaskEntries';

const ROOT = 'root-team-run';
const baseNodes = () => {
  const lead = testAgentNode('/design_team/team_lead', { agentRunId: 'team-lead-run' });
  const worker = testAgentNode('/design_team/worker', { agentRunId: 'design-worker-run' });
  return {
    lead,
    worker,
    nodes: [
      testAgentNode('/coordinator', { agentRunId: 'coordinator-run' }),
      testAgentNode('/worker', { agentRunId: 'worker-run' }),
      testAgentNode('/other', { agentRunId: 'other-run' }),
      testSubTeamNode('/design_team', [lead, worker], {
        teamDefinitionId: 'design-team-def', teamRunId: 'design-team-persistent-run', coordinatorAddress: lead.address,
      }),
    ],
  };
};

describe('deriveDelegatedTaskEntries current AgentRun/TeamRun identity', () => {
  it('filters tasks by the exact focused delegator or task AgentRun', () => {
    const { nodes } = baseNodes();
    const tasks = [
      testTaskRecord({
        taskId: 'task-1', delegatorAgentRunId: 'coordinator-run', recipientAddress: '/worker',
        target: { agentRunId: 'task-worker-run' }, description: 'Worker task',
      }),
      testTaskRecord({
        taskId: 'task-2', delegatorAgentRunId: 'other-run', recipientAddress: '/worker',
        target: { agentRunId: 'other-task-run' }, description: 'Unrelated task',
      }),
    ];
    const context = buildTestTeamContext({ teamRunId: ROOT, coordinatorAddress: '/coordinator', rootChildren: nodes, tasks });

    expect(deriveDelegatedTaskEntries(context, 'coordinator-run').map((entry) => entry.taskId)).toEqual(['task-1']);
    expect(deriveDelegatedTaskEntries(context, 'task-worker-run').map((entry) => entry.taskId)).toEqual(['task-1']);
    expect(deriveDelegatedTaskEntries(context, 'worker-run')).toEqual([]);
  });

  it('exposes exact task TeamRun identity and includes each concrete child AgentRun in its perspective', () => {
    const { nodes } = baseNodes();
    const task = testTaskRecord({
      taskId: 'task-team-1', delegatorAgentRunId: 'coordinator-run', recipientAddress: '/design_team',
      target: { teamRunId: 'task-team-run' }, description: 'Live Team task',
    });
    const context = buildTestTeamContext({
      teamRunId: ROOT, coordinatorAddress: '/coordinator', rootChildren: nodes, tasks: [task],
    });

    expect(deriveDelegatedTaskEntries(context, 'task-team-run:team-lead-run')).toEqual([
      expect.objectContaining({
        taskId: 'task-team-1', kind: 'task_team', runId: 'task-team-run', taskTargetKind: 'agent_team',
      }),
    ]);
    expect(deriveDelegatedTaskEntries(context, 'team-lead-run')).toEqual([]);
  });

  it('keeps a nested task Agent distinct inside its task Team subtree', () => {
    const { nodes } = baseNodes();
    const outer = testTaskRecord({
      taskId: 'task-team-1', delegatorAgentRunId: 'coordinator-run', recipientAddress: '/design_team',
      target: { teamRunId: 'task-team-run' }, description: 'Outer Team task',
    });
    const child = testTaskRecord({
      taskId: 'child-task-1', delegatorAgentRunId: 'task-team-run:team-lead-run',
      recipientAddress: '/design_team/worker', target: { agentRunId: 'child-task-agent-run' },
      description: 'Nested child task',
    });
    const nestedExecution: TaskExecutionDto = {
      kind: 'task_team', address: '/design_team', team_run_id: 'task-team-run',
      started_at: outer.created_at, settled_at: null,
      members: [
        { kind: 'task_team_agent', address: '/design_team/team_lead', agent_run_id: 'task-team-run:team-lead-run', platform_agent_run_id: null },
        { kind: 'task_team_agent', address: '/design_team/worker', agent_run_id: 'task-team-run:design-worker-run', platform_agent_run_id: null },
      ],
      task_executions: [{
        kind: 'task_agent', address: '/design_team/worker', agent_run_id: 'child-task-agent-run',
        platform_agent_run_id: null, started_at: child.created_at, settled_at: null,
      }],
    };
    const context = buildTestTeamContext({
      teamRunId: ROOT, coordinatorAddress: '/coordinator', rootChildren: nodes,
      tasks: [outer, child], taskExecutions: [nestedExecution],
    });

    expect(deriveDelegatedTaskEntries(context, 'child-task-agent-run')).toEqual([
      expect.objectContaining({ taskId: 'child-task-1', kind: 'task_agent', runId: 'child-task-agent-run' }),
    ]);
  });
});
