import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { AgentRun } from "../domain/agent-run.js";
import { AgentRunConfig } from "../domain/agent-run-config.js";
import { AgentRunContext } from "../domain/agent-run-context.js";
import { RuntimeKind, isExternalProviderRuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";
import { AgentRunMetadataService } from "../../run-history/services/agent-run-metadata-service.js";
import { AgentRunHistoryCatalogService } from "../../run-history/services/agent-run-history-catalog-service.js";
import { getWorkspaceManager } from "../../workspaces/workspace-manager.js";
import { AgentRunManager } from "./agent-run-manager.js";
import type { AgentRunActivationCandidate } from "./agent-run-activation-candidate.js";
import {
  AgentRunActivationError,
  isAgentRunActivationQuarantineError,
} from "../errors.js";
import { TokenUsageMigrationReadiness } from "../../token-usage/providers/token-usage-migration-readiness.js";
import { ModelConfigValidationService } from "../../llm-management/services/model-config-validation-service.js";
import {
  runModelConfigEditability,
  type RunModelConfigUpdateResult,
} from "../../run-history/domain/run-model-config.js";

export type StandaloneAgentRunActivationResult = Readonly<{
  run: AgentRun;
  metadata: AgentRunMetadata;
}>;

const requiredRunId = (runId: string): string => {
  const normalized = runId.trim();
  if (!normalized) throw new Error("runId is required.");
  return normalized;
};

export class StandaloneAgentRunLifecycleService {
  private readonly transitionLanes = new Map<string, Promise<void>>();
  private readonly quarantines = new Map<string, Error>();
  private readonly agentRunManager: AgentRunManager;
  private readonly metadataService: AgentRunMetadataService;
  private readonly historyCatalogService: AgentRunHistoryCatalogService;
  private readonly workspaceManager: ReturnType<typeof getWorkspaceManager>;
  private readonly tokenUsageReadiness: Pick<TokenUsageMigrationReadiness,
    "assertCurrentSchemaReady" | "assertExistingRunRestoreReady">;
  private readonly modelConfigValidator: Pick<ModelConfigValidationService, "validate">;

  constructor(
    memoryDir: string,
    deps: {
      agentRunManager?: AgentRunManager;
      metadataService?: AgentRunMetadataService;
      historyCatalogService?: AgentRunHistoryCatalogService;
      workspaceManager?: ReturnType<typeof getWorkspaceManager>;
      tokenUsageReadiness?: Pick<TokenUsageMigrationReadiness,
        "assertCurrentSchemaReady" | "assertExistingRunRestoreReady">;
      modelConfigValidator?: Pick<ModelConfigValidationService, "validate">;
    } = {},
  ) {
    this.agentRunManager = deps.agentRunManager ?? AgentRunManager.getInstance();
    this.metadataService = deps.metadataService ?? new AgentRunMetadataService(memoryDir);
    this.historyCatalogService = deps.historyCatalogService ?? new AgentRunHistoryCatalogService(memoryDir);
    this.workspaceManager = deps.workspaceManager ?? getWorkspaceManager();
    this.tokenUsageReadiness = deps.tokenUsageReadiness ?? new TokenUsageMigrationReadiness();
    this.modelConfigValidator = deps.modelConfigValidator ?? new ModelConfigValidationService();
  }

  async resolveCommandReadyAgentRun(runId: string): Promise<AgentRun> {
    const normalized = requiredRunId(runId);
    const active = this.agentRunManager.getActiveRun(normalized);
    if (active) return active;
    return (await this.resolve(normalized)).run;
  }

  activatePreparedRun(runId: string): Promise<AgentRun> {
    return this.resolve(requiredRunId(runId)).then((result) => result.run);
  }

  restorePersistedRun(runId: string): Promise<StandaloneAgentRunActivationResult> {
    return this.resolve(requiredRunId(runId));
  }

  updateStoppedModelConfig(input: {
    agentRunId: string;
    llmConfig: Readonly<Record<string, unknown>> | null;
  }): Promise<RunModelConfigUpdateResult<AgentRunMetadata | null>> {
    const runId = requiredRunId(input.agentRunId);
    return this.withTransition(runId, async () => {
      const state = await this.metadataService.readMetadataState(runId);
      const metadata = state.kind === "present" ? state.metadata : null;
      if (!metadata) {
        return this.updateResult({
          outcome: "NOT_FOUND",
          message: `Run '${runId}' was not found.`,
          metadata: null,
          active: false,
        });
      }
      if (this.agentRunManager.getActiveRun(runId)) {
        return this.updateResult({
          outcome: "RUN_ACTIVE",
          message: "This run became active through another connected workflow. Stop it, reopen Settings, and try again.",
          metadata,
          active: true,
        });
      }
      const row = await this.historyCatalogService.getCatalogRow(runId);
      if (!row) {
        return this.updateResult({ outcome: "NOT_FOUND", message: `Run '${runId}' was not found.`, metadata, active: false });
      }
      if (row.archivedAt) {
        return this.updateResult({ outcome: "RUN_ARCHIVED", message: "Archived runs cannot be edited.", metadata, active: false, archived: true });
      }
      const validation = await this.modelConfigValidator.validate({
        runtimeKind: metadata.runtimeKind,
        llmModelIdentifier: metadata.llmModelIdentifier,
        llmConfig: input.llmConfig,
      });
      if (validation.kind !== "valid") {
        const outcome = validation.kind === "model_unavailable"
          ? "MODEL_UNAVAILABLE"
          : validation.kind === "schema_unavailable"
            ? "SCHEMA_UNAVAILABLE"
            : "VALIDATION_FAILED";
        return this.updateResult({
          outcome,
          message: outcome === "VALIDATION_FAILED"
            ? "Model settings are invalid."
            : "Current model options are unavailable; saved settings were not changed.",
          metadata,
          active: false,
          fieldErrors: validation.kind === "invalid" ? validation.errors : [],
        });
      }
      const committed = await this.historyCatalogService.commitRunModelConfig({
        runId,
        llmConfig: validation.config,
      });
      if (committed.kind === "committed" || committed.kind === "unchanged") {
        return this.updateResult({
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
      return this.updateResult({
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
    });
  }

  private async resolve(runId: string): Promise<StandaloneAgentRunActivationResult> {
    return this.withTransition(runId, () => this.resolveInsideTransition(runId));
  }

  private async resolveInsideTransition(runId: string): Promise<StandaloneAgentRunActivationResult> {
    const active = this.agentRunManager.getActiveRun(runId);
    if (active) {
      const state = await this.metadataService.readMetadataState(runId);
      if (state.kind !== "present") throw new Error(`Run '${runId}' active metadata is unavailable.`);
      return { run: active, metadata: state.metadata };
    }
    const quarantine = this.quarantines.get(runId);
    if (quarantine) throw quarantine;
    try {
      return await this.activateOnce(runId);
    } catch (error) {
      if (isAgentRunActivationQuarantineError(error)) {
        this.quarantines.set(runId, error instanceof Error ? error : new Error(String(error)));
      }
      throw error;
    }
  }

  private updateResult(input: {
    outcome: RunModelConfigUpdateResult<AgentRunMetadata | null>["outcome"];
    message: string;
    metadata: AgentRunMetadata | null;
    active: boolean;
    archived?: boolean;
    fieldErrors?: RunModelConfigUpdateResult<AgentRunMetadata | null>["fieldErrors"];
  }): RunModelConfigUpdateResult<AgentRunMetadata | null> {
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

  private async withTransition<T>(runId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.transitionLanes.get(runId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => { release = resolve; });
    const tail = previous.then(() => current);
    this.transitionLanes.set(runId, tail);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.transitionLanes.get(runId) === tail) this.transitionLanes.delete(runId);
    }
  }

  private async activateOnce(runId: string): Promise<StandaloneAgentRunActivationResult> {
    const state = await this.metadataService.readMetadataState(runId);
    if (state.kind === "missing") throw new Error(`Run '${runId}' was not found.`);
    if (state.kind === "unreadable") throw new Error(`Run '${runId}' metadata is unreadable.`);
    const metadata = state.metadata;
    if (metadata.preparedAt && !metadata.startedAt) return this.activatePrepared(metadata);
    if (!metadata.startedAt) throw new Error(`Run '${runId}' is not in a supported activation state.`);
    return this.restoreStarted(metadata);
  }

  private async activatePrepared(metadata: AgentRunMetadata): Promise<StandaloneAgentRunActivationResult> {
    this.tokenUsageReadiness.assertCurrentSchemaReady();
    const config = await this.buildConfig(metadata);
    const candidate = await this.agentRunManager.prepareNewAgentRun({ runId: metadata.runId, config });
    await this.validateCandidateOrAbort(candidate, metadata.runtimeKind, metadata.runId);
    const startedAt = new Date().toISOString();
    return this.persistAndPublish({
      candidate,
      original: metadata,
      target: {
        ...metadata,
        runtimeKind: candidate.runtimeKind,
        platformAgentRunId: candidate.platformAgentRunId,
        startedAt,
      },
      unchangedPreparedIsRetryable: true,
    });
  }

  private async restoreStarted(metadata: AgentRunMetadata): Promise<StandaloneAgentRunActivationResult> {
    this.tokenUsageReadiness.assertExistingRunRestoreReady();
    const config = await this.buildConfig(metadata);
    let candidate: AgentRunActivationCandidate;
    if (isExternalProviderRuntimeKind(metadata.runtimeKind)) {
      const platformAgentRunId = metadata.platformAgentRunId?.trim();
      if (!platformAgentRunId || platformAgentRunId === metadata.runId) {
        throw new AgentRunActivationError(
          "PLATFORM_AGENT_RUN_BINDING_INVALID",
          "The persisted provider conversation identity is missing or invalid.",
        );
      }
      candidate = await this.agentRunManager.prepareRestoreAgentRunFromPlatformState({
        runId: metadata.runId,
        config,
        platformAgentRunId,
      });
    } else {
      candidate = await this.agentRunManager.prepareRestoreAgentRun(new AgentRunContext({
        runId: metadata.runId,
        config,
        runtimeContext: null,
      }));
    }
    await this.validateCandidateOrAbort(candidate, metadata.runtimeKind, metadata.runId);
    return this.persistAndPublish({
      candidate,
      original: metadata,
      target: {
        ...metadata,
        runtimeKind: candidate.runtimeKind,
        platformAgentRunId: candidate.platformAgentRunId,
        startedAt: metadata.startedAt!,
      },
      unchangedPreparedIsRetryable: false,
    });
  }

  private async persistAndPublish(input: {
    candidate: AgentRunActivationCandidate;
    original: AgentRunMetadata;
    target: AgentRunMetadata & { startedAt: string };
    unchangedPreparedIsRetryable: boolean;
  }): Promise<StandaloneAgentRunActivationResult> {
    let persisted: AgentRunMetadata | null = null;
    try {
      persisted = await this.historyCatalogService.recordRunStarted(input.target);
    } catch {
      persisted = null;
    }
    if (!persisted || !this.isExactTarget(persisted, input.target)) {
      const state = await this.metadataService.readMetadataState(input.target.runId);
      if (state.kind === "present" && this.isExactTarget(state.metadata, input.target)) {
        persisted = state.metadata;
      } else if (
        input.unchangedPreparedIsRetryable &&
        state.kind === "present" &&
        this.isExactOriginalPrepared(state.metadata, input.original)
      ) {
        await this.abortForRetry(input.candidate);
        throw new Error(`Run '${input.target.runId}' activation metadata did not commit.`);
      } else {
        throw await this.abortForIndeterminateCommit(input.candidate, input.target.runId);
      }
    }

    try {
      return { run: input.candidate.commitPublication(), metadata: persisted };
    } catch (error) {
      const cleanup = await input.candidate.abort();
      const cause = cleanup.kind === "quarantined"
        ? new AggregateError([error, cleanup.error], "Publication and private candidate cleanup failed.")
        : error;
      const commitError = new AgentRunActivationError(
        "STANDALONE_AGENT_RUN_ACTIVATION_COMMIT_INDETERMINATE",
        `Run '${input.target.runId}' publication failed after durable activation.`,
        { cause },
      );
      this.quarantines.set(input.target.runId, commitError);
      throw commitError;
    }
  }

  private async abortForRetry(candidate: AgentRunActivationCandidate): Promise<void> {
    const cleanup = await candidate.abort();
    if (cleanup.kind === "quarantined") {
      throw new AgentRunActivationError(
        "AGENT_RUN_ACTIVATION_CLEANUP_FAILED",
        `Agent run '${candidate.runId}' cleanup could not be confirmed.`,
        { cause: cleanup.error },
      );
    }
  }

  private async abortForIndeterminateCommit(
    candidate: AgentRunActivationCandidate,
    runId: string,
  ): Promise<AgentRunActivationError> {
    const cleanup = await candidate.abort();
    const cause = cleanup.kind === "quarantined" ? cleanup.error : undefined;
    return new AgentRunActivationError(
      "STANDALONE_AGENT_RUN_ACTIVATION_COMMIT_INDETERMINATE",
      `Run '${runId}' activation commit is indeterminate and is quarantined until restart.`,
      { cause },
    );
  }

  private async validateCandidateOrAbort(
    candidate: AgentRunActivationCandidate,
    runtimeKind: RuntimeKind,
    runId: string,
  ): Promise<void> {
    const error = candidate.runId !== runId || candidate.runtimeKind !== runtimeKind
      ? new Error("AgentRun activation candidate identity does not match its metadata.")
      : isExternalProviderRuntimeKind(runtimeKind) &&
          (!candidate.platformAgentRunId || candidate.platformAgentRunId === runId)
        ? new AgentRunActivationError(
            "PLATFORM_AGENT_RUN_BINDING_INVALID",
            "The external runtime did not provide a valid provider conversation identity.",
          )
        : null;
    if (!error) return;
    await this.abortForRetry(candidate);
    throw error;
  }

  private async buildConfig(metadata: AgentRunMetadata): Promise<AgentRunConfig> {
    const workspace = await this.workspaceManager.ensureWorkspaceByRootPath(metadata.workspaceRootPath);
    return new AgentRunConfig({
      runtimeKind: metadata.runtimeKind,
      agentDefinitionId: metadata.agentDefinitionId,
      llmModelIdentifier: metadata.llmModelIdentifier,
      autoExecuteTools: metadata.autoExecuteTools,
      workspaceId: workspace.workspaceId,
      memoryDir: metadata.memoryDir,
      llmConfig: metadata.llmConfig,
      skillAccessMode: metadata.skillAccessMode ?? SkillAccessMode.PRELOADED_ONLY,
      applicationExecutionContext: metadata.applicationExecutionContext ?? null,
    });
  }

  private isExactTarget(
    metadata: AgentRunMetadata,
    target: AgentRunMetadata,
  ): boolean {
    return JSON.stringify(metadata) === JSON.stringify(target);
  }

  private isExactOriginalPrepared(current: AgentRunMetadata, original: AgentRunMetadata): boolean {
    return Boolean(original.preparedAt && !original.startedAt) &&
      JSON.stringify(current) === JSON.stringify(original);
  }
}
