import type { RemoteTaskExecutionDto } from '@autobyteus/agent-presentation-contracts'
import type { CollaborationTaskExecutionDto } from '@autobyteus/collaboration-stream-contracts'
import type { TaskExecutionDto as TeamTaskExecutionDto } from '@autobyteus/team-stream-contracts'
import type { ListedRunAnswer } from '~/services/listedRuns/listedRunChildrenQuery'
import { mergeByStartTime } from '~/services/remoteRuns/remoteChildren'

/**
 * One run a run delegated to, as every row builder takes it (autobyteus-461 CR-461-025; SR-056's identity): its run,
 * the address it was delegated to, a team's members and coordinator, its delegator, when it started, and the peer node
 * it runs on (`null`: this node). The open view and the history poll's answer both give it, so a delegator's child
 * rows are built once per view kind, from the same facts, whether the run is open or only listed.
 */
export type DelegatedChildRun = Readonly<{
  kind: 'agent' | 'agent_team'
  /** The agent run, or the team run. */
  runId: string
  address: string
  /** A team run's members (none for an agent run). */
  members: readonly Readonly<{ address: string; agentRunId: string }>[]
  /** The member a team row opens; `null` for an agent run. */
  coordinatorAgentRunId: string | null
  delegatorAgentRunId: string | null
  startedAt: string
  node: Readonly<{ nodeId: string; nodeName: string }> | null
}>

/** A team run's coordinator among its members: the one at its coordinator address, else its first member. */
const coordinatorOf = (members: DelegatedChildRun['members'], coordinatorAddress: string | null | undefined): string | null =>
  (members.find((member) => member.address === coordinatorAddress) ?? members[0])?.agentRunId ?? null

/** A child row of an agent run's or an Org run's view (one hop: a child team's own children are its own view's). */
export const childOfCollaborationTask = (task: CollaborationTaskExecutionDto): DelegatedChildRun => {
  const common = { address: task.address, delegatorAgentRunId: task.delegatorAgentRunId ?? null, startedAt: task.startedAt, node: null }
  if ('agentRunId' in task) return Object.freeze({ kind: 'agent', runId: task.agentRunId, members: [], coordinatorAgentRunId: null, ...common })
  const members = task.members.map((member) => Object.freeze({ address: member.address, agentRunId: member.agentRunId }))
  return Object.freeze({ kind: 'agent_team', runId: task.teamRunId, members, coordinatorAgentRunId: coordinatorOf(members, task.source.coordinatorAddress), ...common })
}

/** A child row of a team run's view. */
export const childOfTeamTask = (task: TeamTaskExecutionDto): DelegatedChildRun => {
  const common = { address: task.address, delegatorAgentRunId: task.delegator_agent_run_id ?? null, startedAt: task.started_at, node: null }
  if (task.kind === 'task_agent') return Object.freeze({ kind: 'agent', runId: task.agent_run_id, members: [], coordinatorAgentRunId: null, ...common })
  const members = task.members.map((member) => Object.freeze({ address: member.address, agentRunId: member.agent_run_id }))
  return Object.freeze({ kind: 'agent_team', runId: task.team_run_id, members, coordinatorAgentRunId: coordinatorOf(members, task.source.coordinator_address), ...common })
}

/** A run a view's run delegated to a peer node (autobyteus-278). */
export const childOfRemoteExecution = (execution: RemoteTaskExecutionDto): DelegatedChildRun => {
  const common = { address: execution.address, delegatorAgentRunId: execution.delegator_agent_run_id ?? null, startedAt: execution.started_at,
    node: Object.freeze({ nodeId: execution.node_id, nodeName: execution.node_name }) }
  if (execution.kind === 'agent') return Object.freeze({ kind: 'agent', runId: execution.agent_run_id, members: [], coordinatorAgentRunId: null, ...common })
  const members = execution.members.map((member) => Object.freeze({ address: member.address, agentRunId: member.agent_run_id }))
  return Object.freeze({ kind: 'agent_team', runId: execution.team_run_id, members, coordinatorAgentRunId: coordinatorOf(members, execution.coordinator_address), ...common })
}

/** A child of a listed run that is not open, from the history poll's answer (SR-055, SR-057). */
export const childOfListedRun = (child: ListedRunAnswer['children'][number]): DelegatedChildRun => {
  const row = child.row
  const common = { address: row.address, delegatorAgentRunId: row.delegatorAgentRunId ?? null, startedAt: row.startedAt, node: child.node }
  if (row.kind === 'agent') return Object.freeze({ kind: 'agent', runId: row.agentRunId, members: [], coordinatorAgentRunId: null, ...common })
  return Object.freeze({ kind: 'agent_team', runId: row.teamRunId, coordinatorAgentRunId: row.coordinatorAgentRunId,
    members: row.members.map((member) => Object.freeze({ address: member.address, agentRunId: member.agentRunId })), ...common })
}

/**
 * The children a delegator's rows show, in the order they were delegated: its children on this node in their order,
 * with its children on peer nodes merged in by start time (autobyteus-278's one list).
 */
export const inDelegationOrder = (children: readonly DelegatedChildRun[]): DelegatedChildRun[] => mergeByStartTime(
  children.filter((child) => !child.node).map((child) => ({ startedAt: child.startedAt, value: child })),
  children.filter((child) => child.node).map((child) => ({ startedAt: child.startedAt, value: child })),
)

/**
 * A listed run's children and what its rows need beside them, from its answer: each agent's status (a child on a peer
 * node has none: nothing is asked of a peer per poll), and each delegator's address.
 */
export const listedRunChildren = (answer: ListedRunAnswer) => {
  const statuses = new Map(answer.children.flatMap((child) => child.statuses.map((status) => [status.agentRunId, status.status] as const)))
  const delegators = new Map(answer.children.flatMap((child) => child.row.delegatorAgentRunId && child.delegatorAddress
    ? [[child.row.delegatorAgentRunId, child.delegatorAddress] as const] : []))
  return Object.freeze({
    children: inDelegationOrder(answer.children.map(childOfListedRun)),
    statusOf: (agentRunId: string): string | undefined => statuses.get(agentRunId),
    delegatorAddressOf: (agentRunId: string): string | null => delegators.get(agentRunId) ?? null,
  })
}
