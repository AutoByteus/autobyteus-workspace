import { computed } from 'vue'
import { useRuntimeAvailabilityStore } from '~/stores/runtimeAvailabilityStore'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { runtimeKindToLabel } from '~/types/agent/AgentRunConfig'
import { runtimeShortLabel } from '~/utils/chat/chatDefaults'
import type { UiModelConfigSchema } from '~/utils/llmConfigSchema'

export type ChatCatalogState = 'idle' | 'loading' | 'ready' | 'error'

export interface ChatRuntimeOption {
  runtimeKind: string
  label: string
  shortLabel: string
  enabled: boolean
  reason: string | null
}

export interface ChatModelOption {
  runtimeKind: string
  llmModelIdentifier: string
  /** Compact label shown in the menu and on the trigger: the model identifier (never wraps). */
  name: string
  /** The catalog's descriptive model name, shown on hover. */
  title: string | null
  providerName: string
  description: string | null
}

export interface ChatModelGroup {
  providerName: string
  models: ChatModelOption[]
}

/**
 * Menu data for the Chat model menu: runtime availability (fetched once), per-runtime
 * catalogs loaded on demand and cached by the provider store, and cross-runtime search
 * over enabled runtimes (catalogs load on the first search keystroke; RSK-001).
 */
export function useChatModelCatalog() {
  const availability = useRuntimeAvailabilityStore()
  const catalogs = useLLMProviderConfigStore()

  const runtimes = computed<ChatRuntimeOption[]>(() => availability.availabilities.map((entry) => ({
    runtimeKind: entry.runtimeKind,
    label: runtimeKindToLabel(entry.runtimeKind),
    shortLabel: runtimeShortLabel(entry.runtimeKind),
    enabled: entry.enabled,
    reason: entry.reason,
  })))

  const enabledRuntimeKinds = computed(() => runtimes.value.filter((runtime) => runtime.enabled).map((runtime) => runtime.runtimeKind))

  const ensureAvailability = () => availability.fetchRuntimeAvailabilities().catch(() => undefined)

  const catalogState = (runtimeKind: string): ChatCatalogState => catalogs.catalogSnapshot(runtimeKind).state

  const ensureCatalog = (runtimeKind: string): void => {
    void catalogs.fetchProvidersWithModels(runtimeKind).catch(() => undefined)
  }

  const modelGroups = (runtimeKind: string): ChatModelGroup[] =>
    catalogs.providersWithModelsForSelection(runtimeKind).map(({ provider, models }) => ({
      providerName: provider.name,
      models: models.map((model) => ({
        runtimeKind,
        llmModelIdentifier: model.modelIdentifier,
        name: model.modelIdentifier,
        title: model.name && model.name !== model.modelIdentifier ? model.name : null,
        providerName: provider.name,
        description: model.description ?? null,
      })),
    }))

  const modelCount = (runtimeKind: string): number =>
    modelGroups(runtimeKind).reduce((total, group) => total + group.models.length, 0)

  const findModel = (runtimeKind: string, llmModelIdentifier: string): ChatModelOption | null => {
    for (const group of modelGroups(runtimeKind)) {
      const match = group.models.find((model) => model.llmModelIdentifier === llmModelIdentifier)
      if (match) return match
    }
    return null
  }

  const modelLabel = (runtimeKind: string, llmModelIdentifier: string): string =>
    findModel(runtimeKind, llmModelIdentifier)?.name ?? llmModelIdentifier

  const schemaFor = (runtimeKind: string, llmModelIdentifier: string | null | undefined): UiModelConfigSchema | null =>
    catalogs.modelConfigSchemaByIdentifier(runtimeKind, llmModelIdentifier)

  /** Search models across the given runtimes; every term must match the model, provider or runtime. */
  const search = (query: string, runtimeKinds: readonly string[]): ChatModelOption[] => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (!terms.length) return []
    return runtimeKinds.flatMap((runtimeKind) => catalogState(runtimeKind) !== 'ready'
      ? []
      : modelGroups(runtimeKind).flatMap((group) => group.models)
        .filter((model) => {
          const haystack = `${model.name} ${model.title ?? ''} ${model.providerName} ${runtimeKindToLabel(runtimeKind)}`.toLowerCase()
          return terms.every((term) => haystack.includes(term))
        }))
  }

  const isSearching = (runtimeKinds: readonly string[]): boolean =>
    runtimeKinds.some((runtimeKind) => {
      const state = catalogState(runtimeKind)
      return state === 'loading' || state === 'idle'
    })

  return {
    runtimes,
    enabledRuntimeKinds,
    ensureAvailability,
    catalogState,
    ensureCatalog,
    modelGroups,
    modelCount,
    findModel,
    modelLabel,
    schemaFor,
    search,
    isSearching,
  }
}
