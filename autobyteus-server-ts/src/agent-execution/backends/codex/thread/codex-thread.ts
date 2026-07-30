import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { CodexReadyTokenUsageUpdate } from "./codex-thread-token-usage.js";
import { asString } from "../codex-app-server-json.js";
import { resolveTurnId } from "./codex-thread-id-resolver.js";
import type { CodexAppServerClient } from "../../../../runtime-management/codex/client/codex-app-server-client.js";
import { handleAppServerNotification as applyAppServerNotification } from "./codex-thread-notification-handler.js";
import {
  handleAppServerRequest as applyAppServerRequest,
} from "./codex-thread-server-request-handler.js";
import {
  respondToPendingCodexToolApproval,
} from "./codex-tool-approval-coordinator.js";
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
  readonly pendingTokenUsageUpdates: Map<string, CodexReadyTokenUsageUpdate>;
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
    pendingTokenUsageUpdates?: Map<string, CodexReadyTokenUsageUpdate>;
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
    this.pendingTokenUsageUpdates = input.pendingTokenUsageUpdates ?? new Map();
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

  get serviceTier(): string | null {
    return this.config.serviceTier ?? null;
  }

  subscribeAppServerMessages(listener: (message: CodexAppServerMessage) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getStatusSnapshotSource() {
    return {
      currentStatus: this.currentStatus,
      activeTurnId: this.activeTurnId,
    };
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
    const completedTurnId = turnId ?? null;
    if (!completedTurnId || this.activeTurnId !== completedTurnId) {
      return;
    }
    this.currentStatus = "IDLE";
    this.lastCompletedTurnId = completedTurnId ?? null;
    this.runContext.runtimeContext.activeTurnId = null;
    this.pendingMcpToolCalls.clear();
  }

  setCurrentStatus(status: string | null): void {
    this.currentStatus = status;
    const normalizedStatus = status?.trim().toUpperCase() ?? null;
    if (normalizedStatus === "IDLE") {
      this.runContext.runtimeContext.activeTurnId = null;
      this.pendingMcpToolCalls.clear();
    }
  }

  setThreadId(threadId: string): void {
    this.runContext.runtimeContext.threadId = threadId;
  }

  recordTokenUsageUpdate(usage: CodexReadyTokenUsageUpdate): void {
    if (this.pendingTokenUsageUpdates.has(usage.idempotency_key)) {
      return;
    }
    this.pendingTokenUsageUpdates.set(usage.idempotency_key, usage);
  }

  getReadyTokenUsageUpdates(): CodexReadyTokenUsageUpdate[] {
    return Array.from(this.pendingTokenUsageUpdates.values());
  }

  markTokenUsageUpdatePersisted(idempotencyKey: string | null): void {
    if (!idempotencyKey) {
      return;
    }
    this.pendingTokenUsageUpdates.delete(idempotencyKey);
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
      serviceTier: this.serviceTier,
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

    this.deleteApprovalRecord(approval);
    await respondToPendingCodexToolApproval({
      codexThread: this,
      approval,
      approved,
      emitEvent: (event) => {
        this.emitThreadAppServerMessage(event);
      },
    });
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


  emitRuntimeError(code: string, message: string): void {
    this.markRuntimeFailed();
    this.emitThreadAppServerMessage({
      method: CodexThreadEventName.ERROR,
      params: {
        code,
        message,
        error_scope: "runtime",
        error_effect: "terminal",
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
    this.markRuntimeFailed();
    this.emitThreadAppServerMessage({
      method: CodexThreadEventName.ERROR,
      params: {
        code: "CODEX_APP_SERVER_CLOSED",
        message,
        error_scope: "runtime",
        error_effect: "terminal",
      },
    });
  }

  markTurnFailed(turnId: string): boolean {
    if (this.activeTurnId !== turnId) {
      return false;
    }
    this.currentStatus = "ERROR";
    this.runContext.runtimeContext.activeTurnId = null;
    this.pendingMcpToolCalls.clear();
    return true;
  }

  private markRuntimeFailed(): void {
    this.currentStatus = "ERROR";
    this.runContext.runtimeContext.activeTurnId = null;
    this.pendingMcpToolCalls.clear();
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

  recordApprovalRecord(record: CodexApprovalRecord): void {
    this.approvalRecords.set(record.invocationId, record);
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
    return this.approvalRecords.get(invocationId) ?? null;
  }

  deleteApprovalRecord(record: CodexApprovalRecord): void {
    this.approvalRecords.delete(record.invocationId);
  }

  clearApprovalRecords(): void {
    this.approvalRecords.clear();
  }

  clearPendingMcpToolCalls(): void {
    this.pendingMcpToolCalls.clear();
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
