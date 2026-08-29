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
import {
  getModelSelectionOptionLabel,
  getModelSelectionSelectedLabel,
} from '~/utils/modelSelectionLabel'
import { normalizeModelConfigSchema, type UiModelConfigSchema } from '~/utils/llmConfigSchema'
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
}) => {
  const llmStore = useLLMProviderConfigStore()
  const runtimeAvailabilityStore = useRuntimeAvailabilityStore()
  const providerGroupsByRuntime = ref<Record<string, ProviderWithModels[]>>({})
  const providerSourceStatusesByRuntime = ref<Record<string, RuntimeProviderSourceStatus[]>>({})
  const isLoadingModels = ref(false)
  const modelLoadError = ref<string | null>(null)

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

  const ensureModelsForRuntime = async (runtimeKind: AgentRuntimeKind): Promise<void> => {
    const normalizedRuntimeKind = resolveEffectiveScopedRuntimeKind(runtimeKind)
    if (providerGroupsByRuntime.value[normalizedRuntimeKind]) {
      return
    }

    isLoadingModels.value = true
    modelLoadError.value = null
    try {
      await llmStore.fetchProvidersWithModels(normalizedRuntimeKind)
      const publishRuntimeCatalogState = (): void => {
        providerGroupsByRuntime.value = {
          ...providerGroupsByRuntime.value,
          [normalizedRuntimeKind]: cloneProviderRows(
            llmStore.providersWithModelsForSelection(normalizedRuntimeKind),
          ),
        }
        providerSourceStatusesByRuntime.value = {
          ...providerSourceStatusesByRuntime.value,
          [normalizedRuntimeKind]: cloneProviderSourceStatuses(normalizedRuntimeKind, llmStore),
        }
      }
      publishRuntimeCatalogState()
      void llmStore.ensureMissingDynamicProviders(normalizedRuntimeKind)
        .then(() => publishRuntimeCatalogState(), (error) => {
          console.error(`Failed to discover dynamic models for '${normalizedRuntimeKind}'.`, error)
          publishRuntimeCatalogState()
        })
    } catch (error) {
      modelLoadError.value = error instanceof Error ? error.message : String(error)
      throw error
    } finally {
      isLoadingModels.value = false
    }
  }

  const reloadModelsForRuntime = async (runtimeKind: AgentRuntimeKind): Promise<void> => {
    const normalizedRuntimeKind = resolveEffectiveScopedRuntimeKind(runtimeKind)
    providerGroupsByRuntime.value = Object.fromEntries(
      Object.entries(providerGroupsByRuntime.value).filter(([key]) => key !== normalizedRuntimeKind),
    )
    isLoadingModels.value = true
    modelLoadError.value = null
    try {
      await llmStore.refreshLocalCatalog(normalizedRuntimeKind)
      await ensureModelsForRuntime(normalizedRuntimeKind)
    } catch (error) {
      modelLoadError.value = error instanceof Error ? error.message : String(error)
    } finally {
      isLoadingModels.value = false
    }
  }

  watch(
    () => effectiveRuntimeKind.value,
    (runtimeKind) => {
      if (runtimeKind) void ensureModelsForRuntime(runtimeKind).catch(() => undefined)
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
        enabled: availability.enabled,
      })
    }

    if (!optionByKind.has(DEFAULT_AGENT_RUNTIME_KIND)) {
      optionByKind.set(DEFAULT_AGENT_RUNTIME_KIND, {
        value: DEFAULT_AGENT_RUNTIME_KIND,
        label: runtimeKindToLabel(DEFAULT_AGENT_RUNTIME_KIND),
        enabled: true,
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

  const selectedRuntimeUnavailableReason = computed(() => {
    if (!effectiveRuntimeKind.value) return null
    const availability = runtimeAvailabilityStore.availabilityByKind(effectiveRuntimeKind.value)
    if (!availability) {
      return effectiveRuntimeKind.value === DEFAULT_AGENT_RUNTIME_KIND
        ? null
        : 'Runtime is not available in current capabilities.'
    }
    if (availability.enabled) {
      return null
    }
    return runtimeAvailabilityStore.runtimeReason(effectiveRuntimeKind.value)
  })

  const availableProviderGroups = computed<ProviderWithModels[]>(() =>
    effectiveRuntimeKind.value
      ? providerGroupsByRuntime.value[effectiveRuntimeKind.value] ?? []
      : [],
  )

  const providerSourceStatuses = computed<RuntimeProviderSourceStatus[]>(() =>
    effectiveRuntimeKind.value
      ? providerSourceStatusesByRuntime.value[effectiveRuntimeKind.value] ?? []
      : [],
  )

  const groupedModelOptions = computed<GroupedOption[]>(() => {
    if (!availableProviderGroups.value.length) {
      return []
    }

    const runtimeKind = effectiveRuntimeKind.value
    if (!runtimeKind) return []
    return availableProviderGroups.value.map((providerGroup) => ({
      label: providerGroup.provider.name,
      items: providerGroup.models.map((model) => ({
        id: model.modelIdentifier,
        name: getModelSelectionOptionLabel(model, runtimeKind),
        description: model.description,
        selectedLabel: getModelSelectionSelectedLabel(
          providerGroup.provider.name,
          model,
          runtimeKind,
        ),
      })),
    }))
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
  ): UiModelConfigSchema | null => {
    const normalizedIdentifier = (modelIdentifier || '').trim()
    if (!normalizedIdentifier) {
      return null
    }

    for (const providerGroup of availableProviderGroups.value) {
      const model = providerGroup.models.find(
        (entry) => entry.modelIdentifier === normalizedIdentifier,
      )
      if (!model?.configSchema) {
        continue
      }

      const normalizedSchema = normalizeModelConfigSchema(model.configSchema)
      if (normalizedSchema && Object.keys(normalizedSchema).length > 0) {
        return normalizedSchema
      }
    }

    return null
  }

  return {
    availableProviderGroups,
    effectiveRuntimeKind,
    ensureModelsForRuntime,
    groupedModelOptions,
    hasModelIdentifier,
    isLoadingModels,
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
