import { defineStore } from 'pinia'
import { watch } from 'vue'
import type { RunAgentStatus, RunStatusRunRef, RunStatusServerMessage } from '@autobyteus/collaboration-stream-contracts'
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
  }),
  getters: {
    /** An agent's own status; `null` while its run's answer has not come. */
    statusOf: (state) => (agentRunId: string): RunAgentStatus | null => state.statuses[agentRunId] ?? null,
    /** Whether the agent runs: any status but offline (not known yet counts as not running). */
    isLive: (state) => (agentRunId: string): boolean => (state.statuses[agentRunId] ?? 'offline') !== 'offline',
    treeRevisionOf: (state) => (ref: Pick<RunStatusRunRef, 'kind' | 'runId'>): number => state.treeRevision[runKeyOf(ref)] ?? 0,
    /** A run runs when any of its own agents does (a Team counts as one unit), by its own answers. */
    isRunLive: (state) => (ref: Pick<RunStatusRunRef, 'kind' | 'runId'>): boolean =>
      (state.runAgents[runKeyOf(ref)] ?? []).some((agentRunId) => (state.statuses[agentRunId] ?? 'offline') !== 'offline'),
  },
  actions: {
    /** Follows these runs until the returned release is called. */
    hold(refs: readonly RunStatusRunRef[]): () => void {
      return refs.length ? runStatusFeed(this.apply.bind(this)).hold(refs) : () => undefined
    },
    apply(message: RunStatusServerMessage): void {
      if (message.type === 'RUN_STATUS_SNAPSHOT') {
        const next = { ...this.statuses }
        const agents = { ...this.runAgents }
        for (const run of message.payload.runs) {
          for (const agent of run.agents) next[agent.agentRunId] = agent.status
          agents[runKeyOf(run)] = run.agents.map((agent) => agent.agentRunId)
        }
        this.statuses = next
        this.runAgents = agents
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
