import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { CodexReadyTokenUsageUpdate } from "./codex-thread-token-usage.js";
import { asString } from "../codex-app-server-json.js";
import {
  resolveStartedTurnId,
  resolveSteeredTurnId,
} from "./codex-thread-id-resolver.js";
import type { CodexAppServerClient } from "../../../../runtime-management/codex/client/codex-app-server-client.js";
import { handleAppServerNotification as applyAppServerNotification } from "./codex-thread-notification-handler.js";
import {
  handleAppServerRequest as applyAppServerRequest,
} from "./codex-thread-server-request-handler.js";
import {
  respondToPendingCodexToolApproval,
} from "./codex-tool-approval-coordinator.js";
import type { CodexApprovalRecord } from "./codex-approval-record.js";
import type {
  CodexLocalDerivedEventInput,
} from "./codex-app-server-message.js";
import { CodexThreadEventName } from "../events/codex-thread-event-name.js";
import type { CodexThreadStartupGate } from "./codex-thread-startup-gate.js";
import type { JsonObject } from "../codex-app-server-json.js";
import { toCodexUserInput } from "./codex-user-input-mapper.js";
import type { CodexRunContext } from "../backend/codex-agent-run-context.js";
import { dispatchRuntimeEvent } from "../../shared/runtime-event-dispatch.js";
import { CodexInputSubmissionError } from "./codex-input-submission-error.js";
import {
  isCodexSegmentTurnAdmissionEventName,
  resolveCodexSegmentTurnAdmission,
} from "./codex-segment-turn-admission.js";
import { logCodexSegmentTurnAdmissionRejection } from "../events/codex-thread-event-debug.js";
import { RuntimeKind } from "../../../../runtime-management/runtime-kind-enum.js";
import {
  CodexPendingMcpToolCallRegistry,
  type CodexPendingMcpToolCall,
} from "./codex-pending-mcp-tool-call-registry.js";

export type { CodexPendingMcpToolCall } from "./codex-pending-mcp-tool-call-registry.js";

const STARTUP_READY_TIMEOUT_MS = 60_000;
const isRuntimeRawEventDebugEnabled = process.env.RUNTIME_RAW_EVENT_DEBUG === "1";
const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const codexThreadEventMessageBrand: unique symbol = Symbol("CodexThreadEventMessage");
const codexThreadEventMessageBrandValue: true = true;

type BrandedThreadEventMessage<T> = Readonly<T & {
  readonly [codexThreadEventMessageBrand]: true;
}>;

export type CodexNativeAdmittedThreadEventMessage = BrandedThreadEventMessage<{
  source: "native_admitted";
  method: string;
  params: Readonly<JsonObject>;
}>;

export type CodexLocalDerivedThreadEventMessage = BrandedThreadEventMessage<{
  source: "local_derived";
  method: string;
  params: Readonly<JsonObject>;
  request_id?: string | number;
}>;

export type CodexThreadEventMessage =
  | CodexNativeAdmittedThreadEventMessage
  | CodexLocalDerivedThreadEventMessage;

export type CodexInputSubmissionResult =
  | { kind: "started"; turnId: string }
  | { kind: "steered"; turnId: string };

export class CodexThread {
  readonly runContext: CodexRunContext;
  readonly client: CodexAppServerClient;
  currentStatus: string | null;
  readonly startup: CodexThreadStartupGate;
  readonly approvalRecords: Map<string, CodexApprovalRecord>;
  private readonly pendingMcpToolCalls: CodexPendingMcpToolCallRegistry;
  readonly pendingTokenUsageUpdates: Map<string, CodexReadyTokenUsageUpdate>;
  readonly listeners: Set<(message: CodexThreadEventMessage) => void>;
  readonly unbindHandlers: Array<() => void>;
  lastTerminalTurnId: string | null;
  private inputSubmissionTail: Promise<void> = Promise.resolve();

  constructor(input: {
    runContext: CodexRunContext;
    client: CodexAppServerClient;
    currentStatus?: string | null;
    startup: CodexThreadStartupGate;
    approvalRecords?: Map<string, CodexApprovalRecord>;
    pendingMcpToolCalls?: Map<string, CodexPendingMcpToolCall>;
    pendingTokenUsageUpdates?: Map<string, CodexReadyTokenUsageUpdate>;
    listeners?: Set<(message: CodexThreadEventMessage) => void>;
    unbindHandlers?: Array<() => void>;
    lastTerminalTurnId?: string | null;
  }) {
    this.runContext = input.runContext;
    this.client = input.client;
    this.currentStatus = input.currentStatus ?? "IDLE";
    this.startup = input.startup;
    this.approvalRecords = input.approvalRecords ?? new Map();
    this.pendingMcpToolCalls = new CodexPendingMcpToolCallRegistry(input.pendingMcpToolCalls);
    this.pendingTokenUsageUpdates = input.pendingTokenUsageUpdates ?? new Map();
    this.listeners = input.listeners ?? new Set();
    this.unbindHandlers = input.unbindHandlers ?? [];
    this.lastTerminalTurnId = input.lastTerminalTurnId ?? null;
  }

  get runId(): string { return this.runContext.runId; }

  get threadId(): string { return this.runContext.runtimeContext.threadId ?? this.runId; }

  get activeTurnId(): string | null { return this.runContext.runtimeContext.activeTurnId; }

  get config() { return this.runContext.runtimeContext.codexThreadConfig; }

  get model(): string | null { return this.config.model; }

  get workingDirectory(): string { return this.config.workingDirectory; }

  get reasoningEffort(): string | null { return this.config.reasoningEffort; }

  get serviceTier(): string | null { return this.config.serviceTier ?? null; }

  subscribeAppServerMessages(listener: (message: CodexThreadEventMessage) => void): () => void {
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
    this.lastTerminalTurnId = null;
  }

  markTurnCompleted(turnId?: string | null): void {
    const completedTurnId = turnId ?? null;
    if (!completedTurnId || this.activeTurnId !== completedTurnId) {
      return;
    }
    this.currentStatus = "IDLE";
    this.lastTerminalTurnId = completedTurnId;
    this.runContext.runtimeContext.activeTurnId = null;
    this.pendingMcpToolCalls.clear();
  }

  setCurrentStatus(status: string | null): void {
    this.currentStatus = status;
    const normalizedStatus = status?.trim().toUpperCase() ?? null;
    if (normalizedStatus === "IDLE") {
      if (this.activeTurnId) {
        this.lastTerminalTurnId = this.activeTurnId;
      }
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

  submitInput(message: AgentInputUserMessage): Promise<CodexInputSubmissionResult> {
    const submission = this.inputSubmissionTail.then(() => this.performInputSubmission(message));
    this.inputSubmissionTail = submission.then(
      () => undefined,
      () => undefined,
    );
    return submission;
  }

  private async performInputSubmission(
    message: AgentInputUserMessage,
  ): Promise<CodexInputSubmissionResult> {
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
    const activeTurnId = this.activeTurnId;
    if (activeTurnId) {
      return this.steerInput(message, activeTurnId);
    }
    return this.startInput(message);
  }

  private async startInput(message: AgentInputUserMessage): Promise<CodexInputSubmissionResult> {
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

    const turnId = resolveStartedTurnId(payload);
    if (this.activeTurnId === null && this.lastTerminalTurnId !== turnId) {
      this.markTurnStarted(turnId);
    } else if (this.activeTurnId !== null && this.activeTurnId !== turnId) {
      throw new CodexInputSubmissionError(
        "CODEX_TURN_START_IDENTITY_CONFLICT",
        `Codex turn/start returned '${turnId}' while newer active turn '${this.activeTurnId}' is current.`,
      );
    }
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
    return { kind: "started", turnId };
  }

  private async steerInput(
    message: AgentInputUserMessage,
    expectedTurnId: string,
  ): Promise<CodexInputSubmissionResult> {
    let payload: unknown;
    try {
      payload = await this.client.request<unknown>("turn/steer", {
        threadId: this.threadId,
        expectedTurnId,
        input: toCodexUserInput(message),
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new CodexInputSubmissionError(
        "CODEX_TURN_STEER_REJECTED",
        `Codex turn/steer rejected input for turn '${expectedTurnId}': ${detail}`,
        { cause: error },
      );
    }

    const turnId = resolveSteeredTurnId(payload);
    if (turnId !== expectedTurnId) {
      throw new CodexInputSubmissionError(
        "CODEX_TURN_STEER_ID_MISMATCH",
        `Codex turn/steer returned '${turnId}' for expected turn '${expectedTurnId}'.`,
      );
    }
    return { kind: "steered", turnId: expectedTurnId };
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
        this.emitLocalDerivedEvent(event);
      },
    });
  }

  handleAppServerNotification(method: string, params: JsonObject): void {
    const nativeEventName = method.trim();
    let admittedParams: Readonly<JsonObject> = Object.freeze({ ...params });
    if (isCodexSegmentTurnAdmissionEventName(nativeEventName)) {
      const admission = resolveCodexSegmentTurnAdmission(
        nativeEventName,
        params,
        this.activeTurnId,
      );
      if (!admission.accepted) {
        logCodexSegmentTurnAdmissionRejection({
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          runId: this.runId,
          nativeEventName,
          reasonCode: admission.reason,
        });
        return;
      }
      admittedParams = admission.paramsWithExactTurn;
    }

    const nativeMessage = this.createNativeAdmittedEvent(nativeEventName, admittedParams);
    const handling = applyAppServerNotification(this, nativeMessage);
    for (const localEvent of handling.localDerivedEvents) {
      this.emitLocalDerivedEvent(localEvent);
    }
    if (handling.emitNativeMessage) {
      this.emitThreadEventMessage(nativeMessage);
    }
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
        this.emitLocalDerivedEvent(event);
      },
    });
  }


  emitRuntimeError(code: string, message: string): void {
    this.markRuntimeFailed();
    this.emitLocalDerivedEvent({
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
    this.emitLocalDerivedEvent({
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
    this.lastTerminalTurnId = turnId;
    this.runContext.runtimeContext.activeTurnId = null;
    this.pendingMcpToolCalls.clear();
    return true;
  }

  private markRuntimeFailed(): void {
    this.currentStatus = "ERROR";
    if (this.activeTurnId) {
      this.lastTerminalTurnId = this.activeTurnId;
    }
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

  private dispatchThreadEventMessage(
    message: CodexThreadEventMessage,
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
    this.pendingMcpToolCalls.track(call);
  }

  completePendingMcpToolCall(invocationId: string | null): CodexPendingMcpToolCall | null {
    return this.pendingMcpToolCalls.complete(invocationId);
  }

  findPendingMcpToolCall(input: {
    turnId: string | null;
    serverName: string | null;
    toolName: string | null;
  }): CodexPendingMcpToolCall | null {
    return this.pendingMcpToolCalls.find(input);
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

  private emitLocalDerivedEvent(input: CodexLocalDerivedEventInput): void {
    const message: CodexLocalDerivedThreadEventMessage = Object.freeze({
      source: "local_derived",
      method: input.method.trim(),
      params: Object.freeze({ ...input.params }),
      ...(input.request_id !== undefined ? { request_id: input.request_id } : {}),
      [codexThreadEventMessageBrand]: codexThreadEventMessageBrandValue,
    });
    this.emitThreadEventMessage(message);
  }

  private createNativeAdmittedEvent(
    method: string,
    params: Readonly<JsonObject>,
  ): CodexNativeAdmittedThreadEventMessage {
    return Object.freeze({
      source: "native_admitted",
      method,
      params,
      [codexThreadEventMessageBrand]: codexThreadEventMessageBrandValue,
    });
  }

  private emitThreadEventMessage(message: CodexThreadEventMessage): void {
    if (isRuntimeRawEventDebugEnabled) {
      console.log("[CodexEmitAppServerMessage]", {
        runId: this.runId,
        method: message.method,
        listenerCount: this.listeners.size,
        paramKeys: Object.keys(message.params ?? {}),
      });
    }
    this.dispatchThreadEventMessage(message, (error) => {
      logger.warn(`Codex app server message listener failed: ${String(error)}`);
    });
  }
}
