import {
  type ContentBlock,
  type LoadSessionRequest,
  type NewSessionRequest,
  type NewSessionResponse,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type SessionNotification,
} from "@agentclientprotocol/sdk";
import { AgentRunEventType, type AgentRunEvent } from "../../../domain/agent-run-event.js";
import type { AcpClientConnection, AcpSessionFrameHandler } from "../../../../runtime-management/acp/acp-client-connection.js";
import { describeAcpError } from "../../../../runtime-management/acp/acp-error-message.js";
import type { AcpAgentSessionProfile, AcpMcpReadinessRequirement, AcpMcpServerStatus } from "../acp-agent-session-profile.js";
import { AcpSessionUpdateConverter } from "../events/acp-session-update-converter.js";
import { AcpPermissionBridge } from "./acp-permission-bridge.js";

export const ACP_TURN_IDLE_TIMEOUT_MS = 300_000;
const CANCELLED: RequestPermissionResponse = { outcome: { outcome: "cancelled" } };

export type AcpSessionState =
  | "created" | "opening_new" | "opening_load" | "ready" | "prompting" | "cancelling" | "failed" | "closed";

export type AcpSessionFailure = Readonly<{ code: string; message: string }>;

export type AcpApprovalResult =
  | Readonly<{ accepted: true }>
  | Readonly<{ accepted: false; code: string; message: string }>;

export type AcpAgentSessionOptions = Readonly<{
  runId: string;
  connection: AcpClientConnection;
  profile: AcpAgentSessionProfile;
  model: string;
  autoExecuteTools: boolean;
  /** Receives converted events in frame order. */
  emit: (events: AgentRunEvent[]) => void;
  onFailed: (failure: AcpSessionFailure) => void;
  idleTimeoutMs?: number;
}>;

type McpWaiter = Readonly<{ serverName: string; resolve: () => void; reject: (error: Error) => void }>;

/**
 * One ACP session: `created -> opening(new|load) -> ready -> prompting -> ready`, with
 * `prompting -> cancelling -> ready`, and any state to `failed` or `closed`. Suppresses the
 * history `session/load` replays, runs the turn idle timer, and answers every permission
 * request.
 */
export class AcpAgentSession implements AcpSessionFrameHandler {
  private currentState: AcpSessionState = "created";
  private id: string | null = null;
  private callOrdinal = 1;
  /** The user answered reject-once in the current turn (input to `cancelled` classification). */
  private userDeniedInTurn = false;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly converter: AcpSessionUpdateConverter;
  private readonly bridge = new AcpPermissionBridge();
  private readonly mcpStatuses = new Map<string, Readonly<{ status: AcpMcpServerStatus }>>();
  private readonly mcpWaiters = new Set<McpWaiter>();
  private readonly idleTimeoutMs: number;
  private readonly unsubscribeClose: () => void;

  constructor(private readonly options: AcpAgentSessionOptions) {
    this.converter = new AcpSessionUpdateConverter(options.runId, options.profile);
    this.idleTimeoutMs = options.idleTimeoutMs ?? ACP_TURN_IDLE_TIMEOUT_MS;
    this.unsubscribeClose = options.connection.onClose((close) =>
      this.fail({ code: close.code, message: `${options.connection.agentLabel} stopped unexpectedly.` }));
  }

  get state(): AcpSessionState { return this.currentState; }
  get sessionId(): string | null { return this.id; }
  get activeTurnId(): string | null { return this.converter.activeTurnId; }

  async openNew(request: NewSessionRequest): Promise<NewSessionResponse> {
    this.transition("created", "opening_new");
    const response = await this.options.connection.newSession(request);
    this.id = response.sessionId;
    // Flushes frames the connection buffered while the id was unknown (e.g. MCP status).
    this.options.connection.registerSession(response.sessionId, this);
    this.finishOpening("opening_new");
    return response;
  }

  /** Loads an existing session; the history it replays before responding is discarded. */
  async openLoad(request: LoadSessionRequest): Promise<void> {
    this.transition("created", "opening_load");
    this.id = request.sessionId;
    this.options.connection.registerSession(request.sessionId, this);
    await this.options.connection.loadSession(request);
    this.finishOpening("opening_load");
  }

  awaitMcpServerReady(requirement: AcpMcpReadinessRequirement): Promise<void> {
    const label = this.options.connection.agentLabel;
    return new Promise<void>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | null = null;
      const waiter: McpWaiter = {
        serverName: requirement.serverName,
        resolve: () => { if (timer) clearTimeout(timer); this.mcpWaiters.delete(waiter); resolve(); },
        reject: (error) => { if (timer) clearTimeout(timer); this.mcpWaiters.delete(waiter); reject(error); },
      };
      this.mcpWaiters.add(waiter);
      timer = setTimeout(() => waiter.reject(new Error(
        `ACP_MCP_SERVER_NOT_READY: ${label} did not report MCP server '${requirement.serverName}' ready.`)),
      requirement.timeoutMs);
      this.settleMcpWaiter(waiter);
    });
  }

  /** Starts a turn and sends the prompt; the turn ends through the prompt result. */
  startTurn(turnId: string, prompt: ContentBlock[]): AgentRunEvent[] {
    const sessionId = this.requireReady();
    this.currentState = "prompting";
    this.callOrdinal = 1;
    this.userDeniedInTurn = false;
    const started = this.converter.startTurn(turnId);
    this.refreshIdleTimer();
    void this.options.connection.prompt({ sessionId, prompt }).then(
      (response) => this.finishTurn(turnId, () => this.endTurnFor(response.stopReason)),
      (error: unknown) => this.finishTurn(turnId, () => this.converter.failTurn("ACP_PROMPT_FAILED", describeAcpError(error))),
    );
    return started;
  }

  /** Cancels the active turn: pending permissions are answered `cancelled`, then `session/cancel`. */
  async cancel(turnId: string): Promise<boolean> {
    if (this.currentState !== "prompting" || this.converter.activeTurnId !== turnId || !this.id) return false;
    this.currentState = "cancelling";
    this.bridge.cancelAll();
    await this.options.connection.cancel(this.id);
    return true;
  }

  approve(toolCallId: string, approved: boolean, reason: string | null): AcpApprovalResult {
    const result = this.bridge.decide(toolCallId, approved);
    if (result.kind === "not_pending") {
      return { accepted: false, code: "TOOL_APPROVAL_NOT_PENDING", message: `No pending approval for tool call '${toolCallId}'.` };
    }
    if (result.kind === "option_unavailable") {
      return { accepted: false, code: "TOOL_APPROVAL_OPTION_UNAVAILABLE", message: "The agent offered no one-time approval for this tool call." };
    }
    if (result.outcome === "rejected") this.userDeniedInTurn = true;
    this.options.emit(approved
      ? this.converter.approved(toolCallId, reason)
      : this.converter.denied(toolCallId, reason ?? "Tool execution denied by user."));
    this.refreshIdleTimer();
    return { accepted: true };
  }

  /** Closes the session; an active turn is reported interrupted. */
  close(): AgentRunEvent[] {
    if (this.currentState === "closed") return [];
    const wasFailed = this.currentState === "failed";
    this.currentState = "closed";
    this.teardown(new Error("ACP_SESSION_CLOSED"));
    return wasFailed ? [] : this.converter.interruptTurn();
  }

  onSessionUpdate(notification: SessionNotification): void {
    if (this.currentState === "opening_load") return;
    if (!this.isInTurn()) return;
    this.options.emit(this.converter.convertUpdate(notification.update));
    this.refreshIdleTimer();
  }

  onExtNotification(method: string, params: Record<string, unknown>): void {
    const sessionId = this.id;
    if (!sessionId || this.currentState === "failed" || this.currentState === "closed") return;
    let effects;
    try {
      effects = this.options.profile.interpretExtNotification(method, params, {
        sessionId, turnId: this.converter.activeTurnId, callOrdinal: this.callOrdinal, model: this.options.model,
      });
    } catch {
      return; // Unknown or malformed extension traffic never fails a run.
    }
    for (const effect of effects) {
      if (effect.kind === "mcp_status") {
        this.mcpStatuses.set(effect.server, { status: effect.status });
        for (const waiter of [...this.mcpWaiters]) this.settleMcpWaiter(waiter);
      } else if (!this.isInTurn()) {
        // Usage and compaction apply only within a turn; `session/load` replays are dropped.
        continue;
      } else if (effect.kind === "compaction") {
        this.options.emit(this.converter.compaction(sessionId, effect));
      } else {
        this.options.emit(this.converter.usage(effect.payload));
        this.callOrdinal += 1;
      }
    }
    if (this.isInTurn()) this.refreshIdleTimer();
  }

  async onPermissionRequest(request: RequestPermissionRequest): Promise<RequestPermissionResponse> {
    if (this.currentState !== "prompting") return CANCELLED;
    const observed = this.converter.observePermissionToolCall(request.toolCall);
    if (!observed) return CANCELLED;
    this.options.emit(observed.events);
    const toolCallId = request.toolCall.toolCallId;
    if (this.options.autoExecuteTools) {
      const response = AcpPermissionBridge.selectOnce(request.options, true);
      if (!response) return CANCELLED;
      this.options.emit(this.converter.approved(toolCallId, "auto_execute_tools_enabled"));
      return response;
    }
    const decision = this.bridge.pend(toolCallId, request.options);
    this.options.emit(this.converter.approvalRequested(toolCallId));
    this.refreshIdleTimer();
    return decision;
  }

  /**
   * `cancelled` is classified by state, interrupt first: a user interrupt (`cancelling`) is
   * interrupted; an agent that ends its turn after the user rejected a permission in this turn
   * completed it; any other agent-side cancel stays interrupted.
   */
  private endTurnFor(stopReason: string): AgentRunEvent[] {
    if (stopReason !== "cancelled") return this.converter.completeTurn(stopReason);
    if (this.currentState === "cancelling" || !this.userDeniedInTurn) return this.converter.interruptTurn();
    return this.converter.completeTurn(stopReason);
  }

  private finishTurn(turnId: string, build: () => AgentRunEvent[]): void {
    if (!this.isInTurn() || this.converter.activeTurnId !== turnId) return;
    const events = build();
    this.currentState = "ready";
    this.clearIdleTimer();
    this.bridge.cancelAll();
    this.options.emit(events);
  }

  private fail(failure: AcpSessionFailure): void {
    if (this.currentState === "failed" || this.currentState === "closed") return;
    this.currentState = "failed";
    this.teardown(new Error(`${failure.code}: ${failure.message}`));
    this.options.emit([
      ...this.converter.interruptTurn(),
      {
        eventType: AgentRunEventType.ERROR, runId: this.options.runId, statusHint: "ERROR",
        payload: { code: failure.code, message: failure.message, error_scope: "runtime", error_effect: "terminal" },
      },
    ]);
    this.options.onFailed(failure);
  }

  private teardown(reason: Error): void {
    this.clearIdleTimer();
    this.bridge.cancelAll();
    for (const waiter of [...this.mcpWaiters]) waiter.reject(reason);
    this.unsubscribeClose();
    if (this.id) this.options.connection.unregisterSession(this.id);
  }

  private settleMcpWaiter(waiter: McpWaiter): void {
    const status = this.mcpStatuses.get(waiter.serverName)?.status;
    if (status === "ready") waiter.resolve();
    else if (status === "unavailable") waiter.reject(new Error(
      `ACP_MCP_SERVER_UNAVAILABLE: ${this.options.connection.agentLabel} reported MCP server '${waiter.serverName}' unavailable.`));
  }

  private finishOpening(from: "opening_new" | "opening_load"): void {
    if (this.currentState !== from) throw new Error(`ACP_SESSION_OPEN_ABORTED: session is ${this.currentState}.`);
    this.currentState = "ready";
  }

  private transition(from: AcpSessionState, to: AcpSessionState): void {
    if (this.currentState !== from) throw new Error(`ACP_SESSION_STATE_INVALID: expected ${from}, was ${this.currentState}.`);
    this.currentState = to;
  }

  private requireReady(): string {
    if (this.currentState !== "ready" || !this.id) throw new Error(`ACP_SESSION_NOT_READY: session is ${this.currentState}.`);
    return this.id;
  }

  private isInTurn(): boolean {
    return this.currentState === "prompting" || this.currentState === "cancelling";
  }

  /** Armed only while a turn waits on the agent with no tool call pending or in progress. */
  private refreshIdleTimer(): void {
    this.clearIdleTimer();
    if (!this.isInTurn() || this.converter.hasOpenToolCall()) return;
    this.idleTimer = setTimeout(() => this.fail({
      code: "ACP_TURN_IDLE_TIMEOUT",
      message: `${this.options.connection.agentLabel} sent no turn activity for ${Math.round(this.idleTimeoutMs / 1000)} seconds.`,
    }), this.idleTimeoutMs);
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }
}
