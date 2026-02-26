import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import ServerSettingsManager from '../ServerSettingsManager.vue'
import { useServerSettingsStore } from '~/stores/serverSettings'

const { windowNodeContextStoreMock } = vi.hoisted(() => ({
  windowNodeContextStoreMock: {
    isEmbeddedWindow: true,
  },
}))

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}))

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

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

const mountComponent = async (
  initialSettings: Array<{ key: string; value: string; description: string }> = [],
  options: { sectionMode?: 'quick' | 'advanced' } = {},
) => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: false,
    initialState: {
      serverSettings: {
        settings: initialSettings,
        isLoading: false,
        error: null,
        isUpdating: false,
      },
    },
  })
  setActivePinia(pinia)

  const store = useServerSettingsStore()
  store.fetchServerSettings = vi.fn().mockResolvedValue([])
  store.fetchSearchConfig = vi.fn().mockResolvedValue({
    provider: '',
    serperApiKeyConfigured: false,
    serpapiApiKeyConfigured: false,
    googleCseApiKeyConfigured: false,
    googleCseId: null,
    vertexAiSearchApiKeyConfigured: false,
    vertexAiSearchServingConfig: null,
  })
  store.setSearchConfig = vi.fn().mockResolvedValue(true)
  store.updateServerSetting = vi.fn().mockResolvedValue(true)
  store.deleteServerSetting = vi.fn().mockResolvedValue(true)

  const wrapper = mount(ServerSettingsManager, {
    props: {
      sectionMode: options.sectionMode ?? 'quick',
    },
    global: {
      plugins: [pinia],
      stubs: {
        ServerMonitor: {
          template: '<div data-testid="server-monitor-stub">Server Monitor Stub</div>',
        },
      },
    },
  })

  await flushPromises()
  return { wrapper, store }
}

describe('ServerSettingsManager', () => {
  beforeEach(() => {
    windowNodeContextStoreMock.isEmbeddedWindow = true
    vi.clearAllMocks()
  })

  it('renders quick setup fields with user-friendly inputs', async () => {
    const { wrapper } = await mountComponent([
      { key: 'LMSTUDIO_HOSTS', value: 'http://localhost:1234', description: 'desc' },
      { key: 'OLLAMA_HOSTS', value: 'http://localhost:11434', description: 'desc' },
      { key: 'AUTOBYTEUS_LLM_SERVER_HOSTS', value: 'http://localhost:5900', description: 'desc' },
      { key: 'AUTOBYTEUS_VNC_SERVER_HOSTS', value: 'localhost:5900', description: 'desc' },
      { key: 'LOG_LEVEL', value: 'INFO', description: 'internal' },
    ])

    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Add one or more endpoints per provider. No commas needed.')
    expect(wrapper.text()).toContain('LM Studio')
    expect(wrapper.text()).toContain('Ollama')
    expect(wrapper.text()).toContain('Web Search Configuration')
    expect(wrapper.find('[data-testid="quick-setting-card-LMSTUDIO_HOSTS"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="quick-setting-add-row-LMSTUDIO_HOSTS"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid^="quick-row-host-LMSTUDIO_HOSTS-"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="search-provider-select"]').exists()).toBe(true)
  })

  it('does not show a red search validation message before user interaction', async () => {
    const { wrapper } = await mountComponent()

    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Please select a search provider.')
  })

  it('preserves quick setup user edits when server settings refresh', async () => {
    const { wrapper, store } = await mountComponent([
      { key: 'LMSTUDIO_HOSTS', value: 'http://initial-host:1234', description: 'desc' },
    ])

    await wrapper.vm.$nextTick()
    await flushPromises()

    const setupState = (wrapper.vm as any).$?.setupState
    const firstRow = setupState.quickEndpointRows['LMSTUDIO_HOSTS'][0]
    firstRow.host = 'custom-host'
    firstRow.port = '1234'
    setupState.onQuickEndpointRowChange('LMSTUDIO_HOSTS')
    await wrapper.vm.$nextTick()

    store.$patch({
      settings: [
        { key: 'LMSTUDIO_HOSTS', value: 'http://updated-from-server:1234', description: 'desc' },
      ],
    })

    await wrapper.vm.$nextTick()
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(setupState.quickEditedSettings['LMSTUDIO_HOSTS']).toContain('custom-host:1234')
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
      })
    )
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
    const { wrapper, store } = await mountComponent()
    const setupState = (wrapper.vm as any).$?.setupState

    store.$patch({
      searchConfig: {
        provider: '',
        serperApiKeyConfigured: false,
        serpapiApiKeyConfigured: false,
        googleCseApiKeyConfigured: false,
        googleCseId: null,
        vertexAiSearchApiKeyConfigured: false,
        vertexAiSearchServingConfig: null,
      },
    })

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

  it('shows server monitor panel in Advanced / Developer tab', async () => {
    const { wrapper } = await mountComponent([], { sectionMode: 'advanced' })
    const setupState = (wrapper.vm as any).$?.setupState

    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(getMaybeRefValue(setupState, 'activeTab')).toBe('advanced')
    expect(wrapper.text()).not.toContain('Developer Tools')

    setMaybeRef(setupState, 'advancedPanel', 'raw-settings')
    await wrapper.vm.$nextTick()
    await flushPromises()
    expect(getMaybeRefValue(setupState, 'advancedPanel')).toBe('raw-settings')

    setMaybeRef(setupState, 'advancedPanel', 'server-status')
    await wrapper.vm.$nextTick()
    await flushPromises()
    expect(getMaybeRefValue(setupState, 'advancedPanel')).toBe('server-status')
  })

  it('loads settings in remote windows and hides embedded-only diagnostics toggle', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow = false
    const { wrapper, store } = await mountComponent([
      { key: 'LMSTUDIO_HOSTS', value: 'http://remote-host:1234', description: 'desc' },
    ])

    expect(store.fetchServerSettings).toHaveBeenCalledTimes(1)
    expect(store.fetchSearchConfig).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).not.toContain('Add one or more endpoints per provider. No commas needed.')
    expect(wrapper.text()).not.toContain('Embedded server settings are unavailable for remote node windows.')
    expect(wrapper.findAll('button').some((button) => button.text().trim() === 'Server Status & Logs')).toBe(false)
  })

  it('removes custom server settings from advanced table', async () => {
    const { wrapper, store } = await mountComponent([
      { key: 'AUTOBYTEUS_LLM_SERVER_URL', value: 'https://legacy-host', description: 'Custom user-defined setting' },
      { key: 'AUTOBYTEUS_SERVER_HOST', value: 'http://localhost:8000', description: 'Public URL of this server' },
    ], { sectionMode: 'advanced' })
    const setupState = (wrapper.vm as any).$?.setupState

    setMaybeRef(setupState, 'advancedPanel', 'raw-settings')
    await wrapper.vm.$nextTick()
    await flushPromises()

    const removeButton = wrapper.get('[data-testid="server-setting-remove-AUTOBYTEUS_LLM_SERVER_URL"]')
    await removeButton.trigger('click')
    await flushPromises()

    expect(store.deleteServerSetting).toHaveBeenCalledWith('AUTOBYTEUS_LLM_SERVER_URL')
    expect(wrapper.find('[data-testid="server-setting-remove-AUTOBYTEUS_SERVER_HOST"]').exists()).toBe(false)
  })
})
