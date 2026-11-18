import type { RunAgentObservation } from "../../agent-collaboration/execution/remote/run-agent-access.js";
import type { RemoteAgentProjection } from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import type { RunProjection } from "../../run-history/projection/run-projection-types.js";
import type { AgentStreamSequence, AgentStreamSequences } from "../../services/agent-streaming/agent-stream-sequence.js";
import { activeRunSnapshot, storedRunSnapshot, type AgentStreamSnapshotPayload } from "../../services/agent-streaming/agent-stream-snapshot.js";

/** One numbered frame of an agent's own stream, as node B sends it to the peer that observes it (SR-088). */
export type PeerAgentStreamFrame = Readonly<{
  agentRunId: string;
  /** The sequence the frame is numbered in: a new one (a restore) means the observer takes a new snapshot. */
  liveSequenceId: string;
  frame: Record<string, unknown>;
}>;

/** The agent's stored read for its snapshot: its run-view projection, as the peer's own `agentProjection` reads it. */
const runProjectionOf = (projection: RemoteAgentProjection): RunProjection => ({
  runId: projection.agentRunId, conversation: [...projection.conversation] as RunProjection["conversation"],
  activities: [...projection.activities] as RunProjection["activities"], summary: projection.summary,
  lastActivityAt: projection.lastActivityAt, hasEarlierActiveTraceEvents: projection.hasEarlierActiveTraceEvents,
});

/**
 * Node B's own snapshot of one of its agents (autobyteus-461 SR-088, by 3b's rule): the base, the confirmed turns and the
 * unconfirmed turns' frames in one step, the stored read behind it, kept by exclusion. A stopped agent's is its full
 * stored read, with no frames and no sequence. The barrier closes at once: the peer's frames come by its observation.
 */
export const peerAgentStreamSnapshot = async (
  sequences: Pick<AgentStreamSequences, "of">,
  agentRunId: string,
  readStored: () => Promise<RemoteAgentProjection>,
): Promise<AgentStreamSnapshotPayload> => {
  const read = async () => runProjectionOf(await readStored());
  const sequence = sequences.of(agentRunId);
  if (!sequence) return storedRunSnapshot(agentRunId, read);
  const connection = await sequence.connect((base) => activeRunSnapshot(sequence, base, read));
  connection.close();
  return connection.snapshot;
};

/**
 * Node B's observation of one of its agents for the peer that started its run (SR-088): its numbered frames, from the
 * agent's own sequence, following it across stops and restores (each restore a new `liveSequenceId`). It ends only
 * when closed.
 */
export const observePeerAgentStream = (
  sequences: Pick<AgentStreamSequences, "follow">,
  agentRunId: string,
  send: (frame: PeerAgentStreamFrame) => void,
): RunAgentObservation => {
  let unsubscribe: () => void = () => undefined;
  const attach = (sequence: AgentStreamSequence | null): void => {
    unsubscribe();
    unsubscribe = sequence
      ? sequence.subscribe((frame) => send(Object.freeze({ agentRunId, liveSequenceId: sequence.liveSequenceId, frame: frame.message.toJSON() })))
      : () => undefined;
  };
  const unfollow = sequences.follow(agentRunId, attach);
  return Object.freeze({ close: () => { unfollow(); unsubscribe(); } });
};
