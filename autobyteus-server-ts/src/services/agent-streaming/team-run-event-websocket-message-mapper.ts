import {
  TeamRunEventSourceType,
  type TeamRunEvent,
  type TeamRunAgentEventPayload,
  type TeamRunCommunicationEventPayload,
  type TeamRunMemberInputEventPayload,
  type TeamRunStatusUpdateData,
  type TeamRunTaskPlanEventPayload,
  getTeamRunEventSourceRouteKey,
} from "../../agent-team-execution/domain/team-run-event.js";
import type { AgentRunEventMessageMapper } from "./agent-run-event-message-mapper.js";
import {
  createErrorMessage,
  ServerMessage,
  ServerMessageType,
} from "./models.js";
import { serializePayload } from "./payload-serialization.js";
import { buildTeamCommunicationMessagePayload } from "./team-communication-message-payload.js";
import { buildTeamMemberInputMessagePayload } from "./team-member-input-message-payload.js";

export const convertTeamRunEventToServerMessage = (
  event: TeamRunEvent,
  agentRunEventMessageMapper: AgentRunEventMessageMapper,
): ServerMessage => {
  const sourceRouteKey = getTeamRunEventSourceRouteKey(event);
  const sourcePath = Array.isArray(event.sourcePath) ? event.sourcePath : [];
  const sourcePayload = {
    source_path: sourcePath,
    ...(sourceRouteKey ? { source_route_key: sourceRouteKey } : {}),
    ...(event.subTeamNodeName ? { sub_team_node_name: event.subTeamNodeName } : {}),
  };

  if (event.eventSourceType === TeamRunEventSourceType.AGENT) {
    const payload = event.data as TeamRunAgentEventPayload;
    const message = agentRunEventMessageMapper.map(payload.agentEvent);
    const basePayload = message.payload && typeof message.payload === "object"
      ? message.payload
      : {};
    return new ServerMessage(message.type, {
      ...basePayload,
      agent_name: payload.memberName,
      agent_id: payload.memberRunId,
      member_route_key: payload.memberRouteKey,
      member_path: payload.memberPath,
      ...sourcePayload,
    });
  }

  if (event.eventSourceType === TeamRunEventSourceType.TEAM) {
    return new ServerMessage(ServerMessageType.TEAM_STATUS, {
      ...serializePayload(event.data as TeamRunStatusUpdateData),
      ...sourcePayload,
    });
  }

  if (event.eventSourceType === TeamRunEventSourceType.TASK_PLAN) {
    const payload = serializePayload(event.data as TeamRunTaskPlanEventPayload);
    const eventType = Array.isArray(payload.tasks)
      ? "TASKS_CREATED"
      : typeof payload.task_id === "string"
        ? "TASK_STATUS_UPDATED"
        : "TASK_PLAN_EVENT";
    return new ServerMessage(ServerMessageType.TASK_PLAN_EVENT, {
      event_type: eventType,
      ...payload,
      ...sourcePayload,
    });
  }

  if (event.eventSourceType === TeamRunEventSourceType.COMMUNICATION) {
    return new ServerMessage(ServerMessageType.TEAM_COMMUNICATION_MESSAGE, {
      ...buildTeamCommunicationMessagePayload(event.data as TeamRunCommunicationEventPayload),
      ...sourcePayload,
    });
  }

  if (event.eventSourceType === TeamRunEventSourceType.MEMBER_INPUT) {
    return new ServerMessage(ServerMessageType.EXTERNAL_USER_MESSAGE, {
      ...buildTeamMemberInputMessagePayload({
        eventPayload: event.data as TeamRunMemberInputEventPayload,
        sourceRouteKey,
        sourcePath,
      }),
      ...sourcePayload,
    });
  }

  return createErrorMessage("UNKNOWN_TEAM_EVENT", "Unmapped team event");
};
