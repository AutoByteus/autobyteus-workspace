import type { AgentRuntimeLifecycleSnapshot } from "../../../domain/agent-runtime-lifecycle-snapshot.js";
import {
  agentSegmentIdentityKey,
  type AgentSegmentIdentity,
  type AgentSegmentType,
} from "../../../domain/agent-segment.js";
import { AgentTurnLedger } from "../lifecycle-status/agent-turn-ledger.js";
import type { AgentTurnLifecycleState } from "../lifecycle-status/agent-turn-lifecycle-state.js";

type SegmentLifecycle = Readonly<{
  identity: AgentSegmentIdentity;
  type: AgentSegmentType;
  phase: "active" | "ended";
}>;

export type AgentSegmentRejectionReason =
  | "TURN_ENDED"
  | "TURN_NOT_CURRENT"
  | "SEGMENT_NOT_STARTED"
  | "SEGMENT_ENDED"
  | "SEGMENT_TYPE_CONFLICT"
  | "PAYLOAD_INVALID";

export type AgentSegmentTransitionResult =
  | { kind: "ACCEPTED"; type: AgentSegmentType }
  | { kind: "REPLAY" }
  | { kind: "REJECTED"; reason: Exclude<AgentSegmentRejectionReason, "PAYLOAD_INVALID"> };

/** Rejections of one account (`turnId: null` for events without a turn id) since its last report. */
export type AgentSegmentRejectionSummary = Readonly<{ turnId: string | null; count: number }>;

export type AgentSegmentRejectionDecision = Readonly<{ warn: boolean; showNotice: boolean }>;

type RejectionAccount = { warned: boolean; pending: number; noticed: boolean };

export class AgentSegmentLifecycleState {
  private readonly turns = new AgentTurnLedger();
  private readonly segments = new Map<string, SegmentLifecycle>();
  /** Per-turn rejection accounts for the run's lifetime (`null`: events without a turn id). */
  private readonly rejectionAccounts = new Map<string | null, RejectionAccount>();

  acceptCommand(turnId: string | null): void {
    if (turnId) {
      this.openStreamTurn(turnId);
    }
  }

  reconcileBeforeBatch(
    snapshot: AgentRuntimeLifecycleSnapshot | undefined,
  ): void {
    if (snapshot?.availability !== "active") {
      return;
    }
    if (snapshot.currentTurn.kind === "IDENTIFIED") {
      this.turns.observeRuntimeSnapshotTurn(snapshot.currentTurn.turnId);
    }
  }

  /** Releases the run when the runtime is offline or failed; returns the release's pending summaries. */
  reconcileAfterBatch(
    snapshot: AgentRuntimeLifecycleSnapshot | undefined,
  ): AgentSegmentRejectionSummary[] {
    if (snapshot?.availability === "offline" || snapshot?.phase === "error") {
      return this.releaseRun();
    }
    return [];
  }

  observeTurnStarted(turnId: string | null): void {
    if (turnId) {
      this.openStreamTurn(turnId);
    }
  }

  observeTurnTerminal(turnId: string | null): void {
    if (!turnId) {
      return;
    }
    this.turns.end(turnId);
    this.clearTurn(turnId);
  }

  /** A runtime-global failure or offline status; returns the release's pending summaries. */
  observeRuntimeTerminal(): AgentSegmentRejectionSummary[] {
    return this.releaseRun();
  }

  start(
    identity: AgentSegmentIdentity,
    type: AgentSegmentType,
    turnLifecycleState: AgentTurnLifecycleState,
  ): AgentSegmentTransitionResult {
    if (this.turns.hasEnded(identity.turnId)) {
      return { kind: "REJECTED", reason: "TURN_ENDED" };
    }
    if (!this.isCurrentTurn(identity.turnId, turnLifecycleState)) {
      return { kind: "REJECTED", reason: "TURN_NOT_CURRENT" };
    }

    const key = agentSegmentIdentityKey(identity);
    const existing = this.segments.get(key);
    if (existing) {
      if (existing.type === type) {
        return { kind: "REPLAY" };
      }
      return { kind: "REJECTED", reason: "SEGMENT_TYPE_CONFLICT" };
    }

    // A segment start is stream evidence of its turn.
    if (this.turns.activeTurnId !== identity.turnId) this.openStreamTurn(identity.turnId);
    this.segments.set(key, {
      identity,
      type,
      phase: "active",
    });
    return { kind: "ACCEPTED", type };
  }

  content(identity: AgentSegmentIdentity): Exclude<AgentSegmentTransitionResult, { kind: "REPLAY" }> {
    if (this.turns.hasEnded(identity.turnId)) {
      return { kind: "REJECTED", reason: "TURN_ENDED" };
    }
    const existing = this.segments.get(agentSegmentIdentityKey(identity));
    if (!existing) {
      return { kind: "REJECTED", reason: "SEGMENT_NOT_STARTED" };
    }
    if (existing.phase !== "active") {
      return { kind: "REJECTED", reason: "SEGMENT_ENDED" };
    }
    return { kind: "ACCEPTED", type: existing.type };
  }

  end(identity: AgentSegmentIdentity): AgentSegmentTransitionResult {
    if (this.turns.hasEnded(identity.turnId)) {
      return { kind: "REJECTED", reason: "TURN_ENDED" };
    }
    const key = agentSegmentIdentityKey(identity);
    const existing = this.segments.get(key);
    if (!existing) {
      return { kind: "REJECTED", reason: "SEGMENT_NOT_STARTED" };
    }
    if (existing.phase === "ended") {
      return { kind: "REPLAY" };
    }
    this.segments.set(key, { ...existing, phase: "ended" });
    return { kind: "ACCEPTED", type: existing.type };
  }

  /**
   * Accounts one rejected segment event. `warn` is true only for the account's first rejection;
   * later ones are counted until the next boundary. `showNotice` is true once per turn, and only
   * while that turn is this state's active turn.
   */
  recordRejection(turnId: string | null): AgentSegmentRejectionDecision {
    let account = this.rejectionAccounts.get(turnId);
    if (!account) {
      account = { warned: false, pending: 0, noticed: false };
      this.rejectionAccounts.set(turnId, account);
    }
    const warn = !account.warned;
    if (warn) account.warned = true;
    else account.pending += 1;
    const showNotice = turnId !== null && !account.noticed && this.turns.activeTurnId === turnId;
    if (showNotice) account.noticed = true;
    return { warn, showNotice };
  }

  /** A run lifecycle boundary: returns every account's pending count and resets it. */
  takeRejectionSummaries(): AgentSegmentRejectionSummary[] {
    const summaries: AgentSegmentRejectionSummary[] = [];
    for (const [turnId, account] of this.rejectionAccounts) {
      if (account.pending === 0) continue;
      summaries.push({ turnId, count: account.pending });
      account.pending = 0;
    }
    return summaries;
  }

  /** The run released its runtime. Returns the pending summaries for the caller to log. */
  releaseRun(): AgentSegmentRejectionSummary[] {
    this.turns.forgetActive();
    this.segments.clear();
    return this.takeRejectionSummaries();
  }

  private isCurrentTurn(
    turnId: string,
    turnLifecycleState: AgentTurnLifecycleState,
  ): boolean {
    const activeTurnId = this.turns.activeTurnId;
    if (activeTurnId) {
      return activeTurnId === turnId;
    }
    if (turnLifecycleState.activeTurn.kind === "IDENTIFIED") {
      return turnLifecycleState.activeTurn.turnId === turnId;
    }
    if (turnLifecycleState.activeTurn.kind === "ANONYMOUS") {
      return true;
    }
    return turnLifecycleState.status === "initializing" ||
      turnLifecycleState.status === "running";
  }

  private openStreamTurn(turnId: string): void {
    const superseded = this.turns.observeStreamStart(turnId);
    if (superseded) this.clearTurn(superseded);
  }

  private clearTurn(turnId: string): void {
    for (const [key, segment] of this.segments) {
      if (segment.identity.turnId === turnId) {
        this.segments.delete(key);
      }
    }
  }
}
