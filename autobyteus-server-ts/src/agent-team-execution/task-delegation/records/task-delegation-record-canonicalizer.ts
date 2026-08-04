import { createTeamExecutionAddress } from "../../domain/team-execution-address.js";
import type {
  TaskDelegationRecord,
  TaskReferenceFile,
  TaskReviewUpdate,
  TaskSubmissionUpdate,
  TaskUpdate,
} from "../task-delegation-record.js";
import {
  cloneTaskDelegationRecord,
  cloneTaskReferenceFiles,
} from "../task-delegation-record-snapshot.js";

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${fieldName} is required.`);
  return normalized;
};

const canonicalReferenceFile = (reference: TaskReferenceFile): TaskReferenceFile => ({
  referenceId: normalizeRequiredString(reference.referenceId, "referenceId"),
  path: normalizeRequiredString(reference.path, "reference.path"),
  type: reference.type,
  createdAt: normalizeRequiredString(reference.createdAt, "reference.createdAt"),
  updatedAt: normalizeRequiredString(reference.updatedAt, "reference.updatedAt"),
});

const canonicalReferenceFiles = (references: readonly TaskReferenceFile[]): TaskReferenceFile[] => {
  const byId = new Map<string, TaskReferenceFile>();
  references.map(canonicalReferenceFile).forEach((reference) => {
    if (!byId.has(reference.referenceId)) byId.set(reference.referenceId, reference);
  });
  return [...byId.values()];
};

const canonicalSubmission = (update: TaskSubmissionUpdate): TaskSubmissionUpdate => ({
  kind: "submission",
  submissionId: normalizeRequiredString(update.submissionId, "submissionId"),
  senderAddress: createTeamExecutionAddress(update.senderAddress),
  receiverAddress: createTeamExecutionAddress(update.receiverAddress),
  content: normalizeRequiredString(update.content, "submission.content"),
  referenceFiles: canonicalReferenceFiles(update.referenceFiles),
  createdAt: normalizeRequiredString(update.createdAt, "submission.createdAt"),
});

const canonicalReview = (update: TaskReviewUpdate): TaskReviewUpdate => ({
  kind: "review",
  reviewId: normalizeRequiredString(update.reviewId, "reviewId"),
  senderAddress: createTeamExecutionAddress(update.senderAddress),
  receiverAddress: createTeamExecutionAddress(update.receiverAddress),
  reviewedSubmissionId: normalizeRequiredString(update.reviewedSubmissionId, "reviewedSubmissionId"),
  decision: update.decision,
  content: update.content?.trim() || null,
  referenceFiles: canonicalReferenceFiles(update.referenceFiles),
  createdAt: normalizeRequiredString(update.createdAt, "review.createdAt"),
});

const canonicalUpdate = (update: TaskUpdate): TaskUpdate => (
  update.kind === "submission" ? canonicalSubmission(update) : canonicalReview(update)
);

export const canonicalizeTaskDelegationRecord = (
  record: TaskDelegationRecord,
): TaskDelegationRecord => cloneTaskDelegationRecord({
  taskId: normalizeRequiredString(record.taskId, "taskId"),
  status: record.status,
  senderAddress: createTeamExecutionAddress(record.senderAddress),
  receiverAddress: createTeamExecutionAddress(record.receiverAddress),
  receiverTargetKind: record.receiverTargetKind,
  content: normalizeRequiredString(record.content, "content"),
  referenceFiles: canonicalReferenceFiles(record.referenceFiles),
  taskRun: record.taskRun
    ? {
        address: createTeamExecutionAddress(record.taskRun.address),
        startedAt: normalizeRequiredString(record.taskRun.startedAt, "taskRun.startedAt"),
      }
    : null,
  updates: record.updates.map(canonicalUpdate),
  createdAt: normalizeRequiredString(record.createdAt, "createdAt"),
});

export const cloneCanonicalTaskReferenceFiles = cloneTaskReferenceFiles;
