import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import TeamScopeConfigEditor from '../TeamScopeConfigEditor.vue'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { useRuntimeAvailabilityStore } from '~/stores/runtimeAvailabilityStore'
import type { StoredTeamScopeFormModel } from '~/types/agent/StoredTeamRunFormModel'

vi.mock('~/stores/llmProviderConfig', () => ({ useLLMProviderConfigStore: vi.fn() }))
vi.mock('~/stores/runtimeAvailabilityStore', () => ({ useRuntimeAvailabilityStore: vi.fn() }))

const exactConfig = Object.freeze({
  temperature: 0.2,
  reasoning_effort: 'ultra',
  ordinary_prompt: 'line one line two',
  multiline_prompt: 'line one\nline two',
  removed_parameter: 'persisted-value',
})
const scope = (address: '/' | '/Research'): StoredTeamScopeFormModel => Object.freeze({
  mode: 'stored',
  address,
  displayName: address === '/' ? 'Historical Root' : 'Research',
  isCustomized: address !== '/',
  effectiveConfig: Object.freeze({
    runtimeKind: 'codex_app_server',
    llmModelIdentifier: 'gpt-5.4',
    llmConfig: exactConfig,
    autoExecuteTools: false,
    skillAccessMode: 'PRELOADED_ONLY',
    workspaceId: null,
    workspaceMetadata: null,
    workspaceRootPath: `/history${address}`,
  }),
  storedWorkspace: Object.freeze({
    workspaceId: null,
    displayName: `/history${address}`,
    rootPath: `/history${address}`,
    availability: 'historical-only',
  }),
})

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

describe('stored Team historical model configuration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const providers = [{
      provider: {
        id: 'OPENAI', name: 'OpenAI', providerType: 'OPENAI', isCustom: false,
        baseUrl: null, apiKeyConfigured: true, status: 'NOT_APPLICABLE', statusMessage: null,
      },
      models: [{
        modelIdentifier: 'gpt-5.4', name: 'GPT-5.4', value: 'gpt-5.4', canonicalName: 'gpt-5.4',
        providerId: 'OPENAI', providerName: 'OpenAI', providerType: 'OPENAI', runtime: 'codex_app_server',
        configSchema: {
          type: 'object',
          properties: {
            temperature: { type: 'number', title: 'Temperature' },
            reasoning_effort: {
              type: 'string', title: 'Reasoning Effort',
              enum: ['low', 'medium', 'high', 'xhigh'], default: 'medium',
            },
            ordinary_prompt: { type: 'string', title: 'Ordinary Prompt' },
            multiline_prompt: { type: 'string', title: 'Multiline Prompt' },
          },
        },
      }],
    }]
    ;(useLLMProviderConfigStore as any).mockReturnValue({
      providersWithModels: providers,
      providersWithModelsForSelection: vi.fn().mockReturnValue(providers),
      fetchProvidersWithModels: vi.fn().mockResolvedValue(providers),
      ensureMissingDynamicProviders: vi.fn().mockResolvedValue(undefined),
    })
    ;(useRuntimeAvailabilityStore as any).mockReturnValue({
      availabilities: [{ runtimeKind: 'codex_app_server', enabled: true, reason: null }],
      fetchRuntimeAvailabilities: vi.fn().mockResolvedValue([]),
      availabilityByKind: vi.fn().mockReturnValue({ runtimeKind: 'codex_app_server', enabled: true, reason: null }),
      isRuntimeEnabled: vi.fn().mockReturnValue(true),
      runtimeReason: vi.fn().mockReturnValue(null),
    })
  })

  it.each([
    { label: 'root', address: '/' as const, isRoot: true },
    { label: 'nested Team', address: '/Research' as const, isRoot: false },
  ])('renders exact representable and residual fields for the stored $label without mutation', async ({ address, isRoot }) => {
    const model = scope(address)
    const before = JSON.stringify(model)
    const wrapper = mount(TeamScopeConfigEditor, { props: { scope: model, isRoot, disabled: true } })
    await flushPromises()
    await wrapper.vm.$nextTick()
    if (!isRoot) await wrapper.get('button[aria-controls="team-scope-Research-panel"]').trigger('click')

    const temperature = wrapper.get(`input#team-scope-${isRoot ? 'root' : 'Research'}-temperature`)
    expect((temperature.element as HTMLInputElement).value).toBe('0.2')
    expect(temperature.attributes('disabled')).toBeDefined()
    const ordinaryPrompt = wrapper.get(`input#team-scope-${isRoot ? 'root' : 'Research'}-ordinary_prompt`)
    expect((ordinaryPrompt.element as HTMLInputElement).value).toBe('line one line two')
    expect(ordinaryPrompt.attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('[data-historical-key="reasoning_effort"]')).toHaveLength(1)
    expect(wrapper.findAll('[data-historical-key="multiline_prompt"]')).toHaveLength(1)
    expect(wrapper.findAll('[data-historical-key="removed_parameter"]')).toHaveLength(1)
    expect(wrapper.get('[data-historical-key="reasoning_effort"]').text()).toContain('ultra')
    const multilinePrompt = wrapper.get('[data-historical-key="multiline_prompt"] dd')
    expect(multilinePrompt.element.textContent).toBe('line one\nline two')
    expect(multilinePrompt.classes()).toContain('whitespace-pre-wrap')
    expect(wrapper.get('[data-historical-key="removed_parameter"]').text()).toContain('persisted-value')
    expect(wrapper.find(`select#team-scope-${isRoot ? 'root' : 'Research'}-reasoning_effort`).exists()).toBe(false)
    expect(wrapper.find(`input#team-scope-${isRoot ? 'root' : 'Research'}-multiline_prompt`).exists()).toBe(false)
    expect(wrapper.find('[data-test="reset-team-scope"]').exists()).toBe(false)
    expect(wrapper.emitted('update-root')).toBeUndefined()
    expect(wrapper.emitted('update-override')).toBeUndefined()
    expect(JSON.stringify(model)).toBe(before)
  })
})
