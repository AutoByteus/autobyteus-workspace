import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ServerSettingsBasicsPanel from '../ServerSettingsBasicsPanel.vue'

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
      SkillImprovementFeatureToggleCard: { template: '<div data-testid="skill-improvement-feature-toggle-card-stub">Skill Improvement</div>' },
      MediaDefaultModelsCard: { template: '<div data-testid="media-default-models-card-stub">Media Models</div>' },
      CodexFullAccessCard: { template: '<div data-testid="codex-full-access-card-stub">Codex Full Access</div>' },
      LiveResponseStreamingCard: { template: '<div data-testid="live-response-streaming-card-stub">Live response</div>' },
      FeaturedCatalogItemsCard: { template: '<div data-testid="featured-catalog-items-card-stub">Featured Catalog</div>' },
      WebSearchConfigurationCard: webSearchStub,
      CompactionConfigCard: { template: '<div data-testid="compaction-config-card-stub">Compaction</div>' },
    },
  },
})

describe('ServerSettingsBasicsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('composes only current endpoint and focused Basics cards', () => {
    const wrapper = mountComponent()

    expect(wrapper.find('[data-testid="server-settings-endpoint-cards-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="applications-feature-toggle-card-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="skill-improvement-feature-toggle-card-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="media-default-models-card-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="codex-full-access-card-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="live-response-streaming-card-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="featured-catalog-items-card-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="web-search-configuration-card-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="compaction-config-card-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="streaming-parser-card"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="streaming-parser-toggle"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Streaming Parser')
    expect(wrapper.text()).not.toContain('XML tool calling')
  })

  it('owns Basics notifications emitted by endpoint and web search cards', async () => {
    const wrapper = mountComponent()

    await wrapper.get('[data-testid="server-settings-endpoint-cards-stub"]').trigger('click')
    expect(wrapper.get('[data-testid="server-settings-basics-notification"]').text()).toContain('Endpoint settings saved')

    await wrapper.get('[data-testid="web-search-configuration-card-stub"]').trigger('click')
    expect(wrapper.get('[data-testid="server-settings-basics-notification"]').text()).toContain('Search save failed')
  })
})
