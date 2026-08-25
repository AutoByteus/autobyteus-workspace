import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import RuntimeModelConfigFields from '../RuntimeModelConfigFields.vue'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { useRuntimeAvailabilityStore } from '~/stores/runtimeAvailabilityStore'

vi.mock('~/stores/llmProviderConfig', () => ({ useLLMProviderConfigStore: vi.fn() }))
vi.mock('~/stores/runtimeAvailabilityStore', () => ({ useRuntimeAvailabilityStore: vi.fn() }))

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

describe('RuntimeModelConfigFields stored historical values', () => {
  let providers: any[]
  beforeEach(() => {
    setActivePinia(createPinia())
    providers = []
    ;(useLLMProviderConfigStore as any).mockReturnValue({
      fetchProvidersWithModels: vi.fn().mockResolvedValue([]),
      ensureMissingDynamicProviders: vi.fn().mockResolvedValue(undefined),
      providersWithModelsForSelection: vi.fn(() => providers),
    })
    ;(useRuntimeAvailabilityStore as any).mockReturnValue({
      availabilities: [],
      fetchRuntimeAvailabilities: vi.fn().mockResolvedValue([]),
      availabilityByKind: vi.fn().mockReturnValue(null),
      isRuntimeEnabled: vi.fn().mockReturnValue(false),
      runtimeReason: vi.fn().mockReturnValue(null),
    })
  })

  it('keeps removed runtime/model/config values visible inside disabled shared controls', async () => {
    const wrapper = mount(RuntimeModelConfigFields, {
      props: {
        runtimeKind: 'removed-runtime',
        llmModelIdentifier: 'removed-model',
        llmConfig: { temperature: 0.2, nested: { enabled: true } },
        disabled: true,
        readOnly: true,
        runtimeSelectionLocked: true,
        historicalValueUnavailableMessage: 'Saved value is no longer available.',
        historicalModelConfigTitle: 'Saved model configuration',
        historicalModelConfig: true,
      },
    })
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('removed-runtime')
    expect(wrapper.text()).toContain('Runtime is not available in current capabilities.')
    expect(wrapper.findComponent({ name: 'SearchableGroupedSelect' }).text()).toContain('removed-model')
    expect(wrapper.get('[data-test="historical-model-unavailable"]').text())
      .toBe('Saved value is no longer available.')
    const fallback = wrapper.get('[data-test="historical-model-config-fallback"]')
    expect(fallback.text()).toContain('Saved model configuration')
    expect(fallback.text()).toContain('temperature')
    expect(fallback.text()).toContain('0.2')
    expect(fallback.text()).toContain('{"enabled":true}')
    expect(wrapper.findAll('[data-test="historical-model-config-residual"]')
      .map((row) => row.attributes('data-historical-key'))).toEqual(['nested', 'temperature'])
    expect(wrapper.emitted('update:runtimeKind')).toBeUndefined()
    expect(wrapper.emitted('update:llmModelIdentifier')).toBeUndefined()
    expect(wrapper.emitted('update:llmConfig')).toBeUndefined()
  })

  it('keeps an editable numeric draft rendered while reporting current-schema validation errors', async () => {
    providers = [{
      provider: { id: 'OPENAI', name: 'OpenAI', providerType: 'OPENAI', isCustom: false },
      models: [{
        modelIdentifier: 'gpt-4', name: 'GPT-4', value: 'gpt-4', canonicalName: 'gpt-4',
        providerId: 'OPENAI', providerName: 'OpenAI', providerType: 'OPENAI', runtime: 'api',
        configSchema: {
          type: 'object',
          properties: { budget: { type: 'integer', minimum: 1, maximum: 10 } },
        },
      }],
    }]
    const wrapper = mount(RuntimeModelConfigFields, {
      props: {
        runtimeKind: 'autobyteus',
        llmModelIdentifier: 'gpt-4',
        llmConfig: { budget: 0 },
        runtimeSelectionLocked: true,
        modelSelectionLocked: true,
        historicalModelConfig: true,
      },
    })
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.get('input[type="number"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Value must be at least 1.')
    expect(wrapper.emitted('schema-state')?.at(-1)).toEqual([{
      status: 'invalid',
      message: 'Value must be at least 1.',
    }])
  })
})
