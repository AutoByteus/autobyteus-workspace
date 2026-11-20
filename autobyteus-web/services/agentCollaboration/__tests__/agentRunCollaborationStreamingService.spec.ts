import { beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AgentRunCollaborationStreamingService } from '../agentRunCollaborationStreamingService'
import { agentRootTreeRows, agentRootView, created } from './agentRootFixture'
import { useRunTreeStore } from '~/stores/runTreeStore'
import { agentRow } from '~/test-support/runTreeFixtures'
vi.mock('~/utils/remoteAccess/authorizedTransport', () => ({ getActiveRemoteAccessCredential: () => null }))
vi.mock('~/utils/remoteAccess/websocketAuth', () => ({ buildAuthenticatedWebSocketUrl: (url: string) => url }))
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => ({ getBoundEndpoints: () => ({ agentCollaborationWs: 'ws://test.invalid' }), bindingRevision: 1 }) }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: vi.fn(async () => ({ data: { runTree: null } })) }) }))
class Socket {
  static OPEN = 1; static instances: Socket[] = []; readyState = 1
  onmessage?: (event: { data: string }) => void; onclose?: (event: { code: number }) => void
  close = vi.fn(); send = vi.fn()
  constructor(_url: string) { Socket.instances.push(this) }
  frame(value: unknown) { this.onmessage?.({ data: JSON.stringify(value) }) }
}
beforeEach(() => { setActivePinia(createPinia()); Socket.instances.length = 0; vi.stubGlobal('WebSocket', Socket); vi.clearAllMocks() })
const HOST = { kind: 'agent' as const, runId: 'host-run' }
const event = (change_sequence: number, value: unknown) => ({ type: 'ROOT_EXECUTION_EVENT', payload: { root_subject_kind: 'agent', root_run_id: 'host-run', change_sequence, event: value } })
const setup = () => {
  let current = true
  const options = { runId: 'host-run', isCurrent: () => current, reportError: vi.fn(), publish: vi.fn() }
  const service = new AgentRunCollaborationStreamingService(options); service.connect()
  const socket = Socket.instances.at(-1)!
  socket.frame({ type: 'CONNECTED', payload: { session_id: 's', root_subject_kind: 'agent', root_run_id: 'host-run' } })
  socket.frame({ type: 'ROOT_EXECUTION_VIEW_SNAPSHOT', payload: { root_subject_kind: 'agent', root_run_id: 'host-run', root_agent: agentRootView() } })
  return { service, socket, options, retireOwner: () => { current = false } }
}

/** autobyteus-461 SR-084: the agent root's stream: its view snapshot, its tree at the same base, then numbered frames. */
it('publishes the snapshot\'s view, then feeds the tree its snapshot and changes, in the view\'s sequence', () => {
  const f = setup()
  expect(f.options.publish).toHaveBeenCalledOnce()
  const context = f.options.publish.mock.calls[0]![0]
  expect(context.changeSequence).toBe(4)
  f.socket.frame({ type: 'RUN_TREE_SNAPSHOT', payload: { root_subject_kind: 'agent', root_run_id: 'host-run', base_change_sequence: 4, rows: agentRootTreeRows() } })
  expect(useRunTreeStore().rowsOf(HOST).map((row) => row.key)).toContain('agent:cua-run')
  f.socket.frame(event(5, { kind: 'run_tree_changed', added: [agentRow('new-run', 'agent:host-run', 1)], removed: ['agent:cua-run'], updated: [] }))
  expect(useRunTreeStore().rowsOf(HOST).map((row) => row.key)).toEqual(expect.arrayContaining(['agent:new-run']))
  expect(useRunTreeStore().rowsOf(HOST).map((row) => row.key)).not.toContain('agent:cua-run')
  expect(context.changeSequence).toBe(5)
  expect(f.options.reportError).not.toHaveBeenCalled(); expect(f.socket.close).not.toHaveBeenCalled()
  f.service.disconnect()
})

// CR-461-111 (F-87): a Stop makes the view not current while it runs, and the server ends the view's stream then. The
// tree is no longer fed by it: it must read on its notices again, or a later Save's row change is never shown.
it('a close while the view is not current ends the tree\'s stream feed, and is no loss to recover from', () => {
  const f = setup()
  f.socket.frame({ type: 'RUN_TREE_SNAPSHOT', payload: { root_subject_kind: 'agent', root_run_id: 'host-run', base_change_sequence: 4, rows: agentRootTreeRows() } })
  expect(useRunTreeStore().trees['agent:host-run']?.via).toBe('stream')
  f.retireOwner()
  f.socket.onclose?.({ code: 1000 })
  expect(useRunTreeStore().trees['agent:host-run']?.via).toBe('query')
  expect(useRunTreeStore().rowsOf(HOST).map((row) => row.key)).toContain('agent:cua-run')
  expect(f.options.reportError).not.toHaveBeenCalled()
  expect(Socket.instances).toHaveLength(1)
  f.service.disconnect()
})

it('a tree snapshot not at the view\'s base, or a sequence gap, closes the stream to reopen it', () => {
  const f = setup()
  f.socket.frame({ type: 'RUN_TREE_SNAPSHOT', payload: { root_subject_kind: 'agent', root_run_id: 'host-run', base_change_sequence: 3, rows: [] } })
  expect(f.socket.close).toHaveBeenCalled()
  f.service.disconnect()
  const g = setup()
  g.socket.frame(event(7, { kind: 'communication', message: { messageId: 'm', senderAgentRunId: 'host-run', receiverAgentRunId: 'cua-run',
    content: 'x', messageType: 'direct_message', referenceFiles: [], createdAt: created },
    parties: { sender: { agentRunId: 'host-run', address: null, nodeName: null }, receiver: { agentRunId: 'cua-run', address: null, nodeName: null } } }))
  expect(g.socket.close).toHaveBeenCalled()
  g.service.disconnect()
})

it('a snapshot after its owner retired is not published', () => {
  let current = true
  const options = { runId: 'host-run', isCurrent: () => current, reportError: vi.fn(), publish: vi.fn() }
  const service = new AgentRunCollaborationStreamingService(options); service.connect()
  const socket = Socket.instances[0]!
  socket.frame({ type: 'CONNECTED', payload: { session_id: 's', root_subject_kind: 'agent', root_run_id: 'host-run' } })
  current = false
  socket.frame({ type: 'ROOT_EXECUTION_VIEW_SNAPSHOT', payload: { root_subject_kind: 'agent', root_run_id: 'host-run', root_agent: agentRootView() } })
  expect(options.publish).not.toHaveBeenCalled()
  expect(options.reportError).not.toHaveBeenCalled()
  service.disconnect()
})
