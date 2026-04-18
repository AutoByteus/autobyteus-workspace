import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AgentRunConfigForm from '../AgentRunConfigForm.vue'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { useRuntimeAvailabilityStore } from '~/stores/runtimeAvailabilityStore'

vi.mock('../WorkspaceSelector.vue', () => ({
  default: {
    name: 'WorkspaceSelector',
    template: '<div class="workspace-selector-stub"></div>',
    props: ['workspaceId', 'isLoading', 'error', 'disabled', 'workspaceLocked'],
    emits: ['select-existing', 'load-new'],
  },
}))

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

describe('AgentRunConfigForm', () => {
  let llmStore: any
  let runtimeAvailabilityStore: any

  const setProviders = (providersWithModels: any[]) => {
    llmStore.providersWithModels = providersWithModels
    llmStore.providersWithModelsForSelection = providersWithModels.filter((provider: any) => provider.models.length > 0)
  }

  beforeEach(() => {
    setActivePinia(createPinia())

    llmStore = {
      providersWithModels: [],
      providersWithModelsForSelection: [],
      get models() {
        return llmStore.providersWithModels.flatMap((p: any) => p.models.map((m: any) => m.modelIdentifier))
      },
      fetchProvidersWithModels: vi.fn().mockResolvedValue([]),
      modelConfigSchemaByIdentifier: vi.fn((identifier: string) => {
        const model = llmStore.providersWithModels.flatMap((provider: any) => provider.models).find((entry: any) => entry.modelIdentifier === identifier)
        return model?.configSchema || null
      }),
    }

    setProviders([])

    runtimeAvailabilityStore = {
      hasFetched: true,
      availabilities: [
        { runtimeKind: 'autobyteus', enabled: true, reason: null },
        { runtimeKind: 'codex_app_server', enabled: true, reason: null },
      ],
      fetchRuntimeAvailabilities: vi.fn().mockResolvedValue([]),
      availabilityByKind: vi.fn((runtimeKind: string) =>
        runtimeAvailabilityStore.availabilities.find((availability: any) => availability.runtimeKind === runtimeKind) ?? null,
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

  const mockConfig = {
    agentDefinitionId: 'def-1',
    agentDefinitionName: 'TestAgent',
    llmModelIdentifier: 'gpt-4',
    llmConfig: null,
    runtimeKind: 'autobyteus',
    workspaceId: null,
    autoExecuteTools: false,
    skillAccessMode: 'PRELOADED_ONLY',
    isLocked: false,
  }

  const mockAgentDef = {
    id: 'def-1',
    name: 'TestAgent',
  }

  const buildProviderRow = (providerId: string, providerName: string, models: any[], overrides: Record<string, any> = {}) => ({
    provider: {
      id: providerId,
      name: providerName,
      providerType: providerId,
      isCustom: false,
      baseUrl: null,
      apiKeyConfigured: true,
      status: 'NOT_APPLICABLE',
      statusMessage: null,
      ...overrides,
    },
    models,
  })

  it('renders correctly and loads runtime-scoped providers', () => {
    setProviders([
      buildProviderRow('OPENAI', 'OpenAI', [
        { modelIdentifier: 'gpt-4', name: 'GPT-4', value: 'gpt-4', canonicalName: 'gpt-4', providerId: 'OPENAI', providerName: 'OpenAI', providerType: 'OPENAI', runtime: 'api' },
      ]),
    ])

    const wrapper = mount(AgentRunConfigForm, {
      props: {
        config: mockConfig,
        agentDefinition: mockAgentDef as any,
        workspaceLoadingState: { isLoading: false, error: null, loadedPath: null },
      },
    })

    expect(wrapper.text()).toContain('TestAgent')
    expect(wrapper.find('.searchable-select-stub').exists()).toBe(true)
    expect(wrapper.find('.workspace-selector-stub').exists()).toBe(true)
    expect(wrapper.find('select#agent-run-runtime-kind').exists()).toBe(true)
    expect(llmStore.fetchProvidersWithModels).toHaveBeenCalledWith('autobyteus')
  })

  it('populates provider-grouped model options for non-AutoByteus runtimes', async () => {
    setProviders([
      buildProviderRow('OPENAI', 'OpenAI', [
        { modelIdentifier: 'gpt-4', name: 'GPT-4', value: 'gpt-4', canonicalName: 'gpt-4', providerId: 'OPENAI', providerName: 'OpenAI', providerType: 'OPENAI', runtime: 'api' },
      ]),
    ])

    const wrapper = mount(AgentRunConfigForm, {
      props: {
        config: { ...mockConfig, runtimeKind: 'codex_app_server' },
        agentDefinition: mockAgentDef as any,
        workspaceLoadingState: { isLoading: false, error: null, loadedPath: null },
      },
    })

    await wrapper.vm.$nextTick()

    const options = wrapper.findComponent({ name: 'SearchableGroupedSelect' }).props('options')
    expect(options).toHaveLength(1)
    expect(options[0].label).toBe('OpenAI')
    expect(options[0].items[0].name).toBe('GPT-4')
    expect(options[0].items[0].selectedLabel).toBe('OpenAI / GPT-4')
  })

  it('uses model identifiers as labels for AutoByteus runtime selections', async () => {
    setProviders([
      buildProviderRow('LMSTUDIO', 'LM Studio', [
        { modelIdentifier: 'openai/gpt-oss-20b', name: 'GPT OSS 20B', value: 'openai/gpt-oss-20b', canonicalName: 'gpt-oss-20b', providerId: 'LMSTUDIO', providerName: 'LM Studio', providerType: 'LMSTUDIO', runtime: 'autobyteus' },
      ]),
    ])

    const wrapper = mount(AgentRunConfigForm, {
      props: {
        config: { ...mockConfig, runtimeKind: 'autobyteus' },
        agentDefinition: mockAgentDef as any,
        workspaceLoadingState: { isLoading: false, error: null, loadedPath: null },
      },
    })

    await wrapper.vm.$nextTick()

    const options = wrapper.findComponent({ name: 'SearchableGroupedSelect' }).props('options')
    expect(options[0].items[0].name).toBe('openai/gpt-oss-20b')
    expect(options[0].items[0].selectedLabel).toBe('LM Studio / openai/gpt-oss-20b')
  })

  it('uses friendly labels for custom providers on AutoByteus runtime selections', async () => {
    setProviders([
      buildProviderRow(
        'provider_gateway',
        'Internal Gateway',
        [
          {
            modelIdentifier: 'openai-compatible:provider_gateway:model-a',
            name: 'Model A',
            value: 'openai-compatible:provider_gateway:model-a',
            canonicalName: 'model-a',
            providerId: 'provider_gateway',
            providerName: 'Internal Gateway',
            providerType: 'OPENAI_COMPATIBLE',
            runtime: 'autobyteus',
          },
        ],
        { providerType: 'OPENAI_COMPATIBLE', isCustom: true, baseUrl: 'https://gateway.example.com/v1' },
      ),
    ])

    const wrapper = mount(AgentRunConfigForm, {
      props: {
        config: { ...mockConfig, runtimeKind: 'autobyteus' },
        agentDefinition: mockAgentDef as any,
        workspaceLoadingState: { isLoading: false, error: null, loadedPath: null },
      },
    })

    await wrapper.vm.$nextTick()

    const options = wrapper.findComponent({ name: 'SearchableGroupedSelect' }).props('options')
    expect(options[0].items[0].name).toBe('Model A')
    expect(options[0].items[0].selectedLabel).toBe('Internal Gateway / Model A')
  })

  it('updates config when the runtime and model selection change', async () => {
    setProviders([
      buildProviderRow('OPENAI', 'OpenAI', [
        { modelIdentifier: 'gpt-3.5', name: 'GPT-3.5', value: 'gpt-3.5', canonicalName: 'gpt-3.5', providerId: 'OPENAI', providerName: 'OpenAI', providerType: 'OPENAI', runtime: 'api' },
      ]),
    ])

    const localConfig = { ...mockConfig }
    const wrapper = mount(AgentRunConfigForm, {
      props: {
        config: localConfig,
        agentDefinition: mockAgentDef as any,
        workspaceLoadingState: { isLoading: false, error: null, loadedPath: null },
      },
    })

    await wrapper.find('button#auto-execute').trigger('click')
    expect(localConfig.autoExecuteTools).toBe(true)

    await wrapper.find('select#skill-access-mode').setValue('GLOBAL_DISCOVERY')
    expect(localConfig.skillAccessMode).toBe('GLOBAL_DISCOVERY')

    await wrapper.find('select#agent-run-runtime-kind').setValue('codex_app_server')
    expect(localConfig.runtimeKind).toBe('codex_app_server')
    expect(localConfig.llmModelIdentifier).toBe('')
    expect(llmStore.fetchProvidersWithModels).toHaveBeenCalledWith('codex_app_server')

    await wrapper.findComponent({ name: 'SearchableGroupedSelect' }).vm.$emit('update:modelValue', 'gpt-3.5')
    expect(localConfig.llmModelIdentifier).toBe('gpt-3.5')
  })
})
