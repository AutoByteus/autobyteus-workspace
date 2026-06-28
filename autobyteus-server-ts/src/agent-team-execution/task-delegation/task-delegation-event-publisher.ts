import type { TeamRun } from "../domain/team-run.js";
import {
  TeamRunEventSourceType,
  type TeamRunTaskDelegationEventPayload,
} from "../domain/team-run-event.js";
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
import { getTaskExecutionKind, getTaskExecutionRunId } from "./task-execution-instance.js";
import { getTaskDelegationTargetName } from "./task-delegation-target.js";
import {
  buildTaskDelegationArguments,
  buildTaskDelegationReferenceFiles,
} from "./task-delegation-reference-file.js";

const sourcePathForRecord = (record: TaskDelegationRecord): string[] =>
  record.target.kind === "member"
    ? record.target.member.memberPath
    : record.target.team.memberPath;

export class TaskDelegationEventPublisher {
  publishActivated(input: {
    teamRun: TeamRun;
    teamRunId: string;
    record: TaskDelegationRecord;
  }): void {
    if (!input.record.execution) throw new Error(`Task '${input.record.taskId}' is missing execution identity.`);
    const executionKind = getTaskExecutionKind(input.record.execution)!;
    const payload: TaskDelegationActivationPayload = {
      teamRunId: input.teamRunId,
      target: input.record.target,
      execution: input.record.execution,
      taskIds: [input.record.taskId],
      tasks: [input.record].map((record) => ({
        taskId: record.taskId,
        taskLabel: record.taskLabel,
        description: record.description,
        status: record.status,
        referenceFiles: buildTaskDelegationReferenceFiles(record),
        taskArguments: buildTaskDelegationArguments(record),
        executionKind,
        executionRunId: getTaskExecutionRunId(record.execution),
      })),
      activatedAt: new Date().toISOString(),
    };
    this.publish({
      teamRun: input.teamRun,
      teamRunId: input.teamRunId,
      sourcePath: sourcePathForRecord(input.record),
      eventType: "TASK_DELEGATION_ACTIVATED",
      payload,
    });
  }

  publishStatusUpdated(input: {
    teamRun: TeamRun;
    teamRunId: string;
    previousStatus: TaskDelegationStatus;
    record: TaskDelegationRecord;
  }): void {
    const payload: TaskDelegationStatusUpdatePayload = {
      teamRunId: input.teamRunId,
      taskId: input.record.taskId,
      taskLabel: input.record.taskLabel,
      description: input.record.description,
      target: input.record.target,
      delegator: input.record.delegator,
      referenceFiles: buildTaskDelegationReferenceFiles(input.record),
      taskArguments: buildTaskDelegationArguments(input.record),
      execution: input.record.execution,
      previousStatus: input.previousStatus,
      status: input.record.status,
      pendingSubmissionId: input.record.pendingSubmissionId,
      latestSubmissionId: input.record.resultSubmissions.at(-1)?.submissionId ?? null,
      latestReviewId: input.record.resultReviews.at(-1)?.reviewId ?? null,
      reviewedSubmissionId: input.record.resultReviews.at(-1)?.reviewedSubmissionId ?? null,
      acceptanceMessage: input.record.acceptanceMessage,
      acceptedAt: input.record.acceptedAt,
      updatedAt: input.record.updatedAt,
      terminal: isTaskDelegationTerminalStatus(input.record.status),
    };
    this.publish({
      teamRun: input.teamRun,
      teamRunId: input.teamRunId,
      sourcePath: sourcePathForRecord(input.record),
      eventType: "TASK_DELEGATION_STATUS_UPDATED",
      payload,
    });
  }

  publishResultSubmitted(input: {
    teamRun: TeamRun;
    teamRunId: string;
    previousStatus: TaskDelegationStatus;
    record: TaskDelegationRecord;
    submission: TaskResultSubmission;
  }): void {
    const payload: TaskDelegationResultSubmittedPayload = {
      teamRunId: input.teamRunId,
      taskId: input.record.taskId,
      taskLabel: input.record.taskLabel,
      description: input.record.description,
      target: input.record.target,
      delegator: input.record.delegator,
      referenceFiles: buildTaskDelegationReferenceFiles(input.record),
      taskArguments: buildTaskDelegationArguments(input.record),
      execution: input.record.execution,
      previousStatus: input.previousStatus,
      status: input.record.status,
      submissionId: input.submission.submissionId,
      pendingSubmissionId: input.record.pendingSubmissionId,
      submittedAt: input.submission.submittedAt,
      updatedAt: input.record.updatedAt,
    };
    this.publish({
      teamRun: input.teamRun,
      teamRunId: input.teamRunId,
      sourcePath: sourcePathForRecord(input.record),
      eventType: "TASK_DELEGATION_RESULT_SUBMITTED",
      payload,
    });
  }

  publishResultReviewed(input: {
    teamRun: TeamRun;
    teamRunId: string;
    previousStatus: TaskDelegationStatus;
    record: TaskDelegationRecord;
    review: TaskResultReview;
  }): void {
    const payload: TaskDelegationResultReviewedPayload = {
      teamRunId: input.teamRunId,
      taskId: input.record.taskId,
      taskLabel: input.record.taskLabel,
      description: input.record.description,
      target: input.record.target,
      delegator: input.record.delegator,
      referenceFiles: buildTaskDelegationReferenceFiles(input.record),
      taskArguments: buildTaskDelegationArguments(input.record),
      execution: input.record.execution,
      previousStatus: input.previousStatus,
      status: input.record.status,
      reviewId: input.review.reviewId,
      reviewedSubmissionId: input.review.reviewedSubmissionId,
      decision: input.review.decision,
      reviewedAt: input.review.reviewedAt,
      updatedAt: input.record.updatedAt,
      terminal: isTaskDelegationTerminalStatus(input.record.status),
    };
    this.publish({
      teamRun: input.teamRun,
      teamRunId: input.teamRunId,
      sourcePath: sourcePathForRecord(input.record),
      eventType: "TASK_DELEGATION_RESULT_REVIEWED",
      payload,
    });
  }

  private publish(input: {
    teamRun: TeamRun;
    teamRunId: string;
    sourcePath: string[];
    eventType: TeamRunTaskDelegationEventPayload["eventType"];
    payload: unknown;
  }): void {
    input.teamRun.publishEvent({
      eventSourceType: TeamRunEventSourceType.TASK_DELEGATION,
      teamRunId: input.teamRunId,
      sourcePath: input.sourcePath,
      data: {
        eventType: input.eventType,
        payload: {
          ...(input.payload as Record<string, unknown>),
          target_name: getTaskDelegationTargetName((input.payload as { target: TaskDelegationRecord["target"] }).target),
        },
      },
    });
  }
}
