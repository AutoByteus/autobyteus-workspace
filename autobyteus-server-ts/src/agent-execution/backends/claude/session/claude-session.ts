import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { appendContextFileReferenceSection } from "autobyteus-ts/agent/message/context-file-reference-section.js";
import {
  logger,
  asString,
  nowTimestampSeconds,
  type ClaudeSessionEvent,
} from "../claude-runtime-shared.js";
import { resolveClaudeStreamChunkSessionId } from "../claude-runtime-message-normalizers.js";
import { ClaudeSessionEventName } from "../events/claude-session-event-name.js";
import { logRawClaudeSessionChunkDetails } from "../events/claude-session-event-debug.js";
import type { ClaudeRunContext } from "../backend/claude-agent-run-context.js";
import { ClaudeSessionMessageCache } from "./claude-session-message-cache.js";
import type { ClaudeSessionConfig } from "./claude-session-config.js";
import {
  createClaudeActiveTurnExecution,
  isClaudeActiveTurnInterrupted,
  type ClaudeActiveTurnExecution,
} from "./claude-active-turn-execution.js";
import { resolveClaudeSessionToolingOptions } from "./claude-session-tooling-options.js";
import { buildClaudeProviderCompactionEvent, buildClaudeTurnTerminalErrorEvent, isClaudeTurnTerminalChunk, resolveClaudeTurnTerminalError } from "./claude-session-output-events.js";
import { ClaudeProcessDiagnostics, enrichClaudeRuntimeErrorWithDiagnostics, formatClaudeRuntimeError } from "./claude-process-diagnostics.js";
import { ClaudeTextSegmentProjector } from "./claude-text-segment-projector.js";
import { buildClaudeSessionMcpServerConfig } from "./claude-session-mcp-server-config.js";
import { emitClaudeTokenUsageEvent } from "./claude-session-token-usage.js";
import { processOrderedClaudeContentBlocks } from "./claude-session-content-block-processor.js";
import { ContextFileLocalPathResolver } from "../../../../context-files/services/context-file-local-path-resolver.js";
import { getAgentToolMcpSessionService } from "../../../../agent-tools/mcp/agent-tool-mcp-session-service.js";
import { ClaudeAgentToolsMcpSessionState } from "../agent-tools-mcp/claude-agent-tools-mcp-session-state.js";
import type { ClaudeSessionDependencies, ClaudeSessionStateInput } from "./claude-session-state-input.js";

import { dispatchRuntimeEvent } from "../../shared/runtime-event-dispatch.js";

type ClaudeSessionTurnExecutionInput = { turnId: string; content: string; abortController: AbortController };
type ClaudeSessionStatus = "OFFLINE" | "IDLE" | "RUNNING" | "ERROR";
type ContextFilePathResolverLike = Pick<ContextFileLocalPathResolver, "resolve">;

export class ClaudeSession {
  readonly runContext: ClaudeRunContext;
  private readonly dependencies: ClaudeSessionDependencies;
  readonly listeners: Set<(event: ClaudeSessionEvent) => void>;
  activeAbortController: AbortController | null;
  private activeTurnExecution: ClaudeActiveTurnExecution | null = null;
  private currentStatus: ClaudeSessionStatus;
  private isInterruptingActiveTurn = false;
  private rawClaudeChunkSequence = 0;
  private readonly contextFileLocalPathResolver: ContextFilePathResolverLike;
  private readonly agentToolsMcpSessionState: ClaudeAgentToolsMcpSessionState;

  constructor(input: ClaudeSessionStateInput) {
    this.runContext = input.runContext;
    this.dependencies = input.dependencies;
    this.listeners = input.listeners ?? new Set();
    this.activeAbortController = input.activeAbortController ?? null;
    this.runContext.runtimeContext.activeTurnId =
      input.activeTurnId ?? input.runContext.runtimeContext.activeTurnId ?? null;
    this.currentStatus = this.runContext.runtimeContext.activeTurnId ? "RUNNING" : "IDLE";
    this.contextFileLocalPathResolver =
      input.dependencies.contextFileLocalPathResolver ?? new ContextFileLocalPathResolver();
    this.agentToolsMcpSessionState = new ClaudeAgentToolsMcpSessionState(
      input.dependencies.agentToolMcpSessionService ?? getAgentToolMcpSessionService(),
    );
  }

  get runId(): string {
    return this.runContext.runId;
  }

  get sessionConfig(): ClaudeSessionConfig {
    return this.runContext.runtimeContext.sessionConfig;
  }

  get sessionId(): string {
    return this.runContext.runtimeContext.sessionId ?? this.runId;
  }

  get hasCompletedTurn(): boolean {
    return this.runContext.runtimeContext.hasCompletedTurn;
  }

  get activeTurnId(): string | null {
    return this.runContext.runtimeContext.activeTurnId;
  }

  getStatusSnapshotSource() {
    return {
      currentStatus: this.currentStatus,
      activeTurnId: this.activeTurnId,
      isInterrupting: this.isInterruptingActiveTurn,
    };
  }

  get model(): string {
    return this.sessionConfig.model;
  }

  get workingDirectory(): string {
    return this.sessionConfig.workingDirectory;
  }

  get permissionMode(): ClaudeSessionConfig["permissionMode"] {
    return this.sessionConfig.permissionMode;
  }

  isActive(): boolean {
    return this.dependencies.isRunSessionActive();
  }

  subscribeRuntimeEvents(listener: (event: ClaudeSessionEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  clearRuntimeListeners(): void {
    this.listeners.clear();
  }

  emitRuntimeEvent(event: ClaudeSessionEvent): void {
    dispatchRuntimeEvent({
      listeners: this.listeners,
      event,
      onListenerError: (error) => {
        logger.warn(`Claude runtime event listener failed: ${String(error)}`);
      },
    });
  }

  async sendTurn(message: AgentInputUserMessage): Promise<{ turnId: string | null }> {
    const content = asString(
      appendContextFileReferenceSection(message.content, message.contextFiles, {
        resolveUri: (uri) => this.contextFileLocalPathResolver.resolve(uri),
      }),
    );
    if (!content) {
      throw new Error("Claude runtime message content is required.");
    }
    if (this.activeTurnId) {
      throw new Error(`Claude runtime turn is already active for run '${this.runId}'.`);
    }

    const turnId = `${this.runId}:turn:${Date.now()}`;
    const abortController = new AbortController();
    const activeTurn = createClaudeActiveTurnExecution(turnId, abortController);
    this.activeTurnExecution = activeTurn;
    this.currentStatus = "RUNNING";
    this.isInterruptingActiveTurn = false;
    this.setActiveTurn(turnId);
    this.setActiveAbortController(abortController);
    this.dependencies.sessionMessageCache.appendMessage(this.sessionId, {
      role: "user",
      content,
      createdAt: nowTimestampSeconds(),
    });

    this.emitRuntimeEvent({
      method: ClaudeSessionEventName.TURN_STARTED,
      params: {
        turnId,
        sessionId: this.sessionId,
      },
    });

    const runTurn = async () => {
      try {
        await this.executeTurn({
          turnId,
          content,
          abortController,
        });
      } catch (error) {
        if (isClaudeActiveTurnInterrupted(activeTurn)) {
          return;
        }
        const failedTurnId = activeTurn.turnId;
        if (this.activeTurnId !== failedTurnId) {
          return;
        }
        this.currentStatus = "ERROR";
        this.isInterruptingActiveTurn = false;
        this.clearActiveTurn();
        this.emitRuntimeEvent(buildClaudeTurnTerminalErrorEvent(failedTurnId, error));
        throw error;
      } finally {
        this.clearActiveTurnExecution(activeTurn);
      }
    };
    activeTurn.settledTask = runTurn();
    void activeTurn.settledTask.catch((error) => {
      logger.warn(
        `Claude runtime turn failed for run '${this.runId}': ${formatClaudeRuntimeError(error)}`,
      );
    });

    return { turnId };
  }

  async approveTool(
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
  ): Promise<void> {
    await this.dependencies.toolingCoordinator.approveTool(
      this.runId,
      invocationId,
      approved,
      reason,
    );
  }

  async interrupt(): Promise<void> {
    await this.settleActiveTurnForClosure("Tool approval interrupted.");
  }

  async settleActiveTurnForClosure(pendingToolApprovalReason: string): Promise<void> {
    const activeTurn = this.activeTurnExecution;
    if (!activeTurn) {
      this.cleanupDanglingActiveInterruptState(pendingToolApprovalReason);
      return;
    }

    if (!activeTurn.interruptSettlementTask) {
      activeTurn.interruptSettlementTask = this.interruptActiveTurn(
        activeTurn,
        pendingToolApprovalReason,
      );
    }
    await activeTurn.interruptSettlementTask;
  }

  private async interruptActiveTurn(
    activeTurn: ClaudeActiveTurnExecution,
    pendingToolApprovalReason: string,
  ): Promise<void> {
    const interruptedTurnId = activeTurn.turnId;
    activeTurn.interrupted = true;
    this.isInterruptingActiveTurn = true;
    this.emitRuntimeEvent({
      method: ClaudeSessionEventName.STATUS_CHANGED,
      params: { turnId: interruptedTurnId },
    });
    this.dependencies.toolingCoordinator.clearPendingToolApprovals(
      this.runId,
      pendingToolApprovalReason,
    );
    await this.flushPendingToolApprovalResponses();
    activeTurn.abortController.abort();
    await activeTurn.settledTask;
    this.currentStatus = "IDLE";
    this.isInterruptingActiveTurn = false;
    this.clearActiveTurn();
    this.emitRuntimeEvent({
      method: ClaudeSessionEventName.TURN_INTERRUPTED,
      params: {
        turnId: interruptedTurnId,
      },
    });
  }

  async terminate(): Promise<void> {
    await this.dependencies.terminateRunSession();
    this.currentStatus = "OFFLINE";
    this.isInterruptingActiveTurn = false;
    this.clearActiveTurn();
    this.emitRuntimeEvent({
      method: ClaudeSessionEventName.SESSION_TERMINATED,
      params: { sessionId: this.sessionId },
    });
  }

  adoptResolvedSessionId(
    sessionId: string | null | undefined,
    sessionMessageCache: ClaudeSessionMessageCache,
  ): void {
    const normalized = asString(sessionId);
    if (!normalized || normalized === this.sessionId) {
      return;
    }

    const previousSessionId = this.sessionId;
    this.runContext.runtimeContext.sessionId = normalized;
    sessionMessageCache.migrateSessionMessages(previousSessionId, normalized);
  }

  setActiveTurn(turnId: string | null): void {
    this.runContext.runtimeContext.activeTurnId = turnId;
  }

  clearActiveTurn(): void {
    this.runContext.runtimeContext.activeTurnId = null;
  }

  setActiveAbortController(controller: AbortController | null): void {
    this.activeAbortController = controller;
  }

  clearActiveAbortController(): void {
    this.activeAbortController = null;
  }

  markTurnCompleted(turnId: string | null = null): void {
    if (!turnId || this.runContext.runtimeContext.activeTurnId !== turnId) {
      return;
    }
    this.runContext.runtimeContext.hasCompletedTurn = true;
    this.currentStatus = "IDLE";
    this.isInterruptingActiveTurn = false;
    this.runContext.runtimeContext.activeTurnId = null;
  }

  private resolveProviderSessionIdForResume(): string | null {
    const sessionId = asString(this.runContext.runtimeContext.sessionId);
    return sessionId && sessionId !== this.runId ? sessionId : null;
  }

  private clearActiveTurnExecution(activeTurn: ClaudeActiveTurnExecution): void {
    this.closeActiveTurnQuery(activeTurn);
    if (this.activeTurnExecution === activeTurn) {
      this.activeTurnExecution = null;
    }
    if (this.activeAbortController === activeTurn.abortController) {
      this.clearActiveAbortController();
    }
    if (this.activeTurnId === activeTurn.turnId) {
      this.currentStatus = "IDLE";
      this.isInterruptingActiveTurn = false;
      this.clearActiveTurn();
    }
  }


  private forgetActiveTurnQuery(activeTurn: ClaudeActiveTurnExecution): void {
    const query = activeTurn.query;
    activeTurn.queryClosed = true;
    activeTurn.query = null;
    if (query && this.dependencies.activeQueriesByRunId.get(this.runId) === query) {
      this.dependencies.activeQueriesByRunId.delete(this.runId);
    }
  }

  private closeActiveTurnQuery(activeTurn: ClaudeActiveTurnExecution): void {
    if (activeTurn.queryClosed) {
      return;
    }
    const query =
      activeTurn.query ?? this.dependencies.activeQueriesByRunId.get(this.runId) ?? null;
    if (!query) {
      this.dependencies.activeQueriesByRunId.delete(this.runId);
      return;
    }
    activeTurn.queryClosed = true;
    try {
      this.dependencies.sdkClient.closeQuery(query);
    } catch {
      // best-effort cleanup
    } finally {
      activeTurn.query = null;
      if (this.dependencies.activeQueriesByRunId.get(this.runId) === query) {
        this.dependencies.activeQueriesByRunId.delete(this.runId);
      }
    }
  }

  private async flushPendingToolApprovalResponses(): Promise<void> {
    await Promise.resolve();
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
  }

  private cleanupDanglingActiveInterruptState(pendingToolApprovalReason: string): void {
    this.activeAbortController?.abort();
    this.clearActiveAbortController();
    this.dependencies.toolingCoordinator.clearPendingToolApprovals(
      this.runId,
      pendingToolApprovalReason,
    );
    const query = this.dependencies.activeQueriesByRunId.get(this.runId) ?? null;
    try {
      this.dependencies.sdkClient.closeQuery(query);
    } catch {
      // best-effort cleanup
    } finally {
      this.dependencies.activeQueriesByRunId.delete(this.runId);
      this.currentStatus = "IDLE";
      this.isInterruptingActiveTurn = false;
      this.clearActiveTurn();
    }
  }

  private async executeTurn(options: ClaudeSessionTurnExecutionInput): Promise<void> {
    const activeTurn =
      this.activeTurnExecution?.turnId === options.turnId ? this.activeTurnExecution : null;
    const configuredToolingOptions = resolveClaudeSessionToolingOptions({
      runtimeToolExposure: this.runContext.runtimeContext.runtimeToolExposure,
      hasMaterializedSkills: this.runContext.runtimeContext.materializedConfiguredSkills.length > 0,
      memberTeamContext: this.runContext.config.memberTeamContext,
    });
    const agentToolsMcpDescriptor = (
      configuredToolingOptions.agentToolsMcpToolingRequested ||
      this.runContext.runtimeContext.runtimeToolExposure.requestedToolNames.length > 0
    )
      ? this.agentToolsMcpSessionState.ensureDescriptor(this.runContext)
      : null;
    const toolingOptions = resolveClaudeSessionToolingOptions({
      runtimeToolExposure: this.runContext.runtimeContext.runtimeToolExposure,
      hasMaterializedSkills: this.runContext.runtimeContext.materializedConfiguredSkills.length > 0,
      memberTeamContext: this.runContext.config.memberTeamContext,
      agentToolsMcpEnabledToolNames: agentToolsMcpDescriptor?.enabledTools ?? [],
    });
    const mcpServers = await buildClaudeSessionMcpServerConfig({
      agentToolsMcpDescriptor,
    });
    const processDiagnostics = new ClaudeProcessDiagnostics();
    let query: ClaudeActiveTurnExecution["query"] = null;
    const textProjector = new ClaudeTextSegmentProjector({
      turnId: options.turnId,
      getSessionId: () => this.sessionId,
      emitEvent: (event) => this.emitRuntimeEvent(event),
    });
    try {
      query = await this.dependencies.sdkClient.startQueryTurn({
        prompt: options.content,
        systemPrompt: this.runContext.runtimeContext.carpenterSystemPrompt,
        sessionId: this.resolveProviderSessionIdForResume(),
        model: this.model,
        workingDirectory: this.workingDirectory,
        mcpServers,
        allowedTools: toolingOptions.allowedTools,
        permissionMode: this.permissionMode,
        abortController: options.abortController,
        stderr: (data: string) => processDiagnostics.append(data),
        canUseTool: (
          toolName: string,
          input: Record<string, unknown>,
          toolOptions: { toolUseID?: string },
        ) =>
          this.dependencies.toolingCoordinator.handleToolPermissionCheck(
            this.runContext,
            toolName,
            input,
            toolOptions,
          ),
      });
      if (activeTurn) {
        activeTurn.query = query;
      }
      this.dependencies.activeQueriesByRunId.set(this.runId, query);
      if (isClaudeActiveTurnInterrupted(activeTurn, options.abortController)) {
        return;
      }
      for await (const chunk of query) {
        this.rawClaudeChunkSequence += 1;
        logRawClaudeSessionChunkDetails({
          runId: this.runId,
          sessionId: this.sessionId,
          sequence: this.rawClaudeChunkSequence,
          chunk,
        });
        if (isClaudeActiveTurnInterrupted(activeTurn, options.abortController)) {
          break;
        }
        const resolvedSessionId = resolveClaudeStreamChunkSessionId(chunk);
        this.adoptResolvedSessionId(resolvedSessionId, this.dependencies.sessionMessageCache);
        const compactionEvent = buildClaudeProviderCompactionEvent({
          chunk,
          turnId: options.turnId,
          sessionId: this.sessionId,
        });
        if (compactionEvent) {
          this.emitRuntimeEvent(compactionEvent);
        }
        const isTerminalChunk = isClaudeTurnTerminalChunk(chunk);
        const terminalError = resolveClaudeTurnTerminalError(chunk);
        if (terminalError) {
          emitClaudeTokenUsageEvent(chunk, this.runId, options.turnId, this.sessionId, this.model, (event) => this.emitRuntimeEvent(event));
          throw new Error(`${terminalError.code}: ${terminalError.message}`);
        }
        const processedOrderedContent = processOrderedClaudeContentBlocks({
          chunk,
          textProjector,
          runContext: this.runContext,
          toolingCoordinator: this.dependencies.toolingCoordinator,
        });
        if (!processedOrderedContent) {
          this.dependencies.toolingCoordinator.processToolLifecycleChunk(this.runContext, chunk);
          textProjector.processChunk(chunk);
        }

        if (isTerminalChunk) {
          emitClaudeTokenUsageEvent(chunk, this.runId, options.turnId, this.sessionId, this.model, (event) => this.emitRuntimeEvent(event));
          break;
        }
      }
    } catch (error) {
      throw enrichClaudeRuntimeErrorWithDiagnostics(error, processDiagnostics);
    } finally {
      if (activeTurn) {
        if (isClaudeActiveTurnInterrupted(activeTurn, options.abortController)) {
          this.forgetActiveTurnQuery(activeTurn);
        } else {
          this.closeActiveTurnQuery(activeTurn);
        }
      } else if (query) {
        this.dependencies.activeQueriesByRunId.delete(this.runId);
        this.dependencies.sdkClient.closeQuery(query);
      } else {
        this.dependencies.activeQueriesByRunId.delete(this.runId);
      }
    }

    if (isClaudeActiveTurnInterrupted(activeTurn, options.abortController)) {
      return;
    }

    textProjector.finishTurn();
    const assistantOutput = textProjector.getAssistantOutput();
    if (assistantOutput.length > 0) {
      this.dependencies.sessionMessageCache.appendMessage(this.sessionId, {
        role: "assistant",
        content: assistantOutput,
        createdAt: nowTimestampSeconds(),
      });
    }

    this.markTurnCompleted(options.turnId);
    this.emitRuntimeEvent({
      method: ClaudeSessionEventName.TURN_COMPLETED,
      params: {
        turnId: options.turnId,
        sessionId: this.sessionId,
      },
    });
  }

}
