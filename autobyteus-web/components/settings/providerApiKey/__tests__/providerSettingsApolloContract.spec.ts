// @ts-expect-error @apollo/client is supplied by the existing @nuxtjs/apollo integration.
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client/core'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  RELOAD_LLM_MODELS,
  SAVE_QWEN_CONFIGURATION,
} from '~/graphql/mutations/llm_provider_mutations'
import {
  GET_AVAILABLE_LLM_PROVIDERS_WITH_MODELS,
  GET_GEMINI_SETUP_CONFIG,
  GET_PROVIDER_SETTINGS,
  GET_QWEN_SETUP_STATUS,
} from '~/graphql/queries/llm_provider_queries'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { getApolloClient } from '~/utils/apolloClient'
import { useProviderApiKeySectionRuntime } from '../useProviderApiKeySectionRuntime'

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn() }))
vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string, params?: Record<string, string>) =>
      `${key}${params?.provider ? `:${params.provider}` : ''}`,
  }),
}))

const provider = (id: string, configured: boolean) => ({
  __typename: 'LlmProviderObject',
  id,
  name: id === 'OPENAI' ? 'OpenAI' : id === 'ANTHROPIC' ? 'Anthropic' : id,
  providerType: id,
  isCustom: false,
  baseUrl: null,
  apiKeyConfigured: configured,
  status: 'NOT_APPLICABLE',
  statusMessage: null,
})

const model = (id: string, providerType: string) => ({
  __typename: 'ModelDetail', modelIdentifier: id, name: id, providerType,
})

describe('provider-centric Settings Apollo contract', () => {
  beforeEach(() => vi.clearAllMocks())

  it('keeps one exact provider status across subordinate LLM/audio/image rows', async () => {
    const cache = new InMemoryCache()
    const link = new ApolloLink((operation: { operationName: string }) => new Observable((
      observer: {
        next: (value: { data: Record<string, unknown> }) => void
        complete: () => void
      },
    ) => {
      const data = operation.operationName === 'GetGeminiSetupConfig'
        ? {
            getGeminiSetupConfig: {
              __typename: 'GeminiSetupStateObject',
              activeMode: null,
              aiStudioConfigured: false,
              vertexExpressConfigured: false,
              vertexProject: null,
            },
          }
        : operation.operationName === 'GetQwenSetupStatus'
          ? {
              qwenSetupStatus: {
                __typename: 'QwenSetupStatusObject',
                effectiveBaseUrl: 'https://default.example/v1',
                endpointSource: 'DEFAULT',
                apiKeyConfigured: false,
              },
            }
        : {
            providerSettings: [
              {
                __typename: 'ProviderSettingsGroup',
                provider: provider('ANTHROPIC', false),
                llmModels: [model('claude', 'ANTHROPIC')],
                audioModels: [], imageModels: [], videoModels: [],
              },
              {
                __typename: 'ProviderSettingsGroup',
                provider: provider('OPENAI', true),
                llmModels: [model('gpt-4.1', 'OPENAI')],
                audioModels: [model('whisper-1', 'OPENAI')],
                imageModels: [model('gpt-image-1', 'OPENAI')],
                videoModels: [],
              },
            ],
          }
      observer.next({ data })
      observer.complete()
    }))
    const client = new ApolloClient({ cache, link })
    vi.mocked(getApolloClient).mockReturnValue(client as any)
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(defineComponent({
      setup() {
        const runtime = useProviderApiKeySectionRuntime()
        return { runtime }
      },
      render: () => h('div'),
    }), { global: { plugins: [pinia] } })

    await (wrapper.vm as any).runtime.initialize()

    const runtime = (wrapper.vm as any).runtime
    const read = (value: any) => value?.value ?? value
    expect(read(runtime.allProvidersWithModels).filter((row: any) => !row.isDraft)).toHaveLength(2)
    expect(read(runtime.selectedProviderId)).toBe('OPENAI')
    expect(read(runtime.selectedProviderConfigured)).toBe(true)
    expect(read(runtime.selectedProviderLlmModels)).toHaveLength(1)
    expect(read(runtime.selectedProviderAudioModels)).toHaveLength(1)
    expect(read(runtime.selectedProviderImageModels)).toHaveLength(1)
    expect(runtime.isProviderConfigured('ANTHROPIC')).toBe(false)
    expect(runtime.isProviderConfigured('OPENAI')).toBe(true)

    const extracted = cache.extract()
    expect(extracted['LlmProviderObject:OPENAI']).toEqual(expect.objectContaining({
      apiKeyConfigured: true,
    }))
    expect(JSON.stringify(extracted)).not.toContain('credentialStatus')
  })

  it('keeps committed Qwen status authoritative when the later view refresh rejects', async () => {
    const status = {
      effectiveBaseUrl: 'https://regional.example/v1',
      endpointSource: 'CONFIGURED' as const,
      apiKeyConfigured: true,
    }
    const refreshError = new Error('provider settings network failure')
    const client = {
      mutate: vi.fn().mockResolvedValue({ data: { saveQwenConfiguration: status } }),
      query: vi.fn()
        .mockRejectedValueOnce(refreshError)
        .mockResolvedValueOnce({
          data: {
            availableLlmProvidersWithModels: [],
            availableAudioProvidersWithModels: [],
            availableImageProvidersWithModels: [],
            availableVideoProvidersWithModels: [],
          },
        }),
    }
    vi.mocked(getApolloClient).mockReturnValue(client as any)
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useLLMProviderConfigStore()

    await expect(store.saveQwenConfiguration({
      baseUrl: status.effectiveBaseUrl,
      apiKey: 'synthetic-key',
    })).resolves.toEqual(status)
    expect(store.qwenSetup).toEqual(status)
    expect(client.query).not.toHaveBeenCalled()

    await expect(store.refreshProviderDataAfterQwenSave()).rejects.toBe(refreshError)
    expect(store.qwenSetup).toEqual(status)
  })

  it('recovers provider settings and catalog through Reload Models after post-save refresh rejection', async () => {
    const initialGroup = {
      __typename: 'ProviderSettingsGroup',
      provider: provider('QWEN', false),
      llmModels: [model('qwen3.8-max', 'QWEN')],
      audioModels: [], imageModels: [], videoModels: [],
    }
    const recoveredGroup = {
      ...initialGroup,
      provider: provider('QWEN', true),
    }
    const status = {
      __typename: 'QwenSetupStatusObject',
      effectiveBaseUrl: 'https://regional.example/v1',
      endpointSource: 'CONFIGURED' as const,
      apiKeyConfigured: true,
    }
    const catalog = {
      availableLlmProvidersWithModels: [{
        provider: {
          id: 'QWEN', name: 'Qwen', providerType: 'QWEN', isCustom: false,
          baseUrl: null, status: 'NOT_APPLICABLE', statusMessage: null,
        },
        models: [{
          modelIdentifier: 'qwen3.8-max', name: 'qwen3.8-max', value: 'qwen3.8-max',
          canonicalName: 'qwen3.8-max', providerId: 'QWEN', providerName: 'Qwen',
          providerType: 'QWEN', runtime: 'autobyteus',
        }],
      }],
      availableAudioProvidersWithModels: [],
      availableImageProvidersWithModels: [],
      availableVideoProvidersWithModels: [],
    }
    let providerSettingsRequests = 0
    let catalogRequests = 0
    const query = vi.fn().mockImplementation(({ query: document }) => {
      if (document === GET_PROVIDER_SETTINGS) {
        providerSettingsRequests += 1
        if (providerSettingsRequests === 2) {
          return Promise.reject(new Error('provider settings network failure'))
        }
        return Promise.resolve({
          data: { providerSettings: providerSettingsRequests === 1 ? [initialGroup] : [recoveredGroup] },
        })
      }
      if (document === GET_AVAILABLE_LLM_PROVIDERS_WITH_MODELS) {
        catalogRequests += 1
        return Promise.resolve({ data: catalog })
      }
      if (document === GET_GEMINI_SETUP_CONFIG) {
        return Promise.resolve({
          data: {
            getGeminiSetupConfig: {
              activeMode: null, aiStudioConfigured: false,
              vertexExpressConfigured: false, vertexProject: null,
            },
          },
        })
      }
      if (document === GET_QWEN_SETUP_STATUS) {
        return Promise.resolve({ data: { qwenSetupStatus: status } })
      }
      throw new Error('Unexpected query')
    })
    const mutate = vi.fn().mockImplementation(({ mutation }) => {
      if (mutation === SAVE_QWEN_CONFIGURATION) {
        return Promise.resolve({ data: { saveQwenConfiguration: status } })
      }
      if (mutation === RELOAD_LLM_MODELS) {
        return Promise.resolve({ data: { reloadLlmModels: 'LLM models reloaded successfully' } })
      }
      throw new Error('Unexpected mutation')
    })
    vi.mocked(getApolloClient).mockReturnValue({ query, mutate } as any)
    const pinia = createPinia()
    setActivePinia(pinia)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const wrapper = mount(defineComponent({
      setup() {
        const runtime = useProviderApiKeySectionRuntime()
        return { runtime }
      },
      render: () => h('div'),
    }), { global: { plugins: [pinia] } })
    const runtime = (wrapper.vm as any).runtime
    const store = useLLMProviderConfigStore()

    await runtime.initialize()
    await expect(runtime.saveQwenConfiguration({
      baseUrl: status.effectiveBaseUrl,
      apiKey: 'synthetic-key',
    })).resolves.toBe(true)
    expect(store.providerSettingsGroups).toEqual([])
    expect(store.hasFetchedProviderSettings).toBe(false)

    await runtime.reloadAllModels()

    expect(providerSettingsRequests).toBe(3)
    expect(catalogRequests).toBe(2)
    expect(store.providerSettingsGroups).toEqual([recoveredGroup])
    expect(store.providersWithModels[0]?.models[0]?.modelIdentifier).toBe('qwen3.8-max')
    expect(runtime.allProvidersWithModels.value.find(({ id }: { id: string }) => id === 'QWEN'))
      .toEqual(expect.objectContaining({ apiKeyConfigured: true }))
    expect(runtime.selectedProviderLlmModels.value[0]?.modelIdentifier).toBe('qwen3.8-max')
    expect(runtime.notification.value.message).toContain('models_reloaded_successfully')
    consoleError.mockRestore()
  })
})
