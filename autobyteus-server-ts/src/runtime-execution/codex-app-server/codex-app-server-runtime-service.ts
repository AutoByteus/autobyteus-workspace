import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { getWorkspaceManager } from "../../workspaces/workspace-manager.js";
import {
  getCodexAppServerProcessManager,
  type CodexAppServerProcessManager,
} from "./codex-app-server-process-manager.js";
import { startCodexRuntimeSession } from "./codex-runtime-session-bootstrap.js";
import { toCodexUserInput } from "./codex-user-input-mapper.js";
import {
  getCodexWorkspaceSkillMaterializer,
  type CodexWorkspaceSkillMaterializer,
} from "./codex-workspace-skill-materializer.js";
import { asString, type JsonObject } from "./codex-runtime-json.js";
import { resolveTurnId } from "./codex-runtime-launch-config.js";
import {
  deleteApprovalRecord,
  findApprovalRecord,
  handleRuntimeServerRequest,
  tryHandleInterAgentRelayRequest,
} from "./codex-runtime-event-router.js";
import {
  mapCodexModelListRowToModelInfo,
  normalizeCodexReasoningEffort,
  resolveCodexSessionReasoningEffort,
} from "./codex-runtime-model-catalog.js";
import {
  emitRuntimeEvent,
  moveRuntimeListenersToDeferred,
  rebindDeferredRuntimeListeners,
  subscribeToRuntimeRunEvents,
} from "../runtime-event-listener-hub.js";
import type {
  CodexInterAgentEnvelope,
  CodexInterAgentRelayHandler,
  CodexRunSessionState,
  CodexRuntimeEvent,
  SessionRuntimeOptions,
} from "./codex-runtime-shared.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const STARTUP_READY_TIMEOUT_MS = 60_000;
const isRuntimeRawEventDebugEnabled = process.env.RUNTIME_RAW_EVENT_DEBUG === "1";

export class CodexAppServerRuntimeService {
  private readonly sessions = new Map<string, CodexRunSessionState>();
  private readonly deferredListenersByRunId = new Map<
    string,
    Set<(event: CodexRuntimeEvent) => void>
  >();
  private readonly workspaceManager = getWorkspaceManager();
  private readonly processManager: CodexAppServerProcessManager;
  private readonly workspaceSkillMaterializer: CodexWorkspaceSkillMaterializer;
  private interAgentRelayHandler: CodexInterAgentRelayHandler | null = null;

  constructor(
    processManager: CodexAppServerProcessManager = getCodexAppServerProcessManager(),
    workspaceSkillMaterializer: CodexWorkspaceSkillMaterializer = getCodexWorkspaceSkillMaterializer(),
  ) {
    this.processManager = processManager;
    this.workspaceSkillMaterializer = workspaceSkillMaterializer;
  }

  setInterAgentRelayHandler(handler: CodexInterAgentRelayHandler | null): void {
    this.interAgentRelayHandler = handler;
  }

  async createRunSession(
    runId: string,
    options: SessionRuntimeOptions,
  ): Promise<{ threadId: string; metadata: JsonObject }> {
    await this.closeRunSession(runId);
    const state = await this.startSession(runId, options, null);
    this.sessions.set(runId, state);
    rebindDeferredRuntimeListeners({
      runId,
      activeListeners: state.listeners,
      deferredListenersByRunId: this.deferredListenersByRunId,
    });
    return {
      threadId: state.threadId,
      metadata: {
        ...state.runtimeMetadata,
      },
    };
  }

  async restoreRunSession(
    runId: string,
    options: SessionRuntimeOptions,
    runtimeReference: {
      threadId: string | null;
      metadata?: Record<string, unknown> | null;
    } | null,
  ): Promise<{ threadId: string; metadata: JsonObject }> {
    await this.closeRunSession(runId);
    const state = await this.startSession(
      runId,
      {
        ...options,
        runtimeMetadata: runtimeReference?.metadata ?? options.runtimeMetadata ?? null,
      },
      runtimeReference?.threadId ?? null,
    );
    this.sessions.set(runId, state);
    rebindDeferredRuntimeListeners({
      runId,
      activeListeners: state.listeners,
      deferredListenersByRunId: this.deferredListenersByRunId,
    });
    return {
      threadId: state.threadId,
      metadata: {
        ...state.runtimeMetadata,
      },
    };
  }

  hasRunSession(runId: string): boolean {
    return this.sessions.has(runId);
  }

  getRunStatus(runId: string): string | null {
    return this.sessions.get(runId)?.currentStatus ?? null;
  }

  getRunRuntimeReference(
    runId: string,
  ): { threadId: string; metadata: JsonObject } | null {
    const state = this.sessions.get(runId);
    if (!state) {
      return null;
    }
    return {
      threadId: state.threadId,
      metadata: {
        ...state.runtimeMetadata,
        ...(state.teamRunId ? { teamRunId: state.teamRunId } : {}),
        ...(state.memberName ? { memberName: state.memberName } : {}),
      },
    };
  }

  subscribeToRunEvents(
    runId: string,
    listener: (event: CodexRuntimeEvent) => void,
  ): () => void {
    return subscribeToRuntimeRunEvents({
      runId,
      listener,
      resolveActiveListenerSet: (activeRunId) => this.sessions.get(activeRunId)?.listeners,
      deferredListenersByRunId: this.deferredListenersByRunId,
    });
  }

  async sendTurn(runId: string, message: AgentInputUserMessage): Promise<{ turnId: string | null }> {
    const state = this.requireSession(runId);
    if (isRuntimeRawEventDebugEnabled) {
      console.log("[CodexSendTurnStart]", {
        runId,
        threadId: state.threadId,
        activeTurnId: state.activeTurnId,
        startupStatus: state.startup.status,
        contentPreview: message.content.slice(0, 160),
      });
    }
    await this.awaitStartupReady(state);
    const payload = await state.client.request<unknown>("turn/start", {
      threadId: state.threadId,
      input: toCodexUserInput(message),
      cwd: state.workingDirectory,
      model: state.model,
      effort: state.reasoningEffort,
      summary: "auto",
      personality: null,
      outputSchema: null,
      collaborationMode: null,
    });

    const turnId = resolveTurnId(payload);
    state.currentStatus = "RUNNING";
    state.activeTurnId = turnId;
    if (isRuntimeRawEventDebugEnabled) {
      console.log("[CodexSendTurnResponse]", {
        runId,
        threadId: state.threadId,
        turnId,
        payloadType: typeof payload,
        payloadKeys:
          payload && typeof payload === "object" && !Array.isArray(payload)
            ? Object.keys(payload)
            : [],
      });
    }
    return { turnId };
  }

  async injectInterAgentEnvelope(
    runId: string,
    envelope: CodexInterAgentEnvelope,
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

    const message = new AgentInputUserMessage(
      content,
      SenderType.AGENT,
      null,
      {
        inter_agent_envelope: {
          senderAgentRunId: asString(envelope.senderAgentRunId) ?? "unknown_sender",
          senderAgentName: asString(envelope.senderAgentName),
          recipientName: asString(envelope.recipientName) ?? "unknown_recipient",
          messageType: asString(envelope.messageType) ?? "agent_message",
          teamRunId: asString(envelope.teamRunId),
          metadata:
            envelope.metadata && typeof envelope.metadata === "object"
              ? envelope.metadata
              : null,
        },
      },
    );
    return this.sendTurn(runId, message);
  }

  async interruptRun(runId: string, turnId?: string | null): Promise<void> {
    const state = this.requireSession(runId);
    const activeTurnId = asString(turnId) ?? state.activeTurnId;
    if (!activeTurnId) {
      throw new Error("No active turn id is available for interruption.");
    }
    await state.client.request("turn/interrupt", {
      threadId: state.threadId,
      turnId: activeTurnId,
    });
  }

  async approveTool(
    runId: string,
    invocationId: string,
    approved: boolean,
  ): Promise<void> {
    const state = this.requireSession(runId);
    const approval = this.findApprovalRecord(state, invocationId);
    if (!approval) {
      throw new Error(`No pending approval found for invocation '${invocationId}'.`);
    }

    const decision = approved ? "accept" : "decline";
    state.client.respondSuccess(approval.requestId, {
      decision,
    });
    this.deleteApprovalRecord(state, approval);
  }

  async terminateRun(runId: string): Promise<void> {
    await this.closeRunSession(runId);
  }

  async closeRunSession(runId: string): Promise<void> {
    const state = this.sessions.get(runId);
    if (!state) {
      return;
    }
    this.sessions.delete(runId);
    state.startup.rejectReady(
      new Error(`Codex runtime session '${runId}' was closed before startup completed.`),
    );
    moveRuntimeListenersToDeferred({
      runId,
      activeListeners: state.listeners,
      deferredListenersByRunId: this.deferredListenersByRunId,
    });
    state.listeners.clear();
    state.approvalRecords.clear();
    for (const unbind of state.unbindHandlers) {
      try {
        unbind();
      } catch {
        // ignore
      }
    }
    try {
      await this.workspaceSkillMaterializer.cleanupMaterializedCodexWorkspaceSkills(
        state.materializedConfiguredSkills,
      );
    } finally {
      await this.processManager.releaseClient(state.workingDirectory);
    }
  }

  async listModels(cwd?: string): Promise<ModelInfo[]> {
    const workingDirectory = cwd ?? process.cwd();
    const client = await this.processManager.acquireClient(workingDirectory);
    const models: ModelInfo[] = [];
    try {
      let cursor: string | null = null;
      do {
        const response = await client.request<unknown>("model/list", {
          cursor,
          includeHidden: false,
        });
        const data = (response && typeof response === "object" ? response : null) as
          | Record<string, unknown>
          | null;
        const rows = Array.isArray(data?.data) ? data.data : [];
        for (const row of rows) {
          const mapped = mapCodexModelListRowToModelInfo(row);
          if (mapped) {
            models.push(mapped);
          }
        }
        cursor = asString(data?.nextCursor);
      } while (cursor);
      return models;
    } finally {
      await this.processManager.releaseClient(workingDirectory);
    }
  }

  private async startSession(
    runId: string,
    options: SessionRuntimeOptions,
    resumeThreadId: string | null,
  ): Promise<CodexRunSessionState> {
    return startCodexRuntimeSession({
      runId,
      options,
      resumeThreadId,
      processManager: this.processManager,
      workspaceSkillMaterializer: this.workspaceSkillMaterializer,
      interAgentRelayHandler: this.interAgentRelayHandler,
      resolveSessionCount: () => this.sessions.size,
      emitEvent: this.emitEvent.bind(this),
      handleServerRequest: this.handleServerRequest.bind(this),
      handleClientClose: this.handleSessionClientClose.bind(this),
    });
  }

  private handleServerRequest(
    state: CodexRunSessionState,
    requestId: string | number,
    method: string,
    params: JsonObject,
  ): void {
    handleRuntimeServerRequest({
      state,
      requestId,
      method,
      params,
      relayHandler: this.interAgentRelayHandler,
      emitEvent: this.emitEvent.bind(this),
    });
  }

  private tryHandleInterAgentRelayRequest(
    state: CodexRunSessionState,
    requestId: string | number,
    method: string,
    params: JsonObject,
  ): boolean {
    return tryHandleInterAgentRelayRequest({
      state,
      requestId,
      method,
      params,
      relayHandler: this.interAgentRelayHandler,
    });
  }

  private emitEvent(state: CodexRunSessionState, event: CodexRuntimeEvent): void {
    if (isRuntimeRawEventDebugEnabled) {
      console.log("[CodexEmitRuntimeEvent]", {
        runId: state.runId,
        method: event.method,
        listenerCount: state.listeners.size,
        paramKeys: Object.keys(event.params ?? {}),
      });
    }
    emitRuntimeEvent({
      listeners: state.listeners,
      event,
      onListenerError: (error) => {
        logger.warn(`Codex runtime event listener failed: ${String(error)}`);
      },
    });
  }

  private findApprovalRecord(
    state: CodexRunSessionState,
    invocationId: string,
  ) {
    return findApprovalRecord(state, invocationId);
  }

  private deleteApprovalRecord(state: CodexRunSessionState, record: Parameters<typeof deleteApprovalRecord>[1]): void {
    deleteApprovalRecord(state, record);
  }

  private requireSession(runId: string): CodexRunSessionState {
    const session = this.sessions.get(runId);
    if (!session) {
      throw new Error(`Codex runtime session '${runId}' is not available.`);
    }
    return session;
  }

  private handleSessionClientClose(state: CodexRunSessionState, error: unknown): void {
    this.sessions.delete(state.runId);
    const errorMessage =
      error && typeof error === "object" && "message" in error
        ? asString((error as { message?: unknown }).message)
        : null;
    state.startup.rejectReady(
      new Error(
        errorMessage
          ? `Codex app server closed before startup completed: ${errorMessage}`
          : "Codex app server closed before startup completed.",
      ),
    );
    if (!errorMessage) {
      return;
    }
    this.emitEvent(state, {
      method: "error",
      params: {
        code: "CODEX_APP_SERVER_CLOSED",
        message: errorMessage,
      },
    });
  }

  private async awaitStartupReady(state: CodexRunSessionState): Promise<void> {
    if (state.startup.status === "ready") {
      return;
    }

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    try {
      await Promise.race([
        state.startup.waitForReady,
        new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(
              new Error(
                `Codex runtime session '${state.runId}' did not reach startup-ready state within ${String(STARTUP_READY_TIMEOUT_MS)}ms.`,
              ),
            );
          }, STARTUP_READY_TIMEOUT_MS);
        }),
      ]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
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
        // fallback below
      }
    }

    try {
      return appConfigProvider.config.getTempWorkspaceDir();
    } catch {
      return process.cwd();
    }
  }
}

let cachedCodexAppServerRuntimeService: CodexAppServerRuntimeService | null = null;

export const getCodexAppServerRuntimeService = (): CodexAppServerRuntimeService => {
  if (!cachedCodexAppServerRuntimeService) {
    cachedCodexAppServerRuntimeService = new CodexAppServerRuntimeService();
  }
  return cachedCodexAppServerRuntimeService;
};

export {
  mapCodexModelListRowToModelInfo,
  normalizeCodexReasoningEffort,
  resolveCodexSessionReasoningEffort,
};

export type {
  CodexInterAgentEnvelope,
  CodexInterAgentRelayRequest,
  CodexInterAgentRelayResult,
  CodexRuntimeEvent,
  SessionRuntimeOptions,
} from "./codex-runtime-shared.js";
