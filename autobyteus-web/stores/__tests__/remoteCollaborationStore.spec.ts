import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { apolloClientMock } = vi.hoisted(() => ({ apolloClientMock: { query: vi.fn(), mutate: vi.fn() } }))

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn(() => apolloClientMock) }))

import { useRemoteCollaborationStore } from '../remoteCollaborationStore'
import { NodeSettingsError } from '~/utils/nodeSettingsError'

const SRV_B = 'srv_peerBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
const peer = { nodeId: SRV_B, name: 'docker', address: 'http://localhost:29700', machine: null, account: null, relation: 'own' as const, sandbox: false,
  addedAt: '2026-10-20T09:00:00.000Z', paired: true }

/** one-nodes-tab AR-005: the bound node's peers, the one write path for them; refusals keep the server's details. */
describe('remoteCollaborationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads the peers of the bound node; a failed load throws and keeps the last list', async () => {
    apolloClientMock.query.mockResolvedValueOnce({ data: { peerNodes: [peer] } })
    const store = useRemoteCollaborationStore()
    await store.load()
    expect(store.peers).toEqual([peer])
    apolloClientMock.query.mockRejectedValueOnce(new Error('offline'))
    await expect(store.load()).rejects.toThrow('offline')
    expect(store.peers).toEqual([peer])
  })

  it('NAS-19 NAS-48 pairs with the node at an address with its grant, and keeps the paired peer in the list (autobyteus-661)', async () => {
    const store = useRemoteCollaborationStore()
    apolloClientMock.mutate.mockResolvedValueOnce({ data: { pairWithNode: { state: 'paired', requestId: null, peer } } })
    await expect(store.pair({ address: 'http://localhost:29700', grant: 'grant-1', nodeId: SRV_B, name: 'docker' })).resolves.toEqual({ state: 'paired', peer })
    expect(apolloClientMock.mutate.mock.calls[0]![0].variables).toEqual({ address: 'http://localhost:29700', addresses: null, grant: 'grant-1', nodeId: SRV_B, name: 'docker' })
    expect(store.peers).toEqual([peer])
    // Without a grant the other owner decides: nothing is listed yet.
    apolloClientMock.mutate.mockResolvedValueOnce({ data: { pairWithNode: { state: 'waiting', requestId: 'req-1', peer: null } } })
    await expect(store.pair({ address: 'http://192.168.1.20:8000' })).resolves.toEqual({ state: 'waiting', requestId: 'req-1' })
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
    apolloClientMock.mutate.mockResolvedValueOnce({ errors: [{ message: 'no answer', extensions: {
      code: 'PEER_UNREACHABLE', reason: 'refused', address: 'http://127.0.0.1:29695', loopbackInContainer: true } }] })
    const unresolved = await store.pair({ address: 'http://127.0.0.1:29695', grant: 'grant-1' }).catch((e) => e)
    expect(unresolved.failure).toEqual({ code: 'PEER_UNREACHABLE', message: 'no answer', reason: 'refused', address: 'http://127.0.0.1:29695',
      loopbackInContainer: true })
    expect(store.peers).toEqual([peer])
  })

  it('renames, changes the address of and unpairs a peer in place', async () => {
    const store = useRemoteCollaborationStore()
    store.peers = [peer]
    apolloClientMock.mutate.mockResolvedValueOnce({ data: { renamePeerNode: { ...peer, name: 'nas' } } })
    await store.rename(SRV_B, 'nas')
    expect(store.peers[0]!.name).toBe('nas')
    apolloClientMock.mutate.mockResolvedValueOnce({ data: { changePeerAddress: { ...peer, name: 'nas', address: 'http://host.docker.internal:8001' } } })
    await store.changeAddress(SRV_B, 'http://host.docker.internal:8001')
    expect(apolloClientMock.mutate.mock.calls[1]![0].variables).toEqual({ nodeId: SRV_B, address: 'http://host.docker.internal:8001' })
    expect(store.peers[0]!.address).toBe('http://host.docker.internal:8001')
    apolloClientMock.mutate.mockResolvedValueOnce({ data: { unpairPeerNode: true } })
    await store.unpair(SRV_B)
    expect(store.peers).toEqual([])
  })
})
