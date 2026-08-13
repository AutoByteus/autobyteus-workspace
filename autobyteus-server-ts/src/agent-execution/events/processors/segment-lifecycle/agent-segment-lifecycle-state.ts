import type { AgentRuntimeLifecycleSnapshot } from "../../../domain/agent-runtime-lifecycle-snapshot.js";
import {
  agentSegmentIdentityKey,
  type AgentSegmentIdentity,
  type AgentSegmentType,
} from "../../../domain/agent-segment.js";
import type { AgentTurnLifecycleState } from "../lifecycle-status/agent-turn-lifecycle-state.js";

type SegmentLifecycle = Readonly<{
  identity: AgentSegmentIdentity;
  type: AgentSegmentType;
  phase: "active" | "ended";
}>;

export type AgentSegmentTransitionResult =
  | { kind: "ACCEPTED"; type: AgentSegmentType }
  | { kind: "REPLAY" }
  | { kind: "REJECTED" };

export class AgentSegmentLifecycleState {
  private activeTurnId: string | null = null;
  private readonly retiredTurnIds = new Set<string>();
  private readonly segments = new Map<string, SegmentLifecycle>();

  acceptCommand(turnId: string | null): void {
    if (turnId) {
      this.openTurn(turnId);
    }
  }

  reconcileBeforeBatch(
    snapshot: AgentRuntimeLifecycleSnapshot | undefined,
  ): void {
    if (snapshot?.availability !== "active") {
      return;
    }
    if (snapshot.currentTurn.kind === "IDENTIFIED") {
      this.openTurn(snapshot.currentTurn.turnId);
    }
  }

  reconcileAfterBatch(
    snapshot: AgentRuntimeLifecycleSnapshot | undefined,
  ): void {
    if (snapshot?.availability === "offline" || snapshot?.phase === "error") {
      this.releaseRun();
    }
  }

  observeTurnStarted(turnId: string | null): void {
    if (turnId) {
      this.openTurn(turnId);
    }
  }

  observeTurnTerminal(turnId: string | null): void {
    if (!turnId) {
      return;
    }
    this.retiredTurnIds.add(turnId);
    this.clearTurn(turnId);
    if (this.activeTurnId === turnId) {
      this.activeTurnId = null;
    }
  }

  observeRuntimeTerminal(): void {
    this.releaseRun();
  }

  start(
    identity: AgentSegmentIdentity,
    type: AgentSegmentType,
    turnLifecycleState: AgentTurnLifecycleState,
  ): AgentSegmentTransitionResult {
    if (!this.canOpen(identity.turnId, turnLifecycleState)) {
      return { kind: "REJECTED" };
    }

    const key = agentSegmentIdentityKey(identity);
    const existing = this.segments.get(key);
    if (existing) {
      if (existing.type === type) {
        return { kind: "REPLAY" };
      }
      return { kind: "REJECTED" };
    }

    this.openTurn(identity.turnId);
    this.segments.set(key, {
      identity,
      type,
      phase: "active",
    });
    return { kind: "ACCEPTED", type };
  }

  content(identity: AgentSegmentIdentity): AgentSegmentTransitionResult {
    if (this.retiredTurnIds.has(identity.turnId)) {
      return { kind: "REJECTED" };
    }
    const existing = this.segments.get(agentSegmentIdentityKey(identity));
    if (!existing || existing.phase !== "active") {
      return { kind: "REJECTED" };
    }
    return { kind: "ACCEPTED", type: existing.type };
  }

  end(identity: AgentSegmentIdentity): AgentSegmentTransitionResult {
    if (this.retiredTurnIds.has(identity.turnId)) {
      return { kind: "REJECTED" };
    }
    const key = agentSegmentIdentityKey(identity);
    const existing = this.segments.get(key);
    if (!existing) {
      return { kind: "REJECTED" };
    }
    if (existing.phase === "ended") {
      return { kind: "REPLAY" };
    }
    this.segments.set(key, { ...existing, phase: "ended" });
    return { kind: "ACCEPTED", type: existing.type };
  }

  releaseRun(): void {
    this.activeTurnId = null;
    this.segments.clear();
  }

  private canOpen(
    turnId: string,
    turnLifecycleState: AgentTurnLifecycleState,
  ): boolean {
    if (this.retiredTurnIds.has(turnId)) {
      return false;
    }
    if (this.activeTurnId) {
      return this.activeTurnId === turnId;
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

  private openTurn(turnId: string): void {
    if (this.retiredTurnIds.has(turnId)) {
      return;
    }
    if (this.activeTurnId && this.activeTurnId !== turnId) {
      this.retiredTurnIds.add(this.activeTurnId);
      this.clearTurn(this.activeTurnId);
    }
    this.activeTurnId = turnId;
  }

  private clearTurn(turnId: string): void {
    for (const [key, segment] of this.segments) {
      if (segment.identity.turnId === turnId) {
        this.segments.delete(key);
      }
    }
  }
}
