import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { TaskAgentInstanceIdentity } from "../domain/task-agent-instance.js";

export const TASK_DELEGATION_LEDGER_STATUSES = [
  "not_started",
  "active",
  "awaiting_review",
  "accepted",
] as const;

export type TaskDelegationStatus =
  (typeof TASK_DELEGATION_LEDGER_STATUSES)[number];
export type TaskDelegationTerminalStatus = "accepted";

export const isTaskDelegationTerminalStatus = (
  status: TaskDelegationStatus,
): status is TaskDelegationTerminalStatus => status === "accepted";

export type TaskDelegationMemberIdentity = {
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId: string;
  runtimeKind?: RuntimeKind | null;
};

export type TaskDelegationCallerIdentity = TaskDelegationMemberIdentity & {
  taskAgentInstanceId?: string | null;
  taskAgentRunId?: string | null;
  taskId?: string | null;
  logicalMemberRouteKey?: string | null;
};

export type TaskDelegationDelegatorIdentity = TaskDelegationCallerIdentity;

export type TaskDelegationContext = {
  teamRunId: string;
  teamDefinitionId?: string | null;
  teamName?: string | null;
  caller: TaskDelegationCallerIdentity;
  coordinatorMemberRouteKey?: string | null;
  members: TaskDelegationMemberIdentity[];
};

export type TaskDelegationTaskInput = {
  member_name: string;
  description: string;
  reference_files?: string[];
};

export type DelegateTasksInput = {
  tasks: TaskDelegationTaskInput[];
};

export type SubmitTaskResultInput = {
  message: string;
  reference_files?: string[];
};

export const TASK_RESULT_REVIEW_DECISIONS = [
  "accept",
  "request_revision",
] as const;

export type TaskResultReviewDecision =
  (typeof TASK_RESULT_REVIEW_DECISIONS)[number];

export type ReviewTaskResultInput = {
  task_id: string;
  decision: TaskResultReviewDecision;
  message?: string | null;
  reference_files?: string[];
};

export type TaskResultSubmission = {
  submissionId: string;
  sequence: number;
  message: string;
  referenceFiles: string[];
  submittedAt: string;
  taskAgentRunId: string;
};

export type TaskResultReview = {
  reviewId: string;
  reviewedSubmissionId: string;
  decision: TaskResultReviewDecision;
  message: string | null;
  referenceFiles: string[];
  reviewer: TaskDelegationDelegatorIdentity;
  reviewedAt: string;
};

export type TaskDelegationNotificationType =
  | "result_submitted"
  | "revision_requested";

export type TaskDelegationWarning = {
  code: "TASK_NOTIFICATION_DELIVERY_FAILED";
  notification_type: TaskDelegationNotificationType;
  task_id: string;
  target_member_route_key: string;
  target_task_agent_run_id?: string | null;
  message: string;
};

export type TaskDelegationNotificationDeliveryOutcome = {
  notificationType: TaskDelegationNotificationType;
  delivered: boolean;
  targetMemberRouteKey: string;
  targetTaskAgentRunId?: string | null;
  warning: TaskDelegationWarning | null;
};

export type TaskDelegationRecord = {
  taskId: string;
  taskLabel: string;
  description: string;
  status: TaskDelegationStatus;
  member: TaskDelegationMemberIdentity;
  delegator: TaskDelegationDelegatorIdentity;
  referenceFiles: string[];
  taskAgentInstance: TaskAgentInstanceIdentity | null;
  targetAgentRunId: string | null;
  delegatorReplyRecipientName: string | null;
  delegatorReplyTargetAgentRunId: string | null;
  pendingSubmissionId: string | null;
  resultSubmissions: TaskResultSubmission[];
  resultReviews: TaskResultReview[];
  acceptanceMessage: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
  terminalAt: string | null;
};

export type TaskDelegationActivationResult = {
  memberName: string;
  taskCount: number;
  accepted: boolean;
  task_id: string;
  target_agent_run_id: string | null;
  message?: string | null;
};

export type TaskDelegationActivationPayload = {
  teamRunId: string;
  member: TaskDelegationMemberIdentity;
  taskAgentInstance: TaskAgentInstanceIdentity;
  taskIds: string[];
  tasks: Array<{
    taskId: string;
    taskLabel: string;
    status: TaskDelegationStatus;
    targetAgentRunId: string | null;
  }>;
  activatedAt: string;
};

export type TaskDelegationStatusUpdatePayload = {
  teamRunId: string;
  taskId: string;
  taskLabel: string;
  member: TaskDelegationMemberIdentity;
  delegator: TaskDelegationDelegatorIdentity;
  taskAgentInstance: TaskAgentInstanceIdentity | null;
  targetAgentRunId: string | null;
  previousStatus: TaskDelegationStatus;
  status: TaskDelegationStatus;
  pendingSubmissionId: string | null;
  latestSubmissionId: string | null;
  latestReviewId: string | null;
  reviewedSubmissionId: string | null;
  acceptanceMessage: string | null;
  acceptedAt: string | null;
  updatedAt: string;
  terminal: boolean;
};

export type DelegateTasksResult = {
  createdTasks: Array<{
    member_name: string;
    task_id: string;
    target_agent_run_id: string | null;
    status: TaskDelegationStatus;
  }>;
  activationResults: TaskDelegationActivationResult[];
};

export type TaskDelegationResultSubmittedPayload = {
  teamRunId: string;
  taskId: string;
  taskLabel: string;
  member: TaskDelegationMemberIdentity;
  delegator: TaskDelegationDelegatorIdentity;
  taskAgentInstance: TaskAgentInstanceIdentity | null;
  targetAgentRunId: string | null;
  previousStatus: TaskDelegationStatus;
  status: TaskDelegationStatus;
  submissionId: string;
  pendingSubmissionId: string | null;
  submittedAt: string;
  updatedAt: string;
};

export type TaskDelegationResultReviewedPayload = {
  teamRunId: string;
  taskId: string;
  taskLabel: string;
  member: TaskDelegationMemberIdentity;
  delegator: TaskDelegationDelegatorIdentity;
  taskAgentInstance: TaskAgentInstanceIdentity | null;
  targetAgentRunId: string | null;
  previousStatus: TaskDelegationStatus;
  status: TaskDelegationStatus;
  reviewId: string;
  reviewedSubmissionId: string;
  decision: TaskResultReviewDecision;
  reviewedAt: string;
  updatedAt: string;
  terminal: boolean;
};

export type SubmitTaskResultResult = {
  task_id: string;
  status: "awaiting_review";
  submission_id: string;
  notification_delivered: boolean;
  warnings: TaskDelegationWarning[];
};

export type ReviewTaskResultResult = {
  task_id: string;
  status: "active" | "accepted";
  decision: TaskResultReviewDecision;
  review_id: string;
  reviewed_submission_id: string;
  notification_delivered: boolean | null;
  settlement_requested: boolean;
  warnings: TaskDelegationWarning[];
};

export class TaskDelegationError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "TaskDelegationError";
  }
}
