import type {
  TaskDelegationRecordDto,
  TeamCommunicationMessageDto,
  TeamRunExecutionTreeDto,
  TeamStreamServerMessage,
} from '@autobyteus/team-stream-contracts';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress';
import type { TeamTokenUsageDetails } from '~/types/tokenUsageMeter';

export type TeamExecutionRowKind =
  | 'configured_team'
  | 'configured_agent'
  | 'task_agent'
  | 'task_team'
  | 'task_team_member'
  | 'task_team_agent';

export interface TeamExecutionNavigationRow {
  readonly key: string;
  readonly kind: TeamExecutionRowKind;
  readonly address: AgentTeamAddress;
  readonly displayName: string;
  readonly accessibleName: string;
  readonly depth: number;
  readonly parentKey: string | null;
  readonly agentRunId: string | null;
  readonly teamRunId: string | null;
  readonly taskId: string | null;
  readonly taskStatus: TaskDelegationRecordDto['status'] | null;
  readonly currentStatus: AgentStatus | null;
  readonly focusable: boolean;
  readonly expandable: boolean;
  readonly coordinator: boolean;
}

export interface TeamAgentContextEntry {
  readonly agentRunId: string;
  readonly memberAddress: AgentTeamAddress;
  readonly agentContext: AgentContext;
}

export interface TeamTaskHistoryRow {
  readonly task: TaskDelegationRecordDto;
  readonly label: string;
  readonly targetKind: 'agent' | 'agent_team';
  readonly targetAgentRunId: string | null;
  readonly targetTeamRunId: string | null;
  readonly targetAddress: AgentTeamAddress;
  readonly delegatorAgentRunId: string;
}

export type TeamAgentStreamMessage = Exclude<TeamStreamServerMessage,
  | { type: 'CONNECTED' | 'TEAM_RUN_LIFECYCLE' | 'TEAM_EXECUTION_VIEW_SNAPSHOT' }
  | { type: 'AGENT_COMMAND_ACK' | 'TASK_DELEGATION_EVENT' | 'TEAM_COMMUNICATION_MESSAGE' }>;

export type TeamExecutionEffect =
  | Readonly<{ kind: 'dispatch_agent'; agentRunId: string; message: TeamAgentStreamMessage }>
  | Readonly<{ kind: 'record_team_token_usage'; agentRunId: string; details: TeamTokenUsageDetails }>
  | Readonly<{ kind: 'team_stream_recovery_required' }>;

export type TeamExecutionApplyResult =
  | Readonly<{ disposition: 'applied' | 'unchanged'; effects: readonly TeamExecutionEffect[] }>
  | Readonly<{ disposition: 'rejected'; code: string; message: string; effects: readonly TeamExecutionEffect[] }>;

export interface TeamExecutionViewSnapshotSeed {
  readonly rootTeamRunId: string;
  readonly baseChangeSequence: number;
  readonly executionTree: TeamRunExecutionTreeDto;
  readonly tasks: readonly TaskDelegationRecordDto[];
  readonly messages: readonly TeamCommunicationMessageDto[];
  readonly rootActive: boolean;
}
