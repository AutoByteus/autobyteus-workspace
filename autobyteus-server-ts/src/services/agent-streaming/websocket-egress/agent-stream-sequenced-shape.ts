import { ServerMessage, ServerMessageType } from "../models.js";
import type { SequencedStreamShape } from "./sequenced-stream-shape.js";

type AgentContentItem = Readonly<{ id: unknown; turn_id: unknown; segment_type: unknown }>;

/**
 * An agent run's own stream (`/ws/agent`, autobyteus-461 SR-087): its frames carry their number in the run's
 * `AgentStreamSequence`; coalesced content leaves as one `SEGMENT_CONTENT_BATCH` covering the frames it absorbed.
 */
export const agentStreamSequencedShape: SequencedStreamShape<ServerMessage, AgentContentItem> = {
  sequenceOf: (message) => message.sequence ?? null,
  contentOf: (message) => {
    if (message.type !== ServerMessageType.SEGMENT_CONTENT) return null;
    const { id, turn_id, segment_type, delta } = message.payload;
    if (typeof delta !== "string") return null;
    return { identityKey: JSON.stringify([id, turn_id, segment_type]), item: { id, turn_id, segment_type }, delta };
  },
  statusOf: (message) => message.type === ServerMessageType.AGENT_STATUS
    ? { agentRunId: "run", comparable: message.payload }
    : null,
  isSnapshot: (message) => message.type === ServerMessageType.AGENT_STREAM_SNAPSHOT,
  buildBatch: (first, through, aggregates) => new ServerMessage(
    ServerMessageType.SEGMENT_CONTENT_BATCH,
    { items: aggregates.map(({ item, text }) => ({ ...item, delta: text })) },
    first,
    through,
  ),
};
