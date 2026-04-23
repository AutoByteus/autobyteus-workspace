import { computed, ref, watch, type Ref } from 'vue'
import {
  DEFAULT_AGENT_RUNTIME_KIND,
  runtimeKindToLabel,
  type AgentRuntimeKind,
} from '~/types/agent/AgentRunConfig'
import {
  useLLMProviderConfigStore,
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
  const rows = await llmStore.fetchProvidersWithModels(runtimeKind)
  const candidateRows = Array.isArray(rows) && rows.length > 0
    ? rows
    : (llmStore.providersWithModelsForSelection ?? [])
  return cloneProviderRows(candidateRows)
}

export const useRuntimeScopedModelSelection = (params: {
  runtimeKind: Ref<string | null | undefined>
  allowBlankRuntime?: boolean
}) => {
  const llmStore = useLLMProviderConfigStore()
  const runtimeAvailabilityStore = useRuntimeAvailabilityStore()
  const providerGroupsByRuntime = ref<Record<string, ProviderWithModels[]>>({})
  const isLoadingModels = ref(false)

  void runtimeAvailabilityStore.fetchRuntimeAvailabilities().catch((error) => {
    console.error('Failed to fetch runtime availabilities:', error)
  })

  const allowBlankRuntime = computed(() => params.allowBlankRuntime === true)
  const normalizedStoredRuntimeKind = computed(() =>
    normalizeScopedRuntimeKind(params.runtimeKind.value, allowBlankRuntime.value),
  )
  const effectiveRuntimeKind = computed(() =>
    resolveEffectiveScopedRuntimeKind(params.runtimeKind.value),
  )

  const ensureModelsForRuntime = async (runtimeKind: AgentRuntimeKind): Promise<void> => {
    const normalizedRuntimeKind = resolveEffectiveScopedRuntimeKind(runtimeKind)
    if (providerGroupsByRuntime.value[normalizedRuntimeKind]) {
      return
    }

    isLoadingModels.value = true
    try {
      const rows = await loadRuntimeProviderGroupsForSelection(normalizedRuntimeKind, llmStore)
      providerGroupsByRuntime.value = {
        ...providerGroupsByRuntime.value,
        [normalizedRuntimeKind]: rows,
      }
    } finally {
      isLoadingModels.value = false
    }
  }

  watch(
    () => effectiveRuntimeKind.value,
    (runtimeKind) => {
      void ensureModelsForRuntime(runtimeKind)
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

    if (!optionByKind.has(selectedRuntimeKind)) {
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
    providerGroupsByRuntime.value[effectiveRuntimeKind.value] ?? [],
  )

  const groupedModelOptions = computed<GroupedOption[]>(() => {
    if (!availableProviderGroups.value.length) {
      return []
    }

    return availableProviderGroups.value.map((providerGroup) => ({
      label: providerGroup.provider.name,
      items: providerGroup.models.map((model) => ({
        id: model.modelIdentifier,
        name: getModelSelectionOptionLabel(model, effectiveRuntimeKind.value),
        selectedLabel: getModelSelectionSelectedLabel(
          providerGroup.provider.name,
          model,
          effectiveRuntimeKind.value,
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
    modelConfigSchemaByIdentifier,
    modelIdentifiers,
    normalizedStoredRuntimeKind,
    runtimeOptions,
    selectedRuntimeUnavailableReason,
  }
}
