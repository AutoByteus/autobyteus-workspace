import { CollaborationStreamServerMessageSchema, type CollaborationStreamServerMessage } from "@autobyteus/collaboration-stream-contracts";
import { getChildRowsFeed, type ChildRowsEvent, type ChildRowsFeed } from "../../agent-collaboration/delegation/child-rows-feed.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";

/** An Agent or Org run's child-row change on the collaboration stream (SR-042, SR-043): its rows as its view has them. */
export const projectCollaborationChildRunsChanged = (kind: "agent" | "agent_org", runId: string, event: ChildRowsEvent): CollaborationStreamServerMessage =>
  CollaborationStreamServerMessageSchema.parse({ type: "CHILD_RUNS_CHANGED", payload: { root_subject_kind: kind, root_run_id: runId,
    event: { kind: "child_runs_changed", run_id: runId, added: event.added.map((record) => record.row), removed: event.removed } } });

/**
 * One view stream connection's share of a run's child-row changes (DS-8, SR-044). It opens on the feed before the
 * connection reads the tree for its snapshot; an event published while the snapshot is built is held and sent right
 * after it, in published order. So a change is in the snapshot (its event is then a no-op by membership) or applied
 * after it; none is lost.
 */
export class ChildRowsStreamSession {
  private held: ChildRowsEvent[] | null = [];
  private close: (() => void) | null;

  constructor(run: RootExecutionIdentity, private readonly send: (event: ChildRowsEvent) => void, feed: ChildRowsFeed = getChildRowsFeed()) {
    this.close = feed.open(run, (event) => this.deliver(event));
  }

  /** The snapshot was sent: the events held while it was built follow, oldest first, each once. */
  snapshotSent(): void {
    const held = this.held ?? [];
    this.held = null;
    for (const event of held) this.send(event);
  }

  /** The connection closed: nothing more is sent. */
  dispose(): void {
    this.close?.();
    this.close = null;
    this.held = null;
  }

  private deliver(event: ChildRowsEvent): void {
    if (!this.close) return;
    if (this.held) this.held.push(event);
    else this.send(event);
  }
}
