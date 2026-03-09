import { DEFAULT_AGENT_RUNTIME_KIND } from '~/types/agent/AgentRunConfig';

interface ModelSelectionLabelModel {
  modelIdentifier: string;
  name?: string | null;
}

export const shouldUseModelIdentifierLabel = (runtimeKind: string | null | undefined): boolean => {
  const normalizedRuntimeKind = runtimeKind?.trim() || DEFAULT_AGENT_RUNTIME_KIND;
  return normalizedRuntimeKind === DEFAULT_AGENT_RUNTIME_KIND;
};

export const getModelSelectionLabel = (
  model: ModelSelectionLabelModel,
  runtimeKind: string | null | undefined,
): string => {
  if (shouldUseModelIdentifierLabel(runtimeKind)) {
    return model.modelIdentifier;
  }

  const normalizedName = model.name?.trim();
  return normalizedName || model.modelIdentifier;
};
