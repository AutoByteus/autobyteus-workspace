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
export type RunModelChoice = Readonly<{
  llmModelIdentifier: string;
  providerName: string;
  displayName: string;
  canonicalName: string;
  description: string | null;
  configSchema: Record<string, unknown> | null;
  recommended: boolean;
}>;
export type RunModelOptions = Readonly<{
  currentModelIdentifier: string;
  currentModel: RunModelChoice | null;
  replacements: readonly RunModelChoice[];
  unavailableReason: string | null;
}>;
