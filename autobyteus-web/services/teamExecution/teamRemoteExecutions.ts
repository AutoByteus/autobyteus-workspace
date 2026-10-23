import {
  remoteTaskExecutionAgentsOf,
  remoteTaskExecutionRunIdOf,
  type RemoteTaskExecutionDto,
} from '@autobyteus/agent-presentation-contracts'
import type { AgentContext } from '~/types/agent/AgentContext'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { memberAddressBasename, parseAgentTeamAddress, type AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import { memberDisplayName } from '~/utils/collaboration/memberDisplayName'
import type { TeamRunExecutionTreeDto } from '@autobyteus/team-stream-contracts'
import { createRemoteAgentContext } from '~/services/remoteRuns/remoteAgentContext'
import { mergeByStartTime } from '~/services/remoteRuns/remoteChildren'
import { agentRowKey, teamRowKey } from './teamExecutionTreeSelectors'
import type { TeamAgentExecutionLocation, TeamExecutionNavigationRow } from './teamExecutionViewModels'

/**
 * The runs a Team root delegated to other nodes (autobyteus-278), in the Team view's terms: their agents have
 * placements beside the tree's (a remote Agent in the root Team, a remote Team's members in that Team run), Offline
 * contexts the view holds, and navigation rows at the root level like the root's own task copies.
 */
export const remoteAgentLocations = (rootTeamRunId: string, executions: readonly RemoteTaskExecutionDto[]): TeamAgentExecutionLocation[] =>
  executions.flatMap((execution) => remoteTaskExecutionAgentsOf(execution).map((agent) => ({
    agentRunId: agent.agent_run_id,
    memberAddress: parseAgentTeamAddress(agent.address),
    containingTeamRunId: execution.kind === 'agent' ? rootTeamRunId : execution.team_run_id,
  })))

/** The context of a remote agent of these executions; `null` for an agent of the tree. */
export const createRemoteTeamAgentContext = (
  executions: readonly RemoteTaskExecutionDto[],
  agentRunId: string,
  address: AgentTeamAddress,
): AgentContext | null => {
  const execution = executions.find((candidate) => remoteTaskExecutionAgentsOf(candidate).some((agent) => agent.agent_run_id === agentRunId))
  return execution ? createRemoteAgentContext(agentRunId, address, execution.started_at) : null
}

export const isRemoteAgentRun = (executions: readonly RemoteTaskExecutionDto[], agentRunId: string): boolean =>
  executions.some((execution) => remoteTaskExecutionAgentsOf(execution).some((agent) => agent.agent_run_id === agentRunId))

export const isKnownRemoteExecution = (executions: readonly RemoteTaskExecutionDto[], execution: RemoteTaskExecutionDto): boolean =>
  executions.some((known) => remoteTaskExecutionRunIdOf(known) === remoteTaskExecutionRunIdOf(execution))

/**
 * The Team's navigation rows with its remote runs placed among its root-level delegated copies in the order they were
 * delegated (`started_at`, UI spec: one list); the Team's own members, with the copies under them, keep their place
 * first. A remote Team has its members below it, as a copy's members are.
 */
export const teamNavigationRowsWithRemote = (input: Readonly<{
  tree: TeamRunExecutionTreeDto
  treeRows: readonly TeamExecutionNavigationRow[]
  executions: readonly RemoteTaskExecutionDto[]
  contexts: ReadonlyMap<string, AgentContext>
  addressOf(agentRunId: string): AgentTeamAddress | null
}>): TeamExecutionNavigationRow[] => {
  const root = input.tree.root_team
  const rootKey = teamRowKey(root.team_run_id)
  const copyStartedAt = new Map(root.task_executions.map((task) =>
    [task.kind === 'task_agent' ? agentRowKey(task.agent_run_id) : teamRowKey(task.team_run_id), task.started_at]))
  const leading: TeamExecutionNavigationRow[] = []
  const copies: { startedAt: string; value: TeamExecutionNavigationRow[] }[] = []
  for (const row of input.treeRows) {
    const startedAt = row.parentKey === rootKey ? copyStartedAt.get(row.key) : undefined
    if (startedAt !== undefined) copies.push({ startedAt, value: [row] })
    else if (copies.length && row.depth > 1) copies.at(-1)!.value.push(row)
    else leading.push(row)
  }
  const remote = input.executions.map((execution) => ({ startedAt: execution.started_at, value: remoteRunRows(rootKey, execution, input) }))
  return [...leading, ...mergeByStartTime(copies, remote).flat()]
}

/** One remote run's rows at the Team root's level: an Agent, or a Team with its members below it. */
const remoteRunRows = (
  rootKey: string,
  execution: RemoteTaskExecutionDto,
  input: Readonly<{ contexts: ReadonlyMap<string, AgentContext>; addressOf(agentRunId: string): AgentTeamAddress | null }>,
): TeamExecutionNavigationRow[] => {
  const status = (agentRunId: string) => input.contexts.get(agentRunId)?.state.currentStatus ?? AgentStatus.Offline
  const delegatedBy = (agentRunId: string) => {
    const address = input.addressOf(agentRunId)
    return address ? memberAddressBasename(address) : agentRunId
  }
  const agentRow = (agentRunId: string, address: string, depth: number, parentKey: string, extra: Partial<TeamExecutionNavigationRow>) => {
    const label = memberDisplayName(address)
    return Object.freeze({
      key: agentRowKey(agentRunId), kind: 'task_agent' as const, address: parseAgentTeamAddress(address), displayName: label, accessibleName: label,
      depth, parentKey, agentRunId, teamRunId: null, delegatedBy: null, currentStatus: status(agentRunId),
      focusable: true, expandable: false, coordinator: false, ...extra,
    })
  }
  if (execution.kind === 'agent') {
    return [agentRow(execution.agent_run_id, execution.address, 1, rootKey, { delegatedBy: delegatedBy(execution.delegator_agent_run_id) })]
  }
  const key = teamRowKey(execution.team_run_id)
  const label = memberDisplayName(execution.address)
  return [Object.freeze({
    key, kind: 'task_team' as const, address: parseAgentTeamAddress(execution.address), displayName: label, accessibleName: label,
    depth: 1, parentKey: rootKey, agentRunId: null, teamRunId: execution.team_run_id,
    delegatedBy: delegatedBy(execution.delegator_agent_run_id), currentStatus: null, focusable: false,
    expandable: execution.members.length > 0, coordinator: false,
  }), ...execution.members.map((member) => agentRow(member.agent_run_id, member.address, 2, key, {
    kind: 'task_team_agent', coordinator: member.address === execution.coordinator_address,
  }))]
}
