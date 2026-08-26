import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = vi.hoisted(() => ({
  fetchProvidersWithModels: vi.fn(),
  refreshLocalCatalog: vi.fn(),
  ensureMissingDynamicProviders: vi.fn(),
  providersWithModelsForSelection: vi.fn(),
  providerSnapshots: vi.fn(),
}))
const runtimeAvailabilityStore = vi.hoisted(() => ({
  availabilities: [{ runtimeKind: 'autobyteus', enabled: true, reason: null }],
  fetchRuntimeAvailabilities: vi.fn(),
  isRuntimeEnabled: vi.fn(() => true),
  availabilityByKind: vi.fn(() => ({ runtimeKind: 'autobyteus', enabled: true, reason: null })),
  runtimeReason: vi.fn(() => null),
}))
vi.mock('~/stores/llmProviderConfig', () => ({
  useLLMProviderConfigStore: () => store,
}))
vi.mock('~/stores/runtimeAvailabilityStore', () => ({
  useRuntimeAvailabilityStore: () => runtimeAvailabilityStore,
}))

import { useRuntimeScopedModelSelection } from '../useRuntimeScopedModelSelection'

const deferred = () => {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((onResolve, onReject) => {
    resolve = onResolve
    reject = onReject
  })
  return { promise, reject, resolve }
}
const rows = (modelIdentifiers: string[]) => [{
  provider: {
    id: 'OPENAI', name: 'OpenAI', providerType: 'OPENAI',
    isCustom: false, baseUrl: null, catalogMode: 'STATIC',
  },
  models: modelIdentifiers.map(modelIdentifier => ({
    modelIdentifier,
    name: modelIdentifier,
    value: modelIdentifier,
    canonicalName: modelIdentifier,
    providerId: 'OPENAI', providerName: 'OpenAI', providerType: 'OPENAI', runtime: 'api',
  })),
}]
const snapshots = (state: 'IDLE' | 'READY' | 'ERROR' | 'STALE_ERROR') => [{
  runtimeKind: 'autobyteus',
  ownerProvider: rows([])[0]!.provider,
  sources: [{
    modelKind: 'LLM',
    state,
    modelCount: state === 'ERROR' ? 0 : 1,
    successfulUnitCount: state === 'ERROR' ? 0 : 1,
    failedUnitCount: state === 'ERROR' || state === 'STALE_ERROR' ? 1 : 0,
    safeMessage: state === 'ERROR' || state === 'STALE_ERROR' ? 'Discovery unavailable.' : null,
  }],
  llmModels: [], audioModels: [], imageModels: [], videoModels: [],
}]
const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

describe('useRuntimeScopedModelSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    runtimeAvailabilityStore.fetchRuntimeAvailabilities.mockResolvedValue(undefined)
    store.fetchProvidersWithModels.mockResolvedValue(undefined)
    store.refreshLocalCatalog.mockResolvedValue(undefined)
    store.ensureMissingDynamicProviders.mockResolvedValue(undefined)
    store.providersWithModelsForSelection.mockReturnValue([])
    store.providerSnapshots.mockReturnValue([])
  })

  it('publishes current rows immediately, then re-reads rows and source status after settlement', async () => {
    const dynamic = deferred()
    store.ensureMissingDynamicProviders.mockReturnValue(dynamic.promise)
    store.providersWithModelsForSelection
      .mockReturnValueOnce(rows(['gpt-4.1']))
      .mockReturnValue(rows(['gpt-4.1', 'gateway-model']))
    store.providerSnapshots
      .mockReturnValueOnce(snapshots('READY'))
      .mockReturnValue(snapshots('STALE_ERROR'))

    const selection = useRuntimeScopedModelSelection({ runtimeKind: ref('autobyteus') })
    await flush()

    expect(selection.isLoadingModels.value).toBe(false)
    expect(selection.modelIdentifiers.value).toEqual(['gpt-4.1'])
    expect(selection.providerSourceStatuses.value[0]?.sources[0]?.state).toBe('READY')
    expect(store.ensureMissingDynamicProviders).toHaveBeenCalledWith('autobyteus')

    dynamic.resolve()
    await flush()
    expect(selection.modelIdentifiers.value).toEqual(['gpt-4.1', 'gateway-model'])
    expect(selection.providerSourceStatuses.value[0]?.sources[0]).toMatchObject({
      state: 'STALE_ERROR',
      safeMessage: 'Discovery unavailable.',
    })
    expect(store.providersWithModelsForSelection).toHaveBeenCalledTimes(2)
    expect(store.providerSnapshots).toHaveBeenCalledTimes(2)
  })

  it('uses inherited runtime when the sparse stored runtime is absent', async () => {
    useRuntimeScopedModelSelection({
      runtimeKind: ref(null),
      inheritedRuntimeKind: ref('claude_agent_sdk'),
      useDefaultRuntimeFallback: false,
    })
    await flush()

    expect(store.fetchProvidersWithModels).toHaveBeenCalledExactlyOnceWith('claude_agent_sdk')
    expect(store.ensureMissingDynamicProviders).toHaveBeenCalledExactlyOnceWith('claude_agent_sdk')
  })

  it('does not query catalogs when stored and inherited runtime are blank and fallback is disabled', async () => {
    const selection = useRuntimeScopedModelSelection({
      runtimeKind: ref(''),
      inheritedRuntimeKind: ref(null),
      allowBlankRuntime: true,
      useDefaultRuntimeFallback: false,
    })
    await flush()

    expect(selection.effectiveRuntimeKind.value).toBeNull()
    expect(selection.modelIdentifiers.value).toEqual([])
    expect(selection.providerSourceStatuses.value).toEqual([])
    expect(store.fetchProvidersWithModels).not.toHaveBeenCalled()
    expect(store.ensureMissingDynamicProviders).not.toHaveBeenCalled()
  })

  it('logs only an unexpected aggregate rejection and still re-reads retained rows/status', async () => {
    const dynamic = deferred()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    store.ensureMissingDynamicProviders.mockReturnValue(dynamic.promise)
    store.providersWithModelsForSelection.mockReturnValue(rows(['retained-static']))
    store.providerSnapshots
      .mockReturnValueOnce(snapshots('READY'))
      .mockReturnValue(snapshots('ERROR'))

    const selection = useRuntimeScopedModelSelection({ runtimeKind: ref('autobyteus') })
    await flush()
    dynamic.reject(new Error('unexpected aggregate failure'))
    await flush()

    expect(consoleError).toHaveBeenCalledWith(
      "Failed to discover dynamic models for 'autobyteus'.",
      expect.objectContaining({ message: 'unexpected aggregate failure' }),
    )
    expect(selection.modelIdentifiers.value).toEqual(['retained-static'])
    expect(selection.providerSourceStatuses.value[0]?.sources[0]?.state).toBe('ERROR')
    expect(store.providersWithModelsForSelection).toHaveBeenCalledTimes(2)
    expect(store.providerSnapshots).toHaveBeenCalledTimes(2)
  })
})
