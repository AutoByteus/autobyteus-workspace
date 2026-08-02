import { AgentRunEventType } from "../../../../agent-execution/domain/agent-run-event.js";
import {
  cloneConversationTargetSegment,
  normalizeConversationTargetAddress,
  type ConversationTargetAddress,
  type ConversationTargetMemberSegment,
  type ConversationTargetSegment,
} from "../../../domain/conversation-target-address.js";
import {
  buildOrdinaryTeamLeafAgentStatusSnapshot,
  buildTaskTeamLeafAgentStatusSnapshot,
  type TeamLeafAgentStatusSnapshot,
} from "../../../domain/team-leaf-agent-status-snapshot.js";
import {
  TeamRunEventSourceType,
  type TeamRunAgentEventPayload,
  type TeamRunCommunicationEventPayload,
  type TeamRunEvent,
} from "../../../domain/team-run-event.js";
import {
  assertTaskTeamLeafSourcePath,
  cloneTaskTeamStreamScope,
  type TaskTeamStreamScope,
} from "../../../domain/task-team-stream-scope.js";
import {
  buildMemberRouteKeyFromPath,
  normalizeMemberPath,
} from "../../../domain/team-run-member-identity.js";

const normalizeRequiredId = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required for mixed-team stream scope.`);
  }
  return normalized;
};

const normalizeOptionalPath = (
  path: readonly string[],
  fieldName: string,
): string[] => path.map((segment, index) => {
  const normalized = segment.trim();
  if (!normalized) {
    throw new Error(`${fieldName}[${index}] cannot be empty.`);
  }
  return normalized;
});

const pathStartsWith = (
  path: readonly string[],
  prefix: readonly string[],
): boolean => path.length >= prefix.length && prefix.every(
  (segment, index) => path[index] === segment,
);

const prefixPath = (
  path: readonly string[],
  prefix: readonly string[],
  alreadyInParentFrame: boolean,
): string[] => alreadyInParentFrame && pathStartsWith(path, prefix)
  ? [...path]
  : [...prefix, ...path];

export type MixedTeamStreamScope = {
  teamRunId: string;
  sourcePath: string[];
  taskTeamScope: TaskTeamStreamScope | null;
};

export type PrefixedMixedTeamStreamScope = MixedTeamStreamScope & {
  sourceRouteKey: string;
};

export const prefixMixedTeamStreamScope = (input: {
  parentTeamRunId: string;
  sourcePrefix: string[];
  scope: MixedTeamStreamScope;
  taskTeamScopeOverride?: TaskTeamStreamScope;
}): PrefixedMixedTeamStreamScope => {
  const parentTeamRunId = normalizeRequiredId(
    input.parentTeamRunId,
    "parentTeamRunId",
  );
  const teamRunId = normalizeRequiredId(input.scope.teamRunId, "scope.teamRunId");
  const sourcePrefix = normalizeMemberPath(input.sourcePrefix);
  const currentSourcePath = normalizeOptionalPath(
    input.scope.sourcePath,
    "scope.sourcePath",
  );
  const alreadyInParentFrame = teamRunId === parentTeamRunId;
  const sourcePath = prefixPath(
    currentSourcePath,
    sourcePrefix,
    alreadyInParentFrame,
  );

  let taskTeamScope: TaskTeamStreamScope | null = null;
  if (input.taskTeamScopeOverride) {
    taskTeamScope = cloneTaskTeamStreamScope(input.taskTeamScopeOverride);
  } else if (input.scope.taskTeamScope) {
    const retainedScope = cloneTaskTeamStreamScope(input.scope.taskTeamScope);
    if (alreadyInParentFrame) {
      taskTeamScope = retainedScope;
    } else {
      const logicalTeamPath = prefixPath(
        retainedScope.logicalTeamPath,
        sourcePrefix,
        false,
      );
      taskTeamScope = {
        ...retainedScope,
        logicalTeamPath,
        logicalTeamRouteKey: buildMemberRouteKeyFromPath(logicalTeamPath),
      };
    }
  }

  if (taskTeamScope && !pathStartsWith(sourcePath, taskTeamScope.logicalTeamPath)) {
    throw new Error(
      `Mixed-team source path '${sourcePath.join("/")}' is outside task-team scope '${taskTeamScope.logicalTeamRouteKey}'.`,
    );
  }

  return {
    teamRunId: parentTeamRunId,
    sourcePath,
    sourceRouteKey: buildMemberRouteKeyFromPath(sourcePath),
    taskTeamScope,
  };
};

const memberSegmentRouteKey = (
  segment: ConversationTargetMemberSegment,
): string => {
  if (typeof segment.memberRouteKey === "string" && segment.memberRouteKey.trim()) {
    return segment.memberRouteKey.trim();
  }
  const memberPath = Array.isArray(segment.memberPath)
    ? segment.memberPath.map((part) => part.trim()).filter(Boolean)
    : [];
  return memberPath.length > 0 ? buildMemberRouteKeyFromPath(memberPath) : "";
};

const prefixMemberSegment = (input: {
  segment: ConversationTargetMemberSegment;
  sourcePrefix: string[];
  alreadyInParentFrame: boolean;
}): ConversationTargetMemberSegment => {
  const routeKey = memberSegmentRouteKey(input.segment);
  const memberPath = Array.isArray(input.segment.memberPath)
    && input.segment.memberPath.length > 0
    ? input.segment.memberPath
    : routeKey.split("/");
  return {
    kind: "member",
    memberRouteKey: buildMemberRouteKeyFromPath(prefixPath(
      memberPath,
      input.sourcePrefix,
      input.alreadyInParentFrame,
    )),
  };
};

const addressHasTaskTeamSegment = (
  address: ConversationTargetAddress,
  taskTeamScope: TaskTeamStreamScope | null,
): boolean => Boolean(
  taskTeamScope?.taskTeamRunId && address.segments.some((segment) =>
    segment.kind === "task_team"
    && segment.taskTeamRunId === taskTeamScope.taskTeamRunId),
);

const prefixConversationAddress = (input: {
  address: ConversationTargetAddress;
  sourcePrefix: string[];
  alreadyInParentFrame: boolean;
  taskTeamScope: TaskTeamStreamScope | null;
}): ConversationTargetAddress => {
  const normalized = normalizeConversationTargetAddress(input.address);
  if (addressHasTaskTeamSegment(normalized, input.taskTeamScope)) {
    return { segments: normalized.segments.map(cloneConversationTargetSegment) };
  }
  const segments: ConversationTargetSegment[] = normalized.segments.map(
    (segment, index) => index === 0 && segment.kind === "member"
      ? prefixMemberSegment({
          segment,
          sourcePrefix: input.sourcePrefix,
          alreadyInParentFrame: input.alreadyInParentFrame,
        })
      : cloneConversationTargetSegment(segment),
  );
  return { segments };
};

const maybePrefixConversationAddress = (input: {
  address: unknown;
  sourcePrefix: string[];
  alreadyInParentFrame: boolean;
  taskTeamScope: TaskTeamStreamScope | null;
}): ConversationTargetAddress | unknown => {
  if (!input.address || typeof input.address !== "object" || Array.isArray(input.address)) {
    return input.address;
  }
  return prefixConversationAddress({
    ...input,
    address: input.address as ConversationTargetAddress,
  });
};

const prefixCommunicationPayload = (input: {
  parentTeamRunId: string;
  sourcePrefix: string[];
  alreadyInParentFrame: boolean;
  payload: TeamRunCommunicationEventPayload;
  taskTeamScope: TaskTeamStreamScope | null;
}): TeamRunCommunicationEventPayload => ({
  ...input.payload,
  teamRunId: input.parentTeamRunId,
  senderAddress: prefixConversationAddress({
    address: input.payload.senderAddress,
    sourcePrefix: input.sourcePrefix,
    alreadyInParentFrame: input.alreadyInParentFrame,
    taskTeamScope: input.taskTeamScope,
  }),
  receiverAddress: prefixConversationAddress({
    address: input.payload.receiverAddress,
    sourcePrefix: input.sourcePrefix,
    alreadyInParentFrame: input.alreadyInParentFrame,
    taskTeamScope: input.taskTeamScope,
  }),
});

const prefixAgentPayload = (input: {
  payload: TeamRunAgentEventPayload;
  memberPath: string[];
  memberRouteKey: string;
  sourcePrefix: string[];
  alreadyInParentFrame: boolean;
  taskTeamScope: TaskTeamStreamScope | null;
}): TeamRunAgentEventPayload => {
  const originalEventPayload = input.payload.agentEvent.payload;
  const agentEventPayload = input.payload.agentEvent.eventType
    === AgentRunEventType.TEAM_COMMUNICATION_MESSAGE
    && originalEventPayload
    && typeof originalEventPayload === "object"
    && !Array.isArray(originalEventPayload)
    ? {
        ...originalEventPayload,
        senderAddress: maybePrefixConversationAddress({
          address: (originalEventPayload as { senderAddress?: unknown }).senderAddress,
          sourcePrefix: input.sourcePrefix,
          alreadyInParentFrame: input.alreadyInParentFrame,
          taskTeamScope: input.taskTeamScope,
        }),
        receiverAddress: maybePrefixConversationAddress({
          address: (originalEventPayload as { receiverAddress?: unknown }).receiverAddress,
          sourcePrefix: input.sourcePrefix,
          alreadyInParentFrame: input.alreadyInParentFrame,
          taskTeamScope: input.taskTeamScope,
        }),
      }
    : originalEventPayload;
  return {
    ...input.payload,
    memberPath: input.memberPath,
    memberRouteKey: input.memberRouteKey,
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
  taskTeamScopeOverride?: TaskTeamStreamScope;
}): TeamRunEvent => {
  const parentTeamRunId = normalizeRequiredId(
    input.parentTeamRunId,
    "parentTeamRunId",
  );
  const sourcePrefix = normalizeMemberPath(input.sourcePrefix);
  const alreadyInParentFrame = input.event.teamRunId.trim() === parentTeamRunId;
  const scope = prefixMixedTeamStreamScope({
    parentTeamRunId,
    sourcePrefix,
    scope: {
      teamRunId: input.event.teamRunId,
      sourcePath: input.event.sourcePath,
      taskTeamScope: input.event.taskTeamScope ?? null,
    },
    ...(input.taskTeamScopeOverride
      ? { taskTeamScopeOverride: input.taskTeamScopeOverride }
      : {}),
  });

  let data = input.event.data;
  if (input.event.eventSourceType === TeamRunEventSourceType.COMMUNICATION) {
    data = prefixCommunicationPayload({
      parentTeamRunId,
      sourcePrefix,
      alreadyInParentFrame,
      payload: input.event.data as TeamRunCommunicationEventPayload,
      taskTeamScope: scope.taskTeamScope,
    });
  } else if (input.event.eventSourceType === TeamRunEventSourceType.AGENT) {
    const agentPayload = input.event.data as TeamRunAgentEventPayload;
    const memberPath = prefixPath(
      normalizeMemberPath(agentPayload.memberPath),
      sourcePrefix,
      alreadyInParentFrame,
    );
    assertTaskTeamLeafSourcePath({
      sourcePath: scope.sourcePath,
      taskTeamScope: scope.taskTeamScope,
      leafId: agentPayload.memberRunId,
    });
    data = prefixAgentPayload({
      payload: agentPayload,
      memberPath,
      memberRouteKey: buildMemberRouteKeyFromPath(memberPath),
      sourcePrefix,
      alreadyInParentFrame,
      taskTeamScope: scope.taskTeamScope,
    });
  }

  return {
    ...input.event,
    teamRunId: scope.teamRunId,
    sourcePath: scope.sourcePath,
    data,
    taskTeamScope: scope.taskTeamScope,
    subTeamNodeName: sourcePrefix[sourcePrefix.length - 1]
      ?? input.event.subTeamNodeName
      ?? null,
  };
};

export const prefixMixedTeamLeafAgentStatusSnapshot = (input: {
  parentTeamRunId: string;
  sourcePrefix: string[];
  snapshot: TeamLeafAgentStatusSnapshot;
  taskTeamScopeOverride?: TaskTeamStreamScope;
}): TeamLeafAgentStatusSnapshot => {
  const sourcePrefix = normalizeMemberPath(input.sourcePrefix);
  const parentTeamRunId = normalizeRequiredId(
    input.parentTeamRunId,
    "parentTeamRunId",
  );
  const alreadyInParentFrame = input.snapshot.teamRunId.trim() === parentTeamRunId;
  const scope = prefixMixedTeamStreamScope({
    parentTeamRunId,
    sourcePrefix,
    scope: {
      teamRunId: input.snapshot.teamRunId,
      sourcePath: input.snapshot.payload.source_path,
      taskTeamScope: input.snapshot.scopeKind === "task_team_member"
        ? input.snapshot.taskTeamScope
        : null,
    },
    ...(input.taskTeamScopeOverride
      ? { taskTeamScopeOverride: input.taskTeamScopeOverride }
      : {}),
  });
  const memberPath = prefixPath(
    normalizeMemberPath(input.snapshot.payload.member_path),
    sourcePrefix,
    alreadyInParentFrame,
  );
  assertTaskTeamLeafSourcePath({
    sourcePath: scope.sourcePath,
    taskTeamScope: scope.taskTeamScope,
    leafId: input.snapshot.payload.agent_id,
  });
  const payload = {
    ...input.snapshot.payload,
    member_path: memberPath,
    member_route_key: buildMemberRouteKeyFromPath(memberPath),
    source_path: scope.sourcePath,
    source_route_key: scope.sourceRouteKey,
  };

  return scope.taskTeamScope
    ? buildTaskTeamLeafAgentStatusSnapshot({
        teamRunId: scope.teamRunId,
        payload,
        taskTeamScope: scope.taskTeamScope,
      })
    : buildOrdinaryTeamLeafAgentStatusSnapshot({
        teamRunId: scope.teamRunId,
        payload,
      });
};
