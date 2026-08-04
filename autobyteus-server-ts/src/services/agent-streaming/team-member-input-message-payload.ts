import type { TeamRunMemberInputEventPayload } from "../../agent-team-execution/domain/team-run-event.js";

export const buildTeamMemberInputMessagePayload = (
  eventPayload: TeamRunMemberInputEventPayload,
): Record<string, unknown> => ({
  content: eventPayload.content,
  received_at: eventPayload.receivedAt,
  message_id: eventPayload.messageId,
  dedupe_key: eventPayload.dedupeKey,
  input_origin: eventPayload.inputOrigin,
  context_file_paths: eventPayload.contextFilePaths,
  recipient_address: eventPayload.recipientAddress,
  sender_address: eventPayload.senderAddress ?? undefined,
  parent_communication_message_id: eventPayload.parentCommunicationMessageId ?? undefined,
  ...(eventPayload.taskAgentInstance ? {
    task_agent_instance_id: eventPayload.taskAgentInstance.taskAgentInstanceId,
    task_agent_run_id: eventPayload.taskAgentInstance.taskAgentRunId,
    task_id: eventPayload.taskAgentInstance.taskId,
  } : {}),
});
