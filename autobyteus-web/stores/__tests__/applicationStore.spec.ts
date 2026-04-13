
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const {
  apolloClientMock,
  backendReadyMock,
  mockRuntimeConfig,
} = vi.hoisted(() => ({
  apolloClientMock: {
    query: vi.fn(),
  },
  backendReadyMock: {
    waitForBoundBackendReady: vi.fn(),
    lastReadyError: null as string | null,
  },
  mockRuntimeConfig: {
    public: {
      enableApplications: true,
    },
  },
}))

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(() => apolloClientMock),
}))

vi.mock('~/graphql/queries/applicationQueries', () => ({
  ListApplications: {},
  GetApplicationById: {},
}))

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => backendReadyMock,
}))

mockNuxtImport('useRuntimeConfig', () => () => mockRuntimeConfig)

import { useApplicationStore } from '../applicationStore'

describe('applicationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockRuntimeConfig.public.enableApplications = true
    backendReadyMock.lastReadyError = null
    backendReadyMock.waitForBoundBackendReady.mockResolvedValue(true)
    vi.clearAllMocks()
  })

  it('fetches and sorts applications from the API', async () => {
    const store = useApplicationStore()
    apolloClientMock.query.mockResolvedValue({
      data: {
        listApplications: [
          { id: 'b', name: 'Beta' },
          { id: 'a', name: 'Alpha' },
        ],
      },
    })

    const result = await store.fetchApplications()

    expect(backendReadyMock.waitForBoundBackendReady).toHaveBeenCalledOnce()
    expect(apolloClientMock.query).toHaveBeenCalledOnce()
    expect(result.map((entry: any) => entry.id)).toEqual(['a', 'b'])
    expect(store.applications.map((entry: any) => entry.id)).toEqual(['a', 'b'])
    expect(store.hasFetched).toBe(true)
    expect(store.loading).toBe(false)
  })

  it('returns cached applications when already fetched and force is false', async () => {
    const store = useApplicationStore()
    store.applications = [{ id: 'app-1', name: 'App 1' }] as any
    store.hasFetched = true

    const result = await store.fetchApplications()

    expect(result).toEqual(store.applications)
    expect(backendReadyMock.waitForBoundBackendReady).not.toHaveBeenCalled()
    expect(apolloClientMock.query).not.toHaveBeenCalled()
  })

  it('fetches one application by id and upserts it into the catalog', async () => {
    const store = useApplicationStore()
    store.applications = [{ id: 'app-1', name: 'App 1' }] as any
    apolloClientMock.query.mockResolvedValue({
      data: {
        application: {
          id: 'app-2',
          name: 'App 2',
          entryHtmlAssetPath: '/application-bundles/app-2/assets/ui/index.html',
          localApplicationId: 'app-2',
          packageId: 'pkg',
          writable: true,
          runtimeTarget: {
            kind: 'AGENT_TEAM',
            localId: 'team',
            definitionId: 'team-id',
          },
        },
      },
    })

    const result = await store.fetchApplicationById('app-2', true)

    expect(backendReadyMock.waitForBoundBackendReady).toHaveBeenCalledOnce()
    expect(apolloClientMock.query).toHaveBeenCalledOnce()
    expect(result?.id).toBe('app-2')
    expect(store.getApplicationById('app-2')?.name).toBe('App 2')
    expect(store.applications.map((entry: any) => entry.id)).toEqual(['app-1', 'app-2'])
  })

  it('clears catalog state when applications are disabled', async () => {
    const store = useApplicationStore()
    store.applications = [{ id: 'app-1', name: 'App 1' }] as any
    store.hasFetched = true
    mockRuntimeConfig.public.enableApplications = false

    const result = await store.fetchApplications()

    expect(result).toEqual([])
    expect(store.applications).toEqual([])
    expect(store.hasFetched).toBe(false)
    expect(apolloClientMock.query).not.toHaveBeenCalled()
  })
})
