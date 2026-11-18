import { describe, expect, it, vi } from 'vitest'
import { probeNodeIdentity, windowFailureReason } from '../nodeIdentityProbe'

/** one-nodes-tab DS-001/DS-002: the window's identity probe of `/rest/remote-access/status`, with a plain cause. */

const SRV = 'srv_ibJioK7nAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
const answer = (body: unknown, ok = true) => vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => ({ ok, json: async () => body }) as unknown as Response)

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

  // autobyteus-435 REQ-003, AC-003-1, AC-003-3: a readable GET that fails (a refusal without CORS headers, as a node's
  // Host gate answers a name it refuses) is followed by one opaque GET of the same URL; only an answer to it changes
  // the cause.
  it('a failed readable GET whose opaque repeat is answered: something answers but refuses this window', async () => {
    const corsRefused = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.mode === 'no-cors') return { ok: false, status: 0, type: 'opaque' } as unknown as Response
      throw new TypeError('Failed to fetch')
    })
    await expect(probeNodeIdentity('http://office-mac.local:29695', { fetchImpl: corsRefused })).resolves.toEqual({ ok: false, cause: 'window_refused' })
    expect(corsRefused).toHaveBeenCalledTimes(2)
    expect(corsRefused.mock.calls.map(([url, init]) => [url, init?.mode ?? 'cors'])).toEqual([
      ['http://office-mac.local:29695/rest/remote-access/status', 'cors'],
      ['http://office-mac.local:29695/rest/remote-access/status', 'no-cors'],
    ])
    await expect(probeNodeIdentity('http://localhost:8005', { fetchImpl: corsRefused })).resolves.toEqual({ ok: false, cause: 'window_refused' })
  })

  it('nothing answers either request: the cause stays as before (refused on loopback, else unreachable)', async () => {
    const failing = vi.fn(async () => { throw new TypeError('Failed to fetch') })
    await expect(probeNodeIdentity('http://192.168.2.77:29695', { fetchImpl: failing })).resolves.toEqual({ ok: false, cause: 'unreachable' })
    await expect(probeNodeIdentity('http://localhost:8005', { fetchImpl: failing })).resolves.toEqual({ ok: false, cause: 'refused' })
    expect(failing).toHaveBeenCalledTimes(4)
  })

  // autobyteus-435 DEC-019, AC-003-1: the desktop window reads the Host gate's 403 (Electron does not subject its
  // `file://` requests to CORS; API-13), so it gives the exact cause, with no second request.
  it('a readable 403 REMOTE_ACCESS_HOST_REFUSED is host_refused; another 403 is not an AutoByteus node', async () => {
    const refusing = (code: string) => vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => ({ ok: false, status: 403,
      clone() { return this }, json: async () => ({ code, message: 'refused' }) }) as unknown as Response);
    const hostRefused = refusing('REMOTE_ACCESS_HOST_REFUSED');
    await expect(probeNodeIdentity('http://office-mac.local:29695', { fetchImpl: hostRefused })).resolves.toEqual({ ok: false, cause: 'host_refused' });
    expect(hostRefused).toHaveBeenCalledTimes(1);
    await expect(probeNodeIdentity('http://office-mac.local:29695', { fetchImpl: refusing('NODE_NETWORK_REFUSED') })).resolves.toEqual({ ok: false, cause: 'network_refused' });
    await expect(probeNodeIdentity('http://office-mac.local:29695', { fetchImpl: refusing('SOMETHING_ELSE') })).resolves.toEqual({ ok: false, cause: 'not_autobyteus' });
  });

  it('makes no second request after a success, a readable refusal or a timeout', async () => {
    const ok = answer({ nodeId: SRV })
    await probeNodeIdentity('http://office-mac.local:29695', { fetchImpl: ok })
    expect(ok).toHaveBeenCalledTimes(1)
    const notNode = answer({}, false)
    await probeNodeIdentity('http://office-mac.local:29695', { fetchImpl: notNode })
    expect(notNode).toHaveBeenCalledTimes(1)
    const slow = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason))
    }))
    await expect(probeNodeIdentity('http://office-mac.local:29695', { fetchImpl: slow as never, timeoutMs: 10 })).resolves.toEqual({ ok: false, cause: 'timeout' })
    expect(slow).toHaveBeenCalledTimes(1)
  })

  it('windowFailureReason reads a timeout by its name', () => {
    expect(windowFailureReason(Object.assign(new Error('x'), { name: 'TimeoutError' }), 'http://nas')).toBe('timeout')
    expect(windowFailureReason(new TypeError('Failed to fetch'), 'http://[::1]:8000')).toBe('refused')
  })
})
