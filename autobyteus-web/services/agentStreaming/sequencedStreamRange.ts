/**
 * Team, Org and delegated-agent sockets number every root event. A frame covers the contiguous
 * root sequences `[first, through]`: a content batch covers every event it coalesced (including
 * absorbed identical status repeats), any other frame covers exactly one (`through === first`).
 */
export type SequencedStreamRange = Readonly<{ first: number; through: number }>;

/** The next expected sequence after `range`, or null when `range` does not start at `next` (a gap or reorder). */
export const advanceSequencedStream = (next: number, range: SequencedStreamRange): number | null =>
  range.first === next && range.through >= range.first ? range.through + 1 : null;
