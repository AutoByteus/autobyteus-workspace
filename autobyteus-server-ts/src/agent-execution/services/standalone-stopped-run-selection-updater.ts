import { randomUUID } from "node:crypto";
import type { AgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";
import type { AgentRunMetadataService } from "../../run-history/services/agent-run-metadata-service.js";
import type { AgentRunHistoryCatalogService } from "../../run-history/services/agent-run-history-catalog-service.js";
import type { RunModelSelectionValidator } from "../../llm-management/services/run-model-selection-service.js";
import {
  runModelConfigEditability,
  type RunModelConfigUpdateResult,
} from "../../run-history/domain/run-model-config.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AgentRunManager } from "./agent-run-manager.js";
import { canSwitchRuntime } from "./standalone-agent-run-eligibility.js";
import { selectionContextFor } from "./stopped-run-selection-context.js";

export type StoppedRunSelectionInput = Readonly<{
  agentRunId: string;
  /** The agent runtime to save the run with: its own (a model-only edit), the previous one (undo) or another (a switch). */
  runtimeKind: RuntimeKind;
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
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

  async update(runId: string, input: StoppedRunSelectionInput): Promise<UpdateResult> {
    const state = await this.deps.metadataService.readMetadataState(runId);
    const metadata = state.kind === "present" ? state.metadata : null;
    if (!metadata) {
      return this.result({
        outcome: "NOT_FOUND",
        message: `Run '${runId}' was not found.`,
        metadata: null,
        active: false,
      });
    }
    if (this.deps.agentRunManager.getActiveRun(runId)) {
      return this.result({
        outcome: "RUN_ACTIVE",
        message: "This run became active through another connected workflow. Stop it, reopen Settings, and try again.",
        metadata,
        active: true,
      });
    }
    const row = await this.deps.historyCatalogService.getCatalogRow(runId);
    if (!row) {
      return this.result({ outcome: "NOT_FOUND", message: `Run '${runId}' was not found.`, metadata, active: false });
    }
    if (row.archivedAt) {
      return this.result({ outcome: "RUN_ARCHIVED", message: "Archived runs cannot be edited.", metadata, active: false, archived: true });
    }
    if (input.runtimeKind !== metadata.runtimeKind && !canSwitchRuntime(metadata)) {
      return this.result({
        outcome: "VALIDATION_FAILED",
        message: "This run cannot change its agent runtime. Only a started, standalone Agent run that is not a delegated copy can.",
        metadata,
        active: false,
        fieldErrors: [{ path: "runtimeKind", message: "The agent runtime of this run cannot be changed." }],
      });
    }
    const validation = await this.modelSelectionValidator.validate({
      context: selectionContextFor(metadata, input),
      selection: { llmModelIdentifier: input.llmModelIdentifier, llmConfig: input.llmConfig },
    });
    if (validation.kind !== "valid") {
      const outcome = validation.kind === "model_unavailable"
        ? "MODEL_UNAVAILABLE"
        : validation.kind === "schema_unavailable"
          ? "SCHEMA_UNAVAILABLE"
          : "VALIDATION_FAILED";
      return this.result({
        outcome,
        message: outcome === "VALIDATION_FAILED"
          ? "Model settings are invalid."
          : "Current model options are unavailable; saved settings were not changed.",
        metadata,
        active: false,
        fieldErrors: validation.kind === "invalid" ? validation.errors : [],
      });
    }
    const committed = await this.deps.historyCatalogService.commitRunRuntimeSwitch({
      runId,
      selection: { runtimeKind: input.runtimeKind, ...validation.selection },
      switchId: randomUUID(),
    });
    if (committed.kind === "committed" || committed.kind === "unchanged") {
      return this.result({
        outcome: committed.kind === "committed" ? "UPDATED" : "UNCHANGED",
        message: committed.kind !== "committed"
          ? "Model settings are already up to date."
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
