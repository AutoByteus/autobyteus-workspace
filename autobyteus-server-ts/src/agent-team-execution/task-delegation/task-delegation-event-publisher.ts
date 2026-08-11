import type { TeamRun } from "../domain/team-run.js";
import {
  TeamRunEventSourceType,
  type TeamRunTaskDelegationEventPayload,
} from "../domain/team-run-event.js";
import type { ActiveTaskDelegationRecordEntry } from "./task-delegation-active-entry.js";
import {
  isTaskDelegationTerminalStatus,
  type TaskDelegationActivationPayload,
  type TaskDelegationRecord,
  type TaskDelegationResultReviewedPayload,
  type TaskDelegationResultSubmittedPayload,
  type TaskDelegationStatus,
  type TaskDelegationStatusUpdatePayload,
  type TaskResultReview,
  type TaskResultSubmission,
} from "./task-delegation-record.js";
import {
  derivePendingSubmissionId,
  deriveTaskLabel,
  getTaskRecordUpdatedAt,
  latestAcceptanceReview,
  latestTaskReview,
  latestTaskSubmission,
} from "./task-delegation-record-derived.js";
import { getTaskExecutionKind, getTaskExecutionRunId } from "./task-execution-instance.js";
import {
  buildTaskDelegationArguments,
  buildTaskDelegationReferenceFiles,
} from "./task-delegation-reference-file.js";
import { cloneTaskExecutionAddress } from "./task-delegation-record-snapshot.js";

const taskArgumentsForEntry = (entry: ActiveTaskDelegationRecordEntry) =>
  buildTaskDelegationArguments({
    target: entry.target,
    content: entry.record.content,
    referenceFiles: entry.record.referenceFiles,
  });

export class TaskDelegationEventPublisher {
  publishActivated(input: {
    teamRun: TeamRun;
    teamRunId: string;
    entry: ActiveTaskDelegationRecordEntry;
  }): void {
    const executionKind = getTaskExecutionKind(input.entry.taskRunExecution)!;
    const payload: TaskDelegationActivationPayload = {
      teamRunId: input.teamRunId,
      rootTeamRunId: input.entry.persistenceScope.rootTeamRunId,
      senderAddress: cloneTaskExecutionAddress(input.entry.record.senderAddress),
      target: input.entry.target,
      execution: input.entry.taskRunExecution,
      taskIds: [input.entry.record.taskId],
      tasks: [input.entry].map((entry) => ({
        taskId: entry.record.taskId,
        taskLabel: deriveTaskLabel(entry.record.content, entry.record.taskId),
        description: entry.record.content,
        status: entry.record.status,
        referenceFiles: buildTaskDelegationReferenceFiles(entry.record),
        taskArguments: taskArgumentsForEntry(entry),
        executionKind,
        executionRunId: getTaskExecutionRunId(entry.taskRunExecution),
      })),
      activatedAt: new Date().toISOString(),
    };
    this.publish({
      teamRun: input.teamRun,
      teamRunId: input.teamRunId,
      executionAddress: input.entry.record.receiverAddress,
      eventType: "TASK_DELEGATION_ACTIVATED",
      target: input.entry.target,
      payload,
    });
  }

  publishStatusUpdated(input: {
    teamRun: TeamRun;
    teamRunId: string;
    previousStatus: TaskDelegationStatus;
    entry: ActiveTaskDelegationRecordEntry;
  }): void {
    const record = input.entry.record;
    const latestSubmission = latestTaskSubmission(record);
    const latestReview = latestTaskReview(record);
    const acceptedReview = latestAcceptanceReview(record);
    const payload: TaskDelegationStatusUpdatePayload = {
      teamRunId: input.teamRunId,
      rootTeamRunId: input.entry.persistenceScope.rootTeamRunId,
      senderAddress: cloneTaskExecutionAddress(record.senderAddress),
      taskId: record.taskId,
      taskLabel: deriveTaskLabel(record.content, record.taskId),
      description: record.content,
      target: input.entry.target,
      delegator: input.entry.reviewOwner,
      referenceFiles: buildTaskDelegationReferenceFiles(record),
      taskArguments: taskArgumentsForEntry(input.entry),
      execution: input.entry.taskRunExecution,
      previousStatus: input.previousStatus,
      status: record.status,
      pendingSubmissionId: derivePendingSubmissionId(record),
      latestSubmissionId: latestSubmission?.submissionId ?? null,
      latestReviewId: latestReview?.reviewId ?? null,
      reviewedSubmissionId: latestReview?.reviewedSubmissionId ?? null,
      acceptanceComment: acceptedReview?.content ?? null,
      acceptedAt: acceptedReview?.createdAt ?? null,
      updatedAt: getTaskRecordUpdatedAt(record),
      terminal: isTaskDelegationTerminalStatus(record.status),
    };
    this.publish({
      teamRun: input.teamRun,
      teamRunId: input.teamRunId,
      executionAddress: input.entry.record.receiverAddress,
      eventType: "TASK_DELEGATION_STATUS_UPDATED",
      target: input.entry.target,
      payload,
    });
  }

  publishResultSubmitted(input: {
    teamRun: TeamRun;
    teamRunId: string;
    previousStatus: TaskDelegationStatus;
    entry: ActiveTaskDelegationRecordEntry;
    submission: TaskResultSubmission;
  }): void {
    const record = input.entry.record;
    const payload: TaskDelegationResultSubmittedPayload = {
      teamRunId: input.teamRunId,
      rootTeamRunId: input.entry.persistenceScope.rootTeamRunId,
      senderAddress: cloneTaskExecutionAddress(record.senderAddress),
      taskId: record.taskId,
      taskLabel: deriveTaskLabel(record.content, record.taskId),
      description: record.content,
      target: input.entry.target,
      delegator: input.entry.reviewOwner,
      referenceFiles: buildTaskDelegationReferenceFiles(record),
      taskArguments: taskArgumentsForEntry(input.entry),
      execution: input.entry.taskRunExecution,
      previousStatus: input.previousStatus,
      status: record.status,
      submissionId: input.submission.submissionId,
      pendingSubmissionId: derivePendingSubmissionId(record),
      submittedAt: input.submission.createdAt,
      updatedAt: getTaskRecordUpdatedAt(record),
    };
    this.publish({
      teamRun: input.teamRun,
      teamRunId: input.teamRunId,
      executionAddress: input.entry.record.receiverAddress,
      eventType: "TASK_DELEGATION_RESULT_SUBMITTED",
      target: input.entry.target,
      payload,
    });
  }

  publishResultReviewed(input: {
    teamRun: TeamRun;
    teamRunId: string;
    previousStatus: TaskDelegationStatus;
    entry: ActiveTaskDelegationRecordEntry;
    review: TaskResultReview;
  }): void {
    const record = input.entry.record;
    const payload: TaskDelegationResultReviewedPayload = {
      teamRunId: input.teamRunId,
      rootTeamRunId: input.entry.persistenceScope.rootTeamRunId,
      senderAddress: cloneTaskExecutionAddress(record.senderAddress),
      taskId: record.taskId,
      taskLabel: deriveTaskLabel(record.content, record.taskId),
      description: record.content,
      target: input.entry.target,
      delegator: input.entry.reviewOwner,
      referenceFiles: buildTaskDelegationReferenceFiles(record),
      taskArguments: taskArgumentsForEntry(input.entry),
      execution: input.entry.taskRunExecution,
      previousStatus: input.previousStatus,
      status: record.status,
      reviewId: input.review.reviewId,
      reviewedSubmissionId: input.review.reviewedSubmissionId,
      decision: input.review.decision,
      comment: input.review.content,
      reviewedAt: input.review.createdAt,
      updatedAt: getTaskRecordUpdatedAt(record),
      terminal: isTaskDelegationTerminalStatus(record.status),
    };
    this.publish({
      teamRun: input.teamRun,
      teamRunId: input.teamRunId,
      executionAddress: input.entry.record.receiverAddress,
      eventType: "TASK_DELEGATION_RESULT_REVIEWED",
      target: input.entry.target,
      payload,
    });
  }

  private publish(input: {
    teamRun: TeamRun;
    teamRunId: string;
    executionAddress: ActiveTaskDelegationRecordEntry["record"]["receiverAddress"];
    eventType: TeamRunTaskDelegationEventPayload["eventType"];
    target: ActiveTaskDelegationRecordEntry["target"];
    payload: unknown;
  }): void {
    input.teamRun.publishEvent({
      eventSourceType: TeamRunEventSourceType.TASK_DELEGATION,
      teamRunId: input.teamRunId,
      executionAddress: input.executionAddress,
      data: {
        eventType: input.eventType,
        payload: input.payload,
      },
    });
  }
}
