import { describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { RunStatusFeed, type RunStatusSocket } from '../runStatusFeed'
import { useRunStatusStore } from '~/stores/runStatusStore'

/** autobyteus-461 SR-083: the window's one `/ws/run-status` connection; runs held by count, subscribed again on reconnect. */
const sockets: (RunStatusSocket & { sent: unknown[] })[] = []
const createSocket = (): RunStatusSocket => {
  const socket = { sent: [] as unknown[], send(data: string) { socket.sent.push(JSON.parse(data)) }, close: vi.fn(),
    onopen: null, onmessage: null, onclose: null, onerror: null } as RunStatusSocket & { sent: unknown[] }
  sockets.push(socket)
  return socket
}
const agent = (runId: string) => ({ kind: 'agent' as const, runId })

describe('RunStatusFeed', () => {
  it('opens with the first held run, subscribes held runs on open and new ones after, unsubscribes the last release, closes when none is held', () => {
    sockets.length = 0
    const deliver = vi.fn()
    const feed = new RunStatusFeed({ endpoint: () => 'ws://node/ws/run-status', deliver, createSocket, retryDelayMs: () => 0 })
    const releaseA = feed.hold([agent('a')])
    const socket = sockets[0]!
    socket.onopen!()
    expect(socket.sent).toEqual([{ type: 'SUBSCRIBE', payload: { runs: [agent('a')] } }])
    const releaseAgain = feed.hold([agent('a'), agent('b')])
    expect(socket.sent.at(-1)).toEqual({ type: 'SUBSCRIBE', payload: { runs: [agent('b')] } })
    releaseA()
    expect(socket.sent).toHaveLength(2)
    socket.onmessage!({ data: JSON.stringify({ type: 'RUN_STATUS_CHANGED', payload: { ...agent('a'), agentRunId: 'a', status: 'idle' } }) })
    expect(deliver).toHaveBeenCalledWith({ type: 'RUN_STATUS_CHANGED', payload: { ...agent('a'), agentRunId: 'a', status: 'idle' } })
    releaseAgain()
    expect(socket.sent.at(-1)).toEqual({ type: 'UNSUBSCRIBE', payload: { runs: [agent('a'), agent('b')] } })
    expect(socket.close).toHaveBeenCalled()
  })

  it('subscribes every held run again after a reconnect', async () => {
    sockets.length = 0
    const feed = new RunStatusFeed({ endpoint: () => 'ws://node/ws/run-status', deliver: vi.fn(), createSocket, retryDelayMs: () => 0 })
    feed.hold([agent('a'), { kind: 'agent_team', runId: 't' }])
    sockets[0]!.onopen!()
    sockets[0]!.onclose!()
    await new Promise((resolve) => setTimeout(resolve, 0))
    sockets[1]!.onopen!()
    expect(sockets[1]!.sent).toEqual([{ type: 'SUBSCRIBE', payload: { runs: [agent('a'), { kind: 'agent_team', runId: 't' }] } }])
  })
})

describe('useRunStatusStore', () => {
  it('each agent\'s status is its own run\'s answer; a run\'s rows change bumps its revision', () => {
    setActivePinia(createPinia())
    const store = useRunStatusStore()
    expect(store.isLive('copy')).toBe(false)
    store.apply({ type: 'RUN_STATUS_SNAPSHOT', payload: { runs: [{ ...agent('copy'), agents: [{ agentRunId: 'copy', status: 'idle' }] }] } })
    expect(store.isLive('copy')).toBe(true)
    store.apply({ type: 'RUN_STATUS_CHANGED', payload: { ...agent('copy'), agentRunId: 'copy', status: 'offline' } })
    expect(store.statusOf('copy')).toBe('offline')
    store.apply({ type: 'RUN_TREE_CHANGED', payload: agent('copy') })
    expect(store.treeRevisionOf(agent('copy'))).toBe(1)
  })
})
