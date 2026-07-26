import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import GeminiSetupForm from '../GeminiSetupForm.vue'

const translations: Record<string, string> = {
  'settings.components.settings.ProviderAPIKeyManager.ai_studio': 'AI Studio',
  'settings.components.settings.ProviderAPIKeyManager.vertex_express': 'Vertex Express',
  'settings.components.settings.ProviderAPIKeyManager.vertex_project': 'Vertex Project',
  'settings.components.settings.ProviderAPIKeyManager.configured': 'Configured',
  'settings.components.settings.ProviderAPIKeyManager.not_configured': 'Not Configured',
  'settings.components.settings.ProviderAPIKeyManager.active': 'Active',
  'settings.components.settings.ProviderAPIKeyManager.gemini_active_mode': 'Active mode',
  'settings.components.settings.ProviderAPIKeyManager.not_selected': 'Not selected',
  'settings.components.settings.ProviderAPIKeyManager.enter_gemini_api_key': 'Enter Gemini API key...',
  'settings.components.settings.ProviderAPIKeyManager.enter_vertex_api_key': 'Enter Vertex API key...',
  'settings.components.settings.ProviderAPIKeyManager.vertex_project_id': 'Vertex project id',
  'settings.components.settings.ProviderAPIKeyManager.vertex_location_e_g_us_central1': 'Vertex location',
  'settings.components.settings.ProviderAPIKeyManager.saving': 'Saving...',
  'settings.components.settings.ProviderAPIKeyManager.activating': 'Activating...',
  'settings.components.settings.ProviderAPIKeyManager.removing': 'Removing...',
  'settings.components.settings.ProviderAPIKeyManager.save_option': 'Save option',
  'settings.components.settings.ProviderAPIKeyManager.save_and_use_mode': 'Save and use this mode',
  'settings.components.settings.ProviderAPIKeyManager.use_this_mode': 'Use this mode',
  'settings.components.settings.ProviderAPIKeyManager.remove_option': 'Remove option',
  'settings.components.settings.ProviderAPIKeyManager.configure_option': 'Configure',
  'settings.components.settings.ProviderAPIKeyManager.collapse': 'Collapse',
  'settings.components.settings.ProviderAPIKeyManager.toggle_key_visibility': 'Toggle key visibility',
  'settings.components.settings.ProviderAPIKeyManager.gemini_active_remove_confirmation': 'Remove active {{option}}?',
}

const translate = (key: string, params?: Record<string, unknown>) =>
  (translations[key] ?? key).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, token) => String(params?.[token] ?? ''))

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({ t: translate }),
}))

const missingStatus = {
  vaultHealth: 'READY' as const,
  storageState: 'MISSING' as const,
  instructionCode: null,
}
const configuredStatus = { ...missingStatus, storageState: 'CONFIGURED' as const }

const setup = (overrides: Record<string, unknown> = {}) => ({
  activeMode: 'VERTEX_EXPRESS' as const,
  aiStudioCredentialStatus: configuredStatus,
  vertexExpressCredentialStatus: configuredStatus,
  vertexProjectStatus: 'CONFIGURED' as const,
  vertexProject: 'project-1',
  vertexLocation: 'us-central1',
  ...overrides,
})

const mountComponent = (props: Record<string, unknown> = {}) =>
  mount(GeminiSetupForm, {
    attachTo: document.body,
    props: {
      geminiSetup: setup(),
      saving: false,
      activating: false,
      removing: false,
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

    expect(wrapper.find('[data-testid="gemini-option-AI_STUDIO"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="gemini-option-VERTEX_EXPRESS"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="gemini-option-VERTEX_PROJECT"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="gemini-option-active-VERTEX_EXPRESS"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="gemini-option-active-AI_STUDIO"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="gemini-active-mode"]').text()).toContain('Vertex Express')
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
      geminiApiKey: 'synthetic-gemini-key',
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
      geminiApiKey: 'synthetic-gemini-key',
    }]])
    expect(wrapper.emitted('activate')).toEqual([['VERTEX_PROJECT']])
  })

  it('requires confirmation before removing the active option', async () => {
    const confirm = vi.spyOn(globalThis, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    const wrapper = mountComponent()
    await expand(wrapper, 'VERTEX_EXPRESS')

    await wrapper.get('[data-testid="gemini-remove-VERTEX_EXPRESS"]').trigger('click')
    expect(wrapper.emitted('remove')).toBeUndefined()
    await wrapper.get('[data-testid="gemini-remove-VERTEX_EXPRESS"]').trigger('click')
    expect(wrapper.emitted('remove')).toEqual([['VERTEX_EXPRESS']])
    expect(confirm).toHaveBeenCalledTimes(2)
    confirm.mockRestore()
  })

  it('disables every conflicting option action while an operation is pending', async () => {
    const wrapper = mountComponent()
    await expand(wrapper, 'AI_STUDIO')
    await wrapper.get('[data-testid="gemini-ai-studio-key"]').setValue('synthetic-key')
    await wrapper.setProps({ saving: true })

    expect(wrapper.get('[data-testid="gemini-save-AI_STUDIO"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="gemini-remove-AI_STUDIO"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="gemini-toggle-VERTEX_PROJECT"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="gemini-activate-VERTEX_PROJECT"]').attributes('disabled')).toBeDefined()
  })

  it('disables vault-backed unavailable options without disabling Vertex Project', () => {
    const wrapper = mountComponent({
      geminiSetup: setup({
        activeMode: null,
        aiStudioCredentialStatus: {
          vaultHealth: 'LOCKED',
          storageState: null,
          instructionCode: 'SECRET_VAULT_LOCKED',
        },
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
