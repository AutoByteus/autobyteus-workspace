import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

const { apolloClientMock } = vi.hoisted(() => ({
  apolloClientMock: {
    query: vi.fn(),
  },
}))

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(() => apolloClientMock),
}))

vi.mock('~/graphql/queries/applicationQueries', () => ({
  ListApplications: { kind: 'ListApplications' },
  GetApplicationById: { kind: 'GetApplicationById' },
}))

vi.mock('~/graphql/queries/applicationCapabilityQueries', () => ({
  ApplicationsCapabilityFields: { kind: 'ApplicationsCapabilityFields' },
  GetApplicationsCapability: { kind: 'GetApplicationsCapability' },
}))

vi.mock('~/graphql/mutations/applicationCapabilityMutations', () => ({
  SetApplicationsEnabled: { kind: 'SetApplicationsEnabled' },
}))

import { GetApplicationById, ListApplications } from '~/graphql/queries/applicationQueries'
import { GetApplicationsCapability } from '~/graphql/queries/applicationCapabilityQueries'
import { useApplicationsCapabilityStore } from '../applicationsCapabilityStore'
import { useApplicationStore, type ApplicationCatalogEntry } from '../applicationStore'
import { useWindowNodeContextStore } from '../windowNodeContextStore'

const buildCapability = (enabled: boolean, source: 'SERVER_SETTING' | 'INITIALIZED_FROM_DISCOVERED_APPLICATIONS' | 'INITIALIZED_EMPTY_CATALOG' = 'SERVER_SETTING') => ({
  enabled,
  scope: 'BOUND_NODE' as const,
  settingKey: 'ENABLE_APPLICATIONS' as const,
  source,
})

const createDeferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (error?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('applicationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      }),
    )
  })

  it('fetches and sorts applications from the API', async () => {
    apolloClientMock.query.mockImplementation(async ({ query }: { query: unknown }) => {
      if (query === GetApplicationsCapability) {
        return { data: { applicationsCapability: buildCapability(true) } }
      }

      if (query === ListApplications) {
        return {
          data: {
            listApplications: [
              {
                id: 'b',
                name: 'Beta',
                entryHtmlAssetPath: '/application-bundles/b/assets/ui/index.html',
                localApplicationId: 'beta',
                packageId: 'pkg',
                writable: true,
                runtimeTarget: {
                  kind: 'AGENT_TEAM',
                  localId: 'team-b',
                  definitionId: 'team-b',
                },
              },
              {
                id: 'a',
                name: 'Alpha',
                entryHtmlAssetPath: '/application-bundles/a/assets/ui/index.html',
                localApplicationId: 'alpha',
                packageId: 'pkg',
                writable: true,
                runtimeTarget: {
                  kind: 'AGENT_TEAM',
                  localId: 'team-a',
                  definitionId: 'team-a',
                },
              },
            ],
          },
        }
      }

      throw new Error(`Unexpected query: ${String((query as { kind?: string })?.kind)}`)
    })

    const store = useApplicationStore()
    const result = await store.fetchApplications()

    expect(apolloClientMock.query).toHaveBeenCalledTimes(2)
    expect(result.map((entry) => entry.id)).toEqual(['a', 'b'])
    expect(store.applications.map((entry) => entry.id)).toEqual(['a', 'b'])
    expect(store.hasFetched).toBe(true)
    expect(store.loading).toBe(false)
  })

  it('returns cached applications when already fetched and force is false', async () => {
    const capabilityStore = useApplicationsCapabilityStore()
    capabilityStore.capability = buildCapability(true)
    capabilityStore.status = 'resolved'

    const store = useApplicationStore()
    store.applications = [
      {
        id: 'app-1',
        name: 'App 1',
        entryHtmlAssetPath: '/application-bundles/app-1/assets/ui/index.html',
        localApplicationId: 'app-1',
        packageId: 'pkg',
        writable: true,
        runtimeTarget: {
          kind: 'AGENT_TEAM',
          localId: 'team-1',
          definitionId: 'team-1',
        },
      },
    ]
    store.hasFetched = true

    const result = await store.fetchApplications()

    expect(result).toEqual(store.applications)
    expect(apolloClientMock.query).not.toHaveBeenCalled()
  })

  it('fetches one application by id and upserts it into the catalog', async () => {
    apolloClientMock.query.mockImplementation(async ({ query }: { query: unknown }) => {
      if (query === GetApplicationById) {
        return {
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
                localId: 'team-2',
                definitionId: 'team-2',
              },
            },
          },
        }
      }

      throw new Error(`Unexpected query: ${String((query as { kind?: string })?.kind)}`)
    })

    const capabilityStore = useApplicationsCapabilityStore()
    capabilityStore.capability = buildCapability(true)
    capabilityStore.status = 'resolved'

    const store = useApplicationStore()
    store.applications = [
      {
        id: 'app-1',
        name: 'App 1',
        entryHtmlAssetPath: '/application-bundles/app-1/assets/ui/index.html',
        localApplicationId: 'app-1',
        packageId: 'pkg',
        writable: true,
        runtimeTarget: {
          kind: 'AGENT_TEAM',
          localId: 'team-1',
          definitionId: 'team-1',
        },
      },
    ]

    const result = await store.fetchApplicationById('app-2', true)

    expect(apolloClientMock.query).toHaveBeenCalledTimes(1)
    expect(result?.id).toBe('app-2')
    expect(store.getApplicationById('app-2')?.name).toBe('App 2')
    expect(store.applications.map((entry) => entry.id)).toEqual(['app-1', 'app-2'])
  })

  it('clears catalog state when applications capability is disabled before fetch', async () => {
    const capabilityStore = useApplicationsCapabilityStore()
    capabilityStore.capability = buildCapability(false, 'INITIALIZED_EMPTY_CATALOG')
    capabilityStore.status = 'resolved'

    const store = useApplicationStore()
    store.applications = [
      {
        id: 'app-1',
        name: 'App 1',
        entryHtmlAssetPath: '/application-bundles/app-1/assets/ui/index.html',
        localApplicationId: 'app-1',
        packageId: 'pkg',
        writable: true,
        runtimeTarget: {
          kind: 'AGENT_TEAM',
          localId: 'team-1',
          definitionId: 'team-1',
        },
      },
    ]
    store.hasFetched = true

    const result = await store.fetchApplications()

    expect(result).toEqual([])
    expect(store.applications).toEqual([])
    expect(store.hasFetched).toBe(false)
    expect(apolloClientMock.query).not.toHaveBeenCalled()
  })

  it('clears stale catalog state when the runtime capability flips to disabled', async () => {
    const capabilityStore = useApplicationsCapabilityStore()
    capabilityStore.capability = buildCapability(true)
    capabilityStore.status = 'resolved'

    const store = useApplicationStore()
    store.applications = [
      {
        id: 'app-1',
        name: 'App 1',
        entryHtmlAssetPath: '/application-bundles/app-1/assets/ui/index.html',
        localApplicationId: 'app-1',
        packageId: 'pkg',
        writable: true,
        runtimeTarget: {
          kind: 'AGENT_TEAM',
          localId: 'team-1',
          definitionId: 'team-1',
        },
      },
    ]
    store.hasFetched = true

    capabilityStore.capability = buildCapability(false, 'SERVER_SETTING')
    capabilityStore.status = 'resolved'
    await nextTick()

    expect(store.applications).toEqual([])
    expect(store.hasFetched).toBe(false)
  })

  it('clears stale catalog state when the bound node changes', async () => {
    apolloClientMock.query.mockResolvedValue({
      data: { applicationsCapability: buildCapability(true) },
    })

    const store = useApplicationStore()
    store.applications = [
      {
        id: 'app-1',
        name: 'App 1',
        entryHtmlAssetPath: '/application-bundles/app-1/assets/ui/index.html',
        localApplicationId: 'app-1',
        packageId: 'pkg',
        writable: true,
        runtimeTarget: {
          kind: 'AGENT_TEAM',
          localId: 'team-1',
          definitionId: 'team-1',
        },
      },
    ]
    store.hasFetched = true

    const windowNodeContextStore = useWindowNodeContextStore()
    windowNodeContextStore.bindNodeContext('remote-node', 'http://127.0.0.1:3900')
    await nextTick()

    expect(store.applications).toEqual([])
    expect(store.hasFetched).toBe(false)
  })

  it('discards a late catalog response after the bound node changes during fetch', async () => {
    const listApplicationsDeferred = createDeferred<{ data: { listApplications: ApplicationCatalogEntry[] } }>()
    apolloClientMock.query.mockImplementation(async ({ query }: { query: unknown }) => {
      if (query === ListApplications) {
        return listApplicationsDeferred.promise
      }

      throw new Error(`Unexpected query: ${String((query as { kind?: string })?.kind)}`)
    })

    const capabilityStore = useApplicationsCapabilityStore()
    capabilityStore.capability = buildCapability(true)
    capabilityStore.status = 'resolved'

    const store = useApplicationStore()
    const pendingFetch = store.fetchApplications(true)
    await vi.waitFor(() => {
      expect(apolloClientMock.query).toHaveBeenCalledTimes(1)
    })

    const windowNodeContextStore = useWindowNodeContextStore()
    windowNodeContextStore.bindNodeContext('remote-node', 'http://127.0.0.1:3900')
    await nextTick()

    listApplicationsDeferred.resolve({
      data: {
        listApplications: [
          {
            id: 'stale-app',
            name: 'Stale App',
            entryHtmlAssetPath: '/application-bundles/stale-app/assets/ui/index.html',
            localApplicationId: 'stale-app',
            packageId: 'pkg',
            writable: true,
            runtimeTarget: {
              kind: 'AGENT_TEAM',
              localId: 'team-stale',
              definitionId: 'team-stale',
            },
          },
        ],
      },
    })

    await expect(pendingFetch).resolves.toEqual([])
    expect(store.applications).toEqual([])
    expect(store.hasFetched).toBe(false)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('discards a late detail response after the bound node changes during fetch', async () => {
    const applicationDeferred = createDeferred<{ data: { application: ApplicationCatalogEntry } }>()
    apolloClientMock.query.mockImplementation(async ({ query }: { query: unknown }) => {
      if (query === GetApplicationById) {
        return applicationDeferred.promise
      }

      throw new Error(`Unexpected query: ${String((query as { kind?: string })?.kind)}`)
    })

    const capabilityStore = useApplicationsCapabilityStore()
    capabilityStore.capability = buildCapability(true)
    capabilityStore.status = 'resolved'

    const store = useApplicationStore()
    const pendingFetch = store.fetchApplicationById('stale-app', true)
    await vi.waitFor(() => {
      expect(apolloClientMock.query).toHaveBeenCalledTimes(1)
    })

    const windowNodeContextStore = useWindowNodeContextStore()
    windowNodeContextStore.bindNodeContext('remote-node', 'http://127.0.0.1:3900')
    await nextTick()

    applicationDeferred.resolve({
      data: {
        application: {
          id: 'stale-app',
          name: 'Stale App',
          entryHtmlAssetPath: '/application-bundles/stale-app/assets/ui/index.html',
          localApplicationId: 'stale-app',
          packageId: 'pkg',
          writable: true,
          runtimeTarget: {
            kind: 'AGENT_TEAM',
            localId: 'team-stale',
            definitionId: 'team-stale',
          },
        },
      },
    })

    await expect(pendingFetch).resolves.toBeNull()
    expect(store.applications).toEqual([])
    expect(store.getApplicationById('stale-app')).toBeNull()
    expect(store.hasFetched).toBe(false)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })
})
