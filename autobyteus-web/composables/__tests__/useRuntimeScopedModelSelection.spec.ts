import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = vi.hoisted(() => ({
  fetchProvidersWithModels: vi.fn(),
  ensureMissingDynamicProviders: vi.fn(),
  providersWithModelsForSelection: vi.fn(),
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
  const promise = new Promise<void>((onResolve) => { resolve = onResolve })
  return { promise, resolve }
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
const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

describe('useRuntimeScopedModelSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    runtimeAvailabilityStore.fetchRuntimeAvailabilities.mockResolvedValue(undefined)
    store.fetchProvidersWithModels.mockResolvedValue(undefined)
  })

  it('publishes static rows before missing dynamic discovery settles, then applies its result', async () => {
    const dynamic = deferred()
    store.ensureMissingDynamicProviders.mockReturnValue(dynamic.promise)
    store.providersWithModelsForSelection
      .mockReturnValueOnce(rows(['gpt-4.1']))
      .mockReturnValue(rows(['gpt-4.1', 'gateway-model']))

    const selection = useRuntimeScopedModelSelection({ runtimeKind: ref('autobyteus') })
    await flush()

    expect(selection.isLoadingModels.value).toBe(false)
    expect(selection.modelIdentifiers.value).toEqual(['gpt-4.1'])
    expect(store.ensureMissingDynamicProviders).toHaveBeenCalledWith('autobyteus')

    dynamic.resolve()
    await flush()
    expect(selection.modelIdentifiers.value).toEqual(['gpt-4.1', 'gateway-model'])
  })
})
