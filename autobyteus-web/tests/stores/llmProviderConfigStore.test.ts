import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { getApolloClient } from '~/utils/apolloClient'

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(),
}))

const openAiRow = {
  provider: {
    id: 'OPENAI',
    name: 'OpenAI',
    providerType: 'OPENAI',
    isCustom: false,
    baseUrl: null,
    apiKeyConfigured: true,
    status: 'NOT_APPLICABLE',
    statusMessage: null,
  },
  models: [
    {
      modelIdentifier: 'gpt-4o',
      name: 'GPT-4o',
      value: 'gpt-4o',
      canonicalName: 'gpt-4o',
      providerId: 'OPENAI',
      providerName: 'OpenAI',
      providerType: 'OPENAI',
      runtime: 'api',
      hostUrl: null,
      configSchema: null,
      maxContextTokens: 128000,
      activeContextTokens: 32768,
      maxInputTokens: null,
      maxOutputTokens: null,
    },
  ],
}

const geminiRow = {
  provider: {
    id: 'GEMINI',
    name: 'Gemini',
    providerType: 'GEMINI',
    isCustom: false,
    baseUrl: null,
    apiKeyConfigured: false,
    status: 'NOT_APPLICABLE',
    statusMessage: null,
  },
  models: [
    {
      modelIdentifier: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      value: 'gemini-2.5-flash',
      canonicalName: 'gemini-2.5-flash',
      providerId: 'GEMINI',
      providerName: 'Gemini',
      providerType: 'GEMINI',
      runtime: 'api',
      hostUrl: null,
      configSchema: null,
      maxContextTokens: 1048576,
      activeContextTokens: 32768,
      maxInputTokens: null,
      maxOutputTokens: null,
    },
  ],
}

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object') {
    Object.freeze(value)
    for (const nested of Object.values(value as Record<string, unknown>)) {
      if (nested && typeof nested === 'object' && !Object.isFrozen(nested)) {
        deepFreeze(nested)
      }
    }
  }

  return value
}

describe('llmProviderConfig store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetchGeminiSetupConfig populates geminiSetup state', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      data: {
        getGeminiSetupConfig: {
          mode: 'VERTEX_PROJECT',
          geminiApiKeyConfigured: false,
          vertexApiKeyConfigured: false,
          vertexProject: 'project-1',
          vertexLocation: 'us-central1',
        },
      },
    })

    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any)

    const store = useLLMProviderConfigStore()
    const result = await store.fetchGeminiSetupConfig()

    expect(queryMock).toHaveBeenCalledTimes(1)
    expect(result.mode).toBe('VERTEX_PROJECT')
    expect(store.geminiSetup.vertexProject).toBe('project-1')
  })

  it('fetchProvidersWithModels stores provider objects and provider-centered model metadata', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      data: {
        availableLlmProvidersWithModels: [openAiRow],
        availableAudioProvidersWithModels: [],
        availableImageProvidersWithModels: [],
      },
    })

    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any)

    const store = useLLMProviderConfigStore()
    const providers = await store.fetchProvidersWithModels('autobyteus')

    expect(queryMock).toHaveBeenCalledTimes(1)
    expect(providers).toHaveLength(1)
    expect(store.providersWithModels[0]?.provider).toEqual(expect.objectContaining({
      id: 'OPENAI',
      name: 'OpenAI',
      apiKeyConfigured: true,
    }))
    expect(store.providersWithModels[0]?.models[0]).toEqual(expect.objectContaining({
      providerId: 'OPENAI',
      providerName: 'OpenAI',
      providerType: 'OPENAI',
      maxContextTokens: 128000,
      activeContextTokens: 32768,
    }))
  })

  it('getLLMProviderApiKeyConfigured uses hydrated provider booleans before querying', async () => {
    const queryMock = vi.fn()
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any)

    const store = useLLMProviderConfigStore()
    store.providersWithModels = [openAiRow as any]

    const configured = await store.getLLMProviderApiKeyConfigured('OPENAI')

    expect(configured).toBe(true)
    expect(queryMock).not.toHaveBeenCalled()
    expect(store.providerConfigs.OPENAI?.apiKeyConfigured).toBe(true)
  })

  it('setLLMProviderApiKey updates configured state after a successful write-only save', async () => {
    const mutateMock = vi.fn().mockResolvedValue({
      data: {
        setLlmProviderApiKey: 'API key for provider OpenAI has been set successfully.',
      },
      errors: undefined,
    })
    vi.mocked(getApolloClient).mockReturnValue({ mutate: mutateMock } as any)

    const store = useLLMProviderConfigStore()
    store.providersWithModels = [
      {
        ...openAiRow,
        provider: {
          ...openAiRow.provider,
          apiKeyConfigured: false,
        },
      } as any,
    ]

    const success = await store.setLLMProviderApiKey('OPENAI', 'runtime-key')

    expect(success).toBe(true)
    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      variables: { providerId: 'OPENAI', apiKey: 'runtime-key' },
    }))
    expect(store.providerConfigs.OPENAI?.apiKeyConfigured).toBe(true)
    expect(store.providersWithModels[0]?.provider.apiKeyConfigured).toBe(true)
  })

  it('setLLMProviderApiKey replaces immutable provider rows instead of mutating Apollo query results in place', async () => {
    const mutateMock = vi.fn().mockResolvedValue({
      data: {
        setLlmProviderApiKey: 'API key for provider OpenAI has been set successfully.',
      },
      errors: undefined,
    })
    vi.mocked(getApolloClient).mockReturnValue({ mutate: mutateMock } as any)

    const store = useLLMProviderConfigStore()
    const frozenRow = deepFreeze({
      ...openAiRow,
      provider: {
        ...openAiRow.provider,
        apiKeyConfigured: false,
      },
    }) as any
    store.providersWithModels = [frozenRow]

    const success = await store.setLLMProviderApiKey('OPENAI', 'runtime-key')

    expect(success).toBe(true)
    expect(store.providersWithModels[0]?.provider.apiKeyConfigured).toBe(true)
    expect(store.providersWithModels[0]).not.toBe(frozenRow)
    expect(store.providersWithModels[0]?.provider).not.toBe(frozenRow.provider)
  })

  it('createCustomProvider saves then refreshes the provider list', async () => {
    const mutateMock = vi.fn().mockResolvedValue({
      data: {
        createCustomLlmProvider: {
          id: 'provider_gateway',
          name: 'Internal Gateway',
          providerType: 'OPENAI_COMPATIBLE',
          isCustom: true,
          baseUrl: 'https://gateway.example.com/v1',
          apiKeyConfigured: true,
          status: 'READY',
          statusMessage: null,
        },
      },
      errors: undefined,
    })
    const queryMock = vi.fn().mockResolvedValue({
      data: {
        availableLlmProvidersWithModels: [openAiRow],
        availableAudioProvidersWithModels: [],
        availableImageProvidersWithModels: [],
      },
    })

    vi.mocked(getApolloClient).mockReturnValue({
      mutate: mutateMock,
      query: queryMock,
    } as any)

    const store = useLLMProviderConfigStore()
    const provider = await store.createCustomProvider({
      name: 'Internal Gateway',
      providerType: 'OPENAI_COMPATIBLE',
      baseUrl: 'https://gateway.example.com/v1',
      apiKey: 'secret',
    }, 'autobyteus')

    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      variables: {
        input: {
          name: 'Internal Gateway',
          providerType: 'OPENAI_COMPATIBLE',
          baseUrl: 'https://gateway.example.com/v1',
          apiKey: 'secret',
        },
        runtimeKind: 'autobyteus',
      },
    }))
    expect(queryMock).toHaveBeenCalledWith(expect.objectContaining({
      variables: { runtimeKind: 'autobyteus' },
      fetchPolicy: 'network-only',
    }))
    expect(provider).toEqual(expect.objectContaining({
      id: 'provider_gateway',
      name: 'Internal Gateway',
      isCustom: true,
    }))
  })

  it('deleteCustomProvider removes stale provider config and refreshes the provider list', async () => {
    const mutateMock = vi.fn().mockResolvedValue({
      data: {
        deleteCustomLlmProvider: 'Deleted custom provider Internal Gateway successfully.',
      },
      errors: undefined,
    })
    const queryMock = vi.fn().mockResolvedValue({
      data: {
        availableLlmProvidersWithModels: [openAiRow],
        availableAudioProvidersWithModels: [],
        availableImageProvidersWithModels: [],
      },
    })

    vi.mocked(getApolloClient).mockReturnValue({ mutate: mutateMock, query: queryMock } as any)

    const store = useLLMProviderConfigStore()
    store.providerConfigs = {
      OPENAI: { apiKeyConfigured: true },
      provider_gateway: { apiKeyConfigured: true },
    }

    const success = await store.deleteCustomProvider('provider_gateway', 'autobyteus')

    expect(success).toBe(true)
    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      variables: { providerId: 'provider_gateway', runtimeKind: 'autobyteus' },
    }))
    expect(queryMock).toHaveBeenCalledWith(expect.objectContaining({
      variables: { runtimeKind: 'autobyteus' },
      fetchPolicy: 'network-only',
    }))
    expect(store.providerConfigs.provider_gateway).toBeUndefined()
  })

  it('setGeminiSetupConfig saves and refreshes geminiSetup state', async () => {
    const mutateMock = vi.fn().mockResolvedValue({
      data: {
        setGeminiSetupConfig: 'Gemini setup for mode AI_STUDIO has been saved successfully.',
      },
      errors: undefined,
    })
    const queryMock = vi.fn().mockResolvedValue({
      data: {
        getGeminiSetupConfig: {
          mode: 'AI_STUDIO',
          geminiApiKeyConfigured: true,
          vertexApiKeyConfigured: false,
          vertexProject: null,
          vertexLocation: null,
        },
      },
    })

    vi.mocked(getApolloClient).mockReturnValue({
      mutate: mutateMock,
      query: queryMock,
    } as any)

    const store = useLLMProviderConfigStore()
    const success = await store.setGeminiSetupConfig({
      mode: 'AI_STUDIO',
      geminiApiKey: 'gemini-key',
    })

    expect(success).toBe(true)
    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      variables: {
        mode: 'AI_STUDIO',
        geminiApiKey: 'gemini-key',
        vertexApiKey: null,
        vertexProject: null,
        vertexLocation: null,
      },
    }))
    expect(queryMock).toHaveBeenCalledTimes(1)
    expect(store.geminiSetup.mode).toBe('AI_STUDIO')
    expect(store.geminiSetup.geminiApiKeyConfigured).toBe(true)
  })

  it('setGeminiSetupConfig replaces immutable Gemini provider rows instead of mutating hydrated query results in place', async () => {
    const mutateMock = vi.fn().mockResolvedValue({
      data: {
        setGeminiSetupConfig: 'Gemini setup for mode AI_STUDIO has been saved successfully.',
      },
      errors: undefined,
    })
    const queryMock = vi.fn().mockResolvedValue({
      data: {
        getGeminiSetupConfig: {
          mode: 'AI_STUDIO',
          geminiApiKeyConfigured: true,
          vertexApiKeyConfigured: false,
          vertexProject: null,
          vertexLocation: null,
        },
      },
    })

    vi.mocked(getApolloClient).mockReturnValue({
      mutate: mutateMock,
      query: queryMock,
    } as any)

    const store = useLLMProviderConfigStore()
    const frozenRow = deepFreeze(geminiRow) as any
    store.providersWithModels = [frozenRow]

    const success = await store.setGeminiSetupConfig({
      mode: 'AI_STUDIO',
      geminiApiKey: 'gemini-key',
    })

    expect(success).toBe(true)
    expect(store.providerConfigs.GEMINI?.apiKeyConfigured).toBe(true)
    expect(store.providersWithModels[0]?.provider.apiKeyConfigured).toBe(true)
    expect(store.providersWithModels[0]).not.toBe(frozenRow)
    expect(store.providersWithModels[0]?.provider).not.toBe(frozenRow.provider)
    expect(queryMock).toHaveBeenCalledWith(expect.objectContaining({
      fetchPolicy: 'network-only',
    }))
  })
})
