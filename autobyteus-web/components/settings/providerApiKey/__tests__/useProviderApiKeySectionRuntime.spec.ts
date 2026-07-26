import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'

import { useProviderApiKeySectionRuntime } from '../useProviderApiKeySectionRuntime'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'


const configuredCredentialStatus = {
  vaultHealth: 'READY' as const,
  storageState: 'CONFIGURED' as const,
  instructionCode: null,
}
const missingCredentialStatus = {
  ...configuredCredentialStatus,
  storageState: 'MISSING' as const,
}

const { localizationState } = vi.hoisted(() => ({
  localizationState: {
    translations: {
      'settings.components.settings.ProviderAPIKeyManager.failed_to_load_providers_and_models': 'Failed to load providers and models',
      'settings.components.settings.ProviderAPIKeyManager.models_reloaded_successfully': 'Models reloaded and refreshed successfully',
      'settings.components.settings.ProviderAPIKeyManager.failed_to_reload_models': 'Failed to reload models',
      'settings.components.settings.ProviderAPIKeyManager.models_reloaded_for_provider': 'Models reloaded for {{provider}}',
      'settings.components.settings.ProviderAPIKeyManager.failed_to_reload_models_for_provider': 'Failed to reload models for {{provider}}',
      'settings.components.settings.ProviderAPIKeyManager.gemini_option_saved': '{{option}} saved',
      'settings.components.settings.ProviderAPIKeyManager.gemini_option_removed': '{{option}} removed',
      'settings.components.settings.ProviderAPIKeyManager.gemini_mode_activated': '{{option}} activated',
      'settings.components.settings.ProviderAPIKeyManager.gemini_activation_partial': '{{option}} saved but inactive',
      'settings.components.settings.ProviderAPIKeyManager.gemini_removal_partial': '{{option}} inactive but not removed',
      'settings.components.settings.ProviderAPIKeyManager.api_key_saved_successfully': 'API key for {{provider}} saved successfully',
      'settings.components.settings.ProviderAPIKeyManager.failed_to_save_api_key': 'Failed to save API key for {{provider}}',
      'settings.components.settings.ProviderAPIKeyManager.api_key_removed_successfully': 'API key for {{provider}} removed successfully',
      'settings.components.settings.ProviderAPIKeyManager.failed_to_remove_api_key': 'Failed to remove API key for {{provider}}',
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
    credentialStatus: missingCredentialStatus,
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
    credentialStatus: configuredCredentialStatus,
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
    credentialStatus: configuredCredentialStatus,
    status: 'READY',
    statusMessage: null,
  },
  models: [{ modelIdentifier: 'openai-compatible:provider_gateway:model-a', name: 'Model A', providerType: 'OPENAI_COMPATIBLE' }],
}

const geminiRow = {
  provider: {
    id: 'GEMINI',
    name: 'Gemini',
    providerType: 'GEMINI',
    isCustom: false,
    baseUrl: null,
    credentialStatus: missingCredentialStatus,
    status: 'NOT_APPLICABLE',
    statusMessage: null,
  },
  models: [{ modelIdentifier: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', providerType: 'GEMINI' }],
}

const geminiVideoRow = {
  provider: {
    ...geminiRow.provider,
  },
  models: [{ modelIdentifier: 'gemini-omni-flash-preview', name: 'Gemini Omni Flash Preview', providerType: 'GEMINI' }],
}

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object') {
    Object.freeze(value)
    for (const nested of Object.values(value as Record<string, unknown>)) {
      if (nested && typeof nested === 'object' && !Object.isFrozen(nested)) {
        deepFreeze(nested)
      }
    }
  }

  return value
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
        videoProvidersWithModels: [],
        geminiSetup: {
          activeMode: null,
          aiStudioCredentialStatus: missingCredentialStatus,
          vertexExpressCredentialStatus: missingCredentialStatus,
          vertexProjectStatus: 'MISSING',
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
  store.getLLMProviderCredentialStatus = vi.fn().mockResolvedValue(false)
  store.setLLMProviderApiKey = vi.fn().mockResolvedValue(true)
  store.removeLLMProviderApiKey = vi.fn().mockImplementation(async (providerId: string) => {
    store.providersWithModels = store.providersWithModels.map((row) => row.provider.id === providerId
      ? { ...row, provider: { ...row.provider, credentialStatus: missingCredentialStatus } }
      : row)
    return true
  })
  store.saveGeminiConfigurationOption = vi.fn().mockResolvedValue({
    operation: 'SAVED', outcome: 'SUCCEEDED', option: 'AI_STUDIO',
    optionStatus: 'CONFIGURED', activeMode: null,
    configurationOutcome: 'SUCCEEDED', modeOutcome: 'NOT_REQUESTED', instructionCode: null,
  })
  store.removeGeminiConfigurationOption = vi.fn().mockResolvedValue({
    operation: 'REMOVED', outcome: 'SUCCEEDED', option: 'AI_STUDIO',
    optionStatus: 'MISSING', activeMode: null,
    configurationOutcome: 'SUCCEEDED', modeOutcome: 'NOT_REQUESTED', instructionCode: null,
  })
  store.saveAndActivateGeminiConfigurationOption = vi.fn().mockResolvedValue({
    operation: 'SAVED_AND_ACTIVATED', outcome: 'SUCCEEDED', option: 'AI_STUDIO',
    optionStatus: 'CONFIGURED', activeMode: 'AI_STUDIO',
    configurationOutcome: 'SUCCEEDED', modeOutcome: 'SUCCEEDED', instructionCode: null,
  })
  store.activateGeminiConfigurationOption = vi.fn().mockResolvedValue({
    operation: 'ACTIVATED', outcome: 'SUCCEEDED', option: 'AI_STUDIO',
    optionStatus: 'CONFIGURED', activeMode: 'AI_STUDIO',
    configurationOutcome: 'NOT_REQUESTED', modeOutcome: 'SUCCEEDED', instructionCode: null,
  })
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
    credentialStatus: configuredCredentialStatus,
    status: 'READY',
    statusMessage: null,
  })
  store.deleteCustomProvider = vi.fn().mockImplementation(async (providerId: string) => {
    store.providersWithModels = store.providersWithModels.filter((row) => row.provider.id !== providerId)
    store.audioProvidersWithModels = store.audioProvidersWithModels.filter((row) => row.provider.id !== providerId)
    store.imageProvidersWithModels = store.imageProvidersWithModels.filter((row) => row.provider.id !== providerId)
    store.videoProvidersWithModels = store.videoProvidersWithModels.filter((row) => row.provider.id !== providerId)
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
    expect((wrapper.vm as any).providerConfigs.ANTHROPIC.credentialStatus.storageState).toBe('CONFIGURED')
    expect(store.getLLMProviderCredentialStatus).not.toHaveBeenCalled()
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

  it('removes built-in provider credentials and refreshes value-free configured state', async () => {
    const { wrapper, store } = mountRuntime({
      providersWithModels: [anthropicRow],
    })

    await (wrapper.vm as any).initialize()
    await (wrapper.vm as any).removeProviderApiKey('ANTHROPIC')
    await flushPromises()

    expect(store.removeLLMProviderApiKey).toHaveBeenCalledWith('ANTHROPIC')
    expect((wrapper.vm as any).providerConfigs.ANTHROPIC.credentialStatus.storageState).toBe('MISSING')
    expect((wrapper.vm as any).notification.message).toBe('API key for Anthropic removed successfully')
  })

  it('rejects overlapping save and duplicate remove actions while removal is pending', async () => {
    const { wrapper, store } = mountRuntime({ providersWithModels: [anthropicRow] })
    let completeRemoval!: (value: boolean) => void
    store.removeLLMProviderApiKey = vi.fn().mockReturnValue(
      new Promise<boolean>((resolve) => { completeRemoval = resolve }),
    )
    await (wrapper.vm as any).initialize()

    const pendingRemoval = (wrapper.vm as any).removeProviderApiKey('ANTHROPIC')
    expect((wrapper.vm as any).removing).toBe(true)
    await expect((wrapper.vm as any).saveProviderApiKey('ANTHROPIC', 'replacement-key')).resolves.toBe(false)
    await expect((wrapper.vm as any).removeProviderApiKey('ANTHROPIC')).resolves.toBe(false)
    expect(store.setLLMProviderApiKey).not.toHaveBeenCalled()
    expect(store.removeLLMProviderApiKey).toHaveBeenCalledTimes(1)

    completeRemoval(true)
    await expect(pendingRemoval).resolves.toBe(true)
    expect((wrapper.vm as any).removing).toBe(false)
  })

  it('reports an option save separately from fixed-priority effective mode', async () => {
    const { wrapper, store } = mountRuntime({
      providersWithModels: [deepFreeze(geminiRow)],
      geminiSetup: {
        activeMode: 'VERTEX_EXPRESS',
        aiStudioCredentialStatus: missingCredentialStatus,
        vertexExpressCredentialStatus: configuredCredentialStatus,
        vertexProjectStatus: 'MISSING',
        vertexProject: null,
        vertexLocation: null,
      },
    })
    store.saveGeminiConfigurationOption = vi.fn().mockImplementation(async () => {
      store.geminiSetup = {
        activeMode: 'VERTEX_EXPRESS',
        aiStudioCredentialStatus: configuredCredentialStatus,
        vertexExpressCredentialStatus: configuredCredentialStatus,
        vertexProjectStatus: 'MISSING',
        vertexProject: null,
        vertexLocation: null,
      }
      return {
        operation: 'SAVED', outcome: 'SUCCEEDED', option: 'AI_STUDIO',
        optionStatus: 'CONFIGURED', activeMode: 'VERTEX_EXPRESS',
        configurationOutcome: 'SUCCEEDED', modeOutcome: 'NOT_REQUESTED', instructionCode: null,
      }
    })

    await (wrapper.vm as any).initialize()
    await (wrapper.vm as any).selectProvider('GEMINI')
    const saved = await (wrapper.vm as any).saveGeminiConfigurationOption({
      option: 'AI_STUDIO',
      geminiApiKey: 'gemini-key',
    })
    await flushPromises()

    expect(saved).toBe(true)
    expect(store.saveGeminiConfigurationOption).toHaveBeenCalledWith({
      option: 'AI_STUDIO',
      geminiApiKey: 'gemini-key',
    })
    expect((wrapper.vm as any).notification.message).toBe(
      'AI_STUDIO saved',
    )
    expect((wrapper.vm as any).selectedProviderConfigured).toBe(true)
  })

  it('removes only one Gemini option and advances to the refreshed effective mode', async () => {
    const { wrapper, store } = mountRuntime({
      providersWithModels: [geminiRow],
      geminiSetup: {
        activeMode: 'VERTEX_EXPRESS',
        aiStudioCredentialStatus: configuredCredentialStatus,
        vertexExpressCredentialStatus: configuredCredentialStatus,
        vertexProjectStatus: 'MISSING',
        vertexProject: null,
        vertexLocation: null,
      },
    })
    store.removeGeminiConfigurationOption = vi.fn().mockImplementation(async () => {
      store.geminiSetup = {
        ...store.geminiSetup,
        activeMode: 'AI_STUDIO',
        vertexExpressCredentialStatus: missingCredentialStatus,
      }
      return {
        operation: 'REMOVED', outcome: 'SUCCEEDED', option: 'VERTEX_EXPRESS',
        optionStatus: 'MISSING', activeMode: 'AI_STUDIO',
        configurationOutcome: 'SUCCEEDED', modeOutcome: 'SUCCEEDED', instructionCode: null,
      }
    })
    await (wrapper.vm as any).initialize()

    const removed = await (wrapper.vm as any).removeGeminiConfigurationOption('VERTEX_EXPRESS')

    expect(removed).toBe(true)
    expect(store.removeGeminiConfigurationOption).toHaveBeenCalledWith('VERTEX_EXPRESS')
    expect((wrapper.vm as any).notification.message).toBe(
      'VERTEX_EXPRESS removed',
    )
  })

  it('serializes Gemini option operations and resets pending state after a value-free failure', async () => {
    const { wrapper, store } = mountRuntime({
      providersWithModels: [geminiRow],
      geminiSetup: {
        activeMode: null,
        aiStudioCredentialStatus: missingCredentialStatus,
        vertexExpressCredentialStatus: missingCredentialStatus,
        vertexProjectStatus: 'MISSING',
        vertexProject: null,
        vertexLocation: null,
      },
    })
    let completeSave!: (result: any) => void
    store.saveGeminiConfigurationOption = vi.fn().mockReturnValue(new Promise((resolve) => {
      completeSave = resolve
    }))
    await (wrapper.vm as any).initialize()

    const pendingSave = (wrapper.vm as any).saveGeminiConfigurationOption({
      option: 'AI_STUDIO',
      geminiApiKey: 'gemini-key',
    })
    expect((wrapper.vm as any).saving).toBe(true)
    await expect((wrapper.vm as any).removeGeminiConfigurationOption('AI_STUDIO')).resolves.toBe(false)
    expect(store.removeGeminiConfigurationOption).not.toHaveBeenCalled()

    store.geminiSetup = {
      ...store.geminiSetup,
      activeMode: 'AI_STUDIO',
      aiStudioCredentialStatus: configuredCredentialStatus,
    }
    completeSave({
      operation: 'SAVED', outcome: 'SUCCEEDED', option: 'AI_STUDIO',
      optionStatus: 'CONFIGURED', activeMode: 'AI_STUDIO',
      configurationOutcome: 'SUCCEEDED', modeOutcome: 'NOT_REQUESTED', instructionCode: null,
    })
    await expect(pendingSave).resolves.toBe(true)
    expect((wrapper.vm as any).saving).toBe(false)

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    store.removeGeminiConfigurationOption = vi.fn().mockRejectedValue(
      new Error('GEMINI_CONFIGURATION_REMOVE_REJECTED'),
    )
    await expect(
      (wrapper.vm as any).removeGeminiConfigurationOption('AI_STUDIO'),
    ).resolves.toBe(false)
    expect((wrapper.vm as any).removing).toBe(false)
    expect((wrapper.vm as any).notification.message).toBe(
      'Failed to remove API key for GEMINI',
    )
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to remove Gemini configuration option:',
      expect.any(Error),
    )
    consoleError.mockRestore()
  })

  it('surfaces a value-free partial save-and-activate result without claiming success', async () => {
    const { wrapper, store } = mountRuntime({
      providersWithModels: [geminiRow],
    })
    store.saveAndActivateGeminiConfigurationOption = vi.fn().mockResolvedValue({
      operation: 'SAVED_AND_ACTIVATED',
      outcome: 'PARTIAL',
      option: 'AI_STUDIO',
      optionStatus: 'CONFIGURED',
      activeMode: null,
      configurationOutcome: 'SUCCEEDED',
      modeOutcome: 'FAILED',
      instructionCode: 'GEMINI_ACTIVATION_RETRY_REQUIRED',
    })
    await (wrapper.vm as any).initialize()

    await expect((wrapper.vm as any).saveAndActivateGeminiConfigurationOption({
      option: 'AI_STUDIO',
      geminiApiKey: 'synthetic-key',
    })).resolves.toBe(false)

    expect((wrapper.vm as any).notification).toMatchObject({
      type: 'error',
      message: 'AI_STUDIO saved but inactive',
    })
    expect((wrapper.vm as any).saving).toBe(false)
  })

  it('includes video models in provider totals and selected-provider model details', async () => {
    const { wrapper } = mountRuntime({
      providersWithModels: [geminiRow],
      videoProvidersWithModels: [geminiVideoRow],
    })

    await (wrapper.vm as any).initialize()
    await flushPromises()

    const geminiSummary = (wrapper.vm as any).allProvidersWithModels.find((provider: any) => provider.id === 'GEMINI')
    expect(geminiSummary.totalModels).toBe(2)
    expect((wrapper.vm as any).selectedProviderVideoModels).toEqual(geminiVideoRow.models)
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
