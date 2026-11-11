import type { RemoteTaskExecutionDto } from "@autobyteus/agent-presentation-contracts";
import type { CollaborationTaskExecutionDto } from "@autobyteus/collaboration-stream-contracts";
import { rootExecutionIdentityKey, type RootExecutionIdentity } from "../execution/domain/root-execution-identity.js";
import type { TaskExecutionReference } from "../execution/task/task-execution-reference.js";
import type { ChildRowsChange, DelegatedChild, DelegationTree } from "./delegation-tree.js";

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

/** The views' own projection of one child row; `null` when its record cannot be read. Bound by the composition. */
export type ChildRowProjection = Readonly<{
  rowOf(parent: RootExecutionIdentity, child: DelegatedChild): Promise<ChildRowRecord | null>;
}>;

/** One open view stream of a run (a stream session); it orders the events against its snapshots. */
export type ChildRowsSink = (event: ChildRowsEvent) => void;

/**
 * The one publisher of child-row changes to open views (DS-8, SR-042 … SR-044). It listens to the `DelegationTree`'s
 * `childRowsChanged` reports and, for a run with open view streams, builds the added rows with the views' own
 * projection and hands one event to each stream, whether or not the run is active. It never starts or restores a run.
 * Events are published in the order the changes were reported; a change with no open view is dropped (a later view
 * reads the tree when it builds its snapshot). The composition root creates the one feed and passes it to the tree's
 * composition and to the view stream handlers.
 */
export class ChildRowsFeed {
  private readonly sinks = new Map<string, Set<ChildRowsSink>>();
  private publishing: Promise<void> = Promise.resolve();

  /** `projection`: the views' own projection of a row (the composition root passes it). */
  constructor(private readonly projection: ChildRowProjection) {}

  /** Follows a tree's child-row reports until the returned function is called. */
  follow(tree: Pick<DelegationTree, "subscribeChildRows">): () => void {
    return tree.subscribeChildRows((change) => this.changed(change));
  }

  /** An open view stream of `run`; the returned function closes it. */
  open(run: RootExecutionIdentity, sink: ChildRowsSink): () => void {
    const key = rootExecutionIdentityKey(run);
    const sinks = this.sinks.get(key) ?? new Set<ChildRowsSink>();
    sinks.add(sink);
    this.sinks.set(key, sinks);
    return () => {
      sinks.delete(sink);
      if (!sinks.size && this.sinks.get(key) === sinks) this.sinks.delete(key);
    };
  }

  /** Resolves once every change reported so far has been published. */
  settled(): Promise<void> { return this.publishing; }

  private changed(change: ChildRowsChange): void {
    if (!this.sinks.has(rootExecutionIdentityKey(change.run))) return;
    this.publishing = this.publishing.then(() => this.publish(change)).catch((error: unknown) => {
      console.warn(`The child rows of ${change.run.rootSubjectKind} run '${change.run.rootRunId}' could not be published:`, error);
    });
  }

  private async publish(change: ChildRowsChange): Promise<void> {
    const added: ChildRowRecord[] = [];
    for (const child of change.added) {
      const record = await this.projection.rowOf(change.run, child).catch((error: unknown) => {
        console.warn(`A child row of ${change.run.rootSubjectKind} run '${change.run.rootRunId}' could not be read:`, error);
        return null;
      });
      if (record) added.push(record);
    }
    if (!added.length && !change.removed.length) return;
    const event: ChildRowsEvent = Object.freeze({ run: change.run, added, removed: change.removed });
    for (const sink of [...this.sinks.get(rootExecutionIdentityKey(change.run)) ?? []]) {
      try { sink(event); } catch (error) { console.warn("A child rows stream failed:", error); }
    }
  }
}
