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
  videoModels: [{ modelIdentifier: 'gemini-omni-flash-preview', name: 'Gemini Omni Flash Preview', providerType: 'GEMINI' }],
  isLoadingModels: false,
  isRefreshingModels: false,
  isReloadingModels: false,
  hasSuccessfulPayload: true,
  hasPartialResult: false,
  hasStaleResult: false,
  hasUnavailableSource: false,
  modelErrorMessage: null,
  isReloadingSelectedProvider: false,
  canReloadSelectedProvider: false,
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
          'settings.components.settings.ProviderAPIKeyManager.models': 'Models',
          'settings.components.settings.ProviderAPIKeyManager.loading_models': 'Loading models...',
          'settings.components.settings.ProviderAPIKeyManager.refreshing_models': 'Refreshing models...',
          'settings.components.settings.ProviderAPIKeyManager.retry': 'Retry',
          'settings.components.settings.ProviderAPIKeyManager.some_model_sources_unavailable': 'Some model sources are unavailable.',
          'settings.components.settings.ProviderAPIKeyManager.showing_last_known_models': 'Could not refresh models. Showing last known models.',
          'settings.components.settings.ProviderAPIKeyManager.models_unavailable': 'Models unavailable',
          'settings.components.settings.ProviderAPIKeyManager.models_unavailable_description': 'Try again.',
          'settings.components.settings.ProviderAPIKeyManager.llm_models': 'LLM Models',
          'settings.components.settings.ProviderAPIKeyManager.audio_models': 'Audio Models',
          'settings.components.settings.ProviderAPIKeyManager.image_models': 'Image Models',
          'settings.components.settings.ProviderAPIKeyManager.video_models': 'Video Models',
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
    expect(wrapper.text()).toContain('Video Models')
    expect(wrapper.text()).toContain('gpt-4o')
    expect(wrapper.text()).toContain('whisper-1')
    expect(wrapper.text()).toContain('gemini-omni-flash-preview')
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

  it('shows friendly labels for Qwen-served duplicates in Settings', () => {
    const wrapper = mountComponent({
      providers: [
        { id: 'QWEN', name: 'Qwen', label: 'Qwen', totalModels: 3 },
      ],
      selectedProviderId: 'QWEN',
      selectedProviderLabel: 'Qwen',
      selectedProviderConfigured: true,
      llmModels: [
        {
          modelIdentifier: 'qwen:deepseek-v4-pro',
          name: 'DeepSeek V4 Pro (Qwen)',
          providerType: 'QWEN',
        },
        {
          modelIdentifier: 'qwen:deepseek-v4-flash-0731',
          name: 'DeepSeek V4 Flash 0731 (Qwen)',
          providerType: 'QWEN',
        },
        {
          modelIdentifier: 'qwen:glm-5.2',
          name: 'GLM-5.2 (Qwen)',
          providerType: 'QWEN',
        },
      ],
      audioModels: [],
      videoModels: [],
      isProviderConfigured: () => true,
    })

    expect(wrapper.text()).toContain('DeepSeek V4 Pro (Qwen)')
    expect(wrapper.text()).toContain('DeepSeek V4 Flash 0731 (Qwen)')
    expect(wrapper.text()).toContain('GLM-5.2 (Qwen)')
    expect(wrapper.text()).not.toContain('qwen:deepseek-v4-pro')
    expect(wrapper.text()).not.toContain('qwen:deepseek-v4-flash-0731')
    expect(wrapper.text()).not.toContain('qwen:glm-5.2')
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
    const wrapper = mountComponent({ canReloadSelectedProvider: true })

    await wrapper.findAll('button').find((button) => button.text().includes('OpenAI'))!.trigger('click')
    await wrapper.findAll('button').find((button) => button.text().includes('Reload Models'))!.trigger('click')

    expect(wrapper.emitted('select-provider')).toEqual([['OPENAI']])
    expect(wrapper.emitted('reload-selected-provider')).toEqual([[]])
  })

  it('keeps configuration rendered while initial model loading is pending', () => {
    const wrapper = mountComponent({
      llmModels: [], audioModels: [], videoModels: [],
      isLoadingModels: true,
      hasSuccessfulPayload: false,
    })
    expect(wrapper.get('[data-testid="config-slot"]').exists()).toBe(true)
    expect(wrapper.get('[role="status"]').text()).toContain('Loading models...')
    expect(wrapper.text()).not.toContain('No Models Found')
  })

  it('retains rows and reports model-only progress during refresh', () => {
    const wrapper = mountComponent({ isRefreshingModels: true })
    expect(wrapper.text()).toContain('Refreshing models...')
    expect(wrapper.text()).toContain('gpt-4o')
    expect(wrapper.get('[data-testid="config-slot"]').exists()).toBe(true)
  })

  it('shows partial, unavailable/retry, and successful empty states in the model area', async () => {
    const partial = mountComponent({ hasPartialResult: true })
    expect(partial.text()).toContain('Some model sources are unavailable.')
    expect(partial.get('[role="status"]').exists()).toBe(true)

    const emptyPartial = mountComponent({
      llmModels: [], audioModels: [], imageModels: [], videoModels: [],
      hasSuccessfulPayload: true,
      hasPartialResult: true,
    })
    expect(emptyPartial.get('[role="alert"]').text()).toContain('Models unavailable')
    expect(emptyPartial.get('[role="alert"]').text()).toContain('Some model sources are unavailable.')
    expect(emptyPartial.text()).not.toContain('No Models Found')

    const stale = mountComponent({
      hasStaleResult: true,
      canReloadSelectedProvider: true,
    })
    expect(stale.text()).toContain('Could not refresh models. Showing last known models.')
    expect(stale.findAll('button').some(button => button.text().includes('Retry'))).toBe(true)

    const unavailable = mountComponent({
      llmModels: [], audioModels: [], imageModels: [], videoModels: [],
      hasSuccessfulPayload: false,
      hasUnavailableSource: true,
      canReloadSelectedProvider: true,
      modelErrorMessage: 'AUTOBYTEUS_LLM_DISCOVERY_FAILED',
    })
    expect(unavailable.get('[role="alert"]').text()).toContain('Models unavailable')
    expect(unavailable.text()).toContain('Try again.')
    expect(unavailable.text()).not.toContain('AUTOBYTEUS_LLM_DISCOVERY_FAILED')
    const retry = unavailable.findAll('button').find(button => button.text().includes('Retry'))
    expect(retry).toBeTruthy()
    await retry!.trigger('click')
    expect(unavailable.emitted('reload-selected-provider')).toEqual([[]])

    const empty = mountComponent({
      llmModels: [], audioModels: [], imageModels: [], videoModels: [],
      hasSuccessfulPayload: true,
    })
    expect(empty.text()).toContain('No Models Found')
    expect(empty.find('[role="alert"]').exists()).toBe(false)
  })

  it('hides Reload for static providers and shows it only for dynamic providers', () => {
    expect(mountComponent({ canReloadSelectedProvider: false }).text())
      .not.toContain('Reload Models')
    expect(mountComponent({ canReloadSelectedProvider: true }).text())
      .toContain('Reload Models')
  })
})
