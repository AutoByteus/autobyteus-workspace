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
  | 'AGENT_STATUS'
  | 'AGENT_COMMAND_ACK'
  | 'COMPACTION_STATUS'
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
  | 'TASK_PLAN_EVENT'
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

export interface SegmentStartPayload {
  id: string;
  turn_id: string | null;
  segment_type: SegmentType;
  agent_id?: string;
  agent_name?: string;
  member_route_key?: string;
  member_path?: string[];
  source_route_key?: string;
  source_path?: string[];
  metadata?: Record<string, any>;
}

export interface SegmentContentPayload {
  id: string;
  turn_id: string | null;
  delta: string;
  segment_type?: SegmentType;
  agent_id?: string;
  agent_name?: string;
  member_route_key?: string;
  member_path?: string[];
  source_route_key?: string;
  source_path?: string[];
}

export interface SegmentEndPayload {
  id: string;
  turn_id: string | null;
  agent_id?: string;
  agent_name?: string;
  member_route_key?: string;
  member_path?: string[];
  source_route_key?: string;
  source_path?: string[];
  metadata?: Record<string, any>;
  interrupted?: boolean;
  reason?: string | null;
  failed?: boolean;
  error?: string | null;
}

export interface AgentStatusPayload {
  status: 'offline' | 'initializing' | 'idle' | 'running' | 'error';
  can_interrupt: boolean;
  agent_id?: string;
  agent_name?: string;
  member_route_key?: string;
  member_path?: string[];
  source_route_key?: string;
  source_path?: string[];
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

export interface ToolApprovalRequestedPayload {
  invocation_id: string;
  tool_name: string;
  turn_id: string | null;
  arguments: Record<string, any>;
  approval_token?: ToolApprovalTokenPayload;
  agent_name?: string;
  agent_id?: string;
  member_route_key?: string;
  member_path?: string[];
  source_route_key?: string;
  source_path?: string[];
}

export interface ToolApprovedPayload {
  invocation_id: string;
  tool_name: string;
  turn_id: string | null;
  reason?: string | null;
  agent_name?: string;
  agent_id?: string;
}

export interface ToolDeniedPayload {
  invocation_id: string;
  tool_name: string;
  turn_id: string | null;
  arguments?: Record<string, any>;
  reason?: string | null;
  error?: string | null;
  agent_name?: string;
  agent_id?: string;
}

export interface ToolApprovalTokenPayload {
  teamRunId: string;
  invocationId: string;
  invocationVersion: number;
  targetMemberRouteKey?: string;
  targetMemberPath?: string[];
}

export interface ToolExecutionStartedPayload {
  invocation_id: string;
  tool_name: string;
  turn_id: string | null;
  arguments?: Record<string, any>;
  agent_name?: string;
  agent_id?: string;
}

export interface ToolExecutionSucceededPayload {
  invocation_id: string;
  tool_name: string;
  turn_id: string | null;
  arguments?: Record<string, any>;
  result?: any;
  agent_name?: string;
  agent_id?: string;
}

export interface ToolExecutionFailedPayload {
  invocation_id: string;
  tool_name: string;
  turn_id: string | null;
  arguments?: Record<string, any>;
  error: string;
  agent_name?: string;
  agent_id?: string;
}

export interface ToolExecutionInterruptedPayload {
  invocation_id: string;
  tool_name: string;
  turn_id: string | null;
  arguments?: Record<string, any>;
  reason: string;
  agent_name?: string;
  agent_id?: string;
}

export interface ToolLogPayload {
  log_entry: string;
  tool_invocation_id: string;
  tool_name: string;
  turn_id: string | null;
  agent_name?: string;
  agent_id?: string;
}

export interface AssistantCompletePayload {
  content?: string | null;
  reasoning?: string | null;
  usage?: Record<string, any>;
  image_urls?: string[];
  audio_urls?: string[];
  video_urls?: string[];
  agent_name?: string;
  agent_id?: string;
}

export interface TurnLifecyclePayload {
  turn_id: string | null;
  reason?: string | null;
  interrupted?: boolean;
  agent_name?: string;
  agent_id?: string;
}

export interface TodoItem {
  todo_id: string;
  description: string;
  status: string;
}

export interface TodoListUpdatePayload {
  todos: TodoItem[];
  agent_name?: string;
  agent_id?: string;
}

export interface TaskPlanDeliverablePayload {
  file_path: string;
  summary: string;
  author_agent_name: string;
  timestamp?: string;
}

export interface TaskPlanTaskPayload {
  task_id: string;
  task_name: string;
  assignee_name: string;
  description: string;
  dependencies: string[];
  file_deliverables?: TaskPlanDeliverablePayload[];
}

export interface TaskPlanEventPayload {
  event_type: 'TASKS_CREATED' | 'TASK_STATUS_UPDATED' | string;
  team_id?: string;
  tasks?: TaskPlanTaskPayload[];
  task_id?: string;
  new_status?: string;
  agent_name?: string;
  deliverables?: TaskPlanDeliverablePayload[];
  sub_team_node_name?: string | null;
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

export interface InterAgentMessagePayload {
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
  agent_name?: string;
  agent_id?: string;
}

export interface SystemTaskNotificationPayload {
  sender_id: string;
  content: string;
  agent_name?: string;
  agent_id?: string;
}

export interface ArtifactPersistedPayload {
  id: string;
  runId: string;
  path: string;
  type: 'file' | 'image' | 'audio' | 'video' | 'pdf' | 'csv' | 'excel' | 'other';
  status: 'available';
  description?: string | null;
  revisionId: string;
  createdAt: string;
  updatedAt: string;
  agent_id?: string;
  agent_name?: string;
}

export interface FileChangePayload {
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
  agent_id?: string;
  agent_name?: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

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
  | { type: 'AGENT_STATUS'; payload: AgentStatusPayload }
  | { type: 'AGENT_COMMAND_ACK'; payload: AgentCommandAckPayload }
  | { type: 'COMPACTION_STATUS'; payload: CompactionStatusPayload }
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
  | { type: 'TASK_PLAN_EVENT'; payload: TaskPlanEventPayload }
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
