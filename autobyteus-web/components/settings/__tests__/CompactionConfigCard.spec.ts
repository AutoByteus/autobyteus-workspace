import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import CompactionConfigCard from '../CompactionConfigCard.vue'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { useServerSettingsStore } from '~/stores/serverSettings'

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const mountComponent = async (providersWithModels: any[] = [
  {
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
      { modelIdentifier: 'gpt-4.1', name: 'GPT-4.1', providerId: 'OPENAI', providerName: 'OpenAI', providerType: 'OPENAI' },
      { modelIdentifier: 'gpt-5', name: 'GPT-5', providerId: 'OPENAI', providerName: 'OpenAI', providerType: 'OPENAI' },
    ],
  },
]) => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: false,
    initialState: {
      serverSettings: {
        settings: [
          {
            key: 'AUTOBYTEUS_COMPACTION_TRIGGER_RATIO',
            value: '0.75',
            description: 'ratio',
            isEditable: true,
            isDeletable: false,
          },
          {
            key: 'AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER',
            value: 'gpt-5',
            description: 'model',
            isEditable: true,
            isDeletable: false,
          },
          {
            key: 'AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE',
            value: '4096',
            description: 'override',
            isEditable: true,
            isDeletable: false,
          },
          {
            key: 'AUTOBYTEUS_COMPACTION_DEBUG_LOGS',
            value: 'true',
            description: 'logs',
            isEditable: true,
            isDeletable: false,
          },
        ],
      },
      llmProviderConfig: {
        providersWithModels,
      },
    },
  })
  setActivePinia(pinia)

  const serverSettingsStore = useServerSettingsStore()
  serverSettingsStore.updateServerSetting = vi.fn().mockResolvedValue(true)

  const llmProviderConfigStore = useLLMProviderConfigStore()
  llmProviderConfigStore.fetchProvidersWithModels = vi.fn().mockResolvedValue(
    llmProviderConfigStore.providersWithModels,
  )

  const wrapper = mount(CompactionConfigCard, {
    global: {
      plugins: [pinia],
      stubs: {
        Icon: true,
      },
    },
  })

  await flushPromises()
  return { wrapper, serverSettingsStore }
}

describe('CompactionConfigCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('syncs typed inputs from the server settings store', async () => {
    const { wrapper } = await mountComponent()

    expect(wrapper.get('[data-testid="compaction-ratio-input"]').element).toHaveProperty('value', '75')
    expect(wrapper.get('[data-testid="compaction-model-select"]').element).toHaveProperty('value', 'gpt-5')
    expect(wrapper.get('[data-testid="compaction-context-override-input"]').element).toHaveProperty('value', '4096')
    expect((wrapper.get('[data-testid="compaction-debug-logs-toggle"]').element as HTMLInputElement).checked).toBe(true)
  })

  it('uses custom friendly labels while keeping built-in compaction labels on identifiers', async () => {
    const { wrapper } = await mountComponent([
      {
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
          { modelIdentifier: 'gpt-4.1', name: 'GPT-4.1', providerId: 'OPENAI', providerName: 'OpenAI', providerType: 'OPENAI' },
        ],
      },
      {
        provider: {
          id: 'provider_gateway',
          name: 'Internal Gateway',
          providerType: 'OPENAI_COMPATIBLE',
          isCustom: true,
          baseUrl: 'https://gateway.example.com/v1',
          apiKeyConfigured: true,
          status: 'READY',
          statusMessage: null,
        },
        models: [
          { modelIdentifier: 'openai-compatible:provider_gateway:model-a', name: 'Model A', providerId: 'provider_gateway', providerName: 'Internal Gateway', providerType: 'OPENAI_COMPATIBLE' },
        ],
      },
    ])

    const options = wrapper.findAll('[data-testid="compaction-model-select"] option').map((option) => option.text())
    expect(options).toContain('OpenAI / gpt-4.1')
    expect(options).toContain('Internal Gateway / Model A')
  })

  it('saves typed compaction settings through the server settings store', async () => {
    const { wrapper, serverSettingsStore } = await mountComponent()

    await wrapper.get('[data-testid="compaction-ratio-input"]').setValue('60')
    await wrapper.get('[data-testid="compaction-model-select"]').setValue('gpt-4.1')
    await wrapper.get('[data-testid="compaction-context-override-input"]').setValue('2048')
    await wrapper.get('[data-testid="compaction-debug-logs-toggle"]').setValue(false)
    await wrapper.get('[data-testid="compaction-config-save"]').trigger('click')
    await flushPromises()

    expect(serverSettingsStore.updateServerSetting).toHaveBeenNthCalledWith(
      1,
      'AUTOBYTEUS_COMPACTION_TRIGGER_RATIO',
      '0.6',
    )
    expect(serverSettingsStore.updateServerSetting).toHaveBeenNthCalledWith(
      2,
      'AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER',
      'gpt-4.1',
    )
    expect(serverSettingsStore.updateServerSetting).toHaveBeenNthCalledWith(
      3,
      'AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE',
      '2048',
    )
    expect(serverSettingsStore.updateServerSetting).toHaveBeenNthCalledWith(
      4,
      'AUTOBYTEUS_COMPACTION_DEBUG_LOGS',
      'false',
    )
  })
})
