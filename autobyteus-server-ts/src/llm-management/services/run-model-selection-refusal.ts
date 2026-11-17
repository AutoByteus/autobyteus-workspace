import { agentRuntimeName } from "@autobyteus/agent-presentation-contracts";
import type { RunModelConfigUpdateOutcome } from "../../run-history/domain/run-model-config.js";
import type { RunModelSelectionValidationResult, StoredModelOfferCheck } from "./run-model-selection-service.js";
import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";

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

/** G-5 (REQ-016): the code of a start refused because the stored model is no longer offered by its runtime. */
export const RUN_MODEL_NOT_OFFERED = "RUN_MODEL_NOT_OFFERED";

/** The refusal of a start whose saved model its runtime no longer offers (FR-1 ... FR-4; design G-5). */
export const storedModelNotOfferedRefusal = (input: { agentName: string; runtimeKind: string; llmModelIdentifier: string }) => ({
  code: RUN_MODEL_NOT_OFFERED as typeof RUN_MODEL_NOT_OFFERED,
  message: `${input.agentName} can't start: its saved model '${input.llmModelIdentifier}' is not offered by `
    + `${agentRuntimeName(input.runtimeKind)} now. Stop it, then choose a runtime and model for ${input.agentName} in Settings.`,
});

/** G-5's collaborators on both start paths: the run's definition read (SR-015 R2), then the stored-model offer. */
export type StoredModelStartChecks = Readonly<{
  agentDefinitions: Pick<AgentDefinitionService, "getAgentDefinitionById">;
  storedModels: StoredModelOfferCheck;
}>;

/**
 * G-5: the refusal for a start whose saved model its runtime no longer offers; null when it may start (offered, or the
 * list could not be read). Both start paths ask this before the runtime starts. It speaks only for an agent that
 * exists (SR-015 R2): a missing definition, or a failed read, leaves the path's own answer ("not found") to speak.
 */
export const storedModelStartRefusal = async (checks: StoredModelStartChecks, input: { agentDefinitionId: string;
  agentName: string; runtimeKind: string; llmModelIdentifier: string; workspaceRootPath?: string | null }) => {
  const { agentName, runtimeKind, llmModelIdentifier } = input;
  if (!await checks.agentDefinitions.getAgentDefinitionById(input.agentDefinitionId).catch(() => null)) return null;
  const offer = await checks.storedModels.storedModelOffer({ runtimeKind, llmModelIdentifier, workspaceRootPath: input.workspaceRootPath ?? undefined });
  return offer === "not_offered" ? storedModelNotOfferedRefusal({ agentName, runtimeKind, llmModelIdentifier }) : null;
};

/** A member start refused for its saved model: the member path's readiness card shows its code and message. */
export class StoredModelNotOfferedError extends Error {
  readonly code = RUN_MODEL_NOT_OFFERED;
}

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
