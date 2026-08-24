/**
 * Protocol layer - Message type definitions matching backend WebSocket protocol.
 *
 * These types mirror the backend protocol defined in:
 * autobyteus-server/docs/design/agent_websocket_streaming_protocol.md
 */

import type { AgentCommandAckPayload } from './agentCommandTypes';
import type { JsonValue } from '@autobyteus/team-stream-contracts';
export type {
  AgentCommandAckPayload,
  InterruptCommandTarget,
  InterruptGenerationCommandAckPayload,
  InterruptCommandTransportFailure,
  PendingInterruptCommand,
  SendMessageCommandAckPayload,
} from './agentCommandTypes';
import type { CompactionStatusPayload } from './compactionTypes';
export type { CompactionStatusPayload } from './compactionTypes';
import type { ExternalUserMessagePayload } from './externalUserMessageTypes';
export type { ExternalUserMessageContextFilePathPayload, ExternalUserMessagePayload } from './externalUserMessageTypes';
import type { MemberInputMessagePayload } from './memberInputMessageTypes';
export type { MemberInputMessageContextFilePathPayload, MemberInputMessagePayload } from './memberInputMessageTypes';
export type { UserMessageContextFilePathPayload, UserMessageProjectionPayload } from './userMessagePayloadTypes';
import type { TokenUsageUpdatedPayload as TokenUsageUpdatedPayloadBase } from '~/types/tokenUsageMeter';

// ============================================================================
// Server → Client Message Types
// ============================================================================

export type ServerMessageType =
  | 'CONNECTED'
  | 'SYSTEM_INSTRUCTIONS_SUPPLIED'
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
  | 'INTER_AGENT_MESSAGE'
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

export interface SystemInstructionsSuppliedPayload {
  trace_id: string;
  content: string;
  ts: number;
}

export interface SegmentStartPayload {
  id: string;
  turn_id: string;
  segment_type: SegmentType;
  metadata?: JsonValue;
}

export interface SegmentContentPayload {
  id: string;
  turn_id: string;
  delta: string;
  segment_type: SegmentType;
}

export interface SegmentEndPayload {
  id: string;
  turn_id: string;
  metadata?: JsonValue;
  interrupted?: boolean;
  reason?: string | null;
  failed?: boolean;
  error?: string | null;
}

export interface AgentStatusPayload {
  status: 'offline' | 'initializing' | 'idle' | 'running' | 'error';
  trigger?: string | null;
  tool_name?: string | null;
  error_message?: string | null;
  error_details?: string | null;
}

export interface ToolApprovalRequestedPayload {
  invocation_id: string;
  tool_name: string;
  turn_id: string | null;
  arguments: Record<string, any>;
}

export interface ToolApprovedPayload {
  invocation_id: string;
  tool_name: string;
  turn_id: string | null;
  reason?: string | null;
}

export interface ToolDeniedPayload {
  invocation_id: string;
  tool_name: string;
  turn_id: string | null;
  arguments?: Record<string, any>;
  reason?: string | null;
  error?: string | null;
}

export interface ToolExecutionStartedPayload {
  invocation_id: string;
  tool_name: string;
  turn_id: string | null;
  arguments?: Record<string, any>;
}

export interface ToolExecutionSucceededPayload {
  invocation_id: string;
  tool_name: string;
  turn_id: string | null;
  arguments?: Record<string, any>;
  result?: any;
}

export interface ToolExecutionFailedPayload {
  invocation_id: string;
  tool_name: string;
  turn_id: string | null;
  arguments?: Record<string, any>;
  error: string;
}

export interface ToolExecutionInterruptedPayload {
  invocation_id: string;
  tool_name: string;
  turn_id: string | null;
  arguments?: Record<string, any>;
  reason: string;
}

export interface ToolLogPayload {
  log_entry: string;
  tool_invocation_id: string;
  tool_name: string;
  turn_id: string | null;
}

export interface AssistantCompletePayload {
  content?: string | null;
  reasoning?: string | null;
  usage?: Record<string, any>;
  image_urls?: string[];
  audio_urls?: string[];
  video_urls?: string[];
}

export interface TurnLifecyclePayload {
  turn_id: string | null;
  reason?: string | null;
  interrupted?: boolean;
}

export interface TodoItem {
  todo_id: string;
  description: string;
  status: string;
}

export interface TodoListUpdatePayload {
  todos: TodoItem[];
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
  created_at?: string;
  updated_at?: string;
}

export interface SystemTaskNotificationPayload {
  sender_id: string;
  content: string;
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
}

export type ErrorPayload = Readonly<{ code: string; message: string }> & (
  | Readonly<{ error_scope: 'turn'; error_effect: 'diagnostic' | 'terminal'; turn_id: string }>
  | Readonly<{ error_scope: 'runtime'; error_effect: 'terminal'; turn_id: null }>
  | Readonly<{ error_scope: null; error_effect: null; turn_id: null }>
);


export type TokenUsageUpdatedPayload = TokenUsageUpdatedPayloadBase;

// --- Server Message Union ---

export type ServerMessage =
  | { type: 'CONNECTED'; payload: ConnectedPayload }
  | { type: 'SYSTEM_INSTRUCTIONS_SUPPLIED'; payload: SystemInstructionsSuppliedPayload }
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
  | { type: 'INTER_AGENT_MESSAGE'; payload: InterAgentMessagePayload }
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
  message_id?: string;
  dedupe_key?: string;
}

export interface ToolActionPayload {
  invocation_id: string;
  reason?: string;
}

export interface AgentInterruptGenerationPayload {
  command_id: string;
}

export type SendMessageClientMessage = {
  type: 'SEND_MESSAGE';
  payload: SendMessagePayload;
};

export type AgentInterruptGenerationClientMessage = {
  type: 'INTERRUPT_GENERATION';
  payload: AgentInterruptGenerationPayload;
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

export type SerializableClientMessage = ClientMessage;
