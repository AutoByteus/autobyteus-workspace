import { computed, ref, watch, type Ref } from 'vue'
import {
  DEFAULT_AGENT_RUNTIME_KIND,
  runtimeKindToLabel,
  type AgentRuntimeKind,
} from '~/types/agent/AgentRunConfig'
import {
  useLLMProviderConfigStore,
  type ModelSourceStatus,
  type ProviderWithModels,
} from '~/stores/llmProviderConfig'
import { useRuntimeAvailabilityStore } from '~/stores/runtimeAvailabilityStore'
import { buildModelSelectionGroups } from '~/utils/modelSelectionOptions'
import { modelConfigSchemaFromProviderGroups, type UiModelConfigSchema } from '~/utils/llmConfigSchema'
import type { GroupedOption } from '~/components/agentTeams/SearchableGroupedSelect.vue'

const cloneProviderRows = (rows: ProviderWithModels[]): ProviderWithModels[] =>
  rows.map((row) => ({
    provider: { ...row.provider },
    models: row.models.map((model) => ({
      ...model,
      configSchema:
        model.configSchema && typeof model.configSchema === 'object' && !Array.isArray(model.configSchema)
          ? { ...model.configSchema }
          : model.configSchema ?? null,
    })),
  }))

export type RuntimeProviderSourceStatus = Readonly<{
  providerId: string
  providerName: string
  sources: ModelSourceStatus[]
}>

const cloneProviderSourceStatuses = (
  runtimeKind: string,
  llmStore: ReturnType<typeof useLLMProviderConfigStore>,
): RuntimeProviderSourceStatus[] => llmStore.providerSnapshots(runtimeKind).map((snapshot) => ({
  providerId: snapshot.ownerProvider.id,
  providerName: snapshot.ownerProvider.name,
  sources: snapshot.sources.map((source) => ({ ...source })),
}))

export const normalizeScopedRuntimeKind = (
  runtimeKind: string | null | undefined,
  allowBlankRuntime = false,
): string => {
  const normalized = (runtimeKind || '').trim()
  if (!normalized) {
    return allowBlankRuntime ? '' : DEFAULT_AGENT_RUNTIME_KIND
  }
  return normalized
}

export const resolveEffectiveScopedRuntimeKind = (
  runtimeKind: string | null | undefined,
): AgentRuntimeKind => {
  const normalized = (runtimeKind || '').trim()
  return (normalized || DEFAULT_AGENT_RUNTIME_KIND) as AgentRuntimeKind
}

export const loadRuntimeProviderGroupsForSelection = async (
  runtimeKind: AgentRuntimeKind,
  llmStore = useLLMProviderConfigStore(),
): Promise<ProviderWithModels[]> => {
  await llmStore.fetchProvidersWithModels(runtimeKind)
  await llmStore.ensureMissingDynamicProviders(runtimeKind)
  return cloneProviderRows(llmStore.providersWithModelsForSelection(runtimeKind))
}

export const useRuntimeScopedModelSelection = (params: {
  runtimeKind: Ref<string | null | undefined>
  inheritedRuntimeKind?: Ref<string | null | undefined>
  allowBlankRuntime?: boolean
  useDefaultRuntimeFallback?: boolean
  loadCatalog?: boolean
}) => {
  const llmStore = useLLMProviderConfigStore()
  const runtimeAvailabilityStore = useRuntimeAvailabilityStore()
  const requestedCatalogKinds = ref<Record<string, boolean>>({})

  void runtimeAvailabilityStore.fetchRuntimeAvailabilities().catch((error) => {
    console.error('Failed to fetch runtime availabilities:', error)
  })

  const allowBlankRuntime = computed(() => params.allowBlankRuntime === true)
  const normalizedStoredRuntimeKind = computed(() =>
    normalizeScopedRuntimeKind(params.runtimeKind.value, allowBlankRuntime.value),
  )
  const effectiveRuntimeKind = computed<AgentRuntimeKind | null>(() => {
    const resolved = (params.runtimeKind.value || params.inheritedRuntimeKind?.value || '').trim()
    if (resolved) return resolved as AgentRuntimeKind
    return params.useDefaultRuntimeFallback === false ? null : DEFAULT_AGENT_RUNTIME_KIND
  })

  // Catalog acceptance/error ownership stays in the shared store. All consumers of
  // the selected runtime observe its current publication, including another scope's Retry.
  const selectedCatalog = computed(() => {
    const kind = effectiveRuntimeKind.value
    return kind && requestedCatalogKinds.value[kind] ? llmStore.catalogSnapshot(kind) : null
  })
  const modelLoadError = computed(() => selectedCatalog.value?.state === 'error'
    ? selectedCatalog.value.errorMessage : null)

  const ensureModelsForRuntime = async (runtimeKind: AgentRuntimeKind): Promise<void> => {
    const kind = resolveEffectiveScopedRuntimeKind(runtimeKind)
    requestedCatalogKinds.value[kind] = true
    await llmStore.fetchProvidersWithModels(kind)
    void llmStore.ensureMissingDynamicProviders(kind).catch((error) => {
      console.error(`Failed to discover dynamic models for '${kind}'.`, error)
    })
  }

  const reloadModelsForRuntime = async (runtimeKind: AgentRuntimeKind): Promise<void> => {
    const kind = resolveEffectiveScopedRuntimeKind(runtimeKind)
    requestedCatalogKinds.value[kind] = true
    try {
      await Promise.all([
        runtimeAvailabilityStore.fetchRuntimeAvailability(kind, true),
        llmStore.refreshLocalCatalog(kind),
      ])
      await ensureModelsForRuntime(kind)
    } catch {
      // Each store publishes its own current failure; don't retain a caller-local
      // error that a later accepted catalog or capability response cannot recover.
    }
  }

  watch(
    () => effectiveRuntimeKind.value,
    (runtimeKind) => {
      if (runtimeKind) void runtimeAvailabilityStore.fetchRuntimeAvailability(runtimeKind).catch(() => undefined)
      if (runtimeKind && params.loadCatalog !== false) void ensureModelsForRuntime(runtimeKind).catch(() => undefined)
    },
    { immediate: true },
  )

  const runtimeOptions = computed<Array<{
    value: string
    label: string
    enabled: boolean
  }>>(() => {
    const selectedRuntimeKind = effectiveRuntimeKind.value
    const optionByKind = new Map<string, { value: string; label: string; enabled: boolean }>()

    for (const availability of runtimeAvailabilityStore.availabilities) {
      optionByKind.set(availability.runtimeKind, {
        value: availability.runtimeKind,
        label: runtimeKindToLabel(availability.runtimeKind),
        enabled: runtimeAvailabilityStore.isRuntimeEnabled(availability.runtimeKind),
      })
    }

    if (selectedRuntimeKind && !optionByKind.has(selectedRuntimeKind)) {
      optionByKind.set(selectedRuntimeKind, {
        value: selectedRuntimeKind,
        label: runtimeKindToLabel(selectedRuntimeKind),
        enabled: runtimeAvailabilityStore.isRuntimeEnabled(selectedRuntimeKind),
      })
    }

    return Array.from(optionByKind.values()).filter(
      (option) => option.enabled || selectedRuntimeKind === option.value,
    )
  })

  const isLoadingRuntime = computed(() => Boolean(effectiveRuntimeKind.value
    && runtimeAvailabilityStore.isRuntimePending(effectiveRuntimeKind.value)))
  const isLoadingModels = computed(() => selectedCatalog.value?.state === 'loading' || isLoadingRuntime.value)
  const selectedRuntimeUnavailableReason = computed(() => {
    const kind = effectiveRuntimeKind.value
    if (!kind || isLoadingRuntime.value) return null
    if (runtimeAvailabilityStore.isRuntimeEnabled(kind)) return null
    return runtimeAvailabilityStore.runtimeReason(kind) || 'Runtime is not available in current capabilities.'
  })

  const availableProviderGroups = computed<ProviderWithModels[]>(() =>
    selectedCatalog.value
      ? cloneProviderRows(llmStore.providersWithModelsForSelection(selectedCatalog.value.runtimeKind))
      : [],
  )

  const providerSourceStatuses = computed<RuntimeProviderSourceStatus[]>(() =>
    selectedCatalog.value
      ? cloneProviderSourceStatuses(selectedCatalog.value.runtimeKind, llmStore)
      : [],
  )

  const groupedModelOptions = computed<GroupedOption[]>(() => {
    const runtimeKind = effectiveRuntimeKind.value
    if (!runtimeKind) return []
    return buildModelSelectionGroups(availableProviderGroups.value, runtimeKind)
  })

  const modelIdentifiers = computed(() =>
    availableProviderGroups.value.flatMap((providerGroup) =>
      providerGroup.models.map((model) => model.modelIdentifier),
    ),
  )

  const hasModelIdentifier = (modelIdentifier: string | null | undefined): boolean => {
    const normalizedIdentifier = (modelIdentifier || '').trim()
    if (!normalizedIdentifier) {
      return false
    }

    return modelIdentifiers.value.includes(normalizedIdentifier)
  }

  const modelConfigSchemaByIdentifier = (
    modelIdentifier: string | null | undefined,
  ): UiModelConfigSchema | null => modelConfigSchemaFromProviderGroups(
    availableProviderGroups.value, modelIdentifier,
  )

  return {
    availableProviderGroups,
    effectiveRuntimeKind,
    ensureModelsForRuntime,
    groupedModelOptions,
    hasModelIdentifier,
    isLoadingModels,
    isLoadingRuntime,
    modelLoadError,
    modelConfigSchemaByIdentifier,
    modelIdentifiers,
    normalizedStoredRuntimeKind,
    reloadModelsForRuntime,
    providerSourceStatuses,
    runtimeOptions,
    selectedRuntimeUnavailableReason,
  }
}
