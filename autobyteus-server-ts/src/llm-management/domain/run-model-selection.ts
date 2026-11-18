import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
export type RunModelSelection = Readonly<{
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
}>;
export type RunModelSelectionContext = Readonly<{
  runtimeKind: RuntimeKind;
  currentModelIdentifier: string;
  workspaceRootPath: string;
}>;
/** Where a selection is validated; `currentModelIdentifier` is `null` for a fresh selection of an agent runtime the run is not on. */
export type RunModelValidationContext = Readonly<Omit<RunModelSelectionContext, "currentModelIdentifier"> & {
  currentModelIdentifier: string | null;
}>;
export type RunModelChoice = Readonly<{
  llmModelIdentifier: string;
  providerName: string;
  displayName: string;
  canonicalName: string;
  description: string | null;
  configSchema: Record<string, unknown> | null;
  recommended: boolean;
}>;
/**
 * One scope's options answer. `modelListReadable` is false only when the runtime's model list could not be read: the options
 * are then empty and not authoritative, and `unavailableReason` holds the owner's text. `unavailableReason` is also set for a
 * readable answer whose context capacity is unverified, so callers decide read-vs-unread from `modelListReadable` alone.
 */
export type RunModelOptions = Readonly<{
  currentModelIdentifier: string;
  modelListReadable: boolean;
  currentModel: RunModelChoice | null;
  replacements: readonly RunModelChoice[];
  unavailableReason: string | null;
}>;
