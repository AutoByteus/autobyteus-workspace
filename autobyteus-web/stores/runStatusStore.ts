import { defineStore } from 'pinia'
import { watch } from 'vue'
import type { RunAgentStatus, RunStatusAnswer, RunStatusRunRef, RunStatusServerMessage } from '@autobyteus/collaboration-stream-contracts'

/** A run's own state (SR-086 G-A2 … G-A4): the node's answer, the peer node when it did not answer, the run's own status. */
export type RunState = Readonly<{ answer: RunStatusAnswer; node: string | null; status: RunAgentStatus | null }>
import { RunStatusFeed } from '~/services/runStatus/runStatusFeed'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { buildAuthenticatedWebSocketUrl } from '~/utils/remoteAccess/websocketAuth'
import { getActiveRemoteAccessCredential } from '~/utils/remoteAccess/authorizedTransport'

const runKeyOf = (ref: Pick<RunStatusRunRef, 'kind' | 'runId'>): string => `${ref.kind}:${ref.runId}`

/**
 * Each run's statuses, read by run ID from the run itself (autobyteus-461 SR-082, SR-083; FU-026): a view, the list, a
 * Task card or Settings holds the runs it shows; each agent's status is its own run's answer, never its delegator's.
 * `treeRevision` changes when a held run's rows changed (`RUN_TREE_CHANGED`): an expanded run reads its view again.
 */
export const useRunStatusStore = defineStore('runStatus', {
  state: () => ({
    /** Each agent's status, by its agent run ID. */
    statuses: {} as Record<string, RunAgentStatus>,
    /** Per held run (`kind:runId`), how many times its rows changed. */
    treeRevision: {} as Record<string, number>,
    /** Per run (`kind:runId`), the agents its answers name. */
    runAgents: {} as Record<string, readonly string[]>,
    /** Per run (`kind:runId`), its own state as its node answered it: a team's or an org's status is its root's, not folded here. */
    runStates: {} as Record<string, RunState>,
    /** Peer runs whose Retry waits for their node's answer ("Checking {node}…", SR-090), by run ID. */
    checking: {} as Record<string, true>,
  }),
  getters: {
    /** An agent's own status; `null` while its run's answer has not come. */
    statusOf: (state) => (agentRunId: string): RunAgentStatus | null => state.statuses[agentRunId] ?? null,
    /** Whether the agent runs: any status but offline (not known yet counts as not running). */
    isLive: (state) => (agentRunId: string): boolean => (state.statuses[agentRunId] ?? 'offline') !== 'offline',
    treeRevisionOf: (state) => (ref: Pick<RunStatusRunRef, 'kind' | 'runId'>): number => state.treeRevision[runKeyOf(ref)] ?? 0,
    /** A peer run's Retry waits for its node's answer. */
    isChecking: (state) => (runId: string): boolean => Boolean(state.checking[runId]),
    /** A run's own state; `null` while its answer has not come. */
    runStateOf: (state) => (ref: Pick<RunStatusRunRef, 'kind' | 'runId'>): RunState | null => state.runStates[runKeyOf(ref)] ?? null,
    /** A run runs when any of its own agents does (a Team counts as one unit), by its own answers. */
    isRunLive: (state) => (ref: Pick<RunStatusRunRef, 'kind' | 'runId'>): boolean =>
      (state.runAgents[runKeyOf(ref)] ?? []).some((agentRunId) => (state.statuses[agentRunId] ?? 'offline') !== 'offline'),
  },
  actions: {
    /** Follows these runs until the returned release is called. */
    hold(refs: readonly RunStatusRunRef[]): () => void {
      return refs.length ? runStatusFeed(this.apply.bind(this)).hold(refs) : () => undefined
    },
    /** The window's session ended (its credential is gone): the connection closes until the window is bound again. */
    suspend(): void { feed?.suspend() },
    /**
     * Retry (autobyteus-278; SR-090): asks the nodes of these held peer runs again. Each is checking until its state is
     * told again (`RUN_STATE_CHANGED`, sent once its node answered, changed or not); nothing is checking when the
     * connection could not ask.
     */
    retryPeers(runIds: readonly string[]): void {
      if (!runStatusFeed(this.apply.bind(this)).retry(runIds)) return
      this.checking = { ...this.checking, ...Object.fromEntries(runIds.map((runId) => [runId, true as const])) }
    },
    settleChecking(runIds: readonly string[]): void {
      if (!runIds.some((runId) => this.checking[runId])) return
      const next = { ...this.checking }
      for (const runId of runIds) delete next[runId]
      this.checking = next
    },
    apply(message: RunStatusServerMessage): void {
      if (message.type === 'RUN_STATUS_SNAPSHOT') {
        const next = { ...this.statuses }
        const agents = { ...this.runAgents }
        const states = { ...this.runStates }
        // SR-086 G-A1: the answer replaces each answered run's statuses; an agent no run names any more shows none.
        const answered = new Set(message.payload.runs.map(runKeyOf))
        const namedElsewhere = new Set(Object.entries(agents).flatMap(([key, ids]) => answered.has(key) ? [] : ids))
        for (const key of answered) for (const agentRunId of agents[key] ?? []) if (!namedElsewhere.has(agentRunId)) delete next[agentRunId]
        for (const run of message.payload.runs) {
          for (const agent of run.agents) next[agent.agentRunId] = agent.status
          agents[runKeyOf(run)] = run.agents.map((agent) => agent.agentRunId)
          states[runKeyOf(run)] = Object.freeze({ answer: run.answer, node: run.node, status: run.status })
        }
        this.statuses = next
        this.runAgents = agents
        this.runStates = states
        this.settleChecking(message.payload.runs.map((run) => run.runId))
      } else if (message.type === 'RUN_STATE_CHANGED') {
        const { answer, node, status } = message.payload
        this.runStates = { ...this.runStates, [runKeyOf(message.payload)]: Object.freeze({ answer, node, status }) }
        this.settleChecking([message.payload.runId])
      } else if (message.type === 'RUN_STATUS_CHANGED') {
        this.statuses = { ...this.statuses, [message.payload.agentRunId]: message.payload.status }
        const key = runKeyOf(message.payload), named = this.runAgents[key] ?? []
        if (!named.includes(message.payload.agentRunId)) this.runAgents = { ...this.runAgents, [key]: [...named, message.payload.agentRunId] }
      } else {
        const key = runKeyOf(message.payload)
        this.treeRevision = { ...this.treeRevision, [key]: (this.treeRevision[key] ?? 0) + 1 }
      }
    },
  },
})

let feed: RunStatusFeed | null = null
const runStatusFeed = (deliver: (message: RunStatusServerMessage) => void): RunStatusFeed => {
  if (feed) return feed
  const node = useWindowNodeContextStore()
  const created = new RunStatusFeed({
    endpoint: () => {
      try { return buildAuthenticatedWebSocketUrl(node.getBoundEndpoints().runStatusWs, getActiveRemoteAccessCredential() ?? '') }
      catch { return null }
    },
    deliver,
  })
  watch(() => node.bindingRevision, () => created.rebind())
  feed = created
  return created
}
