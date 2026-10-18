import {
  CollaborationStreamServerMessageSchema,
  type CollaborationStreamServerMessage,
} from "@autobyteus/collaboration-stream-contracts";
import type { SequencedStreamShape } from "./sequenced-stream-shape.js";

type RootContentItem = Readonly<{
  root_subject_kind: "agent_org" | "agent";
  root_run_id: string;
  member_address: string;
  agent_run_id: string;
  segment_id: string;
  turn_id: string;
  segment_type: string;
}>;

const presentationOf = (message: CollaborationStreamServerMessage) => {
  if (message.type !== "ROOT_EXECUTION_EVENT" || message.payload.root_subject_kind === "agent_team") return null;
  const { event } = message.payload;
  return event.kind === "agent_presentation" ? { envelope: message.payload, event } : null;
};

/** Root execution envelope (`/ws/agent-org`, `/ws/agent-collaboration`): one root sequence per event. */
export const rootExecutionEventSequencedShape: SequencedStreamShape<CollaborationStreamServerMessage, RootContentItem> = {
  sequenceOf: (message) => message.type === "ROOT_EXECUTION_EVENT" ? message.payload.change_sequence : null,
  contentOf: (message) => {
    const presentation = presentationOf(message);
    if (!presentation || presentation.event.message.type !== "SEGMENT_CONTENT") return null;
    const { envelope, event } = presentation;
    const { segment_id, turn_id, segment_type, delta } = presentation.event.message.payload;
    const item: RootContentItem = {
      root_subject_kind: envelope.root_subject_kind, root_run_id: envelope.root_run_id,
      member_address: event.member_address, agent_run_id: event.agent_run_id, segment_id, turn_id, segment_type,
    };
    return {
      identityKey: JSON.stringify([item.root_subject_kind, item.root_run_id, item.agent_run_id, item.member_address, segment_id, turn_id, segment_type]),
      item,
      delta,
    };
  },
  statusOf: (message) => {
    const presentation = presentationOf(message);
    if (!presentation || presentation.event.message.type !== "AGENT_STATUS") return null;
    const { event } = presentation;
    return { agentRunId: event.agent_run_id, comparable: { member_address: event.member_address, status: event.message.payload } };
  },
  isSnapshot: (message) => message.type === "ROOT_EXECUTION_VIEW_SNAPSHOT",
  buildBatch: (first, through, aggregates) => {
    const root = aggregates[0]!.item;
    return CollaborationStreamServerMessageSchema.parse({
      type: "ROOT_EXECUTION_EVENT",
      payload: {
        root_subject_kind: root.root_subject_kind,
        root_run_id: root.root_run_id,
        change_sequence: first,
        change_sequence_through: through,
        event: {
          kind: "agent_presentation_batch",
          items: aggregates.map(({ item, text }) => ({
            member_address: item.member_address,
            agent_run_id: item.agent_run_id,
            message: { type: "SEGMENT_CONTENT", payload: {
              segment_id: item.segment_id, turn_id: item.turn_id, segment_type: item.segment_type, delta: text,
            } },
          })),
        },
      },
    });
  },
};
