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

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(),
}))

vi.mock('~/stores/applicationsCapabilityStore', () => ({
  useApplicationsCapabilityStore: () => applicationsCapabilityStoreMock,
}))

describe('serverSettings store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(getApolloClient).mockReset()
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
          provider: 'serper',
          vaultHealth: 'READY',
          instructionCode: null,
          serperStorageState: 'CONFIGURED',
          serpapiStorageState: 'MISSING',
          vertexAiSearchStorageState: 'MISSING',
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
    expect(result.provider).toBe('serper')
    expect(store.searchConfig.serperStorageState).toBe('CONFIGURED')
  })

  it('waits for bound backend readiness before fetching server settings', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      data: {
        getEffectiveWorkingContextCompactionStrategyId: 'structured-json',
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

  it('does not capture a settings client when the binding changes during readiness', async () => {
    const windowNodeContextStore = useWindowNodeContextStore()
    vi.mocked(windowNodeContextStore.waitForBoundBackendReady).mockImplementation(async () => {
      windowNodeContextStore.bindNodeContext('remote-node', 'http://127.0.0.1:3900')
      return true
    })

    const store = useServerSettingsStore()
    await expect(store.fetchServerSettings()).resolves.toEqual([])

    expect(getApolloClient).not.toHaveBeenCalled()
    expect(store.settingsBindingRevision).toBeNull()
    expect(store.effectiveWorkingContextCompactionStrategyId).toBeNull()
  })

  it('does not let an old-node rejection erase a successful new-node settings load', async () => {
    const oldResponse = deferred<any>()
    const oldClient = { query: vi.fn(() => oldResponse.promise) }
    const newClient = {
      query: vi.fn().mockResolvedValue({
        data: {
          getEffectiveWorkingContextCompactionStrategyId: 'remote-strategy',
          getServerSettings: [
            {
              key: 'AUTOBYTEUS_COMPACTION_TRIGGER_RATIO',
              value: '0.6',
              description: 'remote ratio',
              isEditable: true,
              isDeletable: false,
            },
          ],
        },
      }),
    }
    vi.mocked(getApolloClient)
      .mockReturnValueOnce(oldClient as any)
      .mockReturnValue(newClient as any)

    const store = useServerSettingsStore()
    const oldLoad = store.fetchServerSettings()
    await vi.waitFor(() => expect(oldClient.query).toHaveBeenCalledOnce())

    useWindowNodeContextStore().bindNodeContext('remote-node', 'http://127.0.0.1:3900')
    await store.fetchServerSettings()
    expect(store.effectiveWorkingContextCompactionStrategyId).toBe('remote-strategy')
    expect(store.settings[0]?.value).toBe('0.6')

    oldResponse.reject(new Error('old node rejected'))
    await expect(oldLoad).rejects.toThrow('old node rejected')
    expect(store.effectiveWorkingContextCompactionStrategyId).toBe('remote-strategy')
    expect(store.settings[0]?.value).toBe('0.6')
    expect(store.settingsBindingRevision).toBe(1)
    expect(store.error).toBeNull()
    expect(store.isLoading).toBe(false)
  })

  it('keeps current settings loading active when an overlapping old-node request rejects', async () => {
    const oldResponse = deferred<any>()
    const newResponse = deferred<any>()
    const oldClient = { query: vi.fn(() => oldResponse.promise) }
    const newClient = { query: vi.fn(() => newResponse.promise) }
    vi.mocked(getApolloClient)
      .mockReturnValueOnce(oldClient as any)
      .mockReturnValue(newClient as any)

    const store = useServerSettingsStore()
    const oldLoad = store.fetchServerSettings()
    await vi.waitFor(() => expect(oldClient.query).toHaveBeenCalledOnce())

    useWindowNodeContextStore().bindNodeContext('remote-node', 'http://127.0.0.1:3900')
    const newLoad = store.fetchServerSettings()
    await vi.waitFor(() => expect(newClient.query).toHaveBeenCalledOnce())

    oldResponse.reject(new Error('old settings rejected'))
    await expect(oldLoad).rejects.toThrow('old settings rejected')
    expect(store.isLoading).toBe(true)
    expect(store.error).toBeNull()

    newResponse.resolve({
      data: {
        getEffectiveWorkingContextCompactionStrategyId: 'structured-json',
        getServerSettings: [],
      },
    })
    await expect(newLoad).resolves.toEqual([])
    expect(store.isLoading).toBe(false)
    expect(store.settingsBindingRevision).toBe(1)
  })

  it('invalidates cached server settings when the bound node changes', async () => {
    const queryMock = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          getEffectiveWorkingContextCompactionStrategyId: 'structured-json',
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
          getEffectiveWorkingContextCompactionStrategyId: 'structured-json',
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
            provider: 'serper',
            vaultHealth: 'READY',
              instructionCode: null,
            serperStorageState: 'CONFIGURED',
            serpapiStorageState: 'MISSING',
            vertexAiSearchStorageState: 'MISSING',
            vertexAiSearchServingConfig: null,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          getSearchConfig: {
            provider: 'serpapi',
            vaultHealth: 'READY',
              instructionCode: null,
            serperStorageState: 'MISSING',
            serpapiStorageState: 'CONFIGURED',
            vertexAiSearchStorageState: 'MISSING',
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
    expect(store.searchConfig.provider).toBe('serper')

    windowNodeContextStore.bindNodeContext('remote-node', 'http://127.0.0.1:3900')
    await nextTick()

    expect(store.searchConfig.provider).toBe('')

    await store.fetchSearchConfig()
    expect(queryMock).toHaveBeenCalledTimes(2)
    expect(store.searchConfig.provider).toBe('serpapi')
    expect(store.searchConfig.serpapiStorageState).toBe('CONFIGURED')
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
            vaultHealth: 'READY',
              instructionCode: null,
            serperStorageState: 'CONFIGURED',
            serpapiStorageState: 'MISSING',
            vertexAiSearchStorageState: 'MISSING',
            vertexAiSearchServingConfig: null,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          getEffectiveWorkingContextCompactionStrategyId: 'structured-json',
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
        getEffectiveWorkingContextCompactionStrategyId: 'structured-json',
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

  it('updates one compaction setting and reloads its authoritative server value', async () => {
    const mutateMock = vi.fn().mockResolvedValue({
      data: {
        updateServerSetting: "Server setting 'AUTOBYTEUS_COMPACTION_TRIGGER_RATIO' has been updated successfully.",
      },
    })
    const queryMock = vi.fn().mockResolvedValue({
      data: {
        getEffectiveWorkingContextCompactionStrategyId: 'structured-json',
        getServerSettings: [
          {
            key: 'AUTOBYTEUS_COMPACTION_TRIGGER_RATIO',
            value: '0.6',
            description: 'ratio',
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
    await expect(
      store.updateServerSetting('AUTOBYTEUS_COMPACTION_TRIGGER_RATIO', '0.6'),
    ).resolves.toBe(true)

    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      variables: {
        key: 'AUTOBYTEUS_COMPACTION_TRIGGER_RATIO',
        value: '0.6',
      },
    }))
    expect(queryMock).toHaveBeenCalledOnce()
    expect(store.getSettingByKey('AUTOBYTEUS_COMPACTION_TRIGGER_RATIO')?.value).toBe('0.6')
  })

})
