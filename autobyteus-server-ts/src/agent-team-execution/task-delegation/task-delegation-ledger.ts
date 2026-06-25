import {
  isTaskDelegationTerminalStatus,
  TaskDelegationError,
  type TaskDelegationDelegatorIdentity,
  type TaskDelegationMemberIdentity,
  type TaskDelegationRecord,
  type TaskResultReview,
  type TaskResultReviewDecision,
  type TaskResultSubmission,
  type TaskDelegationTaskInput,
} from "./task-delegation-record.js";
import {
  cloneTaskAgentIdentity,
} from "./task-agent-instance-identity.js";
import type { TaskAgentInstanceIdentity } from "../domain/task-agent-instance.js";

export type CreateTaskDelegationRecordInput = {
  taskId: string;
  task: TaskDelegationTaskInput;
  member: TaskDelegationMemberIdentity;
  delegator: TaskDelegationDelegatorIdentity;
};

export type TaskResultSubmissionTransition = {
  previousStatus: TaskDelegationRecord["status"];
  record: TaskDelegationRecord;
  submission: TaskResultSubmission;
};

export type TaskResultReviewTransition = {
  previousStatus: TaskDelegationRecord["status"];
  record: TaskDelegationRecord;
  review: TaskResultReview;
};

const cloneIdentity = (
  identity: TaskDelegationMemberIdentity,
): TaskDelegationMemberIdentity => ({
  memberName: identity.memberName,
  memberPath: [...identity.memberPath],
  memberRouteKey: identity.memberRouteKey,
  memberRunId: identity.memberRunId,
  runtimeKind: identity.runtimeKind ?? null,
});

const cloneDelegatorIdentity = (
  identity: TaskDelegationDelegatorIdentity,
): TaskDelegationDelegatorIdentity => ({
  ...cloneIdentity(identity),
  taskAgentInstanceId: identity.taskAgentInstanceId ?? null,
  taskAgentRunId: identity.taskAgentRunId ?? null,
  taskId: identity.taskId ?? null,
  logicalMemberRouteKey: identity.logicalMemberRouteKey ?? null,
});

const cloneRecord = (record: TaskDelegationRecord): TaskDelegationRecord => ({
  ...record,
  member: cloneIdentity(record.member),
  delegator: cloneDelegatorIdentity(record.delegator),
  referenceFiles: [...record.referenceFiles],
  taskAgentInstance: record.taskAgentInstance
    ? cloneTaskAgentIdentity(record.taskAgentInstance)
    : null,
  resultSubmissions: record.resultSubmissions.map((submission) => ({
    ...submission,
    referenceFiles: [...submission.referenceFiles],
  })),
  resultReviews: record.resultReviews.map((review) => ({
    ...review,
    referenceFiles: [...review.referenceFiles],
    reviewer: cloneDelegatorIdentity(review.reviewer),
  })),
});

const deriveTaskLabel = (description: string, fallbackTaskId: string): string => {
  const firstLine = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) {
    return fallbackTaskId;
  }
  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine;
};

export class TaskDelegationLedger {
  private readonly recordsById = new Map<string, TaskDelegationRecord>();
  private idCounter = 0;

  constructor(readonly teamRunId: string) {}

  reserveTaskId(): string {
    return this.nextTaskId();
  }

  createRecord(input: CreateTaskDelegationRecordInput): TaskDelegationRecord {
    const now = new Date().toISOString();
    const taskId = input.taskId.trim();
    if (!taskId) {
      throw new TaskDelegationError("TASK_ID_REQUIRED", "taskId is required.");
    }
    const record: TaskDelegationRecord = {
      taskId,
      taskLabel: deriveTaskLabel(input.task.description, taskId),
      description: input.task.description,
      status: "not_started",
      member: cloneIdentity(input.member),
      delegator: cloneDelegatorIdentity(input.delegator),
      referenceFiles: [...(input.task.reference_files ?? [])],
      taskAgentInstance: null,
      targetAgentRunId: null,
      delegatorReplyRecipientName: null,
      delegatorReplyTargetAgentRunId: null,
      pendingSubmissionId: null,
      resultSubmissions: [],
      resultReviews: [],
      acceptanceMessage: null,
      acceptedAt: null,
      createdAt: now,
      updatedAt: now,
      terminalAt: null,
    };
    this.recordsById.set(taskId, record);
    return cloneRecord(record);
  }

  getRecord(taskId: string): TaskDelegationRecord | null {
    const record = this.recordsById.get(taskId) ?? null;
    return record ? cloneRecord(record) : null;
  }

  listRecords(): TaskDelegationRecord[] {
    return [...this.recordsById.values()].map(cloneRecord);
  }

  listRecordsForTaskAgentRun(taskAgentRunId: string): TaskDelegationRecord[] {
    const normalizedRunId = taskAgentRunId.trim();
    if (!normalizedRunId) {
      return [];
    }
    return [...this.recordsById.values()]
      .filter((record) => record.taskAgentInstance?.taskAgentRunId === normalizedRunId)
      .map(cloneRecord);
  }

  bindTaskAgent(input: {
    taskId: string;
    taskAgentInstance: TaskAgentInstanceIdentity;
    delegatorReplyRecipientName?: string | null;
    delegatorReplyTargetAgentRunId?: string | null;
  }): TaskDelegationRecord {
    const record = this.recordsById.get(input.taskId);
    if (!record) {
      throw new TaskDelegationError(
        "TASK_NOT_FOUND",
        `Delegated task '${input.taskId}' was not found.`,
      );
    }
    if (record.status !== "not_started") {
      throw new TaskDelegationError(
        "TASK_ALREADY_ACTIVE",
        `Delegated task '${input.taskId}' is already ${record.status}.`,
      );
    }
    const now = new Date().toISOString();
    record.taskAgentInstance = cloneTaskAgentIdentity(input.taskAgentInstance);
    record.targetAgentRunId = input.taskAgentInstance.taskAgentRunId;
    record.delegatorReplyRecipientName = input.delegatorReplyRecipientName?.trim() || null;
    record.delegatorReplyTargetAgentRunId = input.delegatorReplyTargetAgentRunId?.trim() || null;
    record.updatedAt = now;
    return cloneRecord(record);
  }

  markActive(taskId: string): TaskDelegationRecord {
    const record = this.recordsById.get(taskId);
    if (!record) {
      throw new TaskDelegationError(
        "TASK_NOT_FOUND",
        `Delegated task '${taskId}' was not found.`,
      );
    }
    if (record.status !== "not_started") {
      throw new TaskDelegationError(
        "INVALID_STATUS_TRANSITION",
        `Delegated task '${taskId}' cannot transition from ${record.status} to active.`,
      );
    }
    if (!record.taskAgentInstance || !record.targetAgentRunId) {
      throw new TaskDelegationError(
        "TASK_AGENT_NOT_BOUND",
        `Delegated task '${taskId}' is not bound to a task-agent instance.`,
      );
    }
    const now = new Date().toISOString();
    record.status = "active";
    record.updatedAt = now;
    return cloneRecord(record);
  }

  markNotStarted(taskId: string): TaskDelegationRecord | null {
    const now = new Date().toISOString();
    const record = this.recordsById.get(taskId);
    if (!record || record.status !== "not_started") {
      return null;
    }
    record.taskAgentInstance = null;
    record.targetAgentRunId = null;
    record.delegatorReplyRecipientName = null;
    record.delegatorReplyTargetAgentRunId = null;
    record.updatedAt = now;
    return cloneRecord(record);
  }

  submitResult(input: {
    taskId: string;
    taskAgentRunId: string;
    message: string;
    referenceFiles: string[];
  }): TaskResultSubmissionTransition {
    const record = this.recordsById.get(input.taskId);
    if (!record) {
      throw new TaskDelegationError(
        "TASK_NOT_FOUND",
        `Delegated task '${input.taskId}' was not found.`,
      );
    }
    if (record.status !== "active") {
      throw new TaskDelegationError(
        "TASK_NOT_ACTIVE_FOR_RESULT",
        `Delegated task '${input.taskId}' is ${record.status}, not active for result submission.`,
      );
    }
    if (record.taskAgentInstance?.taskAgentRunId !== input.taskAgentRunId.trim()) {
      throw new TaskDelegationError(
        "TASK_AGENT_NOT_AUTHORIZED",
        `Task-agent run '${input.taskAgentRunId}' is not assigned to delegated task '${input.taskId}'.`,
      );
    }
    const previousStatus = record.status;
    const now = new Date().toISOString();
    const sequence = record.resultSubmissions.length + 1;
    const submission: TaskResultSubmission = {
      submissionId: `${record.taskId}_submission_${String(sequence).padStart(4, "0")}`,
      sequence,
      message: input.message,
      referenceFiles: [...input.referenceFiles],
      submittedAt: now,
      taskAgentRunId: input.taskAgentRunId.trim(),
    };
    record.resultSubmissions.push(submission);
    record.pendingSubmissionId = submission.submissionId;
    record.status = "awaiting_review";
    record.updatedAt = now;
    return {
      previousStatus,
      record: cloneRecord(record),
      submission: { ...submission, referenceFiles: [...submission.referenceFiles] },
    };
  }

  reviewResult(input: {
    taskId: string;
    decision: TaskResultReviewDecision;
    message: string | null;
    referenceFiles: string[];
    reviewer: TaskDelegationDelegatorIdentity;
  }): TaskResultReviewTransition {
    const record = this.recordsById.get(input.taskId);
    if (!record) {
      throw new TaskDelegationError(
        "TASK_NOT_FOUND",
        `Delegated task '${input.taskId}' was not found.`,
      );
    }
    if (record.status !== "awaiting_review") {
      throw new TaskDelegationError(
        "TASK_NOT_AWAITING_REVIEW",
        `Delegated task '${input.taskId}' is ${record.status}, not awaiting_review.`,
      );
    }
    const pendingSubmissionId = record.pendingSubmissionId;
    if (!pendingSubmissionId) {
      throw new TaskDelegationError(
        "PENDING_SUBMISSION_REQUIRED",
        `Delegated task '${input.taskId}' is awaiting review without a pending submission.`,
      );
    }
    if (!record.resultSubmissions.some((submission) => submission.submissionId === pendingSubmissionId)) {
      throw new TaskDelegationError(
        "PENDING_SUBMISSION_NOT_FOUND",
        `Pending submission '${pendingSubmissionId}' for delegated task '${input.taskId}' was not found.`,
      );
    }
    const previousStatus = record.status;
    const now = new Date().toISOString();
    const sequence = record.resultReviews.length + 1;
    const review: TaskResultReview = {
      reviewId: `${record.taskId}_review_${String(sequence).padStart(4, "0")}`,
      reviewedSubmissionId: pendingSubmissionId,
      decision: input.decision,
      message: input.message,
      referenceFiles: [...input.referenceFiles],
      reviewer: cloneDelegatorIdentity(input.reviewer),
      reviewedAt: now,
    };
    record.resultReviews.push(review);
    record.pendingSubmissionId = null;
    record.updatedAt = now;
    if (input.decision === "request_revision") {
      record.status = "active";
    } else {
      record.status = "accepted";
      record.acceptanceMessage = input.message;
      record.acceptedAt = now;
      record.terminalAt = now;
    }
    return {
      previousStatus,
      record: cloneRecord(record),
      review: {
        ...review,
        referenceFiles: [...review.referenceFiles],
        reviewer: cloneDelegatorIdentity(review.reviewer),
      },
    };
  }

  hasCurrentWorkForAssignee(memberRouteKey: string): boolean {
    const normalizedRouteKey = memberRouteKey.trim();
    if (!normalizedRouteKey) {
      return false;
    }
    return [...this.recordsById.values()].some(
      (record) =>
        record.member.memberRouteKey === normalizedRouteKey &&
        !isTaskDelegationTerminalStatus(record.status),
    );
  }

  hasCurrentWorkForTaskAgentInstance(taskAgentRunId: string): boolean {
    return this.hasOpenWorkBlockingTaskAgentSettlement(taskAgentRunId);
  }

  hasOpenWorkBlockingTaskAgentSettlement(taskAgentRunId: string): boolean {
    const normalizedRunId = taskAgentRunId.trim();
    if (!normalizedRunId) {
      return false;
    }
    return [...this.recordsById.values()].some(
      (record) =>
        !isTaskDelegationTerminalStatus(record.status) &&
        (
          record.taskAgentInstance?.taskAgentRunId === normalizedRunId ||
          record.delegator.taskAgentRunId === normalizedRunId
        ),
    );
  }

  private nextTaskId(): string {
    this.idCounter += 1;
    return `task_${String(this.idCounter).padStart(4, "0")}`;
  }
}
