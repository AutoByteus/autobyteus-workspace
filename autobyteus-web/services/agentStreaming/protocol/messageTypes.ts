/**
 * Protocol layer - Message type definitions matching backend WebSocket protocol.
 * 
 * These types mirror the backend protocol defined in:
 * autobyteus-server/docs/design/agent_websocket_streaming_protocol.md
 */

// ============================================================================
// Server → Client Message Types
// ============================================================================

export type ServerMessageType =
  | 'CONNECTED'
  | 'SEGMENT_START'
  | 'SEGMENT_CONTENT'
  | 'SEGMENT_END'
  | 'AGENT_STATUS'
  | 'TEAM_STATUS'
  | 'TOOL_APPROVAL_REQUESTED'
  | 'TOOL_APPROVED'
  | 'TOOL_DENIED'
  | 'TOOL_EXECUTION_STARTED'
  | 'TOOL_EXECUTION_SUCCEEDED'
  | 'TOOL_EXECUTION_FAILED'
  | 'TOOL_LOG'
  | 'ASSISTANT_COMPLETE'
  | 'TODO_LIST_UPDATE'
  | 'TASK_PLAN_EVENT'
  | 'INTER_AGENT_MESSAGE'
  | 'SYSTEM_TASK_NOTIFICATION'
  | 'ARTIFACT_PERSISTED'
  | 'ARTIFACT_UPDATED'
  | 'ERROR';

export type SegmentType = 
  | 'text' 
  | 'tool_call' 
  | 'write_file'
  | 'run_bash'
  | 'reasoning'
  | 'edit_file'
  | 'media';

export type EventScope = 'member_scoped' | 'team_scoped';

export interface TeamStreamEventEnvelopePayload {
  team_run_id: string;
  run_version: string | number;
  sequence: number;
  source_node_id: string;
  origin: 'local' | 'remote';
  event_type: string;
  received_at: string;
}

export interface TeamStreamRoutingMetadata {
  event_scope?: EventScope;
  member_route_key?: string;
  team_stream_event_envelope?: TeamStreamEventEnvelopePayload;
}

// --- Payload Types ---

export interface ConnectedPayload {
  agent_id?: string;
  team_id?: string;
  session_id: string;
}

export interface SegmentStartPayload {
  id: string;
  segment_type: SegmentType;
  agent_id?: string;
  agent_name?: string;
  metadata?: Record<string, any>;
}

export interface SegmentContentPayload {
  id: string;
  delta: string;
  agent_id?: string;
  agent_name?: string;
}

export interface SegmentEndPayload {
  id: string;
  agent_id?: string;
  agent_name?: string;
  metadata?: Record<string, any>;
}

export interface AgentStatusPayload {
  new_status: string;
  old_status?: string | null;
  agent_id?: string;
  agent_name?: string;
  trigger?: string | null;
  tool_name?: string | null;
  error_message?: string | null;
  error_details?: string | null;
}

export interface TeamStatusPayload {
  new_status: string;
  old_status?: string | null;
  error_message?: string | null;
  sub_team_node_name?: string | null;
}

export interface ToolApprovalRequestedPayload {
  invocation_id: string;
  tool_name: string;
  turn_id?: string | null;
  arguments: Record<string, any>;
  approval_token?: ToolApprovalTokenPayload;
  agent_name?: string;
  agent_id?: string;
}

export interface ToolApprovedPayload {
  invocation_id: string;
  tool_name: string;
  turn_id?: string | null;
  reason?: string | null;
  agent_name?: string;
  agent_id?: string;
}

export interface ToolDeniedPayload {
  invocation_id: string;
  tool_name: string;
  turn_id?: string | null;
  reason?: string | null;
  error?: string | null;
  agent_name?: string;
  agent_id?: string;
}

export interface ToolApprovalTokenPayload {
  teamRunId: string;
  runVersion: number;
  invocationId: string;
  invocationVersion: number;
  targetMemberName: string;
}

export interface ToolExecutionStartedPayload {
  invocation_id: string;
  tool_name: string;
  turn_id?: string | null;
  arguments?: Record<string, any>;
  agent_name?: string;
  agent_id?: string;
}

export interface ToolExecutionSucceededPayload {
  invocation_id: string;
  tool_name: string;
  turn_id?: string | null;
  result?: any;
  agent_name?: string;
  agent_id?: string;
}

export interface ToolExecutionFailedPayload {
  invocation_id: string;
  tool_name: string;
  turn_id?: string | null;
  error: string;
  agent_name?: string;
  agent_id?: string;
}

export interface ToolLogPayload {
  log_entry: string;
  tool_invocation_id: string;
  tool_name: string;
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

export interface InterAgentMessagePayload {
  sender_agent_id: string;
  recipient_role_name: string;
  content: string;
  message_type: string;
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
  artifact_id: string;
  status?: string;
  path: string;
  agent_id: string;
  type: string;
  workspace_root?: string;
  url?: string;  // URL for media artifacts (image, audio)
}

export interface ArtifactUpdatedPayload {
  artifact_id?: string;
  status?: string;
  path: string;
  agent_id: string;
  type: string;
  workspace_root?: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

// --- Server Message Union ---

export type ServerMessage =
  | { type: 'CONNECTED'; payload: ConnectedPayload }
  | { type: 'SEGMENT_START'; payload: SegmentStartPayload }
  | { type: 'SEGMENT_CONTENT'; payload: SegmentContentPayload }
  | { type: 'SEGMENT_END'; payload: SegmentEndPayload }
  | { type: 'AGENT_STATUS'; payload: AgentStatusPayload }
  | { type: 'TEAM_STATUS'; payload: TeamStatusPayload }
  | { type: 'TOOL_APPROVAL_REQUESTED'; payload: ToolApprovalRequestedPayload }
  | { type: 'TOOL_APPROVED'; payload: ToolApprovedPayload }
  | { type: 'TOOL_DENIED'; payload: ToolDeniedPayload }
  | { type: 'TOOL_EXECUTION_STARTED'; payload: ToolExecutionStartedPayload }
  | { type: 'TOOL_EXECUTION_SUCCEEDED'; payload: ToolExecutionSucceededPayload }
  | { type: 'TOOL_EXECUTION_FAILED'; payload: ToolExecutionFailedPayload }
  | { type: 'TOOL_LOG'; payload: ToolLogPayload }
  | { type: 'ASSISTANT_COMPLETE'; payload: AssistantCompletePayload }
  | { type: 'TODO_LIST_UPDATE'; payload: TodoListUpdatePayload }
  | { type: 'TASK_PLAN_EVENT'; payload: TaskPlanEventPayload }
  | { type: 'INTER_AGENT_MESSAGE'; payload: InterAgentMessagePayload }
  | { type: 'SYSTEM_TASK_NOTIFICATION'; payload: SystemTaskNotificationPayload }
  | { type: 'ARTIFACT_PERSISTED'; payload: ArtifactPersistedPayload }
  | { type: 'ARTIFACT_UPDATED'; payload: ArtifactUpdatedPayload }
  | { type: 'ERROR'; payload: ErrorPayload };

// ============================================================================
// Client → Server Message Types
// ============================================================================

export type ClientMessageType =
  | 'SEND_MESSAGE'
  | 'STOP_GENERATION'
  | 'APPROVE_TOOL'
  | 'DENY_TOOL';

export interface SendMessagePayload {
  content: string;
  context_file_paths?: string[];
  image_urls?: string[];
  target_member_name?: string;
}

export interface ToolActionPayload {
  invocation_id: string;
  agent_name?: string;
  agent_id?: string;
  reason?: string;
  approval_token?: ToolApprovalTokenPayload;
}

export type ClientMessage =
  | { type: 'SEND_MESSAGE'; payload: SendMessagePayload }
  | { type: 'STOP_GENERATION' }
  | { type: 'APPROVE_TOOL'; payload: ToolActionPayload }
  | { type: 'DENY_TOOL'; payload: ToolActionPayload };
