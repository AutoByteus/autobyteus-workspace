import type { AgentTeamContext, TeamMemberNode } from '~/types/agent/AgentTeamContext';
import type { AgentStatus } from '~/types/agent/AgentStatus';
import type { TeamReferenceFile } from '~/types/teamReferenceFile';
import { normalizeTeamReferenceFiles } from '~/utils/teamReferences/teamReferenceFileModel';
import { serializeTeamExecutionAddress, type TeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import type { ServerMessage } from './protocol';

export type TaskExecutionProjectionStatus = 'starting' | 'active' | 'awaiting_review' | 'revision_requested' | 'accepted' | 'settling' | 'settled' | 'failed';
export type TaskExecutionProjectionMutation =
  | { kind: 'NONE' }
  | {
      kind: 'PRESENTATION';
      executionAddress: TeamExecutionAddress;
      changes: Array<
        | { field: 'DISPLAY_NAME'; value: string }
        | { field: 'CURRENT_STATUS'; value: AgentStatus | string | null }
      >;
    }
  | { kind: 'TOPOLOGY'; reason: string };

export const NO_TASK_EXECUTION_PROJECTION_MUTATION: TaskExecutionProjectionMutation = Object.freeze({ kind: 'NONE' });

export const mergeTaskExecutionProjectionMutations = (
  left: TaskExecutionProjectionMutation,
  right: TaskExecutionProjectionMutation,
): TaskExecutionProjectionMutation => {
  if (left.kind === 'TOPOLOGY') return left;
  if (right.kind === 'TOPOLOGY') return right;
  if (left.kind === 'NONE') return right;
  if (right.kind === 'NONE') return left;
  if (serializeTeamExecutionAddress(left.executionAddress) !== serializeTeamExecutionAddress(right.executionAddress)) {
    return { kind: 'TOPOLOGY', reason: 'multiple task execution rows changed' };
  }
  const byField = new Map(left.changes.map((change) => [change.field, change]));
  right.changes.forEach((change) => byField.set(change.field, change));
  return { kind: 'PRESENTATION', executionAddress: left.executionAddress, changes: [...byField.values()] };
};

interface TaskExecutionNavigationRowSnapshot {
  executionAddress: TeamExecutionAddress;
  structural: string;
  displayName: string;
  currentStatus: AgentStatus | string | null;
}
export type TaskExecutionNavigationSnapshot = Map<string, TaskExecutionNavigationRowSnapshot>;

export const captureTaskExecutionNavigationSnapshot = (
  teamContext: AgentTeamContext,
): TaskExecutionNavigationSnapshot => {
  const rows: TaskExecutionNavigationSnapshot = new Map();
  const visit = (nodes: readonly TeamMemberNode[], parentKey: string | null, depth: number): void => {
    nodes.forEach((node, order) => {
      if (node.isTaskExecution && node.executionAddress) {
        const key = serializeTeamExecutionAddress(node.executionAddress);
        rows.set(key, {
          executionAddress: node.executionAddress,
          structural: JSON.stringify({
            parentKey,
            order,
            depth,
            kind: node.kind,
            address: node.address,
            hasChildren: node.kind === 'agent_team' && node.children.length > 0,
          }),
          displayName: node.displayName,
          currentStatus: node.kind === 'agent'
            ? teamContext.agentExecutionsByKey.get(key)?.state.currentStatus ?? node.currentStatus ?? null
            : null,
        });
      }
      if (node.kind === 'agent_team') {
        visit(node.children, node.executionAddress ? serializeTeamExecutionAddress(node.executionAddress) : node.address, depth + 1);
      }
    });
  };
  visit(teamContext.rootTeam.children, null, 0);
  return rows;
};

export const deriveTaskExecutionProjectionMutation = (
  before: TaskExecutionNavigationSnapshot,
  teamContext: AgentTeamContext,
  reason: string,
): TaskExecutionProjectionMutation => {
  const after = captureTaskExecutionNavigationSnapshot(teamContext);
  if (before.size !== after.size) return { kind: 'TOPOLOGY', reason };
  const presentation: Array<Extract<TaskExecutionProjectionMutation, { kind: 'PRESENTATION' }>> = [];
  for (const [key, current] of after.entries()) {
    const prior = before.get(key);
    if (!prior || prior.structural !== current.structural) return { kind: 'TOPOLOGY', reason };
    const changes: Extract<TaskExecutionProjectionMutation, { kind: 'PRESENTATION' }>['changes'] = [];
    if (prior.displayName !== current.displayName) changes.push({ field: 'DISPLAY_NAME', value: current.displayName });
    if (prior.currentStatus !== current.currentStatus) changes.push({ field: 'CURRENT_STATUS', value: current.currentStatus });
    if (changes.length) presentation.push({ kind: 'PRESENTATION', executionAddress: current.executionAddress, changes });
  }
  if (!presentation.length) return NO_TASK_EXECUTION_PROJECTION_MUTATION;
  if (presentation.length === 1) return presentation[0]!;
  return { kind: 'TOPOLOGY', reason: `${reason}: multiple represented rows changed` };
};

export interface TaskExecutionTimelineEntry { id: string; eventType: string; status: TaskExecutionProjectionStatus; label: string; createdAt: string; message?: string | null }
export interface TaskDelegationProjectionDetails {
  taskId: string | null; taskLabel: string | null; taskDescription: string | null;
  taskReferenceFiles: TeamReferenceFile[]; taskArguments: Record<string, unknown> | null;
  taskTargetKind: string | null; taskTargetAddress: string | null; taskExecutionStatus: TaskExecutionProjectionStatus;
  eventType: string; occurredAt: string; message: string | null;
}
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;
export const normalizeTaskExecutionStatusFromPayload = (eventType: string | null | undefined, rawStatus: unknown, decision: unknown = null): TaskExecutionProjectionStatus => {
  const status = text(rawStatus)?.toLowerCase().replace(/[-\s]+/g, '_');
  if (status === 'starting' || status === 'initializing') return 'starting';
  if (status === 'awaiting_review' || status === 'pending_review') return 'awaiting_review';
  if (status === 'accepted' || decision === 'accept') return 'accepted';
  if (status === 'settling') return 'settling';
  if (status === 'settled' || status === 'completed' || status === 'terminal' || status === 'offline') return 'settled';
  if (status === 'failed' || status === 'error') return 'failed';
  if (status === 'revision_requested' || status === 'revision' || decision === 'request_revision') return 'revision_requested';
  return eventType === 'TASK_DELEGATION_TERMINAL_STATUS' ? 'settled' : 'active';
};
export const extractTaskDelegationProjectionDetails = (message: ServerMessage): TaskDelegationProjectionDetails | null => {
  if (message.type !== 'TASK_DELEGATION_EVENT') return null;
  const payload = record(message.payload);
  const target = record(payload.target);
  const task = Array.isArray(payload.tasks) ? record(payload.tasks[0]) : {};
  const eventType = text(payload.event_type) ?? text(payload.eventType) ?? 'TASK_DELEGATION_STATUS_UPDATED';
  const now = text(payload.updatedAt) ?? text(payload.updated_at)
    ?? text(payload.activatedAt) ?? text(payload.createdAt) ?? text(payload.created_at)
    ?? new Date().toISOString();
  const taskId = text(payload.taskId) ?? text(payload.task_id) ?? text(task.taskId) ?? text(task.task_id);
  const taskLabel = text(payload.taskLabel) ?? text(payload.task_label) ?? text(task.taskLabel) ?? text(task.task_label);
  const description = text(payload.description) ?? text(payload.taskDescription) ?? text(payload.task_description)
    ?? text(task.description);
  const referenceFiles = payload.referenceFiles ?? payload.reference_files
    ?? payload.taskReferenceFiles ?? payload.task_reference_files
    ?? task.referenceFiles ?? task.reference_files;
  const taskArguments = payload.taskArguments ?? payload.task_arguments ?? task.taskArguments ?? task.task_arguments;
  const status = payload.status ?? task.status;
  return {
    taskId,
    taskLabel,
    taskDescription: description,
    taskReferenceFiles: normalizeTeamReferenceFiles(referenceFiles, now),
    taskArguments: Object.keys(record(taskArguments)).length ? record(taskArguments) : null,
    taskTargetKind: text(target.kind),
    taskTargetAddress: text(target.address),
    taskExecutionStatus: normalizeTaskExecutionStatusFromPayload(eventType, status, payload.decision),
    eventType,
    occurredAt: now,
    message: text(payload.message) ?? text(payload.comment) ?? text(payload.acceptanceComment),
  };
};
export const applyTaskDelegationProjectionDetails = (node: TeamMemberNode, details: TaskDelegationProjectionDetails | null): void => {
  if (!details) return;
  node.taskId = details.taskId; node.taskLabel = details.taskLabel; node.taskDescription = details.taskDescription;
  node.taskReferenceFiles = details.taskReferenceFiles.map((entry) => ({ ...entry }));
  node.taskArguments = details.taskArguments; node.taskTargetKind = details.taskTargetKind;
  node.taskTargetAddress = details.taskTargetAddress;
  node.taskExecutionStatus = details.taskExecutionStatus; node.isTaskExecution = true;
  const id = `${details.taskId ?? 'task'}:${details.eventType}:${details.occurredAt}:${details.taskExecutionStatus}`;
  if (!node.taskTimeline?.some((entry) => entry.id === id)) {
    node.taskTimeline = [...(node.taskTimeline ?? []), buildTaskExecutionTimelineEntry({
      id,
      eventType: details.eventType,
      status: details.taskExecutionStatus,
      label: details.taskLabel ?? details.eventType,
      createdAt: details.occurredAt,
      message: details.message,
    })];
  }
};
export const isActiveTaskExecutionProjectionNode = (node: TeamMemberNode | null | undefined): boolean => Boolean(node?.isTaskExecution);
export const isTaskTeamProjectionNode = (node: TeamMemberNode | null | undefined): boolean =>
  Boolean(node?.kind === 'agent_team' && node.isTaskExecution && node.taskId);
export const isTaskTeamChildProjectionNode = (node: TeamMemberNode | null | undefined): boolean =>
  Boolean(node?.isTaskExecution && node.executionAddress?.taskTeamRunIds.length && !node.taskId);
export const isTerminalTaskExecutionProjectionStatus = (status: TaskExecutionProjectionStatus | null | undefined): boolean =>
  status === 'accepted' || status === 'settled' || status === 'failed';
export const buildTaskExecutionTimelineEntry = (input: { id: string; eventType: string; status: TaskExecutionProjectionStatus; label: string; createdAt?: string; message?: string | null }): TaskExecutionTimelineEntry => ({ ...input, createdAt: input.createdAt ?? new Date().toISOString() });
