import {
  interpretDelegatedLaunchValidation,
  listDelegatedLaunchModelOptions,
  planDelegatedLaunchValidation,
  type DelegatedLaunchModelOptions,
  type DelegatedLaunchUpdateResult,
} from "../../agent-collaboration/collaborators/delegated-launch-selection-command.js";
import { delegatedLaunchSelections, type DelegatedLaunchChange } from "../../agent-collaboration/domain/delegated-launch-selection.js";
import { taskExecutionReferenceKey, type TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { RunModelSelectionService, RunModelSelectionValidator } from "../../llm-management/services/run-model-selection-service.js";
import type { RunModelConfigFieldError, RunModelConfigUpdateOutcome } from "../../run-history/domain/run-model-config.js";
import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import { applyTeamDelegatedLaunchSelections, teamDelegatedLaunchForest } from "./team-run-execution-tree-mutator.js";
import {
  applyTeamRunModelConfigPatches,
  resolveTeamRunModelConfigTargets,
  type TeamRunModelConfigPatch,
} from "./team-run-model-config-mutator.js";

/** The delegated copies of one (stored or live) Team tree, their started sources and closed copies. */
const reader = (tree: TeamRunExecutionTreeSnapshot, closed: readonly TaskExecutionReference[]) => {
  const closedKeys = new Set(closed.map(taskExecutionReferenceKey));
  return {
    forest: teamDelegatedLaunchForest(tree),
    isClosed: (reference: TaskExecutionReference) => closedKeys.has(taskExecutionReferenceKey(reference)),
  };
};

export type StoppedTeamLaunchSavePlan =
  | { kind: "refused"; outcome: RunModelConfigUpdateOutcome; message: string; fieldErrors?: readonly RunModelConfigFieldError[] }
  | { kind: "planned"; nextTree: TeamRunExecutionTreeSnapshot };

/** Planning and validation never report a running copy: every copy of a stopped root is stopped. */
const delegatedRefusal = (refusal: DelegatedLaunchUpdateResult): StoppedTeamLaunchSavePlan => ({
  kind: "refused",
  outcome: refusal.outcome === "COPY_RUNNING" ? "INTERNAL_ERROR" : refusal.outcome,
  message: refusal.message,
  fieldErrors: refusal.fieldErrors,
});

/**
 * AR-004: the stopped Team run's Save plan — its configured model settings and the user model
 * choices of its delegated copies (DS-001), validated together in one catalog
 * read — as the tree to write, or the refusal. The caller owns the gates and the one tree write.
 */
export const planStoppedTeamLaunchSave = async (input: {
  tree: TeamRunExecutionTreeSnapshot;
  closed: readonly TaskExecutionReference[];
  configuredPatches: readonly TeamRunModelConfigPatch[];
  delegatedChanges: readonly DelegatedLaunchChange[];
  validator: RunModelSelectionValidator;
}): Promise<StoppedTeamLaunchSavePlan> => {
  const { tree } = input;
  let targets;
  try {
    // A Save of delegated choices alone has no configured patch (AR-004).
    targets = input.configuredPatches.length || !input.delegatedChanges.length
      ? resolveTeamRunModelConfigTargets(tree, input.configuredPatches)
      : [];
  } catch (error) {
    return { kind: "refused", outcome: "VALIDATION_FAILED", message: "Team model-setting targets are invalid.",
      fieldErrors: [{ path: "patches", message: error instanceof Error ? error.message : String(error) }] };
  }
  const delegatedPlan = input.delegatedChanges.length
    ? planDelegatedLaunchValidation({ ...reader(tree, input.closed), changes: input.delegatedChanges })
    : null;
  if (delegatedPlan?.kind === "refused") return delegatedRefusal(delegatedPlan.result);
  const allResults = await input.validator.validateMany([...targets.map((target) => ({
    context: { runtimeKind: target.launchConfiguration.runtimeKind,
      currentModelIdentifier: target.launchConfiguration.llmModelIdentifier,
      workspaceRootPath: target.launchConfiguration.workspaceRootPath ?? process.cwd() },
    selection: target.patch,
  })), ...(delegatedPlan?.inputs ?? [])]);
  const results = allResults.slice(0, targets.length);
  const delegated = delegatedPlan ? interpretDelegatedLaunchValidation(delegatedPlan.targets, allResults.slice(targets.length)) : null;
  const validations = targets.map((target, index) => ({ target, result: results[index]! }));
  const unavailable = validations.find(({ result }) =>
    result.kind === "model_unavailable" || result.kind === "schema_unavailable");
  if (unavailable) {
    return { kind: "refused",
      outcome: unavailable.result.kind === "model_unavailable" ? "MODEL_UNAVAILABLE" : "SCHEMA_UNAVAILABLE",
      message: `Current model options for '${unavailable.target.patch.scopeAddress}' are unavailable; saved settings were not changed.` };
  }
  const invalid = validations.filter((entry) => entry.result.kind === "invalid");
  if (invalid.length) {
    return { kind: "refused", outcome: "VALIDATION_FAILED", message: "One or more Team model settings are invalid.",
      fieldErrors: invalid.flatMap(({ target, result }) => result.kind === "invalid"
        ? result.errors.map((error) => ({ path: `patches[${target.patch.scopeAddress}].${error.path}`, message: error.message }))
        : []) };
  }
  const normalizedTargets = targets.map((target, index) => ({
    ...target,
    patch: { ...target.patch, ...(validations[index]!.result.kind === "valid" ? validations[index]!.result.selection : target.patch) },
  }));
  if (delegated?.kind === "refused") return delegatedRefusal(delegated.result);
  const configuredTree = applyTeamRunModelConfigPatches(tree, normalizedTargets);
  return { kind: "planned", nextTree: delegated
    ? applyTeamDelegatedLaunchSelections(configuredTree, delegatedLaunchSelections(delegated.targets, new Date().toISOString()))
    : configuredTree };
};

/** Model options of every editable delegated copy of the tree. */
export const teamDelegatedLaunchModelOptions = (
  tree: TeamRunExecutionTreeSnapshot,
  closed: readonly TaskExecutionReference[],
  modelOptions: Pick<RunModelSelectionService, "listOptionsMany">,
): Promise<readonly DelegatedLaunchModelOptions[]> => listDelegatedLaunchModelOptions({ ...reader(tree, closed), modelOptions });
