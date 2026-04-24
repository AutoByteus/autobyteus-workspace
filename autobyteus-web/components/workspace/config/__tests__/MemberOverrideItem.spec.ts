import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
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
              reasoning_effort: { type: 'string', description: 'Reasoning Effort' },
            },
          },
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
              reasoning_effort: { type: 'string', description: 'Reasoning Effort' },
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
    agentDefinitionId: 'agent-reviewer',
    override: undefined,
    globalRuntimeKind: 'autobyteus',
    globalLlmModel: 'gpt-5.4',
    globalLlmConfig: { thinking_level: 5 },
    disabled: false,
    isCoordinator: false,
  }

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
      'Reviewer',
      {
        agentDefinitionId: 'agent-reviewer',
        runtimeKind: 'claude_agent_sdk',
        llmModelIdentifier: 'claude-sonnet',
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

    await wrapper.get('#override-runtime-Reviewer').setValue('claude_agent_sdk')
    await nextTick()

    const events = wrapper.emitted('update:override') || []
    expect(events.at(-1)).toEqual([
      'Reviewer',
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

    await wrapper.get('#override-runtime-Reviewer').setValue('')
    await nextTick()

    const events = wrapper.emitted('update:override') || []
    expect(events.at(-1)).toEqual([
      'Reviewer',
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
      'Reviewer',
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

    await wrapper.get('#override-runtime-Reviewer').setValue('')
    await nextTick()

    const events = wrapper.emitted('update:override') || []
    const cleanedOverride = (events.at(-1)?.[1] ?? null) as MemberConfigOverride | null
    const memberOverrides: Record<string, MemberConfigOverride> = cleanedOverride
      ? { Reviewer: cleanedOverride }
      : {}

    const readiness = evaluateTeamRunLaunchReadiness(
      {
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'Research Team',
        runtimeKind: 'autobyteus',
        workspaceId: 'ws-1',
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
        workspaceRootPath: undefined,
      },
    ])
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
    expect(wrapper.find('select[id^="config-Reviewer"]').exists()).toBe(false)
  })

})
