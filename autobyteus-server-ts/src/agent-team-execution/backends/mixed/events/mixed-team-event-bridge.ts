import {
  TeamRunEventSourceType,
  type TeamRunAgentEventPayload,
  type TeamRunCommunicationEventPayload,
  type TeamRunEvent,
} from "../../../domain/team-run-event.js";
import { AgentRunEventType } from "../../../../agent-execution/domain/agent-run-event.js";
import {
  cloneTaskTeamInstanceIdentity,
  type TaskTeamInstanceIdentity,
} from "../../../domain/task-team-instance.js";
import { buildMemberRouteKeyFromPath } from "../../../domain/team-run-member-identity.js";
import {
  buildOrdinaryTeamLeafAgentStatusSnapshot,
  buildTaskTeamLeafAgentStatusSnapshot,
  type TeamLeafAgentStatusSnapshot,
} from "../../../domain/team-leaf-agent-status-snapshot.js";
import {
  cloneConversationTargetSegment,
  normalizeConversationTargetAddress,
  type ConversationTargetAddress,
  type ConversationTargetMemberSegment,
  type ConversationTargetSegment,
} from "../../../domain/conversation-target-address.js";

const pathStartsWith = (path: readonly string[], prefix: readonly string[]): boolean =>
  path.length >= prefix.length && prefix.every((segment, index) => path[index] === segment);

const prefixPath = (path: readonly string[], prefix: readonly string[], isAlreadyParentRooted: boolean): string[] =>
  isAlreadyParentRooted && pathStartsWith(path, prefix) ? [...path] : [...prefix, ...path];

export type MixedTeamAgentScope = {
  teamRunId: string;
  memberPath: string[];
  sourcePath: string[];
  taskTeamInstance: TaskTeamInstanceIdentity | null;
};

export type PrefixedMixedTeamAgentScope = MixedTeamAgentScope & {
  memberRouteKey: string;
  sourceRouteKey: string;
};

export const prefixMixedTeamAgentScope = (input: {
  parentTeamRunId: string;
  sourcePrefix: string[];
  scope: MixedTeamAgentScope;
  taskTeamInstanceOverride?: TaskTeamInstanceIdentity;
}): PrefixedMixedTeamAgentScope => {
  const isAlreadyParentRooted = input.scope.teamRunId === input.parentTeamRunId;
  const memberPath = prefixPath(
    input.scope.memberPath,
    input.sourcePrefix,
    isAlreadyParentRooted,
  );
  const sourcePath = prefixPath(
    input.scope.sourcePath,
    input.sourcePrefix,
    isAlreadyParentRooted,
  );
  const taskTeamInstance = input.taskTeamInstanceOverride
    ? cloneTaskTeamInstanceIdentity(input.taskTeamInstanceOverride)
    : input.scope.taskTeamInstance
      ? cloneTaskTeamInstanceIdentity(input.scope.taskTeamInstance)
      : null;

  return {
    teamRunId: input.parentTeamRunId,
    memberPath,
    memberRouteKey: buildMemberRouteKeyFromPath(memberPath),
    sourcePath,
    sourceRouteKey: buildMemberRouteKeyFromPath(sourcePath),
    taskTeamInstance,
  };
};

const memberSegmentRouteKey = (segment: ConversationTargetMemberSegment): string => {
  if (typeof segment.memberRouteKey === "string" && segment.memberRouteKey.trim()) {
    return segment.memberRouteKey.trim();
  }
  const memberPath = Array.isArray(segment.memberPath)
    ? segment.memberPath.map((part) => part.trim()).filter(Boolean)
    : [];
  return memberPath.length > 0 ? buildMemberRouteKeyFromPath(memberPath) : "";
};

const prefixMemberSegment = (
  segment: ConversationTargetMemberSegment,
  sourcePrefix: string[],
): ConversationTargetMemberSegment => {
  const routeKey = memberSegmentRouteKey(segment);
  if (sourcePrefix.length === 0) {
    return { kind: "member", memberRouteKey: routeKey };
  }
  const memberPath = Array.isArray(segment.memberPath) && segment.memberPath.length > 0
    ? segment.memberPath
    : routeKey.split("/");
  return {
    kind: "member",
    memberRouteKey: buildMemberRouteKeyFromPath([...sourcePrefix, ...memberPath]),
  };
};

const addressHasTaskTeamSegment = (
  address: ConversationTargetAddress,
  taskTeamInstance?: TaskTeamInstanceIdentity | null,
): boolean => Boolean(
  taskTeamInstance?.taskTeamRunId &&
  address.segments.some((segment) =>
    segment.kind === "task_team" && segment.taskTeamRunId === taskTeamInstance.taskTeamRunId),
);

const prefixConversationAddress = (input: {
  address: ConversationTargetAddress;
  sourcePrefix: string[];
  taskTeamInstance?: TaskTeamInstanceIdentity | null;
}): ConversationTargetAddress => {
  const normalized = normalizeConversationTargetAddress(input.address);
  if (addressHasTaskTeamSegment(normalized, input.taskTeamInstance)) {
    return { segments: normalized.segments.map(cloneConversationTargetSegment) };
  }
  const segments: ConversationTargetSegment[] = normalized.segments.map((segment, index) => (
    index === 0 && segment.kind === "member"
      ? prefixMemberSegment(segment, input.sourcePrefix)
      : cloneConversationTargetSegment(segment)
  ));
  return { segments };
};

const maybePrefixConversationAddress = (input: {
  address: unknown;
  sourcePrefix: string[];
  taskTeamInstance?: TaskTeamInstanceIdentity | null;
}): ConversationTargetAddress | unknown => {
  if (!input.address || typeof input.address !== "object" || Array.isArray(input.address)) {
    return input.address;
  }
  return prefixConversationAddress({
    address: input.address as ConversationTargetAddress,
    sourcePrefix: input.sourcePrefix,
    taskTeamInstance: input.taskTeamInstance,
  });
};

const prefixCommunicationPayload = (input: {
  parentTeamRunId: string;
  sourcePrefix: string[];
  payload: TeamRunCommunicationEventPayload;
  taskTeamInstance?: TaskTeamInstanceIdentity | null;
}): TeamRunCommunicationEventPayload => ({
  ...input.payload,
  teamRunId: input.parentTeamRunId,
  senderAddress: prefixConversationAddress({
    address: input.payload.senderAddress,
    sourcePrefix: input.sourcePrefix,
    taskTeamInstance: input.taskTeamInstance,
  }),
  receiverAddress: prefixConversationAddress({
    address: input.payload.receiverAddress,
    sourcePrefix: input.sourcePrefix,
    taskTeamInstance: input.taskTeamInstance,
  }),
});

const prefixAgentPayload = (input: {
  payload: TeamRunAgentEventPayload;
  scope: PrefixedMixedTeamAgentScope;
  sourcePrefix: string[];
  taskTeamInstance?: TaskTeamInstanceIdentity | null;
}): TeamRunAgentEventPayload => {
  const agentEventPayload = input.payload.agentEvent.eventType === AgentRunEventType.TEAM_COMMUNICATION_MESSAGE
    && input.payload.agentEvent.payload
    && typeof input.payload.agentEvent.payload === "object"
    && !Array.isArray(input.payload.agentEvent.payload)
    ? {
        ...input.payload.agentEvent.payload,
        senderAddress: maybePrefixConversationAddress({
          address: (input.payload.agentEvent.payload as { senderAddress?: unknown }).senderAddress,
          sourcePrefix: input.sourcePrefix,
          taskTeamInstance: input.taskTeamInstance,
        }),
        receiverAddress: maybePrefixConversationAddress({
          address: (input.payload.agentEvent.payload as { receiverAddress?: unknown }).receiverAddress,
          sourcePrefix: input.sourcePrefix,
          taskTeamInstance: input.taskTeamInstance,
        }),
      }
    : input.payload.agentEvent.payload;
  return {
    ...input.payload,
    memberPath: input.scope.memberPath,
    memberRouteKey: input.scope.memberRouteKey,
    agentEvent: {
      ...input.payload.agentEvent,
      payload: agentEventPayload,
    },
  };
};

export const prefixMixedSubTeamEvent = (input: {
  parentTeamRunId: string;
  sourcePrefix: string[];
  event: TeamRunEvent;
  taskTeamInstance?: TaskTeamInstanceIdentity | null;
}): TeamRunEvent => {
  const isAlreadyParentRooted = input.event.teamRunId === input.parentTeamRunId;
  const agentPayload = input.event.eventSourceType === TeamRunEventSourceType.AGENT
    ? input.event.data as TeamRunAgentEventPayload
    : null;
  const agentScope = agentPayload
    ? prefixMixedTeamAgentScope({
        parentTeamRunId: input.parentTeamRunId,
        sourcePrefix: input.sourcePrefix,
        scope: {
          teamRunId: input.event.teamRunId,
          memberPath: agentPayload.memberPath,
          sourcePath: input.event.sourcePath,
          taskTeamInstance: input.event.taskTeamInstance ?? null,
        },
        ...(input.taskTeamInstance
          ? { taskTeamInstanceOverride: input.taskTeamInstance }
          : {}),
      })
    : null;
  const sourcePath = agentScope?.sourcePath ?? prefixPath(
    input.event.sourcePath,
    input.sourcePrefix,
    isAlreadyParentRooted,
  );
  const data =
    input.event.eventSourceType === TeamRunEventSourceType.COMMUNICATION
        ? prefixCommunicationPayload({
            parentTeamRunId: input.parentTeamRunId,
            sourcePrefix: input.sourcePrefix,
            payload: input.event.data as TeamRunCommunicationEventPayload,
            taskTeamInstance: input.taskTeamInstance ?? input.event.taskTeamInstance ?? null,
          })
      : input.event.eventSourceType === TeamRunEventSourceType.AGENT
          ? prefixAgentPayload({
              scope: agentScope!,
              sourcePrefix: input.sourcePrefix,
              payload: agentPayload!,
              taskTeamInstance: agentScope!.taskTeamInstance,
            })
        : input.event.data;

  return {
    ...input.event,
    teamRunId: input.parentTeamRunId,
    sourcePath,
    data,
    taskTeamInstance: agentScope?.taskTeamInstance ?? (input.taskTeamInstance
      ? cloneTaskTeamInstanceIdentity(input.taskTeamInstance)
      : input.event.taskTeamInstance
        ? cloneTaskTeamInstanceIdentity(input.event.taskTeamInstance)
        : null),
    subTeamNodeName: input.sourcePrefix[input.sourcePrefix.length - 1] ?? input.event.subTeamNodeName ?? null,
  };
};

export const prefixMixedTeamLeafAgentStatusSnapshot = (input: {
  parentTeamRunId: string;
  sourcePrefix: string[];
  snapshot: TeamLeafAgentStatusSnapshot;
  taskTeamInstanceOverride?: TaskTeamInstanceIdentity;
}): TeamLeafAgentStatusSnapshot => {
  const scope = prefixMixedTeamAgentScope({
    parentTeamRunId: input.parentTeamRunId,
    sourcePrefix: input.sourcePrefix,
    scope: {
      teamRunId: input.snapshot.teamRunId,
      memberPath: input.snapshot.payload.member_path,
      sourcePath: input.snapshot.payload.source_path,
      taskTeamInstance: input.snapshot.scopeKind === "task_team_member"
        ? input.snapshot.taskTeamInstance
        : null,
    },
    ...(input.taskTeamInstanceOverride
      ? { taskTeamInstanceOverride: input.taskTeamInstanceOverride }
      : {}),
  });
  const payload = {
    ...input.snapshot.payload,
    member_path: scope.memberPath,
    member_route_key: scope.memberRouteKey,
    source_path: scope.sourcePath,
    source_route_key: scope.sourceRouteKey,
  };

  return scope.taskTeamInstance
    ? buildTaskTeamLeafAgentStatusSnapshot({
        teamRunId: scope.teamRunId,
        payload,
        taskTeamInstance: scope.taskTeamInstance,
      })
    : buildOrdinaryTeamLeafAgentStatusSnapshot({
        teamRunId: scope.teamRunId,
        payload,
      });
};
