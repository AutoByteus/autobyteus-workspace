import { rootExecutionIdentityKey, type RootExecutionIdentity } from "../execution/domain/root-execution-identity.js";
import type { ChildRowsEvent } from "./child-rows-feed.js";

/** One open view stream of a run (a stream session); it orders the events against its snapshots. */
export type ChildRowsSink = (event: ChildRowsEvent) => void;

/**
 * The open view streams of runs, by run (design DS-8; SR-047 step 7, ARCH-REV-022): the stream handlers open and close
 * them, and `ChildRowsFeed` publishes to them. Created by the composition root before both, so neither needs the other.
 */
export class ChildRowsStreams {
  private readonly sinks = new Map<string, Set<ChildRowsSink>>();

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

  /** Whether any view of `run` is open. */
  isOpen(run: RootExecutionIdentity): boolean { return this.sinks.has(rootExecutionIdentityKey(run)); }

  /** The open view streams of `run`, now. */
  of(run: RootExecutionIdentity): readonly ChildRowsSink[] { return [...this.sinks.get(rootExecutionIdentityKey(run)) ?? []]; }
}
