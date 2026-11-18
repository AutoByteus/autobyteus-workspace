import { describe, expect, it, vi } from 'vitest'
import type { NodeEntry } from '../../nodeRegistryTypes'
import { NodeConnectService, type NodeAccessFetch } from '../nodeConnectService'
import { NodeCredentialStore } from '../nodeCredentialStore'

vi.mock('../../logger', () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }))

const node = (id: string, baseUrl: string, nodeType: NodeEntry['nodeType'] = 'remote'): NodeEntry =>
  ({ id, name: id, baseUrl, nodeType, createdAt: '', updatedAt: '' })
const NODES = [node('embedded-local', 'http://127.0.0.1:29695', 'embedded'), node('docker', 'http://localhost:8001')]
const memoryStore = () => new NodeCredentialStore('/nonexistent/node-credentials.json', {
  isEncryptionAvailable: () => false, encryptString: () => Buffer.alloc(0), decryptString: () => '{}',
})
const respond = (status: number, body: unknown) => Promise.resolve({ status, json: async () => body })

const service = (fetch: NodeAccessFetch, store = memoryStore()) => {
  const attacher = { setCredentials: vi.fn() }
  const onChange = vi.fn()
  return {
    store, attacher, onChange,
    service: new NodeConnectService({
      store, attacher: attacher as never, nodes: () => NODES, fetch, desktopName: 'Test Desktop', onChange,
      embedded: () => ({ baseUrl: 'http://127.0.0.1:29695', credential: 'own_launch' }),
    }),
  }
}

describe('NodeConnectService (design DS-003)', () => {
  it('NAS-02 a remote node without a credential needs connecting; the embedded node is connected by its launch credential', () => {
    const f = service(vi.fn())
    expect(f.service.states()).toEqual({ 'embedded-local': 'connected', docker: 'needs_connecting' })
    f.service.refresh()
    expect(f.attacher.setCredentials).toHaveBeenCalledWith([
      { baseUrl: 'http://127.0.0.1:29695', credential: 'own_launch' },
      { baseUrl: 'http://localhost:29695', credential: 'own_launch' },
      { baseUrl: 'http://[::1]:29695', credential: 'own_launch' },
    ])
  })

  it('NAS-03 exchanges a setup code for an owner credential, keeps it in the main process and attaches it', async () => {
    const fetch = vi.fn<NodeAccessFetch>(() => respond(201, { credentialId: 'owncred_1', credential: 'own_docker' }))
    const f = service(fetch)
    await expect(f.service.connect('docker', ' code-from-node ')).resolves.toEqual({ ok: true, states: { 'embedded-local': 'connected', docker: 'connected' } })
    expect(fetch).toHaveBeenCalledWith('http://localhost:8001/rest/node-access/setup-exchanges', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ setupCode: 'code-from-node', desktopName: 'Test Desktop' }),
    }))
    expect(f.attacher.setCredentials).toHaveBeenLastCalledWith(expect.arrayContaining([{ baseUrl: 'http://localhost:8001', credential: 'own_docker' }]))
    expect(f.onChange).toHaveBeenLastCalledWith({ 'embedded-local': 'connected', docker: 'connected' })
    expect(f.service.credentialFor('http://localhost:8001/')).toBe('own_docker')
    expect(f.service.credentialFor('http://127.0.0.1:29695')).toBe('own_launch')
  })

  it('NAS-13 a wrong or used setup code is refused with the node\'s code; NAS-35 a refused network says so', async () => {
    const wrong = service(() => respond(401, { code: 'NODE_SETUP_CODE_INVALID', message: 'This setup code is not valid.' }))
    await expect(wrong.service.connect('docker', 'guess')).resolves.toEqual({ ok: false, code: 'NODE_SETUP_CODE_INVALID', message: 'This setup code is not valid.' })
    expect(wrong.service.states().docker).toBe('needs_connecting')
    const network = service(() => respond(403, { code: 'NODE_NETWORK_REFUSED', message: 'This node does not accept connections from your network.' }))
    await expect(network.service.connect('docker', 'code')).resolves.toMatchObject({ ok: false, code: 'NODE_NETWORK_REFUSED' })
  })

  it('NAS-33 Disconnect revokes this desktop\'s credential on the node and forgets it here', async () => {
    const fetch = vi.fn<NodeAccessFetch>()
      .mockImplementationOnce(() => respond(201, { credentialId: 'owncred_1', credential: 'own_docker' }))
      .mockImplementationOnce(() => respond(204, null))
    const f = service(fetch)
    await f.service.connect('docker', 'code')
    await expect(f.service.disconnect('docker')).resolves.toMatchObject({ ok: true, states: { docker: 'needs_connecting' } })
    expect(fetch).toHaveBeenLastCalledWith('http://localhost:8001/rest/node-access/owner-credentials/owncred_1', expect.objectContaining({
      method: 'DELETE', headers: { authorization: 'Bearer own_docker' },
    }))
    expect(f.service.credentialFor('http://localhost:8001')).toBeNull()
  })
})
