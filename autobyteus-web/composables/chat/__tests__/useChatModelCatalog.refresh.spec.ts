import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useChatModelCatalog } from '../useChatModelCatalog'

const store = vi.hoisted(() => ({
  snapshot: { state: 'ready', refreshing: false, refreshError: null as string | null },
  refreshCatalog: vi.fn(async () => undefined),
  refreshModelList: vi.fn(async () => undefined),
  fetchProvidersWithModels: vi.fn(async () => undefined),
}))
vi.mock('~/stores/llmProviderConfig', () => ({
  useLLMProviderConfigStore: () => ({
    providersWithModelsForSelection: () => [],
    catalogSnapshot: () => store.snapshot,
    refreshCatalog: store.refreshCatalog,
    refreshModelList: store.refreshModelList,
    fetchProvidersWithModels: store.fetchProvidersWithModels,
    modelConfigSchemaByIdentifier: () => null,
  }),
}))
vi.mock('~/stores/runtimeAvailabilityStore', () => ({
  useRuntimeAvailabilityStore: () => ({ availabilities: [], fetchRuntimeAvailabilities: vi.fn(), fetchRuntimeAvailability: vi.fn() }),
}))

const withCatalog = () => {
  let api!: ReturnType<typeof useChatModelCatalog>
  mount(defineComponent({ setup() { api = useChatModelCatalog(); return () => h('div') } }))
  return api
}

describe('useChatModelCatalog refresh (REQ-010, REQ-011, QR-001)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    store.snapshot = { state: 'ready', refreshing: false, refreshError: null }
  })

  it('a menu that opens refreshes the runtime in the background; "Refresh models" asks the store for the full refresh', () => {
    const api = withCatalog()

    api.refreshCatalog('claude_agent_sdk')
    expect(store.refreshCatalog).toHaveBeenCalledExactlyOnceWith('claude_agent_sdk')
    expect(store.refreshModelList).not.toHaveBeenCalled()

    api.refreshModelList('autobyteus')
    expect(store.refreshModelList).toHaveBeenCalledExactlyOnceWith('autobyteus')
  })

  it('search and Retry still only load a catalog that has not loaded, never re-read a loaded one', () => {
    withCatalog().ensureCatalog('codex_app_server')

    expect(store.fetchProvidersWithModels).toHaveBeenCalledExactlyOnceWith('codex_app_server')
    expect(store.refreshCatalog).not.toHaveBeenCalled()
  })

  it('reports the refresh state while the list stays ready', () => {
    const api = withCatalog()
    expect(api.catalogRefreshing('claude_agent_sdk')).toBe(false)
    expect(api.catalogRefreshFailed('claude_agent_sdk')).toBe(false)

    store.snapshot = { state: 'ready', refreshing: true, refreshError: null }
    expect(api.catalogRefreshing('claude_agent_sdk')).toBe(true)
    expect(api.catalogState('claude_agent_sdk')).toBe('ready')

    store.snapshot = { state: 'ready', refreshing: false, refreshError: 'MODEL_CATALOG_REQUEST_FAILED' }
    expect(api.catalogRefreshFailed('claude_agent_sdk')).toBe(true)
    expect(api.catalogState('claude_agent_sdk')).toBe('ready')
  })
})
