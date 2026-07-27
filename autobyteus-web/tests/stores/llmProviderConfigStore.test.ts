import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GET_AVAILABLE_LLM_PROVIDERS_WITH_MODELS,
  GET_PROVIDER_SETTINGS,
} from '~/graphql/queries/llm_provider_queries'
import {
  PROVIDER_SETTINGS_RUNTIME_KIND,
  useLLMProviderConfigStore,
} from '~/stores/llmProviderConfig'
import { getApolloClient } from '~/utils/apolloClient'

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn() }))

const provider = (id: string, apiKeyConfigured: boolean) => ({
  id,
  name: id === 'OPENAI' ? 'OpenAI' : id,
  providerType: id,
  isCustom: false,
  baseUrl: null,
  apiKeyConfigured,
  status: 'NOT_APPLICABLE',
  statusMessage: null,
})

const openAiGroup = (configured = true) => ({
  provider: provider('OPENAI', configured),
  llmModels: [{ modelIdentifier: 'gpt-4.1', name: 'GPT 4.1', providerType: 'OPENAI' }],
  audioModels: [{ modelIdentifier: 'whisper-1', name: 'Whisper', providerType: 'OPENAI' }],
  imageModels: [{ modelIdentifier: 'gpt-image-1', name: 'GPT Image', providerType: 'OPENAI' }],
  videoModels: [],
})

const customGatewayGroup = () => ({
  provider: {
    ...provider('provider_gateway', true),
    name: 'Gateway',
    providerType: 'OPENAI_COMPATIBLE',
    isCustom: true,
    baseUrl: 'https://gateway.example.com/v1',
  },
  llmModels: [{
    modelIdentifier: 'gateway-chat',
    name: 'Gateway Chat',
    providerType: 'OPENAI_COMPATIBLE',
  }],
  audioModels: [],
  imageModels: [],
  videoModels: [],
})

const catalogResponse = (runtimeKind: string) => ({
  availableLlmProvidersWithModels: [{
    provider: {
      id: runtimeKind,
      name: runtimeKind,
      providerType: runtimeKind,
      isCustom: false,
      baseUrl: null,
      status: 'NOT_APPLICABLE',
      statusMessage: null,
    },
    models: [{
      modelIdentifier: `${runtimeKind}-model`,
      name: `${runtimeKind} model`,
      value: `${runtimeKind}-model`,
      canonicalName: `${runtimeKind}-model`,
      providerId: runtimeKind,
      providerName: runtimeKind,
      providerType: runtimeKind,
      runtime: runtimeKind,
    }],
  }],
  availableAudioProvidersWithModels: [],
  availableImageProvidersWithModels: [],
  availableVideoProvidersWithModels: [],
})

const geminiState = (overrides: Record<string, unknown> = {}) => ({
  activeMode: null,
  aiStudioConfigured: false,
  vertexExpressConfigured: false,
  vertexProject: null,
  ...overrides,
})

describe('llmProviderConfig provider Settings store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('stores one provider-centric group without a parallel status map', async () => {
    const query = vi.fn().mockResolvedValue({ data: { providerSettings: [openAiGroup()] } })
    vi.mocked(getApolloClient).mockReturnValue({ query } as any)
    const store = useLLMProviderConfigStore()

    await expect(store.fetchProviderSettings()).resolves.toEqual([openAiGroup()])
    expect(store.providerSettingsGroups[0]?.provider.apiKeyConfigured).toBe(true)
    expect(store.providerSettingsGroups[0]?.audioModels).toHaveLength(1)
    expect('providerConfigs' in store).toBe(false)
  })

  it('keeps Settings on its AutoByteus cache identity across Codex and Claude catalog loads', async () => {
    const settingsGroups = [openAiGroup(), customGatewayGroup()]
    const query = vi.fn().mockImplementation(({ query: document, variables }) => {
      if (document === GET_PROVIDER_SETTINGS) {
        return Promise.resolve({ data: { providerSettings: settingsGroups } })
      }
      if (document === GET_AVAILABLE_LLM_PROVIDERS_WITH_MODELS) {
        return Promise.resolve({ data: catalogResponse(variables.runtimeKind) })
      }
      throw new Error('Unexpected query')
    })
    const mutate = vi.fn().mockResolvedValue({ data: { saveProviderApiKey: true } })
    vi.mocked(getApolloClient).mockReturnValue({ query, mutate } as any)
    const store = useLLMProviderConfigStore()

    await store.fetchProvidersWithModels('codex_app_server')
    await store.fetchProviderSettings()
    await store.fetchProvidersWithModels('claude_agent_sdk')
    await store.fetchProviderSettings()

    expect(store.modelRuntimeKind).toBe('claude_agent_sdk')
    expect(store.providerSettingsRuntimeKind).toBe(PROVIDER_SETTINGS_RUNTIME_KIND)
    expect(store.providerSettingsGroups).toEqual(settingsGroups)

    await store.setLLMProviderApiKey('OPENAI', 'synthetic-key')

    const settingsRequests = query.mock.calls
      .map(([request]) => request)
      .filter(request => request.query === GET_PROVIDER_SETTINGS)
    expect(settingsRequests).toHaveLength(2)
    expect(settingsRequests).toEqual([
      expect.objectContaining({
        variables: { runtimeKind: PROVIDER_SETTINGS_RUNTIME_KIND },
      }),
      expect.objectContaining({
        variables: { runtimeKind: PROVIDER_SETTINGS_RUNTIME_KIND },
        fetchPolicy: 'network-only',
      }),
    ])
    expect(store.providerSettingsGroups).toEqual(settingsGroups)
    expect(store.providerSettingsGroups[0]?.audioModels).toHaveLength(1)
    expect(store.providerSettingsGroups.some(group => group.provider.isCustom)).toBe(true)
  })

  it('refetches the canonical provider group after Boolean save completion', async () => {
    const mutate = vi.fn().mockResolvedValue({ data: { saveProviderApiKey: true } })
    const query = vi.fn().mockResolvedValue({ data: { providerSettings: [openAiGroup(true)] } })
    vi.mocked(getApolloClient).mockReturnValue({ mutate, query } as any)
    const store = useLLMProviderConfigStore()

    await expect(store.setLLMProviderApiKey('OPENAI', 'synthetic-key')).resolves.toBe(true)
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({
      variables: { providerId: 'OPENAI', apiKey: 'synthetic-key' },
    }))
    expect(query).toHaveBeenCalledWith(expect.objectContaining({
      variables: { runtimeKind: 'autobyteus' }, fetchPolicy: 'network-only',
    }))
    expect(store.providerSettingsGroups[0]?.provider.apiKeyConfigured).toBe(true)
  })

  it('refetches exact missing state after Boolean remove completion', async () => {
    const mutate = vi.fn().mockResolvedValue({ data: { removeProviderApiKey: true } })
    const query = vi.fn().mockResolvedValue({ data: { providerSettings: [openAiGroup(false)] } })
    vi.mocked(getApolloClient).mockReturnValue({ mutate, query } as any)
    const store = useLLMProviderConfigStore()

    await store.removeLLMProviderApiKey('OPENAI')
    expect(store.providerSettingsGroups[0]?.provider.apiKeyConfigured).toBe(false)
  })

  it('uses tight custom probe/create/delete contracts', async () => {
    const mutate = vi.fn()
      .mockResolvedValueOnce({ data: { probeCustomProvider: { discoveredModels: [{ id: 'm', name: 'M' }] } } })
      .mockResolvedValueOnce({ data: { createCustomProvider: 'provider_gateway' } })
      .mockResolvedValueOnce({ data: { deleteCustomProvider: true } })
    const query = vi.fn()
      .mockResolvedValue({ data: {
        providerSettings: [openAiGroup()],
        availableLlmProvidersWithModels: [],
        availableAudioProvidersWithModels: [],
        availableImageProvidersWithModels: [],
        availableVideoProvidersWithModels: [],
      } })
    vi.mocked(getApolloClient).mockReturnValue({ mutate, query } as any)
    const store = useLLMProviderConfigStore()
    const input = {
      name: 'Gateway', baseUrl: 'https://gateway.example.com/v1', apiKey: 'synthetic-key',
    }

    await expect(store.probeCustomProvider(input)).resolves.toEqual({
      discoveredModels: [{ id: 'm', name: 'M' }],
    })
    await expect(store.createCustomProvider(input)).resolves.toBe('provider_gateway')
    await expect(store.deleteCustomProvider('provider_gateway')).resolves.toBe(true)
    expect(mutate).toHaveBeenNthCalledWith(2, expect.objectContaining({ variables: { input } }))
    expect(mutate).toHaveBeenNthCalledWith(3, expect.objectContaining({
      variables: { providerId: 'provider_gateway' },
    }))
  })

  it('loads and stores the tight Gemini setup state', async () => {
    const state = geminiState({
      activeMode: 'VERTEX_PROJECT',
      vertexProject: { project: 'project-1', location: 'global' },
    })
    const query = vi.fn().mockResolvedValue({ data: { getGeminiSetupConfig: state } })
    vi.mocked(getApolloClient).mockReturnValue({ query } as any)
    const store = useLLMProviderConfigStore()

    await expect(store.fetchGeminiSetupConfig()).resolves.toEqual(state)
    expect(store.geminiSetup.vertexProject).toEqual({ project: 'project-1', location: 'global' })
  })

  it('routes each Gemini option through its specialized mutation and retains returned state', async () => {
    const state = geminiState({ activeMode: 'AI_STUDIO', aiStudioConfigured: true })
    const mutate = vi.fn().mockResolvedValue({ data: { saveGeminiAiStudio: state } })
    const query = vi.fn().mockResolvedValue({ data: { providerSettings: [openAiGroup()] } })
    vi.mocked(getApolloClient).mockReturnValue({ mutate, query } as any)
    const store = useLLMProviderConfigStore()

    await expect(store.saveGeminiConfigurationOption(
      { option: 'AI_STUDIO', apiKey: 'synthetic-key' }, true,
    )).resolves.toEqual(state)
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({
      variables: { apiKey: 'synthetic-key', activateAfterSave: true },
    }))
    expect(store.geminiSetup).toEqual(state)
  })

  it('preserves credential-independent catalog state for non-Settings consumers', async () => {
    const query = vi.fn().mockResolvedValue({ data: {
      availableLlmProvidersWithModels: [{
        provider: { ...provider('OPENAI', false), apiKeyConfigured: undefined },
        models: [{ modelIdentifier: 'gpt', providerType: 'OPENAI', value: 'gpt', canonicalName: 'gpt' }],
      }],
      availableAudioProvidersWithModels: [],
      availableImageProvidersWithModels: [],
      availableVideoProvidersWithModels: [],
    } })
    vi.mocked(getApolloClient).mockReturnValue({ query } as any)
    const store = useLLMProviderConfigStore()

    await store.fetchProvidersWithModels()
    expect(store.models).toEqual(['gpt'])
    expect(store.providersWithModels[0]?.provider).not.toHaveProperty('credentialStatus')
  })
})
