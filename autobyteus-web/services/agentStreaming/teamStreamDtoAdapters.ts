import type { JsonValue } from '@autobyteus/team-stream-contracts';
import type { ServerMessage } from './protocol';
import type { TeamAgentStreamMessage } from '~/services/teamExecution/teamExecutionViewModels';

export type TeamAgentProjectionMessage = TeamAgentStreamMessage;

const jsonObject = (value: JsonValue | null): Record<string, JsonValue> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return Object.fromEntries(Object.entries(value));
};
const requiredJsonObject = (value: JsonValue, boundary: string): Record<string, JsonValue> => {
  const object = jsonObject(value);
  if (!object) throw new Error(`${boundary} requires one JSON object.`);
  return object;
};
const compactionPhase = (value: string | null): 'requested' | 'started' | 'completed' | 'failed' | null => {
  if (value === null || value === 'requested' || value === 'started' || value === 'completed' || value === 'failed') return value;
  throw new Error(`Unsupported Team Agent compaction phase '${value}'.`);
};

const segmentType = (value: string): 'text' | 'tool_call' | 'write_file' | 'run_bash' | 'reasoning' | 'edit_file' | 'media' => {
  if (value === 'text' || value === 'tool_call' || value === 'write_file' || value === 'run_bash'
    || value === 'reasoning' || value === 'edit_file' || value === 'media') return value;
  throw new Error(`Unsupported Team Agent segment type '${value}'.`);
};

const artifactType = (value: string): 'file' | 'image' | 'audio' | 'video' | 'pdf' | 'csv' | 'excel' | 'other' => {
  if (value === 'file' || value === 'image' || value === 'audio' || value === 'video'
    || value === 'pdf' || value === 'csv' || value === 'excel' || value === 'other') return value;
  throw new Error(`Unsupported Team Agent artifact type '${value}'.`);
};

const fileStatus = (value: string): 'streaming' | 'pending' | 'available' | 'failed' => {
  if (value === 'streaming' || value === 'pending' || value === 'available' || value === 'failed') return value;
  throw new Error(`Unsupported Team Agent file status '${value}'.`);
};

const fileSourceTool = (value: string): 'write_file' | 'edit_file' | 'generated_output' => {
  if (value === 'write_file' || value === 'edit_file' || value === 'generated_output') return value;
  throw new Error(`Unsupported Team Agent file source '${value}'.`);
};

export const toAgentProjectionMessage = (message: TeamAgentProjectionMessage, agentRunId: string): ServerMessage => {
  const exactAgentRunId = agentRunId.trim();
  if (!exactAgentRunId) throw new Error('Team Agent projection requires the exact AgentRun ID.');
  switch (message.type) {
    case 'SYSTEM_INSTRUCTIONS_SUPPLIED': return { type: message.type, payload: { trace_id: message.payload.trace_id, content: message.payload.content, ts: message.payload.ts } };
    case 'SEGMENT_START': return { type: message.type, payload: { id: message.payload.segment_id, turn_id: message.payload.turn_id, segment_type: segmentType(message.payload.segment_type), metadata: message.payload.metadata } };
    case 'SEGMENT_CONTENT': return { type: message.type, payload: { id: message.payload.segment_id, turn_id: message.payload.turn_id, segment_type: segmentType(message.payload.segment_type), delta: message.payload.delta } };
    case 'SEGMENT_END': return { type: message.type, payload: { id: message.payload.segment_id, turn_id: message.payload.turn_id, metadata: message.payload.metadata, interrupted: message.payload.interrupted, reason: message.payload.reason, failed: message.payload.failed, error: message.payload.error } };
    case 'ARTIFACT_PERSISTED': return { type: message.type, payload: { id: message.payload.artifact_id, runId: exactAgentRunId, path: message.payload.path, type: artifactType(message.payload.artifact_type), status: message.payload.status, description: message.payload.description, revisionId: message.payload.revision_id, createdAt: message.payload.created_at, updatedAt: message.payload.updated_at } };
    case 'FILE_CHANGE': return { type: message.type, payload: { id: message.payload.file_change_id, runId: exactAgentRunId, path: message.payload.path, type: artifactType(message.payload.file_type), status: fileStatus(message.payload.status), sourceTool: fileSourceTool(message.payload.source_tool), sourceInvocationId: message.payload.source_invocation_id, content: message.payload.content, createdAt: message.payload.created_at, updatedAt: message.payload.updated_at } };
    case 'SYSTEM_TASK_NOTIFICATION': return { type: message.type, payload: { sender_id: message.payload.sender.kind === 'system' ? 'system' : message.payload.sender.identity.member_address, content: message.payload.content } };
    case 'EXTERNAL_USER_MESSAGE': return { type: message.type, payload: { content: message.payload.content, received_at: message.payload.received_at, provider: message.payload.provider, transport: message.payload.transport, account_id: message.payload.account_id, peer_id: message.payload.peer_id, thread_id: message.payload.thread_id, external_message_id: message.payload.external_message_id, context_file_paths: message.payload.context_file_paths } };
    case 'MEMBER_INPUT_MESSAGE': return { type: message.type, payload: { message_id: message.payload.message_id, dedupe_key: message.payload.dedupe_key, content: message.payload.content, input_origin: message.payload.input_origin, received_at: message.payload.received_at, context_file_paths: message.payload.context_file_paths, sender_agent_run_id: message.payload.sender_agent_run_id, recipient_agent_run_id: message.payload.recipient_agent_run_id, parent_communication_message_id: message.payload.parent_communication_message_id } };
    case 'ERROR': {
      const common = { code: message.payload.code, message: message.payload.message };
      if (message.payload.error_scope === null) {
        return { type: message.type, payload: { ...common, error_scope: null, error_effect: null, turn_id: null } };
      }
      if (message.payload.error_scope === 'turn') {
        const effect = message.payload.error_effect;
        const turnId = message.payload.turn_id;
        if ((effect !== 'diagnostic' && effect !== 'terminal') || typeof turnId !== 'string') {
          throw new Error('Invalid Team Agent turn error projection.');
        }
        return { type: message.type, payload: {
          ...common,
          error_scope: 'turn',
          error_effect: effect,
          turn_id: turnId,
        } };
      }
      return { type: message.type, payload: { ...common, error_scope: 'runtime', error_effect: 'terminal', turn_id: null } };
    }
    case 'TURN_STARTED': return { type: message.type, payload: { turn_id: message.payload.turn_id } };
    case 'TURN_COMPLETED': return { type: message.type, payload: { turn_id: message.payload.turn_id, reason: message.payload.reason } };
    case 'TURN_INTERRUPTED': return { type: message.type, payload: { turn_id: message.payload.turn_id, reason: message.payload.reason } };
    case 'AGENT_STATUS': return { type: message.type, payload: { status: message.payload.status, trigger: message.payload.trigger, tool_name: message.payload.tool_name, error_message: message.payload.error_message, error_details: message.payload.error_details } };
    case 'TOKEN_USAGE_UPDATED': {
      const { change_sequence: _sequence, agent_run_id: _run, ...payload } = message.payload;
      return { type: message.type, payload: { ...payload, run_id: exactAgentRunId } };
    }
    case 'COMPACTION_STATUS': return { type: message.type, payload: { phase: compactionPhase(message.payload.phase), kind: message.payload.kind, status: message.payload.status, turn_id: message.payload.turn_id, compaction_operation_id: message.payload.compaction_operation_id, requested_turn_id: message.payload.requested_turn_id, execution_turn_id: message.payload.execution_turn_id, selected_block_count: message.payload.selected_block_count, compacted_block_count: message.payload.compacted_block_count, raw_trace_count: message.payload.raw_trace_count, semantic_fact_count: message.payload.semantic_fact_count, compaction_agent_definition_id: message.payload.compaction_agent_definition_id, compaction_agent_name: message.payload.compaction_agent_name, compaction_runtime_kind: message.payload.compaction_runtime_kind, compaction_model_identifier: message.payload.compaction_model_identifier, compaction_run_id: message.payload.compaction_run_id, compaction_task_id: message.payload.compaction_task_id, error_message: message.payload.error_message, provider: message.payload.provider, source_surface: message.payload.source_surface, boundary_key: message.payload.boundary_key, provider_event_id: message.payload.provider_event_id, provider_session_id: message.payload.provider_session_id, provider_thread_id: message.payload.provider_thread_id, provider_timestamp: message.payload.provider_timestamp, trigger: message.payload.trigger, pre_tokens: message.payload.pre_tokens, rotation_eligible: message.payload.rotation_eligible } };
    case 'ASSISTANT_COMPLETE': return { type: message.type, payload: { content: message.payload.content, reasoning: message.payload.reasoning, usage: jsonObject(message.payload.usage), image_urls: [...message.payload.image_urls], audio_urls: [...message.payload.audio_urls], video_urls: [...message.payload.video_urls] } };
    case 'TOOL_APPROVAL_REQUESTED': return { type: message.type, payload: { invocation_id: message.payload.invocation_id, tool_name: message.payload.tool_name, turn_id: message.payload.turn_id, arguments: requiredJsonObject(message.payload.arguments, 'Tool approval arguments') } };
    case 'TOOL_APPROVED': return { type: message.type, payload: { invocation_id: message.payload.invocation_id, tool_name: message.payload.tool_name, turn_id: message.payload.turn_id, reason: message.payload.reason } };
    case 'TOOL_DENIED': return { type: message.type, payload: { invocation_id: message.payload.invocation_id, tool_name: message.payload.tool_name, turn_id: message.payload.turn_id, arguments: jsonObject(message.payload.arguments), reason: message.payload.reason, error: message.payload.error } };
    case 'TOOL_EXECUTION_STARTED': return { type: message.type, payload: { invocation_id: message.payload.invocation_id, tool_name: message.payload.tool_name, turn_id: message.payload.turn_id, arguments: jsonObject(message.payload.arguments) } };
    case 'TOOL_EXECUTION_SUCCEEDED': return { type: message.type, payload: { invocation_id: message.payload.invocation_id, tool_name: message.payload.tool_name, turn_id: message.payload.turn_id, arguments: jsonObject(message.payload.arguments), result: message.payload.result ?? undefined } };
    case 'TOOL_EXECUTION_FAILED': return { type: message.type, payload: { invocation_id: message.payload.invocation_id, tool_name: message.payload.tool_name, turn_id: message.payload.turn_id, arguments: jsonObject(message.payload.arguments), error: message.payload.error } };
    case 'TOOL_EXECUTION_INTERRUPTED': return { type: message.type, payload: { invocation_id: message.payload.invocation_id, tool_name: message.payload.tool_name, turn_id: message.payload.turn_id, arguments: jsonObject(message.payload.arguments), reason: message.payload.reason } };
    case 'TOOL_LOG': return { type: message.type, payload: { log_entry: message.payload.log_entry, tool_invocation_id: message.payload.tool_invocation_id, tool_name: message.payload.tool_name, turn_id: message.payload.turn_id } };
    case 'TODO_LIST_UPDATE': return { type: message.type, payload: { todos: message.payload.todos.map((todo) => ({ todo_id: todo.todo_id, description: todo.description, status: todo.status })) } };
  }
};
