import { randomUUID } from "node:crypto";
import { rootExecutionIdentityKey, type RootExecutionIdentity } from "../execution/domain/root-execution-identity.js";
import type { DelegationIndex } from "./delegation-index.js";
import { RunMessagesFeed, type RunMessageEvents } from "./run-messages-feed.js";

export type SequencedRootEvent<TEvent> = Readonly<{
  changeSequence: number;
  event: TEvent;
}>;

/**
 * Where a live root stands, read together: its live sequence, the change sequence published so far in it, and the
 * sequence of its latest message event (0 when none; autobyteus-358, SR-007).
 */
export type RootLivePosition = Readonly<{ liveSequenceId: string; changeSequence: number; lastMessageChangeSequence: number }>;

/** Which of a root's events are messages: the ones a client adds to its participant message lists (SR-008). */
export type RunViewStreamOptions<TEvent> = Readonly<{ isMessageEvent(event: TEvent): boolean }>;

export type RootEventListener<TEvent> = (
  event: SequencedRootEvent<TEvent>,
) => void;

export type RootSnapshotConnection<TSnapshot, TEvent> = Readonly<{
  snapshot: TSnapshot;
  baseChangeSequence: number;
  liveSequenceId: string;
  /** The sequence of the latest message event through `baseChangeSequence` (0 when none). */
  lastMessageChangeSequence: number;
  queuedEvents: readonly SequencedRootEvent<TEvent>[];
  subscribe(listener: RootEventListener<TEvent>): () => void;
  close(): void;
}>;

/**
 * The one order/barrier owner of a run's view (autobyteus-461 SR-062, SR-063): base's `RootEventPublisher`, moved out of
 * the root. It numbers every frame of the run's view in one sequence: the run's own events (its live root hands them
 * over), the tree's row events (`ChildRowsFeed`) and its peer rows' summaries (`PeerChildObservation`); a row's status is
 * its own run's, read by run ID (`RunStatusService`, SR-083). One
 * per run, from the composition root's `RunViewStreams`, living as long as the process, so the run's view exists
 * whether or not its root is loaded. Non-persisted; publication is synchronous and subscriber failures are isolated.
 */
export class RunViewStream<TEvent> {
  /**
   * Names this stream's change sequence (autobyteus-358, SR-005): it starts at 0 for every instance, so a sequence
   * number is comparable only with others of the same ID. The instance lives as long as the process, so a stop and a
   * restore of the run keep it; a server restart starts another.
   */
  readonly liveSequenceId = randomUUID();
  private changeSequence = 0;
  private lastMessageChangeSequence = 0;
  private readonly listeners = new Set<RootEventListener<TEvent>>();
  private readonly barriers = new Set<SequencedRootEvent<TEvent>[]>();

  constructor(private readonly options: RunViewStreamOptions<TEvent>) {}

  getCurrentChangeSequence(): number {
    return this.changeSequence;
  }

  /** The live sequence and its current change sequence in one read, so the pair always names one sequence. */
  getLivePosition(): RootLivePosition {
    return Object.freeze({ liveSequenceId: this.liveSequenceId, changeSequence: this.changeSequence,
      lastMessageChangeSequence: this.lastMessageChangeSequence });
  }

  publish(event: TEvent): SequencedRootEvent<TEvent> {
    const sequenced = Object.freeze({
      changeSequence: this.changeSequence + 1,
      event,
    });
    this.changeSequence = sequenced.changeSequence;
    if (this.options.isMessageEvent(event)) this.lastMessageChangeSequence = sequenced.changeSequence;
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
    const lastMessageChangeSequence = this.lastMessageChangeSequence;
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
        lastMessageChangeSequence,
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

}

/**
 * The composition root's view stream registry (SR-062): each run's one `RunViewStream`, created on its first use and
 * kept for the life of the process. A run's root, its view sessions, `ChildRowsFeed` and `PeerChildObservation` all
 * take the run's stream from here. Which events are messages, and each kind's message event, are each root kind's
 * rules, given by the composition root. It holds the node's message feed over these streams (`messages`, SR-072).
 */
export class RunViewStreams {
  private readonly streams = new Map<string, RunViewStream<unknown>>();
  /** The node's feed of committed messages into the views of their runs and the runs above them (SR-072). */
  readonly messages: RunMessagesFeed;

  constructor(
    private readonly isMessageEvent: Readonly<Record<RootExecutionIdentity["rootSubjectKind"], (event: never) => boolean>>,
    feed: Readonly<{ tree: Pick<DelegationIndex, "chainOf" | "collaborationTreeOf">; events: RunMessageEvents }>,
  ) {
    this.messages = new RunMessagesFeed({ ...feed, openStreamOf: (run) => this.streams.get(rootExecutionIdentityKey(run)) ?? null });
  }

  streamOf<TEvent>(run: RootExecutionIdentity): RunViewStream<TEvent> {
    const key = rootExecutionIdentityKey(run);
    const existing = this.streams.get(key);
    if (existing) return existing as RunViewStream<TEvent>;
    const isMessageEvent = this.isMessageEvent[run.rootSubjectKind] as (event: TEvent) => boolean;
    const stream = new RunViewStream<TEvent>({ isMessageEvent });
    this.streams.set(key, stream as RunViewStream<unknown>);
    return stream;
  }
}
