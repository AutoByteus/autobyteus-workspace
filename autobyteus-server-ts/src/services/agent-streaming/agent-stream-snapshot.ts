import type { AgentInputStateDto } from "@autobyteus/agent-presentation-contracts";
import type { RunProjection } from "../../run-history/projection/run-projection-types.js";
import type { AgentStreamBase, AgentStreamSequence } from "./agent-stream-sequence.js";
import { ServerMessage, ServerMessageType } from "./models.js";

/** A run's stored conversation, activities and summary, as `getRunProjection` reads them. */
export type ReadStoredRun = (runId: string) => Promise<RunProjection>;

/** The active run's current input state (its queued, forwarded and held input), as `AgentRun.getInputStateSnapshot` gives it. */
export type ReadInputState = () => AgentInputStateDto;

/**
 * An agent run's own stream snapshot (autobyteus-461 SR-087, step 3): its stored part, the frames of its turns not
 * confirmed at the base (the client replays them through its stream handlers), and the base. Frames after the base
 * follow on the stream. `input_state` is the run's current input state, so a reconnecting page sees a message the run
 * holds until its turn ends (autobyteus-540 D-8); `null` when this node cannot tell it (a stopped run, a peer's relay).
 */
export type AgentStreamSnapshotPayload = Readonly<{
  stored: RunProjection;
  input_state: AgentInputStateDto | null;
  turn_frames: readonly Record<string, unknown>[];
  base_sequence: number;
  live_sequence_id: string | null;
}>;

/**
 * Step 2 and 3 for an active run: the stored read, taken after the base, keeps only the entries of turns that predate
 * the sequence or were confirmed at the base (and every entry with no turn); the unconfirmed turns come from their
 * frames. Each turn so comes from one source.
 */
export const activeRunSnapshot = async (
  sequence: AgentStreamSequence,
  base: AgentStreamBase,
  readStored: ReadStoredRun,
  readInputState: ReadInputState | null,
): Promise<AgentStreamSnapshotPayload> => {
  const stored = await readStored(sequence.runId);
  const keep = sequence.keepsStored(base);
  return Object.freeze({
    stored: { ...stored, conversation: stored.conversation.filter((entry) => keep(entry.turnId ?? null)) },
    // Read after the stored part: an entry stays in the input state until its turn's end (pendingSnapshot), so a
    // queued message is in one of the two whenever this runs.
    input_state: readInputState ? readInputState() : null,
    turn_frames: base.turnFrames.map((frame) => frame.message.toJSON()),
    base_sequence: base.baseSequence,
    live_sequence_id: base.liveSequenceId,
  });
};

/** A stopped run, or a run with no active sequence: the full stored conversation, with no frames. */
export const storedRunSnapshot = async (runId: string, readStored: ReadStoredRun): Promise<AgentStreamSnapshotPayload> =>
  Object.freeze({ stored: await readStored(runId), input_state: null, turn_frames: [], base_sequence: 0, live_sequence_id: null });

export const agentStreamSnapshotMessage = (payload: AgentStreamSnapshotPayload): ServerMessage =>
  new ServerMessage(ServerMessageType.AGENT_STREAM_SNAPSHOT, payload as unknown as Record<string, unknown>);
