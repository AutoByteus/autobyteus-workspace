import type { GroupedOption, SelectItem } from '~/components/agentTeams/SearchableGroupedSelect.vue'
import type { ModelInfo, ProviderWithModels } from '~/stores/llmProviderConfig'
import {
  getModelSelectionOptionDescription,
  getModelSelectionOptionLabel,
  getModelSelectionSelectedLabel,
  isClaudeAgentSdkRuntime,
} from '~/utils/modelSelectionLabel'

/** The listed row an alias row folds into, when that target is a listed row of the same group. */
const resolveAliasTarget = (
  model: ModelInfo,
  modelsByIdentifier: ReadonlyMap<string, ModelInfo>,
): string | null => {
  const targetIdentifier = model.selectionPresentation?.aliasOfModelIdentifier
  if (!targetIdentifier || targetIdentifier === model.modelIdentifier) return null
  const target = modelsByIdentifier.get(targetIdentifier)
  return target && !target.selectionPresentation?.aliasOfModelIdentifier ? targetIdentifier : null
}

const compareRecommendedFirst = (left: SelectItem, right: SelectItem): number =>
  Number(Boolean(right.recommended)) - Number(Boolean(left.recommended))
  || left.name.localeCompare(right.name)

/**
 * The single owner of provider groups -> LLM model picker options: folds alias rows into
 * the option that represents them, applies runtime label rules and the recommended flag,
 * and orders Claude Agent SDK options recommended-first.
 */
export const buildModelSelectionGroups = (
  providerGroups: readonly ProviderWithModels[],
  runtimeKind: string | null | undefined,
): GroupedOption[] => providerGroups.map((providerGroup) => {
  const providerName = providerGroup.provider.name
  const modelsByIdentifier = new Map(providerGroup.models.map((model) => [model.modelIdentifier, model]))
  const aliasIdsByTarget = new Map<string, string[]>()
  for (const model of providerGroup.models) {
    const target = resolveAliasTarget(model, modelsByIdentifier)
    if (target) aliasIdsByTarget.set(target, [...(aliasIdsByTarget.get(target) ?? []), model.modelIdentifier])
  }

  const items = providerGroup.models
    .filter((model) => !resolveAliasTarget(model, modelsByIdentifier))
    .map((model): SelectItem => {
      const aliasIds = aliasIdsByTarget.get(model.modelIdentifier)
      return {
        id: model.modelIdentifier,
        name: getModelSelectionOptionLabel(model, runtimeKind),
        description: getModelSelectionOptionDescription(model, runtimeKind),
        selectedLabel: getModelSelectionSelectedLabel(providerName, model, runtimeKind),
        ...(aliasIds ? { aliasIds } : {}),
        ...(model.selectionPresentation?.recommended ? { recommended: true } : {}),
      }
    })

  return {
    label: providerName,
    items: isClaudeAgentSdkRuntime(runtimeKind) ? items.sort(compareRecommendedFirst) : items,
  }
})
