import { randomUUID } from "node:crypto";
import { asArray, asObject, asString } from "../claude-runtime-shared.js";
import { resolveClaudeTurnTerminalError } from "./claude-session-output-events.js";
import type { ClaudeBackgroundTaskRegistry } from "./claude-background-task-registry.js";

export type ClaudeTurnOrigin = "input" | "provider";

export type ClaudeInputDispatch =
  | Readonly<{ kind: "start_turn" }>
  | Readonly<{ kind: "append_to_active_turn"; turnId: string }>;

export type ClaudeTurnFailure = Readonly<{ code: string; message: string }>;

export type ClaudeTurnSettlement =
  | Readonly<{ kind: "completed" }>
  | Readonly<{ kind: "interrupted" }>
  | Readonly<{ kind: "error"; failure: ClaudeTurnFailure }>;

export type ClaudeInputRegistration =
  | Readonly<{ accepted: true; turnId: string; uuid: string }>
  | Readonly<{ accepted: false; code: string; message: string }>;

export type ClaudeInterruptPlan = Readonly<{ sdkInterruptRequired: boolean }>;

/** Callbacks for the session; the tracker performs no SDK calls or I/O itself. */
export interface ClaudeTurnTrackerListener {
  turnStarted(turnId: string, origin: ClaudeTurnOrigin): void;
  notice(turnId: string, content: string): void;
  turnContent(turnId: string, frame: Record<string, unknown>): void;
  turnResult(turnId: string, frame: Record<string, unknown>, isErrorResult: boolean): void;
  turnSettled(turnId: string, settlement: ClaudeTurnSettlement): void;
  anomaly(frameKind: string, reason: string): void;
}

type InputSendState = "unsent" | "sent";

type ActiveCanonicalTurn = {
  turnId: string;
  origin: ClaudeTurnOrigin;
  written: Map<string, InputSendState>;
  answered: Set<string>;
  cancelled: Set<string>;
  cliTurnOpen: boolean;
  interruptRequested: boolean;
  stopSequence: number;
  sawInterruptAbort: boolean;
  failure: ClaudeTurnFailure | null;
};

type FrameClass = "opener" | "terminal" | "content" | "task" | "ignored";

const CONTENT_FRAME_KINDS = new Set([
  "assistant",
  "user",
  "stream_event",
  "tool_progress",
  "tool_use_summary",
  "system/compact_boundary",
  "system/status",
  "system/thinking_tokens",
]);

const TASK_FRAME_KINDS = new Set([
  "system/background_tasks_changed",
  "system/task_started",
  "system/task_updated",
  "system/task_progress",
  "system/task_notification",
]);

export const resolveClaudeFrameKind = (frame: Record<string, unknown>): string => {
  const type = asString(frame.type) ?? "unknown";
  const subtype = asString(frame.subtype);
  return type === "system" && subtype ? `system/${subtype}` : type;
};

/** Frame classification from the unfiltered captures (design-spec "Frame classification"). */
export const classifyClaudeFrame = (frameKind: string): FrameClass => {
  if (frameKind === "system/init") return "opener";
  if (frameKind === "result") return "terminal";
  if (TASK_FRAME_KINDS.has(frameKind)) return "task";
  if (CONTENT_FRAME_KINDS.has(frameKind)) return "content";
  return "ignored";
};

const resolveAnsweredUuids = (frame: Record<string, unknown>): string[] => {
  const listed = asArray(frame.user_message_uuids)
    .map((entry) => asString(entry))
    .filter((entry): entry is string => entry !== null);
  if (listed.length > 0) return listed;
  const single = asString(frame.user_message_uuid);
  return single ? [single] : [];
};

const isInterruptAbortResult = (frame: Record<string, unknown>): boolean =>
  (asString(frame.terminal_reason)?.startsWith("aborted") ?? false) ||
  asString(frame.subtype) === "error_during_execution";

const resolveResultFailure = (frame: Record<string, unknown>): ClaudeTurnFailure | null => {
  const terminalError = resolveClaudeTurnTerminalError(frame);
  if (terminalError) return terminalError;
  const subtype = asString(frame.subtype);
  return subtype && subtype !== "success"
    ? { code: "CLAUDE_RUNTIME_RESULT_ERROR", message: `Claude turn ended with '${subtype}'.` }
    : null;
};

/**
 * Single owner of canonical AgentRun turn identity for one Claude session. A canonical
 * turn opens on a `start_turn` input or on `system/init` while idle (provider-initiated),
 * may span several CLI turns, and settles once no CLI turn is open and every written
 * input uuid is answered or cancelled.
 */
export class ClaudeTurnTracker {
  private active: ActiveCanonicalTurn | null = null;
  private readonly settleWaiters = new Map<string, Array<() => void>>();
  private readonly createUuid: () => string;
  private readonly createTurnId: () => string;

  constructor(
    private readonly input: {
      runId: string;
      listener: ClaudeTurnTrackerListener;
      registry: ClaudeBackgroundTaskRegistry;
      createUuid?: () => string;
      createTurnId?: () => string;
    },
  ) {
    this.createUuid = input.createUuid ?? randomUUID;
    this.createTurnId = input.createTurnId ?? (() => `${input.runId}:turn:${randomUUID()}`);
  }

  get activeTurnId(): string | null {
    return this.active?.turnId ?? null;
  }

  get isInterruptRequested(): boolean {
    return this.active?.interruptRequested ?? false;
  }

  /** Runs synchronously before any await in `submitInput`; may open a canonical turn. */
  registerInput(dispatch: ClaudeInputDispatch): ClaudeInputRegistration {
    const turn = this.active;
    if (dispatch.kind === "start_turn") {
      if (!turn) {
        const uuid = this.createUuid();
        const opened = this.openTurn("input", false);
        opened.written.set(uuid, "unsent");
        this.input.listener.turnStarted(opened.turnId, "input");
        return { accepted: true, turnId: opened.turnId, uuid };
      }
      if (turn.interruptRequested) {
        return {
          accepted: false,
          code: "CLAUDE_TURN_INTERRUPTING",
          message: `Claude turn '${turn.turnId}' is being interrupted.`,
        };
      }
      // AgentRun raced a provider-initiated turn it has not observed yet: join it.
      return this.addInput(turn);
    }
    if (!turn || turn.turnId !== dispatch.turnId || turn.interruptRequested) {
      return this.rejectAppend(
        `Claude append expected active turn '${dispatch.turnId}' but '${turn?.turnId ?? "none"}' is current` +
          (turn?.interruptRequested ? " and being interrupted." : "."),
      );
    }
    return this.addInput(turn);
  }

  markSent(uuid: string): void {
    if (this.active?.written.get(uuid) === "unsent") {
      this.active.written.set(uuid, "sent");
    }
  }

  /** True when `uuid` must not be written anymore (cancelled locally or its turn settled). */
  isSendCancelled(uuid: string): boolean {
    const turn = this.active;
    return !turn || !turn.written.has(uuid) || turn.cancelled.has(uuid) || turn.answered.has(uuid);
  }

  /** Open/build/send failed after `registerInput` for this uuid. */
  failInput(uuid: string, failure: ClaudeTurnFailure, processOpen: boolean): void {
    const turn = this.active;
    if (!turn || !turn.written.has(uuid) || this.isAccounted(turn, uuid)) {
      return;
    }
    const otherLiveWork = turn.cliTurnOpen || [...turn.written].some(
      ([other, state]) => other !== uuid && state === "sent" && !this.isAccounted(turn, other),
    );
    if (processOpen && otherLiveWork) {
      // The CLI still owns other input of this turn; account the failed uuid and continue.
      turn.cancelled.add(uuid);
      this.input.listener.anomaly("input", `input ${uuid} failed before send: ${failure.message}`);
      this.evaluateSettlement();
      return;
    }
    this.settle(turn, { kind: "error", failure });
  }

  /**
   * IC-1: cancels unsent uuids locally; the SDK interrupt is needed unless no uuid of the
   * turn was ever sent and no CLI turn is open.
   */
  requestInterrupt(turnId: string): ClaudeInterruptPlan {
    const turn = this.requireActive(turnId);
    if (!turn.interruptRequested) {
      turn.interruptRequested = true;
      turn.stopSequence = this.input.registry.currentSequence;
    }
    let anySent = false;
    for (const [uuid, state] of turn.written) {
      if (state === "sent") {
        anySent = true;
      } else if (!this.isAccounted(turn, uuid)) {
        turn.cancelled.add(uuid);
      }
    }
    const sdkInterruptRequired = anySent || turn.cliTurnOpen;
    if (!sdkInterruptRequired) {
      this.evaluateSettlement();
    }
    return { sdkInterruptRequired };
  }

  applyInterruptResponse(turnId: string, cancelledUuids: readonly string[]): void {
    const turn = this.active;
    if (!turn || turn.turnId !== turnId) {
      return;
    }
    for (const uuid of cancelledUuids) {
      if (turn.written.has(uuid)) turn.cancelled.add(uuid); // unknown uuids are ignored (SDK doc)
    }
    this.evaluateSettlement();
  }

  observe(rawFrame: unknown): void {
    const frame = asObject(rawFrame);
    if (!frame) {
      return;
    }
    const frameKind = resolveClaudeFrameKind(frame);
    switch (classifyClaudeFrame(frameKind)) {
      case "opener":
        this.observeOpener();
        return;
      case "terminal":
        this.observeResult(frame);
        return;
      case "task":
        this.input.registry.observeTaskFrame(frame);
        return;
      case "content":
        this.observeContent(frameKind, frame);
        return;
      default:
        return;
    }
  }

  /** The CLI process ended unexpectedly. */
  processExited(failure: ClaudeTurnFailure): void {
    const turn = this.active;
    this.input.registry.clear();
    if (turn) {
      this.settle(turn, { kind: "error", failure });
    }
  }

  /** The run is closing; the process and its background tasks go with it. */
  close(): void {
    const turn = this.active;
    if (turn) {
      this.settle(turn, { kind: "interrupted" });
    }
    this.input.registry.clear();
  }

  whenSettled(turnId: string): Promise<void> {
    if (this.active?.turnId !== turnId) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      const waiters = this.settleWaiters.get(turnId) ?? [];
      waiters.push(resolve);
      this.settleWaiters.set(turnId, waiters);
    });
  }

  private observeOpener(): void {
    this.input.registry.beginCliTurn();
    if (this.active) {
      this.active.cliTurnOpen = true;
      return;
    }
    const turn = this.openTurn("provider", true);
    this.input.listener.turnStarted(turn.turnId, "provider");
    this.input.listener.notice(turn.turnId, this.input.registry.drainForProviderTurn());
  }

  private observeResult(frame: Record<string, unknown>): void {
    const turn = this.active;
    this.input.registry.endCliTurn(frame.origin);
    if (!turn) {
      this.input.listener.anomaly("result", "result frame while no canonical turn is active");
      return;
    }
    for (const uuid of resolveAnsweredUuids(frame)) {
      turn.answered.add(uuid);
    }
    turn.cliTurnOpen = false;
    const interruptAbort = turn.interruptRequested && isInterruptAbortResult(frame);
    const failure = interruptAbort ? null : resolveResultFailure(frame);
    if (interruptAbort) {
      turn.sawInterruptAbort = true;
    } else if (failure && !turn.failure) {
      turn.failure = failure;
    }
    this.input.listener.turnResult(turn.turnId, frame, interruptAbort || failure !== null);
    this.evaluateSettlement();
  }

  private observeContent(frameKind: string, frame: Record<string, unknown>): void {
    const turn = this.active;
    if (!turn) {
      this.input.listener.anomaly(frameKind, "content frame while no canonical turn is active");
      return;
    }
    if (frameKind === "user" || frameKind === "assistant") {
      this.input.registry.observeConversationFrame(frameKind, turn.interruptRequested);
    }
    this.input.listener.turnContent(turn.turnId, frame);
  }

  private evaluateSettlement(): void {
    const turn = this.active;
    if (!turn || turn.cliTurnOpen) {
      return;
    }
    for (const uuid of turn.written.keys()) {
      if (!this.isAccounted(turn, uuid)) return;
    }
    if (turn.failure) {
      this.settle(turn, { kind: "error", failure: turn.failure });
    } else if (turn.interruptRequested && (turn.cancelled.size > 0 || turn.sawInterruptAbort)) {
      this.settle(turn, { kind: "interrupted" });
    } else {
      this.settle(turn, { kind: "completed" });
    }
  }

  private settle(turn: ActiveCanonicalTurn, settlement: ClaudeTurnSettlement): void {
    if (this.active !== turn) {
      return;
    }
    this.active = null;
    if (settlement.kind === "interrupted") {
      const stoppedNotice = this.input.registry.announceStopped(turn.stopSequence);
      if (stoppedNotice) this.input.listener.notice(turn.turnId, stoppedNotice);
    }
    this.input.listener.turnSettled(turn.turnId, settlement);
    const waiters = this.settleWaiters.get(turn.turnId) ?? [];
    this.settleWaiters.delete(turn.turnId);
    for (const resolve of waiters) resolve();
  }

  private openTurn(origin: ClaudeTurnOrigin, cliTurnOpen: boolean): ActiveCanonicalTurn {
    const turn: ActiveCanonicalTurn = {
      turnId: this.createTurnId(),
      origin,
      written: new Map(),
      answered: new Set(),
      cancelled: new Set(),
      cliTurnOpen,
      interruptRequested: false,
      stopSequence: 0,
      sawInterruptAbort: false,
      failure: null,
    };
    this.active = turn;
    return turn;
  }

  private addInput(turn: ActiveCanonicalTurn): ClaudeInputRegistration {
    const uuid = this.createUuid();
    turn.written.set(uuid, "unsent");
    return { accepted: true, turnId: turn.turnId, uuid };
  }

  private rejectAppend(message: string): ClaudeInputRegistration {
    return { accepted: false, code: "CLAUDE_APPEND_TURN_MISMATCH", message };
  }

  private requireActive(turnId: string): ActiveCanonicalTurn {
    const turn = this.active;
    if (!turn) {
      throw new Error(`Claude run '${this.input.runId}' has no active turn '${turnId}' to interrupt.`);
    }
    if (turn.turnId !== turnId) {
      throw new Error(`Claude active turn is '${turn.turnId}', not '${turnId}'.`);
    }
    return turn;
  }

  private isAccounted(turn: ActiveCanonicalTurn, uuid: string): boolean {
    return turn.answered.has(uuid) || turn.cancelled.has(uuid);
  }
}
