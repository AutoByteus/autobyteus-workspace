import type { RunStatusRunRef } from '@autobyteus/collaboration-stream-contracts'
import type { CollaborationTaskExecutionDto } from '@autobyteus/collaboration-stream-contracts'
import type { TaskExecutionDto as TeamTaskExecutionDto } from '@autobyteus/team-stream-contracts'
import type { RemoteTaskExecutionDto } from '@autobyteus/agent-presentation-contracts'

/** The runs a view's rows show (delegated runs on this node and peer runs, at every depth) and their agents (SR-083). */
export type ViewRuns = Readonly<{ refs: RunStatusRunRef[]; agentRunIds: string[] }>

const withRemote = (runs: ViewRuns, remote: readonly RemoteTaskExecutionDto[]): ViewRuns => {
  for (const execution of remote) {
    if (execution.kind === 'agent') { runs.refs.push({ kind: 'agent', runId: execution.agent_run_id }); runs.agentRunIds.push(execution.agent_run_id) }
    else { runs.refs.push({ kind: 'agent_team', runId: execution.team_run_id }); runs.agentRunIds.push(...execution.members.map((member) => member.agent_run_id)) }
  }
  return runs
}

/** An Agent or Org view's rows (camel case), with its peer rows. */
export const collaborationViewRuns = (tasks: readonly CollaborationTaskExecutionDto[], remote: readonly RemoteTaskExecutionDto[] = []): ViewRuns => {
  const runs: ViewRuns = { refs: [], agentRunIds: [] }
  const visit = (list: readonly CollaborationTaskExecutionDto[]): void => {
    for (const task of list) {
      if ('agentRunId' in task) { runs.refs.push({ kind: 'agent', runId: task.agentRunId }); runs.agentRunIds.push(task.agentRunId); continue }
      runs.refs.push({ kind: 'agent_team', runId: task.teamRunId })
      runs.agentRunIds.push(...task.members.map((member) => member.agentRunId))
      visit(task.taskExecutions)
    }
  }
  visit(tasks)
  return withRemote(runs, remote)
}

/** A Team view's rows (snake case), with its peer rows. */
export const teamViewRuns = (tasks: readonly TeamTaskExecutionDto[], remote: readonly RemoteTaskExecutionDto[] = []): ViewRuns => {
  const runs: ViewRuns = { refs: [], agentRunIds: [] }
  const visit = (list: readonly TeamTaskExecutionDto[]): void => {
    for (const task of list) {
      if (task.kind === 'task_agent') { runs.refs.push({ kind: 'agent', runId: task.agent_run_id }); runs.agentRunIds.push(task.agent_run_id); continue }
      runs.refs.push({ kind: 'agent_team', runId: task.team_run_id })
      runs.agentRunIds.push(...task.members.map((member) => member.agent_run_id))
      visit(task.task_executions)
    }
  }
  visit(tasks)
  return withRemote(runs, remote)
}
