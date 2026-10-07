import type {
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
  /** Display name of the AgentRun that started a delegated child row; null for other rows. */
  readonly delegatedBy: string | null;
  readonly currentStatus: AgentStatus | null;
  readonly focusable: boolean;
  readonly expandable: boolean;
  readonly coordinator: boolean;
  /** A collaborator Team row: the tree opens it once when it appears (F-02). */
  readonly opensOnAppear?: boolean;
}

export interface TeamAgentContextEntry {
  readonly agentRunId: string;
  readonly memberAddress: AgentTeamAddress;
  readonly agentContext: AgentContext;
}

export interface TeamAgentExecutionLocation {
  readonly agentRunId: string;
  readonly memberAddress: AgentTeamAddress;
  readonly containingTeamRunId: string;
}

export type TeamAgentStreamMessage = Exclude<TeamStreamServerMessage,
  | { type: 'CONNECTED' | 'TEAM_RUN_LIFECYCLE' | 'TEAM_EXECUTION_VIEW_SNAPSHOT' }
  | { type: 'AGENT_COMMAND_ACK' | 'TASK_EXECUTION_STARTED' | 'TASK_EXECUTIONS_CLOSED' | 'TASK_EXECUTIONS_REOPENED' | 'TEAM_COMMUNICATION_MESSAGE' | 'COLLABORATOR_ADDED' }>;

export type TeamExecutionEffect =
  | Readonly<{ kind: 'dispatch_agent'; agentRunId: string; message: TeamAgentStreamMessage }>
  | Readonly<{ kind: 'record_team_token_usage'; agentRunId: string; details: TeamTokenUsageDetails }>
  | Readonly<{ kind: 'reconcile_team_navigation' }>
  /** The run's collaborators changed; the `@` candidates of this root are stale. */
  | Readonly<{ kind: 'collaborators_changed' }>
  | Readonly<{ kind: 'invalidate_team_member_projection'; agentRunIds: readonly string[] }>
  | Readonly<{ kind: 'invalidate_team_member_projections' }>
  | Readonly<{ kind: 'reconcile_focused_team_member_projection' }>
  | Readonly<{ kind: 'team_stream_recovery_required' }>;

export type TeamExecutionApplyResult =
  | Readonly<{ disposition: 'applied' | 'unchanged'; effects: readonly TeamExecutionEffect[] }>
  | Readonly<{ disposition: 'rejected'; code: string; message: string; effects: readonly TeamExecutionEffect[] }>;

export interface TeamExecutionViewSnapshotSeed {
  readonly rootTeamRunId: string;
  readonly baseChangeSequence: number;
  readonly executionTree: TeamRunExecutionTreeDto;
  readonly messages: readonly TeamCommunicationMessageDto[];
  readonly rootActive: boolean;
}
