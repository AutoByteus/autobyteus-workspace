import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'

import ProviderAPIKeyManager from '../ProviderAPIKeyManager.vue'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'

const { localizationState } = vi.hoisted(() => ({
  localizationState: {
    translations: {} as Record<string, string>,
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

const baseTranslations: Record<string, string> = {
  'settings.components.settings.ProviderAPIKeyManager.api_key_management': 'API Key Management',
  'settings.components.settings.ProviderAPIKeyManager.manage_provider_keys_and_reload_available': 'Manage provider keys and reload available models',
  'settings.components.settings.ProviderAPIKeyManager.reload_all_models': 'Reload all models',
  'settings.components.settings.ProviderAPIKeyManager.reload_models': 'Reload Models',
  'settings.components.settings.ProviderAPIKeyManager.reloading_models': 'Reloading models...',
  'settings.components.settings.ProviderAPIKeyManager.reloading_and_discovering_models': 'Reloading and discovering models...',
  'settings.components.settings.ProviderAPIKeyManager.loading_available_models': 'Loading available models...',
  'settings.components.settings.ProviderAPIKeyManager.no_models_available': 'No models available. Configure at least one provider API key to see available models.',
  'settings.components.settings.ProviderAPIKeyManager.providers': 'Providers',
  'settings.components.settings.ProviderAPIKeyManager.configured': 'Configured',
  'settings.components.settings.ProviderAPIKeyManager.not_configured': 'Not Configured',
  'settings.components.settings.ProviderAPIKeyManager.gemini_setup_choose_a_mode_and': 'Gemini setup: choose a mode and fill only required fields.',
  'settings.components.settings.ProviderAPIKeyManager.ai_studio': 'AI Studio',
  'settings.components.settings.ProviderAPIKeyManager.vertex_express': 'Vertex Express',
  'settings.components.settings.ProviderAPIKeyManager.vertex_project': 'Vertex Project',
  'settings.components.settings.ProviderAPIKeyManager.enter_gemini_api_key': 'Enter Gemini API key...',
  'settings.components.settings.ProviderAPIKeyManager.enter_vertex_api_key': 'Enter Vertex API key...',
  'settings.components.settings.ProviderAPIKeyManager.vertex_project_id': 'Vertex project id',
  'settings.components.settings.ProviderAPIKeyManager.vertex_location_e_g_us_central1': 'Vertex location (e.g. us-central1)',
  'settings.components.settings.ProviderAPIKeyManager.saving': 'Saving...',
  'settings.components.settings.ProviderAPIKeyManager.save_gemini_setup': 'Save Gemini Setup',
  'settings.components.settings.ProviderAPIKeyManager.enter_new_key_to_update': 'Enter new key to update...',
  'settings.components.settings.ProviderAPIKeyManager.enter_api_key': 'Enter API key...',
  'settings.components.settings.ProviderAPIKeyManager.save_key': 'Save Key',
  'settings.components.settings.ProviderAPIKeyManager.llm_models': 'LLM Models',
  'settings.components.settings.ProviderAPIKeyManager.audio_models': 'Audio Models',
  'settings.components.settings.ProviderAPIKeyManager.image_models': 'Image Models',
  'settings.components.settings.ProviderAPIKeyManager.no_models_found': 'No Models Found',
  'settings.components.settings.ProviderAPIKeyManager.this_provider_doesn_t_have_any': "This provider doesn't have any models available yet. Try checking your API key configuration.",
  'settings.components.settings.ProviderAPIKeyManager.models_reloaded_successfully': 'Models reloaded and refreshed successfully',
  'settings.components.settings.ProviderAPIKeyManager.failed_to_reload_models': 'Failed to reload models',
  'settings.components.settings.ProviderAPIKeyManager.models_reloaded_for_provider': 'Models reloaded for {{provider}}',
  'settings.components.settings.ProviderAPIKeyManager.failed_to_reload_models_for_provider': 'Failed to reload models for {{provider}}',
  'settings.components.settings.ProviderAPIKeyManager.failed_to_load_providers_and_models': 'Failed to load providers and models',
  'settings.components.settings.ProviderAPIKeyManager.gemini_setup_saved_successfully': 'Gemini setup saved successfully',
  'settings.components.settings.ProviderAPIKeyManager.api_key_saved_successfully': 'API key for {{provider}} saved successfully',
  'settings.components.settings.ProviderAPIKeyManager.failed_to_save_api_key': 'Failed to save API key for {{provider}}',
}

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const setMaybeRef = (target: any, key: string, value: any) => {
  if (!target) return
  const current = target[key]
  if (current && typeof current === 'object' && 'value' in current) {
    current.value = value
    return
  }
  target[key] = value
}

type StoreOverrides = Partial<{
  getLLMProviderApiKey: (provider: string) => Promise<string>
  fetchProvidersWithModels: () => Promise<unknown>
  fetchGeminiSetupConfig: () => Promise<unknown>
  setGeminiSetupConfig: (input: unknown) => Promise<unknown>
  setLLMProviderApiKey: (provider: string, apiKey: string) => Promise<unknown>
}>

const geminiModel = {
  modelIdentifier: 'gemini-3-flash-preview',
  name: 'Gemini Flash',
  value: 'gemini-3-flash-preview',
  canonicalName: 'gemini-3-flash-preview',
  provider: 'GEMINI',
  runtime: 'api',
  hostUrl: null,
}

const openAiModel = {
  modelIdentifier: 'gpt-4o',
  name: 'GPT-4o',
  value: 'gpt-4o',
  canonicalName: 'gpt-4o',
  provider: 'OPENAI',
  runtime: 'api',
  hostUrl: null,
}

const mountComponent = async (
  storePatch: Record<string, any> = {},
  translationOverrides: Record<string, string> = {},
  storeOverrides: StoreOverrides = {},
) => {
  localizationState.translations = {
    ...baseTranslations,
    ...translationOverrides,
  }

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

  store.fetchProvidersWithModels = vi.fn(storeOverrides.fetchProvidersWithModels ?? (() => Promise.resolve(store.providersWithModels))) as any
  store.fetchGeminiSetupConfig = vi.fn(storeOverrides.fetchGeminiSetupConfig ?? (() => Promise.resolve(store.geminiSetup))) as any
  store.getLLMProviderApiKey = vi.fn(storeOverrides.getLLMProviderApiKey ?? (() => Promise.resolve(''))) as any
  store.setGeminiSetupConfig = vi.fn(storeOverrides.setGeminiSetupConfig ?? (() => Promise.resolve(true))) as any
  store.setLLMProviderApiKey = vi.fn(storeOverrides.setLLMProviderApiKey ?? (() => Promise.resolve(true))) as any
  store.reloadModels = vi.fn().mockResolvedValue(true)
  store.reloadModelsForProvider = vi.fn().mockResolvedValue(true)

  const wrapper = mount(ProviderAPIKeyManager, {
    global: {
      plugins: [pinia],
      mocks: {
        $t: (key: string, params?: Record<string, unknown>) => translate(key, params),
      },
    },
  })

  await wrapper.vm.$nextTick()
  await flushPromises()
  return { wrapper, store }
}

describe('ProviderAPIKeyManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localizationState.translations = { ...baseTranslations }
  })

  it('renders separate sections for LLM, audio, and image models when available', async () => {
    const modelState = {
      providersWithModels: [{ provider: 'OPENAI', models: [openAiModel] }],
      audioProvidersWithModels: [{ provider: 'OPENAI', models: [{ ...openAiModel, modelIdentifier: 'whisper-1', value: 'whisper-1', canonicalName: 'whisper-1', name: 'Whisper' }] }],
      imageProvidersWithModels: [{ provider: 'OPENAI', models: [{ ...openAiModel, modelIdentifier: 'dall-e-3', value: 'dall-e-3', canonicalName: 'dall-e-3', name: 'DALL-E 3' }] }],
    }
    const { wrapper, store } = await mountComponent(modelState)

    const vm = wrapper.vm as any
    setMaybeRef(vm, 'loading', false)
    const setupState = vm.$?.setupState
    setMaybeRef(setupState, 'loading', false)

    if (!store.providersWithModels.length) {
      store.providersWithModels = modelState.providersWithModels as any
      store.audioProvidersWithModels = modelState.audioProvidersWithModels as any
      store.imageProvidersWithModels = modelState.imageProvidersWithModels as any
    }

    setMaybeRef(setupState, 'providersWithModels', store.providersWithModels)
    setMaybeRef(setupState, 'audioProvidersWithModels', store.audioProvidersWithModels)
    setMaybeRef(setupState, 'imageProvidersWithModels', store.imageProvidersWithModels)
    setMaybeRef(setupState, 'selectedModelProvider', 'OPENAI')
    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(wrapper.text()).toContain('LLM Models')
    expect(wrapper.text()).toContain('Audio Models')
    expect(wrapper.text()).toContain('Image Models')
    expect(wrapper.text()).toContain('gpt-4o')
    expect(wrapper.text()).toContain('whisper-1')
    expect(wrapper.text()).toContain('dall-e-3')
  })

  it('shows an empty state message when no models exist', async () => {
    const { wrapper } = await mountComponent()
    const vm = wrapper.vm as any
    setMaybeRef(vm, 'loading', false)
    setMaybeRef(vm.$?.setupState, 'loading', false)
    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(wrapper.text()).toContain('No models available. Configure at least one provider API key to see available models.')
  })

  it('saves Gemini setup through the extracted form/runtime path', async () => {
    const { wrapper, store } = await mountComponent({
      providersWithModels: [{ provider: 'GEMINI', models: [geminiModel] }],
    })

    const vm = wrapper.vm as any
    setMaybeRef(vm, 'loading', false)
    const setupState = vm.$?.setupState
    setMaybeRef(setupState, 'loading', false)
    setMaybeRef(setupState, 'providersWithModels', store.providersWithModels)
    setMaybeRef(setupState, 'selectedModelProvider', 'GEMINI')
    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(wrapper.text()).toContain('Gemini setup: choose a mode and fill only required fields.')
    expect(wrapper.text()).toContain('Save Gemini Setup')

    const geminiInput = wrapper.get('input[placeholder="Enter Gemini API key..."]')
    await geminiInput.setValue('test-gemini-key')
    setMaybeRef(setupState, 'geminiApiKey', 'test-gemini-key')

    if (typeof setupState?.saveApiKeyForSelectedProvider === 'function') {
      await setupState.saveApiKeyForSelectedProvider()
    } else {
      const saveButton = wrapper.findAll('button').find((candidate) => candidate.text().includes('Save Gemini Setup'))
      expect(saveButton).toBeTruthy()
      await saveButton!.trigger('click')
    }

    expect(store.setGeminiSetupConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'AI_STUDIO',
        geminiApiKey: 'test-gemini-key',
      }),
    )
  })

  it('saves Gemini Vertex Express setup with the expected payload', async () => {
    const { wrapper, store } = await mountComponent({
      providersWithModels: [{ provider: 'GEMINI', models: [geminiModel] }],
    })

    const setupState = (wrapper.vm as any).$?.setupState
    setMaybeRef(setupState, 'loading', false)
    setMaybeRef(setupState, 'providersWithModels', store.providersWithModels)
    setMaybeRef(setupState, 'selectedModelProvider', 'GEMINI')
    setMaybeRef(setupState, 'geminiSetupMode', 'VERTEX_EXPRESS')
    setMaybeRef(setupState, 'vertexApiKey', 'vertex-express-test-key')
    await wrapper.vm.$nextTick()
    await flushPromises()

    if (typeof setupState?.saveApiKeyForSelectedProvider === 'function') {
      await setupState.saveApiKeyForSelectedProvider()
    }

    expect(store.setGeminiSetupConfig).toHaveBeenCalledWith({
      mode: 'VERTEX_EXPRESS',
      geminiApiKey: null,
      vertexApiKey: 'vertex-express-test-key',
      vertexProject: null,
      vertexLocation: null,
    })
  })

  it('saves Gemini Vertex Project setup with the expected payload', async () => {
    const { wrapper, store } = await mountComponent({
      providersWithModels: [{ provider: 'GEMINI', models: [geminiModel] }],
    })

    const setupState = (wrapper.vm as any).$?.setupState
    setMaybeRef(setupState, 'loading', false)
    setMaybeRef(setupState, 'providersWithModels', store.providersWithModels)
    setMaybeRef(setupState, 'selectedModelProvider', 'GEMINI')
    setMaybeRef(setupState, 'geminiSetupMode', 'VERTEX_PROJECT')
    setMaybeRef(setupState, 'vertexProject', 'project-test')
    setMaybeRef(setupState, 'vertexLocation', 'europe-west4')
    await wrapper.vm.$nextTick()
    await flushPromises()

    if (typeof setupState?.saveApiKeyForSelectedProvider === 'function') {
      await setupState.saveApiKeyForSelectedProvider()
    }

    expect(store.setGeminiSetupConfig).toHaveBeenCalledWith({
      mode: 'VERTEX_PROJECT',
      geminiApiKey: null,
      vertexApiKey: null,
      vertexProject: 'project-test',
      vertexLocation: 'europe-west4',
    })
  })

  it('saves a non-Gemini provider API key through the extracted editor/runtime path', async () => {
    const { wrapper, store } = await mountComponent({
      providersWithModels: [{ provider: 'OPENAI', models: [openAiModel] }],
    })

    const apiKeyInput = wrapper.get('input[placeholder="Enter API key..."]')
    await apiKeyInput.setValue('openai-test-key')
    const saveButton = wrapper.findAll('button').find((candidate) => candidate.text().includes('Save Key'))
    expect(saveButton).toBeTruthy()
    await saveButton!.trigger('click')

    expect(store.setLLMProviderApiKey).toHaveBeenCalledWith('OPENAI', 'openai-test-key')
  })

  it('renders localized provider controls for zh-CN so shared settings actions do not stay in English', async () => {
    const zhTranslations = {
      'settings.components.settings.ProviderAPIKeyManager.providers': '提供商',
      'settings.components.settings.ProviderAPIKeyManager.configured': '已配置',
      'settings.components.settings.ProviderAPIKeyManager.not_configured': '未配置',
      'settings.components.settings.ProviderAPIKeyManager.save_key': '保存密钥',
      'settings.components.settings.ProviderAPIKeyManager.enter_new_key_to_update': '输入新密钥以更新...',
      'settings.components.settings.ProviderAPIKeyManager.llm_models': 'LLM 模型',
    }

    const { wrapper } = await mountComponent(
      {
        providersWithModels: [{ provider: 'OPENAI', models: [openAiModel] }],
      },
      zhTranslations,
      {
        getLLMProviderApiKey: async (provider) => (provider === 'OPENAI' ? 'configured-key' : ''),
      },
    )

    expect(wrapper.text()).toContain('提供商')
    expect(wrapper.text()).toContain('已配置')
    expect(wrapper.text()).toContain('保存密钥')
    expect(wrapper.text()).toContain('LLM 模型')
    expect(wrapper.text()).not.toContain('Providers')
    expect(wrapper.text()).not.toContain('Configured')
    expect(wrapper.text()).not.toContain('Save Key')
    expect(wrapper.get('input[placeholder="输入新密钥以更新..."]').exists()).toBe(true)
  })
})
