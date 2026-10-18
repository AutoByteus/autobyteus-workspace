type AgentTurnEvidence = "stream" | "runtime_snapshot";

/**
 * The identified turn one ordered consumer of a run's event stream considers active, and the
 * turns it has seen end. Each run-owned lifecycle state holds its own ledger, because the states
 * observe a batch in different pipeline passes. Two kinds of evidence name a turn:
 * - stream evidence (a turn's own start or terminal event, an accepted command's turn id) is
 *   ordered with the events being projected, so a newer stream start supersedes and ends the
 *   previous stream-held turn;
 * - runtime-snapshot evidence (the runtime's live current turn) may be ahead of the queued events,
 *   so it only names a turn while the stream holds none, never ends a turn, and is replaced
 *   without ending when the stream reports a turn.
 * Runtime availability facts (offline, a runtime-global error) are applied by the owning state
 * through `endActive()` / `forgetActive()`.
 */
export class AgentTurnLedger {
  private active: { turnId: string; evidence: AgentTurnEvidence } | null = null;
  private readonly ended = new Set<string>();

  get activeTurnId(): string | null {
    return this.active?.turnId ?? null;
  }

  hasEnded(turnId: string): boolean {
    return this.ended.has(turnId);
  }

  /** Ordered start evidence. Returns the turn it superseded and ended, if any. */
  observeStreamStart(turnId: string): string | null {
    if (this.ended.has(turnId)) return null;
    const previous = this.active;
    this.active = { turnId, evidence: "stream" };
    if (previous && previous.turnId !== turnId && previous.evidence === "stream") {
      this.ended.add(previous.turnId);
      return previous.turnId;
    }
    return null;
  }

  /** Provisional naming by the runtime's live state. Returns whether the turn is now active. */
  observeRuntimeSnapshotTurn(turnId: string): boolean {
    if (this.ended.has(turnId)) return false;
    if (this.active?.evidence === "stream") return this.active.turnId === turnId;
    this.active = { turnId, evidence: "runtime_snapshot" };
    return true;
  }

  /** The turn ended (its own terminal event or a turn-terminal error). */
  end(turnId: string): void {
    this.ended.add(turnId);
    if (this.active?.turnId === turnId) this.active = null;
  }

  /** Ends the active turn (runtime-global failure, termination). Returns the ended turn. */
  endActive(): string | null {
    const turnId = this.active?.turnId ?? null;
    if (turnId) this.end(turnId);
    return turnId;
  }

  /** Forgets the active turn without ending it (the run released its runtime). */
  forgetActive(): void {
    this.active = null;
  }
}
