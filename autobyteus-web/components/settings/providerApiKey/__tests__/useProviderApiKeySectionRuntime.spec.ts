import { createTestingPinia } from '@pinia/testing'
import { mount } from '@vue/test-utils'
import { setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { useProviderApiKeySectionRuntime } from '../useProviderApiKeySectionRuntime'

const translations: Record<string, string> = {
  'settings.components.settings.ProviderAPIKeyManager.api_key_saved_successfully': '{{provider}} saved',
  'settings.components.settings.ProviderAPIKeyManager.failed_to_save_api_key': '{{provider}} save failed',
  'settings.components.settings.ProviderAPIKeyManager.models_reloaded_for_provider': 'Reloaded {{provider}}',
  'settings.components.settings.ProviderAPIKeyManager.failed_to_reload_models_for_provider': 'Failed {{provider}}',
  'settings.components.settings.ProviderAPIKeyManager.new_custom_provider': 'New Provider',
}
const translate = (key: string, params?: Record<string, unknown>) =>
  (translations[key] ?? key).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, token) => String(params?.[token] ?? ''))
vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({ t: translate }),
}))

const descriptor = (id: string, catalogMode: 'STATIC' | 'DISCOVERED') => ({
  id,
  name: id === 'OPENAI' ? 'OpenAI' : id === 'AUTOBYTEUS' ? 'AutoByteus' : id,
  providerType: id,
  isCustom: false,
  baseUrl: null,
  catalogMode,
})
const setting = (id: string, configured: boolean, mode: 'STATIC' | 'DISCOVERED') => ({
  provider: descriptor(id, mode),
  apiKeyConfigured: configured,
})
const snapshot = (
  id: string,
  mode: 'STATIC' | 'DISCOVERED',
  state: 'IDLE' | 'READY' = mode === 'STATIC' ? 'READY' : 'IDLE',
) => ({
  runtimeKind: 'autobyteus',
  ownerProvider: descriptor(id, mode),
  sources: mode === 'STATIC' ? [] : [{
    modelKind: 'LLM', state, modelCount: state === 'READY' ? 1 : 0,
    successfulUnitCount: state === 'READY' ? 1 : 0, failedUnitCount: 0, safeMessage: null,
  }],
  llmModels: state === 'READY' ? [{
    modelIdentifier: `${id}-model`, name: `${id} model`, value: `${id}-model`,
    canonicalName: `${id}-model`, providerId: id, providerName: id,
    providerType: id, runtime: 'api',
  }] : [],
  audioModels: [], imageModels: [], videoModels: [],
})
const freshnessSnapshot = (
  sources: Array<{ modelKind: 'LLM' | 'AUDIO' | 'IMAGE'; state: 'READY' | 'PARTIAL' | 'STALE_ERROR' | 'ERROR'; modelCount: number }>,
) => ({
  runtimeKind: 'autobyteus',
  ownerProvider: descriptor('AUTOBYTEUS', 'DISCOVERED'),
  sources: sources.map(source => ({
    ...source,
    successfulUnitCount: source.state === 'READY' || source.state === 'PARTIAL' ? 1 : 0,
    failedUnitCount: source.state === 'PARTIAL'
      || source.state === 'ERROR'
      || source.state === 'STALE_ERROR' ? 1 : 0,
    safeMessage: source.state === 'PARTIAL'
      || source.state === 'ERROR'
      || source.state === 'STALE_ERROR'
      ? 'MODEL_DISCOVERY_UNAVAILABLE'
      : null,
  })),
  llmModels: sources.some(source => source.modelKind === 'LLM' && source.modelCount > 0)
    ? snapshot('AUTOBYTEUS', 'DISCOVERED', 'READY').llmModels
    : [],
  audioModels: sources.some(source => source.modelKind === 'AUDIO' && source.modelCount > 0)
    ? [{ ...snapshot('AUTOBYTEUS', 'DISCOVERED', 'READY').llmModels[0], modelIdentifier: 'audio-model' }]
    : [],
  imageModels: sources.some(source => source.modelKind === 'IMAGE' && source.modelCount > 0)
    ? [{ ...snapshot('AUTOBYTEUS', 'DISCOVERED', 'READY').llmModels[0], modelIdentifier: 'image-model' }]
    : [],
  videoModels: [],
})

const RuntimeHarness = defineComponent({
  setup(_, { expose }) {
    expose(useProviderApiKeySectionRuntime())
    return () => h('div')
  },
})

const mountRuntime = (options: {
  settings?: ReturnType<typeof setting>[]
  snapshots?: ReturnType<typeof snapshot>[]
} = {}) => {
  const settings = options.settings ?? [setting('OPENAI', true, 'STATIC')]
  const snapshots = options.snapshots ?? [snapshot('OPENAI', 'STATIC')]
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: {
      llmProviderConfig: {
        providerCredentialSettings: settings,
        hasFetchedProviderCredentialSettings: true,
        catalogByRuntimeKind: {
          autobyteus: {
            runtimeKind: 'autobyteus', currentRequestId: 1, state: 'ready',
            hasSuccessfulPayload: true,
            providersById: Object.fromEntries(snapshots.map(row => [row.ownerProvider.id, row])),
            errorMessage: null,
          },
        },
        geminiSetup: {
          activeMode: null, aiStudioConfigured: false,
          vertexExpressConfigured: false, vertexProject: null,
        },
        qwenSetup: { effectiveBaseUrl: 'https://default.example/v1', endpointSource: 'DEFAULT' },
      },
    },
  })
  setActivePinia(pinia)
  const store = useLLMProviderConfigStore()
  store.fetchProviderCredentialSettings = vi.fn().mockResolvedValue(settings)
  store.fetchProvidersWithModels = vi.fn().mockResolvedValue(store.catalogSnapshot('autobyteus'))
  store.fetchGeminiSetupConfig = vi.fn().mockResolvedValue(store.geminiSetup)
  store.fetchQwenSetupStatus = vi.fn().mockResolvedValue(store.qwenSetup)
  store.ensureProviderModelCatalog = vi.fn().mockResolvedValue(snapshots[0])
  store.reloadProvider = vi.fn().mockResolvedValue(snapshots[0])
  store.setLLMProviderApiKey = vi.fn().mockResolvedValue(settings[0])
  store.probeCustomProvider = vi.fn()
  store.createCustomProvider = vi.fn()
  store.deleteCustomProvider = vi.fn()
  store.saveGeminiConfigurationOption = vi.fn()
  store.activateGeminiConfigurationOption = vi.fn()
  store.saveQwenConfiguration = vi.fn()
  const wrapper = mount(RuntimeHarness, { global: { plugins: [pinia] } })
  return { wrapper, store }
}

const flushMicrotasks = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

describe('useProviderApiKeySectionRuntime provider-scoped behavior', () => {
  beforeEach(() => vi.clearAllMocks())

  it('settles credential initialization without waiting for the independent catalog read', async () => {
    const { wrapper, store } = mountRuntime()
    store.fetchProvidersWithModels = vi.fn().mockReturnValue(new Promise(() => undefined))

    await expect((wrapper.vm as never as { initialize: () => Promise<void> }).initialize())
      .resolves.toBeUndefined()
    expect(store.fetchProviderCredentialSettings).toHaveBeenCalledOnce()
    expect((wrapper.vm as never as { selectedProviderId: string }).selectedProviderId).toBe('OPENAI')
  })

  it('does not ensure or expose Reload for a static provider', async () => {
    const { wrapper, store } = mountRuntime()
    const runtime = wrapper.vm as never as {
      initialize: () => Promise<void>
      selectProvider: (id: string) => Promise<void>
      canReloadSelectedProvider: boolean
    }

    await runtime.initialize()
    await flushMicrotasks()
    await runtime.selectProvider('OPENAI')
    expect(store.ensureProviderModelCatalog).not.toHaveBeenCalled()
    expect(runtime.canReloadSelectedProvider).toBe(false)
  })

  it('ensures only a selected cold dynamic provider and reuses a warm snapshot', async () => {
    const settings = [
      setting('OPENAI', true, 'STATIC'),
      setting('AUTOBYTEUS', false, 'DISCOVERED'),
      setting('OLLAMA', false, 'DISCOVERED'),
    ]
    const { wrapper, store } = mountRuntime({
      settings,
      snapshots: [
        snapshot('OPENAI', 'STATIC'),
        snapshot('AUTOBYTEUS', 'DISCOVERED', 'IDLE'),
        snapshot('OLLAMA', 'DISCOVERED', 'READY'),
      ],
    })
    const runtime = wrapper.vm as never as { selectProvider: (id: string) => Promise<void> }

    await runtime.selectProvider('AUTOBYTEUS')
    expect(store.ensureProviderModelCatalog).toHaveBeenCalledWith('autobyteus', 'AUTOBYTEUS')
    vi.mocked(store.ensureProviderModelCatalog).mockClear()
    await runtime.selectProvider('OLLAMA')
    expect(store.ensureProviderModelCatalog).not.toHaveBeenCalled()
  })

  it('reloads only the selected dynamic provider', async () => {
    const { wrapper, store } = mountRuntime({
      settings: [setting('AUTOBYTEUS', true, 'DISCOVERED')],
      snapshots: [snapshot('AUTOBYTEUS', 'DISCOVERED', 'READY')],
    })
    const runtime = wrapper.vm as never as {
      initialize: () => Promise<void>
      reloadSelectedProvider: (id?: string) => Promise<void>
      canReloadSelectedProvider: boolean
    }

    await runtime.initialize()
    expect(runtime.canReloadSelectedProvider).toBe(true)
    await runtime.reloadSelectedProvider('AUTOBYTEUS')
    expect(store.reloadProvider).toHaveBeenCalledWith('autobyteus', 'AUTOBYTEUS')
  })

  it('reports AutoByteus credential success before starting a non-awaited exact ensure', async () => {
    const { wrapper, store } = mountRuntime({
      settings: [setting('AUTOBYTEUS', false, 'DISCOVERED')],
      snapshots: [snapshot('AUTOBYTEUS', 'DISCOVERED', 'READY')],
    })
    const pendingEnsure = new Promise(() => undefined)
    store.ensureProviderModelCatalog = vi.fn().mockReturnValue(pendingEnsure)
    store.setLLMProviderApiKey = vi.fn().mockResolvedValue(setting('AUTOBYTEUS', true, 'DISCOVERED'))
    const runtime = wrapper.vm as never as {
      saveProviderApiKey: (providerId: string, apiKey: string) => Promise<boolean>
      saving: boolean
      notification: { type: string; message: string } | null
    }

    await expect(runtime.saveProviderApiKey('AUTOBYTEUS', 'synthetic-key')).resolves.toBe(true)
    expect(runtime.saving).toBe(false)
    expect(runtime.notification).toEqual({ type: 'success', message: 'AutoByteus saved' })
    expect(store.ensureProviderModelCatalog).toHaveBeenCalledWith('autobyteus', 'AUTOBYTEUS')
  })

  it('keeps ordinary static credential saves free of model actions', async () => {
    const { wrapper, store } = mountRuntime()
    const runtime = wrapper.vm as never as {
      saveProviderApiKey: (providerId: string, apiKey: string) => Promise<boolean>
    }

    await expect(runtime.saveProviderApiKey('OPENAI', 'synthetic-key')).resolves.toBe(true)
    expect(store.setLLMProviderApiKey).toHaveBeenCalledWith('OPENAI', 'synthetic-key')
    expect(store.ensureProviderModelCatalog).not.toHaveBeenCalled()
    expect(store.reloadProvider).not.toHaveBeenCalled()
  })

  it('classifies current LLM rows plus cold media failures as partial, not stale', async () => {
    const { wrapper } = mountRuntime({
      settings: [setting('AUTOBYTEUS', false, 'DISCOVERED')],
      snapshots: [freshnessSnapshot([
        { modelKind: 'LLM', state: 'READY', modelCount: 1 },
        { modelKind: 'AUDIO', state: 'ERROR', modelCount: 0 },
        { modelKind: 'IMAGE', state: 'ERROR', modelCount: 0 },
      ]) as never],
    })
    const runtime = wrapper.vm as never as {
      initialize: () => Promise<void>
      hasPartialModelResult: boolean
      hasStaleModelResult: boolean
      hasUnavailableModelSource: boolean
    }

    await runtime.initialize()
    expect(runtime.hasPartialModelResult).toBe(true)
    expect(runtime.hasStaleModelResult).toBe(false)
    expect(runtime.hasUnavailableModelSource).toBe(false)
  })

  it('classifies a successful-empty plus peer-failure aggregate as a zero-row partial result', async () => {
    const { wrapper } = mountRuntime({
      settings: [setting('AUTOBYTEUS', false, 'DISCOVERED')],
      snapshots: [freshnessSnapshot([
        { modelKind: 'LLM', state: 'PARTIAL', modelCount: 0 },
      ]) as never],
    })
    const runtime = wrapper.vm as never as {
      initialize: () => Promise<void>
      hasPartialModelResult: boolean
      hasStaleModelResult: boolean
      hasUnavailableModelSource: boolean
      selectedProviderLlmModels: unknown[]
    }

    await runtime.initialize()
    expect(runtime.selectedProviderLlmModels).toEqual([])
    expect(runtime.hasPartialModelResult).toBe(true)
    expect(runtime.hasStaleModelResult).toBe(false)
    expect(runtime.hasUnavailableModelSource).toBe(false)
  })

  it('classifies mixed current and stale rows as partial, while all-stale rows remain stale', async () => {
    const mixed = mountRuntime({
      settings: [setting('AUTOBYTEUS', false, 'DISCOVERED')],
      snapshots: [freshnessSnapshot([
        { modelKind: 'LLM', state: 'READY', modelCount: 1 },
        { modelKind: 'AUDIO', state: 'STALE_ERROR', modelCount: 1 },
      ]) as never],
    }).wrapper.vm as never as {
      initialize: () => Promise<void>
      hasPartialModelResult: boolean
      hasStaleModelResult: boolean
    }
    await mixed.initialize()
    expect(mixed.hasPartialModelResult).toBe(true)
    expect(mixed.hasStaleModelResult).toBe(false)

    const allStale = mountRuntime({
      settings: [setting('AUTOBYTEUS', false, 'DISCOVERED')],
      snapshots: [freshnessSnapshot([
        { modelKind: 'LLM', state: 'STALE_ERROR', modelCount: 1 },
        { modelKind: 'AUDIO', state: 'STALE_ERROR', modelCount: 1 },
      ]) as never],
    }).wrapper.vm as never as {
      initialize: () => Promise<void>
      hasPartialModelResult: boolean
      hasStaleModelResult: boolean
      hasUnavailableModelSource: boolean
    }
    await allStale.initialize()
    expect(allStale.hasPartialModelResult).toBe(false)
    expect(allStale.hasStaleModelResult).toBe(true)
    expect(allStale.hasUnavailableModelSource).toBe(false)
  })
})
