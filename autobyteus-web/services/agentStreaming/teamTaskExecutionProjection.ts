import type { AgentTeamContext, TeamMemberNode } from '~/types/agent/AgentTeamContext';

export type TaskExecutionProjectionStatus =
  | 'starting'
  | 'active'
  | 'awaiting_review'
  | 'revision_requested'
  | 'accepted'
  | 'settling'
  | 'settled'
  | 'failed';

export interface TaskExecutionTimelineEntry {
  id: string;
  eventType: string;
  status: TaskExecutionProjectionStatus;
  label: string;
  createdAt: string;
  message?: string | null;
}

export const buildTaskTeamScopedChildRouteKey = (
  taskTeamRunId: string,
  relativeRouteKey: string,
): string => {
  const parent = taskTeamRunId.trim();
  const child = relativeRouteKey.trim().replace(/^\/|\/$/g, '');
  return child ? `${parent}/${child}` : parent;
};

export const buildRouteKeyFromPath = (path: readonly string[]): string | null => {
  const parts = path.map((part) => String(part).trim()).filter(Boolean);
  return parts.length > 0 ? parts.join('/') : null;
};

export const normalizeProjectionPath = (value: unknown): string[] => (
  Array.isArray(value)
    ? value.map((part) => String(part).trim()).filter(Boolean)
    : []
);

export const normalizeProjectionString = (value: unknown): string | null => (
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
);

export const isTaskTeamProjectionNode = (node: TeamMemberNode | null | undefined): boolean => Boolean(
  node?.memberKind === 'agent_team' && node.isTaskTeamInstance,
);

export const isTaskTeamChildProjectionNode = (node: TeamMemberNode | null | undefined): boolean => Boolean(
  node?.isTaskTeamChildProjection,
);

export const isActiveTaskExecutionProjectionNode = (node: TeamMemberNode | null | undefined): boolean => Boolean(
  node?.isTaskAgentInstance || node?.isTaskTeamInstance,
);

const eventStatusMap: Record<string, TaskExecutionProjectionStatus> = {
  TASK_DELEGATION_ACTIVATED: 'active',
  TASK_DELEGATION_STATUS_UPDATED: 'active',
  TASK_DELEGATION_RESULT_SUBMITTED: 'awaiting_review',
  TASK_DELEGATION_RESULT_REVIEWED: 'accepted',
  TASK_DELEGATION_TERMINAL_STATUS: 'settled',
};

export const isTerminalTaskExecutionProjectionStatus = (
  status: TaskExecutionProjectionStatus | null | undefined,
): boolean => status === 'settled' || status === 'failed';

export const normalizeTaskExecutionStatusFromPayload = (
  eventType: string | null | undefined,
  rawStatus: unknown,
  decision: unknown = null,
): TaskExecutionProjectionStatus => {
  const status = normalizeProjectionString(rawStatus)?.toLowerCase().replace(/[-\s]+/g, '_') ?? null;
  if (status) {
    if (status === 'running') return 'active';
    if (status === 'awaiting_review' || status === 'pending_review') return 'awaiting_review';
    if (status === 'revision_requested' || status === 'revision') return 'revision_requested';
    if (status === 'accepted') return 'accepted';
    if (status === 'settling') return 'settling';
    if (status === 'settled' || status === 'completed' || status === 'terminal' || status === 'offline') return 'settled';
    if (status === 'failed' || status === 'error') return 'failed';
    if (status === 'starting' || status === 'initializing') return 'starting';
    if (status === 'active') return 'active';
  }

  const normalizedDecision = normalizeProjectionString(decision)?.toLowerCase().replace(/[-\s]+/g, '_') ?? null;
  if (normalizedDecision === 'request_revision' || normalizedDecision === 'revision_requested') {
    return 'revision_requested';
  }
  if (normalizedDecision === 'accept' || normalizedDecision === 'accepted') {
    return 'accepted';
  }

  return eventStatusMap[eventType ?? ''] ?? 'active';
};

export const buildTaskExecutionTimelineEntry = (input: {
  eventType: string;
  status: TaskExecutionProjectionStatus;
  message?: string | null;
  existingCount: number;
}): TaskExecutionTimelineEntry => ({
  id: `${input.eventType}:${input.existingCount}`,
  eventType: input.eventType,
  status: input.status,
  label: input.eventType
    .replace(/^TASK_DELEGATION_/, '')
    .toLowerCase()
    .replace(/_/g, ' '),
  createdAt: new Date().toISOString(),
  message: input.message ?? null,
});

export const setTeamContextMemberNode = (
  teamContext: AgentTeamContext,
  node: TeamMemberNode,
): void => {
  teamContext.memberNodesByRouteKey = new Map(teamContext.memberNodesByRouteKey).set(node.memberRouteKey, node);
};
