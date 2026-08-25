import { createPinia, setActivePinia } from 'pinia'
import { nextTick, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig'

const loadRuntimeProviderGroupsForSelection = vi.hoisted(() => vi.fn())
vi.mock('~/composables/useRuntimeScopedModelSelection', () => ({
  loadRuntimeProviderGroupsForSelection,
}))

import { useTeamRunRuntimeCatalogSync } from '../useTeamRunRuntimeCatalogSync'
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore'

const providerRows = (modelIdentifier: string) => [{
  provider: { id: 'provider' },
  models: [{ modelIdentifier }],
}]

const config = (): TeamRunConfig => ({
  teamDefinitionId: 'team-definition',
  teamDefinitionName: 'Team definition',
  rootConfig: {
    runtimeKind: 'autobyteus',
    workspace: { workspaceId: null, workspaceMetadata: null },
    llmModelIdentifier: 'model-a',
    llmConfig: null,
    autoExecuteTools: false,
    skillAccessMode: 'PRELOADED_ONLY',
  },
  teamOverrides: {},
  agentOverrides: {},
  isLocked: false,
})

describe('useTeamRunRuntimeCatalogSync', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    loadRuntimeProviderGroupsForSelection.mockImplementation(async (runtimeKind: string) =>
      providerRows(`${runtimeKind}-model`),
    )
  })

  it('retains ready catalogs across immutable workspace edits and reloads only when the runtime set changes', async () => {
    const store = useTeamRunConfigStore()
    const setLoading = vi.spyOn(store, 'setRuntimeModelCatalogLoading')
    const configRef = ref<TeamRunConfig>(config())
    const { stop } = useTeamRunRuntimeCatalogSync(configRef)

    await vi.waitFor(() => expect(store.runtimeModelCatalogs.autobyteus).toEqual(['autobyteus-model']))
    expect(loadRuntimeProviderGroupsForSelection).toHaveBeenCalledTimes(1)
    expect(setLoading).toHaveBeenCalledTimes(1)

    configRef.value = {
      ...configRef.value,
      rootConfig: {
        ...configRef.value.rootConfig,
        workspace: {
          workspaceId: 'workspace-created',
          workspaceMetadata: null,
        },
      },
    }
    await nextTick()
    await Promise.resolve()

    expect(loadRuntimeProviderGroupsForSelection).toHaveBeenCalledTimes(1)
    expect(setLoading).toHaveBeenCalledTimes(1)
    expect(store.runtimeModelCatalogs.autobyteus).toEqual(['autobyteus-model'])

    configRef.value = {
      ...configRef.value,
      rootConfig: {
        ...configRef.value.rootConfig,
        runtimeKind: 'codex_app_server',
      },
    }
    await vi.waitFor(() => expect(store.runtimeModelCatalogs.codex_app_server).toEqual(['codex_app_server-model']))

    expect(loadRuntimeProviderGroupsForSelection).toHaveBeenCalledTimes(2)
    expect(setLoading).toHaveBeenCalledTimes(2)
    stop()
  })
})
