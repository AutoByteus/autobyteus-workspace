import { selectionContextFor } from "../../agent-execution/services/stopped-run-selection-context.js";
import type { RunModelSelectionValidator } from "../../llm-management/services/run-model-selection-service.js";
import { isUnavailableModelSelection, runModelSelectionRefusal } from "../../llm-management/services/run-model-selection-refusal.js";
import type { RunModelConfigFieldError, RunModelConfigUpdateOutcome } from "../../run-history/domain/run-model-config.js";
import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import {
  applyTeamRunSelectionPatches,
  resolveTeamRunSelectionTargets,
  type TeamRunSelectionPatch,
  type TeamRunSelectionTarget,
} from "./team-run-selection-mutator.js";

type SaveRefusal = { kind: "refused"; outcome: RunModelConfigUpdateOutcome; message: string; fieldErrors?: readonly RunModelConfigFieldError[] };

export type StoppedTeamLaunchSavePlan = SaveRefusal | { kind: "planned"; nextTree: TeamRunExecutionTreeSnapshot };

/** The validated targets of a Team scope save (the canonical selection and the decided continuation each), or the refusal. */
export type TeamLaunchSelectionPlan = SaveRefusal | { kind: "planned"; targets: readonly TeamRunSelectionTarget[] };

/**
 * AR-004: the stopped Team run's Save plan — its own model settings, validated in one catalog read — as the tree to
 * write, or the refusal. The caller owns the gates and the tree write. A run it delegated to saves its own (SR-039).
 */
export const planStoppedTeamLaunchSave = async (input: {
  tree: TeamRunExecutionTreeSnapshot;
  configuredPatches: readonly TeamRunSelectionPatch[];
  validator: RunModelSelectionValidator;
}): Promise<StoppedTeamLaunchSavePlan> => {
  const plan = await planTeamLaunchSelection(input);
  return plan.kind === "refused" ? plan : { kind: "planned", nextTree: applyTeamRunSelectionPatches(input.tree, plan.targets) };
};

/**
 * The validation half of a Team scope save, against `tree`: the targets with their canonical selection and decided
 * continuation, ready for `applyTeamRunSelectionPatches`, or the refusal. A live Team member's automatic switch
 * (autobyteus-646 R-1) applies them to the tree current at its commit.
 */
export const planTeamLaunchSelection = async (input: {
  tree: TeamRunExecutionTreeSnapshot;
  configuredPatches: readonly TeamRunSelectionPatch[];
  validator: RunModelSelectionValidator;
}): Promise<TeamLaunchSelectionPlan> => {
  const { tree } = input;
  let targets;
  try {
    targets = resolveTeamRunSelectionTargets(tree, input.configuredPatches);
  } catch (error) {
    return { kind: "refused", outcome: "VALIDATION_FAILED", message: "Team model-setting targets are invalid.",
      fieldErrors: [{ path: "selectionPatches", message: error instanceof Error ? error.message : String(error) }] };
  }
  const results = await input.validator.validateMany(targets.map((target) => ({
    // The reference is the session the scope last ran on (DEC-005); a configured Agent can hand over, a Team's own
    // default scope has no session to continue (DEC-007).
    context: selectionContextFor({ ...target.launchConfiguration, pendingRuntimeSwitch: target.pendingRuntimeSwitch }, target.patch,
      target.patch.scopeKind === "CONFIGURED_AGENT" ? "available" : "no_session"),
    selection: target.patch,
  })));
  const validations = targets.map((target, index) => ({ target, result: results[index]! }));
  for (const { target, result } of validations) {
    if (!isUnavailableModelSelection(result)) continue;
    return { kind: "refused", ...runModelSelectionRefusal({ result, llmModelIdentifier: target.patch.llmModelIdentifier,
      runtimeKind: target.patch.runtimeKind, scopeAddress: target.patch.scopeAddress, savedSettingsUnchanged: true }) };
  }
  const invalid = validations.filter((entry) => entry.result.kind === "invalid");
  if (invalid.length) {
    return { kind: "refused", outcome: "VALIDATION_FAILED", message: "One or more Team model settings are invalid.",
      fieldErrors: invalid.flatMap(({ target, result }) => result.kind === "invalid"
        ? result.errors.map((error) => ({ path: `selectionPatches[${target.patch.scopeAddress}].${error.path}`, message: error.message }))
        : []) };
  }
  const normalizedTargets = targets.map((target, index) => {
    const result = validations[index]!.result;
    return {
      ...target,
      patch: { ...target.patch, ...(result.kind === "valid" ? result.selection : target.patch) },
      // The continuation decided for this scope (REQ-003); a Team's own default scope never reaches the switch rule.
      continuation: result.kind === "valid" ? result.continuation : "same_session" as const,
    };
  });
  return { kind: "planned", targets: normalizedTargets };
};
