import { createTestingPinia } from '@pinia/testing'
import { mount } from '@vue/test-utils'
import { setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { useProviderApiKeySectionRuntime } from '../useProviderApiKeySectionRuntime'

const translations: Record<string, string> = {
  'settings.components.settings.ProviderAPIKeyManager.failed_to_load_providers_and_models': 'Failed to load providers',
  'settings.components.settings.ProviderAPIKeyManager.models_reloaded_successfully': 'Models reloaded',
  'settings.components.settings.ProviderAPIKeyManager.failed_to_reload_models': 'Reload failed',
  'settings.components.settings.ProviderAPIKeyManager.models_reloaded_for_provider': 'Reloaded {{provider}}',
  'settings.components.settings.ProviderAPIKeyManager.failed_to_reload_models_for_provider': 'Failed {{provider}}',
  'settings.components.settings.ProviderAPIKeyManager.gemini_option_saved': '{{option}} saved',
  'settings.components.settings.ProviderAPIKeyManager.gemini_option_removed': '{{option}} removed',
  'settings.components.settings.ProviderAPIKeyManager.gemini_mode_activated': '{{option}} activated',
  'settings.components.settings.ProviderAPIKeyManager.gemini_activation_partial': '{{option}} saved but inactive',
  'settings.components.settings.ProviderAPIKeyManager.gemini_removal_partial': '{{option}} inactive but not removed',
  'settings.components.settings.ProviderAPIKeyManager.api_key_saved_successfully': '{{provider}} saved',
  'settings.components.settings.ProviderAPIKeyManager.failed_to_save_api_key': '{{provider}} save failed',
  'settings.components.settings.ProviderAPIKeyManager.api_key_removed_successfully': '{{provider}} removed',
  'settings.components.settings.ProviderAPIKeyManager.failed_to_remove_api_key': '{{provider}} remove failed',
  'settings.components.settings.ProviderAPIKeyManager.custom_provider_saved_successfully': 'Custom saved',
  'settings.components.settings.ProviderAPIKeyManager.failed_to_save_custom_provider': 'Custom failed',
  'settings.components.settings.ProviderAPIKeyManager.custom_provider_deleted_successfully': '{{provider}} deleted',
  'settings.components.settings.ProviderAPIKeyManager.failed_to_delete_custom_provider': '{{provider}} delete failed',
  'settings.components.settings.ProviderAPIKeyManager.new_custom_provider': 'New Provider',
}

const translate = (key: string, params?: Record<string, unknown>) =>
  (translations[key] ?? key).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, token) => String(params?.[token] ?? ''))

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({ t: translate }),
}))

const group = (
  id: string,
  configured: boolean,
  capabilityCounts: [number, number, number, number] = [1, 0, 0, 0],
) => {
  const models = (count: number, kind: string) => Array.from({ length: count }, (_, index) => ({
    modelIdentifier: `${id}-${kind}-${index}`, name: `${kind}-${index}`, providerType: id,
  }))
  return {
    provider: {
      id, name: id, providerType: id, isCustom: false, baseUrl: null,
      apiKeyConfigured: configured, status: 'NOT_APPLICABLE', statusMessage: null,
    },
    llmModels: models(capabilityCounts[0], 'llm'),
    audioModels: models(capabilityCounts[1], 'audio'),
    imageModels: models(capabilityCounts[2], 'image'),
    videoModels: models(capabilityCounts[3], 'video'),
  }
}

const RuntimeHarness = defineComponent({
  setup(_, { expose }) {
    expose(useProviderApiKeySectionRuntime())
    return () => h('div')
  },
})

const mountRuntime = (groups = [group('OPENAI', true, [1, 1, 1, 0])]) => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: {
      llmProviderConfig: {
        providerSettingsGroups: groups,
        geminiSetup: {
          activeMode: null,
          aiStudioConfigured: false,
          vertexExpressConfigured: false,
          vertexProject: null,
        },
        isLoadingProviderSettings: false,
        isReloadingModels: false,
        isReloadingProviderModels: false,
        reloadingProvider: null,
      },
    },
  })
  setActivePinia(pinia)
  const store = useLLMProviderConfigStore()
  store.fetchProviderSettings = vi.fn().mockResolvedValue(store.providerSettingsGroups)
  store.fetchGeminiSetupConfig = vi.fn().mockResolvedValue(store.geminiSetup)
  store.reloadModels = vi.fn().mockResolvedValue(true)
  store.reloadModelsForProvider = vi.fn().mockResolvedValue(true)
  store.setLLMProviderApiKey = vi.fn().mockResolvedValue(true)
  store.removeLLMProviderApiKey = vi.fn().mockResolvedValue(true)
  store.probeCustomProvider = vi.fn().mockResolvedValue({ discoveredModels: [{ id: 'm', name: 'M' }] })
  store.createCustomProvider = vi.fn().mockResolvedValue('provider_gateway')
  store.deleteCustomProvider = vi.fn().mockResolvedValue(true)
  store.saveGeminiConfigurationOption = vi.fn()
  store.activateGeminiConfigurationOption = vi.fn()
  store.removeGeminiConfigurationOption = vi.fn()
  const wrapper = mount(RuntimeHarness, { global: { plugins: [pinia] } })
  return { wrapper, store }
}

describe('useProviderApiKeySectionRuntime', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses one provider group for identity, status, and all capability counts', async () => {
    const { wrapper } = mountRuntime([
      group('ANTHROPIC', false),
      group('OPENAI', true, [1, 2, 3, 4]),
    ])
    await (wrapper.vm as any).initialize()
    expect((wrapper.vm as any).selectedProviderId).toBe('OPENAI')
    expect((wrapper.vm as any).selectedProviderConfigured).toBe(true)
    expect((wrapper.vm as any).selectedProviderAudioModels).toHaveLength(2)
    expect((wrapper.vm as any).selectedProviderImageModels).toHaveLength(3)
    expect((wrapper.vm as any).selectedProviderVideoModels).toHaveLength(4)
    expect((wrapper.vm as any).isProviderConfigured('ANTHROPIC')).toBe(false)
  })

  it('never supplies one provider status from another provider', async () => {
    const { wrapper } = mountRuntime([group('OPENAI', false), group('ANTHROPIC', true)])
    await (wrapper.vm as any).initialize()
    ;(wrapper.vm as any).selectedProviderId = 'OPENAI'
    expect((wrapper.vm as any).selectedProviderConfigured).toBe(false)
  })

  it('saves and removes through exact provider commands', async () => {
    const { wrapper, store } = mountRuntime()
    await (wrapper.vm as any).initialize()
    await expect((wrapper.vm as any).saveProviderApiKey('OPENAI', 'synthetic-key')).resolves.toBe(true)
    await expect((wrapper.vm as any).removeProviderApiKey('OPENAI')).resolves.toBe(true)
    expect(store.setLLMProviderApiKey).toHaveBeenCalledWith('OPENAI', 'synthetic-key')
    expect(store.removeLLMProviderApiKey).toHaveBeenCalledWith('OPENAI')
  })

  it('sends no type/runtime fields in custom provider commands', async () => {
    const { wrapper, store } = mountRuntime()
    await (wrapper.vm as any).initialize()
    ;(wrapper.vm as any).customProviderDraft.name = 'Gateway'
    ;(wrapper.vm as any).customProviderDraft.baseUrl = 'https://gateway.example.com/v1'
    ;(wrapper.vm as any).customProviderDraft.apiKey = 'synthetic-key'
    await (wrapper.vm as any).probeCustomProviderDraft()
    await (wrapper.vm as any).saveCustomProviderDraft()
    expect(store.probeCustomProvider).toHaveBeenCalledWith({
      name: 'Gateway', baseUrl: 'https://gateway.example.com/v1', apiKey: 'synthetic-key',
    })
    expect(store.createCustomProvider).toHaveBeenCalledWith({
      name: 'Gateway', baseUrl: 'https://gateway.example.com/v1', apiKey: 'synthetic-key',
    })
  })

  it('detects truthful partial Gemini save-and-activate from the returned state', async () => {
    const { wrapper, store } = mountRuntime([group('GEMINI', false)])
    store.saveGeminiConfigurationOption = vi.fn().mockResolvedValue({
      activeMode: null,
      aiStudioConfigured: true,
      vertexExpressConfigured: false,
      vertexProject: null,
    })
    await expect((wrapper.vm as any).saveAndActivateGeminiConfigurationOption({
      option: 'AI_STUDIO', apiKey: 'synthetic-key',
    })).resolves.toBe(false)
    expect((wrapper.vm as any).notification.message).toBe('AI_STUDIO saved but inactive')
  })

  it('reports full Gemini activation only when returned active mode matches', async () => {
    const { wrapper, store } = mountRuntime([group('GEMINI', true)])
    store.activateGeminiConfigurationOption = vi.fn().mockResolvedValue({
      activeMode: 'VERTEX_EXPRESS',
      aiStudioConfigured: false,
      vertexExpressConfigured: true,
      vertexProject: null,
    })
    await expect((wrapper.vm as any).activateGeminiConfigurationOption('VERTEX_EXPRESS'))
      .resolves.toBe(true)
    expect((wrapper.vm as any).notification.message).toBe('VERTEX_EXPRESS activated')
  })

  it('keeps conflicting writes fenced while a Gemini action is pending', async () => {
    const { wrapper, store } = mountRuntime([group('GEMINI', false)])
    let resolve!: (value: any) => void
    store.saveGeminiConfigurationOption = vi.fn().mockReturnValue(new Promise((done) => { resolve = done }))
    const pending = (wrapper.vm as any).saveGeminiConfigurationOption({
      option: 'AI_STUDIO', apiKey: 'synthetic-key',
    })
    expect((wrapper.vm as any).saving).toBe(true)
    await expect((wrapper.vm as any).saveProviderApiKey('OPENAI', 'other-key')).resolves.toBe(false)
    resolve({ activeMode: null, aiStudioConfigured: true, vertexExpressConfigured: false, vertexProject: null })
    await pending
    expect((wrapper.vm as any).saving).toBe(false)
  })
})
