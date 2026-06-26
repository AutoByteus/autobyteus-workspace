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

const pathStartsWith = (path: readonly string[], prefix: readonly string[]): boolean =>
  path.length >= prefix.length && prefix.every((segment, index) => path[index] === segment);

const flattenTaskTeamScopedIdentity = (
  event: TeamRunEvent,
): Record<string, unknown> => {
  const taskTeamInstance = event.taskTeamInstance ?? null;
  if (!taskTeamInstance?.taskTeamRunId) {
    return {};
  }

  const teamPath = [...taskTeamInstance.logicalTeam.memberPath];
  const sourcePath = Array.isArray(event.sourcePath) ? event.sourcePath : [];
  const relativeMemberPath = pathStartsWith(sourcePath, teamPath)
    ? sourcePath.slice(teamPath.length)
    : [];
  const relativeMemberRouteKey = relativeMemberPath.length > 0
    ? relativeMemberPath.join("/")
    : null;

  return {
    task_team_run_id: taskTeamInstance.taskTeamRunId,
    task_team_instance_id: taskTeamInstance.taskTeamInstanceId,
    task_id: taskTeamInstance.taskId,
    team_route_key: taskTeamInstance.logicalTeam.memberRouteKey,
    team_path: teamPath,
    task_team_relative_member_path: relativeMemberPath,
    ...(relativeMemberRouteKey ? { task_team_relative_member_route_key: relativeMemberRouteKey } : {}),
  };
};

const flattenTaskDelegationIdentity = (
  payload: Record<string, unknown>,
): Record<string, unknown> => {
  const execution = asRecord(payload.execution);
  const taskAgentInstance = execution.kind === "task_agent"
    ? asRecord(execution.taskAgentInstance)
    : {};
  const taskTeamInstance = execution.kind === "task_team"
    ? asRecord(execution.taskTeamInstance)
    : {};
  const target = asRecord(payload.target);
  const member = target.kind === "member" ? asRecord(target.member) : {};
  const team = target.kind === "team" ? asRecord(target.team) : {};
  const logicalMember = asRecord(taskAgentInstance.logicalMember);
  const logicalTeam = asRecord(taskTeamInstance.logicalTeam);
  const memberPath = normalizePath(member.memberPath).length > 0
    ? normalizePath(member.memberPath)
    : normalizePath(logicalMember.memberPath);
  const teamPath = normalizePath(team.memberPath).length > 0
    ? normalizePath(team.memberPath)
    : normalizePath(logicalTeam.memberPath);
  const memberRouteKey = typeof member.memberRouteKey === "string" && member.memberRouteKey.trim()
    ? member.memberRouteKey.trim()
    : typeof logicalMember.memberRouteKey === "string" && logicalMember.memberRouteKey.trim()
      ? logicalMember.memberRouteKey.trim()
      : null;
  const teamRouteKey = typeof team.memberRouteKey === "string" && team.memberRouteKey.trim()
    ? team.memberRouteKey.trim()
    : typeof logicalTeam.memberRouteKey === "string" && logicalTeam.memberRouteKey.trim()
      ? logicalTeam.memberRouteKey.trim()
      : null;

  return {
    ...(typeof execution.kind === "string" ? { execution_kind: execution.kind } : {}),
    ...(typeof taskAgentInstance.taskAgentInstanceId === "string" ? { task_agent_instance_id: taskAgentInstance.taskAgentInstanceId } : {}),
    ...(typeof taskAgentInstance.taskAgentRunId === "string" ? { task_agent_run_id: taskAgentInstance.taskAgentRunId, agent_id: taskAgentInstance.taskAgentRunId } : {}),
    ...(typeof taskTeamInstance.taskTeamInstanceId === "string" ? { task_team_instance_id: taskTeamInstance.taskTeamInstanceId } : {}),
    ...(typeof taskTeamInstance.taskTeamRunId === "string" ? { task_team_run_id: taskTeamInstance.taskTeamRunId } : {}),
    ...(typeof taskAgentInstance.taskId === "string" ? { task_id: taskAgentInstance.taskId } :
      typeof taskTeamInstance.taskId === "string" ? { task_id: taskTeamInstance.taskId } :
        typeof payload.taskId === "string" ? { task_id: payload.taskId } : {}),
    ...(memberRouteKey ? { member_route_key: memberRouteKey } : {}),
    ...(memberPath.length > 0 ? { member_path: memberPath } : {}),
    ...(teamRouteKey ? { team_route_key: teamRouteKey } : {}),
    ...(teamPath.length > 0 ? { team_path: teamPath } : {}),
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
    ...flattenTaskTeamScopedIdentity(event),
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
