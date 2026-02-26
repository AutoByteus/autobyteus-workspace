import { describe, it, expect } from 'vitest';
import { EventType } from '../../../src/events/event-types.js';

describe('EventType', () => {
  it('matches known event string values', () => {
    expect(EventType.AGENT_STATUS_UPDATED).toBe('agent_status_updated');
    expect(EventType.AGENT_DATA_ASSISTANT_CHUNK).toBe('agent_data_assistant_chunk');
    expect(EventType.AGENT_DATA_ASSISTANT_COMPLETE_RESPONSE).toBe('agent_data_assistant_complete_response');
    expect(EventType.AGENT_DATA_SEGMENT_EVENT).toBe('agent_data_segment_event');
    expect(EventType.AGENT_DATA_TOOL_LOG).toBe('agent_data_tool_log');
    expect(EventType.AGENT_DATA_TOOL_LOG_STREAM_END).toBe('agent_data_tool_log_stream_end');
    expect(EventType.AGENT_DATA_SYSTEM_TASK_NOTIFICATION_RECEIVED).toBe('agent_data_system_task_notification_received');
    expect(EventType.AGENT_DATA_INTER_AGENT_MESSAGE_RECEIVED).toBe('agent_data_inter_agent_message_received');
    expect(EventType.AGENT_DATA_TODO_LIST_UPDATED).toBe('agent_data_todo_list_updated');
    expect(EventType.AGENT_ARTIFACT_PERSISTED).toBe('agent_artifact_persisted');
    expect(EventType.AGENT_ARTIFACT_UPDATED).toBe('agent_artifact_updated');
    expect(EventType.AGENT_REQUEST_TOOL_INVOCATION_APPROVAL).toBe('agent_request_tool_invocation_approval');
    expect(EventType.AGENT_TOOL_INVOCATION_AUTO_EXECUTING).toBe('agent_tool_invocation_auto_executing');
    expect(EventType.AGENT_ERROR_OUTPUT_GENERATION).toBe('agent_error_output_generation');
  });

  it('includes system-level and task plan events', () => {
    const values = Object.values(EventType);

    expect(values).toContain('weibo_post_completed');
    expect(values).toContain('tool_execution_completed');
    expect(values).toContain('shared_browser_session_created');
    expect(values).toContain('create_shared_session');
    expect(values).toContain('team_stream_event');
    expect(values).toContain('workflow_stream_event');
    expect(values).toContain('task_plan.tasks.created');
    expect(values).toContain('task_plan.status.updated');
    expect(values.length).toBe(22);
  });
});
