import type { RunModelSelectionService, RunModelSelectionValidator } from "../../llm-management/services/run-model-selection-service.js";
import type { RunModelOptions } from "../../llm-management/domain/run-model-selection.js";
import type { RunModelConfigFieldError, RunModelConfigUpdateOutcome } from "../../run-history/domain/run-model-config.js";
import {
  DelegatedLaunchTargetError,
  delegatedLaunchSelections,
  listDelegatedLaunchTargets,
  resolveDelegatedLaunchTargets,
  type DelegatedLaunchChange,
  type DelegatedLaunchForest,
  type DelegatedLaunchSelections,
  type DelegatedLaunchTarget,
  type DelegatedRunReference,
  type DelegatedTaskSourceReader,
} from "../domain/delegated-launch-selection.js";
import { delegatedStopSet } from "../domain/delegated-stop-set.js";
import { collaboratorHostedLaunches } from "./collaborator-source-projector.js";
import type { RetainedAgentExecutionControl } from "../execution/domain/configured-agent-execution.js";
import type { AgentExecutionStatus } from "@autobyteus/collaboration-stream-contracts";
import type { StoppedTaskExecutionsStep, TaskExecutionUserStopResult } from "../execution/task/root-task-execution-lifecycle.js";
import { RootTaskPersistenceFinalizationIndeterminateError, TaskDelegationError } from "../execution/task/task-delegation-command.js";

/** The outcome vocabulary of model-setting Saves, plus a copy that is running (AR-001). */
export type DelegatedLaunchUpdateOutcome = RunModelConfigUpdateOutcome | "COPY_RUNNING";

export type DelegatedLaunchUpdateResult = Readonly<{
  outcome: DelegatedLaunchUpdateOutcome;
  message: string;
  fieldErrors: readonly RunModelConfigFieldError[];
}>;

export type DelegatedStopOutcome = "STOPPED" | "ALREADY_STOPPED" | "NOT_FOUND" | "ROOT_NOT_ACTIVE";

export type DelegatedStopResult = Readonly<{
  outcome: DelegatedStopOutcome;
  message: string;
  /** Older copies (no recorded delegator) still running that could not be attributed to the target (AR-002). */
  notStoppedUnattributed: number;
}>;

/** What a live root lends the command: its tree's lists, sources, task lifecycle, collaborator handles and persistence. */
export type DelegatedLaunchRootPort = Readonly<{
  forest(): DelegatedLaunchForest;
  readTaskSource: DelegatedTaskSourceReader;
  isClosed(reference: DelegatedRunReference): boolean;
  /** The root's task lifecycle (`RootTaskExecutionLifecycle`). */
  tasks: Readonly<{
    stopForUser(executions: readonly DelegatedRunReference[]): Promise<TaskExecutionUserStopResult>;
    whileTaskExecutionsStopped<T>(references: readonly DelegatedRunReference[], operation: () => Promise<T> | T): Promise<StoppedTaskExecutionsStep<T>>;
    taskExecutionStatus(reference: DelegatedRunReference): AgentExecutionStatus;
  }>;
  /** A collaborator Agent's (or collaborator Team member's) retained handle; null when it is not hosted. */
  collaboratorAgentControl(agentRunId: string): RetainedAgentExecutionControl | null;
  /**
   * Commits the selections in one tree write. `afterDurability` runs synchronously once the write is
   * durable and the root's tree is replaced. `unchanged` (nothing written, `afterDurability` not run)
   * when every selection is already recorded. Rejects when nothing was written or the outcome is unknown.
   */
  commitSelections(selections: DelegatedLaunchSelections, afterDurability: () => void): Promise<"committed" | "unchanged">;
  publishCollaboratorOffline(agentRunIds: readonly string[]): void;
  now(): string;
}>;

export type DelegatedLaunchValidation =
  | Readonly<{ kind: "valid"; targets: readonly DelegatedLaunchTarget[] }>
  | Readonly<{ kind: "refused"; result: DelegatedLaunchUpdateResult }>;

const refused = (outcome: DelegatedLaunchUpdateOutcome, message: string, fieldErrors: readonly RunModelConfigFieldError[] = []): Readonly<{ kind: "refused"; result: DelegatedLaunchUpdateResult }> =>
  Object.freeze({ kind: "refused", result: Object.freeze({ outcome, message, fieldErrors: Object.freeze([...fieldErrors]) }) });

type SelectionValidationInput = Parameters<RunModelSelectionValidator["validateMany"]>[0][number];
type SelectionValidationResult = Awaited<ReturnType<RunModelSelectionValidator["validateMany"]>>[number];

/** Resolved changes and their validation inputs, or the refusal of an unresolvable change. */
export type DelegatedLaunchValidationPlan =
  | Readonly<{ kind: "planned"; targets: readonly DelegatedLaunchTarget[]; inputs: readonly SelectionValidationInput[] }>
  | Readonly<{ kind: "refused"; result: DelegatedLaunchUpdateResult }>;

/**
 * Step 1 of a Save (DS-001, AR-001): resolves each change to its copy or collaborator record and
 * builds its validation input exactly like stopped-run model switching (the agent's or Team's
 * runtime and workspace, and its current effective model for the capacity rule).
 */
export const planDelegatedLaunchValidation = (input: Readonly<{
  forest: DelegatedLaunchForest;
  changes: readonly DelegatedLaunchChange[];
  readTaskSource: DelegatedTaskSourceReader;
  isClosed?: (reference: DelegatedRunReference) => boolean;
}>): DelegatedLaunchValidationPlan => {
  if (!input.changes.length) return refused("VALIDATION_FAILED", "No delegated model change was requested.");
  let targets: readonly DelegatedLaunchTarget[];
  try {
    targets = resolveDelegatedLaunchTargets(input);
  } catch (error) {
    if (!(error instanceof DelegatedLaunchTargetError)) throw error;
    return refused("VALIDATION_FAILED", "A delegated model change names no editable copy or collaborator.",
      [{ path: `changes[${error.index}]`, message: error.message }]);
  }
  return Object.freeze({
    kind: "planned",
    targets,
    inputs: Object.freeze(targets.map((target) => ({
      context: {
        runtimeKind: target.current.runtimeKind,
        currentModelIdentifier: target.current.llmModelIdentifier,
        workspaceRootPath: target.current.workspaceRootPath ?? process.cwd(),
      },
      selection: target.selection,
    }))),
  });
};

/** All or nothing: any unavailable or invalid result refuses the Save; valid results are normalized. */
export const interpretDelegatedLaunchValidation = (
  targets: readonly DelegatedLaunchTarget[],
  results: readonly SelectionValidationResult[],
): DelegatedLaunchValidation => {
  const unavailable = results.findIndex((result) => result.kind === "model_unavailable" || result.kind === "schema_unavailable");
  if (unavailable >= 0) {
    return refused(results[unavailable]!.kind === "model_unavailable" ? "MODEL_UNAVAILABLE" : "SCHEMA_UNAVAILABLE",
      `Model options for '${targets[unavailable]!.address}' are unavailable; saved settings were not changed.`);
  }
  const invalid = results.flatMap((result, index) => result.kind === "invalid"
    ? result.errors.map((error) => ({ path: `changes[${targets[index]!.index}].${error.path}`, message: error.message }))
    : []);
  if (invalid.length) return refused("VALIDATION_FAILED", "One or more delegated model settings are invalid.", invalid);
  return Object.freeze({
    kind: "valid",
    targets: Object.freeze(targets.map((target, index) => {
      const result = results[index]!;
      return result.kind === "valid" ? Object.freeze({ ...target, selection: result.selection }) : target;
    })),
  });
};

/** Plan, validate (one shared catalog read) and interpret; used by live roots. */
export const validateDelegatedLaunchChanges = async (input: Parameters<typeof planDelegatedLaunchValidation>[0] & Readonly<{
  validator: RunModelSelectionValidator;
}>): Promise<DelegatedLaunchValidation> => {
  const plan = planDelegatedLaunchValidation(input);
  if (plan.kind === "refused") return plan;
  return interpretDelegatedLaunchValidation(plan.targets, await input.validator.validateMany(plan.inputs));
};

const result = (outcome: DelegatedLaunchUpdateOutcome, message: string): DelegatedLaunchUpdateResult =>
  Object.freeze({ outcome, message, fieldErrors: Object.freeze([]) });

const COPY_RUNNING_MESSAGE = "This copy is running. Stop it, then change its model.";

/**
 * The live-root command shared by Team, Org and Agent roots (DS-001, DS-002). It never mutates a
 * tree or calls a handle except through the root's port.
 */
export class DelegatedLaunchSelectionCommand {
  constructor(private readonly port: DelegatedLaunchRootPort) {}

  /**
   * User Stop of one copy or collaborator and the copies it started (AR-002, SR-006): task copies
   * through the root's task lifecycle (innermost first), then a collaborator's own agents under
   * their activation fences. Each ends restorable; Tasks stay open.
   */
  async stop(target: DelegatedRunReference): Promise<DelegatedStopResult> {
    const set = delegatedStopSet(this.port.forest(), target);
    if (!set) return stopResult("NOT_FOUND", "This run has no such delegated copy or collaborator.", 0);
    let stoppedAny = false;
    try {
      if (set.executions.length) stoppedAny = (await this.port.tasks.stopForUser(set.executions)).stopped.length > 0;
    } catch (error) {
      if (error instanceof TaskDelegationError && error.code === "ROOT_RUN_NOT_ACTIVE") return stopResult("ROOT_NOT_ACTIVE", error.message, 0);
      throw error;
    }
    if (set.collaborator) {
      const released: string[] = [];
      for (const agentRunId of set.collaborator.agentRunIds) {
        const control = this.port.collaboratorAgentControl(agentRunId);
        if (!control) continue;
        const wasLive = await control.withActivationFence(async () => {
          if (control.isStopped()) return false;
          const outcome = await control.releaseRuntimeForUserStop();
          if (!outcome.accepted) throw new Error(outcome.message ?? `Collaborator AgentRun '${agentRunId}' did not stop.`);
          return true;
        });
        if (wasLive) released.push(agentRunId);
      }
      if (released.length) {
        stoppedAny = true;
        this.port.publishCollaboratorOffline(released);
      }
    }
    const unattributed = set.unattributed.filter((reference) => this.port.tasks.taskExecutionStatus(reference) !== "offline").length;
    const note = unattributed ? ` ${unattributed} older cop${unattributed === 1 ? "y" : "ies"} without a recorded starter kept running; stop them from their own rows.` : "";
    return stoppedAny
      ? stopResult("STOPPED", `Stopped. A new message resumes it with its conversation.${note}`, unattributed)
      : stopResult("ALREADY_STOPPED", `Already stopped.${note}`, unattributed);
  }

  /**
   * AR-001: validate first; then, at one serialization point (the collaborators' activation fences
   * in address order, around the task queue's `reconfigure` step), re-check every target is stopped
   * and still present, commit the selections, and after durability give retained collaborator
   * handles their new model. A copy woken meanwhile refuses the whole Save with `COPY_RUNNING`.
   */
  async update(changes: readonly DelegatedLaunchChange[], validator: RunModelSelectionValidator): Promise<DelegatedLaunchUpdateResult> {
    const validation = await validateDelegatedLaunchChanges({
      forest: this.port.forest(), changes, readTaskSource: this.port.readTaskSource,
      isClosed: (reference) => this.port.isClosed(reference), validator,
    });
    if (validation.kind === "refused") return validation.result;
    const targets = validation.targets;
    const taskUnits = uniqueReferences(targets.flatMap((target) => target.stopUnit.kind === "task_execution" ? [target.stopUnit.reference] : []));
    // Fences in address order (collaborators, then their agents in layout order).
    const collaboratorUnits = [...new Map(targets.flatMap((target) => target.stopUnit.kind === "collaborator"
      ? [[target.stopUnit.address, target.stopUnit] as const] : [])).values()]
      .sort((left, right) => left.address.localeCompare(right.address));
    const controls = collaboratorUnits.flatMap((unit) => unit.agentRunIds.flatMap((agentRunId) => {
      const control = this.port.collaboratorAgentControl(agentRunId);
      return control ? [{ agentRunId, control }] : [];
    }));
    const atSerializationPoint = async (): Promise<DelegatedLaunchUpdateResult> => {
      if (controls.some(({ control }) => !control.isStopped())) return result("COPY_RUNNING", COPY_RUNNING_MESSAGE);
      const step = await this.port.tasks.whileTaskExecutionsStopped(taskUnits, async () => {
        // (b) The targets must still be the validated ones (nothing closed or removed meanwhile).
        try {
          resolveDelegatedLaunchTargets({ forest: this.port.forest(), changes, readTaskSource: this.port.readTaskSource,
            isClosed: (reference) => this.port.isClosed(reference) });
        } catch (error) {
          if (error instanceof DelegatedLaunchTargetError) return result("NOT_FOUND", error.message);
          throw error;
        }
        const selections = delegatedLaunchSelections(targets, this.port.now());
        let swapFailure: unknown = null;
        const written = await this.port.commitSelections(selections, () => {
          const launches = collaboratorHostedLaunches(this.port.forest().collaborators);
          for (const { agentRunId, control } of controls) {
            const launch = launches.get(agentRunId);
            try { if (launch) control.replaceModelChoice(launch); } catch (error) { swapFailure ??= error; }
          }
        });
        if (swapFailure) {
          // Durable; the next activation of a restored copy reads the committed tree anyway.
          return result("INTERNAL_ERROR", `The model change was saved but a stopped collaborator could not take it: ${errorMessage(swapFailure)}`);
        }
        return written === "unchanged"
          ? result("UNCHANGED", "These model settings are already saved.")
          : result("UPDATED", "Saved. The new model is used when the copy resumes.");
      });
      return step.ran ? step.value : result("COPY_RUNNING", COPY_RUNNING_MESSAGE);
    };
    try {
      return await withFences(controls.map(({ control }) => control), atSerializationPoint);
    } catch (error) {
      if (error instanceof TaskDelegationError && error.code === "ROOT_RUN_NOT_ACTIVE") return result("INTERNAL_ERROR", error.message);
      if (error instanceof RootTaskPersistenceFinalizationIndeterminateError) {
        return result("PERSISTENCE_INDETERMINATE", "The save outcome is being verified. Refresh Settings before saving again.");
      }
      return result("PERSISTENCE_FAILED", `The model change was not saved: ${errorMessage(error)}`);
    }
  }
}

const stopResult = (outcome: DelegatedStopOutcome, message: string, notStoppedUnattributed: number): DelegatedStopResult =>
  Object.freeze({ outcome, message, notStoppedUnattributed });

const uniqueReferences = (references: readonly DelegatedRunReference[]): DelegatedRunReference[] =>
  [...new Map(references.map((reference) => ["agentRunId" in reference ? `a:${reference.agentRunId}` : `t:${reference.teamRunId}`, reference])).values()];

/** Holds every control's activation fence (in the given order) around `operation`. */
const withFences = <T>(controls: readonly RetainedAgentExecutionControl[], operation: () => Promise<T>): Promise<T> =>
  controls.length === 0 ? operation() : controls[0]!.withActivationFence(() => withFences(controls.slice(1), operation));

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);

export type DelegatedLaunchModelOptions = RunModelOptions & Readonly<{
  scope: "agent" | "team";
  agentRunId: string | null;
  teamRunId: string | null;
}>;

/** Model options of every editable copy or collaborator (agent and Team level), one shared catalog read. */
export const listDelegatedLaunchModelOptions = async (input: Readonly<{
  forest: DelegatedLaunchForest;
  readTaskSource: DelegatedTaskSourceReader;
  isClosed?: (reference: DelegatedRunReference) => boolean;
  modelOptions: Pick<RunModelSelectionService, "listOptionsMany">;
}>): Promise<readonly DelegatedLaunchModelOptions[]> => {
  const targets = listDelegatedLaunchTargets(input);
  const options = await input.modelOptions.listOptionsMany(targets.map((target) => ({
    runtimeKind: target.current.runtimeKind,
    currentModelIdentifier: target.current.llmModelIdentifier,
    workspaceRootPath: target.current.workspaceRootPath ?? process.cwd(),
  })));
  return Object.freeze(targets.map((target, index) => Object.freeze({
    ...options[index]!,
    scope: target.scope,
    agentRunId: target.scope === "agent" ? target.runId : null,
    teamRunId: target.scope === "team" ? target.runId : null,
  })));
};
