export type SequencedRootEvent<TEvent> = Readonly<{
  changeSequence: number;
  event: TEvent;
}>;

export type RootEventListener<TEvent> = (
  event: SequencedRootEvent<TEvent>,
) => void;

export type RootSnapshotConnection<TSnapshot, TEvent> = Readonly<{
  snapshot: TSnapshot;
  baseChangeSequence: number;
  queuedEvents: readonly SequencedRootEvent<TEvent>[];
  subscribe(listener: RootEventListener<TEvent>): () => void;
  close(): void;
}>;

/**
 * One non-persisted order/barrier owner for a RootTeamRun. Publication is
 * synchronous and subscriber failures are isolated from domain operations.
 */
export class TeamRunEventPublisher<TEvent> {
  private changeSequence = 0;
  private readonly listeners = new Set<RootEventListener<TEvent>>();
  private readonly barriers = new Set<SequencedRootEvent<TEvent>[]>();

  getCurrentChangeSequence(): number {
    return this.changeSequence;
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
        console.error("RootTeamRun event subscriber failed:", error);
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
