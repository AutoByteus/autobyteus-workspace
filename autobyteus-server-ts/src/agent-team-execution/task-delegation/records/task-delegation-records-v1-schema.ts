import path from "node:path";
import { assertAgentTeamAddress } from "../../../agent-collaboration/domain/agent-team-address.js";
import type {
  TaskDelegationRecordV1,
  TaskDelegationRecordsFileV1,
  TaskDelegationStatus,
  TaskUpdate,
} from "../task-delegation-record-v1.js";

const record = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
};

const exactKeys = (
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void => {
  const actual = Object.keys(value).sort();
  const target = [...expected].sort();
  if (actual.length !== target.length || actual.some((key, index) => key !== target[index])) {
    throw new Error(`${label} has unsupported or missing field(s).`);
  }
};

const required = (value: unknown, label: string): string => {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) {
    throw new Error(`${label} must be a non-empty trimmed string.`);
  }
  return value;
};

const timestamp = (value: unknown, label: string): string => {
  const normalized = required(value, label);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(normalized) ||
      Number.isNaN(Date.parse(normalized))) {
    throw new Error(`${label} must be an ISO-8601 UTC timestamp.`);
  }
  return normalized;
};

const referenceFiles = (value: unknown, label: string): readonly string[] => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value.map((entry, index) => {
    const filePath = required(entry, `${label}[${index}]`);
    if (!path.isAbsolute(filePath) || path.normalize(filePath) !== filePath) {
      throw new Error(`${label}[${index}] must be a normalized absolute local path.`);
    }
    return filePath;
  });
};

const validateUpdate = (value: unknown, label: string): TaskUpdate => {
  const update = record(value, label);
  if ("submissionId" in update) {
    exactKeys(update, ["submissionId", "message", "referenceFiles", "createdAt"], label);
    required(update.submissionId, `${label}.submissionId`);
    required(update.message, `${label}.message`);
    referenceFiles(update.referenceFiles, `${label}.referenceFiles`);
    timestamp(update.createdAt, `${label}.createdAt`);
  } else if ("reviewId" in update) {
    exactKeys(update, [
      "reviewId", "reviewedSubmissionId", "decision", "comment", "referenceFiles", "createdAt",
    ], label);
    required(update.reviewId, `${label}.reviewId`);
    required(update.reviewedSubmissionId, `${label}.reviewedSubmissionId`);
    if (update.decision !== "accept" && update.decision !== "request_revision") {
      throw new Error(`${label}.decision is unsupported.`);
    }
    if (update.comment !== null) required(update.comment, `${label}.comment`);
    if (update.decision === "request_revision" && update.comment === null) {
      throw new Error(`${label}.comment is required for request_revision.`);
    }
    referenceFiles(update.referenceFiles, `${label}.referenceFiles`);
    timestamp(update.createdAt, `${label}.createdAt`);
  } else {
    exactKeys(update, ["interruptionId", "reason", "createdAt"], label);
    required(update.interruptionId, `${label}.interruptionId`);
    required(update.reason, `${label}.reason`);
    timestamp(update.createdAt, `${label}.createdAt`);
  }
  return structuredClone(update) as TaskUpdate;
};

const replayStatus = (updates: readonly TaskUpdate[]): TaskDelegationStatus => {
  let status: TaskDelegationStatus = "active";
  const submissions = new Set<string>();
  const updateIds = new Set<string>();
  for (const update of updates) {
    if ("submissionId" in update) {
      if (status !== "active") throw new Error("Task submission is invalid from the current status.");
      if (updateIds.has(update.submissionId)) throw new Error(`Duplicate task update '${update.submissionId}'.`);
      updateIds.add(update.submissionId);
      submissions.add(update.submissionId);
      status = "awaiting_review";
      continue;
    }
    if ("reviewId" in update) {
      if (status !== "awaiting_review") throw new Error("Task review is invalid from the current status.");
      if (updateIds.has(update.reviewId)) throw new Error(`Duplicate task update '${update.reviewId}'.`);
      if (!submissions.has(update.reviewedSubmissionId)) {
        throw new Error(`Task review references unknown submission '${update.reviewedSubmissionId}'.`);
      }
      updateIds.add(update.reviewId);
      status = update.decision === "accept" ? "accepted" : "active";
      continue;
    }
    if (status !== "active" && status !== "awaiting_review") {
      throw new Error("Task interruption is invalid from the current status.");
    }
    if (updateIds.has(update.interruptionId)) throw new Error(`Duplicate task update '${update.interruptionId}'.`);
    updateIds.add(update.interruptionId);
    status = "interrupted";
  }
  return status;
};

const validateTaskRecord = (value: unknown, label: string): TaskDelegationRecordV1 => {
  const task = record(value, label);
  exactKeys(task, [
    "taskId", "delegatorAgentRunId", "recipientAddress", "taskExecution", "description",
    "referenceFiles", "status", "updates", "createdAt",
  ], label);
  required(task.taskId, `${label}.taskId`);
  required(task.delegatorAgentRunId, `${label}.delegatorAgentRunId`);
  const recipientAddress = assertAgentTeamAddress(required(task.recipientAddress, `${label}.recipientAddress`));
  if (recipientAddress === "/") throw new Error(`${label}.recipientAddress must be non-root.`);
  const execution = record(task.taskExecution, `${label}.taskExecution`);
  if ("agentRunId" in execution) {
    exactKeys(execution, ["agentRunId"], `${label}.taskExecution`);
    required(execution.agentRunId, `${label}.taskExecution.agentRunId`);
  } else {
    exactKeys(execution, ["teamRunId"], `${label}.taskExecution`);
    required(execution.teamRunId, `${label}.taskExecution.teamRunId`);
  }
  required(task.description, `${label}.description`);
  referenceFiles(task.referenceFiles, `${label}.referenceFiles`);
  if (!["active", "awaiting_review", "accepted", "interrupted"].includes(String(task.status))) {
    throw new Error(`${label}.status is unsupported.`);
  }
  if (!Array.isArray(task.updates)) throw new Error(`${label}.updates must be an array.`);
  const updates = task.updates.map((update, index) => validateUpdate(update, `${label}.updates[${index}]`));
  if (replayStatus(updates) !== task.status) {
    throw new Error(`${label}.status does not match its update history.`);
  }
  timestamp(task.createdAt, `${label}.createdAt`);
  return structuredClone({ ...task, recipientAddress, updates }) as unknown as TaskDelegationRecordV1;
};

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
};

export const validateTaskDelegationRecordsV1Payload = (
  value: unknown,
  expectedRootTeamRunId?: string,
): TaskDelegationRecordsFileV1 => {
  const payload = record(value, "Task delegation records");
  exactKeys(payload, ["schemaVersion", "rootTeamRunId", "records"], "Task delegation records");
  if (payload.schemaVersion !== 1) throw new Error("Task delegation records schemaVersion must be 1.");
  const rootTeamRunId = required(payload.rootTeamRunId, "rootTeamRunId");
  if (expectedRootTeamRunId && rootTeamRunId !== expectedRootTeamRunId) {
    throw new Error(`Task records root '${rootTeamRunId}' does not match '${expectedRootTeamRunId}'.`);
  }
  if (!Array.isArray(payload.records)) throw new Error("records must be an array.");
  const seenTaskIds = new Set<string>();
  const records = payload.records.map((entry, index) => {
    const task = validateTaskRecord(entry, `records[${index}]`);
    if (seenTaskIds.has(task.taskId)) throw new Error(`Duplicate task ID '${task.taskId}'.`);
    seenTaskIds.add(task.taskId);
    return task;
  });
  return deepFreeze({ schemaVersion: 1, rootTeamRunId, records });
};
