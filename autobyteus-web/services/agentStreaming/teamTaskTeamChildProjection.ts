import type { AgentContext } from '~/types/agent/AgentContext';
import { AgentContext as AgentContextModel } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig';
import { DEFAULT_AGENT_RUNTIME_KIND } from '~/types/agent/AgentRunConfig';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type {
  AgentTeamContext,
  AgentTeamMemberNode,
  SubTeamMemberNode,
  TeamMemberNode,
  TeamMemberNodeKind,
} from '~/types/agent/AgentTeamContext';
import type { ConversationTargetSegment } from '~/types/agent/ConversationTargetAddress';
import type { Conversation } from '~/types/conversation';
import type { ServerMessage } from './protocol';
import {
  buildRouteKeyFromPath,
  buildTaskTeamScopedChildRouteKey,
  captureTaskExecutionNavigationSnapshot,
  deriveTaskExecutionProjectionMutation,
  normalizeProjectionPath,
  normalizeProjectionString,
  type TaskExecutionProjectionMutation,
} from './teamTaskExecutionProjection';
import type { TaskTeamExecutionProjectionIdentity } from './teamTaskTeamExecutionProjection';
import { normalizeAgentRuntimeStatus } from '~/services/runHydration/runtimeStatusNormalization';
import {
  primeRecentEventMonitorBaseline,
  resetRecentEventMonitorBaseline,
} from '~/services/eventMonitor/recentEventMonitorMutationCoordinator';

export interface TaskTeamChildMemberProjectionIdentity {
  parentTaskTeamRunId: string;
  parentTaskTeamInstanceId: string | null;
  parentTaskId: string | null;
  logicalTeamRouteKey: string | null;
  logicalTeamPath: string[];
  relativeMemberPath: string[];
  relativeMemberRouteKey: string;
  structuralSourcePath: string[];
  structuralSourceRouteKey: string | null;
  scopedMemberPath: string[];
  scopedMemberRouteKey: string;
  memberKind: TeamMemberNodeKind;
  runtimeMemberRunId: string | null;
  conversationTargetSegments?: ConversationTargetSegment[];
}

export type TaskTeamScopedMessageResolution =
  | { outcome: 'none' }
  | { outcome: 'drop'; reason: string }
  | { outcome: 'root'; taskTeamRunId: string }
  | { outcome: 'child'; identity: TaskTeamChildMemberProjectionIdentity };

const payloadFor = (message: ServerMessage): Record<string, unknown> | null => (
  'payload' in message && message.payload && typeof message.payload === 'object'
    ? message.payload as Record<string, unknown>
    : null
);

export const hasTaskTeamScopedFields = (message: ServerMessage): boolean => {
  const payload = payloadFor(message);
  if (!payload) return false;
  return Object.keys(payload).some((key) => key.startsWith('task_team_') || key.startsWith('taskTeam'));
};

const findNodeByPath = (
  teamContext: AgentTeamContext,
  path: readonly string[],
): TeamMemberNode | null => {
  const routeKey = buildRouteKeyFromPath(path);
  return routeKey ? teamContext.memberNodesByRouteKey.get(routeKey) ?? null : null;
};

const removePrefix = (path: readonly string[], prefix: readonly string[]): string[] => (
  path.length >= prefix.length && prefix.every((segment, index) => path[index] === segment)
    ? path.slice(prefix.length)
    : [...path]
);

const buildFallbackAgentConfig = (
  displayName: string,
  structuralContext: AgentContext | null,
): AgentRunConfig => structuralContext
  ? { ...structuralContext.config, agentDefinitionName: displayName, isLocked: true }
  : {
      agentDefinitionId: 'task-team-child',
      agentDefinitionName: displayName,
      llmModelIdentifier: '',
      runtimeKind: DEFAULT_AGENT_RUNTIME_KIND,
      workspaceId: null,
      workspaceMetadata: null,
      autoExecuteTools: false,
      skillAccessMode: 'NONE',
      isLocked: true,
      llmConfig: null,
    };

const createChildAgentContext = (
  node: AgentTeamMemberNode,
  structuralContext: AgentContext | null,
): AgentContext => {
  const now = new Date().toISOString();
  const conversation: Conversation = {
    id: node.memberRouteKey,
    messages: [],
    createdAt: now,
    updatedAt: now,
    agentDefinitionId: node.agentDefinitionId,
    agentName: node.displayName,
    llmModelIdentifier: structuralContext?.config.llmModelIdentifier,
  };
  const context = new AgentContextModel(
    buildFallbackAgentConfig(node.displayName, structuralContext),
    new AgentRunState(node.memberRouteKey, conversation),
  );
  context.isSubscribed = true;
  return context;
};

const cloneConversationTargetSegments = (
  segments: readonly ConversationTargetSegment[] | null | undefined,
): ConversationTargetSegment[] => (segments ?? []).map((segment) => ({
  ...segment,
  ...(segment.kind === 'member' && segment.memberPath ? { memberPath: [...segment.memberPath] } : {}),
}));

const buildTaskTeamRootConversationSegments = (
  parentIdentity: TaskTeamExecutionProjectionIdentity,
): ConversationTargetSegment[] => {
  if (parentIdentity.conversationTargetSegments?.length) {
    return cloneConversationTargetSegments(parentIdentity.conversationTargetSegments);
  }
  const logicalRouteKey = parentIdentity.logicalTeamRouteKey ?? buildRouteKeyFromPath(parentIdentity.logicalTeamPath) ?? '';
  return [
    { kind: 'member', memberRouteKey: logicalRouteKey },
    { kind: 'task_team', taskTeamRunId: parentIdentity.taskTeamRunId },
  ];
};

const cloneNode = (
  teamContext: AgentTeamContext,
  parentIdentity: TaskTeamExecutionProjectionIdentity,
  structuralNode: TeamMemberNode,
): TeamMemberNode => {
  const relativePath = removePrefix(structuralNode.memberPath, parentIdentity.logicalTeamPath);
  const relativeRouteKey = buildRouteKeyFromPath(relativePath) ?? structuralNode.memberName;
  const scopedMemberRouteKey = buildTaskTeamScopedChildRouteKey(parentIdentity.taskTeamRunId, relativeRouteKey);
  const scopedMemberPath = [parentIdentity.taskTeamRunId, ...relativePath];
  const structuralSourceRouteKey = structuralNode.memberRouteKey;
  const conversationTargetSegments: ConversationTargetSegment[] = [
    ...buildTaskTeamRootConversationSegments(parentIdentity),
    { kind: 'member', memberRouteKey: relativeRouteKey },
  ];
  const base = {
    memberKind: structuralNode.memberKind,
    memberName: structuralNode.memberName,
    displayName: structuralNode.displayName,
    memberPath: scopedMemberPath,
    memberRouteKey: scopedMemberRouteKey,
    memberRunId: null,
    isTaskTeamChildProjection: true,
    parentTaskTeamRunId: parentIdentity.taskTeamRunId,
    parentTaskTeamInstanceId: parentIdentity.taskTeamInstanceId,
    parentTaskId: parentIdentity.taskId,
    taskTeamRelativeMemberRouteKey: relativeRouteKey,
    taskTeamRelativeMemberPath: relativePath,
    structuralSourceRouteKey,
    structuralSourcePath: [...structuralNode.memberPath],
    conversationTargetSegments,
    role: structuralNode.role ?? null,
    description: structuralNode.description ?? null,
  };

  if (structuralNode.memberKind === 'agent_team') {
    const clonedTeam: SubTeamMemberNode = {
      ...base,
      memberKind: 'agent_team',
      teamDefinitionId: structuralNode.teamDefinitionId,
      teamRunId: null,
      coordinatorMemberRouteKey: structuralNode.coordinatorMemberRouteKey ?? null,
      children: [],
    };
    clonedTeam.children = structuralNode.children.map((child) => cloneNode(teamContext, parentIdentity, child));
    teamContext.memberNodesByRouteKey.set(scopedMemberRouteKey, clonedTeam);
    return clonedTeam;
  }

  const clonedAgent: AgentTeamMemberNode = {
    ...base,
    memberKind: 'agent',
    agentDefinitionId: structuralNode.agentDefinitionId,
    currentStatus: null,
  };
  teamContext.memberNodesByRouteKey.set(scopedMemberRouteKey, clonedAgent);
  if (!teamContext.leafAgentContextsByRouteKey.has(scopedMemberRouteKey)) {
    const structuralContext = teamContext.leafAgentContextsByRouteKey.get(structuralSourceRouteKey) ?? null;
    const childContext = createChildAgentContext(clonedAgent, structuralContext);
    primeRecentEventMonitorBaseline(childContext);
    teamContext.leafAgentContextsByRouteKey.set(scopedMemberRouteKey, childContext);
  }
  return clonedAgent;
};

export const cloneTaskTeamChildTree = (
  teamContext: AgentTeamContext,
  parentIdentity: TaskTeamExecutionProjectionIdentity,
  structuralChildren: readonly TeamMemberNode[],
): TeamMemberNode[] => {
  const clonedChildren = structuralChildren.map((child) => cloneNode(teamContext, parentIdentity, child));
  teamContext.memberNodesByRouteKey = new Map(teamContext.memberNodesByRouteKey);
  teamContext.leafAgentContextsByRouteKey = new Map(teamContext.leafAgentContextsByRouteKey);
  return clonedChildren;
};

export const resolveTaskTeamScopedMessage = (
  teamContext: AgentTeamContext,
  message: ServerMessage,
): TaskTeamScopedMessageResolution => {
  const payload = payloadFor(message);
  if (!payload) return { outcome: 'none' };
  const scopedFieldsPresent = hasTaskTeamScopedFields(message);
  const taskTeamRunId = normalizeProjectionString(payload.task_team_run_id) ?? normalizeProjectionString(payload.taskTeamRunId);
  if (!taskTeamRunId) {
    return scopedFieldsPresent
      ? { outcome: 'drop', reason: 'Task-team scoped event missing task_team_run_id.' }
      : { outcome: 'none' };
  }

  const rootNode = teamContext.memberNodesByRouteKey.get(taskTeamRunId) ?? null;
  const rootLogicalTeamPath = rootNode?.logicalTeamPath ?? null;
  const logicalTeamPath = normalizeProjectionPath(payload.team_path).length > 0
    ? normalizeProjectionPath(payload.team_path)
    : normalizeProjectionPath(payload.teamPath).length > 0
      ? normalizeProjectionPath(payload.teamPath)
      : Array.isArray(rootLogicalTeamPath) ? [...rootLogicalTeamPath] : [];
  const payloadRelativePath = normalizeProjectionPath(payload.task_team_relative_member_path).length > 0
    ? normalizeProjectionPath(payload.task_team_relative_member_path)
    : normalizeProjectionPath(payload.taskTeamRelativeMemberPath);
  const relativeMemberRouteKey = normalizeProjectionString(payload.task_team_relative_member_route_key)
    ?? normalizeProjectionString(payload.taskTeamRelativeMemberRouteKey)
    ?? buildRouteKeyFromPath(payloadRelativePath)
    ?? '';
  const relativeMemberPath = payloadRelativePath.length > 0
    ? payloadRelativePath
    : relativeMemberRouteKey.split('/').map((part) => part.trim()).filter(Boolean);
  if (relativeMemberPath.length === 0 && !relativeMemberRouteKey) {
    return { outcome: 'root', taskTeamRunId };
  }

  const structuralSourcePath = [...logicalTeamPath, ...relativeMemberPath];
  const structuralSourceRouteKey = buildRouteKeyFromPath(structuralSourcePath);
  const structuralNode = structuralSourceRouteKey
    ? teamContext.memberNodesByRouteKey.get(structuralSourceRouteKey) ?? null
    : null;
  const existingScoped = teamContext.memberNodesByRouteKey.get(
    buildTaskTeamScopedChildRouteKey(taskTeamRunId, relativeMemberRouteKey),
  ) ?? null;
  const memberKind = existingScoped?.memberKind ?? structuralNode?.memberKind ?? 'agent';
  const scopedMemberRouteKey = buildTaskTeamScopedChildRouteKey(taskTeamRunId, relativeMemberRouteKey);

  return {
    outcome: 'child',
    identity: {
      parentTaskTeamRunId: taskTeamRunId,
      parentTaskTeamInstanceId: normalizeProjectionString(payload.task_team_instance_id)
        ?? normalizeProjectionString(payload.taskTeamInstanceId)
        ?? rootNode?.taskTeamInstanceId
        ?? null,
      parentTaskId: normalizeProjectionString(payload.task_id) ?? normalizeProjectionString(payload.taskId) ?? rootNode?.taskId ?? null,
      logicalTeamRouteKey: normalizeProjectionString(payload.team_route_key)
        ?? normalizeProjectionString(payload.teamRouteKey)
        ?? rootNode?.logicalTeamRouteKey
        ?? null,
      logicalTeamPath,
      relativeMemberPath,
      relativeMemberRouteKey,
      structuralSourcePath,
      structuralSourceRouteKey,
      scopedMemberPath: [taskTeamRunId, ...relativeMemberPath],
      scopedMemberRouteKey,
      memberKind,
      runtimeMemberRunId: normalizeProjectionString(payload.agent_id) ?? normalizeProjectionString(payload.agentId),
      conversationTargetSegments: rootNode?.conversationTargetSegments
        ? [
            ...cloneConversationTargetSegments(rootNode.conversationTargetSegments),
            { kind: 'member', memberRouteKey: relativeMemberRouteKey },
          ]
        : undefined,
    },
  };
};

const promoteScopedContextRunId = (
  context: AgentContext,
  runtimeMemberRunId: string | null,
): void => {
  if (!runtimeMemberRunId) return;
  const currentRunId = context.state.runId?.trim() || '';
  if (!currentRunId || currentRunId === context.state.conversation.id || currentRunId.includes('/')) {
    context.state.runId = runtimeMemberRunId;
  }
};

export const ensureTaskTeamChildProjection = (
  teamContext: AgentTeamContext,
  identity: TaskTeamChildMemberProjectionIdentity,
): { node: TeamMemberNode; context: AgentContext | null; mutation: TaskExecutionProjectionMutation } | null => {
  const before = captureTaskExecutionNavigationSnapshot(teamContext);
  const node = teamContext.memberNodesByRouteKey.get(identity.scopedMemberRouteKey) ?? null;
  if (!node?.isTaskTeamChildProjection) {
    console.warn('Task-team scoped child projection missing for stamped event', identity);
    return null;
  }

  if (identity.runtimeMemberRunId) {
    node.memberRunId = identity.runtimeMemberRunId;
  }
  if (node.memberKind === 'agent_team') {
    return {
      node,
      context: null,
      mutation: deriveTaskExecutionProjectionMutation(before, teamContext, 'ensure task-team child'),
    };
  }

  const context = teamContext.leafAgentContextsByRouteKey.get(identity.scopedMemberRouteKey) ?? null;
  if (!context) {
    console.warn('Task-team scoped child context missing for stamped event', identity);
    return null;
  }
  promoteScopedContextRunId(context, identity.runtimeMemberRunId);
  return {
    node,
    context,
    mutation: deriveTaskExecutionProjectionMutation(before, teamContext, 'ensure task-team child'),
  };
};

export const updateTaskTeamChildStatus = (
  teamContext: AgentTeamContext,
  node: TeamMemberNode,
  message: ServerMessage,
): TaskExecutionProjectionMutation => {
  const before = captureTaskExecutionNavigationSnapshot(teamContext);
  if (message.type !== 'AGENT_STATUS' || node.memberKind !== 'agent') {
    return deriveTaskExecutionProjectionMutation(before, teamContext, 'unchanged task-team child status');
  }
  const payload = payloadFor(message);
  if (!payload) return deriveTaskExecutionProjectionMutation(before, teamContext, 'missing task-team child status');
  node.currentStatus = normalizeAgentRuntimeStatus(
    typeof payload.status === 'string' ? payload.status : null,
  ) ?? AgentStatus.Offline;
  return deriveTaskExecutionProjectionMutation(before, teamContext, 'update task-team child status');
};

export const removeTaskTeamChildProjections = (
  teamContext: AgentTeamContext,
  taskTeamRunId: string,
): TaskExecutionProjectionMutation => {
  const before = captureTaskExecutionNavigationSnapshot(teamContext);
  const scopedPrefix = `${taskTeamRunId}/`;
  const memberNodes = new Map(teamContext.memberNodesByRouteKey);
  const routeKeysToRemove = new Set<string>();
  for (const [routeKey, node] of memberNodes.entries()) {
    if (node.parentTaskTeamRunId === taskTeamRunId || routeKey.startsWith(scopedPrefix)) {
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
      resetRecentEventMonitorBaseline(context);
      leafContexts.delete(routeKey);
    }
  }
  teamContext.memberNodesByRouteKey = memberNodes;
  teamContext.leafAgentContextsByRouteKey = leafContexts;
  return deriveTaskExecutionProjectionMutation(before, teamContext, 'remove task-team children');
};
