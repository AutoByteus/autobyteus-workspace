import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { CollaborationParticipantMessageDto } from '@autobyteus/collaboration-stream-contracts'
import { GetAgentRunCollaboration } from '~/graphql/queries/collaboratorQueries'
import { agentRootView, created } from '~/services/agentCollaboration/__tests__/agentRootFixture'
import { clearStoredParticipantMessages, participantMessagesQueryStub, storeParticipantMessages } from '~/test-support/participantMessagesStub'
import { agentRow } from '~/test-support/runTreeFixtures'

const io = vi.hoisted(() => ({ query: vi.fn(), participantRequests: vi.fn() }))
// Each run's own statuses (`/ws/run-status`, SR-083) are not this spec's: its sockets are the view's stream.
vi.mock('~/stores/runStatusStore', () => ({ useRunStatusStore: () => ({ hold: () => () => undefined, statusOf: () => null, treeRevisionOf: () => 0 }) }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: io.query }) }))
vi.mock('~/services/collaborationMessages/participantMessagesQuery', () => ({
  fetchParticipantMessages: (key: Parameters<typeof participantMessagesQueryStub.fetchParticipantMessages>[0]) => {
    io.participantRequests(key)
    return participantMessagesQueryStub.fetchParticipantMessages(key)
  },
}))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({
  applyRunNavigationEffect: vi.fn(), ensureWorkspaceByRootPath: vi.fn(async () => null),
  resolveWorkspaceMetadataByRootPath: vi.fn(async () => null),
}) }))
vi.mock('~/services/collaborators/collaboratorCandidatesService', () => ({ collaboratorCandidatesService: { invalidate: vi.fn() } }))
vi.mock('~/utils/remoteAccess/authorizedTransport', () => ({ getActiveRemoteAccessCredential: () => null }))
vi.mock('~/utils/remoteAccess/websocketAuth', () => ({ buildAuthenticatedWebSocketUrl: (url: string) => url }))

import { useAgentRunCollaborationStore } from '../agentRunCollaborationStore'
import { useCollaborationParticipantMessagesStore } from '~/services/collaborationMessages/collaborationParticipantMessages'

/**
 * autobyteus-358 (SR-004 … SR-007; API-08): a running hub's Team-tab list is fetched again only when a message could
 * have been missed. The real store, context and stream; only GraphQL, the socket and the message query are fixtures.
 */
class Socket {
  static OPEN = 1; static instances: Socket[] = []; readyState = 1
  onmessage?: (event: { data: string }) => void
  onclose?: (event: { code: number }) => void
  send = vi.fn(); close = vi.fn()
  constructor(_url: string) { Socket.instances.push(this) }
  frame(value: unknown) { this.onmessage?.({ data: JSON.stringify(value) }) }
}
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve() }
const settle = async () => { await flush(); await new Promise((resolve) => setTimeout(resolve, 0)); await flush() }
const HOST = 'host-run'
const key = { rootKind: 'agent', rootRunId: HOST, agentRunId: HOST } as const
const message = (messageId: string): CollaborationParticipantMessageDto => ({
  messageId, senderAgentRunId: 'pp-run', receiverAgentRunId: HOST, content: messageId, messageType: 'direct_message',
  referenceFiles: [], createdAt: created,
})
/** The hub's view at `base` in `liveSequenceId`, whose latest message is at `lastMessage` (SR-007). */
const viewAt = (base: number, liveSequenceId: string | null = 'live-1', lastMessage: number | null = 0) =>
  ({ ...agentRootView(), base_change_sequence: base, live_sequence_id: liveSequenceId, last_message_change_sequence: lastMessage })
let inspected = viewAt(4)
const snapshot = async (socket: Socket, base: number, liveSequenceId = 'live-1', lastMessage = 0) => {
  socket.frame({ type: 'CONNECTED', payload: { root_subject_kind: 'agent', root_run_id: HOST, session_id: 'session' } })
  socket.frame({ type: 'ROOT_EXECUTION_VIEW_SNAPSHOT', payload: { root_subject_kind: 'agent', root_run_id: HOST, root_agent: viewAt(base, liveSequenceId, lastMessage) } })
  await settle()
}
const event = (socket: Socket, change_sequence: number, body: unknown) =>
  socket.frame({ type: 'ROOT_EXECUTION_EVENT', payload: { root_subject_kind: 'agent', root_run_id: HOST, change_sequence, event: body } })
/** A new delegated run: a change to the run's tree, on the same stream (autobyteus-461 SR-084). */
const newChild = (socket: Socket, change_sequence: number) => event(socket, change_sequence, {
  kind: 'run_tree_changed', added: [agentRow('cr-copy-run', `agent:${HOST}`, 1)], removed: [], updated: [],
})
const listed = () => useCollaborationParticipantMessagesStore().messagesOf(key).map((entry) => entry.messageId)
const requests = () => io.participantRequests.mock.calls.length

/** Selecting a running hub with the Team tab shown: the inspection, the Team tab's load, then the attach. */
const selectRunningHub = async () => {
  const store = useAgentRunCollaborationStore()
  await store.inspect(HOST)
  store.contextFor(HOST)!.messagesView(HOST).loadMessages()
  store.syncRun(HOST, true)
  await snapshot(Socket.instances[0]!, 4)
  return store
}

describe('A running hub fetches its Team-tab list again only when a message could have been missed', () => {
  beforeEach(() => {
    setActivePinia(createPinia()); vi.clearAllMocks(); Socket.instances.length = 0
    vi.stubGlobal('WebSocket', Socket)
    clearStoredParticipantMessages()
    storeParticipantMessages('agent', HOST, [message('m1')])
    inspected = viewAt(4)
    io.query.mockImplementation(async (input) => {
      if (input.query === GetAgentRunCollaboration) {
        return { data: { agentRunCollaboration: { root_subject_kind: 'agent', root_run_id: HOST, root_agent: inspected } } }
      }
      throw new Error('Unexpected query')
    })
  })
  afterEach(() => { useAgentRunCollaborationStore().release(HOST); vi.unstubAllGlobals() })

  it('selecting a running hub fetches the list once: the attach at the inspected sequence keeps it (API-08 L-001)', async () => {
    await selectRunningHub()

    expect(requests()).toBe(1)
    expect(listed()).toEqual(['m1'])
  })

  it('a new delegated run keeps the stream and the list; a reconnect whose snapshot shows a message in its window fetches it once (API-08 L-002)', async () => {
    await selectRunningHub()
    newChild(Socket.instances[0]!, 5); await settle()
    expect(Socket.instances).toHaveLength(1)
    expect(requests()).toBe(1)

    // The connection drops; the server stored m2 (sequence 25) before the reconnect's snapshot.
    Socket.instances[0]!.onclose?.({ code: 1006 })
    await vi.waitFor(() => expect(Socket.instances).toHaveLength(2), { timeout: 2_500 })
    storeParticipantMessages('agent', HOST, [message('m1'), message('m2')])
    await snapshot(Socket.instances[1]!, 26, 'live-1', 25)
    expect(requests()).toBe(2)
    expect(listed()).toEqual(['m1', 'm2'])
  })

  it('a reconnect to another publisher (a stop and resume, or a restart) fetches the list although its base is below the old one', async () => {
    await selectRunningHub()
    event(Socket.instances[0]!, 5, { kind: 'communication', message: message('m2'), parties: { sender: { agentRunId: 'pp-run', address: null, nodeName: null }, receiver: { agentRunId: 'host-run', address: null, nodeName: null } } })
    storeParticipantMessages('agent', HOST, [message('m1'), message('m2')])
    await settle()
    expect(listed()).toEqual(['m1', 'm2'])

    // The connection drops; the resumed root's publisher produced m3 (its sequence 1) before the client attached.
    Socket.instances[0]!.onclose?.({ code: 1006 })
    // The reconnect scheduler's first wait is 1 s (autobyteus-434).
    await vi.waitFor(() => expect(Socket.instances).toHaveLength(2), { timeout: 2_500 })
    storeParticipantMessages('agent', HOST, [message('m1'), message('m2'), message('m3')])
    await snapshot(Socket.instances[1]!, 1, 'live-2', 1)

    expect(requests()).toBe(2)
    expect(listed()).toEqual(['m1', 'm2', 'm3'])
  })
})
