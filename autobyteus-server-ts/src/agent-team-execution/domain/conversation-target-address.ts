import {
  buildMemberRouteKeyFromPath,
  selectorFromMemberPath,
  selectorFromMemberRouteKey,
  selectorToRouteKey,
  type TeamMemberSelector,
} from "./team-run-member-identity.js";

export type ConversationTargetMemberSegment = {
  kind: "member";
  memberRouteKey?: string;
  memberPath?: string[];
};

export type ConversationTargetTaskTeamSegment = {
  kind: "task_team";
  taskTeamRunId: string;
};

export type ConversationTargetTaskAgentSegment = {
  kind: "task_agent";
  taskAgentRunId: string;
};

export type ConversationTargetSegment =
  | ConversationTargetMemberSegment
  | ConversationTargetTaskTeamSegment
  | ConversationTargetTaskAgentSegment;

export type ConversationTargetAddress = {
  parentTeamRunId?: string | null;
  segments: ConversationTargetSegment[];
};

export type ConversationTargetInvalidResult = {
  accepted: false;
  code: "INVALID_TARGET";
  message: string;
};

export const buildInvalidConversationTargetResult = (
  message: string,
): ConversationTargetInvalidResult => ({
  accepted: false,
  code: "INVALID_TARGET",
  message,
});

export const cloneConversationTargetSegment = (
  segment: ConversationTargetSegment,
): ConversationTargetSegment => {
  if (segment.kind === "member") {
    return {
      kind: "member",
      ...(segment.memberRouteKey ? { memberRouteKey: segment.memberRouteKey } : {}),
      ...(segment.memberPath ? { memberPath: [...segment.memberPath] } : {}),
    };
  }
  if (segment.kind === "task_team") {
    return { kind: "task_team", taskTeamRunId: segment.taskTeamRunId };
  }
  return { kind: "task_agent", taskAgentRunId: segment.taskAgentRunId };
};

export const cloneConversationTargetAddress = (
  address: ConversationTargetAddress,
): ConversationTargetAddress => ({
  ...(typeof address.parentTeamRunId === "string" && address.parentTeamRunId.trim().length > 0
    ? { parentTeamRunId: address.parentTeamRunId.trim() }
    : {}),
  segments: address.segments.map(cloneConversationTargetSegment),
});

export const buildConversationAddressFromSegments = (
  segments: readonly ConversationTargetSegment[],
  parentTeamRunId: string | null = null,
): ConversationTargetAddress => ({
  ...(parentTeamRunId ? { parentTeamRunId } : {}),
  segments: segments.map(cloneConversationTargetSegment),
});

export const buildConversationAddressFromMemberSelector = (
  selector: TeamMemberSelector,
): ConversationTargetAddress => ({
  segments: [conversationTargetMemberSegmentFromSelector(selector)],
});

export const conversationTargetMemberSegmentFromSelector = (
  selector: TeamMemberSelector,
): ConversationTargetMemberSegment => (
  selector.kind === "path"
    ? { kind: "member", memberPath: [...selector.memberPath] }
    : { kind: "member", memberRouteKey: selector.memberRouteKey }
);

export const normalizeConversationTargetMemberSegment = (
  segment: ConversationTargetMemberSegment,
): ConversationTargetMemberSegment => {
  const routeKey = typeof segment.memberRouteKey === "string" && segment.memberRouteKey.trim().length > 0
    ? selectorToRouteKey(selectorFromMemberRouteKey(segment.memberRouteKey))
    : null;
  const path = Array.isArray(segment.memberPath)
    ? segment.memberPath.map((part) => String(part).trim()).filter(Boolean)
    : [];
  const pathRouteKey = path.length > 0
    ? buildMemberRouteKeyFromPath(path)
    : null;

  if (routeKey && pathRouteKey && routeKey !== pathRouteKey) {
    throw new Error(
      `Conversation member segment route '${routeKey}' does not match path '${pathRouteKey}'.`,
    );
  }
  if (routeKey) {
    return { kind: "member", memberRouteKey: routeKey };
  }
  if (pathRouteKey) {
    return { kind: "member", memberPath: path };
  }
  throw new Error("Conversation member segment requires memberRouteKey or memberPath.");
};

export const normalizeConversationTargetSegment = (
  segment: ConversationTargetSegment,
): ConversationTargetSegment => {
  if (segment.kind === "member") {
    return normalizeConversationTargetMemberSegment(segment);
  }
  if (segment.kind === "task_team") {
    const taskTeamRunId = segment.taskTeamRunId.trim();
    if (!taskTeamRunId) {
      throw new Error("Conversation task_team segment requires taskTeamRunId.");
    }
    return { kind: "task_team", taskTeamRunId };
  }
  const taskAgentRunId = segment.taskAgentRunId.trim();
  if (!taskAgentRunId) {
    throw new Error("Conversation task_agent segment requires taskAgentRunId.");
  }
  return { kind: "task_agent", taskAgentRunId };
};

export const normalizeConversationTargetAddress = (
  address: ConversationTargetAddress,
): ConversationTargetAddress => ({
  ...(typeof address.parentTeamRunId === "string" && address.parentTeamRunId.trim().length > 0
    ? { parentTeamRunId: address.parentTeamRunId.trim() }
    : {}),
  segments: address.segments.map(normalizeConversationTargetSegment),
});

export const conversationTargetMemberSegmentToSelector = (
  segment: ConversationTargetMemberSegment,
): TeamMemberSelector => {
  const normalized = normalizeConversationTargetMemberSegment(segment);
  return normalized.memberPath
    ? selectorFromMemberPath(normalized.memberPath)
    : selectorFromMemberRouteKey(normalized.memberRouteKey ?? "");
};

export const conversationTargetSegmentDebugString = (
  segment: ConversationTargetSegment,
): string => {
  if (segment.kind === "member") {
    return `member:${selectorToRouteKey(conversationTargetMemberSegmentToSelector(segment))}`;
  }
  if (segment.kind === "task_team") {
    return `task_team:${segment.taskTeamRunId}`;
  }
  return `task_agent:${segment.taskAgentRunId}`;
};

export const conversationTargetAddressDebugString = (
  address: ConversationTargetAddress,
): string => address.segments.map(conversationTargetSegmentDebugString).join(" -> ");
