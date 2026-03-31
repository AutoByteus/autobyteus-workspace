import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import {
  logger,
  asString,
  nowTimestampSeconds,
  type ClaudeSessionEvent,
} from "../claude-runtime-shared.js";
import { normalizeClaudeStreamChunk } from "../claude-runtime-message-normalizers.js";
import { ClaudeSessionEventName } from "../events/claude-session-event-name.js";
import { logRawClaudeSessionChunkDetails } from "../events/claude-session-event-debug.js";
import {
  buildClaudeRunMcpServers,
} from "../preview/build-claude-run-mcp-servers.js";
import {
  getRuntimeMemberContexts,
  resolveRuntimeMemberContext,
  type TeamRunContext,
} from "../../../../agent-team-execution/domain/team-run-context.js";
import type { ClaudeAgentRunContext, ClaudeRunContext } from "../backend/claude-agent-run-context.js";
import { ClaudeSessionMessageCache } from "./claude-session-message-cache.js";
import type { ClaudeSessionToolUseCoordinator } from "./claude-session-tool-use-coordinator.js";
import type { ClaudeSessionConfig } from "./claude-session-config.js";
import { buildClaudeTurnInput } from "./claude-turn-input-builder.js";
import type {
  ClaudeSdkClient,
  ClaudeSdkQueryLike,
} from "../../../../runtime-management/claude/client/claude-sdk-client.js";
import type { ClaudeTeamRunContext } from "../../../../agent-team-execution/backends/claude/claude-team-run-context.js";
import { dispatchRuntimeEvent } from "../../shared/runtime-event-dispatch.js";

const formatClaudeRuntimeError = (error: unknown): string =>
  error instanceof Error ? error.stack ?? error.message : String(error);

export type ClaudeSessionTurnExecutionInput = {
  turnId: string;
  content: string;
  signal: AbortSignal;
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

  get teamContext(): TeamRunContext<ClaudeTeamRunContext> | null {
    return this.runContext.runtimeContext.teamContext;
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
    this.setActiveTurn(turnId);
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

    const abortController = new AbortController();
    this.setActiveAbortController(abortController);
    const runTurn = async () => {
      try {
        await this.executeTurn({
          turnId,
          content,
          signal: abortController.signal,
        });
        this.markTurnCompleted();
      } catch (error) {
        this.emitRuntimeEvent({
          method: ClaudeSessionEventName.ERROR,
          params: {
            code: "CLAUDE_RUNTIME_TURN_FAILED",
            message: String(error),
          },
        });
        throw error;
      } finally {
        this.clearActiveAbortController();
        this.clearActiveTurn();
      }
    };
    const turnTask = runTurn();
    void turnTask.catch((error) => {
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
    this.activeAbortController?.abort();
    this.clearActiveAbortController();
    this.dependencies.toolingCoordinator.clearPendingToolApprovals(
      this.runId,
      "Tool approval interrupted.",
    );
    await this.dependencies.sdkClient.interruptQuery(
      this.dependencies.activeQueriesByRunId.get(this.runId) ?? null,
    );
    this.emitRuntimeEvent({
      method: ClaudeSessionEventName.TURN_INTERRUPTED,
      params: {
        turnId: this.activeTurnId,
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

  markTurnCompleted(): void {
    this.runContext.runtimeContext.hasCompletedTurn = true;
    this.runContext.runtimeContext.activeTurnId = null;
  }

  private async executeTurn(options: ClaudeSessionTurnExecutionInput): Promise<void> {
    const sendMessageToToolingEnabled = this.isSendMessageToToolingEnabled();
    const turnInput = buildClaudeTurnInput({
      runContext: this.runContext,
      content: options.content,
    });
    const mcpServers = await this.buildTeamMcpServers(sendMessageToToolingEnabled);
    const query = await this.dependencies.sdkClient.startQueryTurn({
      prompt: turnInput,
      sessionId: this.hasCompletedTurn ? this.sessionId : null,
      model: this.model,
      workingDirectory: this.workingDirectory,
      mcpServers,
      enableSendMessageToTooling: sendMessageToToolingEnabled,
      enableProjectSkillSettings: this.isProjectSkillSettingsEnabled(),
      permissionMode: this.permissionMode,
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
    this.dependencies.activeQueriesByRunId.set(this.runId, query);

    let assistantOutput = "";
    let hasObservedStreamingDelta = false;
    try {
      for await (const chunk of query) {
        this.rawClaudeChunkSequence += 1;
        logRawClaudeSessionChunkDetails({
          runId: this.runId,
          sessionId: this.sessionId,
          sequence: this.rawClaudeChunkSequence,
          chunk,
        });
        if (options.signal.aborted) {
          break;
        }
        this.dependencies.toolingCoordinator.processToolLifecycleChunk(this.runContext, chunk);
        const normalized = normalizeClaudeStreamChunk(chunk);
        const isTerminalChunk = this.isClaudeTurnTerminalChunk(chunk);
        this.adoptResolvedSessionId(normalized.sessionId, this.dependencies.sessionMessageCache);

        if (normalized.delta) {
          const incrementalDelta = this.resolveClaudeIncrementalDelta({
            normalizedDelta: normalized.delta,
            source: normalized.source,
            assistantOutput,
            hasObservedStreamingDelta,
          });
          if (!incrementalDelta) {
            if (isTerminalChunk) {
              break;
            }
            continue;
          }
          if (normalized.source === "stream_delta") {
            hasObservedStreamingDelta = true;
          }
          assistantOutput += incrementalDelta;
          this.emitRuntimeEvent({
            method: ClaudeSessionEventName.ITEM_OUTPUT_TEXT_DELTA,
            params: {
              id: options.turnId,
              turnId: options.turnId,
              sessionId: this.sessionId,
              delta: incrementalDelta,
            },
          });
        }

        if (isTerminalChunk) {
          break;
        }
      }
    } finally {
      this.dependencies.activeQueriesByRunId.delete(this.runId);
      this.dependencies.sdkClient.closeQuery(query);
    }

    if (assistantOutput.length > 0) {
      this.dependencies.sessionMessageCache.appendMessage(this.sessionId, {
        role: "assistant",
        content: assistantOutput,
        createdAt: nowTimestampSeconds(),
      });
    }

    this.emitRuntimeEvent({
      method: ClaudeSessionEventName.ITEM_OUTPUT_TEXT_COMPLETED,
      params: {
        id: options.turnId,
        turnId: options.turnId,
        sessionId: this.sessionId,
        text: assistantOutput,
      },
    });
    this.emitRuntimeEvent({
      method: ClaudeSessionEventName.TURN_COMPLETED,
      params: {
        turnId: options.turnId,
        sessionId: this.sessionId,
      },
    });
  }

  private isProjectSkillSettingsEnabled(): boolean {
    return this.runContext.runtimeContext.materializedConfiguredSkills.length > 0;
  }

  private async buildTeamMcpServers(
    sendMessageToToolingEnabled: boolean,
  ): Promise<Record<string, unknown> | null> {
    return buildClaudeRunMcpServers({
      sendMessageToToolingEnabled,
      runContext: this.runContext,
      sdkClient: this.dependencies.sdkClient,
      requestToolApproval: sendMessageToToolingEnabled
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

  private isSendMessageToToolingEnabled(): boolean {
    const allowedRecipientNames = this.resolveAllowedRecipientNames();
    return (
      Boolean(this.teamContext) &&
      Boolean(this.teamContext?.runId) &&
      allowedRecipientNames.length > 0
    );
  }

  private resolveCurrentMemberContext() {
    return resolveRuntimeMemberContext(this.teamContext, this.runId);
  }

  private resolveAllowedRecipientNames(): string[] {
    const currentMemberName = this.resolveCurrentMemberContext()?.memberName ?? null;
    return getRuntimeMemberContexts(this.teamContext?.runtimeContext ?? null)
      .map((memberContext) => memberContext.memberName)
      .filter((memberName) => memberName !== currentMemberName);
  }

  private resolveClaudeIncrementalDelta(options: {
    normalizedDelta: string;
    source: "stream_delta" | "assistant_message" | "result" | "unknown";
    assistantOutput: string;
    hasObservedStreamingDelta: boolean;
  }): string | null {
    const {
      normalizedDelta,
      source,
      assistantOutput,
      hasObservedStreamingDelta,
    } = options;

    if (source === "stream_delta") {
      return normalizedDelta;
    }

    if (source === "result" && assistantOutput.length > 0 && !hasObservedStreamingDelta) {
      return null;
    }

    if (!hasObservedStreamingDelta || (source !== "assistant_message" && source !== "result")) {
      return normalizedDelta;
    }

    if (normalizedDelta.startsWith(assistantOutput)) {
      const suffix = normalizedDelta.slice(assistantOutput.length);
      return suffix.length > 0 ? suffix : null;
    }

    if (assistantOutput.startsWith(normalizedDelta)) {
      return null;
    }

    return null;
  }

  private isClaudeTurnTerminalChunk(chunk: unknown): boolean {
    const payload =
      chunk && typeof chunk === "object" && !Array.isArray(chunk)
        ? (chunk as Record<string, unknown>)
        : null;
    return asString(payload?.type)?.toLowerCase() === "result";
  }

}
