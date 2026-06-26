import type { AgentTeamContext, SubTeamMemberNode, TeamMemberNode } from '~/types/agent/AgentTeamContext';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { ServerMessage } from './protocol';
import {
  buildRouteKeyFromPath,
  buildTaskExecutionTimelineEntry,
  normalizeProjectionPath,
  normalizeProjectionString,
  normalizeTaskExecutionStatusFromPayload,
  isTerminalTaskExecutionProjectionStatus,
  type TaskExecutionProjectionStatus,
} from './teamTaskExecutionProjection';
import {
  cloneTaskTeamChildTree,
  removeTaskTeamChildProjections,
} from './teamTaskTeamChildProjection';
import { resolveActiveExecutionFocusedMemberRouteKey } from '~/utils/teamActiveExecutionMembers';

export interface TaskTeamExecutionProjectionIdentity {
  taskTeamRunId: string;
  taskTeamInstanceId: string | null;
  taskId: string | null;
  logicalTeamRouteKey: string | null;
  logicalTeamPath: string[];
}

const payloadFor = (message: ServerMessage): Record<string, unknown> | null => (
  'payload' in message && message.payload && typeof message.payload === 'object'
    ? message.payload as Record<string, unknown>
    : null
);

const findStructuralTeamNode = (
  teamContext: AgentTeamContext,
  identity: TaskTeamExecutionProjectionIdentity,
): SubTeamMemberNode | null => {
  const byRoute = identity.logicalTeamRouteKey
    ? teamContext.memberNodesByRouteKey.get(identity.logicalTeamRouteKey) ?? null
    : null;
  if (byRoute?.memberKind === 'agent_team' && !byRoute.isTaskTeamInstance) {
    return byRoute as SubTeamMemberNode;
  }
  const routeFromPath = buildRouteKeyFromPath(identity.logicalTeamPath);
  const byPath = routeFromPath ? teamContext.memberNodesByRouteKey.get(routeFromPath) ?? null : null;
  return byPath?.memberKind === 'agent_team' && !byPath.isTaskTeamInstance
    ? byPath as SubTeamMemberNode
    : null;
};

const removeTaskTeamRootFromTree = (
  nodes: readonly TeamMemberNode[],
  taskTeamRunId: string,
): TeamMemberNode[] => {
  const retained: TeamMemberNode[] = [];
  for (const node of nodes) {
    if (node.memberRouteKey === taskTeamRunId || node.parentTaskTeamRunId === taskTeamRunId) {
      continue;
    }
    if (node.memberKind !== 'agent_team') {
      retained.push(node);
      continue;
    }
    retained.push({ ...node, children: removeTaskTeamRootFromTree(node.children, taskTeamRunId) });
  }
  return retained;
};

const insertTaskTeamRootNearStructuralTeam = (
  nodes: readonly TeamMemberNode[],
  taskTeamNode: SubTeamMemberNode,
  structuralTeamRouteKey: string | null,
): TeamMemberNode[] => {
  if (!structuralTeamRouteKey) return [...nodes, taskTeamNode];
  let inserted = false;
  const visit = (source: readonly TeamMemberNode[]): TeamMemberNode[] => source.flatMap((node) => {
    const withChildren: TeamMemberNode = node.memberKind === 'agent_team'
      ? { ...node, children: visit(node.children) }
      : node;
    if (node.memberRouteKey !== structuralTeamRouteKey) return [withChildren];
    inserted = true;
    return [withChildren, taskTeamNode];
  });
  const updated = visit(nodes);
  return inserted ? updated : [...updated, taskTeamNode];
};

const buildDisplayName = (
  structuralTeam: SubTeamMemberNode | null,
  identity: TaskTeamExecutionProjectionIdentity,
): string => {
  const base = structuralTeam?.displayName
    || structuralTeam?.memberName
    || identity.logicalTeamPath.at(-1)
    || identity.logicalTeamRouteKey
    || 'Task team';
  return `${base} · ${identity.taskId || identity.taskTeamRunId}`;
};

const statusToAgentStatus = (status: TaskExecutionProjectionStatus): AgentStatus => {
  if (status === 'failed') return AgentStatus.Error;
  if (status === 'settled') return AgentStatus.Offline;
  if (status === 'starting') return AgentStatus.Initializing;
  return AgentStatus.Running;
};

const runtimeStatusToAgentStatus = (rawStatus: unknown): AgentStatus | null => {
  const status = normalizeProjectionString(rawStatus)?.toLowerCase().replace(/[-\s]+/g, '_') ?? null;
  if (status === 'offline') return AgentStatus.Offline;
  if (status === 'idle') return AgentStatus.Idle;
  if (status === 'running') return AgentStatus.Running;
  if (status === 'initializing' || status === 'starting') return AgentStatus.Initializing;
  if (status === 'error' || status === 'failed') return AgentStatus.Error;
  return null;
};

const isOfflineRuntimeStatus = (rawStatus: unknown): boolean => (
  normalizeProjectionString(rawStatus)?.toLowerCase().replace(/[-\s]+/g, '_') === 'offline'
);

export const extractTaskTeamIdentity = (message: ServerMessage): TaskTeamExecutionProjectionIdentity | null => {
  const payload = payloadFor(message);
  if (!payload) return null;
  const executionKind = normalizeProjectionString(payload.execution_kind) ?? normalizeProjectionString(payload.executionKind);
  const taskTeamRunId = normalizeProjectionString(payload.task_team_run_id) ?? normalizeProjectionString(payload.taskTeamRunId);
  if (executionKind !== 'task_team' || !taskTeamRunId) return null;
  const logicalTeamPath = normalizeProjectionPath(payload.team_path).length > 0
    ? normalizeProjectionPath(payload.team_path)
    : normalizeProjectionPath(payload.teamPath);
  return {
    taskTeamRunId,
    taskTeamInstanceId: normalizeProjectionString(payload.task_team_instance_id) ?? normalizeProjectionString(payload.taskTeamInstanceId),
    taskId: normalizeProjectionString(payload.task_id) ?? normalizeProjectionString(payload.taskId),
    logicalTeamRouteKey: normalizeProjectionString(payload.team_route_key)
      ?? normalizeProjectionString(payload.teamRouteKey)
      ?? buildRouteKeyFromPath(logicalTeamPath),
    logicalTeamPath,
  };
};

export const ensureTaskTeamExecutionProjection = (
  teamContext: AgentTeamContext,
  identity: TaskTeamExecutionProjectionIdentity,
  initialStatus: TaskExecutionProjectionStatus = 'active',
): SubTeamMemberNode => {
  const existing = teamContext.memberNodesByRouteKey.get(identity.taskTeamRunId) ?? null;
  const structuralTeam = findStructuralTeamNode(teamContext, identity);
  const displayName = existing?.displayName || buildDisplayName(structuralTeam, identity);
  const children = existing?.memberKind === 'agent_team' && existing.isTaskTeamInstance
    ? [...existing.children]
    : cloneTaskTeamChildTree(teamContext, identity, structuralTeam?.children ?? []);
  const node: SubTeamMemberNode = {
    memberKind: 'agent_team',
    memberName: displayName,
    displayName,
    memberPath: [identity.taskTeamRunId],
    memberRouteKey: identity.taskTeamRunId,
    memberRunId: identity.taskTeamRunId,
    teamDefinitionId: structuralTeam?.teamDefinitionId ?? 'task-team',
    teamRunId: identity.taskTeamRunId,
    coordinatorMemberRouteKey: structuralTeam?.coordinatorMemberRouteKey ?? null,
    children,
    currentStatus: statusToAgentStatus(existing?.taskExecutionStatus ?? initialStatus),
    isTaskTeamInstance: true,
    taskTeamInstanceId: identity.taskTeamInstanceId,
    taskTeamRunId: identity.taskTeamRunId,
    taskId: identity.taskId,
    logicalTeamRouteKey: identity.logicalTeamRouteKey,
    logicalTeamPath: [...identity.logicalTeamPath],
    taskExecutionStatus: existing?.taskExecutionStatus ?? initialStatus,
    taskTimeline: existing?.taskTimeline ? [...existing.taskTimeline] : [],
  };

  teamContext.memberNodesByRouteKey = new Map(teamContext.memberNodesByRouteKey).set(identity.taskTeamRunId, node);
  teamContext.memberTree = insertTaskTeamRootNearStructuralTeam(
    removeTaskTeamRootFromTree(teamContext.memberTree, identity.taskTeamRunId),
    node,
    structuralTeam?.memberRouteKey ?? identity.logicalTeamRouteKey,
  );
  return node;
};

export const updateTaskTeamExecutionProjectionFromEvent = (
  teamContext: AgentTeamContext,
  message: ServerMessage,
): { node: SubTeamMemberNode; shouldCleanup: boolean } | null => {
  const identity = extractTaskTeamIdentity(message);
  if (!identity) return null;
  const payload = payloadFor(message) ?? {};
  const eventType = normalizeProjectionString(payload.event_type) ?? normalizeProjectionString(payload.eventType) ?? message.type;
  const status = normalizeTaskExecutionStatusFromPayload(eventType, payload.status, payload.decision ?? payload.review_decision);
  const node = ensureTaskTeamExecutionProjection(teamContext, identity, status);
  node.taskExecutionStatus = status;
  node.currentStatus = statusToAgentStatus(status);
  node.taskTimeline = [
    ...(node.taskTimeline ?? []),
    buildTaskExecutionTimelineEntry({
      eventType,
      status,
      existingCount: node.taskTimeline?.length ?? 0,
      message: normalizeProjectionString(payload.message) ?? normalizeProjectionString(payload.reason),
    }),
  ];
  teamContext.memberNodesByRouteKey = new Map(teamContext.memberNodesByRouteKey).set(node.memberRouteKey, node);
  return {
    node,
    shouldCleanup: isTerminalTaskExecutionProjectionStatus(status),
  };
};

export const updateTaskTeamRootStatus = (
  teamContext: AgentTeamContext,
  taskTeamRunId: string,
  rawStatus: unknown,
): boolean => {
  const node = teamContext.memberNodesByRouteKey.get(taskTeamRunId) ?? null;
  if (!node?.isTaskTeamInstance) return false;
  node.currentStatus = runtimeStatusToAgentStatus(rawStatus) ?? node.currentStatus ?? AgentStatus.Running;
  if (isOfflineRuntimeStatus(rawStatus)) {
    node.taskExecutionStatus = 'settled';
    node.currentStatus = AgentStatus.Offline;
    return true;
  }
  return false;
};

export const removeTaskTeamExecutionProjection = (
  teamContext: AgentTeamContext,
  taskTeamRunId: string,
): void => {
  removeTaskTeamChildProjections(teamContext, taskTeamRunId);
  const scopedPrefix = `${taskTeamRunId}/`;
  const memberNodes = new Map(teamContext.memberNodesByRouteKey);
  const routeKeysToRemove = new Set<string>([taskTeamRunId]);
  for (const [routeKey, node] of memberNodes.entries()) {
    if (routeKey === taskTeamRunId || node.parentTaskTeamRunId === taskTeamRunId || routeKey.startsWith(scopedPrefix)) {
      routeKeysToRemove.add(routeKey);
      memberNodes.delete(routeKey);
    }
  }
  const leafContexts = new Map(teamContext.leafAgentContextsByRouteKey);
  for (const [routeKey, context] of leafContexts.entries()) {
    const conversationId = context.state.conversation.id;
    const runId = context.state.runId ?? '';
    if (
      routeKeysToRemove.has(routeKey) ||
      routeKey.startsWith(scopedPrefix) ||
      conversationId.startsWith(scopedPrefix) ||
      runId.startsWith(scopedPrefix)
    ) {
      leafContexts.delete(routeKey);
    }
  }
  teamContext.memberNodesByRouteKey = memberNodes;
  teamContext.leafAgentContextsByRouteKey = leafContexts;
  teamContext.memberTree = removeTaskTeamRootFromTree(teamContext.memberTree, taskTeamRunId);
  if (teamContext.focusedMemberRouteKey === taskTeamRunId || teamContext.focusedMemberRouteKey.startsWith(scopedPrefix)) {
    teamContext.focusedMemberRouteKey = resolveActiveExecutionFocusedMemberRouteKey(teamContext);
  }
};
