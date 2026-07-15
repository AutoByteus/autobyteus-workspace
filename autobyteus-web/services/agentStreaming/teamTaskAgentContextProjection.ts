import type { AgentContext } from '~/types/agent/AgentContext';
import { AgentContext as AgentContextModel } from '~/types/agent/AgentContext';
import type { AgentTeamContext, AgentTeamMemberNode, TeamMemberNode } from '~/types/agent/AgentTeamContext';
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig';
import { DEFAULT_AGENT_RUNTIME_KIND } from '~/types/agent/AgentRunConfig';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { Conversation } from '~/types/conversation';
import type { ServerMessage } from './protocol';
import type { TeamStreamIdentityPayload } from './protocol/teamStreamIdentityTypes';
import { resolveActiveExecutionFocusedMemberRouteKey } from '~/utils/teamActiveExecutionMembers';
import type { ConversationTargetSegment } from '~/types/agent/ConversationTargetAddress';
import {
  applyTaskDelegationProjectionDetails,
  type TaskDelegationProjectionDetails,
} from './teamTaskExecutionProjection';

export interface TaskAgentStreamIdentity {
  taskAgentRunId: string;
  taskAgentInstanceId: string | null;
  taskId: string | null;
  logicalMemberRouteKey: string | null;
  logicalMemberPath: string[];
  parentTaskTeamRunId?: string | null;
  parentTaskTeamInstanceId?: string | null;
  parentTaskId?: string | null;
  taskTeamRelativeMemberRouteKey?: string | null;
  taskTeamRelativeMemberPath?: string[] | null;
  structuralSourceRouteKey?: string | null;
  structuralSourcePath?: string[] | null;
  parentLogicalTeamRouteKey?: string | null;
  parentLogicalTeamPath?: string[] | null;
  conversationTargetSegments?: ConversationTargetSegment[] | null;
}

const taskAgentIdentityByContext = new WeakMap<AgentContext, TaskAgentStreamIdentity>();

const cloneTaskAgentIdentity = (identity: TaskAgentStreamIdentity): TaskAgentStreamIdentity => ({
  ...identity,
  logicalMemberPath: [...identity.logicalMemberPath],
  taskTeamRelativeMemberPath: identity.taskTeamRelativeMemberPath ? [...identity.taskTeamRelativeMemberPath] : null,
  structuralSourcePath: identity.structuralSourcePath ? [...identity.structuralSourcePath] : null,
  parentLogicalTeamPath: identity.parentLogicalTeamPath ? [...identity.parentLogicalTeamPath] : null,
  conversationTargetSegments: identity.conversationTargetSegments
    ? identity.conversationTargetSegments.map((segment) => ({ ...segment, ...(segment.kind === 'member' && segment.memberPath ? { memberPath: [...segment.memberPath] } : {}) }))
    : null,
});

const setTaskAgentContextIdentity = (
  context: AgentContext,
  identity: TaskAgentStreamIdentity,
): void => {
  taskAgentIdentityByContext.set(context, cloneTaskAgentIdentity(identity));
};

export const getTaskAgentIdentityFromContext = (
  context: AgentContext,
): TaskAgentStreamIdentity | null => {
  const identity = taskAgentIdentityByContext.get(context);
  return identity ? cloneTaskAgentIdentity(identity) : null;
};

const hasScopedTaskTeamAncestry = (identity: TaskAgentStreamIdentity | null): boolean => Boolean(
  identity?.parentTaskTeamRunId || identity?.conversationTargetSegments?.some((segment) => segment.kind === 'task_team'),
);

const mergeTaskAgentIdentity = (
  existing: TaskAgentStreamIdentity | null,
  incoming: TaskAgentStreamIdentity,
): TaskAgentStreamIdentity => {
  if (!hasScopedTaskTeamAncestry(existing) || hasScopedTaskTeamAncestry(incoming)) {
    return incoming;
  }
  return {
    ...incoming,
    logicalMemberRouteKey: existing?.logicalMemberRouteKey ?? incoming.logicalMemberRouteKey,
    logicalMemberPath: existing?.logicalMemberPath?.length ? [...existing.logicalMemberPath] : [...incoming.logicalMemberPath],
    parentTaskTeamRunId: existing?.parentTaskTeamRunId ?? null,
    parentTaskTeamInstanceId: existing?.parentTaskTeamInstanceId ?? null,
    parentTaskId: existing?.parentTaskId ?? null,
    taskTeamRelativeMemberRouteKey: existing?.taskTeamRelativeMemberRouteKey ?? null,
    taskTeamRelativeMemberPath: existing?.taskTeamRelativeMemberPath ? [...existing.taskTeamRelativeMemberPath] : null,
    structuralSourceRouteKey: existing?.structuralSourceRouteKey ?? null,
    structuralSourcePath: existing?.structuralSourcePath ? [...existing.structuralSourcePath] : null,
    parentLogicalTeamRouteKey: existing?.parentLogicalTeamRouteKey ?? null,
    parentLogicalTeamPath: existing?.parentLogicalTeamPath ? [...existing.parentLogicalTeamPath] : null,
    conversationTargetSegments: existing?.conversationTargetSegments
      ? cloneTaskAgentIdentity(existing).conversationTargetSegments
      : null,
  };
};

const normalizeString = (value: unknown): string | null => (
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
);

const normalizePath = (value: unknown): string[] => (
  Array.isArray(value)
    ? value.map((part) => String(part).trim()).filter(Boolean)
    : []
);

const routeKeyFromPath = (value: unknown): string | null => {
  const path = normalizePath(value);
  return path.length > 0 ? path.join('/') : null;
};

const trimRelativeSegmentsFromPath = (
  sourcePath: readonly string[] | null | undefined,
  relativePath: readonly string[] | null | undefined,
): string[] => {
  const source = Array.isArray(sourcePath) ? [...sourcePath] : [];
  const relative = Array.isArray(relativePath) ? [...relativePath] : [];
  if (source.length >= relative.length && relative.every((part, index) => source[source.length - relative.length + index] === part)) {
    return source.slice(0, source.length - relative.length);
  }
  return [];
};

const buildConversationTargetSegments = (
  identity: TaskAgentStreamIdentity,
): ConversationTargetSegment[] | undefined => {
  if (identity.conversationTargetSegments?.length) {
    return identity.conversationTargetSegments.map((segment) => ({ ...segment, ...(segment.kind === 'member' && segment.memberPath ? { memberPath: [...segment.memberPath] } : {}) }));
  }
  if (!identity.taskAgentRunId) return undefined;
  if (identity.parentTaskTeamRunId) {
    const logicalTeamRouteKey =
      identity.parentLogicalTeamRouteKey ??
      routeKeyFromPath(identity.parentLogicalTeamPath) ??
      routeKeyFromPath(trimRelativeSegmentsFromPath(identity.structuralSourcePath, identity.taskTeamRelativeMemberPath));
    const relativeRouteKey =
      identity.taskTeamRelativeMemberRouteKey ??
      routeKeyFromPath(identity.taskTeamRelativeMemberPath);
    if (!logicalTeamRouteKey || !relativeRouteKey) return undefined;
    return [
      { kind: 'member', memberRouteKey: logicalTeamRouteKey },
      { kind: 'task_team', taskTeamRunId: identity.parentTaskTeamRunId },
      { kind: 'member', memberRouteKey: relativeRouteKey },
      { kind: 'task_agent', taskAgentRunId: identity.taskAgentRunId },
    ];
  }
  const logicalMemberRouteKey = identity.logicalMemberRouteKey ?? routeKeyFromPath(identity.logicalMemberPath);
  return logicalMemberRouteKey
    ? [
        { kind: 'member', memberRouteKey: logicalMemberRouteKey },
        { kind: 'task_agent', taskAgentRunId: identity.taskAgentRunId },
      ]
    : undefined;
};

export const extractTaskAgentIdentity = (message: ServerMessage): TaskAgentStreamIdentity | null => {
  const payload: Partial<TeamStreamIdentityPayload> | null =
    'payload' in message && message.payload && typeof message.payload === 'object'
      ? message.payload as Partial<TeamStreamIdentityPayload>
      : null;
  if (!payload) {
    return null;
  }

  const taskAgentRunId =
    normalizeString(payload.task_agent_run_id) ??
    normalizeString(payload.taskAgentRunId);
  if (!taskAgentRunId) {
    return null;
  }

  const memberPath = normalizePath(payload.member_path).length > 0
    ? normalizePath(payload.member_path)
    : normalizePath(payload.memberPath);
  const sourcePath = normalizePath(payload.source_path).length > 0
    ? normalizePath(payload.source_path)
    : normalizePath(payload.sourcePath);
  const logicalMemberPath = memberPath.length > 0 ? memberPath : sourcePath;

  return {
    taskAgentRunId,
    taskAgentInstanceId:
      normalizeString(payload.task_agent_instance_id) ??
      normalizeString(payload.taskAgentInstanceId),
    taskId: normalizeString(payload.task_id) ?? normalizeString(payload.taskId),
    logicalMemberRouteKey:
      normalizeString(payload.member_route_key) ??
      normalizeString(payload.memberRouteKey) ??
      normalizeString(payload.source_route_key) ??
      normalizeString(payload.sourceRouteKey) ??
      routeKeyFromPath(logicalMemberPath),
    logicalMemberPath,
  };
};

const buildTaskAgentDisplayName = (
  teamContext: AgentTeamContext,
  identity: TaskAgentStreamIdentity,
): string => {
  const logicalRoute = identity.logicalMemberRouteKey ?? '';
  const logicalNode = logicalRoute ? teamContext.memberNodesByRouteKey?.get(logicalRoute) : null;
  const logicalName =
    logicalNode?.displayName ||
    logicalNode?.memberName ||
    logicalRoute.split('/').filter(Boolean).pop() ||
    'Task agent';
  const taskLabel = identity.taskId || identity.taskAgentInstanceId || identity.taskAgentRunId;
  return `${logicalName} · ${taskLabel}`;
};

const buildTaskAgentFallbackConfig = (
  displayName: string,
  logicalContext: AgentContext | null,
): AgentRunConfig => {
  if (logicalContext) {
    return {
      ...logicalContext.config,
      agentDefinitionName: displayName,
      isLocked: true,
    };
  }

  return {
    agentDefinitionId: 'task-agent',
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
};

const insertTaskAgentNodeNearParent = (
  nodes: readonly TeamMemberNode[],
  taskAgentNode: AgentTeamMemberNode,
  parentRouteKey: string | null,
): TeamMemberNode[] => {
  if (!parentRouteKey) {
    return [...nodes, taskAgentNode];
  }
  let inserted = false;
  const visit = (source: readonly TeamMemberNode[]): TeamMemberNode[] =>
    source.flatMap((node) => {
      const withChildren: TeamMemberNode = node.memberKind === 'agent_team'
        ? { ...node, children: visit(node.children) }
        : node;
      if (node.memberRouteKey !== parentRouteKey) {
        return [withChildren];
      }
      inserted = true;
      return [withChildren, taskAgentNode];
    });
  const updated = visit(nodes);
  return inserted ? updated : [...updated, taskAgentNode];
};

const removeTaskAgentNodeFromTree = (
  nodes: readonly TeamMemberNode[],
  taskAgentRunId: string,
): TeamMemberNode[] => {
  const retained: TeamMemberNode[] = [];
  for (const node of nodes) {
    if (node.memberRouteKey === taskAgentRunId) {
      continue;
    }
    if (node.memberKind !== 'agent_team') {
      retained.push(node);
      continue;
    }
    const retainedNode: TeamMemberNode = {
      ...node,
      children: removeTaskAgentNodeFromTree(node.children, taskAgentRunId),
    };
    retained.push(retainedNode);
  }
  return retained;
};

const buildTaskAgentNode = (
  teamContext: AgentTeamContext,
  identity: TaskAgentStreamIdentity,
  context: AgentContext,
  existingNode: TeamMemberNode | null = null,
): AgentTeamMemberNode => {
  const logicalContext = identity.logicalMemberRouteKey
    ? teamContext.leafAgentContextsByRouteKey.get(identity.logicalMemberRouteKey) || null
    : null;
  const displayName = context.config.agentDefinitionName || buildTaskAgentDisplayName(teamContext, identity);
  const memberPath = identity.logicalMemberPath.length > 0
    ? [...identity.logicalMemberPath, identity.taskAgentRunId]
    : [identity.taskAgentRunId];

  return {
    memberKind: 'agent',
    memberName: displayName,
    displayName,
    memberPath,
    memberRouteKey: identity.taskAgentRunId,
    memberRunId: identity.taskAgentRunId,
    agentDefinitionId: logicalContext?.config.agentDefinitionId ?? context.config.agentDefinitionId ?? 'task-agent',
    currentStatus: context.state.currentStatus,
    isTaskAgentInstance: true,
    taskAgentInstanceId: identity.taskAgentInstanceId,
    taskAgentRunId: identity.taskAgentRunId,
    taskId: identity.taskId,
    logicalMemberRouteKey: identity.logicalMemberRouteKey,
    parentTaskTeamRunId: identity.parentTaskTeamRunId ?? null,
    parentTaskTeamInstanceId: identity.parentTaskTeamInstanceId ?? null,
    parentTaskId: identity.parentTaskId ?? null,
    taskTeamRelativeMemberRouteKey: identity.taskTeamRelativeMemberRouteKey ?? null,
    taskTeamRelativeMemberPath: identity.taskTeamRelativeMemberPath ? [...identity.taskTeamRelativeMemberPath] : null,
    structuralSourceRouteKey: identity.structuralSourceRouteKey ?? null,
    structuralSourcePath: identity.structuralSourcePath ? [...identity.structuralSourcePath] : null,
    logicalTeamRouteKey: identity.parentLogicalTeamRouteKey ?? null,
    logicalTeamPath: identity.parentLogicalTeamPath ? [...identity.parentLogicalTeamPath] : null,
    conversationTargetSegments: buildConversationTargetSegments(identity),
    taskExecutionStatus: existingNode?.taskExecutionStatus ?? null,
    taskLabel: existingNode?.taskLabel ?? null,
    taskDescription: existingNode?.taskDescription ?? null,
    taskReferenceFiles: existingNode?.taskReferenceFiles ? existingNode.taskReferenceFiles.map((reference) => ({ ...reference })) : [],
    taskArguments: existingNode?.taskArguments ?? null,
    taskTargetKind: existingNode?.taskTargetKind ?? null,
    taskTargetName: existingNode?.taskTargetName ?? null,
  };
};

const ensureTaskAgentNode = (
  teamContext: AgentTeamContext,
  identity: TaskAgentStreamIdentity,
  context: AgentContext,
): AgentTeamMemberNode => {
  const existingNode = teamContext.memberNodesByRouteKey.get(identity.taskAgentRunId);
  const node = buildTaskAgentNode(teamContext, identity, context, existingNode ?? null);
  teamContext.memberNodesByRouteKey = new Map(teamContext.memberNodesByRouteKey).set(identity.taskAgentRunId, node);
  teamContext.memberTree = insertTaskAgentNodeNearParent(
    removeTaskAgentNodeFromTree(teamContext.memberTree, identity.taskAgentRunId),
    node,
    identity.logicalMemberRouteKey,
  );
  if (existingNode?.isTaskAgentInstance) {
    return node;
  }
  return node;
};

export const applyTaskAgentDelegationDetails = (
  teamContext: AgentTeamContext,
  taskAgentRunId: string,
  details: TaskDelegationProjectionDetails | null,
): AgentTeamMemberNode | null => {
  const node = teamContext.memberNodesByRouteKey.get(taskAgentRunId) ?? null;
  if (!node?.isTaskAgentInstance || node.memberKind !== 'agent') {
    return null;
  }
  applyTaskDelegationProjectionDetails(node, details);
  teamContext.memberNodesByRouteKey = new Map(teamContext.memberNodesByRouteKey).set(node.memberRouteKey, node);
  return node;
};

const restoreTaskAgentNodes = (
  teamContext: AgentTeamContext,
  taskAgentNodes: readonly AgentTeamMemberNode[],
): void => {
  let memberNodesByRouteKey = new Map(teamContext.memberNodesByRouteKey);
  let memberTree = teamContext.memberTree;

  for (const node of taskAgentNodes) {
    if (!node.isTaskAgentInstance) {
      continue;
    }
    if (!teamContext.leafAgentContextsByRouteKey.has(node.memberRouteKey)) {
      continue;
    }
    memberNodesByRouteKey = new Map(memberNodesByRouteKey).set(node.memberRouteKey, node);
    memberTree = insertTaskAgentNodeNearParent(
      removeTaskAgentNodeFromTree(memberTree, node.memberRouteKey),
      node,
      node.logicalMemberRouteKey ?? null,
    );
  }

  teamContext.memberNodesByRouteKey = memberNodesByRouteKey;
  teamContext.memberTree = memberTree;
};

export const restoreTaskAgentContextProjections = (
  teamContext: AgentTeamContext,
  taskAgentNodes: readonly AgentTeamMemberNode[] = [],
): void => {
  restoreTaskAgentNodes(teamContext, taskAgentNodes);

  for (const context of teamContext.leafAgentContextsByRouteKey.values()) {
    const identity = getTaskAgentIdentityFromContext(context);
    if (!identity || teamContext.memberNodesByRouteKey.get(identity.taskAgentRunId)?.isTaskAgentInstance) {
      continue;
    }
    ensureTaskAgentNode(teamContext, identity, context);
  }
};

export const ensureTaskAgentContext = (
  teamContext: AgentTeamContext,
  identity: TaskAgentStreamIdentity,
): AgentContext => {
  const existing = teamContext.leafAgentContextsByRouteKey.get(identity.taskAgentRunId) || null;
  if (existing) {
    const mergedIdentity = mergeTaskAgentIdentity(getTaskAgentIdentityFromContext(existing), identity);
    setTaskAgentContextIdentity(existing, mergedIdentity);
    ensureTaskAgentNode(teamContext, mergedIdentity, existing);
    return existing;
  }

  const logicalContext = identity.logicalMemberRouteKey
    ? teamContext.leafAgentContextsByRouteKey.get(identity.logicalMemberRouteKey) || null
    : null;
  const displayName = buildTaskAgentDisplayName(teamContext, identity);
  const now = new Date().toISOString();
  const conversation: Conversation = {
    id: identity.taskAgentRunId,
    messages: [],
    createdAt: now,
    updatedAt: now,
    agentDefinitionId: logicalContext?.config.agentDefinitionId,
    agentName: displayName,
    llmModelIdentifier: logicalContext?.config.llmModelIdentifier,
  };
  const context = new AgentContextModel(
    buildTaskAgentFallbackConfig(displayName, logicalContext),
    new AgentRunState(identity.taskAgentRunId, conversation),
  );
  context.isSubscribed = true;
  const mergedIdentity = mergeTaskAgentIdentity(null, identity);
  setTaskAgentContextIdentity(context, mergedIdentity);

  teamContext.leafAgentContextsByRouteKey = new Map(teamContext.leafAgentContextsByRouteKey).set(identity.taskAgentRunId, context);
  ensureTaskAgentNode(teamContext, mergedIdentity, context);
  return context;
};

export const getTaskAgentContextByRunId = (
  teamContext: AgentTeamContext,
  memberRunId: string,
): AgentContext | null => {
  const taskAgentContext = teamContext.leafAgentContextsByRouteKey.get(memberRunId) || null;
  const taskAgentNode = teamContext.memberNodesByRouteKey?.get(memberRunId) || null;
  return taskAgentContext && taskAgentNode?.isTaskAgentInstance ? taskAgentContext : null;
};

export const removeTaskAgentContext = (
  teamContext: AgentTeamContext,
  identity: TaskAgentStreamIdentity,
): void => {
  const node = teamContext.memberNodesByRouteKey?.get(identity.taskAgentRunId) || null;
  if (!node?.isTaskAgentInstance) {
    return;
  }

  const leafContexts = new Map(teamContext.leafAgentContextsByRouteKey);
  leafContexts.delete(identity.taskAgentRunId);
  teamContext.leafAgentContextsByRouteKey = leafContexts;

  const memberNodes = new Map(teamContext.memberNodesByRouteKey);
  memberNodes.delete(identity.taskAgentRunId);
  teamContext.memberNodesByRouteKey = memberNodes;
  teamContext.memberTree = removeTaskAgentNodeFromTree(teamContext.memberTree, identity.taskAgentRunId);

  if (teamContext.focusedMemberRouteKey === identity.taskAgentRunId) {
    teamContext.focusedMemberRouteKey = resolveActiveExecutionFocusedMemberRouteKey(teamContext);
  }
};

export const shouldRemoveTaskAgentAfterMessage = (
  message: ServerMessage,
  identity: TaskAgentStreamIdentity | null,
): boolean => Boolean(
  identity &&
  message.type === 'AGENT_STATUS' &&
  message.payload.status === AgentStatus.Offline,
);
