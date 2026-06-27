import type { AgentContext } from '~/types/agent/AgentContext';
import type { TeamMemberNode } from '~/types/agent/AgentTeamContext';

export type ConversationTargetMemberSegment = {
  kind: 'member';
  memberRouteKey?: string;
  memberPath?: string[];
};

export type ConversationTargetTaskTeamSegment = {
  kind: 'task_team';
  taskTeamRunId: string;
};

export type ConversationTargetTaskAgentSegment = {
  kind: 'task_agent';
  taskAgentRunId: string;
};

export type ConversationTargetSegment =
  | ConversationTargetMemberSegment
  | ConversationTargetTaskTeamSegment
  | ConversationTargetTaskAgentSegment;

export interface ConversationTargetAddress {
  parentTeamRunId?: string | null;
  segments: ConversationTargetSegment[];
}

export type ConversationTargetKind =
  | 'leaf_agent'
  | 'subteam'
  | 'task_agent'
  | 'task_team'
  | 'task_team_child';

export type ConversationTargetSource =
  | 'focused_member'
  | 'active_execution_safety_fallback';

export type ConversationTargetResolutionReason =
  | 'missing_focus'
  | 'missing_node'
  | 'missing_leaf_context'
  | 'subteam_without_leaf_context'
  | 'missing_runtime_identity'
  | 'task_agent_only_logical_member';

export interface ConversationTargetResolutionTarget {
  address: ConversationTargetAddress;
  conversationTargetKey: string;
  localTargetKey: string;
  memberRouteKey: string;
  node: TeamMemberNode;
  context: AgentContext | null;
  targetKind: ConversationTargetKind;
  source: ConversationTargetSource;
  displayLabel: string;
}

export interface ConversationTargetResolution {
  target: ConversationTargetResolutionTarget | null;
  focusedMemberRouteKey: string;
  reason: ConversationTargetResolutionReason | null;
}
