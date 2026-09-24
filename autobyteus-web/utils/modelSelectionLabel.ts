import { DEFAULT_AGENT_RUNTIME_KIND } from '~/types/agent/AgentRunConfig'

const CLAUDE_AGENT_SDK_RUNTIME_KIND = 'claude_agent_sdk'

interface ModelSelectionLabelModel {
  modelIdentifier: string
  name?: string | null
  description?: string | null
  canonicalName?: string | null
  providerType?: string | null
}

export const isClaudeAgentSdkRuntime = (runtimeKind: string | null | undefined): boolean =>
  runtimeKind?.trim() === CLAUDE_AGENT_SDK_RUNTIME_KIND

const isCustomOpenAiCompatibleModel = (model: ModelSelectionLabelModel): boolean =>
  model.providerType === 'OPENAI_COMPATIBLE'

const isQwenModel = (model: ModelSelectionLabelModel): boolean =>
  model.providerType === 'QWEN'

export const shouldUseModelIdentifierLabel = (runtimeKind: string | null | undefined): boolean => {
  const normalizedRuntimeKind = runtimeKind?.trim() || DEFAULT_AGENT_RUNTIME_KIND
  return normalizedRuntimeKind === DEFAULT_AGENT_RUNTIME_KIND
}

export const getModelSelectionOptionLabel = (
  model: ModelSelectionLabelModel,
  runtimeKind: string | null | undefined,
): string => {
  const normalizedName = model.name?.trim()

  if (isClaudeAgentSdkRuntime(runtimeKind)) {
    return model.canonicalName?.trim() || model.modelIdentifier
  }

  if (isCustomOpenAiCompatibleModel(model) && normalizedName) {
    return normalizedName
  }

  if (isQwenModel(model) && normalizedName) {
    return normalizedName
  }

  if (shouldUseModelIdentifierLabel(runtimeKind)) {
    return model.modelIdentifier
  }

  return normalizedName || model.modelIdentifier
}

/**
 * Secondary option text. Claude Agent SDK options are labeled by canonical model ID, so
 * Claude's own display name leads the description to keep the option recognisable.
 */
export const getModelSelectionOptionDescription = (
  model: ModelSelectionLabelModel,
  runtimeKind: string | null | undefined,
): string | null => {
  const normalizedDescription = model.description?.trim() || null
  if (!isClaudeAgentSdkRuntime(runtimeKind)) {
    return normalizedDescription
  }
  const normalizedName = model.name?.trim()
  const displayName = normalizedName && normalizedName !== getModelSelectionOptionLabel(model, runtimeKind)
    ? normalizedName
    : null
  return [displayName, normalizedDescription].filter(Boolean).join(' · ') || null
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
