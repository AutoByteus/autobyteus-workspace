import type { ExistingAgentRunSelection, ExistingRunModelSelection } from '~/types/agent/ExistingRunModelConfigDraft'
export const cloneExistingRunJsonValue = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map(cloneExistingRunJsonValue) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, child]) => [key, cloneExistingRunJsonValue(child)]),
    ) as T
  }
  return value
}

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => [key, canonicalize(child)]))
}

export const cloneExistingRunModelConfig = (
  value: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null => value ? cloneExistingRunJsonValue(value) : null

export const existingRunModelConfigsEqual = (
  left: Record<string, unknown> | null | undefined,
  right: Record<string, unknown> | null | undefined,
): boolean => JSON.stringify(canonicalize(left ?? null)) === JSON.stringify(canonicalize(right ?? null))

export const cloneExistingRunSelection = (selection: ExistingRunModelSelection): ExistingRunModelSelection => ({
  llmModelIdentifier: selection.llmModelIdentifier, llmConfig: cloneExistingRunModelConfig(selection.llmConfig),
})
export const existingRunSelectionsEqual = (left: ExistingRunModelSelection, right: ExistingRunModelSelection): boolean =>
  left.llmModelIdentifier === right.llmModelIdentifier && existingRunModelConfigsEqual(left.llmConfig, right.llmConfig)
export const selectionAllowed = (original: ExistingRunModelSelection, draft: ExistingRunModelSelection,
  state?: import('~/types/agent/ExistingRunModelConfigDraft').ExistingRunModelOptionsState): boolean =>
  original.llmModelIdentifier === draft.llmModelIdentifier || Boolean(state?.status === 'ready' &&
    state.options?.currentModelIdentifier === original.llmModelIdentifier &&
    state.options.replacements.some((option) => option.llmModelIdentifier === draft.llmModelIdentifier))

export const cloneExistingAgentRunSelection = (selection: ExistingAgentRunSelection): ExistingAgentRunSelection => ({
  runtimeKind: selection.runtimeKind, ...cloneExistingRunSelection(selection),
})
export const existingAgentRunSelectionsEqual = (left: ExistingAgentRunSelection, right: ExistingAgentRunSelection): boolean =>
  left.runtimeKind === right.runtimeKind && existingRunSelectionsEqual(left, right)
