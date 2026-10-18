import type { StreamEgressMessage } from "./agent-stream-egress-control.js";

/** One content delta of a sequenced stream, keyed by its content identity (agent run, turn, segment, type). */
export type SequencedContentPart<I> = Readonly<{ identityKey: string; item: I; delta: string }>;

/** The concatenated text of one content identity inside a pending batch. */
export type SequencedContentAggregate<I> = Readonly<{ item: I; text: string }>;

/** A status comparable without its sequence/envelope fields, for one agent run. */
export type SequencedStatus = Readonly<{ agentRunId: string; comparable: unknown }>;

/**
 * Wire-format knowledge of one sequenced stream (Team, or the root execution envelope of Org and
 * delegated-agent sockets). The sequenced cadence scheduler depends only on this contract.
 */
export interface SequencedStreamShape<M extends StreamEgressMessage, I> {
  /** The root change sequence the message stands for, or null for an unsequenced message. */
  sequenceOf(message: M): number | null;
  contentOf(message: M): SequencedContentPart<I> | null;
  statusOf(message: M): SequencedStatus | null;
  /** A snapshot replaces the client's state, so status repeats are compared from scratch after it. */
  isSnapshot(message: M): boolean;
  /** One batch frame covering `[first, through]`, with one item per aggregate in order. */
  buildBatch(first: number, through: number, aggregates: readonly SequencedContentAggregate<I>[]): M;
}
