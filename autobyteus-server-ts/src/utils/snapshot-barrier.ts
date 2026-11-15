/** A stream's snapshot connection: its snapshot, the base it was taken at, and the frames numbered after that base. */
export type SnapshotConnection<TSnapshot, TFrame> = Readonly<{
  snapshot: TSnapshot;
  /** The frames published after the base while the snapshot was read. */
  queuedFrames: readonly TFrame[];
  /** Delivers the queued frames, then every later frame, to `listener`; it closes the barrier. */
  subscribe(listener: (frame: TFrame) => void): () => void;
  close(): void;
}>;

/**
 * SR-063's connection rule, owned once (autobyteus-461 ARCH-REV-063 recommendation): a stream's base is taken in one
 * synchronous step with the start of a queue, its slow read runs behind that queue, and a connection then gets the
 * frames numbered after the base, none lost and none twice. Each stream numbers its own frames and decides what its
 * base holds (`RunViewStream` for a run's view, `AgentStreamSequence` for an agent run's own stream); this barrier only
 * keeps the frames published while a snapshot is read.
 */
export class SnapshotBarrier<TFrame> {
  private readonly listeners = new Set<(frame: TFrame) => void>();
  private readonly barriers = new Set<TFrame[]>();

  /** Hands a numbered frame to every open barrier and every listener; a listener's failure is isolated. */
  deliver(frame: TFrame): void {
    for (const queue of this.barriers) queue.push(frame);
    for (const listener of [...this.listeners]) {
      try {
        listener(frame);
      } catch (error) {
        console.error("stream frame subscriber failed:", error);
      }
    }
  }

  subscribe(listener: (frame: TFrame) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Opens a snapshot connection: the caller has taken its base synchronously just before (no frame can be published in
   * between, publication being synchronous), and `read` is the slow part, run behind the queue.
   */
  async open<TSnapshot>(read: () => Promise<TSnapshot> | TSnapshot): Promise<SnapshotConnection<TSnapshot, TFrame>> {
    const queued: TFrame[] = [];
    this.barriers.add(queued);
    try {
      const snapshot = await read();
      let open = true;
      const close = (): void => {
        if (!open) return;
        open = false;
        this.barriers.delete(queued);
      };
      return Object.freeze({
        snapshot,
        get queuedFrames() { return Object.freeze([...queued]); },
        subscribe: (listener: (frame: TFrame) => void) => {
          if (!open) throw new Error("Snapshot connection is closed.");
          close();
          for (const frame of queued) listener(frame);
          return this.subscribe(listener);
        },
        close,
      });
    } catch (error) {
      this.barriers.delete(queued);
      throw error;
    }
  }
}
