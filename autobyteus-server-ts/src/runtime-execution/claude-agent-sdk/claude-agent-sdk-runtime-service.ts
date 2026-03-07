import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import type { RuntimeInterAgentEnvelope } from "../runtime-adapter-port.js";
import { getWorkspaceManager } from "../../workspaces/workspace-manager.js";
import {
  asString,
  buildClaudeSdkSpawnEnvironment,
  logger,
  nowTimestampSeconds,
  resolveClaudeCodeExecutablePath,
  type ClaudeInterAgentRelayHandler,
  type ClaudeRuntimeEvent,
  type ClaudeRunSessionState,
  type ClaudeSdkModuleLike,
  type ClaudeSessionRuntimeOptions,
} from "./claude-runtime-shared.js";
import {
  normalizeModelDescriptors,
  readDefaultModelIdentifiers,
  toModelInfo,
} from "./claude-runtime-model-catalog.js";
import {
  normalizeClaudeStreamChunk,
} from "./claude-runtime-message-normalizers.js";
import {
} from "./claude-runtime-sdk-interop.js";
import {
  buildClaudeTeamMcpServers,
  type ClaudeSendMessageToolApprovalDecision,
} from "./claude-send-message-tooling.js";
import { ClaudeRuntimeTranscriptStore } from "./claude-runtime-transcript-store.js";
import { ClaudeRuntimeTurnScheduler } from "./claude-runtime-turn-scheduler.js";
import { ClaudeRuntimeToolingCoordinator } from "./claude-runtime-tooling-coordinator.js";
import {
  adoptResolvedClaudeSessionId,
  createClaudeRuntimeSessionRecord,
  getClaudeRunRuntimeReference,
  getClaudeSessionMessages,
  isClaudeSendMessageToToolingEnabled,
  isClaudeTurnTerminalChunk,
  listClaudeModels,
  loadClaudeSdkModuleSafe,
  resolveClaudeIncrementalDelta,
  resolveClaudeWorkingDirectory,
  restoreClaudeRuntimeSessionRecord,
} from "./claude-runtime-service-support.js";
import {
  configureClaudeV2DynamicMcpServers,
  createOrResumeClaudeV2Session,
  interruptClaudeV2SessionTurn,
  resolveClaudeV2SessionControl,
  resolveClaudeV2SessionId,
  type ClaudeV2SessionControlLike,
  type ClaudeV2SessionLike,
} from "./claude-runtime-v2-control-interop.js";
import { buildClaudeTurnInput } from "./claude-runtime-turn-preamble.js";
import {
  emitRuntimeEvent,
  moveRuntimeListenersToDeferred,
  rebindDeferredRuntimeListeners,
  subscribeToRuntimeRunEvents,
} from "../runtime-event-listener-hub.js";

export type {
  ClaudeInterAgentRelayHandler,
  ClaudeInterAgentRelayRequest,
  ClaudeInterAgentRelayResult,
  ClaudeRunSessionState,
  ClaudeRuntimeEvent,
  ClaudeSdkModuleLike,
  ClaudeSessionRuntimeOptions,
  TeamManifestMetadataMember,
} from "./claude-runtime-shared.js";

export class ClaudeAgentSdkRuntimeService {
  private readonly sessions = new Map<string, ClaudeRunSessionState>();
  private readonly workspaceManager = getWorkspaceManager();
  private readonly transcriptStore = new ClaudeRuntimeTranscriptStore();
  private readonly turnScheduler = new ClaudeRuntimeTurnScheduler();
  private readonly deferredListenersByRunId = new Map<
    string,
    Set<(event: ClaudeRuntimeEvent) => void>
  >();
  private cachedSdkModule: ClaudeSdkModuleLike | null = null;
  private readonly v2SessionsByRunId = new Map<string, ClaudeV2SessionLike>();
  private readonly v2SessionControlsByRunId = new Map<string, ClaudeV2SessionControlLike | null>();
  private readonly toolingCoordinator = new ClaudeRuntimeToolingCoordinator(
    new Map(),
    new Map(),
    (state, event) => this.emitEvent(state, event),
  );
  private interAgentRelayHandler: ClaudeInterAgentRelayHandler | null = null;

  setInterAgentRelayHandler(handler: ClaudeInterAgentRelayHandler | null): void {
    this.interAgentRelayHandler = handler;
  }

  async createRunSession(
    runId: string,
    options: ClaudeSessionRuntimeOptions,
  ): Promise<{ sessionId: string; metadata: Record<string, unknown> }> {
    return createClaudeRuntimeSessionRecord({
      runId,
      options,
      closeRunSession: (activeRunId) => this.closeRunSession(activeRunId),
      sessions: this.sessions,
      transcriptStore: this.transcriptStore,
      deferredListenersByRunId: this.deferredListenersByRunId as Map<string, Set<(event: unknown) => void>>,
    });
  }

  async restoreRunSession(
    runId: string,
    options: ClaudeSessionRuntimeOptions,
    runtimeReference: {
      sessionId?: string | null;
      metadata?: Record<string, unknown> | null;
    } | null,
  ): Promise<{ sessionId: string; metadata: Record<string, unknown> }> {
    return restoreClaudeRuntimeSessionRecord({
      runId,
      options,
      runtimeReference,
      closeRunSession: (activeRunId) => this.closeRunSession(activeRunId),
      sessions: this.sessions,
      transcriptStore: this.transcriptStore,
      deferredListenersByRunId: this.deferredListenersByRunId as Map<string, Set<(event: unknown) => void>>,
    });
  }

  hasRunSession(runId: string): boolean {
    return this.sessions.has(runId);
  }

  getRunRuntimeReference(
    runId: string,
  ): { sessionId: string; metadata: Record<string, unknown> } | null {
    return getClaudeRunRuntimeReference(this.sessions, runId);
  }

  subscribeToRunEvents(runId: string, listener: (event: ClaudeRuntimeEvent) => void): () => void {
    return subscribeToRuntimeRunEvents({
      runId,
      listener,
      resolveActiveListenerSet: (activeRunId) => this.sessions.get(activeRunId)?.listeners,
      deferredListenersByRunId: this.deferredListenersByRunId,
    });
  }

  async sendTurn(runId: string, message: AgentInputUserMessage): Promise<{ turnId: string | null }> {
    const state = this.requireSession(runId);
    const content = asString(message.content);
    if (!content) {
      throw new Error("Claude runtime message content is required.");
    }
    await this.turnScheduler.waitForRunIdle(runId);

    const turnId = `${runId}:turn:${Date.now()}`;
    state.activeTurnId = turnId;
    this.transcriptStore.appendMessage(state.sessionId, {
      role: "user",
      content,
      createdAt: nowTimestampSeconds(),
    });

    this.emitEvent(state, {
      method: "turn/started",
      params: {
        turnId,
        sessionId: state.sessionId,
      },
    });

    const abortController = new AbortController();
    state.activeAbortController = abortController;
    const runTurn = async () => {
      try {
        await this.executeV2Turn({
          state,
          turnId,
          content,
          signal: abortController.signal,
        });
        state.hasCompletedTurn = true;
      } catch (error) {
        this.emitEvent(state, {
          method: "error",
          params: {
            code: "CLAUDE_RUNTIME_TURN_FAILED",
            message: String(error),
          },
        });
        throw error;
      } finally {
        state.activeAbortController = null;
        state.activeTurnId = null;
      }
    };
    const turnTask = this.turnScheduler.schedule(runId, runTurn);
    void turnTask.catch((error) => {
      logger.warn(`Claude runtime turn failed for run '${runId}': ${String(error)}`);
    });

    return { turnId };
  }

  async injectInterAgentEnvelope(
    runId: string,
    envelope: RuntimeInterAgentEnvelope,
  ): Promise<{ turnId: string | null }> {
    const state = this.requireSession(runId);
    const content = asString(envelope.content) ?? "";
    if (!content) {
      throw new Error("Inter-agent envelope content is required.");
    }

    this.emitEvent(state, {
      method: "inter_agent_message",
      params: {
        sender_agent_id: asString(envelope.senderAgentRunId) ?? "unknown_sender",
        sender_agent_name: asString(envelope.senderAgentName) ?? null,
        recipient_role_name: asString(envelope.recipientName) ?? "unknown_recipient",
        content,
        message_type: asString(envelope.messageType) ?? "agent_message",
        team_run_id: asString(envelope.teamRunId) ?? null,
      },
    });

    const message = new AgentInputUserMessage(content, SenderType.AGENT, null, {
      inter_agent_envelope: {
        senderAgentRunId: asString(envelope.senderAgentRunId) ?? "unknown_sender",
        senderAgentName: asString(envelope.senderAgentName),
        recipientName: asString(envelope.recipientName) ?? "unknown_recipient",
        messageType: asString(envelope.messageType) ?? "agent_message",
        teamRunId: asString(envelope.teamRunId),
        metadata:
          envelope.metadata && typeof envelope.metadata === "object" ? envelope.metadata : null,
      },
    });

    return this.sendTurn(runId, message);
  }

  async approveTool(
    runId: string,
    invocationId: string,
    approved: boolean,
    reason: string | null = null,
  ): Promise<void> {
    this.requireSession(runId);
    await this.toolingCoordinator.approveTool(runId, invocationId, approved, reason);
  }

  async interruptRun(runId: string): Promise<void> {
    const state = this.requireSession(runId);
    state.activeAbortController?.abort();
    state.activeAbortController = null;
    this.toolingCoordinator.clearPendingToolApprovals(runId, "Tool approval interrupted.");
    await interruptClaudeV2SessionTurn(this.v2SessionControlsByRunId.get(runId) ?? null);
    this.emitEvent(state, {
      method: "turn/interrupted",
      params: {
        turnId: state.activeTurnId,
      },
    });
  }

  async terminateRun(runId: string): Promise<void> {
    const state = this.sessions.get(runId);
    if (!state) {
      return;
    }
    state.activeAbortController?.abort();
    this.emitEvent(state, {
      method: "session/terminated",
      params: {
        runId,
      },
    });
    await this.closeRunSession(runId);
  }

  async closeRunSession(runId: string): Promise<void> {
    const state = this.sessions.get(runId);
    if (!state) {
      return;
    }
    state.activeAbortController?.abort();
    this.toolingCoordinator.clearPendingToolApprovals(
      runId,
      "Tool approval cancelled because run was closed.",
    );
    moveRuntimeListenersToDeferred({
      runId,
      activeListeners: state.listeners,
      deferredListenersByRunId: this.deferredListenersByRunId,
    });
    state.listeners.clear();
    this.v2SessionControlsByRunId.delete(runId);
    const session = this.v2SessionsByRunId.get(runId);
    if (session) {
      try {
        session.close();
      } catch {
        // best-effort cleanup
      }
      this.v2SessionsByRunId.delete(runId);
    }
    this.sessions.delete(runId);
  }

  async listModels(): Promise<ModelInfo[]> {
    const sdk = await this.loadSdkModuleSafe();
    return listClaudeModels(sdk);
  }

  async getSessionMessages(
    sessionId: string,
  ): Promise<Array<Record<string, unknown>>> {
    const sdk = await this.loadSdkModuleSafe();
    return getClaudeSessionMessages({
      sessionId,
      sessions: this.sessions,
      transcriptStore: this.transcriptStore,
      sdk,
    });
  }

  async resolveWorkingDirectory(workspaceId?: string | null): Promise<string> {
    return resolveClaudeWorkingDirectory(this.workspaceManager, workspaceId);
  }

  private async executeV2Turn(options: {
    state: ClaudeRunSessionState;
    turnId: string;
    content: string;
    signal: AbortSignal;
  }): Promise<void> {
    const sdk = await this.loadSdkModuleSafe();
    const { session, control } = await this.resolveOrCreateV2Session(options.state, sdk);
    const sendMessageToToolingEnabled = this.isSendMessageToToolingEnabled(options.state);
    await this.configureTeamToolingIfNeeded(options.state, sdk, control, sendMessageToToolingEnabled);

    const turnInput = buildClaudeTurnInput({
      state: options.state,
      content: options.content,
      sendMessageToToolingEnabled,
    });
    await session.send(turnInput);

    let assistantOutput = "";
    let hasObservedStreamingDelta = false;
    for await (const chunk of session.stream()) {
      if (options.signal.aborted) {
        break;
      }
      this.toolingCoordinator.processToolLifecycleChunk(options.state, chunk);
      const normalized = normalizeClaudeStreamChunk(chunk);
      const isTerminalChunk = isClaudeTurnTerminalChunk(chunk);
      adoptResolvedClaudeSessionId(options.state, normalized.sessionId, this.transcriptStore);

      if (normalized.delta) {
        const incrementalDelta = resolveClaudeIncrementalDelta({
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
        this.emitEvent(options.state, {
          method: "item/outputText/delta",
          params: {
            id: options.turnId,
            turnId: options.turnId,
            sessionId: options.state.sessionId,
            delta: incrementalDelta,
          },
        });
      }

      // Claude V2 sessions are long-lived; terminate this turn on the SDK result message
      // instead of waiting for the stream itself to close.
      if (isTerminalChunk) {
        break;
      }
    }

    if (assistantOutput.length > 0) {
      this.transcriptStore.appendMessage(options.state.sessionId, {
        role: "assistant",
        content: assistantOutput,
        createdAt: nowTimestampSeconds(),
      });
    }

    this.emitEvent(options.state, {
      method: "item/outputText/completed",
      params: {
        id: options.turnId,
        turnId: options.turnId,
        sessionId: options.state.sessionId,
        text: assistantOutput,
      },
    });
    this.emitEvent(options.state, {
      method: "turn/completed",
      params: {
        turnId: options.turnId,
        sessionId: options.state.sessionId,
      },
    });
  }

  private async resolveOrCreateV2Session(
    state: ClaudeRunSessionState,
    sdk: ClaudeSdkModuleLike | null,
  ): Promise<{ session: ClaudeV2SessionLike; control: ClaudeV2SessionControlLike | null }> {
    const existing = this.v2SessionsByRunId.get(state.runId);
    if (existing) {
      return {
        session: existing,
        control: this.v2SessionControlsByRunId.get(state.runId) ?? null,
      };
    }

    const session = await createOrResumeClaudeV2Session({
      sdk,
      model: state.model,
      pathToClaudeCodeExecutable: resolveClaudeCodeExecutablePath({
        runtimeMetadata: state.runtimeMetadata,
      }),
      workingDirectory: state.workingDirectory,
      env: buildClaudeSdkSpawnEnvironment(),
      resumeSessionId: state.hasCompletedTurn ? state.sessionId : null,
      enableSendMessageToTooling: this.isSendMessageToToolingEnabled(state),
      permissionMode: state.permissionMode,
      autoExecuteTools: state.autoExecuteTools,
      canUseTool: (toolName, input, options) =>
        this.toolingCoordinator.handleToolPermissionCheck(state, toolName, input, options),
    });
    const control = resolveClaudeV2SessionControl(session);
    this.v2SessionsByRunId.set(state.runId, session);
    this.v2SessionControlsByRunId.set(state.runId, control);
    adoptResolvedClaudeSessionId(state, resolveClaudeV2SessionId(session), this.transcriptStore);
    return { session, control };
  }

  private isSendMessageToToolingEnabled(state: ClaudeRunSessionState): boolean {
    return isClaudeSendMessageToToolingEnabled(state, Boolean(this.interAgentRelayHandler));
  }

  private async configureTeamToolingIfNeeded(
    state: ClaudeRunSessionState,
    sdk: ClaudeSdkModuleLike | null,
    control: ClaudeV2SessionControlLike | null,
    sendMessageToToolingEnabled: boolean,
  ): Promise<void> {
    if (!sendMessageToToolingEnabled) {
      return;
    }

    const mcpServers = await buildClaudeTeamMcpServers({
      state,
      sdk,
      interAgentRelayHandler: this.interAgentRelayHandler,
      autoExecuteTools: state.autoExecuteTools,
      requestToolApproval: async ({
        invocationId,
        toolName,
        toolArguments,
      }): Promise<ClaudeSendMessageToolApprovalDecision> =>
        this.toolingCoordinator.requestToolApprovalDecision({
          state,
          invocationId,
          toolName,
          toolInput: toolArguments,
        }),
      emitEvent: (sessionState, event) => this.emitEvent(sessionState, event),
    });
    if (!mcpServers) {
      throw new Error(
        "CLAUDE_V2_CONTROL_UNAVAILABLE: Unable to build team MCP server configuration.",
      );
    }
    await configureClaudeV2DynamicMcpServers({
      control,
      servers: mcpServers,
    });
  }

  private emitEvent(state: ClaudeRunSessionState, event: ClaudeRuntimeEvent): void {
    emitRuntimeEvent({
      listeners: state.listeners,
      event,
      onListenerError: (error) => {
        logger.warn(`Claude runtime event listener failed: ${String(error)}`);
      },
    });
  }

  private async loadSdkModuleSafe(): Promise<ClaudeSdkModuleLike | null> {
    const loaded = await loadClaudeSdkModuleSafe(this.cachedSdkModule);
    if (loaded) {
      this.cachedSdkModule = loaded;
    }
    return loaded;
  }

  private requireSession(runId: string): ClaudeRunSessionState {
    const session = this.sessions.get(runId);
    if (!session) {
      throw new Error(`Claude runtime session '${runId}' is not available.`);
    }
    return session;
  }
}

let cachedClaudeAgentSdkRuntimeService: ClaudeAgentSdkRuntimeService | null = null;

export const getClaudeAgentSdkRuntimeService = (): ClaudeAgentSdkRuntimeService => {
  if (!cachedClaudeAgentSdkRuntimeService) {
    cachedClaudeAgentSdkRuntimeService = new ClaudeAgentSdkRuntimeService();
  }
  return cachedClaudeAgentSdkRuntimeService;
};
