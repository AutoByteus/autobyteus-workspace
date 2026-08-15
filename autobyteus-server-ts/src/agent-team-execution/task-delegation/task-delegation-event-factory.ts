import { TeamRunEventSourceType, type TeamRunEvent } from "../domain/team-run-event.js";
import type {
  TaskDelegationRecordV1,
  TaskReview,
  TaskSubmission,
} from "./task-delegation-record-v1.js";

export const taskActivatedEvent = (task: TaskDelegationRecordV1): TeamRunEvent => ({
  eventSourceType: TeamRunEventSourceType.TASK_DELEGATION,
  taskExecution: task.taskExecution,
  payload: { eventType: "TASK_DELEGATION_ACTIVATED", details: {
    taskId: task.taskId,
    delegatorAgentRunId: task.delegatorAgentRunId,
    recipientAddress: task.recipientAddress,
    taskExecution: task.taskExecution,
    description: task.description,
    referenceFiles: task.referenceFiles,
    createdAt: task.createdAt,
  } },
});

export const taskSubmittedEvent = (
  task: TaskDelegationRecordV1,
  submission: TaskSubmission,
): TeamRunEvent => ({
  eventSourceType: TeamRunEventSourceType.TASK_DELEGATION,
  taskExecution: task.taskExecution,
  payload: {
    eventType: "TASK_DELEGATION_RESULT_SUBMITTED",
    details: {
      taskId: task.taskId,
      submissionId: submission.submissionId,
      submittedAt: submission.createdAt,
    },
  },
});

export const taskReviewedEvent = (
  task: TaskDelegationRecordV1,
  review: TaskReview,
): TeamRunEvent => ({
  eventSourceType: TeamRunEventSourceType.TASK_DELEGATION,
  taskExecution: task.taskExecution,
  payload: {
    eventType: "TASK_DELEGATION_RESULT_REVIEWED",
    details: {
      taskId: task.taskId,
      reviewId: review.reviewId,
      reviewedSubmissionId: review.reviewedSubmissionId,
      decision: review.decision,
      reviewedAt: review.createdAt,
    },
  },
});

export const taskSettledEvent = (
  task: TaskDelegationRecordV1,
  settledAt: string,
): TeamRunEvent => ({
  eventSourceType: TeamRunEventSourceType.TASK_DELEGATION,
  taskExecution: task.taskExecution,
  payload: {
    eventType: "TASK_DELEGATION_SETTLED",
    details: { taskId: task.taskId, settledAt },
  },
});
