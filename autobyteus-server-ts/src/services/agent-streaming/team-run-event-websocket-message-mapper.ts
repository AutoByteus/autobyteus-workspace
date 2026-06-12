import {
  TeamRunEventSourceType,
  type TeamRunEvent,
  type TeamRunAgentEventPayload,
  type TeamRunCommunicationEventPayload,
  type TeamRunMemberInputEventPayload,
  type TeamRunStatusUpdateData,
  type TeamRunTaskDelegationEventPayload,
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

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
);

const normalizePath = (value: unknown): string[] => (
  Array.isArray(value)
    ? value.map((part) => String(part).trim()).filter(Boolean)
    : []
);

const flattenTaskDelegationIdentity = (
  payload: Record<string, unknown>,
): Record<string, unknown> => {
  const taskAgentInstance = asRecord(payload.taskAgentInstance);
  const member = asRecord(payload.member);
  const logicalMember = asRecord(taskAgentInstance.logicalMember);
  const memberPath = normalizePath(member.memberPath).length > 0
    ? normalizePath(member.memberPath)
    : normalizePath(logicalMember.memberPath);
  const memberRouteKey = typeof member.memberRouteKey === "string" && member.memberRouteKey.trim()
    ? member.memberRouteKey.trim()
    : typeof logicalMember.memberRouteKey === "string" && logicalMember.memberRouteKey.trim()
      ? logicalMember.memberRouteKey.trim()
      : null;

  return {
    ...(typeof taskAgentInstance.taskAgentInstanceId === "string" ? {
      task_agent_instance_id: taskAgentInstance.taskAgentInstanceId,
    } : {}),
    ...(typeof taskAgentInstance.taskAgentRunId === "string" ? {
      task_agent_run_id: taskAgentInstance.taskAgentRunId,
      agent_id: taskAgentInstance.taskAgentRunId,
    } : {}),
    ...(typeof taskAgentInstance.taskId === "string" ? {
      task_id: taskAgentInstance.taskId,
    } : typeof payload.taskId === "string" ? {
      task_id: payload.taskId,
    } : {}),
    ...(memberRouteKey ? { member_route_key: memberRouteKey } : {}),
    ...(memberPath.length > 0 ? { member_path: memberPath } : {}),
  };
};

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
      ...(payload.taskAgentInstance
        ? {
            task_agent_instance_id: payload.taskAgentInstance.taskAgentInstanceId,
            task_agent_run_id: payload.taskAgentInstance.taskAgentRunId,
            task_id: payload.taskAgentInstance.taskId,
          }
        : {}),
      ...sourcePayload,
    });
  }

  if (event.eventSourceType === TeamRunEventSourceType.TEAM) {
    return new ServerMessage(ServerMessageType.TEAM_STATUS, {
      ...serializePayload(event.data as TeamRunStatusUpdateData),
      ...sourcePayload,
    });
  }

  if (event.eventSourceType === TeamRunEventSourceType.TASK_DELEGATION) {
    const payload = event.data as TeamRunTaskDelegationEventPayload;
    const serializedPayload = serializePayload(payload.payload);
    return new ServerMessage(ServerMessageType.TASK_DELEGATION_EVENT, {
      event_type: payload.eventType,
      ...serializedPayload,
      ...flattenTaskDelegationIdentity(serializedPayload),
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
    return new ServerMessage(ServerMessageType.MEMBER_INPUT_MESSAGE, {
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
