import type { RemoteTaskExecutionDto } from "@autobyteus/agent-presentation-contracts";
import type { CollaborationTaskExecutionDto } from "@autobyteus/collaboration-stream-contracts";
import type { RootExecutionIdentity } from "../execution/domain/root-execution-identity.js";
import type { DelegationIndex } from "./delegation-index.js";
import type { SubtreeRow } from "./collaboration-tree.js";
import type { RunViewStreams } from "./run-view-stream.js";
import { RUN_TREE_CHANGED_EVENT, type RunTreeChangedEvent } from "./run-tree-view.js";

/** One row as a view projects it: a run on this node (from its own file), or a peer's run. */
export type ChildRowRecord =
  | Readonly<{ kind: "local"; row: CollaborationTaskExecutionDto }>
  | Readonly<{ kind: "peer"; row: RemoteTaskExecutionDto; summary: Readonly<{ title: string | null; reachable: boolean }> | null }>;

/** The views' own projection of one row (at any depth, under its `parent`); `null` when its record cannot be read. Bound by the composition. */
export type ChildRowProjection = Readonly<{
  rowOf(row: SubtreeRow): Promise<ChildRowRecord | null>;
}>;

/**
 * The one feed of a run's tree changes (autobyteus-461 SR-084): it follows the `DelegationIndex`'s row changes and, at
 * the change itself, publishes `run_tree_changed` in the run's `RunViewStream` (its open views read the tree again and
 * send what changed) and tells `/ws/run-status` (its listed views read it again). It never starts or restores a run.
 */
export class ChildRowsFeed {
  constructor(private readonly dependencies: Readonly<{
    streams: Pick<RunViewStreams, "streamOf">;
    tree: Pick<DelegationIndex, "chainOf">;
    /** A run's rows changed (`/ws/run-status`'s `RUN_TREE_CHANGED`, SR-083): told for the run and every run above it. */
    rowsChanged(run: RootExecutionIdentity): void;
  }>) {}

  /** Follows a tree's row reports until the returned function is called. */
  follow(tree: Pick<DelegationIndex, "subscribeChildRows">): () => void {
    return tree.subscribeChildRows((change) => this.changed(change.run));
  }

  /**
   * A row's content changed (SR-086 G-B1, G-B2): a saved launch, or a peer run's node answered about it. Every tree that
   * holds the row (the run's own, and each run above it) is told: its open views read it again and send what changed
   * (`updated`), and its listed views are told on `/ws/run-status`.
   */
  rowChanged(run: RootExecutionIdentity): void {
    for (const holder of this.dependencies.tree.chainOf(run)) this.changed(holder);
  }

  /** A run's rows changed: its open views read its tree again; its listed, not-open views are told on `/ws/run-status`. */
  private changed(run: RootExecutionIdentity): void {
    this.dependencies.streams.streamOf<RunTreeChangedEvent>(run).publish(RUN_TREE_CHANGED_EVENT);
    this.dependencies.rowsChanged(run);
  }
}
