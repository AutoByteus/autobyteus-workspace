import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import type { RuntimeInterAgentEnvelope } from "../runtime-adapter-port.js";
import { getWorkspaceManager } from "../../workspaces/workspace-manager.js";
import {
  asString,
  buildClaudeSdkSpawnEnvironment,
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
import {
  buildClaudeTeamMcpServers,
  type ClaudeSendMessageToolApprovalDecision,
} from "./claude-send-message-tooling.js";
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

type ClaudeCanUseToolOptions = {
  signal?: AbortSignal;
  toolUseID?: string;
};

type ClaudeToolApprovalDecision = {
  approved: boolean;
  reason: string | null;
};

type PendingClaudeToolApproval = {
  resolveDecision: (decision: ClaudeToolApprovalDecision) => void;
};

type ObservedClaudeToolInvocation = {
  toolName: string | null;
  toolInput: Record<string, unknown>;
};

const CLAUDE_TOOL_APPROVAL_TIMEOUT_MS = 120_000;

const isSendMessageToToolName = (value: string | null): boolean => {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "send_message_to" ||
    normalized.endsWith("__send_message_to") ||
    normalized.endsWith(".send_message_to") ||
    normalized.endsWith("/send_message_to")
  );
};

const resolveIncrementalDelta = (options: {
  normalizedDelta: string;
  source: "stream_delta" | "assistant_message" | "result" | "unknown";
  assistantOutput: string;
  hasObservedStreamingDelta: boolean;
}): string | null => {
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
};

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
  private readonly pendingToolApprovalsByRunId = new Map<string, Map<string, PendingClaudeToolApproval>>();
  private readonly observedToolInvocationsByRunId = new Map<
    string,
    Map<string, ObservedClaudeToolInvocation>
  >();
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
      autoExecuteTools: Boolean(options.autoExecuteTools),
      runtimeMetadata,
      hasCompletedTurn: false,
    });
    this.sessions.set(runId, state);
    rebindDeferredRuntimeListeners({
      runId,
      activeListeners: state.listeners,
      deferredListenersByRunId: this.deferredListenersByRunId,
    });
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
    const metadataAutoExecuteTools = runtimeReference?.metadata?.autoExecuteTools;
    const resolvedAutoExecuteTools =
      typeof options.autoExecuteTools === "boolean"
        ? options.autoExecuteTools
        : typeof metadataAutoExecuteTools === "boolean"
          ? metadataAutoExecuteTools
          : false;
    // Team external-runtime bootstraps may seed sessionId with memberRunId before any Claude turn exists.
    // Avoid sending resume on first turn until we have a confirmed non-placeholder Claude session id.
    const hasCompletedTurn = resolvedSessionId !== null && resolvedSessionId !== runId;
    const runtimeMetadata = { ...(runtimeReference?.metadata ?? {}), ...(options.runtimeMetadata ?? {}) };
    const state = createClaudeRunSessionState({
      runId,
      sessionId,
      modelIdentifier: options.modelIdentifier,
      workingDirectory: options.workingDirectory,
      autoExecuteTools: resolvedAutoExecuteTools,
      runtimeMetadata,
      hasCompletedTurn,
    });
    this.sessions.set(runId, state);
    rebindDeferredRuntimeListeners({
      runId,
      activeListeners: state.listeners,
      deferredListenersByRunId: this.deferredListenersByRunId,
    });
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
    const pendingApprovals = this.pendingToolApprovalsByRunId.get(runId);
    const pendingApproval = pendingApprovals?.get(invocationId);
    if (!pendingApproval) {
      throw new Error(
        `No pending Claude tool approval found for invocation '${invocationId}'.`,
      );
    }
    pendingApproval.resolveDecision({
      approved,
      reason: asString(reason),
    });
  }

  async interruptRun(runId: string): Promise<void> {
    const state = this.requireSession(runId);
    state.activeAbortController?.abort();
    state.activeAbortController = null;
    this.clearPendingToolApprovals(runId, "Tool approval interrupted.");
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
    this.clearPendingToolApprovals(runId, "Tool approval cancelled because run was closed.");
    this.observedToolInvocationsByRunId.delete(runId);
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
    const supportedRows = await tryGetSupportedModelsFromQueryControl(
      sdk,
      buildClaudeSdkSpawnEnvironment(),
    );
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
    let hasObservedStreamingDelta = false;
    for await (const chunk of session.stream()) {
      if (options.signal.aborted) {
        break;
      }
      this.processToolLifecycleChunk(options.state, chunk);
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
        const incrementalDelta = resolveIncrementalDelta({
          normalizedDelta: normalized.delta,
          source: normalized.source,
          assistantOutput,
          hasObservedStreamingDelta,
        });
        if (!incrementalDelta) {
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
      autoExecuteTools: state.autoExecuteTools,
      canUseTool: (toolName, input, options) =>
        this.handleToolPermissionCheck(state, toolName, input, options),
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
      autoExecuteTools: state.autoExecuteTools,
      requestToolApproval: async ({
        invocationId,
        toolName,
        toolArguments,
      }): Promise<ClaudeSendMessageToolApprovalDecision> =>
        this.resolveToolApprovalDecision({
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

  private async handleToolPermissionCheck(
    state: ClaudeRunSessionState,
    toolNameRaw: string,
    toolInputRaw: Record<string, unknown>,
    options: ClaudeCanUseToolOptions,
  ): Promise<Record<string, unknown>> {
    const invocationId =
      asString(options.toolUseID) ??
      `${state.runId}:tool:${Date.now()}:${Math.random().toString(16).slice(2, 10)}`;
    const toolName = asString(toolNameRaw) ?? "unknown_tool";
    const toolInput =
      toolInputRaw && typeof toolInputRaw === "object" && !Array.isArray(toolInputRaw)
        ? { ...toolInputRaw }
        : {};

    this.trackObservedToolInvocation(state.runId, invocationId, {
      toolName,
      toolInput,
    });
    this.emitEvent(state, {
      method: "item/commandExecution/started",
      params: {
        invocation_id: invocationId,
        tool_name: toolName,
        arguments: toolInput,
      },
    });

    const decision = await this.resolveToolApprovalDecision({
      state,
      invocationId,
      toolName,
      toolInput,
      signal: options.signal,
    });

    if (decision.approved) {
      return {
        behavior: "allow",
        updatedInput: toolInput,
        toolUseID: invocationId,
      };
    }

    const denialReason = decision.reason ?? "Tool execution denied by user.";
    return {
      behavior: "deny",
      message: denialReason,
      toolUseID: invocationId,
    };
  }

  private async resolveToolApprovalDecision(input: {
    state: ClaudeRunSessionState;
    invocationId: string;
    toolName: string;
    toolInput: Record<string, unknown>;
    signal?: AbortSignal;
  }): Promise<ClaudeSendMessageToolApprovalDecision> {
    if (input.state.autoExecuteTools) {
      this.emitEvent(input.state, {
        method: "item/commandExecution/approved",
        params: {
          invocation_id: input.invocationId,
          tool_name: input.toolName,
          arguments: input.toolInput,
          reason: "auto_execute_tools_enabled",
        },
      });
      return {
        approved: true,
        reason: "auto_execute_tools_enabled",
      };
    }

    const decision = await this.awaitToolApprovalDecision({
      state: input.state,
      invocationId: input.invocationId,
      toolName: input.toolName,
      toolInput: input.toolInput,
      signal: input.signal,
    });

    if (decision.approved) {
      this.emitEvent(input.state, {
        method: "item/commandExecution/approved",
        params: {
          invocation_id: input.invocationId,
          tool_name: input.toolName,
          arguments: input.toolInput,
          ...(decision.reason ? { reason: decision.reason } : {}),
        },
      });
      return decision;
    }

    const denialReason = decision.reason ?? "Tool execution denied by user.";
    this.emitEvent(input.state, {
      method: "item/commandExecution/denied",
      params: {
        invocation_id: input.invocationId,
        tool_name: input.toolName,
        arguments: input.toolInput,
        reason: denialReason,
        error: denialReason,
      },
    });
    return {
      approved: false,
      reason: denialReason,
    };
  }

  private awaitToolApprovalDecision(input: {
    state: ClaudeRunSessionState;
    invocationId: string;
    toolName: string;
    toolInput: Record<string, unknown>;
    signal?: AbortSignal;
  }): Promise<ClaudeToolApprovalDecision> {
    const pendingApprovals = this.getOrCreatePendingApprovals(input.state.runId);

    return new Promise((resolve) => {
      let settled = false;
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

      const finalize = (decision: ClaudeToolApprovalDecision): void => {
        if (settled) {
          return;
        }
        settled = true;
        pendingApprovals.delete(input.invocationId);
        if (pendingApprovals.size === 0) {
          this.pendingToolApprovalsByRunId.delete(input.state.runId);
        }
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }
        if (input.signal) {
          input.signal.removeEventListener("abort", onAbortSignal);
        }
        resolve(decision);
      };

      const onAbortSignal = (): void => {
        finalize({
          approved: false,
          reason: "Tool approval interrupted.",
        });
      };

      pendingApprovals.set(input.invocationId, {
        resolveDecision: finalize,
      });

      timeoutHandle = setTimeout(() => {
        finalize({
          approved: false,
          reason: "Tool approval timed out.",
        });
      }, CLAUDE_TOOL_APPROVAL_TIMEOUT_MS);

      if (input.signal) {
        input.signal.addEventListener("abort", onAbortSignal, { once: true });
      }

      this.emitEvent(input.state, {
        method: "item/commandExecution/requestApproval",
        params: {
          invocation_id: input.invocationId,
          tool_name: input.toolName,
          arguments: input.toolInput,
        },
      });
    });
  }

  private processToolLifecycleChunk(state: ClaudeRunSessionState, chunk: unknown): void {
    const payload =
      chunk && typeof chunk === "object" && !Array.isArray(chunk)
        ? (chunk as Record<string, unknown>)
        : null;
    if (!payload) {
      return;
    }

    const messagePayload =
      payload.message && typeof payload.message === "object" && !Array.isArray(payload.message)
        ? (payload.message as Record<string, unknown>)
        : null;
    const contentBlocks = Array.isArray(messagePayload?.content)
      ? (messagePayload?.content as unknown[])
      : [];

    const type = asString(payload.type);
    for (const blockRaw of contentBlocks) {
      const block =
        blockRaw && typeof blockRaw === "object" && !Array.isArray(blockRaw)
          ? (blockRaw as Record<string, unknown>)
          : null;
      if (!block) {
        continue;
      }

      const blockType = asString(block.type);
      if (blockType === "tool_use" && type === "assistant") {
        const invocationId = asString(block.id) ?? asString(block.tool_use_id);
        const toolName = asString(block.name) ?? asString(block.tool_name);
        if (!invocationId || !toolName) {
          continue;
        }
        const toolInput =
          (block.input && typeof block.input === "object" && !Array.isArray(block.input)
            ? (block.input as Record<string, unknown>)
            : null) ??
          (block.arguments && typeof block.arguments === "object" && !Array.isArray(block.arguments)
            ? (block.arguments as Record<string, unknown>)
            : null) ??
          {};
        this.trackObservedToolInvocation(state.runId, invocationId, {
          toolName,
          toolInput,
        });
        continue;
      }

      if (blockType !== "tool_result" || type !== "user") {
        continue;
      }

      const invocationId = asString(block.tool_use_id) ?? asString(block.id);
      if (!invocationId) {
        continue;
      }

      const tracked = this.consumeObservedToolInvocation(state.runId, invocationId);
      const toolName = tracked?.toolName ?? asString(block.tool_name) ?? asString(block.name);
      if (!toolName) {
        continue;
      }
      if (isSendMessageToToolName(toolName)) {
        // send_message_to command completion is emitted by the MCP wrapper using
        // the synthetic invocation id shared with approval lifecycle events.
        continue;
      }
      const blockResult = block.content;
      const isError = block.is_error === true;

      if (isError) {
        const errorMessage = typeof blockResult === "string" ? blockResult : JSON.stringify(blockResult);
        this.emitEvent(state, {
          method: "item/commandExecution/completed",
          params: {
            invocation_id: invocationId,
            tool_name: toolName,
            error: errorMessage,
          },
        });
        continue;
      }

      this.emitEvent(state, {
        method: "item/commandExecution/completed",
        params: {
          invocation_id: invocationId,
          tool_name: toolName,
          result: blockResult,
        },
      });
    }
  }

  private getOrCreatePendingApprovals(runId: string): Map<string, PendingClaudeToolApproval> {
    const existing = this.pendingToolApprovalsByRunId.get(runId);
    if (existing) {
      return existing;
    }
    const created = new Map<string, PendingClaudeToolApproval>();
    this.pendingToolApprovalsByRunId.set(runId, created);
    return created;
  }

  private clearPendingToolApprovals(runId: string, reason: string): void {
    const pendingApprovals = this.pendingToolApprovalsByRunId.get(runId);
    if (!pendingApprovals) {
      return;
    }
    const approvals = Array.from(pendingApprovals.values());
    this.pendingToolApprovalsByRunId.delete(runId);
    for (const approval of approvals) {
      approval.resolveDecision({
        approved: false,
        reason,
      });
    }
  }

  private trackObservedToolInvocation(
    runId: string,
    invocationId: string,
    observed: ObservedClaudeToolInvocation,
  ): void {
    const existing = this.observedToolInvocationsByRunId.get(runId);
    if (existing) {
      existing.set(invocationId, observed);
      return;
    }
    const created = new Map<string, ObservedClaudeToolInvocation>();
    created.set(invocationId, observed);
    this.observedToolInvocationsByRunId.set(runId, created);
  }

  private consumeObservedToolInvocation(
    runId: string,
    invocationId: string,
  ): ObservedClaudeToolInvocation | null {
    const existing = this.observedToolInvocationsByRunId.get(runId);
    if (!existing) {
      return null;
    }
    const observed = existing.get(invocationId) ?? null;
    existing.delete(invocationId);
    if (existing.size === 0) {
      this.observedToolInvocationsByRunId.delete(runId);
    }
    return observed;
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
