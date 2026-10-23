import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { apolloClientMock } = vi.hoisted(() => ({ apolloClientMock: { query: vi.fn(), mutate: vi.fn() } }))

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn(() => apolloClientMock) }))

import { useRemoteCollaborationStore } from '../remoteCollaborationStore'
import { NodeSettingsError } from '~/utils/nodeSettingsError'

const SRV_B = 'srv_peerBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
const peer = { nodeId: SRV_B, name: 'docker', baseUrl: 'http://localhost:29700', addedAt: '2026-10-20T09:00:00.000Z' }

/** one-nodes-tab AR-005: the bound node's peers, the one write path for them; refusals keep the server's details. */
describe('remoteCollaborationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads the peers of the bound node, and keeps a load failure', async () => {
    apolloClientMock.query.mockResolvedValueOnce({ data: { peerNodes: [peer] } })
    const store = useRemoteCollaborationStore()
    await store.load()
    expect(store.peers).toEqual([peer])
    expect(store.loadError).toBeNull()
    apolloClientMock.query.mockRejectedValueOnce(new Error('offline'))
    await store.load()
    expect(store.loadError).toBe('offline')
    expect(store.peers).toEqual([peer])
  })

  it('adds a peer with the node it means, and keeps it in the list', async () => {
    const store = useRemoteCollaborationStore()
    apolloClientMock.mutate.mockResolvedValueOnce({ data: { addPeerNode: peer } })
    await expect(store.add({ nodeId: SRV_B, name: 'docker', baseUrl: 'http://localhost:29700' })).resolves.toEqual(peer)
    expect(apolloClientMock.mutate.mock.calls[0]![0].variables).toEqual({ input: { nodeId: SRV_B, name: 'docker', baseUrl: 'http://localhost:29700' } })
    expect(store.peers).toEqual([peer])
  })

  it('throws a refusal with the server code and details, and changes nothing', async () => {
    const store = useRemoteCollaborationStore()
    store.peers = [peer]
    apolloClientMock.mutate.mockResolvedValueOnce({ errors: [{ message: "Another peer is already named 'nas'.", extensions: { code: 'PEER_NAME_TAKEN' } }] })
    const error = await store.rename(SRV_B, 'nas').catch((e) => e)
    expect(error).toBeInstanceOf(NodeSettingsError)
    expect(error.failure).toMatchObject({ code: 'PEER_NAME_TAKEN' })
    expect(store.peers).toEqual([peer])
    apolloClientMock.query.mockResolvedValueOnce({ errors: [{ message: 'no address', extensions: {
      code: 'PEER_UNREACHABLE', reason: 'refused', address: 'http://127.0.0.1:29695', loopbackInContainer: true,
      attempts: [{ address: 'http://127.0.0.1:29695', result: 'refused' }] } }] })
    const unresolved = await store.resolveAddress(SRV_B, ['http://127.0.0.1:29695']).catch((e) => e)
    expect(unresolved.failure).toEqual({ code: 'PEER_UNREACHABLE', message: 'no address', reason: 'refused', address: 'http://127.0.0.1:29695',
      loopbackInContainer: true, attempts: [{ address: 'http://127.0.0.1:29695', result: 'refused' }] })
  })

  it('renames, changes the address of and removes a peer in place; reads its own candidates and resolves an address', async () => {
    const store = useRemoteCollaborationStore()
    store.peers = [peer]
    apolloClientMock.mutate.mockResolvedValueOnce({ data: { renamePeerNode: { ...peer, name: 'nas' } } })
    await store.rename(SRV_B, 'nas')
    expect(store.peers[0]!.name).toBe('nas')
    apolloClientMock.mutate.mockResolvedValueOnce({ data: { changePeerAddress: { ...peer, name: 'nas', baseUrl: 'http://host.docker.internal:8001' } } })
    await store.changeAddress(SRV_B, 'http://host.docker.internal:8001')
    expect(store.peers[0]!.baseUrl).toBe('http://host.docker.internal:8001')
    apolloClientMock.query.mockResolvedValueOnce({ data: { peerAddressCandidates: ['http://127.0.0.1:29695', 'http://host.docker.internal:29695'] } })
    await expect(store.addressCandidates()).resolves.toEqual(['http://127.0.0.1:29695', 'http://host.docker.internal:29695'])
    apolloClientMock.query.mockResolvedValueOnce({ data: { resolvePeerAddress: 'http://localhost:8001' } })
    await expect(store.resolveAddress(SRV_B, ['http://localhost:8001'])).resolves.toBe('http://localhost:8001')
    apolloClientMock.mutate.mockResolvedValueOnce({ data: { removePeerNode: true } })
    await store.remove(SRV_B)
    expect(store.peers).toEqual([])
  })
})
