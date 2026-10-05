import type { AgentOperationResult } from "./agent-operation-result.js";

/** How long a rejected interrupt waits for the run to become quiescent before the attempt fails. */
export const ROOT_SHUTDOWN_REJECTED_INTERRUPT_QUIESCENCE_TIMEOUT_MS = 5000;

type RootShutdownFenceSnapshot = Readonly<{
  quiescent: boolean;
  hasActiveTurn: boolean;
}>;

type RootShutdownFenceDiagnostics = Readonly<{
  runId: string;
  activeTurn: Readonly<{ kind: string; turnId?: string }>;
  hasPendingCommand: boolean;
}>;

type FenceTimers = Readonly<{
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}>;

const nodeTimers: FenceTimers = Object.freeze({
  setTimeout: (callback: () => void, ms: number) => {
    const handle = setTimeout(callback, ms);
    handle.unref?.();
    return handle;
  },
  clearTimeout: (handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>),
});

/**
 * One root-shutdown attempt of an AgentRun, driven only by its serialized lifecycle. It settles
 * `{ accepted: true }` once the run is quiescent, interrupting an active turn at most once.
 *
 * A rejected interrupt is not a result. The attempt stays open until the run becomes
 * quiescent (the local turn-completion dispatch is authoritative) or the bounded wait expires;
 * on expiry it settles the original rejected result. Only acceptance is final for the run:
 * `AgentRun` starts a new attempt after a not-accepted or failed one.
 */
export class AgentRunRootShutdownFence {
  private state: "pending" | "accepted" | "ended" = "pending";
  private interruptRequested = false;
  private rejectedInterrupt: AgentOperationResult | null = null;
  private timer: unknown = null;
  private readonly completion: Promise<AgentOperationResult>;
  private resolveCompletion!: (result: AgentOperationResult) => void;
  private rejectCompletion!: (error: unknown) => void;
  private readonly quiescenceTimeoutMs: number;
  private readonly timers: FenceTimers;
  private readonly warn: (message: string) => void;

  constructor(private readonly callbacks: Readonly<{
    snapshot(): RootShutdownFenceSnapshot;
    interruptActiveTurn(): Promise<AgentOperationResult>;
    /** The run's turn state, warned on a rejected interrupt and again when the wait expires. */
    diagnostics(): RootShutdownFenceDiagnostics;
  }>, options: Readonly<{
    quiescenceTimeoutMs?: number;
    timers?: FenceTimers;
    warn?: (message: string) => void;
  }> = {}) {
    this.quiescenceTimeoutMs = options.quiescenceTimeoutMs ?? ROOT_SHUTDOWN_REJECTED_INTERRUPT_QUIESCENCE_TIMEOUT_MS;
    this.timers = options.timers ?? nodeTimers;
    this.warn = options.warn ?? ((message) => console.warn(message));
    this.completion = new Promise<AgentOperationResult>((resolve, reject) => {
      this.resolveCompletion = resolve;
      this.rejectCompletion = reject;
    });
  }

  get result(): Promise<AgentOperationResult> { return this.completion; }

  /** Pending attempts are shared; an accepted one stays the run's result; an ended one is replaced. */
  get isReusable(): boolean { return this.state !== "ended"; }

  evaluate(): void {
    if (this.state !== "pending") return;
    const snapshot = this.callbacks.snapshot();
    if (snapshot.quiescent) {
      this.settle({ accepted: true });
      return;
    }
    if (!snapshot.hasActiveTurn || this.interruptRequested) return;
    this.interruptRequested = true;
    void this.callbacks.interruptActiveTurn().then(
      (result) => this.onInterruptResult(result),
      (error) => this.fail(error),
    );
  }

  private onInterruptResult(result: AgentOperationResult): void {
    if (result.accepted || this.state !== "pending") return;
    if (this.callbacks.snapshot().quiescent) {
      this.settle({ accepted: true });
      return;
    }
    // The turn may be finishing on its own (e.g. a "no active turn" race): await quiescence, bounded.
    this.rejectedInterrupt = result;
    this.warnRejected("rejected; awaiting quiescence", result);
    this.timer = this.timers.setTimeout(() => this.onQuiescenceWaitExpired(), this.quiescenceTimeoutMs);
  }

  private onQuiescenceWaitExpired(): void {
    this.timer = null;
    const rejected = this.rejectedInterrupt;
    if (this.state !== "pending" || !rejected) return;
    this.warnRejected("quiescence wait expired", rejected);
    this.settle(this.callbacks.snapshot().quiescent ? { accepted: true } : rejected);
  }

  private warnRejected(phase: string, result: AgentOperationResult): void {
    const { runId, activeTurn, hasPendingCommand } = this.callbacks.diagnostics();
    const turn = activeTurn.turnId ? `${activeTurn.kind}(${activeTurn.turnId})` : activeTurn.kind;
    this.warn(`[AgentRun] root shutdown interrupt ${phase} for run '${runId}': activeTurn=${turn}`
      + ` hasPendingCommand=${hasPendingCommand} code=${result.code ?? "none"} message=${result.message ?? "none"}`);
  }

  private settle(result: AgentOperationResult): void {
    if (this.state !== "pending") return;
    this.clearTimer();
    this.state = result.accepted ? "accepted" : "ended";
    this.resolveCompletion(result);
  }

  private fail(error: unknown): void {
    if (this.state !== "pending") return;
    this.clearTimer();
    this.state = "ended";
    this.rejectCompletion(error);
  }

  private clearTimer(): void {
    if (this.timer === null) return;
    this.timers.clearTimeout(this.timer);
    this.timer = null;
  }
}
