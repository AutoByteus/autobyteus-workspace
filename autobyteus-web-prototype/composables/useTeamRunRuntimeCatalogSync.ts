import { watch, type Ref } from 'vue'
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig'
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore'
import { loadRuntimeProviderGroupsForSelection } from '~/composables/useRuntimeScopedModelSelection'
import { resolveEffectiveMemberRuntimeKind } from '~/utils/teamRunConfigUtils'

export interface TeamRunRuntimeCatalogSyncOptions {
  immediate?: boolean
}

const collectRuntimeKinds = (config: TeamRunConfig | null | undefined): string[] => {
  if (!config) {
    return []
  }

  const runtimeKinds = new Set<string>()
  const globalRuntimeKind = (config.runtimeKind || '').trim()
  if (globalRuntimeKind) {
    runtimeKinds.add(globalRuntimeKind)
  }

  Object.values(config.memberOverrides || {}).forEach((override) => {
    const runtimeKind = resolveEffectiveMemberRuntimeKind(override, config.runtimeKind).trim()
    if (runtimeKind) {
      runtimeKinds.add(runtimeKind)
    }
  })

  return Array.from(runtimeKinds)
}

/**
 * Keeps team-run launch readiness catalogs in sync for every runtime used by
 * the team default config and member overrides. This is shared by desktop and
 * mobile launch surfaces so they rely on the same teamRunConfigStore readiness
 * boundary instead of each component owning a private watcher.
 */
export function useTeamRunRuntimeCatalogSync(
  configRef: Ref<TeamRunConfig | null | undefined>,
  options: TeamRunRuntimeCatalogSyncOptions = {},
) {
  const teamRunConfigStore = useTeamRunConfigStore()

  return watch(
    () => collectRuntimeKinds(configRef.value),
    async (runtimeKinds) => {
      await Promise.all(
        runtimeKinds.map(async (runtimeKind) => {
          try {
            const rows = await loadRuntimeProviderGroupsForSelection(runtimeKind)
            teamRunConfigStore.setRuntimeModelCatalog(
              runtimeKind,
              rows.flatMap((row) => row.models.map((model) => model.modelIdentifier)),
            )
          } catch (error) {
            console.error(`Failed to load models for team runtime '${runtimeKind}'.`, error)
          }
        }),
      )
    },
    { immediate: options.immediate ?? true },
  )
}
