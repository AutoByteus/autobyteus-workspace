import { describe, expect, it, vi } from 'vitest'
import { probeNodeIdentity, windowFailureReason } from '../nodeIdentityProbe'

/** one-nodes-tab DS-001/DS-002: the window's identity probe of `/rest/remote-access/status`, with a plain cause. */

const SRV = 'srv_ibJioK7nAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
const answer = (body: unknown, ok = true) => vi.fn(async (_url: string, _init?: RequestInit) => ({ ok, json: async () => body }) as unknown as Response)

describe('probeNodeIdentity', () => {
  it('reads the node ID from the public status route of the address', async () => {
    const fetchImpl = answer({ nodeId: SRV })
    await expect(probeNodeIdentity('localhost:8001/', { fetchImpl })).resolves.toEqual({ ok: true, nodeId: SRV })
    expect(fetchImpl.mock.calls[0]![0]).toBe('http://localhost:8001/rest/remote-access/status')
  })

  it("autobyteus-290 N-910: a node whose identity waits for its data migration (503 with the code) says so; another 503 is not AutoByteus", async () => {
    const pending = vi.fn(async () => ({ ok: false, status: 503,
      json: async () => ({ code: 'NODE_IDENTITY_NOT_MIGRATED', message: "This node's identity is waiting for its data migration." }) }) as unknown as Response)
    await expect(probeNodeIdentity('http://localhost:8001', { fetchImpl: pending })).resolves.toEqual({ ok: false, cause: 'identity_pending' })
    const busy = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }) as unknown as Response)
    await expect(probeNodeIdentity('http://web', { fetchImpl: busy })).resolves.toEqual({ ok: false, cause: 'not_autobyteus' })
  })

  it('something that answers without an identity is not an AutoByteus node', async () => {
    await expect(probeNodeIdentity('http://web', { fetchImpl: answer({ hello: 1 }) })).resolves.toEqual({ ok: false, cause: 'not_autobyteus' })
    await expect(probeNodeIdentity('http://web', { fetchImpl: answer({}, false) })).resolves.toEqual({ ok: false, cause: 'not_autobyteus' })
    const page = vi.fn(async () => ({ ok: true, json: async () => { throw new SyntaxError('Unexpected token <') } }) as unknown as Response)
    await expect(probeNodeIdentity('http://web', { fetchImpl: page })).resolves.toEqual({ ok: false, cause: 'not_autobyteus' })
  })

  it('no answer: refused on a loopback address, timeout, otherwise unreachable (a browser does not say more)', async () => {
    const failing = vi.fn(async () => { throw new TypeError('Failed to fetch') })
    await expect(probeNodeIdentity('http://localhost:8005', { fetchImpl: failing })).resolves.toEqual({ ok: false, cause: 'refused' })
    await expect(probeNodeIdentity('http://192.168.2.77:29695', { fetchImpl: failing })).resolves.toEqual({ ok: false, cause: 'unreachable' })
    const slow = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason))
    }))
    await expect(probeNodeIdentity('http://10.255.255.1:8000', { fetchImpl: slow as never, timeoutMs: 10 })).resolves.toEqual({ ok: false, cause: 'timeout' })
  })

  it('windowFailureReason reads a timeout by its name', () => {
    expect(windowFailureReason(Object.assign(new Error('x'), { name: 'TimeoutError' }), 'http://nas')).toBe('timeout')
    expect(windowFailureReason(new TypeError('Failed to fetch'), 'http://[::1]:8000')).toBe('refused')
  })
})
