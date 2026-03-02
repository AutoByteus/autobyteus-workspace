import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { getWorkspaceManager } from "../../workspaces/workspace-manager.js";
import {
  asAsyncIterable,
  asString,
  CLAUDE_AGENT_SDK_MODULE_NAME,
  logger,
  nowTimestampSeconds,
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
  normalizeSessionMessages,
} from "./claude-runtime-message-normalizers.js";
import {
  resolveSdkFunction,
  tryCallWithVariants,
  tryGetSupportedModelsFromQueryControl,
} from "./claude-runtime-sdk-interop.js";
import { createClaudeRunSessionState } from "./claude-runtime-session-state.js";
import { executeClaudeTurnStream } from "./claude-runtime-turn-executor.js";
import { invokeClaudeQueryStream } from "./claude-runtime-query-invoker.js";

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
  private readonly sessionMessagesBySessionId = new Map<string, Array<Record<string, unknown>>>();
  private readonly deferredListenersByRunId = new Map<
    string,
    Set<(event: ClaudeRuntimeEvent) => void>
  >();
  private readonly activeTurnTasks = new Map<string, Promise<void>>();
  private globalTurnQueue: Promise<void> = Promise.resolve();
  private cachedSdkModule: ClaudeSdkModuleLike | null = null;
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
    this.ensureSessionTranscript(state.sessionId);
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
    this.ensureSessionTranscript(sessionId);
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
    if (this.activeTurnTasks.has(runId)) {
      await this.activeTurnTasks.get(runId);
    }

    const turnId = `${runId}:turn:${Date.now()}`;
    state.activeTurnId = turnId;
    this.recordSessionMessage(state.sessionId, {
      role: "user",
      content,
      createdAt: nowTimestampSeconds(),
    });

    this.emitEvent(state, {
      method: "turn/started",
      params: {
        turnId,
      },
    });

    const abortController = new AbortController();
    state.activeAbortController = abortController;
    const runTurn = async () => {
      try {
        await executeClaudeTurnStream({
          state,
          turnId,
          content,
          invokeQueryStream: (sessionState, prompt, signal) =>
            this.invokeQueryStream(sessionState, prompt, signal),
          signal: abortController.signal,
          ensureSessionTranscript: (sessionId) => this.ensureSessionTranscript(sessionId),
          recordSessionMessage: (sessionId, payload) => this.recordSessionMessage(sessionId, payload),
          emitEvent: (event) => {
            this.emitEvent(state, event);
          },
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
        this.activeTurnTasks.delete(runId);
      }
    };
    const turnTask = this.enqueueGlobalTurn(runTurn);
    this.activeTurnTasks.set(runId, turnTask);
    void turnTask.catch((error) => {
      logger.warn(`Claude runtime turn failed for run '${runId}': ${String(error)}`);
    });

    return { turnId };
  }

  async injectInterAgentEnvelope(
    runId: string,
    envelope: {
      senderAgentId: string;
      senderAgentName?: string | null;
      recipientName: string;
      messageType: string;
      content: string;
      teamRunId?: string | null;
      metadata?: Record<string, unknown> | null;
    },
  ): Promise<{ turnId: string | null }> {
    const state = this.requireSession(runId);
    const content = asString(envelope.content) ?? "";
    if (!content) {
      throw new Error("Inter-agent envelope content is required.");
    }

    this.emitEvent(state, {
      method: "inter_agent_message",
      params: {
        sender_agent_id: asString(envelope.senderAgentId) ?? "unknown_sender",
        sender_agent_name: asString(envelope.senderAgentName) ?? null,
        recipient_role_name: asString(envelope.recipientName) ?? "unknown_recipient",
        content,
        message_type: asString(envelope.messageType) ?? "agent_message",
        team_run_id: asString(envelope.teamRunId) ?? null,
      },
    });

    const message = new AgentInputUserMessage(content, SenderType.AGENT, null, {
      inter_agent_envelope: {
        senderAgentId: asString(envelope.senderAgentId) ?? "unknown_sender",
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

    const sdk = await this.loadSdkModuleSafe();
    const getSessionMessagesFn = resolveSdkFunction(sdk, "getSessionMessages");
    if (getSessionMessagesFn) {
      const raw = await tryCallWithVariants(getSessionMessagesFn, [
        [{ sessionId: normalizedSessionId }],
        [normalizedSessionId],
      ]);
      const normalized = normalizeSessionMessages(raw);
      if (normalized.length > 0) {
        return normalized;
      }
    }

    return this.sessionMessagesBySessionId.get(normalizedSessionId) ?? [];
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

  private async invokeQueryStream(
    state: ClaudeRunSessionState,
    prompt: string,
    signal: AbortSignal,
  ): Promise<AsyncIterable<unknown>> {
    const sdk = await this.loadSdkModuleSafe();
    return invokeClaudeQueryStream({
      state,
      sdk,
      prompt,
      signal,
      interAgentRelayHandler: this.interAgentRelayHandler,
      emitEvent: (sessionState, event) => this.emitEvent(sessionState, event),
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

  private enqueueGlobalTurn(task: () => Promise<void>): Promise<void> {
    const queued = this.globalTurnQueue.then(task, task);
    this.globalTurnQueue = queued.catch(() => undefined);
    return queued;
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

  private recordSessionMessage(sessionId: string, message: Record<string, unknown>): void {
    this.ensureSessionTranscript(sessionId);
    const existing = this.sessionMessagesBySessionId.get(sessionId) ?? [];
    existing.push(message);
    this.sessionMessagesBySessionId.set(sessionId, existing);
  }

  private ensureSessionTranscript(sessionId: string): void {
    if (!this.sessionMessagesBySessionId.has(sessionId)) {
      this.sessionMessagesBySessionId.set(sessionId, []);
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
