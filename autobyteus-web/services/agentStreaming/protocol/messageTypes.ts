/**
 * Protocol layer - Message type definitions matching backend WebSocket protocol.
 *
 * These types mirror the backend protocol defined in:
 * autobyteus-server/docs/design/agent_websocket_streaming_protocol.md
 */

import type { AgentCommandAckPayload } from './agentCommandTypes';
export type { AgentCommandAckPayload } from './agentCommandTypes';
import type { CompactionStatusPayload } from './compactionTypes';
export type { CompactionStatusPayload } from './compactionTypes';
import type { ExternalUserMessagePayload } from './externalUserMessageTypes';
export type { ExternalUserMessageContextFilePathPayload, ExternalUserMessagePayload } from './externalUserMessageTypes';
import type { MemberInputMessagePayload } from './memberInputMessageTypes';
export type { MemberInputMessageContextFilePathPayload, MemberInputMessagePayload } from './memberInputMessageTypes';
export type { UserMessageContextFilePathPayload, UserMessageProjectionPayload } from './userMessagePayloadTypes';
import type { TeamStreamIdentityPayload } from './teamStreamIdentityTypes';
import type { TokenUsageUpdatedPayload as TokenUsageUpdatedPayloadBase } from '~/types/tokenUsageMeter';
export type { TaskAgentIdentityPayload, TeamStreamIdentityPayload } from './teamStreamIdentityTypes';

// ============================================================================
// Server → Client Message Types
// ============================================================================

export type ServerMessageType =
  | 'CONNECTED'
  | 'TURN_STARTED'
  | 'TURN_COMPLETED'
  | 'TURN_INTERRUPTED'
  | 'SEGMENT_START'
  | 'SEGMENT_CONTENT'
  | 'SEGMENT_END'
  | 'EXTERNAL_USER_MESSAGE'
  | 'MEMBER_INPUT_MESSAGE'
  | 'AGENT_STATUS'
  | 'AGENT_COMMAND_ACK'
  | 'COMPACTION_STATUS'
  | 'TOKEN_USAGE_UPDATED'
  | 'TEAM_STATUS'
  | 'TOOL_APPROVAL_REQUESTED'
  | 'TOOL_APPROVED'
  | 'TOOL_DENIED'
  | 'TOOL_EXECUTION_STARTED'
  | 'TOOL_EXECUTION_SUCCEEDED'
  | 'TOOL_EXECUTION_FAILED'
  | 'TOOL_EXECUTION_INTERRUPTED'
  | 'TOOL_LOG'
  | 'ASSISTANT_COMPLETE'
  | 'TODO_LIST_UPDATE'
  | 'TASK_DELEGATION_EVENT'
  | 'INTER_AGENT_MESSAGE'
  | 'TEAM_COMMUNICATION_MESSAGE'
  | 'SYSTEM_TASK_NOTIFICATION'
  | 'ARTIFACT_PERSISTED'
  | 'FILE_CHANGE'
  | 'ERROR';

export type SegmentType =
  | 'text'
  | 'tool_call'
  | 'write_file'
  | 'run_bash'
  | 'reasoning'
  | 'edit_file'
  | 'media';

// --- Payload Types ---

export interface ConnectedPayload {
  agent_id?: string;
  team_id?: string;
  session_id: string;
}

export interface SegmentStartPayload extends TeamStreamIdentityPayload {
  id: string;
  turn_id: string | null;
  segment_type: SegmentType;
  metadata?: Record<string, any>;
}

export interface SegmentContentPayload extends TeamStreamIdentityPayload {
  id: string;
  turn_id: string | null;
  delta: string;
  segment_type?: SegmentType;
}

export interface SegmentEndPayload extends TeamStreamIdentityPayload {
  id: string;
  turn_id: string | null;
  metadata?: Record<string, any>;
  interrupted?: boolean;
  reason?: string | null;
  failed?: boolean;
  error?: string | null;
}

export interface AgentStatusPayload extends TeamStreamIdentityPayload {
  status: 'offline' | 'initializing' | 'idle' | 'running' | 'error';
  can_interrupt: boolean;
  trigger?: string | null;
  tool_name?: string | null;
  error_message?: string | null;
  error_details?: string | null;
}

export interface TeamStatusPayload {
  status: 'offline' | 'initializing' | 'idle' | 'running' | 'error';
  error_message?: string | null;
  sub_team_node_name?: string | null;
  source_route_key?: string;
  source_path?: string[];
}

export interface ToolApprovalRequestedPayload extends TeamStreamIdentityPayload {
  invocation_id: string;
  tool_name: string;
  turn_id: string | null;
  arguments: Record<string, any>;
  approval_token?: ToolApprovalTokenPayload;
}

export interface ToolApprovedPayload extends TeamStreamIdentityPayload {
  invocation_id: string;
  tool_name: string;
  turn_id: string | null;
  reason?: string | null;
}

export interface ToolDeniedPayload extends TeamStreamIdentityPayload {
  invocation_id: string;
  tool_name: string;
  turn_id: string | null;
  arguments?: Record<string, any>;
  reason?: string | null;
  error?: string | null;
}

export interface ToolApprovalTokenPayload {
  teamRunId: string;
  invocationId: string;
  invocationVersion: number;
  targetMemberRouteKey?: string;
  targetMemberPath?: string[];
}

export interface ToolExecutionStartedPayload extends TeamStreamIdentityPayload {
  invocation_id: string;
  tool_name: string;
  turn_id: string | null;
  arguments?: Record<string, any>;
}

export interface ToolExecutionSucceededPayload extends TeamStreamIdentityPayload {
  invocation_id: string;
  tool_name: string;
  turn_id: string | null;
  arguments?: Record<string, any>;
  result?: any;
}

export interface ToolExecutionFailedPayload extends TeamStreamIdentityPayload {
  invocation_id: string;
  tool_name: string;
  turn_id: string | null;
  arguments?: Record<string, any>;
  error: string;
}

export interface ToolExecutionInterruptedPayload extends TeamStreamIdentityPayload {
  invocation_id: string;
  tool_name: string;
  turn_id: string | null;
  arguments?: Record<string, any>;
  reason: string;
}

export interface ToolLogPayload extends TeamStreamIdentityPayload {
  log_entry: string;
  tool_invocation_id: string;
  tool_name: string;
  turn_id: string | null;
}

export interface AssistantCompletePayload extends TeamStreamIdentityPayload {
  content?: string | null;
  reasoning?: string | null;
  usage?: Record<string, any>;
  image_urls?: string[];
  audio_urls?: string[];
  video_urls?: string[];
}

export interface TurnLifecyclePayload extends TeamStreamIdentityPayload {
  turn_id: string | null;
  reason?: string | null;
  interrupted?: boolean;
}

export interface TodoItem {
  todo_id: string;
  description: string;
  status: string;
}

export interface TodoListUpdatePayload extends TeamStreamIdentityPayload {
  todos: TodoItem[];
}

export interface TaskDelegationEventPayload extends TeamStreamIdentityPayload {
  event_type:
    | 'TASK_DELEGATION_ACTIVATED'
    | 'TASK_DELEGATION_STATUS_UPDATED'
    | 'TASK_DELEGATION_TERMINAL_STATUS'
    | string;
  teamRunId?: string;
  taskId?: string;
  taskIds?: string[];
  status?: string;
  message?: string | null;
  [key: string]: any;
}

export interface TeamCommunicationReferenceFilePayload {
  referenceId: string;
  path: string;
  type: 'file' | 'image' | 'audio' | 'video' | 'pdf' | 'csv' | 'excel' | 'other';
  createdAt: string;
  updatedAt: string;
}

export interface TeamCommunicationRepresentedSubTeamPayload {
  memberKind: 'agent_team';
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId: string;
  teamDefinitionId: string;
  childTeamRunId?: string | null;
  address: {
    teamRunId: string;
    memberPath: string[];
    memberRouteKey: string;
  };
}

export interface TeamCommunicationMessagePayload {
  messageId: string;
  teamRunId: string;
  senderRunId: string;
  senderMemberName?: string | null;
  senderMemberKind?: 'agent' | 'agent_team' | null;
  senderMemberPath?: string[] | null;
  senderMemberRouteKey?: string | null;
  senderRepresentedSubTeam?: TeamCommunicationRepresentedSubTeamPayload | null;
  receiverRunId: string;
  receiverMemberName?: string | null;
  receiverMemberKind?: 'agent' | 'agent_team' | null;
  receiverMemberPath?: string[] | null;
  receiverMemberRouteKey?: string | null;
  receiverRepresentedSubTeam?: TeamCommunicationRepresentedSubTeamPayload | null;
  content: string;
  messageType: string;
  createdAt: string;
  updatedAt: string;
  referenceFiles: TeamCommunicationReferenceFilePayload[];
  source_path?: string[];
  source_route_key?: string;
  sub_team_node_name?: string | null;
}

export interface InterAgentMessagePayload extends TeamStreamIdentityPayload {
  message_id?: string;
  team_run_id?: string;
  sender_agent_id: string;
  sender_agent_name?: string | null;
  receiver_run_id?: string;
  receiver_agent_name?: string | null;
  recipient_role_name: string;
  content: string;
  message_type: string;
  reference_files?: string[];
  reference_file_entries?: TeamCommunicationReferenceFilePayload[];
  created_at?: string;
  updated_at?: string;
}

export interface SystemTaskNotificationPayload extends TeamStreamIdentityPayload {
  sender_id: string;
  content: string;
}

export interface ArtifactPersistedPayload extends TeamStreamIdentityPayload {
  id: string;
  runId: string;
  path: string;
  type: 'file' | 'image' | 'audio' | 'video' | 'pdf' | 'csv' | 'excel' | 'other';
  status: 'available';
  description?: string | null;
  revisionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileChangePayload extends TeamStreamIdentityPayload {
  id: string;
  runId: string;
  path: string;
  type: 'file' | 'image' | 'audio' | 'video' | 'pdf' | 'csv' | 'excel' | 'other';
  status: 'streaming' | 'pending' | 'available' | 'failed';
  sourceTool: 'write_file' | 'edit_file' | 'generated_output';
  sourceInvocationId?: string | null;
  content?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ErrorPayload extends TeamStreamIdentityPayload {
  code: string;
  message: string;
}


export type TokenUsageUpdatedPayload =
  TokenUsageUpdatedPayloadBase
  & Omit<TeamStreamIdentityPayload, 'member_path' | 'member_route_key'>;

// --- Server Message Union ---

export type ServerMessage =
  | { type: 'CONNECTED'; payload: ConnectedPayload }
  | { type: 'TURN_STARTED'; payload: TurnLifecyclePayload }
  | { type: 'TURN_COMPLETED'; payload: TurnLifecyclePayload }
  | { type: 'TURN_INTERRUPTED'; payload: TurnLifecyclePayload }
  | { type: 'SEGMENT_START'; payload: SegmentStartPayload }
  | { type: 'SEGMENT_CONTENT'; payload: SegmentContentPayload }
  | { type: 'SEGMENT_END'; payload: SegmentEndPayload }
  | { type: 'EXTERNAL_USER_MESSAGE'; payload: ExternalUserMessagePayload }
  | { type: 'MEMBER_INPUT_MESSAGE'; payload: MemberInputMessagePayload }
  | { type: 'AGENT_STATUS'; payload: AgentStatusPayload }
  | { type: 'AGENT_COMMAND_ACK'; payload: AgentCommandAckPayload }
  | { type: 'COMPACTION_STATUS'; payload: CompactionStatusPayload }
  | { type: 'TOKEN_USAGE_UPDATED'; payload: TokenUsageUpdatedPayload }
  | { type: 'TEAM_STATUS'; payload: TeamStatusPayload }
  | { type: 'TOOL_APPROVAL_REQUESTED'; payload: ToolApprovalRequestedPayload }
  | { type: 'TOOL_APPROVED'; payload: ToolApprovedPayload }
  | { type: 'TOOL_DENIED'; payload: ToolDeniedPayload }
  | { type: 'TOOL_EXECUTION_STARTED'; payload: ToolExecutionStartedPayload }
  | { type: 'TOOL_EXECUTION_SUCCEEDED'; payload: ToolExecutionSucceededPayload }
  | { type: 'TOOL_EXECUTION_FAILED'; payload: ToolExecutionFailedPayload }
  | { type: 'TOOL_EXECUTION_INTERRUPTED'; payload: ToolExecutionInterruptedPayload }
  | { type: 'TOOL_LOG'; payload: ToolLogPayload }
  | { type: 'ASSISTANT_COMPLETE'; payload: AssistantCompletePayload }
  | { type: 'TODO_LIST_UPDATE'; payload: TodoListUpdatePayload }
  | { type: 'TASK_DELEGATION_EVENT'; payload: TaskDelegationEventPayload }
  | { type: 'INTER_AGENT_MESSAGE'; payload: InterAgentMessagePayload }
  | { type: 'TEAM_COMMUNICATION_MESSAGE'; payload: TeamCommunicationMessagePayload }
  | { type: 'SYSTEM_TASK_NOTIFICATION'; payload: SystemTaskNotificationPayload }
  | { type: 'ARTIFACT_PERSISTED'; payload: ArtifactPersistedPayload }
  | { type: 'FILE_CHANGE'; payload: FileChangePayload }
  | { type: 'ERROR'; payload: ErrorPayload };

// ============================================================================
// Client → Server Message Types
// ============================================================================

export type ClientMessageType =
  | 'SEND_MESSAGE'
  | 'INTERRUPT_GENERATION'
  | 'APPROVE_TOOL'
  | 'DENY_TOOL';

export interface SendMessagePayload {
  content: string;
  context_file_paths?: string[];
  image_urls?: string[];
  target_member_route_key?: string;
  target_member_path?: string[];
  targetMemberRouteKey?: string;
  targetMemberPath?: string[];
  message_id?: string;
  dedupe_key?: string;
}

export interface ToolActionPayload {
  invocation_id: string;
  member_route_key?: string;
  member_path?: string[];
  source_route_key?: string;
  source_path?: string[];
  memberRouteKey?: string;
  memberPath?: string[];
  sourceRouteKey?: string;
  sourcePath?: string[];
  target_member_route_key?: string;
  target_member_path?: string[];
  targetMemberRouteKey?: string;
  targetMemberPath?: string[];
  task_agent_run_id?: string;
  taskAgentRunId?: string;
  target_member_run_id?: string;
  targetMemberRunId?: string;
  reason?: string;
  approval_token?: ToolApprovalTokenPayload;
}

export interface InterruptGenerationPayload {
  target_member_route_key?: string;
  target_member_path?: string[];
  targetMemberRouteKey?: string;
  targetMemberPath?: string[];
  target_member_run_id?: string;
  targetMemberRunId?: string;
}

export type SendMessageClientMessage = {
  type: 'SEND_MESSAGE';
  payload: SendMessagePayload;
};

export type AgentInterruptGenerationClientMessage = {
  type: 'INTERRUPT_GENERATION';
};

export type TeamInterruptGenerationClientMessage = {
  type: 'INTERRUPT_GENERATION';
  payload: InterruptGenerationPayload;
};

export type ApproveToolClientMessage = {
  type: 'APPROVE_TOOL';
  payload: ToolActionPayload;
};

export type DenyToolClientMessage = {
  type: 'DENY_TOOL';
  payload: ToolActionPayload;
};

export type ClientMessage =
  | SendMessageClientMessage
  | AgentInterruptGenerationClientMessage
  | ApproveToolClientMessage
  | DenyToolClientMessage;

export type TeamClientMessage =
  | SendMessageClientMessage
  | TeamInterruptGenerationClientMessage
  | ApproveToolClientMessage
  | DenyToolClientMessage;

export type SerializableClientMessage = ClientMessage | TeamClientMessage;
