# IMP-3b: the agent stream snapshot's stored read can't be exact by IDs and offsets

- Step: a code read of the 3b path (design-spec.md item 3b; SR-085, ARCH-REV-058/059/061), before implementing.
- Commit: `34257de4ef` (branch `codex/delegated-copies-outlive-delegator-461`).
- Date: 2026-11-15. Read only; nothing was run.

## What 3b relies on

On connect, item 3b takes a base, reads "the conversation projection (stored or live)" behind the queue, sends
`AGENT_STREAM_SNAPSHOT`, then sends the frames after the base. Two things make that exact:
- non-appending frames (a segment's start or end) are "idempotent by their IDs";
- appending frames carry offsets, and the web applies only the part beyond the segment's current length.

Both need the snapshot's segments to be matchable by ID, and the snapshot to hold every segment closed by the base
(with each open one at the server's length).

## Finding 1: stored segments carry no ID the web can match

- Web, `services/agentStreaming/handlers/segmentIdentity.ts`: a segment's identity is `_streamSegmentIdentity
  { turnId, id }`, set only by the stream handlers (`handleSegmentStart`, `createSyntheticSegmentFromContent`).
- Web, `segmentHandler.ts:297-311` (`findStreamSegment`): a frame finds its segment only by that identity.
  - `SEGMENT_START` for an unmatched ID pushes a new segment (`:79-88`).
  - `SEGMENT_CONTENT` for an unmatched ID creates a synthetic segment (`:197-200`).
  - So an offset has no segment to measure against.
- Server, `run-history/projection/run-projection-types.ts:30-48` (`RunProjectionConversationEntry`): a text or
  reasoning entry has no segment ID or turn ID. Only a tool entry has `invocationId`.
- Result: a segment that is in the stored read and also has frames after the base is shown twice.

## Finding 2: the stored state doesn't match segment ends

- Native runtime, `autobyteus-ts/src/agent/loop/llm-phase.ts:263-281` (`settleCompleted`):
  - the whole LLM call's response (reasoning, text, tool intents) is written only when the stream settles,
    synchronously (`memory/store/run-memory-file-store.ts:497`, `appendFileSync`);
  - its segment ends are emitted by `finalize` and `llm-response-stream-collector.ts:139-142` and reach the
    server's `AgentRun` events asynchronously;
  - so the write and the server's `SEGMENT_END` arrive in either order.
- External runtimes, `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-accumulator.ts`:
  - a text segment is written at its `SEGMENT_END`, through the recorder's async per-run queue
    (`agent-run-memory-recorder.ts:83-90`);
  - an open reasoning segment is written at a tool boundary (`flushOpenReasoningSegments`) while the stream still
    has it open.
- Results:
  - a segment closed before the base but not yet written is in neither the stored read nor the frames, so it is
    **lost**;
  - a segment written during the read whose end or content arrives after the base is in both, with no ID to match,
    so it is **doubled** (Finding 1);
  - a reasoning segment written at a tool boundary while still open is in the stored read and in the snapshot's open
    segments, so it is **doubled**.

## What would make it exact (for the designer to decide)

- (A) The stored read leaves out the current turn, and the sequence supplies it:
  - `AgentStreamSequence` keeps the frames of the turn that is active at the base, and of turns that start during the
    read;
  - the stored projection leaves out those turns' assistant and tool entries (raw traces carry `turnId`; the user's
    and inter-agent messages stay, matched by `messageId`);
  - the snapshot is the stored part plus those frames, which the web replays through its handlers;
  - the frames after the base don't overlap the snapshot, so the agent stream needs no offsets;
  - open question: a completed turn's write that lags `TURN_COMPLETED` (the external runtimes' async queue).
- (B) Stored segments carry `(turnId, segmentId)` from the raw trace, through the projection, into the web's
  hydration:
  - this fixes the doubling only;
  - a segment closed but not yet written is still lost.
- G-D1 has the same question: `readConversation` on node B is the same stored read.
