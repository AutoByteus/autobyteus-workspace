import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import GeminiSetupForm from '../GeminiSetupForm.vue'

const translations: Record<string, string> = {
  'settings.components.settings.ProviderAPIKeyManager.ai_studio': 'AI Studio',
  'settings.components.settings.ProviderAPIKeyManager.vertex_express': 'Vertex Express',
  'settings.components.settings.ProviderAPIKeyManager.vertex_project': 'Vertex Project',
  'settings.components.settings.ProviderAPIKeyManager.unconfigured': 'Unconfigured',
  'settings.components.settings.ProviderAPIKeyManager.configured': 'Configured',
  'settings.components.settings.ProviderAPIKeyManager.not_configured': 'Not Configured',
  'settings.components.settings.ProviderAPIKeyManager.effective': 'Effective',
  'settings.components.settings.ProviderAPIKeyManager.gemini_effective_mode': 'Effective mode',
  'settings.components.settings.ProviderAPIKeyManager.gemini_independent_options_help': 'Independent options',
  'settings.components.settings.ProviderAPIKeyManager.enter_gemini_api_key': 'Enter Gemini API key...',
  'settings.components.settings.ProviderAPIKeyManager.enter_vertex_api_key': 'Enter Vertex API key...',
  'settings.components.settings.ProviderAPIKeyManager.vertex_project_id': 'Vertex project id',
  'settings.components.settings.ProviderAPIKeyManager.vertex_location_e_g_us_central1': 'Vertex location',
  'settings.components.settings.ProviderAPIKeyManager.saving': 'Saving...',
  'settings.components.settings.ProviderAPIKeyManager.removing': 'Removing...',
  'settings.components.settings.ProviderAPIKeyManager.save_option': 'Save option',
  'settings.components.settings.ProviderAPIKeyManager.remove_option': 'Remove option',
  'settings.components.settings.ProviderAPIKeyManager.toggle_key_visibility': 'Toggle key visibility',
}

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({ t: (key: string) => translations[key] ?? key }),
}))

const missingStatus = {
  backendHealth: 'READY' as const,
  storageState: 'MISSING' as const,
  lifecycle: 'WRITABLE' as const,
  instructionCode: null,
}
const configuredStatus = { ...missingStatus, storageState: 'CONFIGURED' as const }

const setup = (overrides: Record<string, unknown> = {}) => ({
  effectiveMode: 'VERTEX_EXPRESS' as const,
  aiStudioCredentialStatus: configuredStatus,
  vertexExpressCredentialStatus: configuredStatus,
  vertexProjectStatus: 'CONFIGURED' as const,
  vertexProject: 'project-1',
  vertexLocation: 'us-central1',
  ...overrides,
})

const mountComponent = (props: Record<string, unknown> = {}) =>
  mount(GeminiSetupForm, {
    props: {
      geminiSetup: setup(),
      saving: false,
      removing: false,
      disabled: false,
      ...props,
    },
    global: {
      mocks: { $t: (key: string) => translations[key] ?? key },
    },
  })

describe('GeminiSetupForm', () => {
  it('renders all independent options and only the server-selected effective mode', () => {
    const wrapper = mountComponent()

    expect(wrapper.find('[data-testid="gemini-option-AI_STUDIO"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="gemini-option-VERTEX_EXPRESS"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="gemini-option-VERTEX_PROJECT"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="gemini-option-effective-VERTEX_EXPRESS"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="gemini-option-effective-AI_STUDIO"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="gemini-effective-mode"]').text()).toContain('Vertex Express')
  })

  it('emits only the addressed AI Studio save input', async () => {
    const wrapper = mountComponent()

    await wrapper.get('[data-testid="gemini-ai-studio-key"]').setValue('synthetic-gemini-key')
    await wrapper.get('[data-testid="gemini-save-AI_STUDIO"]').trigger('click')

    expect(wrapper.emitted('save')).toEqual([[{
      option: 'AI_STUDIO',
      geminiApiKey: 'synthetic-gemini-key',
    }]])
  })

  it('emits project configuration and an explicit option-only remove', async () => {
    const wrapper = mountComponent()
    await wrapper.get('[data-testid="gemini-vertex-project"]').setValue('project-2')
    await wrapper.get('[data-testid="gemini-vertex-location"]').setValue('europe-west4')

    await wrapper.get('[data-testid="gemini-save-VERTEX_PROJECT"]').trigger('click')
    await wrapper.get('[data-testid="gemini-remove-VERTEX_EXPRESS"]').trigger('click')

    expect(wrapper.emitted('save')).toEqual([[{
      option: 'VERTEX_PROJECT',
      vertexProject: 'project-2',
      vertexLocation: 'europe-west4',
    }]])
    expect(wrapper.emitted('remove')).toEqual([['VERTEX_EXPRESS']])
  })

  it('blocks every conflicting option action while a save or removal is pending', async () => {
    const savingWrapper = mountComponent({ saving: true })
    const removingWrapper = mountComponent({ removing: true })

    expect(savingWrapper.get('[data-testid="gemini-save-AI_STUDIO"]').attributes('disabled')).toBeDefined()
    expect(savingWrapper.get('[data-testid="gemini-remove-VERTEX_EXPRESS"]').attributes('disabled')).toBeDefined()
    expect(removingWrapper.get('[data-testid="gemini-save-VERTEX_PROJECT"]').attributes('disabled')).toBeDefined()
    expect(removingWrapper.get('[data-testid="gemini-remove-AI_STUDIO"]').attributes('disabled')).toBeDefined()
  })

  it('clears write-only key editors after a refreshed setup snapshot', async () => {
    const wrapper = mountComponent()
    const input = wrapper.get('[data-testid="gemini-ai-studio-key"]')
    await input.setValue('synthetic-gemini-key')

    await wrapper.setProps({
      geminiSetup: setup({ effectiveMode: 'VERTEX_PROJECT' }),
    })

    expect((input.element as HTMLInputElement).value).toBe('')
  })
})
