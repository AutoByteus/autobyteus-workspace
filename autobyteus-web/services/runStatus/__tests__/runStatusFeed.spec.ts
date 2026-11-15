import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { RunStatusFeed, type RunStatusSocket } from '../runStatusFeed'
import { useRunStatusStore } from '~/stores/runStatusStore'
import { hidePage, installPageVisibilityControl, removePageVisibilityControl, showPage } from '~/services/liveStreamLifecycle/__tests__/pageVisibilityTestControl'

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
    const feed = new RunStatusFeed({ endpoint: () => 'ws://node/ws/run-status', deliver, createSocket })
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

  it('subscribes every held run again after a reconnect, and gives each a rows notice (a change while lost reached no one)', () => {
    vi.useFakeTimers()
    try {
      sockets.length = 0
      const deliver = vi.fn()
      const feed = new RunStatusFeed({ endpoint: () => 'ws://node/ws/run-status', deliver, createSocket })
      feed.hold([agent('a'), { kind: 'agent_team', runId: 't' }])
      sockets[0]!.onopen!()
      expect(deliver).not.toHaveBeenCalled()
      sockets[0]!.onclose!({ code: 1006 })
      vi.advanceTimersByTime(1_000)
      sockets[1]!.onopen!()
      expect(sockets[1]!.sent).toEqual([{ type: 'SUBSCRIBE', payload: { runs: [agent('a'), { kind: 'agent_team', runId: 't' }] } }])
      expect(deliver.mock.calls.map(([message]) => message)).toEqual([
        { type: 'RUN_TREE_CHANGED', payload: agent('a') }, { type: 'RUN_TREE_CHANGED', payload: { kind: 'agent_team', runId: 't' } }])
      feed.suspend()
    } finally { vi.useRealTimers() }
  })
})

/** CR-461-096, CR-461-097: the feed follows the window's one live-stream lifecycle (autobyteus-434/435). */
describe('RunStatusFeed lifecycle', () => {
  const feeds: RunStatusFeed[] = []
  beforeEach(() => { sockets.length = 0; installPageVisibilityControl(); vi.useFakeTimers() })
  // Each test's feeds stop, so none answers a later test's page resume.
  afterEach(() => { feeds.splice(0).forEach((feed) => feed.suspend()); vi.useRealTimers(); removePageVisibilityControl() })
  const started = (deliver = vi.fn()) => {
    const feed = new RunStatusFeed({ endpoint: () => 'ws://node/ws/run-status', deliver, createSocket })
    feeds.push(feed)
    feed.hold([agent('a')])
    sockets[0]!.onopen!()
    return { feed, deliver }
  }

  it.each([
    ['4401', { code: 4401, reason: 'NODE_CREDENTIAL_INVALID' }],
    ['4403 with a credential-ending code', { code: 4403, reason: 'REMOTE_ACCESS_DEVICE_REVOKED' }],
  ])('a credential-ending close (%s) stops it: no reconnect, however long; binding the window again connects', (_label, close) => {
    const { feed } = started()
    sockets[0]!.onclose!(close)
    vi.advanceTimersByTime(10 * 60_000)
    expect(sockets).toHaveLength(1)
    feed.rebind()
    expect(sockets).toHaveLength(2)
  })

  it('a refusal that can change back (4403, Phone Access off) keeps trying with the capped waits', () => {
    started()
    sockets[0]!.onclose!({ code: 4403, reason: 'PHONE_ACCESS_DISABLED' })
    vi.advanceTimersByTime(1_000)
    expect(sockets).toHaveLength(2)
    sockets[1]!.onclose!({ code: 4403, reason: 'PHONE_ACCESS_DISABLED' })
    vi.advanceTimersByTime(1_999)
    expect(sockets).toHaveLength(2)
    vi.advanceTimersByTime(1)
    expect(sockets).toHaveLength(3)
  })

  it('in the background: a lost connection waits for the page resume; a rows notice is held and delivered on resume, once per run', () => {
    const { deliver } = started()
    hidePage()
    sockets[0]!.onmessage!({ data: JSON.stringify({ type: 'RUN_TREE_CHANGED', payload: agent('a') }) })
    sockets[0]!.onmessage!({ data: JSON.stringify({ type: 'RUN_TREE_CHANGED', payload: agent('a') }) })
    // A status is no read: it is applied at once.
    sockets[0]!.onmessage!({ data: JSON.stringify({ type: 'RUN_STATUS_CHANGED', payload: { ...agent('a'), agentRunId: 'a', status: 'idle' } }) })
    expect(deliver.mock.calls.map(([message]) => message.type)).toEqual(['RUN_STATUS_CHANGED'])
    sockets[0]!.onclose!({ code: 1006 })
    vi.advanceTimersByTime(60_000)
    expect(sockets).toHaveLength(1)
    showPage()
    expect(sockets).toHaveLength(2)
    expect(deliver.mock.calls.map(([message]) => message.type)).toEqual(['RUN_STATUS_CHANGED', 'RUN_TREE_CHANGED'])
  })

  it('the session\'s end suspends it until the window is bound again', () => {
    const { feed } = started()
    feed.suspend()
    expect(sockets[0]!.close).toHaveBeenCalled()
    feed.hold([agent('b')])
    vi.advanceTimersByTime(60_000)
    expect(sockets).toHaveLength(1)
    feed.rebind()
    expect(sockets).toHaveLength(2)
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
