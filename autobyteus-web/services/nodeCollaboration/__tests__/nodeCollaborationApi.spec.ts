import { describe, expect, it, vi } from 'vitest'
import { createNodeCollaborationApi } from '../nodeCollaborationApi'
import { NodeSettingsError } from '~/utils/nodeSettingsError'

/** one-nodes-tab: the other node's settings API over a direct client; its refusals and this window's failures. */

const client = () => ({ query: vi.fn(), mutate: vi.fn() })

describe('nodeCollaborationApi', () => {
  it('reads the other node\'s switch and availability', async () => {
    const c = client()
    const api = createNodeCollaborationApi('http://localhost:8003', c as never)
    c.query.mockResolvedValueOnce({ data: { remoteCollaborationCapability: { enabled: false } } })
    await expect(api.capability()).resolves.toEqual({ enabled: false })
    c.query.mockResolvedValueOnce({ data: { peerNodeAvailability: { available: false, refusalCode: 'PEER_UNREACHABLE', unreachableReason: 'not_found' } } })
    await expect(api.peerNodeAvailability('srv_a')).resolves.toEqual({ available: false, code: 'PEER_UNREACHABLE', reason: 'not_found' })
    c.query.mockResolvedValueOnce({ data: { peerNodeAvailability: { available: true, refusalCode: null, unreachableReason: null } } })
    await expect(api.peerNodeAvailability('srv_a')).resolves.toEqual({ available: true })
  })

  it('writes on the other node with the same operations its own window uses', async () => {
    const c = client()
    const api = createNodeCollaborationApi('http://localhost:8003', c as never)
    c.mutate.mockResolvedValueOnce({ data: { setRemoteCollaborationEnabled: { enabled: true } } })
    await api.setEnabled(true)
    expect(c.mutate.mock.calls[0]![0].variables).toEqual({ enabled: true })
    // autobyteus-437: the other node creates the invite this node then accepts.
    c.mutate.mockResolvedValueOnce({ data: { createPeerInvite: { inviteText: 'abpi_x', expiresAt: '2026-11-08T10:10:00.000Z' } } })
    await expect(api.createInvite()).resolves.toEqual({ inviteText: 'abpi_x', expiresAt: '2026-11-08T10:10:00.000Z' })
  })

  it('a refusal there keeps its code and details; a request this window could not deliver is PEER_UNREACHABLE with the window\'s reason', async () => {
    const c = client()
    const api = createNodeCollaborationApi('http://localhost:8003', c as never)
    c.mutate.mockResolvedValueOnce({ errors: [{ message: 'off', extensions: { code: 'REMOTE_COLLABORATION_OFF' } }] })
    const refused = await api.createInvite().catch((e) => e)
    expect(refused).toBeInstanceOf(NodeSettingsError)
    expect(refused.failure).toMatchObject({ code: 'REMOTE_COLLABORATION_OFF' })
    c.mutate.mockRejectedValueOnce(Object.assign(new Error('Failed to fetch'), { networkError: new TypeError('Failed to fetch') }))
    const down = await api.removePeer('srv_a').catch((e) => e)
    expect(down.failure).toEqual({ code: 'PEER_UNREACHABLE', message: 'http://localhost:8003 could not be reached.', reason: 'refused', address: 'http://localhost:8003' })
  })
})
