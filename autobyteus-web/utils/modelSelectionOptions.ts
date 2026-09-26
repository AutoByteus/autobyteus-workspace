import type { GroupedOption, SelectItem } from '~/components/agentTeams/SearchableGroupedSelect.vue'
import type { ProviderWithModels } from '~/stores/llmProviderConfig'
import {
  getModelSelectionOptionDescription,
  getModelSelectionOptionLabel,
  getModelSelectionSelectedLabel,
  isClaudeAgentSdkRuntime,
} from '~/utils/modelSelectionLabel'

const compareRecommendedFirst = (left: SelectItem, right: SelectItem): number =>
  Number(Boolean(right.recommended)) - Number(Boolean(left.recommended))
  || left.name.localeCompare(right.name)

/**
 * Formats the backend's offered rows; it never infers alias identity or hides a choice.
 * Applies runtime label rules and the recommended flag,
 * and orders Claude Agent SDK options recommended-first.
 */
export const buildModelSelectionGroups = (
  providerGroups: readonly ProviderWithModels[],
  runtimeKind: string | null | undefined,
): GroupedOption[] => providerGroups.map((providerGroup) => {
  const providerName = providerGroup.provider.name
  const items = providerGroup.models
    .map((model): SelectItem => {
      return {
        id: model.modelIdentifier,
        name: getModelSelectionOptionLabel(model, runtimeKind),
        description: getModelSelectionOptionDescription(model, runtimeKind),
        selectedLabel: getModelSelectionSelectedLabel(providerName, model, runtimeKind),
        ...(model.selectionPresentation?.recommended ? { recommended: true } : {}),
      }
    })

  return {
    label: providerName,
    items: isClaudeAgentSdkRuntime(runtimeKind) ? items.sort(compareRecommendedFirst) : items,
  }
})
