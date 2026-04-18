import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ProviderModelBrowser from '../ProviderModelBrowser.vue'

const createProps = (overrides: Record<string, unknown> = {}) => ({
  providers: [
    { id: 'OPENAI', name: 'OpenAI', label: 'OpenAI', totalModels: 2 },
    { id: 'provider_gateway', name: 'Internal Gateway', label: 'Internal Gateway', totalModels: 1 },
    { id: '__new_custom_provider__', name: 'New Provider', label: 'New Provider', totalModels: 0, isDraft: true },
  ],
  selectedProviderId: 'OPENAI',
  selectedProviderLabel: 'OpenAI',
  selectedProviderConfigured: true,
  llmModels: [{ modelIdentifier: 'gpt-4o', name: 'GPT-4o', providerType: 'OPENAI' }],
  audioModels: [{ modelIdentifier: 'whisper-1', name: 'Whisper', providerType: 'OPENAI' }],
  imageModels: [],
  isLoadingModels: false,
  isReloadingModels: false,
  isReloadingSelectedProvider: false,
  canReloadSelectedProvider: true,
  isProviderConfigured: (providerId: string) => providerId === 'OPENAI',
  ...overrides,
})

const mountComponent = (overrides: Record<string, unknown> = {}) =>
  mount(ProviderModelBrowser, {
    props: createProps(overrides),
    global: {
      mocks: {
        $t: (key: string) => ({
          'settings.components.settings.ProviderAPIKeyManager.providers': 'Providers',
          'settings.components.settings.ProviderAPIKeyManager.configured': 'Configured',
          'settings.components.settings.ProviderAPIKeyManager.not_configured': 'Not Configured',
          'settings.components.settings.ProviderAPIKeyManager.reload_models_for_selected_provider': 'Reload models for selected provider',
          'settings.components.settings.ProviderAPIKeyManager.reload_models': 'Reload Models',
          'settings.components.settings.ProviderAPIKeyManager.reloading_models': 'Reloading models...',
          'settings.components.settings.ProviderAPIKeyManager.llm_models': 'LLM Models',
          'settings.components.settings.ProviderAPIKeyManager.audio_models': 'Audio Models',
          'settings.components.settings.ProviderAPIKeyManager.image_models': 'Image Models',
          'settings.components.settings.ProviderAPIKeyManager.no_models_found': 'No Models Found',
          'settings.components.settings.ProviderAPIKeyManager.this_provider_doesn_t_have_any': 'No models yet.',
        }[key] ?? key),
      },
    },
    slots: {
      configuration: '<div data-testid="config-slot">config slot</div>',
    },
  })

describe('ProviderModelBrowser', () => {
  it('keeps built-in AutoByteus labels on model identifiers', () => {
    const wrapper = mountComponent()

    expect(wrapper.text()).toContain('Providers')
    expect(wrapper.text()).toContain('LLM Models')
    expect(wrapper.text()).toContain('Audio Models')
    expect(wrapper.text()).toContain('gpt-4o')
    expect(wrapper.text()).toContain('whisper-1')
    expect(wrapper.text()).not.toContain('GPT-4o')
    expect(wrapper.get('[data-testid="config-slot"]').text()).toContain('config slot')
  })

  it('shows friendly labels for saved custom-provider models', () => {
    const wrapper = mountComponent({
      selectedProviderId: 'provider_gateway',
      selectedProviderLabel: 'Internal Gateway',
      selectedProviderConfigured: true,
      llmModels: [
        {
          modelIdentifier: 'openai-compatible:provider_gateway:model-a',
          name: 'Model A',
          providerType: 'OPENAI_COMPATIBLE',
        },
      ],
      audioModels: [],
      isProviderConfigured: () => true,
    })

    expect(wrapper.text()).toContain('Model A')
    expect(wrapper.text()).not.toContain('openai-compatible:provider_gateway:model-a')
  })

  it('renders the draft row as the standard New Provider entry', () => {
    const wrapper = mountComponent()
    const draftButton = wrapper.findAll('button').find((button) => button.text().includes('New Provider'))

    expect(draftButton).toBeTruthy()
    expect(draftButton!.attributes('title')).toBeUndefined()
    expect(draftButton!.attributes('aria-label')).toBeUndefined()
    expect(draftButton!.find('.i-heroicons-plus-20-solid').exists()).toBe(false)
    expect(draftButton!.text()).toContain('New Provider')
    expect(draftButton!.text()).toContain('0')
  })

  it('emits selection and reload intents without touching the store', async () => {
    const wrapper = mountComponent()

    await wrapper.findAll('button').find((button) => button.text().includes('OpenAI'))!.trigger('click')
    await wrapper.findAll('button').find((button) => button.text().includes('Reload Models'))!.trigger('click')

    expect(wrapper.emitted('select-provider')).toEqual([['OPENAI']])
    expect(wrapper.emitted('reload-selected-provider')).toEqual([[]])
  })
})
