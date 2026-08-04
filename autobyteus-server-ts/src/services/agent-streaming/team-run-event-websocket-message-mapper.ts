import {
  TeamRunEventSourceType,
  type TeamRunEvent,
  type TeamRunAgentEventPayload,
  type TeamRunCommunicationEventPayload,
  type TeamRunMemberInputEventPayload,
  type TeamRunTaskDelegationEventPayload,
} from "../../agent-team-execution/domain/team-run-event.js";
import type { AgentRunEventMessageMapper } from "./agent-run-event-message-mapper.js";
import { createErrorMessage, ServerMessage, ServerMessageType } from "./models.js";
import { serializePayload } from "./payload-serialization.js";
import { buildTeamCommunicationMessagePayload } from "./team-communication-message-payload.js";
import { buildTeamMemberInputMessagePayload } from "./team-member-input-message-payload.js";

export const convertTeamRunEventToServerMessage = (
  event: TeamRunEvent,
  agentRunEventMessageMapper: AgentRunEventMessageMapper,
): ServerMessage => {
  if (event.eventSourceType === TeamRunEventSourceType.AGENT) {
    const payload = event.data as TeamRunAgentEventPayload;
    const message = agentRunEventMessageMapper.map(payload.agentEvent);
    const basePayload = message.payload && typeof message.payload === "object" ? message.payload : {};
    return new ServerMessage(message.type, {
      ...basePayload,
      agent_name: payload.displayName,
      execution_address: payload.executionAddress,
      runtime_kind: payload.runtimeKind,
      ...(payload.taskAgentInstance ? {
        task_agent_instance_id: payload.taskAgentInstance.taskAgentInstanceId,
        task_agent_run_id: payload.taskAgentInstance.taskAgentRunId,
        task_id: payload.taskAgentInstance.taskId,
      } : {}),
    });
  }
  if (event.eventSourceType === TeamRunEventSourceType.TASK_DELEGATION) {
    const payload = event.data as TeamRunTaskDelegationEventPayload;
    return new ServerMessage(ServerMessageType.TASK_DELEGATION_EVENT, {
      event_type: payload.eventType,
      execution_address: event.executionAddress,
      ...serializePayload(payload.payload),
    });
  }
  if (event.eventSourceType === TeamRunEventSourceType.COMMUNICATION) {
    return new ServerMessage(ServerMessageType.TEAM_COMMUNICATION_MESSAGE,
      buildTeamCommunicationMessagePayload(event.data as TeamRunCommunicationEventPayload));
  }
  if (event.eventSourceType === TeamRunEventSourceType.MEMBER_INPUT) {
    return new ServerMessage(ServerMessageType.MEMBER_INPUT_MESSAGE,
      buildTeamMemberInputMessagePayload(event.data as TeamRunMemberInputEventPayload));
  }
  return createErrorMessage("UNKNOWN_TEAM_EVENT", "Unmapped team event");
};
