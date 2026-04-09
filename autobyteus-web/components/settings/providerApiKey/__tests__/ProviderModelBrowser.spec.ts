import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ProviderModelBrowser from '../ProviderModelBrowser.vue'

const mountComponent = () =>
  mount(ProviderModelBrowser, {
    props: {
      providers: [
        { name: 'OPENAI', totalModels: 2 },
        { name: 'GEMINI', totalModels: 1 },
      ],
      selectedProvider: 'OPENAI',
      selectedProviderConfigured: true,
      llmModels: [{ modelIdentifier: 'gpt-4o' }],
      audioModels: [{ modelIdentifier: 'whisper-1' }],
      imageModels: [],
      isLoadingModels: false,
      isReloadingModels: false,
      isReloadingSelectedProvider: false,
      isProviderConfigured: (provider: string) => provider === 'OPENAI',
    },
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
  it('renders grouped models and the provided configuration slot', () => {
    const wrapper = mountComponent()

    expect(wrapper.text()).toContain('Providers')
    expect(wrapper.text()).toContain('LLM Models')
    expect(wrapper.text()).toContain('Audio Models')
    expect(wrapper.text()).toContain('gpt-4o')
    expect(wrapper.text()).toContain('whisper-1')
    expect(wrapper.get('[data-testid="config-slot"]').text()).toContain('config slot')
  })

  it('emits selection and reload intents without touching the store', async () => {
    const wrapper = mountComponent()

    await wrapper.findAll('button').find((button) => button.text().includes('OPENAI'))!.trigger('click')
    await wrapper.findAll('button').find((button) => button.text().includes('Reload Models'))!.trigger('click')

    expect(wrapper.emitted('select-provider')).toEqual([['OPENAI']])
    expect(wrapper.emitted('reload-selected-provider')).toEqual([[]])
  })
})
