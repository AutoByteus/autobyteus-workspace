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
  defaultLaunchConfig: {
    runtimeKind: 'autobyteus',
    llmModelIdentifier: 'gpt-5.4',
    llmConfig: null,
  },
  nodes: [
    { memberName: 'Member A', refType: 'AGENT', ref: 'agent-a' },
    { memberName: 'Member B', refType: 'AGENT', ref: 'agent-b' },
  ],
  coordinatorMemberName: 'Member A',
}

const nestedTeamDef = {
  id: 'team-nested',
  name: 'Nested Team',
  defaultLaunchConfig: {
    runtimeKind: 'autobyteus',
    llmModelIdentifier: 'gpt-5.4',
    llmConfig: null,
  },
  nodes: [
    { memberName: 'program_manager', refType: 'AGENT', ref: 'agent-pm' },
    { memberName: 'BuildSquad', refType: 'AGENT_TEAM', ref: 'sub-team-1' },
  ],
  coordinatorMemberName: 'program_manager',
}

const alternateTeamDef = {
  id: 'team-2',
  name: 'Other Team',
  defaultLaunchConfig: {
    runtimeKind: 'autobyteus',
    llmModelIdentifier: 'gpt-5.4',
    llmConfig: null,
  },
  nodes: [
    { memberName: 'Other Member', refType: 'AGENT', ref: 'agent-other' },
  ],
  coordinatorMemberName: 'Other Member',
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
          {
            modelIdentifier: 'gpt-5.5-effort-only',
            name: 'GPT-5.5 Effort Only',
            value: 'gpt-5.5-effort-only',
            canonicalName: 'gpt-5.5-effort-only',
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
            props: ['memberName', 'memberRouteKey', 'memberBreadcrumb', 'override', 'isCoordinator', 'disabled', 'advancedInitiallyExpanded', 'missingHistoricalConfig', 'globalRuntimeKind', 'globalLlmModel', 'globalLlmConfig', 'globalAutoExecuteTools'],
            emits: ['update:override'],
          },
        },
      },
    })
    return { wrapper, config }
  }

  const openRunDefaults = async (wrapper: any) => {
    const toggle = wrapper.get('[data-test="team-run-defaults-edit"]')
    if (toggle.attributes('aria-expanded') !== 'true') {
      await toggle.trigger('click')
    }
    await wrapper.vm.$nextTick()
    await flushPromises()
  }

  const openMemberOverrides = async (wrapper: any) => {
    await wrapper.get('[data-test="team-member-overrides-edit"]').trigger('click')
    await wrapper.vm.$nextTick()
  }

  it('renders team definition group with defaults open and member overrides collapsed by default', () => {
    const { wrapper } = buildWrapper()

    expect(wrapper.text()).toContain('Test Team')
    const teamGroup = wrapper.get('[data-test="team-definition-group"]')
    const workspaceSelector = wrapper.getComponent({ name: 'WorkspaceSelector' })
    expect(teamGroup.element.compareDocumentPosition(workspaceSelector.element) & 4).toBeTruthy()
    expect(teamGroup.classes()).not.toContain('border')
    expect(teamGroup.find('[data-test="team-definition-name-card"]').exists()).toBe(true)
    expect(teamGroup.find('[data-test="team-run-defaults-summary"]').exists()).toBe(true)
    expect(teamGroup.find('[data-test="team-member-overrides-summary"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="team-run-defaults-runtime"]').text()).toBe('AutoByteus')
    expect(wrapper.get('[data-test="team-run-defaults-model"]').text()).toBe('gpt-5.4')
    expect(wrapper.get('[data-test="team-run-defaults-auto-approve"]').text()).toContain('Auto approve off')
    expect(wrapper.get('[data-test="team-run-defaults-edit"]').attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('select#team-run-runtime-kind').exists()).toBe(true)
    expect(wrapper.get('[data-test="team-run-defaults-summary"]').find('[data-test="team-run-defaults-editor"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="team-run-defaults-llm-config-empty"]').text()).toContain('No custom model config')
    expect(wrapper.get('[data-test="team-member-count"]').text()).toContain('2')
    const memberSummary = wrapper.get('[data-test="team-member-overrides-summary"]')
    expect(memberSummary.classes()).toContain('border-indigo-200')
    expect(memberSummary.classes()).toContain('bg-indigo-50/80')
    expect(memberSummary.classes()).not.toContain('bg-slate-50/80')
    expect(wrapper.get('[data-test="team-member-overrides-edit"]').attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[data-test="team-member-overrides-editor"]').exists()).toBe(false)
    const items = wrapper.findAllComponents({ name: 'MemberOverrideItem' })
    expect(items).toHaveLength(0)
  })

  it('centers disclosure button labels with balanced chevron columns', async () => {
    const { wrapper } = buildWrapper()

    const defaultsToggle = wrapper.get('[data-test="team-run-defaults-edit"]')
    expect(defaultsToggle.text()).toMatch(/Hide team default/i)
    expect(defaultsToggle.classes()).toContain('inline-grid')
    expect(defaultsToggle.classes()).toContain('grid-cols-[1rem_auto_1rem]')
    expect(defaultsToggle.classes()).toContain('justify-items-center')
    expect(defaultsToggle.classes()).toContain('gap-1')
    expect(defaultsToggle.find('.text-center.leading-5').text()).toMatch(/Hide team default/i)
    expect(defaultsToggle.find('.i-heroicons-chevron-down-20-solid').classes()).not.toContain('ml-1')

    await openMemberOverrides(wrapper)

    const overridesToggle = wrapper.get('[data-test="team-member-overrides-edit"]')
    expect(overridesToggle.text()).toContain('Hide member overrides')
    expect(overridesToggle.classes()).toContain('inline-grid')
    expect(overridesToggle.classes()).toContain('grid-cols-[1rem_auto_1rem]')
    expect(overridesToggle.classes()).toContain('justify-items-center')
    expect(overridesToggle.classes()).toContain('gap-1')
    expect(overridesToggle.find('.text-center.leading-5').text()).toContain('Hide member overrides')
    expect(overridesToggle.find('.i-heroicons-chevron-down-20-solid').classes()).not.toContain('ml-1')
  })

  it('keeps run defaults open and opens member override editors on demand', async () => {
    const { wrapper } = buildWrapper()

    expect(wrapper.get('[data-test="team-run-defaults-edit"]').attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('select#team-run-runtime-kind').exists()).toBe(true)
    const autoApprove = wrapper.get('button#team-auto-execute')
    const memberOverrides = wrapper.get('[data-test="team-member-overrides-summary"]')
    expect(autoApprove.element.compareDocumentPosition(memberOverrides.element) & 4).toBeTruthy()

    await openMemberOverrides(wrapper)
    expect(wrapper.get('[data-test="team-member-overrides-edit"]').attributes('aria-expanded')).toBe('true')

    const items = wrapper.findAllComponents({ name: 'MemberOverrideItem' })
    expect(items).toHaveLength(2)
    expect(items[0].props('memberName')).toBe('Member A')
    expect(items[0].props('globalRuntimeKind')).toBe('autobyteus')
    expect(items[0].props('globalLlmModel')).toBe('gpt-5.4')
  })

  it('exposes route-key override focus by expanding overrides and focusing the matching nested member card', async () => {
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })
    const host = document.createElement('div')
    document.body.appendChild(host)
    const config = { ...mockConfig, teamDefinitionId: 'team-nested', memberOverrides: {} } as any
    const wrapper = mount(TeamRunConfigForm, {
      attachTo: host,
      props: {
        config,
        teamDefinition: nestedTeamDef as any,
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
            template: '<div data-test="member-override-card" :data-member-route-key="memberRouteKey" tabindex="-1">{{ memberRouteKey }}</div>',
            props: ['memberName', 'memberRouteKey', 'memberBreadcrumb', 'override', 'isCoordinator', 'disabled', 'advancedInitiallyExpanded', 'missingHistoricalConfig', 'globalRuntimeKind', 'globalLlmModel', 'globalLlmConfig', 'globalAutoExecuteTools'],
            emits: ['update:override'],
          },
        },
      },
    })

    expect(wrapper.find('[data-test="team-member-overrides-editor"]').exists()).toBe(false)

    await (wrapper.vm as any).focusMemberOverrides(['BuildSquad/review_lead'])

    const target = wrapper.get('[data-member-route-key="BuildSquad/review_lead"]')
    expect(wrapper.get('[data-test="team-member-overrides-editor"]').exists()).toBe(true)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' })
    expect(document.activeElement).toBe(target.element)

    wrapper.unmount()
    host.remove()
  })

  it('aligns team auto approve toggle with the title row, with description below', () => {
    const { wrapper } = buildWrapper()

    const card = wrapper.get('[data-test="team-auto-execute-card"]')
    const titleRow = wrapper.get('[data-test="team-auto-execute-title-row"]')
    const description = wrapper.get('[data-test="team-auto-execute-description"]')

    expect(card.classes()).not.toContain('flex')
    expect(card.classes()).not.toContain('items-center')
    expect(titleRow.classes()).toContain('flex')
    expect(titleRow.classes()).toContain('items-center')
    expect(titleRow.find('label[for="team-auto-execute"]').exists()).toBe(true)
    expect(titleRow.find('button#team-auto-execute').exists()).toBe(true)
    expect(titleRow.find('[data-test="team-auto-execute-description"]').exists()).toBe(false)
    expect(titleRow.element.compareDocumentPosition(description.element) & 4).toBeTruthy()
  })

  it('uses exact team-default action copy when the defaults editor is collapsed', async () => {
    const { wrapper } = buildWrapper()

    expect(wrapper.text()).not.toContain('Change run default')

    await wrapper.get('[data-test="team-run-defaults-edit"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-test="team-run-defaults-edit"]').attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('[data-test="team-run-defaults-edit"]').text()).toContain('Edit team default')
    expect(wrapper.text()).not.toContain('Change run default')
  })

  it('suppresses team-default runtime and model helper paragraphs', () => {
    const { wrapper } = buildWrapper()

    expect(wrapper.text()).not.toContain('Selects the runtime backend used by this team run.')
    expect(wrapper.text()).not.toContain('This model will be used by all members unless overridden.')
    expect(wrapper.get('label[for="team-run-runtime-kind"]').text()).toContain('Runtime')
    expect(wrapper.text()).toContain('Default llm model global')
  })

  it('resets disclosures when a reused read-only form becomes a new editable config', async () => {
    const { wrapper } = buildWrapper({
      llmConfig: { reasoning_effort: 'high' },
    }, mockTeamDef, { readOnly: true })

    await wrapper.vm.$nextTick()
    expect(wrapper.find('select#team-run-runtime-kind').exists()).toBe(true)
    expect(wrapper.find('[data-test="team-member-overrides-editor"]').exists()).toBe(true)

    await wrapper.setProps({
      readOnly: false,
      config: {
        ...mockConfig,
        memberOverrides: {},
      },
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-test="team-run-defaults-edit"]').attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('select#team-run-runtime-kind').exists()).toBe(true)
    expect(wrapper.get('[data-test="team-member-overrides-edit"]').attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[data-test="team-member-overrides-editor"]').exists()).toBe(false)
  })

  it('resets disclosures when an expanded draft is replaced by another editable team draft', async () => {
    const { wrapper } = buildWrapper()

    await openMemberOverrides(wrapper)
    expect(wrapper.find('select#team-run-runtime-kind').exists()).toBe(true)
    expect(wrapper.find('[data-test="team-member-overrides-editor"]').exists()).toBe(true)

    await wrapper.setProps({
      config: {
        ...mockConfig,
        teamDefinitionId: 'team-2',
        teamDefinitionName: 'Other Team',
        memberOverrides: {},
      },
      teamDefinition: alternateTeamDef,
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Other Team')
    expect(wrapper.get('[data-test="team-run-defaults-edit"]').attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('select#team-run-runtime-kind').exists()).toBe(true)
    expect(wrapper.get('[data-test="team-member-overrides-edit"]').attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[data-test="team-member-overrides-editor"]').exists()).toBe(false)
  })

  it('shows a model-required summary action when no run model is configured', () => {
    const { wrapper } = buildWrapper({
      llmModelIdentifier: '',
    })

    expect(wrapper.get('[data-test="team-run-defaults-status"]').text()).toContain('Status model required')
    expect(wrapper.get('[data-test="team-run-defaults-model"]').text()).toContain('No model selected')
    expect(wrapper.find('select#team-run-runtime-kind').exists()).toBe(true)
  })

  it('shows concrete llmConfig entries in the defaults summary', () => {
    const { wrapper } = buildWrapper({
      llmConfig: { service_tier: 'fast', reasoning_effort: 'high' },
    })

    expect(wrapper.get('[data-test="team-run-defaults-status"]').text()).toContain('Status changed')
    const entries = wrapper.findAll('[data-test="team-run-defaults-llm-config-entry"]')
    expect(entries.map((entry) => entry.text())).toEqual([
      'reasoning_effort: high',
      'service_tier: fast',
    ])
  })

  it('shows active member override names while the member editor is collapsed', () => {
    const { wrapper } = buildWrapper({
      memberOverrides: {
        'Member B': {
          agentDefinitionId: 'agent-b',
          runtimeKind: 'claude_agent_sdk',
        },
      },
    })

    expect(wrapper.find('[data-test="team-member-overrides-editor"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="team-member-override-count"]').text()).toContain('1')
    expect(wrapper.get('[data-test="team-member-override-names"]').text()).toContain('Member B')
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
    expect(store.runtimeModelCatalogs.autobyteus).toEqual(['gpt-5.4', 'gpt-5.5-responses'])
    expect(store.runtimeModelCatalogs.claude_agent_sdk).toEqual(['claude-sonnet'])
  })

  it('changes runtime kind and reloads runtime-scoped models', async () => {
    const { wrapper, config } = buildWrapper({
      runtimeKind: 'autobyteus',
      llmModelIdentifier: 'gpt-5.4',
    })

    await openRunDefaults(wrapper)
    await wrapper.find('select#team-run-runtime-kind').setValue('codex_app_server')
    await wrapper.vm.$nextTick()

    expect(config.runtimeKind).toBe('codex_app_server')
    expect(config.llmModelIdentifier).toBe('')
    expect(llmStore.fetchProvidersWithModels).toHaveBeenCalledWith('codex_app_server')
  })


  it('renders Codex effort-only reasoning defaults visibly on the team-global config path', async () => {
    const { wrapper, config } = buildWrapper({
      runtimeKind: 'codex_app_server',
      llmModelIdentifier: 'gpt-5.5',
      llmConfig: null,
    })

    await openRunDefaults(wrapper)
    await wrapper.vm.$nextTick()
    await flushPromises()

    const reasoningSelect = wrapper.get('select#team-run-reasoning_effort')
    const serviceTierSelect = wrapper.get('select#team-run-service_tier')
    const thinkingRow = wrapper.getComponent({ name: 'ModelConfigBasic' })
    const advancedContainer = wrapper.get('[data-testid="advanced-params-container"]')

    expect(thinkingRow.props('enabled')).toBe(true)
    expect(thinkingRow.props('neutralEnabled')).toBe(true)
    expect(thinkingRow.get('button').element.disabled).toBe(true)
    expect(thinkingRow.get('button').classes()).toContain('bg-gray-300')
    expect(wrapper.find('[data-testid="advanced-params-toggle"]').exists()).toBe(false)
    expect(advancedContainer.attributes('style') ?? '').not.toContain('display: none')
    expect(reasoningSelect.isVisible()).toBe(true)
    expect((reasoningSelect.element as HTMLSelectElement).value).toBe('medium')
    expect((serviceTierSelect.element as HTMLSelectElement).value).toBe('__default__')
    expect(config.llmConfig).toBeNull()

    await thinkingRow.get('button').trigger('click')
    expect(config.llmConfig).toBeNull()

    await reasoningSelect.setValue('xhigh')

    expect(config.llmConfig).toEqual({ reasoning_effort: 'xhigh' })
  })

  it('inlines a single thinking-on advanced row in the team defaults editor', async () => {
    const { wrapper } = buildWrapper({
      runtimeKind: 'codex_app_server',
      llmModelIdentifier: 'gpt-5.5-effort-only',
      llmConfig: null,
    })

    await openRunDefaults(wrapper)
    await wrapper.vm.$nextTick()
    await flushPromises()

    const thinkingRow = wrapper.getComponent({ name: 'ModelConfigBasic' })
    const reasoningSelect = wrapper.get('select#team-run-reasoning_effort')
    const advancedContainer = wrapper.get('[data-testid="advanced-params-container"]')

    expect(thinkingRow.props('enabled')).toBe(true)
    expect(thinkingRow.props('neutralEnabled')).toBe(true)
    expect(wrapper.find('[data-testid="advanced-params-toggle"]').exists()).toBe(false)
    expect(advancedContainer.attributes('style') ?? '').not.toContain('display: none')
    expect(reasoningSelect.isVisible()).toBe(true)
    expect((reasoningSelect.element as HTMLSelectElement).value).toBe('medium')
  })

  it('defaults supported OpenAI Responses thinking on and keeps team defaults flat', async () => {
    const { wrapper, config } = buildWrapper({
      runtimeKind: 'autobyteus',
      llmModelIdentifier: 'gpt-5.5-responses',
      llmConfig: null,
    })

    await openRunDefaults(wrapper)
    await wrapper.vm.$nextTick()
    await flushPromises()

    const thinkingRow = wrapper.getComponent({ name: 'ModelConfigBasic' })
    const advancedContainer = wrapper.get('[data-testid="advanced-params-container"]')

    expect(thinkingRow.props('enabled')).toBe(true)
    expect(wrapper.find('[data-testid="advanced-params-toggle"]').exists()).toBe(false)
    expect(advancedContainer.attributes('style') ?? '').not.toContain('display: none')
    expect((wrapper.get('select#team-run-reasoning_effort').element as HTMLSelectElement).value).toBe('none')
    expect((wrapper.get('select#team-run-reasoning_summary').element as HTMLSelectElement).value).toBe('auto')
    expect(config.llmConfig).toEqual({ reasoning_summary: 'auto' })
  })

  it('preserves explicit OpenAI Responses thinking-off state in team defaults', async () => {
    const explicitOff = { reasoning_effort: 'none', reasoning_summary: 'none' }
    const { wrapper, config } = buildWrapper({
      runtimeKind: 'autobyteus',
      llmModelIdentifier: 'gpt-5.5-responses',
      llmConfig: explicitOff,
    })

    await openRunDefaults(wrapper)
    await wrapper.vm.$nextTick()
    await flushPromises()

    const thinkingRow = wrapper.getComponent({ name: 'ModelConfigBasic' })

    expect(thinkingRow.props('enabled')).toBe(false)
    expect(wrapper.find('[data-testid="advanced-params-toggle"]').exists()).toBe(false)
    expect((wrapper.get('select#team-run-reasoning_effort').element as HTMLSelectElement).value).toBe('none')
    expect((wrapper.get('select#team-run-reasoning_summary').element as HTMLSelectElement).value).toBe('none')
    expect(config.llmConfig).toEqual(explicitOff)
  })

  it('prunes inherited member-only llmConfig overrides when the global model changes', async () => {
    const { wrapper, config } = buildWrapper({
      runtimeKind: 'codex_app_server',
      llmModelIdentifier: 'gpt-5.4',
      llmConfig: { reasoning_effort: 'high' },
      memberOverrides: {
        'Member A': {
          agentDefinitionId: 'agent-a',
          llmConfig: { reasoning_effort: 'xhigh' },
        },
        'Member B': {
          agentDefinitionId: 'agent-b',
          autoExecuteTools: true,
          llmConfig: { reasoning_effort: 'medium' },
        },
      },
    })

    await openRunDefaults(wrapper)
    await wrapper.findComponent({ name: 'SearchableGroupedSelect' }).vm.$emit('update:modelValue', 'gpt-5.3-codex')
    await wrapper.vm.$nextTick()

    expect(config.llmModelIdentifier).toBe('gpt-5.3-codex')
    expect(config.llmConfig).toBeNull()
    expect(config.memberOverrides).toEqual({
      'Member B': {
        agentDefinitionId: 'agent-b',
        autoExecuteTools: true,
      },
    })
  })

  it('prunes inherited member llmConfig overrides when the global runtime changes', async () => {
    const { wrapper, config } = buildWrapper({
      runtimeKind: 'autobyteus',
      llmModelIdentifier: 'gpt-5.4',
      llmConfig: { thinking_level: 5 },
      memberOverrides: {
        'Member A': {
          agentDefinitionId: 'agent-a',
          llmConfig: { thinking_level: 3 },
        },
        'Member B': {
          agentDefinitionId: 'agent-b',
          llmModelIdentifier: 'gpt-5.4',
          llmConfig: { thinking_level: 4 },
        },
      },
    })

    await openRunDefaults(wrapper)
    await wrapper.find('select#team-run-runtime-kind').setValue('codex_app_server')
    await wrapper.vm.$nextTick()

    expect(config.runtimeKind).toBe('codex_app_server')
    expect(config.llmModelIdentifier).toBe('')
    expect(config.llmConfig).toBeNull()
    expect(config.memberOverrides).toEqual({
      'Member B': {
        agentDefinitionId: 'agent-b',
        llmModelIdentifier: 'gpt-5.4',
      },
    })
  })

  it('renders nested leaf overrides under their subteam group and keeps route-key override identity', async () => {
    const { wrapper } = buildWrapper({}, nestedTeamDef)
    await wrapper.vm.$nextTick()
    await openMemberOverrides(wrapper)

    const groups = wrapper.findAll('[data-test="member-override-group"]')
    expect(groups).toHaveLength(1)
    expect(groups[0].text()).toContain('BuildSquad')
    expect(groups[0].text()).toContain('BuildSquad')

    const items = wrapper.findAllComponents({ name: 'MemberOverrideItem' })
    const itemTexts = groups[0].findAllComponents({ name: 'MemberOverrideItem' })

    expect(items).toHaveLength(3)
    expect(items[0].props('memberRouteKey')).toBe('program_manager')
    expect(itemTexts).toHaveLength(2)
    expect(itemTexts[0].props('memberName')).toBe('review_lead')
    expect(itemTexts[0].props('memberRouteKey')).toBe('BuildSquad/review_lead')
    expect(itemTexts[0].props('memberBreadcrumb')).toBe('BuildSquad / review_lead')
    expect(itemTexts[1].props('memberName')).toBe('qa_specialist')
    expect(itemTexts[1].props('memberRouteKey')).toBe('BuildSquad/qa_specialist')

    itemTexts[0].vm.$emit('update:override', 'BuildSquad/review_lead', {
      agentDefinitionId: 'agent-review',
      runtimeKind: 'codex_app_server',
    })
    expect((wrapper.props('config') as any).memberOverrides).toMatchObject({
      'BuildSquad/review_lead': {
        agentDefinitionId: 'agent-review',
        runtimeKind: 'codex_app_server',
      },
    })
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

    const overrideDisclosure = wrapper.get('[data-test="team-member-overrides-edit"]')
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
