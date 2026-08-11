import type { TeamRun } from "../domain/team-run.js";
import {
  TeamRunEventSourceType,
  type TeamRunTaskDelegationEvent,
} from "../domain/team-run-event.js";
import type { ActiveTaskDelegationRecordEntry } from "./task-delegation-active-entry.js";
import type { TaskResultReview, TaskResultSubmission } from "./task-delegation-record.js";
import { cloneTaskExecutionAddress } from "./task-delegation-record-snapshot.js";
import type { TeamRunEvent } from "../domain/team-run-event.js";

const taskExecutionAddress = (entry: ActiveTaskDelegationRecordEntry) => {
  const address = entry.record.taskRun?.address;
  if (!address) throw new Error(`Task '${entry.record.taskId}' has no durable execution address.`);
  return cloneTaskExecutionAddress(address);
};

export class TaskDelegationEventPublisher {
  createActivatedEvent(entry: ActiveTaskDelegationRecordEntry): TeamRunEvent {
    const taskRun = entry.record.taskRun;
    if (!taskRun) throw new Error(`Task '${entry.record.taskId}' has no durable task run.`);
    return Object.freeze({
      eventSourceType: TeamRunEventSourceType.TASK_DELEGATION,
      executionAddress: taskExecutionAddress(entry),
      payload: Object.freeze({
        eventType: "TASK_DELEGATION_ACTIVATED",
        details: Object.freeze({
          taskId: entry.record.taskId,
          senderAddress: cloneTaskExecutionAddress(entry.record.senderAddress),
          content: entry.record.content,
          referenceFiles: Object.freeze(entry.record.referenceFiles.map((reference) => Object.freeze({ ...reference }))),
          createdAt: entry.record.createdAt,
          startedAt: taskRun.startedAt,
        }),
      }),
    });
  }

  publishResultSubmitted(input: {
    teamRun: TeamRun;
    entry: ActiveTaskDelegationRecordEntry;
    submission: TaskResultSubmission;
  }): void {
    this.publish(input.teamRun, taskExecutionAddress(input.entry), {
      eventType: "TASK_DELEGATION_RESULT_SUBMITTED",
      details: Object.freeze({
        taskId: input.entry.record.taskId,
        submissionId: input.submission.submissionId,
        submittedAt: input.submission.createdAt,
      }),
    });
  }

  publishResultReviewed(input: {
    teamRun: TeamRun;
    entry: ActiveTaskDelegationRecordEntry;
    review: TaskResultReview;
  }): void {
    this.publish(input.teamRun, taskExecutionAddress(input.entry), {
      eventType: "TASK_DELEGATION_RESULT_REVIEWED",
      details: Object.freeze({
        taskId: input.entry.record.taskId,
        reviewId: input.review.reviewId,
        reviewedSubmissionId: input.review.reviewedSubmissionId,
        decision: input.review.decision,
        reviewedAt: input.review.createdAt,
      }),
    });
  }

  private publish(
    teamRun: TeamRun,
    executionAddress: ActiveTaskDelegationRecordEntry["record"]["senderAddress"],
    payload: TeamRunTaskDelegationEvent,
  ): void {
    teamRun.publishEvent({
      eventSourceType: TeamRunEventSourceType.TASK_DELEGATION,
      executionAddress,
      payload,
    });
  }
}
