import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { getWorkspaceManager } from "../../workspaces/workspace-manager.js";
import {
  getCodexAppServerProcessManager,
  type CodexAppServerProcessManager,
} from "./codex-app-server-process-manager.js";
import { toCodexUserInput } from "./codex-user-input-mapper.js";
import { asString, type JsonObject } from "./codex-runtime-json.js";
import {
  resolveApprovalPolicyForAutoExecuteTools,
  resolveDefaultModel,
  resolveTurnId,
} from "./codex-runtime-launch-config.js";
import {
  renderTeamManifestDeveloperInstructions,
  resolveAllowedRecipientNamesFromManifest,
  resolveDynamicTools,
  resolveMemberNameFromMetadata,
  resolveSendMessageToEnabledFromMetadata,
  resolveTeamManifestMembersFromMetadata,
  resolveTeamRunIdFromMetadata,
} from "./codex-send-message-tooling.js";
import {
  deleteApprovalRecord,
  findApprovalRecord,
  handleRuntimeNotification,
  handleRuntimeServerRequest,
  isRuntimeMessageForSession,
  tryHandleInterAgentRelayRequest,
} from "./codex-runtime-event-router.js";
import {
  mapCodexModelListRowToModelInfo,
  normalizeCodexReasoningEffort,
  resolveCodexSessionReasoningEffort,
} from "./codex-runtime-model-catalog.js";
import {
  resumeCodexThread,
  startCodexThread,
} from "./codex-runtime-thread-lifecycle.js";
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

export class CodexAppServerRuntimeService {
  private readonly sessions = new Map<string, CodexRunSessionState>();
  private readonly workspaceManager = getWorkspaceManager();
  private readonly processManager: CodexAppServerProcessManager;
  private interAgentRelayHandler: CodexInterAgentRelayHandler | null = null;

  constructor(
    processManager: CodexAppServerProcessManager = getCodexAppServerProcessManager(),
  ) {
    this.processManager = processManager;
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
    return {
      threadId: state.threadId,
      metadata: {
        model: state.model,
        cwd: state.workingDirectory,
        reasoning_effort: state.reasoningEffort,
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
    return {
      threadId: state.threadId,
      metadata: {
        ...(runtimeReference?.metadata ?? {}),
        model: state.model,
        cwd: state.workingDirectory,
        reasoning_effort: state.reasoningEffort,
      },
    };
  }

  hasRunSession(runId: string): boolean {
    return this.sessions.has(runId);
  }

  subscribeToRunEvents(
    runId: string,
    listener: (event: CodexRuntimeEvent) => void,
  ): () => void {
    const state = this.sessions.get(runId);
    if (!state) {
      return () => {};
    }
    state.listeners.add(listener);
    return () => {
      state.listeners.delete(listener);
    };
  }

  async sendTurn(runId: string, message: AgentInputUserMessage): Promise<{ turnId: string | null }> {
    const state = this.requireSession(runId);
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
    state.activeTurnId = turnId;
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
    state.listeners.clear();
    state.approvalRecords.clear();
    for (const unbind of state.unbindHandlers) {
      try {
        unbind();
      } catch {
        // ignore
      }
    }
  }

  async listModels(cwd?: string): Promise<ModelInfo[]> {
    const client = await this.processManager.getClient(cwd ?? process.cwd());
    const models: ModelInfo[] = [];
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
  }

  private async startSession(
    runId: string,
    options: SessionRuntimeOptions,
    resumeThreadId: string | null,
  ): Promise<CodexRunSessionState> {
    const model = asString(options.modelIdentifier) ?? resolveDefaultModel();
    const workingDirectory = options.workingDirectory || process.cwd();
    const reasoningEffort = resolveCodexSessionReasoningEffort(
      options.llmConfig,
      options.runtimeMetadata,
    );
    const teamRunId = resolveTeamRunIdFromMetadata(options.runtimeMetadata);
    const memberName = resolveMemberNameFromMetadata(options.runtimeMetadata);
    const sendMessageToEnabled = resolveSendMessageToEnabledFromMetadata(options.runtimeMetadata);
    const teamManifestMembers = resolveTeamManifestMembersFromMetadata(options.runtimeMetadata);
    const allowedRecipientNames = resolveAllowedRecipientNamesFromManifest({
      currentMemberName: memberName,
      members: teamManifestMembers,
    });
    const developerInstructions = renderTeamManifestDeveloperInstructions({
      currentMemberName: memberName,
      members: teamManifestMembers,
      sendMessageToEnabled,
    });
    const dynamicTools = resolveDynamicTools({
      teamRunId,
      interAgentRelayEnabled: Boolean(this.interAgentRelayHandler),
      sendMessageToEnabled,
      allowedRecipientNames,
    });
    const approvalPolicy = resolveApprovalPolicyForAutoExecuteTools(options.autoExecuteTools);
    const client = await this.processManager.getClient(workingDirectory);

    const threadId = resumeThreadId
      ? await resumeCodexThread(
          client,
          resumeThreadId,
          workingDirectory,
          model,
          approvalPolicy,
          dynamicTools,
          developerInstructions,
        )
      : await startCodexThread(
          client,
          workingDirectory,
          model,
          approvalPolicy,
          dynamicTools,
          developerInstructions,
        );
    if (!threadId) {
      throw new Error("Codex thread id was not returned by app server.");
    }

    const state: CodexRunSessionState = {
      runId,
      client,
      threadId,
      model,
      workingDirectory,
      reasoningEffort,
      activeTurnId: null,
      approvalRecords: new Map(),
      listeners: new Set(),
      unbindHandlers: [],
      teamRunId,
      memberName,
      sendMessageToEnabled,
    };

    state.unbindHandlers.push(
      client.onNotification((message) => {
        if (!isRuntimeMessageForSession(state, message.params, this.sessions.size)) {
          return;
        }
        handleRuntimeNotification(state, message.method, message.params, this.emitEvent.bind(this));
      }),
    );
    state.unbindHandlers.push(
      client.onServerRequest((message) => {
        if (!isRuntimeMessageForSession(state, message.params, this.sessions.size)) {
          return;
        }
        this.handleServerRequest(state, message.id, message.method, message.params);
      }),
    );
    state.unbindHandlers.push(
      client.onClose((error) => {
        this.sessions.delete(runId);
        if (error) {
          this.emitEvent(state, {
            method: "error",
            params: {
              code: "CODEX_APP_SERVER_CLOSED",
              message: error.message,
            },
          });
        }
      }),
    );
    return state;
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
    for (const listener of state.listeners) {
      try {
        listener(event);
      } catch (error) {
        logger.warn(`Codex runtime event listener failed: ${String(error)}`);
      }
    }
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
