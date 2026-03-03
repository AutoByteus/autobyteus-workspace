import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import type { RuntimeInterAgentEnvelope } from "../runtime-adapter-port.js";
import { getWorkspaceManager } from "../../workspaces/workspace-manager.js";
import {
  asString,
  CLAUDE_AGENT_SDK_MODULE_NAME,
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
  normalizeSessionMessages,
} from "./claude-runtime-message-normalizers.js";
import {
  resolveSdkFunction,
  tryCallWithVariants,
  tryGetSupportedModelsFromQueryControl,
} from "./claude-runtime-sdk-interop.js";
import { createClaudeRunSessionState } from "./claude-runtime-session-state.js";
import { buildClaudeTeamMcpServers } from "./claude-send-message-tooling.js";
import { ClaudeRuntimeTranscriptStore } from "./claude-runtime-transcript-store.js";
import { ClaudeRuntimeTurnScheduler } from "./claude-runtime-turn-scheduler.js";
import {
  configureClaudeV2DynamicMcpServers,
  createOrResumeClaudeV2Session,
  interruptClaudeV2SessionTurn,
  resolveClaudeV2SessionControl,
  type ClaudeV2SessionControlLike,
  type ClaudeV2SessionLike,
} from "./claude-runtime-v2-control-interop.js";
import { buildClaudeTurnInput } from "./claude-runtime-turn-preamble.js";

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
  private interAgentRelayHandler: ClaudeInterAgentRelayHandler | null = null;

  setInterAgentRelayHandler(handler: ClaudeInterAgentRelayHandler | null): void {
    this.interAgentRelayHandler = handler;
  }

  async createRunSession(
    runId: string,
    options: ClaudeSessionRuntimeOptions,
  ): Promise<{ sessionId: string; metadata: Record<string, unknown> }> {
    await this.closeRunSession(runId);
    const runtimeMetadata = { ...(options.runtimeMetadata ?? {}) };
    const state = createClaudeRunSessionState({
      runId,
      sessionId: runId,
      modelIdentifier: options.modelIdentifier,
      workingDirectory: options.workingDirectory,
      runtimeMetadata,
      hasCompletedTurn: false,
    });
    this.sessions.set(runId, state);
    this.rebindDeferredListeners(runId, state);
    this.transcriptStore.ensureSession(state.sessionId);
    return {
      sessionId: state.sessionId,
      metadata: {
        ...state.runtimeMetadata,
      },
    };
  }

  async restoreRunSession(
    runId: string,
    options: ClaudeSessionRuntimeOptions,
    runtimeReference: {
      sessionId?: string | null;
      metadata?: Record<string, unknown> | null;
    } | null,
  ): Promise<{ sessionId: string; metadata: Record<string, unknown> }> {
    await this.closeRunSession(runId);
    const resolvedSessionId = asString(runtimeReference?.sessionId);
    const sessionId = resolvedSessionId ?? runId;
    // Team external-runtime bootstraps may seed sessionId with memberRunId before any Claude turn exists.
    // Avoid sending resume on first turn until we have a confirmed non-placeholder Claude session id.
    const hasCompletedTurn = resolvedSessionId !== null && resolvedSessionId !== runId;
    const runtimeMetadata = { ...(runtimeReference?.metadata ?? {}), ...(options.runtimeMetadata ?? {}) };
    const state = createClaudeRunSessionState({
      runId,
      sessionId,
      modelIdentifier: options.modelIdentifier,
      workingDirectory: options.workingDirectory,
      runtimeMetadata,
      hasCompletedTurn,
    });
    this.sessions.set(runId, state);
    this.rebindDeferredListeners(runId, state);
    this.transcriptStore.ensureSession(sessionId);
    return {
      sessionId,
      metadata: {
        ...state.runtimeMetadata,
      },
    };
  }

  hasRunSession(runId: string): boolean {
    return this.sessions.has(runId);
  }

  getRunRuntimeReference(
    runId: string,
  ): { sessionId: string; metadata: Record<string, unknown> } | null {
    const state = this.sessions.get(runId);
    if (!state) {
      return null;
    }
    return {
      sessionId: state.sessionId,
      metadata: {
        ...state.runtimeMetadata,
        model: state.model,
        cwd: state.workingDirectory,
      },
    };
  }

  subscribeToRunEvents(runId: string, listener: (event: ClaudeRuntimeEvent) => void): () => void {
    const state = this.sessions.get(runId);
    if (state) {
      state.listeners.add(listener);
    } else {
      this.getOrCreateDeferredListenerSet(runId).add(listener);
    }
    return () => {
      this.sessions.get(runId)?.listeners.delete(listener);
      const deferred = this.deferredListenersByRunId.get(runId);
      if (deferred) {
        deferred.delete(listener);
        if (deferred.size === 0) {
          this.deferredListenersByRunId.delete(runId);
        }
      }
    };
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
    _invocationId: string,
    _approved: boolean,
  ): Promise<void> {
    this.requireSession(runId);
    throw new Error("Claude Agent SDK runtime does not support tool approval routing.");
  }

  async interruptRun(runId: string): Promise<void> {
    const state = this.requireSession(runId);
    state.activeAbortController?.abort();
    state.activeAbortController = null;
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
    const listenerSnapshot = Array.from(state.listeners);
    if (listenerSnapshot.length > 0) {
      const deferred = this.getOrCreateDeferredListenerSet(runId);
      for (const listener of listenerSnapshot) {
        deferred.add(listener);
      }
    }
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
    const supportedRows = await tryGetSupportedModelsFromQueryControl(sdk);
    if (supportedRows.length > 0) {
      return supportedRows.map((row) => toModelInfo(row.identifier, row.displayName));
    }

    const listModelsFn = resolveSdkFunction(sdk, "listModels");
    if (listModelsFn) {
      const rows = await tryCallWithVariants(listModelsFn, [[], [{} as unknown]]);
      const normalized = normalizeModelDescriptors(rows);
      if (normalized.length > 0) {
        return normalized.map((row) => toModelInfo(row.identifier, row.displayName));
      }
    }

    return readDefaultModelIdentifiers().map((identifier) => toModelInfo(identifier));
  }

  async getSessionMessages(
    sessionId: string,
  ): Promise<Array<Record<string, unknown>>> {
    const normalizedSessionId = asString(sessionId);
    if (!normalizedSessionId) {
      return [];
    }
    const cachedMessages = this.transcriptStore.getCachedMessages(normalizedSessionId);

    const sdk = await this.loadSdkModuleSafe();
    const getSessionMessagesFn = resolveSdkFunction(sdk, "getSessionMessages");
    if (getSessionMessagesFn) {
      const raw = await tryCallWithVariants(getSessionMessagesFn, [
        [{ sessionId: normalizedSessionId }],
        [normalizedSessionId],
      ]);
      const normalized = normalizeSessionMessages(raw);
      if (normalized.length > 0) {
        return this.transcriptStore.getMergedMessages(normalizedSessionId, normalized);
      }
    }

    return cachedMessages;
  }

  async resolveWorkingDirectory(workspaceId?: string | null): Promise<string> {
    const normalizedWorkspaceId = asString(workspaceId);
    if (normalizedWorkspaceId) {
      const existing = this.workspaceManager.getWorkspaceById(normalizedWorkspaceId);
      const existingPath = existing?.getBasePath();
      if (existingPath) {
        return existingPath;
      }
      try {
        const workspace = await this.workspaceManager.getOrCreateWorkspace(normalizedWorkspaceId);
        const workspacePath = workspace.getBasePath();
        if (workspacePath) {
          return workspacePath;
        }
      } catch {
        // fall through to temp workspace
      }
    }

    try {
      return appConfigProvider.config.getTempWorkspaceDir();
    } catch {
      return process.cwd();
    }
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

    let userMessageBoundToResolvedSession = false;
    let assistantOutput = "";
    for await (const chunk of session.stream()) {
      if (options.signal.aborted) {
        break;
      }
      const normalized = normalizeClaudeStreamChunk(chunk);
      if (normalized.sessionId && normalized.sessionId !== options.state.sessionId) {
        const previousSessionId = options.state.sessionId;
        options.state.sessionId = normalized.sessionId;
        this.transcriptStore.ensureSession(options.state.sessionId);
        if (!userMessageBoundToResolvedSession && previousSessionId !== options.state.sessionId) {
          this.transcriptStore.appendMessage(options.state.sessionId, {
            role: "user",
            content: options.content,
            createdAt: nowTimestampSeconds(),
          });
          userMessageBoundToResolvedSession = true;
        }
      }

      if (normalized.delta) {
        if (normalized.source === "result" && assistantOutput.length > 0) {
          continue;
        }
        assistantOutput += normalized.delta;
        this.emitEvent(options.state, {
          method: "item/outputText/delta",
          params: {
            id: options.turnId,
            turnId: options.turnId,
            sessionId: options.state.sessionId,
            delta: normalized.delta,
          },
        });
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
      resumeSessionId: state.hasCompletedTurn ? state.sessionId : null,
      enableSendMessageToTooling: this.isSendMessageToToolingEnabled(state),
    });
    const control = resolveClaudeV2SessionControl(session);
    this.v2SessionsByRunId.set(state.runId, session);
    this.v2SessionControlsByRunId.set(state.runId, control);
    return { session, control };
  }

  private isSendMessageToToolingEnabled(state: ClaudeRunSessionState): boolean {
    return (
      state.sendMessageToEnabled &&
      Boolean(this.interAgentRelayHandler) &&
      Boolean(state.teamRunId) &&
      state.allowedRecipientNames.length > 0
    );
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
    for (const listener of state.listeners) {
      try {
        listener(event);
      } catch (error) {
        logger.warn(`Claude runtime event listener failed: ${String(error)}`);
      }
    }
  }

  private getOrCreateDeferredListenerSet(
    runId: string,
  ): Set<(event: ClaudeRuntimeEvent) => void> {
    const existing = this.deferredListenersByRunId.get(runId);
    if (existing) {
      return existing;
    }
    const created = new Set<(event: ClaudeRuntimeEvent) => void>();
    this.deferredListenersByRunId.set(runId, created);
    return created;
  }

  private rebindDeferredListeners(runId: string, state: ClaudeRunSessionState): void {
    const deferred = this.deferredListenersByRunId.get(runId);
    if (!deferred) {
      return;
    }
    for (const listener of deferred) {
      state.listeners.add(listener);
    }
  }

  private async loadSdkModuleSafe(): Promise<ClaudeSdkModuleLike | null> {
    if (this.cachedSdkModule) {
      return this.cachedSdkModule;
    }

    try {
      const moduleName = CLAUDE_AGENT_SDK_MODULE_NAME;
      const loaded = (await import(moduleName)) as ClaudeSdkModuleLike;
      this.cachedSdkModule = loaded;
      return loaded;
    } catch {
      return null;
    }
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
