import type {
  TeamStreamServerMessage,
} from '@autobyteus/team-stream-contracts';
import type { CollaborationParticipantMessageDto, RunTreeChangeDto } from '@autobyteus/collaboration-stream-contracts';
import type { RootContextRebuild } from '~/services/collaborationMessages/collaborationParticipantMessages';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress';
import type { TeamTokenUsageDetails } from '~/types/tokenUsageMeter';

/** A Team view's own rows: the Team and its members (the runs it delegated are its tree's rows, SR-084). */
export type TeamExecutionRowKind = 'configured_team' | 'configured_agent';

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
  readonly currentStatus: AgentStatus | null;
  /** The member's running background tasks, from its status (autobyteus-448); 0 for a team row. */
  readonly backgroundTasksRunning: number;
  readonly focusable: boolean;
  readonly expandable: boolean;
  readonly coordinator: boolean;
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

/** One member's message; a SEGMENT_CONTENT_BATCH is applied as one SEGMENT_CONTENT per item. */
export type TeamAgentStreamMessage = Exclude<TeamStreamServerMessage,
  | { type: 'CONNECTED' | 'TEAM_RUN_LIFECYCLE' | 'TEAM_EXECUTION_VIEW_SNAPSHOT' | 'SEGMENT_CONTENT_BATCH' }
  | { type: 'AGENT_COMMAND_ACK' | 'TEAM_COMMUNICATION_MESSAGE' | 'RUN_TREE_SNAPSHOT' | 'RUN_TREE_CHANGED' }>;

export type TeamExecutionEffect =
  | Readonly<{ kind: 'dispatch_agent'; agentRunId: string; message: TeamAgentStreamMessage }>
  | Readonly<{ kind: 'record_team_token_usage'; agentRunId: string; details: TeamTokenUsageDetails }>
  | Readonly<{ kind: 'reconcile_team_navigation' }>
  | Readonly<{ kind: 'invalidate_team_member_projection'; agentRunIds: readonly string[] }>
  | Readonly<{ kind: 'invalidate_team_member_projections' }>
  | Readonly<{ kind: 'reconcile_focused_team_member_projection' }>
  | Readonly<{ kind: 'team_stream_recovery_required' }>
  /** A live message for the Team tab's lists (autobyteus-358). */
  | Readonly<{ kind: 'append_collaboration_message'; message: CollaborationParticipantMessageDto }>
  /** The view was rebuilt from a snapshot: the Team tab's lists load again when a message could have been missed. */
  | Readonly<{ kind: 'reload_collaboration_messages'; rebuild: RootContextRebuild }>
  /** A snapshot of the view the lists were loaded with: they hold, and follow its live sequence from its base. */
  | Readonly<{ kind: 'adopt_collaboration_messages'; rebuild: RootContextRebuild }>
  /** The Team's tree changed (autobyteus-461 SR-084), numbered in the view's sequence. */
  | Readonly<{ kind: 'apply_run_tree_change'; change: RunTreeChangeDto }>;

export type TeamExecutionApplyResult =
  | Readonly<{ disposition: 'applied' | 'unchanged'; effects: readonly TeamExecutionEffect[] }>
  | Readonly<{ disposition: 'rejected'; code: string; message: string; effects: readonly TeamExecutionEffect[] }>;

