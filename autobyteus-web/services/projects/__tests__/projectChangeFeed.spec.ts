import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProjectChangeFeed, parseProjectChangeMessage, projectChangeRetryDelayMs } from '../projectChangeFeed'
import type { ProjectChangeMessage } from '~/types/project'

class FakeSocket {
  onmessage: ((event: { data: unknown }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  closed = false
  constructor(readonly url: string) {}
  close() { this.closed = true }
  receive(value: unknown) { this.onmessage?.({ data: typeof value === 'string' ? value : JSON.stringify(value) }) }
  drop() { this.onclose?.() }
}

describe('ProjectChangeFeed', () => {
  let sockets: FakeSocket[], delivered: ProjectChangeMessage[], endpoint: string | null
  const feed = () => new ProjectChangeFeed({
    endpoint: () => endpoint,
    deliver: (message) => delivered.push(message),
    createSocket: (url) => { const socket = new FakeSocket(url); sockets.push(socket); return socket },
  })
  beforeEach(() => { vi.useFakeTimers(); sockets = []; delivered = []; endpoint = 'ws://node/ws/projects' })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  it('opens one socket while retained and closes it when the last retainer releases', () => {
    const subject = feed()
    const first = subject.retain(), second = subject.retain()
    expect(sockets).toHaveLength(1)
    first(); first()
    expect(sockets[0]!.closed).toBe(false)
    second()
    expect(sockets[0]!.closed).toBe(true)
    expect(subject.isOpen()).toBe(false)
  })

  it('delivers recognized frames in order and ignores unknown ones', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    feed().retain()
    sockets[0]!.receive({ type: 'connected' })
    sockets[0]!.receive('not json')
    sockets[0]!.receive({ type: 'something_else' })
    sockets[0]!.receive({ type: 'task_removed', scope: { kind: 'no_project' }, taskId: 't1' })
    expect(delivered.map((m) => m.type)).toEqual(['connected', 'task_removed'])
    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('reconnects with backoff while retained, and not after release', () => {
    const subject = feed()
    const release = subject.retain()
    sockets[0]!.drop()
    expect(sockets).toHaveLength(1)
    vi.advanceTimersByTime(999)
    expect(sockets).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(sockets).toHaveLength(2)
    sockets[1]!.drop()
    vi.advanceTimersByTime(2000)
    expect(sockets).toHaveLength(3)
    // A `connected` frame resets the backoff.
    sockets[2]!.receive({ type: 'connected' })
    sockets[2]!.drop()
    vi.advanceTimersByTime(1000)
    expect(sockets).toHaveLength(4)
    release()
    sockets[3]!.drop()
    vi.advanceTimersByTime(60_000)
    expect(sockets).toHaveLength(4)
  })

  it('rebinding reopens on the new node endpoint; frames from the old socket are ignored', () => {
    const subject = feed()
    subject.retain()
    const old = sockets[0]!
    const oldHandler = old.onmessage
    endpoint = 'ws://other/ws/projects'
    subject.rebind()
    expect(old.closed).toBe(true)
    expect(sockets.at(-1)!.url).toBe('ws://other/ws/projects')
    oldHandler?.({ data: JSON.stringify({ type: 'connected' }) })
    expect(delivered).toEqual([])
  })

  it('does not open without a bound endpoint', () => {
    endpoint = null
    feed().retain()
    expect(sockets).toEqual([])
  })

  it('caps the retry delay at 10 s and parses messages defensively', () => {
    expect([0, 1, 2, 3, 4, 9].map(projectChangeRetryDelayMs)).toEqual([1000, 2000, 4000, 8000, 10_000, 10_000])
    expect(parseProjectChangeMessage('null')).toBeNull()
    expect(parseProjectChangeMessage('{"type":"project_removed","projectId":"p"}')).toEqual({ type: 'project_removed', projectId: 'p' })
  })
})
