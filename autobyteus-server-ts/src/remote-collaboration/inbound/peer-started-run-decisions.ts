import type { RoutingDecisionRecord } from "../../model-routing/domain/model-routing-types.js";
import { findRoutingDecisionRecorder } from "../../model-routing/domain/routing-decision-recorder-binding.js";

/** A start whose work packet never came is forgotten after this long (the delegating node gave up). */
const PENDING_DECISIONS_TTL_MS = 60 * 60 * 1000;

/**
 * B's decision records of runs it started for a peer (autobyteus-32 DS-002): kept with the started run (its Agent run
 * ID, or its Team run ID) and written when the delegating node's work packet for that run arrives, so a start the
 * delegating node abandons leaves no record. In memory: a restart between the start and the packet loses them.
 */
export class PeerStartedRunDecisions {
  private readonly pending = new Map<string, Readonly<{ heldAt: number; records: readonly RoutingDecisionRecord[] }>>();

  constructor(private readonly now: () => number = Date.now) {}

  hold(runId: string, records: readonly RoutingDecisionRecord[]): void {
    const now = this.now();
    for (const [id, entry] of this.pending) if (now - entry.heldAt > PENDING_DECISIONS_TTL_MS) this.pending.delete(id);
    if (records.length) this.pending.set(runId, Object.freeze({ heldAt: now, records }));
  }

  /** The work packet for `runId` arrived: its records are written (a failed write is logged, never refused). */
  async workArrived(runId: string): Promise<void> {
    const entry = this.pending.get(runId);
    if (!entry) return;
    this.pending.delete(runId);
    const recorder = findRoutingDecisionRecorder();
    if (!recorder) return;
    try {
      await recorder.record(entry.records.map((record) => Object.freeze({ ...record, recordedAt: new Date(this.now()).toISOString() })));
    } catch (error) {
      console.warn(`Model Routing: the decisions of the run ${runId} started for a peer could not be recorded: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
