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

const mountRuntime = (storePatch: Record<string, any> = {}, keyLookup: (provider: string) => Promise<string> = async () => '') => {
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
  store.getLLMProviderApiKey = vi.fn(keyLookup as any)
  store.setLLMProviderApiKey = vi.fn().mockResolvedValue(true)
  store.setGeminiSetupConfig = vi.fn().mockResolvedValue(true)
  store.reloadModels = vi.fn().mockResolvedValue(true)
  store.reloadModelsForProvider = vi.fn().mockResolvedValue(true)

  const wrapper = mount(RuntimeHarness, { global: { plugins: [pinia] } })
  return { wrapper, store }
}

describe('useProviderApiKeySectionRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hydrates provider masks and selects the first configured provider during initialize', async () => {
    const { wrapper } = mountRuntime(
      {
        providersWithModels: [
          { provider: 'OPENAI', models: [{ modelIdentifier: 'gpt-4o' }] },
          { provider: 'ANTHROPIC', models: [{ modelIdentifier: 'claude-3-7-sonnet' }] },
        ],
      },
      async (provider) => (provider === 'ANTHROPIC' ? 'configured-key' : ''),
    )

    await (wrapper.vm as any).initialize()
    await flushPromises()

    expect((wrapper.vm as any).selectedModelProvider).toBe('ANTHROPIC')
    expect((wrapper.vm as any).providerConfigs.ANTHROPIC.apiKey).toBe('********')
  })

  it('keeps save orchestration in the runtime and publishes localized notification state', async () => {
    const { wrapper, store } = mountRuntime({
      providersWithModels: [{ provider: 'OPENAI', models: [{ modelIdentifier: 'gpt-4o' }] }],
    })

    await (wrapper.vm as any).initialize()
    await (wrapper.vm as any).saveProviderApiKey('OPENAI', 'runtime-key')
    await flushPromises()

    expect(store.setLLMProviderApiKey).toHaveBeenCalledWith('OPENAI', 'runtime-key')
    expect((wrapper.vm as any).notification.message).toBe('API key for OPENAI saved successfully')
  })
})
