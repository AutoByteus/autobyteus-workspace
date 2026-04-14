import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { useServerSettingsStore } from '~/stores/serverSettings'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { getApolloClient } from '~/utils/apolloClient'

const { applicationsCapabilityStoreMock } = vi.hoisted(() => ({
  applicationsCapabilityStoreMock: {
    refresh: vi.fn().mockResolvedValue(null),
  },
}))

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(),
}))

vi.mock('~/stores/applicationsCapabilityStore', () => ({
  useApplicationsCapabilityStore: () => applicationsCapabilityStoreMock,
}))

describe('serverSettings store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    applicationsCapabilityStoreMock.refresh.mockResolvedValue(null)
    const windowNodeContextStore = useWindowNodeContextStore()
    windowNodeContextStore.lastReadyError = null
    vi.spyOn(windowNodeContextStore, 'waitForBoundBackendReady').mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetchSearchConfig populates state', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      data: {
        getSearchConfig: {
          provider: 'google_cse',
          serperApiKeyConfigured: false,
          serpapiApiKeyConfigured: false,
          googleCseApiKeyConfigured: true,
          googleCseId: 'my-cse-id',
          vertexAiSearchApiKeyConfigured: false,
          vertexAiSearchServingConfig: null,
        },
      },
    })

    vi.mocked(getApolloClient).mockReturnValue({
      query: queryMock,
    } as any)

    const store = useServerSettingsStore()
    const result = await store.fetchSearchConfig()

    expect(useWindowNodeContextStore().waitForBoundBackendReady).toHaveBeenCalledOnce()
    expect(queryMock).toHaveBeenCalledTimes(1)
    expect(result.provider).toBe('google_cse')
    expect(store.searchConfig.googleCseId).toBe('my-cse-id')
  })

  it('waits for bound backend readiness before fetching server settings', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      data: {
        getServerSettings: [
          {
            key: 'AUTOBYTEUS_SERVER_HOST',
            value: 'http://127.0.0.1:29695',
            description: 'desc',
            isEditable: false,
            isDeletable: false,
          },
        ],
      },
    })

    vi.mocked(getApolloClient).mockReturnValue({
      query: queryMock,
    } as any)

    const store = useServerSettingsStore()
    const result = await store.fetchServerSettings()

    expect(useWindowNodeContextStore().waitForBoundBackendReady).toHaveBeenCalledOnce()
    expect(queryMock).toHaveBeenCalledTimes(1)
    expect(result).toHaveLength(1)
  })

  it('fails deterministically when the bound backend is not ready', async () => {
    const queryMock = vi.fn()
    const windowNodeContextStore = useWindowNodeContextStore()
    windowNodeContextStore.lastReadyError = 'backend readiness timed out'
    vi.mocked(windowNodeContextStore.waitForBoundBackendReady).mockResolvedValue(false)

    vi.mocked(getApolloClient).mockReturnValue({
      query: queryMock,
    } as any)

    const store = useServerSettingsStore()

    await expect(store.fetchServerSettings()).rejects.toThrow('backend readiness timed out')
    expect(queryMock).not.toHaveBeenCalled()
    expect(store.isLoading).toBe(false)
    expect(store.error).toBe('backend readiness timed out')
  })

  it('invalidates cached server settings when the bound node changes', async () => {
    const queryMock = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          getServerSettings: [
            {
              key: 'AUTOBYTEUS_SERVER_HOST',
              value: 'http://127.0.0.1:29695',
              description: 'embedded',
              isEditable: false,
              isDeletable: false,
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          getServerSettings: [
            {
              key: 'AUTOBYTEUS_SERVER_HOST',
              value: 'http://127.0.0.1:3900',
              description: 'remote',
              isEditable: false,
              isDeletable: false,
            },
          ],
        },
      })

    vi.mocked(getApolloClient).mockReturnValue({
      query: queryMock,
    } as any)

    const store = useServerSettingsStore()
    const windowNodeContextStore = useWindowNodeContextStore()

    await store.fetchServerSettings()
    expect(queryMock).toHaveBeenCalledTimes(1)
    expect(store.settings[0]?.value).toBe('http://127.0.0.1:29695')

    windowNodeContextStore.bindNodeContext('remote-node', 'http://127.0.0.1:3900')
    await nextTick()

    expect(store.settings).toEqual([])

    await store.fetchServerSettings()
    expect(queryMock).toHaveBeenCalledTimes(2)
    expect(store.settings[0]?.value).toBe('http://127.0.0.1:3900')
  })

  it('invalidates cached search config when the bound node changes', async () => {
    const queryMock = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          getSearchConfig: {
            provider: 'google_cse',
            serperApiKeyConfigured: false,
            serpapiApiKeyConfigured: false,
            googleCseApiKeyConfigured: true,
            googleCseId: 'embedded-cse-id',
            vertexAiSearchApiKeyConfigured: false,
            vertexAiSearchServingConfig: null,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          getSearchConfig: {
            provider: 'serpapi',
            serperApiKeyConfigured: false,
            serpapiApiKeyConfigured: true,
            googleCseApiKeyConfigured: false,
            googleCseId: null,
            vertexAiSearchApiKeyConfigured: false,
            vertexAiSearchServingConfig: null,
          },
        },
      })

    vi.mocked(getApolloClient).mockReturnValue({
      query: queryMock,
    } as any)

    const store = useServerSettingsStore()
    const windowNodeContextStore = useWindowNodeContextStore()

    await store.fetchSearchConfig()
    expect(queryMock).toHaveBeenCalledTimes(1)
    expect(store.searchConfig.provider).toBe('google_cse')

    windowNodeContextStore.bindNodeContext('remote-node', 'http://127.0.0.1:3900')
    await nextTick()

    expect(store.searchConfig.provider).toBe('')

    await store.fetchSearchConfig()
    expect(queryMock).toHaveBeenCalledTimes(2)
    expect(store.searchConfig.provider).toBe('serpapi')
    expect(store.searchConfig.serpapiApiKeyConfigured).toBe(true)
  })

  it('setSearchConfig saves and refreshes search and server settings', async () => {
    const mutateMock = vi.fn().mockResolvedValue({
      data: {
        setSearchConfig: "Search configuration for provider 'serper' has been updated successfully.",
      },
      errors: undefined,
    })
    const queryMock = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          getSearchConfig: {
            provider: 'serper',
            serperApiKeyConfigured: true,
            serpapiApiKeyConfigured: false,
            googleCseApiKeyConfigured: false,
            googleCseId: null,
            vertexAiSearchApiKeyConfigured: false,
            vertexAiSearchServingConfig: null,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          getServerSettings: [
            {
              key: 'DEFAULT_SEARCH_PROVIDER',
              value: 'serper',
              description: 'desc',
              isEditable: true,
              isDeletable: false,
            },
          ],
        },
      })

    vi.mocked(getApolloClient).mockReturnValue({
      mutate: mutateMock,
      query: queryMock,
    } as any)

    const store = useServerSettingsStore()
    const success = await store.setSearchConfig({
      provider: 'serper',
      serperApiKey: 'serper-key',
    })

    expect(success).toBe(true)
    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          provider: 'serper',
          serperApiKey: 'serper-key',
        }),
      }),
    )
    expect(queryMock).toHaveBeenCalledTimes(2)
    expect(store.searchConfig.provider).toBe('serper')
    expect(store.settings.some((setting) => setting.key === 'DEFAULT_SEARCH_PROVIDER')).toBe(true)
  })

  it('refreshes the typed applications capability after updating ENABLE_APPLICATIONS', async () => {
    const mutateMock = vi.fn().mockResolvedValue({
      data: {
        updateServerSetting: "Server setting 'ENABLE_APPLICATIONS' has been updated successfully.",
      },
      errors: undefined,
    })
    const queryMock = vi.fn().mockResolvedValue({
      data: {
        getServerSettings: [
          {
            key: 'ENABLE_APPLICATIONS',
            value: 'true',
            description: 'desc',
            isEditable: true,
            isDeletable: false,
          },
        ],
      },
    })

    vi.mocked(getApolloClient).mockReturnValue({
      mutate: mutateMock,
      query: queryMock,
    } as any)

    const store = useServerSettingsStore()
    const success = await store.updateServerSetting('ENABLE_APPLICATIONS', 'true')

    expect(success).toBe(true)
    expect(queryMock).toHaveBeenCalledTimes(1)
    expect(applicationsCapabilityStoreMock.refresh).toHaveBeenCalledOnce()
  })
})
