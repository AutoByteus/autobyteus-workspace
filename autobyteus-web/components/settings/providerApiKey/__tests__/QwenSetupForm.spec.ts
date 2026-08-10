import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import QwenSetupForm from '../QwenSetupForm.vue'

const translations: Record<string, string> = {
  'settings.components.settings.ProviderAPIKeyManager.qwen_configuration': 'Qwen configuration',
  'settings.components.settings.ProviderAPIKeyManager.qwen_configuration_description': 'Use the pair from Alibaba.',
  'settings.components.settings.ProviderAPIKeyManager.qwen_configured_endpoint': 'Configured endpoint',
  'settings.components.settings.ProviderAPIKeyManager.qwen_using_default_endpoint': 'Using default endpoint',
  'settings.components.settings.ProviderAPIKeyManager.base_url': 'Base URL',
  'settings.components.settings.ProviderAPIKeyManager.qwen_endpoint_help': 'Endpoint help',
  'settings.components.settings.ProviderAPIKeyManager.qwen_base_url_placeholder': 'https://…/compatible-mode/v1',
  'settings.components.settings.ProviderAPIKeyManager.api_key': 'API key',
  'settings.components.settings.ProviderAPIKeyManager.qwen_api_key_configured': 'API key configured',
  'settings.components.settings.ProviderAPIKeyManager.enter_new_key_to_update': 'Enter a new key',
  'settings.components.settings.ProviderAPIKeyManager.enter_api_key': 'Enter an API key',
  'settings.components.settings.ProviderAPIKeyManager.toggle_key_visibility': 'Toggle key visibility',
  'settings.components.settings.ProviderAPIKeyManager.qwen_testing_and_saving': 'Testing and saving...',
  'settings.components.settings.ProviderAPIKeyManager.qwen_save_configuration': 'Save configuration',
  'settings.components.settings.ProviderAPIKeyManager.qwen_required_error': 'Enter both fields.',
  'settings.components.settings.ProviderAPIKeyManager.qwen_invalid_url_error': 'Enter an absolute HTTP or HTTPS Base URL.',
}

const translate = (key: string) => translations[key] ?? key

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({ t: translate }),
}))

const status = (endpointSource: 'DEFAULT' | 'CONFIGURED' = 'DEFAULT') => ({
  effectiveBaseUrl: 'https://dashscope.example/compatible-mode/v1',
  endpointSource,
  apiKeyConfigured: true,
})

const mountForm = (overrides: Record<string, unknown> = {}) => mount(QwenSetupForm, {
  props: {
    setup: status(),
    saving: false,
    resetVersion: 0,
    errorMessage: null,
    errorCode: null,
    ...overrides,
  },
  global: {
    mocks: { $t: translate },
  },
})

describe('QwenSetupForm', () => {
  it('labels default and explicitly configured equal URLs from endpointSource only', async () => {
    const wrapper = mountForm()
    expect(wrapper.get('[data-testid="qwen-endpoint-source"]').text())
      .toBe('Using default endpoint')

    await wrapper.setProps({ setup: status('CONFIGURED') })
    expect(wrapper.get('[data-testid="qwen-endpoint-source"]').text())
      .toBe('Configured endpoint')
  })

  it('requires both fields and an absolute HTTP(S) URL before emitting one pair save', async () => {
    const wrapper = mountForm()
    const baseUrl = wrapper.get<HTMLInputElement>('#qwen-base-url')
    const apiKey = wrapper.get<HTMLInputElement>('#qwen-api-key')

    await baseUrl.setValue('not-a-url')
    await apiKey.setValue('synthetic-key')
    await baseUrl.trigger('blur')
    expect(wrapper.text()).toContain('Enter an absolute HTTP or HTTPS Base URL.')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('Enter an absolute HTTP or HTTPS Base URL.')
    expect(wrapper.emitted('save')).toBeUndefined()

    await baseUrl.setValue(' https://regional.example/compatible-mode/v1/ ')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('save')).toEqual([[
      {
        baseUrl: 'https://regional.example/compatible-mode/v1/',
        apiKey: 'synthetic-key',
      },
    ]])
  })

  it('disables duplicate submission, keeps server errors visible, and clears plaintext after success', async () => {
    const wrapper = mountForm({
      saving: true,
      errorMessage: 'Qwen configuration needs repair.',
      errorCode: 'QWEN_CONFIGURATION_REPAIR_REQUIRED',
    })
    const apiKey = wrapper.get<HTMLInputElement>('#qwen-api-key')
    await apiKey.setValue('synthetic-key')
    expect(wrapper.get<HTMLButtonElement>('button[type="submit"]').element.disabled).toBe(true)
    expect(wrapper.get('[data-testid="qwen-save-error"]').classes()).toContain('text-red-800')

    await wrapper.setProps({
      saving: false,
      setup: status('CONFIGURED'),
      resetVersion: 1,
      errorMessage: null,
      errorCode: null,
    })
    expect(wrapper.get<HTMLInputElement>('#qwen-api-key').element.value).toBe('')
    expect(wrapper.get<HTMLInputElement>('#qwen-base-url').element.value)
      .toBe('https://dashscope.example/compatible-mode/v1')
  })

  it('keeps the key masked by default and exposes an accessible visibility control', async () => {
    const wrapper = mountForm()
    expect(wrapper.get<HTMLInputElement>('#qwen-api-key').attributes('type')).toBe('password')
    const toggle = wrapper.get<HTMLButtonElement>('button[aria-label="Toggle key visibility"]')
    await toggle.trigger('click')
    expect(wrapper.get<HTMLInputElement>('#qwen-api-key').attributes('type')).toBe('text')
  })
})
