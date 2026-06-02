import type { AgentContext } from '~/types/agent/AgentContext';
import { AgentContext as AgentContextModel } from '~/types/agent/AgentContext';
import type { AgentTeamContext, AgentTeamMemberNode } from '~/types/agent/AgentTeamContext';
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig';
import { DEFAULT_AGENT_RUNTIME_KIND } from '~/types/agent/AgentRunConfig';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { Conversation } from '~/types/conversation';
import type { ServerMessage } from './protocol';
import type { TeamStreamIdentityPayload } from './protocol';
import { resolveActiveExecutionFocusedMemberRouteKey } from '~/utils/teamActiveExecutionMembers';

export interface TaskAgentStreamIdentity {
  taskAgentRunId: string;
  taskAgentInstanceId: string | null;
  taskId: string | null;
  logicalMemberRouteKey: string | null;
  logicalMemberPath: string[];
}

const taskAgentIdentityByContext = new WeakMap<AgentContext, TaskAgentStreamIdentity>();

const cloneTaskAgentIdentity = (identity: TaskAgentStreamIdentity): TaskAgentStreamIdentity => ({
  ...identity,
  logicalMemberPath: [...identity.logicalMemberPath],
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
  nodes: readonly AgentTeamContext['memberTree'][number][],
  taskAgentNode: AgentTeamMemberNode,
  parentRouteKey: string | null,
): AgentTeamContext['memberTree'] => {
  if (!parentRouteKey) {
    return [...nodes, taskAgentNode];
  }
  let inserted = false;
  const visit = (source: readonly AgentTeamContext['memberTree'][number][]): AgentTeamContext['memberTree'] =>
    source.flatMap((node) => {
      const withChildren = node.memberKind === 'agent_team'
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
  nodes: readonly AgentTeamContext['memberTree'][number][],
  taskAgentRunId: string,
): AgentTeamContext['memberTree'] =>
  nodes.flatMap((node) => {
    if (node.memberRouteKey === taskAgentRunId) {
      return [];
    }
    if (node.memberKind !== 'agent_team') {
      return [node];
    }
    return [{ ...node, children: removeTaskAgentNodeFromTree(node.children, taskAgentRunId) }];
  });

const buildTaskAgentNode = (
  teamContext: AgentTeamContext,
  identity: TaskAgentStreamIdentity,
  context: AgentContext,
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
  };
};

const ensureTaskAgentNode = (
  teamContext: AgentTeamContext,
  identity: TaskAgentStreamIdentity,
  context: AgentContext,
): AgentTeamMemberNode => {
  const existingNode = teamContext.memberNodesByRouteKey.get(identity.taskAgentRunId);
  if (existingNode?.isTaskAgentInstance) {
    return existingNode as AgentTeamMemberNode;
  }

  const node = buildTaskAgentNode(teamContext, identity, context);
  teamContext.memberNodesByRouteKey = new Map(teamContext.memberNodesByRouteKey).set(identity.taskAgentRunId, node);
  teamContext.memberTree = insertTaskAgentNodeNearParent(
    removeTaskAgentNodeFromTree(teamContext.memberTree, identity.taskAgentRunId),
    node,
    identity.logicalMemberRouteKey,
  );
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
    setTaskAgentContextIdentity(existing, identity);
    ensureTaskAgentNode(teamContext, identity, existing);
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
  setTaskAgentContextIdentity(context, identity);

  teamContext.leafAgentContextsByRouteKey = new Map(teamContext.leafAgentContextsByRouteKey).set(identity.taskAgentRunId, context);
  ensureTaskAgentNode(teamContext, identity, context);
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
