import type { TaskAgentInstanceIdentity } from "../domain/task-agent-instance.js";
import type { TaskTeamInstanceIdentity } from "../domain/task-team-instance.js";
import { cloneTaskAgentIdentity } from "./task-agent-instance-identity.js";
import { cloneTaskExecutionInstance } from "./task-execution-instance.js";
import {
  cloneTaskDelegationMemberIdentity,
  cloneTaskDelegationTarget,
  getTaskDelegationTargetRouteKey,
} from "./task-delegation-target.js";
import {
  isTaskDelegationTerminalStatus,
  TaskDelegationError,
  type TaskDelegationDelegatorIdentity,
  type TaskDelegationRecord,
  type TaskResultReview,
  type TaskResultReviewDecision,
  type TaskResultSubmission,
  type TaskDelegationTaskInput,
} from "./task-delegation-record.js";
import type { TaskDelegationTarget } from "./task-delegation-target.js";

export type CreateTaskDelegationRecordInput = {
  taskId: string;
  task: TaskDelegationTaskInput;
  target: TaskDelegationTarget;
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

const cloneDelegatorIdentity = (
  identity: TaskDelegationDelegatorIdentity,
): TaskDelegationDelegatorIdentity => ({
  ...cloneTaskDelegationMemberIdentity(identity),
  taskAgentInstanceId: identity.taskAgentInstanceId ?? null,
  taskAgentRunId: identity.taskAgentRunId ?? null,
  taskId: identity.taskId ?? null,
  logicalMemberRouteKey: identity.logicalMemberRouteKey ?? null,
  taskTeamInstance: identity.taskTeamInstance ?? null,
});

const cloneTaskInput = (task: TaskDelegationTaskInput): TaskDelegationTaskInput => ({
  target: { ...task.target },
  description: task.description,
  reference_files: [...(task.reference_files ?? [])],
});

const cloneRecord = (record: TaskDelegationRecord): TaskDelegationRecord => ({
  ...record,
  target: cloneTaskDelegationTarget(record.target),
  delegator: cloneDelegatorIdentity(record.delegator),
  referenceFiles: [...record.referenceFiles],
  taskArguments: cloneTaskInput(record.taskArguments),
  execution: record.execution ? cloneTaskExecutionInstance(record.execution) : null,
  resultSubmissions: record.resultSubmissions.map((submission) => ({
    ...submission,
    execution: cloneTaskExecutionInstance(submission.execution),
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
  if (!firstLine) return fallbackTaskId;
  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine;
};

export class TaskDelegationLedger {
  private readonly recordsById = new Map<string, TaskDelegationRecord>();
  private idCounter = 0;

  constructor(readonly teamRunId: string) {}

  reserveTaskId(): string { return this.nextTaskId(); }

  createRecord(input: CreateTaskDelegationRecordInput): TaskDelegationRecord {
    const now = new Date().toISOString();
    const taskId = input.taskId.trim();
    if (!taskId) throw new TaskDelegationError("TASK_ID_REQUIRED", "taskId is required.");
    const record: TaskDelegationRecord = {
      taskId,
      taskLabel: deriveTaskLabel(input.task.description, taskId),
      description: input.task.description,
      status: "not_started",
      target: cloneTaskDelegationTarget(input.target),
      delegator: cloneDelegatorIdentity(input.delegator),
      referenceFiles: [...(input.task.reference_files ?? [])],
      taskArguments: cloneTaskInput(input.task),
      execution: null,
      delegatorReplyRecipientName: null,
      delegatorReplyTargetAgentRunId: null,
      pendingSubmissionId: null,
      resultSubmissions: [],
      resultReviews: [],
      acceptanceComment: null,
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
    if (!normalizedRunId) return [];
    return [...this.recordsById.values()]
      .filter((record) => record.execution?.kind === "task_agent" &&
        record.execution.taskAgentInstance.taskAgentRunId === normalizedRunId)
      .map(cloneRecord);
  }

  bindTaskAgent(input: {
    taskId: string;
    taskAgentInstance: TaskAgentInstanceIdentity;
    delegatorReplyRecipientName?: string | null;
    delegatorReplyTargetAgentRunId?: string | null;
  }): TaskDelegationRecord {
    const record = this.requireNotStarted(input.taskId);
    record.execution = {
      kind: "task_agent",
      taskAgentInstance: cloneTaskAgentIdentity(input.taskAgentInstance),
    };
    record.delegatorReplyRecipientName = input.delegatorReplyRecipientName?.trim() || null;
    record.delegatorReplyTargetAgentRunId = input.delegatorReplyTargetAgentRunId?.trim() || null;
    record.updatedAt = new Date().toISOString();
    return cloneRecord(record);
  }

  bindTaskTeam(input: {
    taskId: string;
    taskTeamInstance: TaskTeamInstanceIdentity;
    delegatorReplyRecipientName?: string | null;
    delegatorReplyTargetAgentRunId?: string | null;
  }): TaskDelegationRecord {
    const record = this.requireNotStarted(input.taskId);
    record.execution = {
      kind: "task_team",
      taskTeamInstance: { ...input.taskTeamInstance, logicalTeam: { ...input.taskTeamInstance.logicalTeam, memberPath: [...input.taskTeamInstance.logicalTeam.memberPath] }, ingress: { ...input.taskTeamInstance.ingress, memberPath: [...input.taskTeamInstance.ingress.memberPath] } },
    };
    record.delegatorReplyRecipientName = input.delegatorReplyRecipientName?.trim() || null;
    record.delegatorReplyTargetAgentRunId = input.delegatorReplyTargetAgentRunId?.trim() || null;
    record.updatedAt = new Date().toISOString();
    return cloneRecord(record);
  }

  markActive(taskId: string): TaskDelegationRecord {
    const record = this.recordsById.get(taskId);
    if (!record) throw new TaskDelegationError("TASK_NOT_FOUND", `Delegated task '${taskId}' was not found.`);
    if (record.status !== "not_started") {
      throw new TaskDelegationError("INVALID_STATUS_TRANSITION", `Delegated task '${taskId}' cannot transition from ${record.status} to active.`);
    }
    if (!record.execution) {
      throw new TaskDelegationError("TASK_EXECUTION_NOT_BOUND", `Delegated task '${taskId}' is not bound to an execution instance.`);
    }
    record.status = "active";
    record.updatedAt = new Date().toISOString();
    return cloneRecord(record);
  }

  markNotStarted(taskId: string): TaskDelegationRecord | null {
    const record = this.recordsById.get(taskId);
    if (!record || record.status !== "not_started") return null;
    record.execution = null;
    record.delegatorReplyRecipientName = null;
    record.delegatorReplyTargetAgentRunId = null;
    record.updatedAt = new Date().toISOString();
    return cloneRecord(record);
  }

  submitResultFromTaskAgent(input: {
    taskId: string;
    taskAgentRunId: string;
    message: string;
    referenceFiles: string[];
  }): TaskResultSubmissionTransition {
    const record = this.requireActiveForSubmission(input.taskId);
    if (record.execution?.kind !== "task_agent" || record.execution.taskAgentInstance.taskAgentRunId !== input.taskAgentRunId.trim()) {
      throw new TaskDelegationError("TASK_AGENT_NOT_AUTHORIZED", `Task-agent run '${input.taskAgentRunId}' is not assigned to delegated task '${input.taskId}'.`);
    }
    return this.commitSubmission(record, input.message, input.referenceFiles);
  }

  submitResultFromTaskTeam(input: {
    taskId: string;
    taskTeamRunId: string;
    message: string;
    referenceFiles: string[];
  }): TaskResultSubmissionTransition {
    const record = this.requireActiveForSubmission(input.taskId);
    if (record.execution?.kind !== "task_team" || record.execution.taskTeamInstance.taskTeamRunId !== input.taskTeamRunId.trim()) {
      throw new TaskDelegationError("TASK_TEAM_NOT_AUTHORIZED", `Task-team run '${input.taskTeamRunId}' is not assigned to delegated task '${input.taskId}'.`);
    }
    return this.commitSubmission(record, input.message, input.referenceFiles);
  }

  reviewResult(input: {
    taskId: string;
    decision: TaskResultReviewDecision;
    comment: string | null;
    referenceFiles: string[];
    reviewer: TaskDelegationDelegatorIdentity;
  }): TaskResultReviewTransition {
    const record = this.recordsById.get(input.taskId);
    if (!record) throw new TaskDelegationError("TASK_NOT_FOUND", `Delegated task '${input.taskId}' was not found.`);
    if (record.status !== "awaiting_review") {
      throw new TaskDelegationError("TASK_NOT_AWAITING_REVIEW", `Delegated task '${input.taskId}' is ${record.status}, not awaiting_review.`);
    }
    const pendingSubmissionId = record.pendingSubmissionId;
    if (!pendingSubmissionId) {
      throw new TaskDelegationError("PENDING_SUBMISSION_REQUIRED", `Delegated task '${input.taskId}' is awaiting review without a pending submission.`);
    }
    if (!record.resultSubmissions.some((submission) => submission.submissionId === pendingSubmissionId)) {
      throw new TaskDelegationError("PENDING_SUBMISSION_NOT_FOUND", `Pending submission '${pendingSubmissionId}' for delegated task '${input.taskId}' was not found.`);
    }
    const previousStatus = record.status;
    const now = new Date().toISOString();
    const sequence = record.resultReviews.length + 1;
    const review: TaskResultReview = {
      reviewId: `${record.taskId}_review_${String(sequence).padStart(4, "0")}`,
      reviewedSubmissionId: pendingSubmissionId,
      decision: input.decision,
      comment: input.comment,
      referenceFiles: [...input.referenceFiles],
      reviewer: cloneDelegatorIdentity(input.reviewer),
      reviewedAt: now,
    };
    record.resultReviews.push(review);
    record.pendingSubmissionId = null;
    record.updatedAt = now;
    if (input.decision === "request_revision") record.status = "active";
    else {
      record.status = "accepted";
      record.acceptanceComment = input.comment;
      record.acceptedAt = now;
      record.terminalAt = now;
    }
    return { previousStatus, record: cloneRecord(record), review: { ...review, referenceFiles: [...review.referenceFiles], reviewer: cloneDelegatorIdentity(review.reviewer) } };
  }

  hasCurrentWorkForAssignee(memberRouteKey: string): boolean {
    const normalizedRouteKey = memberRouteKey.trim();
    if (!normalizedRouteKey) return false;
    return [...this.recordsById.values()].some(
      (record) => getTaskDelegationTargetRouteKey(record.target) === normalizedRouteKey &&
        !isTaskDelegationTerminalStatus(record.status),
    );
  }

  hasCurrentWorkForTaskAgentInstance(taskAgentRunId: string): boolean {
    return this.hasOpenWorkBlockingTaskAgentSettlement(taskAgentRunId);
  }

  hasOpenWorkBlockingTaskAgentSettlement(taskAgentRunId: string): boolean {
    const normalizedRunId = taskAgentRunId.trim();
    if (!normalizedRunId) return false;
    return [...this.recordsById.values()].some((record) =>
      !isTaskDelegationTerminalStatus(record.status) &&
      ((record.execution?.kind === "task_agent" && record.execution.taskAgentInstance.taskAgentRunId === normalizedRunId) ||
        record.delegator.taskAgentRunId === normalizedRunId),
    );
  }

  private requireNotStarted(taskId: string): TaskDelegationRecord {
    const record = this.recordsById.get(taskId);
    if (!record) throw new TaskDelegationError("TASK_NOT_FOUND", `Delegated task '${taskId}' was not found.`);
    if (record.status !== "not_started") throw new TaskDelegationError("TASK_ALREADY_ACTIVE", `Delegated task '${taskId}' is already ${record.status}.`);
    return record;
  }

  private requireActiveForSubmission(taskId: string): TaskDelegationRecord {
    const record = this.recordsById.get(taskId);
    if (!record) throw new TaskDelegationError("TASK_NOT_FOUND", `Delegated task '${taskId}' was not found.`);
    if (record.status !== "active") {
      throw new TaskDelegationError("TASK_NOT_ACTIVE_FOR_RESULT", `Delegated task '${taskId}' is ${record.status}, not active for result submission.`);
    }
    if (!record.execution) throw new TaskDelegationError("TASK_EXECUTION_NOT_BOUND", `Delegated task '${taskId}' has no bound execution instance.`);
    return record;
  }

  private commitSubmission(
    record: TaskDelegationRecord,
    message: string,
    referenceFiles: string[],
  ): TaskResultSubmissionTransition {
    const previousStatus = record.status;
    const now = new Date().toISOString();
    const sequence = record.resultSubmissions.length + 1;
    const submission: TaskResultSubmission = {
      submissionId: `${record.taskId}_submission_${String(sequence).padStart(4, "0")}`,
      sequence,
      message,
      referenceFiles: [...referenceFiles],
      submittedAt: now,
      execution: cloneTaskExecutionInstance(record.execution!),
    };
    record.resultSubmissions.push(submission);
    record.pendingSubmissionId = submission.submissionId;
    record.status = "awaiting_review";
    record.updatedAt = now;
    return { previousStatus, record: cloneRecord(record), submission: { ...submission, referenceFiles: [...submission.referenceFiles], execution: cloneTaskExecutionInstance(submission.execution) } };
  }

  private nextTaskId(): string {
    this.idCounter += 1;
    return `task_${String(this.idCounter).padStart(4, "0")}`;
  }
}
