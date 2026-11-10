import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AgentRunCollaborationStreamingService } from '../agentRunCollaborationStreamingService'
import { AgentRunCollaborationContext } from '../agentRunCollaborationContext'
import { AgentRunCollaborationIndex } from '../agentRunCollaborationIndex'
import { createChildContext } from '../agentRunCollaborationChildContextFactory'
import { agentRootView } from './agentRootFixture'
import {
  hidePage, installPageVisibilityControl, removePageVisibilityControl, showPage,
} from '~/services/liveStreamLifecycle/__tests__/pageVisibilityTestControl'

const building = vi.hoisted(() => ({ build: vi.fn() }))
vi.mock('../agentRunCollaborationHydration', () => ({ buildAgentRunCollaborationContext: building.build }))
vi.mock('~/utils/remoteAccess/authorizedTransport', () => ({ getActiveRemoteAccessCredential: () => null }))
vi.mock('~/utils/remoteAccess/websocketAuth', () => ({ buildAuthenticatedWebSocketUrl: (url: string) => url }))
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => ({ getBoundEndpoints: () => ({ agentCollaborationWs: 'ws://test.invalid' }) }) }))

class Socket {
  static OPEN = 1; static instances: Socket[] = []; readyState = 1
  onmessage?: (event: { data: string }) => void; onclose?: (event: { code: number; reason?: string }) => void
  close = vi.fn(); send = vi.fn()
  constructor(_url: string) { Socket.instances.push(this) }
  frame(value: unknown) { this.onmessage?.({ data: JSON.stringify(value) }) }
  lose(code = 1006, reason?: string) { this.readyState = 3; this.onclose?.({ code, reason }) }
}

/**
 * autobyteus-434 DS-002 for the delegated-copy (collaboration) stream: its success point is the accepted snapshot;
 * a failure before it counts; the fifth consecutive failure reports once; retrying never stops while visible.
 */
describe('AgentRunCollaborationStreamingService reconnect', () => {
  let view: ReturnType<typeof agentRootView>
  let options: {
    hostRunId: string; isCurrent: () => boolean; reportError: ReturnType<typeof vi.fn>; onInactive: ReturnType<typeof vi.fn>
    publish: ReturnType<typeof vi.fn>
  }
  let service: AgentRunCollaborationStreamingService
  let visibleError: string | null

  const flush = () => vi.advanceTimersByTimeAsync(0)
  const synchronize = async (socket: Socket) => {
    socket.frame({ type: 'CONNECTED', payload: { session_id: 's', root_subject_kind: 'agent', root_run_id: 'host-run' } })
    socket.frame({ type: 'ROOT_EXECUTION_VIEW_SNAPSHOT', payload: { root_subject_kind: 'agent', root_run_id: 'host-run', root_agent: view } })
    await flush()
  }

  beforeEach(() => {
    vi.useFakeTimers()
    installPageVisibilityControl()
    setActivePinia(createPinia())
    Socket.instances.length = 0
    vi.stubGlobal('WebSocket', Socket)
    view = agentRootView()
    building.build.mockImplementation(async () => new AgentRunCollaborationContext({ hostRunId: 'host-run', view,
      entries: [...new AgentRunCollaborationIndex(view.execution_tree).agents.values()].map(child => ({
        agentRunId: child.agentRunId, memberAddress: child.address, context: createChildContext(child, view.execution_tree.createdAt, null),
      })) }))
    visibleError = null
    // As the store: an accepted snapshot publishes and clears the reported error (N-1).
    options = { hostRunId: 'host-run', isCurrent: () => true, onInactive: vi.fn(),
      reportError: vi.fn((message: string) => { visibleError = message }),
      publish: vi.fn(() => { visibleError = null }) }
    service = new AgentRunCollaborationStreamingService(options)
  })
  afterEach(() => {
    service.disconnect()
    removePageVisibilityControl()
    vi.useRealTimers()
  })

  it('counts a close after CONNECTED but before the snapshot, reports at the fifth failure once, and keeps retrying', async () => {
    service.connect()
    const ready = service.whenReady()
    const readiness = expect(ready).rejects.toThrow('The Agent collaboration stream closed.')
    const waits = [1_000, 2_000, 4_000, 8_000]
    for (let failure = 0; failure < 5; failure += 1) {
      const socket = Socket.instances[failure]!
      socket.frame({ type: 'CONNECTED', payload: { session_id: 's', root_subject_kind: 'agent', root_run_id: 'host-run' } })
      socket.lose()
      await flush()
      if (failure < 4) {
        expect(options.reportError).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(waits[failure]!)
        expect(Socket.instances).toHaveLength(failure + 2)
      }
    }
    expect(options.reportError).toHaveBeenCalledTimes(1)
    await readiness
    expect(visibleError).toBe('The Agent collaboration stream closed.')

    // No give-up: the next attempt comes after 16 s; its snapshot clears the error.
    await vi.advanceTimersByTimeAsync(16_000)
    expect(Socket.instances).toHaveLength(6)
    await synchronize(Socket.instances[5]!)
    expect(service.isReady()).toBe(true)
    expect(visibleError).toBeNull()
    expect(options.reportError).toHaveBeenCalledTimes(1)
  })

  it('an invalid frame before the snapshot is a failed attempt', async () => {
    service.connect()
    Socket.instances[0]!.onmessage?.({ data: '{not-json' })
    await flush()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(Socket.instances).toHaveLength(2)
  })

  it('the store connect during a wait opens at once and resets the count', async () => {
    service.connect()
    await synchronize(Socket.instances[0]!)
    Socket.instances[0]!.lose()
    await flush()
    expect(Socket.instances).toHaveLength(1)
    service.connect()
    expect(Socket.instances).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(Socket.instances).toHaveLength(2)
  })

  it('does not retry a 4004 close (this run cannot host delegated copies)', async () => {
    service.connect()
    const readiness = expect(service.whenReady()).rejects.toThrow('This run cannot host delegated copies.')
    Socket.instances[0]!.lose(4004)
    await readiness
    await vi.advanceTimersByTimeAsync(120_000)
    expect(Socket.instances).toHaveLength(1)
    expect(options.reportError).not.toHaveBeenCalled()
  })

  it.each([[4401, 'NODE_CREDENTIAL_INVALID'], [4403, 'REMOTE_ACCESS_DEVICE_REVOKED']])(
    'does not retry a credential-refusal close %i %s (autobyteus-435 AC-010-1)', async (code, reason) => {
      service.connect()
      await synchronize(Socket.instances[0]!)
      Socket.instances[0]!.lose(code, reason)
      await vi.advanceTimersByTimeAsync(120_000)
      expect(Socket.instances).toHaveLength(1)
    })

  it('retries a close for Phone Access off or a network refusal: they can change back (autobyteus-435 DEC-008)', async () => {
    service.connect()
    await synchronize(Socket.instances[0]!)
    Socket.instances[0]!.lose(4403, 'PHONE_ACCESS_DISABLED')
    await vi.advanceTimersByTimeAsync(1_000)
    expect(Socket.instances).toHaveLength(2)
    Socket.instances[1]!.lose(4403, 'NODE_NETWORK_REFUSED')
    await vi.advanceTimersByTimeAsync(2_000)
    expect(Socket.instances).toHaveLength(3)
  })

  it('holds while hidden and attempts at once on becoming visible (AC-004)', async () => {
    service.connect()
    await synchronize(Socket.instances[0]!)
    hidePage()
    Socket.instances[0]!.lose()
    await vi.advanceTimersByTimeAsync(10 * 60_000)
    expect(Socket.instances).toHaveLength(1)
    showPage()
    expect(Socket.instances).toHaveLength(2)
  })

  it('re-synchronizes a live stream after the page was hidden ≥ 30 s: a fresh socket and snapshot', async () => {
    service.connect()
    await synchronize(Socket.instances[0]!)
    expect(options.publish).toHaveBeenCalledTimes(1)
    hidePage()
    await vi.advanceTimersByTimeAsync(30_000)
    showPage()
    expect(Socket.instances[0]!.close).toHaveBeenCalledWith(1000, 'Agent collaboration re-synchronize')
    expect(Socket.instances).toHaveLength(2)
    await synchronize(Socket.instances[1]!)
    expect(options.publish).toHaveBeenCalledTimes(2)
    expect(service.isReady()).toBe(true)
  })
})
