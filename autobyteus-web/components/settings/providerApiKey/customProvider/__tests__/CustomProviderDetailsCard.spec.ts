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

describe('CustomProviderDetailsCard', () => {
  it('renders only current custom-provider identity and model-count fields', async () => {
    const wrapper = mount(CustomProviderDetailsCard, {
      props: { provider, deleting: false },
      global: {
        mocks: {
          $t: (key: string, params?: Record<string, unknown>) => key.endsWith('.models_count')
            ? `${params?.count} models`
            : key.endsWith('.remove_custom_provider')
              ? 'Remove'
              : key,
        },
      },
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
})
