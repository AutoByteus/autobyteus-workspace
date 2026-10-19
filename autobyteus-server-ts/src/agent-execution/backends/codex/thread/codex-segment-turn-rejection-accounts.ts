/**
 * Per-thread count state for exact-turn gate rejections. One account per rejected event's turn
 * id (or one account for events without a turn id). The first rejection of an account is due a
 * detailed log line; later ones are counted and taken as summaries at the thread's boundaries.
 * Accounts live as long as the thread, so a turn never gets a second detailed line.
 * Mirrors the AgentRun segment rejection accounting semantics without sharing its code.
 */
export type CodexSegmentTurnRejectionSummary = Readonly<{
  turnId: string | null;
  count: number;
}>;

export class CodexSegmentTurnRejectionAccounts {
  private readonly pendingByTurnId = new Map<string | null, number>();

  /** Returns true when this is the account's first rejection (a detailed line is due). */
  record(turnId: string | null): boolean {
    const pending = this.pendingByTurnId.get(turnId);
    if (pending === undefined) {
      this.pendingByTurnId.set(turnId, 0);
      return true;
    }
    this.pendingByTurnId.set(turnId, pending + 1);
    return false;
  }

  /** Returns the accounts with pending counts and resets those counts; accounts are kept. */
  takeSummaries(): CodexSegmentTurnRejectionSummary[] {
    const summaries: CodexSegmentTurnRejectionSummary[] = [];
    for (const [turnId, count] of this.pendingByTurnId) {
      if (count === 0) {
        continue;
      }
      summaries.push(Object.freeze({ turnId, count }));
      this.pendingByTurnId.set(turnId, 0);
    }
    return summaries;
  }
}
