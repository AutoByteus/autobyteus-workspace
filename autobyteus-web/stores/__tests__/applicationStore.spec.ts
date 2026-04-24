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
import { useApplicationStore } from '../applicationStore'
import { useWindowNodeContextStore } from '../windowNodeContextStore'

const buildCapability = (
  enabled: boolean,
  source: 'SERVER_SETTING' | 'INITIALIZED_FROM_DISCOVERED_APPLICATIONS' | 'INITIALIZED_EMPTY_CATALOG' = 'SERVER_SETTING',
) => ({
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

const buildCatalogQueryRecord = (
  id: string,
  name: string,
) => ({
  id,
  name,
  description: `${name} description`,
  iconAssetPath: null,
  entryHtmlAssetPath: `/application-bundles/${id}/assets/ui/index.html`,
  resourceSlots: [
    {
      slotKey: `${id}-team`,
      required: true,
    },
  ],
})

const buildDetailQueryRecord = (
  id: string,
  name: string,
  resourceLocalId = `${id}-team`,
) => ({
  ...buildCatalogQueryRecord(id, name),
  localApplicationId: id,
  packageId: 'pkg',
  writable: true,
  bundleResources: [
    {
      kind: 'AGENT_TEAM',
      localId: resourceLocalId,
      definitionId: resourceLocalId,
    },
  ],
})

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

  it('fetches and sorts application catalog records from the API', async () => {
    apolloClientMock.query.mockImplementation(async ({ query }: { query: unknown }) => {
      if (query === GetApplicationsCapability) {
        return { data: { applicationsCapability: buildCapability(true) } }
      }

      if (query === ListApplications) {
        return {
          data: {
            listApplications: [
              buildCatalogQueryRecord('b', 'Beta'),
              buildCatalogQueryRecord('a', 'Alpha'),
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
    expect(store.applicationDetails).toEqual({})
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
        description: 'App 1 description',
        iconAssetPath: null,
        entryHtmlAssetPath: '/application-bundles/app-1/assets/ui/index.html',
        resourceSlots: [],
      },
    ]
    store.hasFetched = true

    const result = await store.fetchApplications()

    expect(result).toEqual(store.applications)
    expect(apolloClientMock.query).not.toHaveBeenCalled()
  })

  it('fetches one application by id, stores nested technical details, and upserts the catalog summary', async () => {
    apolloClientMock.query.mockImplementation(async ({ query }: { query: unknown }) => {
      if (query === GetApplicationById) {
        return {
          data: {
            application: buildDetailQueryRecord('app-2', 'App 2', 'team-2'),
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
        description: 'App 1 description',
        iconAssetPath: null,
        entryHtmlAssetPath: '/application-bundles/app-1/assets/ui/index.html',
        resourceSlots: [],
      },
    ]

    const result = await store.fetchApplicationById('app-2', true)

    expect(apolloClientMock.query).toHaveBeenCalledTimes(1)
    expect(result?.id).toBe('app-2')
    expect(result?.technicalDetails.packageId).toBe('pkg')
    expect(result?.technicalDetails.localApplicationId).toBe('app-2')
    expect(store.getApplicationById('app-2')?.technicalDetails.bundleResources).toEqual([
      {
        kind: 'AGENT_TEAM',
        localId: 'team-2',
        definitionId: 'team-2',
      },
    ])
    expect(store.applications.map((entry) => entry.id)).toEqual(['app-1', 'app-2'])
    expect(store.applications.find((entry) => entry.id === 'app-2')).toMatchObject({
      id: 'app-2',
      name: 'App 2',
    })
  })

  it('clears catalog state when applications capability is disabled before fetch', async () => {
    const capabilityStore = useApplicationsCapabilityStore()
    capabilityStore.capability = buildCapability(false, 'INITIALIZED_EMPTY_CATALOG')
    capabilityStore.status = 'resolved'

    const store = useApplicationStore()
    store.applications = [{
      id: 'app-1',
      name: 'App 1',
      description: null,
      iconAssetPath: null,
      entryHtmlAssetPath: '/application-bundles/app-1/assets/ui/index.html',
      resourceSlots: [],
    }]
    store.applicationDetails = {
      'app-1': {
        id: 'app-1',
        name: 'App 1',
        description: null,
        iconAssetPath: null,
        entryHtmlAssetPath: '/application-bundles/app-1/assets/ui/index.html',
        resourceSlots: [],
        technicalDetails: {
          localApplicationId: 'app-1',
          packageId: 'pkg',
          writable: true,
          bundleResources: [],
        },
      },
    }
    store.hasFetched = true

    const result = await store.fetchApplications()

    expect(result).toEqual([])
    expect(store.applications).toEqual([])
    expect(store.applicationDetails).toEqual({})
    expect(store.hasFetched).toBe(false)
    expect(apolloClientMock.query).not.toHaveBeenCalled()
  })

  it('clears stale catalog state when the runtime capability flips to disabled', async () => {
    const capabilityStore = useApplicationsCapabilityStore()
    capabilityStore.capability = buildCapability(true)
    capabilityStore.status = 'resolved'

    const store = useApplicationStore()
    store.applications = [{
      id: 'app-1',
      name: 'App 1',
      description: null,
      iconAssetPath: null,
      entryHtmlAssetPath: '/application-bundles/app-1/assets/ui/index.html',
      resourceSlots: [],
    }]
    store.applicationDetails = {
      'app-1': {
        id: 'app-1',
        name: 'App 1',
        description: null,
        iconAssetPath: null,
        entryHtmlAssetPath: '/application-bundles/app-1/assets/ui/index.html',
        resourceSlots: [],
        technicalDetails: {
          localApplicationId: 'app-1',
          packageId: 'pkg',
          writable: true,
          bundleResources: [],
        },
      },
    }
    store.hasFetched = true

    capabilityStore.capability = buildCapability(false, 'SERVER_SETTING')
    capabilityStore.status = 'resolved'
    await nextTick()

    expect(store.applications).toEqual([])
    expect(store.applicationDetails).toEqual({})
    expect(store.hasFetched).toBe(false)
  })

  it('clears stale catalog state when the bound node changes', async () => {
    apolloClientMock.query.mockResolvedValue({
      data: { applicationsCapability: buildCapability(true) },
    })

    const store = useApplicationStore()
    store.applications = [{
      id: 'app-1',
      name: 'App 1',
      description: null,
      iconAssetPath: null,
      entryHtmlAssetPath: '/application-bundles/app-1/assets/ui/index.html',
      resourceSlots: [],
    }]
    store.applicationDetails = {
      'app-1': {
        id: 'app-1',
        name: 'App 1',
        description: null,
        iconAssetPath: null,
        entryHtmlAssetPath: '/application-bundles/app-1/assets/ui/index.html',
        resourceSlots: [],
        technicalDetails: {
          localApplicationId: 'app-1',
          packageId: 'pkg',
          writable: true,
          bundleResources: [],
        },
      },
    }
    store.hasFetched = true

    const windowNodeContextStore = useWindowNodeContextStore()
    windowNodeContextStore.bindNodeContext('remote-node', 'http://127.0.0.1:3900')
    await nextTick()

    expect(store.applications).toEqual([])
    expect(store.applicationDetails).toEqual({})
    expect(store.hasFetched).toBe(false)
  })

  it('discards a late catalog response after the bound node changes during fetch', async () => {
    const listApplicationsDeferred = createDeferred<{ data: { listApplications: Array<ReturnType<typeof buildCatalogQueryRecord>> } }>()
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
        listApplications: [buildCatalogQueryRecord('stale-app', 'Stale App')],
      },
    })

    await expect(pendingFetch).resolves.toEqual([])
    expect(store.applications).toEqual([])
    expect(store.applicationDetails).toEqual({})
    expect(store.hasFetched).toBe(false)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('discards a late detail response after the bound node changes during fetch', async () => {
    const applicationDeferred = createDeferred<{ data: { application: ReturnType<typeof buildDetailQueryRecord> } }>()
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
        application: buildDetailQueryRecord('stale-app', 'Stale App', 'team-stale'),
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
