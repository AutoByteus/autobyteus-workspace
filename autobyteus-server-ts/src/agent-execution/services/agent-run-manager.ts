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
  DEFAULT_CLAUDE_PERMISSION_MODE,
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
  createGeneralProcessPublishedArtifactRelayService,
} from "../../application-orchestration/services/application-published-artifact-relay-service.js";
import {
  AgentRunMemoryRecorder,
  getAgentRunMemoryRecorder,
} from "../../agent-memory/services/agent-run-memory-recorder.js";
import {
  getAgentToolMcpSessionService,
  type AgentToolMcpSessionManager,
} from "../../agent-tools/mcp/agent-tool-mcp-session-service.js";
import {
  ActiveAgentRunRegistry,
  AgentRunRemovalCleanupError,
} from "../runtime/active-agent-run-registry.js";
import { AgentRunResourceManager } from "./agent-run-resource-manager.js";

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
  agentToolMcpSessionManager?: AgentToolMcpSessionManager;
  activeRunRegistry?: ActiveAgentRunRegistry;
};

export class AgentRunManager {
  private static instance: AgentRunManager | null = null;
  private readonly autoByteusBackendFactory: AgentRunBackendFactory;
  private readonly codexBackendFactory: AgentRunBackendFactory;
  private readonly claudeBackendFactory: AgentRunBackendFactory;
  private readonly activeRunRegistry: ActiveAgentRunRegistry;
  private readonly memoryRecorder: AgentRunMemoryRecorder;

  static getInstance(options: AgentRunManagerOptions = {}): AgentRunManager {
    if (!AgentRunManager.instance) {
      AgentRunManager.instance = new AgentRunManager(options);
    }
    return AgentRunManager.instance;
  }

  static initializeProcessInstance(
    options: AgentRunManagerOptions,
  ): AgentRunManager {
    if (AgentRunManager.instance) {
      throw new Error("The process AgentRunManager is already initialized.");
    }
    AgentRunManager.instance = new AgentRunManager(options);
    return AgentRunManager.instance;
  }

  static releaseProcessInstance(instance: AgentRunManager): void {
    if (AgentRunManager.instance === instance) {
      AgentRunManager.instance = null;
    }
  }

  constructor(options: AgentRunManagerOptions = {}) {
    this.autoByteusBackendFactory =
      options.autoByteusBackendFactory ?? new AutoByteusAgentRunBackendFactory();
    this.codexBackendFactory =
      options.codexBackendFactory ?? getCodexAgentRunBackendFactory();
    this.claudeBackendFactory =
      options.claudeBackendFactory ?? getClaudeAgentRunBackendFactory();
    this.memoryRecorder = options.memoryRecorder ?? getAgentRunMemoryRecorder();
    if (options.activeRunRegistry) {
      this.activeRunRegistry = options.activeRunRegistry;
    } else {
      const runFileChangeService =
        options.runFileChangeService ?? getRunFileChangeService();
      const publishedArtifactRelayService =
        options.publishedArtifactRelayService
        ?? createGeneralProcessPublishedArtifactRelayService();
      const memoryRecorder = this.memoryRecorder;
      const agentToolMcpSessionManager =
        options.agentToolMcpSessionManager ?? getAgentToolMcpSessionService();
      this.activeRunRegistry = new ActiveAgentRunRegistry(
        new AgentRunResourceManager({
          sessionScope: {
            revokeForRun: (runId) =>
              agentToolMcpSessionManager.revokeAgentToolMcpSessionsForRun(runId),
          },
          runFileChangeService,
          publishedArtifactRelayService,
          memoryRecorder,
        }),
      );
    }
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
    this.activeRunRegistry.register(activeRun);
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
    this.activeRunRegistry.register(activeRun);
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
    return this.activeRunRegistry.getActiveRun(runId);
  }

  listActiveRuns(): string[] {
    return this.activeRunRegistry.listActiveRuns().map((run) => run.runId);
  }

  async terminateAgentRun(runId: string): Promise<boolean> {
    try {
      const activeRun = this.getActiveRun(runId);
      if (!activeRun) {
        return false;
      }
      const result = await activeRun.terminate();
      if (!result.accepted) {
        return false;
      }
      const removal = this.activeRunRegistry.removeIfCurrent({
        runId,
        expectedRun: activeRun,
        reason: "explicit_termination",
      });
      this.activeRunRegistry.assertCleanupSucceeded(removal);
      return removal.kind === "removed";
    } catch (error) {
      logger.error(`Failed to terminate agent run '${runId}': ${String(error)}`);
      if (error instanceof AgentRunRemovalCleanupError) {
        throw error;
      }
      throw new AgentTerminationError(String(error));
    }
  }

  async stopAllAgentRuns(): Promise<void> {
    const errors: unknown[] = [];
    const activeRuns = [...this.activeRunRegistry.listActiveRuns()];
    for (const activeRun of activeRuns) {
      try {
        const termination = await activeRun.terminate();
        if (!termination.accepted) {
          continue;
        }
        const removal = this.activeRunRegistry.removeIfCurrent({
          runId: activeRun.runId,
          expectedRun: activeRun,
          reason: "stop_all",
        });
        this.activeRunRegistry.assertCleanupSucceeded(removal);
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        "Failed to stop all agent runs.",
      );
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
          permissionMode: DEFAULT_CLAUDE_PERMISSION_MODE,
          autoExecuteTools: config.autoExecuteTools,
        }),
        configuredToolExposure: buildConfiguredAgentToolExposure([]),
        memberTeamContext: config.memberTeamContext,
        sessionId: platformAgentRunId,
      });
    }
    return null;
  }


}
