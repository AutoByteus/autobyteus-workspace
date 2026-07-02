import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MobileLaunchRuntimeModelCard from '../MobileLaunchRuntimeModelCard.vue'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { useRuntimeAvailabilityStore } from '~/stores/runtimeAvailabilityStore'

vi.mock('~/components/agentTeams/SearchableGroupedSelect.vue', () => ({
  default: {
    name: 'SearchableGroupedSelect',
    template: '<div class="searchable-select-stub"></div>',
    props: ['modelValue', 'disabled', 'options'],
    emits: ['update:modelValue'],
  },
}))

vi.mock('~/stores/llmProviderConfig', () => ({
  useLLMProviderConfigStore: vi.fn(),
}))

vi.mock('~/stores/runtimeAvailabilityStore', () => ({
  useRuntimeAvailabilityStore: vi.fn(),
}))

describe('MobileLaunchRuntimeModelCard', () => {
  let llmStore: any
  let runtimeAvailabilityStore: any

  const responseModelProvider = {
    provider: {
      id: 'OPENAI',
      name: 'OpenAI',
      providerType: 'OPENAI',
      isCustom: false,
      baseUrl: null,
      apiKeyConfigured: true,
      status: 'NOT_APPLICABLE',
      statusMessage: null,
    },
    models: [
      {
        modelIdentifier: 'gpt-5.5-responses',
        name: 'GPT-5.5 Responses',
        value: 'gpt-5.5-responses',
        canonicalName: 'gpt-5.5-responses',
        providerId: 'OPENAI',
        providerName: 'OpenAI',
        providerType: 'OPENAI',
        runtime: 'autobyteus',
        configSchema: {
          parameters: [
            {
              name: 'reasoning_effort',
              type: 'string',
              title: 'Reasoning Effort',
              default_value: 'none',
              enum_values: ['none', 'low', 'medium', 'high'],
            },
            {
              name: 'reasoning_summary',
              type: 'string',
              title: 'Reasoning Summary',
              default_value: 'none',
              enum_values: ['none', 'auto', 'concise'],
            },
          ],
        },
      },
    ],
  }

  beforeEach(() => {
    setActivePinia(createPinia())

    llmStore = {
      providersWithModels: [responseModelProvider],
      providersWithModelsForSelection: [responseModelProvider],
      fetchProvidersWithModels: vi.fn(async () => [responseModelProvider]),
    }

    runtimeAvailabilityStore = {
      availabilities: [
        { runtimeKind: 'autobyteus', enabled: true, reason: null },
      ],
      fetchRuntimeAvailabilities: vi.fn().mockResolvedValue([]),
      availabilityByKind: vi.fn((runtimeKind: string) =>
        runtimeAvailabilityStore.availabilities.find((row: any) => row.runtimeKind === runtimeKind) ?? null,
      ),
      isRuntimeEnabled: vi.fn((runtimeKind: string) =>
        runtimeAvailabilityStore.availabilityByKind(runtimeKind)?.enabled ?? runtimeKind === 'autobyteus',
      ),
      runtimeReason: vi.fn((runtimeKind: string) =>
        runtimeAvailabilityStore.availabilityByKind(runtimeKind)?.reason ?? null,
      ),
    }

    ;(useLLMProviderConfigStore as any).mockReturnValue(llmStore)
    ;(useRuntimeAvailabilityStore as any).mockReturnValue(runtimeAvailabilityStore)
  })

  it('defaults supported thinking on in mobile launch config', async () => {
    const wrapper = mount(MobileLaunchRuntimeModelCard, {
      props: {
        variant: 'agent',
        runtimeKind: 'autobyteus',
        llmModelIdentifier: 'gpt-5.5-responses',
        llmConfig: null,
      },
    })

    await flushPromises()
    await wrapper.vm.$nextTick()

    const defaultedConfig = wrapper.emitted('update:llmConfig')?.at(-1)?.[0] as Record<string, unknown>
    expect(defaultedConfig).toEqual({
      reasoning_summary: 'auto',
    })

    await wrapper.setProps({ llmConfig: defaultedConfig })

    expect(wrapper.getComponent({ name: 'ModelConfigBasic' }).props('enabled')).toBe(true)
  })

  it('does not default thinking on while the mobile launch card is disabled', async () => {
    const wrapper = mount(MobileLaunchRuntimeModelCard, {
      props: {
        variant: 'team',
        runtimeKind: 'autobyteus',
        llmModelIdentifier: 'gpt-5.5-responses',
        llmConfig: null,
        disabled: true,
      },
    })

    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:llmConfig')).toBeUndefined()
  })
})
