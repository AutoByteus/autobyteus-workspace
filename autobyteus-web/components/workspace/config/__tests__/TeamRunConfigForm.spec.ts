import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TeamRunConfigForm from '../TeamRunConfigForm.vue'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { useRuntimeAvailabilityStore } from '~/stores/runtimeAvailabilityStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore'

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
  llmModelIdentifier: 'gpt-5.4',
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

  const runtimeProviders: Record<string, any[]> = {
    autobyteus: [
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
          { modelIdentifier: 'gpt-5.4', name: 'GPT-5.4', value: 'gpt-5.4', canonicalName: 'gpt-5.4', providerId: 'OPENAI', providerName: 'OpenAI', providerType: 'OPENAI', runtime: 'autobyteus' },
        ],
      },
    ],
    codex_app_server: [
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
          { modelIdentifier: 'gpt-5.3-codex', name: 'GPT-5.3 Codex', value: 'gpt-5.3-codex', canonicalName: 'gpt-5.3-codex', providerId: 'OPENAI', providerName: 'OpenAI', providerType: 'OPENAI', runtime: 'api' },
        ],
      },
    ],
    claude_agent_sdk: [
      {
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
        models: [
          { modelIdentifier: 'claude-sonnet', name: 'Claude Sonnet', value: 'claude-sonnet', canonicalName: 'claude-sonnet', providerId: 'ANTHROPIC', providerName: 'Anthropic', providerType: 'ANTHROPIC', runtime: 'claude_agent_sdk' },
        ],
      },
    ],
  }

  beforeEach(() => {
    setActivePinia(createPinia())

    llmStore = {
      providersWithModels: [],
      providersWithModelsForSelection: [],
      fetchProvidersWithModels: vi.fn(async (runtimeKind: string) => {
        const rows = runtimeProviders[runtimeKind] ?? []
        llmStore.providersWithModels = rows
        llmStore.providersWithModelsForSelection = rows
        return rows
      }),
    }

    runtimeStore = {
      availabilities: [
        { runtimeKind: 'autobyteus', enabled: true, reason: null },
        { runtimeKind: 'codex_app_server', enabled: true, reason: null },
        { runtimeKind: 'claude_agent_sdk', enabled: true, reason: null },
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
    propOverrides: Record<string, unknown> = {},
  ) => {
    const config = { ...mockConfig, ...configOverrides } as any
    const wrapper = mount(TeamRunConfigForm, {
      props: {
        config,
        teamDefinition: teamDefinition as any,
        workspaceLoadingState: { isLoading: false, error: null, loadedPath: null },
        ...propOverrides,
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
            props: ['memberName', 'override', 'isCoordinator', 'disabled', 'advancedInitiallyExpanded', 'missingHistoricalConfig', 'globalRuntimeKind', 'globalLlmModel', 'globalLlmConfig'],
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
    expect(items[0].props('globalRuntimeKind')).toBe('autobyteus')
    expect(items[0].props('globalLlmModel')).toBe('gpt-5.4')
  })

  it('loads models for the team runtime and syncs runtime catalogs for explicit member runtimes', async () => {
    const { wrapper } = buildWrapper({
      memberOverrides: {
        'Member B': {
          agentDefinitionId: 'agent-b',
          runtimeKind: 'claude_agent_sdk',
        },
      },
    })

    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(llmStore.fetchProvidersWithModels).toHaveBeenCalledWith('autobyteus')
    expect(llmStore.fetchProvidersWithModels).toHaveBeenCalledWith('claude_agent_sdk')

    const store = useTeamRunConfigStore()
    expect(store.runtimeModelCatalogs.autobyteus).toEqual(['gpt-5.4'])
    expect(store.runtimeModelCatalogs.claude_agent_sdk).toEqual(['claude-sonnet'])
  })

  it('changes runtime kind and reloads runtime-scoped models', async () => {
    const { wrapper, config } = buildWrapper({
      runtimeKind: 'autobyteus',
      llmModelIdentifier: 'gpt-5.4',
    })

    await wrapper.find('select#team-run-runtime-kind').setValue('codex_app_server')
    await wrapper.vm.$nextTick()

    expect(config.runtimeKind).toBe('codex_app_server')
    expect(config.llmModelIdentifier).toBe('')
    expect(llmStore.fetchProvidersWithModels).toHaveBeenCalledWith('codex_app_server')
  })

  it('flattens nested team definitions into leaf member rows', () => {
    const { wrapper } = buildWrapper({}, nestedTeamDef)
    const items = wrapper.findAllComponents({ name: 'MemberOverrideItem' })

    expect(items).toHaveLength(2)
    expect(items[0].props('memberName')).toBe('Leaf A')
    expect(items[1].props('memberName')).toBe('Leaf B')
  })

  it('renders selected existing team run configuration as read-only while keeping member overrides inspectable', async () => {
    const { wrapper, config } = buildWrapper({
      llmConfig: { reasoning_effort: 'high' },
    }, mockTeamDef, { readOnly: true })

    await wrapper.vm.$nextTick()

    expect(wrapper.find('select#team-run-runtime-kind').element.disabled).toBe(true)
    expect(wrapper.find('button#team-auto-execute').element.disabled).toBe(true)
    expect(wrapper.find('select#team-skill-access-mode').element.disabled).toBe(true)
    expect(wrapper.findComponent({ name: 'WorkspaceSelector' }).props('disabled')).toBe(true)

    const overrideDisclosure = wrapper.find('button.w-full')
    expect(overrideDisclosure.attributes('disabled')).toBeUndefined()

    const items = wrapper.findAllComponents({ name: 'MemberOverrideItem' })
    expect(items).toHaveLength(2)
    expect(items[0].props('disabled')).toBe(true)
    expect(items[0].props('advancedInitiallyExpanded')).toBe(true)
    expect(items[0].props('missingHistoricalConfig')).toBe(false)
    expect(wrapper.text()).toContain('Selected team run configuration read only')

    items[0].vm.$emit('update:override', 'Member A', {
      agentDefinitionId: 'agent-a',
      llmModelIdentifier: 'changed-model',
    })
    expect(config.memberOverrides).toEqual({})
  })

  it('marks historical team member config as missing when read-only metadata has null llmConfig', async () => {
    const { wrapper } = buildWrapper({
      llmConfig: null,
      isLocked: true,
    })

    await wrapper.setProps({ readOnly: true })
    await wrapper.vm.$nextTick()

    const items = wrapper.findAllComponents({ name: 'MemberOverrideItem' })
    expect(items).toHaveLength(2)
    expect(items[0].props('missingHistoricalConfig')).toBe(true)
    expect(items[1].props('missingHistoricalConfig')).toBe(true)
  })
})
