import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { matchesModelQuery, toChatModelOption, useChatModelCatalog } from '../useChatModelCatalog'
import ChatModelList from '~/components/chat/ChatModelList.vue'
import type { ModelInfo } from '~/stores/llmProviderConfigSupport'

// The live catalog records from UVF-001 (Claude Agent SDK and Codex), trimmed to the label fields.
const claude = (modelIdentifier: string, name: string, canonicalName: string, recommended = false) => ({
  modelIdentifier, name, canonicalName, description: null, providerType: 'ANTHROPIC',
  selectionPresentation: { recommended },
}) as unknown as ModelInfo
const catalog = vi.hoisted(() => ({ providers: {} as Record<string, unknown[]> }))
vi.mock('~/stores/llmProviderConfig', () => ({
  useLLMProviderConfigStore: () => ({
    providersWithModelsForSelection: (runtimeKind: string) => catalog.providers[runtimeKind] ?? [],
    catalogSnapshot: () => ({ state: 'ready' }),
    fetchProvidersWithModels: vi.fn(async () => undefined),
    modelConfigSchemaByIdentifier: () => null,
  }),
}))
vi.mock('~/stores/runtimeAvailabilityStore', () => ({
  useRuntimeAvailabilityStore: () => ({ availabilities: [], fetchRuntimeAvailabilities: vi.fn(async () => undefined) }),
}))

const withCatalog = () => {
  let api!: ReturnType<typeof useChatModelCatalog>
  mount(defineComponent({ setup() { api = useChatModelCatalog(); return () => h('div') } }))
  return api
}

describe('useChatModelCatalog labels (D-16)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    catalog.providers = {
      claude_agent_sdk: [{ provider: { name: 'Anthropic' }, models: [
        claude('sonnet', 'Sonnet 5', 'claude-sonnet-5'),
        claude('haiku', 'Haiku 4.5', 'claude-haiku-4-5-20251001'),
        claude('opus', 'Opus 5.5', 'claude-opus-5-5', true),
      ] }],
      codex_app_server: [{ provider: { name: 'OpenAI' }, models: [
        { modelIdentifier: 'gpt-6-astra', name: 'GPT-6-Astra (default reasoning: medium)', canonicalName: 'gpt-6-astra', description: null, providerType: 'OPENAI' },
      ] }],
      autobyteus: [{ provider: { name: 'OpenAI' }, models: [
        { modelIdentifier: 'gpt-5.5-rpa', name: 'GPT 5.5', canonicalName: 'gpt-5.5', description: null, providerType: 'OPENAI' },
      ] }],
    }
  })

  it('V-L1: Claude Agent SDK rows use the canonical name, the display name as secondary, Recommended first', () => {
    const models = withCatalog().modelGroups('claude_agent_sdk')[0]!.models
    expect(models.map((model) => model.llmModelIdentifier)).toEqual(['opus', 'haiku', 'sonnet'])
    expect(models[0]).toMatchObject({ label: 'claude-opus-5-5', secondary: 'Opus 5.5', recommended: true })
    expect(withCatalog().modelLabel('claude_agent_sdk', 'opus')).toBe('claude-opus-5-5')
  })

  it('V-L3: Codex rows show display names; V-L4: AutoByteus rows show identifiers', () => {
    const api = withCatalog()
    expect(api.modelGroups('codex_app_server')[0]!.models[0]!.label).toBe('GPT-6-Astra (default reasoning: medium)')
    expect(api.modelGroups('autobyteus')[0]!.models[0]!.label).toBe('gpt-5.5-rpa')
  })

  it('search matches the display name, canonical name and identifier with one predicate', () => {
    const api = withCatalog()
    expect(api.search('Opus 5.5', ['claude_agent_sdk']).map((model) => model.llmModelIdentifier)).toEqual(['opus'])
    expect(api.search('claude-haiku', ['claude_agent_sdk']).map((model) => model.llmModelIdentifier)).toEqual(['haiku'])
    expect(api.search('sonnet claude', ['claude_agent_sdk']).map((model) => model.llmModelIdentifier)).toEqual(['sonnet'])
    const options = api.modelGroups('claude_agent_sdk')[0]!.models
    expect(api.filterOptions('opus 5.5', options).map((model) => model.llmModelIdentifier)).toEqual(['opus'])
    expect(api.filterOptions('   ', options)).toEqual([])
    expect(matchesModelQuery(options[0]!, ['anthropic', 'claude agent sdk'])).toBe(true)
  })

  it('falls back to the existing-run choice, then to the bare identifier', () => {
    const fromChoice = toChatModelOption({ runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'claude-opus-4-6', providerName: 'Anthropic',
      runChoice: { llmModelIdentifier: 'claude-opus-4-6', providerName: 'Anthropic', displayName: 'Opus 4.6', canonicalName: 'claude-opus-4-6', description: null, configSchema: null, recommended: false } })
    expect(fromChoice).toMatchObject({ label: 'claude-opus-4-6', secondary: 'Opus 4.6', recommended: false })
    const bare = toChatModelOption({ runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-legacy', providerName: 'OpenAI' })
    expect(bare).toMatchObject({ label: 'gpt-legacy', secondary: null, recommended: false })
  })

  it('renders label + Recommended on one line, the secondary line below, and the full text as title', () => {
    const groups = withCatalog().modelGroups('claude_agent_sdk')
    const wrapper = mount(ChatModelList, {
      props: { runtimeKind: 'claude_agent_sdk', state: 'ready', groups, currentModelIdentifier: 'opus' },
      global: { mocks: { $t: (key: string) => (key === 'chat.model.recommended' ? 'Recommended' : key) } },
    })
    const row = wrapper.get('[data-test="chat-model-option-opus"]')
    expect(row.get('[data-test="chat-model-option-label"]').text()).toBe('claude-opus-5-5')
    expect(row.get('[data-test="chat-model-option-recommended"]').text()).toBe('Recommended')
    expect(row.get('[data-test="chat-model-option-secondary"]').text()).toBe('Opus 5.5')
    expect(row.attributes('title')).toBe('claude-opus-5-5 — Opus 5.5')
    expect(wrapper.find('[data-test="chat-model-option-haiku"] [data-test="chat-model-option-recommended"]').exists()).toBe(false)
  })
})
