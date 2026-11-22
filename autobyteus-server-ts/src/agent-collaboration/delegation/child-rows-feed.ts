import type { RootExecutionIdentity } from "../execution/domain/root-execution-identity.js";
import type { DelegationIndex } from "./delegation-index.js";
import type { RunViewStreams } from "./run-view-stream.js";
import { RUN_TREE_CHANGED_EVENT, type RunTreeChangedEvent } from "./run-tree-view.js";

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
    /** A unit run's Org container (its rows are the container's too, org-teams-follow-definition); `null` for any other run. */
    containerOf?(run: RootExecutionIdentity): RootExecutionIdentity | null;
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
    const container = this.dependencies.containerOf?.(run) ?? null;
    if (container) this.changed(container);
  }
}
