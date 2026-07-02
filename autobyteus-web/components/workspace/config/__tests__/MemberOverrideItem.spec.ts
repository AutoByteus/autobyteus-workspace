import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, nextTick } from 'vue'
import MemberOverrideItem from '../MemberOverrideItem.vue'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { useRuntimeAvailabilityStore } from '~/stores/runtimeAvailabilityStore'
import type { MemberConfigOverride } from '~/types/agent/TeamRunConfig'
import { evaluateTeamRunLaunchReadiness } from '~/utils/teamRunLaunchReadiness'
import { buildTeamRunMemberConfigRecords } from '~/utils/teamRunMemberConfigBuilder'

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const fallbackTranslate = (key: string): string => {
  const tail = key.split('.').pop() || key
  const normalized = tail.replace(/_/g, ' ').toLowerCase()
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

const translateMemberOverrideLabel = (key: string): string => ({
  'workspace.components.workspace.config.MemberOverrideItem.auto_approve_use_global': 'Use global',
  'workspace.components.workspace.config.MemberOverrideItem.auto_approve_yes': 'Yes',
  'workspace.components.workspace.config.MemberOverrideItem.auto_approve_no': 'No',
}[key] ?? fallbackTranslate(key))

vi.mock('~/stores/llmProviderConfig', () => ({
  useLLMProviderConfigStore: vi.fn(),
}))

vi.mock('~/stores/runtimeAvailabilityStore', () => ({
  useRuntimeAvailabilityStore: vi.fn(),
}))

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
        {
          modelIdentifier: 'gpt-5.4',
          name: 'GPT-5.4',
          value: 'gpt-5.4',
          canonicalName: 'gpt-5.4',
          providerId: 'OPENAI',
          providerName: 'OpenAI',
          providerType: 'OPENAI',
          runtime: 'autobyteus',
          configSchema: {
            type: 'object',
            properties: {
              thinking_level: { type: 'integer', description: 'Thinking Level' },
            },
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
          modelIdentifier: 'gpt-5.4',
          name: 'GPT-5.4',
          value: 'gpt-5.4',
          canonicalName: 'gpt-5.4',
          providerId: 'OPENAI',
          providerName: 'OpenAI',
          providerType: 'OPENAI',
          runtime: 'codex_app_server',
          configSchema: {
            type: 'object',
            properties: {
              reasoning_effort: {
                type: 'string',
                title: 'Reasoning Effort',
                description: 'Reasoning Effort',
                enum: ['low', 'medium', 'high', 'xhigh'],
                default: 'medium',
              },
              service_tier: {
                type: 'string',
                title: 'Fast mode',
                description: 'Fast mode',
                enum: ['fast'],
              },
            },
          },
        },
        {
          modelIdentifier: 'gpt-no-config',
          name: 'GPT No Config',
          value: 'gpt-no-config',
          canonicalName: 'gpt-no-config',
          providerId: 'OPENAI',
          providerName: 'OpenAI',
          providerType: 'OPENAI',
          runtime: 'codex_app_server',
        },
        {
          modelIdentifier: 'gpt-5.3-codex',
          name: 'GPT-5.3 Codex',
          value: 'gpt-5.3-codex',
          canonicalName: 'gpt-5.3-codex',
          providerId: 'OPENAI',
          providerName: 'OpenAI',
          providerType: 'OPENAI',
          runtime: 'codex_app_server',
          configSchema: {
            type: 'object',
            properties: {
              reasoning_effort: {
                type: 'string',
                title: 'Reasoning Effort',
                description: 'Reasoning Effort',
                enum: ['low', 'medium', 'high', 'xhigh'],
                default: 'medium',
              },
              service_tier: {
                type: 'string',
                title: 'Fast mode',
                description: 'Fast mode',
                enum: ['fast'],
              },
            },
          },
        },
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
        {
          modelIdentifier: 'claude-sonnet',
          name: 'Claude Sonnet',
          value: 'claude-sonnet',
          canonicalName: 'claude-sonnet',
          providerId: 'ANTHROPIC',
          providerName: 'Anthropic',
          providerType: 'ANTHROPIC',
          runtime: 'claude_agent_sdk',
          configSchema: {
            type: 'object',
            properties: {
              thinking_enabled: { type: 'boolean', description: 'Enable Thinking' },
            },
          },
        },
      ],
    },
  ],
}

describe('MemberOverrideItem', () => {
  let llmStore: any
  let runtimeAvailabilityStore: any

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

    runtimeAvailabilityStore = {
      availabilities: [
        { runtimeKind: 'autobyteus', enabled: true, reason: null },
        { runtimeKind: 'codex_app_server', enabled: true, reason: null },
        { runtimeKind: 'claude_agent_sdk', enabled: true, reason: null },
      ],
      fetchRuntimeAvailabilities: vi.fn().mockResolvedValue([]),
      availabilityByKind: vi.fn((runtimeKind: string) =>
        runtimeAvailabilityStore.availabilities.find((row: any) => row.runtimeKind === runtimeKind) ?? null,
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

  const defaultProps = {
    memberName: 'Reviewer',
    memberRouteKey: 'reviewer',
    agentDefinitionId: 'agent-reviewer',
    override: undefined,
    globalRuntimeKind: 'autobyteus',
    globalLlmModel: 'gpt-5.4',
    globalLlmConfig: { thinking_level: 5 },
    globalAutoExecuteTools: false,
    disabled: false,
    isCoordinator: false,
  }

  it('renders the leaf row collapsed by default and expands without blocking the disclosure in editable mode', async () => {
    const wrapper = mount(MemberOverrideItem, {
      props: defaultProps,
    })

    await nextTick()

    const editor = wrapper.get('[data-test="member-override-editor"]')
    const card = wrapper.get('[data-test="member-override-card"]')
    expect(wrapper.get('[data-test="member-override-row"]').attributes('aria-expanded')).toBe('false')
    expect(card.attributes('data-state')).toBe('collapsed')
    expect(card.attributes('data-member-route-key')).toBe('reviewer')
    expect(card.attributes('tabindex')).toBe('-1')
    expect(editor.attributes('style')).toContain('display: none')
    expect(wrapper.get('[data-test="member-override-status"]').text()).toContain('Using team defaults')
    expect(wrapper.find('[data-test="member-override-reset"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('No member overrides')
    expect(wrapper.find('[data-test="member-override-field-indicator-empty"]').exists()).toBe(false)

    await wrapper.get('[data-test="member-override-row"]').trigger('click')

    expect(wrapper.get('[data-test="member-override-row"]').attributes('aria-expanded')).toBe('true')
    expect(card.attributes('data-state')).toBe('expanded')
    expect(card.classes()).toContain('border-blue-200')
    expect(card.classes()).toContain('ring-1')
    expect(editor.attributes('style') ?? '').not.toContain('display: none')
  })

  it('marks only explicitly overridden member fields in the collapsed row and expanded editor', async () => {
    const wrapper = mount(MemberOverrideItem, {
      props: {
        ...defaultProps,
        override: {
          agentDefinitionId: 'agent-reviewer',
          runtimeKind: 'codex_app_server',
          autoExecuteTools: true,
        },
      },
    })

    await nextTick()

    const summaryIndicators = wrapper
      .findAll('[data-test="member-override-field-indicator"]')
      .map((indicator) => indicator.text())

    expect(summaryIndicators).toEqual(['Runtime field', 'Auto approve field'])
    expect(wrapper.get('[data-test="member-override-status"]').text()).toContain('Overridden')
    expect(wrapper.find('[data-test="member-override-field-indicator-empty"]').exists()).toBe(false)

    await wrapper.get('[data-test="member-override-row"]').trigger('click')

    expect(wrapper.findAll('[data-test="member-override-field-indicator"]')).toHaveLength(0)
    expect(wrapper.get('[data-test="member-override-runtime-field"]').text()).toContain('Field overridden')
    expect(wrapper.get('[data-test="member-override-auto-approve-field"]').text()).toContain('Field overridden')
    expect(wrapper.get('[data-test="member-override-model-field"]').text()).not.toContain('Field overridden')
    expect(wrapper.get('[data-test="member-override-model-config-field"]').text()).not.toContain('Field overridden')
  })

  it('keeps multiple member override cards independently expandable', async () => {
    const updateOverride = vi.fn()
    const Harness = defineComponent({
      components: { MemberOverrideItem },
      setup() {
        return {
          first: {
            ...defaultProps,
            memberName: 'Reviewer',
            memberRouteKey: 'reviewer',
          },
          second: {
            ...defaultProps,
            memberName: 'Writer',
            memberRouteKey: 'writer',
            agentDefinitionId: 'agent-writer',
          },
          updateOverride,
        }
      },
      template: `
        <div>
          <MemberOverrideItem v-bind="first" @update:override="updateOverride" />
          <MemberOverrideItem v-bind="second" @update:override="updateOverride" />
        </div>
      `,
    })

    const wrapper = mount(Harness)
    await nextTick()

    const rows = wrapper.findAll('[data-test="member-override-row"]')
    const editors = wrapper.findAll('[data-test="member-override-editor"]')
    expect(rows).toHaveLength(2)
    expect(editors[0].attributes('style')).toContain('display: none')
    expect(editors[1].attributes('style')).toContain('display: none')

    await rows[0].trigger('click')
    await rows[1].trigger('click')

    expect(rows[0].attributes('aria-expanded')).toBe('true')
    expect(rows[1].attributes('aria-expanded')).toBe('true')
    expect(editors[0].attributes('style') ?? '').not.toContain('display: none')
    expect(editors[1].attributes('style') ?? '').not.toContain('display: none')

    await rows[0].trigger('click')

    expect(rows[0].attributes('aria-expanded')).toBe('false')
    expect(rows[1].attributes('aria-expanded')).toBe('true')
    expect(editors[0].attributes('style')).toContain('display: none')
    expect(editors[1].attributes('style') ?? '').not.toContain('display: none')
  })

  it('maps Auto Approve Override Use global, Yes, and No to undefined, true, and false storage', async () => {
    const wrapper = mount(MemberOverrideItem, {
      props: defaultProps,
      global: {
        mocks: {
          $t: translateMemberOverrideLabel,
        },
      },
    })

    await nextTick()
    const select = wrapper.get('#override-auto-reviewer')
    expect(select.text()).toContain('Use global')
    expect(select.text()).toContain('Yes')
    expect(select.text()).toContain('No')
    expect(wrapper.text()).not.toContain('workspace.components.workspace.config.MemberOverrideItem.auto_approve_use_global')

    await select.setValue('yes')
    expect(wrapper.emitted('update:override')?.at(-1)).toEqual([
      'reviewer',
      {
        agentDefinitionId: 'agent-reviewer',
        autoExecuteTools: true,
      },
    ])

    await wrapper.setProps({
      override: {
        agentDefinitionId: 'agent-reviewer',
        autoExecuteTools: true,
      },
    })
    await select.setValue('no')
    expect(wrapper.emitted('update:override')?.at(-1)).toEqual([
      'reviewer',
      {
        agentDefinitionId: 'agent-reviewer',
        autoExecuteTools: false,
      },
    ])

    await wrapper.setProps({
      override: {
        agentDefinitionId: 'agent-reviewer',
        autoExecuteTools: false,
      },
    })
    await select.setValue('global')
    expect(wrapper.emitted('update:override')?.at(-1)).toEqual(['reviewer', null])
  })

  it('confirms a header reset before clearing and keeps reset controls outside the expand button', async () => {
    const wrapper = mount(MemberOverrideItem, {
      props: {
        ...defaultProps,
        override: {
          agentDefinitionId: 'agent-reviewer',
          autoExecuteTools: true,
        },
      },
    })

    expect(wrapper.get('[data-test="member-override-row"]').find('[data-test="member-override-reset"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="member-override-reset"]').text()).toContain('Reset to default')

    const beforeRequestCount = wrapper.emitted('update:override')?.length ?? 0
    await wrapper.get('[data-test="member-override-reset"]').trigger('click')
    expect(wrapper.emitted('update:override')?.length ?? 0).toBe(beforeRequestCount)
    expect(wrapper.get('[data-test="member-override-reset-confirm"]').text()).toContain('Confirm reset')
    expect(wrapper.get('[data-test="member-override-reset-cancel"]').text()).toContain('Cancel')
    expect(wrapper.get('[data-test="member-override-row"]').attributes('aria-expanded')).toBe('false')

    await wrapper.get('[data-test="member-override-reset-cancel"]').trigger('click')
    expect(wrapper.emitted('update:override')?.length ?? 0).toBe(beforeRequestCount)
    expect(wrapper.find('[data-test="member-override-reset-confirm"]').exists()).toBe(false)

    await wrapper.get('[data-test="member-override-row"]').trigger('click')
    expect(wrapper.get('[data-test="member-override-row"]').attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('[data-test="member-override-reset"]').exists()).toBe(true)

    await wrapper.get('[data-test="member-override-reset"]').trigger('click')
    await wrapper.get('[data-test="member-override-reset-confirm"]').trigger('click')

    expect(wrapper.emitted('update:override')?.at(-1)).toEqual(['reviewer', null])
  })

  it('does not mutate reset controls while disabled', async () => {
    const wrapper = mount(MemberOverrideItem, {
      props: {
        ...defaultProps,
        disabled: true,
        override: {
          agentDefinitionId: 'agent-reviewer',
          runtimeKind: 'codex_app_server',
        },
      },
    })

    const reset = wrapper.get('[data-test="member-override-reset"]')
    expect((reset.element as HTMLButtonElement).disabled).toBe(true)
    await reset.trigger('click')

    expect(wrapper.emitted('update:override')).toBeUndefined()
    expect(wrapper.find('[data-test="member-override-reset-confirm"]').exists()).toBe(false)
  })

  it('renders a blocking warning when a runtime override breaks inherited global model availability', async () => {
    const wrapper = mount(MemberOverrideItem, {
      props: {
        ...defaultProps,
        override: {
          agentDefinitionId: 'agent-reviewer',
          runtimeKind: 'claude_agent_sdk',
        },
      },
    })

    await nextTick()
    await nextTick()

    expect(llmStore.fetchProvidersWithModels).toHaveBeenCalledWith('claude_agent_sdk')
    expect(wrapper.get('[data-testid="member-override-warning"]').text()).toContain(
      'Global model gpt-5.4 is unavailable for Claude Agent SDK',
    )
  })

  it('emits a resolving explicit model override for an unresolved runtime override', async () => {
    const wrapper = mount(MemberOverrideItem, {
      props: {
        ...defaultProps,
        override: {
          agentDefinitionId: 'agent-reviewer',
          runtimeKind: 'claude_agent_sdk',
        },
      },
    })

    await nextTick()
    await nextTick()

    wrapper.findComponent({ name: 'SearchableGroupedSelect' }).vm.$emit('update:modelValue', 'claude-sonnet')
    await nextTick()

    const events = wrapper.emitted('update:override') || []
    expect(events[0]).toEqual([
      'reviewer',
      {
        agentDefinitionId: 'agent-reviewer',
        runtimeKind: 'claude_agent_sdk',
        llmModelIdentifier: 'claude-sonnet',
      },
    ])
  })

  it('clears stale explicit member llmConfig when the explicit model changes', async () => {
    const wrapper = mount(MemberOverrideItem, {
      props: {
        ...defaultProps,
        globalRuntimeKind: 'codex_app_server',
        globalLlmConfig: { reasoning_effort: 'high' },
        override: {
          agentDefinitionId: 'agent-reviewer',
          llmModelIdentifier: 'gpt-5.4',
          llmConfig: { reasoning_effort: 'medium' },
        },
      },
    })

    await nextTick()
    await nextTick()

    wrapper.findComponent({ name: 'SearchableGroupedSelect' }).vm.$emit('update:modelValue', 'gpt-5.3-codex')
    await nextTick()

    const events = wrapper.emitted('update:override') || []
    expect(events.at(-1)).toEqual([
      'reviewer',
      {
        agentDefinitionId: 'agent-reviewer',
        llmModelIdentifier: 'gpt-5.3-codex',
      },
    ])
  })

  it('drops an incompatible explicit model when the runtime override changes', async () => {
    const wrapper = mount(MemberOverrideItem, {
      props: {
        ...defaultProps,
        override: {
          agentDefinitionId: 'agent-reviewer',
          runtimeKind: 'autobyteus',
          llmModelIdentifier: 'gpt-5.4',
          llmConfig: { thinking_level: 3 },
        },
      },
    })

    await nextTick()
    await nextTick()

    await wrapper.get('#override-runtime-reviewer').setValue('claude_agent_sdk')
    await nextTick()

    const events = wrapper.emitted('update:override') || []
    expect(events.at(-1)).toEqual([
      'reviewer',
      {
        agentDefinitionId: 'agent-reviewer',
        runtimeKind: 'claude_agent_sdk',
      },
    ])
  })

  it('clears stale member-only llmConfig when invalid explicit model cleanup falls back to the inherited global runtime', async () => {
    const wrapper = mount(MemberOverrideItem, {
      props: {
        ...defaultProps,
        override: {
          agentDefinitionId: 'agent-reviewer',
          runtimeKind: 'codex_app_server',
          llmModelIdentifier: 'gpt-5.3-codex',
          llmConfig: { reasoning_effort: 'medium' },
        },
      },
    })

    await nextTick()
    await nextTick()

    await wrapper.get('#override-runtime-reviewer').setValue('')
    await nextTick()

    const events = wrapper.emitted('update:override') || []
    expect(events.at(-1)).toEqual([
      'reviewer',
      null,
    ])
  })

  it('clears stale member-only llmConfig when effective runtime changes invalidate the explicit model', async () => {
    const wrapper = mount(MemberOverrideItem, {
      props: {
        ...defaultProps,
        globalRuntimeKind: 'codex_app_server',
        globalLlmConfig: { reasoning_effort: 'high' },
        override: {
          agentDefinitionId: 'agent-reviewer',
          llmModelIdentifier: 'gpt-5.3-codex',
          llmConfig: { reasoning_effort: 'medium' },
        },
      },
    })

    await nextTick()
    await nextTick()

    await wrapper.setProps({
      globalRuntimeKind: 'autobyteus',
      globalLlmConfig: { thinking_level: 5 },
    })
    await nextTick()
    await nextTick()

    const events = wrapper.emitted('update:override') || []
    expect(events.at(-1)).toEqual([
      'reviewer',
      null,
    ])
  })

  it('feeds cleaned inherited-global fallback rows into readiness and materialization without stale config', async () => {
    const wrapper = mount(MemberOverrideItem, {
      props: {
        ...defaultProps,
        override: {
          agentDefinitionId: 'agent-reviewer',
          runtimeKind: 'codex_app_server',
          llmModelIdentifier: 'gpt-5.3-codex',
          llmConfig: { reasoning_effort: 'medium' },
        },
      },
    })

    await nextTick()
    await nextTick()

    await wrapper.get('#override-runtime-reviewer').setValue('')
    await nextTick()

    const events = wrapper.emitted('update:override') || []
    const cleanedOverride = (events.at(-1)?.[1] ?? null) as MemberConfigOverride | null
    const memberOverrides: Record<string, MemberConfigOverride> = cleanedOverride
      ? { reviewer: cleanedOverride }
      : {}

    const readiness = evaluateTeamRunLaunchReadiness(
      {
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'Research Team',
        runtimeKind: 'autobyteus',
        workspaceId: 'ws-1',
        workspaceMetadata: null,
        llmModelIdentifier: 'gpt-5.4',
        llmConfig: { thinking_level: 5 },
        autoExecuteTools: false,
        skillAccessMode: 'PRELOADED_ONLY',
        memberOverrides,
        isLocked: false,
      },
      {
        autobyteus: ['gpt-5.4'],
      },
    )

    expect(readiness.canLaunch).toBe(true)
    expect(readiness.blockingIssues).toEqual([])

    expect(
      buildTeamRunMemberConfigRecords({
        config: {
          teamDefinitionId: 'team-def-1',
          teamDefinitionName: 'Research Team',
          runtimeKind: 'autobyteus',
          workspaceId: 'ws-1',
          workspaceMetadata: null,
          llmModelIdentifier: 'gpt-5.4',
          llmConfig: { thinking_level: 5 },
          autoExecuteTools: false,
          skillAccessMode: 'PRELOADED_ONLY',
          memberOverrides,
          isLocked: false,
        },
        leafMembers: [
          {
            memberName: 'Reviewer',
            memberRouteKey: 'reviewer',
            agentDefinitionId: 'agent-reviewer',
          },
        ],
      }),
    ).toEqual([
      {
        memberName: 'Reviewer',
        memberRouteKey: 'reviewer',
        agentDefinitionId: 'agent-reviewer',
        runtimeKind: 'autobyteus',
        llmModelIdentifier: 'gpt-5.4',
        llmConfig: { thinking_level: 5 },
        autoExecuteTools: false,
        skillAccessMode: 'PRELOADED_ONLY',
        workspaceId: 'ws-1',
        workspaceMetadata: null,
        workspaceRootPath: undefined,
      },
    ])
  })

  it('serializes team workspace root path from workspace metadata for launch inputs', () => {
    const workspaceMetadata = {
      workspaceId: 'agent_ws_metadata',
      workspaceRootPath: '/tmp/MetadataTeam',
      displayName: 'MetadataTeam',
      kind: 'filesystem' as const,
    }

    const records = buildTeamRunMemberConfigRecords({
      config: {
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'Research Team',
        runtimeKind: 'codex_app_server',
        workspaceId: workspaceMetadata.workspaceId,
        workspaceMetadata,
        llmModelIdentifier: 'gpt-5.4',
        llmConfig: { reasoning_effort: 'high' },
        autoExecuteTools: false,
        skillAccessMode: 'PRELOADED_ONLY',
        memberOverrides: {},
        isLocked: false,
      },
      leafMembers: [
        {
          memberName: 'Reviewer',
          memberRouteKey: 'reviewer',
          agentDefinitionId: 'agent-reviewer',
        },
      ],
    })

    expect(records[0]).toEqual(expect.objectContaining({
      workspaceId: workspaceMetadata.workspaceId,
      workspaceMetadata,
      workspaceRootPath: '/tmp/MetadataTeam',
    }))
  })

  it('blocks filesystem workspace metadata team launch readiness when the root path is missing', () => {
    const readiness = evaluateTeamRunLaunchReadiness(
      {
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'Research Team',
        runtimeKind: 'codex_app_server',
        workspaceId: 'agent_ws_metadata_only',
        workspaceMetadata: null,
        llmModelIdentifier: 'gpt-5.4',
        llmConfig: { reasoning_effort: 'high' },
        autoExecuteTools: false,
        skillAccessMode: 'PRELOADED_ONLY',
        memberOverrides: {},
        isLocked: false,
      },
      {
        codex_app_server: ['gpt-5.4'],
      },
    )

    expect(readiness.canLaunch).toBe(false)
    expect(readiness.blockingIssues).toContainEqual(expect.objectContaining({
      code: 'WORKSPACE_REQUIRED',
      message: 'Workspace root path is required to run a filesystem workspace metadata team.',
    }))
  })

  it('passes missing historical config state into member model config display', async () => {
    const wrapper = mount(MemberOverrideItem, {
      props: {
        ...defaultProps,
        globalRuntimeKind: 'codex_app_server',
        globalLlmModel: 'gpt-5.4',
        globalLlmConfig: null,
        disabled: true,
        advancedInitiallyExpanded: true,
        missingHistoricalConfig: true,
      },
    })

    await nextTick()
    await flushPromises()
    await nextTick()

    expect(wrapper.text()).toContain('Not recorded for this historical run')
    expect(wrapper.find('[data-testid="missing-historical-config-value"]').exists()).toBe(true)
    expect(wrapper.find('select[id^="config-reviewer"]').exists()).toBe(false)
  })

  it('renders an explicit no-options message when the effective model has no config schema', async () => {
    const wrapper = mount(MemberOverrideItem, {
      props: {
        ...defaultProps,
        globalRuntimeKind: 'codex_app_server',
        globalLlmModel: 'gpt-no-config',
        globalLlmConfig: null,
      },
    })

    await nextTick()
    await flushPromises()
    await nextTick()
    await wrapper.get('[data-test="member-override-row"]').trigger('click')

    expect(wrapper.get('[data-test="member-override-model-config-field"]').text()).toContain(
      'No configurable model options for this model.',
    )
    expect(wrapper.find('[data-test="member-override-model-config-unavailable"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="advanced-params-toggle"]').exists()).toBe(false)
  })

  it('renders inherited reasoning and Fast mode flat without an Advanced disclosure', async () => {
    const wrapper = mount(MemberOverrideItem, {
      props: {
        ...defaultProps,
        globalRuntimeKind: 'codex_app_server',
        globalLlmModel: 'gpt-5.4',
        globalLlmConfig: null,
        disabled: false,
        advancedInitiallyExpanded: false,
      },
    })

    await nextTick()
    await flushPromises()
    await nextTick()

    const advancedContainer = wrapper.get('[data-testid="advanced-params-container"]')
    const reasoningSelect = wrapper.get('select#config-reviewer-reasoning_effort')
    const fastModeSelect = wrapper.get('select#config-reviewer-service_tier')
    const thinkingRow = wrapper.getComponent({ name: 'ModelConfigBasic' })

    expect(thinkingRow.props('enabled')).toBe(true)
    expect(thinkingRow.get('button').element.disabled).toBe(true)
    expect(wrapper.find('[data-testid="advanced-params-toggle"]').exists()).toBe(false)
    expect(advancedContainer.attributes('style') ?? '').not.toContain('display: none')
    expect((reasoningSelect.element as HTMLSelectElement).value).toBe('medium')
    expect((fastModeSelect.element as HTMLSelectElement).value).toBe('__default__')
    expect(wrapper.emitted('update:override')).toBeUndefined()
  })

  it('keeps flat advanced rows visible when the inherited global thinking-on model changes', async () => {
    const wrapper = mount(MemberOverrideItem, {
      props: {
        ...defaultProps,
        globalRuntimeKind: 'codex_app_server',
        globalLlmModel: 'gpt-5.4',
        globalLlmConfig: null,
        disabled: false,
        advancedInitiallyExpanded: false,
      },
    })

    await nextTick()
    await flushPromises()
    await nextTick()

    const advancedContainer = wrapper.get('[data-testid="advanced-params-container"]')
    expect(wrapper.find('[data-testid="advanced-params-toggle"]').exists()).toBe(false)
    expect(advancedContainer.attributes('style') ?? '').not.toContain('display: none')

    await wrapper.setProps({ globalLlmModel: 'gpt-5.3-codex' })
    await nextTick()
    await flushPromises()
    await nextTick()

    expect(wrapper.find('[data-testid="advanced-params-toggle"]').exists()).toBe(false)
    expect(advancedContainer.attributes('style') ?? '').not.toContain('display: none')
    expect(wrapper.emitted('update:override')).toBeUndefined()
  })

  it('keeps flat advanced rows visible for an explicit member model selection whose effective thinking is on', async () => {
    const wrapper = mount(MemberOverrideItem, {
      props: {
        ...defaultProps,
        globalRuntimeKind: 'codex_app_server',
        globalLlmModel: 'gpt-5.4',
        globalLlmConfig: null,
        disabled: false,
        advancedInitiallyExpanded: false,
      },
    })

    await nextTick()
    await flushPromises()
    await nextTick()

    const advancedContainer = wrapper.get('[data-testid="advanced-params-container"]')
    expect(wrapper.find('[data-testid="advanced-params-toggle"]').exists()).toBe(false)

    wrapper.findComponent({ name: 'SearchableGroupedSelect' }).vm.$emit('update:modelValue', 'gpt-5.3-codex')
    await nextTick()
    await wrapper.setProps({
      override: wrapper.emitted('update:override')?.at(-1)?.[1] as MemberConfigOverride,
    })
    await flushPromises()
    await nextTick()

    expect(wrapper.find('[data-testid="advanced-params-toggle"]').exists()).toBe(false)
    expect(advancedContainer.attributes('style') ?? '').not.toContain('display: none')
    expect(wrapper.emitted('update:override')?.at(-1)).toEqual([
      'reviewer',
      {
        agentDefinitionId: 'agent-reviewer',
        llmModelIdentifier: 'gpt-5.3-codex',
      },
    ])
  })

  it('keeps flat advanced rows visible for an explicit member runtime selection to an effective-on model', async () => {
    const wrapper = mount(MemberOverrideItem, {
      props: {
        ...defaultProps,
        globalRuntimeKind: 'autobyteus',
        globalLlmModel: 'gpt-5.4',
        globalLlmConfig: null,
        disabled: false,
        advancedInitiallyExpanded: false,
      },
    })

    await nextTick()
    await flushPromises()
    await nextTick()

    const advancedContainer = wrapper.get('[data-testid="advanced-params-container"]')
    expect(wrapper.find('[data-testid="advanced-params-toggle"]').exists()).toBe(false)

    await wrapper.get('#override-runtime-reviewer').setValue('codex_app_server')
    await nextTick()
    await wrapper.setProps({
      override: wrapper.emitted('update:override')?.at(-1)?.[1] as MemberConfigOverride,
    })
    await flushPromises()
    await nextTick()

    expect(wrapper.find('[data-testid="advanced-params-toggle"]').exists()).toBe(false)
    expect(advancedContainer.attributes('style') ?? '').not.toContain('display: none')
    expect(wrapper.emitted('update:override')?.at(-1)).toEqual([
      'reviewer',
      {
        agentDefinitionId: 'agent-reviewer',
        runtimeKind: 'codex_app_server',
      },
    ])
  })

  it('defaults member override Thinking on through ModelConfigSection for Claude when no explicit state exists', async () => {
    const wrapper = mount(MemberOverrideItem, {
      props: {
        ...defaultProps,
        globalRuntimeKind: 'claude_agent_sdk',
        globalLlmModel: 'claude-sonnet',
        globalLlmConfig: null,
      },
    })

    await nextTick()
    await flushPromises()
    await nextTick()

    expect(wrapper.getComponent({ name: 'ModelConfigBasic' }).props('enabled')).toBe(false)
    expect(wrapper.emitted('update:override')?.at(-1)).toEqual([
      'reviewer',
      {
        agentDefinitionId: 'agent-reviewer',
        llmConfig: {
          thinking_enabled: true,
        },
      },
    ])

    await wrapper.setProps({
      override: wrapper.emitted('update:override')?.at(-1)?.[1] as MemberConfigOverride,
    })
    await nextTick()

    expect(wrapper.getComponent({ name: 'ModelConfigBasic' }).props('enabled')).toBe(true)
  })

  it('preserves explicit inherited member Thinking off state and read-only no-mutation behavior', async () => {
    const wrapper = mount(MemberOverrideItem, {
      props: {
        ...defaultProps,
        globalRuntimeKind: 'claude_agent_sdk',
        globalLlmModel: 'claude-sonnet',
        globalLlmConfig: { thinking_enabled: false },
        disabled: true,
      },
    })

    await nextTick()
    await flushPromises()
    await nextTick()

    expect(wrapper.getComponent({ name: 'ModelConfigBasic' }).props('enabled')).toBe(false)
    expect(wrapper.emitted('update:override')).toBeUndefined()
  })

})
