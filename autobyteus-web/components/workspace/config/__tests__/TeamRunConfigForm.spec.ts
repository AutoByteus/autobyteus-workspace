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

const sixMemberTeamDef = {
  id: 'team-6',
  name: 'Six Member Team',
  nodes: [
    { memberName: 'solution_designer', refType: 'AGENT', ref: 'agent-solution' },
    { memberName: 'architecture_reviewer', refType: 'AGENT', ref: 'agent-architecture' },
    { memberName: 'implementation_engineer', refType: 'AGENT', ref: 'agent-implementation' },
    { memberName: 'code_reviewer', refType: 'AGENT', ref: 'agent-code' },
    { memberName: 'api_e2e_engineer', refType: 'AGENT', ref: 'agent-api' },
    { memberName: 'delivery_engineer', refType: 'AGENT', ref: 'agent-delivery' },
  ],
  coordinatorMemberName: 'solution_designer',
}

const nestedTeamDef = {
  id: 'team-nested',
  name: 'Nested Team',
  nodes: [
    { memberName: 'program_manager', refType: 'AGENT', ref: 'agent-pm' },
    { memberName: 'BuildSquad', refType: 'AGENT_TEAM', ref: 'sub-team-1' },
  ],
  coordinatorMemberName: 'program_manager',
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

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
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
          {
            modelIdentifier: 'gpt-5.5-responses',
            name: 'GPT-5.5 Responses',
            value: 'gpt-5.5-responses',
            canonicalName: 'gpt-5.5-responses',
            providerId: 'OPENAI',
            providerName: 'OpenAI',
            providerType: 'OPENAI',
            runtime: 'autobyteus',
            configSchema: {
              parameters: [
                {
                  name: 'reasoning_effort',
                  type: 'string',
                  title: 'Reasoning Effort',
                  default_value: 'none',
                  enum_values: ['none', 'low', 'medium', 'high'],
                },
                {
                  name: 'reasoning_summary',
                  type: 'string',
                  title: 'Reasoning Summary',
                  default_value: 'none',
                  enum_values: ['none', 'auto', 'concise'],
                },
              ],
            },
          },
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
          {
            modelIdentifier: 'gpt-5.5',
            name: 'GPT-5.5 (default reasoning: medium)',
            value: 'gpt-5.5',
            canonicalName: 'gpt-5.5',
            providerId: 'OPENAI',
            providerName: 'OpenAI',
            providerType: 'OPENAI',
            runtime: 'codex_app_server',
            configSchema: {
              parameters: [
                {
                  name: 'reasoning_effort',
                  type: 'string',
                  title: 'Reasoning Effort',
                  default_value: 'medium',
                  enum_values: ['low', 'medium', 'high', 'xhigh'],
                },
                {
                  name: 'service_tier',
                  type: 'string',
                  title: 'Fast mode',
                  enum_values: ['fast'],
                },
              ],
            },
          },
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
      providersWithModelsForSelection: vi.fn((runtimeKind: string) =>
        (runtimeProviders[runtimeKind] ?? []).filter((provider: any) => provider.models.length > 0),
      ),
      fetchProvidersWithModels: vi.fn(async (runtimeKind: string) => {
        const rows = runtimeProviders[runtimeKind] ?? []
        llmStore.providersWithModels = rows
        return rows
      }),
      ensureMissingDynamicProviders: vi.fn().mockResolvedValue(undefined),
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
              { memberName: 'review_lead', refType: 'AGENT', ref: 'agent-review' },
              { memberName: 'qa_specialist', refType: 'AGENT', ref: 'agent-qa' },
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
        workspaceSelection: { mode: 'new', existingWorkspaceId: null, newWorkspacePath: '' },
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
            props: ['memberName', 'memberAddress', 'memberBreadcrumb', 'override', 'isCoordinator', 'disabled', 'advancedInitiallyExpanded', 'missingHistoricalConfig', 'globalRuntimeKind', 'globalLlmModel', 'globalLlmConfig'],
            emits: ['update:override'],
          },
        },
      },
    })
    return { wrapper, config }
  }

  const expandMemberOverrides = async (wrapper: any) => {
    await wrapper.get('[data-test="team-member-overrides-toggle"]').trigger('click')
    await wrapper.vm.$nextTick()
  }

  const emittedConfigEdits = (wrapper: any) =>
    (wrapper.emitted('edit-config') ?? []).map(([edit]: [unknown]) => edit)

  it('places team auto approve before a collapsed accessible member override disclosure', async () => {
    const { wrapper } = buildWrapper({}, sixMemberTeamDef)

    const renderedHtml = wrapper.html()
    expect(renderedHtml.indexOf('data-test="team-auto-approve-row"')).toBeGreaterThan(-1)
    expect(renderedHtml.indexOf('data-test="team-member-overrides-toggle"')).toBeGreaterThan(-1)
    expect(renderedHtml.indexOf('data-test="team-auto-approve-row"')).toBeLessThan(
      renderedHtml.indexOf('data-test="team-member-overrides-toggle"'),
    )

    const toggle = wrapper.get('[data-test="team-member-overrides-toggle"]')
    const panel = wrapper.get('[data-test="team-member-overrides-panel"]')
    const chevron = wrapper.get('[data-test="team-member-overrides-chevron"]')

    expect(toggle.text()).toContain('Team Members Override (6)')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(toggle.attributes('aria-controls')).toBe('team-member-overrides-panel')
    expect(panel.attributes('id')).toBe('team-member-overrides-panel')
    expect(panel.attributes('style')).toContain('display: none')
    expect(chevron.classes()).toContain('-rotate-90')
    expect(wrapper.find('[data-test="team-member-overrides-count"]').exists()).toBe(false)

    await toggle.trigger('click')

    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(panel.attributes('style') ?? '').not.toContain('display: none')
    expect(chevron.classes()).not.toContain('-rotate-90')
  })

  it('toggles the member override disclosure without mutating config fields', async () => {
    const { wrapper, config } = buildWrapper({
      autoExecuteTools: true,
      memberOverrides: {
        'Member B': {
          autoExecuteTools: false,
        },
      },
    })

    expect(wrapper.get('[data-test="team-member-overrides-count"]').text()).toContain('1 overridden')
    const initialMemberOverrides = JSON.parse(JSON.stringify(config.memberOverrides))

    await expandMemberOverrides(wrapper)
    await wrapper.get('[data-test="team-member-overrides-toggle"]').trigger('click')

    expect(wrapper.get('[data-test="team-member-overrides-toggle"]').attributes('aria-expanded')).toBe('false')
    expect(config.autoExecuteTools).toBe(true)
    expect(config.memberOverrides).toEqual(initialMemberOverrides)
  })

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

  it('relays the complete controlled workspace selection without retaining a local copy', () => {
    const workspaceSelection = {
      mode: 'new' as const,
      existingWorkspaceId: 'temp-ws',
      newWorkspacePath: '/workspace/pending',
    }
    const { wrapper } = buildWrapper({}, mockTeamDef, { workspaceSelection })
    const selector = wrapper.findComponent({ name: 'WorkspaceSelector' })

    expect(selector.props('modelValue')).toEqual(workspaceSelection)

    const nextSelection = {
      mode: 'existing' as const,
      existingWorkspaceId: 'workspace-two',
      newWorkspacePath: '/workspace/pending',
    }
    selector.vm.$emit('update:modelValue', nextSelection)

    expect(wrapper.emitted('update:workspaceSelection')).toEqual([[nextSelection]])
  })

  it('loads models for the team runtime and syncs runtime catalogs for explicit member runtimes', async () => {
    const { wrapper } = buildWrapper({
      memberOverrides: {
        'Member B': {
          runtimeKind: 'claude_agent_sdk',
        },
      },
    })

    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(llmStore.fetchProvidersWithModels).toHaveBeenCalledWith('autobyteus')
    expect(llmStore.fetchProvidersWithModels).toHaveBeenCalledWith('claude_agent_sdk')

    const store = useTeamRunConfigStore()
    expect(store.runtimeModelCatalogs.autobyteus).toEqual(['gpt-5.4', 'gpt-5.5-responses'])
    expect(store.runtimeModelCatalogs.claude_agent_sdk).toEqual(['claude-sonnet'])
  })

  it('changes runtime kind and reloads runtime-scoped models', async () => {
    const { wrapper, config } = buildWrapper({
      runtimeKind: 'autobyteus',
      llmModelIdentifier: 'gpt-5.4',
    })

    await wrapper.find('select#team-run-runtime-kind').setValue('codex_app_server')
    await wrapper.vm.$nextTick()

    expect(emittedConfigEdits(wrapper)).toEqual([
      { kind: 'set_runtime', runtimeKind: 'codex_app_server' },
      { kind: 'set_model', llmModelIdentifier: '' },
      { kind: 'set_llm_config', llmConfig: null },
    ])
    expect(config.runtimeKind).toBe('autobyteus')
    expect(config.llmModelIdentifier).toBe('gpt-5.4')

    await wrapper.setProps({
      config: {
        ...config,
        runtimeKind: 'codex_app_server',
        llmModelIdentifier: '',
        llmConfig: null,
      },
    })
    await wrapper.vm.$nextTick()
    expect(llmStore.fetchProvidersWithModels).toHaveBeenCalledWith('codex_app_server')
  })


  it('renders Codex effort-only reasoning defaults visibly on the team-global config path', async () => {
    const { wrapper, config } = buildWrapper({
      runtimeKind: 'codex_app_server',
      llmModelIdentifier: 'gpt-5.5',
      llmConfig: null,
    })

    await wrapper.vm.$nextTick()
    await flushPromises()

    const reasoningSelect = wrapper.get('select#team-run-reasoning_effort')
    const serviceTierSelect = wrapper.get('select#team-run-service_tier')
    const thinkingRow = wrapper.getComponent({ name: 'ModelConfigBasic' })
    const advancedToggle = wrapper.get('[data-testid="advanced-params-toggle"]')

    expect(thinkingRow.props('enabled')).toBe(true)
    expect(thinkingRow.get('button').element.disabled).toBe(true)
    expect(advancedToggle.attributes('aria-expanded')).toBe('true')
    expect(reasoningSelect.isVisible()).toBe(true)
    expect((reasoningSelect.element as HTMLSelectElement).value).toBe('medium')
    expect((serviceTierSelect.element as HTMLSelectElement).value).toBe('__default__')
    expect(config.llmConfig).toBeNull()

    await thinkingRow.get('button').trigger('click')
    expect(config.llmConfig).toBeNull()

    await reasoningSelect.setValue('xhigh')

    expect(emittedConfigEdits(wrapper)).toContainEqual({
      kind: 'set_llm_config',
      llmConfig: { reasoning_effort: 'xhigh' },
    })
    expect(config.llmConfig).toBeNull()
  })

  it('starts team-global advanced collapsed for OpenAI Responses off defaults', async () => {
    const { wrapper, config } = buildWrapper({
      runtimeKind: 'autobyteus',
      llmModelIdentifier: 'gpt-5.5-responses',
      llmConfig: null,
    })

    await wrapper.vm.$nextTick()
    await flushPromises()

    const thinkingRow = wrapper.getComponent({ name: 'ModelConfigBasic' })
    const advancedToggle = wrapper.get('[data-testid="advanced-params-toggle"]')
    const advancedContainer = wrapper.get('[data-testid="advanced-params-container"]')

    expect(thinkingRow.props('enabled')).toBe(false)
    expect(advancedToggle.attributes('aria-expanded')).toBe('false')
    expect(advancedContainer.attributes('style')).toContain('display: none')
    expect((wrapper.get('select#team-run-reasoning_effort').element as HTMLSelectElement).value).toBe('none')
    expect((wrapper.get('select#team-run-reasoning_summary').element as HTMLSelectElement).value).toBe('none')
    expect(config.llmConfig).toBeNull()
  })

  it('emits the closed model edit while leaving inherited-config pruning to the store owner', async () => {
    const { wrapper, config } = buildWrapper({
      runtimeKind: 'codex_app_server',
      llmModelIdentifier: 'gpt-5.4',
      llmConfig: { reasoning_effort: 'high' },
      memberOverrides: {
        'Member A': {
          llmConfig: { reasoning_effort: 'xhigh' },
        },
        'Member B': {
          autoExecuteTools: true,
          llmConfig: { reasoning_effort: 'medium' },
        },
      },
    })

    await wrapper.findComponent({ name: 'SearchableGroupedSelect' }).vm.$emit('update:modelValue', 'gpt-5.3-codex')
    await wrapper.vm.$nextTick()

    expect(emittedConfigEdits(wrapper)).toEqual([
      { kind: 'set_model', llmModelIdentifier: 'gpt-5.3-codex' },
      { kind: 'set_llm_config', llmConfig: null },
    ])
    expect(config.llmModelIdentifier).toBe('gpt-5.4')
    expect(config.llmConfig).toEqual({ reasoning_effort: 'high' })
    expect(config.memberOverrides['Member A'].llmConfig).toEqual({ reasoning_effort: 'xhigh' })
  })

  it('emits the closed runtime edit while leaving inherited-config pruning to the store owner', async () => {
    const { wrapper, config } = buildWrapper({
      runtimeKind: 'autobyteus',
      llmModelIdentifier: 'gpt-5.4',
      llmConfig: { thinking_level: 5 },
      memberOverrides: {
        'Member A': {
          llmConfig: { thinking_level: 3 },
        },
        'Member B': {
          llmModelIdentifier: 'gpt-5.4',
          llmConfig: { thinking_level: 4 },
        },
      },
    })

    await wrapper.find('select#team-run-runtime-kind').setValue('codex_app_server')
    await wrapper.vm.$nextTick()

    expect(emittedConfigEdits(wrapper)).toEqual([
      { kind: 'set_runtime', runtimeKind: 'codex_app_server' },
      { kind: 'set_model', llmModelIdentifier: '' },
      { kind: 'set_llm_config', llmConfig: null },
    ])
    expect(config.runtimeKind).toBe('autobyteus')
    expect(config.llmModelIdentifier).toBe('gpt-5.4')
    expect(config.llmConfig).toEqual({ thinking_level: 5 })
    expect(config.memberOverrides['Member A'].llmConfig).toEqual({ thinking_level: 3 })
  })

  it('renders nested leaf overrides under their subteam group and keeps canonical-address override identity', async () => {
    const { wrapper } = buildWrapper({}, nestedTeamDef)
    await wrapper.vm.$nextTick()
    await expandMemberOverrides(wrapper)

    const groups = wrapper.findAll('[data-test="member-override-group"]')
    expect(groups).toHaveLength(1)
    expect(groups[0].text()).toContain('BuildSquad')
    expect(groups[0].text()).toContain('BuildSquad')

    const items = wrapper.findAllComponents({ name: 'MemberOverrideItem' })
    const itemTexts = groups[0].findAllComponents({ name: 'MemberOverrideItem' })

    expect(items).toHaveLength(3)
    expect(items[0].props('memberAddress')).toBe('/program_manager')
    expect(itemTexts).toHaveLength(2)
    expect(itemTexts[0].props('memberName')).toBe('review_lead')
    expect(itemTexts[0].props('memberAddress')).toBe('/BuildSquad/review_lead')
    expect(itemTexts[0].props('memberBreadcrumb')).toBe('BuildSquad / review_lead')
    expect(itemTexts[1].props('memberName')).toBe('qa_specialist')
    expect(itemTexts[1].props('memberAddress')).toBe('/BuildSquad/qa_specialist')

    itemTexts[0].vm.$emit('update:override', '/BuildSquad/review_lead', {
      runtimeKind: 'codex_app_server',
    })
    expect(emittedConfigEdits(wrapper)).toContainEqual({
      kind: 'set_member_override',
      memberAddress: '/BuildSquad/review_lead',
      override: {
        runtimeKind: 'codex_app_server',
      },
    })
    expect((wrapper.props('config') as any).memberOverrides).toEqual({})
  })

  it('renders selected existing team run configuration as read-only while keeping member overrides inspectable', async () => {
    const { wrapper, config } = buildWrapper({
      llmConfig: { reasoning_effort: 'high' },
    }, mockTeamDef, { readOnly: true })

    await wrapper.vm.$nextTick()

    expect(wrapper.find('select#team-run-runtime-kind').element.disabled).toBe(true)
    expect(wrapper.find('button#team-auto-execute').element.disabled).toBe(true)
    expect(wrapper.find('select#team-skill-access-mode').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'WorkspaceSelector' }).props('disabled')).toBe(true)

    const overrideDisclosure = wrapper.get('[data-test="team-member-overrides-toggle"]')
    expect(overrideDisclosure.attributes('disabled')).toBeUndefined()
    expect(overrideDisclosure.attributes('aria-expanded')).toBe('false')

    await overrideDisclosure.trigger('click')
    expect(overrideDisclosure.attributes('aria-expanded')).toBe('true')

    const items = wrapper.findAllComponents({ name: 'MemberOverrideItem' })
    expect(items).toHaveLength(2)
    expect(items[0].props('disabled')).toBe(true)
    expect(items[0].props('advancedInitiallyExpanded')).toBe(true)
    expect(items[0].props('missingHistoricalConfig')).toBe(false)
    expect(wrapper.text()).toContain('Selected team run configuration read only')

    items[0].vm.$emit('update:override', 'Member A', {
      llmModelIdentifier: 'changed-model',
    })
    expect(config.memberOverrides).toEqual({})
    expect(emittedConfigEdits(wrapper)).toEqual([])
  })

  it('marks historical team member config as missing when read-only metadata has null llmConfig', async () => {
    const { wrapper } = buildWrapper({
      llmConfig: null,
      isLocked: true,
    })

    await wrapper.setProps({ readOnly: true })
    await wrapper.vm.$nextTick()
    await expandMemberOverrides(wrapper)

    const items = wrapper.findAllComponents({ name: 'MemberOverrideItem' })
    expect(items).toHaveLength(2)
    expect(items[0].props('missingHistoricalConfig')).toBe(true)
    expect(items[1].props('missingHistoricalConfig')).toBe(true)
  })
})
