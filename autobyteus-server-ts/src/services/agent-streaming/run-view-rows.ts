import type { PeerRunOf } from "../../agent-collaboration/execution/remote/peer-runs.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { isRunTreeChangedEvent, type RunTreeBase, type RunTreeView } from "../../agent-collaboration/delegation/run-tree-view.js";
import { RunTreeSessionRows } from "../../agent-collaboration/delegation/run-tree-changes.js";

/** What a run's view reads about the runs under it (SR-061 … SR-063, SR-084), from the composition root. */
export type RunViewRowSources = Readonly<{
  /** A peer run by its own ID (SR-066): a view's command for a peer row goes to its handle, never through a root. */
  peerRunOf: PeerRunOf;
  /** The run's tree (SR-084): its rows read with a snapshot's base, sent after it, and read again on each tree notice. */
  runTree: Pick<RunTreeView, "prepare" | "readAtBase" | "rowsOf">;
}>;

/** A view snapshot's tree, read in the one synchronous step that takes its base (SR-063). */
export const readTreeAtBase = (sources: Pick<RunViewRowSources, "runTree">, run: RootExecutionIdentity): RunTreeBase =>
  sources.runTree.readAtBase(run);

/** A snapshot's tree for its session (SR-084): the rows read at the base, their records read after it. */
export const readViewTree = (sources: Pick<RunViewRowSources, "runTree">, run: RootExecutionIdentity, atBase: RunTreeBase): Promise<RunTreeSessionRows> =>
  RunTreeSessionRows.open(sources.runTree, run, atBase);

/**
 * A view's delivery of its stream's events, in order (base's views sent each event as it was published). An event is
 * delivered at once, unless a tree notice is still being read: then it waits behind it. `deliver` reads the tree on a
 * notice before sending it, and handles its own errors.
 */
export const inOrderViewDelivery = <S>(isReadFirst: (sequenced: S) => boolean, deliver: (sequenced: S) => Promise<void>): ((sequenced: S) => void) => {
  let pending: Promise<void> | null = null;
  return (sequenced) => {
    if (!pending && !isReadFirst(sequenced)) { void deliver(sequenced); return; }
    const next = (pending ?? Promise.resolve()).then(() => deliver(sequenced));
    const settle = () => { if (pending === next) pending = null; };
    pending = next;
    void next.then(settle, settle);
  };
};

/** Whether a view reads before it sends an event of its stream (its tree again, on a notice): later ones wait behind it. */
export const isReadBeforeSending = (event: { kind?: unknown }): boolean => isRunTreeChangedEvent(event);
