import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const io = vi.hoisted(() => ({ sockets: [] as Array<{ url: string; send: ReturnType<typeof vi.fn>; frame(value: unknown): void; onclose?: (event: { code: number }) => void }> }))
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => ({ getBoundEndpoints: () => ({ peerRunWs: 'ws://node-a.test/ws/peer-run' }), bindingRevision: 1 }) }))
vi.mock('~/utils/remoteAccess/authorizedTransport', () => ({ getActiveRemoteAccessCredential: () => null }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: async () => ({ data: { getRunFileChanges: [] } }) }) }))

import { createPeerRunStreams } from '../peerRunStreams'

class Socket {
  static OPEN = 1
  readyState = 1
  onopen?: () => void; onmessage?: (event: { data: string }) => void; onclose?: (event: { code: number }) => void; onerror?: () => void
  send = vi.fn(); close = vi.fn()
  constructor(readonly url: string) { io.sockets.push(this as never); queueMicrotask(() => this.onopen?.()) }
  frame(value: unknown) { this.onmessage?.({ data: JSON.stringify(value) }) }
}

/**
 * autobyteus-461 G-D1 (SR-088): a peer's run opens by its own identity through this node's `/ws/peer-run`, with the same
 * agent stream service: node B's snapshot, then its numbered frames after the base.
 */
describe('peer run streams', () => {
  beforeEach(() => { setActivePinia(createPinia()); io.sockets.length = 0; vi.stubGlobal('WebSocket', Socket) })

  it('opens the peer run\'s stream once, shows its snapshot and its frames after the base, and sends its messages there', async () => {
    const peers = createPeerRunStreams()
    const subject = { nodeId: 'node-b', runKind: 'agent_team' as const, runId: 'team-b', agentRunId: 'member-b', address: '/squad/member' }
    peers.open(subject); peers.open(subject)
    await Promise.resolve()
    expect(io.sockets.map((socket) => socket.url)).toEqual(['ws://node-a.test/ws/peer-run/node-b/agent_team/team-b/member-b'])
    const socket = io.sockets[0]!
    socket.frame({ type: 'CONNECTED', payload: { agent_id: 'member-b', session_id: 's' } })
    socket.frame({ type: 'AGENT_STREAM_SNAPSHOT', payload: { input_state: null, base_sequence: 2, live_sequence_id: 'live-b', turn_frames: [
      { type: 'SEGMENT_START', payload: { occurred_at: '2026-11-23T16:55:09.697Z', id: 's1', turn_id: 't1', segment_type: 'text' }, sequence: 1 },
      { type: 'SEGMENT_CONTENT', payload: { occurred_at: '2026-11-23T16:55:09.697Z', id: 's1', turn_id: 't1', segment_type: 'text', delta: 'from node B ' }, sequence: 2 }],
      stored: { runId: 'member-b', conversation: [{ kind: 'message', role: 'user', content: 'the task', ts: 1 }], activities: [], hasEarlierActiveTraceEvents: false } } })
    socket.frame({ type: 'SEGMENT_CONTENT', sequence: 3, payload: { occurred_at: '2026-11-23T16:55:09.697Z', id: 's1', turn_id: 't1', segment_type: 'text', delta: 'live' } })
    const shown = JSON.stringify(peers.streamOf(subject)!.context.state.conversation.messages)
    expect(shown).toContain('the task')
    expect(shown).toContain('from node B live')
    expect(peers.streamOf(subject)!.context.config.agentDefinitionName).toBeTruthy()
    peers.closeAll()
    expect(peers.streamOf(subject)).toBeNull()
  })
})
