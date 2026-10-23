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
 * What the root that owns a remote run supplies for Retry (SR-007/SR-008): only its own mechanisms; the rule is
 * `retry` below, written once for every family.
 */
export type RemoteRunRetryAdapter = Readonly<{
  /** Asks the root's stream to fetch the summaries again (`REFRESH_REMOTE_TASK_EXECUTIONS`); `false` when not ready. */
  refreshOnStream(): boolean
  /** The agent run the family's view has selected. */
  selectedAgent(): string | null
  /** Whether this agent's conversation is loaded in the family's view. */
  isLoaded(agentRunId: string): boolean
  /** Starts reading the agent's conversation from its node; `false` when nothing starts (an already-loaded agent too). */
  rereadAgent(agentRunId: string): boolean
}>

/**
 * The remote runs of every root view in this window, by run and by agent run (run IDs are unique). Each root's
 * context registers its remote executions from its view and applies its nodes' answers; the row, the run view,
 * the composer and the right panel read them here. Retry is decided here and acts through the adapter the root
 * that owns the run registered.
 */
export const useRemoteRunsStore = defineStore('remoteRuns', () => {
  const runs = shallowReactive(new Map<string, RemoteRunInfo>())
  const runOfAgent = shallowReactive(new Map<string, string>())
  const adapters = new Map<string, RemoteRunRetryAdapter>()

  /** A root's remote execution, with the way to ask its node again; an answer it already had stays. */
  const register = (execution: RemoteTaskExecutionDto, adapter: RemoteRunRetryAdapter): void => {
    const runId = remoteTaskExecutionRunIdOf(execution)
    const previous = runs.get(runId)
    const agentRunIds = remoteTaskExecutionAgentsOf(execution).map((agent) => agent.agent_run_id)
    runs.set(runId, Object.freeze({
      runId, kind: execution.kind, nodeId: execution.node_id, nodeName: execution.node_name, agentRunIds: Object.freeze(agentRunIds),
      reachable: previous?.reachable ?? null, checking: previous?.checking ?? false, title: previous?.title ?? null,
    }))
    agentRunIds.forEach((agentRunId) => runOfAgent.set(agentRunId, runId))
    adapters.set(runId, adapter)
  }

  const update = (runId: string, change: Partial<Pick<RemoteRunInfo, 'reachable' | 'checking' | 'title'>>): void => {
    const current = runs.get(runId)
    if (current) runs.set(runId, Object.freeze({ ...current, ...change }))
  }

  /** The node's answer about the run: it answered (with its title) or it did not. */
  const applySummary = (summary: RemoteTaskExecutionSummaryDto): void =>
    update(summary.run_id, { reachable: summary.reachable, checking: false, title: summary.reachable ? summary.title : runs.get(summary.run_id)?.title ?? null })

  /** A read of the run's conversation reached its node, or did not (the opened view's notice); it answers a Retry. */
  const markReachable = (runId: string, reachable: boolean): void => update(runId, { reachable, checking: false })

  /**
   * Retry (SR-008, the one rule): "Checking {node}…" while the node is asked. The root's stream fetches the summaries
   * again; the selected agent of the run, or else the run's first agent that is not loaded, is read again. When
   * neither asks anything, it settles at once; otherwise the answers (`applySummary`, `markReachable`) settle it.
   */
  const retry = (runId: string): void => {
    const current = runs.get(runId)
    const adapter = adapters.get(runId)
    if (!current || !adapter) return
    update(runId, { checking: true })
    const refreshed = adapter.refreshOnStream()
    const selected = adapter.selectedAgent()
    const target = selected && current.agentRunIds.includes(selected)
      ? selected
      : current.agentRunIds.find((agentRunId) => !adapter.isLoaded(agentRunId)) ?? null
    const started = target ? adapter.rereadAgent(target) : false
    if (!refreshed && !started) update(runId, { checking: false })
  }

  const run = (runId: string | null | undefined): RemoteRunInfo | null => runId ? runs.get(runId) ?? null : null
  const runOfAgentRun = (agentRunId: string | null | undefined): RemoteRunInfo | null =>
    agentRunId ? run(runOfAgent.get(agentRunId)) : null

  const clear = (): void => {
    runs.clear()
    runOfAgent.clear()
    adapters.clear()
  }
  watch(() => useWindowNodeContextStore().bindingRevision, clear, { flush: 'sync' })

  return { register, applySummary, markReachable, retry, run, runOfAgentRun, clear }
})
