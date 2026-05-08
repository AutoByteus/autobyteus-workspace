import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import WebSearchConfigurationCard from '../WebSearchConfigurationCard.vue'
import { useServerSettingsStore, type SearchConfigState } from '~/stores/serverSettings'

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const defaultSearchConfig = (): SearchConfigState => ({
  provider: '',
  serperApiKeyConfigured: false,
  serpapiApiKeyConfigured: false,
  googleCseApiKeyConfigured: false,
  googleCseId: null,
  vertexAiSearchApiKeyConfigured: false,
  vertexAiSearchServingConfig: null,
})

const setMaybeRef = (target: any, key: string, value: any) => {
  if (!target) return
  const current = target[key]
  if (current && typeof current === 'object' && 'value' in current) {
    current.value = value
    return
  }
  target[key] = value
}

const getMaybeRefValue = (target: any, key: string) => {
  if (!target) return undefined
  const current = target[key]
  if (current && typeof current === 'object' && 'value' in current) {
    return current.value
  }
  return current
}

const mountComponent = async (searchConfig: SearchConfigState = defaultSearchConfig()) => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: false,
    initialState: {
      serverSettings: {
        searchConfig,
        isUpdating: false,
      },
    },
  })
  setActivePinia(pinia)

  const store = useServerSettingsStore()
  store.fetchSearchConfig = vi.fn().mockResolvedValue(searchConfig)
  store.setSearchConfig = vi.fn().mockResolvedValue(true)

  const wrapper = mount(WebSearchConfigurationCard, {
    global: {
      plugins: [pinia],
      stubs: {
        Icon: true,
      },
    },
  })

  await flushPromises()
  return { wrapper, store }
}

describe('WebSearchConfigurationCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads search config on mount without showing red validation before user interaction', async () => {
    const { wrapper, store } = await mountComponent()

    expect(store.fetchSearchConfig).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Web search configuration')
    expect(wrapper.find('[data-testid="search-provider-select"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Please select a search provider.')
  })

  it.each([
    {
      name: 'serper',
      provider: 'serper',
      formPatch: { serperApiKey: 'serper-test-key' },
      expected: { serperApiKey: 'serper-test-key' },
    },
    {
      name: 'serpapi',
      provider: 'serpapi',
      formPatch: { serpapiApiKey: 'serpapi-test-key' },
      expected: { serpapiApiKey: 'serpapi-test-key' },
    },
    {
      name: 'google_cse',
      provider: 'google_cse',
      formPatch: { googleCseApiKey: 'google-test-key', googleCseId: 'google-cse-id' },
      expected: { googleCseApiKey: 'google-test-key', googleCseId: 'google-cse-id' },
    },
    {
      name: 'vertex_ai_search',
      provider: 'vertex_ai_search',
      formPatch: {
        vertexAiSearchApiKey: 'vertex-test-key',
        vertexAiSearchServingConfig:
          'projects/p/locations/l/collections/default_collection/engines/e/servingConfigs/default_search',
      },
      expected: {
        vertexAiSearchApiKey: 'vertex-test-key',
        vertexAiSearchServingConfig:
          'projects/p/locations/l/collections/default_collection/engines/e/servingConfigs/default_search',
      },
    },
  ])('saves selected $name search provider config', async ({ provider, formPatch, expected }) => {
    const { wrapper, store } = await mountComponent()
    const setupState = (wrapper.vm as any).$?.setupState
    setMaybeRef(setupState, 'selectedSearchProvider', provider)

    Object.assign(setupState.searchForm, {
      serperApiKey: '',
      serpapiApiKey: '',
      googleCseApiKey: '',
      googleCseId: '',
      vertexAiSearchApiKey: '',
      vertexAiSearchServingConfig: '',
      ...formPatch,
    })

    await wrapper.vm.$nextTick()
    await flushPromises()
    await setupState.saveSearchConfig()

    expect(store.setSearchConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        provider,
        ...expected,
      }),
    )
    expect(wrapper.emitted('notify')?.[0]?.[0]).toEqual({
      type: 'success',
      message: 'Search configuration saved successfully',
    })
  })

  it.each([
    {
      name: 'serper missing key',
      provider: 'serper',
      formPatch: {},
      expectedMessage: 'Serper API key is required.',
    },
    {
      name: 'serpapi missing key',
      provider: 'serpapi',
      formPatch: {},
      expectedMessage: 'SerpApi API key is required.',
    },
    {
      name: 'google_cse missing id',
      provider: 'google_cse',
      formPatch: { googleCseApiKey: 'google-key-only' },
      expectedMessage: 'Google CSE API key and Google CSE ID are required.',
    },
    {
      name: 'vertex_ai_search missing serving config',
      provider: 'vertex_ai_search',
      formPatch: { vertexAiSearchApiKey: 'vertex-key-only' },
      expectedMessage: 'Vertex AI Search API key and serving config path are required.',
    },
  ])('shows validation error for $name', async ({ provider, formPatch, expectedMessage }) => {
    const { wrapper } = await mountComponent()
    const setupState = (wrapper.vm as any).$?.setupState

    setMaybeRef(setupState, 'selectedSearchProvider', provider)
    Object.assign(setupState.searchForm, {
      serperApiKey: '',
      serpapiApiKey: '',
      googleCseApiKey: '',
      googleCseId: '',
      vertexAiSearchApiKey: '',
      vertexAiSearchServingConfig: '',
      ...formPatch,
    })

    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(getMaybeRefValue(setupState, 'searchConfigValidationError')).toBe(expectedMessage)
  })
})
