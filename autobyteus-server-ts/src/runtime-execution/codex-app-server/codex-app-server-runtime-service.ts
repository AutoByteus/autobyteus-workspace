import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { getWorkspaceManager } from "../../workspaces/workspace-manager.js";
import {
  getCodexAppServerProcessManager,
  type CodexAppServerProcessManager,
} from "./codex-app-server-process-manager.js";
import { normalizeCodexRuntimeMethod } from "./codex-runtime-method-normalizer.js";
import { CodexAppServerClient } from "./codex-app-server-client.js";
import { toCodexUserInput } from "./codex-user-input-mapper.js";
import { asObject, asString, type JsonObject } from "./codex-runtime-json.js";
import {
  normalizeApprovalPolicy,
  normalizeSandboxMode,
  resolveDefaultModel,
  resolveThreadId,
  resolveThreadIdFromNotification,
  resolveTurnId,
} from "./codex-runtime-launch-config.js";
import {
  isSendMessageToToolName,
  resolveApprovalInvocationCandidates,
  resolveCommandArgsFromApprovalParams,
  resolveCommandNameFromApprovalParams,
  resolveDynamicToolArgsFromParams,
  resolveDynamicToolNameFromParams,
  resolveDynamicTools,
  resolveMemberNameFromMetadata,
  resolveTeamRunIdFromMetadata,
  toDynamicToolResponse,
} from "./codex-send-message-tooling.js";

export type CodexRuntimeEvent = {
  method: string;
  params: JsonObject;
  request_id?: string | number;
};

type CodexApprovalRecord = {
  requestId: string | number;
  method: string;
  invocationId: string;
  itemId: string;
  approvalId: string | null;
};

type CodexRunSessionState = {
  runId: string;
  client: CodexAppServerClient;
  threadId: string;
  model: string | null;
  workingDirectory: string;
  reasoningEffort: string | null;
  activeTurnId: string | null;
  approvalRecords: Map<string, CodexApprovalRecord>;
  listeners: Set<(event: CodexRuntimeEvent) => void>;
  unbindHandlers: Array<() => void>;
  teamRunId: string | null;
  memberName: string | null;
};

export interface CodexInterAgentEnvelope {
  senderAgentId: string;
  senderAgentName?: string | null;
  recipientName: string;
  messageType: string;
  content: string;
  teamRunId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CodexInterAgentRelayRequest {
  senderRunId: string;
  senderTeamRunId: string | null;
  senderMemberName: string | null;
  toolArguments: Record<string, unknown>;
}

export interface CodexInterAgentRelayResult {
  accepted: boolean;
  code?: string;
  message?: string;
}

type CodexInterAgentRelayHandler = (
  request: CodexInterAgentRelayRequest,
) => Promise<CodexInterAgentRelayResult>;

type SessionRuntimeOptions = {
  modelIdentifier: string | null;
  workingDirectory: string;
  llmConfig?: Record<string, unknown> | null;
  runtimeMetadata?: Record<string, unknown> | null;
};
const VALID_REASONING_EFFORTS = new Set(["none", "low", "medium", "high", "xhigh"]);

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const resolveThreadIdFromRuntimeMessage = (params: JsonObject): string | null => {
  const thread = asObject(params.thread);
  const turn = asObject(params.turn);
  const turnThread = asObject(turn?.thread);
  const item = asObject(params.item);
  const itemThread = asObject(item?.thread);
  const command = asObject(params.command);
  const commandExecution = asObject(params.commandExecution);
  const payloadCommand = asObject(item?.command);

  return (
    asString(params.threadId) ??
    asString(thread?.id) ??
    asString(turn?.threadId) ??
    asString(turnThread?.id) ??
    asString(item?.threadId) ??
    asString(itemThread?.id) ??
    asString(command?.threadId) ??
    asString(commandExecution?.threadId) ??
    asString(payloadCommand?.threadId) ??
    resolveThreadIdFromNotification(params)
  );
};

const resolveTurnIdFromRuntimeMessage = (params: JsonObject): string | null => {
  const turn = asObject(params.turn);
  const item = asObject(params.item);
  return asString(params.turnId) ?? asString(turn?.id) ?? asString(item?.turnId);
};

export const normalizeCodexReasoningEffort = (value: unknown): string | null => {
  const normalized = asString(value)?.toLowerCase() ?? null;
  if (!normalized || !VALID_REASONING_EFFORTS.has(normalized)) {
    return null;
  }
  return normalized;
};

const resolveEffortFromConfig = (
  llmConfig: Record<string, unknown> | null | undefined,
): string | null => normalizeCodexReasoningEffort(llmConfig?.reasoning_effort);

const resolveEffortFromRuntimeMetadata = (
  runtimeMetadata: Record<string, unknown> | null | undefined,
): string | null =>
  normalizeCodexReasoningEffort(
    runtimeMetadata?.reasoning_effort ?? runtimeMetadata?.reasoningEffort,
  );

export const resolveCodexSessionReasoningEffort = (
  llmConfig: Record<string, unknown> | null | undefined,
  runtimeMetadata: Record<string, unknown> | null | undefined,
): string | null => resolveEffortFromConfig(llmConfig) ?? resolveEffortFromRuntimeMetadata(runtimeMetadata);

const toReasoningEffortConfigSchema = (
  supportedEfforts: string[],
  defaultReasoningEffort: string | null,
): Record<string, unknown> | undefined => {
  if (supportedEfforts.length === 0) {
    return undefined;
  }

  const enumValues = supportedEfforts.slice();
  if (defaultReasoningEffort && !enumValues.includes(defaultReasoningEffort)) {
    enumValues.push(defaultReasoningEffort);
  }

  return {
    parameters: [
      {
        name: "reasoning_effort",
        type: "enum",
        description:
          "Controls reasoning depth for Codex turn/start. Higher effort may improve quality but increase latency.",
        required: false,
        default_value: defaultReasoningEffort ?? enumValues[0] ?? null,
        enum_values: enumValues,
      },
    ],
  };
};

const toReasoningDisplayLabel = (displayName: string, defaultReasoningEffort: string | null): string =>
  defaultReasoningEffort ? `${displayName} (default reasoning: ${defaultReasoningEffort})` : displayName;

const toSupportedReasoningEfforts = (row: JsonObject): string[] => {
  const source = row.supportedReasoningEfforts ?? row.supported_reasoning_efforts;
  if (!Array.isArray(source)) {
    return [];
  }

  const efforts: string[] = [];
  for (const entry of source) {
    const objectEntry = asObject(entry);
    const value = normalizeCodexReasoningEffort(
      objectEntry?.reasoningEffort ?? objectEntry?.reasoning_effort ?? objectEntry?.effort ?? entry,
    );
    if (value && !efforts.includes(value)) {
      efforts.push(value);
    }
  }
  return efforts;
};

export const mapCodexModelListRowToModelInfo = (row: unknown): ModelInfo | null => {
  const model = asObject(row);
  const modelName = asString(model?.model) ?? asString(model?.id);
  if (!model || !modelName) {
    return null;
  }

  const defaultReasoningEffort = normalizeCodexReasoningEffort(
    model.defaultReasoningEffort ?? model.default_reasoning_effort,
  );
  const supportedReasoningEfforts = toSupportedReasoningEfforts(model);
  const configSchema = toReasoningEffortConfigSchema(supportedReasoningEfforts, defaultReasoningEffort);
  const displayName = asString(model.displayName) ?? modelName;

  return {
    model_identifier: modelName,
    display_name: toReasoningDisplayLabel(displayName, defaultReasoningEffort),
    value: modelName,
    canonical_name: modelName,
    provider: LLMProvider.OPENAI,
    runtime: "api",
    config_schema: configSchema,
  };
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
    const content = asString(envelope.content) ?? "";
    if (!content) {
      throw new Error("Inter-agent envelope content is required.");
    }
    const message = new AgentInputUserMessage(
      content,
      SenderType.AGENT,
      null,
      {
        inter_agent_envelope: {
          senderAgentId: asString(envelope.senderAgentId) ?? "unknown_sender",
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
      const data = asObject(response);
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
    const dynamicTools = resolveDynamicTools({
      teamRunId,
      interAgentRelayEnabled: Boolean(this.interAgentRelayHandler),
    });
    const client = await this.processManager.getClient(workingDirectory);

    const threadId = resumeThreadId
      ? await this.resumeThread(client, resumeThreadId, workingDirectory, model, dynamicTools)
      : await this.startThread(client, workingDirectory, model, dynamicTools);
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
    };

    state.unbindHandlers.push(
      client.onNotification((message) => {
        if (!this.isNotificationForSession(state, message.params)) {
          return;
        }
        this.handleNotification(state, message.method, message.params);
      }),
    );
    state.unbindHandlers.push(
      client.onServerRequest((message) => {
        if (!this.isServerRequestForSession(state, message.params)) {
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

  private async startThread(
    client: CodexAppServerClient,
    cwd: string,
    model: string | null,
    dynamicTools: JsonObject[] | null,
  ): Promise<string | null> {
    const response = await client.request<unknown>("thread/start", {
      model,
      modelProvider: null,
      cwd,
      approvalPolicy: normalizeApprovalPolicy(),
      sandbox: normalizeSandboxMode(),
      config: null,
      baseInstructions: null,
      developerInstructions: null,
      personality: null,
      ephemeral: false,
      dynamicTools,
      experimentalRawEvents: false,
      persistExtendedHistory: false,
    });
    return resolveThreadId(response);
  }

  private async resumeThread(
    client: CodexAppServerClient,
    threadId: string,
    cwd: string,
    model: string | null,
    dynamicTools: JsonObject[] | null,
  ): Promise<string | null> {
    try {
      const response = await client.request<unknown>("thread/resume", {
        threadId,
        history: null,
        path: null,
        model,
        modelProvider: null,
        cwd,
        approvalPolicy: normalizeApprovalPolicy(),
        sandbox: normalizeSandboxMode(),
        config: null,
        baseInstructions: null,
        developerInstructions: null,
        personality: null,
        dynamicTools,
        persistExtendedHistory: false,
      });
      return resolveThreadId(response);
    } catch (error) {
      logger.warn(`Failed to resume Codex thread '${threadId}', starting a new thread: ${String(error)}`);
      return this.startThread(client, cwd, model, dynamicTools);
    }
  }

  private isNotificationForSession(
    state: CodexRunSessionState,
    params: JsonObject,
  ): boolean {
    const threadId = resolveThreadIdFromRuntimeMessage(params);
    if (threadId) {
      return threadId === state.threadId;
    }
    const turnId = resolveTurnIdFromRuntimeMessage(params);
    if (turnId && state.activeTurnId) {
      return turnId === state.activeTurnId;
    }
    return this.sessions.size === 1;
  }

  private isServerRequestForSession(
    state: CodexRunSessionState,
    params: JsonObject,
  ): boolean {
    const threadId = resolveThreadIdFromRuntimeMessage(params);
    if (threadId) {
      return threadId === state.threadId;
    }
    const turnId = resolveTurnIdFromRuntimeMessage(params);
    if (turnId && state.activeTurnId) {
      return turnId === state.activeTurnId;
    }
    return this.sessions.size === 1;
  }

  private handleNotification(
    state: CodexRunSessionState,
    method: string,
    params: JsonObject,
  ): void {
    const normalizedMethod = normalizeCodexRuntimeMethod(method);
    if (normalizedMethod === "turn/started") {
      const turn = asObject(params.turn);
      state.activeTurnId = asString(turn?.id);
    } else if (normalizedMethod === "turn/completed") {
      state.activeTurnId = null;
    } else if (normalizedMethod === "thread/started") {
      const thread = asObject(params.thread);
      const nextThreadId = asString(thread?.id);
      if (nextThreadId) {
        state.threadId = nextThreadId;
      }
    } else if (normalizedMethod === "thread/tokenUsage/updated") {
      const nextThreadId = resolveThreadIdFromRuntimeMessage(params);
      if (nextThreadId) {
        state.threadId = nextThreadId;
      }
    }

    this.emitEvent(state, { method: normalizedMethod, params });
  }

  private handleServerRequest(
    state: CodexRunSessionState,
    requestId: string | number,
    method: string,
    params: JsonObject,
  ): void {
    const normalizedMethod = normalizeCodexRuntimeMethod(method);
    if (this.tryHandleInterAgentRelayRequest(state, requestId, normalizedMethod, params)) {
      return;
    }

    if (
      normalizedMethod !== "item/commandExecution/requestApproval" &&
      normalizedMethod !== "item/fileChange/requestApproval"
    ) {
      state.client.respondError(
        requestId,
        -32601,
        `Unsupported server request method '${normalizedMethod}'.`,
      );
      return;
    }

    const invocation = resolveApprovalInvocationCandidates(params);
    if (!invocation.primary || !invocation.itemId) {
      state.client.respondError(requestId, -32602, "Approval request missing itemId.");
      return;
    }

    const record: CodexApprovalRecord = {
      requestId,
      method: normalizedMethod,
      invocationId: invocation.primary,
      itemId: invocation.itemId,
      approvalId: invocation.approvalId,
    };
    state.approvalRecords.set(invocation.primary, record);
    for (const alias of invocation.aliases) {
      state.approvalRecords.set(alias, record);
    }

    this.emitEvent(state, {
      method: normalizedMethod,
      params,
      request_id: requestId,
    });
  }

  private tryHandleInterAgentRelayRequest(
    state: CodexRunSessionState,
    requestId: string | number,
    method: string,
    params: JsonObject,
  ): boolean {
    if (method === "item/commandExecution/requestApproval") {
      const commandName = resolveCommandNameFromApprovalParams(params)?.toLowerCase() ?? null;
      if (!isSendMessageToToolName(commandName)) {
        return false;
      }

      if (!this.interAgentRelayHandler) {
        state.client.respondError(
          requestId,
          -32001,
          "send_message_to relay handler is not configured.",
        );
        return true;
      }

      const toolArguments = resolveCommandArgsFromApprovalParams(params);
      void this.interAgentRelayHandler({
        senderRunId: state.runId,
        senderTeamRunId: state.teamRunId,
        senderMemberName: state.memberName,
        toolArguments,
      })
        .then((result) => {
          if (!result.accepted) {
            state.client.respondError(
              requestId,
              -32001,
              result.message ?? "Inter-agent relay rejected.",
            );
            return;
          }
          state.client.respondSuccess(requestId, { decision: "accept" });
        })
        .catch((error) => {
          state.client.respondError(
            requestId,
            -32001,
            `Inter-agent relay failed: ${String(error)}`,
          );
        });

      return true;
    }

    if (method !== "item/tool/call") {
      return false;
    }

    const toolName = resolveDynamicToolNameFromParams(params);
    if (!isSendMessageToToolName(toolName)) {
      return false;
    }

    if (!this.interAgentRelayHandler) {
      state.client.respondSuccess(
        requestId,
        toDynamicToolResponse({
          success: false,
          message: "send_message_to relay handler is not configured.",
        }),
      );
      return true;
    }

    const toolArguments = resolveDynamicToolArgsFromParams(params);
    void this.interAgentRelayHandler({
      senderRunId: state.runId,
      senderTeamRunId: state.teamRunId,
      senderMemberName: state.memberName,
      toolArguments,
    })
      .then((result) => {
        if (!result.accepted) {
          state.client.respondSuccess(
            requestId,
            toDynamicToolResponse({
              success: false,
              message: result.message ?? "Inter-agent relay rejected.",
            }),
          );
          return;
        }
        state.client.respondSuccess(
          requestId,
          toDynamicToolResponse({
            success: true,
            message: result.message ?? "Message relayed.",
          }),
        );
      })
      .catch((error) => {
        state.client.respondSuccess(
          requestId,
          toDynamicToolResponse({
            success: false,
            message: `Inter-agent relay failed: ${String(error)}`,
          }),
        );
      });

    return true;
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
  ): CodexApprovalRecord | null {
    const direct = state.approvalRecords.get(invocationId);
    if (direct) {
      return direct;
    }
    const trimmed = invocationId.trim();
    if (!trimmed) {
      return null;
    }
    const baseId = trimmed.includes(":") ? trimmed.split(":")[0] ?? null : null;
    if (baseId) {
      return state.approvalRecords.get(baseId) ?? null;
    }
    return null;
  }

  private deleteApprovalRecord(state: CodexRunSessionState, record: CodexApprovalRecord): void {
    state.approvalRecords.delete(record.invocationId);
    state.approvalRecords.delete(record.itemId);
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
