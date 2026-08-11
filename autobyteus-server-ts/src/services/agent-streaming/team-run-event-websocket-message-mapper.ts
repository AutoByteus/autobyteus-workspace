import {
  parseTeamStreamServerMessage,
  type TeamStreamServerMessage,
} from "@autobyteus/team-stream-contracts";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
} from "../../agent-team-execution/domain/team-run-event.js";
import {
  projectTeamAgentEventMessage,
  projectTeamExecutionAddressDto,
} from "./team-agent-event-websocket-projector.js";

const assertNever = (value: never): never => {
  throw new Error(`Unmapped TeamRun event '${String(value)}'.`);
};

export const convertTeamRunEventToServerMessage = (
  event: TeamRunEvent,
): TeamStreamServerMessage => {
  switch (event.eventSourceType) {
    case TeamRunEventSourceType.AGENT:
      return projectTeamAgentEventMessage(event.execution, event.payload);
    case TeamRunEventSourceType.TASK_DELEGATION: {
      const execution_address = projectTeamExecutionAddressDto(event.executionAddress);
      switch (event.payload.eventType) {
        case "TASK_DELEGATION_ACTIVATED":
          return parseTeamStreamServerMessage({ type: "TASK_DELEGATION_EVENT", payload: {
            event_type: event.payload.eventType,
            execution_address,
            task_id: event.payload.details.taskId,
            sender_address: projectTeamExecutionAddressDto(event.payload.details.senderAddress),
            content: event.payload.details.content,
            reference_files: event.payload.details.referenceFiles.map((reference) => ({
              reference_id: reference.referenceId,
              path: reference.path,
              type: reference.type,
              created_at: reference.createdAt,
              updated_at: reference.updatedAt,
            })),
            created_at: event.payload.details.createdAt,
            started_at: event.payload.details.startedAt,
          } });
        case "TASK_DELEGATION_RESULT_SUBMITTED":
          return parseTeamStreamServerMessage({ type: "TASK_DELEGATION_EVENT", payload: {
            event_type: event.payload.eventType,
            execution_address,
            task_id: event.payload.details.taskId,
            submission_id: event.payload.details.submissionId,
            submitted_at: event.payload.details.submittedAt,
          } });
        case "TASK_DELEGATION_RESULT_REVIEWED":
          return parseTeamStreamServerMessage({ type: "TASK_DELEGATION_EVENT", payload: {
            event_type: event.payload.eventType,
            execution_address,
            task_id: event.payload.details.taskId,
            review_id: event.payload.details.reviewId,
            reviewed_submission_id: event.payload.details.reviewedSubmissionId,
            decision: event.payload.details.decision,
            reviewed_at: event.payload.details.reviewedAt,
          } });
      }
    }
    case TeamRunEventSourceType.COMMUNICATION:
      return parseTeamStreamServerMessage({ type: "TEAM_COMMUNICATION_MESSAGE", payload: {
        message_id: event.payload.messageId,
        sender_address: projectTeamExecutionAddressDto(event.payload.senderAddress),
        receiver_address: projectTeamExecutionAddressDto(event.payload.receiverAddress),
        content: event.payload.content,
        message_type: event.payload.messageType,
        reference_files: event.payload.referenceFiles.map((reference) => ({
          reference_id: reference.referenceId,
          path: reference.path,
          type: reference.type,
          created_at: reference.createdAt,
          updated_at: reference.updatedAt,
        })),
        created_at: event.payload.createdAt,
      } });
    case TeamRunEventSourceType.MEMBER_INPUT:
      return parseTeamStreamServerMessage({ type: "MEMBER_INPUT_MESSAGE", payload: {
        execution_address: projectTeamExecutionAddressDto(event.executionAddress),
        message_id: event.payload.messageId,
        dedupe_key: event.payload.dedupeKey,
        content: event.payload.content,
        input_origin: event.payload.inputOrigin,
        received_at: event.payload.receivedAt,
        context_file_paths: event.payload.contextFilePaths.map((file) => ({ path: file.path, type: file.type })),
        sender_address: event.payload.senderAddress ? projectTeamExecutionAddressDto(event.payload.senderAddress) : null,
        parent_communication_message_id: event.payload.parentCommunicationMessageId,
      } });
    default:
      return assertNever(event);
  }
};
