import { watch, type Ref } from 'vue'
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig'
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore'
import { loadRuntimeProviderGroupsForSelection } from '~/composables/useRuntimeScopedModelSelection'

export interface TeamRunRuntimeCatalogSyncOptions { immediate?: boolean }
const collectRuntimeKinds = (config: TeamRunConfig | null | undefined): string[] => {
  if (!config) return []
  const values = new Set<string>([config.rootConfig.runtimeKind])
  Object.values(config.teamOverrides).forEach((value) => value.runtimeKind && values.add(value.runtimeKind))
  Object.values(config.agentOverrides).forEach((value) => value.runtimeKind && values.add(value.runtimeKind))
  return [...values].filter(Boolean).sort()
}
const runtimeKindSetSignature = (config: TeamRunConfig | null | undefined): string =>
  collectRuntimeKinds(config).join('\u0000')
export function useTeamRunRuntimeCatalogSync(
  configRef: Ref<TeamRunConfig | null | undefined>,
  options: TeamRunRuntimeCatalogSyncOptions = {},
) {
  const store = useTeamRunConfigStore()
  const reloadRuntimeKind = async (runtimeKind: string): Promise<void> => {
    store.setRuntimeModelCatalogLoading(runtimeKind)
    try {
      const rows = await loadRuntimeProviderGroupsForSelection(runtimeKind)
      store.setRuntimeModelCatalog(runtimeKind, rows.flatMap((row) => row.models.map((model) => model.modelIdentifier)))
    } catch (error) {
      store.setRuntimeModelCatalogError(runtimeKind, error instanceof Error ? error.message : String(error))
    }
  }
  const stop = watch(() => runtimeKindSetSignature(configRef.value), async () => {
    await Promise.all(collectRuntimeKinds(configRef.value).map(reloadRuntimeKind))
  }, { immediate: options.immediate ?? true })
  return { reloadRuntimeKind, stop }
}
