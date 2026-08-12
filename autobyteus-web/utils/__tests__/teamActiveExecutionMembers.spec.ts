import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { createTeamExecutionAddress, toTeamExecutionAddressDto } from '~/types/agent/TeamExecutionAddress';
import {
  buildTestTeamContext,
  testAgentContext,
  testAgentNode,
  testSubTeamNode,
  testTaskProjection,
} from '~/test-support/currentTeamTestFixtures';
import type { TeamExecutionProjectionMessage, TeamTaskProjection } from '~/services/teamExecution/teamExecutionModels';
import {
  flattenActiveExecutionMemberNodesForDisplay,
  resolveActiveExecutionFocus,
} from '../teamActiveExecutionMembers';

const ROOT = 'team-active-execution-1';
const stableAddress = (memberAddress: string) => createTeamExecutionAddress({
  rootTeamRunId: ROOT,
  memberAddress,
});
const taskAgentAddress = (taskAgentRunId: string, taskTeamRunIds: string[] = []) => createTeamExecutionAddress({
  rootTeamRunId: ROOT,
  taskTeamRunIds,
  memberAddress: taskTeamRunIds.length ? '/SoftwareTeam/worker' : '/worker',
  taskAgentRunId,
});
const entryIds = (team: ReturnType<typeof buildTestTeamContext>) =>
  flattenActiveExecutionMemberNodesForDisplay(team).map(({ node, executionAddress }) =>
    executionAddress.taskAgentRunId
      ?? executionAddress.taskTeamRunIds.at(-1)
      ?? node.address);

const buildTeam = (input: {
  workerStatus?: AgentStatus;
  workerMessages?: any[];
  extraPersistentNodes?: ReturnType<typeof testSubTeamNode>[];
  tasks?: TeamTaskProjection[];
  executionMessages?: TeamExecutionProjectionMessage[];
} = {}) => {
  const coordinator = testAgentNode('/coordinator', {
    displayName: 'Coordinator',
    agentRunId: 'coordinator-run',
    currentStatus: AgentStatus.Running,
  });
  const worker = testAgentNode('/worker', {
    displayName: 'Worker',
    agentRunId: 'worker-run',
    currentStatus: input.workerStatus ?? AgentStatus.Offline,
  });
  return buildTestTeamContext({
    teamRunId: ROOT,
    coordinatorAddress: '/coordinator',
    focusedExecutionAddress: stableAddress('/worker'),
    rootChildren: [coordinator, worker, ...(input.extraPersistentNodes ?? [])],
    contexts: [
      {
        executionAddress: stableAddress('/coordinator'),
        context: testAgentContext({ runId: 'coordinator-run', status: AgentStatus.Running }),
      },
      {
        executionAddress: stableAddress('/worker'),
        context: testAgentContext({
          runId: 'worker-run',
          status: input.workerStatus ?? AgentStatus.Offline,
          messages: input.workerMessages ?? [],
        }),
      },
    ],
    tasks: input.tasks,
    executionMessages: input.executionMessages,
  });
};

describe('teamActiveExecutionMembers current execution tree', () => {
  it('falls back from a settled task-agent-only logical member to the coordinator', () => {
    const team = buildTeam({
      workerMessages: [{
        type: 'user',
        text: 'You have been activated as task agent for task_0001.',
        timestamp: new Date('2026-06-02T00:00:00.000Z'),
      }],
    });

    expect(entryIds(team)).toEqual(['/coordinator']);
    expect(resolveActiveExecutionFocus(team, stableAddress('/worker'))).toEqual(stableAddress('/worker'));
  });

  it('keeps the exact concrete task-agent execution visible when its logical member is inactive', () => {
    const executionAddress = taskAgentAddress('task-agent-run-1');
    const team = buildTeam({
      tasks: [testTaskProjection({
        taskId: 'task_0001',
        executionAddress,
        senderAddress: stableAddress('/coordinator'),
      })],
    });

    expect(entryIds(team)).toEqual(['/coordinator', 'task-agent-run-1']);
    expect(resolveActiveExecutionFocus(team, executionAddress)).toEqual(executionAddress);
  });

  it('does not treat a task-agent-only logical member conversation as active execution', () => {
    const team = buildTeam({
      workerStatus: AgentStatus.Initializing,
      workerMessages: [{
        type: 'user',
        text: 'Task-agent run: opaque-run-id',
        timestamp: new Date('2026-06-02T00:00:00.000Z'),
      }],
    });

    expect(entryIds(team)).toEqual(['/coordinator']);
    expect(resolveActiveExecutionFocus(team, stableAddress('/worker'))).toEqual(stableAddress('/worker'));
  });

  it('keeps a direct logical member conversation visible after the member is offline', () => {
    const team = buildTeam({
      workerMessages: [{
        type: 'user',
        text: 'direct member follow-up',
        timestamp: new Date('2026-06-02T00:00:00.000Z'),
      }],
    });

    expect(entryIds(team)).toEqual(['/coordinator', '/worker']);
  });

  it('includes task-Team roots, scoped children, and nested task Agents together', () => {
    const taskTeamExecutionAddress = createTeamExecutionAddress({
      rootTeamRunId: ROOT,
      taskTeamRunIds: ['task-team-run-1'],
      memberAddress: '/SoftwareTeam',
    });
    const scopedChildAddress = createTeamExecutionAddress({
      rootTeamRunId: ROOT,
      taskTeamRunIds: ['task-team-run-1'],
      memberAddress: '/SoftwareTeam/worker',
    });
    const nestedTaskAgentAddress = taskAgentAddress('nested-task-agent-run', ['task-team-run-1']);
    const softwareWorker = testAgentNode('/SoftwareTeam/worker', { agentRunId: 'worker-persistent-run' });
    const softwareTeam = testSubTeamNode('/SoftwareTeam', [softwareWorker], {
      teamRunId: 'software-team-persistent-run',
      coordinatorAddress: softwareWorker.address,
    });
    const team = buildTeam({
      extraPersistentNodes: [softwareTeam],
      tasks: [
        testTaskProjection({
          taskId: 'task-team-1',
          executionAddress: taskTeamExecutionAddress,
          senderAddress: stableAddress('/coordinator'),
        }),
        testTaskProjection({
          taskId: 'task_nested',
          executionAddress: nestedTaskAgentAddress,
          senderAddress: scopedChildAddress,
        }),
      ],
      executionMessages: [{
        type: 'AGENT_STATUS',
        payload: {
          agent_execution: {
            kind: 'task_team_agent',
            execution_address: toTeamExecutionAddressDto(scopedChildAddress),
            agent_run_id: 'task-team-worker-run',
          },
          status: 'running',
          trigger: null,
          tool_name: null,
          error_message: null,
          error_details: null,
        },
      }],
    });

    expect(entryIds(team)).toEqual([
      '/coordinator',
      'task-team-run-1',
      'nested-task-agent-run',
      'task-team-run-1',
    ]);
  });
});
