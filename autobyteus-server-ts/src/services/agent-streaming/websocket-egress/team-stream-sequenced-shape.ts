import {
  parseTeamStreamServerMessage,
  type TeamSegmentContentBatchPayload,
  type TeamStreamServerMessage,
} from "@autobyteus/team-stream-contracts";
import type { SequencedStreamShape } from "./sequenced-stream-shape.js";

type TeamContentItem = Omit<TeamSegmentContentBatchPayload["items"][number], "delta">;

/** Team stream (`/ws/agent-team`): member messages carry `change_sequence` and `agent_run_id`. */
export const teamStreamSequencedShape: SequencedStreamShape<TeamStreamServerMessage, TeamContentItem> = {
  sequenceOf: (message) => {
    const sequence = (message.payload as { change_sequence?: unknown }).change_sequence;
    return typeof sequence === "number" ? sequence : null;
  },
  contentOf: (message) => {
    if (message.type !== "SEGMENT_CONTENT") return null;
    const { agent_run_id, segment_id, turn_id, segment_type, delta } = message.payload;
    return {
      identityKey: JSON.stringify([agent_run_id, segment_id, turn_id, segment_type]),
      item: { agent_run_id, segment_id, turn_id, segment_type },
      delta,
    };
  },
  statusOf: (message) => {
    if (message.type !== "AGENT_STATUS") return null;
    const { change_sequence: _sequence, ...comparable } = message.payload;
    return { agentRunId: message.payload.agent_run_id, comparable };
  },
  isSnapshot: (message) => message.type === "TEAM_EXECUTION_VIEW_SNAPSHOT",
  buildBatch: (first, through, aggregates) => parseTeamStreamServerMessage({
    type: "SEGMENT_CONTENT_BATCH",
    payload: {
      change_sequence: first,
      change_sequence_through: through,
      items: aggregates.map(({ item, text }) => ({ ...item, delta: text })),
    },
  }),
};
