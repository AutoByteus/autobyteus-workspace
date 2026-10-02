import { beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AgentRunCollaborationStreamingService } from '../agentRunCollaborationStreamingService'
import { AgentRunCollaborationContext } from '../agentRunCollaborationContext'
import { AgentRunCollaborationIndex } from '../agentRunCollaborationIndex'
import { createChildContext } from '../agentRunCollaborationChildContextFactory'
import { agentRootView } from './agentRootFixture'
const staging = vi.hoisted(() => ({ stage: vi.fn() }))
vi.mock('../agentRunCollaborationHydration', () => ({ stageAgentRunCollaborationContext: staging.stage }))
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
  staging.stage.mockReturnValue(new Promise(yes => { resolve = yes }))
  const commit = vi.fn(); let current = true
  const options = { hostRunId: 'host-run', isCurrent: () => current, reportError: vi.fn(), onInactive: vi.fn(),
    publish: vi.fn((_ctx, commit) => commit()) }
  const service = new AgentRunCollaborationStreamingService(options); service.connect()
  const socket = Socket.instances[0]!
  socket.frame({ type: 'CONNECTED', payload: { session_id: 's', root_subject_kind: 'agent', root_run_id: 'host-run' } })
  socket.frame({ type: 'ROOT_EXECUTION_VIEW_SNAPSHOT', payload: { root_subject_kind: 'agent', root_run_id: 'host-run', root_agent: view } })
  return { service, socket, options, context, commit, finish: () => resolve({ context, commitActivities: commit }), retireOwner: () => { current = false } }
}
it('buffers live input until the snapshot activity commit and context publication complete', async () => {
  const f = setup(); await flush()
  f.socket.frame({ type: 'ROOT_EXECUTION_EVENT', payload: { root_subject_kind: 'agent', root_run_id: 'host-run', change_sequence: 5,
    event: { kind: 'agent_presentation', agent_run_id: 'cua-run', member_address: '/computer_use_agent', message: {
      type: 'AGENT_INPUT_STATE', payload: { run_instance_id: 'i', revision: 4, entries: [], recoverableBlock: null },
    } } } })
  await flush(); expect(f.context.getAgentContext('cua-run')!.state.inputProjection).toBeNull()
  f.finish(); await flush()
  expect(f.commit).toHaveBeenCalledOnce(); expect(f.options.publish).toHaveBeenCalledOnce()
  expect(f.context.getAgentContext('cua-run')!.state.inputProjection?.revision).toBe(4)
  expect(f.service.isReady()).toBe(true); f.service.disconnect()
})
it.each(['disconnect', 'owner'])('a late snapshot after %s cannot publish or commit', async kind => {
  const f = setup(); await flush()
  if (kind === 'disconnect') f.service.disconnect(); else f.retireOwner()
  f.finish(); await flush()
  expect(f.options.publish).not.toHaveBeenCalled(); expect(f.commit).not.toHaveBeenCalled()
  expect(f.options.reportError).not.toHaveBeenCalled(); expect(f.service.isReady()).toBe(false)
  f.service.disconnect()
})
