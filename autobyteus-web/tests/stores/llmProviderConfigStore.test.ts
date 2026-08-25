import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GET_PROVIDER_CREDENTIAL_SETTINGS,
  GET_PROVIDER_MODEL_CATALOG_SNAPSHOTS,
} from '~/graphql/queries/llm_provider_queries'
import {
  DELETE_CUSTOM_PROVIDER,
  ENSURE_PROVIDER_MODEL_CATALOG,
  RELOAD_PROVIDER_MODEL_CATALOG,
  SAVE_PROVIDER_API_KEY,
} from '~/graphql/mutations/llm_provider_mutations'
import {
  PROVIDER_SETTINGS_RUNTIME_KIND,
  useLLMProviderConfigStore,
} from '~/stores/llmProviderConfig'
import { getApolloClient } from '~/utils/apolloClient'

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn() }))

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve
    reject = onReject
  })
  return { promise, resolve, reject }
}

const provider = (id: string, catalogMode: 'STATIC' | 'DISCOVERED' = 'STATIC') => ({
  id,
  name: id === 'OPENAI' ? 'OpenAI' : id,
  providerType: id,
  isCustom: false,
  baseUrl: null,
  catalogMode,
})
const setting = (id: string, apiKeyConfigured: boolean, catalogMode: 'STATIC' | 'DISCOVERED' = 'STATIC') => ({
  provider: provider(id, catalogMode),
  apiKeyConfigured,
})
const model = (id: string, owner = 'AUTOBYTEUS') => ({
  modelIdentifier: id,
  name: id,
  value: id,
  canonicalName: id,
  providerId: owner,
  providerName: owner,
  providerType: owner,
  runtime: 'api',
})
const snapshot = (
  owner: string,
  state: 'IDLE' | 'LOADING' | 'READY' | 'PARTIAL' | 'REFRESHING' | 'STALE_ERROR' | 'ERROR',
  rows: string[] = [],
  runtimeKind = 'autobyteus',
) => ({
  runtimeKind,
  ownerProvider: provider(owner, owner === 'OPENAI' ? 'STATIC' : 'DISCOVERED'),
  sources: owner === 'OPENAI' ? [] : [{
    modelKind: 'LLM', state, modelCount: rows.length,
    successfulUnitCount: state === 'READY' ? 1 : 0,
    failedUnitCount: state === 'ERROR' || state === 'STALE_ERROR' ? 1 : 0,
    safeMessage: state === 'ERROR' || state === 'STALE_ERROR' ? 'MODEL_DISCOVERY_UNAVAILABLE' : null,
  }],
  llmModels: rows.map(id => model(id, owner)),
  audioModels: [],
  imageModels: [],
  videoModels: [],
})
const catalogResponse = (runtimeKind: string, rows = ['current']) => ({
  providerModelCatalogSnapshots: [snapshot(
    runtimeKind === 'autobyteus' ? 'AUTOBYTEUS' : runtimeKind.toUpperCase(),
    'READY',
    rows.map(row => `${runtimeKind}-${row}`),
    runtimeKind,
  )],
})
const autobyteusMultimediaSnapshot = (suffix: string) => ({
  runtimeKind: 'autobyteus',
  ownerProvider: provider('AUTOBYTEUS', 'DISCOVERED'),
  sources: (['LLM', 'AUDIO', 'IMAGE'] as const).map(modelKind => ({
    modelKind,
    state: 'READY' as const,
    modelCount: 1,
    successfulUnitCount: 1,
    failedUnitCount: 0,
    safeMessage: null,
  })),
  llmModels: [model(`llm-${suffix}`)],
  audioModels: [model(`audio-${suffix}`)],
  imageModels: [model(`image-${suffix}`)],
  videoModels: [model(`video-${suffix}`)],
})

describe('llmProviderConfig provider-scoped catalog state', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    useLLMProviderConfigStore().resetCatalogState()
  })

  it('loads credential settings without starting a model catalog query', async () => {
    const query = vi.fn().mockResolvedValue({
      data: { providerCredentialSettings: [setting('OPENAI', true)] },
    })
    vi.mocked(getApolloClient).mockReturnValue({ query } as never)
    const store = useLLMProviderConfigStore()

    await expect(store.fetchProviderCredentialSettings()).resolves.toEqual([setting('OPENAI', true)])
    expect(query).toHaveBeenCalledWith(expect.objectContaining({
      query: GET_PROVIDER_CREDENTIAL_SETTINGS,
      variables: { runtimeKind: PROVIDER_SETTINGS_RUNTIME_KIND },
    }))
    expect(query).not.toHaveBeenCalledWith(expect.objectContaining({
      query: GET_PROVIDER_MODEL_CATALOG_SNAPSHOTS,
    }))
  })

  it('keeps runtime snapshots isolated and requires explicit runtime reads', async () => {
    const query = vi.fn().mockImplementation(({ variables }) => Promise.resolve({
      data: catalogResponse(variables.runtimeKind),
    }))
    vi.mocked(getApolloClient).mockReturnValue({ query } as never)
    const store = useLLMProviderConfigStore()

    await store.fetchProvidersWithModels('codex_app_server')
    await store.fetchProvidersWithModels('claude_agent_sdk')

    expect(store.models('codex_app_server')).toEqual(['codex_app_server-current'])
    expect(store.models('claude_agent_sdk')).toEqual(['claude_agent_sdk-current'])
    expect(store.catalogSnapshot('autobyteus').state).toBe('idle')
    expect(() => store.models(undefined as never)).toThrow('runtimeKind is required')
  })

  it('coalesces same-runtime local snapshot reads while allowing cross-runtime concurrency', async () => {
    const autobyteus = deferred<unknown>()
    const codex = deferred<unknown>()
    const query = vi.fn().mockImplementation(({ variables }) =>
      variables.runtimeKind === 'autobyteus' ? autobyteus.promise : codex.promise)
    vi.mocked(getApolloClient).mockReturnValue({ query } as never)
    const store = useLLMProviderConfigStore()

    const first = store.fetchProvidersWithModels('autobyteus')
    const joined = store.fetchProvidersWithModels('autobyteus')
    const independent = store.fetchProvidersWithModels('codex_app_server')
    expect(query).toHaveBeenCalledTimes(2)
    codex.resolve({ data: catalogResponse('codex_app_server') })
    await expect(independent).resolves.toMatchObject({ runtimeKind: 'codex_app_server', state: 'ready' })
    autobyteus.resolve({ data: catalogResponse('autobyteus') })
    await expect(first).resolves.toMatchObject({ state: 'ready' })
    await expect(joined).resolves.toMatchObject({ state: 'ready' })
  })

  it('runs exact-provider ensure/reload mutations and retains rows while refreshing', async () => {
    const reload = deferred<unknown>()
    const query = vi.fn().mockResolvedValue({
      data: { providerModelCatalogSnapshots: [snapshot('AUTOBYTEUS', 'READY', ['known'])] },
    })
    const mutate = vi.fn()
      .mockResolvedValueOnce({ data: { ensureProviderModelCatalog: snapshot('AUTOBYTEUS', 'READY', ['known']) } })
      .mockReturnValueOnce(reload.promise)
    vi.mocked(getApolloClient).mockReturnValue({ query, mutate } as never)
    const store = useLLMProviderConfigStore()
    await store.fetchProvidersWithModels('autobyteus')

    await store.ensureProviderModelCatalog('autobyteus', 'AUTOBYTEUS')
    expect(mutate).toHaveBeenNthCalledWith(1, expect.objectContaining({
      mutation: ENSURE_PROVIDER_MODEL_CATALOG,
      variables: { providerId: 'AUTOBYTEUS', runtimeKind: 'autobyteus' },
    }))

    const action = store.reloadProvider('autobyteus', 'AUTOBYTEUS')
    expect(store.models('autobyteus')).toEqual(['known'])
    expect(store.providerSnapshot('autobyteus', 'AUTOBYTEUS')?.sources[0]?.state).toBe('REFRESHING')
    reload.resolve({ data: { reloadProviderModelCatalog: snapshot('AUTOBYTEUS', 'READY', ['current']) } })
    await expect(action).resolves.toMatchObject({ llmModels: [expect.objectContaining({ modelIdentifier: 'current' })] })
    expect(mutate).toHaveBeenNthCalledWith(2, expect.objectContaining({ mutation: RELOAD_PROVIDER_MODEL_CATALOG }))
  })

  it('settles missing-provider failures while retaining stale rows and explicit source status', async () => {
    const query = vi.fn().mockResolvedValue({
      data: {
        providerModelCatalogSnapshots: [
          snapshot('AUTOBYTEUS', 'IDLE', ['retained']),
          snapshot('OLLAMA', 'IDLE'),
        ],
      },
    })
    const mutate = vi.fn().mockImplementation(({ variables }) =>
      variables.providerId === 'AUTOBYTEUS'
        ? Promise.reject(new Error('sensitive discovery failure'))
        : Promise.resolve({
            data: { ensureProviderModelCatalog: snapshot('OLLAMA', 'READY', ['local-current']) },
          }))
    vi.mocked(getApolloClient).mockReturnValue({ query, mutate } as never)
    const store = useLLMProviderConfigStore()

    await expect(store.ensureMissingDynamicProviders('autobyteus')).resolves.toBeUndefined()
    expect(mutate).toHaveBeenCalledTimes(2)
    expect(store.providerSnapshot('autobyteus', 'AUTOBYTEUS')).toMatchObject({
      llmModels: [expect.objectContaining({ modelIdentifier: 'retained' })],
      sources: [expect.objectContaining({
        state: 'STALE_ERROR',
        safeMessage: 'MODEL_CATALOG_REQUEST_FAILED',
      })],
    })
    expect(store.providerSnapshot('autobyteus', 'OLLAMA')).toMatchObject({
      llmModels: [expect.objectContaining({ modelIdentifier: 'local-current' })],
      sources: [expect.objectContaining({ state: 'READY' })],
    })
  })

  it('prevents an older provider request from overwriting its newer generation', async () => {
    const old = deferred<unknown>()
    const current = deferred<unknown>()
    const query = vi.fn().mockResolvedValue({
      data: { providerModelCatalogSnapshots: [snapshot('AUTOBYTEUS', 'IDLE')] },
    })
    const mutate = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    vi.mocked(getApolloClient).mockReturnValue({ query, mutate } as never)
    const store = useLLMProviderConfigStore()
    await store.fetchProvidersWithModels('autobyteus')

    const oldAction = store.ensureProviderModelCatalog('autobyteus', 'AUTOBYTEUS')
    const currentAction = store.reloadProvider('autobyteus', 'AUTOBYTEUS')
    current.resolve({ data: { reloadProviderModelCatalog: snapshot('AUTOBYTEUS', 'READY', ['current']) } })
    await currentAction
    old.resolve({ data: { ensureProviderModelCatalog: snapshot('AUTOBYTEUS', 'READY', ['old']) } })
    await oldAction
    expect(store.models('autobyteus')).toEqual(['current'])
  })

  it('clears exact discovery-setting sources before a guarded non-forcing ensure', async () => {
    const old = deferred<unknown>()
    const current = deferred<unknown>()
    const mutate = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    vi.mocked(getApolloClient).mockReturnValue({ mutate } as never)
    const store = useLLMProviderConfigStore()
    store.applyProviderSnapshotLocal('autobyteus', autobyteusMultimediaSnapshot('known'))

    const oldAction = store.ensureProviderModelCatalog('autobyteus', 'AUTOBYTEUS')
    const convergence = store.convergeAfterDiscoverySettingCommit('autobyteus', {
      ownerProviderId: 'AUTOBYTEUS',
      modelKinds: ['LLM', 'AUDIO', 'IMAGE'],
    })

    const during = store.providerSnapshot('autobyteus', 'AUTOBYTEUS')!
    expect(during.llmModels).toEqual([])
    expect(during.audioModels).toEqual([])
    expect(during.imageModels).toEqual([])
    expect(during.videoModels.map(row => row.modelIdentifier)).toEqual(['video-known'])
    expect(during.sources).toEqual(expect.arrayContaining([
      expect.objectContaining({ modelKind: 'LLM', state: 'LOADING', modelCount: 0, safeMessage: null }),
      expect.objectContaining({ modelKind: 'AUDIO', state: 'LOADING', modelCount: 0, safeMessage: null }),
      expect.objectContaining({ modelKind: 'IMAGE', state: 'LOADING', modelCount: 0, safeMessage: null }),
    ]))
    expect(mutate).toHaveBeenNthCalledWith(2, expect.objectContaining({
      mutation: ENSURE_PROVIDER_MODEL_CATALOG,
      variables: { providerId: 'AUTOBYTEUS', runtimeKind: 'autobyteus' },
    }))

    current.resolve({ data: { ensureProviderModelCatalog: autobyteusMultimediaSnapshot('current') } })
    await convergence
    old.resolve({ data: { ensureProviderModelCatalog: autobyteusMultimediaSnapshot('old') } })
    await oldAction

    const final = store.providerSnapshot('autobyteus', 'AUTOBYTEUS')!
    expect(final.llmModels.map(row => row.modelIdentifier)).toEqual(['llm-current'])
    expect(final.videoModels.map(row => row.modelIdentifier)).toEqual(['video-current'])
  })

  it('does not let an older whole-catalog read replace a newer exact-provider convergence', async () => {
    const wholeCatalog = deferred<unknown>()
    const currentEnsure = deferred<unknown>()
    const query = vi.fn().mockReturnValue(wholeCatalog.promise)
    const mutate = vi.fn().mockReturnValue(currentEnsure.promise)
    vi.mocked(getApolloClient).mockReturnValue({ query, mutate } as never)
    const store = useLLMProviderConfigStore()

    const oldRead = store.fetchProvidersWithModels('autobyteus')
    const convergence = store.convergeAfterDiscoverySettingCommit('autobyteus', {
      ownerProviderId: 'AUTOBYTEUS',
      modelKinds: ['LLM', 'AUDIO', 'IMAGE'],
    })
    currentEnsure.resolve({
      data: { ensureProviderModelCatalog: snapshot('AUTOBYTEUS', 'READY', ['current-endpoint']) },
    })
    await convergence

    wholeCatalog.resolve({
      data: {
        providerModelCatalogSnapshots: [
          snapshot('AUTOBYTEUS', 'READY', ['old-endpoint']),
          snapshot('OPENAI', 'READY', ['unrelated']),
        ],
      },
    })
    await oldRead

    expect(store.providerSnapshot('autobyteus', 'AUTOBYTEUS')?.llmModels
      .map(row => row.modelIdentifier)).toEqual(['current-endpoint'])
    expect(store.providerSnapshot('autobyteus', 'OPENAI')?.llmModels
      .map(row => row.modelIdentifier)).toEqual(['unrelated'])
  })

  it('does not let an older whole-catalog read republish a deleted custom provider', async () => {
    const wholeCatalog = deferred<unknown>()
    const query = vi.fn().mockReturnValue(wholeCatalog.promise)
    const mutate = vi.fn().mockResolvedValue({
      data: { deleteCustomProvider: { providerId: 'provider_gateway', deleted: true } },
    })
    vi.mocked(getApolloClient).mockReturnValue({ query, mutate } as never)
    const store = useLLMProviderConfigStore()
    const customSnapshot = {
      ...snapshot('provider_gateway', 'READY', ['known-custom']),
      ownerProvider: {
        ...provider('provider_gateway', 'DISCOVERED'),
        name: 'Internal Gateway',
        providerType: 'OPENAI_COMPATIBLE',
        isCustom: true,
        baseUrl: 'https://gateway.example/v1',
      },
    }
    store.applyProviderSnapshotLocal('autobyteus', customSnapshot as never)
    store.applyProviderSnapshotLocal('autobyteus', snapshot('OPENAI', 'READY', ['previous-unrelated']))
    store.providerCredentialSettings = [{
      provider: customSnapshot.ownerProvider,
      apiKeyConfigured: true,
    }] as never
    store.catalogByRuntimeKind.autobyteus!.state = 'idle'

    const oldRead = store.fetchProvidersWithModels('autobyteus')
    await expect(store.deleteCustomProvider('provider_gateway')).resolves.toBe(true)
    expect(store.providerSnapshot('autobyteus', 'provider_gateway')).toBeNull()
    expect(store.providerCredentialSettings).toEqual([])

    wholeCatalog.resolve({
      data: {
        providerModelCatalogSnapshots: [
          { ...customSnapshot, llmModels: [model('stale-custom', 'provider_gateway')] },
          snapshot('OPENAI', 'READY', ['current-unrelated']),
        ],
      },
    })
    await oldRead

    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({
      mutation: DELETE_CUSTOM_PROVIDER,
      variables: { providerId: 'provider_gateway' },
    }))
    expect(store.providerSnapshot('autobyteus', 'provider_gateway')).toBeNull()
    expect(store.models('autobyteus')).toEqual(['current-unrelated'])
  })

  it('localizes transport failure to the exact provider and retains last-known rows', async () => {
    const query = vi.fn().mockResolvedValue({
      data: { providerModelCatalogSnapshots: [snapshot('AUTOBYTEUS', 'READY', ['known'])] },
    })
    const mutate = vi.fn().mockRejectedValue(new Error('sensitive transport response'))
    vi.mocked(getApolloClient).mockReturnValue({ query, mutate } as never)
    const store = useLLMProviderConfigStore()
    await store.fetchProvidersWithModels('autobyteus')

    await expect(store.reloadProvider('autobyteus', 'AUTOBYTEUS'))
      .rejects.toThrow('sensitive transport response')
    expect(store.models('autobyteus')).toEqual(['known'])
    expect(store.providerSnapshot('autobyteus', 'AUTOBYTEUS')?.sources[0]).toMatchObject({
      state: 'STALE_ERROR', safeMessage: 'MODEL_CATALOG_REQUEST_FAILED',
    })
  })

  it('invalidates late catalog reads on reset', async () => {
    const late = deferred<unknown>()
    const query = vi.fn().mockReturnValue(late.promise)
    vi.mocked(getApolloClient).mockReturnValue({ query } as never)
    const store = useLLMProviderConfigStore()

    const action = store.fetchProvidersWithModels('autobyteus')
    store.resetCatalogState()
    late.resolve({ data: catalogResponse('autobyteus', ['late']) })
    await expect(action).resolves.toMatchObject({ state: 'idle' })
    expect(store.models('autobyteus')).toEqual([])
  })

  it('applies an exact credential save without any model query or mutation', async () => {
    const mutate = vi.fn().mockResolvedValue({ data: { saveProviderApiKey: setting('OPENAI', true) } })
    const query = vi.fn()
    vi.mocked(getApolloClient).mockReturnValue({ mutate, query } as never)
    const store = useLLMProviderConfigStore()

    await expect(store.setLLMProviderApiKey('OPENAI', 'synthetic-key'))
      .resolves.toEqual(setting('OPENAI', true))
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ mutation: SAVE_PROVIDER_API_KEY }))
    expect(mutate).toHaveBeenCalledTimes(1)
    expect(query).not.toHaveBeenCalled()
  })
})
