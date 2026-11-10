import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import RuntimeModelConfigFields from '../RuntimeModelConfigFields.vue'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { useRuntimeAvailabilityStore } from '~/stores/runtimeAvailabilityStore'
import { getApolloClient } from '~/utils/apolloClient'

vi.mock('~/stores/llmProviderConfig', () => ({ useLLMProviderConfigStore: vi.fn() }))
vi.mock('~/stores/runtimeAvailabilityStore', () => ({ useRuntimeAvailabilityStore: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn() }))

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

describe('RuntimeModelConfigFields (a new launch)', () => {
  let providers: any[]
  beforeEach(() => {
    setActivePinia(createPinia())
    providers = []
    ;(getApolloClient as any).mockReturnValue({ query: vi.fn(async ({ variables }: any) => ({ data: {
      runtimeCurrentModelDescriptors: variables.identifiers.map((identifier: string) => ({ identifier, model: {
        modelIdentifier: identifier, name: 'Opus (1M context)', canonicalName: 'claude-opus-5-5[1m]',
        providerName: 'Anthropic', description: null, configSchema: null,
      } })),
    } })) })
    ;(useLLMProviderConfigStore as any).mockReturnValue({
      fetchProvidersWithModels: vi.fn().mockResolvedValue([]),
      refreshCatalog: vi.fn().mockResolvedValue([]),
      refreshModelList: vi.fn(),
      ensureMissingDynamicProviders: vi.fn().mockResolvedValue(undefined),
      providerSnapshots: vi.fn().mockReturnValue([]),
          catalogSnapshot: (runtimeKind: string) => ({ runtimeKind, state: 'ready', errorMessage: null }),
      providersWithModelsForSelection: vi.fn(() => providers),
    })
    ;(useRuntimeAvailabilityStore as any).mockReturnValue({
      availabilities: [],
      fetchRuntimeAvailability: vi.fn().mockResolvedValue(null), isRuntimePending: () => false, fetchRuntimeAvailabilities: vi.fn().mockResolvedValue([]),
      availabilityByKind: vi.fn((kind: string) => kind === 'removed-runtime' ? null : { enabled: true }),
      isRuntimeEnabled: vi.fn((runtimeKind: string) => runtimeKind !== 'removed-runtime'),
      runtimeReason: vi.fn().mockReturnValue(null),
    })
  })

  const claudeProviders = () => [{
    provider: { id: 'ANTHROPIC', name: 'Anthropic', providerType: 'ANTHROPIC', isCustom: false },
    models: [{
      modelIdentifier: 'opus', name: 'Opus', value: 'opus', canonicalName: 'claude-opus-5-5',
      providerId: 'ANTHROPIC', providerName: 'Anthropic', providerType: 'ANTHROPIC', runtime: 'api', configSchema: null,
    }],
  }]

  it('re-reads the runtime list when the model picker opens, and on "Refresh models" (REQ-010, REQ-011, AC-010)', async () => {
    providers = claudeProviders()
    const wrapper = mount(RuntimeModelConfigFields, {
      props: { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: '', llmConfig: null },
      attachTo: document.body,
      global: { mocks: { $t: (key: string) => key } },
    })
    await flushPromises()
    const store = (useLLMProviderConfigStore as any)()
    store.refreshCatalog.mockClear()

    await wrapper.findComponent({ name: 'SearchableGroupedSelect' }).get('button').trigger('click')
    await wrapper.vm.$nextTick()
    expect(store.refreshCatalog).toHaveBeenCalledExactlyOnceWith('claude_agent_sdk')
    expect(store.refreshModelList).not.toHaveBeenCalled()

    document.body.querySelector<HTMLButtonElement>('[data-test="model-list-refresh-button"]')!.click()
    expect(store.refreshModelList).toHaveBeenCalledExactlyOnceWith('claude_agent_sdk')
    wrapper.unmount()
    document.body.innerHTML = ''
  })

  it('keeps an editable numeric draft rendered while reporting current-schema validation errors', async () => {
    providers = [{
      provider: { id: 'OPENAI', name: 'OpenAI', providerType: 'OPENAI', isCustom: false },
      models: [{
        modelIdentifier: 'gpt-4', name: 'GPT-4', value: 'gpt-4', canonicalName: 'gpt-4',
        providerId: 'OPENAI', providerName: 'OpenAI', providerType: 'OPENAI', runtime: 'api',
        configSchema: {
          type: 'object',
          properties: { budget: { type: 'integer', minimum: 1, maximum: 10 } },
        },
      }],
    }]
    const wrapper = mount(RuntimeModelConfigFields, {
      props: {
        runtimeKind: 'autobyteus',
        llmModelIdentifier: 'gpt-4',
        llmConfig: { budget: 0 },
      },
    })
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('input[type="number"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Value must be at least 1.')
  })

  it('reports an unavailable selected launch model after its runtime catalog is ready', async () => {
    const wrapper = mount(RuntimeModelConfigFields, {
      props: {
        runtimeKind: 'autobyteus',
        llmModelIdentifier: 'removed-launch-model',
        llmConfig: null,
      },
    })
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-test="selected-model-unavailable"]').text())
      .toContain('The selected model is unavailable for the current runtime.')
    expect(wrapper.emitted('update:llmModelIdentifier')).toBeUndefined()
    wrapper.unmount()
  })

  it('accepts and emits exact Codex enum members', async () => {
    providers = [{
      provider: { id: 'OPENAI', name: 'OpenAI', providerType: 'OPENAI', isCustom: false },
      models: [{
        modelIdentifier: 'gpt-5.6-codex',
        name: 'GPT-5.6 Codex',
        value: 'gpt-5.6-codex',
        canonicalName: 'gpt-5.6-codex',
        providerId: 'OPENAI',
        providerName: 'OpenAI',
        providerType: 'OPENAI',
        runtime: 'api',
        configSchema: {
          parameters: [{
            name: 'reasoning_effort',
            type: 'enum',
            default_value: 'medium',
            enum_values: ['low', 'medium', 'high', 'xhigh'],
          }],
        },
      }],
    }]
    const wrapper = mount(RuntimeModelConfigFields, {
      props: {
        runtimeKind: 'codex_app_server',
        llmModelIdentifier: 'gpt-5.6-codex',
        llmConfig: { reasoning_effort: 'medium' },
        idPrefix: 'launch-codex',
      },
    })
    await flushPromises()
    await wrapper.vm.$nextTick()
    await wrapper.findAll('button').find((button) => button.text().includes('Advanced'))?.trigger('click')

    expect(wrapper.text()).not.toContain('Enter a value of type enum.')
    await wrapper.get('#launch-codex-reasoning_effort').setValue('low')

    expect(wrapper.emitted('update:llmConfig')?.at(-1)).toEqual([
      { reasoning_effort: 'low' },
    ])
  })

  it('choosing a model emits it with cleared settings; choosing another runtime clears the model too', async () => {
    providers = claudeProviders()
    ;(useRuntimeAvailabilityStore as any).mockReturnValue({
      availabilities: [{ runtimeKind: 'claude_agent_sdk', enabled: true, reason: null }, { runtimeKind: 'codex_app_server', enabled: true, reason: null }],
      fetchRuntimeAvailability: vi.fn().mockResolvedValue(null), isRuntimePending: () => false, fetchRuntimeAvailabilities: vi.fn().mockResolvedValue([]),
      isRuntimeEnabled: vi.fn(() => true), runtimeReason: vi.fn().mockReturnValue(null),
    })
    const wrapper = mount(RuntimeModelConfigFields, {
      props: { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: '', llmConfig: { stale: true } },
    })
    await flushPromises()

    wrapper.findComponent({ name: 'SearchableGroupedSelect' }).vm.$emit('update:modelValue', 'opus')
    expect(wrapper.emitted('update:llmModelIdentifier')?.at(-1)).toEqual(['opus'])
    expect(wrapper.emitted('update:llmConfig')?.at(-1)).toEqual([null])

    await wrapper.get('select').setValue('codex_app_server')
    expect(wrapper.emitted('update:runtimeKind')?.at(-1)).toEqual(['codex_app_server'])
    expect(wrapper.emitted('update:llmModelIdentifier')?.at(-1)).toEqual([''])
    expect(wrapper.emitted('update:llmConfig')?.at(-1)).toEqual([null])
    wrapper.unmount()
  })

  it('shows an unavailable runtime and keeps the chosen runtime and model unchanged', async () => {
    const wrapper = mount(RuntimeModelConfigFields, { props: { runtimeKind: 'removed-runtime', llmModelIdentifier: 'kept-model' } })
    await flushPromises()
    expect(wrapper.text()).toContain('Runtime is not available in current capabilities.')
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('removed-runtime')
    expect(wrapper.emitted('update:runtimeKind')).toBeUndefined()
    expect(wrapper.emitted('update:llmModelIdentifier')).toBeUndefined()
    wrapper.unmount()
  })

  it('keeps a nonempty unavailable model visible instead of treating it as missing', async () => {
    const wrapper = mount(RuntimeModelConfigFields, { props: { runtimeKind: 'autobyteus', llmModelIdentifier: 'retired' } })
    await flushPromises()
    expect(wrapper.find('[data-test="selected-model-unavailable"]').exists()).toBe(true)
    expect(wrapper.emitted('update:llmModelIdentifier')).toBeUndefined()
    wrapper.unmount()
  })

  describe('Claude Agent SDK exact current values', () => {
    beforeEach(() => {
      providers = [{ provider: { id: 'ANTHROPIC', name: 'Anthropic', providerType: 'ANTHROPIC', isCustom: false },
        models: ['opus[1m]', 'sonnet'].map((id) => ({ modelIdentifier: id, name: id, value: id,
          canonicalName: id === 'opus[1m]' ? 'claude-opus-5-5[1m]' : 'claude-sonnet-5',
          providerId: 'ANTHROPIC', providerName: 'Anthropic', providerType: 'ANTHROPIC', runtime: 'api',
          configSchema: null, selectionPresentation: { recommended: id === 'opus[1m]' } })) }]
    })

    it('shows a seeded exact default as current-only while offering only normalized rows', async () => {
      const wrapper = mount(RuntimeModelConfigFields, { props: {
        runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'default', seedModelIdentifier: 'default', llmConfig: null,
      } })
      await flushPromises()
      await wrapper.vm.$nextTick()
      const picker = wrapper.findComponent({ name: 'SearchableGroupedSelect' })
      expect(picker.props('options').flatMap((group: any) => group.items.map((item: any) => item.id)))
        .toEqual(['opus[1m]', 'sonnet'])
      expect(picker.props('selectedDisplay')).toContain('Anthropic')
      expect(wrapper.find('[data-test="selected-model-unavailable"]').exists()).toBe(false)
      expect(wrapper.emitted('update:llmModelIdentifier')).toBeUndefined()
      wrapper.unmount()
    })
  })
})
