import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { getApolloClient } from '~/utils/apolloClient'

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(),
}))

describe('llmProviderConfig Gemini setup', () => {
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
    expect(mutateMock).toHaveBeenCalledTimes(1)
    expect(queryMock).toHaveBeenCalledTimes(1)
    expect(store.geminiSetup.mode).toBe('AI_STUDIO')
    expect(store.geminiSetup.geminiApiKeyConfigured).toBe(true)
  })

  it('setGeminiSetupConfig sends Vertex Express payload and refreshes state', async () => {
    const mutateMock = vi.fn().mockResolvedValue({
      data: {
        setGeminiSetupConfig: 'Gemini setup for mode VERTEX_EXPRESS has been saved successfully.',
      },
      errors: undefined,
    })
    const queryMock = vi.fn().mockResolvedValue({
      data: {
        getGeminiSetupConfig: {
          mode: 'VERTEX_EXPRESS',
          geminiApiKeyConfigured: false,
          vertexApiKeyConfigured: true,
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
      mode: 'VERTEX_EXPRESS',
      vertexApiKey: 'vertex-express-key',
    })

    expect(success).toBe(true)
    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      variables: {
        mode: 'VERTEX_EXPRESS',
        geminiApiKey: null,
        vertexApiKey: 'vertex-express-key',
        vertexProject: null,
        vertexLocation: null,
      },
    }))
    expect(queryMock).toHaveBeenCalledTimes(1)
    expect(store.geminiSetup.mode).toBe('VERTEX_EXPRESS')
    expect(store.geminiSetup.vertexApiKeyConfigured).toBe(true)
  })

  it('setGeminiSetupConfig sends Vertex Project payload and refreshes state', async () => {
    const mutateMock = vi.fn().mockResolvedValue({
      data: {
        setGeminiSetupConfig: 'Gemini setup for mode VERTEX_PROJECT has been saved successfully.',
      },
      errors: undefined,
    })
    const queryMock = vi.fn().mockResolvedValue({
      data: {
        getGeminiSetupConfig: {
          mode: 'VERTEX_PROJECT',
          geminiApiKeyConfigured: false,
          vertexApiKeyConfigured: false,
          vertexProject: 'my-project-id',
          vertexLocation: 'us-central1',
        },
      },
    })

    vi.mocked(getApolloClient).mockReturnValue({
      mutate: mutateMock,
      query: queryMock,
    } as any)

    const store = useLLMProviderConfigStore()
    const success = await store.setGeminiSetupConfig({
      mode: 'VERTEX_PROJECT',
      vertexProject: 'my-project-id',
      vertexLocation: 'us-central1',
    })

    expect(success).toBe(true)
    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      variables: {
        mode: 'VERTEX_PROJECT',
        geminiApiKey: null,
        vertexApiKey: null,
        vertexProject: 'my-project-id',
        vertexLocation: 'us-central1',
      },
    }))
    expect(queryMock).toHaveBeenCalledTimes(1)
    expect(store.geminiSetup.mode).toBe('VERTEX_PROJECT')
    expect(store.geminiSetup.vertexProject).toBe('my-project-id')
    expect(store.geminiSetup.vertexLocation).toBe('us-central1')
  })
})
