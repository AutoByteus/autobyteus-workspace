import { RootRunPackageReadinessIndex } from "../../run-history/services/root-run-package-readiness-index.js";
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
import type { RunModelSelectionValidator } from "../../llm-management/services/run-model-selection-service.js";
import type { RunModelConfigUpdateResult } from "../../run-history/domain/run-model-config.js";
import type { MemberExecutionContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import { isCollaborationEligibleStandaloneRun } from "./standalone-agent-run-eligibility.js";
import type { StandaloneHostTerminationResult } from "./standalone-run-ports.js";
import {
  StandaloneStoppedRunModelConfigUpdater,
  type StoppedRunModelConfigInput,
} from "./standalone-stopped-run-model-config-updater.js";

export type StandaloneAgentRunActivationResult = Readonly<{
  run: AgentRun;
  metadata: AgentRunMetadata;
}>;

/**
 * The host member context an activation attaches: required for a collaboration-eligible run
 * (its `StandaloneAgentRunRoot` builds it), absent for helpers and application-owned runs.
 */
export type StandaloneHostActivationInput = Readonly<{
  memberExecutionContext: MemberExecutionContext | null;
}>;

const requiredRunId = (runId: string): string => {
  const normalized = runId.trim();
  if (!normalized) throw new Error("runId is required.");
  return normalized;
};

export class StandaloneAgentRunLifecycleService {
  private readonly readiness: RootRunPackageReadinessIndex;
  private readonly transitionLanes = new Map<string, Promise<void>>();
  private readonly quarantines = new Map<string, Error>();
  private readonly agentRunManager: AgentRunManager;
  private readonly metadataService: AgentRunMetadataService;
  private readonly historyCatalogService: AgentRunHistoryCatalogService;
  private readonly workspaceManager: ReturnType<typeof getWorkspaceManager>;
  private readonly tokenUsageReadiness: Pick<TokenUsageMigrationReadiness,
    "assertCurrentSchemaReady" | "assertExistingRunRestoreReady">;
  private readonly modelConfigUpdater: StandaloneStoppedRunModelConfigUpdater;

  constructor(
    memoryDir: string,
    deps: {
      agentRunManager?: AgentRunManager;
      metadataService?: AgentRunMetadataService;
      historyCatalogService?: AgentRunHistoryCatalogService;
      workspaceManager?: ReturnType<typeof getWorkspaceManager>;
      tokenUsageReadiness?: Pick<TokenUsageMigrationReadiness,
        "assertCurrentSchemaReady" | "assertExistingRunRestoreReady">;
      modelSelectionValidator: RunModelSelectionValidator;
    },
  ) {
    this.readiness = new RootRunPackageReadinessIndex(memoryDir);
    this.agentRunManager = deps.agentRunManager ?? AgentRunManager.getInstance();
    this.metadataService = deps.metadataService ?? new AgentRunMetadataService(memoryDir);
    this.historyCatalogService = deps.historyCatalogService ?? new AgentRunHistoryCatalogService(memoryDir);
    this.workspaceManager = deps.workspaceManager ?? getWorkspaceManager();
    this.tokenUsageReadiness = deps.tokenUsageReadiness ?? new TokenUsageMigrationReadiness();
    this.modelConfigUpdater = new StandaloneStoppedRunModelConfigUpdater({
      agentRunManager: this.agentRunManager,
      metadataService: this.metadataService,
      historyCatalogService: this.historyCatalogService,
      modelSelectionValidator: deps.modelSelectionValidator,
    });
  }

  /** The plain command path (helpers and application-owned runs): the live run, else its activation. */
  async resolveCommandReadyAgentRun(runId: string): Promise<AgentRun> {
    const normalized = requiredRunId(runId);
    await this.readiness.assertAdmitted("agent", normalized);
    const active = this.agentRunManager.getActiveRun(normalized);
    if (active) return active;
    return (await this.activateHost(normalized, { memberExecutionContext: null })).run;
  }

  /**
   * Activates a prepared run or restores a stopped or crashed one in its transition lane, or
   * returns the live run. The only writer of `run_metadata.json`. An eligible run must be given
   * its root-built member context; activating it without one is a bypass of its root and fails.
   */
  activateHost(runId: string, input: StandaloneHostActivationInput): Promise<StandaloneAgentRunActivationResult> {
    const normalized = requiredRunId(runId);
    return this.withTransition(normalized, () => this.resolveInsideTransition(normalized, input));
  }

  /** Stops the live host and records it terminated in the catalog; a host that is not running is left as is. */
  async terminateHost(runId: string): Promise<StandaloneHostTerminationResult> {
    const normalized = requiredRunId(runId);
    const active = this.agentRunManager.getActiveRun(normalized);
    if (!active) return Object.freeze({ outcome: "not_active", runtimeKind: null });
    if (!await this.agentRunManager.terminateAgentRun(normalized)) {
      return Object.freeze({ outcome: "rejected", runtimeKind: active.runtimeKind });
    }
    await this.historyCatalogService.recordRunTerminated({ runId: normalized });
    return Object.freeze({ outcome: "terminated", runtimeKind: active.runtimeKind });
  }

  /** Saves a stopped run's model settings, serialized with its activation in the transition lane. */
  updateStoppedModelConfig(input: StoppedRunModelConfigInput): Promise<RunModelConfigUpdateResult<AgentRunMetadata | null>> {
    const runId = requiredRunId(input.agentRunId);
    return this.withTransition(runId, () => this.modelConfigUpdater.update(runId, input));
  }

  private async resolveInsideTransition(
    runId: string,
    input: StandaloneHostActivationInput,
  ): Promise<StandaloneAgentRunActivationResult> {
    const active = this.agentRunManager.getActiveRun(runId);
    if (active) {
      const state = await this.metadataService.readMetadataState(runId);
      if (state.kind !== "present") throw new Error(`Run '${runId}' active metadata is unavailable.`);
      return { run: active, metadata: state.metadata };
    }
    const quarantine = this.quarantines.get(runId);
    if (quarantine) throw quarantine;
    try {
      return await this.activateOnce(runId, input);
    } catch (error) {
      if (isAgentRunActivationQuarantineError(error)) {
        this.quarantines.set(runId, error instanceof Error ? error : new Error(String(error)));
      }
      throw error;
    }
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

  private async activateOnce(runId: string, input: StandaloneHostActivationInput): Promise<StandaloneAgentRunActivationResult> {
    await this.readiness.assertAdmitted("agent", runId);
    const state = await this.metadataService.readMetadataState(runId);
    if (state.kind === "missing") throw new Error(`Run '${runId}' was not found.`);
    if (state.kind === "unreadable") throw new Error(`Run '${runId}' metadata is unreadable.`);
    const metadata = state.metadata;
    if (isCollaborationEligibleStandaloneRun(metadata) !== Boolean(input.memberExecutionContext)) {
      throw new Error(isCollaborationEligibleStandaloneRun(metadata)
        ? `Run '${runId}' is activated only by its standalone run root (its host member context is missing).`
        : `Run '${runId}' cannot host collaborators; it takes no member context.`);
    }
    if (metadata.preparedAt && !metadata.startedAt) return this.activatePrepared(metadata, input);
    if (!metadata.startedAt) throw new Error(`Run '${runId}' is not in a supported activation state.`);
    return this.restoreStarted(metadata, input);
  }

  private async activatePrepared(metadata: AgentRunMetadata, input: StandaloneHostActivationInput): Promise<StandaloneAgentRunActivationResult> {
    this.tokenUsageReadiness.assertCurrentSchemaReady();
    const config = await this.buildConfig(metadata, input);
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

  private async restoreStarted(metadata: AgentRunMetadata, input: StandaloneHostActivationInput): Promise<StandaloneAgentRunActivationResult> {
    this.tokenUsageReadiness.assertExistingRunRestoreReady();
    const config = await this.buildConfig(metadata, input);
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

    let run: AgentRun;
    try {
      run = input.candidate.commitPublication();
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
    return { run, metadata: persisted };
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

  private async buildConfig(metadata: AgentRunMetadata, input: StandaloneHostActivationInput): Promise<AgentRunConfig> {
    const workspace = await this.workspaceManager.ensureWorkspaceByRootPath(metadata.workspaceRootPath);
    return new AgentRunConfig({
      runtimeKind: metadata.runtimeKind,
      agentDefinitionId: metadata.agentDefinitionId,
      llmModelIdentifier: metadata.llmModelIdentifier,
      autoExecuteTools: metadata.autoExecuteTools,
      workspaceId: workspace.workspaceId,
      memoryDir: metadata.memoryDir,
      llmConfig: metadata.llmConfig,
      applicationExecutionContext: metadata.applicationExecutionContext ?? null,
      memberExecutionContext: input.memberExecutionContext,
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
