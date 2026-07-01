import {
  buildConversationAddressFromSegments,
  normalizeConversationTargetAddress,
  type ConversationTargetAddress,
  type ConversationTargetSegment,
} from "../../../domain/conversation-target-address.js";
import type { InterAgentMessageParticipant } from "../../../domain/inter-agent-message-delivery.js";
import type { TaskTeamInstanceIdentity } from "../../../domain/task-team-instance.js";
import { buildMemberRouteKeyFromPath } from "../../../domain/team-run-member-identity.js";

const normalizeString = (value: string | null | undefined): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const pathStartsWith = (path: readonly string[], prefix: readonly string[]): boolean =>
  path.length >= prefix.length && prefix.every((segment, index) => path[index] === segment);

const relativePathFromPrefix = (
  path: readonly string[],
  prefix: readonly string[],
): string[] => (pathStartsWith(path, prefix) ? path.slice(prefix.length) : []);

const memberSegmentFromRouteOrPath = (input: {
  memberRouteKey?: string | null;
  memberPath?: readonly string[] | null;
}): ConversationTargetSegment => {
  const memberRouteKey = normalizeString(input.memberRouteKey);
  if (memberRouteKey) {
    return { kind: "member", memberRouteKey };
  }
  const memberPath = (input.memberPath ?? [])
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (memberPath.length > 0) {
    return { kind: "member", memberRouteKey: buildMemberRouteKeyFromPath(memberPath) };
  }
  throw new Error("Team communication address requires a member route key or path.");
};

const appendTaskAgentSegment = (
  segments: ConversationTargetSegment[],
  participant: InterAgentMessageParticipant,
): ConversationTargetSegment[] => {
  const taskAgentRunId = normalizeString(participant.taskAgentRunId);
  return taskAgentRunId ? [...segments, { kind: "task_agent", taskAgentRunId }] : segments;
};

const buildTaskTeamScopedParticipantAddress = (input: {
  participant: InterAgentMessageParticipant;
  taskTeamInstance: TaskTeamInstanceIdentity;
}): ConversationTargetAddress => {
  const relativeRouteKey =
    normalizeString(input.participant.logicalMemberRouteKey)
    ?? normalizeString(input.participant.memberRouteKey)
    ?? buildMemberRouteKeyFromPath(input.participant.memberPath);
  return normalizeConversationTargetAddress(buildConversationAddressFromSegments(
    appendTaskAgentSegment([
      memberSegmentFromRouteOrPath({
        memberRouteKey: input.taskTeamInstance.logicalTeam.memberRouteKey,
        memberPath: input.taskTeamInstance.logicalTeam.memberPath,
      }),
      { kind: "task_team", taskTeamRunId: input.taskTeamInstance.taskTeamRunId },
      memberSegmentFromRouteOrPath({ memberRouteKey: relativeRouteKey }),
    ], input.participant),
  ));
};

const buildStaticParticipantAddress = (
  participant: InterAgentMessageParticipant,
): ConversationTargetAddress => {
  const memberPath = [...participant.memberPath];
  const representedPrefix = participant.representedSubTeam?.memberPath ?? [];
  const relativePath = representedPrefix.length > 0
    ? relativePathFromPrefix(memberPath, representedPrefix)
    : [];
  const parentRootedRouteKey = representedPrefix.length > 0
    ? normalizeString(participant.memberRouteKey)
      ?? (memberPath.length > 0 ? buildMemberRouteKeyFromPath(memberPath) : null)
    : null;
  const memberRouteKey =
    parentRootedRouteKey
    ?? normalizeString(participant.logicalMemberRouteKey)
    ?? normalizeString(participant.memberRouteKey)
    ?? (relativePath.length > 0 ? buildMemberRouteKeyFromPath(relativePath) : null);

  return normalizeConversationTargetAddress(buildConversationAddressFromSegments(
    appendTaskAgentSegment([
      memberSegmentFromRouteOrPath({
        memberRouteKey,
        memberPath: memberPath.length > 0 ? memberPath : participant.address.memberPath,
      }),
    ], participant),
  ));
};

export const buildTeamCommunicationAddressForParticipant = (input: {
  participant: InterAgentMessageParticipant;
  taskTeamInstance?: TaskTeamInstanceIdentity | null;
}): ConversationTargetAddress => (
  input.taskTeamInstance
    ? buildTaskTeamScopedParticipantAddress({
        participant: input.participant,
        taskTeamInstance: input.taskTeamInstance,
      })
    : buildStaticParticipantAddress(input.participant)
);
