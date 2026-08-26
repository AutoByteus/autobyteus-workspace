import { AutoByteusAgentRunBackendFactory } from "../backends/autobyteus/autobyteus-agent-run-backend-factory.js";
import type { AgentRunBackend } from "../backends/agent-run-backend.js";
import type { AgentRunBackendFactory } from "../backends/agent-run-backend-factory.js";
import { AgentRun } from "../domain/agent-run.js";
import { AgentRunContext, type RuntimeAgentRunContext } from "../domain/agent-run-context.js";
import { AgentRunConfig } from "../domain/agent-run-config.js";
import { getClaudeAgentRunBackendFactory } from "../backends/claude/index.js";
import { getCodexAgentRunBackendFactory } from "../backends/codex/index.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import { ClaudeAgentRunContext } from "../backends/claude/backend/claude-agent-run-context.js";
import { buildClaudeSessionConfig, DEFAULT_CLAUDE_PERMISSION_MODE } from "../backends/claude/session/claude-session-config.js";
import { CodexAgentRunContext } from "../backends/codex/backend/codex-agent-run-context.js";
import { buildCodexThreadConfig } from "../backends/codex/thread/codex-thread-config.js";
import { resolveApprovalPolicyForRunConfig } from "../backends/codex/backend/codex-thread-bootstrapper.js";
import { buildRuntimeAgentToolExposure } from "../shared/runtime-agent-tool-exposure.js";
import {
  AgentCreationError,
  AgentRunActivationError,
  AgentTerminationError,
  PlatformAgentRunRestoreError,
} from "../errors.js";
import { RunFileChangeService, getRunFileChangeService } from "../../services/run-file-changes/run-file-change-service.js";
import {
  ApplicationPublishedArtifactRelayService,
  createGeneralProcessPublishedArtifactRelayService,
} from "../../application-orchestration/services/application-published-artifact-relay-service.js";
import { AgentRunMemoryRecorder, getAgentRunMemoryRecorder } from "../../agent-memory/services/agent-run-memory-recorder.js";
import type {
  AgentToolMcpRunSessionReleaser,
} from "../../agent-tools/mcp/agent-tool-mcp-session-authority.js";
import {
  AgentRunResourceAttachmentError,
  AgentRunResourceManager,
} from "./agent-run-resource-manager.js";
import {
  AgentRunActivationRegistry,
  AgentRunRemovalCleanupError,
  type AgentRunActivationClaim,
} from "../runtime/agent-run-activation-registry.js";
import { AgentRunActivationCandidate, type AgentRunCandidateAbortResult } from "./agent-run-activation-candidate.js";

const logger = console;

const normalizeRequiredRunId = (runId: string): string => {
  const normalized = runId.trim();
  if (!normalized) throw new AgentCreationError("agentRunId is required for agent run creation.");
  return normalized;
};

export type AgentRunManagerOptions = {
  autoByteusBackendFactory?: AgentRunBackendFactory;
  codexBackendFactory?: AgentRunBackendFactory;
  claudeBackendFactory?: AgentRunBackendFactory;
  activationRegistry?: AgentRunActivationRegistry;
  runFileChangeService?: RunFileChangeService;
  publishedArtifactRelayService?: ApplicationPublishedArtifactRelayService;
  memoryRecorder?: AgentRunMemoryRecorder;
  agentToolMcpRunSessionReleaser: AgentToolMcpRunSessionReleaser;
};

export class AgentRunManager {
  private static instance: AgentRunManager | null = null;
  private readonly autoByteusBackendFactory: AgentRunBackendFactory;
  private readonly codexBackendFactory: AgentRunBackendFactory;
  private readonly claudeBackendFactory: AgentRunBackendFactory;
  private readonly activationRegistry: AgentRunActivationRegistry;
  private readonly memoryRecorder: AgentRunMemoryRecorder;
  private readonly agentToolMcpRunSessionReleaser: AgentToolMcpRunSessionReleaser;
  private readonly inFlightPreparations = new Set<Promise<AgentRunActivationCandidate>>();

  static getInstance(): AgentRunManager {
    if (!AgentRunManager.instance) {
      throw new Error("The process AgentRunManager is not initialized.");
    }
    return AgentRunManager.instance;
  }

  static initializeProcessInstance(options: AgentRunManagerOptions): AgentRunManager {
    if (AgentRunManager.instance) {
      throw new Error("The process AgentRunManager is already initialized.");
    }
    AgentRunManager.instance = new AgentRunManager(options);
    return AgentRunManager.instance;
  }

  static releaseProcessInstance(instance: AgentRunManager): void {
    if (AgentRunManager.instance === instance) AgentRunManager.instance = null;
  }

  constructor(options: AgentRunManagerOptions) {
    if (!options?.agentToolMcpRunSessionReleaser) {
      throw new Error("AgentRunManager requires an Agent Tools MCP run-session releaser.");
    }
    this.autoByteusBackendFactory = options.autoByteusBackendFactory ?? new AutoByteusAgentRunBackendFactory();
    this.codexBackendFactory = options.codexBackendFactory ?? getCodexAgentRunBackendFactory();
    this.claudeBackendFactory = options.claudeBackendFactory ?? getClaudeAgentRunBackendFactory();
    this.memoryRecorder = options.memoryRecorder ?? getAgentRunMemoryRecorder();
    this.agentToolMcpRunSessionReleaser =
      options.agentToolMcpRunSessionReleaser;
    this.activationRegistry = options.activationRegistry ?? new AgentRunActivationRegistry(
      new AgentRunResourceManager({
        runSessions: this.agentToolMcpRunSessionReleaser,
        runFileChangeService: options.runFileChangeService ?? getRunFileChangeService(),
        publishedArtifactRelayService: options.publishedArtifactRelayService
          ?? createGeneralProcessPublishedArtifactRelayService(),
        memoryRecorder: this.memoryRecorder,
      }),
    );
    logger.info("AgentRunManager initialized.");
  }

  prepareNewAgentRun(input: {
    runId: string;
    config: AgentRunConfig;
  }): Promise<AgentRunActivationCandidate> {
    const runId = normalizeRequiredRunId(input.runId);
    return this.prepareCandidate({
      runId,
      runtimeKind: input.config.runtimeKind,
      createBackend: (factory) => factory.createBackend(input.config, runId),
    });
  }

  prepareRestoreAgentRun(
    context: AgentRunContext<RuntimeAgentRunContext>,
  ): Promise<AgentRunActivationCandidate> {
    return this.prepareCandidate({
      runId: normalizeRequiredRunId(context.runId),
      runtimeKind: context.config.runtimeKind,
      createBackend: (factory) => factory.restoreBackend(context),
    });
  }

  async prepareRestoreAgentRunFromPlatformState(input: {
    runId: string;
    config: AgentRunConfig;
    platformAgentRunId: string;
  }): Promise<AgentRunActivationCandidate> {
    const runId = normalizeRequiredRunId(input.runId);
    const platformAgentRunId = input.platformAgentRunId?.trim();
    if (!platformAgentRunId || platformAgentRunId === runId) {
      throw new AgentRunActivationError(
        "PLATFORM_AGENT_RUN_BINDING_INVALID",
        "The persisted provider conversation identity is missing or invalid.",
      );
    }
    let candidate: AgentRunActivationCandidate;
    try {
      candidate = await this.prepareRestoreAgentRun(new AgentRunContext({
        runId,
        config: input.config,
        runtimeContext: this.buildRestoreRuntimeContext(input.config, platformAgentRunId),
      }));
    } catch (error) {
      if (error instanceof AgentRunActivationError) throw error;
      throw new PlatformAgentRunRestoreError(undefined, error);
    }
    if (candidate.platformAgentRunId !== platformAgentRunId) {
      const cleanup = await candidate.abort();
      if (cleanup.kind === "quarantined") throw this.cleanupError(runId, cleanup.error);
      throw new PlatformAgentRunRestoreError();
    }
    return candidate;
  }

  hasActiveRun(runId: string): boolean { return this.getActiveRun(runId) !== null; }

  getActiveRun(runId: string): AgentRun | null {
    return this.activationRegistry.getActiveRun(runId.trim());
  }

  listActiveRuns(): string[] {
    return this.activationRegistry.listActiveRunIds();
  }

  async terminateAgentRun(runId: string): Promise<boolean> {
    const normalizedRunId = normalizeRequiredRunId(runId);
    try {
      const activeRun = this.getActiveRun(normalizedRunId);
      if (!activeRun) return false;
      const result = await activeRun.terminate();
      if (!result.accepted || activeRun.isActive()) return false;
      const removal = this.activationRegistry.removeIfCurrent({
        runId: normalizedRunId,
        expectedRun: activeRun,
        reason: "explicit_termination",
      });
      this.activationRegistry.assertCleanupSucceeded(removal);
      return removal.kind === "removed";
    } catch (error) {
      logger.error(`Failed to terminate agent run '${normalizedRunId}': ${String(error)}`);
      if (error instanceof AgentRunRemovalCleanupError) throw error;
      throw new AgentTerminationError(String(error));
    }
  }

  async stopAllAgentRuns(): Promise<void> {
    this.activationRegistry.blockNewClaims();
    await Promise.allSettled(Array.from(this.inFlightPreparations));
    const snapshot = this.activationRegistry.snapshotForStop();
    const errors: unknown[] = [...snapshot.pruningErrors];

    for (const prepared of snapshot.preparedRuns) {
      const release = this.activationRegistry.releasePrepared(prepared.claim, prepared.run);
      errors.push(...release.errors);
      const termination = await this.terminatePrivate(prepared.run);
      this.activationRegistry.completeAbort(prepared.claim, prepared.run, termination);
      if (termination.kind === "quarantined") errors.push(termination.error);
    }

    for (const run of snapshot.activeRuns) {
      try {
        const termination = await run.terminate();
        if (!termination.accepted || run.isActive()) {
          errors.push(new Error(`Agent run '${run.runId}' did not become inactive during stop.`));
          continue;
        }
        const removal = this.activationRegistry.removeIfCurrent({
          runId: run.runId,
          expectedRun: run,
          reason: "stop_all",
        });
        if (removal.kind === "removed") errors.push(...removal.resources.errors);
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) throw new AggregateError(errors, "Failed to stop all agent runs.");
  }

  private prepareCandidate(input: {
    runId: string;
    runtimeKind: RuntimeKind;
    createBackend(factory: AgentRunBackendFactory): Promise<AgentRunBackend>;
  }): Promise<AgentRunActivationCandidate> {
    const task = this.prepareCandidateOnce(input);
    this.inFlightPreparations.add(task);
    void task.finally(() => this.inFlightPreparations.delete(task)).catch(() => undefined);
    return task;
  }

  private async prepareCandidateOnce(input: {
    runId: string;
    runtimeKind: RuntimeKind;
    createBackend(factory: AgentRunBackendFactory): Promise<AgentRunBackend>;
  }): Promise<AgentRunActivationCandidate> {
    const claim = this.activationRegistry.claim(input.runId);
    const factory = this.resolveBackendFactory(input.runtimeKind);
    if (!factory) {
      this.activationRegistry.releaseClaim(claim);
      throw new AgentCreationError(`Runtime kind '${input.runtimeKind}' is not supported.`);
    }

    let backend: AgentRunBackend | null = null;
    let run: AgentRun | null = null;
    let resourcesAttached = false;
    try {
      backend = await input.createBackend(factory);
      run = new AgentRun({ context: backend.getContext(), backend, commandObservers: [this.memoryRecorder] });
      if (run.runId !== input.runId) {
        throw new AgentCreationError("The runtime backend returned a different local run identity.");
      }
      this.activationRegistry.markPrepared(claim, run);
      resourcesAttached = true;
      const exactRun = run;
      return new AgentRunActivationCandidate({
        runId: exactRun.runId,
        runtimeKind: exactRun.runtimeKind,
        platformAgentRunId: exactRun.getPlatformAgentRunId(),
        publish: () => {
          const published = this.activationRegistry.publish(claim, exactRun);
          try { logger.info(`Published ${published.runtimeKind} agent run '${published.runId}'.`); } catch {}
          return published;
        },
        abort: () => this.abortCandidate(exactRun, claim),
      });
    } catch (error) {
      if (!(error instanceof AgentCreationError || error instanceof AgentRunActivationError)) {
        logger.error(
          `Unexpected failure while preparing agent run '${input.runId}' for runtime '${input.runtimeKind}'.`,
          error,
        );
      }
      const cleanup = await this.cleanupFailedPreparation(
        claim,
        run,
        backend,
        error,
        resourcesAttached,
      );
      if (cleanup.kind === "quarantined") throw this.cleanupError(input.runId, cleanup.error);
      if (error instanceof AgentCreationError || error instanceof AgentRunActivationError) throw error;
      const failure = new AgentCreationError(`Failed to prepare agent run '${input.runId}'.`);
      failure.cause = error;
      throw failure;
    }
  }

  private async abortCandidate(
    run: AgentRun,
    claim: AgentRunActivationClaim,
  ): Promise<AgentRunCandidateAbortResult> {
    const release = this.activationRegistry.releasePrepared(claim, run);
    const termination = await this.terminatePrivate(run);
    const errors = [...release.errors];
    if (termination.kind === "quarantined") errors.push(termination.error);
    const result: AgentRunCandidateAbortResult = errors.length === 0
      ? { kind: "aborted" }
      : { kind: "quarantined", error: new AggregateError(errors, `Agent run '${run.runId}' cleanup failed.`) };
    this.activationRegistry.completeAbort(claim, run, result);
    return result;
  }

  private async cleanupFailedPreparation(
    claim: AgentRunActivationClaim,
    run: AgentRun | null,
    backend: AgentRunBackend | null,
    primaryError: unknown,
    resourcesAttached: boolean,
  ): Promise<AgentRunCandidateAbortResult> {
    const errors: Error[] = [];
    if (run || backend) {
      const termination = run
        ? await this.terminatePrivate(run)
        : await this.terminateBackend(backend!);
      if (termination.kind === "quarantined") errors.push(termination.error);
    }
    if (run) {
      const release = this.activationRegistry.releasePrepared(claim, run);
      errors.push(...release.errors);
      if (
        !resourcesAttached
        && !(primaryError instanceof AgentRunResourceAttachmentError)
      ) {
        try {
          this.agentToolMcpRunSessionReleaser.revokeForRun(claim.runId);
        } catch (error) {
          errors.push(error instanceof Error ? error : new Error(String(error)));
        }
      }
      if (primaryError instanceof AgentRunResourceAttachmentError) {
        errors.push(...primaryError.errors.slice(1).map((error) =>
          error instanceof Error ? error : new Error(String(error))));
      }
    } else {
      try {
        this.agentToolMcpRunSessionReleaser.revokeForRun(claim.runId);
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }
    const result: AgentRunCandidateAbortResult = errors.length === 0
      ? { kind: "aborted" }
      : {
          kind: "quarantined",
          error: new AggregateError(
            [primaryError, ...errors],
            `Agent run '${claim.runId}' preparation and cleanup failed.`,
          ),
        };
    this.activationRegistry.completeAbort(claim, run, result);
    return result;
  }

  private async terminatePrivate(run: AgentRun): Promise<AgentRunCandidateAbortResult> {
    try {
      await run.terminate();
      if (!run.isActive()) return { kind: "aborted" };
      return { kind: "quarantined", error: new Error("Private AgentRun inactivity could not be confirmed.") };
    } catch (error) {
      if (!run.isActive()) return { kind: "aborted" };
      return { kind: "quarantined", error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  private async terminateBackend(backend: AgentRunBackend): Promise<AgentRunCandidateAbortResult> {
    try {
      await backend.terminate();
      if (!backend.isActive()) return { kind: "aborted" };
      return { kind: "quarantined", error: new Error("Private backend inactivity could not be confirmed.") };
    } catch (error) {
      if (!backend.isActive()) return { kind: "aborted" };
      return { kind: "quarantined", error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  private cleanupError(runId: string, cause: Error): AgentRunActivationError {
    return new AgentRunActivationError(
      "AGENT_RUN_ACTIVATION_CLEANUP_FAILED",
      `Agent run '${runId}' cleanup could not be confirmed; activation is quarantined.`,
      { cause },
    );
  }

  private resolveBackendFactory(runtimeKind: RuntimeKind): AgentRunBackendFactory | null {
    if (runtimeKind === RuntimeKind.AUTOBYTEUS) return this.autoByteusBackendFactory;
    if (runtimeKind === RuntimeKind.CODEX_APP_SERVER) return this.codexBackendFactory;
    if (runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK) return this.claudeBackendFactory;
    return null;
  }

  private buildRestoreRuntimeContext(
    config: AgentRunConfig,
    platformAgentRunId: string,
  ): RuntimeAgentRunContext {
    if (config.runtimeKind === RuntimeKind.CODEX_APP_SERVER) {
      return new CodexAgentRunContext({
        codexThreadConfig: buildCodexThreadConfig({
          model: config.llmModelIdentifier,
          workingDirectory: ".",
          reasoningEffort: null,
          serviceTier: null,
          approvalPolicy: resolveApprovalPolicyForRunConfig(config),
          sandbox: "workspace-write",
          dynamicTools: null,
        }),
        threadId: platformAgentRunId,
      });
    }
    if (config.runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK) {
      return new ClaudeAgentRunContext({
        sessionConfig: buildClaudeSessionConfig({
          model: config.llmModelIdentifier,
          workingDirectory: ".",
          permissionMode: DEFAULT_CLAUDE_PERMISSION_MODE,
          autoExecuteTools: config.autoExecuteTools,
        }),
        carpenterSystemPrompt: "Pending runtime bootstrap.",
        runtimeToolExposure: buildRuntimeAgentToolExposure([], config.memberTeamContext),
        sessionId: platformAgentRunId,
      });
    }
    return null;
  }
}
