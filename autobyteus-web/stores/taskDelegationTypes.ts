import type { ConversationTargetAddress } from '~/types/agent/ConversationTargetAddress';
import type { TeamReferenceFile } from '~/types/teamReferenceFile';

export type TaskDelegationStatus = 'active' | 'awaiting_review' | 'accepted';
export type TaskDelegationReceiverTargetKind = 'member' | 'team';

export interface TaskDelegationTaskRunReference {
  address: ConversationTargetAddress;
  startedAt: string;
}

export interface TaskDelegationSubmissionUpdate {
  kind: 'submission';
  submissionId: string;
  senderAddress: ConversationTargetAddress;
  receiverAddress: ConversationTargetAddress;
  content: string;
  referenceFiles: TeamReferenceFile[];
  createdAt: string;
}

export interface TaskDelegationReviewUpdate {
  kind: 'review';
  reviewId: string;
  senderAddress: ConversationTargetAddress;
  receiverAddress: ConversationTargetAddress;
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
  senderAddress: ConversationTargetAddress;
  receiverAddress: ConversationTargetAddress;
  receiverTargetKind: TaskDelegationReceiverTargetKind;
  content: string;
  referenceFiles: TeamReferenceFile[];
  taskRun: TaskDelegationTaskRunReference | null;
  updates: TaskDelegationUpdate[];
  createdAt: string;
}
