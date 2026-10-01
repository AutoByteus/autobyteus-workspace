import { watch, type Ref } from 'vue'
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig'
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore'
import { loadRuntimeProviderGroupsForSelection } from '~/composables/useRuntimeScopedModelSelection'
import { loadRuntimeCurrentModelDescriptors } from '~/composables/useRuntimeCurrentModelDescriptor'
import { resolveTeamRunConfiguration } from '~/utils/teamRunLaunchHierarchy'

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
  const readSequence = new Map<string, number>()
  const currentIdentifiers = (runtimeKind: string): string[] => {
    const config = configRef.value
    const tree = store.memberTree
    if (!config || !tree) return config?.rootConfig.runtimeKind === runtimeKind
      ? [config.rootConfig.llmModelIdentifier] : []
    const view = resolveTeamRunConfiguration(config, tree)
    return [...new Set([...Object.values(view.teamsByAddress), ...Object.values(view.agentsByAddress)]
      .filter((scope) => scope.effectiveConfig.runtimeKind === runtimeKind)
      .map((scope) => scope.effectiveConfig.llmModelIdentifier).filter(Boolean))]
  }
  const reloadRuntimeKind = async (runtimeKind: string): Promise<void> => {
    const sequence = (readSequence.get(runtimeKind) ?? 0) + 1
    readSequence.set(runtimeKind, sequence)
    store.setRuntimeModelCatalogLoading(runtimeKind)
    try {
      const [rows, current] = await Promise.all([
        loadRuntimeProviderGroupsForSelection(runtimeKind),
        loadRuntimeCurrentModelDescriptors(runtimeKind, currentIdentifiers(runtimeKind)),
      ])
      if (readSequence.get(runtimeKind) !== sequence) return
      store.setRuntimeModelCatalog(runtimeKind, [...new Set([
        ...rows.flatMap((row) => row.models.map((model) => model.modelIdentifier)),
        ...Object.entries(current).filter(([, model]) => model).map(([id]) => id),
      ])])
    } catch (error) {
      if (readSequence.get(runtimeKind) === sequence)
        store.setRuntimeModelCatalogError(runtimeKind, error instanceof Error ? error.message : String(error))
    }
  }
  const stop = watch(() => `${runtimeKindSetSignature(configRef.value)}|${collectRuntimeKinds(configRef.value)
    .map((runtime) => `${runtime}:${currentIdentifiers(runtime).sort().join(',')}`).join('|')}`, async () => {
    await Promise.all(collectRuntimeKinds(configRef.value).map(reloadRuntimeKind))
  }, { immediate: options.immediate ?? true })
  return { reloadRuntimeKind, stop }
}
