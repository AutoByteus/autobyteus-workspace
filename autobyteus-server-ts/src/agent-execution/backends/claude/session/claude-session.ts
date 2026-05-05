import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import {
  logger,
  asObject,
  asString,
  nowTimestampSeconds,
  type ClaudeSessionEvent,
} from "../claude-runtime-shared.js";
import { resolveClaudeStreamChunkSessionId } from "../claude-runtime-message-normalizers.js";
import { ClaudeSessionEventName } from "../events/claude-session-event-name.js";
import { logRawClaudeSessionChunkDetails } from "../events/claude-session-event-debug.js";
import { buildClaudeSessionMcpServers } from "./build-claude-session-mcp-servers.js";
import type { MemberTeamContext } from "../../../../agent-team-execution/domain/member-team-context.js";
import type { ClaudeAgentRunContext, ClaudeRunContext } from "../backend/claude-agent-run-context.js";
import { ClaudeSessionMessageCache } from "./claude-session-message-cache.js";
import type { ClaudeSessionToolUseCoordinator } from "./claude-session-tool-use-coordinator.js";
import type { ClaudeSessionConfig } from "./claude-session-config.js";
import { buildClaudeTurnInput } from "./claude-turn-input-builder.js";
import {
  createClaudeActiveTurnExecution,
  isClaudeActiveTurnInterrupted,
  type ClaudeActiveTurnExecution,
} from "./claude-active-turn-execution.js";
import { resolveClaudeSessionToolingOptions } from "./claude-session-tooling-options.js";
import {
  buildClaudeProviderCompactionEvent,
  isClaudeTurnTerminalChunk,
} from "./claude-session-output-events.js";
import { ClaudeTextSegmentProjector } from "./claude-text-segment-projector.js";
import type { ClaudeSdkClient, ClaudeSdkQueryLike } from "../../../../runtime-management/claude/client/claude-sdk-client.js";

import { dispatchRuntimeEvent } from "../../shared/runtime-event-dispatch.js";

const formatClaudeRuntimeError = (error: unknown): string =>
  error instanceof Error ? error.stack ?? error.message : String(error);

type ClaudeSessionTurnExecutionInput = {
  turnId: string;
  content: string;
  abortController: AbortController;
};

export type ClaudeSessionDependencies = {
  sessionMessageCache: ClaudeSessionMessageCache;
  sdkClient: ClaudeSdkClient;
  activeQueriesByRunId: Map<string, ClaudeSdkQueryLike>;
  toolingCoordinator: ClaudeSessionToolUseCoordinator;
  isRunSessionActive: () => boolean;
  terminateRunSession: () => Promise<void>;
};

type ClaudeSessionStateInput = {
  runContext: ClaudeRunContext;
  dependencies: ClaudeSessionDependencies;
  listeners?: Set<(event: ClaudeSessionEvent) => void>;
  activeAbortController?: AbortController | null;
  activeTurnId?: string | null;
};

export class ClaudeSession {
  readonly runContext: ClaudeRunContext;
  private readonly dependencies: ClaudeSessionDependencies;
  readonly listeners: Set<(event: ClaudeSessionEvent) => void>;
  activeAbortController: AbortController | null;
  private activeTurnExecution: ClaudeActiveTurnExecution | null = null;
  private rawClaudeChunkSequence = 0;

  constructor(input: ClaudeSessionStateInput) {
    this.runContext = input.runContext;
    this.dependencies = input.dependencies;
    this.listeners = input.listeners ?? new Set();
    this.activeAbortController = input.activeAbortController ?? null;
    this.runContext.runtimeContext.activeTurnId =
      input.activeTurnId ?? input.runContext.runtimeContext.activeTurnId ?? null;
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

  get agentInstruction(): string | null {
    return this.runContext.runtimeContext.agentInstruction;
  }

  get configuredSkills(): ClaudeAgentRunContext["configuredSkills"] {
    return this.runContext.runtimeContext.configuredSkills;
  }

  get skillAccessMode(): ClaudeAgentRunContext["skillAccessMode"] {
    return this.runContext.runtimeContext.skillAccessMode;
  }

  get memberTeamContext(): MemberTeamContext | null {
    return this.runContext.runtimeContext.memberTeamContext;
  }

  get activeTurnId(): string | null {
    return this.runContext.runtimeContext.activeTurnId;
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

  get autoExecuteTools(): boolean {
    return this.runContext.runtimeContext.autoExecuteTools;
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
    const content = asString(message.content);
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
        if (!isClaudeActiveTurnInterrupted(activeTurn)) {
          this.markTurnCompleted(turnId);
        }
      } catch (error) {
        if (isClaudeActiveTurnInterrupted(activeTurn)) {
          return;
        }
        this.emitRuntimeEvent({
          method: ClaudeSessionEventName.ERROR,
          params: {
            code: "CLAUDE_RUNTIME_TURN_FAILED",
            message: String(error),
          },
        });
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
    const activeTurn = this.activeTurnExecution;
    if (!activeTurn) {
      this.cleanupLegacyActiveInterruptState();
      return;
    }

    if (!activeTurn.interruptSettlementTask) {
      activeTurn.interruptSettlementTask = this.interruptActiveTurn(activeTurn);
    }
    await activeTurn.interruptSettlementTask;
  }

  private async interruptActiveTurn(activeTurn: ClaudeActiveTurnExecution): Promise<void> {
    const interruptedTurnId = activeTurn.turnId;
    activeTurn.interrupted = true;
    this.dependencies.toolingCoordinator.clearPendingToolApprovals(
      this.runId,
      "Tool approval interrupted.",
    );
    await this.flushPendingToolApprovalResponses();
    activeTurn.abortController.abort();
    this.closeActiveTurnQuery(activeTurn);
    await activeTurn.settledTask;
    this.emitRuntimeEvent({
      method: ClaudeSessionEventName.TURN_INTERRUPTED,
      params: {
        turnId: interruptedTurnId,
      },
    });
  }

  async terminate(): Promise<void> {
    await this.dependencies.terminateRunSession();
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
    this.runContext.runtimeContext.hasCompletedTurn = true;
    if (!turnId || this.runContext.runtimeContext.activeTurnId === turnId) {
      this.runContext.runtimeContext.activeTurnId = null;
    }
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
      this.clearActiveTurn();
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

  private cleanupLegacyActiveInterruptState(): void {
    this.activeAbortController?.abort();
    this.clearActiveAbortController();
    this.dependencies.toolingCoordinator.clearPendingToolApprovals(
      this.runId,
      "Tool approval interrupted.",
    );
    const query = this.dependencies.activeQueriesByRunId.get(this.runId) ?? null;
    try {
      this.dependencies.sdkClient.closeQuery(query);
    } catch {
      // best-effort cleanup
    } finally {
      this.dependencies.activeQueriesByRunId.delete(this.runId);
      this.clearActiveTurn();
    }
  }

  private async executeTurn(options: ClaudeSessionTurnExecutionInput): Promise<void> {
    const activeTurn =
      this.activeTurnExecution?.turnId === options.turnId ? this.activeTurnExecution : null;
    const toolingOptions = resolveClaudeSessionToolingOptions({
      configuredToolExposure: this.runContext.runtimeContext.configuredToolExposure,
      hasMaterializedSkills: this.runContext.runtimeContext.materializedConfiguredSkills.length > 0,
      memberTeamContext: this.memberTeamContext,
    });
    const turnInput = buildClaudeTurnInput({
      runContext: this.runContext,
      content: options.content,
      sendMessageToEnabled: toolingOptions.sendMessageToToolingEnabled,
    });
    const mcpServers = await this.buildSessionMcpServers({
      sendMessageToToolingEnabled: toolingOptions.sendMessageToToolingEnabled,
      enabledBrowserToolNames: toolingOptions.enabledBrowserToolNames,
      enabledMediaToolNames: toolingOptions.enabledMediaToolNames,
      publishArtifactsToolingEnabled: toolingOptions.publishArtifactsToolingEnabled,
    });
    const query = await this.dependencies.sdkClient.startQueryTurn({
      prompt: turnInput,
      sessionId: this.hasCompletedTurn ? this.sessionId : null,
      model: this.model,
      workingDirectory: this.workingDirectory,
      mcpServers,
      allowedTools: toolingOptions.allowedTools,
      permissionMode: this.permissionMode,
      abortController: options.abortController,
      ...(this.permissionMode !== "bypassPermissions"
        ? {
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
          }
        : {
            autoExecuteTools: true,
          }),
    });
    if (activeTurn) {
      activeTurn.query = query;
    }
    this.dependencies.activeQueriesByRunId.set(this.runId, query);

    const textProjector = new ClaudeTextSegmentProjector({
      turnId: options.turnId,
      getSessionId: () => this.sessionId,
      emitEvent: (event) => this.emitRuntimeEvent(event),
    });
    try {
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
        const processedOrderedContent = this.processOrderedClaudeContentBlocks(
          chunk,
          textProjector,
        );
        if (!processedOrderedContent) {
          this.dependencies.toolingCoordinator.processToolLifecycleChunk(this.runContext, chunk);
          textProjector.processChunk(chunk);
        }

        if (isTerminalChunk) {
          break;
        }
      }
    } finally {
      if (activeTurn) {
        this.closeActiveTurnQuery(activeTurn);
      } else {
        this.dependencies.activeQueriesByRunId.delete(this.runId);
        this.dependencies.sdkClient.closeQuery(query);
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

    this.emitRuntimeEvent({
      method: ClaudeSessionEventName.TURN_COMPLETED,
      params: {
        turnId: options.turnId,
        sessionId: this.sessionId,
      },
    });
  }

  private processOrderedClaudeContentBlocks(
    chunk: unknown,
    textProjector: ClaudeTextSegmentProjector,
  ): boolean {
    const payload = asObject(chunk);
    if (!payload) {
      return false;
    }

    const messagePayload = asObject(payload.message);
    const contentBlocks = Array.isArray(messagePayload?.content)
      ? (messagePayload.content as unknown[])
      : [];
    if (contentBlocks.length === 0) {
      return false;
    }

    const messageType = asString(payload.type);
    for (let index = 0; index < contentBlocks.length; index += 1) {
      const block = contentBlocks[index];
      if (messageType === "assistant") {
        textProjector.processAssistantContentBlock({
          chunk: payload,
          message: messagePayload ?? {},
          block,
          contentBlockIndex: index,
        });
      }
      this.dependencies.toolingCoordinator.processToolLifecycleContentBlock(this.runContext, {
        messageType,
        block,
      });
    }
    return true;
  }

  private async buildSessionMcpServers(input: {
    sendMessageToToolingEnabled: boolean;
    enabledBrowserToolNames: string[];
    enabledMediaToolNames: string[];
    publishArtifactsToolingEnabled: boolean;
  },
  ): Promise<Record<string, unknown> | null> {
    return buildClaudeSessionMcpServers({
      sendMessageToToolingEnabled: input.sendMessageToToolingEnabled,
      enabledBrowserToolNames: input.enabledBrowserToolNames,
      enabledMediaToolNames: input.enabledMediaToolNames,
      publishArtifactsToolingEnabled: input.publishArtifactsToolingEnabled,
      runContext: this.runContext,
      sdkClient: this.dependencies.sdkClient,
      requestToolApproval: input.sendMessageToToolingEnabled
        ? ({ invocationId, toolName, toolArguments }) =>
            this.dependencies.toolingCoordinator.requestToolApprovalDecision({
              runContext: this.runContext,
              invocationId,
              toolName,
              toolInput: toolArguments,
            })
        : null,
      emitEvent: (_runContext, event) => this.emitRuntimeEvent(event),
    });
  }

}
