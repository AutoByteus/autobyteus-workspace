import type { RemoteTaskExecutionDto } from '@autobyteus/agent-presentation-contracts'
import {
  teamRunExecutionTreeDtoSchema,
  type TaskExecutionDto,
  type TeamChildRunsChangedPayload,
  type TeamRunExecutionTreeDto,
  type TeamTaskExecutionReferenceDto,
} from '@autobyteus/team-stream-contracts'
import { insertTaskExecution } from './teamExecutionTreeMutations'

/** The Team view after a child-row change: its tree and peer rows, and the agents that left with their delegators. */
export type TeamChildRunsChangeResult = Readonly<{
  changed: boolean
  tree: TeamRunExecutionTreeDto
  remote: readonly RemoteTaskExecutionDto[]
  /** Each agent run that left the view, with the agent that delegated the row it left with (focus goes back there). */
  removedAgents: ReadonlyMap<string, string | null>
}>

type MutableTeam = { team_run_id: string; members: Array<{ agent_run_id: string }>; task_executions: TaskExecutionDto[] }

const runIdOf = (reference: TeamTaskExecutionReferenceDto): string => 'agent_run_id' in reference ? reference.agent_run_id : reference.team_run_id
const taskRunIdOf = (task: TaskExecutionDto): string => task.kind === 'task_agent' ? task.agent_run_id : task.team_run_id
const remoteRunIdOf = (remote: RemoteTaskExecutionDto): string => remote.kind === 'agent' ? remote.agent_run_id : remote.team_run_id
const agentsOf = (task: TaskExecutionDto): string[] => task.kind === 'task_agent' ? [task.agent_run_id]
  : [...task.members.map((member) => member.agent_run_id), ...task.task_executions.flatMap(agentsOf)]

/** Every run ID the tree holds: Teams, members and child rows at any depth. */
const heldRunIds = (team: MutableTeam, ids = new Set<string>()): Set<string> => {
  ids.add(team.team_run_id)
  team.members.forEach((member) => ids.add(member.agent_run_id))
  for (const task of team.task_executions) {
    ids.add(taskRunIdOf(task))
    if (task.kind === 'task_team') heldRunIds(task as unknown as MutableTeam, ids)
    else ids.add(task.agent_run_id)
  }
  return ids
}

/** Removes the child row with this run ID wherever it is listed; the row removed, or null when the view does not hold it. */
const removeRow = (team: MutableTeam, runId: string): TaskExecutionDto | null => {
  const index = team.task_executions.findIndex((task) => taskRunIdOf(task) === runId)
  if (index >= 0) return team.task_executions.splice(index, 1)[0]!
  for (const task of team.task_executions) {
    const removed = task.kind === 'task_team' ? removeRow(task as unknown as MutableTeam, runId) : null
    if (removed) return removed
  }
  return null
}

/**
 * Applies a Team run's child-row change in place (autobyteus-461 SR-043, SR-044): by membership, so it can be repeated
 * and can follow a snapshot that already has it. Removals first: a removed row the view does not hold is ignored. Then
 * additions: a row the view already holds is skipped. A row both removed and added (it left and came back) ends listed.
 */
export const applyTeamChildRunsChange = (
  tree: TeamRunExecutionTreeDto,
  remote: readonly RemoteTaskExecutionDto[],
  payload: TeamChildRunsChangedPayload,
): TeamChildRunsChangeResult => {
  let nextTree = structuredClone(tree) as TeamRunExecutionTreeDto
  let nextRemote = [...remote]
  const removedAgents = new Map<string, string | null>()
  let changed = false
  for (const reference of payload.removed) {
    const runId = runIdOf(reference)
    const row = removeRow(nextTree.root_team as unknown as MutableTeam, runId)
    if (row) {
      changed = true
      agentsOf(row).forEach((agentRunId) => removedAgents.set(agentRunId, row.delegator_agent_run_id ?? null))
      continue
    }
    const peer = nextRemote.find((entry) => remoteRunIdOf(entry) === runId)
    if (!peer) continue
    changed = true
    nextRemote = nextRemote.filter((entry) => entry !== peer)
    const agents = peer.kind === 'agent' ? [peer.agent_run_id] : peer.members.map((member) => member.agent_run_id)
    agents.forEach((agentRunId) => removedAgents.set(agentRunId, peer.delegator_agent_run_id))
  }
  if (changed) nextTree = teamRunExecutionTreeDtoSchema.parse(nextTree) as TeamRunExecutionTreeDto
  for (const row of payload.added) {
    if ('node_id' in row) {
      if (nextRemote.some((entry) => remoteRunIdOf(entry) === remoteRunIdOf(row))) continue
      nextRemote = [...nextRemote, structuredClone(row)]
      agentsOfRemote(row).forEach((agentRunId) => removedAgents.delete(agentRunId))
    } else {
      if (heldRunIds(nextTree.root_team as unknown as MutableTeam).has(taskRunIdOf(row.execution))) continue
      nextTree = insertTaskExecution({ tree: nextTree, parentTeamRunId: row.parent_team_run_id, execution: row.execution })
      agentsOf(row.execution).forEach((agentRunId) => removedAgents.delete(agentRunId))
    }
    changed = true
  }
  return Object.freeze({ changed, tree: changed ? nextTree : tree, remote: changed ? nextRemote : remote, removedAgents })
}

const agentsOfRemote = (remote: RemoteTaskExecutionDto): string[] =>
  remote.kind === 'agent' ? [remote.agent_run_id] : remote.members.map((member) => member.agent_run_id)
