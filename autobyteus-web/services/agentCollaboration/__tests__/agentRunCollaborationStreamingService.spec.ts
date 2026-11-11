import { beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AgentRunCollaborationStreamingService } from '../agentRunCollaborationStreamingService'
import { AgentRunCollaborationContext } from '../agentRunCollaborationContext'
import { AgentRunCollaborationIndex } from '../agentRunCollaborationIndex'
import { createChildContext } from '../agentRunCollaborationChildContextFactory'
import { agentRootView } from './agentRootFixture'
const building = vi.hoisted(() => ({ build: vi.fn() }))
vi.mock('../agentRunCollaborationHydration', () => ({ buildAgentRunCollaborationContext: building.build }))
vi.mock('~/utils/remoteAccess/authorizedTransport', () => ({ getActiveRemoteAccessCredential: () => null }))
vi.mock('~/utils/remoteAccess/websocketAuth', () => ({ buildAuthenticatedWebSocketUrl: (url: string) => url }))
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => ({ getBoundEndpoints: () => ({ agentCollaborationWs: 'ws://test.invalid' }) }) }))
class Socket {
  static OPEN = 1; static instances: Socket[] = []; readyState = 1
  onmessage?: (event: { data: string }) => void; onclose?: (event: { code: number }) => void
  close = vi.fn(); send = vi.fn()
  constructor(_url: string) { Socket.instances.push(this) }
  frame(value: unknown) { this.onmessage?.({ data: JSON.stringify(value) }) }
}
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve() }
beforeEach(() => { setActivePinia(createPinia()); Socket.instances.length = 0; vi.stubGlobal('WebSocket', Socket); vi.clearAllMocks() })
const setup = () => {
  const view = agentRootView()
  const context = new AgentRunCollaborationContext({ hostRunId: 'host-run', view,
    entries: [...new AgentRunCollaborationIndex(view.execution_tree).agents.values()].map(child => ({
      agentRunId: child.agentRunId, memberAddress: child.address, context: createChildContext(child, view.execution_tree.createdAt, null),
    })) })
  let resolve!: (v: any) => void
  building.build.mockReturnValue(new Promise(yes => { resolve = yes }))
  let current = true
  const options = { hostRunId: 'host-run', isCurrent: () => current, reportError: vi.fn(), onInactive: vi.fn(),
    publish: vi.fn() }
  const service = new AgentRunCollaborationStreamingService(options); service.connect()
  const socket = Socket.instances[0]!
  socket.frame({ type: 'CONNECTED', payload: { session_id: 's', root_subject_kind: 'agent', root_run_id: 'host-run' } })
  socket.frame({ type: 'ROOT_EXECUTION_VIEW_SNAPSHOT', payload: { root_subject_kind: 'agent', root_run_id: 'host-run', root_agent: view } })
  return { service, socket, options, context, finish: () => resolve(context), retireOwner: () => { current = false } }
}
it('buffers live input until the snapshot context is built and published', async () => {
  const f = setup(); await flush()
  f.socket.frame({ type: 'ROOT_EXECUTION_EVENT', payload: { root_subject_kind: 'agent', root_run_id: 'host-run', change_sequence: 5,
    event: { kind: 'agent_presentation', agent_run_id: 'cua-run', member_address: '/computer_use_agent', message: {
      type: 'AGENT_INPUT_STATE', payload: { run_instance_id: 'i', revision: 4, entries: [], recoverableBlock: null },
    } } } })
  await flush(); expect(f.context.getAgentContext('cua-run')!.state.inputProjection).toBeNull()
  f.finish(); await flush()
  expect(f.options.publish).toHaveBeenCalledOnce()
  expect(f.context.getAgentContext('cua-run')!.state.inputProjection?.revision).toBe(4)
  expect(f.service.isReady()).toBe(true); f.service.disconnect()
})
it.each(['disconnect', 'owner'])('a late snapshot after %s cannot publish', async kind => {
  const f = setup(); await flush()
  if (kind === 'disconnect') f.service.disconnect(); else f.retireOwner()
  f.finish(); await flush()
  expect(f.options.publish).not.toHaveBeenCalled()
  expect(f.options.reportError).not.toHaveBeenCalled(); expect(f.service.isReady()).toBe(false)
  f.service.disconnect()
})
it('applies a received content batch frame and continues after its covered range (autobyteus-139)', async () => {
  const f = setup(); f.finish(); await flush()
  const segment = { segment_id: 's-1', turn_id: 't-1', segment_type: 'text' }
  f.socket.frame({ type: 'ROOT_EXECUTION_EVENT', payload: { root_subject_kind: 'agent', root_run_id: 'host-run', change_sequence: 5,
    event: { kind: 'agent_presentation', agent_run_id: 'cua-run', member_address: '/computer_use_agent', message: {
      type: 'SEGMENT_START', payload: { ...segment, metadata: null } } } } })
  f.socket.frame({ type: 'ROOT_EXECUTION_EVENT', payload: { root_subject_kind: 'agent', root_run_id: 'host-run', change_sequence: 6,
    change_sequence_through: 11, event: { kind: 'agent_presentation_batch', items: [{ agent_run_id: 'cua-run', member_address: '/computer_use_agent',
      message: { type: 'SEGMENT_CONTENT', payload: { ...segment, delta: 'xy' } } }] } } })
  await flush()
  expect(f.context.changeSequence).toBe(11)
  expect(JSON.stringify(f.context.getAgentContext('cua-run')!.conversation.messages)).toContain('"content":"xy"')
  expect(f.options.reportError).not.toHaveBeenCalled(); expect(f.socket.close).not.toHaveBeenCalled()
  f.service.disconnect()
})
it('autobyteus-461 SR-042: CHILD_RUNS_CHANGED is unsequenced; a change the view lacks reloads it, one it already has does nothing', async () => {
  const f = setup(); f.finish(); await flush()
  const sequence = f.context.changeSequence
  const changed = (event: Record<string, unknown>) => ({ type: 'CHILD_RUNS_CHANGED', payload: { root_subject_kind: 'agent', root_run_id: 'host-run',
    event: { kind: 'child_runs_changed', run_id: 'host-run', added: [], removed: [], ...event } } })
  // Already in the snapshot (a held event): a row it has, a removed row it does not have.
  f.socket.frame(changed({ added: [f.context.view.execution_tree.taskExecutions[0]], removed: [{ agentRunId: 'gone-run' }] }))
  await flush()
  expect(Socket.instances).toHaveLength(1); expect(f.context.changeSequence).toBe(sequence)
  // A child whose Task closed leaves: the view is read again.
  f.socket.frame(changed({ removed: [{ agentRunId: 'cua-run' }] }))
  await flush()
  expect(f.socket.close).toHaveBeenCalledWith(1000, 'Agent collaboration reload'); expect(Socket.instances).toHaveLength(2)
  expect(f.options.reportError).not.toHaveBeenCalled()
  f.service.disconnect()
})
