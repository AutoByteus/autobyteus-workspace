import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { apolloClientMock } = vi.hoisted(() => ({ apolloClientMock: { query: vi.fn(), mutate: vi.fn() } }))

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn(() => apolloClientMock) }))

import { useRemoteCollaborationStore } from '../remoteCollaborationStore'

const peer = { nodeId: 'srv_b', name: 'docker', baseUrl: 'http://localhost:29700', addedAt: '2026-10-20T09:00:00.000Z' }
const published = {
  agentDefinitionId: 'publisher', definitionName: 'Publisher', address: '/publisher', runtimeKind: 'claude_agent_sdk',
  llmModelIdentifier: 'sonnet', llmConfig: null, workspaceRootPath: '/work', autoExecuteTools: false, publishedAt: '2026-10-20T09:05:00.000Z',
}
const launch = { agentDefinitionId: 'publisher', runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'sonnet', llmConfig: null, workspaceRootPath: '/work', autoExecuteTools: false }

describe('remoteCollaborationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads the peers and published agents of the bound node', async () => {
    apolloClientMock.query.mockResolvedValueOnce({ data: { peerNodes: [peer], publishedAgents: [published] } })
    const store = useRemoteCollaborationStore()
    await store.load()
    expect(store.peers).toEqual([peer])
    expect(store.publishedAgents).toEqual([published])
    expect(store.error).toBeNull()
  })

  it('adds a peer, then reloads; a refusal keeps the lists and shows the server reason', async () => {
    const store = useRemoteCollaborationStore()
    apolloClientMock.mutate.mockResolvedValueOnce({ data: { addPeerNode: peer } })
    apolloClientMock.query.mockResolvedValueOnce({ data: { peerNodes: [peer], publishedAgents: [] } })
    await expect(store.addPeer({ baseUrl: 'http://localhost:29700', name: 'docker' })).resolves.toBe(true)
    expect(apolloClientMock.mutate).toHaveBeenCalledWith(expect.objectContaining({ variables: { input: { baseUrl: 'http://localhost:29700', name: 'docker' } } }))
    expect(store.peers).toEqual([peer])

    apolloClientMock.mutate.mockRejectedValueOnce(new Error('http://web is not an AutoByteus node.'))
    await expect(store.addPeer({ baseUrl: 'http://web', name: 'web' })).resolves.toBe(false)
    expect(store.error).toBe('http://web is not an AutoByteus node.')
    expect(store.errorScope).toBe('peers')
    expect(store.peers).toEqual([peer])
    expect(store.saving).toBe(false)
  })

  it('renames and removes a peer in place', async () => {
    const store = useRemoteCollaborationStore()
    store.peers = [peer]
    apolloClientMock.mutate.mockResolvedValueOnce({ data: { renamePeerNode: { ...peer, name: 'nas' } } })
    await store.renamePeer('srv_b', 'nas')
    expect(store.peers[0]!.name).toBe('nas')
    apolloClientMock.mutate.mockResolvedValueOnce({ data: { removePeerNode: true } })
    await store.removePeer('srv_b')
    expect(store.peers).toEqual([])
  })

  it('publishes, updates and unpublishes, taking the server list each time', async () => {
    const store = useRemoteCollaborationStore()
    apolloClientMock.mutate.mockResolvedValueOnce({ data: { publishAgent: [published] } })
    await store.publishAgent(launch)
    expect(store.publishedAgents).toEqual([published])
    apolloClientMock.mutate.mockResolvedValueOnce({ data: { updatePublishedAgent: [{ ...published, autoExecuteTools: true }] } })
    await store.updatePublishedAgent({ ...launch, autoExecuteTools: true })
    expect(store.publishedAgents[0]!.autoExecuteTools).toBe(true)
    apolloClientMock.mutate.mockResolvedValueOnce({ data: { unpublishAgent: [] } })
    await store.unpublishAgent('publisher')
    expect(store.publishedAgents).toEqual([])
  })
})
