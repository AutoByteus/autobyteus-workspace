import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProviderAPIKeyManager from '../ProviderAPIKeyManager.vue'

const runtimeState = vi.hoisted(() => ({ value: null as any }))
vi.mock('~/components/settings/providerApiKey/useProviderApiKeySectionRuntime', () => ({
  useProviderApiKeySectionRuntime: () => runtimeState.value,
}))

const translations: Record<string, string> = {
  'settings.components.settings.ProviderAPIKeyManager.api_key_management': 'API Key Management',
  'settings.components.settings.ProviderAPIKeyManager.manage_provider_keys_and_reload_available': 'Manage keys',
  'settings.components.settings.ProviderAPIKeyManager.reload_all_models': 'Reload all',
  'settings.components.settings.ProviderAPIKeyManager.reload_models': 'Reload Models',
  'settings.components.settings.ProviderAPIKeyManager.providers': 'Providers',
  'settings.components.settings.ProviderAPIKeyManager.configured': 'Configured',
  'settings.components.settings.ProviderAPIKeyManager.not_configured': 'Not Configured',
}

const provider = (overrides: Record<string, unknown> = {}) => ({
  id: 'OPENAI', name: 'OpenAI', label: 'OpenAI', totalModels: 1,
  isCustom: false, providerType: 'OPENAI', baseUrl: null,
  apiKeyConfigured: true, status: 'NOT_APPLICABLE', statusMessage: null,
  ...overrides,
})

const createRuntime = (overrides: Record<string, any> = {}) => ({
  loading: ref(false), saving: ref(false), activating: ref(false), removing: ref(false),
  notification: ref(null), providerEditorResetVersion: ref(0),
  isLoadingModels: ref(false), isReloadingModels: ref(false),
  geminiSetup: ref({
    activeMode: null, aiStudioConfigured: false,
    vertexExpressConfigured: false, vertexProject: null,
  }),
  allProvidersWithModels: ref([provider()]),
  selectedProviderId: ref('OPENAI'),
  selectedProviderSummary: ref(provider()),
  selectedProviderLabel: ref('OpenAI'),
  selectedProviderLlmModels: ref([{ modelIdentifier: 'gpt-4.1', name: 'GPT 4.1', providerType: 'OPENAI' }]),
  selectedProviderAudioModels: ref([]), selectedProviderImageModels: ref([]), selectedProviderVideoModels: ref([]),
  selectedProviderConfigured: ref(true), canReloadSelectedProvider: ref(true),
  isReloadingSelectedProvider: ref(false), isProviderConfigured: vi.fn(() => true),
  customProviderDraft: ref({ name: '', baseUrl: '', apiKey: '' }),
  customProviderProbeResult: ref(null), customProviderError: ref(null),
  isProbingCustomProvider: ref(false), isSavingCustomProvider: ref(false),
  isDeletingCustomProvider: ref(false), isCustomProviderProbeStale: ref(false),
  canProbeCustomProvider: ref(false), canSaveCustomProvider: ref(false),
  initialize: vi.fn().mockResolvedValue(undefined), selectProvider: vi.fn(), reloadAllModels: vi.fn(),
  reloadSelectedProvider: vi.fn(), saveGeminiConfigurationOption: vi.fn(),
  saveAndActivateGeminiConfigurationOption: vi.fn(), activateGeminiConfigurationOption: vi.fn(),
  removeGeminiConfigurationOption: vi.fn(), saveProviderApiKey: vi.fn(),
  removeProviderApiKey: vi.fn(), updateCustomProviderDraft: vi.fn(),
  probeCustomProviderDraft: vi.fn(), saveCustomProviderDraft: vi.fn(), deleteCustomProvider: vi.fn(),
  ...overrides,
})

const mountComponent = async (overrides: Record<string, any> = {}) => {
  runtimeState.value = createRuntime(overrides)
  const wrapper = mount(ProviderAPIKeyManager, {
    global: {
      mocks: { $t: (key: string) => translations[key] ?? key },
      stubs: {
        GeminiSetupForm: {
          name: 'GeminiSetupForm', props: ['geminiSetup', 'saving', 'activating', 'removing'],
          emits: ['save', 'save-and-activate', 'activate', 'remove'],
          template: '<button data-testid="gemini-form" @click="$emit(\'save\', { option: \'AI_STUDIO\', apiKey: \'synthetic-key\' })">Gemini</button>',
        },
        ProviderApiKeyEditor: {
          name: 'ProviderApiKeyEditor', props: ['configured', 'saving', 'removing', 'resetVersion'],
          template: '<div data-testid="api-key-editor">editor</div>',
        },
        CustomProviderEditor: { template: '<div data-testid="custom-editor">custom</div>' },
        CustomProviderProbePreview: { template: '<div data-testid="custom-preview">preview</div>' },
        CustomProviderDetailsCard: {
          props: ['provider', 'deleting'], emits: ['delete'],
          template: '<button data-testid="custom-details" @click="$emit(\'delete\')">details</button>',
        },
      },
    },
  })
  await Promise.resolve()
  return wrapper
}

describe('ProviderAPIKeyManager', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the canonical provider group and ordinary editor', async () => {
    const wrapper = await mountComponent()
    expect(runtimeState.value.initialize).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('API Key Management')
    expect(wrapper.text()).toContain('gpt-4.1')
    expect(wrapper.find('[data-testid="api-key-editor"]').exists()).toBe(true)
  })

  it('propagates provider command pending state', async () => {
    const wrapper = await mountComponent({ removing: ref(true) })
    expect(wrapper.getComponent({ name: 'ProviderApiKeyEditor' }).props('removing')).toBe(true)
  })

  it('renders the draft custom-provider path without credential-status gating', async () => {
    const draft = provider({
      id: '__new_custom_provider__', name: 'New Provider', label: 'New Provider',
      isCustom: true, isDraft: true, apiKeyConfigured: false,
    })
    const wrapper = await mountComponent({
      allProvidersWithModels: ref([draft]), selectedProviderId: ref(draft.id),
      selectedProviderSummary: ref(draft), selectedProviderLabel: ref(draft.label),
      selectedProviderConfigured: ref(false), canReloadSelectedProvider: ref(false),
    })
    expect(wrapper.find('[data-testid="custom-editor"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="custom-preview"]').exists()).toBe(true)
  })

  it('renders custom details and wires exact-provider delete', async () => {
    const custom = provider({
      id: 'provider_gateway', name: 'Gateway', label: 'Gateway',
      isCustom: true, providerType: 'OPENAI_COMPATIBLE', baseUrl: 'https://gateway.example.com/v1',
    })
    const wrapper = await mountComponent({
      selectedProviderId: ref(custom.id), selectedProviderSummary: ref(custom),
      selectedProviderLabel: ref(custom.label),
    })
    await wrapper.get('[data-testid="custom-details"]').trigger('click')
    expect(runtimeState.value.deleteCustomProvider).toHaveBeenCalledWith('provider_gateway')
  })

  it('renders tight Gemini state and wires the specialized UI action', async () => {
    const gemini = provider({ id: 'GEMINI', name: 'Gemini', label: 'Gemini', providerType: 'GEMINI' })
    const wrapper = await mountComponent({
      selectedProviderId: ref('GEMINI'), selectedProviderSummary: ref(gemini),
      selectedProviderLabel: ref('Gemini'),
    })
    await wrapper.get('[data-testid="gemini-form"]').trigger('click')
    expect(runtimeState.value.saveGeminiConfigurationOption).toHaveBeenCalledWith({
      option: 'AI_STUDIO', apiKey: 'synthetic-key',
    })
  })
})
