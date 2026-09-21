import {
  agentOrgExecutionViewDtoSchema,
  type AgentOrgExecutionTreeDto,
  type AgentOrgExecutionViewDto,
  type AgentOrgTaskRecordDto,
} from '@autobyteus/collaboration-stream-contracts'
import { parseAgentOrgExecutionTree } from '~/types/collaboration/agentOrgExecution'

type TaskExecution = AgentOrgExecutionTreeDto['rootOrg']['taskExecutions'][number]
type TaskTeam = Extract<TaskExecution, { teamRunId: string }>
type TaskTeamMember = TaskTeam['members'][number]

const executionRunId = (execution: TaskExecution): string =>
  'agentRunId' in execution ? execution.agentRunId : execution.teamRunId

const collectTaskAgentRunIds = (
  execution: TaskExecution | TaskTeamMember,
  output: string[],
): void => {
  if ('agentRunId' in execution) {
    output.push(execution.agentRunId)
    return
  }
  execution.members.forEach((member) => collectTaskAgentRunIds(member, output))
  execution.taskExecutions.forEach((task) => collectTaskAgentRunIds(task, output))
}

export const projectSettledAgentOrgTask = (input: Readonly<{
  view: AgentOrgExecutionViewDto
  task: AgentOrgTaskRecordDto
  settledAt: string
}>): Readonly<{
  view: AgentOrgExecutionViewDto
  terminalAgentRunIds: readonly string[]
}> => {
  const targetRunId = 'agentRunId' in input.task.taskExecution
    ? input.task.taskExecution.agentRunId
    : input.task.taskExecution.teamRunId
  const terminalAgentRunIds: string[] = []
  let matches = 0

  const mapMember = (member: TaskTeamMember): TaskTeamMember => 'agentRunId' in member
    ? member
    : {
        ...member,
        members: member.members.map(mapMember),
        taskExecutions: member.taskExecutions.map(mapTask),
      }
  const mapTask = (execution: TaskExecution): TaskExecution => {
    const projected = 'agentRunId' in execution
      ? execution
      : {
          ...execution,
          members: execution.members.map(mapMember),
          taskExecutions: execution.taskExecutions.map(mapTask),
        }
    if (executionRunId(execution) !== targetRunId) return projected
    matches += 1
    if (execution.settledAt !== null) {
      throw new Error(`AgentOrg task execution '${targetRunId}' is already settled.`)
    }
    collectTaskAgentRunIds(execution, terminalAgentRunIds)
    return { ...projected, settledAt: input.settledAt }
  }

  const nextTree = {
    ...input.view.execution_tree,
    rootOrg: {
      ...input.view.execution_tree.rootOrg,
      members: input.view.execution_tree.rootOrg.members.map((member) => 'agentRunId' in member
        ? member
        : { ...member, taskExecutions: member.taskExecutions.map(mapTask) }),
      taskExecutions: input.view.execution_tree.rootOrg.taskExecutions.map(mapTask),
    },
  }
  if (matches !== 1) {
    throw new Error(`AgentOrg task execution '${targetRunId}' has ${matches} settlement matches.`)
  }
  const terminalIds = new Set(terminalAgentRunIds)
  let recordMatches = 0
  const records = input.view.task_records.records.map((record) => {
    if (record.taskId !== input.task.taskId) return record
    recordMatches += 1
    return input.task
  })
  if (recordMatches !== 1) {
    throw new Error(`AgentOrg task '${input.task.taskId}' has ${recordMatches} record matches.`)
  }
  const view = agentOrgExecutionViewDtoSchema.parse({
    ...input.view,
    execution_tree: parseAgentOrgExecutionTree(nextTree),
    task_records: { ...input.view.task_records, records },
    agent_statuses: input.view.agent_statuses.filter((status) => !terminalIds.has(status.agent_run_id)),
  })
  return Object.freeze({ view, terminalAgentRunIds: Object.freeze(terminalAgentRunIds) })
}
