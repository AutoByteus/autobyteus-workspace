import { computed } from 'vue'
import { useRuntimeAvailabilityStore } from '~/stores/runtimeAvailabilityStore'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { runtimeKindToLabel } from '~/types/agent/AgentRunConfig'
import { runtimeShortLabel } from '~/utils/chat/chatDefaults'
import type { UiModelConfigSchema } from '~/utils/llmConfigSchema'
import type { ModelInfo } from '~/stores/llmProviderConfigSupport'
import {
  getModelSelectionOptionDescription,
  getModelSelectionOptionLabel,
  isClaudeAgentSdkRuntime,
  type ModelSelectionLabelModel,
} from '~/utils/modelSelectionLabel'
import { compareRecommendedFirstBy } from '~/utils/modelSelectionOptions'

export type ChatCatalogState = 'idle' | 'loading' | 'ready' | 'error'

export interface ChatRuntimeOption {
  runtimeKind: string
  label: string
  shortLabel: string
  enabled: boolean
  reason: string | null
}

/**
 * One Chat model row. `label`, `secondary` and `recommended` come from the shared model-selection
 * label policy (the launch form's), so both surfaces name a model the same way (D-16).
 */
export interface ChatModelOption {
  runtimeKind: string
  /** The selection identity; never a display string. */
  llmModelIdentifier: string
  label: string
  secondary: string | null
  recommended: boolean
  providerName: string
  /** Search-only: the display and canonical names behind the label. */
  displayName: string | null
  canonicalName: string | null
}

export interface ChatModelOptionInput {
  runtimeKind: string
  llmModelIdentifier: string
  providerName: string
  /** The runtime catalog record; without it the row is labeled by its identifier. */
  catalogModel?: ModelInfo | null
}

/** The only place Chat builds `{ label, secondary, recommended }`. */
export const toChatModelOption = (input: ChatModelOptionInput): ChatModelOption => {
  const labelInput: ModelSelectionLabelModel = input.catalogModel ?? { modelIdentifier: input.llmModelIdentifier }
  return {
    runtimeKind: input.runtimeKind,
    llmModelIdentifier: input.llmModelIdentifier,
    label: getModelSelectionOptionLabel(labelInput, input.runtimeKind),
    secondary: getModelSelectionOptionDescription(labelInput, input.runtimeKind),
    recommended: input.catalogModel?.selectionPresentation?.recommended === true,
    providerName: input.providerName,
    displayName: labelInput.name?.trim() || null,
    canonicalName: labelInput.canonicalName?.trim() || null,
  }
}

const compareChatRecommendedFirst = compareRecommendedFirstBy<ChatModelOption>((option) => option.label)

/** Recommended-first order for Claude Agent SDK, as in the launch form; other runtimes keep catalog order. */
export const orderChatModelOptions = (runtimeKind: string, options: ChatModelOption[]): ChatModelOption[] =>
  isClaudeAgentSdkRuntime(runtimeKind) ? [...options].sort(compareChatRecommendedFirst) : options

const toQueryTerms = (query: string): string[] => query.trim().toLowerCase().split(/\s+/).filter(Boolean)

/** Every term must match the identifier, label, display/canonical name, secondary text, provider or runtime. */
export const matchesModelQuery = (option: ChatModelOption, terms: readonly string[]): boolean => {
  const haystack = [
    option.llmModelIdentifier, option.label, option.displayName, option.canonicalName,
    option.secondary, option.providerName, runtimeKindToLabel(option.runtimeKind),
  ].filter(Boolean).join(' ').toLowerCase()
  return terms.every((term) => haystack.includes(term))
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
      models: orderChatModelOptions(runtimeKind, models.map((model) => toChatModelOption({
        runtimeKind, llmModelIdentifier: model.modelIdentifier, providerName: provider.name, catalogModel: model,
      }))),
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
    findModel(runtimeKind, llmModelIdentifier)?.label ?? llmModelIdentifier

  const schemaFor = (runtimeKind: string, llmModelIdentifier: string | null | undefined): UiModelConfigSchema | null =>
    catalogs.modelConfigSchemaByIdentifier(runtimeKind, llmModelIdentifier)

  /** Cross-runtime search over the loaded catalogs. */
  const search = (query: string, runtimeKinds: readonly string[]): ChatModelOption[] => {
    const terms = toQueryTerms(query)
    if (!terms.length) return []
    return runtimeKinds.flatMap((runtimeKind) => catalogState(runtimeKind) !== 'ready'
      ? []
      : modelGroups(runtimeKind).flatMap((group) => group.models).filter((model) => matchesModelQuery(model, terms)))
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
