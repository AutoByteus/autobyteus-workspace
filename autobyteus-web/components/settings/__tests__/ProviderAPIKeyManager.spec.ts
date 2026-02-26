import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'

import ProviderAPIKeyManager from '../ProviderAPIKeyManager.vue'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'

const flushPromises = async () => {
  // Allow queued microtasks and pending timers (used by notifications) to settle
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const setMaybeRef = (target: any, key: string, value: any) => {
  if (!target) return
  const current = target[key]
  if (current && typeof current === 'object' && 'value' in current) {
    current.value = value
    return
  }
  target[key] = value
}

const mountComponent = async (storePatch: Record<string, any> = {}) => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: {
      llmProviderConfig: {
        providersWithModels: [],
        audioProvidersWithModels: [],
        imageProvidersWithModels: [],
        geminiSetup: {
          mode: 'AI_STUDIO',
          geminiApiKeyConfigured: false,
          vertexApiKeyConfigured: false,
          vertexProject: null,
          vertexLocation: null,
        },
        providerConfigs: {},
        isLoadingModels: false,
        isReloadingModels: false,
        isReloadingProviderModels: false,
        reloadingProvider: null,
        hasFetchedProviders: true,
        ...storePatch,
      },
    },
  })
  setActivePinia(pinia)
  const store = useLLMProviderConfigStore()

  store.fetchProvidersWithModels = vi.fn().mockResolvedValue(store.providersWithModels)
  store.getLLMProviderApiKey = vi.fn().mockResolvedValue('')
  store.fetchGeminiSetupConfig = vi.fn().mockResolvedValue(store.geminiSetup)
  store.setGeminiSetupConfig = vi.fn().mockResolvedValue(true)

  const wrapper = mount(ProviderAPIKeyManager, {
    global: {
      plugins: [pinia],
    },
  })

  await wrapper.vm.$nextTick()
  await flushPromises()
  return { wrapper, store }
}

describe('ProviderAPIKeyManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders separate sections for LLM and audio models when available', async () => {
    const modelState = {
      providersWithModels: [
        {
          provider: 'OPENAI',
          models: [
            {
              modelIdentifier: 'gpt-4o',
              name: 'GPT-4o',
              value: 'gpt-4o',
              canonicalName: 'gpt-4o',
              provider: 'OPENAI',
              runtime: 'api',
              hostUrl: null,
            },
          ],
        },
      ],
      audioProvidersWithModels: [
        {
          provider: 'OPENAI',
          models: [
            {
              modelIdentifier: 'whisper-1',
              name: 'Whisper',
              value: 'whisper-1',
              canonicalName: 'whisper-1',
              provider: 'OPENAI',
              runtime: 'api',
              hostUrl: null,
            },
          ],
        },
      ],
      imageProvidersWithModels: [
        {
          provider: 'OPENAI',
          models: [
            {
              modelIdentifier: 'dall-e-3',
              name: 'DALL-E 3',
              value: 'dall-e-3',
              canonicalName: 'dall-e-3',
              provider: 'OPENAI',
              runtime: 'api',
              hostUrl: null,
            },
          ],
        },
      ],
    }
    const { wrapper, store } = await mountComponent(modelState)

    await wrapper.vm.$nextTick()
    await flushPromises()

    const vm = wrapper.vm as any
    if (vm?.loading && typeof vm.loading === 'object' && 'value' in vm.loading) {
      vm.loading.value = false
    } else {
      setMaybeRef(vm, 'loading', false)
    }
    const initialSetupState = vm.$?.setupState
    setMaybeRef(initialSetupState, 'loading', false)
    await wrapper.vm.$nextTick()
    await flushPromises()

    if (!store.providersWithModels.length) {
      store.providersWithModels = modelState.providersWithModels
      store.audioProvidersWithModels = modelState.audioProvidersWithModels
      store.imageProvidersWithModels = modelState.imageProvidersWithModels
      await wrapper.vm.$nextTick()
      await flushPromises()
    }

    const setupState = (wrapper.vm as any).$?.setupState
    setMaybeRef(setupState, 'providersWithModels', modelState.providersWithModels)
    setMaybeRef(setupState, 'audioProvidersWithModels', modelState.audioProvidersWithModels)
    setMaybeRef(setupState, 'imageProvidersWithModels', modelState.imageProvidersWithModels)
    setMaybeRef(setupState, 'selectedModelProvider', 'OPENAI')
    await wrapper.vm.$nextTick()
    await flushPromises()
    if (typeof (wrapper.vm as any).$forceUpdate === 'function') {
      ;(wrapper.vm as any).$forceUpdate()
      await wrapper.vm.$nextTick()
      await flushPromises()
    }

    // After selecting the provider, we should see the model type sections
    expect(wrapper.text()).toContain('LLM Models')
    expect(wrapper.text()).toContain('Audio Models')
    expect(wrapper.text()).toContain('Image Models')
    // Component displays modelIdentifier
    expect(wrapper.text()).toContain('gpt-4o')
    expect(wrapper.text()).toContain('whisper-1')
    expect(wrapper.text()).toContain('dall-e-3')
  })

  it('shows an empty state message when no models exist', async () => {
    const { wrapper } = await mountComponent()

    // Ensure store arrays stay empty to trigger the empty state
    await wrapper.vm.$nextTick()
    await flushPromises()

    const vm = wrapper.vm as any
    if (vm?.loading && typeof vm.loading === 'object' && 'value' in vm.loading) {
      vm.loading.value = false
    } else {
      setMaybeRef(vm, 'loading', false)
    }
    const setupState = vm.$?.setupState
    setMaybeRef(setupState, 'loading', false)
    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(wrapper.text()).toContain('No models available. Configure at least one provider API key to see available models.')
  })

  it('renders Gemini setup controls and saves Gemini setup', async () => {
    const { wrapper, store } = await mountComponent({
      providersWithModels: [
        {
          provider: 'GEMINI',
          models: [
            {
              modelIdentifier: 'gemini-3-flash-preview',
              name: 'Gemini Flash',
              value: 'gemini-3-flash-preview',
              canonicalName: 'gemini-3-flash',
              provider: 'GEMINI',
              runtime: 'api',
              hostUrl: null,
            },
          ],
        },
      ],
    })

    const vm = wrapper.vm as any
    if (vm?.loading && typeof vm.loading === 'object' && 'value' in vm.loading) {
      vm.loading.value = false
    } else {
      setMaybeRef(vm, 'loading', false)
    }
    const setupState = vm.$?.setupState
    setMaybeRef(setupState, 'loading', false)
    await wrapper.vm.$nextTick()
    await flushPromises()

    if (!store.providersWithModels.length) {
      store.providersWithModels = [
        {
          provider: 'GEMINI',
          models: [
            {
              modelIdentifier: 'gemini-3-flash-preview',
              name: 'Gemini Flash',
              value: 'gemini-3-flash-preview',
              canonicalName: 'gemini-3-flash',
              provider: 'GEMINI',
              runtime: 'api',
              hostUrl: null,
            },
          ],
        },
      ] as any
      await wrapper.vm.$nextTick()
      await flushPromises()
    }

    setMaybeRef(setupState, 'providersWithModels', store.providersWithModels)
    setMaybeRef(setupState, 'selectedModelProvider', 'GEMINI')
    if ((wrapper.vm as any).selectedModelProvider !== undefined) {
      ;(wrapper.vm as any).selectedModelProvider = 'GEMINI'
    }
    await wrapper.vm.$nextTick()
    await flushPromises()
    if (typeof (wrapper.vm as any).$forceUpdate === 'function') {
      ;(wrapper.vm as any).$forceUpdate()
      await wrapper.vm.$nextTick()
      await flushPromises()
    }

    expect(wrapper.text()).toContain('Gemini setup: choose a mode and fill only required fields.')
    expect(wrapper.text()).toContain('Save Gemini Setup')

    const geminiInput = wrapper.get('input[placeholder=\"Enter Gemini API key...\"]')
    await geminiInput.setValue('test-gemini-key')
    setMaybeRef(setupState, 'geminiApiKey', 'test-gemini-key')

    if (typeof setupState?.saveApiKeyForSelectedProvider === 'function') {
      await setupState.saveApiKeyForSelectedProvider()
    } else {
      const saveBtn = wrapper.findAll('button').find(btn => btn.text().includes('Save Gemini Setup'))
      expect(saveBtn).toBeTruthy()
      if (saveBtn) {
        await saveBtn.trigger('click')
      }
    }
    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(store.setGeminiSetupConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'AI_STUDIO',
        geminiApiKey: 'test-gemini-key',
      })
    )
  })

  it('saves Gemini Vertex Express setup with the expected payload', async () => {
    const { wrapper, store } = await mountComponent({
      providersWithModels: [
        {
          provider: 'GEMINI',
          models: [
            {
              modelIdentifier: 'gemini-3-flash-preview',
              name: 'Gemini Flash',
              value: 'gemini-3-flash-preview',
              canonicalName: 'gemini-3-flash',
              provider: 'GEMINI',
              runtime: 'api',
              hostUrl: null,
            },
          ],
        },
      ],
    })

    const vm = wrapper.vm as any
    if (vm?.loading && typeof vm.loading === 'object' && 'value' in vm.loading) {
      vm.loading.value = false
    } else {
      setMaybeRef(vm, 'loading', false)
    }
    const setupState = vm.$?.setupState
    setMaybeRef(setupState, 'loading', false)
    setMaybeRef(setupState, 'providersWithModels', store.providersWithModels)
    setMaybeRef(setupState, 'selectedModelProvider', 'GEMINI')
    setMaybeRef(setupState, 'geminiSetupMode', 'VERTEX_EXPRESS')
    setMaybeRef(setupState, 'vertexApiKey', 'vertex-express-test-key')
    await wrapper.vm.$nextTick()
    await flushPromises()

    if (typeof setupState?.saveApiKeyForSelectedProvider === 'function') {
      await setupState.saveApiKeyForSelectedProvider()
    }
    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(store.setGeminiSetupConfig).toHaveBeenCalledWith({
      mode: 'VERTEX_EXPRESS',
      geminiApiKey: null,
      vertexApiKey: 'vertex-express-test-key',
      vertexProject: null,
      vertexLocation: null,
    })
  })

  it('saves Gemini Vertex Project setup with the expected payload', async () => {
    const { wrapper, store } = await mountComponent({
      providersWithModels: [
        {
          provider: 'GEMINI',
          models: [
            {
              modelIdentifier: 'gemini-3-flash-preview',
              name: 'Gemini Flash',
              value: 'gemini-3-flash-preview',
              canonicalName: 'gemini-3-flash',
              provider: 'GEMINI',
              runtime: 'api',
              hostUrl: null,
            },
          ],
        },
      ],
    })

    const vm = wrapper.vm as any
    if (vm?.loading && typeof vm.loading === 'object' && 'value' in vm.loading) {
      vm.loading.value = false
    } else {
      setMaybeRef(vm, 'loading', false)
    }
    const setupState = vm.$?.setupState
    setMaybeRef(setupState, 'loading', false)
    setMaybeRef(setupState, 'providersWithModels', store.providersWithModels)
    setMaybeRef(setupState, 'selectedModelProvider', 'GEMINI')
    setMaybeRef(setupState, 'geminiSetupMode', 'VERTEX_PROJECT')
    setMaybeRef(setupState, 'vertexProject', 'project-test')
    setMaybeRef(setupState, 'vertexLocation', 'europe-west4')
    await wrapper.vm.$nextTick()
    await flushPromises()

    if (typeof setupState?.saveApiKeyForSelectedProvider === 'function') {
      await setupState.saveApiKeyForSelectedProvider()
    }
    await wrapper.vm.$nextTick()
    await flushPromises()

    expect(store.setGeminiSetupConfig).toHaveBeenCalledWith({
      mode: 'VERTEX_PROJECT',
      geminiApiKey: null,
      vertexApiKey: null,
      vertexProject: 'project-test',
      vertexLocation: 'europe-west4',
    })
  })
})
