import { randomUUID } from "node:crypto";
import type { AgentRunMetadata, RuntimeSwitchCause } from "../../run-history/store/agent-run-metadata-types.js";
import type { AgentRunMetadataService } from "../../run-history/services/agent-run-metadata-service.js";
import type { AgentRunHistoryCatalogService } from "../../run-history/services/agent-run-history-catalog-service.js";
import type { RunModelSelectionValidator } from "../../llm-management/services/run-model-selection-service.js";
import { isUnavailableModelSelection, runModelSelectionRefusal } from "../../llm-management/services/run-model-selection-refusal.js";
import {
  runModelConfigEditability,
  type RunModelConfigUpdateResult,
} from "../../run-history/domain/run-model-config.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AgentRunManager } from "./agent-run-manager.js";
import { canSwitchRuntime, stoppedRunHandOver } from "./standalone-agent-run-eligibility.js";
import { selectionContextFor } from "./stopped-run-selection-context.js";
import type { RunContinuation } from "../../llm-management/domain/run-model-selection.js";

export type StoppedRunSelectionInput = Readonly<{
  agentRunId: string;
  /** The agent runtime to save the run with: its own (a model-only edit), the previous one (undo) or another (a switch). */
  runtimeKind: RuntimeKind;
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
  /** An automatic switch's facts (autobyteus-646 R-7), stored with the pending switch; a person's save has none. */
  cause?: RuntimeSwitchCause;
}>;

type UpdateResult = RunModelConfigUpdateResult<AgentRunMetadata | null>;

/**
 * Saves a stopped standalone run's selection (agent runtime, model and model settings): decides model-only edit, switch or
 * undo, validates the selection as a fresh one when the agent runtime differs from the stored one, and commits it through the
 * history catalog. A switch only records a pending switch; the run's next input makes it real (the lifecycle's activation).
 * The caller (the standalone lifecycle) runs it inside the run's transition lane, so it never races an activation.
 */
export class StandaloneStoppedRunSelectionUpdater {
  private readonly modelSelectionValidator: RunModelSelectionValidator;

  constructor(private readonly deps: Readonly<{
    agentRunManager: Pick<AgentRunManager, "getActiveRun">;
    metadataService: Pick<AgentRunMetadataService, "readMetadataState">;
    historyCatalogService: Pick<AgentRunHistoryCatalogService, "getCatalogRow" | "commitRunRuntimeSwitch">;
    modelSelectionValidator: RunModelSelectionValidator;
  }>) {
    if (!deps.modelSelectionValidator ||
        typeof deps.modelSelectionValidator.validate !== "function") {
      throw new Error("modelSelectionValidator is required.");
    }
    this.modelSelectionValidator = deps.modelSelectionValidator;
  }

  /** The Save's checks without writing: the refusal, or `null` when it would be saved (SR-039: a delegator checks first). */
  async check(runId: string, input: StoppedRunSelectionInput): Promise<UpdateResult | null> {
    const planned = await this.plan(runId, input);
    return planned.kind === "refused" ? planned.result : null;
  }

  async update(runId: string, input: StoppedRunSelectionInput): Promise<UpdateResult> {
    const planned = await this.plan(runId, input);
    if (planned.kind === "refused") return planned.result;
    const { metadata, selection, continuation } = planned;
    const committed = await this.deps.historyCatalogService.commitRunRuntimeSwitch({
      runId,
      selection: { runtimeKind: input.runtimeKind, ...selection, continuation, ...(input.cause ? { cause: input.cause } : {}) },
      switchId: randomUUID(),
    });
    if (committed.kind === "committed" || committed.kind === "unchanged") {
      const modelHandOver = Boolean(committed.metadata.pendingRuntimeSwitch
        && committed.metadata.pendingRuntimeSwitch.from.runtimeKind === committed.metadata.runtimeKind);
      return this.result({
        outcome: committed.kind === "committed" ? "UPDATED" : "UNCHANGED",
        message: committed.kind !== "committed"
          ? "Model settings are already up to date."
          : modelHandOver
            ? "Model saved. Your next message starts a fresh session on the new model, which continues from the work journal."
            : committed.metadata.pendingRuntimeSwitch
              ? "Agent runtime and model saved. The agent runtime changes when you send your next message."
              : input.runtimeKind !== metadata.runtimeKind
                ? "The agent runtime change was cancelled."
                : "Model settings updated. They will be used when this run resumes.",
        metadata: committed.metadata,
        active: false,
      });
    }
    const outcome = committed.kind === "archived"
      ? "RUN_ARCHIVED"
      : committed.kind === "not_found"
        ? "NOT_FOUND"
        : committed.kind === "indeterminate"
          ? "PERSISTENCE_INDETERMINATE"
          : "PERSISTENCE_FAILED";
    return this.result({
      outcome,
      message: outcome === "PERSISTENCE_INDETERMINATE"
        ? "Update outcome is being verified. Refresh the run configuration before saving again."
        : outcome === "PERSISTENCE_FAILED"
        ? "Model settings were not saved."
        : "Model settings could not be saved.",
      metadata: committed.metadata ?? metadata,
      active: false,
      archived: outcome === "RUN_ARCHIVED",
    });
  }

  private async plan(runId: string, input: StoppedRunSelectionInput): Promise<
    | Readonly<{ kind: "refused"; result: UpdateResult }>
    | Readonly<{ kind: "planned"; metadata: AgentRunMetadata; selection: Readonly<{ llmModelIdentifier: string; llmConfig: Readonly<Record<string, unknown>> | null }>; continuation: RunContinuation }>> {
    const refused = (result: UpdateResult) => ({ kind: "refused" as const, result });
    const state = await this.deps.metadataService.readMetadataState(runId);
    const metadata = state.kind === "present" ? state.metadata : null;
    if (!metadata) {
      return refused(this.result({
        outcome: "NOT_FOUND",
        message: `Run '${runId}' was not found.`,
        metadata: null,
        active: false,
      }));
    }
    if (this.deps.agentRunManager.getActiveRun(runId)) {
      return refused(this.result({
        outcome: "RUN_ACTIVE",
        message: "This run became active through another connected workflow. Stop it, reopen Settings, and try again.",
        metadata,
        active: true,
      }));
    }
    const row = await this.deps.historyCatalogService.getCatalogRow(runId);
    if (!row) {
      return refused(this.result({ outcome: "NOT_FOUND", message: `Run '${runId}' was not found.`, metadata, active: false }));
    }
    if (row.archivedAt) {
      return refused(this.result({ outcome: "RUN_ARCHIVED", message: "Archived runs cannot be edited.", metadata, active: false, archived: true }));
    }
    if (input.runtimeKind !== metadata.runtimeKind && !canSwitchRuntime(metadata)) {
      return refused(this.result({
        outcome: "VALIDATION_FAILED",
        message: "This run cannot change its agent runtime. Only a started standalone Agent run that no peer node started can.",
        metadata,
        active: false,
        fieldErrors: [{ path: "runtimeKind", message: "The agent runtime of this run cannot be changed." }],
      }));
    }
    const validation = await this.modelSelectionValidator.validate({
      context: selectionContextFor(metadata, input, stoppedRunHandOver(metadata)),
      selection: { llmModelIdentifier: input.llmModelIdentifier, llmConfig: input.llmConfig },
    });
    if (validation.kind !== "valid") {
      const refusal = isUnavailableModelSelection(validation)
        ? runModelSelectionRefusal({ result: validation, llmModelIdentifier: input.llmModelIdentifier,
          runtimeKind: input.runtimeKind, savedSettingsUnchanged: true })
        : { outcome: "VALIDATION_FAILED" as const, message: "Model settings are invalid." };
      return refused(this.result({
        ...refusal,
        metadata,
        active: false,
        fieldErrors: validation.kind === "invalid" ? validation.errors : [],
      }));
    }
    return { kind: "planned", metadata, selection: validation.selection, continuation: validation.continuation };
  }

  private result(input: {
    outcome: UpdateResult["outcome"];
    message: string;
    metadata: AgentRunMetadata | null;
    active: boolean;
    archived?: boolean;
    fieldErrors?: UpdateResult["fieldErrors"];
  }): UpdateResult {
    return Object.freeze({
      success: input.outcome === "UPDATED" || input.outcome === "UNCHANGED",
      outcome: input.outcome,
      message: input.message,
      isActive: input.active,
      editability: runModelConfigEditability({
        isActive: input.active,
        archived: input.archived === true,
        available: input.outcome !== "NOT_FOUND",
      }),
      canonical: input.metadata,
      fieldErrors: Object.freeze([...(input.fieldErrors ?? [])]),
    });
  }
}
