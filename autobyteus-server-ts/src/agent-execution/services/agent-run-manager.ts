import { AutoByteusAgentRunBackendFactory } from "../backends/autobyteus/autobyteus-agent-run-backend-factory.js";
import type { AgentRunBackendFactory } from "../backends/agent-run-backend-factory.js";

import { AgentRun } from "../domain/agent-run.js";
import { AgentRunContext, type RuntimeAgentRunContext } from "../domain/agent-run-context.js";
import { AgentRunConfig } from "../domain/agent-run-config.js";
import {
  getClaudeAgentRunBackendFactory,
} from "../backends/claude/index.js";
import {
  getCodexAgentRunBackendFactory,
} from "../backends/codex/index.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import { ClaudeAgentRunContext } from "../backends/claude/backend/claude-agent-run-context.js";
import {
  buildClaudeSessionConfig,
  resolveClaudePermissionMode,
} from "../backends/claude/session/claude-session-config.js";
import { CodexAgentRunContext } from "../backends/codex/backend/codex-agent-run-context.js";
import { buildCodexThreadConfig } from "../backends/codex/thread/codex-thread-config.js";
import { resolveApprovalPolicyForRunConfig } from "../backends/codex/backend/codex-thread-bootstrapper.js";
import { buildConfiguredAgentToolExposure } from "../shared/configured-agent-tool-exposure.js";
import { AgentCreationError, AgentTerminationError } from "../errors.js";
import {
  RunFileChangeService,
  getRunFileChangeService,
} from "../../services/run-file-changes/run-file-change-service.js";
import {
  ApplicationPublishedArtifactRelayService,
  getApplicationPublishedArtifactRelayService,
} from "../../application-orchestration/services/application-published-artifact-relay-service.js";
import {
  AgentRunMemoryRecorder,
  getAgentRunMemoryRecorder,
} from "../../agent-memory/services/agent-run-memory-recorder.js";
import { getAgentToolMcpSessionService } from "../../agent-tools/mcp/agent-tool-mcp-session-service.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

const normalizeRequiredRunId = (runId: string): string => {
  const normalized = runId.trim();
  if (!normalized) {
    throw new AgentCreationError("agentRunId is required for agent run creation.");
  }
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

export class AgentRunManager {
  private static instance: AgentRunManager | null = null;
  private readonly autoByteusBackendFactory: AgentRunBackendFactory;
  private readonly codexBackendFactory: AgentRunBackendFactory;
  private readonly claudeBackendFactory: AgentRunBackendFactory;
  private readonly runFileChangeService: RunFileChangeService;
  private readonly publishedArtifactRelayService: ApplicationPublishedArtifactRelayService;
  private readonly memoryRecorder: AgentRunMemoryRecorder;
  private activeRuns = new Map<string, AgentRun>();
  private readonly runFileChangeUnsubscribers = new Map<string, () => void>();
  private readonly publishedArtifactRelayUnsubscribers = new Map<string, () => void>();
  private readonly memoryRecorderUnsubscribers = new Map<string, () => void>();

  static getInstance(options: AgentRunManagerOptions = {}): AgentRunManager {
    if (!AgentRunManager.instance) {
      AgentRunManager.instance = new AgentRunManager(options);
    }
    return AgentRunManager.instance;
  }

  constructor(options: AgentRunManagerOptions = {}) {
    this.autoByteusBackendFactory =
      options.autoByteusBackendFactory ?? new AutoByteusAgentRunBackendFactory();
    this.codexBackendFactory =
      options.codexBackendFactory ?? getCodexAgentRunBackendFactory();
    this.claudeBackendFactory =
      options.claudeBackendFactory ?? getClaudeAgentRunBackendFactory();
    this.runFileChangeService =
      options.runFileChangeService ?? getRunFileChangeService();
    this.publishedArtifactRelayService =
      options.publishedArtifactRelayService ?? getApplicationPublishedArtifactRelayService();
    this.memoryRecorder = options.memoryRecorder ?? getAgentRunMemoryRecorder();
    logger.info("AgentRunManager initialized.");
  }

  async createAgentRun(config: AgentRunConfig, agentRunId: string): Promise<AgentRun> {
    const normalizedRunId = normalizeRequiredRunId(agentRunId);
    if (this.hasActiveRun(normalizedRunId)) {
      throw new AgentCreationError(`Agent run '${normalizedRunId}' is already active.`);
    }
    const { runtimeKind } = config;
    const backendFactory = this.resolveBackendFactory(runtimeKind);
    if (!backendFactory) {
      throw new AgentCreationError(
        `Runtime kind '${runtimeKind}' is not yet supported by AgentRunManager.createAgentRun().`,
      );
    }
    const backend = await backendFactory.createBackend(config, normalizedRunId);
    const activeRun = new AgentRun({
      context: backend.getContext(),
      backend,
      commandObservers: [this.memoryRecorder],
    });
    if (activeRun.runId !== normalizedRunId) {
      throw new AgentCreationError(
        `Runtime backend returned run id '${activeRun.runId}' but '${normalizedRunId}' was requested.`,
      );
    }
    this.registerActiveRun(activeRun);
    logger.info(`Successfully created ${runtimeKind} agent run '${activeRun.runId}'.`);
    return activeRun;
  }

  async restoreAgentRun(
    context: AgentRunContext<RuntimeAgentRunContext>,
  ): Promise<AgentRun> {
    const { runId } = context;
    if (this.hasActiveRun(runId)) {
      throw new AgentCreationError(`Agent run '${runId}' is already active.`);
    }
    const runtimeKind = context.config.runtimeKind;
    const backendFactory = this.resolveBackendFactory(runtimeKind);
    if (!backendFactory) {
      throw new AgentCreationError(
        `Runtime kind '${runtimeKind}' is not yet supported by AgentRunManager.restoreAgentRun().`,
      );
    }
    const backend = await backendFactory.restoreBackend(context);
    const activeRun = new AgentRun({
      context: backend.getContext(),
      backend,
      commandObservers: [this.memoryRecorder],
    });
    this.registerActiveRun(activeRun);
    logger.info(
      `Successfully restored ${runtimeKind} agent run '${runId}'.`,
    );
    return activeRun;
  }

  async restoreAgentRunFromPlatformState(input: {
    runId: string;
    config: AgentRunConfig;
    platformAgentRunId: string | null;
  }): Promise<AgentRun> {
    return this.restoreAgentRun(new AgentRunContext({
      runId: input.runId,
      config: input.config,
      runtimeContext: this.buildRestoreRuntimeContext(
        input.config,
        input.platformAgentRunId,
      ),
    }));
  }

  hasActiveRun(runId: string): boolean {
    return this.getActiveRun(runId) !== null;
  }

  getActiveRun(runId: string): AgentRun | null {
    const activeRun = this.activeRuns.get(runId) ?? null;
    if (!activeRun) {
      return null;
    }
    if (!activeRun.isActive()) {
      this.unregisterActiveRun(runId);
      return null;
    }
    return activeRun;
  }

  listActiveRuns(): string[] {
    const activeRunIds: string[] = [];
    for (const runId of this.activeRuns.keys()) {
      if (this.getActiveRun(runId)) {
        activeRunIds.push(runId);
      }
    }
    return activeRunIds;
  }

  async terminateAgentRun(runId: string): Promise<boolean> {
    try {
      const activeRun = this.getActiveRun(runId);
      if (activeRun) {
        const result = await activeRun.terminate();
        if (!result.accepted) {
          return false;
        }
        this.unregisterActiveRun(runId);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Failed to terminate agent run '${runId}': ${String(error)}`);
      throw new AgentTerminationError(String(error));
    }
  }

  private resolveBackendFactory(
    runtimeKind: RuntimeKind,
  ): AgentRunBackendFactory | null {
    if (runtimeKind === RuntimeKind.AUTOBYTEUS) {
      return this.autoByteusBackendFactory;
    }
    if (runtimeKind === RuntimeKind.CODEX_APP_SERVER) {
      return this.codexBackendFactory;
    }
    if (runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK) {
      return this.claudeBackendFactory;
    }
    return null;
  }

  private buildRestoreRuntimeContext(
    config: AgentRunConfig,
    platformAgentRunId: string | null,
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
          permissionMode: resolveClaudePermissionMode(config.autoExecuteTools),
        }),
        configuredToolExposure: buildConfiguredAgentToolExposure([]),
        memberTeamContext: config.memberTeamContext,
        sessionId: platformAgentRunId,
      });
    }
    return null;
  }

  private registerActiveRun(activeRun: AgentRun): void {
    const existing = this.activeRuns.get(activeRun.runId) ?? null;
    if (existing?.isActive()) {
      throw new AgentCreationError(`Agent run '${activeRun.runId}' is already active.`);
    }
    if (existing) {
      this.unregisterActiveRun(activeRun.runId);
    }
    this.activeRuns.set(activeRun.runId, activeRun);
    this.runFileChangeUnsubscribers.set(
      activeRun.runId,
      this.runFileChangeService.attachToRun(activeRun),
    );
    this.publishedArtifactRelayUnsubscribers.set(
      activeRun.runId,
      this.publishedArtifactRelayService.attachToRun(activeRun),
    );
    this.memoryRecorderUnsubscribers.set(
      activeRun.runId,
      this.memoryRecorder.attachToRun(activeRun),
    );
  }

  private unregisterActiveRun(runId: string): void {
    this.activeRuns.delete(runId);
    getAgentToolMcpSessionService().revokeAgentToolMcpSessionsForRun(runId);
    this.unregisterRunFileChanges(runId);
    this.unregisterPublishedArtifactRelay(runId);
    this.unregisterMemoryRecorder(runId);
  }

  private unregisterRunFileChanges(runId: string): void {
    const unsubscribe = this.runFileChangeUnsubscribers.get(runId);
    if (!unsubscribe) {
      return;
    }
    this.runFileChangeUnsubscribers.delete(runId);
    unsubscribe();
  }

  private unregisterPublishedArtifactRelay(runId: string): void {
    const unsubscribe = this.publishedArtifactRelayUnsubscribers.get(runId);
    if (!unsubscribe) {
      return;
    }
    this.publishedArtifactRelayUnsubscribers.delete(runId);
    unsubscribe();
  }

  private unregisterMemoryRecorder(runId: string): void {
    const unsubscribe = this.memoryRecorderUnsubscribers.get(runId);
    if (!unsubscribe) {
      return;
    }
    this.memoryRecorderUnsubscribers.delete(runId);
    unsubscribe();
  }
}
