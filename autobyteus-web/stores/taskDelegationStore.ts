import { defineStore } from 'pinia';
import { parseTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import type { TeamReferenceFile } from '~/types/teamReferenceFile';
import type {
  TaskDelegationRecord,
  TaskDelegationReviewUpdate,
  TaskDelegationStatus,
  TaskDelegationSubmissionUpdate,
  TaskDelegationUpdate,
} from './taskDelegationTypes';

interface TaskDelegationState { recordsByTeam: Map<string, TaskDelegationRecord[]> }
const object = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const text = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;
const referenceTypes = new Set(['file', 'image', 'audio', 'video', 'pdf', 'csv', 'excel', 'other']);

const references = (value: unknown): TeamReferenceFile[] | null => {
  if (!Array.isArray(value)) return null;
  const parsed = value.map((entry) => {
    const item = object(entry);
    const referenceId = text(item?.referenceId);
    const path = text(item?.path);
    const type = text(item?.type);
    const createdAt = text(item?.createdAt);
    const updatedAt = text(item?.updatedAt);
    return referenceId && path && type && referenceTypes.has(type) && createdAt && updatedAt
      ? { referenceId, path, type, createdAt, updatedAt } as TeamReferenceFile
      : null;
  });
  return parsed.some((entry) => !entry) ? null : parsed as TeamReferenceFile[];
};

const update = (value: unknown): TaskDelegationUpdate | null => {
  const item = object(value);
  if (!item) return null;
  const sender = (() => { try { return parseTeamExecutionAddress(item.senderAddress); } catch { return null; } })();
  const receiver = (() => { try { return parseTeamExecutionAddress(item.receiverAddress); } catch { return null; } })();
  const referenceFiles = references(item.referenceFiles);
  const createdAt = text(item.createdAt);
  if (!sender || !receiver || !referenceFiles || !createdAt) return null;
  if (item.kind === 'submission') {
    const submissionId = text(item.submissionId);
    const content = text(item.content);
    return submissionId && content ? {
      kind: 'submission', submissionId, senderAddress: sender, receiverAddress: receiver,
      content, referenceFiles, createdAt,
    } satisfies TaskDelegationSubmissionUpdate : null;
  }
  if (item.kind === 'review') {
    const reviewId = text(item.reviewId);
    const reviewedSubmissionId = text(item.reviewedSubmissionId);
    const decision = item.decision;
    return reviewId && reviewedSubmissionId && (decision === 'accept' || decision === 'request_revision') ? {
      kind: 'review', reviewId, senderAddress: sender, receiverAddress: receiver,
      reviewedSubmissionId, decision, content: text(item.content), referenceFiles, createdAt,
    } satisfies TaskDelegationReviewUpdate : null;
  }
  return null;
};

export const normalizeTaskDelegationRecord = (value: unknown): TaskDelegationRecord | null => {
  const item = object(value);
  if (!item || !Array.isArray(item.updates)) return null;
  const taskId = text(item.taskId);
  const status = text(item.status) as TaskDelegationStatus | null;
  const receiverTargetKind = item.receiverTargetKind;
  const content = text(item.content);
  const referenceFiles = references(item.referenceFiles);
  const createdAt = text(item.createdAt);
  const updates = item.updates.map(update);
  let senderAddress;
  let receiverAddress;
  try {
    senderAddress = parseTeamExecutionAddress(item.senderAddress);
    receiverAddress = parseTeamExecutionAddress(item.receiverAddress);
  } catch { return null; }
  if (!taskId || !status || !['active', 'awaiting_review', 'accepted'].includes(status) ||
    (receiverTargetKind !== 'agent' && receiverTargetKind !== 'agent_team') || !content || !referenceFiles ||
    !createdAt || updates.some((entry) => !entry)) return null;
  let taskRun = null;
  if (item.taskRun !== null) {
    const rawTaskRun = object(item.taskRun);
    const startedAt = text(rawTaskRun?.startedAt);
    if (!rawTaskRun || !startedAt) return null;
    try { taskRun = { address: parseTeamExecutionAddress(rawTaskRun.address), startedAt }; } catch { return null; }
  }
  return {
    taskId, status, senderAddress, receiverAddress, receiverTargetKind, content,
    referenceFiles, taskRun, updates: updates as TaskDelegationUpdate[], createdAt,
  };
};

export const useTaskDelegationStore = defineStore('taskDelegation', {
  state: (): TaskDelegationState => ({ recordsByTeam: new Map() }),
  getters: {
    getRecordsForTeam: (state) => (teamRunId: string): TaskDelegationRecord[] =>
      [...(state.recordsByTeam.get(teamRunId) ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.taskId.localeCompare(b.taskId)),
  },
  actions: {
    replaceRecords(teamRunId: string, records: unknown[]) {
      this.recordsByTeam.set(teamRunId, records.map(normalizeTaskDelegationRecord).filter((record): record is TaskDelegationRecord => Boolean(record)));
    },
  },
});
