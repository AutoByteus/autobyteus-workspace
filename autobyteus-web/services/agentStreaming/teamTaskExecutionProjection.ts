import type { TeamMemberNode } from '~/types/agent/AgentTeamContext';
import type { TeamReferenceFile } from '~/types/teamReferenceFile';
import { normalizeTeamReferenceFiles } from '~/utils/teamReferences/teamReferenceFileModel';
import type { ServerMessage } from './protocol';

export type TaskExecutionProjectionStatus = 'starting' | 'active' | 'awaiting_review' | 'revision_requested' | 'accepted' | 'settling' | 'settled' | 'failed';
export interface TaskExecutionTimelineEntry { id: string; eventType: string; status: TaskExecutionProjectionStatus; label: string; createdAt: string; message?: string | null }
export interface TaskDelegationProjectionDetails {
  taskId: string | null; taskLabel: string | null; taskDescription: string | null;
  taskReferenceFiles: TeamReferenceFile[]; taskArguments: Record<string, unknown> | null;
  taskTargetKind: string | null; taskTargetAddress: string | null; taskExecutionStatus: TaskExecutionProjectionStatus;
}
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;
export const normalizeTaskExecutionStatusFromPayload = (eventType: string | null | undefined, rawStatus: unknown, decision: unknown = null): TaskExecutionProjectionStatus => {
  const status = text(rawStatus)?.toLowerCase();
  if (status === 'awaiting_review') return 'awaiting_review';
  if (status === 'accepted' || decision === 'accept') return 'accepted';
  if (status === 'settled' || status === 'completed') return 'settled';
  if (status === 'failed' || status === 'error') return 'failed';
  if (status === 'revision_requested' || decision === 'request_revision') return 'revision_requested';
  return eventType === 'TASK_DELEGATION_TERMINAL_STATUS' ? 'settled' : 'active';
};
export const extractTaskDelegationProjectionDetails = (message: ServerMessage): TaskDelegationProjectionDetails | null => {
  if (message.type !== 'TASK_DELEGATION_EVENT') return null;
  const payload = record(message.payload);
  const target = record(payload.target);
  const now = text(payload.updated_at) ?? text(payload.created_at) ?? new Date().toISOString();
  return {
    taskId: text(payload.task_id),
    taskLabel: text(payload.task_label),
    taskDescription: text(payload.description),
    taskReferenceFiles: normalizeTeamReferenceFiles(payload.reference_files, now),
    taskArguments: Object.keys(record(payload.task_arguments)).length ? record(payload.task_arguments) : null,
    taskTargetKind: text(target.kind),
    taskTargetAddress: text(target.address),
    taskExecutionStatus: normalizeTaskExecutionStatusFromPayload(text(payload.event_type), payload.status, payload.decision),
  };
};
export const applyTaskDelegationProjectionDetails = (node: TeamMemberNode, details: TaskDelegationProjectionDetails | null): void => {
  if (!details) return;
  node.taskId = details.taskId; node.taskLabel = details.taskLabel; node.taskDescription = details.taskDescription;
  node.taskReferenceFiles = details.taskReferenceFiles.map((entry) => ({ ...entry }));
  node.taskArguments = details.taskArguments; node.taskTargetKind = details.taskTargetKind;
  node.taskExecutionStatus = details.taskExecutionStatus; node.isTaskExecution = true;
};
export const isActiveTaskExecutionProjectionNode = (node: TeamMemberNode | null | undefined): boolean => Boolean(node?.isTaskExecution);
export const isTaskTeamProjectionNode = (node: TeamMemberNode | null | undefined): boolean => Boolean(node?.kind === 'agent_team' && node.isTaskExecution);
export const isTaskTeamChildProjectionNode = (_node: TeamMemberNode | null | undefined): boolean => false;
export const isTerminalTaskExecutionProjectionStatus = (status: TaskExecutionProjectionStatus | null | undefined): boolean => status === 'settled' || status === 'failed';
export const buildTaskExecutionTimelineEntry = (input: { id: string; eventType: string; status: TaskExecutionProjectionStatus; label: string; createdAt?: string; message?: string | null }): TaskExecutionTimelineEntry => ({ ...input, createdAt: input.createdAt ?? new Date().toISOString() });
