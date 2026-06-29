import type { TaskTeamInstanceIdentity } from "../domain/task-team-instance.js";
import type { TaskExecutionInstance } from "./task-execution-instance.js";
import type {
  TaskDelegationContextMember,
  TaskDelegationMemberIdentity,
  TaskDelegationTarget,
} from "./task-delegation-target.js";

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

export type TaskDelegationCallerIdentity = TaskDelegationMemberIdentity & {
  taskAgentInstanceId?: string | null;
  taskAgentRunId?: string | null;
  taskId?: string | null;
  logicalMemberRouteKey?: string | null;
  taskTeamInstance?: TaskTeamInstanceIdentity | null;
};

export type TaskDelegationDelegatorIdentity = TaskDelegationCallerIdentity;

export type TaskDelegationContext = {
  teamRunId: string;
  teamDefinitionId?: string | null;
  teamName?: string | null;
  caller: TaskDelegationCallerIdentity;
  coordinatorMemberRouteKey?: string | null;
  members: TaskDelegationContextMember[];
};

export type DelegateTaskTargetInput = {
  kind: "member" | "team";
  name: string;
};

export type TaskDelegationTaskInput = {
  target: DelegateTaskTargetInput;
  description: string;
  reference_files?: string[];
};

export type TaskDelegationReferenceFileType =
  | "file"
  | "image"
  | "audio"
  | "video"
  | "pdf"
  | "csv"
  | "excel"
  | "other";

export type TaskDelegationReferenceFilePayload = {
  referenceId: string;
  path: string;
  type: TaskDelegationReferenceFileType;
  createdAt: string;
  updatedAt: string;
};

export type DelegateTaskInput = TaskDelegationTaskInput;

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
  comment?: string | null;
  reference_files?: string[];
};

export type TaskResultSubmission = {
  submissionId: string;
  sequence: number;
  message: string;
  referenceFiles: string[];
  submittedAt: string;
  execution: TaskExecutionInstance;
};

export type TaskResultReview = {
  reviewId: string;
  reviewedSubmissionId: string;
  decision: TaskResultReviewDecision;
  comment: string | null;
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
  target_task_team_run_id?: string | null;
  message: string;
};

export type TaskDelegationNotificationDeliveryOutcome = {
  notificationType: TaskDelegationNotificationType;
  delivered: boolean;
  targetMemberRouteKey: string;
  targetTaskAgentRunId?: string | null;
  targetTaskTeamRunId?: string | null;
  warning: TaskDelegationWarning | null;
};

export type TaskDelegationRecord = {
  taskId: string;
  taskLabel: string;
  description: string;
  status: TaskDelegationStatus;
  target: TaskDelegationTarget;
  delegator: TaskDelegationDelegatorIdentity;
  referenceFiles: string[];
  taskArguments: TaskDelegationTaskInput;
  execution: TaskExecutionInstance | null;
  delegatorReplyRecipientName: string | null;
  delegatorReplyTargetAgentRunId: string | null;
  pendingSubmissionId: string | null;
  resultSubmissions: TaskResultSubmission[];
  resultReviews: TaskResultReview[];
  acceptanceComment: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
  terminalAt: string | null;
};

export type TaskDelegationActivationResult = {
  target: { kind: TaskDelegationTarget["kind"]; name: string };
  accepted: boolean;
  task_id: string;
  execution_kind: TaskExecutionInstance["kind"] | null;
  task_agent_run_id: string | null;
  task_team_run_id: string | null;
  message?: string | null;
};

export type TaskDelegationActivationPayload = {
  teamRunId: string;
  target: TaskDelegationTarget;
  execution: TaskExecutionInstance;
  taskIds: string[];
  tasks: Array<{
    taskId: string;
    taskLabel: string;
    description: string;
    status: TaskDelegationStatus;
    referenceFiles: TaskDelegationReferenceFilePayload[];
    taskArguments: TaskDelegationTaskInput;
    executionKind: TaskExecutionInstance["kind"];
    executionRunId: string | null;
  }>;
  activatedAt: string;
};

export type TaskDelegationStatusUpdatePayload = {
  teamRunId: string;
  taskId: string;
  taskLabel: string;
  description: string;
  target: TaskDelegationTarget;
  delegator: TaskDelegationDelegatorIdentity;
  referenceFiles: TaskDelegationReferenceFilePayload[];
  taskArguments: TaskDelegationTaskInput;
  execution: TaskExecutionInstance | null;
  previousStatus: TaskDelegationStatus;
  status: TaskDelegationStatus;
  pendingSubmissionId: string | null;
  latestSubmissionId: string | null;
  latestReviewId: string | null;
  reviewedSubmissionId: string | null;
  acceptanceComment: string | null;
  acceptedAt: string | null;
  updatedAt: string;
  terminal: boolean;
};

export type DelegateTaskResult = {
  target: { kind: TaskDelegationTarget["kind"]; name: string };
  task_id: string;
  execution_kind: TaskExecutionInstance["kind"] | null;
  task_agent_run_id: string | null;
  task_team_run_id: string | null;
  status: TaskDelegationStatus;
  activation_accepted: boolean;
  message: string | null;
};

export type TaskDelegationResultSubmittedPayload = {
  teamRunId: string;
  taskId: string;
  taskLabel: string;
  description: string;
  target: TaskDelegationTarget;
  delegator: TaskDelegationDelegatorIdentity;
  referenceFiles: TaskDelegationReferenceFilePayload[];
  taskArguments: TaskDelegationTaskInput;
  execution: TaskExecutionInstance | null;
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
  description: string;
  target: TaskDelegationTarget;
  delegator: TaskDelegationDelegatorIdentity;
  referenceFiles: TaskDelegationReferenceFilePayload[];
  taskArguments: TaskDelegationTaskInput;
  execution: TaskExecutionInstance | null;
  previousStatus: TaskDelegationStatus;
  status: TaskDelegationStatus;
  reviewId: string;
  reviewedSubmissionId: string;
  decision: TaskResultReviewDecision;
  comment: string | null;
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

export type { TaskDelegationMemberIdentity } from "./task-delegation-target.js";
