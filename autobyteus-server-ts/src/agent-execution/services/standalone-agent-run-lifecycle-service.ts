import { readRunProjectContext } from "../domain/run-project-context.js";
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
import type { AgentRunActivationOperation } from "./agent-run-activation-operation.js";
import {
  AgentRunActivationError,
  PreviousRuntimeReleasePendingError,
  isAgentRunActivationQuarantineError,
} from "../errors.js";
import { TokenUsageCapability } from "../../token-usage/providers/token-usage-capability.js";
import type { RunModelSelectionValidator } from "../../llm-management/services/run-model-selection-service.js";
import type { RunModelConfigUpdateResult } from "../../run-history/domain/run-model-config.js";
import type { MemberExecutionContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import { isCollaborationEligibleStandaloneRun } from "./standalone-agent-run-eligibility.js";
import { buildRuntimeSwitch } from "../domain/runtime-switch.js";
import type { RuntimeSwitchTicket, RuntimeSwitching } from "../domain/runtime-switch-memory-port.js";
import type { StandaloneHostTerminationResult } from "./standalone-run-ports.js";
import {
  StandaloneStoppedRunSelectionUpdater,
  type StoppedRunSelectionInput,
} from "./standalone-stopped-run-selection-updater.js";

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

/** Upper bound a send waits for a previous runtime to finish stopping (QR-001); AGY's own stop deadline is 5 s. */
const PREVIOUS_RUNTIME_RELEASE_WAIT_MS = 30_000;

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
  private readonly tokenUsageReadiness: Pick<TokenUsageCapability,
    "assertCurrentSchemaReady" | "assertExistingRunRestoreReady">;
  private readonly selectionUpdater: StandaloneStoppedRunSelectionUpdater;
  /** The memory and notice ports of an agent runtime switch; none for runs that cannot switch (application-owned runs). */
  private readonly switching: RuntimeSwitching | null;

  constructor(
    memoryDir: string,
    deps: {
      agentRunManager?: AgentRunManager;
      metadataService?: AgentRunMetadataService;
      historyCatalogService?: AgentRunHistoryCatalogService;
      workspaceManager?: ReturnType<typeof getWorkspaceManager>;
      tokenUsageReadiness?: Pick<TokenUsageCapability,
        "assertCurrentSchemaReady" | "assertExistingRunRestoreReady">;
      modelSelectionValidator: RunModelSelectionValidator;
      switching?: RuntimeSwitching | null;
    },
  ) {
    this.switching = deps.switching ?? null;
    this.readiness = new RootRunPackageReadinessIndex(memoryDir);
    this.agentRunManager = deps.agentRunManager ?? AgentRunManager.getInstance();
    this.metadataService = deps.metadataService ?? new AgentRunMetadataService(memoryDir);
    this.historyCatalogService = deps.historyCatalogService ?? new AgentRunHistoryCatalogService(memoryDir);
    this.workspaceManager = deps.workspaceManager ?? getWorkspaceManager();
    this.tokenUsageReadiness = deps.tokenUsageReadiness ?? new TokenUsageCapability();
    this.selectionUpdater = new StandaloneStoppedRunSelectionUpdater({
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
  updateStoppedSelection(input: StoppedRunSelectionInput): Promise<RunModelConfigUpdateResult<AgentRunMetadata | null>> {
    const runId = requiredRunId(input.agentRunId);
    return this.withTransition(runId, () => this.selectionUpdater.update(runId, input));
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
    // Its retryable failure is never quarantined, so the next send retries or joins the release.
    await this.awaitPreviousRuntimeRelease(runId);
    try {
      return await this.activateOnce(runId, input);
    } catch (error) {
      if (isAgentRunActivationQuarantineError(error)) {
        this.quarantines.set(runId, error instanceof Error ? error : new Error(String(error)));
      }
      throw error;
    }
  }

  /**
   * Waits a bounded time for the exact release of a runtime that went offline (for example after an
   * Antigravity interrupt). On timeout the release keeps running; a later activation joins it.
   */
  private async awaitPreviousRuntimeRelease(runId: string): Promise<void> {
    const release = this.agentRunManager.releaseRetiredRun(runId);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new PreviousRuntimeReleasePendingError(
        new Error(`Previous runtime release did not finish within ${PREVIOUS_RUNTIME_RELEASE_WAIT_MS} ms.`),
      )), PREVIOUS_RUNTIME_RELEASE_WAIT_MS);
    });
    try {
      await Promise.race([release, timeout]);
    } catch (error) {
      // The release outlives a timed-out wait; its later failure is reported by the next attempt.
      void release.catch(() => undefined);
      throw error;
    } finally {
      clearTimeout(timer);
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
        : `Run '${runId}' cannot host delegated copies; it takes no member context.`);
    }
    // The explicit pending field decides, not a missing session ID.
    if (metadata.pendingRuntimeSwitch) return this.activateSwitched(metadata, input);
    if (metadata.preparedAt && !metadata.startedAt) return this.activatePrepared(metadata, input);
    if (!metadata.startedAt) throw new Error(`Run '${runId}' is not in a supported activation state.`);
    return this.restoreStarted(metadata, input);
  }

  private async activatePrepared(metadata: AgentRunMetadata, input: StandaloneHostActivationInput): Promise<StandaloneAgentRunActivationResult> {
    this.tokenUsageReadiness.assertCurrentSchemaReady();
    const config = await this.buildConfig(metadata, input);
    const candidate = await this.agentRunManager.beginActivation({ kind: "new", runId: metadata.runId, config }).prepare();
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
      unchangedIsRetryable: true,
    });
  }

  /**
   * The first input after a saved agent runtime switch (autobyteus-316). In order: a ticket (the switch and the watermark: the
   * last record the previous agent wrote; nothing is written), a fresh session of the new agent runtime (its candidate may
   * write records of its own while it prepares), the archive step behind the marker, the metadata commit that clears the
   * pending switch, and the publication. The hand-over notice is not registered here: it is derived from the raw traces when
   * the first input is dispatched.
   *
   * A failure before the archive step succeeded leaves nothing behind: the candidate is aborted, and only when its release is
   * confirmed are the records it wrote after the watermark removed, so the previous agent's file is what it was. A failure
   * after the marker leaves the metadata pending; sending again finds the marker and the segment and completes the switch.
   */
  private async activateSwitched(metadata: AgentRunMetadata, input: StandaloneHostActivationInput): Promise<StandaloneAgentRunActivationResult> {
    const runtimeSwitch = buildRuntimeSwitch(metadata);
    if (!this.switching || !runtimeSwitch) {
      // Fails closed before anything changes; the save of a switch is rejected for runs built without the port.
      throw new Error(`Run '${metadata.runId}' has a pending agent runtime switch that this activation cannot make.`);
    }
    const memory = this.switching.memory;
    this.tokenUsageReadiness.assertExistingRunRestoreReady();
    const config = await this.buildConfig(metadata, input);
    const ticket = memory.begin(metadata.memoryDir, runtimeSwitch);
    const operation = this.agentRunManager.beginActivation({ kind: "new", runId: metadata.runId, config });
    let prepared: AgentRunActivationCandidate | null = null;
    try {
      prepared = await operation.prepare();
      const mismatch = this.candidateIdentityError(prepared, metadata.runtimeKind, metadata.runId);
      if (mismatch) throw mismatch;
      memory.record(metadata.memoryDir, ticket);
    } catch (error) {
      await this.discardFailedSwitchAttempt(operation, prepared, ticket, metadata.memoryDir);
      throw error;
    }
    // From here the marker is in the file: a failure leaves the switch pending and nothing is discarded.
    const { pendingRuntimeSwitch: _pending, ...withoutPending } = metadata;
    return this.persistAndPublish({
      candidate: prepared,
      original: metadata,
      target: {
        ...withoutPending,
        runtimeKind: prepared.runtimeKind,
        platformAgentRunId: prepared.platformAgentRunId,
        startedAt: metadata.startedAt!,
      },
      unchangedIsRetryable: true,
    });
  }

  /**
   * Removes what a failed switch attempt's candidate wrote after the watermark, but only when the candidate's release is
   * confirmed: a candidate that is quarantined or still closing may still write, so nothing is discarded and the run stays
   * quarantined until restart or until its release is joined (as the activation code does for every failure). A prepared
   * candidate is aborted first, and an abort that cannot be confirmed ends the attempt with the cleanup error; when prepare
   * itself threw there is no candidate, and the activation operation says whether its own cleanup was confirmed. A discard that
   * itself fails is logged and does not hide the attempt's own error.
   */
  private async discardFailedSwitchAttempt(
    operation: AgentRunActivationOperation,
    candidate: AgentRunActivationCandidate | null,
    ticket: RuntimeSwitchTicket,
    memoryDir: string,
  ): Promise<void> {
    if (candidate) await this.abortForRetry(candidate);
    else if (operation.inspect() !== "released") return;
    try {
      this.switching!.memory.discard(memoryDir, ticket);
    } catch (error) {
      console.warn(`RUNTIME_SWITCH_DISCARD_FAILED:${ticket.runtimeSwitch.runId}: ${String(error)}`);
    }
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
      candidate = await this.agentRunManager.beginActivation({ kind: "platform_restore",
        runId: metadata.runId,
        config,
        platformAgentRunId,
      }).prepare();
    } else {
      candidate = await this.agentRunManager.beginActivation({ kind: "restore", context: new AgentRunContext({
        runId: metadata.runId,
        config,
        runtimeContext: null,
      }) }).prepare();
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
      unchangedIsRetryable: false,
    });
  }

  private async persistAndPublish(input: {
    candidate: AgentRunActivationCandidate;
    original: AgentRunMetadata;
    target: AgentRunMetadata & { startedAt: string };
    /** True when a commit that did not land leaves the stored metadata equal to `original` and sending again is safe: a prepared start and a switch. */
    unchangedIsRetryable: boolean;
  }): Promise<StandaloneAgentRunActivationResult> {
    let persisted: AgentRunMetadata | null = null;
    try {
      persisted = await this.historyCatalogService.recordRunStarted({
        ...input.target,
        // The one writer of the activation commit also removes the pending switch the commit makes real.
        clearPendingRuntimeSwitch: Boolean(input.original.pendingRuntimeSwitch),
      });
    } catch {
      persisted = null;
    }
    if (!persisted || !this.isExactTarget(persisted, input.target)) {
      const state = await this.metadataService.readMetadataState(input.target.runId);
      if (state.kind === "present" && this.isExactTarget(state.metadata, input.target)) {
        persisted = state.metadata;
      } else if (
        input.unchangedIsRetryable &&
        state.kind === "present" &&
        this.isExactOriginal(state.metadata, input.original)
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

  private candidateIdentityError(
    candidate: AgentRunActivationCandidate,
    runtimeKind: RuntimeKind,
    runId: string,
  ): Error | null {
    return candidate.runId !== runId || candidate.runtimeKind !== runtimeKind
      ? new Error("AgentRun activation candidate identity does not match its metadata.")
      : isExternalProviderRuntimeKind(runtimeKind) &&
          (!candidate.platformAgentRunId || candidate.platformAgentRunId === runId)
        ? new AgentRunActivationError(
            "PLATFORM_AGENT_RUN_BINDING_INVALID",
            "The external runtime did not provide a valid provider conversation identity.",
          )
        : null;
  }

  private async validateCandidateOrAbort(
    candidate: AgentRunActivationCandidate,
    runtimeKind: RuntimeKind,
    runId: string,
  ): Promise<void> {
    const error = this.candidateIdentityError(candidate, runtimeKind, runId);
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
      // A run started under a Project is told it again on every start (DS-005); a deleted Project yields none.
      project: await readRunProjectContext({ kind: "agent", runId: metadata.runId }),
    });
  }

  private isExactTarget(
    metadata: AgentRunMetadata,
    target: AgentRunMetadata,
  ): boolean {
    return JSON.stringify(metadata) === JSON.stringify(target);
  }

  private isExactOriginal(current: AgentRunMetadata, original: AgentRunMetadata): boolean {
    return JSON.stringify(current) === JSON.stringify(original);
  }
}
