import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

const { apolloClientMock } = vi.hoisted(() => ({
  apolloClientMock: {
    query: vi.fn(),
    mutate: vi.fn(),
  },
}))

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(() => apolloClientMock),
}))

vi.mock('~/graphql/queries/applicationCapabilityQueries', () => ({
  GetApplicationsCapability: { kind: 'GetApplicationsCapability' },
}))

vi.mock('~/graphql/mutations/applicationCapabilityMutations', () => ({
  SetApplicationsEnabled: { kind: 'SetApplicationsEnabled' },
}))

import { useApplicationsCapabilityStore } from '../applicationsCapabilityStore'
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
describe('applicationsCapabilityStore', () => {
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

  it('resolves the runtime applications capability from the backend', async () => {
    apolloClientMock.query.mockResolvedValue({
      data: {
        applicationsCapability: buildCapability(true, 'INITIALIZED_FROM_DISCOVERED_APPLICATIONS'),
      },
    })

    const store = useApplicationsCapabilityStore()
    const result = await store.ensureResolved()

    expect(apolloClientMock.query).toHaveBeenCalledOnce()
    expect(result).toEqual(buildCapability(true, 'INITIALIZED_FROM_DISCOVERED_APPLICATIONS'))
    expect(store.status).toBe('resolved')
    expect(store.isEnabled).toBe(true)
  })

  it('updates the runtime applications capability through the mutation path', async () => {
    apolloClientMock.mutate.mockResolvedValue({
      data: {
        setApplicationsEnabled: buildCapability(false, 'SERVER_SETTING'),
      },
    })

    const store = useApplicationsCapabilityStore()
    const result = await store.setEnabled(false)

    expect(apolloClientMock.mutate).toHaveBeenCalledOnce()
    expect(result).toEqual(buildCapability(false, 'SERVER_SETTING'))
    expect(store.status).toBe('resolved')
    expect(store.isEnabled).toBe(false)
  })

  it('refreshes the capability when the bound node changes after an initial resolution', async () => {
    apolloClientMock.query
      .mockResolvedValueOnce({
        data: {
          applicationsCapability: buildCapability(true, 'INITIALIZED_FROM_DISCOVERED_APPLICATIONS'),
        },
      })
      .mockResolvedValueOnce({
        data: {
          applicationsCapability: buildCapability(false, 'INITIALIZED_EMPTY_CATALOG'),
        },
      })

    const store = useApplicationsCapabilityStore()
    await store.ensureResolved()

    const windowNodeContextStore = useWindowNodeContextStore()
    windowNodeContextStore.bindNodeContext('remote-node', 'http://127.0.0.1:3900')
    await nextTick()

    await vi.waitFor(() => {
      expect(apolloClientMock.query).toHaveBeenCalledTimes(2)
      expect(store.status).toBe('resolved')
      expect(store.isEnabled).toBe(false)
      expect(store.capability).toEqual(buildCapability(false, 'INITIALIZED_EMPTY_CATALOG'))
    })
  })
})
