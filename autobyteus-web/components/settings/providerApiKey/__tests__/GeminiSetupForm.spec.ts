import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import GeminiSetupForm from '../GeminiSetupForm.vue'

const translations: Record<string, string> = {
  'settings.components.settings.ProviderAPIKeyManager.ai_studio': 'AI Studio',
  'settings.components.settings.ProviderAPIKeyManager.vertex_express': 'Vertex Express',
  'settings.components.settings.ProviderAPIKeyManager.vertex_project': 'Vertex Project',
  'settings.components.settings.ProviderAPIKeyManager.ai_studio_description': 'Gemini Developer API key',
  'settings.components.settings.ProviderAPIKeyManager.vertex_express_description': 'Vertex AI Express API key',
  'settings.components.settings.ProviderAPIKeyManager.vertex_project_description': 'Google Cloud project and location',
  'settings.components.settings.ProviderAPIKeyManager.configured': 'Configured',
  'settings.components.settings.ProviderAPIKeyManager.not_configured': 'Not Configured',
  'settings.components.settings.ProviderAPIKeyManager.active': 'Active',
  'settings.components.settings.ProviderAPIKeyManager.gemini_active_mode': 'Active mode',
  'settings.components.settings.ProviderAPIKeyManager.not_selected': 'Not selected',
  'settings.components.settings.ProviderAPIKeyManager.enter_gemini_api_key': 'Enter Gemini API key...',
  'settings.components.settings.ProviderAPIKeyManager.enter_vertex_api_key': 'Enter Vertex API key...',
  'settings.components.settings.ProviderAPIKeyManager.vertex_project_id': 'Project ID',
  'settings.components.settings.ProviderAPIKeyManager.vertex_location': 'Location',
  'settings.components.settings.ProviderAPIKeyManager.vertex_location_e_g_us_central1': 'e.g. us-central1',
  'settings.components.settings.ProviderAPIKeyManager.saving': 'Saving...',
  'settings.components.settings.ProviderAPIKeyManager.activating': 'Activating...',
  'settings.components.settings.ProviderAPIKeyManager.save_option': 'Save option',
  'settings.components.settings.ProviderAPIKeyManager.save_and_use_mode': 'Save and use this mode',
  'settings.components.settings.ProviderAPIKeyManager.use_this_mode': 'Use this mode',
  'settings.components.settings.ProviderAPIKeyManager.activate_mode': 'Activate',
  'settings.components.settings.ProviderAPIKeyManager.configure_option': 'Configure',
  'settings.components.settings.ProviderAPIKeyManager.collapse': 'Collapse',
  'settings.components.settings.ProviderAPIKeyManager.toggle_key_visibility': 'Toggle key visibility',
}

const translate = (key: string, params?: Record<string, unknown>) =>
  (translations[key] ?? key).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, token) => String(params?.[token] ?? ''))

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({ t: translate }),
}))

const setup = (overrides: Record<string, unknown> = {}) => ({
  activeMode: 'VERTEX_EXPRESS' as const,
  aiStudioConfigured: true,
  vertexExpressConfigured: true,
  vertexProject: { project: 'project-1', location: 'us-central1' },
  ...overrides,
})

const mountComponent = (props: Record<string, unknown> = {}) =>
  mount(GeminiSetupForm, {
    attachTo: document.body,
    props: {
      geminiSetup: setup(),
      saving: false,
      activating: false,
      disabled: false,
      ...props,
    },
    global: {
      mocks: { $t: translate },
    },
  })

const expand = async (wrapper: ReturnType<typeof mountComponent>, option: string) => {
  await wrapper.get(`[data-testid="gemini-toggle-${option}"]`).trigger('click')
}

describe('GeminiSetupForm', () => {
  it('renders all independent options with exactly one explicit active mode', () => {
    const wrapper = mountComponent()

    expect(wrapper.get('[data-testid="gemini-connection-header"]').text()).toContain('Active mode')
    expect(wrapper.find('[data-testid="gemini-option-AI_STUDIO"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="gemini-option-VERTEX_EXPRESS"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="gemini-option-VERTEX_PROJECT"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="gemini-option-AI_STUDIO"]').attributes('data-active')).toBe('false')
    expect(wrapper.get('[data-testid="gemini-option-VERTEX_EXPRESS"]').attributes('data-active')).toBe('true')
    expect(wrapper.find('[data-testid="gemini-option-active-VERTEX_EXPRESS"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="gemini-option-active-AI_STUDIO"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="gemini-active-mode"]').text()).toContain('Vertex Express')
    expect(wrapper.get('[data-testid="gemini-option-status-AI_STUDIO"]').attributes('title')).toBe('Configured')
    expect(wrapper.get('[data-testid="gemini-activate-AI_STUDIO"]').attributes('aria-label')).toBe('Use this mode: AI Studio')
    expect(wrapper.get('[data-testid="gemini-activate-AI_STUDIO"]').text()).toContain('Activate')
    expect(wrapper.get('[data-testid="gemini-option-active-VERTEX_EXPRESS"]').text()).toContain('Active')
    expect(wrapper.get('[data-testid="gemini-toggle-VERTEX_PROJECT"]').attributes('aria-label')).toBe('Configure: Vertex Project')
    expect(wrapper.get('[data-testid="gemini-option-description-AI_STUDIO"]').text()).toBe('Gemini Developer API key')
    expect(wrapper.get('[data-testid="gemini-option-description-VERTEX_EXPRESS"]').text()).toBe('Vertex AI Express API key')
    expect(wrapper.get('[data-testid="gemini-option-description-VERTEX_PROJECT"]').text()).toBe('Google Cloud project and location')
  })

  it('expands only one editor, focuses it, and emits only the addressed save input', async () => {
    const wrapper = mountComponent()
    await expand(wrapper, 'AI_STUDIO')

    const input = wrapper.get('[data-testid="gemini-ai-studio-key"]')
    expect(document.activeElement).toBe(input.element)
    await input.setValue('synthetic-gemini-key')
    await wrapper.get('[data-testid="gemini-save-AI_STUDIO"]').trigger('click')

    expect(wrapper.emitted('save')).toEqual([[{
      option: 'AI_STUDIO',
      apiKey: 'synthetic-gemini-key',
    }]])

    await expand(wrapper, 'VERTEX_PROJECT')
    expect(wrapper.find('[data-testid="gemini-ai-studio-key"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="gemini-vertex-project"]').exists()).toBe(true)
  })

  it('offers explicit first-time save-and-activate and configured-option activation', async () => {
    const wrapper = mountComponent({ geminiSetup: setup({ activeMode: null }) })
    await expand(wrapper, 'AI_STUDIO')
    await wrapper.get('[data-testid="gemini-ai-studio-key"]').setValue('synthetic-gemini-key')
    await wrapper.get('[data-testid="gemini-save-and-activate-AI_STUDIO"]').trigger('click')
    await wrapper.get('[data-testid="gemini-activate-VERTEX_PROJECT"]').trigger('click')

    expect(wrapper.emitted('save-and-activate')).toEqual([[{
      option: 'AI_STUDIO',
      apiKey: 'synthetic-gemini-key',
    }]])
    expect(wrapper.emitted('activate')).toEqual([['VERTEX_PROJECT']])
  })

  it('disables every conflicting option action while an operation is pending', async () => {
    const wrapper = mountComponent()
    await expand(wrapper, 'AI_STUDIO')
    await wrapper.get('[data-testid="gemini-ai-studio-key"]').setValue('synthetic-key')
    await wrapper.setProps({ saving: true })

    expect(wrapper.get('[data-testid="gemini-save-AI_STUDIO"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="gemini-toggle-VERTEX_PROJECT"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="gemini-activate-VERTEX_PROJECT"]').attributes('disabled')).toBeDefined()
  })

  it('shows the spinner and pending label while activating', () => {
    const wrapper = mountComponent({ activating: true })
    const activateButton = wrapper.get('[data-testid="gemini-activate-AI_STUDIO"]')

    expect(activateButton.attributes('disabled')).toBeDefined()
    expect(activateButton.find('.animate-spin').exists()).toBe(true)
    expect(activateButton.text()).toContain('Activating...')
    expect(activateButton.text()).not.toContain('Activate')
  })

  it('disables vault-backed unavailable options without disabling Vertex Project', () => {
    const wrapper = mountComponent({
      geminiSetup: setup({
        activeMode: null,
        aiStudioConfigured: null,
      }),
    })

    expect(wrapper.get('[data-testid="gemini-toggle-AI_STUDIO"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="gemini-toggle-VERTEX_PROJECT"]').attributes('disabled')).toBeUndefined()
  })

  it('clears write-only key editors after a refreshed setup snapshot', async () => {
    const wrapper = mountComponent()
    await expand(wrapper, 'AI_STUDIO')
    const input = wrapper.get('[data-testid="gemini-ai-studio-key"]')
    await input.setValue('synthetic-gemini-key')

    await wrapper.setProps({ geminiSetup: setup({ activeMode: 'VERTEX_PROJECT' }) })

    expect((input.element as HTMLInputElement).value).toBe('')
  })
})
