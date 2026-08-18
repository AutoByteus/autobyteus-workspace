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

export type StandaloneAgentRunActivationResult = Readonly<{
  run: AgentRun;
  metadata: AgentRunMetadata;
}>;

const requiredRunId = (runId: string): string => {
  const normalized = runId.trim();
  if (!normalized) throw new Error("runId is required.");
  return normalized;
};

export class StandaloneAgentRunActivationService {
  private readonly attempts = new Map<string, Promise<StandaloneAgentRunActivationResult>>();
  private readonly quarantines = new Map<string, Error>();
  private readonly agentRunManager: AgentRunManager;
  private readonly metadataService: AgentRunMetadataService;
  private readonly historyCatalogService: AgentRunHistoryCatalogService;
  private readonly workspaceManager: ReturnType<typeof getWorkspaceManager>;

  constructor(
    memoryDir: string,
    deps: {
      agentRunManager?: AgentRunManager;
      metadataService?: AgentRunMetadataService;
      historyCatalogService?: AgentRunHistoryCatalogService;
      workspaceManager?: ReturnType<typeof getWorkspaceManager>;
    } = {},
  ) {
    this.agentRunManager = deps.agentRunManager ?? AgentRunManager.getInstance();
    this.metadataService = deps.metadataService ?? new AgentRunMetadataService(memoryDir);
    this.historyCatalogService = deps.historyCatalogService ?? new AgentRunHistoryCatalogService(memoryDir);
    this.workspaceManager = deps.workspaceManager ?? getWorkspaceManager();
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

  private async resolve(runId: string): Promise<StandaloneAgentRunActivationResult> {
    const active = this.agentRunManager.getActiveRun(runId);
    if (active) {
      const state = await this.metadataService.readMetadataState(runId);
      if (state.kind !== "present") throw new Error(`Run '${runId}' active metadata is unavailable.`);
      return { run: active, metadata: state.metadata };
    }
    const quarantine = this.quarantines.get(runId);
    if (quarantine) throw quarantine;
    const existing = this.attempts.get(runId);
    if (existing) return existing;

    const attempt = Promise.resolve().then(() => this.activateOnce(runId));
    this.attempts.set(runId, attempt);
    try {
      return await attempt;
    } catch (error) {
      if (isAgentRunActivationQuarantineError(error)) {
        this.quarantines.set(runId, error instanceof Error ? error : new Error(String(error)));
      }
      throw error;
    } finally {
      if (this.attempts.get(runId) === attempt) this.attempts.delete(runId);
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
