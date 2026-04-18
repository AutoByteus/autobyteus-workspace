import { DEFAULT_AGENT_RUNTIME_KIND } from '~/types/agent/AgentRunConfig'

interface ModelSelectionLabelModel {
  modelIdentifier: string
  name?: string | null
  providerType?: string | null
}

const isCustomOpenAiCompatibleModel = (model: ModelSelectionLabelModel): boolean =>
  model.providerType === 'OPENAI_COMPATIBLE'

export const shouldUseModelIdentifierLabel = (runtimeKind: string | null | undefined): boolean => {
  const normalizedRuntimeKind = runtimeKind?.trim() || DEFAULT_AGENT_RUNTIME_KIND
  return normalizedRuntimeKind === DEFAULT_AGENT_RUNTIME_KIND
}

export const getModelSelectionOptionLabel = (
  model: ModelSelectionLabelModel,
  runtimeKind: string | null | undefined,
): string => {
  const normalizedName = model.name?.trim()

  if (isCustomOpenAiCompatibleModel(model) && normalizedName) {
    return normalizedName
  }

  if (shouldUseModelIdentifierLabel(runtimeKind)) {
    return model.modelIdentifier
  }

  return normalizedName || model.modelIdentifier
}

export const getModelSelectionLabel = (
  model: ModelSelectionLabelModel,
  runtimeKind: string | null | undefined,
): string => getModelSelectionOptionLabel(model, runtimeKind)

export const getModelSelectionSelectedLabel = (
  providerLabel: string | null | undefined,
  model: ModelSelectionLabelModel,
  runtimeKind: string | null | undefined,
): string => {
  const optionLabel = getModelSelectionOptionLabel(model, runtimeKind)
  const normalizedProviderLabel = providerLabel?.trim()
  return normalizedProviderLabel ? `${normalizedProviderLabel} / ${optionLabel}` : optionLabel
}
