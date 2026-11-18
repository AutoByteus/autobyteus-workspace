import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { ProviderSummary } from '../../useProviderApiKeySectionRuntime'
import CustomProviderDetailsCard from '../CustomProviderDetailsCard.vue'

const provider: ProviderSummary = {
  id: 'provider_gateway',
  name: 'Internal Gateway',
  label: 'Internal Gateway',
  totalModels: 2,
  isCustom: true,
  providerType: 'OPENAI_COMPATIBLE',
  baseUrl: 'https://gateway.example/v1',
  apiKeyConfigured: true,
  catalogMode: 'DISCOVERED',
}

const translate = (key: string, params?: Record<string, unknown>) => key.endsWith('.models_count')
  ? `${params?.count} models`
  : key.endsWith('.model_count_loading')
    ? 'Model count loading'
    : key.endsWith('.remove_custom_provider')
      ? 'Remove'
      : key

describe('CustomProviderDetailsCard', () => {
  it('renders only current custom-provider identity and model-count fields', async () => {
    const wrapper = mount(CustomProviderDetailsCard, {
      props: { provider, deleting: false },
      global: { mocks: { $t: translate } },
    })

    expect(wrapper.text()).toContain('Internal Gateway')
    expect(wrapper.text()).toContain('https://gateway.example/v1')
    expect(wrapper.text()).toContain('OPENAI_COMPATIBLE')
    expect(wrapper.text()).toContain('2 models')
    expect(wrapper.findAll('.rounded-full.border').map(badge => badge.text()))
      .toEqual(['OPENAI_COMPATIBLE', '2 models'])

    await wrapper.get('[data-testid="delete-custom-provider-button"]').trigger('click')
    expect(wrapper.emitted('delete')).toEqual([[]])
  })

  // BEH-032 (d) of autobyteus-294: while the models load (or after the load failed) the count is unknown; the card
  // shows "—" with the loading label, as the provider list does, never "null models".
  it('shows an unknown model count as "—" with the loading label', () => {
    const wrapper = mount(CustomProviderDetailsCard, {
      props: { provider: { ...provider, totalModels: null }, deleting: false },
      global: { mocks: { $t: translate } },
    })

    const count = wrapper.get('[data-testid="custom-provider-model-count"]')
    expect(count.text()).toBe('—')
    expect(count.attributes('aria-label')).toBe('Model count loading')
    expect(wrapper.text()).not.toContain('null')
  })

  it('labels a known model count without the loading label', () => {
    const wrapper = mount(CustomProviderDetailsCard, {
      props: { provider, deleting: false },
      global: { mocks: { $t: translate } },
    })

    const count = wrapper.get('[data-testid="custom-provider-model-count"]')
    expect(count.text()).toBe('2 models')
    expect(count.attributes('aria-label')).toBeUndefined()
  })
})
