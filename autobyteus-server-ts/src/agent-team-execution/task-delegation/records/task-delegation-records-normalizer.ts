import { normalizeConversationTargetAddress } from "../../domain/conversation-target-address.js";
import type {
  TaskDelegationRecord,
  TaskDelegationRecordsFile,
  TaskDelegationReferenceFileType,
  TaskReferenceFile,
  TaskReviewUpdate,
  TaskSubmissionUpdate,
  TaskUpdate,
} from "../task-delegation-record.js";
import { canonicalizeTaskDelegationRecord } from "./task-delegation-record-canonicalizer.js";

const TASK_REFERENCE_TYPES = new Set<TaskDelegationReferenceFileType>([
  "file",
  "image",
  "audio",
  "video",
  "pdf",
  "csv",
  "excel",
  "other",
]);

const asRecord = (value: unknown): Record<string, unknown> | null => (
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
);

const readString = (value: unknown): string | null => (
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null
);

const readReference = (value: unknown): TaskReferenceFile | null => {
  const record = asRecord(value);
  if (!record) return null;
  const referenceId = readString(record.referenceId);
  const path = readString(record.path);
  const createdAt = readString(record.createdAt);
  const updatedAt = readString(record.updatedAt) ?? createdAt;
  const type = readString(record.type) as TaskDelegationReferenceFileType | null;
  if (!referenceId || !path || !createdAt || !updatedAt || !type || !TASK_REFERENCE_TYPES.has(type)) return null;
  return { referenceId, path, type, createdAt, updatedAt };
};

const readReferences = (value: unknown): TaskReferenceFile[] => (
  Array.isArray(value) ? value.map(readReference).filter((entry): entry is TaskReferenceFile => Boolean(entry)) : []
);

const readSubmission = (record: Record<string, unknown>): TaskSubmissionUpdate | null => {
  const submissionId = readString(record.submissionId);
  const content = readString(record.content);
  const createdAt = readString(record.createdAt);
  const senderAddressRaw = asRecord(record.senderAddress);
  const receiverAddressRaw = asRecord(record.receiverAddress);
  if (!submissionId || !content || !createdAt || !senderAddressRaw || !receiverAddressRaw) return null;
  return {
    kind: "submission",
    submissionId,
    senderAddress: normalizeConversationTargetAddress(senderAddressRaw as never),
    receiverAddress: normalizeConversationTargetAddress(receiverAddressRaw as never),
    content,
    referenceFiles: readReferences(record.referenceFiles),
    createdAt,
  };
};

const readReview = (record: Record<string, unknown>): TaskReviewUpdate | null => {
  const reviewId = readString(record.reviewId);
  const reviewedSubmissionId = readString(record.reviewedSubmissionId);
  const createdAt = readString(record.createdAt);
  const decision = readString(record.decision);
  const senderAddressRaw = asRecord(record.senderAddress);
  const receiverAddressRaw = asRecord(record.receiverAddress);
  if (!reviewId || !reviewedSubmissionId || !createdAt || !senderAddressRaw || !receiverAddressRaw) return null;
  if (decision !== "accept" && decision !== "request_revision") return null;
  return {
    kind: "review",
    reviewId,
    senderAddress: normalizeConversationTargetAddress(senderAddressRaw as never),
    receiverAddress: normalizeConversationTargetAddress(receiverAddressRaw as never),
    reviewedSubmissionId,
    decision,
    content: typeof record.content === "string" && record.content.trim().length > 0 ? record.content.trim() : null,
    referenceFiles: readReferences(record.referenceFiles),
    createdAt,
  };
};

const readUpdate = (value: unknown): TaskUpdate | null => {
  const record = asRecord(value);
  if (!record) return null;
  return record.kind === "submission" ? readSubmission(record) : record.kind === "review" ? readReview(record) : null;
};

const readRecord = (value: unknown): TaskDelegationRecord | null => {
  const record = asRecord(value);
  if (!record) return null;
  const taskId = readString(record.taskId);
  const status = readString(record.status);
  const content = readString(record.content);
  const createdAt = readString(record.createdAt);
  const senderAddressRaw = asRecord(record.senderAddress);
  const receiverAddressRaw = asRecord(record.receiverAddress);
  const receiverTargetKind = readString(record.receiverTargetKind);
  if (!taskId || !content || !createdAt || !senderAddressRaw || !receiverAddressRaw) return null;
  if (status !== "active" && status !== "awaiting_review" && status !== "accepted") return null;
  if (receiverTargetKind !== "member" && receiverTargetKind !== "team") return null;
  const taskRunRaw = asRecord(record.taskRun);
  const taskRun = taskRunRaw && asRecord(taskRunRaw.address) && readString(taskRunRaw.startedAt)
    ? { address: normalizeConversationTargetAddress(taskRunRaw.address as never), startedAt: readString(taskRunRaw.startedAt)! }
    : null;
  try {
    return canonicalizeTaskDelegationRecord({
      taskId,
      status,
      senderAddress: normalizeConversationTargetAddress(senderAddressRaw as never),
      receiverAddress: normalizeConversationTargetAddress(receiverAddressRaw as never),
      receiverTargetKind,
      content,
      referenceFiles: readReferences(record.referenceFiles),
      taskRun,
      updates: Array.isArray(record.updates)
        ? record.updates.map(readUpdate).filter((entry): entry is TaskUpdate => Boolean(entry))
        : [],
      createdAt,
    });
  } catch {
    return null;
  }
};

export const normalizeTaskDelegationRecordsFile = (
  value: unknown,
  fallback: { teamRunId: string },
): TaskDelegationRecordsFile => {
  const parsed = asRecord(value);
  const teamRunId = readString(parsed?.teamRunId) ?? fallback.teamRunId;
  const records = Array.isArray(parsed?.records)
    ? parsed.records.map(readRecord).filter((entry): entry is TaskDelegationRecord => Boolean(entry))
    : [];
  return {
    teamRunId,
    records: records.sort((left, right) => {
      const byCreatedAt = left.createdAt.localeCompare(right.createdAt);
      return byCreatedAt !== 0 ? byCreatedAt : left.taskId.localeCompare(right.taskId);
    }),
  };
};
