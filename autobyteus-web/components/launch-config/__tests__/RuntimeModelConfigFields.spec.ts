import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import RuntimeModelConfigFields from '../RuntimeModelConfigFields.vue'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { useRuntimeAvailabilityStore } from '~/stores/runtimeAvailabilityStore'

vi.mock('~/stores/llmProviderConfig', () => ({ useLLMProviderConfigStore: vi.fn() }))
vi.mock('~/stores/runtimeAvailabilityStore', () => ({ useRuntimeAvailabilityStore: vi.fn() }))

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

describe('RuntimeModelConfigFields stored historical values', () => {
  let providers: any[]
  beforeEach(() => {
    setActivePinia(createPinia())
    providers = []
    ;(useLLMProviderConfigStore as any).mockReturnValue({
      fetchProvidersWithModels: vi.fn().mockResolvedValue([]),
      refreshLocalCatalog: vi.fn().mockResolvedValue([]),
      ensureMissingDynamicProviders: vi.fn().mockResolvedValue(undefined),
      providerSnapshots: vi.fn().mockReturnValue([]),
      providersWithModelsForSelection: vi.fn(() => providers),
    })
    ;(useRuntimeAvailabilityStore as any).mockReturnValue({
      availabilities: [],
      fetchRuntimeAvailabilities: vi.fn().mockResolvedValue([]),
      availabilityByKind: vi.fn((kind: string) => kind === 'removed-runtime' ? null : { enabled: true }),
      isRuntimeEnabled: vi.fn((runtimeKind: string) => runtimeKind !== 'removed-runtime'),
      runtimeReason: vi.fn().mockReturnValue(null),
    })
  })

  it('keeps removed runtime/model/config values visible inside disabled shared controls', async () => {
    const wrapper = mount(RuntimeModelConfigFields, {
      props: {
        runtimeKind: 'removed-runtime',
        llmModelIdentifier: 'removed-model',
        llmConfig: { temperature: 0.2, nested: { enabled: true } },
        disabled: true,
        readOnly: true,
        runtimeSelectionLocked: true,
        historicalValueUnavailableMessage: 'Saved value is no longer available.',
        historicalModelConfigTitle: 'Saved model configuration',
        historicalModelConfig: true,
      },
    })
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('removed-runtime')
    expect(wrapper.text()).toContain('Runtime is not available in current capabilities.')
    expect(wrapper.findComponent({ name: 'SearchableGroupedSelect' }).text()).toContain('removed-model')
    expect(wrapper.get('[data-test="historical-model-unavailable"]').text())
      .toBe('Saved value is no longer available.')
    const fallback = wrapper.get('[data-test="historical-model-config-fallback"]')
    expect(fallback.text()).toContain('Saved model configuration')
    expect(fallback.text()).toContain('temperature')
    expect(fallback.text()).toContain('0.2')
    expect(fallback.text()).toContain('{"enabled":true}')
    expect(wrapper.findAll('[data-test="historical-model-config-residual"]')
      .map((row) => row.attributes('data-historical-key'))).toEqual(['nested', 'temperature'])
    expect(wrapper.emitted('update:runtimeKind')).toBeUndefined()
    expect(wrapper.emitted('update:llmModelIdentifier')).toBeUndefined()
    expect(wrapper.emitted('update:llmConfig')).toBeUndefined()
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
        runtimeSelectionLocked: true,
        modelSelectionLocked: true,
        historicalModelConfig: true,
      },
    })
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('input[type="number"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Value must be at least 1.')
    expect(wrapper.emitted('schema-state')?.at(-1)).toEqual([{
      status: 'invalid',
      message: 'Value must be at least 1.',
    }])
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
      .toBe('The selected model is unavailable for the current runtime.')
    expect(wrapper.emitted('schema-state')?.at(-1)).toEqual([{
      status: 'unavailable',
      message: 'The selected model is unavailable for the current runtime.',
    }])
  })

  it.each([
    { consumer: 'launch', historicalModelConfig: false },
    { consumer: 'existing-run Settings', historicalModelConfig: true },
  ])('accepts and emits exact Codex enum members for the $consumer consumer', async ({ historicalModelConfig }) => {
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
        runtimeSelectionLocked: historicalModelConfig,
        modelSelectionLocked: historicalModelConfig,
        historicalModelConfig,
        advancedInitiallyExpanded: true,
        idPrefix: historicalModelConfig ? 'existing-codex' : 'launch-codex',
      },
    })
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('schema-state')?.at(-1)).toEqual([{
      status: 'ready',
      message: null,
    }])
    expect(wrapper.text()).not.toContain('Enter a value of type enum.')

    const fieldId = historicalModelConfig
      ? '#existing-codex-reasoning_effort'
      : '#launch-codex-reasoning_effort'
    await wrapper.get(fieldId).setValue('low')

    expect(wrapper.emitted('update:llmConfig')?.at(-1)).toEqual([
      { reasoning_effort: 'low' },
    ])
  })

  it('offers only verified replacements and emits a reset coherent pair for existing Settings', async () => {
    providers = [{
      provider: { id: 'OPENAI', name: 'OpenAI', providerType: 'OPENAI', isCustom: false },
      models: ['saved', 'larger', 'smaller'].map((id) => ({
        modelIdentifier: id, name: id, value: id, canonicalName: id,
        providerId: 'OPENAI', providerName: 'OpenAI', providerType: 'OPENAI', runtime: 'api',
        configSchema: null,
      })),
    }]
    const wrapper = mount(RuntimeModelConfigFields, {
      props: {
        runtimeKind: 'autobyteus', llmModelIdentifier: 'saved', llmConfig: { old: true },
        originalModelIdentifier: 'saved', runtimeSelectionLocked: true,
        modelOptions: { status: 'ready', options: {
          currentModelIdentifier: 'saved', currentContextTokens: 128000,
          replacements: [{ llmModelIdentifier: 'larger', contextTokens: 272000 }], unavailableReason: null,
        } },
      },
    })
    await flushPromises()
    const picker = wrapper.findComponent({ name: 'SearchableGroupedSelect' })
    expect(picker.props('options').flatMap((group: any) => group.items.map((item: any) => item.id))).toEqual(['saved', 'larger'])
    picker.vm.$emit('update:modelValue', 'smaller')
    expect(wrapper.emitted('selection-change')).toBeUndefined()
    picker.vm.$emit('update:modelValue', 'larger')
    expect(wrapper.emitted('selection-change')?.at(-1)).toEqual([{ llmModelIdentifier: 'larger', llmConfig: null }, true])
    await wrapper.setProps({ modelOptions: { status: 'unavailable', options: null } })
    expect(picker.props('options').flatMap((group: any) => group.items.map((item: any) => item.id))).toEqual(['saved'])
    expect(wrapper.get('[data-test="model-capacity-status"]').text()).toContain('Current-model settings can still be edited')
    await wrapper.setProps({ modelSelectionLocked: true, modelOptions: undefined })
    expect(picker.props('disabled')).toBe(true)
    expect(wrapper.find('[data-test="model-capacity-status"]').exists()).toBe(false)
    expect(picker.props('modelValue')).toBe('saved')
    wrapper.unmount()
  })

  it.each(['', '   '])('classifies blank %j as required, but prioritizes an actual runtime failure', async model => {
    const wrapper = mount(RuntimeModelConfigFields, { props: { runtimeKind: 'autobyteus', llmModelIdentifier: model } })
    await flushPromises()
    expect(wrapper.emitted('schema-state')?.at(-1)).toEqual([{ status: 'invalid', reason: 'model_required', message: 'Select a model before launch.' }])
    await wrapper.setProps({ runtimeKind: 'removed-runtime' }); await flushPromises()
    expect(wrapper.emitted('schema-state')?.at(-1)?.[0]).toMatchObject({ status: 'unavailable' })
    expect(wrapper.emitted('update:runtimeKind')).toBeUndefined()
    wrapper.unmount()
  })
  it('keeps a nonempty unavailable model visible instead of treating it as missing', async () => {
    const wrapper = mount(RuntimeModelConfigFields, { props: { runtimeKind: 'autobyteus', llmModelIdentifier: 'retired' } })
    await flushPromises()
    expect(wrapper.emitted('schema-state')?.at(-1)?.[0]).toMatchObject({ status: 'unavailable' })
    expect(wrapper.emitted('update:llmModelIdentifier')).toBeUndefined()
    wrapper.unmount()
  })

  describe('Claude Agent SDK saved alias values', () => {
    const claudeModel = (
      modelIdentifier: string,
      name: string,
      canonicalName: string,
      selectionPresentation: { recommended: boolean; aliasOfModelIdentifier: string | null },
    ) => ({
      modelIdentifier, name, value: modelIdentifier, canonicalName, description: `${name} description`,
      providerId: 'ANTHROPIC', providerName: 'Anthropic', providerType: 'ANTHROPIC', runtime: 'api',
      configSchema: null, selectionPresentation,
    })
    beforeEach(() => {
      providers = [{
        provider: { id: 'ANTHROPIC', name: 'Anthropic', providerType: 'ANTHROPIC', isCustom: false },
        models: [
          claudeModel('default', 'Default (recommended)', 'claude-opus-5-5[1m]', { recommended: false, aliasOfModelIdentifier: 'opus[1m]' }),
          claudeModel('opus[1m]', 'Opus (1M context)', 'claude-opus-5-5[1m]', { recommended: true, aliasOfModelIdentifier: null }),
          claudeModel('sonnet', 'Sonnet', 'claude-sonnet-5', { recommended: false, aliasOfModelIdentifier: null }),
        ],
      }]
    })

    it('shows a saved default as the recommended canonical option without warning or rewrite', async () => {
      const wrapper = mount(RuntimeModelConfigFields, {
        props: { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'default', llmConfig: null },
      })
      await flushPromises()
      await wrapper.vm.$nextTick()

      const picker = wrapper.findComponent({ name: 'SearchableGroupedSelect' })
      expect(picker.text()).toContain('Anthropic / claude-opus-5-5[1m]')
      expect(picker.props('options')[0].items.map((item: any) => [item.id, item.aliasIds ?? []]))
        .toEqual([['opus[1m]', ['default']], ['sonnet', []]])
      expect(wrapper.find('[data-test="selected-model-unavailable"]').exists()).toBe(false)
      expect(wrapper.emitted('schema-state')?.at(-1)).toEqual([{ status: 'ready', message: null }])
      expect(wrapper.emitted('update:llmModelIdentifier')).toBeUndefined()
      wrapper.unmount()
    })

    it('keeps the aliased option for an existing run saved with default and adds no raw saved row', async () => {
      const wrapper = mount(RuntimeModelConfigFields, {
        props: {
          runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'default', llmConfig: null,
          originalModelIdentifier: 'default', runtimeSelectionLocked: true,
          modelOptions: { status: 'ready', options: {
            currentModelIdentifier: 'default', currentContextTokens: 1000000,
            replacements: [], unavailableReason: null,
          } },
        },
      })
      await flushPromises()

      const picker = wrapper.findComponent({ name: 'SearchableGroupedSelect' })
      expect(picker.props('options')).toEqual([expect.objectContaining({
        label: 'Anthropic',
        items: [expect.objectContaining({ id: 'opus[1m]', aliasIds: ['default'] })],
      })])
      expect(picker.text()).toContain('Anthropic / claude-opus-5-5[1m]')
      wrapper.unmount()
    })
  })

})
