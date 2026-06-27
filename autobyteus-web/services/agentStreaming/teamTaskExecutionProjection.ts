import type { AgentTeamContext, TeamMemberNode } from '~/types/agent/AgentTeamContext';
import type { ServerMessage } from './protocol';

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

export interface TaskDelegationProjectionDetails {
  taskId: string | null;
  taskLabel: string | null;
  taskDescription: string | null;
  taskTargetKind: string | null;
  taskTargetName: string | null;
  taskExecutionStatus: TaskExecutionProjectionStatus;
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

const asProjectionRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
);

const extractTaskArrayEntry = (
  tasks: unknown,
  taskId: string | null,
): Record<string, unknown> => {
  if (!Array.isArray(tasks)) {
    return {};
  }
  const taskRecords = tasks.map(asProjectionRecord).filter((task) => Object.keys(task).length > 0);
  if (!taskRecords.length) {
    return {};
  }
  if (!taskId) {
    return taskRecords[0] ?? {};
  }
  return taskRecords.find((task) => (
    normalizeProjectionString(task.taskId) === taskId ||
    normalizeProjectionString(task.task_id) === taskId
  )) ?? taskRecords[0] ?? {};
};

const extractTargetName = (target: Record<string, unknown>, targetKind: string | null): string | null => {
  if (targetKind === 'member') {
    const member = asProjectionRecord(target.member);
    return normalizeProjectionString(member.memberName)
      ?? normalizeProjectionString(member.member_name)
      ?? normalizeProjectionString(member.name)
      ?? normalizeProjectionString(member.memberRouteKey)
      ?? normalizeProjectionString(member.member_route_key);
  }
  if (targetKind === 'team') {
    const team = asProjectionRecord(target.team);
    return normalizeProjectionString(team.memberName)
      ?? normalizeProjectionString(team.member_name)
      ?? normalizeProjectionString(team.name)
      ?? normalizeProjectionString(team.memberRouteKey)
      ?? normalizeProjectionString(team.member_route_key);
  }
  return null;
};

export const extractTaskDelegationProjectionDetails = (
  message: ServerMessage,
): TaskDelegationProjectionDetails | null => {
  if (message.type !== 'TASK_DELEGATION_EVENT') {
    return null;
  }
  const payload = 'payload' in message ? asProjectionRecord(message.payload) : {};
  if (!Object.keys(payload).length) {
    return null;
  }

  const taskId = normalizeProjectionString(payload.task_id) ?? normalizeProjectionString(payload.taskId);
  const taskEntry = extractTaskArrayEntry(payload.tasks, taskId);
  const target = asProjectionRecord(payload.target);
  const targetKind = normalizeProjectionString(payload.target_kind)
    ?? normalizeProjectionString(payload.targetKind)
    ?? normalizeProjectionString(target.kind);
  const eventType = normalizeProjectionString(payload.event_type)
    ?? normalizeProjectionString(payload.eventType)
    ?? message.type;

  return {
    taskId: taskId ?? normalizeProjectionString(taskEntry.taskId) ?? normalizeProjectionString(taskEntry.task_id),
    taskLabel: normalizeProjectionString(payload.taskLabel)
      ?? normalizeProjectionString(payload.task_label)
      ?? normalizeProjectionString(taskEntry.taskLabel)
      ?? normalizeProjectionString(taskEntry.task_label),
    taskDescription: normalizeProjectionString(payload.description)
      ?? normalizeProjectionString(payload.taskDescription)
      ?? normalizeProjectionString(payload.task_description)
      ?? normalizeProjectionString(taskEntry.description)
      ?? normalizeProjectionString(taskEntry.taskDescription)
      ?? normalizeProjectionString(taskEntry.task_description),
    taskTargetKind: targetKind,
    taskTargetName: normalizeProjectionString(payload.target_name)
      ?? normalizeProjectionString(payload.targetName)
      ?? extractTargetName(target, targetKind),
    taskExecutionStatus: normalizeTaskExecutionStatusFromPayload(
      eventType,
      taskEntry.status ?? payload.status,
      payload.decision ?? payload.review_decision,
    ),
  };
};

export const applyTaskDelegationProjectionDetails = (
  node: TeamMemberNode,
  details: TaskDelegationProjectionDetails | null,
): void => {
  if (!details) {
    return;
  }
  node.taskId = details.taskId ?? node.taskId ?? null;
  node.taskLabel = details.taskLabel ?? node.taskLabel ?? null;
  node.taskDescription = details.taskDescription ?? node.taskDescription ?? null;
  node.taskTargetKind = details.taskTargetKind ?? node.taskTargetKind ?? null;
  node.taskTargetName = details.taskTargetName ?? node.taskTargetName ?? null;
  node.taskExecutionStatus = details.taskExecutionStatus ?? node.taskExecutionStatus ?? null;
};

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
