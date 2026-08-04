import { createTeamExecutionAddress } from "../../domain/team-execution-address.js";
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

const REFERENCE_TYPES = new Set<TaskDelegationReferenceFileType>([
  "file", "image", "audio", "video", "pdf", "csv", "excel", "other",
]);

const object = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
};

const exactKeys = (value: Record<string, unknown>, expected: readonly string[], label: string): void => {
  const actual = Object.keys(value).sort();
  const target = [...expected].sort();
  if (actual.length !== target.length || actual.some((key, index) => key !== target[index])) {
    throw new Error(`${label} has unsupported or missing field(s).`);
  }
};

const text = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
};

const references = (value: unknown, label: string): TaskReferenceFile[] => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value.map((entry, index) => {
    const record = object(entry, `${label}[${index}]`);
    exactKeys(record, ["referenceId", "path", "type", "createdAt", "updatedAt"], `${label}[${index}]`);
    const type = text(record.type, `${label}[${index}].type`) as TaskDelegationReferenceFileType;
    if (!REFERENCE_TYPES.has(type)) throw new Error(`${label}[${index}].type is unsupported.`);
    return {
      referenceId: text(record.referenceId, `${label}[${index}].referenceId`),
      path: text(record.path, `${label}[${index}].path`),
      type,
      createdAt: text(record.createdAt, `${label}[${index}].createdAt`),
      updatedAt: text(record.updatedAt, `${label}[${index}].updatedAt`),
    };
  });
};

const submission = (record: Record<string, unknown>, label: string): TaskSubmissionUpdate => {
  exactKeys(record, ["kind", "submissionId", "senderAddress", "receiverAddress", "content", "referenceFiles", "createdAt"], label);
  return {
    kind: "submission",
    submissionId: text(record.submissionId, `${label}.submissionId`),
    senderAddress: createTeamExecutionAddress(object(record.senderAddress, `${label}.senderAddress`) as never),
    receiverAddress: createTeamExecutionAddress(object(record.receiverAddress, `${label}.receiverAddress`) as never),
    content: text(record.content, `${label}.content`),
    referenceFiles: references(record.referenceFiles, `${label}.referenceFiles`),
    createdAt: text(record.createdAt, `${label}.createdAt`),
  };
};

const review = (record: Record<string, unknown>, label: string): TaskReviewUpdate => {
  exactKeys(record, ["kind", "reviewId", "senderAddress", "receiverAddress", "reviewedSubmissionId", "decision", "content", "referenceFiles", "createdAt"], label);
  const decision = text(record.decision, `${label}.decision`);
  if (decision !== "accept" && decision !== "request_revision") throw new Error(`${label}.decision is unsupported.`);
  if (record.content !== null && typeof record.content !== "string") throw new Error(`${label}.content must be a string or null.`);
  return {
    kind: "review",
    reviewId: text(record.reviewId, `${label}.reviewId`),
    senderAddress: createTeamExecutionAddress(object(record.senderAddress, `${label}.senderAddress`) as never),
    receiverAddress: createTeamExecutionAddress(object(record.receiverAddress, `${label}.receiverAddress`) as never),
    reviewedSubmissionId: text(record.reviewedSubmissionId, `${label}.reviewedSubmissionId`),
    decision,
    content: typeof record.content === "string" && record.content.trim() ? record.content.trim() : null,
    referenceFiles: references(record.referenceFiles, `${label}.referenceFiles`),
    createdAt: text(record.createdAt, `${label}.createdAt`),
  };
};

const update = (value: unknown, label: string): TaskUpdate => {
  const record = object(value, label);
  return record.kind === "submission"
    ? submission(record, label)
    : record.kind === "review"
      ? review(record, label)
      : (() => { throw new Error(`${label}.kind is unsupported.`); })();
};

const taskRecord = (value: unknown, label: string): TaskDelegationRecord => {
  const record = object(value, label);
  exactKeys(record, ["taskId", "status", "senderAddress", "receiverAddress", "receiverTargetKind", "content", "referenceFiles", "taskRun", "updates", "createdAt"], label);
  const status = text(record.status, `${label}.status`);
  if (status !== "active" && status !== "awaiting_review" && status !== "accepted") throw new Error(`${label}.status is unsupported.`);
  const receiverTargetKind = text(record.receiverTargetKind, `${label}.receiverTargetKind`);
  if (receiverTargetKind !== "agent" && receiverTargetKind !== "agent_team") throw new Error(`${label}.receiverTargetKind is unsupported.`);
  if (!Array.isArray(record.updates)) throw new Error(`${label}.updates must be an array.`);
  const taskRunRecord = record.taskRun === null ? null : object(record.taskRun, `${label}.taskRun`);
  if (taskRunRecord) exactKeys(taskRunRecord, ["address", "startedAt"], `${label}.taskRun`);
  return canonicalizeTaskDelegationRecord({
    taskId: text(record.taskId, `${label}.taskId`),
    status,
    senderAddress: createTeamExecutionAddress(object(record.senderAddress, `${label}.senderAddress`) as never),
    receiverAddress: createTeamExecutionAddress(object(record.receiverAddress, `${label}.receiverAddress`) as never),
    receiverTargetKind,
    content: text(record.content, `${label}.content`),
    referenceFiles: references(record.referenceFiles, `${label}.referenceFiles`),
    taskRun: taskRunRecord ? {
      address: createTeamExecutionAddress(object(taskRunRecord.address, `${label}.taskRun.address`) as never),
      startedAt: text(taskRunRecord.startedAt, `${label}.taskRun.startedAt`),
    } : null,
    updates: record.updates.map((entry, index) => update(entry, `${label}.updates[${index}]`)),
    createdAt: text(record.createdAt, `${label}.createdAt`),
  });
};

/** Strict current-schema reader. Legacy shapes are owned only by startup migration. */
export const normalizeTaskDelegationRecordsFile = (
  value: unknown,
  fallback: { teamRunId: string },
): TaskDelegationRecordsFile => {
  const file = object(value, "Task delegation records file");
  exactKeys(file, ["teamRunId", "records"], "Task delegation records file");
  const teamRunId = text(file.teamRunId, "teamRunId");
  if (teamRunId !== fallback.teamRunId.trim()) throw new Error(`Task records teamRunId '${teamRunId}' does not match '${fallback.teamRunId}'.`);
  if (!Array.isArray(file.records)) throw new Error("Task delegation records must be an array.");
  const records = file.records.map((entry, index) => taskRecord(entry, `records[${index}]`));
  return { teamRunId, records: records.sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.taskId.localeCompare(right.taskId)) };
};
