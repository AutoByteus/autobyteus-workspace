import type { AgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";
import type { AgentRunMetadataService } from "../../run-history/services/agent-run-metadata-service.js";
import type { AgentRunHistoryCatalogService } from "../../run-history/services/agent-run-history-catalog-service.js";
import type { RunModelSelectionValidator } from "../../llm-management/services/run-model-selection-service.js";
import {
  runModelConfigEditability,
  type RunModelConfigUpdateResult,
} from "../../run-history/domain/run-model-config.js";
import type { AgentRunManager } from "./agent-run-manager.js";

export type StoppedRunModelConfigInput = Readonly<{
  agentRunId: string;
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
}>;

type UpdateResult = RunModelConfigUpdateResult<AgentRunMetadata | null>;

/**
 * Saves a stopped standalone run's model settings: validates the selection against the run's
 * runtime and commits it through the history catalog. The caller (the standalone lifecycle)
 * runs it inside the run's transition lane, so it never races an activation.
 */
export class StandaloneStoppedRunModelConfigUpdater {
  private readonly modelSelectionValidator: RunModelSelectionValidator;

  constructor(private readonly deps: Readonly<{
    agentRunManager: Pick<AgentRunManager, "getActiveRun">;
    metadataService: Pick<AgentRunMetadataService, "readMetadataState">;
    historyCatalogService: Pick<AgentRunHistoryCatalogService, "getCatalogRow" | "commitRunModelConfig">;
    modelSelectionValidator: RunModelSelectionValidator;
  }>) {
    if (!deps.modelSelectionValidator ||
        typeof deps.modelSelectionValidator.validate !== "function") {
      throw new Error("modelSelectionValidator is required.");
    }
    this.modelSelectionValidator = deps.modelSelectionValidator;
  }

  async update(runId: string, input: StoppedRunModelConfigInput): Promise<UpdateResult> {
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
    const validation = await this.modelSelectionValidator.validate({
      context: { runtimeKind: metadata.runtimeKind, currentModelIdentifier: metadata.llmModelIdentifier,
        workspaceRootPath: metadata.workspaceRootPath },
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
    const committed = await this.deps.historyCatalogService.commitRunModelConfig({
      runId,
      ...validation.selection,
    });
    if (committed.kind === "committed" || committed.kind === "unchanged") {
      return this.result({
        outcome: committed.kind === "committed" ? "UPDATED" : "UNCHANGED",
        message: committed.kind === "committed"
          ? "Model settings updated. They will be used when this run resumes."
          : "Model settings are already up to date.",
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
