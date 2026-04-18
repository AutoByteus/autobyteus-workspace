import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TeamRunConfigForm from '../TeamRunConfigForm.vue'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { useRuntimeAvailabilityStore } from '~/stores/runtimeAvailabilityStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'

vi.mock('~/stores/llmProviderConfig', () => ({
  useLLMProviderConfigStore: vi.fn(),
}))

vi.mock('~/stores/runtimeAvailabilityStore', () => ({
  useRuntimeAvailabilityStore: vi.fn(),
}))

vi.mock('~/stores/agentTeamDefinitionStore', () => ({
  useAgentTeamDefinitionStore: vi.fn(),
}))

const mockTeamDef = {
  id: 'team-1',
  name: 'Test Team',
  nodes: [
    { memberName: 'Member A', refType: 'AGENT', ref: 'agent-a' },
    { memberName: 'Member B', refType: 'AGENT', ref: 'agent-b' },
  ],
  coordinatorMemberName: 'Member A',
}

const nestedTeamDef = {
  id: 'team-nested',
  name: 'Nested Team',
  nodes: [
    { memberName: 'Parent Team', refType: 'AGENT_TEAM', ref: 'sub-team-1' },
  ],
  coordinatorMemberName: 'Parent Team',
}

const mockConfig = {
  teamDefinitionId: 'team-1',
  teamDefinitionName: 'Test Team',
  runtimeKind: 'autobyteus',
  llmModelIdentifier: '',
  llmConfig: null,
  autoExecuteTools: false,
  skillAccessMode: 'PRELOADED_ONLY',
  isLocked: false,
  workspaceId: null,
  memberOverrides: {},
}

describe('TeamRunConfigForm', () => {
  let llmStore: any
  let runtimeStore: any
  let teamDefinitionStore: any

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
        return llmStore.providersWithModels.flatMap((provider: any) => provider.models.map((model: any) => model.modelIdentifier))
      },
      fetchProvidersWithModels: vi.fn().mockResolvedValue([]),
      modelConfigSchemaByIdentifier: vi.fn().mockReturnValue(null),
    }
    setProviders([
      buildProviderRow('OPENAI', 'OpenAI', [
        { modelIdentifier: 'gpt-4', name: 'GPT-4', value: 'gpt-4', canonicalName: 'gpt-4', providerId: 'OPENAI', providerName: 'OpenAI', providerType: 'OPENAI', runtime: 'api' },
      ]),
    ])

    runtimeStore = {
      hasFetched: true,
      availabilities: [
        { runtimeKind: 'autobyteus', enabled: true, reason: null },
        { runtimeKind: 'codex_app_server', enabled: true, reason: null },
      ],
      fetchRuntimeAvailabilities: vi.fn().mockResolvedValue([]),
      availabilityByKind: vi.fn((runtimeKind: string) =>
        runtimeStore.availabilities.find((availability: any) => availability.runtimeKind === runtimeKind) ?? null,
      ),
      isRuntimeEnabled: vi.fn((runtimeKind: string) =>
        runtimeStore.availabilityByKind(runtimeKind)?.enabled ?? runtimeKind === 'autobyteus',
      ),
      runtimeReason: vi.fn((runtimeKind: string) =>
        runtimeStore.availabilityByKind(runtimeKind)?.reason ?? null,
      ),
    }

    teamDefinitionStore = {
      getAgentTeamDefinitionById: vi.fn((id: string) => {
        if (id === 'sub-team-1') {
          return {
            id: 'sub-team-1',
            name: 'Sub Team',
            coordinatorMemberName: 'Leaf A',
            nodes: [
              { memberName: 'Leaf A', refType: 'AGENT', ref: 'agent-leaf-a' },
              { memberName: 'Leaf B', refType: 'AGENT', ref: 'agent-leaf-b' },
            ],
          }
        }
        return null
      }),
    }

    ;(useLLMProviderConfigStore as any).mockReturnValue(llmStore)
    ;(useRuntimeAvailabilityStore as any).mockReturnValue(runtimeStore)
    ;(useAgentTeamDefinitionStore as any).mockReturnValue(teamDefinitionStore)
  })

  const buildWrapper = (
    configOverrides: Record<string, unknown> = {},
    teamDefinition = mockTeamDef,
  ) => {
    const config = { ...mockConfig, ...configOverrides } as any
    const wrapper = mount(TeamRunConfigForm, {
      props: {
        config,
        teamDefinition: teamDefinition as any,
        workspaceLoadingState: { isLoading: false, error: null, loadedPath: null },
      },
      global: {
        stubs: {
          WorkspaceSelector: true,
          SearchableGroupedSelect: {
            name: 'SearchableGroupedSelect',
            template: '<div class="searchable-select-stub"></div>',
            props: ['modelValue', 'disabled', 'options'],
            emits: ['update:modelValue'],
          },
          MemberOverrideItem: {
            name: 'MemberOverrideItem',
            template: '<div class="member-override-item-stub"></div>',
            props: ['memberName', 'override', 'isCoordinator', 'options', 'disabled', 'globalLlmModel', 'globalLlmConfig'],
            emits: ['update:override'],
          },
        },
      },
    })
    return { wrapper, config }
  }

  it('renders runtime selector and member override entries', () => {
    const { wrapper } = buildWrapper()

    expect(wrapper.text()).toContain('Test Team')
    expect(wrapper.find('select#team-run-runtime-kind').exists()).toBe(true)
    const items = wrapper.findAllComponents({ name: 'MemberOverrideItem' })
    expect(items).toHaveLength(2)
    expect(items[0].props('memberName')).toBe('Member A')
  })

  it('loads model providers for the selected runtime and passes provider-grouped options', () => {
    const { wrapper } = buildWrapper({ runtimeKind: 'codex_app_server' })
    const options = wrapper.findComponent({ name: 'SearchableGroupedSelect' }).props('options')

    expect(llmStore.fetchProvidersWithModels).toHaveBeenCalledWith('codex_app_server')
    expect(options[0].label).toBe('OpenAI')
    expect(options[0].items[0].selectedLabel).toBe('OpenAI / GPT-4')
  })

  it('uses model identifiers as labels for AutoByteus runtime selections', () => {
    setProviders([
      buildProviderRow('AUTOBYTEUS', 'AutoByteus', [
        { modelIdentifier: 'host-a/model-x', name: 'Model X', value: 'host-a/model-x', canonicalName: 'model-x', providerId: 'AUTOBYTEUS', providerName: 'AutoByteus', providerType: 'AUTOBYTEUS', runtime: 'autobyteus' },
      ]),
    ])

    const { wrapper } = buildWrapper({ runtimeKind: 'autobyteus' })
    const options = wrapper.findComponent({ name: 'SearchableGroupedSelect' }).props('options')

    expect(options[0].items[0].name).toBe('host-a/model-x')
    expect(options[0].items[0].selectedLabel).toBe('AutoByteus / host-a/model-x')
  })

  it('uses friendly labels for custom providers on AutoByteus runtime selections', () => {
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

    const { wrapper } = buildWrapper({ runtimeKind: 'autobyteus' })
    const options = wrapper.findComponent({ name: 'SearchableGroupedSelect' }).props('options')

    expect(options[0].items[0].name).toBe('Model A')
    expect(options[0].items[0].selectedLabel).toBe('Internal Gateway / Model A')
  })

  it('changes runtime kind and reloads runtime-scoped models', async () => {
    const { wrapper, config } = buildWrapper({
      runtimeKind: 'autobyteus',
      llmModelIdentifier: 'gpt-4',
    })

    await wrapper.find('select#team-run-runtime-kind').setValue('codex_app_server')

    expect(config.runtimeKind).toBe('codex_app_server')
    expect(config.llmModelIdentifier).toBe('')
    expect(llmStore.fetchProvidersWithModels).toHaveBeenCalledWith('codex_app_server')
  })

  it('renders override entries for nested leaf agents only', () => {
    const { wrapper } = buildWrapper({}, nestedTeamDef)
    const items = wrapper.findAllComponents({ name: 'MemberOverrideItem' })

    expect(items).toHaveLength(2)
    expect(items[0].props('memberName')).toBe('Leaf A')
    expect(items[1].props('memberName')).toBe('Leaf B')
    expect(wrapper.text()).toContain('Team Members Override (2)')
  })
})
