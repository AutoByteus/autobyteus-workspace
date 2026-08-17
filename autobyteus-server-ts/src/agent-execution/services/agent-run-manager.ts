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
  getApplicationPublishedArtifactRelayService,
} from "../../application-orchestration/services/application-published-artifact-relay-service.js";
import { AgentRunMemoryRecorder, getAgentRunMemoryRecorder } from "../../agent-memory/services/agent-run-memory-recorder.js";
import { getAgentToolMcpSessionService } from "../../agent-tools/mcp/agent-tool-mcp-session-service.js";
import { AgentRunActivationCandidate, type AgentRunCandidateAbortResult } from "./agent-run-activation-candidate.js";

const logger = console;

const normalizeRequiredRunId = (runId: string): string => {
  const normalized = runId.trim();
  if (!normalized) throw new AgentCreationError("agentRunId is required for agent run creation.");
  return normalized;
};

type AgentRunManagerOptions = {
  autoByteusBackendFactory?: AgentRunBackendFactory;
  codexBackendFactory?: AgentRunBackendFactory;
  claudeBackendFactory?: AgentRunBackendFactory;
  runFileChangeService?: RunFileChangeService;
  publishedArtifactRelayService?: ApplicationPublishedArtifactRelayService;
  memoryRecorder?: AgentRunMemoryRecorder;
};

type PendingClaim = {
  token: symbol;
  state: "constructing" | "prepared" | "quarantined";
  quarantineError: Error | null;
};

type ManagerAttachments = {
  runFiles: () => void;
  artifacts: () => void;
  memory: () => void;
};

export class AgentRunManager {
  private static instance: AgentRunManager | null = null;
  private readonly autoByteusBackendFactory: AgentRunBackendFactory;
  private readonly codexBackendFactory: AgentRunBackendFactory;
  private readonly claudeBackendFactory: AgentRunBackendFactory;
  private readonly runFileChangeService: RunFileChangeService;
  private readonly publishedArtifactRelayService: ApplicationPublishedArtifactRelayService;
  private readonly memoryRecorder: AgentRunMemoryRecorder;
  private readonly activeRuns = new Map<string, AgentRun>();
  private readonly pendingClaims = new Map<string, PendingClaim>();
  private readonly attachments = new Map<string, ManagerAttachments>();

  static getInstance(options: AgentRunManagerOptions = {}): AgentRunManager {
    return AgentRunManager.instance ??= new AgentRunManager(options);
  }

  constructor(options: AgentRunManagerOptions = {}) {
    this.autoByteusBackendFactory = options.autoByteusBackendFactory ?? new AutoByteusAgentRunBackendFactory();
    this.codexBackendFactory = options.codexBackendFactory ?? getCodexAgentRunBackendFactory();
    this.claudeBackendFactory = options.claudeBackendFactory ?? getClaudeAgentRunBackendFactory();
    this.runFileChangeService = options.runFileChangeService ?? getRunFileChangeService();
    this.publishedArtifactRelayService = options.publishedArtifactRelayService ?? getApplicationPublishedArtifactRelayService();
    this.memoryRecorder = options.memoryRecorder ?? getAgentRunMemoryRecorder();
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
    const normalizedRunId = runId.trim();
    const activeRun = this.activeRuns.get(normalizedRunId) ?? null;
    if (!activeRun) return null;
    if (!activeRun.isActive()) {
      this.unregisterActiveRun(normalizedRunId);
      return null;
    }
    return activeRun;
  }

  listActiveRuns(): string[] {
    return [...this.activeRuns.keys()].filter((runId) => this.getActiveRun(runId));
  }

  async terminateAgentRun(runId: string): Promise<boolean> {
    const normalizedRunId = normalizeRequiredRunId(runId);
    try {
      const activeRun = this.getActiveRun(normalizedRunId);
      if (!activeRun) return false;
      const result = await activeRun.terminate();
      if (!result.accepted || activeRun.isActive()) return false;
      this.unregisterActiveRun(normalizedRunId);
      return true;
    } catch (error) {
      logger.error(`Failed to terminate agent run '${normalizedRunId}': ${String(error)}`);
      throw new AgentTerminationError(String(error));
    }
  }

  private async prepareCandidate(input: {
    runId: string;
    runtimeKind: RuntimeKind;
    createBackend(factory: AgentRunBackendFactory): Promise<AgentRunBackend>;
  }): Promise<AgentRunActivationCandidate> {
    const claim = this.claim(input.runId);
    const factory = this.resolveBackendFactory(input.runtimeKind);
    if (!factory) {
      this.pendingClaims.delete(input.runId);
      throw new AgentCreationError(`Runtime kind '${input.runtimeKind}' is not supported.`);
    }

    let backend: AgentRunBackend | null = null;
    let run: AgentRun | null = null;
    try {
      backend = await input.createBackend(factory);
      run = new AgentRun({ context: backend.getContext(), backend, commandObservers: [this.memoryRecorder] });
      if (run.runId !== input.runId) {
        throw new AgentCreationError("The runtime backend returned a different local run identity.");
      }
      this.attachments.set(input.runId, this.prepareAttachments(run));
      claim.state = "prepared";
      const exactRun = run;
      return new AgentRunActivationCandidate({
        runId: exactRun.runId,
        runtimeKind: exactRun.runtimeKind,
        platformAgentRunId: exactRun.getPlatformAgentRunId(),
        publish: () => this.publishCandidate(exactRun, claim),
        abort: () => this.abortCandidate(exactRun, claim),
      });
    } catch (error) {
      const cleanup = await this.cleanupFailedPreparation(input.runId, claim, run, backend);
      if (cleanup.kind === "quarantined") throw this.cleanupError(input.runId, cleanup.error);
      if (error instanceof AgentCreationError || error instanceof AgentRunActivationError) throw error;
      const failure = new AgentCreationError(`Failed to prepare agent run '${input.runId}'.`);
      failure.cause = error;
      throw failure;
    }
  }

  private claim(runId: string): PendingClaim {
    if (this.getActiveRun(runId)) {
      throw new AgentRunActivationError(
        "AGENT_RUN_ACTIVATION_IN_PROGRESS_CONFLICT",
        `Agent run '${runId}' is already active.`,
      );
    }
    const existing = this.pendingClaims.get(runId);
    if (existing) {
      throw new AgentRunActivationError(
        existing.state === "quarantined"
          ? "AGENT_RUN_ACTIVATION_CLEANUP_FAILED"
          : "AGENT_RUN_ACTIVATION_IN_PROGRESS_CONFLICT",
        existing.state === "quarantined"
          ? `Agent run '${runId}' is quarantined after uncertain cleanup.`
          : `Agent run '${runId}' already has a private activation candidate.`,
        { cause: existing.quarantineError ?? undefined },
      );
    }
    const claim: PendingClaim = { token: Symbol(runId), state: "constructing", quarantineError: null };
    this.pendingClaims.set(runId, claim);
    return claim;
  }

  private publishCandidate(run: AgentRun, claim: PendingClaim): AgentRun {
    if (claim.state !== "prepared" || this.pendingClaims.get(run.runId)?.token !== claim.token) {
      this.quarantineClaim(run.runId, claim, new Error("AgentRun publication claim mismatch."));
      throw this.cleanupError(run.runId, claim.quarantineError!);
    }
    if (!run.isActive()) {
      throw new AgentCreationError(`Private AgentRun '${run.runId}' became inactive before publication.`);
    }
    if (this.activeRuns.has(run.runId)) {
      this.quarantineClaim(run.runId, claim, new Error("AgentRun publication invariant failed."));
      throw this.cleanupError(run.runId, claim.quarantineError!);
    }
    this.activeRuns.set(run.runId, run);
    this.pendingClaims.delete(run.runId);
    try { logger.info(`Published ${run.runtimeKind} agent run '${run.runId}'.`); } catch {}
    return run;
  }

  private async abortCandidate(run: AgentRun, claim: PendingClaim): Promise<AgentRunCandidateAbortResult> {
    if (this.pendingClaims.get(run.runId)?.token !== claim.token) {
      const error = new Error("AgentRun abort claim mismatch.");
      this.quarantineClaim(run.runId, claim, error);
      return { kind: "quarantined", error };
    }
    const wasQuarantined = claim.state === "quarantined";
    if (claim.state !== "prepared" && !wasQuarantined) {
      const error = new Error(`AgentRun candidate cannot be aborted from claim state '${claim.state}'.`);
      this.quarantineClaim(run.runId, claim, error);
      return { kind: "quarantined", error };
    }
    this.detach(run.runId);
    getAgentToolMcpSessionService().revokeAgentToolMcpSessionsForRun(run.runId);
    const cleanup = await this.terminatePrivate(run);
    if (cleanup.kind === "aborted" && !wasQuarantined) this.pendingClaims.delete(run.runId);
    else if (cleanup.kind === "quarantined") this.quarantineClaim(run.runId, claim, cleanup.error);
    if (wasQuarantined) {
      return {
        kind: "quarantined",
        error: claim.quarantineError ?? new Error("AgentRun publication claim is quarantined."),
      };
    }
    return cleanup;
  }

  private async cleanupFailedPreparation(
    runId: string,
    claim: PendingClaim,
    run: AgentRun | null,
    backend: AgentRunBackend | null,
  ): Promise<AgentRunCandidateAbortResult> {
    this.detach(runId);
    getAgentToolMcpSessionService().revokeAgentToolMcpSessionsForRun(runId);
    if (!run && !backend) {
      this.pendingClaims.delete(runId);
      return { kind: "aborted" };
    }
    const cleanup = run ? await this.terminatePrivate(run) : await this.terminateBackend(backend!);
    if (cleanup.kind === "aborted") this.pendingClaims.delete(runId);
    else this.quarantineClaim(runId, claim, cleanup.error);
    return cleanup;
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

  private prepareAttachments(run: AgentRun): ManagerAttachments {
    const attached: Array<() => void> = [];
    try {
      const runFiles = this.runFileChangeService.attachToRun(run); attached.push(runFiles);
      const artifacts = this.publishedArtifactRelayService.attachToRun(run); attached.push(artifacts);
      const memory = this.memoryRecorder.attachToRun(run); attached.push(memory);
      return { runFiles, artifacts, memory };
    } catch (error) {
      [...attached].reverse().forEach((unsubscribe) => { try { unsubscribe(); } catch {} });
      throw error;
    }
  }

  private detach(runId: string): void {
    const attachments = this.attachments.get(runId);
    if (!attachments) return;
    this.attachments.delete(runId);
    for (const unsubscribe of [attachments.memory, attachments.artifacts, attachments.runFiles]) {
      try { unsubscribe(); } catch (error) { logger.warn(`AgentRun observer detach failed: ${String(error)}`); }
    }
  }

  private unregisterActiveRun(runId: string): void {
    this.activeRuns.delete(runId);
    getAgentToolMcpSessionService().revokeAgentToolMcpSessionsForRun(runId);
    this.detach(runId);
  }

  private quarantineClaim(runId: string, claim: PendingClaim, error: Error): void {
    claim.state = "quarantined";
    claim.quarantineError = error;
    this.pendingClaims.set(runId, claim);
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
