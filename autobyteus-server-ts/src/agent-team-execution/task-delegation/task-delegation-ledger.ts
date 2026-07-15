import type { TaskAgentInstanceIdentity } from "../domain/task-agent-instance.js";
import { cloneTaskTeamInstanceIdentity } from "../domain/task-team-instance.js";
import type { TaskTeamInstanceIdentity } from "../domain/task-team-instance.js";
import { cloneTaskAgentIdentity } from "./task-agent-instance-identity.js";
import { cloneTaskExecutionInstance } from "./task-execution-instance.js";
import {
  cloneTaskDelegationMemberIdentity,
  cloneTaskDelegationTarget,
  getTaskDelegationTargetRouteKey,
} from "./task-delegation-target.js";
import type { TaskDelegationPersistenceScope } from "./task-delegation-persistence-scope.js";
import {
  cloneTaskConversationAddress,
  cloneTaskDelegationRecord,
  cloneTaskReferenceFiles,
  cloneTaskRunReference,
} from "./task-delegation-record-snapshot.js";
import {
  derivePendingSubmissionId,
  deriveTaskLabel,
} from "./task-delegation-record-derived.js";
import {
  isTaskDelegationTerminalStatus,
  TaskDelegationError,
  type TaskDelegationDelegatorIdentity,
  type TaskDelegationRecord,
  type TaskReferenceFile,
  type TaskResultReview,
  type TaskResultReviewDecision,
  type TaskResultSubmission,
  type TaskRunReference,
} from "./task-delegation-record.js";
import type { TaskDelegationTarget } from "./task-delegation-target.js";
import type {
  ActiveTaskDelegationRecordEntry,
  ActiveTaskDelegationStartingEntry,
  TaskDelegationLedgerEntry,
} from "./task-delegation-active-entry.js";
import type { ConversationTargetAddress } from "../domain/conversation-target-address.js";

export type CreateTaskDelegationStartingEntryInput = {
  taskId: string;
  persistenceScope: TaskDelegationPersistenceScope;
  target: TaskDelegationTarget;
  reviewOwner: TaskDelegationDelegatorIdentity;
  senderAddress: ConversationTargetAddress;
  receiverAddress: ConversationTargetAddress;
  receiverTargetKind: "member" | "team";
  content: string;
  referenceFiles: TaskReferenceFile[];
};

export type TaskResultSubmissionTransition = {
  previousStatus: TaskDelegationRecord["status"];
  entry: ActiveTaskDelegationRecordEntry;
  record: TaskDelegationRecord;
  submission: TaskResultSubmission;
};

export type TaskResultReviewTransition = {
  previousStatus: TaskDelegationRecord["status"];
  entry: ActiveTaskDelegationRecordEntry;
  record: TaskDelegationRecord;
  review: TaskResultReview;
};

const cloneScope = (scope: TaskDelegationPersistenceScope): TaskDelegationPersistenceScope => ({
  rootTeamRunId: scope.rootTeamRunId,
  currentTeamRunId: scope.currentTeamRunId,
  teamRunPath: [...scope.teamRunPath],
});

const cloneDelegatorIdentity = (
  identity: TaskDelegationDelegatorIdentity,
): TaskDelegationDelegatorIdentity => ({
  ...cloneTaskDelegationMemberIdentity(identity),
  taskAgentInstanceId: identity.taskAgentInstanceId ?? null,
  taskAgentRunId: identity.taskAgentRunId ?? null,
  taskId: identity.taskId ?? null,
  logicalMemberRouteKey: identity.logicalMemberRouteKey ?? null,
  taskTeamInstance: identity.taskTeamInstance
    ? cloneTaskTeamInstanceIdentity(identity.taskTeamInstance)
    : null,
});

const cloneStartingEntry = (
  entry: ActiveTaskDelegationStartingEntry,
): ActiveTaskDelegationStartingEntry => ({
  phase: "starting",
  taskId: entry.taskId,
  persistenceScope: cloneScope(entry.persistenceScope),
  target: cloneTaskDelegationTarget(entry.target),
  reviewOwner: cloneDelegatorIdentity(entry.reviewOwner),
  senderAddress: cloneTaskConversationAddress(entry.senderAddress),
  receiverAddress: cloneTaskConversationAddress(entry.receiverAddress),
  receiverTargetKind: entry.receiverTargetKind,
  content: entry.content,
  referenceFiles: cloneTaskReferenceFiles(entry.referenceFiles),
  boundExecution: entry.boundExecution ? cloneTaskExecutionInstance(entry.boundExecution) : null,
  delegatorReplyRecipientName: entry.delegatorReplyRecipientName,
  delegatorReplyTargetAgentRunId: entry.delegatorReplyTargetAgentRunId,
  createdAt: entry.createdAt,
});

const cloneRecordEntry = (
  entry: ActiveTaskDelegationRecordEntry,
): ActiveTaskDelegationRecordEntry => ({
  phase: "record",
  persistenceScope: cloneScope(entry.persistenceScope),
  record: cloneTaskDelegationRecord(entry.record),
  target: cloneTaskDelegationTarget(entry.target),
  reviewOwner: cloneDelegatorIdentity(entry.reviewOwner),
  taskRunExecution: cloneTaskExecutionInstance(entry.taskRunExecution),
  delegatorReplyRecipientName: entry.delegatorReplyRecipientName,
  delegatorReplyTargetAgentRunId: entry.delegatorReplyTargetAgentRunId,
});

const cloneEntry = (entry: TaskDelegationLedgerEntry): TaskDelegationLedgerEntry => (
  entry.phase === "starting" ? cloneStartingEntry(entry) : cloneRecordEntry(entry)
);

export class TaskDelegationLedger {
  private readonly entriesById = new Map<string, TaskDelegationLedgerEntry>();

  constructor(readonly teamRunId: string) {}

  createStartingEntry(input: CreateTaskDelegationStartingEntryInput): ActiveTaskDelegationStartingEntry {
    const taskId = input.taskId.trim();
    if (!taskId) throw new TaskDelegationError("TASK_ID_REQUIRED", "taskId is required.");
    if (this.entriesById.has(taskId)) {
      throw new TaskDelegationError("TASK_ID_COLLISION", `Delegated task '${taskId}' already exists.`);
    }
    const createdAt = new Date().toISOString();
    const entry: ActiveTaskDelegationStartingEntry = {
      phase: "starting",
      taskId,
      persistenceScope: cloneScope(input.persistenceScope),
      target: cloneTaskDelegationTarget(input.target),
      reviewOwner: cloneDelegatorIdentity(input.reviewOwner),
      senderAddress: cloneTaskConversationAddress(input.senderAddress),
      receiverAddress: cloneTaskConversationAddress(input.receiverAddress),
      receiverTargetKind: input.receiverTargetKind,
      content: input.content,
      referenceFiles: cloneTaskReferenceFiles(input.referenceFiles),
      boundExecution: null,
      delegatorReplyRecipientName: null,
      delegatorReplyTargetAgentRunId: null,
      createdAt,
    };
    this.entriesById.set(taskId, entry);
    return cloneStartingEntry(entry);
  }

  getEntry(taskId: string): TaskDelegationLedgerEntry | null {
    const entry = this.entriesById.get(taskId) ?? null;
    return entry ? cloneEntry(entry) : null;
  }

  getRecordEntry(taskId: string): ActiveTaskDelegationRecordEntry | null {
    const entry = this.entriesById.get(taskId) ?? null;
    return entry?.phase === "record" ? cloneRecordEntry(entry) : null;
  }

  getStartingEntry(taskId: string): ActiveTaskDelegationStartingEntry | null {
    const entry = this.entriesById.get(taskId) ?? null;
    return entry?.phase === "starting" ? cloneStartingEntry(entry) : null;
  }

  getRecord(taskId: string): TaskDelegationRecord | null {
    return this.getRecordEntry(taskId)?.record ?? null;
  }

  listRecords(): TaskDelegationRecord[] {
    return [...this.entriesById.values()]
      .filter((entry): entry is ActiveTaskDelegationRecordEntry => entry.phase === "record")
      .map((entry) => cloneTaskDelegationRecord(entry.record));
  }

  listEntries(): TaskDelegationLedgerEntry[] {
    return [...this.entriesById.values()].map(cloneEntry);
  }

  listRecordsForTaskAgentRun(taskAgentRunId: string): TaskDelegationRecord[] {
    const normalizedRunId = taskAgentRunId.trim();
    if (!normalizedRunId) return [];
    return [...this.entriesById.values()]
      .filter((entry): entry is ActiveTaskDelegationRecordEntry =>
        entry.phase === "record" &&
        entry.taskRunExecution.kind === "task_agent" &&
        entry.taskRunExecution.taskAgentInstance.taskAgentRunId === normalizedRunId)
      .map((entry) => cloneTaskDelegationRecord(entry.record));
  }

  bindTaskAgent(input: {
    taskId: string;
    taskAgentInstance: TaskAgentInstanceIdentity;
    delegatorReplyRecipientName?: string | null;
    delegatorReplyTargetAgentRunId?: string | null;
  }): ActiveTaskDelegationStartingEntry {
    const entry = this.requireStarting(input.taskId);
    entry.boundExecution = {
      kind: "task_agent",
      taskAgentInstance: cloneTaskAgentIdentity(input.taskAgentInstance),
    };
    entry.delegatorReplyRecipientName = input.delegatorReplyRecipientName?.trim() || null;
    entry.delegatorReplyTargetAgentRunId = input.delegatorReplyTargetAgentRunId?.trim() || null;
    return cloneStartingEntry(entry);
  }

  bindTaskTeam(input: {
    taskId: string;
    taskTeamInstance: TaskTeamInstanceIdentity;
    delegatorReplyRecipientName?: string | null;
    delegatorReplyTargetAgentRunId?: string | null;
  }): ActiveTaskDelegationStartingEntry {
    const entry = this.requireStarting(input.taskId);
    entry.boundExecution = {
      kind: "task_team",
      taskTeamInstance: cloneTaskTeamInstanceIdentity(input.taskTeamInstance),
    };
    entry.delegatorReplyRecipientName = input.delegatorReplyRecipientName?.trim() || null;
    entry.delegatorReplyTargetAgentRunId = input.delegatorReplyTargetAgentRunId?.trim() || null;
    return cloneStartingEntry(entry);
  }

  activateStartingEntry(input: {
    taskId: string;
    taskRun: TaskRunReference;
    receiverAddress?: ConversationTargetAddress | null;
  }): ActiveTaskDelegationRecordEntry {
    const starting = this.requireStarting(input.taskId);
    if (!starting.boundExecution) {
      throw new TaskDelegationError("TASK_EXECUTION_NOT_BOUND", `Delegated task '${input.taskId}' is not bound to an execution instance.`);
    }
    const record: TaskDelegationRecord = {
      taskId: starting.taskId,
      status: "active",
      senderAddress: cloneTaskConversationAddress(starting.senderAddress),
      receiverAddress: cloneTaskConversationAddress(input.receiverAddress ?? starting.receiverAddress),
      receiverTargetKind: starting.receiverTargetKind,
      content: starting.content,
      referenceFiles: cloneTaskReferenceFiles(starting.referenceFiles),
      taskRun: cloneTaskRunReference(input.taskRun),
      updates: [],
      createdAt: starting.createdAt,
    };
    const entry: ActiveTaskDelegationRecordEntry = {
      phase: "record",
      persistenceScope: cloneScope(starting.persistenceScope),
      record,
      target: cloneTaskDelegationTarget(starting.target),
      reviewOwner: cloneDelegatorIdentity(starting.reviewOwner),
      taskRunExecution: cloneTaskExecutionInstance(starting.boundExecution),
      delegatorReplyRecipientName: starting.delegatorReplyRecipientName,
      delegatorReplyTargetAgentRunId: starting.delegatorReplyTargetAgentRunId,
    };
    this.entriesById.set(input.taskId, entry);
    return cloneRecordEntry(entry);
  }

  discardStartingEntry(taskId: string): ActiveTaskDelegationStartingEntry | null {
    const entry = this.entriesById.get(taskId) ?? null;
    if (!entry || entry.phase !== "starting") return null;
    this.entriesById.delete(taskId);
    return cloneStartingEntry(entry);
  }

  submitResultFromTaskAgent(input: {
    taskId: string;
    taskAgentRunId: string;
    message: string;
    referenceFiles: TaskReferenceFile[];
  }): TaskResultSubmissionTransition {
    const entry = this.requireActiveRecord(input.taskId);
    if (entry.taskRunExecution.kind !== "task_agent" || entry.taskRunExecution.taskAgentInstance.taskAgentRunId !== input.taskAgentRunId.trim()) {
      throw new TaskDelegationError("TASK_AGENT_NOT_AUTHORIZED", `Task-agent run '${input.taskAgentRunId}' is not assigned to delegated task '${input.taskId}'.`);
    }
    return this.commitSubmission(entry, input.message, input.referenceFiles);
  }

  submitResultFromTaskTeam(input: {
    taskId: string;
    taskTeamRunId: string;
    message: string;
    referenceFiles: TaskReferenceFile[];
  }): TaskResultSubmissionTransition {
    const entry = this.requireActiveRecord(input.taskId);
    if (entry.taskRunExecution.kind !== "task_team" || entry.taskRunExecution.taskTeamInstance.taskTeamRunId !== input.taskTeamRunId.trim()) {
      throw new TaskDelegationError("TASK_TEAM_NOT_AUTHORIZED", `Task-team run '${input.taskTeamRunId}' is not assigned to delegated task '${input.taskId}'.`);
    }
    return this.commitSubmission(entry, input.message, input.referenceFiles);
  }

  reviewResult(input: {
    taskId: string;
    decision: TaskResultReviewDecision;
    comment: string | null;
    referenceFiles: TaskReferenceFile[];
    reviewer: TaskDelegationDelegatorIdentity;
  }): TaskResultReviewTransition {
    const entry = this.requireRecord(input.taskId);
    const record = entry.record;
    if (record.status !== "awaiting_review") {
      throw new TaskDelegationError("TASK_NOT_AWAITING_REVIEW", `Delegated task '${input.taskId}' is ${record.status}, not awaiting_review.`);
    }
    const pendingSubmissionId = derivePendingSubmissionId(record);
    if (!pendingSubmissionId) {
      throw new TaskDelegationError("PENDING_SUBMISSION_REQUIRED", `Delegated task '${input.taskId}' is awaiting review without a pending submission.`);
    }
    const previousStatus = record.status;
    const now = new Date().toISOString();
    const reviewSequence = record.updates.filter((update) => update.kind === "review").length + 1;
    const reviewUpdate = {
      kind: "review" as const,
      reviewId: `${record.taskId}_review_${String(reviewSequence).padStart(4, "0")}`,
      senderAddress: cloneTaskConversationAddress(record.senderAddress),
      receiverAddress: cloneTaskConversationAddress(record.taskRun!.address),
      reviewedSubmissionId: pendingSubmissionId,
      decision: input.decision,
      content: input.comment,
      referenceFiles: cloneTaskReferenceFiles(input.referenceFiles),
      createdAt: now,
    };
    record.updates.push(reviewUpdate);
    record.status = input.decision === "request_revision" ? "active" : "accepted";
    const transitionReview: TaskResultReview = {
      ...reviewUpdate,
      comment: reviewUpdate.content,
      reviewedAt: reviewUpdate.createdAt,
      reviewer: cloneDelegatorIdentity(input.reviewer),
    };
    const clonedEntry = cloneRecordEntry(entry);
    return {
      previousStatus,
      entry: clonedEntry,
      record: clonedEntry.record,
      review: transitionReview,
    };
  }

  hasCurrentWorkForAssignee(memberRouteKey: string): boolean {
    const normalizedRouteKey = memberRouteKey.trim();
    if (!normalizedRouteKey) return false;
    return [...this.entriesById.values()].some((entry) => {
      if (entry.phase === "record" && isTaskDelegationTerminalStatus(entry.record.status)) return false;
      return getTaskDelegationTargetRouteKey(entry.target) === normalizedRouteKey;
    });
  }

  hasCurrentWorkForTaskAgentInstance(taskAgentRunId: string): boolean {
    return this.hasOpenWorkBlockingTaskAgentSettlement(taskAgentRunId);
  }

  hasOpenWorkBlockingTaskAgentSettlement(taskAgentRunId: string): boolean {
    const normalizedRunId = taskAgentRunId.trim();
    if (!normalizedRunId) return false;
    return [...this.entriesById.values()].some((entry) => {
      if (entry.phase === "record" && isTaskDelegationTerminalStatus(entry.record.status)) return false;
      const executionBlocks = entry.phase === "record" &&
        entry.taskRunExecution.kind === "task_agent" &&
        entry.taskRunExecution.taskAgentInstance.taskAgentRunId === normalizedRunId;
      return executionBlocks || entry.reviewOwner.taskAgentRunId === normalizedRunId;
    });
  }

  private requireStarting(taskId: string): ActiveTaskDelegationStartingEntry {
    const entry = this.entriesById.get(taskId);
    if (!entry) throw new TaskDelegationError("TASK_NOT_FOUND", `Delegated task '${taskId}' was not found.`);
    if (entry.phase !== "starting") {
      throw new TaskDelegationError("TASK_ALREADY_ACTIVE", `Delegated task '${taskId}' is already ${entry.record.status}.`);
    }
    return entry;
  }

  private requireRecord(taskId: string): ActiveTaskDelegationRecordEntry {
    const entry = this.entriesById.get(taskId);
    if (!entry) throw new TaskDelegationError("TASK_NOT_FOUND", `Delegated task '${taskId}' was not found.`);
    if (entry.phase !== "record") {
      throw new TaskDelegationError("TASK_NOT_ACTIVE_FOR_RESULT", `Delegated task '${taskId}' is not active yet.`);
    }
    return entry;
  }

  private requireActiveRecord(taskId: string): ActiveTaskDelegationRecordEntry {
    const entry = this.requireRecord(taskId);
    if (entry.record.status !== "active") {
      throw new TaskDelegationError("TASK_NOT_ACTIVE_FOR_RESULT", `Delegated task '${taskId}' is ${entry.record.status}, not active for result submission.`);
    }
    if (!entry.record.taskRun) throw new TaskDelegationError("TASK_EXECUTION_NOT_BOUND", `Delegated task '${taskId}' has no bound execution instance.`);
    return entry;
  }

  private commitSubmission(
    entry: ActiveTaskDelegationRecordEntry,
    message: string,
    referenceFiles: TaskReferenceFile[],
  ): TaskResultSubmissionTransition {
    const record = entry.record;
    const previousStatus = record.status;
    const now = new Date().toISOString();
    const sequence = record.updates.filter((update) => update.kind === "submission").length + 1;
    const submissionUpdate = {
      kind: "submission" as const,
      submissionId: `${record.taskId}_submission_${String(sequence).padStart(4, "0")}`,
      senderAddress: cloneTaskConversationAddress(record.taskRun!.address),
      receiverAddress: cloneTaskConversationAddress(record.senderAddress),
      content: message,
      referenceFiles: cloneTaskReferenceFiles(referenceFiles),
      createdAt: now,
    };
    record.updates.push(submissionUpdate);
    record.status = "awaiting_review";
    const submission: TaskResultSubmission = {
      ...submissionUpdate,
      message: submissionUpdate.content,
      submittedAt: submissionUpdate.createdAt,
      execution: cloneTaskExecutionInstance(entry.taskRunExecution),
    };
    const clonedEntry = cloneRecordEntry(entry);
    return {
      previousStatus,
      entry: clonedEntry,
      record: clonedEntry.record,
      submission,
    };
  }
}

export { deriveTaskLabel };
