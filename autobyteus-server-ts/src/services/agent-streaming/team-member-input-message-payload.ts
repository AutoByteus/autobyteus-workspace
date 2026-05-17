import type { TeamRunMemberInputEventPayload } from "../../agent-team-execution/domain/team-run-event.js";

export const buildTeamMemberInputMessagePayload = (input: {
  eventPayload: TeamRunMemberInputEventPayload;
  sourceRouteKey: string | null;
  sourcePath: string[];
}): Record<string, unknown> => {
  const { eventPayload, sourceRouteKey, sourcePath } = input;
  return {
    content: eventPayload.content,
    received_at: eventPayload.receivedAt,
    message_id: eventPayload.messageId,
    dedupe_key: eventPayload.dedupeKey,
    input_origin: eventPayload.inputOrigin,
    context_file_paths: eventPayload.contextFilePaths,
    agent_name: eventPayload.recipientMemberName,
    agent_id: eventPayload.recipientMemberRunId,
    member_route_key: sourceRouteKey ?? eventPayload.recipientMemberRouteKey,
    member_path: sourcePath.length > 0 ? sourcePath : eventPayload.recipientMemberPath,
    sender_agent_id: eventPayload.senderRunId ?? undefined,
    sender_agent_name: eventPayload.senderMemberName ?? undefined,
    sender_member_route_key: eventPayload.senderMemberRouteKey ?? undefined,
    sender_member_path: eventPayload.senderMemberPath ?? undefined,
    parent_communication_message_id: eventPayload.parentCommunicationMessageId ?? undefined,
  };
};
