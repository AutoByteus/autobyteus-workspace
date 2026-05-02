import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { TokenUsage } from "autobyteus-ts";
import { asString } from "../codex-app-server-json.js";
import { resolveTurnId } from "./codex-thread-id-resolver.js";
import type { CodexAppServerClient } from "../../../../runtime-management/codex/client/codex-app-server-client.js";
import { handleAppServerNotification as applyAppServerNotification } from "./codex-thread-notification-handler.js";
import {
  handleAppServerRequest as applyAppServerRequest,
} from "./codex-thread-server-request-handler.js";
import type { CodexApprovalRecord } from "./codex-approval-record.js";
import type { CodexAppServerMessage } from "./codex-app-server-message.js";
import { CodexThreadEventName } from "../events/codex-thread-event-name.js";
import type { CodexThreadStartupGate } from "./codex-thread-startup-gate.js";
import type { JsonObject } from "../codex-app-server-json.js";
import { toCodexUserInput } from "./codex-user-input-mapper.js";
import type { CodexRunContext } from "../backend/codex-agent-run-context.js";
import { dispatchRuntimeEvent } from "../../shared/runtime-event-dispatch.js";

const STARTUP_READY_TIMEOUT_MS = 60_000;
const isRuntimeRawEventDebugEnabled = process.env.RUNTIME_RAW_EVENT_DEBUG === "1";
const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export type CodexPendingMcpToolCall = {
  invocationId: string;
  turnId: string | null;
  serverName: string | null;
  toolName: string | null;
  arguments: JsonObject;
};

const normalizeLookupToken = (value: string | null): string | null =>
  value ? value.trim().toLowerCase() : null;

export class CodexThread {
  readonly runContext: CodexRunContext;
  readonly client: CodexAppServerClient;
  currentStatus: string | null;
  readonly startup: CodexThreadStartupGate;
  readonly approvalRecords: Map<string, CodexApprovalRecord>;
  readonly pendingMcpToolCalls: Map<string, CodexPendingMcpToolCall>;
  readonly pendingTurnTokenUsage: Map<string, TokenUsage>;
  readonly readyTurnTokenUsageTurnIds: Set<string>;
  readonly listeners: Set<(message: CodexAppServerMessage) => void>;
  readonly unbindHandlers: Array<() => void>;
  lastCompletedTurnId: string | null;

  constructor(input: {
    runContext: CodexRunContext;
    client: CodexAppServerClient;
    currentStatus?: string | null;
    startup: CodexThreadStartupGate;
    approvalRecords?: Map<string, CodexApprovalRecord>;
    pendingMcpToolCalls?: Map<string, CodexPendingMcpToolCall>;
    pendingTurnTokenUsage?: Map<string, TokenUsage>;
    readyTurnTokenUsageTurnIds?: Set<string>;
    listeners?: Set<(message: CodexAppServerMessage) => void>;
    unbindHandlers?: Array<() => void>;
    lastCompletedTurnId?: string | null;
  }) {
    this.runContext = input.runContext;
    this.client = input.client;
    this.currentStatus = input.currentStatus ?? "IDLE";
    this.startup = input.startup;
    this.approvalRecords = input.approvalRecords ?? new Map();
    this.pendingMcpToolCalls = input.pendingMcpToolCalls ?? new Map();
    this.pendingTurnTokenUsage = input.pendingTurnTokenUsage ?? new Map();
    this.readyTurnTokenUsageTurnIds = input.readyTurnTokenUsageTurnIds ?? new Set();
    this.listeners = input.listeners ?? new Set();
    this.unbindHandlers = input.unbindHandlers ?? [];
    this.lastCompletedTurnId = input.lastCompletedTurnId ?? null;
  }

  get runId(): string {
    return this.runContext.runId;
  }

  get threadId(): string {
    return this.runContext.runtimeContext.threadId ?? this.runId;
  }

  get activeTurnId(): string | null {
    return this.runContext.runtimeContext.activeTurnId;
  }

  get config() {
    return this.runContext.runtimeContext.codexThreadConfig;
  }

  get model(): string | null {
    return this.config.model;
  }

  get workingDirectory(): string {
    return this.config.workingDirectory;
  }

  get reasoningEffort(): string | null {
    return this.config.reasoningEffort;
  }

  subscribeAppServerMessages(listener: (message: CodexAppServerMessage) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getStatus(): string | null {
    return this.currentStatus;
  }

  getPlatformAgentRunId(): string {
    return this.threadId;
  }

  markStartupReady(): void {
    this.startup.resolveReady();
  }

  rejectStartupReady(error: Error): void {
    this.startup.rejectReady(error);
  }

  markTurnStarted(turnId: string | null): void {
    this.currentStatus = "RUNNING";
    this.runContext.runtimeContext.activeTurnId = turnId;
    this.lastCompletedTurnId = null;
  }

  markTurnCompleted(turnId?: string | null): void {
    const completedTurnId = turnId ?? this.activeTurnId;
    this.currentStatus = "IDLE";
    this.lastCompletedTurnId = completedTurnId ?? null;
    this.runContext.runtimeContext.activeTurnId = null;
    this.pendingMcpToolCalls.clear();
    this.markTurnTokenUsageReady(completedTurnId);
  }

  setCurrentStatus(status: string | null): void {
    this.currentStatus = status;
    const normalizedStatus = status?.trim().toUpperCase() ?? null;
    if (normalizedStatus === "IDLE") {
      this.markTurnTokenUsageReady(this.activeTurnId ?? this.lastCompletedTurnId);
    }
  }

  setThreadId(threadId: string): void {
    this.runContext.runtimeContext.threadId = threadId;
  }

  recordTurnTokenUsage(turnId: string, usage: TokenUsage): void {
    this.pendingTurnTokenUsage.set(turnId, usage);
    this.markTurnTokenUsageReady(turnId);
  }

  getReadyTurnTokenUsages(): Array<{
    turnId: string;
    usage: TokenUsage;
  }> {
    const ready: Array<{ turnId: string; usage: TokenUsage }> = [];
    for (const turnId of this.readyTurnTokenUsageTurnIds) {
      const usage = this.pendingTurnTokenUsage.get(turnId);
      if (!usage) {
        continue;
      }
      ready.push({ turnId, usage });
    }
    return ready;
  }

  markTurnTokenUsagePersisted(turnId: string | null): void {
    if (!turnId) {
      return;
    }
    this.pendingTurnTokenUsage.delete(turnId);
    this.readyTurnTokenUsageTurnIds.delete(turnId);
  }

  async sendTurn(message: AgentInputUserMessage): Promise<{ turnId: string | null }> {
    if (isRuntimeRawEventDebugEnabled) {
      console.log("[CodexSendTurnStart]", {
        runId: this.runId,
        threadId: this.threadId,
        activeTurnId: this.activeTurnId,
        startupStatus: this.startup.status,
        contentPreview: message.content.slice(0, 160),
      });
    }

    await this.awaitStartupReady();
    const payload = await this.client.request<unknown>("turn/start", {
      threadId: this.threadId,
      input: toCodexUserInput(message),
      cwd: this.workingDirectory,
      model: this.model,
      effort: this.reasoningEffort,
      summary: "auto",
      personality: null,
      outputSchema: null,
      collaborationMode: null,
    });

    const turnId = resolveTurnId(payload);
    this.markTurnStarted(turnId);
    if (isRuntimeRawEventDebugEnabled) {
      console.log("[CodexSendTurnResponse]", {
        runId: this.runId,
        threadId: this.threadId,
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

  async interrupt(turnId?: string | null): Promise<void> {
    const activeTurnId = asString(turnId) ?? this.activeTurnId;
    if (!activeTurnId) {
      throw new Error("No active turn id is available for interruption.");
    }
    await this.client.request("turn/interrupt", {
      threadId: this.threadId,
      turnId: activeTurnId,
    });
  }

  async approveTool(invocationId: string, approved: boolean): Promise<void> {
    const approval = this.findApprovalRecord(invocationId);
    if (!approval) {
      throw new Error(`No pending approval found for invocation '${invocationId}'.`);
    }

    const decision = approved ? "accept" : "decline";
    if (approval.responseMode === "mcp_server_elicitation") {
      this.client.respondSuccess(approval.requestId, { action: decision });
    } else {
      this.client.respondSuccess(approval.requestId, { decision });
    }
    if (approved) {
      this.emitThreadAppServerMessage({
        method: CodexThreadEventName.LOCAL_TOOL_APPROVED,
        params: {
          invocation_id: approval.invocationId,
          itemId: approval.itemId,
          approvalId: approval.approvalId,
          requestId: approval.requestId,
          ...(approval.toolName ? { tool_name: approval.toolName } : {}),
        },
      });
    }
    this.deleteApprovalRecord(approval);
  }

  handleAppServerNotification(method: string, params: JsonObject): void {
    applyAppServerNotification(this, method, params, (_codexThread, event) => {
      this.emitThreadAppServerMessage(event);
    });
  }

  handleAppServerRequest(
    requestId: string | number,
    method: string,
    params: JsonObject,
  ): void {
    void applyAppServerRequest({
      codexThread: this,
      requestId,
      method,
      params,
      emitEvent: (_codexThread, event) => {
        this.emitThreadAppServerMessage(event);
      },
    });
  }

  handleClientClosed(error: unknown): void {
    const errorMessage =
      error && typeof error === "object" && "message" in error
        ? asString((error as { message?: unknown }).message)
        : null;
    const message =
      errorMessage ??
      "Codex app server closed before app server message processing completed.";

    this.rejectStartupReady(
      new Error(`Codex app server closed before startup completed: ${message}`),
    );
    this.setCurrentStatus("ERROR");
    this.runContext.runtimeContext.activeTurnId = null;
    this.emitThreadAppServerMessage({
      method: CodexThreadEventName.ERROR,
      params: {
        code: "CODEX_APP_SERVER_CLOSED",
        message,
      },
    });
  }

  addUnbindHandler(unbind: () => void): void {
    this.unbindHandlers.push(unbind);
  }

  unbindAll(): void {
    for (const unbind of this.unbindHandlers) {
      try {
        unbind();
      } catch {
        // ignore
      }
    }
    this.unbindHandlers.length = 0;
  }

  clearListeners(): void {
    this.listeners.clear();
  }

  emitAppServerMessage(
    message: CodexAppServerMessage,
    onListenerError?: (error: unknown) => void,
  ): void {
    dispatchRuntimeEvent({
      listeners: this.listeners,
      event: message,
      onListenerError,
    });
  }

  recordApprovalRecord(record: CodexApprovalRecord, aliases: string[] = []): void {
    this.approvalRecords.set(record.invocationId, record);
    for (const alias of aliases) {
      this.approvalRecords.set(alias, record);
    }
  }

  trackPendingMcpToolCall(call: CodexPendingMcpToolCall): void {
    this.pendingMcpToolCalls.set(call.invocationId, call);
  }

  completePendingMcpToolCall(invocationId: string | null): CodexPendingMcpToolCall | null {
    if (!invocationId) {
      return null;
    }
    const pending = this.pendingMcpToolCalls.get(invocationId) ?? null;
    this.pendingMcpToolCalls.delete(invocationId);
    return pending;
  }

  findPendingMcpToolCall(input: {
    turnId: string | null;
    serverName: string | null;
    toolName: string | null;
  }): CodexPendingMcpToolCall | null {
    const turnId = normalizeLookupToken(input.turnId);
    const serverName = normalizeLookupToken(input.serverName);
    const toolName = normalizeLookupToken(input.toolName);
    const candidates = Array.from(this.pendingMcpToolCalls.values()).filter((call) => {
      if (turnId && normalizeLookupToken(call.turnId) !== turnId) {
        return false;
      }
      if (serverName && normalizeLookupToken(call.serverName) !== serverName) {
        return false;
      }
      if (toolName && normalizeLookupToken(call.toolName) !== toolName) {
        return false;
      }
      return true;
    });
    return candidates.at(-1) ?? null;
  }

  findApprovalRecord(invocationId: string): CodexApprovalRecord | null {
    const direct = this.approvalRecords.get(invocationId);
    if (direct) {
      return direct;
    }
    const trimmed = invocationId.trim();
    if (!trimmed) {
      return null;
    }
    const baseId = trimmed.includes(":") ? trimmed.split(":")[0] ?? null : null;
    if (baseId) {
      return this.approvalRecords.get(baseId) ?? null;
    }
    return null;
  }

  deleteApprovalRecord(record: CodexApprovalRecord): void {
    this.approvalRecords.delete(record.invocationId);
    this.approvalRecords.delete(record.itemId);
  }

  clearApprovalRecords(): void {
    this.approvalRecords.clear();
  }

  clearPendingMcpToolCalls(): void {
    this.pendingMcpToolCalls.clear();
  }

  private markTurnTokenUsageReady(turnId: string | null): void {
    if (!turnId || !this.pendingTurnTokenUsage.has(turnId)) {
      return;
    }

    const normalizedStatus = this.currentStatus?.trim().toUpperCase() ?? null;
    if (normalizedStatus === "IDLE" || this.lastCompletedTurnId === turnId) {
      this.readyTurnTokenUsageTurnIds.add(turnId);
    }
  }

  private async awaitStartupReady(): Promise<void> {
    if (this.startup.status === "ready") {
      return;
    }

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    try {
      await Promise.race([
        this.startup.waitForReady,
        new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(
              new Error(
                `Codex thread '${this.runId}' did not reach startup-ready state within ${String(STARTUP_READY_TIMEOUT_MS)}ms.`,
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

  private emitThreadAppServerMessage(message: CodexAppServerMessage): void {
    if (isRuntimeRawEventDebugEnabled) {
      console.log("[CodexEmitAppServerMessage]", {
        runId: this.runId,
        method: message.method,
        listenerCount: this.listeners.size,
        paramKeys: Object.keys(message.params ?? {}),
      });
    }
    this.emitAppServerMessage(message, (error) => {
      logger.warn(`Codex app server message listener failed: ${String(error)}`);
    });
  }
}
