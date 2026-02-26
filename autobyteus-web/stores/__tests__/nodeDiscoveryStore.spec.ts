import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNodeDiscoveryStore } from '../nodeDiscoveryStore'

const {
  nodeStoreMock,
  windowNodeContextStoreMock,
  federatedCatalogStoreMock,
  apolloQueryMock,
} = vi.hoisted(() => {
  const nodeStore = {
    initialized: true,
    nodes: [
      {
        id: 'embedded-local',
        name: 'Embedded Node',
        baseUrl: 'http://localhost:29695',
        nodeType: 'embedded',
        registrationSource: 'embedded',
        isSystem: true,
        createdAt: '2026-02-13T00:00:00.000Z',
        updatedAt: '2026-02-13T00:00:00.000Z',
      },
      {
        id: 'stale-node',
        name: 'Stale Node',
        baseUrl: 'http://10.0.0.33:8000',
        nodeType: 'remote',
        registrationSource: 'discovered',
        isSystem: false,
        createdAt: '2026-02-13T00:00:00.000Z',
        updatedAt: '2026-02-13T00:00:00.000Z',
      },
    ],
    initializeRegistry: vi.fn().mockResolvedValue(undefined),
    upsertDiscoveredNode: vi.fn().mockResolvedValue(true),
    pruneDiscoveredNodes: vi.fn().mockResolvedValue(1),
  }

  const windowContextStore = {
    lastReadyError: null as string | null,
    waitForBoundBackendReady: vi.fn().mockResolvedValue(true),
  }

  const federatedCatalogStore = {
    reloadCatalog: vi.fn().mockResolvedValue(undefined),
  }

  const queryMock = vi.fn()

  return {
    nodeStoreMock: nodeStore,
    windowNodeContextStoreMock: windowContextStore,
    federatedCatalogStoreMock: federatedCatalogStore,
    apolloQueryMock: queryMock,
  }
})

vi.mock('~/stores/nodeStore', () => ({
  useNodeStore: () => nodeStoreMock,
}))

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}))

vi.mock('~/stores/federatedCatalogStore', () => ({
  useFederatedCatalogStore: () => federatedCatalogStoreMock,
}))

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({ query: apolloQueryMock }),
}))

describe('nodeDiscoveryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    nodeStoreMock.initialized = true
    nodeStoreMock.nodes = [
      {
        id: 'embedded-local',
        name: 'Embedded Node',
        baseUrl: 'http://localhost:29695',
        nodeType: 'embedded',
        registrationSource: 'embedded',
        isSystem: true,
        createdAt: '2026-02-13T00:00:00.000Z',
        updatedAt: '2026-02-13T00:00:00.000Z',
      },
      {
        id: 'stale-node',
        name: 'Stale Node',
        baseUrl: 'http://10.0.0.33:8000',
        nodeType: 'remote',
        registrationSource: 'discovered',
        isSystem: false,
        createdAt: '2026-02-13T00:00:00.000Z',
        updatedAt: '2026-02-13T00:00:00.000Z',
      },
    ]

    apolloQueryMock.mockResolvedValue({
      data: {
        discoveredNodeCatalog: [
          {
            nodeId: 'fresh-node',
            nodeName: 'Fresh Node',
            baseUrl: 'http://10.0.0.21:8000',
            status: 'ready',
            lastSeenAtIso: '2026-02-13T00:00:00.000Z',
          },
        ],
      },
    })
  })

  it('syncs discovered peers and prunes stale discovered entries from current registry state', async () => {
    const store = useNodeDiscoveryStore()

    await store.syncOnce()

    expect(apolloQueryMock).toHaveBeenCalledTimes(1)
    expect(nodeStoreMock.upsertDiscoveredNode).toHaveBeenCalledWith(
      expect.objectContaining({
        nodeId: 'fresh-node',
      }),
    )
    expect(nodeStoreMock.pruneDiscoveredNodes).toHaveBeenCalledWith(['stale-node'])
    expect(store.discoveredNodeIds).toEqual(['fresh-node'])
    expect(federatedCatalogStoreMock.reloadCatalog).toHaveBeenCalledTimes(1)
    expect(store.lastError).toBeNull()
  })

  it('starts auto-registration once when already running', async () => {
    const store = useNodeDiscoveryStore()

    await store.startAutoRegistration({ intervalMs: 60_000 })
    await store.startAutoRegistration({ intervalMs: 60_000 })

    expect(apolloQueryMock).toHaveBeenCalledTimes(1)
    expect(store.running).toBe(true)

    store.stopAutoRegistration()
    expect(store.running).toBe(false)
  })
})
