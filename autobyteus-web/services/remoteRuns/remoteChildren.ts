import {
  remoteTaskExecutionRunIdOf,
  type RemoteTaskExecutionDto,
  type RemoteTaskExecutionSummaryDto,
} from '@autobyteus/agent-presentation-contracts'
import { AgentStatus } from '~/types/agent/AgentStatus'
import type { RunHistoryTransientExecutionRow } from '~/stores/runHistoryTypes'
import { useRemoteRunsStore } from '~/stores/remoteRunsStore'
import { resolveTeamStatus, type TeamStatus } from '~/utils/workspaceTeamAggregateStatus'

/** One row of a root's task rows, with a Team row's status (the shape every family's task rows share). */
export type RemoteTaskRow = { row: RunHistoryTransientExecutionRow; teamStatus: TeamStatus | null }

/** A remote execution the view already lists (a started event for it changes nothing). */
export const isRemoteExecutionKnown = (executions: readonly RemoteTaskExecutionDto[], execution: RemoteTaskExecutionDto): boolean =>
  executions.some((known) => remoteTaskExecutionRunIdOf(known) === remoteTaskExecutionRunIdOf(execution))

/**
 * A peer run's summary from its node (autobyteus-278): its title, reachability and launches only. Its agents' statuses
 * are its own, read by its run ID on `/ws/run-status` (autobyteus-461 SR-083, CR-461-085): one source writes them.
 */
export const applyRemoteSummary = (summary: RemoteTaskExecutionSummaryDto): void => { useRemoteRunsStore().applySummary(summary) }

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
  // Where it opens, as the server sent it (SR-083); its members open its run on themselves.
  const target = execution.open_target
  const openTarget = target ? Object.freeze({ runKind: target.run_kind, runId: target.run_id, agentRunId: target.agent_run_id, nodeId: target.node_id }) : target ?? null
  const memberTarget = (agentRunId: string) => Object.freeze({ runKind: 'agent_team' as const, runId: remote.runId, agentRunId, nodeId: execution.node_id })
  const common = { kind: 'transient_execution' as const, teamRunId: input.rootRunId, delegatedBy: input.delegatorName(execution.delegator_agent_run_id) }
  if (execution.kind === 'agent') {
    return { startedAt: execution.started_at, rows: [{ teamStatus: null, row: {
      ...common, transientKind: 'task_agent', rowKey: `agent:${execution.agent_run_id}`, memberAddress: execution.address,
      agentRunId: execution.agent_run_id, teamRunIdForNode: null, memberKind: 'agent', displayName: input.nameAt(execution.address),
      currentStatus: input.statusOf(execution.agent_run_id), depth: 0, hasChildren: false, remote, openTarget,
    } }] }
  }
  const statuses = execution.members.map((member) => input.statusOf(member.agent_run_id))
  const team: RemoteTaskRow = { teamStatus: resolveTeamStatus(statuses, input.isActive), row: {
    ...common, transientKind: 'task_team', rowKey: `team:${execution.team_run_id}`, memberAddress: execution.address,
    agentRunId: null, teamRunIdForNode: execution.team_run_id, memberKind: 'agent_team', displayName: input.nameAt(execution.address),
    currentStatus: null, depth: 0, hasChildren: execution.members.length > 0, remote, openTarget,
  } }
  const members: RemoteTaskRow[] = input.isTeamExpanded(execution.team_run_id) ? execution.members.map((member) => ({ teamStatus: null, row: {
    kind: 'transient_execution', transientKind: 'task_team_child', rowKey: `agent:${member.agent_run_id}`, teamRunId: input.rootRunId,
    memberAddress: member.address, agentRunId: member.agent_run_id, teamRunIdForNode: null, memberKind: 'agent',
    displayName: input.nameAt(member.address), currentStatus: input.statusOf(member.agent_run_id), delegatedBy: null, depth: 1,
    hasChildren: false, remote, openTarget: memberTarget(member.agent_run_id),
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
