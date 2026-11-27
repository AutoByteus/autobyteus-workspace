import { describe, expect, it, vi } from 'vitest'
import { createNodeCollaborationApi } from '../nodeCollaborationApi'
import { NodeSettingsError } from '~/utils/nodeSettingsError'

/** one-nodes-tab: the other node's settings API over a direct client; its refusals and this window's failures. */

const client = () => ({ query: vi.fn(), mutate: vi.fn() })

describe('nodeCollaborationApi', () => {
  it('reads the other node\'s peers and availability', async () => {
    const c = client()
    const api = createNodeCollaborationApi('http://localhost:8003', c as never)
    c.query.mockResolvedValueOnce({ data: { peerNodes: [] } })
    await expect(api.peers()).resolves.toEqual([])
    c.query.mockResolvedValueOnce({ data: { peerNodeAvailability: { available: false, refusalCode: 'PEER_UNREACHABLE', unreachableReason: 'not_found' } } })
    await expect(api.peerNodeAvailability('srv_a')).resolves.toEqual({ available: false, code: 'PEER_UNREACHABLE', reason: 'not_found' })
    c.query.mockResolvedValueOnce({ data: { peerNodeAvailability: { available: true, refusalCode: null, unreachableReason: null } } })
    await expect(api.peerNodeAvailability('srv_a')).resolves.toEqual({ available: true })
  })

  it('writes on the other node with the same operations its own window uses', async () => {
    const c = client()
    const api = createNodeCollaborationApi('http://localhost:8003', c as never)
    // autobyteus-661: the other node makes the grant this node then pairs with (an own node, named for this node).
    c.mutate.mockResolvedValueOnce({ data: { createPairingGrant: { grant: 'grant-1', expiresAt: '2026-11-08T10:10:00.000Z', addresses: ['http://192.168.2.31:8003'] } } })
    await expect(api.createGrant({ forNodeId: 'srv_a', nameForAsker: 'My Mac' })).resolves.toEqual({ grant: 'grant-1', expiresAt: '2026-11-08T10:10:00.000Z',
      addresses: ['http://192.168.2.31:8003'] })
    expect(c.mutate.mock.calls[0]![0].variables).toEqual({ relation: 'own', forNodeId: 'srv_a', forMachine: null, nameForAsker: 'My Mac' })
    c.mutate.mockResolvedValueOnce({ data: { unpairPeerNode: true } })
    await api.unpairPeer('srv_a')
    expect(c.mutate.mock.calls[1]![0].variables).toEqual({ nodeId: 'srv_a' })
  })

  it('a refusal there keeps its code and details; a request this window could not deliver is PEER_UNREACHABLE with the window\'s reason', async () => {
    const c = client()
    const api = createNodeCollaborationApi('http://localhost:8003', c as never)
    c.mutate.mockResolvedValueOnce({ errors: [{ message: 'not permitted', extensions: { code: 'NODE_ROUTE_NOT_PERMITTED' } }] })
    const refused = await api.createGrant({ forNodeId: 'srv_a', nameForAsker: 'My Mac' }).catch((e) => e)
    expect(refused).toBeInstanceOf(NodeSettingsError)
    expect(refused.failure).toMatchObject({ code: 'NODE_ROUTE_NOT_PERMITTED' })
    c.mutate.mockRejectedValueOnce(Object.assign(new Error('Failed to fetch'), { networkError: new TypeError('Failed to fetch') }))
    const down = await api.unpairPeer('srv_a').catch((e) => e)
    expect(down.failure).toEqual({ code: 'PEER_UNREACHABLE', message: 'http://localhost:8003 could not be reached.', reason: 'refused', address: 'http://localhost:8003' })
  })
})
