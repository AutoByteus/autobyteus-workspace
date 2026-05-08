import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import ServerSettingsBasicsPanel from '../ServerSettingsBasicsPanel.vue'
import { useServerSettingsStore, type ServerSetting } from '~/stores/serverSettings'

const STREAM_PARSER_SETTING_KEY = 'AUTOBYTEUS_STREAM_PARSER'

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const endpointStub = {
  emits: ['notify'],
  template: '<button data-testid="server-settings-endpoint-cards-stub" @click="$emit(\'notify\', { type: \'success\', message: \'Endpoint settings saved\' })">Endpoint Cards</button>',
}

const webSearchStub = {
  emits: ['notify'],
  template: '<button data-testid="web-search-configuration-card-stub" @click="$emit(\'notify\', { type: \'error\', message: \'Search save failed\' })">Web Search</button>',
}

const mountComponent = () => mount(ServerSettingsBasicsPanel, {
  global: {
    stubs: {
      ServerSettingsEndpointCards: endpointStub,
      ApplicationsFeatureToggleCard: { template: '<div data-testid="applications-feature-toggle-card-stub">Applications</div>' },
      MediaDefaultModelsCard: { template: '<div data-testid="media-default-models-card-stub">Media Models</div>' },
      CodexFullAccessCard: { template: '<div data-testid="codex-full-access-card-stub">Codex Full Access</div>' },
      StreamingParserCard: { template: '<div data-testid="streaming-parser-card-stub">Streaming Parser</div>' },
      FeaturedCatalogItemsCard: { template: '<div data-testid="featured-catalog-items-card-stub">Featured Catalog</div>' },
      WebSearchConfigurationCard: webSearchStub,
      CompactionConfigCard: { template: '<div data-testid="compaction-config-card-stub">Compaction</div>' },
    },
  },
})

const streamParserSetting = (value: string): ServerSetting => ({
  key: STREAM_PARSER_SETTING_KEY,
  value,
  description: 'stream parser',
  isEditable: true,
  isDeletable: false,
})

const mountComponentWithRealStreamingParser = async (settings: ServerSetting[]) => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: false,
    initialState: {
      serverSettings: {
        settings,
        isUpdating: false,
      },
    },
  })
  setActivePinia(pinia)

  const store = useServerSettingsStore()
  store.updateServerSetting = vi.fn().mockResolvedValue(true)

  const wrapper = mount(ServerSettingsBasicsPanel, {
    global: {
      plugins: [pinia],
      stubs: {
        Icon: true,
        ServerSettingsEndpointCards: endpointStub,
        ApplicationsFeatureToggleCard: { template: '<div data-testid="applications-feature-toggle-card-stub">Applications</div>' },
        MediaDefaultModelsCard: { template: '<div data-testid="media-default-models-card-stub">Media Models</div>' },
        CodexFullAccessCard: { template: '<div data-testid="codex-full-access-card-stub">Codex Full Access</div>' },
        FeaturedCatalogItemsCard: { template: '<div data-testid="featured-catalog-items-card-stub">Featured Catalog</div>' },
        WebSearchConfigurationCard: webSearchStub,
        CompactionConfigCard: { template: '<div data-testid="compaction-config-card-stub">Compaction</div>' },
      },
    },
  })

  await flushPromises()
  return { wrapper, store }
}

describe('ServerSettingsBasicsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('composes endpoint cards, focused Basics cards, streaming parser, web search, and compaction', () => {
    const wrapper = mountComponent()

    expect(wrapper.find('[data-testid="server-settings-endpoint-cards-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="applications-feature-toggle-card-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="media-default-models-card-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="codex-full-access-card-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="streaming-parser-card-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="featured-catalog-items-card-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="web-search-configuration-card-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="compaction-config-card-stub"]').exists()).toBe(true)
  })

  it('owns Basics notifications emitted by endpoint and web search cards', async () => {
    const wrapper = mountComponent()

    await wrapper.get('[data-testid="server-settings-endpoint-cards-stub"]').trigger('click')
    expect(wrapper.get('[data-testid="server-settings-basics-notification"]').text()).toContain('Endpoint settings saved')

    await wrapper.get('[data-testid="web-search-configuration-card-stub"]').trigger('click')
    expect(wrapper.get('[data-testid="server-settings-basics-notification"]').text()).toContain('Search save failed')
  })

  it('wires the real streaming parser card in Basics and saves XML through the settings store', async () => {
    const { wrapper, store } = await mountComponentWithRealStreamingParser([
      streamParserSetting('api_tool_call'),
    ])

    expect(wrapper.find('[data-testid="streaming-parser-card"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="streaming-parser-toggle"]').attributes('aria-checked')).toBe('false')

    await wrapper.get('[data-testid="streaming-parser-toggle"]').trigger('click')
    await wrapper.get('[data-testid="streaming-parser-save"]').trigger('click')
    await flushPromises()

    expect(store.updateServerSetting).toHaveBeenCalledWith(
      STREAM_PARSER_SETTING_KEY,
      'xml',
    )
  })
})
