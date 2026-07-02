import {
  cloneConversationTargetAddress,
  normalizeConversationTargetAddress,
  type ConversationTargetAddress,
} from "../domain/conversation-target-address.js";
import type {
  TaskDelegationRecord,
  TaskReferenceFile,
  TaskReviewUpdate,
  TaskRunReference,
  TaskSubmissionUpdate,
  TaskUpdate,
} from "./task-delegation-record.js";

export const cloneTaskConversationAddress = (
  address: ConversationTargetAddress,
): ConversationTargetAddress => cloneConversationTargetAddress(address);

export const normalizeTaskConversationAddress = (
  address: ConversationTargetAddress,
): ConversationTargetAddress => normalizeConversationTargetAddress(address);

export const cloneTaskReferenceFile = (
  reference: TaskReferenceFile,
): TaskReferenceFile => ({ ...reference });

export const cloneTaskReferenceFiles = (
  references: readonly TaskReferenceFile[],
): TaskReferenceFile[] => references.map(cloneTaskReferenceFile);

export const cloneTaskRunReference = (
  taskRun: TaskRunReference | null,
): TaskRunReference | null => taskRun
  ? {
      address: cloneTaskConversationAddress(taskRun.address),
      startedAt: taskRun.startedAt,
    }
  : null;

export const cloneTaskSubmissionUpdate = (
  update: TaskSubmissionUpdate,
): TaskSubmissionUpdate => ({
  kind: "submission",
  submissionId: update.submissionId,
  senderAddress: cloneTaskConversationAddress(update.senderAddress),
  receiverAddress: cloneTaskConversationAddress(update.receiverAddress),
  content: update.content,
  referenceFiles: cloneTaskReferenceFiles(update.referenceFiles),
  createdAt: update.createdAt,
});

export const cloneTaskReviewUpdate = (
  update: TaskReviewUpdate,
): TaskReviewUpdate => ({
  kind: "review",
  reviewId: update.reviewId,
  senderAddress: cloneTaskConversationAddress(update.senderAddress),
  receiverAddress: cloneTaskConversationAddress(update.receiverAddress),
  reviewedSubmissionId: update.reviewedSubmissionId,
  decision: update.decision,
  content: update.content,
  referenceFiles: cloneTaskReferenceFiles(update.referenceFiles),
  createdAt: update.createdAt,
});

export const cloneTaskUpdate = (update: TaskUpdate): TaskUpdate => (
  update.kind === "submission"
    ? cloneTaskSubmissionUpdate(update)
    : cloneTaskReviewUpdate(update)
);

export const cloneTaskDelegationRecord = (
  record: TaskDelegationRecord,
): TaskDelegationRecord => ({
  taskId: record.taskId,
  status: record.status,
  senderAddress: cloneTaskConversationAddress(record.senderAddress),
  receiverAddress: cloneTaskConversationAddress(record.receiverAddress),
  receiverTargetKind: record.receiverTargetKind,
  content: record.content,
  referenceFiles: cloneTaskReferenceFiles(record.referenceFiles),
  taskRun: cloneTaskRunReference(record.taskRun),
  updates: record.updates.map(cloneTaskUpdate),
  createdAt: record.createdAt,
});
