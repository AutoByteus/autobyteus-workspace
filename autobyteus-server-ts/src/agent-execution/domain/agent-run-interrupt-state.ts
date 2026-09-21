import type { AgentRunBackend } from "../backends/agent-run-backend.js";
import type { AgentRunEventDispatchQueue } from "../events/agent-run-event-dispatch-queue.js";
import type { AgentTurnLifecycleState } from "../events/processors/lifecycle-status/agent-turn-lifecycle-state.js";
import type { AgentOperationResult } from "./agent-operation-result.js";

type InterruptReservation = {
  turnId: string | null;
  result: Promise<AgentOperationResult>;
  resolve(result: AgentOperationResult): void;
  reject(error: unknown): void;
};

type InterruptDecision =
  | { kind: "rejected"; result: AgentOperationResult }
  | { kind: "joined"; reservation: InterruptReservation }
  | { kind: "claimed"; reservation: InterruptReservation };

/** Existing interrupt reservation/provider-I/O state under one AgentRun authority. */
export class AgentRunInterruptState {
  private active: InterruptReservation | null = null;
  private readonly pendingProviderRequests = new Set<InterruptReservation>();

  constructor(private readonly options: Readonly<{
    runId: string;
    backend: AgentRunBackend;
    dispatchQueue: AgentRunEventDispatchQueue;
    lifecycleState: AgentTurnLifecycleState;
    onReservationReleased(): void;
  }>) {}

  get hasActiveReservation(): boolean { return this.active !== null; }
  get hasPendingProviderRequest(): boolean { return this.pendingProviderRequests.size > 0; }

  async interrupt(turnId: string | null = null): Promise<AgentOperationResult> {
    const decision = await this.options.dispatchQueue.enqueue(this.options.runId, () => {
      this.options.lifecycleState.reconcileRuntimeSnapshot(this.options.backend.getLifecycleSnapshot());
      return this.reserve(turnId);
    });
    if (decision.kind === "rejected") return decision.result;
    if (decision.kind === "claimed") void this.execute(decision.reservation);
    return decision.reservation.result;
  }

  observeTerminal(turnId: string | null): void {
    if (this.active?.turnId === turnId) this.active = null;
  }

  clear(): void { this.active = null; }

  private reserve(requestedTurnId: string | null): InterruptDecision {
    if (this.active) {
      if (requestedTurnId !== null && requestedTurnId !== this.active.turnId) {
        return { kind: "rejected", result: this.turnMismatch(requestedTurnId, this.active.turnId) };
      }
      return { kind: "joined", reservation: this.active };
    }
    const activeTurn = this.options.lifecycleState.activeTurn;
    if (activeTurn.kind === "NONE") return {
      kind: "rejected",
      result: {
        accepted: false,
        code: "NO_ACTIVE_TURN",
        message: `AgentRun '${this.options.runId}' has no canonical active turn to interrupt.`,
      },
    };
    const canonicalTurnId = activeTurn.kind === "IDENTIFIED" ? activeTurn.turnId : null;
    if (requestedTurnId !== null && requestedTurnId !== canonicalTurnId) {
      return { kind: "rejected", result: this.turnMismatch(requestedTurnId, canonicalTurnId) };
    }
    let resolve!: (result: AgentOperationResult) => void;
    let reject!: (error: unknown) => void;
    const result = new Promise<AgentOperationResult>((resolveResult, rejectResult) => {
      resolve = resolveResult;
      reject = rejectResult;
    });
    const reservation = { turnId: canonicalTurnId, result, resolve, reject };
    this.active = reservation;
    this.pendingProviderRequests.add(reservation);
    return { kind: "claimed", reservation };
  }

  private async execute(reservation: InterruptReservation): Promise<void> {
    let result: AgentOperationResult;
    try {
      result = await this.options.backend.interrupt(reservation.turnId);
    } catch (error) {
      await this.releaseProviderRequest(reservation);
      this.options.onReservationReleased();
      reservation.reject(error);
      return;
    }
    const application = await this.options.dispatchQueue.enqueue(this.options.runId, () => {
      const providerTurnId = result.turnId;
      const applied = providerTurnId !== undefined && providerTurnId !== null
        && providerTurnId !== reservation.turnId
        ? {
            accepted: false,
            code: "AGENT_RUN_INTERRUPT_PROVIDER_PROTOCOL_VIOLATION",
            message: `Interrupt result targeted '${providerTurnId}' instead of canonical turn '${reservation.turnId}'.`,
          }
        : result;
      const released = this.active === reservation && !applied.accepted;
      if (released) this.active = null;
      this.pendingProviderRequests.delete(reservation);
      return { applied, released };
    });
    this.options.onReservationReleased();
    reservation.resolve(application.applied);
  }

  private releaseProviderRequest(reservation: InterruptReservation): Promise<void> {
    return this.options.dispatchQueue.enqueue(this.options.runId, () => {
      if (this.active === reservation) this.active = null;
      this.pendingProviderRequests.delete(reservation);
    });
  }

  private turnMismatch(requestedTurnId: string, canonicalTurnId: string | null): AgentOperationResult {
    return {
      accepted: false,
      code: "TURN_MISMATCH",
      message: canonicalTurnId
        ? `AgentRun '${this.options.runId}' active turn is '${canonicalTurnId}', not '${requestedTurnId}'.`
        : `AgentRun '${this.options.runId}' has an anonymous active turn, not '${requestedTurnId}'.`,
    };
  }
}
