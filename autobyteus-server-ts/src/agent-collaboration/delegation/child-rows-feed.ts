import type { RemoteTaskExecutionDto } from "@autobyteus/agent-presentation-contracts";
import type { CollaborationTaskExecutionDto } from "@autobyteus/collaboration-stream-contracts";
import type { RootExecutionIdentity } from "../execution/domain/root-execution-identity.js";
import type { ChildRowsStreams } from "./child-rows-streams.js";
import type { TaskExecutionReference } from "../execution/task/task-execution-reference.js";
import type { ChildRowsChange, DelegationIndex } from "./delegation-index.js";
import type { SubtreeRow } from "./collaboration-tree.js";

/** One child row as a view projects it: a run on this node (from its own file), or a peer's run. */
export type ChildRowRecord =
  | Readonly<{ kind: "local"; row: CollaborationTaskExecutionDto }>
  | Readonly<{ kind: "peer"; row: RemoteTaskExecutionDto }>;

/** What an open view of a run is told when its child rows change (DS-8, SR-043). */
export type ChildRowsEvent = Readonly<{
  run: RootExecutionIdentity;
  added: readonly ChildRowRecord[];
  removed: readonly TaskExecutionReference[];
}>;

/** The views' own projection of one row (at any depth, under its `parent`); `null` when its record cannot be read. Bound by the composition. */
export type ChildRowProjection = Readonly<{
  rowOf(row: SubtreeRow): Promise<ChildRowRecord | null>;
}>;

/**
 * The one publisher of child-row changes to open views (DS-8, SR-042 … SR-044). It listens to the `DelegationIndex`'s
 * `childRowsChanged` reports and, for a run with open view streams, builds the added rows with the views' own
 * projection and hands one event to each stream, whether or not the run is active. It never starts or restores a run.
 * Events are published in the order the changes were reported; a change with no open view is dropped (a later view
 * reads the tree when it builds its snapshot). The composition root creates the one feed with the open view streams
 * (`ChildRowsStreams`, SR-047 step 7) and has it follow the tree.
 */
export class ChildRowsFeed {
  private publishing: Promise<void> = Promise.resolve();

  /** `projection`: the views' own projection of a row; `streams`: the open view streams (the composition root passes both). */
  constructor(private readonly projection: ChildRowProjection, private readonly streams: Pick<ChildRowsStreams, "isOpen" | "of">) {}

  /** Follows a tree's child-row reports until the returned function is called. */
  follow(tree: Pick<DelegationIndex, "subscribeChildRows">): () => void {
    return tree.subscribeChildRows((change) => this.changed(change));
  }

  /** Resolves once every change reported so far has been published. */
  settled(): Promise<void> { return this.publishing; }

  private changed(change: ChildRowsChange): void {
    if (!this.streams.isOpen(change.run)) return;
    this.publishing = this.publishing.then(() => this.publish(change)).catch((error: unknown) => {
      console.warn(`The child rows of ${change.run.rootSubjectKind} run '${change.run.rootRunId}' could not be published:`, error);
    });
  }

  private async publish(change: ChildRowsChange): Promise<void> {
    const added: ChildRowRecord[] = [];
    for (const child of change.added) {
      const record = await this.projection.rowOf(child).catch((error: unknown) => {
        console.warn(`A child row of ${change.run.rootSubjectKind} run '${change.run.rootRunId}' could not be read:`, error);
        return null;
      });
      if (record) added.push(record);
    }
    if (!added.length && !change.removed.length) return;
    const event: ChildRowsEvent = Object.freeze({ run: change.run, added, removed: change.removed });
    for (const sink of this.streams.of(change.run)) {
      try { sink(event); } catch (error) { console.warn("A child rows stream failed:", error); }
    }
  }
}
