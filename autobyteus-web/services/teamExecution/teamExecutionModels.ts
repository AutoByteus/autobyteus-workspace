import type { ApplicationExecutionContext } from '@autobyteus/application-sdk-contracts';
import type { TeamStreamServerMessage } from '@autobyteus/team-stream-contracts';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentStatus } from '~/types/agent/AgentStatus';
import type { TeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import type { TeamReferenceFile } from '~/types/teamReferenceFile';
import type { TeamTokenUsageDetails } from '~/types/tokenUsageMeter';

export type TeamExecutionKind =
  | 'persistent_team'
  | 'persistent_agent'
  | 'task_agent'
  | 'task_team'
  | 'task_team_agent';

export interface TeamExecutionSummary {
  readonly kind: TeamExecutionKind;
  readonly executionAddress: TeamExecutionAddress;
  readonly focusable: boolean;
  readonly taskId: string | null;
  readonly currentStatus: AgentStatus | string | null;
  readonly isActive: boolean | null;
}

export interface TeamExecutionNavigationRow extends TeamExecutionSummary {
  readonly displayName: string;
  readonly depth: number;
  readonly hasChildren: boolean;
  readonly parentExecutionAddress: TeamExecutionAddress | null;
}

export type TeamTaskProjectionStatus = 'active' | 'awaiting_review' | 'accepted';

export type TeamTaskUpdateProjection =
  | Readonly<{
      kind: 'submission';
      submissionId: string;
      senderAddress: TeamExecutionAddress;
      receiverAddress: TeamExecutionAddress;
      content: string;
      createdAt: string;
      referenceFiles: readonly TeamReferenceFile[];
    }>
  | Readonly<{
      kind: 'review';
      reviewId: string;
      senderAddress: TeamExecutionAddress;
      receiverAddress: TeamExecutionAddress;
      reviewedSubmissionId: string;
      decision: 'accept' | 'request_revision';
      content: string | null;
      createdAt: string;
      referenceFiles: readonly TeamReferenceFile[];
    }>;

export interface TeamTaskProjection {
  readonly taskId: string;
  readonly executionAddress: TeamExecutionAddress;
  readonly status: TeamTaskProjectionStatus;
  readonly senderAddress: TeamExecutionAddress;
  readonly content: string;
  readonly referenceFiles: readonly TeamReferenceFile[];
  readonly createdAt: string;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly updates: readonly TeamTaskUpdateProjection[];
}

export interface TeamTaskProjectionSnapshot {
  readonly kind: 'complete_root_task_snapshot';
  readonly tasks: readonly TeamTaskProjection[];
}

export interface TeamTaskHistoryRow extends TeamTaskProjection {
  readonly label: string;
}

export interface TeamAgentContextEntry {
  readonly executionAddress: TeamExecutionAddress;
  readonly agentContext: AgentContext;
}

export interface TeamApplicationExecutionView {
  readonly applicationExecutionContext: ApplicationExecutionContext | null;
}

export type TeamAgentStreamMessage = Exclude<TeamStreamServerMessage,
  | { type: 'CONNECTED' | 'TEAM_RUN_LIFECYCLE' | 'AGENT_COMMAND_ACK' | 'TASK_DELEGATION_EVENT' | 'TEAM_COMMUNICATION_MESSAGE' }
  | { type: 'TOKEN_USAGE_UPDATED' }>;

export type TeamExecutionProjectionMessage = Exclude<TeamStreamServerMessage,
  { type: 'CONNECTED' | 'TEAM_RUN_LIFECYCLE' | 'AGENT_COMMAND_ACK' | 'TEAM_COMMUNICATION_MESSAGE' }>;

export type TeamExecutionEffect =
  | Readonly<{
      kind: 'dispatch_agent';
      executionAddress: TeamExecutionAddress;
      message: TeamAgentStreamMessage;
    }>
  | Readonly<{
      kind: 'record_team_token_usage';
      executionAddress: TeamExecutionAddress;
      details: TeamTokenUsageDetails;
    }>
  | Readonly<{ kind: 'refresh_task_records' }>;

export type TeamExecutionApplyResult =
  | Readonly<{ disposition: 'applied' | 'unchanged'; effects: readonly TeamExecutionEffect[] }>
  | Readonly<{
      disposition: 'rejected';
      code: string;
      message: string;
      effects: readonly [];
    }>;
