import { describe, expect, it } from 'vitest'
import { createTeamExecutionAddress, toTeamExecutionAddressDto } from '~/types/agent/TeamExecutionAddress'
import {
  buildTestTeamContext,
  reconcileTestTaskSnapshot,
  testAgentNode,
  testSubTeamNode,
  testTaskProjection,
} from '~/test-support/currentTeamTestFixtures'
import type { TeamTaskProjection } from '~/services/teamExecution/teamExecutionModels'
import { deriveDelegatedTaskEntries } from '~/utils/teamDelegatedTaskEntries'

const ROOT = 'root-team-run'
const stable = (memberAddress: string) => createTeamExecutionAddress({
  rootTeamRunId: ROOT,
  memberAddress,
})
const taskAgentExecution = (input: {
  memberAddress?: string
  taskAgentRunId?: string
  taskTeamRunIds?: string[]
} = {}) => createTeamExecutionAddress({
  rootTeamRunId: ROOT,
  taskTeamRunIds: input.taskTeamRunIds ?? [],
  memberAddress: input.memberAddress ?? '/worker',
  taskAgentRunId: input.taskAgentRunId ?? 'task_0001-run',
})

const teamContext = (tasks: TeamTaskProjection[]) => {
  const teamLead = testAgentNode('/design_team/team_lead', { agentRunId: 'team-lead-run' })
  const designWorker = testAgentNode('/design_team/worker', { agentRunId: 'design-worker-run' })
  return buildTestTeamContext({
    teamRunId: ROOT,
    coordinatorAddress: '/coordinator',
    rootChildren: [
      testAgentNode('/coordinator', { agentRunId: 'coordinator-run' }),
      testAgentNode('/worker', { displayName: 'worker', agentRunId: 'worker-run' }),
      testAgentNode('/other-sender', { agentRunId: 'other-sender-run' }),
      testAgentNode('/other-receiver', { agentRunId: 'other-receiver-run' }),
      testSubTeamNode('/design_team', [teamLead, designWorker], {
        displayName: 'design_team',
        teamDefinitionId: 'design-team-def',
        teamRunId: 'design-team-persistent-run',
        coordinatorAddress: teamLead.address,
      }),
    ],
    tasks,
  })
}

describe('deriveDelegatedTaskEntries current canonical identity', () => {
  it('filters current task projections by the exact focused sender or target execution address', () => {
    const workerTask = testTaskProjection({
      taskId: 'task_0001',
      executionAddress: taskAgentExecution(),
      senderAddress: stable('/coordinator'),
      content: 'Worker task',
    })
    const unrelatedTask = testTaskProjection({
      taskId: 'task_0009',
      executionAddress: taskAgentExecution({
        memberAddress: '/other-receiver',
        taskAgentRunId: 'task_0009-run',
      }),
      senderAddress: stable('/other-sender'),
      content: 'Unrelated task',
    })
    const context = teamContext([workerTask, unrelatedTask])

    expect(deriveDelegatedTaskEntries(context, stable('/coordinator')).map((entry) => entry.taskId))
      .toEqual(['task_0001'])
    expect(deriveDelegatedTaskEntries(context, stable('/worker')).map((entry) => entry.taskId))
      .toEqual(['task_0001'])
  })

  it('matches a Team-target projection by exact Team placement and exposes its task TeamRun identity', () => {
    const taskTeamAddress = createTeamExecutionAddress({
      rootTeamRunId: ROOT,
      taskTeamRunIds: ['task-team-run'],
      memberAddress: '/design_team',
    })
    const context = teamContext([testTaskProjection({
      taskId: 'task_0002',
      executionAddress: taskTeamAddress,
      senderAddress: stable('/coordinator'),
      content: 'Live team task',
    })])

    const byTarget = deriveDelegatedTaskEntries(context, stable('/design_team'))

    expect(byTarget).toHaveLength(1)
    expect(byTarget[0]).toMatchObject({
      taskId: 'task_0002',
      kind: 'task_team',
      runId: 'task-team-run',
      node: expect.objectContaining({ kind: 'agent_team', address: '/design_team' }),
      taskTargetKind: 'agent_team',
    })
    expect(deriveDelegatedTaskEntries(context, stable('/design_team/team_lead'))).toEqual([])
  })

  it('classifies a task-Team child projection by its final exact task-Agent identity', () => {
    const childWorkerAddress = createTeamExecutionAddress({
      rootTeamRunId: ROOT,
      taskTeamRunIds: ['task-team-run'],
      memberAddress: '/design_team/worker',
    })
    const childTaskAddress = taskAgentExecution({
      memberAddress: '/design_team/worker',
      taskTeamRunIds: ['task-team-run'],
      taskAgentRunId: 'child-task-agent-run',
    })
    const outerTask = testTaskProjection({
      taskId: 'task_0002',
      executionAddress: createTeamExecutionAddress({
        rootTeamRunId: ROOT,
        taskTeamRunIds: ['task-team-run'],
        memberAddress: '/design_team',
      }),
      senderAddress: stable('/coordinator'),
      content: 'Outer Team task',
    })
    const childTask = testTaskProjection({
      taskId: 'task_0010',
      executionAddress: childTaskAddress,
      senderAddress: createTeamExecutionAddress({
        rootTeamRunId: ROOT,
        taskTeamRunIds: ['task-team-run'],
        memberAddress: '/design_team/team_lead',
      }),
      content: 'Nested child task',
    })
    const context = teamContext([outerTask])
    expect(context.executions.applyExecutionMessage({
      type: 'AGENT_STATUS',
      payload: {
        agent_execution: {
          kind: 'task_team_agent',
          execution_address: toTeamExecutionAddressDto(createTeamExecutionAddress({
            rootTeamRunId: ROOT,
            taskTeamRunIds: ['task-team-run'],
            memberAddress: '/design_team/team_lead',
          })),
          agent_run_id: 'task-team-lead-run',
        },
        status: 'running',
        trigger: null,
        tool_name: null,
        error_message: null,
        error_details: null,
      },
    }).disposition).not.toBe('rejected')
    expect(reconcileTestTaskSnapshot(context, [outerTask, childTask]).disposition).toBe('applied')

    expect(deriveDelegatedTaskEntries(context, childWorkerAddress)).toEqual([
      expect.objectContaining({
        taskId: 'task_0010',
        kind: 'task_agent',
        runId: 'child-task-agent-run',
        taskTargetKind: 'agent',
      }),
    ])
  })
})
