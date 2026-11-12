import {
  remoteTaskExecutionAgentsOf,
  remoteTaskExecutionRunIdOf,
  type RemoteTaskExecutionDto,
  type RemoteTaskExecutionSummaryDto,
} from '@autobyteus/agent-presentation-contracts'
import type { AgentContext } from '~/types/agent/AgentContext'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { normalizeAgentRuntimeStatus } from '~/services/runHydration/runtimeStatusNormalization'
import { useRemoteRunsStore } from '~/stores/remoteRunsStore'

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
