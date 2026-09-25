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
export type RunModelOption = Readonly<{ llmModelIdentifier: string }>;
export type RunModelOptions = Readonly<{
  currentModelIdentifier: string;
  replacements: readonly RunModelOption[];
  unavailableReason: string | null;
}>;
