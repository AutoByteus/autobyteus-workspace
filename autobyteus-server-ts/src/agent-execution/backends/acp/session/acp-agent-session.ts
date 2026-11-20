import { randomUUID } from "node:crypto";
import {
  type ContentBlock,
  type LoadSessionRequest,
  type LoadSessionResponse,
  type NewSessionRequest,
  type NewSessionResponse,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type ResumeSessionRequest,
  type ResumeSessionResponse,
  type SessionConfigOption,
  type SessionNotification,
} from "@agentclientprotocol/sdk";
import { AgentRunEventType, type AgentRunEvent } from "../../../domain/agent-run-event.js";
import type { AcpClientConnection, AcpSessionFrameHandler } from "../../../../runtime-management/acp/acp-client-connection.js";
import { describeAcpError } from "../../../../runtime-management/acp/acp-error-message.js";
import type { ProviderCallObservation } from "../../../../credential-proxy/provider-relays/provider-call-observation.js";
import type {
  AcpAgentSessionProfile,
  AcpConfigSelection,
  AcpMcpReadinessRequirement,
  AcpMcpServerStatus,
  AcpPromptNotice,
  AcpSessionEffect,
} from "../acp-agent-session-profile.js";
import { AcpSessionUpdateConverter } from "../events/acp-session-update-converter.js";
import { AcpPermissionBridge } from "./acp-permission-bridge.js";
import { ModelCallRequestBoundary } from "../../shared/model-call-request-boundary.js";
import type { ModelCallThroughput } from "../../../domain/model-call-throughput.js";

export const ACP_TURN_IDLE_TIMEOUT_MS = 300_000;
const CANCELLED: RequestPermissionResponse = { outcome: { outcome: "cancelled" } };

export type AcpSessionState =
  | "created" | "opening_new" | "opening_load" | "opening_resume" | "ready" | "prompting" | "cancelling" | "failed" | "closed";

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
  /** Frame receipt clock in milliseconds for model-call timing; defaults to `Date.now`. */
  now?: () => number;
}>;

type McpWaiter = Readonly<{ serverName: string; resolve: () => void; reject: (error: Error) => void }>;

/**
 * Who started a turn: `input`, a prompt this client sent (`session/prompt`, ended by its response), or `provider`, a
 * prompt the agent runtime started itself (e.g. after a background command ended), ended by its `prompt_completed`.
 */
export type AcpTurnOrigin = "input" | "provider";

/** The agent's prompt behind the active turn, as its `prompt_running` / `prompt_completed` signals report it. */
type ActivePrompt =
  | Readonly<{ origin: "input"; promptId: string | null; completed: boolean }>
  | Readonly<{ origin: "provider"; promptId: string }>;

type PendingProviderPrompt = Readonly<{ promptId: string; notice: AcpPromptNotice | null }>;

/**
 * One ACP session: `created -> opening(new|load|resume) -> ready -> prompting -> ready`, with
 * `prompting -> cancelling -> ready`, and any state to `failed` or `closed`. Suppresses the
 * history `session/load` replays, runs the turn idle timer, applies the effects of agent
 * extension notifications and provider calls, and answers every permission request.
 *
 * It owns the turn lifecycle of both origins (`AcpTurnOrigin`). From the agent's prompt signals: in `ready`, a
 * `prompt_running` opens a provider turn with its notice; in an input turn, the first `prompt_running` names the
 * input prompt and a different prompt that runs after the input prompt completed is pending. At the input prompt's
 * response a pending prompt is handed over in one batch (input end + provider start + notice), so the run never reads
 * idle between the two turns and held input stays held. A provider turn ends on its own `prompt_completed`.
 */
export class AcpAgentSession implements AcpSessionFrameHandler {
  private currentState: AcpSessionState = "created";
  private id: string | null = null;
  private callOrdinal = 1;
  /** The user answered reject-once in the current turn (input to `cancelled` classification). */
  private userDeniedInTurn = false;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  /** The prompt behind the active turn; null without a turn. */
  private activePrompt: ActivePrompt | null = null;
  /** A prompt the agent started after the input prompt completed, opened at the input prompt's response. */
  private pendingProviderPrompt: PendingProviderPrompt | null = null;
  private readonly converter: AcpSessionUpdateConverter;
  private readonly bridge = new AcpPermissionBridge();
  private readonly mcpStatuses = new Map<string, Readonly<{ status: AcpMcpServerStatus }>>();
  private readonly mcpWaiters = new Set<McpWaiter>();
  private readonly idleTimeoutMs: number;
  private readonly unsubscribeClose: () => void;
  /**
   * End-to-end model-call timing (DEC-002): chunks arrive in bursts, so only the request
   * boundary (prompt send, the previous call's usage, a finished tool) to the usage effect is used.
   */
  private readonly callBoundary = new ModelCallRequestBoundary();
  private readonly now: () => number;

  constructor(private readonly options: AcpAgentSessionOptions) {
    this.converter = new AcpSessionUpdateConverter(options.runId, options.profile);
    this.idleTimeoutMs = options.idleTimeoutMs ?? ACP_TURN_IDLE_TIMEOUT_MS;
    this.now = options.now ?? Date.now;
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
  async openLoad(request: LoadSessionRequest): Promise<LoadSessionResponse> {
    this.transition("created", "opening_load");
    this.id = request.sessionId;
    this.options.connection.registerSession(request.sessionId, this);
    const response = await this.options.connection.loadSession(request);
    this.finishOpening("opening_load");
    return response;
  }

  /** Resumes an existing session; the agent replays no history. */
  async openResume(request: ResumeSessionRequest): Promise<ResumeSessionResponse> {
    this.transition("created", "opening_resume");
    this.id = request.sessionId;
    this.options.connection.registerSession(request.sessionId, this);
    const response = await this.options.connection.resumeSession(request);
    this.finishOpening("opening_resume");
    return response;
  }

  /** Selects the run's model and effort among the options the open session offers, in the profile's order. */
  async applyConfigSelection(selection: AcpConfigSelection, configOptions: readonly SessionConfigOption[]): Promise<void> {
    const sessionId = this.requireReady();
    for (const { configId, value } of this.options.profile.configSelection(selection, configOptions)) {
      await this.options.connection.setSessionConfigOption({ sessionId, configId, value });
    }
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

  /** Starts an input turn and sends the prompt; the turn ends through the prompt result. */
  startTurn(turnId: string, prompt: ContentBlock[]): AgentRunEvent[] {
    const sessionId = this.requireReady();
    const started = this.openTurn(turnId, { origin: "input", promptId: null, completed: false });
    void this.options.connection.prompt({ sessionId, prompt }).then(
      (response) => this.finishTurn(turnId, () => this.endTurnFor(response.stopReason)),
      (error: unknown) => this.finishTurn(turnId, () => this.converter.failTurn("ACP_PROMPT_FAILED", describeAcpError(error))),
    );
    return started;
  }

  /** Cancels the active turn of either origin: pending permissions are answered `cancelled`, then `session/cancel`. */
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
    this.clearPrompts();
    return wasFailed ? [] : this.converter.interruptTurn();
  }

  onSessionUpdate(notification: SessionNotification): void {
    if (this.currentState === "opening_load") return;
    if (!this.isInTurn()) return;
    this.observeCallBoundary(notification.update);
    this.options.emit(this.converter.convertUpdate(notification.update));
    this.refreshIdleTimer();
  }

  onExtNotification(method: string, params: Record<string, unknown>): void {
    const sessionId = this.id;
    if (!sessionId || this.currentState === "failed" || this.currentState === "closed") return;
    let effects: AcpSessionEffect[];
    try {
      effects = this.options.profile.interpretExtNotification(method, params, this.effectContext(sessionId));
    } catch {
      return; // Unknown or malformed extension traffic never fails a run.
    }
    this.applyEffects(sessionId, effects);
    if (this.isInTurn()) this.refreshIdleTimer();
  }

  /** One provider call of this session's run, reported by its provider relay. */
  onProviderCall(observation: ProviderCallObservation): void {
    const sessionId = this.id;
    const interpret = this.options.profile.interpretProviderCall;
    if (!sessionId || !interpret || this.currentState === "failed" || this.currentState === "closed") return;
    let effects: AcpSessionEffect[];
    try {
      effects = interpret(observation, this.effectContext(sessionId));
    } catch {
      return; // A malformed report never fails a run.
    }
    this.applyEffects(sessionId, effects);
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

  private effectContext(sessionId: string) {
    return { sessionId, turnId: this.converter.activeTurnId, callOrdinal: this.callOrdinal, model: this.options.model };
  }

  /**
   * MCP readiness and the agent's prompt signals apply at any time; usage, compaction and activity only within a turn
   * (`session/load` replays are dropped).
   */
  private applyEffects(sessionId: string, effects: readonly AcpSessionEffect[]): void {
    let active = false;
    for (const effect of effects) {
      if (effect.kind === "mcp_status") {
        this.mcpStatuses.set(effect.server, { status: effect.status });
        for (const waiter of [...this.mcpWaiters]) this.settleMcpWaiter(waiter);
      } else if (effect.kind === "prompt_running") {
        this.onPromptRunning(effect.promptId, effect.notice);
      } else if (effect.kind === "prompt_completed") {
        this.onPromptCompleted(effect.promptId, effect.stopReason);
      } else if (!this.isInTurn()) {
        continue;
      } else if (effect.kind === "activity") {
        active = true;
      } else if (effect.kind === "compaction") {
        this.options.emit(this.converter.compaction(sessionId, effect));
      } else {
        this.options.emit(this.converter.usage(this.withCallThroughput(effect.payload)));
        this.callOrdinal += 1;
      }
    }
    if (active) this.refreshIdleTimer();
  }

  /**
   * The call's first agent chunk freezes its request boundary; a finished tool opens the next
   * one. A `tool_call` itself is not call output: an agent may announce it after the call's usage.
   */
  private observeCallBoundary(update: SessionNotification["update"]): void {
    if (update.sessionUpdate === "agent_message_chunk" || update.sessionUpdate === "agent_thought_chunk") {
      this.callBoundary.markOutput();
    } else if (update.sessionUpdate === "tool_call_update" &&
      (update.status === "completed" || update.status === "failed")) {
      this.callBoundary.markBoundary(this.now());
    }
  }

  private withCallThroughput(payload: Record<string, unknown>): Record<string, unknown> {
    if (payload.reports_model_call !== true) return payload;
    const completedAtMs = this.now();
    const requestStartAtMs = this.callBoundary.completeCall(completedAtMs);
    const outputTokens = payload.reported_output_tokens;
    if (requestStartAtMs === null || typeof outputTokens !== "number") return payload;
    const outputThroughput: ModelCallThroughput = {
      method: "end_to_end", output_tokens: outputTokens, duration_ms: completedAtMs - requestStartAtMs,
    };
    return { ...payload, output_throughput: outputThroughput };
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

  /**
   * The one opening step of both origins: `prompting`, a fresh call ordinal and call boundary, `TURN_STARTED`, the
   * idle timer. An input turn then sends its prompt; a provider turn adds its notice to the same batch.
   */
  private openTurn(turnId: string, prompt: ActivePrompt): AgentRunEvent[] {
    this.currentState = "prompting";
    this.activePrompt = prompt;
    this.callOrdinal = 1;
    this.userDeniedInTurn = false;
    const started = this.converter.startTurn(turnId);
    this.callBoundary.reset();
    this.callBoundary.markBoundary(this.now());
    this.refreshIdleTimer();
    return started;
  }

  /** A provider turn: TURN_STARTED and the notice of what woke the agent. The session allocates its turn id. */
  private openProviderTurn(prompt: PendingProviderPrompt): AgentRunEvent[] {
    const events = this.openTurn(randomUUID(), { origin: "provider", promptId: prompt.promptId });
    if (prompt.notice) events.push(...this.converter.notice(prompt.notice.content, prompt.notice.senderId));
    return events;
  }

  /**
   * The agent runs a prompt. In `ready` it is one the agent started itself: open a provider turn. In an input turn the
   * first one is the input prompt; a different one after the input prompt completed is the agent's next prompt,
   * pending until the input prompt's response (the latest wins). Before that point a different id is ignored: the
   * agent runs one prompt at a time.
   */
  private onPromptRunning(promptId: string, notice: AcpPromptNotice | null): void {
    if (this.currentState === "ready") {
      this.options.emit(this.openProviderTurn({ promptId, notice }));
      return;
    }
    const active = this.activePrompt;
    if (!this.isInTurn() || active?.origin !== "input") return;
    if (active.promptId === null) {
      this.activePrompt = { ...active, promptId };
    } else if (active.completed && promptId !== active.promptId) {
      this.pendingProviderPrompt = { promptId, notice };
    }
  }

  /**
   * A prompt ended. The input prompt's end is only marked (its turn ends at the `session/prompt` response); a pending
   * prompt that ended before that response is dropped; a provider turn ends on its own prompt's end.
   */
  private onPromptCompleted(promptId: string, stopReason: string): void {
    const active = this.activePrompt;
    if (!this.isInTurn() || !active) return;
    if (active.origin === "provider") {
      const turnId = this.converter.activeTurnId;
      if (active.promptId === promptId && turnId) this.finishTurn(turnId, () => this.endTurnFor(stopReason));
    } else if (active.promptId === promptId) {
      this.activePrompt = { ...active, completed: true };
    } else if (this.pendingProviderPrompt?.promptId === promptId) {
      this.pendingProviderPrompt = null;
    }
  }

  /**
   * Ends the active turn. An input turn with a pending provider prompt hands over in the same batch: the input turn's
   * end, then the provider turn's start and notice, staying `prompting` (AgentRun never sees the run idle in between).
   */
  private finishTurn(turnId: string, build: () => AgentRunEvent[]): void {
    if (!this.isInTurn() || this.converter.activeTurnId !== turnId) return;
    const events = build();
    const handOver = this.activePrompt?.origin === "input" ? this.pendingProviderPrompt : null;
    this.clearPrompts();
    this.bridge.cancelAll();
    if (handOver) {
      events.push(...this.openProviderTurn(handOver));
    } else {
      this.currentState = "ready";
      this.clearIdleTimer();
    }
    this.options.emit(events);
  }

  private clearPrompts(): void {
    this.activePrompt = null;
    this.pendingProviderPrompt = null;
  }

  private fail(failure: AcpSessionFailure): void {
    if (this.currentState === "failed" || this.currentState === "closed") return;
    this.currentState = "failed";
    this.teardown(new Error(`${failure.code}: ${failure.message}`));
    this.clearPrompts();
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

  private finishOpening(from: "opening_new" | "opening_load" | "opening_resume"): void {
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
