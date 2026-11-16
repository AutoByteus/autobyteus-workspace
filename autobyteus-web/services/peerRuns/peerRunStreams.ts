import { reactive, shallowReactive } from 'vue'
import type { AgentContext } from '~/types/agent/AgentContext'
import { AgentStreamingService } from '~/services/agentStreaming/AgentStreamingService'
import { createPeerAgentContext } from '~/services/peerRuns/peerAgentContext'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'

type PeerSubject = Readonly<{ nodeId: string; runKind: 'agent' | 'agent_team'; runId: string; agentRunId: string; address: string }>
type PeerRunStream = { context: AgentContext; service: AgentStreamingService; timer: ReturnType<typeof setTimeout> | null; closed: boolean }

/** The wait before a lost peer stream opens again; its snapshot catches up (SR-087). */
const REOPEN_WAIT_MS = 1_000

/**
 * A peer's run, opened by its own identity (autobyteus-461 G-D1, SR-088): one agent of a run on another node, through
 * this node's `/ws/peer-run`, which relays that node's own agent stream in the `/ws/agent` protocol. So it is the same
 * `AgentStreamingService`: the snapshot, the frames after its base, a reopen on a gap; its messages and interrupts go to
 * its node through that stream. Its context names it by its address (its node keeps its definition and launch).
 */
export const createPeerRunStreams = () => {
  const streams = shallowReactive(new Map<string, PeerRunStream>())
  const keyOf = (subject: PeerSubject) => `${subject.nodeId}|${subject.agentRunId}`

  const open = (subject: PeerSubject): void => {
    const key = keyOf(subject)
    if (streams.has(key)) return
    const endpoint = `${useWindowNodeContextStore().getBoundEndpoints().peerRunWs}/${encodeURIComponent(subject.nodeId)}/${subject.runKind}/${encodeURIComponent(subject.runId)}`
    const stream: PeerRunStream = {
      // Reactive, as the stores' contexts are: the view follows its stream's changes.
      context: reactive(createPeerAgentContext(subject.agentRunId, subject.address, new Date().toISOString())) as AgentContext,
      service: new AgentStreamingService(endpoint), timer: null, closed: false,
    }
    stream.service.onConnectionChange((event) => {
      if (event.kind !== 'lost' || !event.retryable || stream.closed) return
      stream.timer = setTimeout(() => { if (!stream.closed) stream.service.connect(subject.agentRunId, stream.context) }, REOPEN_WAIT_MS)
    })
    streams.set(key, stream)
    stream.service.connect(subject.agentRunId, stream.context)
  }

  const streamOf = (subject: PeerSubject): PeerRunStream | null => streams.get(keyOf(subject)) ?? null

  const closeAll = (): void => {
    for (const stream of streams.values()) {
      stream.closed = true
      if (stream.timer) clearTimeout(stream.timer)
      stream.service.disconnect()
    }
    streams.clear()
  }

  return { open, streamOf, closeAll }
}
