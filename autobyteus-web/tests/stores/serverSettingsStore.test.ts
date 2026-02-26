import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useServerSettingsStore } from '~/stores/serverSettings'
import { getApolloClient } from '~/utils/apolloClient'

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(),
}))

describe('serverSettings store search config', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
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

    expect(queryMock).toHaveBeenCalledTimes(1)
    expect(result.provider).toBe('google_cse')
    expect(store.searchConfig.googleCseId).toBe('my-cse-id')
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
            { key: 'DEFAULT_SEARCH_PROVIDER', value: 'serper', description: 'desc' },
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
    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      variables: expect.objectContaining({
        provider: 'serper',
        serperApiKey: 'serper-key',
      }),
    }))
    expect(queryMock).toHaveBeenCalledTimes(2)
    expect(store.searchConfig.provider).toBe('serper')
    expect(store.settings.some(s => s.key === 'DEFAULT_SEARCH_PROVIDER')).toBe(true)
  })
})
