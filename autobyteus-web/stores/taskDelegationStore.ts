import { defineStore } from 'pinia';
import type {
  ConversationTargetAddress,
  ConversationTargetSegment,
} from '~/types/agent/ConversationTargetAddress';
import { normalizeTeamReferenceFiles } from '~/utils/teamReferences/teamReferenceFileModel';
import {
  cloneConversationTargetSegments,
  normalizeConversationRouteKey,
  routeKeyFromConversationPath,
} from '~/utils/teamConversationTargetSegments';
import type {
  TaskDelegationRecord,
  TaskDelegationReviewUpdate,
  TaskDelegationStatus,
  TaskDelegationSubmissionUpdate,
  TaskDelegationUpdate,
} from './taskDelegationTypes';

interface TaskDelegationState {
  recordsByTeam: Map<string, TaskDelegationRecord[]>;
}

const asRecord = (value: unknown): Record<string, unknown> | null => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
);

const readString = (value: unknown): string | null => (
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
);

const readStringPath = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null;
  const path = value.map((entry) => readString(entry)).filter((entry): entry is string => Boolean(entry));
  return path.length > 0 ? path : null;
};

const timestampOrNow = (value: unknown): string => readString(value) ?? new Date().toISOString();

const normalizeMemberSegment = (record: Record<string, unknown>): ConversationTargetSegment | null => {
  const memberRouteKey = normalizeConversationRouteKey(readString(record.memberRouteKey) ?? readString(record.member_route_key));
  const memberPath = readStringPath(record.memberPath ?? record.member_path);
  const pathRouteKey = routeKeyFromConversationPath(memberPath);
  if (memberRouteKey && pathRouteKey && memberRouteKey !== pathRouteKey) return null;
  if (memberRouteKey) return { kind: 'member', memberRouteKey };
  if (memberPath) return { kind: 'member', memberPath };
  return null;
};

const normalizeSegment = (value: unknown): ConversationTargetSegment | null => {
  const record = asRecord(value);
  if (!record) return null;
  const kind = readString(record.kind);
  if (kind === 'member') return normalizeMemberSegment(record);
  if (kind === 'task_team') {
    const taskTeamRunId = normalizeConversationRouteKey(readString(record.taskTeamRunId) ?? readString(record.task_team_run_id));
    return taskTeamRunId ? { kind: 'task_team', taskTeamRunId } : null;
  }
  if (kind === 'task_agent') {
    const taskAgentRunId = normalizeConversationRouteKey(readString(record.taskAgentRunId) ?? readString(record.task_agent_run_id));
    return taskAgentRunId ? { kind: 'task_agent', taskAgentRunId } : null;
  }
  return null;
};

const normalizeAddress = (value: unknown): ConversationTargetAddress | null => {
  const record = asRecord(value);
  const rawSegments = record?.segments;
  if (!Array.isArray(rawSegments)) return null;
  const segments = rawSegments.map(normalizeSegment);
  if (segments.length === 0 || segments.some((segment) => !segment)) return null;
  const parentTeamRunId = readString(record?.parentTeamRunId ?? record?.parent_team_run_id);
  return {
    ...(parentTeamRunId ? { parentTeamRunId } : {}),
    segments: cloneConversationTargetSegments(segments as ConversationTargetSegment[]),
  };
};

const normalizeStatus = (value: unknown): TaskDelegationStatus | null => {
  const status = readString(value);
  return status === 'active' || status === 'awaiting_review' || status === 'accepted' ? status : null;
};

const normalizeTaskRun = (value: unknown) => {
  const record = asRecord(value);
  const address = normalizeAddress(record?.address);
  const startedAt = timestampOrNow(record?.startedAt ?? record?.started_at);
  return record && address ? { address, startedAt } : null;
};

const normalizeSubmissionUpdate = (record: Record<string, unknown>): TaskDelegationSubmissionUpdate | null => {
  const submissionId = readString(record.submissionId ?? record.submission_id);
  const senderAddress = normalizeAddress(record.senderAddress ?? record.sender_address);
  const receiverAddress = normalizeAddress(record.receiverAddress ?? record.receiver_address);
  const content = readString(record.content);
  const createdAt = timestampOrNow(record.createdAt ?? record.created_at);
  if (!submissionId || !senderAddress || !receiverAddress || !content) return null;
  return {
    kind: 'submission',
    submissionId,
    senderAddress,
    receiverAddress,
    content,
    referenceFiles: normalizeTeamReferenceFiles(record.referenceFiles ?? record.reference_files, createdAt),
    createdAt,
  };
};

const normalizeReviewUpdate = (record: Record<string, unknown>): TaskDelegationReviewUpdate | null => {
  const reviewId = readString(record.reviewId ?? record.review_id);
  const senderAddress = normalizeAddress(record.senderAddress ?? record.sender_address);
  const receiverAddress = normalizeAddress(record.receiverAddress ?? record.receiver_address);
  const reviewedSubmissionId = readString(record.reviewedSubmissionId ?? record.reviewed_submission_id);
  const decision = readString(record.decision);
  const createdAt = timestampOrNow(record.createdAt ?? record.created_at);
  if (!reviewId || !senderAddress || !receiverAddress || !reviewedSubmissionId) return null;
  if (decision !== 'accept' && decision !== 'request_revision') return null;
  return {
    kind: 'review',
    reviewId,
    senderAddress,
    receiverAddress,
    reviewedSubmissionId,
    decision,
    content: readString(record.content),
    referenceFiles: normalizeTeamReferenceFiles(record.referenceFiles ?? record.reference_files, createdAt),
    createdAt,
  };
};

const normalizeUpdate = (value: unknown): TaskDelegationUpdate | null => {
  const record = asRecord(value);
  if (!record) return null;
  const kind = readString(record.kind);
  return kind === 'submission' ? normalizeSubmissionUpdate(record) : kind === 'review' ? normalizeReviewUpdate(record) : null;
};

export const normalizeTaskDelegationRecord = (value: unknown): TaskDelegationRecord | null => {
  const record = asRecord(value);
  if (!record) return null;
  const taskId = readString(record.taskId ?? record.task_id);
  const status = normalizeStatus(record.status);
  const senderAddress = normalizeAddress(record.senderAddress ?? record.sender_address);
  const receiverAddress = normalizeAddress(record.receiverAddress ?? record.receiver_address);
  const receiverTargetKind = readString(record.receiverTargetKind ?? record.receiver_target_kind);
  const content = readString(record.content);
  const createdAt = timestampOrNow(record.createdAt ?? record.created_at);
  if (!taskId || !status || !senderAddress || !receiverAddress || !content) return null;
  if (receiverTargetKind !== 'member' && receiverTargetKind !== 'team') return null;
  const updates = Array.isArray(record.updates)
    ? record.updates.map(normalizeUpdate).filter((entry): entry is TaskDelegationUpdate => Boolean(entry))
    : [];
  return {
    taskId,
    status,
    senderAddress,
    receiverAddress,
    receiverTargetKind,
    content,
    referenceFiles: normalizeTeamReferenceFiles(record.referenceFiles ?? record.reference_files, createdAt),
    taskRun: normalizeTaskRun(record.taskRun ?? record.task_run),
    updates,
    createdAt,
  };
};

const compareRecordsDesc = (
  left: { createdAt: string; taskId: string },
  right: { createdAt: string; taskId: string },
): number => {
  const byCreatedAt = right.createdAt.localeCompare(left.createdAt);
  return byCreatedAt !== 0 ? byCreatedAt : left.taskId.localeCompare(right.taskId);
};

export const useTaskDelegationStore = defineStore('taskDelegation', {
  state: (): TaskDelegationState => ({
    recordsByTeam: new Map(),
  }),

  getters: {
    getRecordsForTeam: (state) => (teamRunId: string): TaskDelegationRecord[] =>
      [...(state.recordsByTeam.get(teamRunId) || [])].sort(compareRecordsDesc),
  },

  actions: {
    replaceRecords(teamRunId: string, records: unknown[]) {
      this.recordsByTeam.set(
        teamRunId,
        records
          .map(normalizeTaskDelegationRecord)
          .filter((record): record is TaskDelegationRecord => Boolean(record)),
      );
    },
  },
});
