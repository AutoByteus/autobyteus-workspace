import { defineStore } from 'pinia'
import { shallowReactive, watch } from 'vue'
import {
  remoteTaskExecutionAgentsOf,
  remoteTaskExecutionRunIdOf,
  type RemoteTaskExecutionDto,
  type RemoteTaskExecutionSummaryDto,
} from '@autobyteus/agent-presentation-contracts'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'

/**
 * What the window knows about one run another node runs for this node's delegation (autobyteus-278): the
 * node's name, the run's agents, whether the node answered and the run's title. `reachable` is `null` until the
 * node first answers; `checking` while Retry waits for it.
 */
export type RemoteRunInfo = Readonly<{
  runId: string
  kind: 'agent' | 'agent_team'
  nodeId: string
  nodeName: string
  agentRunIds: readonly string[]
  reachable: boolean | null
  checking: boolean
  title: string | null
}>

/**
 * The remote runs of every root view in this window, by run and by agent run (run IDs are unique). Each root's
 * context registers its remote executions from its view and applies its nodes' answers; the row, the run view,
 * the composer and the right panel read them here. Retry asks the root that owns the run, through the callback
 * the root registered.
 */
export const useRemoteRunsStore = defineStore('remoteRuns', () => {
  const runs = shallowReactive(new Map<string, RemoteRunInfo>())
  const runOfAgent = shallowReactive(new Map<string, string>())
  const retries = new Map<string, () => void>()

  /** A root's remote execution, with the way to ask its node again; an answer it already had stays. */
  const register = (execution: RemoteTaskExecutionDto, retry: () => void): void => {
    const runId = remoteTaskExecutionRunIdOf(execution)
    const previous = runs.get(runId)
    const agentRunIds = remoteTaskExecutionAgentsOf(execution).map((agent) => agent.agent_run_id)
    runs.set(runId, Object.freeze({
      runId, kind: execution.kind, nodeId: execution.node_id, nodeName: execution.node_name, agentRunIds: Object.freeze(agentRunIds),
      reachable: previous?.reachable ?? null, checking: previous?.checking ?? false, title: previous?.title ?? null,
    }))
    agentRunIds.forEach((agentRunId) => runOfAgent.set(agentRunId, runId))
    retries.set(runId, retry)
  }

  const update = (runId: string, change: Partial<Pick<RemoteRunInfo, 'reachable' | 'checking' | 'title'>>): void => {
    const current = runs.get(runId)
    if (current) runs.set(runId, Object.freeze({ ...current, ...change }))
  }

  /** The node's answer about the run: it answered (with its title) or it did not. */
  const applySummary = (summary: RemoteTaskExecutionSummaryDto): void =>
    update(summary.run_id, { reachable: summary.reachable, checking: false, title: summary.reachable ? summary.title : runs.get(summary.run_id)?.title ?? null })

  /** A read of the run's conversation reached its node, or did not (the opened view's notice). */
  const markReachable = (runId: string, reachable: boolean): void => update(runId, { reachable })

  /** Retry: "Checking {node}…" until the node answers; the root that owns the run asks again. */
  const retry = (runId: string): void => {
    update(runId, { checking: true })
    retries.get(runId)?.()
  }

  const run = (runId: string | null | undefined): RemoteRunInfo | null => runId ? runs.get(runId) ?? null : null
  const runOfAgentRun = (agentRunId: string | null | undefined): RemoteRunInfo | null =>
    agentRunId ? run(runOfAgent.get(agentRunId)) : null

  const clear = (): void => {
    runs.clear()
    runOfAgent.clear()
    retries.clear()
  }
  watch(() => useWindowNodeContextStore().bindingRevision, clear, { flush: 'sync' })

  return { register, applySummary, markReachable, retry, run, runOfAgentRun, clear }
})
