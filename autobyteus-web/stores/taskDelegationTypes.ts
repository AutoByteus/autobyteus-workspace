import type { TeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import type { TeamReferenceFile } from '~/types/teamReferenceFile';

export type TaskDelegationStatus = 'active' | 'awaiting_review' | 'accepted';
export type TaskDelegationReceiverTargetKind = 'agent' | 'agent_team';

export interface TaskDelegationTaskRunReference {
  address: TeamExecutionAddress;
  startedAt: string;
}

export interface TaskDelegationSubmissionUpdate {
  kind: 'submission';
  submissionId: string;
  senderAddress: TeamExecutionAddress;
  receiverAddress: TeamExecutionAddress;
  content: string;
  referenceFiles: TeamReferenceFile[];
  createdAt: string;
}

export interface TaskDelegationReviewUpdate {
  kind: 'review';
  reviewId: string;
  senderAddress: TeamExecutionAddress;
  receiverAddress: TeamExecutionAddress;
  reviewedSubmissionId: string;
  decision: 'accept' | 'request_revision';
  content: string | null;
  referenceFiles: TeamReferenceFile[];
  createdAt: string;
}

export type TaskDelegationUpdate = TaskDelegationSubmissionUpdate | TaskDelegationReviewUpdate;

export interface TaskDelegationRecord {
  taskId: string;
  status: TaskDelegationStatus;
  senderAddress: TeamExecutionAddress;
  receiverAddress: TeamExecutionAddress;
  receiverTargetKind: TaskDelegationReceiverTargetKind;
  content: string;
  referenceFiles: TeamReferenceFile[];
  taskRun: TaskDelegationTaskRunReference | null;
  updates: TaskDelegationUpdate[];
  createdAt: string;
}
