import {
  AgentEventRebroadcastPayload,
  AgentTeamStreamEvent,
  SubTeamEventRebroadcastPayload,
} from "autobyteus-ts";
import { serializePayload } from "../../services/agent-streaming/payload-serialization.js";

export const normalizeRouteSegment = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const combineMemberRoutePrefix = (
  routePrefix: string | null,
  segment: string | null,
): string | null => {
  if (!segment) {
    return routePrefix;
  }
  if (!routePrefix) {
    return segment;
  }
  return `${routePrefix}/${segment}`;
};

const resolveSourceEventId = (
  teamEvent: AgentTeamStreamEvent,
  routeKey: string,
  runtimeEventType: string,
): string => {
  const teamEventId = normalizeRouteSegment(teamEvent.event_id);
  if (teamEventId) {
    return `${teamEventId}:${routeKey}:${runtimeEventType}`;
  }
  return `${routeKey}:${runtimeEventType}:${Date.now()}`;
};

const getNestedPayloadRecord = (
  payload: Record<string, unknown>,
): Record<string, unknown> | null => {
  const nested = payload.payload;
  if (!nested || typeof nested !== "object" || Array.isArray(nested)) {
    return null;
  }
  return nested as Record<string, unknown>;
};

const pickFirstNonEmptyString = (...values: Array<unknown>): string | null => {
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }
    const normalized = value.trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }
  return null;
};

const normalizeSegmentRuntimePayload = (
  payload: Record<string, unknown>,
): Record<string, unknown> => {
  const nestedPayload = getNestedPayloadRecord(payload);
  const normalizedPayload: Record<string, unknown> = {};

  const eventType = pickFirstNonEmptyString(payload.event_type, nestedPayload?.event_type);
  if (eventType) {
    normalizedPayload.event_type = eventType;
  }

  const id = pickFirstNonEmptyString(
    payload.id,
    payload.segment_id,
    nestedPayload?.id,
    nestedPayload?.segment_id,
  );
  if (id) {
    normalizedPayload.id = id;
  }

  if (payload.segment_type !== undefined) {
    normalizedPayload.segment_type = payload.segment_type;
  } else if (nestedPayload?.segment_type !== undefined) {
    normalizedPayload.segment_type = nestedPayload.segment_type;
  }

  if (payload.delta !== undefined) {
    normalizedPayload.delta = payload.delta;
  } else if (nestedPayload?.delta !== undefined) {
    normalizedPayload.delta = nestedPayload.delta;
  }

  if (payload.metadata !== undefined) {
    normalizedPayload.metadata = payload.metadata;
  } else if (nestedPayload?.metadata !== undefined) {
    normalizedPayload.metadata = nestedPayload.metadata;
  }

  return normalizedPayload;
};

const normalizeRuntimePayloadForDistributedContract = (
  runtimeEventType: string,
  payload: Record<string, unknown>,
): Record<string, unknown> => {
  if (runtimeEventType.toLowerCase() !== "segment_event") {
    return payload;
  }
  // Segment runtime payloads use internal field names (segment_id, nested payload).
  // Normalize at projection boundary so distributed rebroadcasts stay on canonical WS contract.
  return normalizeSegmentRuntimePayload(payload);
};

export const projectRemoteExecutionEventsFromTeamEvent = (input: {
  teamEvent: AgentTeamStreamEvent;
  routePrefix?: string | null;
}): Array<{
  sourceEventId: string;
  memberName: string;
  agentId: string | null;
  eventType: string;
  payload: Record<string, unknown>;
}> => {
  const routePrefix = input.routePrefix ?? null;
  const sourceType = input.teamEvent.event_source_type;

  if (
    sourceType === "AGENT" &&
    input.teamEvent.data instanceof AgentEventRebroadcastPayload
  ) {
    const runtimeAgentName = normalizeRouteSegment(input.teamEvent.data.agent_name);
    const runtimeEventType = normalizeRouteSegment(
      String(input.teamEvent.data.agent_event.event_type ?? ""),
    );
    if (!runtimeAgentName || !runtimeEventType) {
      return [];
    }
    const memberRouteKey = combineMemberRoutePrefix(routePrefix, runtimeAgentName);
    if (!memberRouteKey) {
      return [];
    }
    const payload = normalizeRuntimePayloadForDistributedContract(
      runtimeEventType,
      serializePayload(input.teamEvent.data.agent_event.data),
    );
    payload.agent_name = runtimeAgentName;
    payload.member_route_key = memberRouteKey;
    payload.event_scope = "member_scoped";
    return [
      {
        sourceEventId: resolveSourceEventId(input.teamEvent, memberRouteKey, runtimeEventType),
        memberName: memberRouteKey,
        agentId: normalizeRouteSegment(input.teamEvent.data.agent_event.agent_id),
        eventType: runtimeEventType,
        payload,
      },
    ];
  }

  if (
    sourceType === "SUB_TEAM" &&
    input.teamEvent.data instanceof SubTeamEventRebroadcastPayload &&
    input.teamEvent.data.sub_team_event instanceof AgentTeamStreamEvent
  ) {
    const subTeamNodeName = normalizeRouteSegment(input.teamEvent.data.sub_team_node_name);
    const nextPrefix = combineMemberRoutePrefix(routePrefix, subTeamNodeName);
    return projectRemoteExecutionEventsFromTeamEvent({
      teamEvent: input.teamEvent.data.sub_team_event,
      routePrefix: nextPrefix,
    });
  }

  return [];
};
