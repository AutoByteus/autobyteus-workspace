import { randomUUID } from "node:crypto";

export type SequencedRootEvent<TEvent> = Readonly<{
  changeSequence: number;
  event: TEvent;
}>;

/** Where a live root stands: its live sequence and the change sequence published so far in it, read together. */
export type RootLivePosition = Readonly<{ liveSequenceId: string; changeSequence: number }>;

export type RootEventListener<TEvent> = (
  event: SequencedRootEvent<TEvent>,
) => void;

export type RootSnapshotConnection<TSnapshot, TEvent> = Readonly<{
  snapshot: TSnapshot;
  baseChangeSequence: number;
  liveSequenceId: string;
  queuedEvents: readonly SequencedRootEvent<TEvent>[];
  subscribe(listener: RootEventListener<TEvent>): () => void;
  close(): void;
}>;

/**
 * One non-persisted order/barrier owner for a collaboration root. Publication is
 * synchronous and subscriber failures are isolated from domain operations.
 */
export class RootEventPublisher<TEvent> {
  /**
   * Names this publisher's change sequence (autobyteus-358, SR-005): it starts at 0 for every instance, so a
   * sequence number is comparable only with others of the same ID (a stop/resume or a restart starts another).
   */
  readonly liveSequenceId = randomUUID();
  private changeSequence = 0;
  private readonly listeners = new Set<RootEventListener<TEvent>>();
  private readonly barriers = new Set<SequencedRootEvent<TEvent>[]>();

  getCurrentChangeSequence(): number {
    return this.changeSequence;
  }

  /** The live sequence and its current change sequence in one read, so the pair always names one sequence. */
  getLivePosition(): RootLivePosition {
    return Object.freeze({ liveSequenceId: this.liveSequenceId, changeSequence: this.changeSequence });
  }

  publish(event: TEvent): SequencedRootEvent<TEvent> {
    const sequenced = Object.freeze({
      changeSequence: this.changeSequence + 1,
      event,
    });
    this.changeSequence = sequenced.changeSequence;
    for (const queue of this.barriers) queue.push(sequenced);
    for (const listener of [...this.listeners]) {
      try {
        listener(sequenced);
      } catch (error) {
        console.error("collaboration root event subscriber failed:", error);
      }
    }
    return sequenced;
  }

  subscribe(listener: RootEventListener<TEvent>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async openSnapshotConnection<TSnapshot>(
    capture: () => Promise<TSnapshot> | TSnapshot,
  ): Promise<RootSnapshotConnection<TSnapshot, TEvent>> {
    const baseChangeSequence = this.changeSequence;
    const queued: SequencedRootEvent<TEvent>[] = [];
    this.barriers.add(queued);
    try {
      const snapshot = await capture();
      let open = true;
      const close = (): void => {
        if (!open) return;
        open = false;
        this.barriers.delete(queued);
      };
      return Object.freeze({
        snapshot,
        baseChangeSequence,
        liveSequenceId: this.liveSequenceId,
        get queuedEvents() { return Object.freeze([...queued]); },
        subscribe: (listener: RootEventListener<TEvent>) => {
          if (!open) throw new Error("Root snapshot connection is closed.");
          close();
          for (const event of queued) listener(event);
          return this.subscribe(listener);
        },
        close,
      });
    } catch (error) {
      this.barriers.delete(queued);
      throw error;
    }
  }

  clear(): void {
    this.listeners.clear();
    this.barriers.clear();
  }
}
