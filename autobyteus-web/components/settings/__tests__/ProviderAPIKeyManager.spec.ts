import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import ProviderAPIKeyManager from '../ProviderAPIKeyManager.vue'

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const runtimeState = vi.hoisted(() => ({
  value: null as any,
}))

vi.mock('~/components/settings/providerApiKey/useProviderApiKeySectionRuntime', () => ({
  useProviderApiKeySectionRuntime: () => runtimeState.value,
}))

const translations: Record<string, string> = {
  'settings.components.settings.ProviderAPIKeyManager.api_key_management': 'API Key Management',
  'settings.components.settings.ProviderAPIKeyManager.manage_provider_keys_and_reload_available': 'Manage provider keys and reload available models',
  'settings.components.settings.ProviderAPIKeyManager.reload_all_models': 'Reload all models',
  'settings.components.settings.ProviderAPIKeyManager.reload_models': 'Reload Models',
  'settings.components.settings.ProviderAPIKeyManager.reloading_models': 'Reloading models...',
  'settings.components.settings.ProviderAPIKeyManager.reloading_and_discovering_models': 'Reloading and discovering models...',
  'settings.components.settings.ProviderAPIKeyManager.loading_available_models': 'Loading available models...',
  'settings.components.settings.ProviderAPIKeyManager.providers': 'Providers',
  'settings.components.settings.ProviderAPIKeyManager.configured': 'Configured',
  'settings.components.settings.ProviderAPIKeyManager.not_configured': 'Not Configured',
}

const createRuntime = (overrides: Record<string, any> = {}) => ({
  loading: ref(false),
  saving: ref(false),
  notification: ref(null),
  providerEditorResetVersion: ref(0),
  isLoadingModels: ref(false),
  isReloadingModels: ref(false),
  geminiSetup: ref({
    mode: 'AI_STUDIO',
    geminiApiKeyConfigured: false,
    vertexApiKeyConfigured: false,
    vertexProject: null,
    vertexLocation: null,
  }),
  allProvidersWithModels: ref([
    {
      id: 'OPENAI',
      name: 'OpenAI',
      label: 'OpenAI',
      totalModels: 1,
      isCustom: false,
      providerType: 'OPENAI',
      baseUrl: null,
      apiKeyConfigured: true,
      status: 'NOT_APPLICABLE',
      statusMessage: null,
    },
  ]),
  selectedProviderId: ref('OPENAI'),
  selectedProviderSummary: ref({
    id: 'OPENAI',
    name: 'OpenAI',
    label: 'OpenAI',
    totalModels: 1,
    isCustom: false,
    providerType: 'OPENAI',
    baseUrl: null,
    apiKeyConfigured: true,
    status: 'NOT_APPLICABLE',
    statusMessage: null,
  }),
  selectedProviderLabel: ref('OpenAI'),
  selectedProviderLlmModels: ref([{ modelIdentifier: 'gpt-4o', name: 'GPT-4o', providerType: 'OPENAI' }]),
  selectedProviderAudioModels: ref([]),
  selectedProviderImageModels: ref([]),
  selectedProviderConfigured: ref(true),
  canReloadSelectedProvider: ref(true),
  isReloadingSelectedProvider: ref(false),
  isProviderConfigured: vi.fn().mockReturnValue(true),
  customProviderDraft: ref({
    name: '',
    providerType: 'OPENAI_COMPATIBLE',
    baseUrl: '',
    apiKey: '',
  }),
  customProviderProbeResult: ref(null),
  customProviderError: ref(null),
  isProbingCustomProvider: ref(false),
  isSavingCustomProvider: ref(false),
  isDeletingCustomProvider: ref(false),
  isCustomProviderProbeStale: ref(false),
  canProbeCustomProvider: ref(false),
  canSaveCustomProvider: ref(false),
  initialize: vi.fn().mockResolvedValue(undefined),
  selectProvider: vi.fn(),
  reloadAllModels: vi.fn(),
  reloadSelectedProvider: vi.fn(),
  saveGeminiSetup: vi.fn(),
  saveProviderApiKey: vi.fn(),
  updateCustomProviderDraft: vi.fn(),
  probeCustomProviderDraft: vi.fn(),
  saveCustomProviderDraft: vi.fn(),
  deleteCustomProvider: vi.fn(),
  ...overrides,
})

const mountComponent = async (overrides: Record<string, any> = {}) => {
  runtimeState.value = createRuntime(overrides)

  const wrapper = mount(ProviderAPIKeyManager, {
    global: {
      mocks: {
        $t: (key: string) => translations[key] ?? key,
      },
      stubs: {
        GeminiSetupForm: { template: '<div data-testid="gemini-form-stub">gemini form</div>' },
        ProviderApiKeyEditor: { template: '<div data-testid="api-key-editor-stub">api key editor</div>' },
        CustomProviderEditor: { template: '<div data-testid="custom-provider-editor-stub">custom provider editor</div>' },
        CustomProviderProbePreview: { template: '<div data-testid="custom-provider-preview-stub">custom provider preview</div>' },
        CustomProviderDetailsCard: {
          template: '<button data-testid="custom-provider-details-stub" @click="$emit(\'delete\')">custom details</button>',
          props: ['provider', 'deleting'],
        },
      },
    },
  })

  await flushPromises()
  return wrapper
}

describe('ProviderAPIKeyManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes through the runtime composable and renders the built-in provider editor', async () => {
    const wrapper = await mountComponent()

    expect(runtimeState.value.initialize).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('API Key Management')
    expect(wrapper.text()).toContain('gpt-4o')
    expect(wrapper.find('[data-testid="api-key-editor-stub"]').exists()).toBe(true)
  })

  it('renders the draft custom-provider editor flow when the draft row is selected', async () => {
    const wrapper = await mountComponent({
      allProvidersWithModels: ref([
        {
          id: '__new_custom_provider__',
          name: 'New Provider',
          label: 'New Provider',
          totalModels: 0,
          isCustom: true,
          isDraft: true,
          providerType: 'OPENAI_COMPATIBLE',
          baseUrl: null,
          apiKeyConfigured: false,
          status: 'NOT_APPLICABLE',
          statusMessage: null,
        },
      ]),
      selectedProviderId: ref('__new_custom_provider__'),
      selectedProviderSummary: ref({
        id: '__new_custom_provider__',
        name: 'New Provider',
        label: 'New Provider',
        totalModels: 0,
        isCustom: true,
        isDraft: true,
        providerType: 'OPENAI_COMPATIBLE',
        baseUrl: null,
        apiKeyConfigured: false,
        status: 'NOT_APPLICABLE',
        statusMessage: null,
      }),
      selectedProviderLabel: ref('New Provider'),
      selectedProviderConfigured: ref(false),
      canReloadSelectedProvider: ref(false),
    })

    expect(wrapper.find('[data-testid="custom-provider-editor-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="custom-provider-preview-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="api-key-editor-stub"]').exists()).toBe(false)
  })

  it('renders saved custom-provider details and wires delete through the runtime composable', async () => {
    const wrapper = await mountComponent({
      selectedProviderId: ref('provider_gateway'),
      selectedProviderSummary: ref({
        id: 'provider_gateway',
        name: 'Internal Gateway',
        label: 'Internal Gateway',
        totalModels: 2,
        isCustom: true,
        providerType: 'OPENAI_COMPATIBLE',
        baseUrl: 'https://gateway.example.com/v1',
        apiKeyConfigured: true,
        status: 'READY',
        statusMessage: 'Loaded 2 models',
      }),
      selectedProviderLabel: ref('Internal Gateway'),
      selectedProviderLlmModels: ref([{ modelIdentifier: 'openai-compatible:provider_gateway:model-a', name: 'Model A', providerType: 'OPENAI_COMPATIBLE' }]),
    })

    expect(wrapper.find('[data-testid="custom-provider-details-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="custom-provider-editor-stub"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="api-key-editor-stub"]').exists()).toBe(false)

    await wrapper.get('[data-testid="custom-provider-details-stub"]').trigger('click')
    expect(runtimeState.value.deleteCustomProvider).toHaveBeenCalledWith('provider_gateway')
  })

  it('renders the dedicated Gemini setup form when Gemini is selected', async () => {
    const wrapper = await mountComponent({
      selectedProviderId: ref('GEMINI'),
      selectedProviderSummary: ref({
        id: 'GEMINI',
        name: 'Gemini',
        label: 'Gemini',
        totalModels: 1,
        isCustom: false,
        providerType: 'GEMINI',
        baseUrl: null,
        apiKeyConfigured: false,
        status: 'NOT_APPLICABLE',
        statusMessage: null,
      }),
      selectedProviderLabel: ref('Gemini'),
      selectedProviderConfigured: ref(false),
      selectedProviderLlmModels: ref([{ modelIdentifier: 'gemini-2.5-pro', name: 'gemini-2.5-pro', providerType: 'GEMINI' }]),
    })

    expect(wrapper.find('[data-testid="gemini-form-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="api-key-editor-stub"]').exists()).toBe(false)
  })
})
