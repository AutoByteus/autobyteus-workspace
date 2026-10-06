import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { useRuntimeAvailabilityStore } from '~/stores/runtimeAvailabilityStore'
import type { StartModelCatalog } from '~/utils/runSettings/startModelDefaults'

/** The product's runtime availability and model catalogs, as the start-model rule reads them. */
export const startModelCatalog = (): StartModelCatalog => {
  const availability = useRuntimeAvailabilityStore()
  const catalogs = useLLMProviderConfigStore()
  return {
    ensureAvailability: async () => { await availability.fetchRuntimeAvailabilities().catch(() => undefined) },
    isRuntimeEnabled: (runtimeKind) => availability.isRuntimeEnabled(runtimeKind),
    ensureCatalog: async (runtimeKind) => { await catalogs.fetchProvidersWithModels(runtimeKind).catch(() => undefined) },
    models: (runtimeKind) => catalogs.models(runtimeKind),
  }
}
