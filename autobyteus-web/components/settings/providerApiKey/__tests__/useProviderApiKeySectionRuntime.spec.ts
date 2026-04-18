import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'

import { useProviderApiKeySectionRuntime } from '../useProviderApiKeySectionRuntime'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'

const { localizationState } = vi.hoisted(() => ({
  localizationState: {
    translations: {
      'settings.components.settings.ProviderAPIKeyManager.failed_to_load_providers_and_models': 'Failed to load providers and models',
      'settings.components.settings.ProviderAPIKeyManager.models_reloaded_successfully': 'Models reloaded and refreshed successfully',
      'settings.components.settings.ProviderAPIKeyManager.failed_to_reload_models': 'Failed to reload models',
      'settings.components.settings.ProviderAPIKeyManager.models_reloaded_for_provider': 'Models reloaded for {{provider}}',
      'settings.components.settings.ProviderAPIKeyManager.failed_to_reload_models_for_provider': 'Failed to reload models for {{provider}}',
      'settings.components.settings.ProviderAPIKeyManager.gemini_setup_saved_successfully': 'Gemini setup saved successfully',
      'settings.components.settings.ProviderAPIKeyManager.api_key_saved_successfully': 'API key for {{provider}} saved successfully',
      'settings.components.settings.ProviderAPIKeyManager.failed_to_save_api_key': 'Failed to save API key for {{provider}}',
      'settings.components.settings.ProviderAPIKeyManager.custom_provider_saved_successfully': 'Custom provider saved successfully',
      'settings.components.settings.ProviderAPIKeyManager.failed_to_save_custom_provider': 'Failed to save custom provider',
      'settings.components.settings.ProviderAPIKeyManager.custom_provider_deleted_successfully': 'Custom provider {{provider}} removed successfully',
      'settings.components.settings.ProviderAPIKeyManager.failed_to_delete_custom_provider': 'Failed to remove custom provider {{provider}}',
      'settings.components.settings.ProviderAPIKeyManager.new_custom_provider': 'New Provider',
    } as Record<string, string>,
  },
}))

const translate = (key: string, params?: Record<string, unknown>) => {
  const template = localizationState.translations[key] ?? key
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, token) => String(params?.[token] ?? ''))
}

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string, params?: Record<string, unknown>) => translate(key, params),
  }),
}))

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const RuntimeHarness = defineComponent({
  setup(_, { expose }) {
    const runtime = useProviderApiKeySectionRuntime()
    expose(runtime)
    return () => h('div')
  },
})

const openAiRow = {
  provider: {
    id: 'OPENAI',
    name: 'OpenAI',
    providerType: 'OPENAI',
    isCustom: false,
    baseUrl: null,
    apiKeyConfigured: false,
    status: 'NOT_APPLICABLE',
    statusMessage: null,
  },
  models: [{ modelIdentifier: 'gpt-4o', name: 'GPT-4o', providerType: 'OPENAI' }],
}

const anthropicRow = {
  provider: {
    id: 'ANTHROPIC',
    name: 'Anthropic',
    providerType: 'ANTHROPIC',
    isCustom: false,
    baseUrl: null,
    apiKeyConfigured: true,
    status: 'NOT_APPLICABLE',
    statusMessage: null,
  },
  models: [{ modelIdentifier: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', providerType: 'ANTHROPIC' }],
}

const customProviderRow = {
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
  models: [{ modelIdentifier: 'openai-compatible:provider_gateway:model-a', name: 'Model A', providerType: 'OPENAI_COMPATIBLE' }],
}

const mountRuntime = (storePatch: Record<string, any> = {}) => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: {
      llmProviderConfig: {
        providersWithModels: [],
        audioProvidersWithModels: [],
        imageProvidersWithModels: [],
        geminiSetup: {
          mode: 'AI_STUDIO',
          geminiApiKeyConfigured: false,
          vertexApiKeyConfigured: false,
          vertexProject: null,
          vertexLocation: null,
        },
        providerConfigs: {},
        isLoadingModels: false,
        isReloadingModels: false,
        isReloadingProviderModels: false,
        reloadingProvider: null,
        hasFetchedProviders: true,
        ...storePatch,
      },
    },
  })
  setActivePinia(pinia)
  const store = useLLMProviderConfigStore()
  store.fetchProvidersWithModels = vi.fn().mockResolvedValue(store.providersWithModels)
  store.fetchGeminiSetupConfig = vi.fn().mockResolvedValue(store.geminiSetup)
  store.getLLMProviderApiKeyConfigured = vi.fn().mockResolvedValue(false)
  store.setLLMProviderApiKey = vi.fn().mockResolvedValue(true)
  store.setGeminiSetupConfig = vi.fn().mockResolvedValue(true)
  store.reloadModels = vi.fn().mockResolvedValue(true)
  store.reloadModelsForProvider = vi.fn().mockResolvedValue(true)
  store.probeCustomProvider = vi.fn().mockResolvedValue({
    name: 'Internal Gateway',
    providerType: 'OPENAI_COMPATIBLE',
    baseUrl: 'https://gateway.example.com/v1',
    discoveredModels: [{ id: 'model-a', name: 'Model A' }],
  })
  store.createCustomProvider = vi.fn().mockResolvedValue({
    id: 'provider_gateway',
    name: 'Internal Gateway',
    providerType: 'OPENAI_COMPATIBLE',
    isCustom: true,
    baseUrl: 'https://gateway.example.com/v1',
    apiKeyConfigured: true,
    status: 'READY',
    statusMessage: null,
  })
  store.deleteCustomProvider = vi.fn().mockImplementation(async (providerId: string) => {
    store.providersWithModels = store.providersWithModels.filter((row) => row.provider.id !== providerId)
    store.audioProvidersWithModels = store.audioProvidersWithModels.filter((row) => row.provider.id !== providerId)
    store.imageProvidersWithModels = store.imageProvidersWithModels.filter((row) => row.provider.id !== providerId)
    return true
  })

  const wrapper = mount(RuntimeHarness, { global: { plugins: [pinia] } })
  return { wrapper, store }
}

describe('useProviderApiKeySectionRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hydrates configured state from provider objects and selects the first configured provider', async () => {
    const { wrapper, store } = mountRuntime({
      providersWithModels: [openAiRow, anthropicRow],
    })

    await (wrapper.vm as any).initialize()
    await flushPromises()

    expect((wrapper.vm as any).selectedProviderId).toBe('ANTHROPIC')
    expect((wrapper.vm as any).providerConfigs.ANTHROPIC.apiKeyConfigured).toBe(true)
    expect(store.getLLMProviderApiKeyConfigured).not.toHaveBeenCalled()
  })

  it('keeps built-in provider API-key save orchestration in the runtime', async () => {
    const { wrapper, store } = mountRuntime({
      providersWithModels: [openAiRow],
    })

    await (wrapper.vm as any).initialize()
    await (wrapper.vm as any).saveProviderApiKey('OPENAI', 'runtime-key')
    await flushPromises()

    expect(store.setLLMProviderApiKey).toHaveBeenCalledWith('OPENAI', 'runtime-key')
    expect((wrapper.vm as any).notification.message).toBe('API key for OpenAI saved successfully')
  })

  it('probes and saves custom providers through the provider-centered draft flow', async () => {
    const { wrapper, store } = mountRuntime({
      providersWithModels: [openAiRow],
    })

    await (wrapper.vm as any).initialize()
    expect((wrapper.vm as any).allProvidersWithModels.at(-1)?.label).toBe('New Provider')
    await (wrapper.vm as any).selectProvider('__new_custom_provider__')
    ;(wrapper.vm as any).updateCustomProviderDraft({
      name: 'Internal Gateway',
      providerType: 'OPENAI_COMPATIBLE',
      baseUrl: 'https://gateway.example.com/v1',
      apiKey: 'secret',
    })

    await (wrapper.vm as any).probeCustomProviderDraft()
    await (wrapper.vm as any).saveCustomProviderDraft()
    await flushPromises()

    expect(store.probeCustomProvider).toHaveBeenCalledWith({
      name: 'Internal Gateway',
      providerType: 'OPENAI_COMPATIBLE',
      baseUrl: 'https://gateway.example.com/v1',
      apiKey: 'secret',
    })
    expect(store.createCustomProvider).toHaveBeenCalledWith({
      name: 'Internal Gateway',
      providerType: 'OPENAI_COMPATIBLE',
      baseUrl: 'https://gateway.example.com/v1',
      apiKey: 'secret',
    }, 'autobyteus')
    expect((wrapper.vm as any).selectedProviderId).toBe('provider_gateway')
    expect((wrapper.vm as any).notification.message).toBe('Custom provider saved successfully')
  })

  it('deletes saved custom providers and falls back to the next available provider', async () => {
    const { wrapper, store } = mountRuntime({
      providersWithModels: [openAiRow, customProviderRow],
    })

    await (wrapper.vm as any).initialize()
    ;(wrapper.vm as any).selectedProviderId = 'provider_gateway'
    await (wrapper.vm as any).deleteCustomProvider('provider_gateway')
    await flushPromises()

    expect(store.deleteCustomProvider).toHaveBeenCalledWith('provider_gateway', 'autobyteus')
    expect((wrapper.vm as any).selectedProviderId).toBe('OPENAI')
    expect((wrapper.vm as any).notification.message).toBe('Custom provider Internal Gateway removed successfully')
  })
})
