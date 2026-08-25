import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import MemberOverrideItem from '../MemberOverrideItem.vue'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { useRuntimeAvailabilityStore } from '~/stores/runtimeAvailabilityStore'
import type { AgentConfigOverride, ResolvedTeamRunLaunchConfig } from '~/types/agent/TeamRunConfig'
import type { EditableTeamFormAgentNode } from '~/types/agent/EditableTeamRunFormModel'
import type { ExistingTeamFormAgentNode } from '~/types/agent/ExistingTeamRunFormModel'

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

vi.mock('~/stores/llmProviderConfig', () => ({ useLLMProviderConfigStore: vi.fn() }))
vi.mock('~/stores/runtimeAvailabilityStore', () => ({ useRuntimeAvailabilityStore: vi.fn() }))

const model = (
  modelIdentifier: string,
  runtime: string,
  configSchema: Record<string, unknown>,
) => ({
  modelIdentifier,
  name: modelIdentifier,
  value: modelIdentifier,
  canonicalName: modelIdentifier,
  providerId: runtime === 'claude_agent_sdk' ? 'ANTHROPIC' : 'OPENAI',
  providerName: runtime === 'claude_agent_sdk' ? 'Anthropic' : 'OpenAI',
  providerType: runtime === 'claude_agent_sdk' ? 'ANTHROPIC' : 'OPENAI',
  runtime,
  configSchema,
})
const provider = (runtime: string, models: ReturnType<typeof model>[]) => [{
  provider: {
    id: runtime === 'claude_agent_sdk' ? 'ANTHROPIC' : 'OPENAI',
    name: runtime === 'claude_agent_sdk' ? 'Anthropic' : 'OpenAI',
    providerType: runtime === 'claude_agent_sdk' ? 'ANTHROPIC' : 'OPENAI',
    isCustom: false,
    baseUrl: null,
    apiKeyConfigured: true,
    status: 'NOT_APPLICABLE',
    statusMessage: null,
  },
  models,
}]
const codexSchema = {
  type: 'object',
  properties: {
    temperature: { type: 'number', title: 'Temperature' },
    reasoning_effort: {
      type: 'string', title: 'Reasoning Effort',
      enum: ['low', 'medium', 'high', 'xhigh'], default: 'medium',
    },
  },
}
const runtimeProviders: Record<string, any[]> = {
  autobyteus: provider('autobyteus', [model('gpt-5.4', 'autobyteus', {
    type: 'object', properties: { thinking_level: { type: 'integer' } },
  })]),
  codex_app_server: provider('codex_app_server', [
    model('gpt-5.4', 'codex_app_server', codexSchema),
    model('gpt-5.3-codex', 'codex_app_server', codexSchema),
  ]),
  claude_agent_sdk: provider('claude_agent_sdk', [model('claude-sonnet', 'claude_agent_sdk', {
    type: 'object', properties: { thinking_enabled: { type: 'boolean' } },
  })]),
}

const resolved = (changes: Partial<ResolvedTeamRunLaunchConfig> = {}): ResolvedTeamRunLaunchConfig => ({
  runtimeKind: 'autobyteus',
  llmModelIdentifier: 'gpt-5.4',
  llmConfig: { thinking_level: 5 },
  autoExecuteTools: false,
  skillAccessMode: 'PRELOADED_ONLY',
  workspaceId: null,
  workspaceMetadata: null,
  workspaceRootPath: null,
  ...changes,
})
const editableNode = (input: {
  override?: AgentConfigOverride
  baseline?: Partial<ResolvedTeamRunLaunchConfig>
  effective?: Partial<ResolvedTeamRunLaunchConfig>
} = {}): EditableTeamFormAgentNode => {
  const baseline = resolved(input.baseline)
  return {
    mode: 'editable',
    kind: 'agent',
    address: '/reviewer',
    displayName: 'Reviewer',
    isCoordinator: false,
    isCustomized: Boolean(input.override && Object.keys(input.override).length),
    override: input.override,
    baselineConfig: baseline,
    effectiveConfig: resolved({ ...baseline, ...input.effective }),
    runtimeCatalogState: { status: 'idle', error: null },
  }
}
const storedNode = (changes: Partial<ResolvedTeamRunLaunchConfig> = {}): ExistingTeamFormAgentNode => ({
  mode: 'existing',
  kind: 'agent',
  address: '/reviewer',
  displayName: 'Reviewer',
  isCoordinator: false,
  isCustomized: true,
  directlyEdited: false,
  effectiveConfig: resolved(changes),
  storedWorkspace: {
    workspaceId: null,
    displayName: '/history/reviewer',
    rootPath: '/history/reviewer',
    availability: 'historical-only',
  },
})
const mountItem = (node: EditableTeamFormAgentNode | ExistingTeamFormAgentNode, disabled = false) =>
  mount(MemberOverrideItem, { props: { node, memberBreadcrumb: 'reviewer', disabled } })

const ready = async () => {
  await nextTick()
  await flushPromises()
  await nextTick()
}

describe('MemberOverrideItem', () => {
  let llmStore: any
  let runtimeAvailabilityStore: any

  beforeEach(() => {
    setActivePinia(createPinia())
    llmStore = {
      providersWithModels: [],
      providerSnapshots: vi.fn(() => []),
      providersWithModelsForSelection: vi.fn((runtimeKind: string) => runtimeProviders[runtimeKind] ?? []),
      fetchProvidersWithModels: vi.fn(async (runtimeKind: string) => {
        const rows = runtimeProviders[runtimeKind] ?? []
        llmStore.providersWithModels = rows
        return rows
      }),
      ensureMissingDynamicProviders: vi.fn().mockResolvedValue(undefined),
    }
    runtimeAvailabilityStore = {
      availabilities: ['autobyteus', 'codex_app_server', 'claude_agent_sdk']
        .map((runtimeKind) => ({ runtimeKind, enabled: true, reason: null })),
      fetchRuntimeAvailabilities: vi.fn().mockResolvedValue([]),
      availabilityByKind: vi.fn((runtimeKind: string) =>
        runtimeAvailabilityStore.availabilities.find((row: any) => row.runtimeKind === runtimeKind) ?? null),
      isRuntimeEnabled: vi.fn(() => true),
      runtimeReason: vi.fn(() => null),
    }
    ;(useLLMProviderConfigStore as any).mockReturnValue(llmStore)
    ;(useRuntimeAvailabilityStore as any).mockReturnValue(runtimeAvailabilityStore)
  })

  it('renders concise editable member copy and inherited defaults', async () => {
    const wrapper = mountItem(editableNode())
    await ready()
    expect(wrapper.text()).toContain('Runtime')
    expect(wrapper.text()).toContain('LLM Model')
    expect(wrapper.text()).toContain('Auto approve')
    expect(wrapper.text()).toContain('Global default')
    expect(wrapper.text()).not.toContain('Runtime Override')
    expect(wrapper.text()).not.toContain('Auto-execute')
  })

  it('warns when a runtime override breaks inherited model availability and resolves through an explicit model', async () => {
    const override = { runtimeKind: 'claude_agent_sdk' }
    const wrapper = mountItem(editableNode({
      override,
      effective: { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: '' },
    }))
    await ready()
    expect(wrapper.get('[data-testid="member-override-warning"]').text())
      .toContain('Inherited model gpt-5.4 is unavailable for Claude Agent SDK')

    wrapper.findComponent({ name: 'SearchableGroupedSelect' }).vm.$emit('update:modelValue', 'claude-sonnet')
    await nextTick()
    expect(wrapper.emitted('update:override')?.at(-1)).toEqual([
      '/reviewer', { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'claude-sonnet' },
    ])
  })

  it('clears stale explicit model configuration when the explicit model changes', async () => {
    const wrapper = mountItem(editableNode({
      baseline: { runtimeKind: 'codex_app_server', llmConfig: { reasoning_effort: 'high' } },
      override: { llmModelIdentifier: 'gpt-5.4', llmConfig: { reasoning_effort: 'medium' } },
      effective: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5.4', llmConfig: { reasoning_effort: 'medium' } },
    }))
    await ready()
    wrapper.findComponent({ name: 'SearchableGroupedSelect' }).vm.$emit('update:modelValue', 'gpt-5.3-codex')
    await nextTick()
    expect(wrapper.emitted('update:override')?.at(-1)).toEqual([
      '/reviewer', { llmModelIdentifier: 'gpt-5.3-codex' },
    ])
  })

  it('drops an incompatible explicit model and member-only config when runtime changes', async () => {
    const wrapper = mountItem(editableNode({
      override: {
        runtimeKind: 'autobyteus', llmModelIdentifier: 'gpt-5.4', llmConfig: { thinking_level: 3 },
      },
    }))
    await ready()
    await wrapper.get('#override-runtime--reviewer').setValue('claude_agent_sdk')
    await ready()
    expect(wrapper.emitted('update:override')?.at(-1)).toEqual([
      '/reviewer', { runtimeKind: 'claude_agent_sdk' },
    ])
  })

  it('returns to a null override when explicit runtime/model/config all return to inherited values', async () => {
    const wrapper = mountItem(editableNode({
      override: {
        runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5.3-codex',
        llmConfig: { reasoning_effort: 'medium' },
      },
      effective: {
        runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5.3-codex',
        llmConfig: { reasoning_effort: 'medium' },
      },
    }))
    await ready()
    await wrapper.get('#override-runtime--reviewer').setValue('')
    await ready()
    expect(wrapper.emitted('update:override')?.at(-1)).toEqual(['/reviewer', null])
  })

  it('keeps inherited advanced fields compact and opens them for explicit compatible selection', async () => {
    const wrapper = mountItem(editableNode({
      baseline: { runtimeKind: 'codex_app_server', llmConfig: null },
      effective: { runtimeKind: 'codex_app_server', llmConfig: null },
    }))
    await ready()
    const toggle = wrapper.get('[data-testid="advanced-params-toggle"]')
    const container = wrapper.get('[data-testid="advanced-params-container"]')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(container.attributes('style')).toContain('display: none')
    expect((wrapper.get('select#config--reviewer-reasoning_effort').element as HTMLSelectElement).value).toBe('medium')

    wrapper.findComponent({ name: 'SearchableGroupedSelect' }).vm.$emit('update:modelValue', 'gpt-5.3-codex')
    await nextTick()
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.emitted('update:override')?.at(-1)).toEqual([
      '/reviewer', { llmModelIdentifier: 'gpt-5.3-codex' },
    ])
  })

  it('renders exact existing-run partial-schema history once while disabled', async () => {
    const exactConfig = Object.freeze({
      temperature: 0.2,
      reasoning_effort: 'ultra',
      service_tier: 'fast',
    })
    const node = storedNode({
      runtimeKind: 'codex_app_server',
      llmModelIdentifier: 'gpt-5.4',
      llmConfig: exactConfig,
      autoExecuteTools: true,
      workspaceRootPath: '/history/reviewer',
    })
    const before = JSON.stringify(node)
    const wrapper = mountItem(node, true)
    await ready()

    expect((wrapper.get('#existing--reviewer-runtime-kind').element as HTMLSelectElement).value).toBe('codex_app_server')
    expect((wrapper.get('input#existing--reviewer-temperature').element as HTMLInputElement).value).toBe('0.2')
    expect(wrapper.findAll('[data-historical-key="reasoning_effort"]')).toHaveLength(1)
    expect(wrapper.findAll('[data-historical-key="service_tier"]')).toHaveLength(1)
    const residuals = wrapper.findAll('[data-test="historical-model-config-residual"]')
    expect(residuals.map((row) => row.attributes('data-historical-key')))
      .toEqual(['reasoning_effort', 'service_tier'])
    expect(wrapper.get('[data-historical-key="reasoning_effort"]').text()).toContain('ultra')
    expect(wrapper.get('[data-historical-key="service_tier"]').text()).toContain('fast')
    expect(wrapper.text()).not.toContain('Default')
    expect(wrapper.text()).toContain('Overridden')
    expect(JSON.stringify(node)).toBe(before)
    expect(wrapper.emitted('update:override')).toBeUndefined()
  })

  it('uses the same residual algorithm when the whole existing-run model schema is absent', async () => {
    const exactConfig = Object.freeze({
      reasoning_effort: 'ultra',
      service_tier: 'fast',
    })
    const node = storedNode({
      runtimeKind: 'removed-runtime',
      llmModelIdentifier: 'removed-agent-model',
      llmConfig: exactConfig,
      workspaceRootPath: '/history/reviewer',
    })
    const before = JSON.stringify(node)
    const wrapper = mountItem(node, true)
    await ready()
    expect((wrapper.get('#existing--reviewer-runtime-kind').element as HTMLSelectElement).value).toBe('removed-runtime')
    expect(wrapper.findComponent({ name: 'SearchableGroupedSelect' }).text()).toContain('removed-agent-model')
    expect((wrapper.get('input[type="text"]').element as HTMLInputElement).value).toBe('/history/reviewer')
    expect(wrapper.findAll('[data-historical-key="reasoning_effort"]')).toHaveLength(1)
    expect(wrapper.findAll('[data-historical-key="service_tier"]')).toHaveLength(1)
    expect(wrapper.findAll('[data-test="historical-model-config-residual"]')
      .map((row) => row.attributes('data-historical-key')))
      .toEqual(['reasoning_effort', 'service_tier'])
    expect(wrapper.get('[data-historical-key="reasoning_effort"]').text()).toContain('ultra')
    expect(wrapper.get('[data-historical-key="service_tier"]').text()).toContain('fast')
    expect(JSON.stringify(node)).toBe(before)
    expect(wrapper.emitted('update:override')).toBeUndefined()
  })
})
