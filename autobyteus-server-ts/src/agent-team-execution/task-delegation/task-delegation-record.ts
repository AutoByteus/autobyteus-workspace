import type { TeamExecutionAddress } from "../domain/team-execution-address.js";
import type { ActiveTaskExecutionBinding } from "./active-task-execution-binding.js";
import type { TaskDelegationTarget } from "./task-delegation-target.js";
import type { MemberLogicalAddressContext } from "../domain/member-logical-address-context.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";

export const TASK_DELEGATION_RECORDS_FILE_NAME = "task_delegation_records.json";

export const TASK_DELEGATION_LEDGER_STATUSES = [
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

export type TaskDelegationCallerIdentity = {
  executionAddress: TeamExecutionAddress;
  agentRunId: string;
  taskId?: string | null;
};

export type TaskDelegationDelegatorIdentity = TaskDelegationCallerIdentity;

export type TaskDelegationContext = {
  teamRunId: string;
  teamDefinitionId?: string | null;
  teamName?: string | null;
  caller: TaskDelegationCallerIdentity;
  coordinatorAddress?: AgentTeamAddress | null;
  addressing: MemberLogicalAddressContext;
};

export type TaskDelegationTaskInput = {
  recipient_address: string;
  description: string;
  reference_files?: string[];
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

export type TaskDelegationReferenceFileType =
  | "file"
  | "image"
  | "audio"
  | "video"
  | "pdf"
  | "csv"
  | "excel"
  | "other";

export type TaskReferenceFile = {
  referenceId: string;
  path: string;
  type: TaskDelegationReferenceFileType;
  createdAt: string;
  updatedAt: string;
};

export type TaskDelegationReferenceFilePayload = TaskReferenceFile;

export type TaskRunReference = {
  address: TeamExecutionAddress;
  startedAt: string;
};

export type TaskSubmissionUpdate = {
  kind: "submission";
  submissionId: string;
  senderAddress: TeamExecutionAddress;
  receiverAddress: TeamExecutionAddress;
  content: string;
  referenceFiles: TaskReferenceFile[];
  createdAt: string;
};

export type TaskReviewUpdate = {
  kind: "review";
  reviewId: string;
  senderAddress: TeamExecutionAddress;
  receiverAddress: TeamExecutionAddress;
  reviewedSubmissionId: string;
  decision: TaskResultReviewDecision;
  content: string | null;
  referenceFiles: TaskReferenceFile[];
  createdAt: string;
};

export type TaskUpdate = TaskSubmissionUpdate | TaskReviewUpdate;

export type TaskDelegationRecord = {
  taskId: string;
  status: TaskDelegationStatus;
  senderAddress: TeamExecutionAddress;
  receiverAddress: TeamExecutionAddress;
  receiverTargetKind: "agent" | "agent_team";
  content: string;
  referenceFiles: TaskReferenceFile[];
  taskRun: TaskRunReference | null;
  updates: TaskUpdate[];
  createdAt: string;
};

export type TaskDelegationRecordsFile = {
  teamRunId: string;
  records: TaskDelegationRecord[];
};

export type TaskResultSubmission = TaskSubmissionUpdate & {
  message: string;
  submittedAt: string;
  execution: ActiveTaskExecutionBinding;
};

export type TaskResultReview = TaskReviewUpdate & {
  comment: string | null;
  reviewedAt: string;
  reviewer: TaskDelegationDelegatorIdentity;
};

export type TaskDelegationNotificationType =
  | "result_submitted"
  | "revision_requested";

export type TaskDelegationWarning = {
  code: "TASK_NOTIFICATION_DELIVERY_FAILED";
  notification_type: TaskDelegationNotificationType;
  task_id: string;
  target_member_address: string;
  target_task_agent_run_id?: string | null;
  target_task_team_run_id?: string | null;
  message: string;
};

export type TaskDelegationNotificationDeliveryOutcome = {
  notificationType: TaskDelegationNotificationType;
  delivered: boolean;
  targetMemberAddress: string;
  targetTaskAgentRunId?: string | null;
  targetTaskTeamRunId?: string | null;
  warning: TaskDelegationWarning | null;
};

export type TaskDelegationActivationResult = {
  target: { kind: TaskDelegationTarget["kind"]; address: string };
  accepted: boolean;
  task_id: string;
  message?: string | null;
};

export type DelegateTaskResult =
  | {
      task_id: string;
      status: "active";
    }
  | {
      task_id: string;
      status: "not_started";
      message: string;
    };

export type SubmitTaskResultResult = {
  task_id: string;
  status: "awaiting_review";
  message?: string;
};

export type ReviewTaskResultResult =
  | {
      task_id: string;
      status: "accepted";
    }
  | {
      task_id: string;
      status: "active";
      message?: string;
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
