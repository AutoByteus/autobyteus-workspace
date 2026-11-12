import {
  remoteTaskExecutionAgentsOf,
  remoteTaskExecutionRunIdOf,
  type RemoteTaskExecutionDto,
  type RemoteTaskExecutionSummaryDto,
} from '@autobyteus/agent-presentation-contracts'
import type { AgentContext } from '~/types/agent/AgentContext'
import { AgentStatus } from '~/types/agent/AgentStatus'
import type { RunHistoryTransientExecutionRow } from '~/stores/runHistoryTypes'
import { normalizeAgentRuntimeStatus } from '~/services/runHydration/runtimeStatusNormalization'
import { useRemoteRunsStore } from '~/stores/remoteRunsStore'
import { resolveTeamStatus, type TeamStatus } from '~/utils/workspaceTeamAggregateStatus'

/** One row of a root's task rows, with a Team row's status (the shape every family's task rows share). */
export type RemoteTaskRow = { row: RunHistoryTransientExecutionRow; teamStatus: TeamStatus | null }

/** A remote execution the view already lists (a started event for it changes nothing). */
export const isRemoteExecutionKnown = (executions: readonly RemoteTaskExecutionDto[], execution: RemoteTaskExecutionDto): boolean =>
  executions.some((known) => remoteTaskExecutionRunIdOf(known) === remoteTaskExecutionRunIdOf(execution))

/**
 * A node's answer about a remote run (autobyteus-278): its agents' statuses (an agent the node does not list is
 * offline; a node that did not answer leaves every agent offline) and its title and reachability for the window.
 */
export const applyRemoteSummaryStatuses = (
  summary: RemoteTaskExecutionSummaryDto,
  contextOf: (agentRunId: string) => AgentContext | null,
  executions: readonly RemoteTaskExecutionDto[],
): void => {
  const execution = executions.find((known) => remoteTaskExecutionRunIdOf(known) === summary.run_id)
  if (!execution) return
  const statuses = new Map(summary.statuses.map((status) => [status.agent_run_id, status.status]))
  for (const agent of remoteTaskExecutionAgentsOf(execution)) {
    const context = contextOf(agent.agent_run_id)
    if (context) context.state.currentStatus = normalizeAgentRuntimeStatus(statuses.get(agent.agent_run_id) ?? null, AgentStatus.Offline)
  }
  useRemoteRunsStore().applySummary(summary)
}

/**
 * A root's remote runs as rows (autobyteus-278): like a local copy's rows, plus the node (UI spec UIS-001). A remote
 * Agent is one row; a remote Team is a Team row with its members below it while expanded. Each run comes with
 * its start time, so the caller merges it among the local copies in the order they were delegated.
 */
export const remoteRowsOf = (input: Readonly<{
  executions: readonly RemoteTaskExecutionDto[]
  /** The root run whose rows these are (the rows' `teamRunId`). */
  rootRunId: string
  isActive: boolean
  statusOf(agentRunId: string): AgentStatus
  delegatorName(agentRunId: string | null): string | null
  isTeamExpanded(teamRunId: string): boolean
  nameAt(address: string): string
}>): readonly Readonly<{ startedAt: string; rows: RemoteTaskRow[] }>[] => input.executions.map((execution) => {
  const remote = Object.freeze({ runId: remoteTaskExecutionRunIdOf(execution), nodeName: execution.node_name })
  const common = { kind: 'transient_execution' as const, teamRunId: input.rootRunId, delegatedBy: input.delegatorName(execution.delegator_agent_run_id) }
  if (execution.kind === 'agent') {
    return { startedAt: execution.started_at, rows: [{ teamStatus: null, row: {
      ...common, transientKind: 'task_agent', rowKey: `agent:${execution.agent_run_id}`, memberAddress: execution.address,
      agentRunId: execution.agent_run_id, teamRunIdForNode: null, memberKind: 'agent', displayName: input.nameAt(execution.address),
      currentStatus: input.statusOf(execution.agent_run_id), depth: 0, hasChildren: false, remote,
    } }] }
  }
  const statuses = execution.members.map((member) => input.statusOf(member.agent_run_id))
  const team: RemoteTaskRow = { teamStatus: resolveTeamStatus(statuses, input.isActive), row: {
    ...common, transientKind: 'task_team', rowKey: `team:${execution.team_run_id}`, memberAddress: execution.address,
    agentRunId: null, teamRunIdForNode: execution.team_run_id, memberKind: 'agent_team', displayName: input.nameAt(execution.address),
    currentStatus: null, depth: 0, hasChildren: execution.members.length > 0, remote,
  } }
  const members: RemoteTaskRow[] = input.isTeamExpanded(execution.team_run_id) ? execution.members.map((member) => ({ teamStatus: null, row: {
    kind: 'transient_execution', transientKind: 'task_team_child', rowKey: `agent:${member.agent_run_id}`, teamRunId: input.rootRunId,
    memberAddress: member.address, agentRunId: member.agent_run_id, teamRunIdForNode: null, memberKind: 'agent',
    displayName: input.nameAt(member.address), currentStatus: input.statusOf(member.agent_run_id), delegatedBy: null, depth: 1,
    hasChildren: false, remote,
  } })) : []
  return { startedAt: execution.started_at, rows: [team, ...members] }
})

/** Local root rows (in their order) with the remote runs merged in by start time. */
export const mergeByStartTime = <T>(local: readonly Readonly<{ startedAt: string; value: T }>[],
  remote: readonly Readonly<{ startedAt: string; value: T }>[]): T[] => {
  const pending = [...remote].sort((left, right) => left.startedAt.localeCompare(right.startedAt))
  const merged: T[] = []
  for (const entry of local) {
    while (pending.length && pending[0]!.startedAt < entry.startedAt) merged.push(pending.shift()!.value)
    merged.push(entry.value)
  }
  return [...merged, ...pending.map((entry) => entry.value)]
}
