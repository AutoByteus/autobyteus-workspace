import type { TeamMemberNode } from '~/types/agent/AgentTeamContext';
import type {
  ConversationTargetAddress,
  ConversationTargetKind,
  ConversationTargetSegment,
} from '~/types/agent/ConversationTargetAddress';

export const normalizeConversationRouteKey = (routeKey: string | null | undefined): string => (
  routeKey?.trim().replace(/^\/+|\/+$/g, '') || ''
);

export const routeKeyFromConversationPath = (path: readonly string[] | null | undefined): string => (
  Array.isArray(path) ? path.map((part) => String(part).trim()).filter(Boolean).join('/') : ''
);

const cloneSegment = (segment: ConversationTargetSegment): ConversationTargetSegment => {
  if (segment.kind === 'member') {
    return {
      kind: 'member',
      ...(segment.memberRouteKey ? { memberRouteKey: normalizeConversationRouteKey(segment.memberRouteKey) } : {}),
      ...(segment.memberPath ? { memberPath: segment.memberPath.map((part) => String(part).trim()).filter(Boolean) } : {}),
    };
  }
  return segment.kind === 'task_team'
    ? { kind: 'task_team', taskTeamRunId: segment.taskTeamRunId.trim() }
    : { kind: 'task_agent', taskAgentRunId: segment.taskAgentRunId.trim() };
};

export const cloneConversationTargetSegments = (
  segments: readonly ConversationTargetSegment[] | null | undefined,
): ConversationTargetSegment[] => (segments ?? []).map(cloneSegment);

export const buildConversationTargetKey = (
  address: ConversationTargetAddress,
): string => address.segments.map((segment) => {
  if (segment.kind === 'member') {
    return `member:${normalizeConversationRouteKey(segment.memberRouteKey) || routeKeyFromConversationPath(segment.memberPath)}`;
  }
  if (segment.kind === 'task_team') return `task_team:${segment.taskTeamRunId.trim()}`;
  return `task_agent:${segment.taskAgentRunId.trim()}`;
}).join('|');

const memberSegment = (
  routeKey: string | null | undefined,
  path: readonly string[] | null | undefined = null,
): ConversationTargetSegment | null => {
  const normalizedRouteKey = normalizeConversationRouteKey(routeKey) || routeKeyFromConversationPath(path);
  return normalizedRouteKey ? { kind: 'member', memberRouteKey: normalizedRouteKey } : null;
};

const trimRelativeSegmentsFromPath = (
  sourcePath: readonly string[] | null | undefined,
  relativePath: readonly string[] | null | undefined,
): string[] => {
  const source = Array.isArray(sourcePath) ? sourcePath.map(String).map((part) => part.trim()).filter(Boolean) : [];
  const relative = Array.isArray(relativePath) ? relativePath.map(String).map((part) => part.trim()).filter(Boolean) : [];
  if (source.length >= relative.length && relative.every((part, index) => source[source.length - relative.length + index] === part)) {
    return source.slice(0, source.length - relative.length);
  }
  return [];
};

const buildTaskTeamRootSegments = (node: TeamMemberNode): ConversationTargetSegment[] | null => {
  const logicalSegment = memberSegment(node.logicalTeamRouteKey, node.logicalTeamPath);
  const taskTeamRunId = normalizeConversationRouteKey(node.taskTeamRunId);
  return logicalSegment && taskTeamRunId ? [logicalSegment, { kind: 'task_team', taskTeamRunId }] : null;
};

const buildTaskTeamChildSegments = (node: TeamMemberNode): ConversationTargetSegment[] | null => {
  const stored = cloneConversationTargetSegments(node.conversationTargetSegments);
  if (stored.length > 0) return stored;

  const parentTaskTeamRunId = normalizeConversationRouteKey(node.parentTaskTeamRunId);
  const relativeRouteKey = normalizeConversationRouteKey(node.taskTeamRelativeMemberRouteKey)
    || routeKeyFromConversationPath(node.taskTeamRelativeMemberPath);
  if (!parentTaskTeamRunId || !relativeRouteKey) return null;

  const logicalTeamRouteKey = normalizeConversationRouteKey(node.logicalTeamRouteKey)
    || routeKeyFromConversationPath(trimRelativeSegmentsFromPath(node.structuralSourcePath, node.taskTeamRelativeMemberPath));
  if (!logicalTeamRouteKey) return null;

  return [
    { kind: 'member', memberRouteKey: logicalTeamRouteKey },
    { kind: 'task_team', taskTeamRunId: parentTaskTeamRunId },
    { kind: 'member', memberRouteKey: relativeRouteKey },
  ];
};

const buildTaskAgentSegments = (node: TeamMemberNode): ConversationTargetSegment[] | null => {
  const stored = cloneConversationTargetSegments(node.conversationTargetSegments);
  if (stored.length > 0) return stored;

  const taskAgentRunId = normalizeConversationRouteKey(node.taskAgentRunId);
  if (!taskAgentRunId) return null;
  if (node.parentTaskTeamRunId) {
    const childSegments = buildTaskTeamChildSegments(node);
    return childSegments ? [...childSegments, { kind: 'task_agent', taskAgentRunId }] : null;
  }

  const logicalSegment = memberSegment(node.logicalMemberRouteKey, node.memberPath.slice(0, -1));
  return logicalSegment ? [logicalSegment, { kind: 'task_agent', taskAgentRunId }] : null;
};

export const buildConversationTargetAddressForNode = (
  node: TeamMemberNode,
): { address: ConversationTargetAddress; targetKind: ConversationTargetKind } | null => {
  if (node.isTaskAgentInstance) {
    const segments = buildTaskAgentSegments(node);
    return segments ? { address: { segments }, targetKind: 'task_agent' } : null;
  }
  if (node.isTaskTeamInstance) {
    const stored = cloneConversationTargetSegments(node.conversationTargetSegments);
    const segments = stored.length > 0 ? stored : buildTaskTeamRootSegments(node);
    return segments ? { address: { segments }, targetKind: 'task_team' } : null;
  }
  if (node.isTaskTeamChildProjection) {
    const segments = buildTaskTeamChildSegments(node);
    return segments ? { address: { segments }, targetKind: node.memberKind === 'agent_team' ? 'task_team_child' : 'leaf_agent' } : null;
  }
  return {
    address: { segments: [{ kind: 'member', memberRouteKey: node.memberRouteKey }] },
    targetKind: node.memberKind === 'agent_team' ? 'subteam' : 'leaf_agent',
  };
};
