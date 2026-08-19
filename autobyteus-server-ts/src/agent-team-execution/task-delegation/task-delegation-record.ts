import type { TeamMemberExecutionIdentity } from "../domain/team-member-execution-identity.js";

export const TASK_DELEGATION_RECORDS_FILE_NAME = "task_delegation_records.json";

export type TaskDelegationContext = Readonly<{
  identity: TeamMemberExecutionIdentity;
}>;

export type DelegateTaskInput = Readonly<{
  recipient_address: string;
  description: string;
  reference_files?: string[];
}>;

export type SubmitTaskResultInput = Readonly<{
  message: string;
  reference_files?: string[];
}>;

export const TASK_RESULT_REVIEW_DECISIONS = ["accept", "request_revision"] as const;
export type TaskResultReviewDecision = (typeof TASK_RESULT_REVIEW_DECISIONS)[number];

export type ReviewTaskResultInput = Readonly<{
  task_id: string;
  decision: TaskResultReviewDecision;
  comment?: string | null;
  reference_files?: string[];
}>;

export type DelegateTaskResult =
  | Readonly<{ task_id: string; status: "active"; target_agent_run_id: string }>
  | Readonly<{ task_id: string; status: "not_started"; message: string }>;

export type SubmitTaskResultResult = Readonly<{
  task_id: string;
  status: "awaiting_review";
  message?: string;
}>;

export type ReviewTaskResultResult =
  | Readonly<{ task_id: string; status: "accepted"; message?: string }>
  | Readonly<{ task_id: string; status: "active"; message?: string }>;

export class TaskDelegationError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "TaskDelegationError";
  }
}
