import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";

export type TaskExecutionReference =
  | Readonly<{ agentRunId: string }>
  | Readonly<{ teamRunId: string }>;

export type TaskDelegationStatus =
  | "active"
  | "awaiting_review"
  | "accepted"
  | "interrupted";

export type TaskSubmission = Readonly<{
  submissionId: string;
  message: string;
  referenceFiles: readonly string[];
  createdAt: string;
}>;

export type TaskReview = Readonly<{
  reviewId: string;
  reviewedSubmissionId: string;
  decision: "accept" | "request_revision";
  comment: string | null;
  referenceFiles: readonly string[];
  createdAt: string;
}>;

export type TaskInterruption = Readonly<{
  interruptionId: string;
  reason: string;
  createdAt: string;
}>;

export type TaskUpdate = TaskSubmission | TaskReview | TaskInterruption;

export type TaskDelegationRecordV1 = Readonly<{
  taskId: string;
  delegatorAgentRunId: string;
  recipientAddress: AgentTeamAddress;
  taskExecution: TaskExecutionReference;
  description: string;
  referenceFiles: readonly string[];
  status: TaskDelegationStatus;
  updates: readonly TaskUpdate[];
  createdAt: string;
}>;

export type TaskDelegationRecordsFileV1 = Readonly<{
  schemaVersion: 1;
  rootTeamRunId: string;
  records: readonly TaskDelegationRecordV1[];
}>;

export type TaskDelegationRecordsSnapshot = TaskDelegationRecordsFileV1;

export const isAgentTaskExecutionReference = (
  value: TaskExecutionReference,
): value is Readonly<{ agentRunId: string }> => "agentRunId" in value;
