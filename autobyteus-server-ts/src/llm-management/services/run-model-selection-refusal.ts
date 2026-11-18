import { agentRuntimeName } from "@autobyteus/agent-presentation-contracts";
import type { RunModelConfigUpdateOutcome } from "../../run-history/domain/run-model-config.js";
import type { RunModelSelectionValidationResult } from "./run-model-selection-service.js";

/** The validation results that mean "this selection cannot be used now", whatever the cause. */
export type UnavailableModelSelectionResult = Extract<RunModelSelectionValidationResult,
  { kind: "model_unavailable" | "model_list_unavailable" | "schema_unavailable" }>;

export const isUnavailableModelSelection = (
  result: RunModelSelectionValidationResult,
): result is UnavailableModelSelectionResult =>
  result.kind === "model_unavailable" || result.kind === "model_list_unavailable" || result.kind === "schema_unavailable";

/** The model is not in the runtime's current list: tells the user to refresh the list and choose again. */
export const modelNotOfferedText = (input: {
  llmModelIdentifier: string;
  runtimeKind: string;
  scopeAddress?: string | null;
}): string =>
  `'${input.llmModelIdentifier}' is not offered by ${agentRuntimeName(input.runtimeKind)} now`
  + `${input.scopeAddress ? ` (for '${input.scopeAddress}')` : ""}. Refresh the model list and choose again.`;

/** The runtime's list could not be read (not "the model is missing"): tells the user to try again. */
export const modelListUnreadableText = (runtimeKind: string, diagnostic?: string | null): string => {
  const reason = diagnostic?.trim().replace(/[.\s]+$/, "");
  return `The model list of ${agentRuntimeName(runtimeKind)} could not be read${reason ? `: ${reason}` : ""}. Try again.`;
};

const modelSettingsUncheckedText = (llmModelIdentifier: string): string =>
  `The settings of model '${llmModelIdentifier}' could not be checked.`;

/**
 * The one wording and outcome of an unavailable model selection (REQ-013). `savedSettingsUnchanged` is true for a
 * Save (the refusal changed nothing) and false for a launch.
 */
export const runModelSelectionRefusal = (input: {
  result: UnavailableModelSelectionResult;
  llmModelIdentifier: string;
  runtimeKind: string;
  scopeAddress?: string | null;
  savedSettingsUnchanged: boolean;
}): { outcome: Extract<RunModelConfigUpdateOutcome, "MODEL_UNAVAILABLE" | "MODEL_LIST_UNAVAILABLE" | "SCHEMA_UNAVAILABLE">; message: string } => {
  const { result } = input;
  const [outcome, text] = result.kind === "model_unavailable"
    ? ["MODEL_UNAVAILABLE" as const, modelNotOfferedText(input)]
    : result.kind === "model_list_unavailable"
      ? ["MODEL_LIST_UNAVAILABLE" as const, modelListUnreadableText(input.runtimeKind, result.catalogDiagnostic?.message)]
      : ["SCHEMA_UNAVAILABLE" as const, modelSettingsUncheckedText(input.llmModelIdentifier)];
  return { outcome, message: input.savedSettingsUnchanged ? `${text} Saved settings were not changed.` : text };
};
