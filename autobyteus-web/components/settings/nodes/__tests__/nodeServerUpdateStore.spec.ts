import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAppUpdateStore } from '~/stores/appUpdateStore'
import {
  NODE_UPDATE_POLL_MS, NODE_UPDATE_RESTART_GRACE_MS, NODE_UPDATE_SLOW_POLL_MS, useNodeServerUpdateStore,
} from '~/stores/nodeServerUpdateStore'

/** autobyteus-305 step 4, DS-001/DS-005: what the Nodes page asks a remote node about its server, and when. */

const KEY = 'srv_studio'
const ADDRESS = 'http://192.168.2.31:29695'
const idle = { state: 'idle', targetVersion: null, step: null, code: null, message: null }
const status = (version: string, update: object = idle, extra: object = {}) => ({
  inPlaceUpdate: 'available', version, target: { version: '1.5.12', relation: version === '1.5.12' ? 'same' : 'newer' }, update, ...extra,
})
const running = (step: string) => ({ state: 'running', targetVersion: '1.5.12', step, code: null, message: null })

type Answer = { status: number; body: unknown } | 'down'
let answers: Answer[]
const calls: Array<{ method: string; url: string; body?: unknown }> = []

const json = (answer: Answer): Response => {
  if (answer === 'down') throw new TypeError('Failed to fetch')
  return new Response(JSON.stringify(answer.body), { status: answer.status, headers: { 'content-type': 'application/json' } })
}

/** Lets pending fetches settle, then advances the clock. */
const advance = async (ms: number): Promise<void> => {
  await vi.advanceTimersByTimeAsync(ms)
}

describe('nodeServerUpdateStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    useAppUpdateStore().currentVersion = '1.5.12'
    answers = []
    calls.length = 0
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ method: init?.method ?? 'GET', url, ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}) })
      const answer = answers.length > 1 ? answers.shift()! : answers[0]!
      return json(answer)
    }))
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('asks the node once with this app version as target, and does not poll while nothing runs', async () => {
    answers = [{ status: 200, body: status('1.5.11') }]
    const store = useNodeServerUpdateStore()
    store.watch(KEY, ADDRESS)
    await advance(60_000)
    expect(calls).toEqual([{ method: 'GET', url: `${ADDRESS}/rest/node-update?target=1.5.12` }])
    expect(store.entries[KEY]).toMatchObject({ connection: 'ok', status: { version: '1.5.11', target: { relation: 'newer' } } })
  })

  it('AC-010: never asks a node to update by itself, however long the page stays open', async () => {
    answers = [{ status: 200, body: status('1.5.11') }]
    const store = useNodeServerUpdateStore()
    store.watch(KEY, ADDRESS)
    await advance(30 * 60_000)
    await store.refresh(KEY)
    expect(calls.filter((call) => call.method !== 'GET')).toEqual([])
  })

  it('an update from the button: POST with this app version, then 2 s polls, "Restarting…" while down, then the new version', async () => {
    answers = [{ status: 200, body: status('1.5.11') }]
    const store = useNodeServerUpdateStore()
    store.watch(KEY, ADDRESS)
    await advance(0)
    answers = [
      { status: 202, body: { accepted: true, version: '1.5.12' } },
      { status: 200, body: status('1.5.11', running('downloading')) },
      { status: 200, body: status('1.5.11', running('restarting')) },
      'down', 'down',
      { status: 200, body: status('1.5.12', { ...running('confirming'), state: 'succeeded', message: 'Updated to 1.5.12.' }) },
    ]
    await store.requestUpdate(KEY)
    expect(calls[1]).toEqual({ method: 'POST', url: `${ADDRESS}/rest/node-update`, body: { version: '1.5.12' } })
    expect(store.entries[KEY]).toMatchObject({ followed: true, refusal: null, status: { update: { step: 'downloading' } } })
    await advance(NODE_UPDATE_POLL_MS)
    expect(store.entries[KEY]!.status!.update!.step).toBe('restarting')
    await advance(NODE_UPDATE_POLL_MS)
    expect(store.entries[KEY]!.connection).toBe('restarting')
    await advance(NODE_UPDATE_POLL_MS * 2)
    expect(store.entries[KEY]).toMatchObject({ connection: 'ok', status: { version: '1.5.12', update: { state: 'succeeded' } } })
    const getsSoFar = calls.length
    await advance(60_000)
    expect(calls.length).toBe(getsSoFar)
  })

  it('down for longer than 5 minutes: "Not reachable", asked every 10 s, and it recovers by itself', async () => {
    answers = [{ status: 200, body: status('1.5.11', running('restarting')) }]
    const store = useNodeServerUpdateStore()
    store.watch(KEY, ADDRESS)
    await advance(0)
    answers = ['down']
    await advance(NODE_UPDATE_RESTART_GRACE_MS - NODE_UPDATE_POLL_MS)
    expect(store.entries[KEY]!.connection).toBe('restarting')
    await advance(NODE_UPDATE_POLL_MS * 2)
    expect(store.entries[KEY]!.connection).toBe('unreachable')
    const before = calls.length
    await advance(NODE_UPDATE_SLOW_POLL_MS * 3)
    expect(calls.length - before).toBe(3)
    answers = [{ status: 200, body: status('1.5.12') }]
    await advance(NODE_UPDATE_SLOW_POLL_MS)
    expect(store.entries[KEY]).toMatchObject({ connection: 'ok', status: { version: '1.5.12' } })
  })

  it('a refused request is kept with its code and message, and nothing polls', async () => {
    answers = [{ status: 200, body: status('1.5.11') }]
    const store = useNodeServerUpdateStore()
    store.watch(KEY, ADDRESS)
    await advance(0)
    answers = [{ status: 409, body: { refused: 'NO_PACKAGES_VOLUME', message: 'Reinstall the launcher.' } }, { status: 200, body: status('1.5.11') }]
    await store.requestUpdate(KEY)
    expect(store.entries[KEY]).toMatchObject({ followed: false, refusal: { code: 'NO_PACKAGES_VOLUME', message: 'Reinstall the launcher.' } })
    const before = calls.length
    await advance(60_000)
    expect(calls.length).toBe(before)
  })

  it('a node that does not answer before any update is "Not reachable" and is not polled (N-4)', async () => {
    answers = ['down']
    const store = useNodeServerUpdateStore()
    store.watch(KEY, ADDRESS)
    await advance(60_000)
    expect(store.entries[KEY]!.connection).toBe('unreachable')
    expect(calls).toHaveLength(1)
  })

  it('N-4: a starter that does not answer during an update keeps the 2 s pace', async () => {
    answers = [{ status: 200, body: status('1.5.11', running('preparing')) }]
    const store = useNodeServerUpdateStore()
    store.watch(KEY, ADDRESS)
    await advance(0)
    answers = [{ status: 200, body: { inPlaceUpdate: 'error', version: null, message: "The node's starter did not answer" } }]
    await advance(NODE_UPDATE_POLL_MS)
    await advance(NODE_UPDATE_POLL_MS)
    expect(store.entries[KEY]).toMatchObject({ connection: 'ok', status: { inPlaceUpdate: 'error' } })
    expect(calls).toHaveLength(3)
  })

  it('without this app version (a browser window) it asks without a target and offers no update', async () => {
    useAppUpdateStore().currentVersion = ''
    answers = [{ status: 200, body: { inPlaceUpdate: 'available', version: '1.5.11', update: idle } }]
    const store = useNodeServerUpdateStore()
    store.watch(KEY, ADDRESS)
    await advance(0)
    await store.requestUpdate(KEY)
    expect(calls).toEqual([{ method: 'GET', url: `${ADDRESS}/rest/node-update` }])
  })

  it('unwatch stops the polling', async () => {
    answers = [{ status: 200, body: status('1.5.11', running('downloading')) }]
    const store = useNodeServerUpdateStore()
    store.watch(KEY, ADDRESS)
    await advance(0)
    store.unwatch(KEY)
    await advance(60_000)
    expect(calls).toHaveLength(1)
    expect(store.entries[KEY]).toBeUndefined()
  })
})
